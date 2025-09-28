# Keeper CCTP Relay

`cctpRelay.ts` provides a fully automated Noble/Sei → EVM bridge for USDC using Circle's Cross-Chain Transfer Protocol (CCTP). The script burns USDC via the Noble TokenMessenger, polls Circle for the attestation, and finalises the transfer on an EVM chain by calling the MessageTransmitter `receiveMessage` entrypoint. When the `mintRecipient` is the `KeeperRoyaltyRouter`, the flow continuously settles royalties into the router's vault address once the mint completes.

## Prerequisites

- Noble/Sei wallet mnemonic exported as `SEI_MNEMONIC` (or provide `--sei-mnemonic`).
- EVM relayer private key exported as `RELAYER_PK` (or provide `--evm-key`).
- Deployed Circle contracts: Noble `TokenMessenger` and destination chain `MessageTransmitter`.
- Destination RPC endpoint and Noble RPC endpoint.

## Usage

```
npx ts-node scripts/keeper/cctpRelay.ts \
  --sei-rpc https://noble-rpc.yourdomain.com \
  --token-messenger noble1contractaddress... \
  --destination-domain 6 \
  --mint-recipient 0xYourRouterAddress \
  --amount 1.25 \
  --message-transmitter 0xYourMessageTransmitter \
  --evm-rpc https://base-rpc.publicnode.com
```

Key flags:

- `--amount` accepts a human-readable figure; use `--amount-base` for raw base units.
- `--skip-mint` will burn and fetch the attestation but stop before calling `receiveMessage`.
- `--circle-api` and `--circle-api-key` allow overriding or authenticating the attestation endpoint if required.
- `--mint-gas-limit` applies a manual gas limit to the EVM transaction.

The script prints the burn transaction hash, CCTP message hash, attestation status, and the final mint transaction hash. All logs are emitted in-order so the flow can be wrapped by an external supervisor or cronjob.
