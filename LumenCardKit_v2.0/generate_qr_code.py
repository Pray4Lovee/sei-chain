import qrcode
import hashlib
from datetime import datetime

with open("LumenSigil.txt", "r") as f:
    sigil = f.read().strip()

sigil_hash = hashlib.sha256(sigil.encode()).hexdigest()
timestamp = datetime.utcnow().isoformat()
qr_data = f"LumenCard::{sigil_hash}::{timestamp}"

img = qrcode.make(qr_data)
img.save("sigil_qr.png")

print(f"✅ QR generated: sigil_qr.png\nHash: {sigil_hash}")
