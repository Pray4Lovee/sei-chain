import json
import os
import threading
import time
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from web3 import Web3
from web3.exceptions import TimeExhausted

from auth import enforce_quota
from confirmer import run_confirmer_loop
from ledger import (
    create_session,
    get_session,
    init_db,
    mark_broadcasting,
    mark_settled,
    reset_to_pending,
)
from metrics import (
    QUOTA_REJECTS,
    RATE_LIMIT_REJECTS,
    REQUESTS_TOTAL,
    SETTLE_LATENCY,
    TXS_TOTAL,
    metrics_payload,
)
from nonce import with_nonce_lock
from rate_limit import allow

load_dotenv(dotenv_path=".env")

RPC_URL = os.environ["RPC_URL"]
PRIVATE_KEY = os.environ["SETTLEMENT_PRIVATE_KEY"]
GAS_LIMIT = int(os.environ.get("GAS_LIMIT", "21000"))
RECEIPT_TIMEOUT = int(os.environ.get("RECEIPT_TIMEOUT", "180"))
CHAIN_CONFIRMATIONS = int(os.environ.get("CHAIN_CONFIRMATIONS", "2"))
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "60"))
MAX_OUTSTANDING = int(os.environ.get("MAX_OUTSTANDING", "100"))

PRICE_WEI = Web3.to_wei(0.01, "ether")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
ACCOUNT = w3.eth.account.from_key(PRIVATE_KEY)
CHAIN_ID = int(w3.eth.chain_id)

init_db()
app = Flask(__name__)


threading.Thread(
    target=run_confirmer_loop,
    args=(w3, CHAIN_CONFIRMATIONS),
    kwargs={"poll_interval_s": 10},
    daemon=True,
).start()


def wait_for_receipt(tx_hash):
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=RECEIPT_TIMEOUT)
    if receipt is None:
        raise RuntimeError("receipt not found")
    if receipt.status != 1:
        raise RuntimeError("tx reverted")
    return receipt


@app.before_request
def gate_rate_limit():
    if request.path == "/metrics":
        return None
    if not allow(request.remote_addr, RATE_LIMIT_PER_MIN):
        RATE_LIMIT_REJECTS.inc()
        return jsonify({"error": "rate limited"}), 429
    return None


@app.route("/metrics", methods=["GET"])
def metrics():
    return metrics_payload()


@app.route("/", methods=["GET"])
def require_payment():
    try:
        enforce_quota(MAX_OUTSTANDING)
    except RuntimeError:
        QUOTA_REJECTS.inc()
        return jsonify({"error": "quota exceeded"}), 503

    session_id = uuid.uuid4().hex
    create_session(session_id, ACCOUNT.address, PRICE_WEI)

    return (
        jsonify(
            {
                "protocol": "x402",
                "error": "Payment Required",
                "chainId": CHAIN_ID,
                "amount_wei": PRICE_WEI,
                "sessionId": session_id,
                "settlement_address": ACCOUNT.address,
                "settlement_endpoint": "/x402/settle",
            }
        ),
        402,
    )


@app.route("/x402/settle", methods=["POST"])
@with_nonce_lock
def settle():
    REQUESTS_TOTAL.inc()
    t0 = time.monotonic()

    data = request.get_json(force=True) or {}
    session_id = data.get("sessionId")
    if not session_id:
        return jsonify({"error": "missing sessionId"}), 400

    row = get_session(session_id)
    if not row:
        return jsonify({"error": "unknown session"}), 404

    if row["status"] == "settled":
        return jsonify(
            {
                "status": "already settled",
                "tx_hash": row["tx_hash"],
                "receipt": json.loads(row["receipt_json"]),
            }
        )

    if row["status"] != "pending":
        return jsonify({"error": "settlement in progress", "tx_hash": row["tx_hash"]}), 409

    nonce = w3.eth.get_transaction_count(ACCOUNT.address)
    tx = {
        "chainId": CHAIN_ID,
        "nonce": nonce,
        "to": Web3.to_checksum_address(row["to_address"]),
        "value": row["amount_wei"],
        "gas": GAS_LIMIT,
        "gasPrice": w3.eth.gas_price,
    }

    signed = ACCOUNT.sign_transaction(tx)
    tx_hash_hex = signed.hash.hex()

    mark_broadcasting(session_id, tx_hash_hex)

    try:
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        TXS_TOTAL.inc()
        receipt = wait_for_receipt(tx_hash)
    except TimeExhausted:
        # Tx may already be mined or still propagating; keep broadcasting so
        # the confirmer can reconcile it later.
        return (
            jsonify(
                {
                    "status": "broadcasting",
                    "sessionId": session_id,
                    "amount_wei": row["amount_wei"],
                    "tx_hash": tx_hash_hex,
                }
            ),
            202,
        )
    except Exception:
        reset_to_pending(session_id)
        raise
    finally:
        SETTLE_LATENCY.observe(time.monotonic() - t0)

    receipt_data = {
        "blockNumber": receipt.blockNumber,
        "gasUsed": receipt.gasUsed,
        "status": receipt.status,
        "transactionHash": receipt.transactionHash.hex(),
    }

    mark_settled(session_id, receipt_data)

    return jsonify(
        {
            "status": "settled",
            "sessionId": session_id,
            "amount_wei": row["amount_wei"],
            "tx_hash": tx_hash_hex,
            "receipt": receipt_data,
        }
    )


if __name__ == "__main__":
    print("🟢 REAL x402 settlement server running on :4020")
    print(f"🔑 Settlement account: {ACCOUNT.address}")
    print(f"⛓️  Chain ID: {CHAIN_ID}")
    app.run(host="0.0.0.0", port=4020, debug=False)
