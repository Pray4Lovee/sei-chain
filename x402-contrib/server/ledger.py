import json
import sqlite3
import time
from contextlib import closing

DB_PATH = "x402_ledger.db"


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                to_address TEXT NOT NULL,
                amount_wei INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                tx_hash TEXT,
                receipt_json TEXT,
                created_at INTEGER NOT NULL,
                broadcast_at INTEGER,
                settled_at INTEGER,
                updated_at INTEGER
            );
            """
        )
        conn.commit()


def create_session(session_id, to_address, amount_wei):
    now = int(time.time())
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO sessions (session_id, to_address, amount_wei, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, to_address, amount_wei, now, now),
        )
        conn.commit()


def get_session(session_id):
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
        return cur.fetchone()


def count_unsettled_sessions():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS unsettled FROM sessions WHERE status != 'settled'")
        row = cur.fetchone()
        return int(row["unsettled"])


def list_broadcasting_sessions(limit=100):
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT *
            FROM sessions
            WHERE status='broadcasting'
            ORDER BY broadcast_at ASC
            LIMIT ?
            """,
            (limit,),
        )
        return cur.fetchall()


def mark_broadcasting(session_id, tx_hash):
    now = int(time.time())
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE sessions
            SET status='broadcasting', tx_hash=?, broadcast_at=?, updated_at=?
            WHERE session_id=? AND status='pending'
            """,
            (tx_hash, now, now, session_id),
        )
        if cur.rowcount != 1:
            conn.rollback()
            raise RuntimeError("invalid broadcast state")
        conn.commit()


def mark_settled(session_id, receipt):
    now = int(time.time())
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE sessions
            SET status='settled', receipt_json=?, settled_at=?, updated_at=?
            WHERE session_id=?
            """,
            (json.dumps(receipt), now, now, session_id),
        )
        conn.commit()


def reset_to_pending(session_id):
    now = int(time.time())
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE sessions
            SET status='pending', updated_at=?
            WHERE session_id=? AND status='broadcasting'
            """,
            (now, session_id),
        )
        conn.commit()
