interface BasicRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface BasicResponse {
  status: (code: number) => BasicResponse;
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
}

type SigilRecord = {
  user: string;
  tokenId: number;
  image: string;
  chain: string;
  amount: string;
  timestamp: string;
};

const DATA_URI_PREFIX = "data:image/svg+xml;base64,";

const SIGIL_DATA: SigilRecord[] = [
  {
    user: "demo.nebula",
    tokenId: 1,
    image:
      DATA_URI_PREFIX +
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iIzA0MGIyYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0iSW50ZXIsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNiI+U2VpPC90ZXh0Pjwvc3ZnPg==",
    chain: "Sei",
    amount: "4.2",
    timestamp: "2025-09-27T15:12:00Z",
  },
  {
    user: "demo.nebula",
    tokenId: 2,
    image:
      DATA_URI_PREFIX +
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iIzA0MGIyYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0iSW50ZXIsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNiI+SHlwZXJsaXF1aWQ8L3RleHQ+PC9zdmc+",
    chain: "Hyperliquid",
    amount: "3.1",
    timestamp: "2025-09-25T20:44:00Z",
  },
  {
    user: "demo.nebula",
    tokenId: 3,
    image:
      DATA_URI_PREFIX +
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iIzA0MGIyYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0iSW50ZXIsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNiI+QXJiaXRydW08L3RleHQ+PC9zdmc+",
    chain: "Arbitrum",
    amount: "9.85",
    timestamp: "2025-09-21T18:30:00Z",
  },
  {
    user: "vault.visionary",
    tokenId: 11,
    image:
      DATA_URI_PREFIX +
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgMzIwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iIzA0MGIyYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0iSW50ZXIsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNiI+U2VpPC90ZXh0Pjwvc3ZnPg==",
    chain: "Sei",
    amount: "12.005",
    timestamp: "2025-09-28T08:22:00Z",
  },
];

export default function handler(req: BasicRequest, res: BasicResponse) {
  if (req.method && req.method.toUpperCase() !== "GET") {
    res.setHeader?.("Allow", "GET");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const user = req.query?.user;
  const userId = Array.isArray(user) ? user[0] : user;

  const filtered = SIGIL_DATA.filter((sigil) =>
    userId ? sigil.user.toLowerCase() === userId.toLowerCase() : true
  ).map(({ user: _user, ...rest }) => rest);

  res.status(200).json(filtered);
}
