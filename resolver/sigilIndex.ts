import { promises as fs } from "fs";
import path from "path";

import type { SoulSigilRecord } from "./types";

interface SigilIndexShape {
  [address: string]: SoulSigilRecord[];
}

let cachedIndex: SigilIndexShape | null = null;
let cacheMtimeMs = 0;

const DEFAULT_SIGIL_STORE = path.resolve(
  __dirname,
  "..",
  "store",
  "sigilIndex.json"
);

async function readSigilIndexFile(filePath: string): Promise<SigilIndexShape> {
  try {
    const stat = await fs.stat(filePath);
    if (!cachedIndex || stat.mtimeMs !== cacheMtimeMs) {
      const data = await fs.readFile(filePath, "utf8");
      cachedIndex = JSON.parse(data) as SigilIndexShape;
      cacheMtimeMs = stat.mtimeMs;
    }
    return cachedIndex ?? {};
  } catch (err: unknown) {
    // If the file does not exist or is malformed we gracefully fallback
    console.warn(
      "Sigil index file could not be read. Falling back to empty index.",
      err
    );
    cachedIndex = {};
    cacheMtimeMs = 0;
    return {};
  }
}

/**
 * Loads all historical sigils for the requested address. This implementation
 * reads from a JSON index on disk but can be replaced with a database or
 * indexer-backed query in production.
 */
export async function getPastSigilsForUser(
  address: string,
  options: { dataPath?: string } = {}
): Promise<SoulSigilRecord[]> {
  const normalized = address.toLowerCase();
  const filePath = options.dataPath ?? process.env.SOUL_SIGIL_DATA ?? DEFAULT_SIGIL_STORE;
  const index = await readSigilIndexFile(filePath);
  return index[normalized]?.map((sigil) => ({ ...sigil })) ?? [];
}
