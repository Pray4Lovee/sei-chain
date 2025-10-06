// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface required by the royalty router.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Interface for Circle's message transmitter used during CCTP settlement.
interface IMessageTransmitter {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
}

/// @title KeeperRoyaltyRouter
/// @notice Coordinates royalty settlements arriving from multiple networks and protocols.
contract KeeperRoyaltyRouter {
    /// @notice Address allowed to manage contract configuration.
    address public owner;
    /// @notice Destination vault that ultimately receives USDC royalties on EVM chains.
    address public lumenCardVault;
    /// @notice Address of the USDC token contract on the active network.
    address public usdc;

    /// @notice Emitted any time royalties are forwarded to the vault.
    event RoyaltySettled(string origin, uint256 amount, address indexed vault);
    /// @notice Emitted when the vault destination is updated.
    event VaultUpdated(address indexed previousVault, address indexed newVault);

    /// @notice Restricts caller to contract owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "KeeperRoyaltyRouter: not owner");
        _;
    }

    constructor(address _usdc, address _vault) {
        require(_usdc != address(0), "KeeperRoyaltyRouter: usdc zero");
        require(_vault != address(0), "KeeperRoyaltyRouter: vault zero");
        owner = msg.sender;
        usdc = _usdc;
        lumenCardVault = _vault;
    }

    /// @notice Forward royalties received via CCTP after the USDC mint has completed.
    /// @dev The MessageTransmitter contract must be invoked before calling this function.
    /// @param message Circle attested message used for transparency purposes.
    /// @param attestation Circle attestation payload.
    /// @param amount Amount of USDC to forward to the vault.
    function settleFromCCTP(bytes calldata message, bytes calldata attestation, uint256 amount) external {
        require(message.length > 0, "KeeperRoyaltyRouter: message empty");
        require(attestation.length > 0, "KeeperRoyaltyRouter: attestation empty");
        _forwardRoyalties("CCTP", amount);
    }

    /// @notice Forward royalties originating from Hyperliquid after off-chain USDH->USDC conversion.
    function settleFromHyperliquid(uint256 amount) external {
        _forwardRoyalties("Hyperliquid", amount);
    }

    /// @notice Forward royalties bridged from Sei / Noble.
    function settleFromSei(uint256 amount) external {
        _forwardRoyalties("Sei", amount);
    }

    /// @notice Updates the vault destination address.
    /// @param newVault Address of the new vault contract.
    function updateVault(address newVault) external onlyOwner {
        require(newVault != address(0), "KeeperRoyaltyRouter: vault zero");
        address previousVault = lumenCardVault;
        lumenCardVault = newVault;
        emit VaultUpdated(previousVault, newVault);
    }

    /// @notice Allows the owner to update the tracked USDC token address if required.
    /// @param newUsdc Address of the new USDC token.
    function updateUsdc(address newUsdc) external onlyOwner {
        require(newUsdc != address(0), "KeeperRoyaltyRouter: usdc zero");
        usdc = newUsdc;
    }

    function _forwardRoyalties(string memory origin, uint256 amount) internal {
        require(amount > 0, "KeeperRoyaltyRouter: zero amount");
        require(lumenCardVault != address(0), "KeeperRoyaltyRouter: vault not set");
        require(usdc != address(0), "KeeperRoyaltyRouter: usdc not set");

        bool success = IERC20(usdc).transfer(lumenCardVault, amount);
        require(success, "KeeperRoyaltyRouter: transfer failed");
        emit RoyaltySettled(origin, amount, lumenCardVault);
    }
}
