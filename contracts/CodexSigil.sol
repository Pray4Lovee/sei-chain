// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

import "./CodexSigilMetadataHasher.sol";

contract CodexSigil {
    using CodexSigilMetadataHasher for bytes;

    string public name = "CodexSigil";
    string public symbol = "CSIG";

    struct SigilData {
        address owner;
        bytes32 metadataHash;
        bytes metadata;
        bool revoked;
    }

    address public admin;
    uint256 public totalSupply;

    mapping(uint256 => SigilData) public sigils;
    mapping(address => uint256[]) public sigilsOf;

    event SigilMinted(
        uint256 indexed sigilId,
        address indexed owner,
        bytes32 metadataHash,
        bytes metadata
    );
    event SigilRevoked(uint256 indexed sigilId, address indexed revoker);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr) {
        admin = adminAddr;
    }

    function mintSigil(address owner, bytes calldata metadata)
        external
        onlyAdmin
        returns (uint256 sigilId)
    {
        sigilId = ++totalSupply;
        bytes32 metadataHash = metadata.hashMetadata(owner, block.chainid);

        sigils[sigilId] = SigilData({
            owner: owner,
            metadataHash: metadataHash,
            metadata: metadata,
            revoked: false
        });
        sigilsOf[owner].push(sigilId);

        emit SigilMinted(sigilId, owner, metadataHash, metadata);
    }

    function revokeSigil(uint256 sigilId) external onlyAdmin {
        SigilData storage sigil = sigils[sigilId];
        require(sigil.owner != address(0), "Unknown sigil");
        sigil.revoked = true;

        emit SigilRevoked(sigilId, msg.sender);
    }

    function ownerOf(uint256 sigilId) external view returns (address) {
        return sigils[sigilId].owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return sigilsOf[owner].length;
    }
}
