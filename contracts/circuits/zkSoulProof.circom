pragma circom 2.1.0;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

// zkSoulProof circuit
// Proves ownership of at least MIN_SIGILS SoulSigils with one originating from the Sei chain.
// Each SoulSigil leaf is Poseidon(tokenId, chainId, timestamp, userAddress).
// Public inputs: merkle root, nullifier hash, external signal hash.
// Private inputs: user specific metadata and Merkle proofs.

template PoseidonMerkleProof(depth) {
    signal input root;
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal acc;
    acc <== leaf;

    component bitCheckers[depth];
    component hashers[depth];

    for (var i = 0; i < depth; i++) {
        bitCheckers[i] = IsBoolean();
        bitCheckers[i].in <== pathIndices[i];

        signal left;
        signal right;

        left <== pathElements[i] * pathIndices[i] + acc * (1 - pathIndices[i]);
        right <== pathElements[i] * (1 - pathIndices[i]) + acc * pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left;
        hashers[i].inputs[1] <== right;
        acc <== hashers[i].out;
    }

    acc === root;
}

template zkSoulProof(
    var DEPTH,
    var MIN_SIGILS,
    var CHAIN_MATCH_TARGET
) {
    signal input root;
    signal input nullifierHash;
    signal input signalHash;

    signal private input userAddress;
    signal private input moodHash; // optional Holo verification pre-image (0 if unused)

    signal private input tokenIds[MIN_SIGILS];
    signal private input timestamps[MIN_SIGILS];
    signal private input chainIds[MIN_SIGILS];
    signal private input sigilHashes[MIN_SIGILS];
    signal private input pathElements[MIN_SIGILS][DEPTH];
    signal private input pathIndices[MIN_SIGILS][DEPTH];

    // Reconstruct each sigil hash from metadata and enforce Merkle inclusion.
    component sigilHashers[MIN_SIGILS];
    component inclusionProofs[MIN_SIGILS];

    for (var i = 0; i < MIN_SIGILS; i++) {
        sigilHashers[i] = Poseidon(4);
        sigilHashers[i].inputs[0] <== tokenIds[i];
        sigilHashers[i].inputs[1] <== chainIds[i];
        sigilHashers[i].inputs[2] <== timestamps[i];
        sigilHashers[i].inputs[3] <== userAddress;

        sigilHashers[i].out === sigilHashes[i];

        inclusionProofs[i] = PoseidonMerkleProof(DEPTH);
        inclusionProofs[i].root <== root;
        inclusionProofs[i].leaf <== sigilHashes[i];
        inclusionProofs[i].pathElements <== pathElements[i];
        inclusionProofs[i].pathIndices <== pathIndices[i];
    }

    // Nullifier ensures the proof can only be used once: Poseidon(userAddress).
    component nullifierPoseidon = Poseidon(1);
    nullifierPoseidon.inputs[0] <== userAddress;
    nullifierPoseidon.out === nullifierHash;

    // Optional external signal hash binding for mood/Holo verification.
    component signalPoseidon = Poseidon(2);
    signalPoseidon.inputs[0] <== userAddress;
    signalPoseidon.inputs[1] <== moodHash;
    signalPoseidon.out === signalHash;

    // Count how many sigils come from the target chain (Sei = 1 by default).
    signal chainMatchCount;
    chainMatchCount <== 0;

    component chainMatchers[MIN_SIGILS];
    for (var j = 0; j < MIN_SIGILS; j++) {
        chainMatchers[j] = IsEqual();
        chainMatchers[j].in[0] <== chainIds[j];
        chainMatchers[j].in[1] <== CHAIN_MATCH_TARGET;
        chainMatchCount <== chainMatchCount + chainMatchers[j].out;
    }

    component zeroCheck = IsZero();
    zeroCheck.in <== chainMatchCount;
    zeroCheck.out === 0; // At least one chain ID must match the target.
}

component main = zkSoulProof(20, 3, 1);
