"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groth16 } from "snarkjs";

type SoulSigil = {
  tokenId: string;
  image: string;
  chain: string;
};

type RawProofInputs = {
  sigilHashes: (string | number)[];
  sigilChains: number[];
  pathElements: (string | number)[][];
  pathIndices: number[][];
  root: string | number;
  nullifierHash: string | number;
  signalHash: string | number;
  userAddress: string;
};

type ProofResponse = {
  inputs: RawProofInputs;
};

type ProofSubmissionResponse = {
  message?: string;
  error?: string;
};

const REQUIRED_SIGILS = 3;

function normaliseInputs(inputs: RawProofInputs) {
  const toBigIntString = (value: string | number) => {
    try {
      return BigInt(value).toString();
    } catch (error) {
      return value.toString();
    }
  };

  return {
    sigilHashes: inputs.sigilHashes.map(toBigIntString),
    sigilChains: inputs.sigilChains.map((chain) => Number(chain)),
    pathElements: inputs.pathElements.map((path) =>
      path.map((node) => toBigIntString(node))
    ),
    pathIndices: inputs.pathIndices.map((path) =>
      path.map((index) => Number(index))
    ),
    root: toBigIntString(inputs.root),
    nullifierHash: toBigIntString(inputs.nullifierHash),
    signalHash: toBigIntString(inputs.signalHash),
    userAddress: inputs.userAddress,
  };
}

export default function ZkSoulKeyMint({ user }: { user: string }) {
  const [sigils, setSigils] = useState<SoulSigil[]>([]);
  const [loadingSigils, setLoadingSigils] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    if (!user) {
      setSigils([]);
      return;
    }

    let isMounted = true;

    const loadSigils = async () => {
      setLoadingSigils(true);
      setError(null);

      try {
        const response = await fetch(`/api/sigils?user=${encodeURIComponent(user)}`);

        if (!response.ok) {
          throw new Error(`Failed to load SoulSigils (${response.status})`);
        }

        const data = (await response.json()) as SoulSigil[];

        if (!Array.isArray(data)) {
          throw new Error("Unexpected response while loading SoulSigils");
        }

        if (isMounted) {
          setSigils(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load sigils", err);
          setError(
            err instanceof Error ? err.message : "Failed to load SoulSigils."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingSigils(false);
        }
      }
    };

    loadSigils();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggle = useCallback(
    (index: number) => {
      setSelected((prev) => {
        if (prev.includes(index)) {
          return prev.filter((value) => value !== index);
        }

        if (prev.length >= REQUIRED_SIGILS) {
          return prev;
        }

        return [...prev, index];
      });
    },
    []
  );

  const selectionError = useMemo(() => {
    if (selected.length === 0) {
      return "Select three SoulSigils to continue.";
    }

    if (selected.length < REQUIRED_SIGILS) {
      const remaining = REQUIRED_SIGILS - selected.length;
      return `Select ${remaining} more SoulSigil${remaining === 1 ? "" : "s"}.`;
    }

    return null;
  }, [selected.length]);

  const generateAndMint = useCallback(async () => {
    if (minting || selected.length !== REQUIRED_SIGILS) {
      return;
    }

    setMinting(true);
    setError(null);

    try {
      const chosenSigils = selected.map((index) => sigils[index]);

      if (chosenSigils.some((sigil) => !sigil)) {
        throw new Error("Unable to determine selected SoulSigils.");
      }

      const proofResponse = await fetch(`/api/sigils/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          tokenIds: chosenSigils.map((sigil) => sigil.tokenId),
        }),
      });

      if (!proofResponse.ok) {
        throw new Error(`Failed to retrieve Merkle proof (${proofResponse.status})`);
      }

      const { inputs } = (await proofResponse.json()) as ProofResponse;

      const normalizedInputs = normaliseInputs(inputs);

      const { proof, publicSignals } = await groth16.fullProve(
        normalizedInputs,
        "/zk/zkSoulProof.wasm",
        "/zk/zkSoulProof_final.zkey"
      );

      const mintResponse = await fetch("/api/mint/soulkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, publicSignals }),
      });

      if (!mintResponse.ok) {
        throw new Error(`Mint failed (${mintResponse.status})`);
      }

      const result = (await mintResponse.json()) as ProofSubmissionResponse;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.message) {
        alert(result.message);
      }

      setSelected([]);
    } catch (err) {
      console.error("Minting failed", err);
      setError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  }, [minting, selected, sigils, user]);

  return (
    <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4 shadow">
      <h2 className="text-lg font-bold">🔒 ZK SoulKey Mint</h2>
      <p className="mb-4 text-sm text-gray-700">
        Select exactly three SoulSigils to forge your SoulKey anonymously.
      </p>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {sigils.map((sigil, index) => {
          const isSelected = selected.includes(index);

          return (
            <button
              key={`${sigil.tokenId}-${index}`}
              type="button"
              onClick={() => toggle(index)}
              className={`flex flex-col rounded border p-2 text-left transition hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isSelected ? "ring-2 ring-indigo-500" : ""}`}
            >
              <div className="flex-1">
                <img
                  src={sigil.image}
                  alt={`SoulSigil ${sigil.tokenId}`}
                  className="h-32 w-full rounded object-cover"
                />
              </div>
              <div className="mt-2 text-xs font-medium uppercase text-gray-600">
                {sigil.chain}
              </div>
            </button>
          );
        })}
      </div>

      {loadingSigils && (
        <p className="mt-3 text-xs text-gray-500">Loading your SoulSigils…</p>
      )}

      {selectionError && (
        <p className="mt-3 text-xs text-gray-600">{selectionError}</p>
      )}

      <button
        type="button"
        disabled={minting || selected.length !== REQUIRED_SIGILS}
        onClick={generateAndMint}
        className="mt-4 inline-flex items-center rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {minting ? "Forging…" : "Mint SoulKey"}
      </button>
    </div>
  );
}
