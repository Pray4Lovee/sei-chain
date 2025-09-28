type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: unknown) => void;
};

type MintRequest = {
  proof?: unknown;
  publicSignals?: unknown;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { proof, publicSignals } = (body ?? {}) as MintRequest;

  if (!proof || !publicSignals) {
    res.status(400).json({ error: "Missing proof payload" });
    return;
  }

  res.status(200).json({ message: "SoulKey mint transaction submitted." });
}
