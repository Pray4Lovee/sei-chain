// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract EntropyProofRecorder {
    mapping(uint256 => bytes32[]) public entropyByVault;

    event EntropyRecorded(uint256 indexed vaultId, bytes32 entropy);

    function recordEntropy(bytes32 entropy, uint256 vaultId) external {
        entropyByVault[vaultId].push(entropy);
        emit EntropyRecorded(vaultId, entropy);
    }

    function entropyCount(uint256 vaultId) external view returns (uint256) {
        return entropyByVault[vaultId].length;
    }
}
