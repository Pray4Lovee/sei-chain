// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IHoloVerifier {
    function isVerified(address account) external view returns (bool);
}

/// @title KeeperRoyaltyRouter
/// @notice Aggregates royalty flows arriving from multiple networks before
///         forwarding funds into the LumenCard vault on the EVM side.
/// @dev The router keeps the settlement surface minimal: relayers simply call
///      the appropriate entrypoint after the upstream bridge flow completes.
contract KeeperRoyaltyRouter is Ownable {
    using SafeERC20 for IERC20;

    enum SettlementOrigin {
        CCTP,
        Sei,
        Hyperliquid
    }

    /// @notice EVM address of the LumenCard vault that ultimately holds USDC.
    address public lumenCardVault;

    /// @notice ERC20 token used for settlements – expected to be USDC on EVM chains.
    IERC20 public immutable settlementToken;

    /// @notice Optional verifier contract enforcing Holo identity membership.
    IHoloVerifier public holoVerifier;

    /// @notice Trackers that are authorised to call settlement entrypoints.
    mapping(address => bool) public allowedSettlers;

    event RoyaltySettled(SettlementOrigin indexed origin, uint256 amount, address indexed vault, address indexed caller);
    event LumenCardVaultUpdated(address indexed previousVault, address indexed newVault);
    event SettlerPermissionUpdated(address indexed account, bool allowed);
    event HoloVerifierUpdated(address indexed previousVerifier, address indexed newVerifier);

    error InvalidSettlementToken();
    error InvalidVault();
    error InvalidAmount();
    error NotAllowed();
    error NotVerified();

    constructor(IERC20 usdc, address initialVault, address initialOwner) Ownable(initialOwner) {
        if (address(usdc) == address(0)) {
            revert InvalidSettlementToken();
        }
        if (initialVault == address(0)) {
            revert InvalidVault();
        }
        settlementToken = usdc;
        lumenCardVault = initialVault;

        // Allow the deployer to perform settlements by default.
        allowedSettlers[initialOwner] = true;
        emit SettlerPermissionUpdated(initialOwner, true);
    }

    /// @notice Updates the vault address that ultimately receives royalties.
    function setLumenCardVault(address newVault) external onlyOwner {
        if (newVault == address(0)) {
            revert InvalidVault();
        }
        address previous = lumenCardVault;
        lumenCardVault = newVault;
        emit LumenCardVaultUpdated(previous, newVault);
    }

    /// @notice Allows or removes a relayer from calling settlement entrypoints.
    function setSettler(address account, bool allowed) external onlyOwner {
        allowedSettlers[account] = allowed;
        emit SettlerPermissionUpdated(account, allowed);
    }

    /// @notice Configures the optional Holo verifier contract.
    /// @dev Set to address(0) to disable verification checks.
    function setHoloVerifier(IHoloVerifier newVerifier) external onlyOwner {
        IHoloVerifier previous = holoVerifier;
        holoVerifier = newVerifier;
        emit HoloVerifierUpdated(address(previous), address(newVerifier));
    }

    /// @notice Called once Circle's MessageTransmitter has minted USDC on this chain.
    /// @dev The router does not interact with the MessageTransmitter directly, but
    ///      the calldata is included for event traceability and future extensions.
    function settleFromCCTP(bytes calldata circleMessage, bytes calldata attestation, uint256 amount) external {
        _guardSettlement(amount);
        _transferToVault(amount, SettlementOrigin.CCTP);

        // silence unused parameter warnings without storing data on-chain.
        circleMessage;
        attestation;
    }

    /// @notice Settles royalties that originated on Noble/Sei once USDC is minted here.
    function settleFromSei(uint256 amount) external {
        _guardSettlement(amount);
        _transferToVault(amount, SettlementOrigin.Sei);
    }

    /// @notice Settles Hyperliquid royalties after an off-chain USDH→USDC conversion.
    function settleFromHyperliquid(uint256 amount) external {
        _guardSettlement(amount);
        _transferToVault(amount, SettlementOrigin.Hyperliquid);
    }

    function _guardSettlement(uint256 amount) internal view {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (!allowedSettlers[msg.sender]) {
            revert NotAllowed();
        }
        IHoloVerifier verifier = holoVerifier;
        if (address(verifier) != address(0) && !verifier.isVerified(msg.sender)) {
            revert NotVerified();
        }
    }

    function _transferToVault(uint256 amount, SettlementOrigin origin) internal {
        address vault = lumenCardVault;
        if (vault == address(0)) {
            revert InvalidVault();
        }
        settlementToken.safeTransfer(vault, amount);
        emit RoyaltySettled(origin, amount, vault, msg.sender);
    }
}
