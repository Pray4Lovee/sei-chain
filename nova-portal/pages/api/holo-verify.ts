const requests: Array<{ user: string; code: string; timestamp: string }> = [];

type Request = {
  method?: string;
  body?: { user?: string; code?: string };
};

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
};

export default function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = req.body?.user;
  const code = req.body?.code;
  if (!user || !code) {
    res.status(400).json({ error: "Missing verification payload" });
    return;
  }

  requests.push({ user, code, timestamp: new Date().toISOString() });
  res.status(200).json({ ok: true });
}
