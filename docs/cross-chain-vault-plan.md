# Cross-Chain Vault Access Deployment Plan

This document captures a high-level implementation plan for deploying the CrossChainSoulKeyGate architecture across Sei, Base, Arbitrum, Ethereum, Polygon, and Solana.

## Overview

The system aims to provide privacy-preserving vault access via zkSoulProofs with cross-chain messaging using CCIP and Wormhole.

## Deployment Checklist

1. **ZK Proof Verifiers**
   - Compile and deploy `ZkMultiFactorProofVerifier` contracts on each chain.
   - Record deployed addresses and publish ABI artifacts.
2. **CrossChainSoulKeyGate**
   - Deploy `CrossChainSoulKeyGate` per chain, passing verifier address and the appropriate message transmitter (CCIP or Wormhole).
   - Configure allowlists for inbound domains (e.g., Sei→EVM, Solana→Polygon).
3. **Messaging Infrastructure**
   - Provision Circle Message Transmitter for Sei/EVM interactions.
   - Configure Wormhole guardians for Solana bridging.
   - Define cross-chain routing tables.
4. **Access Registry**
   - Stand up a shared access state registry to track proof approvals per chain.
5. **Monitoring & Observability**
   - Integrate on-chain event listeners for proof submissions.
   - Add alerting for failed verification attempts.

## Testing Strategy

### Unit Tests
- Expand Hardhat/Foundry suites to cover zk verification edge cases.

### Integration Tests
- Mock CCIP/Wormhole message delivery to validate grant/deny flows.
- Simulate multiple chain domains and verify replay protection.

### End-to-End
- Scripted end-to-end flows using testnets (Sei devnet, Polygon Mumbai, Solana devnet).
- Validate proof generation using zkSNARK circuits and ensure cross-chain propagation.

## Next Steps

1. Implement automated deployment scripts per chain (Sei CLI, Hardhat, Anchor).
2. Build relayer services to connect CCIP and Wormhole to contract methods.
3. Develop a comprehensive test harness covering zk proof validation across all supported networks.

