const { ethers } = require("ethers");
const { getSeiRoyalties } = require("./connectors/sei.js");
const { getHyperliquidRoyalties } = require("./connectors/hyperliquid.js");

const EVM_RPC = process.env.EVM_RPC_URL || "https://base-rpc.publicnode.com";
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
const WALLET_KEY = process.env.RELAYER_PK;

const ROUTER_ABI = [
  "function settleFromSei(uint256 amount) external",
  "function settleFromHyperliquid(uint256 amount) external",
  "function settleFromCCTP(bytes message, bytes attestation, uint256 amount) external"
];

function requireEnv(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function settleIfNeeded(label, amount, settleFn) {
  if (amount > 0n) {
    console.log(`${label} royalties: ${amount.toString()}`);
    const tx = await settleFn(amount);
    console.log(`${label} settlement tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`${label} settlement confirmed in block ${receipt.blockNumber}`);
  } else {
    console.log(`${label} royalties: 0`);
  }
}

async function main() {
  requireEnv(WALLET_KEY, "RELAYER_PK");
  requireEnv(ROUTER_ADDRESS, "ROUTER_ADDRESS");

  const provider = new ethers.JsonRpcProvider(EVM_RPC);
  const signer = new ethers.Wallet(WALLET_KEY, provider);
  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

  const sei = await getSeiRoyalties();
  await settleIfNeeded("Sei", sei.totalRoyalties, async (amount) =>
    router.settleFromSei(amount)
  );

  const hyper = await getHyperliquidRoyalties();
  await settleIfNeeded("Hyperliquid", hyper.totalRoyalties, async (amount) =>
    router.settleFromHyperliquid(amount)
  );
}

main().catch((error) => {
  console.error("Relayer execution failed:", error);
  process.exit(1);
});
