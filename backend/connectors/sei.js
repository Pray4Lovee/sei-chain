import fetch from "node-fetch";

const SEI_LCD = process.env.SEI_LCD || "https://sei-api.polkachu.com";
const SEI_VAULT_ADDRESS = process.env.SEI_VAULT_ADDRESS || "sei1yourvaultcontract...";
const DENOM = process.env.SEI_ROYALTY_DENOM || "uusdc";

export async function getSeiRoyalties() {
  try {
    const response = await fetch(
      `${SEI_LCD}/cosmos/bank/v1beta1/balances/${SEI_VAULT_ADDRESS}`,
    );

    if (!response.ok) {
      throw new Error(`LCD request failed with status ${response.status}`);
    }

    const data = await response.json();
    const balances = Array.isArray(data?.balances) ? data.balances : [];
    const balance = balances.find((b) => b.denom === DENOM);

    return {
      network: "Sei",
      vault: SEI_VAULT_ADDRESS,
      totalRoyalties: balance ? balance.amount : "0",
    };
  } catch (err) {
    console.error("Sei connector error:", err);
    return { network: "Sei", vault: SEI_VAULT_ADDRESS, totalRoyalties: "0" };
  }
}
