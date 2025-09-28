import { createHash } from "crypto";

export type Claim = {
  user: string;
  amount: number;
  chain: string;
  timestamp: string;
  holoVerified?: boolean;
  moodHash?: string;
};

type ChainTheme = {
  background: string;
  stroke: string;
  accent: string;
  symbol: string;
};

const CHAIN_THEMES: Record<string, ChainTheme> = {
  Sei: {
    background: "#061A2C",
    stroke: "#3BB2F6",
    accent: "#7FF0FF",
    symbol: "~"
  },
  Hyperliquid: {
    background: "#1A0F26",
    stroke: "#A54BFF",
    accent: "#E58CFF",
    symbol: "⚡"
  },
  Base: {
    background: "#001E3C",
    stroke: "#0052FF",
    accent: "#66A3FF",
    symbol: "◎"
  },
  EVM: {
    background: "#0B0F1C",
    stroke: "#29B6AF",
    accent: "#54EBD7",
    symbol: "◇"
  }
};

const DEFAULT_THEME: ChainTheme = {
  background: "#1B1B1F",
  stroke: "#9A6DFF",
  accent: "#C6A1FF",
  symbol: "✶"
};

function getTheme(chain: string): ChainTheme {
  const key = chain.trim();
  return CHAIN_THEMES[key] ?? DEFAULT_THEME;
}

function hashToNumber(hash: string, start: number, length: number): number {
  const slice = hash.slice(start, start + length);
  return parseInt(slice, 16);
}

export function generateSoulSigilSVG(claim: Claim): string {
  const theme = getTheme(claim.chain);
  const baseString = `${claim.user}-${claim.amount}-${claim.chain}-${claim.timestamp}-${claim.moodHash ?? ""}`;
  const hash = createHash("sha256").update(baseString).digest("hex");

  const ringCount = (hashToNumber(hash, 0, 2) % 3) + 3;
  const spokeCount = (hashToNumber(hash, 2, 2) % 6) + 6;
  const rotation = hashToNumber(hash, 4, 2) % 360;
  const innerRadius = 40 + (hashToNumber(hash, 6, 2) % 30);
  const outerRadius = innerRadius + 20 + (hashToNumber(hash, 8, 2) % 40);

  const holoGlow = claim.holoVerified
    ? `<filter id="holoGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>`
    : "";

  const rings = Array.from({ length: ringCount }).map((_, idx) => {
    const radius = innerRadius + idx * ((outerRadius - innerRadius) / Math.max(ringCount - 1, 1));
    const opacity = 0.3 + (idx / ringCount) * 0.4;
    return `<circle cx="200" cy="200" r="${radius.toFixed(2)}" stroke="${theme.stroke}" stroke-width="2" fill="none" opacity="${opacity.toFixed(2)}" />`;
  });

  const spokes = Array.from({ length: spokeCount }).map((_, idx) => {
    const angle = ((360 / spokeCount) * idx + rotation) * (Math.PI / 180);
    const x = 200 + Math.cos(angle) * outerRadius;
    const y = 200 + Math.sin(angle) * outerRadius;
    return `<line x1="200" y1="200" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${theme.accent}" stroke-width="1.5" opacity="0.6" />`;
  });

  const symbol = `<text x="200" y="210" text-anchor="middle" font-size="48" fill="${theme.accent}">${theme.symbol}</text>`;

  const amountText = `<text x="200" y="350" text-anchor="middle" font-size="18" fill="#F5F5F5">${claim.amount.toFixed(2)} USDC</text>`;
  const chainText = `<text x="200" y="370" text-anchor="middle" font-size="14" fill="#B8B8C1">${claim.chain}</text>`;
  const timeText = `<text x="200" y="390" text-anchor="middle" font-size="12" fill="#6F7685">${claim.timestamp}</text>`;

  const mood = claim.moodHash
    ? `<text x="200" y="60" text-anchor="middle" font-size="12" fill="#8F9AB3">Mood: ${claim.moodHash.slice(0, 10)}</text>`
    : "";

  const holoBadge = claim.holoVerified
    ? `<circle cx="340" cy="60" r="18" fill="${theme.accent}" opacity="0.8" /><text x="340" y="66" text-anchor="middle" font-size="14" fill="#020208">HOLO</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.1" />
      <stop offset="70%" stop-color="${theme.background}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${theme.background}" />
    </radialGradient>
    ${holoGlow}
  </defs>
  <rect width="400" height="400" fill="url(#bgGradient)" />
  <g transform="translate(0, 0)" ${claim.holoVerified ? "filter=\"url(#holoGlow)\"" : ""}>
    ${rings.join("\n    ")}
    ${spokes.join("\n    ")}
    <circle cx="200" cy="200" r="${innerRadius - 10}" fill="rgba(10, 12, 24, 0.85)" stroke="${theme.accent}" stroke-width="2" />
    ${symbol}
  </g>
  ${amountText}
  ${chainText}
  ${timeText}
  ${mood}
  ${holoBadge}
</svg>`;
}
