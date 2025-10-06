import { ethers } from "ethers";

export function getProvider() {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }
  throw new Error("No wallet found. Please install MetaMask or another wallet.");
}
