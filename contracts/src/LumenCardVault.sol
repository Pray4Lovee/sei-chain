// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LumenCardVault is Ownable {
    IERC20 public stable;
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

    constructor(address _stable, address _royaltyReceiver, uint256 _royaltyBps) Ownable(msg.sender) {
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

        balances[msg.sender].spendable += credited;
        balances[msg.sender].lifetimeDeposits += amount;

        emit Deposit(msg.sender, amount, royalty, credited);
    }

    function spend(address to, uint256 amount) external {
        require(holoVerified[msg.sender], "Holo verification required");
        require(balances[msg.sender].spendable >= amount, "insufficient balance");

        balances[msg.sender].spendable -= amount;
        require(stable.transfer(to, amount), "spend transfer failed");

        emit Spend(msg.sender, to, amount);
    }

    function verifyWithHolo(address user) external onlyOwner {
        holoVerified[user] = true;
        emit HoloVerified(user);
    }

    function updateRoyalty(uint256 newBps, address newReceiver) external onlyOwner {
        require(newBps <= 5000, "max 50%");
        royaltyBps = newBps;
        royaltyReceiver = newReceiver;
        emit RoyaltyUpdated(newBps, newReceiver);
    }
}
