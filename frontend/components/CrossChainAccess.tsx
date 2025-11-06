"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AccessResponse = {
  success: boolean;
  hasAccess?: boolean;
  message?: string;
};

type ProofResponse = {
  proof: unknown;
  publicSignals: unknown;
};

const CHAINS = ["Sei", "Polygon", "Solana", "Base", "Arbitrum", "Ethereum"] as const;
type SupportedChain = (typeof CHAINS)[number];

function toApiChainParam(chain: SupportedChain): string {
  return chain.toLowerCase();
}

export default function CrossChainAccess({ user }: { user: string }) {
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("Sei");
  const [submitting, setSubmitting] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const proofEndpoint = useMemo(() => `/api/zkProof?user=${user}&chain=${toApiChainParam(selectedChain)}`, [user, selectedChain]);
  const submitEndpoint = useMemo(() => `/api/submitCrossChainProof`, []);
  const accessEndpoint = useMemo(
    () => `/api/checkAccess?user=${user}&chain=${toApiChainParam(selectedChain)}`,
    [user, selectedChain]
  );

  const refreshAccess = useCallback(async () => {
    try {
      const res = await fetch(accessEndpoint);
      if (!res.ok) {
        throw new Error(`Unable to query access: ${res.status}`);
      }
      const payload: AccessResponse = await res.json();
      setAccessGranted(Boolean(payload.hasAccess));
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  }, [accessEndpoint]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const requestCrossChainAccess = useCallback(async () => {
    setSubmitting(true);
    setStatusMessage(null);
    setError(null);

    try {
      const proofRes = await fetch(proofEndpoint);
      if (!proofRes.ok) {
        throw new Error(`Failed to generate proof (${proofRes.status})`);
      }
      const { proof, publicSignals } = (await proofRes.json()) as ProofResponse;

      const txRes = await fetch(submitEndpoint, {
        method: "POST",
        body: JSON.stringify({
          chain: selectedChain,
          user,
          proof,
          publicSignals
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!txRes.ok) {
        const body = (await txRes.json().catch(() => ({}))) as AccessResponse;
        throw new Error(body.message ?? `Proof submission failed (${txRes.status})`);
      }

      const submission = (await txRes.json()) as AccessResponse;
      if (!submission.success) {
        throw new Error(submission.message ?? "Cross-chain verifier rejected the proof");
      }

      setStatusMessage(`Access granted on ${selectedChain}!`);
      setAccessGranted(true);
      await refreshAccess();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setAccessGranted(false);
    } finally {
      setSubmitting(false);
    }
  }, [proofEndpoint, submitEndpoint, selectedChain, user, refreshAccess]);

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">🌍 Cross-Chain Vault Access</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          {selectedChain}
        </span>
      </header>

      <p className="mb-4 text-sm text-slate-600">
        Generate a zkSoulProof on your origin chain and submit it to unlock vaults across the SolaraKin universe. Your
        proof is never stored; only a hashed attestation is persisted on-chain.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="chain-selector">
          Origin chain
        </label>
        <select
          id="chain-selector"
          value={selectedChain}
          onChange={event => setSelectedChain(event.target.value as SupportedChain)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={submitting}
        >
          {CHAINS.map(chain => (
            <option key={chain} value={chain}>
              {chain}
            </option>
          ))}
        </select>
      </div>

      {accessGranted ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✅ Your zkSoulProof from {selectedChain} is active. Vault interactions will respect the recorded access grant.
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          🔐 No valid grant detected. Submit a fresh proof to unlock cross-chain vaults.
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={requestCrossChainAccess}
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Verifying proof…" : "Submit zkSoulProof"}
        </button>
        <button
          type="button"
          onClick={refreshAccess}
          disabled={submitting}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh status
        </button>
      </div>

      {statusMessage && (
        <p className="mt-4 text-sm font-medium text-emerald-600" role="status">
          {statusMessage}
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
