// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkProofVerifier} from "./interfaces/IZkProofVerifier.sol";
import {IMessageTransmitter} from "./interfaces/IMessageTransmitter.sol";

/// @notice Mock zk proof verifier used for testing SoulKey gates.
contract MockZkProofVerifier is IZkProofVerifier {
    bool private _result = true;

    function setResult(bool newResult) external {
        _result = newResult;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view override returns (bool) {
        return _result;
    }
}

/// @notice Mock message transmitter that records provided payloads.
contract MockMessageTransmitter is IMessageTransmitter {
    bool private _shouldSucceed = true;
    bytes public lastMessage;
    bytes public lastAttestation;

    function setShouldSucceed(bool shouldSucceed) external {
        _shouldSucceed = shouldSucceed;
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external override returns (bool) {
        lastMessage = message;
        lastAttestation = attestation;
        return _shouldSucceed;
    }
}
