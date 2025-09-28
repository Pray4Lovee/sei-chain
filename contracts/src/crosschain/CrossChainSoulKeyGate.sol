// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CrossChainSoulKeyGate
/// @notice Verifies multi-factor zk proofs and tracks access rights for cross-chain vaults.
/// @dev The contract does not perform any zkSNARK verification itself. Instead it delegates
///      verification to an external verifier contract (e.g. a Plonk or Groth16 verifier)
///      and keeps track of registered Merkle roots, consumed nullifiers and granted access.
contract CrossChainSoulKeyGate is Ownable {
    /// @notice Payload forwarded through a cross-chain message.
    struct CrossChainProofPayload {
        address account;
        bytes proof;
        uint256[] publicInputs;
        bytes32 merkleRoot;
        bytes32 nullifier;
    }

    /// @notice Minimal attestation metadata that accompanies cross-chain payloads.
    struct CrossChainAttestation {
        address account;
        bytes32 sourceChain;
    }

    /// @notice Interface for zk proof verifiers used by the gate.
    interface IZkMultiFactorProofVerifier {
        function verifyProof(bytes calldata proof, uint256[] calldata publicInputs) external view returns (bool);
    }

    /// @notice Thrown when a proof is validated against an unknown Merkle root.
    error UnknownMerkleRoot(bytes32 merkleRoot);

    /// @notice Thrown when attempting to reuse a nullifier hash that was already consumed.
    error NullifierAlreadyUsed(bytes32 nullifierHash);

    /// @notice Thrown when the zk verifier rejects a provided proof.
    error ProofVerificationFailed();

    /// @notice Thrown when a cross-chain call is performed by an unexpected transmitter.
    error InvalidMessageTransmitter(address caller);

    /// @notice Thrown when attestation metadata does not match the proof payload.
    error AttestedAccountMismatch(address attestedAccount, address payloadAccount);

    /// @notice Thrown when attempting to grant access to the zero address.
    error InvalidAccount(address account);

    event VerifierUpdated(address indexed verifier);
    event MessageTransmitterUpdated(address indexed transmitter);
    event MerkleRootStatusUpdated(bytes32 indexed merkleRoot, bool isActive);
    event NullifierConsumed(bytes32 indexed nullifierHash);
    event AccessGranted(
        address indexed account,
        bytes32 indexed nullifier,
        bytes32 indexed merkleRoot,
        bytes32 sourceChain,
        bool crossChain
    );
    event AccessRevoked(address indexed account);

    IZkMultiFactorProofVerifier public verifier;
    address public messageTransmitter;

    mapping(bytes32 => bool) public activeMerkleRoots;
    mapping(bytes32 => bool) public consumedNullifiers;
    mapping(address => bool) public hasAccess;

    constructor(address verifierAddress, address transmitter) Ownable(msg.sender) {
        require(verifierAddress != address(0), "invalid verifier");
        require(transmitter != address(0), "invalid transmitter");

        verifier = IZkMultiFactorProofVerifier(verifierAddress);
        messageTransmitter = transmitter;

        emit VerifierUpdated(verifierAddress);
        emit MessageTransmitterUpdated(transmitter);
    }

    /// @notice Registers or deregisters a Merkle root that proofs can be checked against.
    function setMerkleRootStatus(bytes32 merkleRoot, bool isActive) external onlyOwner {
        activeMerkleRoots[merkleRoot] = isActive;
        emit MerkleRootStatusUpdated(merkleRoot, isActive);
    }

    /// @notice Batch helper for toggling multiple Merkle roots at once.
    function batchSetMerkleRootStatus(bytes32[] calldata merkleRoots, bool isActive) external onlyOwner {
        for (uint256 i = 0; i < merkleRoots.length; i++) {
            activeMerkleRoots[merkleRoots[i]] = isActive;
            emit MerkleRootStatusUpdated(merkleRoots[i], isActive);
        }
    }

    /// @notice Updates the verifier contract used to validate zk proofs.
    function updateVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "invalid verifier");
        verifier = IZkMultiFactorProofVerifier(newVerifier);
        emit VerifierUpdated(newVerifier);
    }

    /// @notice Updates the trusted message transmitter for cross-chain calls.
    function updateMessageTransmitter(address newTransmitter) external onlyOwner {
        require(newTransmitter != address(0), "invalid transmitter");
        messageTransmitter = newTransmitter;
        emit MessageTransmitterUpdated(newTransmitter);
    }

    /// @notice Grants access for the supplied account using a locally submitted proof.
    /// @param proof zkSNARK proof blob produced by the frontend.
    /// @param publicInputs Public inputs used by the zk circuit (e.g. Merkle root, signal, chain id).
    /// @param merkleRoot Merkle root that must be registered on-chain.
    /// @param nullifierHash Nullifier that prevents proof re-use across chains.
    /// @param account Account that should obtain access rights after successful verification.
    function grantAccess(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        bytes32 merkleRoot,
        bytes32 nullifierHash,
        address account
    ) external {
        _processProof(account, proof, publicInputs, merkleRoot, nullifierHash, bytes32(0), false);
    }

    /// @notice Processes a cross-chain message emitted by a CCIP/CCTP transmitter.
    /// @dev The message is expected to encode a {CrossChainProofPayload} while the attestation
    ///      encodes a {CrossChainAttestation} struct. The message transmitter is typically a
    ///      Chainlink CCIP router or custom bridge contract that validates the off-chain attestation.
    function grantAccessFromCrossChain(bytes calldata message, bytes calldata attestation) external {
        if (msg.sender != messageTransmitter) {
            revert InvalidMessageTransmitter(msg.sender);
        }

        CrossChainProofPayload memory payload = abi.decode(message, (CrossChainProofPayload));
        CrossChainAttestation memory meta = abi.decode(attestation, (CrossChainAttestation));

        if (payload.account != meta.account) {
            revert AttestedAccountMismatch(meta.account, payload.account);
        }

        _processProof(payload.account, payload.proof, payload.publicInputs, payload.merkleRoot, payload.nullifier, meta.sourceChain, true);
    }

    /// @notice Revokes access for the specified account. Can only be performed by the owner.
    function revokeAccess(address account) external onlyOwner {
        if (hasAccess[account]) {
            hasAccess[account] = false;
            emit AccessRevoked(account);
        }
    }

    /// @dev Internal helper used by both local and cross-chain proof flows.
    function _processProof(
        address account,
        bytes memory proof,
        uint256[] memory publicInputs,
        bytes32 merkleRoot,
        bytes32 nullifierHash,
        bytes32 sourceChain,
        bool crossChain
    ) internal {
        if (account == address(0)) {
            revert InvalidAccount(account);
        }
        if (!activeMerkleRoots[merkleRoot]) {
            revert UnknownMerkleRoot(merkleRoot);
        }
        if (consumedNullifiers[nullifierHash]) {
            revert NullifierAlreadyUsed(nullifierHash);
        }
        if (!verifier.verifyProof(proof, publicInputs)) {
            revert ProofVerificationFailed();
        }

        consumedNullifiers[nullifierHash] = true;
        emit NullifierConsumed(nullifierHash);

        hasAccess[account] = true;
        emit AccessGranted(account, nullifierHash, merkleRoot, sourceChain, crossChain);
    }
}
