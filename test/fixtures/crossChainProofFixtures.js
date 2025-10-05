const { createHash } = require('crypto');

function createSignalHash(user, originChain, vaultId) {
  return createHash('sha256')
    .update(`${user.toLowerCase()}:${originChain}:${vaultId}`)
    .digest('hex');
}

const proofFixtures = [
  {
    label: 'sei-to-base',
    user: '0xSeiSoulKeyUser',
    originChain: 'sei',
    vaultId: 'vault-galaxy',
    proof: { commitment: 'sei-proof-root' },
    publicSignals: {
      signalHash: createSignalHash('0xSeiSoulKeyUser', 'sei', 'vault-galaxy'),
      targetChain: 'base',
      nullifier: '1',
      vaultId: 'vault-galaxy'
    },
    transport: 'ccip'
  },
  {
    label: 'polygon-to-arbitrum',
    user: '0xPolygonSoulKeyUser',
    originChain: 'polygon',
    vaultId: 'vault-galaxy',
    proof: { commitment: 'polygon-proof-root' },
    publicSignals: {
      signalHash: createSignalHash('0xPolygonSoulKeyUser', 'polygon', 'vault-galaxy'),
      targetChain: 'arbitrum',
      nullifier: '2',
      vaultId: 'vault-galaxy'
    },
    transport: 'ccip'
  },
  {
    label: 'solana-to-base',
    user: 'So1anaSoulKeyUser1111111111111111111111111',
    originChain: 'solana',
    vaultId: 'vault-galaxy',
    proof: { commitment: 'solana-proof-root' },
    publicSignals: {
      signalHash: createSignalHash('So1anaSoulKeyUser1111111111111111111111111', 'solana', 'vault-galaxy'),
      targetChain: 'base',
      nullifier: '3',
      vaultId: 'vault-galaxy'
    },
    transport: 'wormhole'
  }
];

module.exports = {
  proofFixtures,
  createSignalHash
};
