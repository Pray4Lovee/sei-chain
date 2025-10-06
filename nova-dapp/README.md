# Nova dApp Skeleton

A lightweight Next.js + React front-end that connects to the `LumenCardVault` smart contract. The UI focuses on wallet connectivity and balance visibility, providing a foundation for future Nova and Holo features.

## Getting Started

```bash
npm install
npm run dev
```

Update the contract address inside [`lib/contracts.ts`](./lib/contracts.ts) so the dApp points to your deployed `LumenCardVault` instance.

## Features

- MetaMask (or any injected provider) connection flow
- Fetches spendable and lifetime deposit balances from the vault
- TailwindCSS styling scaffold for rapid iteration

## Next Steps

- Wire up deposit and spend interactions
- Integrate Holo authentication
- Expand the Nova portal dashboard with vault analytics
