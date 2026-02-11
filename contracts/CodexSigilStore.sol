// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract CodexSigilStore {
    struct SigilRecord {
        address owner;
        bytes32 metadataHash;
        string uri;
    }

    address public admin;
    mapping(uint256 => SigilRecord) public sigilRecords;

    event SigilRecorded(
        uint256 indexed sigilId,
        address indexed owner,
        bytes32 metadataHash,
        string uri
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr) {
        admin = adminAddr;
    }

    function recordSigil(
        uint256 sigilId,
        address owner,
        bytes32 metadataHash,
        string calldata uri
    ) external onlyAdmin {
        sigilRecords[sigilId] = SigilRecord({
            owner: owner,
            metadataHash: metadataHash,
            uri: uri
        });

        emit SigilRecorded(sigilId, owner, metadataHash, uri);
    }
}
