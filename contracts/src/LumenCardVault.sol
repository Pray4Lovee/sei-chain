// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LumenCardVault
/// @notice Holds settlement funds for LumenCard users and enforces Holo verification before spending.
contract LumenCardVault {
    using SafeERC20 for IERC20;

    struct Balance {
        uint256 spendable;
        uint256 locked;
    }

    IERC20 public immutable settlementToken;
    address public owner;
    address public keeperRouter;
    address public holoVerifier;

    mapping(address => Balance) private _balances;
    mapping(address => bool) public holoVerified;

    event Deposit(address indexed user, uint256 amount, uint256 lockedBalance, uint256 spendableBalance);
    event Spend(address indexed user, address indexed to, uint256 amount);
    event KeeperRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event HoloVerifierUpdated(address indexed previousVerifier, address indexed newVerifier);
    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event HoloVerificationStatus(address indexed user, bool verified);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyKeeperRouter() {
        require(msg.sender == keeperRouter, "unauthorized");
        _;
    }

    modifier onlyHoloVerifier() {
        require(msg.sender == holoVerifier || msg.sender == owner, "not verifier");
        _;
    }

    constructor(address token, address initialOwner, address initialKeeperRouter, address initialHoloVerifier) {
        require(token != address(0), "invalid token");
        settlementToken = IERC20(token);
        owner = initialOwner == address(0) ? msg.sender : initialOwner;
        keeperRouter = initialKeeperRouter;
        holoVerifier = initialHoloVerifier;
    }

    /// @notice Transfers ownership to a new account.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner is zero");
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Sets the contract authorised to credit spendable balances.
    function setKeeperRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "router is zero");
        emit KeeperRouterUpdated(keeperRouter, newRouter);
        keeperRouter = newRouter;
    }

    /// @notice Sets the account permitted to update Holo verification state.
    function setHoloVerifier(address newVerifier) external onlyOwner {
        emit HoloVerifierUpdated(holoVerifier, newVerifier);
        holoVerifier = newVerifier;
    }

    /// @notice Credits a user's spendable balance with bridged USDC.
    function credit(address user, uint256 amount) external onlyKeeperRouter {
        require(user != address(0), "invalid user");
        require(amount > 0, "amount is zero");

        Balance storage balance = _balances[user];
        balance.spendable += amount;

        emit Deposit(user, amount, balance.locked, balance.spendable);
    }

    /// @notice Updates the verification status required for spending.
    function updateHoloStatus(address user, bool verified) external onlyHoloVerifier {
        require(user != address(0), "invalid user");
        holoVerified[user] = verified;
        emit HoloVerificationStatus(user, verified);
    }

    /// @notice Allows verified users to spend from their available balance.
    function spend(address to, uint256 amount) external {
        require(holoVerified[msg.sender], "holo verification required");
        require(to != address(0), "invalid recipient");
        require(amount > 0, "amount is zero");

        Balance storage balance = _balances[msg.sender];
        require(balance.spendable >= amount, "insufficient funds");

        balance.spendable -= amount;
        settlementToken.safeTransfer(to, amount);

        emit Spend(msg.sender, to, amount);
    }

    /// @notice Returns the spendable and locked balances for a user.
    function balanceOf(address user) external view returns (uint256 spendable, uint256 locked) {
        Balance storage balance = _balances[user];
        return (balance.spendable, balance.locked);
    }
}
