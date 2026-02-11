# Sei DAP Full E2E Runtime Structure (Go Native)

This structure rebrands the original Substrate/Polkadot DAP concept into **Sei-native Go services**.

## Layout

- `cmd/sei-dap/` — node entrypoint and runtime boot flags.
- `cmd/sei-soulproof/` — CLI for local zk proof generation flow.
- `dap/node/` — chain profile resolution and service bootstrap wiring.
- `dap/runtime/` — runtime composition metadata using Sei language terms.
- `dap/modules/guard` — state transition guard.
- `dap/modules/origin` — identity and provenance resolver.
- `dap/modules/signal` — metadata signal propagation.
- `dap/modules/soulsync` — entropy-lock mutation tracking.
- `dap/modules/genzk402` — sealed zk commitment registration.
- `dap/zk/circuit` — circuit witness definitions.
- `dap/zk/proof` — receipt generation stub.
- `dap/verifier` — receipt hash verification.
- `scripts/sei_dap_*.sh` — dev node, devnet, and build helpers.

## Terminology Mapping

- Extrinsic → transaction payload
- Pallet → module
- Runtime construct macro → runtime assembly in `dap/runtime`
- Node service wiring → `dap/node/Boot`
