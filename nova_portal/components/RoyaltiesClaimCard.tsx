"use client";

import { useCallback, useEffect, useState } from "react";

interface RoyaltiesClaimCardProps {
  user: string;
}

interface CheckResponse {
  pending: string;
  error?: string;
}

interface ClaimResponse {
  message: string;
  error?: string;
}

const formatUsdc = (amount: string) => {
  try {
    const bigintAmount = BigInt(amount);
    const decimals = 6n;
    const divisor = 10n ** decimals;
    const whole = bigintAmount / divisor;
    const fraction = bigintAmount % divisor;
    const fractionStr = fraction.toString().padStart(Number(decimals), "0").replace(/0+$/, "");
    return fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString();
  } catch (error) {
    return "0";
  }
};

export default function RoyaltiesClaimCard({ user }: RoyaltiesClaimCardProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      setError(null);
      setPending(null);
      const params = new URLSearchParams({ user });
      const res = await fetch(`/api/check-royalty?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to check royalties (${res.status})`);
      }

      const data: CheckResponse = await res.json();

      if (typeof data.pending !== "string") {
        throw new Error("Unexpected response from royalty check");
      }

      setPending(data.pending);
    } catch (err) {
      console.error("Failed to check royalties", err);
      setError(
        err instanceof Error ? err.message : "Unable to determine pending royalties"
      );
      setPending("0");
    }
  }, [user]);

  const claim = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });

      const result: ClaimResponse = await res.json();

      if (!res.ok) {
        const message = result?.message ?? "Claim request failed";
        throw new Error(message);
      }

      alert(result.message);
      await check();
    } catch (err) {
      console.error("Claim request failed", err);
      const message =
        err instanceof Error ? err.message : "Unable to submit royalty claim";
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [check, user]);

  useEffect(() => {
    if (!user) {
      setPending("0");
      return;
    }

    void check();
  }, [check, user]);

  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-md">
      <h2 className="text-lg font-semibold">💸 Royalty Claim Portal</h2>
      {!user && <p className="mt-2 text-sm text-emerald-900">Enter an address to continue.</p>}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {pending === null ? (
        <p className="mt-2 text-sm text-emerald-900">Checking…</p>
      ) : pending === "0" ? (
        <p className="mt-2 text-sm text-emerald-900">No unclaimed royalties found.</p>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-emerald-900">
            Claimable: <strong>{formatUsdc(pending)} USDC</strong>
          </p>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={loading}
            onClick={claim}
          >
            {loading ? "Claiming…" : "Claim Now"}
          </button>
        </div>
      )}
    </div>
  );
}
