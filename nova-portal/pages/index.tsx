"use client";

import { useState } from "react";
import BalanceCard from "../components/BalanceCard";
import TxHistory from "../components/TxHistory";
import WalletConnect from "../components/WalletConnect";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">🌌 Nova Portal</h1>
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
