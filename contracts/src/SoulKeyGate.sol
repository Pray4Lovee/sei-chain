// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkMultiFactorProofVerifier} from "./interfaces/IZkMultiFactorProofVerifier.sol";

/// @title SoulKeyGate
/// @notice Manages access to SoulKey vaults by validating multi-factor zkSNARK proofs.
/// @dev The verifier contract is expected to bundle SoulSigil and Holo proofs into a single circuit.
contract SoulKeyGate {
    /// @notice Contract owner allowed to manage configuration and revoke access.
    address public owner;

    /// @notice zkSNARK verifier that validates multi-factor proofs.
    IZkMultiFactorProofVerifier public verifier;

    /// @notice Tracks addresses that have successfully provided valid proofs.
    mapping(address => bool) public hasAccess;

    event AccessGranted(address indexed user, bytes32 proofHash);
    event AccessRevoked(address indexed user);
    event VerifierUpdated(address indexed previousVerifier, address indexed newVerifier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error InvalidProof();
    error InvalidAddress();

    constructor(address verifier_) {
        if (verifier_ == address(0)) {
            revert InvalidAddress();
        }
        owner = msg.sender;
        verifier = IZkMultiFactorProofVerifier(verifier_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    /// @notice Transfers ownership of the gate to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Updates the zkSNARK verifier used to validate incoming proofs.
    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) {
            revert InvalidAddress();
        }
        emit VerifierUpdated(address(verifier), newVerifier);
        verifier = IZkMultiFactorProofVerifier(newVerifier);
    }

    /// @notice Grants vault access to the caller after a successful zk proof validation.
    /// @param a Groth16 proof parameter.
    /// @param b Groth16 proof parameter.
    /// @param c Groth16 proof parameter.
    /// @param publicSignals Public inputs that should bind the proof to msg.sender and other factors.
    function grantAccess(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external {
        bool validProof = verifier.verifyProof(a, b, c, publicSignals);
        if (!validProof) {
            revert InvalidProof();
        }

        // Derive a lightweight audit trail using the keccak hash of the proof parameters.
        bytes32 proofHash = keccak256(abi.encodePacked(a, b, c, publicSignals));

        hasAccess[msg.sender] = true;
        emit AccessGranted(msg.sender, proofHash);
    }

    /// @notice Revokes previously granted access for a user.
    function denyAccess(address user) external onlyOwner {
        if (user == address(0)) {
            revert InvalidAddress();
        }
        hasAccess[user] = false;
        emit AccessRevoked(user);
    }

    /// @notice Returns whether the caller currently has access to the SoulKey vault.
    function accessVault() external view returns (bool) {
        return hasAccess[msg.sender];
    }
}
