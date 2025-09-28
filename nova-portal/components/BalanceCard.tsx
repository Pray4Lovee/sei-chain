"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

const ABI = [
  "function balances(address) view returns (uint256 spendable, uint256 lifetimeDeposits)",
  "function deposit(uint256 amount)",
  "function spend(address to, uint256 amount)",
  "function verifyWithHolo(address user)",
  "function holoVerified(address) view returns (bool)",
  "function stable() view returns (address)",
  "function royaltyBps() view returns (uint256)",
  "function royaltyReceiver() view returns (address)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
];

interface BalanceCardProps {
  user: string;
}

export default function BalanceCard({ user }: BalanceCardProps) {
  const [spendable, setSpendable] = useState("0");
  const [lifetimeDeposits, setLifetimeDeposits] = useState("0");
  const [decimals, setDecimals] = useState(18);
  const [amount, setAmount] = useState("0");
  const [recipient, setRecipient] = useState("0x");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState(false);
  const [holoCode, setHoloCode] = useState("");
  const [royaltyInfo, setRoyaltyInfo] = useState({ bps: 0, receiver: "" });

  const contractAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
  const provider = useMemo(() => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    return new BrowserProvider(window.ethereum);
  }, []);

  const loadBalances = useCallback(async () => {
    if (!provider || !contractAddress) return;
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, ABI, signer);
    const stableAddr: string = await contract.stable();
    const erc20 = new Contract(stableAddr, ERC20_ABI, signer);
    const tokenDecimals: number = await erc20.decimals();
    setDecimals(tokenDecimals);

    const userBalance = await contract.balances(user);
    setSpendable(formatUnits(userBalance.spendable, tokenDecimals));
    setLifetimeDeposits(formatUnits(userBalance.lifetimeDeposits, tokenDecimals));
    const holo = await contract.holoVerified(user);
    setVerified(holo);
    const bps = await contract.royaltyBps();
    const receiver = await contract.royaltyReceiver();
    setRoyaltyInfo({ bps: Number(bps), receiver });
  }, [provider, contractAddress, user]);

  useEffect(() => {
    loadBalances().catch((err) => console.error(err));
  }, [loadBalances]);

  const approveIfNeeded = useCallback(
    async (erc20: Contract, spender: string, value: bigint) => {
      const current = await erc20.allowance(user, spender);
      if (current < value) {
        const tx = await erc20.approve(spender, value);
        setStatus("Approving token...");
        await tx.wait();
      }
    },
    [user]
  );

  const onDeposit = useCallback(async () => {
    try {
      if (!provider || !contractAddress) throw new Error("Missing provider");
      if (!window.ethereum) throw new Error("Wallet not connected");
      const value = parseUnits(amount, decimals);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, ABI, signer);
      const stableAddr: string = await contract.stable();
      const erc20 = new Contract(stableAddr, ERC20_ABI, signer);
      await approveIfNeeded(erc20, contractAddress, value);
      setStatus("Sending deposit...");
      const tx = await contract.deposit(value);
      await tx.wait();
      setStatus("Deposit confirmed");
      await loadBalances();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Deposit failed");
    }
  }, [amount, decimals, provider, contractAddress, approveIfNeeded, loadBalances]);

  const onSpend = useCallback(async () => {
    try {
      if (!provider || !contractAddress) throw new Error("Missing provider");
      if (!window.ethereum) throw new Error("Wallet not connected");
      const value = parseUnits(amount, decimals);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, ABI, signer);
      setStatus("Sending spend...");
      const tx = await contract.spend(recipient, value);
      await tx.wait();
      setStatus("Spend confirmed");
      await loadBalances();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Spend failed");
    }
  }, [amount, decimals, provider, contractAddress, recipient, loadBalances]);

  const onVerify = useCallback(async () => {
    try {
      setStatus("Checking Holo proof...");
      const res = await fetch("/api/holo-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, code: holoCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      setVerified(true);
      setStatus("Holo verification success (placeholder)");
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Verification failed");
    }
  }, [user, holoCode]);

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold">LumenCard Balance</h2>
      <p className="mt-2">Spendable: {spendable}</p>
      <p>Lifetime Deposits: {lifetimeDeposits}</p>
      <p>Royalty: {royaltyInfo.bps / 100}% to {royaltyInfo.receiver}</p>
      <p className="mt-2">Holo Verified: {verified ? "Yes" : "No"}</p>

      <div className="mt-4">
        <label className="block text-sm mb-1">Amount</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full" />
      </div>
      <div className="mt-2">
        <label className="block text-sm mb-1">Recipient (for spend)</label>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full" />
      </div>

      <div className="mt-2">
        <label className="block text-sm mb-1">Holo Code (use 123456)</label>
        <input value={holoCode} onChange={(e) => setHoloCode(e.target.value)} className="w-full" />
      </div>

      <div className="mt-4 flex gap-3 flex-wrap">
        <button onClick={onDeposit}>Deposit</button>
        <button onClick={onSpend}>Spend</button>
        <button onClick={onVerify}>Holo Verify</button>
      </div>
      {status && <p className="mt-3 text-sm text-purple-200">{status}</p>}
    </div>
  );
}
