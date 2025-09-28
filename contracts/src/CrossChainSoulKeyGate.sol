// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal interface for Circle's CCIP message transmitter contracts.
interface IMessageTransmitter {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
}

/// @notice Processor interface implemented by the on-chain access gate.
interface ICrossChainMessageProcessor {
    function processMessage(address bridge, bytes calldata message, bytes calldata attestation) external returns (bool);
}

/// @notice Interface consumed by the Wormhole relayer to forward Solana proofs.
interface ISolanaProofConsumer {
    function receiveSolanaProof(address account, bytes32 proofHash, uint256 amount, bytes calldata metadata) external returns (bool);
}

/// @title BasicMessageTransmitter
/// @notice Lightweight CCIP-style transmitter that forwards payloads to a configurable processor.
contract BasicMessageTransmitter is IMessageTransmitter, Ownable {
    address public processor;

    event ProcessorUpdated(address indexed previousProcessor, address indexed newProcessor);
    event MessageRelayed(address indexed bridge, bytes message, bytes attestation);

    constructor(address processor_) Ownable(msg.sender) {
        _updateProcessor(processor_);
    }

    function setProcessor(address newProcessor) external onlyOwner {
        _updateProcessor(newProcessor);
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external override returns (bool) {
        address currentProcessor = processor;
        require(currentProcessor != address(0), "BasicMessageTransmitter: processor not set");

        emit MessageRelayed(msg.sender, message, attestation);
        return ICrossChainMessageProcessor(currentProcessor).processMessage(msg.sender, message, attestation);
    }

    function _updateProcessor(address newProcessor) private {
        require(newProcessor != address(0), "BasicMessageTransmitter: zero processor");
        address previous = processor;
        processor = newProcessor;
        emit ProcessorUpdated(previous, newProcessor);
    }
}

/// @title CrossChainSoulKeyGate
/// @notice Central contract that tracks cross-chain access grants derived from zkSoulProof messages.
contract CrossChainSoulKeyGate is ICrossChainMessageProcessor, ISolanaProofConsumer, Ownable {
    enum SourceChain {
        Unknown,
        Sei,
        Polygon,
        Solana
    }

    struct AccessGrant {
        bool valid;
        bytes32 proofHash;
        SourceChain source;
        uint256 amount;
        uint64 timestamp;
        bytes32 attestationHash;
    }

    address public messageTransmitter;
    address public solanaRelayer;

    mapping(address => SourceChain) public registeredBridges;
    mapping(address => AccessGrant) private _grants;

    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);
    event BridgeRegistered(address indexed bridge, SourceChain indexed source);
    event BridgeUnregistered(address indexed bridge);
    event SolanaRelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event AccessGranted(
        address indexed account,
        bytes32 indexed proofHash,
        SourceChain indexed source,
        uint256 amount,
        bytes attestation
    );
    event AccessRevoked(address indexed account);

    constructor(address transmitter, address solanaRelayer_) Ownable(msg.sender) {
        if (transmitter != address(0)) {
            messageTransmitter = transmitter;
        }
        if (solanaRelayer_ != address(0)) {
            solanaRelayer = solanaRelayer_;
        }
    }

    modifier onlyTransmitter() {
        require(msg.sender == messageTransmitter, "CrossChainSoulKeyGate: invalid transmitter");
        _;
    }

    modifier onlySolanaRelayer() {
        require(msg.sender == solanaRelayer, "CrossChainSoulKeyGate: invalid solana relayer");
        _;
    }

    function setMessageTransmitter(address transmitter) external onlyOwner {
        require(transmitter != address(0), "CrossChainSoulKeyGate: zero transmitter");
        address previous = messageTransmitter;
        messageTransmitter = transmitter;
        emit MessageTransmitterUpdated(previous, transmitter);
    }

    function setSolanaRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "CrossChainSoulKeyGate: zero relayer");
        address previous = solanaRelayer;
        solanaRelayer = newRelayer;
        emit SolanaRelayerUpdated(previous, newRelayer);
    }

    function registerBridge(address bridge, SourceChain source) external onlyOwner {
        require(bridge != address(0), "CrossChainSoulKeyGate: zero bridge");
        require(source != SourceChain.Unknown, "CrossChainSoulKeyGate: invalid source");
        registeredBridges[bridge] = source;
        emit BridgeRegistered(bridge, source);
    }

    function unregisterBridge(address bridge) external onlyOwner {
        require(registeredBridges[bridge] != SourceChain.Unknown, "CrossChainSoulKeyGate: bridge not registered");
        delete registeredBridges[bridge];
        emit BridgeUnregistered(bridge);
    }

    function processMessage(
        address bridge,
        bytes calldata message,
        bytes calldata attestation
    ) external override onlyTransmitter returns (bool) {
        SourceChain source = registeredBridges[bridge];
        require(source != SourceChain.Unknown, "CrossChainSoulKeyGate: unregistered bridge");
        (address account, bytes32 proofHash, uint256 amount) = abi.decode(message, (address, bytes32, uint256));
        _grantAccess(account, proofHash, source, amount, attestation);
        return true;
    }

    function receiveSolanaProof(
        address account,
        bytes32 proofHash,
        uint256 amount,
        bytes calldata metadata
    ) external override onlySolanaRelayer returns (bool) {
        _grantAccess(account, proofHash, SourceChain.Solana, amount, metadata);
        return true;
    }

    function hasAccess(address account) external view returns (bool) {
        return _grants[account].valid;
    }

    function getAccessGrant(address account)
        external
        view
        returns (bool isValid, bytes32 proofHash, SourceChain source, uint256 amount, uint64 timestamp, bytes32 attestationHash)
    {
        AccessGrant memory grant = _grants[account];
        return (grant.valid, grant.proofHash, grant.source, grant.amount, grant.timestamp, grant.attestationHash);
    }

    function revokeAccess(address account) external onlyOwner {
        require(_grants[account].valid, "CrossChainSoulKeyGate: no grant");
        delete _grants[account];
        emit AccessRevoked(account);
    }

    function _grantAccess(
        address account,
        bytes32 proofHash,
        SourceChain source,
        uint256 amount,
        bytes memory attestation
    ) private {
        require(account != address(0), "CrossChainSoulKeyGate: zero account");
        AccessGrant storage grant = _grants[account];
        grant.valid = true;
        grant.proofHash = proofHash;
        grant.source = source;
        grant.amount = amount;
        grant.timestamp = uint64(block.timestamp);
        grant.attestationHash = keccak256(attestation);

        emit AccessGranted(account, proofHash, source, amount, attestation);
    }
}

