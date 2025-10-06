import fetch from "node-fetch";

const DEFAULT_RESPONSE = {
  totalRoyalties: "0",
  settlements: [],
};

/**
 * Fetches USDH royalty balances from Hyperliquid. The endpoint should expose a JSON
 * response with `{ totalRoyalties: string, settlements: Array }`. The relayer returns
 * a zeroed response if the endpoint is unavailable so callers can safely continue
 * execution without throwing.
 */
export async function getHyperliquidRoyalties() {
  const endpoint = process.env.HYPERLIQUID_ROYALTIES_ENDPOINT;
  if (!endpoint) {
    return DEFAULT_RESPONSE;
  }

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(
        `Hyperliquid royalties request failed: ${res.status} ${res.statusText}`,
      );
    }
    const payload = await res.json();
    if (!payload || typeof payload.totalRoyalties === "undefined") {
      throw new Error("Malformed Hyperliquid royalties payload");
    }
    return {
      totalRoyalties: String(payload.totalRoyalties),
      settlements: Array.isArray(payload.settlements) ? payload.settlements : [],
    };
  } catch (error) {
    console.warn("Failed to fetch Hyperliquid royalties", error);
    return DEFAULT_RESPONSE;
  }
}
