// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IZkMultiFactorProofVerifier
/// @notice Minimal interface for zkSNARK proof verifiers that validate multi-factor SoulKey proofs.
interface IZkMultiFactorProofVerifier {
    /// @notice Validates a zk proof against the provided public inputs.
    /// @dev Implementations should revert or return false when the proof is invalid.
    /// @param proof Encoded zk proof bytes produced off-chain.
    /// @param publicInputs Encoded public inputs (merkle roots, nullifiers, etc.).
    /// @return isValid Whether the proof verification succeeded.
    function verify(bytes calldata proof, bytes calldata publicInputs) external view returns (bool isValid);
}
