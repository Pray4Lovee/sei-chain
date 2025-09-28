import { createHash } from "crypto";

export type SigilInput = {
  amount: number;          // in USDC (e.g., 4.2)
  chain: string;           // e.g., "Sei"
  timestamp: string;       // ISO string
  holoVerified?: boolean;
  moodHash?: string;       // optional SHA-256 hash of moodproof
};

export function generateSoulSigilSVG(input: SigilInput): string {
  const { amount, chain, timestamp, holoVerified, moodHash } = input;

  // Normalize
  const radius = 40 + (amount % 20); // 40–60 radius variation
  const colorMap: Record<string, string> = {
    Sei: "#22c55e",
    Base: "#3b82f6",
    Hyperliquid: "#a855f7",
    Arbitrum: "#0ea5e9",
    Ethereum: "#6b7280"
  };

  const fill = colorMap[chain] || "#facc15";

  // Optional distortion (moodHash modulates path)
  const hash = createHash("sha256").update(moodHash || timestamp).digest("hex");
  const jitter = parseInt(hash.slice(0, 2), 16) % 10;

  const pulse = holoVerified
    ? `<animate attributeName="r" values="${radius};${radius + 5};${radius}" dur="2s" repeatCount="indefinite"/>`
    : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${fill}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${fill}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="80" cy="80" r="${radius}" fill="url(#glow)">
    ${pulse}
  </circle>
  <path d="M80,${80 - radius + jitter} 
           Q${80 + jitter},${80} ${80},${80 + radius - jitter}
           Q${80 - jitter},${80} ${80},${80 - radius + jitter}Z"
        stroke="#ffffff" stroke-width="2" fill="none"/>
  <text x="80" y="150" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.6">
    ${chain} — ${amount.toFixed(2)} USDC
  </text>
</svg>
`.trim();

  return svg;
}
