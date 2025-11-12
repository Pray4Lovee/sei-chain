import { Contract, JsonRpcProvider, isAddress } from "ethers";
import { getPastSigilsForUser, SigilRecord } from "./sigilIndex";

const SOULKEY_NFT = process.env.SOULKEY_NFT ?? "0xYourSoulKeyNFT";
const SOULKEY_RPC_URL = process.env.SOULKEY_RPC_URL ?? "https://base.publicnode.com";
const ABI = ["function minted(address) view returns (bool)"];

const provider = new JsonRpcProvider(SOULKEY_RPC_URL);
const contract = new Contract(SOULKEY_NFT, ABI, provider);

export type SoulProfile = {
  hasSoulKey: boolean;
  sigilCount: number;
  hasSeiSigil: boolean;
  chains: string[];
  firstClaim: string | null;
  lastClaim: string | null;
};

async function fetchMintedStatus(user: string): Promise<boolean> {
  if (!isAddress(user)) {
    return false;
  }

  try {
    return await contract.minted(user);
  } catch (error) {
    console.error("Failed to fetch SoulKey status", error);
    return false;
  }
}

function sortSigilsByTimestamp(sigils: SigilRecord[]): SigilRecord[] {
  return [...sigils].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });
}

export async function resolveSoulProfile(user: string): Promise<SoulProfile> {
  const normalizedUser = user.toLowerCase();
  const hasSoulKey = await fetchMintedStatus(normalizedUser);
  const sigils = await getPastSigilsForUser(normalizedUser);

  if (!sigils || sigils.length === 0) {
    return {
      hasSoulKey,
      sigilCount: 0,
      hasSeiSigil: false,
      chains: [],
      firstClaim: null,
      lastClaim: null,
    };
  }

  const sortedSigils = sortSigilsByTimestamp(sigils);
  const chains = Array.from(new Set(sortedSigils.map((sigil) => sigil.chain)));
  const hasSeiSigil = chains.some((chain) => chain.toLowerCase() === "sei");

  return {
    hasSoulKey,
    sigilCount: sortedSigils.length,
    hasSeiSigil,
    chains,
    firstClaim: sortedSigils[0]?.timestamp ?? null,
    lastClaim: sortedSigils[sortedSigils.length - 1]?.timestamp ?? null,
  };
}
