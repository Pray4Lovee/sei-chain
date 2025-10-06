// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title SoulSigilNFT
/// @notice Soulbound ERC721 tokens minted to notarize successful royalty claims.
contract SoulSigilNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    mapping(address => bool) public approvedMinters;

    error SoulboundTransferBlocked();
    error NotApprovedMinter();
    error InvalidRecipient();
    error EmptyURI();

    constructor() Ownable(msg.sender) ERC721("SoulSigilNFT", "SIGIL") {}

    modifier onlyMinter() {
        if (!approvedMinters[msg.sender]) {
            revert NotApprovedMinter();
        }
        _;
    }

    /// @notice Approves or revokes an account's ability to mint sigils.
    function setMinter(address minter, bool approved) external onlyOwner {
        approvedMinters[minter] = approved;
    }

    /// @notice Mints a new soulbound NFT to the recipient with the provided metadata URI.
    function mint(address to, string memory uri) external onlyMinter {
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (bytes(uri).length == 0) {
            revert EmptyURI();
        }

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /// @dev Prevents transfers after minting to keep tokens soulbound.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferBlocked();
        }
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function approve(address, uint256) public pure override {
        revert SoulboundTransferBlocked();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundTransferBlocked();
    }
}
