// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkMultiFactorProofVerifier} from "./CrossChainSoulKeyGate.sol";

contract MockZkMultiFactorProofVerifier is IZkMultiFactorProofVerifier {
    mapping(bytes32 => bool) private _verificationResults;

    function setVerificationResult(bytes calldata proof, bytes calldata publicSignals, bool result) external {
        _verificationResults[_key(proof, publicSignals)] = result;
    }

    function verify(bytes calldata proof, bytes calldata publicSignals) external view override returns (bool) {
        return _verificationResults[_key(proof, publicSignals)];
    }

    function _key(bytes calldata proof, bytes calldata publicSignals) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(proof, publicSignals));
    }
}
