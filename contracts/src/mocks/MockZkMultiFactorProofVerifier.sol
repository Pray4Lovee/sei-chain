// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkMultiFactorProofVerifier} from "../interfaces/IZkMultiFactorProofVerifier.sol";

/// @title MockZkMultiFactorProofVerifier
/// @notice Testing stub that allows manually approving proof/public input pairs.
contract MockZkMultiFactorProofVerifier is IZkMultiFactorProofVerifier {
    mapping(bytes32 => bool) private _expectedResults;

    event ProofExpectationSet(bytes32 indexed key, bool isValid);

    function setExpectation(bytes calldata proof, bytes calldata publicInputs, bool isValid) external {
        bytes32 key = keccak256(abi.encodePacked(proof, publicInputs));
        _expectedResults[key] = isValid;
        emit ProofExpectationSet(key, isValid);
    }

    function verify(bytes calldata proof, bytes calldata publicInputs) external view override returns (bool) {
        return _expectedResults[keccak256(abi.encodePacked(proof, publicInputs))];
    }
}
