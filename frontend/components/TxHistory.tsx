"use client";

import { useEffect, useState } from "react";

type TxRow = {
  type: string;
  amount: string;
  royalty: string;
  toAddr: string;
  timestamp: string;
};

interface Props {
  user: string;
}

function formatUsdc(value: string | undefined) {
  const raw = value ?? "0";
  const negative = raw.startsWith("-");
  const normalized = negative ? raw.slice(1) : raw;
  const padded = normalized.padStart(7, "0");
  const integerPart = padded.slice(0, -6) || "0";
  const decimalPart = padded.slice(-6).replace(/0+$/, "");
  const formatted = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  return `${negative ? "-" : ""}${formatted}`;
}

export default function TxHistory({ user }: Props) {
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
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      load();
    }
  }, [user]);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white mt-4">
      <h2 className="font-semibold mb-2">Transaction History</h2>
      {loading ? (
        <p>Loading history…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : history.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((tx, idx) => (
            <li key={`${tx.timestamp}-${idx}`} className="text-sm">
              <span className="font-medium">{tx.type}</span> · {formatUsdc(tx.amount)} USDC
              {tx.type === "Spend" && tx.toAddr ? ` → ${tx.toAddr}` : ""}
              {tx.royalty && tx.type === "Deposit" ? ` (royalty ${formatUsdc(tx.royalty)} USDC)` : ""}
              <span className="block text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
