// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import {IZkSoulProofVerifier} from "./interfaces/IZkSoulProofVerifier.sol";

/// @title SoulKeyNFT
/// @notice ERC721 token that can only be minted after presenting a valid zkSoulProof.
///         The contract validates the Groth16 proof, ensures the Merkle root is
///         recognised, and prevents proof re-use via a nullifier commitment.
contract SoulKeyNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;

    IZkSoulProofVerifier public immutable verifier;

    uint256 private _nextTokenId;
    uint256 private _merkleRoot;
    string private _baseTokenURI;

    mapping(bytes32 => bool) private _consumedNullifiers;
    mapping(address => bool) private _hasMinted;

    event MerkleRootUpdated(uint256 previousRoot, uint256 newRoot);
    event BaseURIUpdated(string previousBaseURI, string newBaseURI);
    event SoulKeyMinted(address indexed account, uint256 indexed tokenId, uint256 nullifierHash, uint256 signalHash);

    constructor(address verifier_, uint256 merkleRoot_, string memory baseTokenURI_) Ownable(msg.sender) ERC721("Soul Key", "SOULKEY") {
        require(verifier_ != address(0), "invalid verifier");
        verifier = IZkSoulProofVerifier(verifier_);
        _merkleRoot = merkleRoot_;
        _baseTokenURI = baseTokenURI_;
    }

    function merkleRoot() external view returns (uint256) {
        return _merkleRoot;
    }

    function hasMinted(address account) external view returns (bool) {
        return _hasMinted[account];
    }

    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool) {
        return _consumedNullifiers[nullifierHash];
    }

    function setMerkleRoot(uint256 newRoot) external onlyOwner {
        uint256 previousRoot = _merkleRoot;
        _merkleRoot = newRoot;
        emit MerkleRootUpdated(previousRoot, newRoot);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        string memory previous = _baseTokenURI;
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(previous, newBaseURI);
    }

    /// @notice Mints a SoulKey to the caller when a valid Groth16 proof is provided.
    /// @param a Groth16 proof parameter.
    /// @param b Groth16 proof parameter.
    /// @param c Groth16 proof parameter.
    /// @param publicSignals Array containing [root, nullifierHash, signalHash].
    function mintWithZk(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[3] calldata publicSignals
    ) external returns (uint256 tokenId) {
        require(!_hasMinted[msg.sender], "already minted");
        require(publicSignals[0] == _merkleRoot, "unknown merkle root");

        bytes32 nullifierKey = bytes32(publicSignals[1]);
        require(!_consumedNullifiers[nullifierKey], "nullifier already used");

        uint256[] memory proofInputs = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            proofInputs[i] = publicSignals[i];
        }

        bool verified = verifier.verifyProof(a, b, c, proofInputs);
        require(verified, "invalid ZK proof");

        _hasMinted[msg.sender] = true;
        _consumedNullifiers[nullifierKey] = true;

        tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        if (bytes(_baseTokenURI).length != 0) {
            _setTokenURI(tokenId, string.concat(_baseTokenURI, tokenId.toString()));
        }

        emit SoulKeyMinted(msg.sender, tokenId, publicSignals[1], publicSignals[2]);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}
