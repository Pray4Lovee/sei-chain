import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  pending: string;
};

const dummyPendingRoyalties: Record<string, string> = {
  "0xabc...": "2000000",
  "0xdef...": "500000",
};

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ pending: "0" });
  }

  const user = String(req.query.user ?? "").toLowerCase();
  const pending = dummyPendingRoyalties[user] ?? "0";

  return res.status(200).json({ pending });
}
