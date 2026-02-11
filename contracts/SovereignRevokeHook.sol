// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

interface ICodexSigilRevoke {
    function revokeSigil(uint256 sigilId) external;
}

contract SovereignRevokeHook {
    address public admin;
    ICodexSigilRevoke public sigil;

    event SigilRevoked(uint256 indexed sigilId, address indexed revoker);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr, address sigilAddr) {
        admin = adminAddr;
        sigil = ICodexSigilRevoke(sigilAddr);
    }

    function revokeSigil(uint256 sigilId) external onlyAdmin {
        sigil.revokeSigil(sigilId);
        emit SigilRevoked(sigilId, msg.sender);
    }
}
