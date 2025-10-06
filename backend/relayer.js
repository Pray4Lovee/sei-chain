import { ethers } from "ethers";
import { getSeiRoyalties } from "./connectors/sei.js";
import { getHyperliquidRoyalties } from "./connectors/hyperliquid.js";

const EVM_RPC = process.env.EVM_RPC ?? "https://base-rpc.publicnode.com";
const ROUTER_ADDRESS = process.env.ROYALTY_ROUTER_ADDRESS;
const WALLET_KEY = process.env.RELAYER_PK;

const ROUTER_ABI = [
  "function settleFromSei(uint256 amount) external",
  "function settleFromHyperliquid(uint256 amount) external",
];

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toBigNumberish(value) {
  try {
    const bi = BigInt(value);
    return bi;
  } catch (error) {
    throw new Error(`Invalid numeric value received: ${value}`);
  }
}

async function settleSeiRoyalties(router) {
  const sei = await getSeiRoyalties();
  const amount = toBigNumberish(sei.totalRoyalties);
  if (amount === 0n) {
    console.log("No Sei royalties to settle");
    return;
  }

  console.log(`Sei royalties detected: ${amount.toString()} (base units)`);
  const tx = await router.settleFromSei(amount);
  console.log(`Submitted Sei settlement tx: ${tx.hash}`);
  await tx.wait();
  console.log("Sei royalties settled to LumenCard vault");
}

async function settleHyperliquidRoyalties(router) {
  const hyper = await getHyperliquidRoyalties();
  const amount = toBigNumberish(hyper.totalRoyalties);
  if (amount === 0n) {
    console.log("No Hyperliquid royalties to settle");
    return;
  }

  console.log(`Hyperliquid royalties detected: ${amount.toString()} (base units)`);
  const tx = await router.settleFromHyperliquid(amount);
  console.log(`Submitted Hyperliquid settlement tx: ${tx.hash}`);
  await tx.wait();
  console.log("Hyperliquid royalties settled to LumenCard vault");
}

async function main() {
  requireEnv("ROYALTY_ROUTER_ADDRESS", ROUTER_ADDRESS);
  const walletKey = requireEnv("RELAYER_PK", WALLET_KEY);

  const provider = new ethers.JsonRpcProvider(EVM_RPC);
  const signer = new ethers.Wallet(walletKey, provider);
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

  await settleSeiRoyalties(router);
  await settleHyperliquidRoyalties(router);
}

main().catch((error) => {
  console.error("Relayer execution failed", error);
  process.exitCode = 1;
});
