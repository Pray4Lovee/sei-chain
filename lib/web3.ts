"use client";

import { BrowserProvider } from "ethers";

export async function getProvider(): Promise<BrowserProvider> {
  if (typeof window === "undefined") {
    throw new Error("getProvider can only be called in the browser");
  }

  const { ethereum } = window as unknown as { ethereum?: unknown };

  if (!ethereum) {
    throw new Error("No injected Ethereum provider found");
  }

  return new BrowserProvider(ethereum as any);
}
