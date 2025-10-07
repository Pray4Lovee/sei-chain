import express from "express";
import { ethers } from "ethers";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
const PORT = process.env.PORT || 4000;

const RPC = process.env.RPC_URL || "https://ethereum.publicnode.com";
const CONTRACT_ADDRESS = process.env.VAULT_ADDRESS || "0xYourVaultAddress";
const ABI = [
  "event Deposit(address indexed user,uint256 amount,uint256 royalty,uint256 credited)",
  "event Spend(address indexed user,address to,uint256 amount)"
];

async function setupDB() {
  return open({
    filename: process.env.SQLITE_PATH || "./txhistory.db",
    driver: sqlite3.Database
  });
}

async function main() {
  const db = await setupDB();
  await db.exec(
    "CREATE TABLE IF NOT EXISTS txs (user TEXT, type TEXT, amount TEXT, toAddr TEXT, timestamp TEXT)"
  );

  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  contract.on("Deposit", async (user, amount, royalty, credited) => {
    await db.run(
      "INSERT INTO txs (user,type,amount,toAddr,timestamp) VALUES (?,?,?,?,datetime('now'))",
      user,
      "Deposit",
      credited.toString(),
      "",
      new Date().toISOString()
    );
  });

  contract.on("Spend", async (user, to, amount) => {
    await db.run(
      "INSERT INTO txs (user,type,amount,toAddr,timestamp) VALUES (?,?,?,?,datetime('now'))",
      user,
      "Spend",
      amount.toString(),
      to,
      new Date().toISOString()
    );
  });

  app.get("/history", async (req, res) => {
    const { user } = req.query;
    if (!user || typeof user !== "string") {
      res.status(400).json({ error: "user query param required" });
      return;
    }
    const rows = await db.all("SELECT * FROM txs WHERE user = ? ORDER BY timestamp DESC", user);
    res.json(rows);
  });

  app.listen(PORT, () => {
    console.log(`Indexer API running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Indexer failed", err);
  process.exit(1);
});
