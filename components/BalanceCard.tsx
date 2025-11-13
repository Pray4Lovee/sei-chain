"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getProvider } from "../lib/web3";
import { getLumenCardContract, LUMENCARD_ADDRESS, LUMENCARD_ABI } from "../lib/contracts";

// Replace with your actual USDC token address
const USDC_ADDRESS = "0xYourUSDCAddress";

export default function BalanceCard({ user }: { user: string }) {
  const [spendable, setSpendable] = useState("0");
  const [deposits, setDeposits] = useState("0");
  const [depositAmount, setDepositAmount] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendTo, setSpendTo] = useState("");

  async function load() {
    try {
      const provider = getProvider();
      const contract = getLumenCardContract(provider);
      const bal = await contract.balances(user);
      setSpendable(ethers.utils.formatUnits(bal.spendable, 6)); // USDC decimals = 6
      setDeposits(ethers.utils.formatUnits(bal.lifetimeDeposits, 6));
    } catch (err) {
      console.error(err);
    }
  }

  async function deposit() {
    try {
      const provider = getProvider();
      const signer = provider.getSigner();

      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        ["function approve(address spender,uint256 amount) external returns (bool)"],
        signer
      );

      const amount = ethers.utils.parseUnits(depositAmount, 6);

      // Approve vault
      const approveTx = await usdc.approve(LUMENCARD_ADDRESS, amount);
      await approveTx.wait();

      // Deposit
      const vault = new ethers.Contract(LUMENCARD_ADDRESS, LUMENCARD_ABI, signer);
      const tx = await vault.deposit(amount);
      await tx.wait();

      await load();
      setDepositAmount("");
    } catch (err) {
      console.error(err);
    }
  }

  async function spend() {
    try {
      const provider = getProvider();
      const signer = provider.getSigner();
      const vault = new ethers.Contract(LUMENCARD_ADDRESS, LUMENCARD_ABI, signer);

      const amount = ethers.utils.parseUnits(spendAmount, 6);
      const tx = await vault.spend(spendTo, amount);
      await tx.wait();

      await load();
      setSpendAmount("");
      setSpendTo("");
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  return (
    <div className="p-4 border rounded-lg shadow-md mt-4">
      <h2 className="font-bold">Your LumenCard Balance</h2>
      <p>Spendable: {spendable} USDC</p>
      <p>Lifetime Deposits: {deposits} USDC</p>

      {/* Deposit Section */}
      <div className="mt-4">
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount to deposit"
          className="border p-2 rounded mr-2"
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
          onClick={deposit}
        >
          Deposit
        </button>
      </div>

      {/* Spend Section */}
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
