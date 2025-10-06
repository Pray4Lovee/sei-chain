// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LumenCard Vault Router
/// @notice Handles deposits, royalties, and spendable balances for users.
contract LumenCardVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Basis points denominator used for royalty calculations.
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @notice Stablecoin that powers the vault (e.g. USDC).
    IERC20 public immutable stable;

    /// @notice Royalty taken from each deposit in basis points.
    uint256 public royaltyBps;

    /// @notice Address receiving collected royalties.
    address public royaltyReceiver;

    struct Balance {
        uint256 spendable;
        uint256 lifetimeDeposits;
    }

    mapping(address => Balance) public balances;

    event Deposit(address indexed user, uint256 amount, uint256 royalty, uint256 credited);
    event Spend(address indexed user, address indexed to, uint256 amount);
    event RoyaltyUpdated(uint256 newBps, address indexed newReceiver);

    constructor(IERC20 stable_, address royaltyReceiver_, uint256 royaltyBps_) Ownable(msg.sender) {
        require(address(stable_) != address(0), "stable required");
        require(royaltyReceiver_ != address(0), "royalty receiver required");
        require(royaltyBps_ <= BPS_DENOMINATOR / 2, "royalty too high");

        stable = stable_;
        royaltyReceiver = royaltyReceiver_;
        royaltyBps = royaltyBps_;
    }

    /// @notice Deposit stablecoin into the vault and credit the caller's LumenCard balance.
    /// @param amount The amount of stablecoin to deposit.
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");

        stable.safeTransferFrom(msg.sender, address(this), amount);

        uint256 royalty = (amount * royaltyBps) / BPS_DENOMINATOR;
        uint256 credited = amount - royalty;

        if (royalty > 0) {
            stable.safeTransfer(royaltyReceiver, royalty);
        }

        Balance storage balance = balances[msg.sender];
        balance.spendable += credited;
        balance.lifetimeDeposits += amount;

        emit Deposit(msg.sender, amount, royalty, credited);
    }

    /// @notice Spend from the caller's balance like a payment card.
    /// @param to Recipient address receiving the stablecoin.
    /// @param amount Amount to spend from the caller's balance.
    function spend(address to, uint256 amount) external nonReentrant {
        require(to != address(0), "invalid recipient");

        Balance storage balance = balances[msg.sender];
        require(balance.spendable >= amount, "insufficient balance");

        balance.spendable -= amount;
        stable.safeTransfer(to, amount);

        emit Spend(msg.sender, to, amount);
    }

    /// @notice Update royalty settings for future deposits.
    /// @param newBps New royalty rate in basis points (max 50%).
    /// @param newReceiver Address that will receive future royalties.
    function updateRoyalty(uint256 newBps, address newReceiver) external onlyOwner {
        require(newBps <= BPS_DENOMINATOR / 2, "royalty too high");
        require(newReceiver != address(0), "receiver required");

        royaltyBps = newBps;
        royaltyReceiver = newReceiver;

        emit RoyaltyUpdated(newBps, newReceiver);
    }
}
