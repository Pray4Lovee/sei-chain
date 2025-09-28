import { resolveSoulProfile } from "../../resolver/soulkeyResolver";

interface ApiRequest {
  query: {
    user?: string | string[];
  };
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

function extractUserAddress(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const userAddress = extractUserAddress(req.query.user);
  if (!userAddress) {
    res.status(400).json({ error: "Missing user address" });
    return;
  }

  try {
    const result = await resolveSoulProfile(userAddress.toLowerCase());
    res.status(200).json(result);
  } catch (err) {
    console.error("Resolver error:", err);
    res.status(500).json({ error: "Failed to resolve profile" });
  }
}
