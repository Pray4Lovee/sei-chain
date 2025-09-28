"use client";

import { useEffect, useMemo, useState } from "react";

type Sigil = {
  tokenId: number;
  image: string;
  chain: string;
  amount: string;
  timestamp: string;
};

type SortOption = "newest" | "oldest" | "amount-desc" | "amount-asc" | "chain";

type FetchState = "idle" | "loading" | "error" | "ready";

const sortComparators: Record<SortOption, (a: Sigil, b: Sigil) => number> = {
  newest: (a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  oldest: (a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  "amount-desc": (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
  "amount-asc": (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
  chain: (a, b) => a.chain.localeCompare(b.chain),
};

const CHAIN_ACCENTS: Record<string, string> = {
  Sei: "from-indigo-500/80 to-purple-500/80",
  Hyperliquid: "from-emerald-500/70 to-cyan-500/70",
  Arbitrum: "from-sky-500/80 to-blue-500/80",
};

const formatAmount = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getAccent = (chain: string) =>
  CHAIN_ACCENTS[chain] ?? "from-slate-600/80 to-slate-800/80";

export default function SoulSigilGallery({ user }: { user: string }) {
  const [sigils, setSigils] = useState<Sigil[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [state, setState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchSigils = async () => {
      setState("loading");
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/sigils?user=${encodeURIComponent(user)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to load sigils: ${res.status}`);
        }

        const data: Sigil[] = await res.json();
        if (!isMounted) {
          return;
        }

        setSigils(data);
        setState("ready");
      } catch (err) {
        if (!isMounted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error("SoulSigilGallery: failed to load sigils", err);
        setSigils([]);
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Unable to load SoulSigils right now."
        );
      }
    };

    fetchSigils();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user]);

  const chains = useMemo(() => {
    const chainSet = new Set(sigils.map((sigil) => sigil.chain));
    return Array.from(chainSet).sort((a, b) => a.localeCompare(b));
  }, [sigils]);

  const filteredSigils = useMemo(() => {
    const base = filter === "All" ? sigils : sigils.filter((sigil) => sigil.chain === filter);
    const next = [...base];
    next.sort(sortComparators[sort]);
    return next;
  }, [filter, sigils, sort]);

  const totalValue = useMemo(() => {
    return filteredSigils.reduce((total, sigil) => {
      const amount = Number.parseFloat(sigil.amount);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [filteredSigils]);

  return (
    <section className="mt-6 rounded-2xl border border-slate-800/50 bg-white/90 p-6 shadow-xl shadow-indigo-900/10 backdrop-blur dark:bg-slate-900/70">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            🧿 SoulSigil Gallery
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your on-chain earnings rendered as living sigils. Filter, sort, and download any claim
            proof on demand.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            <span>Filter</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Chains</option>
              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            <span>Sort</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Amount: high → low</option>
              <option value="amount-asc">Amount: low → high</option>
              <option value="chain">Chain: A → Z</option>
            </select>
          </label>
        </div>
      </header>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
        <span>
          Showing {filteredSigils.length} of {sigils.length} SoulSigil
          {sigils.length === 1 ? "" : "s"}
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Total value • {totalValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC
        </span>
      </div>

      {state === "loading" && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-300">
          Summoning sigils from the vault...
        </p>
      )}

      {state === "error" && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {errorMessage ?? "Unable to load SoulSigils. Please try again in a moment."}
        </p>
      )}

      {state === "ready" && filteredSigils.length === 0 && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-300">
          No SoulSigils found for the selected chain.
        </p>
      )}

      {filteredSigils.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSigils.map((sigil) => {
            const accent = getAccent(sigil.chain);
            return (
              <article
                key={sigil.tokenId}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 p-4 shadow-lg shadow-indigo-900/10 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/60 dark:from-slate-900/70 dark:to-slate-900"
              >
                <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} opacity-0 transition group-hover:opacity-40`} />
                <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-slate-950/90 shadow-inner dark:border-slate-700/60">
                  <img
                    src={sigil.image}
                    alt={`SoulSigil ${sigil.tokenId}`}
                    className="h-48 w-full object-cover"
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      #{sigil.tokenId.toString().padStart(4, "0")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-800/70 dark:text-slate-200">
                      {sigil.chain}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <span>Amount</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatAmount(sigil.amount)} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <span>Claimed</span>
                    <time
                      dateTime={sigil.timestamp}
                      className="text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      {formatTimestamp(sigil.timestamp)}
                    </time>
                  </div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <span>Chain fingerprint</span>
                    <span className="truncate text-sm font-medium text-indigo-600 dark:text-indigo-300">
                      {sigil.chain.toLowerCase()}•{sigil.tokenId}
                    </span>
                  </div>
                </div>
                <a
                  href={sigil.image}
                  download={`SoulSigil_${sigil.tokenId}.svg`}
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-indigo-400/60 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:border-indigo-500/50 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
                >
                  Download claim-proof SVG
                </a>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
