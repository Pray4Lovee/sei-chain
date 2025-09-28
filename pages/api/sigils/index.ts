const SAMPLE_SIGILS = [
  {
    tokenId: "101",
    image: "/sigils/stellar-forge.png",
    chain: "Sei",
  },
  {
    tokenId: "202",
    image: "/sigils/terra-ward.png",
    chain: "Nova",
  },
  {
    tokenId: "303",
    image: "/sigils/gaia-bloom.png",
    chain: "Cosmos",
  },
  {
    tokenId: "404",
    image: "/sigils/astral-flare.png",
    chain: "Neutron",
  },
];

type RequestLike = {
  method?: string;
  query?: Record<string, string | string[]>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: unknown) => void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  res.status(200).json(SAMPLE_SIGILS);
}