/// @title SeiToEvmBridge
/// @notice Forwards Sei zkSoulProof attestations through a CCIP transmitter into the EVM gate.
contract SeiToEvmBridge is Ownable {
    address public messageTransmitter;

    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);
    event SeiProofForwarded(
        address indexed sender,
        address indexed account,
        uint256 amount,
        bytes32 proofHash,
        bytes attestation
    );

    constructor(address transmitter) Ownable(msg.sender) {
        _updateTransmitter(transmitter);
    }

    function setMessageTransmitter(address transmitter) external onlyOwner {
        _updateTransmitter(transmitter);
    }

    function transferToEVM(address account, uint256 amount, bytes32 proofHash) external returns (bool) {
        require(account != address(0), "SeiToEvmBridge: zero account");
        bytes memory message = abi.encode(account, proofHash, amount);
        bytes memory attestation = _generateAttestation(message);
        bool accepted = IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation);
        require(accepted, "SeiToEvmBridge: message rejected");
        emit SeiProofForwarded(msg.sender, account, amount, proofHash, attestation);
        return accepted;
    }

    function _generateAttestation(bytes memory message) internal view returns (bytes memory) {
        return abi.encodePacked(keccak256(abi.encodePacked(message, block.chainid, address(this))));
    }

    function _updateTransmitter(address transmitter) private {
        require(transmitter != address(0), "SeiToEvmBridge: zero transmitter");
        address previous = messageTransmitter;
        messageTransmitter = transmitter;
        emit MessageTransmitterUpdated(previous, transmitter);
    }
}

