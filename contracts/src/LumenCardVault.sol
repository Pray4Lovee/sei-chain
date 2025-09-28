// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LumenCardVault
/// @notice Tracks spendable balances for LumenCard users and enforces settlement and Holo verification rules.
contract LumenCardVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Balance {
        uint256 spendable;
        uint256 locked;
    }

    IERC20 public immutable asset;
    address public keeperRouter;

    mapping(address => Balance) private balances;
    mapping(address => bool) public holoVerified;

    event KeeperRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event Deposit(address indexed user, uint256 amount, uint256 locked, uint256 spendable);
    event Spend(address indexed user, address indexed recipient, uint256 amount);
    event HoloVerificationUpdated(address indexed user, bool verified);

    error Unauthorized();
    error InvalidAddress();
    error AmountRequired();
    error VerificationRequired();
    error InsufficientBalance();

    constructor(IERC20 settlementAsset) Ownable(msg.sender) {
        if (address(settlementAsset) == address(0)) {
            revert InvalidAddress();
        }
        asset = settlementAsset;
    }

    function setKeeperRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) {
            revert InvalidAddress();
        }
        address previous = keeperRouter;
        keeperRouter = newRouter;
        emit KeeperRouterUpdated(previous, newRouter);
    }

    function credit(address user, uint256 amount) external {
        if (msg.sender != keeperRouter) {
            revert Unauthorized();
        }
        if (user == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert AmountRequired();
        }

        Balance storage account = balances[user];
        account.spendable += amount;
        emit Deposit(user, amount, account.locked, account.spendable);
    }

    function markHoloVerified(address user, bool verified) external onlyOwner {
        if (user == address(0)) {
            revert InvalidAddress();
        }
        holoVerified[user] = verified;
        emit HoloVerificationUpdated(user, verified);
    }

    function spend(address recipient, uint256 amount) external nonReentrant {
        if (!holoVerified[msg.sender]) {
            revert VerificationRequired();
        }
        if (recipient == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert AmountRequired();
        }

        Balance storage account = balances[msg.sender];
        if (account.spendable < amount) {
            revert InsufficientBalance();
        }

        account.spendable -= amount;
        asset.safeTransfer(recipient, amount);
        emit Spend(msg.sender, recipient, amount);
    }

    function balanceOf(address user) external view returns (uint256 spendable, uint256 locked) {
        Balance storage account = balances[user];
        return (account.spendable, account.locked);
    }
}
