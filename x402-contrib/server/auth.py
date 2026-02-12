from ledger import count_unsettled_sessions


def enforce_quota(max_outstanding):
    if count_unsettled_sessions() >= max_outstanding:
        raise RuntimeError("quota exceeded")
