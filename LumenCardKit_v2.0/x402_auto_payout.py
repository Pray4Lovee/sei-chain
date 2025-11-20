import json
import time
import os

wallet_path = os.path.expanduser("~/.lumen_wallet.txt")

try:
    with open(wallet_path, "r") as f:
        addr = f.read().strip()

    memo = f"x402::payout::{addr}::{int(time.time())}"
    record = {
        "wallet": addr,
        "memo": memo,
        "timestamp": time.ctime()
    }

    with open("receipts.jsonl", "a") as r:
        r.write(json.dumps(record) + "\n")

    print(f"✅ x402 payout memo prepared.\nMemo: {memo}")

except Exception as e:
    print(f"⚠️ Error: {e}")
