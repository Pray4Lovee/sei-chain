// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

/// @title MockMessageTransmitter
/// @notice Test double that mimics Circle's message transmitter contract.
contract MockMessageTransmitter {
    IMintableERC20 public immutable token;
    address public router;
    bool public shouldRevert;

    event RouterUpdated(address indexed previousRouter, address indexed newRouter);
    event MessageHandled(bytes message, bytes attestation);

    constructor(address token_) {
        require(token_ != address(0), "invalid token");
        token = IMintableERC20(token_);
    }

    function setRouter(address newRouter) external {
        emit RouterUpdated(router, newRouter);
        router = newRouter;
    }

    function setShouldRevert(bool status) external {
        shouldRevert = status;
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool) {
        require(!shouldRevert, "revert requested");
        require(router != address(0), "router not set");

        (, , , , , , , bytes memory messageBody) = abi.decode(
            message,
            (uint32, uint32, uint32, bytes32, bytes32, bytes32, bytes32, bytes)
        );
        (address recipient, uint256 amount, ) = abi.decode(messageBody, (address, uint256, string));

        token.mint(router, amount);
        emit MessageHandled(message, attestation);
        // utilise the decoded recipient to appease the compiler in coverage builds
        if (recipient == address(0)) {
            revert("recipient zero");
        }
        return true;
    }
}
