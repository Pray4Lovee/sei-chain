const DEFAULT_ENDPOINT = process.env.SEI_ROYALTY_ENDPOINT;

async function fetchRoyalties(endpoint) {
  const target = endpoint ?? DEFAULT_ENDPOINT;
  if (!target) {
    return { totalRoyalties: 0n };
  }

  const response = await fetchOrThrow(target);
  if (!response.ok) {
    throw new Error(`Failed to fetch Sei royalties: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const total = payload?.totalRoyalties ?? payload?.total ?? 0;
  return { totalRoyalties: BigInt(total) };
}

async function getSeiRoyalties(endpoint) {
  try {
    return await fetchRoyalties(endpoint);
  } catch (error) {
    console.error("Sei royalty fetch error:", error);
    return { totalRoyalties: 0n };
  }
}

async function fetchOrThrow(resource, options) {
  if (typeof fetch === "undefined") {
    throw new Error("Global fetch API not available in this environment");
  }
  return fetch(resource, options);
}

module.exports = { getSeiRoyalties };
