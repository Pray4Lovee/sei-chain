import type { NextApiRequest, NextApiResponse } from "next";
import { getPendingRoyalties } from "../../lib/royalties";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user } = req.query;

  if (!user || Array.isArray(user)) {
    return res.status(400).json({ error: "Missing user parameter" });
  }

  const amount = getPendingRoyalties(user);
  const pending = amount.toString();

  return res.status(200).json({ pending });
}
