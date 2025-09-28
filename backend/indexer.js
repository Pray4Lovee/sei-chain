import express from "express";
import { ethers } from "ethers";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
const PORT = 4000;

// Replace with your RPC + contract
const RPC = "https://ethereum.publicnode.com";
const CONTRACT_ADDRESS = "0xYourVaultAddress";
const ABI = [
  "event Deposit(address indexed user,uint256 amount,uint256 royalty,uint256 credited)",
  "event Spend(address indexed user,address to,uint256 amount)"
];

async function setupDB() {
  return open({
    filename: "./txhistory.db",
    driver: sqlite3.Database
  });
}

async function main() {
  const db = await setupDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS txs (
      user TEXT,
      type TEXT,
      amount TEXT,
      royalty TEXT,
      toAddr TEXT,
      timestamp TEXT
    )
  `);

  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  contract.on("Deposit", async (user, amount, royalty, credited, evt) => {
    await db.run(
      "INSERT INTO txs (user,type,amount,royalty,toAddr,timestamp) VALUES (?,?,?,?,?,?)",
      user,
      "Deposit",
      credited.toString(),
      royalty.toString(),
      "",
      new Date().toISOString()
    );
  });

  contract.on("Spend", async (user, to, amount, evt) => {
    await db.run(
      "INSERT INTO txs (user,type,amount,royalty,toAddr,timestamp) VALUES (?,?,?,?,?,?)",
      user,
      "Spend",
      amount.toString(),
      "0",
      to,
      new Date().toISOString()
    );
  });

  // API: user history
  app.get("/history", async (req, res) => {
    const user = req.query.user;
    if (!user) {
      return res.status(400).json({ error: "Missing user" });
    }
    const rows = await db.all("SELECT * FROM txs WHERE user=? ORDER BY datetime(timestamp) DESC", user);
    res.json(rows);
  });

  // API: Keeper dashboard - total royalties
  app.get("/royalties", async (req, res) => {
    const row = await db.get("SELECT SUM(royalty) as total FROM txs WHERE type='Deposit'");
    res.json({
      totalRoyalties: row?.total ?? "0"
    });
  });

  // API: Breakdown by user
  app.get("/royalties/by-user", async (req, res) => {
    const rows = await db.all(
      "SELECT user, SUM(royalty) as total FROM txs WHERE type='Deposit' GROUP BY user"
    );
    res.json(rows);
  });

  app.listen(PORT, () => console.log(`Indexer API running on port ${PORT}`));
}

main().catch((err) => {
  console.error("Indexer failed", err);
  process.exit(1);
});
