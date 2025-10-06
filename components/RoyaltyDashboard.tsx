"use client";

import { useCallback, useEffect, useState } from "react";

type RoyaltyTotals = Record<string, string | number>;

type SettlementChain = "Sei" | "Hyperliquid" | "CCTP" | string;

export default function RoyaltyDashboard() {
  const [totals, setTotals] = useState<RoyaltyTotals>({});
  const [loading, setLoading] = useState(false);

  const loadRoyalties = useCallback(async () => {
    try {
      const response = await fetch("/api/royalties/all");
      if (!response.ok) {
        throw new Error(`Failed to load royalties: ${response.status}`);
      }
      const data: RoyaltyTotals = await response.json();
      setTotals(data);
    } catch (error) {
      console.error("Failed to fetch royalty totals", error);
    }
  }, []);

  const settle = useCallback(async (chain: SettlementChain) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/settle?chain=${chain}`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Settlement failed: ${response.status}`);
      }
      await loadRoyalties();
      alert(`${chain} royalties settlement triggered`);
    } catch (error) {
      console.error("Failed to trigger settlement", error);
      alert(`Failed to settle ${chain} royalties`);
    } finally {
      setLoading(false);
    }
  }, [loadRoyalties]);

  useEffect(() => {
    loadRoyalties();
  }, [loadRoyalties]);

  const formatAmount = (value?: string | number, decimals = 6) => {
    const numeric = Number(value || 0);
    return (numeric / 10 ** decimals).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4 bg-yellow-50">
      <h2 className="font-bold text-lg mb-2">Keeper’s Cross-Network Royalties</h2>
      <ul className="space-y-2">
        <li>EVM: {formatAmount(totals.EVM)} USDC</li>
        <li>
          Sei: {formatAmount(totals.Sei)} USDC
          <button
            className="ml-2 bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
            onClick={() => settle("Sei")}
            disabled={loading}
          >
            Settle
          </button>
        </li>
        <li>
          Hyperliquid: {formatAmount(totals.Hyperliquid)} USDH
          <button
            className="ml-2 bg-indigo-600 text-white px-2 py-1 rounded disabled:opacity-50"
            onClick={() => settle("Hyperliquid")}
            disabled={loading}
          >
            Settle
          </button>
        </li>
      </ul>
    </div>
  );
}
