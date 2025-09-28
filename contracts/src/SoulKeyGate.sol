// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IZkSoulProofVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory publicSignals
    ) external view returns (bool);
}

/// @title SoulKeyGate
/// @notice Access controller that validates zero-knowledge proofs demonstrating SoulSigil ownership.
/// @dev The verifier contract is expected to validate that the provided public signals are consistent with the
///      zkSNARK witness. This contract performs additional sanity checks on the decoded public signals to ensure
///      the caller identity, minimum sigil threshold and required chain alignment, while preventing proof re-use
///      through nullifier tracking.
contract SoulKeyGate {
    /// @notice Contract owner authorised to manage configuration and revocations.
    address public owner;

    /// @notice zkSNARK verifier responsible for validating submitted proofs.
    IZkSoulProofVerifier public verifier;

    /// @notice Minimum number of SoulSigils required for access.
    uint256 public minimumSoulSigils;

    /// @notice Chain identifier that at least one SoulSigil must originate from.
    uint256 public requiredChainId;

    /// @notice Tracks whether an account has successfully proven access.
    mapping(address => bool) public hasAccess;

    /// @notice Records nullifiers that have already been consumed to prevent double claims.
    mapping(bytes32 => bool) private _consumedNullifiers;

    event AccessGranted(address indexed user, bytes32 indexed nullifier);
    event AccessDenied(address indexed user);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event VerifierUpdated(address indexed newVerifier);
    event RequirementsUpdated(uint256 minimumSoulSigils, uint256 requiredChainId);

    error NotAuthorised();
    error InvalidProof();
    error NullifierAlreadyUsed();
    error InvalidPublicSignals();

    /// @param verifier_ Address of the deployed zkSNARK verifier contract.
    /// @param minimumSoulSigils_ Minimum number of SoulSigils required to unlock access.
    /// @param requiredChainId_ Identifier of the chain from which at least one SoulSigil must originate.
    constructor(address verifier_, uint256 minimumSoulSigils_, uint256 requiredChainId_) {
        require(verifier_ != address(0), "invalid verifier");
        owner = msg.sender;
        verifier = IZkSoulProofVerifier(verifier_);
        minimumSoulSigils = minimumSoulSigils_;
        requiredChainId = requiredChainId_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit VerifierUpdated(verifier_);
        emit RequirementsUpdated(minimumSoulSigils_, requiredChainId_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorised();
        _;
    }

    /// @notice Updates the verifier contract address.
    function setVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "invalid verifier");
        verifier = IZkSoulProofVerifier(newVerifier);
        emit VerifierUpdated(newVerifier);
    }

    /// @notice Updates the minimum SoulSigil and chain requirements enforced on proofs.
    function setRequirements(uint256 newMinimumSoulSigils, uint256 newRequiredChainId) external onlyOwner {
        minimumSoulSigils = newMinimumSoulSigils;
        requiredChainId = newRequiredChainId;
        emit RequirementsUpdated(newMinimumSoulSigils, newRequiredChainId);
    }

    /// @notice Transfers contract ownership to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Returns whether a nullifier hash has already been consumed.
    function hasConsumedNullifier(bytes32 nullifier) external view returns (bool) {
        return _consumedNullifiers[nullifier];
    }

    /// @notice Submits a zkSNARK proof asserting SoulSigil requirements and grants access if valid.
    /// @dev Expected public signal layout:
    ///      [0] -> address of the prover (lower 160 bits).
    ///      [1] -> number of SoulSigils proven in the witness.
    ///      [2] -> chain identifier that one of the SoulSigils originates from.
    ///      [3] -> unique nullifier hash preventing proof re-use.
    function grantAccess(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata publicSignals
    ) external {
        if (publicSignals.length < 4) revert InvalidPublicSignals();

        if (!verifier.verifyProof(a, b, c, publicSignals)) {
            revert InvalidProof();
        }

        address prover = address(uint160(publicSignals[0]));
        uint256 sigilCount = publicSignals[1];
        uint256 chainIdClaim = publicSignals[2];
        bytes32 nullifier = bytes32(publicSignals[3]);

        if (prover != msg.sender) revert InvalidPublicSignals();
        if (sigilCount < minimumSoulSigils) revert InvalidPublicSignals();
        if (chainIdClaim != requiredChainId) revert InvalidPublicSignals();

        if (_consumedNullifiers[nullifier]) revert NullifierAlreadyUsed();
        _consumedNullifiers[nullifier] = true;

        hasAccess[msg.sender] = true;
        emit AccessGranted(msg.sender, nullifier);
    }

    /// @notice Revokes a user's access. Callable only by the owner.
    function denyAccess(address user) external onlyOwner {
        hasAccess[user] = false;
        emit AccessDenied(user);
    }

    /// @notice Returns whether the caller currently has access to the gated vault.
    function accessVault() external view returns (bool) {
        return hasAccess[msg.sender];
    }
}
