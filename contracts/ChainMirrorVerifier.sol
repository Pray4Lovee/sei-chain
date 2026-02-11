// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract ChainMirrorVerifier {
    address public admin;
    mapping(bytes32 => bool) public mirrorHashes;

    event MirrorHashApproved(bytes32 indexed mirrorHash);
    event MirrorHashRevoked(bytes32 indexed mirrorHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr) {
        admin = adminAddr;
    }

    function approveForkHash(bytes32 mirrorHash) external onlyAdmin {
        mirrorHashes[mirrorHash] = true;
        emit MirrorHashApproved(mirrorHash);
    }

    function revokeForkHash(bytes32 mirrorHash) external onlyAdmin {
        mirrorHashes[mirrorHash] = false;
        emit MirrorHashRevoked(mirrorHash);
    }

    function verifyForkHash(bytes32 mirrorHash) external view returns (bool) {
        return mirrorHashes[mirrorHash];
    }
}
