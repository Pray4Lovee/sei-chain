const http = require("http");
const url = require("url");
const path = require("path");

let sqlite3;
try {
  sqlite3 = require("sqlite3");
} catch (error) {
  console.warn(
    "sqlite3 dependency not available; EVM royalties will default to 0 until the module is installed."
  );
}

const { getSeiRoyalties } = require("./connectors/sei");
const { getHyperliquidRoyalties } = require("./connectors/hyperliquid");

let dbInstance;
function getDbInstance(dbPath) {
  if (!sqlite3) {
    return null;
  }

  if (!dbInstance) {
    const resolvedPath =
      dbPath || process.env.ROYALTY_DB_PATH || path.resolve(__dirname, "royalties.db");
    dbInstance = new sqlite3.Database(
      resolvedPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          console.error("Failed to open royalties database:", err);
        }
      }
    );
  }

  return dbInstance;
}

function dbGet(query, dbPath) {
  const db = getDbInstance(dbPath);
  if (!db) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    db.get(query, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function queryEvmRoyalties(dbPath) {
  try {
    const row = await dbGet("SELECT SUM(royalty) as total FROM txs WHERE type='Deposit'", dbPath);
    if (row && row.total != null) {
      return String(row.total);
    }
  } catch (error) {
    console.error("Failed to query EVM royalties:", error);
  }
  return "0";
}

async function aggregateRoyalties(options = {}) {
  const { dbPath } = options;
  const [evmTotal, sei, hyper] = await Promise.all([
    queryEvmRoyalties(dbPath),
    getSeiRoyalties(),
    getHyperliquidRoyalties(),
  ]);

  return {
    EVM: evmTotal,
    Sei: sei.totalRoyalties,
    Hyperliquid: hyper.totalRoyalties,
  };
}

async function handleRequest(req, res, options = {}) {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === "GET" && parsedUrl.pathname === "/royalties/all") {
    try {
      const body = await aggregateRoyalties(options);
      const payload = JSON.stringify(body);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(payload);
    } catch (error) {
      console.error("Failed to aggregate royalties:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to aggregate royalties" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

function startServer(options = {}) {
  const port = Number(options.port || process.env.PORT || 4000);
  const server = http.createServer((req, res) => {
    handleRequest(req, res, options);
  });

  server.listen(port, () => {
    console.log(`Indexer listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  aggregateRoyalties,
  handleRequest,
  startServer,
  queryEvmRoyalties,
  getDbInstance,
};
