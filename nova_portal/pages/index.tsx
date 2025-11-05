import { FormEvent, useMemo, useState } from "react";
import RoyaltiesClaimCard from "../components/RoyaltiesClaimCard";

type Address = string;

function normalizeAddress(address: string): Address {
  return address.trim();
}

function BalanceCard({ user }: { user: Address }) {
  const shortAddress = useMemo(() => {
    if (!user) return "—";
    return `${user.slice(0, 6)}…${user.slice(-4)}`;
  }, [user]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-900/40 p-4 text-slate-100 shadow-md">
      <h2 className="text-lg font-semibold">LumenCardVault Balance</h2>
      <p className="mt-1 text-sm text-slate-300">Linked wallet: {shortAddress}</p>
      <p className="mt-3 text-2xl font-bold">Coming soon</p>
    </div>
  );
}

function TxHistory({ user }: { user: Address }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-900/40 p-4 text-slate-100 shadow-md">
      <h2 className="text-lg font-semibold">Recent Flow</h2>
      <p className="mt-1 text-sm text-slate-300">
        Sovereign history visualizations will appear here for {user || "your address"}.
      </p>
    </div>
  );
}

function RoyaltyDashboard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-900/40 p-4 text-slate-100 shadow-md">
      <h2 className="text-lg font-semibold">SolaraKin Sovereign Royalties Terminal</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>Monitor claimable CCTP royalties in real time.</li>
        <li>Trigger keeper-managed settlements when you are ready.</li>
        <li>Route flows straight into your LumenCardVault balance.</li>
      </ul>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [user, setUser] = useState<Address>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUser(normalizeAddress(input));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-slate-900/60 p-6 text-center shadow-lg">
          <h1 className="text-3xl font-bold">Nova Portal</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage SolaraKin royalties and track capital routing to your LumenCardVault.
          </p>
          <form className="mt-4 flex flex-wrap items-center justify-center gap-3" onSubmit={handleSubmit}>
            <input
              className="w-full max-w-md rounded border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              type="text"
              placeholder="Enter Sei or Noble wallet"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-300"
              type="submit"
              disabled={!input.trim()}
            >
              Load Portal
            </button>
          </form>
        </header>

        {user && (
          <>
            <BalanceCard user={user} />
            <RoyaltiesClaimCard user={user} />
            <TxHistory user={user} />
            <RoyaltyDashboard />
          </>
        )}
      </div>
    </main>
  );
}
