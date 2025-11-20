import os
import smtplib
from email.message import EmailMessage

receiver = "your@email.com"  # Replace manually
wallet_path = os.path.expanduser("~/.lumen_wallet.txt")

# Validate files
if not os.path.exists("sigil_qr.png"):
    raise FileNotFoundError("sigil_qr.png not found")

if not os.path.exists(wallet_path):
    raise FileNotFoundError("~/.lumen_wallet.txt not found")

msg = EmailMessage()
msg["Subject"] = "Your LumenCard Wallet + Sigil"
msg["From"] = "noreply@lumen.local"
msg["To"] = receiver

msg.set_content("Attached is your sovereign wallet and sigil.")

with open("sigil_qr.png", "rb") as f:
    msg.add_attachment(f.read(), maintype="image", subtype="png", filename="sigil_qr.png")

with open(wallet_path, "rb") as f:
    msg.add_attachment(f.read(), maintype="text", subtype="plain", filename="wallet.txt")

try:
    with smtplib.SMTP("localhost") as s:
        s.send_message(msg)
    print("✅ Email sent (local SMTP).")

except Exception as e:
    print(f"⚠️ Email not sent (no SMTP server). Error: {e}")
