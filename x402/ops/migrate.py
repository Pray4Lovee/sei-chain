import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "x402-contrib", "server"))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from ledger import init_db


if __name__ == "__main__":
    init_db()
    print("x402 ledger migrations applied")
