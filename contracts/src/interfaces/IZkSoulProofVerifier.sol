// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Groth16 verifier interface used by SoulKeyNFT.
interface IZkSoulProofVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}
