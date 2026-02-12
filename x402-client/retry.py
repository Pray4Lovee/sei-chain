import time


def retry(fn, attempts=5, delay_s=2):
    last_error = None
    for _ in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(delay_s)
    raise last_error
