"use client";

import { useEffect, useMemo, useState } from "react";
import { groth16 } from "snarkjs";

interface Sigil {
  tokenId: string;
  image: string;
  chain: string;
}

interface ProofInputs {
  sigilHashes: (string | number)[];
  sigilChains: (string | number)[];
  pathElements: (string | number)[][];
  pathIndices: (string | number)[][];
  root: string | number;
  nullifierHash: string | number;
  signalHash: string | number;
  userAddress: string;
}

interface ProofResponse {
  inputs: ProofInputs;
}

interface MintResponse {
  message: string;
}

interface Props {
  user: string;
}

export default function ZkSoulKeyMint({ user }: Props) {
  const [sigils, setSigils] = useState<Sigil[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSigils() {
      try {
        const res = await fetch(`/api/sigils?user=${encodeURIComponent(user)}`);
        if (!res.ok) {
          throw new Error(`Failed to load sigils (${res.status})`);
        }
        const data: Sigil[] = await res.json();
        setSigils(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load SoulSigils. Please try again later.");
      }
    }

    if (user) {
      loadSigils();
    }
  }, [user]);

  const canMint = useMemo(() => selected.length === 3 && !minting, [selected.length, minting]);

  function toggle(index: number) {
    setSelected((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, index];
    });
  }

  async function generateAndMint() {
    if (selected.length !== 3) {
      return;
    }

    setMinting(true);
    setError(null);

    try {
      const selectedSigils = selected.map((i) => sigils[i]);

      const proofRes = await fetch("/api/sigils/proofs", {
        method: "POST",
        body: JSON.stringify({
          user,
          tokenIds: selectedSigils.map((sigil) => sigil.tokenId),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!proofRes.ok) {
        throw new Error(`Failed to fetch Merkle proofs (${proofRes.status})`);
      }

      const { inputs }: ProofResponse = await proofRes.json();

      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        "/zk/zkSoulProof.wasm",
        "/zk/zkSoulProof_final.zkey"
      );

      const txRes = await fetch("/api/mint/soulkey", {
        method: "POST",
        body: JSON.stringify({ proof, publicSignals }),
        headers: { "Content-Type": "application/json" },
      });

      if (!txRes.ok) {
        throw new Error(`Minting request failed (${txRes.status})`);
      }

      const result: MintResponse = await txRes.json();
      alert(result.message);
      setSelected([]);
    } catch (err) {
      console.error(err);
      setError("Minting failed. Please try again or contact support.");
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="mt-6 border p-4 rounded shadow bg-gray-50">
      <h2 className="text-lg font-bold">🔒 ZK SoulKey Mint</h2>
      <p className="text-sm mb-2">Select exactly 3 SoulSigils to forge your SoulKey anonymously.</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {sigils.map((sigil, i) => (
          <button
            type="button"
            key={sigil.tokenId ?? i}
            onClick={() => toggle(i)}
            className={`p-1 border rounded cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              selected.includes(i) ? "ring-2 ring-indigo-500" : "hover:border-gray-500"
            }`}
          >
            <img src={sigil.image} alt={`SoulSigil ${i + 1}`} className="w-full rounded" />
            <div className="text-xs text-center mt-1">{sigil.chain}</div>
          </button>
        ))}
      </div>
      <button
        disabled={!canMint}
        onClick={generateAndMint}
        className="mt-4 px-4 py-2 bg-indigo-700 text-white rounded disabled:bg-gray-400"
      >
        {minting ? "Forging..." : "Mint SoulKey"}
      </button>
    </div>
  );
}
