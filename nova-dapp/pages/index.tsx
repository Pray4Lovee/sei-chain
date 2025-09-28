"use client";

import { useState } from "react";
import BalanceCard from "../components/BalanceCard";
import WalletConnect from "../components/WalletConnect";

export default function Home() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <main className="p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">🌌 Nova Portal</h1>
        <p className="text-gray-600">
          Connect your wallet to view balances from the LumenCardVault contract.
        </p>
      </header>
      <WalletConnect onConnected={setUser} />
      {user && <BalanceCard user={user} />}
    </main>
  );
}
