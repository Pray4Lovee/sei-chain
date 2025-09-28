// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CrossChainSoulKeyGate
/// @notice Validates zero-knowledge proofs that arrive from external chains and
///         persists vault access eligibility for a given account.
interface IZkMultiFactorProofVerifier {
    function verify(bytes calldata proof, bytes calldata publicSignals) external view returns (bool);
}

contract CrossChainSoulKeyGate {
    IZkMultiFactorProofVerifier public immutable verifier;
    address public immutable messageTransmitter;

    mapping(address => bool) private _vaultAccess;
    mapping(address => mapping(bytes32 => bool)) private _chainAccess;
    mapping(address => bytes32[]) private _chainHistory;

    event CrossChainAccessGranted(
        address indexed account,
        bytes32 indexed sourceChain,
        bytes32 proofHash
    );

    constructor(address verifierAddress, address transmitter) {
        require(verifierAddress != address(0), "Verifier required");
        require(transmitter != address(0), "Transmitter required");

        verifier = IZkMultiFactorProofVerifier(verifierAddress);
        messageTransmitter = transmitter;
    }

    function grantAccessFromCrossChain(
        address account,
        bytes32 sourceChain,
        bytes calldata proof,
        bytes calldata publicSignals
    ) external {
        require(msg.sender == messageTransmitter, "Unauthorized message transmitter");
        require(verifier.verify(proof, publicSignals), "Invalid zk proof");

        _vaultAccess[account] = true;
        if (!_chainAccess[account][sourceChain]) {
            _chainAccess[account][sourceChain] = true;
            _chainHistory[account].push(sourceChain);
        }

        emit CrossChainAccessGranted(account, sourceChain, keccak256(abi.encodePacked(proof, publicSignals)));
    }

    function hasVaultAccess(address account) external view returns (bool) {
        return _vaultAccess[account];
    }

    function hasChainAccess(address account, bytes32 sourceChain) external view returns (bool) {
        return _chainAccess[account][sourceChain];
    }

    function getAccessChains(address account) external view returns (bytes32[] memory) {
        return _chainHistory[account];
    }
}
