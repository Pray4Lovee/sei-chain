"use client";

import { useCallback } from "react";

interface WalletConnectProps {
  onConnected: (address: string) => void;
}

export default function WalletConnect({ onConnected }: WalletConnectProps) {
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Wallet not found. Please install MetaMask.");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      onConnected(accounts[0]);
    }
  }, [onConnected]);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">Wallet</h2>
      <button onClick={connect} className="mt-2">
        Connect Wallet
      </button>
    </div>
  );
}
