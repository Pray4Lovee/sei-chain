// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMessageTransmitter} from "../interfaces/IMessageTransmitter.sol";

/// @title MockMessageTransmitter
/// @notice Simple mock that emulates a Chainlink CCIP message endpoint for testing purposes.
contract MockMessageTransmitter is IMessageTransmitter {
    bool private _shouldAccept = true;

    event AcceptanceUpdated(bool isAccepted);
    event MessageReceived(bytes message, bytes attestation);

    function setAcceptance(bool shouldAccept) external {
        _shouldAccept = shouldAccept;
        emit AcceptanceUpdated(shouldAccept);
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external override returns (bool) {
        emit MessageReceived(message, attestation);
        return _shouldAccept;
    }
}
