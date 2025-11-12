"use client";

import { useEffect, useMemo, useState } from "react";

type Sigil = {
  tokenId: number;
  image: string;
  chain: string;
  amount: string;
  timestamp: string;
};

type SortKey = "timestamp" | "amount" | "chain";
type SortDirection = "asc" | "desc";

type FetchState = "idle" | "loading" | "success" | "error";

const amountToNumber = (amount: string): number => {
  const parsed = Number.parseFloat(amount);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (iso: string): string => {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
};

const chainStyles: Record<string, string> = {
  Sei: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/40",
  Hyperliquid: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/40",
};

const getCardStyle = (chain: string): string => {
  return chainStyles[chain] ?? "bg-slate-50 border-slate-200";
};

interface SoulSigilGalleryProps {
  user: string;
}

export default function SoulSigilGallery({ user }: SoulSigilGalleryProps) {
  const [sigils, setSigils] = useState<Sigil[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSigils() {
      if (!user) {
        setSigils([]);
        return;
      }

      setState("loading");
      setError(null);

      try {
        const res = await fetch(`/api/sigils?user=${encodeURIComponent(user)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Unable to load sigils (status ${res.status})`);
        }

        const data: Sigil[] = await res.json();
        setSigils(data);
        setState("success");
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to fetch sigils", err);
        setState("error");
        setError(
          err instanceof Error ? err.message : "Something went wrong while loading sigils."
        );
      }
    }

    fetchSigils();

    return () => controller.abort();
  }, [user]);

  const uniqueChains = useMemo(() => {
    const chains = new Set<string>();
    sigils.forEach((sigil) => chains.add(sigil.chain));
    return Array.from(chains).sort((a, b) => a.localeCompare(b));
  }, [sigils]);

  const processedSigils = useMemo(() => {
    const filtered = filter === "All" ? sigils : sigils.filter((sigil) => sigil.chain === filter);

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "amount": {
          const diff = amountToNumber(a.amount) - amountToNumber(b.amount);
          return sortDirection === "asc" ? diff : -diff;
        }
        case "chain": {
          const comparison = a.chain.localeCompare(b.chain, undefined, {
            sensitivity: "base",
          });
          return sortDirection === "asc" ? comparison : -comparison;
        }
        case "timestamp":
        default: {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          const diff = timeA - timeB;
          return sortDirection === "asc" ? diff : -diff;
        }
      }
    });

    return sorted;
  }, [filter, sigils, sortDirection, sortKey]);

  const totalUsd = useMemo(() => {
    return processedSigils.reduce((sum, sigil) => sum + amountToNumber(sigil.amount), 0);
  }, [processedSigils]);

  const toggleSortDirection = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "amount" ? "desc" : "asc");
      return;
    }

    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const renderStatus = () => {
    if (state === "loading") {
      return <p className="text-sm text-slate-500">Summoning SoulSigils...</p>;
    }

    if (state === "error") {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error ?? "Unable to load SoulSigils."}
        </div>
      );
    }

    if (processedSigils.length === 0) {
      return <p className="text-sm text-slate-500">No SoulSigils found for this vault.</p>;
    }

    return null;
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
      <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">🧿 SoulSigil Gallery</h2>
          <p className="text-sm text-slate-500">
            VaultScannerV2 surfaces the sigils you have forged across sovereign chains.
          </p>
        </div>
        <dl className="flex flex-col gap-1 text-right text-sm text-slate-600">
          <div>
            <dt className="font-medium text-slate-500">Sigils</dt>
            <dd className="text-base font-semibold text-slate-900">{processedSigils.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Total USDC</dt>
            <dd className="text-base font-semibold text-emerald-600">
              {totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Filter chain:</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="All">All Chains</option>
              {uniqueChains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          <span>Sort by:</span>
          <button
            type="button"
            onClick={() => toggleSortDirection("timestamp")}
            className={`rounded-full border px-3 py-1 transition hover:border-emerald-400 hover:text-emerald-600 ${
              sortKey === "timestamp" ? "border-emerald-500 text-emerald-600" : "border-transparent"
            }`}
          >
            Date {sortKey === "timestamp" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            type="button"
            onClick={() => toggleSortDirection("amount")}
            className={`rounded-full border px-3 py-1 transition hover:border-emerald-400 hover:text-emerald-600 ${
              sortKey === "amount" ? "border-emerald-500 text-emerald-600" : "border-transparent"
            }`}
          >
            Amount {sortKey === "amount" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            type="button"
            onClick={() => toggleSortDirection("chain")}
            className={`rounded-full border px-3 py-1 transition hover:border-emerald-400 hover:text-emerald-600 ${
              sortKey === "chain" ? "border-emerald-500 text-emerald-600" : "border-transparent"
            }`}
          >
            Chain {sortKey === "chain" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {renderStatus()}

        {state === "success" && processedSigils.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {processedSigils.map((sigil) => (
              <li
                key={sigil.tokenId}
                className={`group relative overflow-hidden rounded-xl border p-4 shadow transition hover:-translate-y-1 hover:shadow-lg ${getCardStyle(
                  sigil.chain
                )}`}
              >
                <figure className="flex flex-col gap-3">
                  <div className="relative overflow-hidden rounded-lg bg-white/70 p-2">
                    <img
                      src={sigil.image}
                      alt={`SoulSigil ${sigil.tokenId}`}
                      className="h-auto w-full rounded-md object-contain shadow-inner"
                      loading="lazy"
                    />
                  </div>
                  <figcaption className="flex flex-col gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Sigil #{sigil.tokenId}</span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {sigil.chain}
                      </span>
                    </div>
                    <dl className="flex flex-col gap-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-600">Amount</dt>
                        <dd className="font-semibold text-slate-900">{sigil.amount} USDC</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-slate-600">Forged</dt>
                        <dd>{formatDateTime(sigil.timestamp)}</dd>
                      </div>
                    </dl>
                    <a
                      href={sigil.image}
                      download={`SoulSigil_${sigil.tokenId}.svg`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-500 bg-white px-3 py-1 text-xs font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-50"
                    >
                      Download SVG
                    </a>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
