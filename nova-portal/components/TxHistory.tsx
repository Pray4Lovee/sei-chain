"use client";

import { useEffect, useState } from "react";

interface Tx {
  type: "Deposit" | "Spend";
  amount: string;
  toAddr?: string;
  timestamp: string;
}

export default function TxHistory({ user }: { user: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/history?user=${user}`);
        if (!res.ok) throw new Error("failed to load history");
        const data = await res.json();
        setTxs(data);
      } catch (err) {
        console.error(err);
        setTxs([]);
      }
    }
    if (user) {
      void load();
    }
  }, [user]);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">Transaction History</h2>
      <table className="table mt-3 text-sm">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>To</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {txs.length === 0 && (
            <tr>
              <td colSpan={4}>No transactions found.</td>
            </tr>
          )}
          {txs.map((tx, i) => (
            <tr key={i}>
              <td>{tx.type}</td>
              <td>{tx.amount}</td>
              <td>{tx.toAddr || "-"}</td>
              <td>{new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
