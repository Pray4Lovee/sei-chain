import Head from "next/head";
import { useState } from "react";
import BalanceCard from "../components/BalanceCard";
import WalletConnect from "../components/WalletConnect";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>Nova Portal</title>
        <meta name="description" content="Nova front-end for LumenCardVault" />
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-start px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <header className="space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Nova Portal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white">🌌 LumenCard Control</h1>
            <p className="text-slate-300 max-w-xl mx-auto">
              Connect your wallet to view spendable balances and lifetime deposits stored in the LumenCardVault.
            </p>
          </header>

          <WalletConnect onConnected={(addr) => setUser(addr)} />

          {user ? (
            <BalanceCard user={user} />
          ) : (
            <div className="p-6 border border-dashed border-slate-700 rounded-2xl text-center text-slate-400">
              <p>Connect your wallet to see balances.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
