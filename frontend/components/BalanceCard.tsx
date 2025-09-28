"use client";

import { useEffect, useMemo, useState } from "react";

type TxRow = {
  type: string;
  amount: string;
  royalty: string;
};

function parseAmount(value: string | undefined) {
  try {
    return BigInt(value ?? "0");
  } catch {
    return 0n;
  }
}

function formatUsdc(amount: bigint) {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const padded = abs.toString().padStart(7, "0");
  const integerPart = padded.slice(0, -6) || "0";
  const decimalPart = padded.slice(-6).replace(/0+$/, "");
  const formatted = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  return `${negative ? "-" : ""}${formatted}`;
}

interface Props {
  user: string;
}

export default function BalanceCard({ user }: Props) {
  const [history, setHistory] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/history?user=${encodeURIComponent(user)}`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load balance");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      load();
    }
  }, [user]);

  const balance = useMemo(() => {
    return history.reduce((acc, tx) => {
      if (tx.type === "Deposit") {
        return acc + parseAmount(tx.amount);
      }
      if (tx.type === "Spend") {
        return acc - parseAmount(tx.amount);
      }
      return acc;
    }, 0n);
  }, [history]);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h2 className="font-semibold mb-2">Balance</h2>
      {loading ? (
        <p>Loading balance…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p>{formatUsdc(balance)} USDC</p>
      )}
    </div>
  );
}
