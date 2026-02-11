// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract SigilRevealLog {
    struct RevealProof {
        bytes metadata;
        bytes32 metadataHash;
        string jsonProof;
    }

    mapping(uint256 => RevealProof) public reveals;

    event SigilRevealed(
        uint256 indexed sigilId,
        bytes32 metadataHash,
        string jsonProof
    );

    function logReveal(
        uint256 sigilId,
        bytes calldata metadata,
        bytes32 metadataHash,
        string calldata jsonProof
    ) external {
        reveals[sigilId] = RevealProof({
            metadata: metadata,
            metadataHash: metadataHash,
            jsonProof: jsonProof
        });

        emit SigilRevealed(sigilId, metadataHash, jsonProof);
    }
}
