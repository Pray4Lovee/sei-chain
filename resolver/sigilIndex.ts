export type SigilRecord = {
  chain: string;
  timestamp: string;
};

/**
 * Simple in-memory sigil store that can be replaced with a database or indexer
 * integration. The keys should be lower-cased EVM addresses.
 */
const sigilStore: Record<string, SigilRecord[]> = {};

export async function getPastSigilsForUser(user: string): Promise<SigilRecord[]> {
  return sigilStore[user.toLowerCase()] ?? [];
}

export function setSigilsForUser(user: string, sigils: SigilRecord[]): void {
  sigilStore[user.toLowerCase()] = sigils;
}
