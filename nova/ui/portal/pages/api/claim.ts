import type { NextApiRequest, NextApiResponse } from "next";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const PROVIDER_URL = process.env.PROVIDER_URL ?? "https://base.publicnode.com";
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS ?? "0xYourKeeperRoyaltyRouter";
const ABI = ["function settleRoyalty(bytes message, bytes attestation)"];

type ResponseBody = {
  message: string;
};

async function fetchAttestation(messageHash: string) {
  const irisUrl = `https://iris-api.circle.com/attestations/${messageHash}`;
  const response = await fetch(irisUrl);

  if (!response.ok) {
    throw new Error(`Circle attestation lookup failed (${response.status})`);
  }

  const payload = await response.json();
  return payload;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Unsupported method" });
  }

  const { user, messageHash: providedMessageHash } = req.body ?? {};

  if (!user || typeof user !== "string") {
    return res.status(400).json({ message: "Missing user" });
  }

  if (!process.env.RELAYER_PK) {
    return res.status(500).json({ message: "Relayer key not configured" });
  }

  const messageHash: string =
    typeof providedMessageHash === "string" && providedMessageHash.length > 0
      ? providedMessageHash
      : "0xYourBurnMessageHashForThisUser";

  try {
    const attestationData = await fetchAttestation(messageHash);

    if (attestationData.status !== "complete") {
      return res.status(400).json({ message: "Attestation not ready yet" });
    }

    const messageHex: string = attestationData.message;
    const attestationHex: string = attestationData.attestation;

    if (!messageHex || !attestationHex) {
      return res.status(500).json({ message: "Incomplete attestation payload" });
    }

    const provider = new JsonRpcProvider(PROVIDER_URL);
    const wallet = new Wallet(process.env.RELAYER_PK, provider);
    const router = new Contract(ROUTER_ADDRESS, ABI, wallet);

    const tx = await router.settleRoyalty(messageHex, attestationHex);
    await tx.wait();

    return res.status(200).json({ message: "✅ Royalty claimed!" });
  } catch (err) {
    console.error("Claim error", err);
    const message = err instanceof Error ? err.message : "Failed to claim royalty";
    return res.status(500).json({ message });
  }
}
