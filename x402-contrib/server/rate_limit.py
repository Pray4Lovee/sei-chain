import threading
import time
from collections import defaultdict

_BUCKET = defaultdict(list)
_LOCK = threading.Lock()


def allow(ip_address, per_minute):
    now = int(time.time())
    ip = ip_address or "unknown"
    with _LOCK:
        window = [ts for ts in _BUCKET[ip] if now - ts < 60]
        if len(window) >= per_minute:
            _BUCKET[ip] = window
            return False
        window.append(now)
        _BUCKET[ip] = window
        return True
