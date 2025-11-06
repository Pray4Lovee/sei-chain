import { Contract, JsonRpcProvider, isAddress } from "ethers";

import { getPastSigilsForUser } from "./sigilIndex";
import type { SoulProfile, SoulSigilRecord } from "./types";

const DEFAULT_SOULKEY_NFT = "0xYourSoulKeyNFT";
const DEFAULT_PROVIDER_URL = "https://base.publicnode.com";

const SOULKEY_NFT_ADDRESS =
  process.env.SOULKEY_NFT_ADDRESS ?? process.env.SOULKEY_NFT ?? DEFAULT_SOULKEY_NFT;

const provider = new JsonRpcProvider(process.env.SOULKEY_RPC_URL ?? DEFAULT_PROVIDER_URL);

const CONTRACT_ABI = ["function minted(address) view returns (bool)"];
const soulKeyContract = new Contract(SOULKEY_NFT_ADDRESS, CONTRACT_ABI, provider);

function sortByTimestamp(sigils: SoulSigilRecord[]): SoulSigilRecord[] {
  return [...sigils].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });
}

function buildDefaultProfile(hasSoulKey: boolean): SoulProfile {
  return {
    hasSoulKey,
    sigilCount: 0,
    hasSeiSigil: false,
    chains: [],
    firstClaim: null,
    lastClaim: null,
  };
}

export async function resolveSoulProfile(user: string): Promise<SoulProfile> {
  if (!isAddress(user)) {
    throw new Error(`Invalid EVM address provided: ${user}`);
  }

  const normalizedAddress = user.toLowerCase();

  let hasSoulKey = false;
  try {
    hasSoulKey = await soulKeyContract.minted(normalizedAddress);
  } catch (err) {
    console.warn("Failed to query SoulKey contract. Assuming no SoulKey minted.", err);
  }

  const sigils = await getPastSigilsForUser(normalizedAddress);
  if (!sigils || sigils.length === 0) {
    return buildDefaultProfile(hasSoulKey);
  }

  const sortedSigils = sortByTimestamp(sigils);
  const chains = Array.from(new Set(sortedSigils.map((sigil) => sigil.chain)));
  const hasSeiSigil = chains.some((chain) => chain.toLowerCase() === "sei");

  return {
    hasSoulKey,
    sigilCount: sortedSigils.length,
    hasSeiSigil,
    chains,
    firstClaim: sortedSigils[0].timestamp,
    lastClaim: sortedSigils[sortedSigils.length - 1].timestamp,
  };
}
