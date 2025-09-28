// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {IZkSoulProofVerifier} from "./interfaces/IZkSoulProofVerifier.sol";

/// @title SoulKeyNFT
/// @notice ERC721 token gated by a zero-knowledge proof of SoulSigil ownership.
contract SoulKeyNFT is ERC721, Ownable {

    IZkSoulProofVerifier public verifier;
    string private _baseTokenURI;
    uint256 private _nextTokenId;

    mapping(address => bool) private _hasMinted;
    mapping(bytes32 => bool) private _nullifierUsed;

    event VerifierUpdated(address indexed previousVerifier, address indexed newVerifier);
    event BaseURIUpdated(string previousBaseURI, string newBaseURI);
    event SoulKeyMinted(address indexed account, uint256 indexed tokenId, bytes32 indexed nullifierHash);

    error AlreadyMinted();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error InvalidVerifier();

    constructor(address verifier_, string memory baseTokenURI_)
        Ownable(msg.sender)
        ERC721("Soul Key", "SOULKEY")
    {
        if (verifier_ == address(0)) {
            revert InvalidVerifier();
        }
        verifier = IZkSoulProofVerifier(verifier_);
        _baseTokenURI = baseTokenURI_;
    }

    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) {
            revert InvalidVerifier();
        }
        address previous = address(verifier);
        verifier = IZkSoulProofVerifier(newVerifier);
        emit VerifierUpdated(previous, newVerifier);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        string memory previous = _baseTokenURI;
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(previous, newBaseURI);
    }

    function hasMinted(address account) external view returns (bool) {
        return _hasMinted[account];
    }

    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool) {
        return _nullifierUsed[nullifierHash];
    }

    function mintWithZk(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external returns (uint256) {
        if (_hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }
        if (publicSignals.length < 2) {
            revert InvalidProof();
        }

        bool ok = verifier.verifyProof(a, b, c, publicSignals);
        if (!ok) {
            revert InvalidProof();
        }

        bytes32 nullifierHash = bytes32(publicSignals[1]);
        if (_nullifierUsed[nullifierHash]) {
            revert NullifierAlreadyUsed();
        }

        uint256 tokenId = ++_nextTokenId;

        _hasMinted[msg.sender] = true;
        _nullifierUsed[nullifierHash] = true;

        _safeMint(msg.sender, tokenId);

        emit SoulKeyMinted(msg.sender, tokenId, nullifierHash);
        return tokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
