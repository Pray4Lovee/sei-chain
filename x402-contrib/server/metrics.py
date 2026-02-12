from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

REQUESTS_TOTAL = Counter("x402_requests_total", "Total incoming x402 settlement requests")
TXS_TOTAL = Counter("x402_transactions_total", "Total raw transactions submitted")
SETTLE_LATENCY = Histogram("x402_settlement_seconds", "Settlement handler latency")
RATE_LIMIT_REJECTS = Counter("x402_rate_limit_rejects_total", "Rate-limited HTTP requests")
QUOTA_REJECTS = Counter("x402_quota_rejects_total", "Quota-rejected payment requests")


def metrics_payload():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
