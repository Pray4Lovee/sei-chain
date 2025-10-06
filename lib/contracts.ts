"use client";

import { Contract, type ContractRunner, type InterfaceAbi } from "ethers";

export const LUMENCARD_ADDRESS = process.env.NEXT_PUBLIC_LUMENCARD_ADDRESS ?? "0xYourLumenCardAddress";

export const LUMENCARD_ABI: InterfaceAbi = [
  "function balances(address user) view returns (uint256 spendable, uint256 lifetimeDeposits)",
  "function deposit(uint256 amount)",
  "function spend(address recipient, uint256 amount)"
];

export function getLumenCardContract(runner: ContractRunner) {
  return new Contract(LUMENCARD_ADDRESS, LUMENCARD_ABI, runner);
}
