const DEFAULT_LCD = "https://sei-api.polkachu.com";
const DEFAULT_VAULT_ADDRESS = "sei1yourvaultcontract...";
const DEFAULT_DENOM = "uusdc";

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

async function getSeiRoyalties() {
  const lcd = process.env.SEI_LCD || DEFAULT_LCD;
  const vaultAddress = process.env.SEI_VAULT_ADDRESS || DEFAULT_VAULT_ADDRESS;
  const denom = process.env.SEI_VAULT_DENOM || DEFAULT_DENOM;

  try {
    const fetchFn = await resolveFetch();
    const response = await fetchFn(
      `${lcd.replace(/\/$/, "")}/cosmos/bank/v1beta1/balances/${vaultAddress}`
    );

    if (!response.ok) {
      throw new Error(`LCD responded with status ${response.status}`);
    }

    const data = await response.json();
    const balances = Array.isArray(data?.balances) ? data.balances : [];
    const match = balances.find((balance) => balance?.denom === denom);

    return {
      network: "Sei",
      vault: vaultAddress,
      totalRoyalties: match?.amount ?? "0",
    };
  } catch (error) {
    console.error("Sei connector error:", error);
    return { network: "Sei", vault: vaultAddress, totalRoyalties: "0" };
  }
}

module.exports = { getSeiRoyalties };
