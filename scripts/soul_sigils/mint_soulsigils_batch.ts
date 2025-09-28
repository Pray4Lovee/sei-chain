import { readFileSync } from "fs";
import { join } from "path";
import { ethers } from "ethers";
import { Claim, generateSoulSigilSVG } from "./generateSoulSigilSVG";

const RPC_URL = process.env.SOULSIGIL_RPC_URL ?? "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const privateKey = process.env.RELAYER_PK;
if (!privateKey) {
  throw new Error("RELAYER_PK environment variable is required to sign mint transactions");
}

const signer = new ethers.Wallet(privateKey, provider);

const NFT_ADDRESS = process.env.SOULSIGIL_NFT_ADDRESS ?? "0xYourSoulSigilNFT";
const nftAbi = [
  "function mint(address to, string uri) external",
  "function setMinter(address minter, bool approved) external"
];

const contract = new ethers.Contract(NFT_ADDRESS, nftAbi, signer);

const claimsPath = join(__dirname, "past_claims.json");
const claims: Claim[] = JSON.parse(readFileSync(claimsPath, "utf-8"));

async function mintAll(): Promise<void> {
  console.log(`🔮 Starting SoulSigil retro-mint for ${claims.length} claim(s)`);

  for (const [index, claim] of claims.entries()) {
    const position = index + 1;
    try {
      if (!ethers.isAddress(claim.user)) {
        throw new Error(`Invalid recipient address: ${claim.user}`);
      }

      const svg = generateSoulSigilSVG(claim);
      const base64Image = Buffer.from(svg, "utf8").toString("base64");

      const metadataAttributes = [
        { trait_type: "Amount", value: `${claim.amount} USDC` },
        { trait_type: "Chain", value: claim.chain },
        { trait_type: "Timestamp", value: claim.timestamp },
        { trait_type: "Holo Verified", value: claim.holoVerified ? "Yes" : "No" }
      ];

      if (claim.moodHash) {
        metadataAttributes.push({ trait_type: "Mood Hash", value: claim.moodHash });
      }

      const metadata = {
        name: `SoulSigil #${position}`,
        description: "This glyph marks a sovereign royalty claim in SolaraKin.",
        image: `data:image/svg+xml;base64,${base64Image}`,
        attributes: metadataAttributes
      };

      const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

      const tx = await contract.mint(claim.user, uri);
      console.log(`⛓️  Submitted tx ${tx.hash} for SoulSigil #${position} → ${claim.user}`);
      await tx.wait();
      console.log(`✅ Minted SoulSigil #${position} to ${claim.user}`);
    } catch (error) {
      console.error(`❌ Failed to mint SoulSigil #${position} for ${claim.user}`);
      console.error(error);
    }
  }

  console.log("🏁 SoulSigil retro-mint complete");
}

mintAll().catch((error) => {
  console.error("Unexpected error while retro-minting SoulSigils", error);
  process.exitCode = 1;
});
