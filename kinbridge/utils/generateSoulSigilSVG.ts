export interface SigilInput {
  amount: number;
  chain: string;
  timestamp: number;
  holoVerified?: boolean;
  moodHash?: string;
}

const COLOR_MAP: Record<string, string> = {
  Sei: "#22c55e",
  Base: "#3b82f6",
  Hyperliquid: "#a855f7",
  Arbitrum: "#0ea5e9",
  Ethereum: "#6b7280",
};

const FALLBACK_COLOR = "#facc15";

export function generateSoulSigilSVG(input: SigilInput): string {
  const { amount, chain, timestamp, holoVerified, moodHash } = input;

  const radius = 40 + (amount % 20);
  const fill = COLOR_MAP[chain] ?? FALLBACK_COLOR;
  const jitter = moodHash ? parseInt(moodHash.slice(0, 2), 16) % 10 : 3;
  const gradientId = `glow-${chain.toLowerCase()}-${timestamp}`.replace(/[^a-z0-9-]/gi, "");

  const pulse = holoVerified
    ? `<animate attributeName="r" values="${radius};${radius + 5};${radius}" dur="2s" repeatCount="indefinite"/>`
    : "";

  let overlayPath = "";

  switch (chain) {
    case "Sei":
      overlayPath = `
        <path d="M80,80
          m -${radius},0
          a ${radius},${jitter} 0 1,0 ${radius * 2},0
          a ${radius},${jitter} 0 1,0 -${radius * 2},0"
          stroke="#ffffff" stroke-width="2" fill="none"/>
      `;
      break;

    case "Hyperliquid":
      overlayPath = `
        <path d="M80,80
          m -${radius},0
          a ${radius},${radius} 0 1,1 ${radius * 2},0
          a ${radius},${radius} 0 1,1 -${radius * 2},0
          M80,${80 - radius}
          L80,${80 + radius}
          M${80 - radius},80
          L${80 + radius},80"
          stroke="#ffffff" stroke-width="1.5" fill="none"/>
      `;
      break;

    case "Base":
      overlayPath = `
        <circle cx="80" cy="80" r="${radius - 5}" stroke="#ffffff" stroke-width="1.5" fill="none"/>
      `;
      break;

    case "Ethereum":
      overlayPath = `
        <polygon points="
          80,${80 - radius}
          ${80 + radius * 0.86},${80 - radius * 0.5}
          ${80 + radius * 0.86},${80 + radius * 0.5}
          80,${80 + radius}
          ${80 - radius * 0.86},${80 + radius * 0.5}
          ${80 - radius * 0.86},${80 - radius * 0.5}
        "
        stroke="#ffffff" stroke-width="2" fill="none"/>
      `;
      break;

    case "Arbitrum":
      overlayPath = `
        <ellipse cx="80" cy="80" rx="${radius}" ry="${radius / 1.6}"
          stroke="#ffffff" stroke-width="2" fill="none"/>
      `;
      break;

    default:
      overlayPath = `
        <path d="M80,${80 - radius + jitter}
          Q${80 + jitter},${80} ${80},${80 + radius - jitter}
          Q${80 - jitter},${80} ${80},${80 - radius + jitter}Z"
          stroke="#ffffff" stroke-width="2" fill="none"/>
      `;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${fill}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${fill}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="80" cy="80" r="${radius}" fill="url(#${gradientId})">
    ${pulse}
  </circle>
  ${overlayPath}
  <text x="80" y="150" font-size="10" text-anchor="middle" fill="#ffffff" opacity="0.6">
    ${chain} — ${amount.toFixed(2)} USDC
  </text>
</svg>
  `.trim();
}

export default generateSoulSigilSVG;
