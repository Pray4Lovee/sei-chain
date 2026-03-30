// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISoulSigil {
    function balanceOf(address owner) external view returns (uint256);
}

contract RoyaltyRouter {
    address public immutable creator;
    uint256 public immutable royaltyBps;
    ISoulSigil public immutable soulSigil;

    error WalletNotProofBound();

    constructor(address _creator, uint256 _royaltyBps, address _soulSigil) {
        require(_royaltyBps <= 10_000, "bps");
        creator = _creator;
        royaltyBps = _royaltyBps;
        soulSigil = ISoulSigil(_soulSigil);
    }

    function enforceRoyalty(address payable recipient) external payable {
        if (soulSigil.balanceOf(msg.sender) == 0) revert WalletNotProofBound();
        uint256 royalty = (msg.value * royaltyBps) / 10000;
        payable(creator).transfer(royalty);
        recipient.transfer(msg.value - royalty);
    }
}
