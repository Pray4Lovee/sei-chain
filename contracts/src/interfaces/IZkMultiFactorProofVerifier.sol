// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IZkMultiFactorProofVerifier
/// @notice Interface for zkSNARK verifiers that validate combined SoulSigil and Holo proofs.
interface IZkMultiFactorProofVerifier {
    /// @notice Validates a zkSNARK proof with arbitrary public signals.
    /// @param a Groth16 proof parameter.
    /// @param b Groth16 proof parameter.
    /// @param c Groth16 proof parameter.
    /// @param publicSignals Public inputs that bind the proof to specific data.
    /// @return True when the proof is valid for the provided public signals.
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}
