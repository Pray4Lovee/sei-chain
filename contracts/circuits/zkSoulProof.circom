include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify/iszero.circom";

// Groth16-compatible circuit that proves ownership of at least MIN_SIGILS
// SoulSigils belonging to the prover, where each sigil leaf in the off-chain
// Merkle tree is the Poseidon hash of (tokenId, chainId, timestamp, userAddress).
//
// The circuit enforces the following statements:
// 1. Every provided leaf exists in the supplied Merkle root.
// 2. All leaves share the same `userAddress` witness.
// 3. The public `nullifierHash` matches Poseidon(userAddress, nullifierSecret).
// 4. The public `signalHash` matches Poseidon(userAddress, signalSecret).
// 5. At least one of the claimed leaves was minted on the Sei chain
//    (chainId == SEI_CHAIN_ID).
//
// By keeping the sigil metadata and Merkle paths private, the prover can attest
// that they meet the minimum threshold without revealing which specific sigils
// they hold or when they were minted.

const TREE_DEPTH = 20;
const MIN_SIGILS = 3;
const SEI_CHAIN_ID = 1;

// Simple binary Merkle inclusion proof using Poseidon hashing.
template MerkleProof(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal hash[depth + 1];
    hash[0] <== leaf;

    component hashers[depth];
    signal left[depth];
    signal right[depth];

    for (var i = 0; i < depth; i++) {
        // Constrain path indices to be binary.
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        left[i] <== (1 - pathIndices[i]) * hash[i] + pathIndices[i] * pathElements[i];
        right[i] <== pathIndices[i] * hash[i] + (1 - pathIndices[i]) * pathElements[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hash[i + 1] <== hashers[i].out;
    }

    root === hash[depth];
}

template ZkSoulProof() {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input signalHash;

    // Private witnesses
    signal private input userAddress;
    signal private input nullifierSecret;
    signal private input signalSecret;

    signal private input tokenIds[MIN_SIGILS];
    signal private input chainIds[MIN_SIGILS];
    signal private input timestamps[MIN_SIGILS];
    signal private input pathElements[MIN_SIGILS][TREE_DEPTH];
    signal private input pathIndices[MIN_SIGILS][TREE_DEPTH];

    component nullifierPoseidon = Poseidon(2);
    nullifierPoseidon.inputs[0] <== userAddress;
    nullifierPoseidon.inputs[1] <== nullifierSecret;
    nullifierHash === nullifierPoseidon.out;

    component signalPoseidon = Poseidon(2);
    signalPoseidon.inputs[0] <== userAddress;
    signalPoseidon.inputs[1] <== signalSecret;
    signalHash === signalPoseidon.out;

    component seiCheck[MIN_SIGILS];
    signal isSei[MIN_SIGILS];
    signal notSeiProduct[MIN_SIGILS + 1];
    notSeiProduct[0] <== 1;

    for (var i = 0; i < MIN_SIGILS; i++) {
        component leafPoseidon = Poseidon(4);
        leafPoseidon.inputs[0] <== tokenIds[i];
        leafPoseidon.inputs[1] <== chainIds[i];
        leafPoseidon.inputs[2] <== timestamps[i];
        leafPoseidon.inputs[3] <== userAddress;

        component proof = MerkleProof(TREE_DEPTH);
        proof.leaf <== leafPoseidon.out;
        proof.root <== root;

        for (var j = 0; j < TREE_DEPTH; j++) {
            proof.pathElements[j] <== pathElements[i][j];
            proof.pathIndices[j] <== pathIndices[i][j];
        }

        seiCheck[i] = IsZero();
        seiCheck[i].in <== chainIds[i] - SEI_CHAIN_ID;
        isSei[i] <== seiCheck[i].out;
        // Ensure the flag is boolean.
        isSei[i] * (isSei[i] - 1) === 0;

        notSeiProduct[i + 1] <== notSeiProduct[i] * (1 - isSei[i]);
    }

    // At least one sigil must have chainId equal to SEI_CHAIN_ID.
    notSeiProduct[MIN_SIGILS] === 0;
}

component main = ZkSoulProof();
