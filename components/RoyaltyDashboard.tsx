"use client";

import { useEffect, useState } from "react";

type MultiNetworkRoyalties = {
  EVM?: string;
  Sei?: string;
  Hyperliquid?: string;
};

export default function RoyaltyDashboard() {
  const [multi, setMulti] = useState<MultiNetworkRoyalties>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/royalties/all");
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        setMulti(data);
      } catch (err) {
        console.error("Failed to load royalties", err);
        setError("Unable to load royalties");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const formatAmount = (value: string | undefined, decimals = 6) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      return "0";
    }
    const divisor = 10 ** decimals;
    return (amount / divisor).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  };

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4 bg-yellow-50">
      <h2 className="font-bold">Keeper’s Cross-Network Royalties</h2>
      {loading ? (
        <p className="text-sm text-gray-600">Loading royalties…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <ul className="space-y-1 mt-2">
          <li>
            <span className="font-semibold">EVM:</span> {formatAmount(multi.EVM)} USDC
          </li>
          <li>
            <span className="font-semibold">Sei:</span> {formatAmount(multi.Sei)} USDC
          </li>
          <li>
            <span className="font-semibold">Hyperliquid:</span> {formatAmount(multi.Hyperliquid)} USDH
          </li>
        </ul>
      )}
    </div>
  );
}
