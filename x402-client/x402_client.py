import requests

from client_ledger import init_db, mark, save
from retry import retry


class X402Client:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/")
        init_db()

    def request(self):
        response = requests.get(self.base, timeout=30)
        if response.status_code != 402:
            return response

        data = response.json()
        session_id = data["sessionId"]
        save(session_id)

        settle_response = retry(
            lambda: requests.post(
                self.base + data["settlement_endpoint"],
                json={"sessionId": session_id},
                timeout=120,
            )
        )
        settle_data = settle_response.json()

        if settle_response.status_code == 200 and settle_data.get("tx_hash"):
            mark(session_id, "settled", settle_data["tx_hash"])
        else:
            mark(session_id, "failed")
            settle_response.raise_for_status()

        return requests.get(self.base, timeout=30)
