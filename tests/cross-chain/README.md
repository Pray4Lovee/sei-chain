# Cross-Chain Testing Suite

This package contains a standalone Jest test harness that exercises the front-end surface area of the cross-chain proof flow.  It mocks zero-knowledge proof retrieval and simulates bridge relays for Sei, Polygon, Solana, and EVM chains.

## Usage

```bash
npm install
npm test
```

The suite relies on mocked fetch responses to emulate CCIP and Wormhole relayers.  The fixtures align with the Hardhat tests that live in `contracts/test/CrossChainSoulKeyAccess.test.js`.
