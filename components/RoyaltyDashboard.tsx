"use client";

import { useEffect, useState } from "react";

type RoyaltyTotals = {
  EVM?: string | number;
  Sei?: string | number;
  Hyperliquid?: string | number;
};

type DisplayTotals = {
  evm: number;
  sei: number;
  hyperliquid: number;
};

const MICRO = 1_000_000;

function normalizeTotals(data: RoyaltyTotals): DisplayTotals {
  const parseAmount = (value: string | number | undefined): number => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  return {
    evm: parseAmount(data.EVM) / MICRO,
    sei: parseAmount(data.Sei) / MICRO,
    hyperliquid: parseAmount(data.Hyperliquid) / MICRO,
  };
}

export default function RoyaltyDashboard() {
  const [totals, setTotals] = useState<DisplayTotals>({ evm: 0, sei: 0, hyperliquid: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/royalties/all");
        if (!res.ok) {
          throw new Error(`Failed to load royalties: ${res.status}`);
        }
        const data: RoyaltyTotals = await res.json();
        if (!cancelled) {
          setTotals(normalizeTotals(data));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setTotals({ evm: 0, sei: 0, hyperliquid: 0 });
        }
      }
    }

    load();

    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4 bg-yellow-50">
      <h2 className="font-bold">Keeper’s Cross-Network Royalties</h2>
      <ul className="space-y-1">
        <li>EVM: {totals.evm.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</li>
        <li>Sei: {totals.sei.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</li>
        <li>
          Hyperliquid: {totals.hyperliquid.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDH
        </li>
      </ul>
    </div>
  );
}
