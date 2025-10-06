import fetch from "node-fetch";

const HL_API = process.env.HL_API || "https://api.hyperliquid.xyz/info";
const HL_VAULT = process.env.HL_VAULT || "0xYourHyperVaultAddress";

export async function getHyperliquidRoyalties() {
  try {
    const response = await fetch(`${HL_API}/vaultState?address=${HL_VAULT}`);

    if (!response.ok) {
      throw new Error(`Hyperliquid request failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      network: "Hyperliquid",
      vault: HL_VAULT,
      totalRoyalties: data?.royaltiesAccrued || "0",
    };
  } catch (err) {
    console.error("Hyperliquid connector error:", err);
    return { network: "Hyperliquid", vault: HL_VAULT, totalRoyalties: "0" };
  }
}
