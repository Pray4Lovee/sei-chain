import requests

from config.loader import load_config


def notify(msg: str) -> None:
    cfg = load_config()
    if not cfg.get("alerts", {}).get("enabled"):
        return

    token = cfg["alerts"]["telegram_token"]
    chat_id = cfg["alerts"]["chat_id"]

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, data={"chat_id": chat_id, "text": msg}, timeout=10)
