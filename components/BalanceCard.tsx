"use client";

import { useEffect, useState } from "react";
import { Contract, formatUnits, getAddress, parseUnits } from "ethers";
import { getProvider } from "../lib/web3";
import { getLumenCardContract, LUMENCARD_ADDRESS } from "../lib/contracts";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0xYourUSDCAddress";

export default function BalanceCard({ user }: { user: string }) {
  const [spendable, setSpendable] = useState("0");
  const [deposits, setDeposits] = useState("0");
  const [depositAmount, setDepositAmount] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendTo, setSpendTo] = useState("");

  async function loadBalances(options?: { isCancelled?: () => boolean }) {
    if (!user) {
      if (!options?.isCancelled?.()) {
        setSpendable("0");
        setDeposits("0");
      }
      return;
    }

    try {
      const provider = await getProvider();
      const contract = getLumenCardContract(provider);
      const bal = (await contract.balances(user)) as {
        spendable?: bigint;
        lifetimeDeposits?: bigint;
        0: bigint;
        1: bigint;
      };

      const spendableValue = bal.spendable ?? bal[0];
      const depositValue = bal.lifetimeDeposits ?? bal[1];

      if (options?.isCancelled?.()) {
        return;
      }

      setSpendable(formatUnits(spendableValue, 6));
      setDeposits(formatUnits(depositValue, 6));
    } catch (err) {
      console.error("Failed to load balances", err);
    }
  }

  async function deposit() {
    const normalizedAmount = depositAmount.trim();

    if (!normalizedAmount || Number(normalizedAmount) <= 0) {
      return;
    }

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const amount = parseUnits(normalizedAmount, 6);

      const usdc = new Contract(
        USDC_ADDRESS,
        ["function approve(address spender,uint256 amount) external returns (bool)"],
        signer
      );

      const approveTx = await usdc.approve(LUMENCARD_ADDRESS, amount);
      await approveTx.wait();

      const vault = getLumenCardContract(signer);
      const tx = await vault.deposit(amount);
      await tx.wait();

      await loadBalances();
      setDepositAmount("");
    } catch (err) {
      console.error("Deposit failed", err);
    }
  }

  async function spend() {
    const normalizedAmount = spendAmount.trim();
    const normalizedRecipientInput = spendTo.trim();

    if (!normalizedAmount || Number(normalizedAmount) <= 0 || !normalizedRecipientInput) {
      return;
    }

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const vault = getLumenCardContract(signer);

      const normalizedRecipient = getAddress(normalizedRecipientInput);
      const amount = parseUnits(normalizedAmount, 6);

      const tx = await vault.spend(normalizedRecipient, amount);
      await tx.wait();

      await loadBalances();
      setSpendAmount("");
      setSpendTo("");
    } catch (err) {
      console.error("Spend failed", err);
    }
  }

  useEffect(() => {
    let ignore = false;

    void loadBalances({
      isCancelled: () => ignore,
    });

    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4">
      <h2 className="font-bold">Your LumenCard Balance</h2>
      <p>Spendable: {spendable} USDC</p>
      <p>Lifetime Deposits: {deposits} USDC</p>

      <div className="mt-4">
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount to deposit"
          className="border p-2 rounded mr-2"
          min="0"
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
          onClick={deposit}
        >
          Deposit
        </button>
      </div>

      <div className="mt-4">
        <input
          type="text"
          value={spendTo}
          onChange={(e) => setSpendTo(e.target.value)}
          placeholder="Recipient address"
          className="border p-2 rounded mr-2"
        />
        <input
          type="number"
          value={spendAmount}
          onChange={(e) => setSpendAmount(e.target.value)}
          placeholder="Amount to spend"
          className="border p-2 rounded mr-2"
          min="0"
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
          onClick={spend}
        >
          Spend
        </button>
      </div>
    </div>
  );
}
