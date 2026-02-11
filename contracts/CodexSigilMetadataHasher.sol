// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

library CodexSigilMetadataHasher {
    function hashMetadata(
        bytes memory metadata,
        address owner,
        uint256 chainId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(metadata, owner, chainId));
    }
}
