import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

export function getProvider(): ethers.providers.Web3Provider {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
  }
  throw new Error("No wallet found. Please install MetaMask or another wallet.");
}