/// @title PolygonSoulKeyGate
/// @notice Accepts Polygon proofs and relays them through the CCIP transmitter.
contract PolygonSoulKeyGate is Ownable {
    address public messageTransmitter;

    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);
    event PolygonProofForwarded(
        address indexed sender,
        address indexed account,
        uint256 amount,
        bytes32 proofHash,
        bytes attestation
    );

    constructor(address transmitter) Ownable(msg.sender) {
        _updateTransmitter(transmitter);
    }

    function setMessageTransmitter(address transmitter) external onlyOwner {
        _updateTransmitter(transmitter);
    }

    function grantAccessFromPolygon(
        address account,
        uint256 amount,
        bytes32 proofHash,
        bytes calldata extraMetadata
    ) external returns (bool) {
        require(account != address(0), "PolygonSoulKeyGate: zero account");
        bytes memory message = abi.encode(account, proofHash, amount);
        bytes memory attestation = _formatAttestation(extraMetadata, message);
        bool accepted = IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation);
        require(accepted, "PolygonSoulKeyGate: message rejected");
        emit PolygonProofForwarded(msg.sender, account, amount, proofHash, attestation);
        return accepted;
    }

    function _formatAttestation(bytes calldata extraMetadata, bytes memory message) internal pure returns (bytes memory) {
        if (extraMetadata.length == 0) {
            return abi.encodePacked(keccak256(message));
        }
        return abi.encodePacked(extraMetadata, keccak256(message));
    }

    function _updateTransmitter(address transmitter) private {
        require(transmitter != address(0), "PolygonSoulKeyGate: zero transmitter");
        address previous = messageTransmitter;
        messageTransmitter = transmitter;
        emit MessageTransmitterUpdated(previous, transmitter);
    }
}

/// @title SolanaToEvmBridge
/// @notice Receives Wormhole messages and forwards the proof payload to the EVM access gate.
contract SolanaToEvmBridge is Ownable {
    address public wormholeRelayer;
    ISolanaProofConsumer public soulKeyGate;

    event WormholeRelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event SoulKeyGateUpdated(address indexed previousGate, address indexed newGate);
    event SolanaProofForwarded(
        address indexed relayer,
        address indexed account,
        uint256 amount,
        bytes32 proofHash,
        bytes metadata
    );

    constructor(address wormholeRelayer_, address soulKeyGate_) Ownable(msg.sender) {
        _updateWormholeRelayer(wormholeRelayer_);
        _updateSoulKeyGate(soulKeyGate_);
    }

    modifier onlyWormholeRelayer() {
        require(msg.sender == wormholeRelayer, "SolanaToEvmBridge: not wormhole relayer");
        _;
    }

    function setWormholeRelayer(address newRelayer) external onlyOwner {
        _updateWormholeRelayer(newRelayer);
    }

    function setSoulKeyGate(address newGate) external onlyOwner {
        _updateSoulKeyGate(newGate);
    }

    function receiveSolanaProof(bytes calldata proof, bytes calldata metadata) external onlyWormholeRelayer returns (bool) {
        (address account, bytes32 proofHash, uint256 amount) = abi.decode(proof, (address, bytes32, uint256));
        bool accepted = soulKeyGate.receiveSolanaProof(account, proofHash, amount, metadata);
        require(accepted, "SolanaToEvmBridge: proof rejected");
        emit SolanaProofForwarded(msg.sender, account, amount, proofHash, metadata);
        return accepted;
    }

    function _updateWormholeRelayer(address newRelayer) private {
        require(newRelayer != address(0), "SolanaToEvmBridge: zero relayer");
        address previous = wormholeRelayer;
        wormholeRelayer = newRelayer;
        emit WormholeRelayerUpdated(previous, newRelayer);
    }

    function _updateSoulKeyGate(address newGate) private {
        require(newGate != address(0), "SolanaToEvmBridge: zero gate");
        address previous = address(soulKeyGate);
        soulKeyGate = ISolanaProofConsumer(newGate);
        emit SoulKeyGateUpdated(previous, newGate);
    }
}
