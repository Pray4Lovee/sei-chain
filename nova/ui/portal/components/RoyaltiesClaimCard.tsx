"use client";

import { useCallback, useEffect, useState } from "react";

interface RoyaltiesClaimCardProps {
  user: string;
}

interface PendingResponse {
  pending: string;
}

export default function RoyaltiesClaimCard({ user }: RoyaltiesClaimCardProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!user) {
      setPending("0");
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/check-royalty?user=${encodeURIComponent(user)}`);

      if (!res.ok) {
        throw new Error(`Failed to check royalties (${res.status})`);
      }

      const data = (await res.json()) as PendingResponse;
      setPending(data.pending ?? "0");
    } catch (err) {
      console.error("Failed to check royalties", err);
      setError("Unable to fetch pending royalties.");
      setPending(null);
    }
  }, [user]);

  const claim = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.message ?? "Failed to claim royalty");
      }

      alert(result.message ?? "✅ Royalty claimed!");
      await check();
    } catch (err) {
      console.error("Claim error", err);
      setError(err instanceof Error ? err.message : "Failed to claim royalty");
    } finally {
      setLoading(false);
    }
  }, [check, user]);

  useEffect(() => {
    void check();
  }, [check]);

  const renderContent = () => {
    if (error) {
      return <p className="text-red-600">{error}</p>;
    }

    if (pending === null) {
      return <p>Checking&hellip;</p>;
    }

    if (pending === "0") {
      return <p>No unclaimed royalties found.</p>;
    }

    return (
      <>
        <p>
          Claimable: <strong>{Number(pending) / 1e6} USDC</strong>
        </p>
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading}
          onClick={claim}
        >
          {loading ? "Claiming..." : "Claim Now"}
        </button>
      </>
    );
  };

  return (
    <section className="p-4 border mt-4 rounded-lg shadow-md bg-green-50 text-slate-900">
      <h2 className="font-bold text-lg">💸 Royalty Claim Portal</h2>
      {renderContent()}
    </section>
  );
}
