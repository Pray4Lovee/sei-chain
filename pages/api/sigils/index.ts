import type { NextApiRequest, NextApiResponse } from "next";

type Sigil = {
  tokenId: string;
  image: string;
  chain: string;
};

type SigilResponse = Sigil[];

const mockSigils: Sigil[] = [
  {
    tokenId: "1",
    image: "/images/sigils/astral.png",
    chain: "Astral",
  },
  {
    tokenId: "2",
    image: "/images/sigils/terra.png",
    chain: "Terra",
  },
  {
    tokenId: "3",
    image: "/images/sigils/luna.png",
    chain: "Luna",
  },
  {
    tokenId: "4",
    image: "/images/sigils/sol.png",
    chain: "Sol",
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<SigilResponse>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const { user } = req.query;

  if (!user || typeof user !== "string") {
    res.status(400).json([]);
    return;
  }

  res.status(200).json(mockSigils);
}
