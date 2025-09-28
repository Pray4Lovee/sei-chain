const DEFAULT_API = "https://api.hyperliquid.xyz/info";
const DEFAULT_VAULT_ADDRESS = "0xYourHyperVaultAddress";

let cachedFetch = null;
async function resolveFetch() {
  if (cachedFetch) {
    return cachedFetch;
  }
  if (typeof fetch === "function") {
    cachedFetch = (...args) => fetch(...args);
    return cachedFetch;
  }

  throw new Error(
    "Fetch API is not available in this environment. Please run on Node.js 18+ or provide a global fetch polyfill."
  );
}

async function getHyperliquidRoyalties() {
  const apiBase = process.env.HYPERLIQUID_API || DEFAULT_API;
  const vaultAddress = process.env.HYPERLIQUID_VAULT || DEFAULT_VAULT_ADDRESS;

  try {
    const fetchFn = await resolveFetch();
    const response = await fetchFn(
      `${apiBase.replace(/\/$/, "")}/vaultState?address=${vaultAddress}`
    );

    if (!response.ok) {
      throw new Error(`Hyperliquid API responded with status ${response.status}`);
    }

    const data = await response.json();
    const totalRoyalties = data?.royaltiesAccrued ?? "0";

    return {
      network: "Hyperliquid",
      vault: vaultAddress,
      totalRoyalties,
    };
  } catch (error) {
    console.error("Hyperliquid connector error:", error);
    return { network: "Hyperliquid", vault: vaultAddress, totalRoyalties: "0" };
  }
}

module.exports = { getHyperliquidRoyalties };
