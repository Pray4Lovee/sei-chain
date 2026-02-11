// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract GuardianCovenantLog {
    event CovenantLogged(
        uint256 indexed vaultId,
        address indexed signer,
        uint256 indexed sigilId,
        bytes32 entropy,
        bytes32 mirrorHash
    );

    function logCovenant(
        uint256 vaultId,
        address signer,
        uint256 sigilId,
        bytes32 entropy,
        bytes32 mirrorHash
    ) external {
        emit CovenantLogged(vaultId, signer, sigilId, entropy, mirrorHash);
    }
}
