// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkProofVerifier} from "./interfaces/IZkProofVerifier.sol";

/// @title SoulKeyGate
/// @notice Vault access controller that requires a multi-factor zkSNARK proof.
contract SoulKeyGate {
    address public owner;
    IZkProofVerifier public verifier;

    mapping(address => bool) public hasAccess;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event VerifierUpdated(address indexed newVerifier);
    event AccessGranted(address indexed user);
    event AccessDenied(address indexed user);

    error NotAuthorized();
    error InvalidOwner();
    error InvalidVerifier();
    error InvalidProof();

    constructor(address verifier_) {
        if (verifier_ == address(0)) {
            revert InvalidVerifier();
        }
        owner = msg.sender;
        verifier = IZkProofVerifier(verifier_);
        emit OwnershipTransferred(address(0), msg.sender);
        emit VerifierUpdated(verifier_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotAuthorized();
        }
        _;
    }

    /// @notice Transfers control of the gate to a new owner.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidOwner();
        }
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Updates the zk proof verifier contract.
    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) {
            revert InvalidVerifier();
        }
        verifier = IZkProofVerifier(newVerifier);
        emit VerifierUpdated(newVerifier);
    }

    /// @notice Grants access to the caller if a valid multi-factor zk proof is provided.
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

        hasAccess[msg.sender] = true;
        emit AccessGranted(msg.sender);
    }

    /// @notice Revokes vault access from a user.
    function denyAccess(address user) external onlyOwner {
        hasAccess[user] = false;
        emit AccessDenied(user);
    }

    /// @notice Returns whether the caller currently has access to the vault.
    function accessVault() external view returns (bool) {
        return hasAccess[msg.sender];
    }
}
