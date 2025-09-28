const DEFAULT_DEPTH = 20;

const createZeroPath = (depth: number) =>
  Array.from({ length: depth }, () => "0");

const createZeroIndices = (depth: number) =>
  Array.from({ length: depth }, () => 0);

type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: unknown) => void;
};

type ProofRequest = {
  user?: string;
  tokenIds?: (string | number)[];
};

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

const buildMockInputs = (user: string, tokenIds: (string | number)[]): ProofInputs => {
  const sigilHashes = tokenIds.map((tokenId, index) => {
    try {
      return (BigInt(tokenId) + BigInt(index + 1)).toString();
    } catch (error) {
      return (BigInt(index + 1) * BigInt(1000)).toString();
    }
  });
  const sigilChains = tokenIds.map((_, index) => index + 1);

  const pathElements = tokenIds.map(() => createZeroPath(DEFAULT_DEPTH));
  const pathIndices = tokenIds.map(() => createZeroIndices(DEFAULT_DEPTH));

  return {
    sigilHashes,
    sigilChains,
    pathElements,
    pathIndices,
    root: "0",
    nullifierHash: "999",
    signalHash: "0",
    userAddress: user,
  };
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { user, tokenIds } = (rawBody ?? {}) as ProofRequest;

  if (!user || !Array.isArray(tokenIds) || tokenIds.length === 0) {
    res.status(400).json({ error: "Missing user or tokenIds" });
    return;
  }

  const inputs = buildMockInputs(user, tokenIds);

  const response: ProofResponse = {
    inputs,
  };

  res.status(200).json(response);
}
