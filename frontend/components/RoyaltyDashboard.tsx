"use client";

import { useEffect, useState } from "react";

type RoyaltyRow = {
  user: string;
  total: string;
};

function formatUsdc(value: string) {
  const amount = Number(value || 0) / 1e6;
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "0";
}

export default function RoyaltyDashboard() {
  const [total, setTotal] = useState("0");
  const [byUser, setByUser] = useState<RoyaltyRow[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res1 = await fetch("/api/royalties");
        if (res1.ok) {
          const data1 = await res1.json();
          if (typeof data1.totalRoyalties === "string") {
            setTotal(data1.totalRoyalties);
          }
        }

        const res2 = await fetch("/api/royalties/by-user");
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2)) {
            setByUser(data2);
          }
        }
      } catch (err) {
        console.error("Failed to load royalties", err);
      }
    }

    load();
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4 bg-yellow-50">
      <h2 className="font-bold">Keeper’s Royalty Dashboard</h2>
      <p>Total Royalties: {formatUsdc(total)} USDC</p>

      <h3 className="mt-2 font-semibold">By User:</h3>
      <ul>
        {byUser.map((row, i) => {
          const userLabel = row.user
            ? `${row.user.slice(0, 6)}...${row.user.slice(-4)}`
            : "Unknown";
          return (
            <li key={i}>
              {userLabel} → {formatUsdc(row.total)} USDC
            </li>
          );
        })}
      </ul>
    </div>
  );
}
