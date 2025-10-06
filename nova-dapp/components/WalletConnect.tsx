"use client";

import { useState } from "react";
import { getProvider } from "../lib/web3";

interface WalletConnectProps {
  onConnected: (addr: string) => void;
}

export default function WalletConnect({ onConnected }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    try {
      setError(null);
      const provider = getProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      onConnected(addr);
    } catch (err) {
      console.error(err);
      setError("Failed to connect wallet. Please try again.");
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-md">
      {address ? (
        <p>
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      ) : (
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
          onClick={connect}
        >
          Connect Wallet
        </button>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
