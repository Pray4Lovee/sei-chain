// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SoulSigilNFT is ERC721 {
    mapping(address => bool) public minted;

    constructor() ERC721("SoulSigil", "SIGIL") {}

    function mint() external {
        require(!minted[msg.sender], "Already minted");
        minted[msg.sender] = true;
        _safeMint(msg.sender, uint256(uint160(msg.sender)));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound");
        }
        return from;
    }
}
