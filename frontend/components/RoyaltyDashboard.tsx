"use client";

import { useEffect, useState } from "react";

type RoyaltyBreakdown = {
  EVM: string | number;
  Sei: string | number;
  Hyperliquid: string | number;
};

type RoyaltyResponse = {
  EVM?: string | number;
  Sei?: string | number;
  Hyperliquid?: string | number;
};

async function triggerSettlement(chain: string) {
  const res = await fetch(`/api/settle?chain=${chain}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Settlement request failed for ${chain}`);
  }
}

const EMPTY_ROYALTIES: RoyaltyBreakdown = { EVM: 0, Sei: 0, Hyperliquid: 0 };

export default function RoyaltyDashboard() {
  const [multi, setMulti] = useState<RoyaltyBreakdown>(EMPTY_ROYALTIES);
  const [isLoading, setIsLoading] = useState(false);

  async function settle(chain: string) {
    try {
      setIsLoading(true);
      await triggerSettlement(chain);
      alert(`${chain} royalties settlement triggered`);
    } catch (error) {
      console.error(error);
      alert(`Unable to trigger ${chain} settlement`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/royalties/all");
        if (!res.ok) {
          throw new Error("Failed to load royalty balances");
        }
        const data: RoyaltyResponse = await res.json();
        if (mounted) {
          const payload: RoyaltyBreakdown = {
            EVM: data?.EVM ?? 0,
            Sei: data?.Sei ?? 0,
            Hyperliquid: data?.Hyperliquid ?? 0,
          };
          setMulti(payload);
        }
      } catch (error) {
        console.error("Failed to load royalties", error);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4 bg-yellow-50">
      <h2 className="font-bold">Keeper’s Cross-Network Royalties</h2>
      <ul className="mt-2 space-y-2">
        <li>EVM: {Number(multi.EVM ?? 0) / 1e6} USDC</li>
        <li>
          Sei: {Number(multi.Sei ?? 0) / 1e6} USDC
          <button
            className="ml-2 bg-green-600 text-white px-2 rounded disabled:opacity-50"
            onClick={() => settle("Sei")}
            disabled={isLoading}
          >
            Settle
          </button>
        </li>
        <li>
          Hyperliquid: {Number(multi.Hyperliquid ?? 0) / 1e6} USDH
          <button
            className="ml-2 bg-indigo-600 text-white px-2 rounded disabled:opacity-50"
            onClick={() => settle("Hyperliquid")}
            disabled={isLoading}
          >
            Settle
          </button>
        </li>
      </ul>
    </div>
  );
}
