import { isAddress } from "ethers";
import { resolveSoulProfile } from "../../resolver/soulkeyResolver";

type Request = {
  query: {
    user?: string | string[];
  };
};

type Response = {
  status: (code: number) => { json: (body: unknown) => void };
};

export default async function handler(req: Request, res: Response) {
  const queryValue = req.query.user;
  const user = Array.isArray(queryValue) ? queryValue[0] : queryValue;

  if (!user) {
    return res.status(400).json({ error: "Missing user address" });
  }

  if (!isAddress(user)) {
    return res.status(400).json({ error: "Invalid user address" });
  }

  try {
    const result = await resolveSoulProfile(user.toLowerCase());
    return res.status(200).json(result);
  } catch (err) {
    console.error("Resolver error:", err);
    return res.status(500).json({ error: "Failed to resolve profile" });
  }
}
