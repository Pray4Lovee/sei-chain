// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IZkProofVerifier
/// @notice Minimal interface for verifying Groth16-style zero-knowledge proofs.
interface IZkProofVerifier {
    /// @notice Validates a zkSNARK proof against the provided public signals.
    /// @param a Groth16 proof parameter.
    /// @param b Groth16 proof parameter.
    /// @param c Groth16 proof parameter.
    /// @param publicSignals Public inputs associated with the proof.
    /// @return True if the proof is valid for the supplied public signals.
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}
