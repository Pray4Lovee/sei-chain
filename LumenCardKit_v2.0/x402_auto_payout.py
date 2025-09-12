import argparse
import json
import os
import time


def main():
    parser = argparse.ArgumentParser(description="Prepare an x402 payout receipt")
    parser.add_argument(
        "--chain",
        default="sei",
        help="Chain or network identifier to record in the receipt",
    )
    args = parser.parse_args()

    wallet_path = os.path.expanduser("~/.lumen_wallet.txt")
    with open(wallet_path, "r") as f:
        addr = f.read().strip()

    memo = f"x402::payout::{addr}::{int(time.time())}"
    receipt = {
        "wallet": addr,
        "memo": memo,
        "timestamp": time.ctime(),
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
