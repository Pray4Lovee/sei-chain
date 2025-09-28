import crypto from "crypto";

export type Claim = {
  user: string;
  amount: number;
  chain: string;
  timestamp: string;
  holoVerified?: boolean;
  moodHash?: string;
};

type Theme = {
  gradient: [string, string];
  accent: string;
  stroke: string;
  background: string;
};

const CHAIN_THEMES: Record<string, Theme> = {
  sei: {
    gradient: ["#3DD5F3", "#0829A1"],
    accent: "#4AF3B0",
    stroke: "#0B1F59",
    background: "#02040C"
  },
  hyperliquid: {
    gradient: ["#FF6F91", "#1B003B"],
    accent: "#FFD166",
    stroke: "#280659",
    background: "#0B032D"
  },
  base: {
    gradient: ["#72A0FF", "#0C1537"],
    accent: "#E5F6FF",
    stroke: "#132968",
    background: "#020813"
  },
  default: {
    gradient: ["#8E44AD", "#1B0033"],
    accent: "#F1C40F",
    stroke: "#2C003E",
    background: "#010108"
  }
};

function toTheme(chain: string): Theme {
  const key = chain.toLowerCase();
  return CHAIN_THEMES[key] ?? CHAIN_THEMES.default;
}

function hashSource(claim: Claim): string {
  const base = [
    claim.user,
    claim.amount.toString(),
    claim.chain,
    claim.timestamp,
    claim.holoVerified ? "1" : "0",
    claim.moodHash ?? ""
  ].join("|");
  return crypto.createHash("sha256").update(base).digest("hex");
}

function pickFromHash(hash: string, index: number, range: number): number {
  const slice = hash.substring(index * 2, index * 2 + 2);
  const value = parseInt(slice || "00", 16);
  return value % range;
}

function radialPolygon(cx: number, cy: number, radius: number, sides: number, rotation: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides + rotation;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function generateSoulSigilSVG(claim: Claim): string {
  const hash = hashSource(claim);
  const theme = toTheme(claim.chain);
  const size = 512;
  const center = size / 2;

  const gradientId = `grad-${hash.slice(0, 8)}`;
  const polygonSides = 5 + pickFromHash(hash, 3, 7); // between 5 and 11 sides
  const ringCount = 3 + pickFromHash(hash, 4, 5); // between 3 and 7 rings
  const rotation = (pickFromHash(hash, 5, 360) * Math.PI) / 180;
  const holoGlow = claim.holoVerified ? theme.accent : theme.stroke;

  const rings: string[] = [];
  for (let i = 0; i < ringCount; i++) {
    const ratio = 0.18 + (i / (ringCount - 1 || 1)) * 0.32;
    const radius = center * ratio + pickFromHash(hash, 6 + i, 30);
    rings.push(
      `<circle cx="${center}" cy="${center}" r="${radius.toFixed(2)}" fill="none" stroke="${theme.stroke}" stroke-opacity="${(0.18 + i * 0.08).toFixed(
        2
      )}" stroke-width="${2 + pickFromHash(hash, 7 + i, 3)}" />`
    );
  }

  const polygonRadius = center * 0.4 + pickFromHash(hash, 12, 40);
  const polygon = radialPolygon(center, center, polygonRadius, polygonSides, rotation);

  const innerPolygonRadius = polygonRadius * 0.55 + pickFromHash(hash, 20, 30);
  const innerPolygonSides = polygonSides - pickFromHash(hash, 21, 3);
  const innerPolygon = radialPolygon(center, center, innerPolygonRadius, Math.max(3, innerPolygonSides), rotation / 2);

  const sparkCount = 12 + pickFromHash(hash, 25, 12);
  const sparks: string[] = [];
  for (let i = 0; i < sparkCount; i++) {
    const angle = (Math.PI * 2 * i) / sparkCount;
    const length = center * 0.15 + pickFromHash(hash, 26 + i, 40);
    const x1 = center + (polygonRadius + 20) * Math.cos(angle);
    const y1 = center + (polygonRadius + 20) * Math.sin(angle);
    const x2 = center + (polygonRadius + 20 + length) * Math.cos(angle);
    const y2 = center + (polygonRadius + 20 + length) * Math.sin(angle);
    sparks.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${theme.accent}" stroke-width="${1 +
        (i % 2)}" stroke-linecap="round" stroke-opacity="0.7" />`
    );
  }

  const moodGlyphRadius = center * 0.1 + pickFromHash(hash, 45, 20);
  const moodGlyphSides = 3 + pickFromHash(hash, 46, 5);
  const moodGlyph = radialPolygon(center, center, moodGlyphRadius, moodGlyphSides, rotation * 1.5);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="SoulSigil">
  <defs>
    <radialGradient id="${gradientId}" cx="50%" cy="50%" r="65%">
      <stop offset="5%" stop-color="${theme.gradient[0]}" />
      <stop offset="95%" stop-color="${theme.gradient[1]}" />
    </radialGradient>
    <filter id="glow-${hash.slice(0, 6)}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="${theme.background}" />
  <circle cx="${center}" cy="${center}" r="${center * 0.95}" fill="url(#${gradientId})" />
  ${rings.join("\n  ")}
  <polygon points="${polygon}" fill="none" stroke="${holoGlow}" stroke-width="6" filter="url(#glow-${hash.slice(0, 6)})" />
  <polygon points="${innerPolygon}" fill="${theme.accent}" fill-opacity="0.2" stroke="${theme.accent}" stroke-width="3" />
  ${sparks.join("\n  ")}
  <polygon points="${moodGlyph}" fill="${theme.accent}" fill-opacity="0.5" stroke="${theme.stroke}" stroke-width="2" />
</svg>`;

  return svg;
}
