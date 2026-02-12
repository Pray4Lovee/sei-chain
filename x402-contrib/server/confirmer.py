import json
import logging
import time

from ledger import list_broadcasting_sessions, mark_settled


logger = logging.getLogger(__name__)


def run_confirmer_loop(web3_client, confirmations, poll_interval_s=10):
    while True:
        try:
            head = web3_client.eth.block_number
            for row in list_broadcasting_sessions(limit=200):
                tx_hash = row["tx_hash"]
                if not tx_hash:
                    continue
                try:
                    receipt = web3_client.eth.get_transaction_receipt(tx_hash)
                except Exception:
                    continue
                if not receipt or receipt.blockNumber is None:
                    continue
                if head - receipt.blockNumber < confirmations:
                    continue
                receipt_data = {
                    "blockNumber": receipt.blockNumber,
                    "gasUsed": receipt.gasUsed,
                    "status": receipt.status,
                    "transactionHash": receipt.transactionHash.hex(),
                }
                mark_settled(row["session_id"], receipt_data)
        except Exception as exc:
            logger.exception("confirmer loop error: %s", exc)
        time.sleep(poll_interval_s)
