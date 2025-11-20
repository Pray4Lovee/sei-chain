import os
import hashlib
from datetime import datetime

wallet_path = os.path.expanduser("~/.lumen_wallet.txt")

wallet = os.urandom(32).hex()
sigil = f"wallet::{wallet}::issued::{datetime.utcnow().isoformat()}"
sigil_hash = hashlib.sha256(sigil.encode()).hexdigest()

# Write wallet
os.makedirs(os.path.dirname(wallet_path), exist_ok=True)
with open(wallet_path, "w") as w:
    w.write(wallet)

# Write sigil
with open("LumenSigil.txt", "w") as s:
    s.write(sigil)

# Log proof
with open("sunset_proof_log.txt", "a") as l:
    l.write(f"{sigil_hash}\n")

print("✅ Sovereign wallet + sigil generated + sealed.")
