import type { NextApiRequest, NextApiResponse } from "next";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import {
  getRoyaltyRecord,
  markRoyaltyClaimed,
  type RoyaltyRecord,
} from "../../lib/royalties";

const PROVIDER_URL = process.env.BASE_PROVIDER_URL ?? "https://base.publicnode.com";
const ROUTER_ADDRESS = process.env.KEEPER_ROYALTY_ROUTER ?? "0xYourKeeperRoyaltyRouter";
const ABI = ["function settleRoyalty(bytes message, bytes attestation)"];

interface CircleAttestationResponse {
  status: string;
  message?: string;
  attestation?: string;
}

async function fetchAttestation(record: RoyaltyRecord) {
  if (!record.messageHash) {
    return undefined;
  }

  const response = await fetch(
    `https://iris-api.circle.com/attestations/${record.messageHash}`
  );

  if (!response.ok) {
    throw new Error(`Attestation fetch failed with status ${response.status}`);
  }

  const data: CircleAttestationResponse = await response.json();

  if (data.status !== "complete" || !data.message || !data.attestation) {
    throw new Error("Attestation not ready yet");
  }

  return {
    messageHex: data.message,
    attestationHex: data.attestation,
  };
}

function assertString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user } = req.body ?? {};

  if (!assertString(user)) {
    return res.status(400).json({ message: "Missing user" });
  }

  const record = getRoyaltyRecord(user);

  if (!record || record.pending === 0n) {
    return res.status(404).json({ message: "No pending royalty for this user" });
  }

  const relayerKey = process.env.RELAYER_PK;

  if (!relayerKey) {
    markRoyaltyClaimed(user);
    return res.status(200).json({
      message:
        "✅ Simulated royalty claim. Set RELAYER_PK to enable on-chain settlement.",
    });
  }

  try {
    const attestation = await fetchAttestation(record);

    if (!attestation) {
      return res
        .status(400)
        .json({ message: "Missing attestation data for this royalty" });
    }

    const provider = new JsonRpcProvider(PROVIDER_URL);
    const wallet = new Wallet(relayerKey, provider);
    const router = new Contract(ROUTER_ADDRESS, ABI, wallet);

    const tx = await router.settleRoyalty(attestation.messageHex, attestation.attestationHex);
    await tx.wait();

    markRoyaltyClaimed(user);

    return res.status(200).json({ message: "✅ Royalty claimed!" });
  } catch (error) {
    console.error("Claim error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to claim royalty";

    const status =
      error instanceof Error && /attestation not ready/i.test(error.message)
        ? 400
        : 500;

    return res.status(status).json({ message });
  }
}
