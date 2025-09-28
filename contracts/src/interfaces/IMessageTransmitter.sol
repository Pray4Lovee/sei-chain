// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IMessageTransmitter
/// @notice Interface for cross-chain messaging endpoints compatible with Chainlink CCIP style receivers.
interface IMessageTransmitter {
    /// @notice Receives a cross-chain message and attestation.
    /// @dev Implementations should perform attestation verification and return whether the message is accepted.
    /// @param message ABI encoded payload delivered from the source chain.
    /// @param attestation Proof provided by the messaging layer to authenticate the message.
    /// @return accepted True when the message has been successfully authenticated.
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool accepted);
}
