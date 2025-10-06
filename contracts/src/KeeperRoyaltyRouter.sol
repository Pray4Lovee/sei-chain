// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMessageTransmitter {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
}

interface ILumenCardVault {
    function credit(address user, uint256 amount) external;
}

/// @title KeeperRoyaltyRouter
/// @notice Verifies CCTP attestations and routes per-user royalty settlements into the LumenCardVault.
contract KeeperRoyaltyRouter {
    struct RoyaltyPayload {
        address evmRecipient;
        uint256 amount;
        string userId;
    }

    address public owner;
    address public lumenCardVault;
    address public messageTransmitter;

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event VaultUpdated(address indexed previousVault, address indexed newVault);
    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);
    event RoyaltySettled(address indexed user, uint256 amount, string userId, string sourceChain);

    error NotOwner();
    error InvalidAddress();
    error AttestationFailed();

    constructor(address vault, address transmitter) {
        if (vault == address(0) || transmitter == address(0)) {
            revert InvalidAddress();
        }
        owner = msg.sender;
        lumenCardVault = vault;
        messageTransmitter = transmitter;
        emit OwnerUpdated(address(0), msg.sender);
        emit VaultUpdated(address(0), vault);
        emit MessageTransmitterUpdated(address(0), transmitter);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    function settleRoyalty(bytes calldata message, bytes calldata attestation) external {
        if (!IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation)) {
            revert AttestationFailed();
        }

        RoyaltyPayload memory payload = _decodeRoyaltyPayload(message);
        ILumenCardVault(lumenCardVault).credit(payload.evmRecipient, payload.amount);
        emit RoyaltySettled(payload.evmRecipient, payload.amount, payload.userId, "Sei/Noble");
    }

    function updateVault(address newVault) external onlyOwner {
        if (newVault == address(0)) {
            revert InvalidAddress();
        }
        address previous = lumenCardVault;
        lumenCardVault = newVault;
        emit VaultUpdated(previous, newVault);
    }

    function updateMessageTransmitter(address newTransmitter) external onlyOwner {
        if (newTransmitter == address(0)) {
            revert InvalidAddress();
        }
        address previous = messageTransmitter;
        messageTransmitter = newTransmitter;
        emit MessageTransmitterUpdated(previous, newTransmitter);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidAddress();
        }
        address previous = owner;
        owner = newOwner;
        emit OwnerUpdated(previous, newOwner);
    }

    function renounceOwnership() external onlyOwner {
        owner = address(0);
        emit OwnerUpdated(msg.sender, address(0));
    }

    function _decodeRoyaltyPayload(bytes calldata message) internal pure returns (RoyaltyPayload memory) {
        if (message.length == 64) {
            (address evmRecipient, uint256 amount) = abi.decode(message, (address, uint256));
            return RoyaltyPayload({evmRecipient: evmRecipient, amount: amount, userId: ""});
        }

        (address evmRecipient, uint256 amount, string memory userId) =
            abi.decode(message, (address, uint256, string));
        return RoyaltyPayload({evmRecipient: evmRecipient, amount: amount, userId: userId});
    }
}
