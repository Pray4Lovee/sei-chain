// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkMultiFactorProofVerifier} from "./interfaces/IZkMultiFactorProofVerifier.sol";

/// @title CrossChainSoulKeyGate
/// @notice Extends SoulKey access control to support cross-chain proofs using CCIP/CCTP-style attestations.
contract CrossChainSoulKeyGate {
    /// @notice Interface used to validate cross-chain message attestations.
    interface IMessageTransmitter {
        function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
    }

    /// @notice Struct describing the zk proof parameters relayed from a remote chain.
    struct MultiFactorProofPayload {
        address account;
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[] publicSignals;
    }

    address public owner;
    address public messageTransmitter;
    IZkMultiFactorProofVerifier public verifier;

    mapping(address => bool) public hasAccess;

    event AccessGranted(address indexed user, bytes32 proofHash, bytes32 attestationHash);
    event AccessRevoked(address indexed user);
    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);
    event VerifierUpdated(address indexed previousVerifier, address indexed newVerifier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error InvalidAddress();
    error InvalidAttestation();
    error InvalidProof();
    error SenderMismatch(address expected, address actual);
    error NotOwner();

    constructor(address transmitter, address verifier_) {
        if (transmitter == address(0) || verifier_ == address(0)) {
            revert InvalidAddress();
        }
        owner = msg.sender;
        messageTransmitter = transmitter;
        verifier = IZkMultiFactorProofVerifier(verifier_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    /// @notice Transfers contract ownership to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Updates the contract responsible for validating cross-chain attestations.
    function setMessageTransmitter(address newTransmitter) external onlyOwner {
        if (newTransmitter == address(0)) {
            revert InvalidAddress();
        }
        emit MessageTransmitterUpdated(messageTransmitter, newTransmitter);
        messageTransmitter = newTransmitter;
    }

    /// @notice Updates the zkSNARK verifier used after the cross-chain attestation is validated.
    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) {
            revert InvalidAddress();
        }
        emit VerifierUpdated(address(verifier), newVerifier);
        verifier = IZkMultiFactorProofVerifier(newVerifier);
    }

    /// @notice Validates a cross-chain attestation and grants vault access when the zk proof is valid.
    /// @dev The cross-chain message is expected to be ABI encoded using MultiFactorProofPayload.
    function grantAccessFromCrossChain(bytes calldata message, bytes calldata attestation) external {
        bool validAttestation = IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation);
        if (!validAttestation) {
            revert InvalidAttestation();
        }

        MultiFactorProofPayload memory payload = abi.decode(message, (MultiFactorProofPayload));

        if (payload.account != msg.sender) {
            revert SenderMismatch(payload.account, msg.sender);
        }

        bool proofValid = verifier.verifyProof(payload.a, payload.b, payload.c, payload.publicSignals);
        if (!proofValid) {
            revert InvalidProof();
        }

        bytes32 proofHash = keccak256(abi.encodePacked(payload.a, payload.b, payload.c, payload.publicSignals));
        bytes32 attestationHash = keccak256(attestation);

        hasAccess[payload.account] = true;
        emit AccessGranted(payload.account, proofHash, attestationHash);
    }

    /// @notice Revokes access for a user that was previously authorised.
    function denyAccess(address user) external onlyOwner {
        if (user == address(0)) {
            revert InvalidAddress();
        }
        hasAccess[user] = false;
        emit AccessRevoked(user);
    }

    /// @notice Returns whether the caller currently has cross-chain authorised access.
    function accessVault() external view returns (bool) {
        return hasAccess[msg.sender];
    }
}
