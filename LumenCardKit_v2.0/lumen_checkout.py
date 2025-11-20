import hashlib, time

with open("LumenSigil.txt", "r") as f:
    sigil = f.read().strip()

session_seed = f"{sigil}::{time.time()}"
checkout_hash = hashlib.sha256(session_seed.encode()).hexdigest()

print(f"🔐 Ephemeral Checkout Session ID: {checkout_hash}")
