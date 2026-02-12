import threading
from functools import wraps

_nonce_lock = threading.Lock()


def with_nonce_lock(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        with _nonce_lock:
            return fn(*args, **kwargs)

    return wrapper


locked = with_nonce_lock
