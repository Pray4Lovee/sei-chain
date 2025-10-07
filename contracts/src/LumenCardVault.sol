// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LumenCardVault is Ownable {
    IERC20 public immutable stable;
    uint256 public royaltyBps;
    address public royaltyReceiver;

    struct Balance {
        uint256 spendable;
        uint256 lifetimeDeposits;
    }

    mapping(address => Balance) public balances;
    mapping(address => bool) public holoVerified;

    event Deposit(address indexed user, uint256 amount, uint256 royalty, uint256 credited);
    event Spend(address indexed user, address to, uint256 amount);
    event RoyaltyUpdated(uint256 newBps, address newReceiver);
    event HoloVerified(address indexed user);

    constructor(address _stable, address _royaltyReceiver, uint256 _royaltyBps) {
        require(_stable != address(0), "stable required");
        require(_royaltyReceiver != address(0), "receiver required");
        require(_royaltyBps <= 5000, "max 50%");

        stable = IERC20(_stable);
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid deposit");
        require(stable.transferFrom(msg.sender, address(this), amount), "transfer failed");

        uint256 royalty = (amount * royaltyBps) / 10000;
        uint256 credited = amount - royalty;

        if (royalty > 0) {
            require(stable.transfer(royaltyReceiver, royalty), "royalty transfer failed");
        }

        Balance storage userBalance = balances[msg.sender];
        userBalance.spendable += credited;
        userBalance.lifetimeDeposits += amount;

        emit Deposit(msg.sender, amount, royalty, credited);
    }

    function spend(address to, uint256 amount) external {
        require(to != address(0), "invalid recipient");
        require(holoVerified[msg.sender], "Holo verification required");
        Balance storage userBalance = balances[msg.sender];
        require(userBalance.spendable >= amount, "insufficient balance");

        userBalance.spendable -= amount;
        require(stable.transfer(to, amount), "spend transfer failed");

        emit Spend(msg.sender, to, amount);
    }

    function verifyWithHolo(address user) external onlyOwner {
        holoVerified[user] = true;
        emit HoloVerified(user);
    }

    function updateRoyalty(uint256 newBps, address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "receiver required");
        require(newBps <= 5000, "max 50%");
        royaltyBps = newBps;
        royaltyReceiver = newReceiver;
        emit RoyaltyUpdated(newBps, newReceiver);
    }
}
