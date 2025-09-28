// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IZkMultiFactorProofVerifier} from "./interfaces/IZkMultiFactorProofVerifier.sol";
import {IMessageTransmitter} from "./interfaces/IMessageTransmitter.sol";

/// @title CrossChainSoulKeyGate
/// @notice Validates zkMultiFactor proofs to grant access to sovereign vaults across chains.
/// @dev The contract relies on an external zk verifier and a messaging endpoint such as Chainlink CCIP.
contract CrossChainSoulKeyGate is Ownable, ReentrancyGuard {
    /// @notice Enum describing the source of the access grant.
    enum AccessSource {
        Local,
        CrossChain
    }

    /// @notice Payload forwarded by the cross-chain messaging endpoint.
    struct CrossChainProofPayload {
        address account;
        bytes32 nullifier;
        bytes proof;
        bytes publicInputs;
    }

    /// @notice Emitted when a new verifier contract is configured.
    event VerifierUpdated(address indexed previousVerifier, address indexed newVerifier);

    /// @notice Emitted when the message transmitter endpoint is updated.
    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);

    /// @notice Emitted when a SoulKey holder gains vault access.
    event AccessGranted(address indexed account, bytes32 indexed nullifier, AccessSource source);

    /// @notice Emitted when vault access is revoked by the owner.
    event AccessRevoked(address indexed account);

    error InvalidProof();
    error NullifierAlreadyUsed();
    error ZeroAddressNotAllowed();
    error MessageRejected();

    IZkMultiFactorProofVerifier public verifier;
    address public messageTransmitter;

    mapping(bytes32 => bool) private _usedNullifiers;
    mapping(address => bool) private _accessRegistry;

    constructor(address verifier_, address messageTransmitter_) Ownable(msg.sender) {
        if (verifier_ == address(0) || messageTransmitter_ == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        verifier = IZkMultiFactorProofVerifier(verifier_);
        messageTransmitter = messageTransmitter_;
    }

    /// @notice Returns whether a nullifier has been consumed.
    function hasConsumedNullifier(bytes32 nullifier) external view returns (bool) {
        return _usedNullifiers[nullifier];
    }

    /// @notice Returns whether an account currently has vault access.
    function hasVaultAccess(address account) external view returns (bool) {
        return _accessRegistry[account];
    }

    /// @notice Updates the verifier contract. Only callable by the owner.
    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        address previous = address(verifier);
        verifier = IZkMultiFactorProofVerifier(newVerifier);
        emit VerifierUpdated(previous, newVerifier);
    }

    /// @notice Updates the message transmitter endpoint. Only callable by the owner.
    function setMessageTransmitter(address newTransmitter) external onlyOwner {
        if (newTransmitter == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        address previous = messageTransmitter;
        messageTransmitter = newTransmitter;
        emit MessageTransmitterUpdated(previous, newTransmitter);
    }

    /// @notice Grants access locally by verifying a zk proof on this chain.
    function grantAccess(
        address account,
        bytes32 nullifier,
        bytes calldata proof,
        bytes calldata publicInputs
    ) external nonReentrant {
        _grantAccess(account, nullifier, proof, publicInputs, AccessSource.Local);
    }

    /// @notice Grants access using a message delivered from another chain via CCIP or equivalent.
    function grantAccessFromCrossChain(bytes calldata message, bytes calldata attestation) external nonReentrant {
        if (messageTransmitter == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        bool accepted = IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation);
        if (!accepted) {
            revert MessageRejected();
        }

        CrossChainProofPayload memory payload = abi.decode(message, (CrossChainProofPayload));
        _grantAccess(payload.account, payload.nullifier, payload.proof, payload.publicInputs, AccessSource.CrossChain);
    }

    /// @notice Revokes vault access for an account.
    function revokeAccess(address account) external onlyOwner {
        if (_accessRegistry[account]) {
            _accessRegistry[account] = false;
            emit AccessRevoked(account);
        }
    }

    function _grantAccess(
        address account,
        bytes32 nullifier,
        bytes calldata proof,
        bytes calldata publicInputs,
        AccessSource source
    ) private {
        if (account == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        if (_usedNullifiers[nullifier]) {
            revert NullifierAlreadyUsed();
        }

        bool isValid = verifier.verify(proof, publicInputs);
        if (!isValid) {
            revert InvalidProof();
        }

        _usedNullifiers[nullifier] = true;
        _accessRegistry[account] = true;

        emit AccessGranted(account, nullifier, source);
    }
}
