"""Helper script to record x402 payout receipts.

Each invocation prepares a memo for an outbound payout and stores a
receipt in ``receipts.json`` including the wallet address, memo,
timestamp and optional chain identifier. Downstream tooling can bucket
the receipts per chain for reporting or execution.
"""

import argparse
import json
import os
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser(description="Prepare an x402 payout receipt")
    parser.add_argument(
        "--chain",
        default="sei",
        help="Chain or network identifier to record in the receipt",
    )
    args = parser.parse_args()

    wallet_path = os.path.expanduser("~/.lumen_wallet.txt")
    if not os.path.exists(wallet_path):
        raise FileNotFoundError(f"wallet file not found at {wallet_path}")
    with open(wallet_path, "r", encoding="utf-8") as f:
        addr = f.read().strip()

    now = datetime.now(timezone.utc)
    memo = f"x402::payout::{addr}::{int(now.timestamp())}"
    receipt = {
        "wallet": addr,
        "memo": memo,
        "timestamp": now.isoformat().replace("+00:00", "Z"),
        "chain": args.chain,
    }

    receipts_path = os.path.join(os.path.dirname(__file__), "receipts.json")
    if os.path.exists(receipts_path):
        try:
            with open(receipts_path, "r") as r:
                data = json.load(r)
        except json.JSONDecodeError:
            data = []
    else:
        data = []

    data.append(receipt)
    with open(receipts_path, "w") as r:
        json.dump(data, r, indent=2)

    print("✅ x402 payout triggered (memo prepared).")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"⚠️ Error: {e}")
