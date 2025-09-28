"use client";

import { useEffect, useState } from "react";

type Props = {
  onConnected: (address: string) => void;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
};

export default function WalletConnect({ onConnected }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const provider = (window as any).ethereum as EthereumProvider | undefined;
    if (!provider) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      const next = accounts[0] ?? null;
      setAddress(next);
      if (next) {
        onConnected(next);
      }
    };

    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (Array.isArray(accounts) && accounts[0]) {
          handleAccountsChanged(accounts as string[]);
        }
      })
      .catch(() => undefined);

    provider?.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      provider?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [onConnected]);

  const connect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const provider = (window as any).ethereum as EthereumProvider | undefined;
      if (!provider) {
        setError("No injected wallet detected. Install MetaMask or a compatible wallet.");
        return;
      }
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        setError("Wallet did not return any accounts.");
        return;
      }
      const next = accounts[0];
      setAddress(next);
      onConnected(next);
    } catch (err: any) {
      setError(err?.message ?? "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg shadow-sm max-w-xl">
      <h2 className="font-semibold text-lg">Wallet</h2>
      {address ? (
        <p className="text-sm text-green-600 break-all">Connected: {address}</p>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
