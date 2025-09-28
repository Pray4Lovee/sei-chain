// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LumenCard Vault Router
/// @notice Handles deposits, royalties, and spendable balances for users.
contract LumenCardVault is Ownable {
    IERC20 public immutable stable;
    uint256 public royaltyBps;
    address public royaltyReceiver;

    struct Balance {
        uint256 spendable;
        uint256 lifetimeDeposits;
    }

    mapping(address => Balance) public balances;

    event Deposit(address indexed user, uint256 amount, uint256 royalty, uint256 credited);
    event Spend(address indexed user, address to, uint256 amount);
    event RoyaltyUpdated(uint256 newBps, address newReceiver);

    constructor(address _stable, address _royaltyReceiver, uint256 _royaltyBps) Ownable(msg.sender) {
        require(_stable != address(0), "invalid stable");
        require(_royaltyReceiver != address(0), "invalid receiver");

        stable = IERC20(_stable);
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;
    }

    /// @notice deposit stablecoin into the vault
    function deposit(uint256 amount) external {
        require(amount > 0, "invalid deposit");

        require(stable.transferFrom(msg.sender, address(this), amount), "transfer failed");

        uint256 royalty = (amount * royaltyBps) / 10_000;
        uint256 credited = amount - royalty;

        if (royalty > 0) {
            require(stable.transfer(royaltyReceiver, royalty), "royalty transfer failed");
        }

        Balance storage userBalance = balances[msg.sender];
        userBalance.spendable += credited;
        userBalance.lifetimeDeposits += amount;

        emit Deposit(msg.sender, amount, royalty, credited);
    }

    /// @notice spend balance like a card
    function spend(address to, uint256 amount) external {
        require(to != address(0), "invalid recipient");
        Balance storage userBalance = balances[msg.sender];
        require(userBalance.spendable >= amount, "insufficient balance");

        userBalance.spendable -= amount;
        require(stable.transfer(to, amount), "spend transfer failed");

        emit Spend(msg.sender, to, amount);
    }

    /// @notice admin can update royalty settings
    function updateRoyalty(uint256 newBps, address newReceiver) external onlyOwner {
        require(newBps <= 5_000, "max 50%");
        require(newReceiver != address(0), "invalid receiver");

        royaltyBps = newBps;
        royaltyReceiver = newReceiver;

        emit RoyaltyUpdated(newBps, newReceiver);
    }
}
