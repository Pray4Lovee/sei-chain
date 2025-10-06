import express from "express";
import { promises as fs } from "fs";
import { dirname, resolve } from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

import { getSeiRoyalties } from "./connectors/sei.js";
import { getHyperliquidRoyalties } from "./connectors/hyperliquid.js";

const app = express();
const dbPath = process.env.INDEXER_DB || "./data/indexer.db";
const resolvedDbPath = resolve(dbPath);

const dbPromise = (async () => {
  await fs.mkdir(dirname(resolvedDbPath), { recursive: true });
  return open({
    filename: resolvedDbPath,
    driver: sqlite3.Database,
  });
})();

app.get("/api/royalties/all", async (req, res) => {
  try {
    const db = await dbPromise;
    const evmRow = await db.get(
      "SELECT SUM(royalty) as total FROM txs WHERE type='Deposit'",
    );
    const evmTotal = evmRow?.total ? evmRow.total.toString() : "0";

    const [sei, hyper] = await Promise.all([
      getSeiRoyalties(),
      getHyperliquidRoyalties(),
    ]);

    res.json({
      EVM: evmTotal,
      Sei: sei.totalRoyalties,
      Hyperliquid: hyper.totalRoyalties,
    });
  } catch (error) {
    console.error("Failed to aggregate royalties:", error);
    res.status(500).json({ error: "failed_to_fetch_royalties" });
  }
});

export { app, dbPromise };

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`Indexer listening on port ${port}`);
  });
}
