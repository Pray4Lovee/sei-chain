"use client";

import { useCallback, useEffect, useState } from "react";

type AccessStatusResponse = {
  hasAccess: boolean;
};

type ProofResponse = {
  proof: unknown;
  publicSignals: unknown;
};

type SubmitResponse = {
  success: boolean;
  message?: string;
};

export interface AccessCrossChainVaultProps {
  user: string;
}

/**
 * React component that orchestrates the client flow for requesting cross-chain vault access.
 * It retrieves a zk proof that combines SoulSigil and Holo attestations, submits it to the
 * backend for on-chain verification, and reflects the resulting access status to the user.
 */
export function AccessCrossChainVault({ user }: AccessCrossChainVaultProps) {
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch(`/api/checkAccess?user=${user}`);
      if (!response.ok) {
        throw new Error("Failed to query access status");
      }
      const data = (await response.json()) as AccessStatusResponse;
      setHasAccess(Boolean(data.hasAccess));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }, [user]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const requestCrossChainAccess = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const proofResponse = await fetch(`/api/zkProof?user=${user}`);
      if (!proofResponse.ok) {
        throw new Error("Unable to fetch zk proof");
      }
      const { proof, publicSignals } = (await proofResponse.json()) as ProofResponse;

      const submitResponse = await fetch("/api/submitCrossChainProof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, publicSignals, user })
      });

      if (!submitResponse.ok) {
        throw new Error("Submission rejected by relayer");
      }

      const result = (await submitResponse.json()) as SubmitResponse;
      setHasAccess(Boolean(result.success));

      if (!result.success) {
        setError(result.message ?? "Cross-chain verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="mt-4 rounded border bg-gray-50 p-4 shadow">
      <h2 className="text-lg font-bold">🌍 Cross-Chain Vault Access</h2>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {hasAccess ? (
        <p className="mt-2 text-green-700 font-semibold">You have access to the vault!</p>
      ) : (
        <>
          <p className="mt-2 text-sm">
            Submit your combined SoulSigil + Holo zk proof to unlock cross-chain vault access.
          </p>
          <button
            type="button"
            onClick={() => void requestCrossChainAccess()}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Request Vault Access"}
          </button>
        </>
      )}
    </div>
  );
}
