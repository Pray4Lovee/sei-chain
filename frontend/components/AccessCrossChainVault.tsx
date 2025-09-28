"use client";

import { useCallback, useEffect, useState } from "react";

type ProofResponse = {
  proof: unknown;
  publicSignals: unknown;
};

type SubmitResponse = {
  success: boolean;
};

type AccessResponse = {
  hasAccess: boolean;
};

type Props = {
  user: string;
};

export default function AccessCrossChainVault({ user }: Props) {
  const [minting, setMinting] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  const checkAccess = useCallback(async () => {
    const res = await fetch(`/api/checkAccess?user=${user}`);
    if (!res.ok) {
      return;
    }

    const data: AccessResponse = await res.json();
    setAccessGranted(data.hasAccess);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void checkAccess();
  }, [checkAccess, user]);

  const requestCrossChainAccess = useCallback(async () => {
    setMinting(true);

    try {
      const proofResponse = await fetch(`/api/zkProof?user=${user}`);
      if (!proofResponse.ok) {
        throw new Error("Failed to generate proof");
      }

      const { proof, publicSignals }: ProofResponse = await proofResponse.json();

      const txResponse = await fetch("/api/submitCrossChainProof", {
        method: "POST",
        body: JSON.stringify({ proof, publicSignals }),
        headers: { "Content-Type": "application/json" }
      });

      if (!txResponse.ok) {
        throw new Error("Submission failed");
      }

      const data: SubmitResponse = await txResponse.json();
      setAccessGranted(data.success);

      if (data.success) {
        alert("Access granted!");
      } else {
        alert("Access denied!");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to complete cross-chain access request.");
    } finally {
      setMinting(false);
    }
  }, [user]);

  return (
    <div className="mt-4 rounded border bg-gray-50 p-4 shadow">
      <h2 className="text-lg font-bold">🌍 Cross-Chain Vault Access</h2>
      {accessGranted ? (
        <p className="font-semibold text-green-700">You have access to the vault!</p>
      ) : (
        <>
          <p className="mb-2 text-sm">
            Submit a multi-factor zk proof to unlock your cross-chain SoulKey vault.
          </p>
          <button
            onClick={requestCrossChainAccess}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
            disabled={minting}
          >
            {minting ? "Verifying..." : "Request Vault Access"}
          </button>
        </>
      )}
    </div>
  );
}
