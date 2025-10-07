import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { user, code } = req.body as { user?: string; code?: string };
  if (!user) {
    res.status(400).json({ error: "user required" });
    return;
  }

  // Placeholder validation. In production we would check zk proof.
  if (code !== "123456") {
    res.status(401).json({ error: "invalid holo code" });
    return;
  }

  res.status(200).json({ status: "verified" });
}
