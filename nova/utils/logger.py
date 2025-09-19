import time
from pathlib import Path


LOG_FILE = Path("nova.log")


def log(msg: str) -> None:
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{now}] {msg}"
    print(formatted)
    with LOG_FILE.open("a", encoding="utf-8") as log_file:
        log_file.write(f"{formatted}\n")
