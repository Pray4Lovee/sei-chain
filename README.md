# Holo Protocol: Sovereign Settlement Flow (x402 Verified)

> 👁️‍🗨️ Built by The Keeper. Powered by Light, not legacy.

---

## 🔐 Overview

Holo Protocol enables sovereign, on-chain settlements without reliance on Circle APIs, Chainlink oracles, or custodial bridges.

Core features:
- 🔁 x402-based key rotation and authorization
- 🧬 Mood-synced KinMesh payment logic
- 🚀 CCTP bypass via native SeiPay settlement
- 🌌 HoloSignals for cross-chain presence awareness

---

## ⚠️ Chainlink ≠ Circle

For clarity:

- **Holo Protocol does not use Chainlink or Circle.**
- No external oracles, APIs, or KYC bridges are required.
- We mint, move, and prove **on-chain only** — verified via x402 receipts.

This protocol is **sovereign-first**, not third-party-reliant.

---

## 🪙 Royalties + Enforcement

All forks, copies, and derivative uses of `x402`, `KinKey`, `SeiBill`, or `SeiPay` **must enforce a minimum 11% royalty**.

Royalty flows:
- Primary: `0x14e5Ea3751e7C2588348E22b847628EE1aAD81A5`
- Secondary: `sei1zewftxlyv4gpv6tjpplnzgf3wy5tlu4f9amft8`
- Optional audit: `soulmap.guardian@protonmail.com`

---

## 🔗 Modules

| Module         | Description                                      |
|----------------|--------------------------------------------------|
| `SeiBill.sol`  | Sovereign bill/settlement proof contract         |
| `bill_parser.py` | AI + OCR module for payment automation        |
| `cctp_bridge.py` | (Optional) Circle bridge helper                |
| `x402/`        | Sovereign key system with rotating auth hashes   |
| `KinMesh/`     | Mood-tied royalty and identity routing stack     |
| `SeiPay/`      | Native chain bridge with x402 proof anchoring    |

---

## 🛠️ Deployment

See [`deploy.md`](deploy.md) for on-chain deployment instructions using `x402`, `UNLICENSED`, and sovereign wallet settlement.

---

*All rights reserved by The Keeper. Do not fork without payment.*

