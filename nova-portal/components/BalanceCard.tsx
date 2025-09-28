"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, Signer, formatUnits, parseUnits } from "ethers";

const VAULT_ABI = [
  "function balances(address) view returns (uint256 spendable, uint256 lifetimeDeposits)",
  "function deposit(uint256 amount)",
  "function spend(address to, uint256 amount)",
  "function holoVerified(address) view returns (bool)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];

const DEFAULT_DECIMALS = 6;
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_LUMENCARD_VAULT ?? "";
const STABLE_ADDRESS = process.env.NEXT_PUBLIC_STABLE_TOKEN ?? "";
const FALLBACK_RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum.publicnode.com";

type Props = {
  user: string;
};

type Status = { kind: "idle" } | { kind: "loading"; message: string } | { kind: "success"; message: string } | { kind: "error"; message: string };

export default function BalanceCard({ user }: Props) {
  const [spendable, setSpendable] = useState("0");
  const [lifetime, setLifetime] = useState("0");
  const [stableBalance, setStableBalance] = useState("0");
  const [decimals, setDecimals] = useState<number>(DEFAULT_DECIMALS);
  const [depositAmount, setDepositAmount] = useState("0");
  const [spendAmount, setSpendAmount] = useState("0");
  const [spendRecipient, setSpendRecipient] = useState("");
  const [holoVerified, setHoloVerified] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const provider = useMemo(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return new BrowserProvider((window as any).ethereum);
    }
    return new JsonRpcProvider(FALLBACK_RPC);
  }, []);

  const readVault = useCallback(async () => {
    if (!VAULT_ADDRESS) {
      return;
    }
    const vault = new Contract(VAULT_ADDRESS, VAULT_ABI, provider);
    const [balanceStruct, verified] = await Promise.all([
      vault.balances(user),
      vault.holoVerified(user)
    ]);

    let tokenDecimals = decimals;
    if (STABLE_ADDRESS) {
      try {
        const erc20 = new Contract(STABLE_ADDRESS, ERC20_ABI, provider);
        tokenDecimals = await erc20.decimals();
        setDecimals(Number(tokenDecimals));
        const tokenBalance = await erc20.balanceOf(user);
        setStableBalance(formatUnits(tokenBalance, tokenDecimals));
      } catch (err) {
        tokenDecimals = decimals;
      }
    }

    setSpendable(formatUnits(balanceStruct.spendable, tokenDecimals));
    setLifetime(formatUnits(balanceStruct.lifetimeDeposits, tokenDecimals));
    setHoloVerified(Boolean(verified));
  }, [decimals, provider, user, VAULT_ADDRESS, STABLE_ADDRESS]);

  useEffect(() => {
    readVault().catch((err) => {
      console.warn("Failed to load balances", err);
    });
  }, [readVault]);

  const withSigner = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("Wallet connection required for this action");
    }
    const browserProvider = new BrowserProvider((window as any).ethereum);
    const signer = await browserProvider.getSigner();
    return signer;
  }, []);

  const ensureAllowance = useCallback(
    async (value: bigint, signerAddress: string, signer: Signer) => {
      if (!STABLE_ADDRESS || !VAULT_ADDRESS) {
        return;
      }
      const token = new Contract(STABLE_ADDRESS, ERC20_ABI, signer);
      const allowance = await token.allowance(signerAddress, VAULT_ADDRESS);
      if (allowance < value) {
        const approveTx = await token.approve(VAULT_ADDRESS, value);
        setStatus({ kind: "loading", message: "Approving vault to spend tokens..." });
        await approveTx.wait();
      }
    },
    []
  );

  const handleDeposit = useCallback(
    async (evt: FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      if (!VAULT_ADDRESS) {
        setStatus({ kind: "error", message: "Vault address not configured" });
        return;
      }
      if (!STABLE_ADDRESS) {
        setStatus({ kind: "error", message: "Stable token address not configured" });
        return;
      }
      try {
        const value = parseUnits(depositAmount, decimals);
        setStatus({ kind: "loading", message: "Submitting deposit..." });
        const signer = await withSigner();
        const account = await signer.getAddress();
        await ensureAllowance(value, account, signer);
        const vault = new Contract(VAULT_ADDRESS, VAULT_ABI, signer);
        const tx = await vault.deposit(value);
        await tx.wait();
        setDepositAmount("0");
        setStatus({ kind: "success", message: "Deposit confirmed" });
        await readVault();
      } catch (err: any) {
        console.error(err);
        setStatus({ kind: "error", message: err?.message ?? "Deposit failed" });
      }
    },
    [VAULT_ADDRESS, STABLE_ADDRESS, depositAmount, decimals, ensureAllowance, readVault, withSigner]
  );

  const handleSpend = useCallback(
    async (evt: FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      if (!VAULT_ADDRESS) {
        setStatus({ kind: "error", message: "Vault address not configured" });
        return;
      }
      try {
        const value = parseUnits(spendAmount, decimals);
        setStatus({ kind: "loading", message: "Processing spend..." });
        const signer = await withSigner();
        const vault = new Contract(VAULT_ADDRESS, VAULT_ABI, signer);
        const tx = await vault.spend(spendRecipient, value);
        await tx.wait();
        setSpendAmount("0");
        setSpendRecipient("");
        setStatus({ kind: "success", message: "Spend successful" });
        await readVault();
      } catch (err: any) {
        console.error(err);
        setStatus({ kind: "error", message: err?.message ?? "Spend failed" });
      }
    },
    [VAULT_ADDRESS, decimals, spendAmount, spendRecipient, readVault, withSigner]
  );

  const handleHoloVerify = useCallback(async () => {
    try {
      const code = window.prompt("Enter your Holo verification code");
      if (!code) {
        return;
      }
      setStatus({ kind: "loading", message: "Submitting Holo proof..." });
      await fetch("/api/holo-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, code })
      });
      setStatus({ kind: "success", message: "Holo verification recorded. Keeper will finalize on-chain." });
      setHoloVerified(true);
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message ?? "Failed to submit Holo proof" });
    }
  }, [user]);

  return (
    <div className="mt-6 p-6 border rounded-xl shadow-md max-w-2xl">
      <h2 className="text-xl font-semibold">Vault Balances</h2>
      <div className="mt-2 text-sm text-gray-600 space-y-1">
        <p>Spendable Balance: <span className="font-mono">{spendable}</span></p>
        <p>Lifetime Deposits: <span className="font-mono">{lifetime}</span></p>
        <p>Stable Wallet Balance: <span className="font-mono">{stableBalance}</span></p>
        <p>Holo Verification: {holoVerified ? <span className="text-green-600">Verified</span> : <span className="text-yellow-600">Pending</span>}</p>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleHoloVerify}
          className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Verify with Holo
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={handleDeposit} className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold">Deposit</h3>
          <label className="block text-sm">
            Amount
            <input
              type="number"
              min="0"
              step="any"
              value={depositAmount}
              onChange={(evt) => setDepositAmount(evt.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Deposit
          </button>
        </form>

        <form onSubmit={handleSpend} className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold">Spend</h3>
          <label className="block text-sm">
            Recipient
            <input
              type="text"
              value={spendRecipient}
              onChange={(evt) => setSpendRecipient(evt.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="0x..."
              required
            />
          </label>
          <label className="block text-sm">
            Amount
            <input
              type="number"
              min="0"
              step="any"
              value={spendAmount}
              onChange={(evt) => setSpendAmount(evt.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <button type="submit" className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            Spend
          </button>
        </form>
      </div>

      {status.kind !== "idle" && (
        <p
          className={`mt-4 text-sm ${
            status.kind === "error"
              ? "text-red-600"
              : status.kind === "success"
              ? "text-green-600"
              : "text-gray-600"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
