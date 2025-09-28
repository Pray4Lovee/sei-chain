// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import {IZkMultiFactorProofVerifier} from "./interfaces/IZkMultiFactorProofVerifier.sol";

/// @title ZkMultiFactorProofVerifier
/// @notice Reference verifier used for testing and local deployments.
/// @dev The contract allows the owner to approve expected proof/public input combinations.
contract ZkMultiFactorProofVerifier is IZkMultiFactorProofVerifier, Ownable {
    mapping(bytes32 => bool) private _approvedProofs;

    event ProofConfigured(bytes32 indexed key, bool isValid);

    constructor() Ownable(msg.sender) {}

    /// @notice Registers whether a proof and public input pair should be considered valid.
    function configureProof(bytes calldata proof, bytes calldata publicInputs, bool isValid) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(proof, publicInputs));
        _approvedProofs[key] = isValid;
        emit ProofConfigured(key, isValid);
    }

    /// @inheritdoc IZkMultiFactorProofVerifier
    function verify(bytes calldata proof, bytes calldata publicInputs) external view override returns (bool) {
        return _approvedProofs[keccak256(abi.encodePacked(proof, publicInputs))];
    }
}
