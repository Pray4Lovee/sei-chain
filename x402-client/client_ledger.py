import sqlite3
import time

DB_PATH = "x402_client.db"


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode=WAL;")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS payments (
            session_id TEXT PRIMARY KEY,
            status TEXT,
            tx_hash TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )
        """
    )

    conn.commit()
    conn.close()


def save(session_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT OR IGNORE INTO payments
        VALUES (?, 'pending', NULL, ?, NULL)
        """,
        (session_id, int(time.time())),
    )

    conn.commit()
    conn.close()


def mark(session_id, status, tx_hash=None):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE payments SET status=?, tx_hash=?, updated_at=?
        WHERE session_id=?
        """,
        (status, tx_hash, int(time.time()), session_id),
    )

    conn.commit()
    conn.close()
