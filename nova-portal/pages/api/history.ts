import type { NextApiRequest, NextApiResponse } from "next";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:4000";

type TxRow = {
  user: string;
  type: "Deposit" | "Spend";
  amount: string;
  toAddr?: string;
  timestamp: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user } = req.query;
  if (!user || typeof user !== "string") {
    res.status(400).json({ error: "user query param required" });
    return;
  }

  try {
    const response = await fetch(`${INDEXER_URL}/history?user=${user}`);
    if (!response.ok) {
      throw new Error(`Indexer returned ${response.status}`);
    }
    const data = (await response.json()) as TxRow[];
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "failed to fetch history" });
  }
}
