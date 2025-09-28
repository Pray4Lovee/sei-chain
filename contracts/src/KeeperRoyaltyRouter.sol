// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMessageTransmitter {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
}

interface ILumenCardVault {
    function credit(address user, uint256 amount) external;
}

/// @title KeeperRoyaltyRouter
/// @notice Verifies Circle CCTP attestations and routes bridged USDC into the LumenCard vault on a per-user basis.
contract KeeperRoyaltyRouter {
    using SafeERC20 for IERC20;

    struct RoyaltyPayload {
        address recipient;
        uint256 amount;
        string userId;
        uint32 sourceDomain;
        address mintedTo;
    }

    address public owner;
    address public lumenCardVault;
    address public messageTransmitter;
    IERC20 public immutable usdc;

    event RoyaltySettled(address indexed user, uint256 amount, string userId, uint32 sourceDomain);
    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event VaultUpdated(address indexed previousVault, address indexed newVault);
    event MessageTransmitterUpdated(address indexed previousTransmitter, address indexed newTransmitter);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address vault, address msgTransmitter, address usdcToken) {
        require(vault != address(0), "invalid vault");
        require(msgTransmitter != address(0), "invalid transmitter");
        require(usdcToken != address(0), "invalid token");
        owner = msg.sender;
        lumenCardVault = vault;
        messageTransmitter = msgTransmitter;
        usdc = IERC20(usdcToken);
    }

    /// @notice Transfers router ownership.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner is zero");
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Updates the vault that will receive and credit user balances.
    function updateVault(address newVault) external onlyOwner {
        require(newVault != address(0), "invalid vault");
        emit VaultUpdated(lumenCardVault, newVault);
        lumenCardVault = newVault;
    }

    /// @notice Updates the Circle message transmitter used to validate attestations.
    function updateMessageTransmitter(address newTransmitter) external onlyOwner {
        require(newTransmitter != address(0), "invalid transmitter");
        emit MessageTransmitterUpdated(messageTransmitter, newTransmitter);
        messageTransmitter = newTransmitter;
    }

    /// @notice Consumes a Circle attestation, transfers freshly minted USDC into the vault and credits the destination user.
    function settleRoyalty(bytes calldata message, bytes calldata attestation) external {
        bool ok = IMessageTransmitter(messageTransmitter).receiveMessage(message, attestation);
        require(ok, "Circle attestation failed");

        RoyaltyPayload memory payload = _decodeRoyaltyPayload(message);
        require(payload.recipient != address(0), "invalid recipient");
        require(payload.amount > 0, "invalid amount");
        require(payload.mintedTo == address(this), "unexpected recipient");

        usdc.safeTransfer(lumenCardVault, payload.amount);
        ILumenCardVault(lumenCardVault).credit(payload.recipient, payload.amount);

        emit RoyaltySettled(payload.recipient, payload.amount, payload.userId, payload.sourceDomain);
    }

    function _decodeRoyaltyPayload(bytes memory message) internal pure returns (RoyaltyPayload memory payload) {
        (
            uint32 version,
            uint32 sourceDomain,
            uint32 destinationDomain,
            bytes32 nonce,
            bytes32 sender,
            bytes32 recipient,
            bytes32 targetCaller,
            bytes memory messageBody
        ) = abi.decode(message, (uint32, uint32, uint32, bytes32, bytes32, bytes32, bytes32, bytes));

        (address user, uint256 amount, string memory userId) = abi.decode(messageBody, (address, uint256, string));
        address mintedTo = address(uint160(uint256(recipient)));

        payload = RoyaltyPayload({
            recipient: user,
            amount: amount,
            userId: userId,
            sourceDomain: sourceDomain,
            mintedTo: mintedTo
        });

        // Silence warnings for unused decoded fields in contexts where the compiler might flag them.
        version;
        destinationDomain;
        nonce;
        sender;
        targetCaller;
    }
}
