// SPDX-License-Identifier: Sovereign-Attribution
pragma solidity ^0.8.20;

contract OmegaGuardianRuleset {
    address public admin;
    mapping(address => bool) public finalSealSigners;

    event FinalSealSignerSet(address indexed signer, bool allowed);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(address adminAddr) {
        admin = adminAddr;
    }

    function setFinalSealSigner(address signer, bool allowed)
        external
        onlyAdmin
    {
        finalSealSigners[signer] = allowed;
        emit FinalSealSignerSet(signer, allowed);
    }

    function isSignerAllowed(address signer) external view returns (bool) {
        return finalSealSigners[signer];
    }
}
