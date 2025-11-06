export interface RoyaltyRecord {
  pending: bigint;
  messageHash?: string;
  messageHex?: string;
  attestationHex?: string;
}

const normalizeUser = (user: string) => user.trim().toLowerCase();

const seedData: Record<string, RoyaltyRecord> = {
  "0xabc...": {
    pending: 2_000_000n,
    messageHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    messageHex: "0x",
    attestationHex: "0x",
  },
  "0xdef...": {
    pending: 500_000n,
    messageHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
    messageHex: "0x",
    attestationHex: "0x",
  },
};

const ledger = new Map<string, RoyaltyRecord>(
  Object.entries(seedData).map(([address, record]) => [normalizeUser(address), record])
);

export function getPendingRoyalties(user: string): bigint {
  const record = ledger.get(normalizeUser(user));
  return record?.pending ?? 0n;
}

export function getRoyaltyRecord(user: string): RoyaltyRecord | undefined {
  return ledger.get(normalizeUser(user));
}

export function markRoyaltyClaimed(user: string) {
  const normalized = normalizeUser(user);
  const record = ledger.get(normalized);
  if (!record) {
    return;
  }

  ledger.set(normalized, {
    ...record,
    pending: 0n,
  });
}
