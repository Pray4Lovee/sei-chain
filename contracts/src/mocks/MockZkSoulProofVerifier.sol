// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IZkSoulProofVerifier} from "../interfaces/IZkSoulProofVerifier.sol";

contract MockZkSoulProofVerifier is IZkSoulProofVerifier {
    bool private _shouldVerify;

    function setShouldVerify(bool value) external {
        _shouldVerify = value;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view override returns (bool) {
        return _shouldVerify;
    }
}
