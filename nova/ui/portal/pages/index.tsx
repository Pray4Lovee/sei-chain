import { useMemo, useState } from "react";
import RoyaltiesClaimCard from "../components/RoyaltiesClaimCard";

function BalanceCard({ user }: { user: string }) {
  return (
    <section className="p-4 border rounded-lg shadow bg-white/10">
      <h2 className="font-semibold">Vault Balance</h2>
      <p className="text-sm text-slate-200">
        LumenCardVault balance for <span className="font-mono">{user}</span> loads dynamically.
      </p>
    </section>
  );
}

function TxHistory({ user }: { user: string }) {
  return (
    <section className="p-4 border rounded-lg shadow bg-white/10">
      <h2 className="font-semibold">Transaction History</h2>
      <p className="text-sm text-slate-200">
        Stream prior royalty settlement activity for <span className="font-mono">{user}</span>.
      </p>
    </section>
  );
}

function RoyaltyDashboard() {
  return (
    <section className="p-4 border rounded-lg shadow bg-white/10">
      <h2 className="font-semibold">SolaraKin Dashboard</h2>
      <p className="text-sm text-slate-200">
        Hook in analytics, proof-of-Holo gating, or SoulSigil issuance here.
      </p>
    </section>
  );
}

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const user = useMemo(() => userInput.trim(), [userInput]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-emerald-400">
            SolaraKin Sovereign Royalties Terminal
          </p>
          <h1 className="text-4xl font-bold">Nova Portal</h1>
          <p className="text-slate-300">
            Track and settle your cross-chain royalties permissionlessly. Enter a wallet to begin.
          </p>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm text-slate-300">
            Wallet Address
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              placeholder="0x..."
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
            />
          </label>
          <button
            className="rounded bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
            disabled={!user}
            onClick={() => setUserInput(user)}
          >
            Sync
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <BalanceCard user={user} />
            <RoyaltiesClaimCard user={user} />
            <TxHistory user={user} />
            <RoyaltyDashboard />
          </div>
        ) : (
          <p className="text-slate-400">Connect with your Sei/Noble wallet to surface pending royalties.</p>
        )}
      </div>
    </main>
  );
}
