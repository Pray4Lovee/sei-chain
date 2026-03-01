PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nonces (
  chain_id INTEGER PRIMARY KEY,
  next_nonce INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  to_addr TEXT NOT NULL,
  amount_wei TEXT NOT NULL,
  status TEXT NOT NULL,
  nonce INTEGER UNIQUE,
  tx_hash TEXT UNIQUE,
  error_message TEXT,
  block_number INTEGER,
  authorized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signed_at DATETIME,
  broadcast_at DATETIME,
  confirmed_at DATETIME,
  finalized_at DATETIME,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('authorized', 'signing', 'broadcasting', 'confirmed', 'finalized', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);
