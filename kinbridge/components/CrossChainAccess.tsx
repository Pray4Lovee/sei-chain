"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface CrossChainAccessProps {
  user: string;
  className?: string;
}

interface ProofResponse {
  proof: unknown;
  publicSignals: unknown;
}

interface SubmitResponse {
  success: boolean;
  message?: string;
}

interface AccessCheckResponse {
  hasAccess: boolean;
}

const CrossChainAccess: React.FC<CrossChainAccessProps> = ({ user, className }) => {
  const [requesting, setRequesting] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccessState = useCallback(async () => {
    try {
      const response = await fetch(`/api/checkAccess?user=${encodeURIComponent(user)}`);
      if (!response.ok) {
        throw new Error(`Failed to check access (${response.status})`);
      }
      const payload: AccessCheckResponse = await response.json();
      setAccessGranted(Boolean(payload.hasAccess));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [user]);

  const requestCrossChainAccess = useCallback(async () => {
    setRequesting(true);
    setError(null);

    try {
      const proofResponse = await fetch(`/api/zkProof?user=${encodeURIComponent(user)}`);
      if (!proofResponse.ok) {
        throw new Error(`Failed to create proof (${proofResponse.status})`);
      }
      const { proof, publicSignals }: ProofResponse = await proofResponse.json();

      const submission = await fetch("/api/submitCrossChainProof", {
        method: "POST",
        body: JSON.stringify({ proof, publicSignals }),
        headers: { "Content-Type": "application/json" },
      });

      if (!submission.ok) {
        throw new Error(`Failed to submit proof (${submission.status})`);
      }

      const submissionPayload: SubmitResponse = await submission.json();

      if (!submissionPayload.success) {
        throw new Error(submissionPayload.message ?? "Proof verification failed");
      }

      setAccessGranted(true);
    } catch (err) {
      setAccessGranted(false);
      setError((err as Error).message);
    } finally {
      setRequesting(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccessState();
  }, [fetchAccessState]);

  const statusMessage = useMemo(() => {
    if (requesting) {
      return "Verifying cross-chain proof...";
    }
    if (accessGranted) {
      return "Access granted across chains";
    }
    return "Submit a zkSoulProof to unlock vault access";
  }, [accessGranted, requesting]);

  return (
    <section className={className}>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
        <h2 className="text-lg font-semibold">🌍 Cross-Chain Vault Access</h2>
        <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={requestCrossChainAccess}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={requesting || accessGranted}
          >
            {requesting ? "Verifying..." : accessGranted ? "Access Granted" : "Request Vault Access"}
          </button>
          <button
            type="button"
            onClick={fetchAccessState}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
            disabled={requesting}
          >
            Refresh Status
          </button>
        </div>
      </div>
    </section>
  );
};

export default CrossChainAccess;
export type { CrossChainAccessProps };
