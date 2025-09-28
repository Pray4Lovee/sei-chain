"use client";

import { useState } from "react";
import BalanceCard from "../components/BalanceCard";
import TxHistory from "../components/TxHistory";
import WalletConnect from "../components/WalletConnect";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-4xl font-bold">🌌 Nova Portal</h1>
      <p className="mt-2 text-purple-200">Manage your LumenCard vault balance and spending.</p>
      <WalletConnect onConnected={(addr) => setUser(addr)} />
      {user && (
        <>
          <BalanceCard user={user} />
          <TxHistory user={user} />
        </>
      )}
    </main>
  );
}
