import type { NextApiRequest, NextApiResponse } from "next";

type ProofInputs = {
  sigilHashes: string[];
  sigilChains: number[];
  pathElements: string[][];
  pathIndices: number[][];
  root: string;
  nullifierHash: string;
  signalHash: string;
  userAddress: string;
};

type ProofResponse = {
  inputs: ProofInputs;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ProofResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const { user, tokenIds } = req.body as { user?: string; tokenIds?: string[] };

  if (!user || !Array.isArray(tokenIds) || tokenIds.length !== 3) {
    res.status(400).json({
      inputs: {
        sigilHashes: [],
        sigilChains: [],
        pathElements: [],
        pathIndices: [],
        root: "0",
        nullifierHash: "0",
        signalHash: "0",
        userAddress: "",
      },
    });
    return;
  }

  const sigilHashes = tokenIds.map((id) => {
    try {
      return BigInt(id).toString();
    } catch (error) {
      return id;
    }
  });

  res.status(200).json({
    inputs: {
      sigilHashes,
      sigilChains: [1, 2, 3],
      pathElements: Array.from({ length: 3 }, () => Array(20).fill("0")),
      pathIndices: Array.from({ length: 3 }, () => Array(20).fill(0)),
      root: "0",
      nullifierHash: "999",
      signalHash: "0",
      userAddress: user,
    },
  });
}
