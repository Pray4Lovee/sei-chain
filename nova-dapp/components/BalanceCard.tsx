"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getProvider } from "../lib/web3";
import { getLumenCardContract } from "../lib/contracts";

interface BalanceCardProps {
  user: string;
}

export default function BalanceCard({ user }: BalanceCardProps) {
  const [spendable, setSpendable] = useState("0");
  const [deposits, setDeposits] = useState("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const provider = getProvider();
        const contract = getLumenCardContract(provider);
        const bal = await contract.balances(user);
        setSpendable(ethers.utils.formatUnits(bal.spendable, 6));
        setDeposits(ethers.utils.formatUnits(bal.lifetimeDeposits, 6));
      } catch (err) {
        console.error(err);
        setError("Unable to load balances. Ensure you're connected to the correct network.");
      }
    }

    if (user) {
      load();
    }
  }, [user]);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4">
      <h2 className="font-bold">Your LumenCard Balance</h2>
      <p>Spendable: {spendable} USDC</p>
      <p>Lifetime Deposits: {deposits} USDC</p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
