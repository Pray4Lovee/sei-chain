// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkSoulProofVerifier} from "../interfaces/IZkSoulProofVerifier.sol";

contract MockZkSoulProofVerifier is IZkSoulProofVerifier {
    bool public shouldVerify = true;

    function setShouldVerify(bool newValue) external {
        shouldVerify = newValue;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view override returns (bool) {
        return shouldVerify;
    }
}
