// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract VaultSigilLink {
    address public admin;

    mapping(uint256 => uint256) public vaultToSigil;

    event VaultLinked(uint256 indexed vaultId, uint256 indexed sigilId);
    event VaultUnlinked(uint256 indexed vaultId, uint256 indexed sigilId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr) {
        admin = adminAddr;
    }

    function linkSigil(uint256 vaultId, uint256 sigilId) external onlyAdmin {
        vaultToSigil[vaultId] = sigilId;
        emit VaultLinked(vaultId, sigilId);
    }

    function unlinkSigil(uint256 vaultId) external onlyAdmin {
        uint256 sigilId = vaultToSigil[vaultId];
        delete vaultToSigil[vaultId];
        emit VaultUnlinked(vaultId, sigilId);
    }
}
