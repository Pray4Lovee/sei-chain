# SoulSigil Retro-Minting Scripts

This directory contains helper utilities for minting SVG-based SoulSigil NFTs to historical royalty claimants across Base, Sei, and Hyperliquid.

## Files

- `mint_soulsigils_batch.ts` – Batch minter that reads `past_claims.json`, generates SVG sigils, and submits `mint` transactions to the configured SoulSigil NFT contract.
- `generateSoulSigilSVG.ts` – Deterministic SVG generator that produces a themed glyph per claim (including chain-specific palettes and Holo verification glow states).
- `past_claims.json` – Example payload showing the claim format expected by the batch minter. Replace this file with the export from your royalty indexer before running the script.

## Usage

1. Export royalty claimants into `past_claims.json` using the shape provided in the example file.
2. Set the following environment variables:
   - `RELAYER_PK` – Private key for the relayer/minter wallet.
   - `SOULSIGIL_NFT_ADDRESS` – (Optional) Override for the deployed SoulSigil NFT contract address.
   - `BASE_RPC_URL` – (Optional) RPC endpoint for the Base network. Defaults to the public Base RPC.
3. Compile and run the batch minter with your preferred TypeScript runner (e.g. `ts-node`):

```bash
npx ts-node tools/soulsigils/mint_soulsigils_batch.ts
```

Each successful mint is logged to stdout. Failures are caught per-claim so a single bad record will not halt the entire batch.
