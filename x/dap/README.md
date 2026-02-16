# DAP (Dynamic Allocation Pool) — Sei Native Go Scaffold

This directory contains a **Sei-native Go DAP scaffold** focused on modular pipeline stages
that are easy to wire into Cosmos SDK keeper/message flows.

- `keeper/pipeline.go` → ordered DAP pipeline execution for transaction envelopes
- `types/` → module constants and event names
- `zk/circuit.go` → circuit witness container
- `zk/proof.go` → deterministic proof receipt hash helper

## Stage mapping

- `dap_guard` -> `GuardVerifier`
- `origin_verifier` -> `OriginResolver`
- `signal_sync` -> `SignalSynchronizer`
- `soulsync` -> `SoulLocker`
- `genzk402` -> `ZKSealer`

This scaffold is intentionally lightweight and Sei-oriented so it can be expanded with
Msg handlers, keeper storage, params, and gRPC surfaces without introducing consensus risk.

## What was missing and now added

- Pipeline constructor validation for nil dependencies (guard/origin/signal/soul/zk sealer).
- Input validation for empty actor IDs before stage execution.
- Wrapped stage-specific errors to make failures easier to diagnose in production logs.
- A parallel stress test (`TestPipelineExecuteStress`) that drives the flow across many goroutines and verifies every receipt is sealed.
