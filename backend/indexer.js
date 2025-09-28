const express = require("express");
const { ethers } = require("ethers");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const PORT = process.env.PORT || 4000;
const RPC_URL = process.env.RPC_URL || "https://ethereum.publicnode.com";
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
const DATABASE_PATH = process.env.DATABASE_PATH || "./txhistory.db";

const VAULT_ABI = [
  "event Deposit(address indexed user,uint256 amount,uint256 royalty,uint256 credited)",
  "event Spend(address indexed user,address to,uint256 amount)"
];

async function setupDatabase() {
  return open({
    filename: DATABASE_PATH,
    driver: sqlite3.Database
  });
}

async function main() {
  const app = express();
  app.use(express.json());

  const db = await setupDatabase();
  await db.exec(
    "CREATE TABLE IF NOT EXISTS txs (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, type TEXT, amount TEXT, toAddr TEXT, timestamp TEXT)"
  );

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);

  contract.on("Deposit", async (user, amount, royalty, credited, event) => {
    try {
      const block = await event.getBlock();
      await db.run(
        "INSERT INTO txs (user, type, amount, toAddr, timestamp) VALUES (?,?,?,?,?)",
        user,
        "Deposit",
        credited.toString(),
        "",
        new Date(block.timestamp * 1000).toISOString()
      );
      console.log(`Recorded deposit for ${user}`);
    } catch (err) {
      console.error("Failed to persist deposit", err);
    }
  });

  contract.on("Spend", async (user, to, amount, event) => {
    try {
      const block = await event.getBlock();
      await db.run(
        "INSERT INTO txs (user, type, amount, toAddr, timestamp) VALUES (?,?,?,?,?)",
        user,
        "Spend",
        amount.toString(),
        to,
        new Date(block.timestamp * 1000).toISOString()
      );
      console.log(`Recorded spend for ${user}`);
    } catch (err) {
      console.error("Failed to persist spend", err);
    }
  });

  app.get("/history", async (req, res) => {
    const user = req.query.user;
    if (!user || typeof user !== "string") {
      res.status(400).json([]);
      return;
    }
    try {
      const rows = await db.all("SELECT type, amount, toAddr as to, timestamp FROM txs WHERE user = ? ORDER BY id DESC", user);
      res.json(rows);
    } catch (err) {
      console.error("Failed to fetch history", err);
      res.status(500).json([]);
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`Indexer API running on port ${PORT}`);
    console.log(`Listening for events from ${VAULT_ADDRESS} via ${RPC_URL}`);
  });
}

main().catch((err) => {
  console.error("Indexer failed to start", err);
  process.exit(1);
});
