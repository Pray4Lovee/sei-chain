# CCTP Relay Flow

This script automates the Noble/Sei → EVM Circle CCTP relay required to keep the Keeper royalty loop self-settling.

It performs the three relay stages:

1. **Burn** USDC on Noble/Sei via Circle's `TokenMessenger` contract.
2. **Fetch** the Circle attestation that finalises the burn.
3. **Mint** the burnt USDC on an EVM domain via `MessageTransmitter` and optionally trigger the Keeper royalty router.

## Prerequisites

- Node.js ≥ 18 (the script relies on the native `fetch` implementation).
- `pnpm install` / `npm install` executed at repository root to install the new CosmJS + ethers tooling.
- Environment variables that describe both the Noble/Sei and EVM environments (see below).

## Environment variables

Create an `.env` file or export the variables in your shell before running the script.

| Variable | Description |
| --- | --- |
| `SEI_MNEMONIC` | Noble/Sei relayer mnemonic (64-character seed words). |
| `SEI_RPC_URL` | Noble/Sei RPC endpoint URL. |
| `SEI_CHAIN_ID` | Expected chain id (default `noble-1`). |
| `SEI_ADDRESS_PREFIX` | Bech32 prefix for Noble/Sei addresses (default `noble`). |
| `SEI_GAS_PRICE` | Gas price string, e.g. `0.0025uusdc`. |
| `TOKEN_MESSENGER_ADDRESS` | Circle TokenMessenger contract address on Noble/Sei. |
| `BURN_AMOUNT` | Amount in the smallest USDC denomination (e.g. `1000000` for 1 USDC). |
| `BURN_TOKEN` | Noble/Sei token denom (default `uusdc`). |
| `DESTINATION_DOMAIN` | Circle domain id for the destination EVM chain (e.g. `6` for Base). |
| `EVM_RECIPIENT` | EVM address that should receive the minted USDC. |
| `MESSAGE_TRANSMITTER_ADDRESS` | Circle MessageTransmitter contract on the destination chain. |
| `EVM_RPC_URL` | Destination EVM RPC endpoint. |
| `RELAYER_PRIVATE_KEY` | EVM relayer private key (hex). |
| `ATTESTATION_BASE_URL` | Circle Iris attestation endpoint (default `https://iris-api.circle.com/attestations`). |
| `ATTESTATION_POLL_INTERVAL_MS` | Polling cadence for attestations in milliseconds (default `5000`). |
| `CCTP_OUTPUT_DIRECTORY` | Directory where artefacts (message/attestation/metadata) are written. |
| `KEEPER_ROUTER_ADDRESS` | *(optional)* KeeperRoyaltyRouter contract address. |
| `KEEPER_ROUTER_FUNCTION` | *(optional)* Router function to call after minting (default `settleRoyalties`). |
| `KEEPER_ROUTER_ARGS` | *(optional)* JSON array of arguments for the router call. |
| `KEEPER_ROUTER_ABI_PATH` | *(optional)* Path to a JSON ABI describing the router. Defaults to a minimal ABI with `settleRoyalties()`. |

The script left-pads the configured `EVM_RECIPIENT` to 32 bytes before sending it to the `TokenMessenger` so the Noble burn transaction already satisfies the CCTP requirement.

## Running the relay

```bash
npm install
npx ts-node scripts/cctp/relayFlow.ts
```

Every run writes three artefacts in `CCTP_OUTPUT_DIRECTORY` using the burn transaction hash as prefix:

- `<hash>-message.hex` – the exact Circle message emitted by the burn.
- `<hash>-attestation.hex` – the fetched attestation bytes.
- `<hash>-metadata.json` – metadata that links burn ↔ mint ↔ attestation.

If `KEEPER_ROUTER_ADDRESS` is set the script will call that router after the mint completes, enabling an end-to-end auto-settlement loop into the `KeeperRoyaltyRouter` / `LumenCardVault` stack.

## Error handling

- The Noble burn fails fast if the connected RPC advertises a different chain id than `SEI_CHAIN_ID`.
- Message and attestation parsing is strict—if the Circle events are missing or malformatted the script aborts instead of relaying an invalid payload.
- Attestation polling bubbles up non-`200` responses from Circle to make debugging easier.

This automation allows the keeper to run a single command that performs burn → attestation → mint without manual intervention, aligning with the royalty architecture described in the prompt.
