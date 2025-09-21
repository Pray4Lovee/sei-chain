from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from claims.vault_scanner_utils import (
    build_claim_payload,
    claim_digest,
    claim_message_hash,
    ethereum_signed_message_hash,
)


@pytest.mark.parametrize(
    "user,vault_id,balance,attribution,expected_prefix",
    [
        (
            "0x000000000000000000000000000000000000dEaD",
            "0x" + "11" * 32,
            123456789,
            "0x" + "22" * 32,
            "000000000000000000000000000000000000dead",
        )
    ],
)
def test_build_claim_payload(user: str, vault_id: str, balance: int, attribution: str, expected_prefix: str) -> None:
    payload = build_claim_payload(user, vault_id, balance, attribution)
    assert len(payload) == 20 + 32 + 32 + 32
    assert payload[:20].hex() == expected_prefix
    assert payload[20:52].hex() == ("11" * 32)
    assert payload[52:84].hex() == balance.to_bytes(32, "big").hex()
    assert payload[84:].hex() == ("22" * 32)


def test_claim_digest_matches_manual_keccak() -> None:
    user = "0x1111111111111111111111111111111111111111"
    vault_id = "0x" + "aa" * 32
    attribution = "0x" + "bb" * 32
    balance = 42

    digest = claim_digest(user, vault_id, balance, attribution)
    # Expected value calculated once the helper was verified against the Solidity implementation.
    assert digest.hex() == "9a424ef49188881d7d1eb0aed233cba56b369449f40e6ee25b90f36b1b12a1ca"


def test_claim_message_hash_matches_prefixed_digest() -> None:
    user = "0x2222222222222222222222222222222222222222"
    vault_id = "0x" + "33" * 32
    attribution = "0x" + "44" * 32
    balance = 500

    digest = claim_digest(user, vault_id, balance, attribution)
    prefixed = ethereum_signed_message_hash(digest)
    helper = claim_message_hash(user, vault_id, balance, attribution)

    assert prefixed == helper
    assert prefixed.hex() == "929db561f95f7034830afea907146c202ea4c6d7728fc40d8f048e99498239ad"
