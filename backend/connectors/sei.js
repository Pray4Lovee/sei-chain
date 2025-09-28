import fetch from "node-fetch";

const DEFAULT_RESPONSE = {
  totalRoyalties: "0",
  settlements: [],
};

/**
 * Queries Sei/Noble royalty balances. The endpoint is expected to return a JSON payload
 * with the shape `{ totalRoyalties: string, settlements: Array }`. If the environment
 * variable is not configured or the endpoint fails, the relayer falls back to zero so
 * the script remains idempotent.
 */
export async function getSeiRoyalties() {
  const endpoint = process.env.SEI_ROYALTIES_ENDPOINT;
  if (!endpoint) {
    return DEFAULT_RESPONSE;
  }

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Sei royalties request failed: ${res.status} ${res.statusText}`);
    }
    const payload = await res.json();
    if (!payload || typeof payload.totalRoyalties === "undefined") {
      throw new Error("Malformed Sei royalties payload");
    }
    return {
      totalRoyalties: String(payload.totalRoyalties),
      settlements: Array.isArray(payload.settlements) ? payload.settlements : [],
    };
  } catch (error) {
    console.warn("Failed to fetch Sei royalties", error);
    return DEFAULT_RESPONSE;
  }
}
