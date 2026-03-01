# x402 Settlement Daemon

Production-focused x402 payout engine for Sei EVM with deterministic, DB-authoritative state transitions.

## Components

- `listener`: subscribes to payout authorization events over WebSocket and writes `authorized` payouts.
- `signer`: single-process nonce reservation + EIP-1559 signing and broadcast.
- `confirmer`: confirmation-depth tracking and finalization.
- `api`: read-only status API + `/metrics` Prometheus endpoint.

## Status state machine

`authorized -> signing -> broadcasting -> confirmed -> finalized` and terminal `failed`.

Rules enforced in code:

- only signer reserves nonce and moves `authorized -> signing`
- only signer sets `tx_hash` and moves `signing -> broadcasting`
- only confirmer moves `broadcasting/confirmed` to `confirmed/finalized`
- HTTP API is read-only

## DB durability

SQLite is opened with:

- WAL mode
- `synchronous=FULL`
- fsync-backed journaling

Schema constraints enforce unique `nonce` and unique `tx_hash`.

## Required environment

- `RPC_URL`
- `WS_URL`
- `SETTLEMENT_PRIVATE_KEY`
- `SETTLEMENT_CONTRACT`
- `PAYOUT_CONTRACT`

Optional:

- `CHAIN_ID` (default `1329`)
- `CONFIRMATIONS` (default `3`)
- `MAX_FEE_CAP_WEI` (default `100000000000`)

## Build

```bash
make bootstrap
make build
```

## Run

```bash
./x402d
```

## API

- `GET /healthz`
- `GET /payouts`
- `GET /payouts/{id}`
- `GET /metrics`
