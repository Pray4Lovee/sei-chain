export interface SoulSigilRecord {
  /**
   * Unique identifier for the sigil claim (tx hash, db id, etc.)
   */
  id: string;
  /**
   * Name of the chain the sigil was earned on (e.g. "Sei").
   */
  chain: string;
  /**
   * ISO-8601 timestamp string representing when the sigil was claimed.
   */
  timestamp: string;
}

export interface SoulProfile {
  hasSoulKey: boolean;
  sigilCount: number;
  hasSeiSigil: boolean;
  chains: string[];
  firstClaim: string | null;
  lastClaim: string | null;
}
