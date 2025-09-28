import type { NextApiRequest, NextApiResponse } from "next";

type MintRequest = {
  proof: unknown;
  publicSignals: unknown;
};

type MintResponse = {
  message: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<MintResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const { proof, publicSignals } = req.body as MintRequest;

  if (!proof || !publicSignals) {
    res.status(400).json({ message: "Invalid proof payload" });
    return;
  }

  res.status(200).json({ message: "SoulKey mint transaction submitted (mock)." });
}
