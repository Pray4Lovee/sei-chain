import { Contract, ethers } from "ethers";

export const LUMENCARD_ADDRESS = "0xYourDeployedVaultAddress";

export const LUMENCARD_ABI = [
  "function deposit(uint256 amount) external",
  "function spend(address to, uint256 amount) external",
  "function balances(address) view returns (uint256 spendable, uint256 lifetimeDeposits)",
  "event Deposit(address indexed user, uint256 amount, uint256 royalty, uint256 credited)",
  "event Spend(address indexed user, address to, uint256 amount)"
];

export function getLumenCardContract(provider: ethers.providers.Web3Provider): Contract {
  const signer = provider.getSigner();
  return new ethers.Contract(LUMENCARD_ADDRESS, LUMENCARD_ABI, signer);
}
