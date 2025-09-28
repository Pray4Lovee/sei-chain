// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IMessageTransmitter
/// @notice Interface for Chainlink CCIP/CCTP style message verification adapters.
interface IMessageTransmitter {
    /// @notice Verifies an attested cross-chain message.
    /// @param message The encoded message payload delivered from a remote chain.
    /// @param attestation Proof from the messaging network attesting to the payload.
    /// @return True if the attestation is valid for the provided message.
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool);
}
