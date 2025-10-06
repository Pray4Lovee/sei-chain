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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const provider = getProvider();
        const contract = getLumenCardContract(provider);
        const bal = await contract.balances(user);
        setSpendable(ethers.utils.formatUnits(bal.spendable, 6));
        setDeposits(ethers.utils.formatUnits(bal.lifetimeDeposits, 6));
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load balance");
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      load();
    }
  }, [user]);

  return (
    <div className="p-6 border border-slate-700 rounded-2xl shadow-xl bg-slate-900/80 backdrop-blur mt-6">
      <h2 className="text-xl font-semibold text-indigo-100">Your LumenCard Balance</h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Fetching latest balance...</p>
      ) : (
        <div className="mt-4 space-y-2 text-lg">
          <p>
            <span className="text-slate-400">Spendable:</span> <span className="font-semibold text-white">{spendable} USDC</span>
          </p>
          <p>
            <span className="text-slate-400">Lifetime Deposits:</span> <span className="font-semibold text-white">{deposits} USDC</span>
          </p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
