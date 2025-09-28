import type { NextApiRequest, NextApiResponse } from "next";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:4000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.query.user;
  if (typeof user !== "string") {
    return res.status(400).json({ error: "Missing user" });
  }

  try {
    const response = await fetch(`${INDEXER_URL}/history?user=${encodeURIComponent(user)}`);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Failed to fetch history", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
}
