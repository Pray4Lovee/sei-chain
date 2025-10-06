// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice Minimal ERC20 token with a configurable minter used for testing royalty flows.
contract MockUSDC is ERC20, Ownable {
    address public minter;

    event MinterUpdated(address indexed previousMinter, address indexed newMinter);

    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    /// @notice Updates the authorised minter address.
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "minter is zero");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    /// @notice Mints new tokens to the provided account.
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        _mint(to, amount);
    }
}
