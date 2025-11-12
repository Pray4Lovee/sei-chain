import { Buffer } from "buffer";

interface SigilRecord {
  user: string;
  tokenId: number;
  chain: string;
  amountUsd: number;
  timestamp: string;
  txHash: string;
}

interface SigilResponse {
  tokenId: number;
  chain: string;
  amount: string;
  timestamp: string;
  image: string;
}

const SIGIL_DATA: SigilRecord[] = [
  {
    user: "sei1yq0v0y7ux0kvp9fj3z3qk3y5z3k3y5z3k3y5z3",
    tokenId: 1,
    chain: "Sei",
    amountUsd: 4.2,
    timestamp: "2025-09-27T15:12:00Z",
    txHash: "0x4f1f...",
  },
  {
    user: "sei1yq0v0y7ux0kvp9fj3z3qk3y5z3k3y5z3k3y5z3",
    tokenId: 2,
    chain: "Hyperliquid",
    amountUsd: 3.1,
    timestamp: "2025-09-25T20:44:00Z",
    txHash: "0xb21c...",
  },
  {
    user: "sei1pm0ttvaw0k0n05h4fx3c5yzp4t9jq8kuc8z8kc",
    tokenId: 3,
    chain: "Sei",
    amountUsd: 7.35,
    timestamp: "2025-09-21T18:30:00Z",
    txHash: "0x9af0...",
  },
];

const encodeSvg = (svg: string): string => {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
};

const buildSvg = ({ chain, amountUsd, tokenId, timestamp, txHash }: SigilRecord): string => {
  const formattedAmount = amountUsd.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 520">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="360" height="520" rx="24" fill="url(#bg)" />
  <text x="32" y="72" fill="#38bdf8" font-size="22" font-family="'Fira Code', monospace" letter-spacing="4">
    SOULSIGIL
  </text>
  <text x="32" y="118" fill="#e0f2fe" font-size="18" font-family="'Inter', sans-serif">
    Chain
  </text>
  <text x="32" y="148" fill="#f8fafc" font-size="28" font-family="'Inter', sans-serif" font-weight="600">
    ${chain}
  </text>
  <text x="32" y="210" fill="#e0f2fe" font-size="18" font-family="'Inter', sans-serif">
    Vault Earnings
  </text>
  <text x="32" y="244" fill="#facc15" font-size="36" font-family="'Inter', sans-serif" font-weight="700">
    ${formattedAmount} USDC
  </text>
  <text x="32" y="302" fill="#e0f2fe" font-size="18" font-family="'Inter', sans-serif">
    Token ID
  </text>
  <text x="32" y="334" fill="#f8fafc" font-size="28" font-family="'Space Grotesk', sans-serif" font-weight="600">
    #${tokenId}
  </text>
  <text x="32" y="392" fill="#e0f2fe" font-size="18" font-family="'Inter', sans-serif">
    Forged
  </text>
  <text x="32" y="424" fill="#f8fafc" font-size="20" font-family="'Inter', sans-serif">
    ${timestamp}
  </text>
  <text x="32" y="470" fill="#94a3b8" font-size="12" font-family="'Fira Code', monospace">
    ${txHash}
  </text>
</svg>`;
};

const normaliseUser = (user: string | undefined): string | undefined => {
  return user?.trim().toLowerCase();
};

const mapToResponse = (record: SigilRecord): SigilResponse => {
  return {
    tokenId: record.tokenId,
    chain: record.chain,
    amount: record.amountUsd.toFixed(2),
    timestamp: record.timestamp,
    image: encodeSvg(buildSvg(record)),
  };
};

type RequestLike = {
  query?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

export default function handler(req: RequestLike, res: ResponseLike) {
  const userParam = req.query?.user;
  const user = Array.isArray(userParam) ? userParam[0] : userParam;

  if (!user) {
    res.status(400).json({ error: "Missing required 'user' query parameter." });
    return;
  }

  const normalised = normaliseUser(user);
  const payload = SIGIL_DATA.filter((record) => normaliseUser(record.user) === normalised).map(
    mapToResponse
  );

  res.setHeader?.("Cache-Control", "no-store");
  res.status(200).json(payload);
}
