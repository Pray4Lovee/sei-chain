// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkProofVerifier} from "./interfaces/IZkProofVerifier.sol";
import {IMessageTransmitter} from "./interfaces/IMessageTransmitter.sol";

/// @title CrossChainSoulKeyGate
/// @notice Extends SoulKey gating with CCIP/CCTP attested cross-chain access.
contract CrossChainSoulKeyGate {
    address public owner;
    IMessageTransmitter public messageTransmitter;
    IZkProofVerifier public verifier;

    mapping(address => bool) public hasAccess;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MessageTransmitterUpdated(address indexed newTransmitter);
    event VerifierUpdated(address indexed newVerifier);
    event AccessGranted(address indexed user);
    event AccessDenied(address indexed user);

    error NotAuthorized();
    error InvalidOwner();
    error InvalidTransmitter();
    error InvalidVerifier();
    error InvalidAttestation();
    error InvalidProof();
    error InvalidRecipient();

    constructor(address transmitter_, address verifier_) {
        if (transmitter_ == address(0)) {
            revert InvalidTransmitter();
        }
        if (verifier_ == address(0)) {
            revert InvalidVerifier();
        }
        owner = msg.sender;
        messageTransmitter = IMessageTransmitter(transmitter_);
        verifier = IZkProofVerifier(verifier_);

        emit OwnershipTransferred(address(0), msg.sender);
        emit MessageTransmitterUpdated(transmitter_);
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

    /// @notice Updates the CCIP/CCTP message transmitter used for attestations.
    function setMessageTransmitter(address transmitter_) external onlyOwner {
        if (transmitter_ == address(0)) {
            revert InvalidTransmitter();
        }
        messageTransmitter = IMessageTransmitter(transmitter_);
        emit MessageTransmitterUpdated(transmitter_);
    }

    /// @notice Updates the zk proof verifier contract.
    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) {
            revert InvalidVerifier();
        }
        verifier = IZkProofVerifier(verifier_);
        emit VerifierUpdated(verifier_);
    }

    /// @notice Grants access based on a cross-chain attested message.
    /// @dev The message is expected to be encoded as
    /// abi.encode(user, a, b, c, publicSignals).
    function grantAccessFromCrossChain(bytes calldata message, bytes calldata attestation) external {
        bool attested = messageTransmitter.receiveMessage(message, attestation);
        if (!attested) {
            revert InvalidAttestation();
        }

        (
            address user,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c,
            uint256[] memory publicSignals
        ) = abi.decode(message, (address, uint256[2], uint256[2][2], uint256[2], uint256[]));

        if (user == address(0)) {
            revert InvalidRecipient();
        }

        bool validProof = verifier.verifyProof(a, b, c, publicSignals);
        if (!validProof) {
            revert InvalidProof();
        }

        hasAccess[user] = true;
        emit AccessGranted(user);
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
