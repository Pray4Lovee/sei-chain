import { JsonRpcProvider, Wallet, Contract } from "ethers";
import fs from "fs";
import path from "path";
import { Claim, generateSoulSigilSVG } from "./generateSoulSigilSVG";

const RPC_URL = process.env.BASE_RPC_URL ?? "https://base-rpc.publicnode.com";
const NFT_ADDRESS = process.env.SOULSIGIL_NFT_ADDRESS ?? "0xYourSoulSigilNFT";
const RELAYER_PK = process.env.RELAYER_PK;

if (!RELAYER_PK) {
  throw new Error("RELAYER_PK environment variable is required to sign mint transactions.");
}

const provider = new JsonRpcProvider(RPC_URL);
const signer = new Wallet(RELAYER_PK, provider);

const nftAbi = [
  "function mint(address to, string uri) external",
  "function setMinter(address minter, bool approved) external"
];

const contract = new Contract(NFT_ADDRESS, nftAbi, signer);

function loadClaims(): Claim[] {
  const claimsPath = path.resolve(__dirname, "past_claims.json");
  if (!fs.existsSync(claimsPath)) {
    throw new Error(`Missing past_claims.json file at ${claimsPath}.`);
  }

  const raw = fs.readFileSync(claimsPath, "utf-8");
  const parsed: Claim[] = JSON.parse(raw);

  return parsed;
}

function buildMetadata(i: number, claim: Claim, svg: string): string {
  const base64Image = Buffer.from(svg).toString("base64");
  const attributes: Array<{ trait_type: string; value: string }> = [
    { trait_type: "Amount", value: `${claim.amount} USDC` },
    { trait_type: "Chain", value: claim.chain },
    { trait_type: "Timestamp", value: claim.timestamp }
  ];

  if (typeof claim.holoVerified !== "undefined") {
    attributes.push({ trait_type: "Holo Verified", value: claim.holoVerified ? "Yes" : "No" });
  }

  if (claim.moodHash) {
    attributes.push({ trait_type: "Mood Hash", value: claim.moodHash });
  }

  const metadata = {
    name: `SoulSigil #${i + 1}`,
    description: "This glyph marks a sovereign royalty claim in SolaraKin.",
    image: `data:image/svg+xml;base64,${base64Image}`,
    attributes
  };

  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
}

async function mintAll() {
  const claims = loadClaims();
  for (const [i, claim] of claims.entries()) {
    try {
      const svg = generateSoulSigilSVG(claim);
      const uri = buildMetadata(i, claim, svg);

      const tx = await contract.mint(claim.user, uri);
      await tx.wait();
      console.log(`✅ Minted SoulSigil #${i + 1} to ${claim.user}`);
    } catch (err) {
      console.error(`❌ Failed to mint sigil ${i + 1} to ${claim.user}:`, err);
    }
  }
}

mintAll().catch((err) => {
  console.error("Unexpected error while minting SoulSigils", err);
  process.exit(1);
});
