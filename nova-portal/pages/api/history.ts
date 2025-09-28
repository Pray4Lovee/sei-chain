const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || process.env.INDEXER_URL || "http://localhost:4000";
type Request = { query: Record<string, string | string[] | undefined> };
type Response = { status: (code: number) => Response; json: (body: unknown) => void };

export default async function handler(req: Request, res: Response) {
  const { user } = req.query;
  if (typeof user !== "string" || user.length === 0) {
    res.status(400).json([]);
    return;
  }

  try {
    const response = await fetch(`${INDEXER_URL}/history?user=${user}`);
    if (!response.ok) {
      throw new Error(`Indexer responded with ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to load history", err);
    res.status(500).json([]);
  }
}
