"use client";

import { useEffect, useState } from "react";

interface Tx {
  type: "Deposit" | "Spend";
  amount: string;
  to?: string;
  timestamp: string;
}

export default function TxHistory({ user }: { user: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/history?user=${user}`);
        if (!res.ok) {
          throw new Error(`History request failed with ${res.status}`);
        }
        const data = await res.json();
        setTxs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load transaction history", err);
        setTxs([]);
      }
    }
    if (user) load();
  }, [user]);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4">
      <h2 className="font-bold">Transaction History</h2>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr>
            <th className="text-left">Type</th>
            <th className="text-left">Amount</th>
            <th className="text-left">To</th>
            <th className="text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {txs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-center text-gray-500">
                No transactions yet.
              </td>
            </tr>
          ) : (
            txs.map((tx, i) => (
              <tr key={i}>
                <td>{tx.type}</td>
                <td>{tx.amount}</td>
                <td>{tx.to || "-"}</td>
                <td>{tx.timestamp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
