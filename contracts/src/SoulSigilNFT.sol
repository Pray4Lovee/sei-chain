// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SoulSigilNFT
/// @notice Soulbound ERC721 token used to notarise successful royalty claims.
contract SoulSigilNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => bool) public approvedMinters;

    event MinterUpdated(address indexed minter, bool approved);

    constructor() Ownable(msg.sender) ERC721("SoulSigilNFT", "SIGIL") {}

    modifier onlyMinter() {
        require(approvedMinters[msg.sender], "not approved");
        _;
    }

    /// @notice Allows the owner to approve or revoke minter permissions.
    function setMinter(address minter, bool approved) external onlyOwner {
        approvedMinters[minter] = approved;
        emit MinterUpdated(minter, approved);
    }

    /// @notice Mints a soulbound NFT to the recipient with encoded metadata.
    function mint(address to, string memory uri) external onlyMinter returns (uint256 tokenId) {
        require(to != address(0), "invalid recipient");
        require(bytes(uri).length != 0, "uri required");

        tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /// @dev Prevents transferring soulbound tokens while allowing minting and burning.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: no transfers");
        }
        return super._update(to, tokenId, auth);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}

