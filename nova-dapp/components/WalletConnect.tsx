"use client";

import { useState } from "react";
import { getProvider } from "../lib/web3";

interface WalletConnectProps {
  onConnected: (addr: string) => void;
}

export default function WalletConnect({ onConnected }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function connect() {
    setError(null);
    setIsConnecting(true);
    try {
      const provider = getProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      onConnected(addr);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="p-6 border border-indigo-500/50 rounded-2xl shadow-lg bg-slate-900/70 backdrop-blur">
      <div className="flex flex-col gap-4">
        {address ? (
          <p className="text-sm text-indigo-200">
            Connected: <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </p>
        ) : (
          <button
            className="bg-indigo-500 hover:bg-indigo-400 focus:ring-2 focus:ring-indigo-300 text-white px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
