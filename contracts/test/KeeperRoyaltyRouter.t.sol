// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {KeeperRoyaltyRouter, ILumenCardVault, IMessageTransmitter} from "../src/KeeperRoyaltyRouter.sol";

contract MockMessageTransmitter is IMessageTransmitter {
    bytes public lastMessage;
    bytes public lastAttestation;
    bool public shouldSucceed = true;

    function setShouldSucceed(bool value) external {
        shouldSucceed = value;
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation) external override returns (bool) {
        lastMessage = message;
        lastAttestation = attestation;
        return shouldSucceed;
    }
}

contract MockVault is ILumenCardVault {
    address public lastUser;
    uint256 public lastAmount;
    uint256 public creditCount;

    function credit(address user, uint256 amount) external override {
        lastUser = user;
        lastAmount = amount;
        creditCount += 1;
    }
}

contract KeeperRoyaltyRouterTest is Test {
    KeeperRoyaltyRouter internal router;
    MockVault internal vault;
    MockMessageTransmitter internal transmitter;

    address internal admin = address(0xA11CE);
    address internal user = address(0xBEEF);

    function setUp() public {
        vm.prank(admin);
        vault = new MockVault();
        transmitter = new MockMessageTransmitter();
        vm.prank(admin);
        router = new KeeperRoyaltyRouter(address(vault), address(transmitter));
        vm.prank(admin);
        router.transferOwnership(admin);
    }

    function testSettleRoyaltyDecodesPayload() public {
        bytes memory payload = abi.encode(user, uint256(1_000_000), string("sei1user"));

        vm.prank(address(0x1234));
        router.settleRoyalty(payload, bytes("attestation"));

        assertEq(vault.lastUser(), user);
        assertEq(vault.lastAmount(), 1_000_000);
        assertEq(vault.creditCount(), 1);
        assertEq(transmitter.lastMessage(), payload);
        assertEq(transmitter.lastAttestation(), bytes("attestation"));
    }

    function testSettleRoyaltyRevertsOnFailedAttestation() public {
        transmitter.setShouldSucceed(false);
        bytes memory payload = abi.encode(user, uint256(5));

        vm.expectRevert(KeeperRoyaltyRouter.AttestationFailed.selector);
        router.settleRoyalty(payload, bytes("bad"));
    }

    function testUpdateVaultOnlyOwner() public {
        address newVault = address(0xCAFE);
        vm.expectRevert(KeeperRoyaltyRouter.NotOwner.selector);
        vm.prank(address(0x2));
        router.updateVault(newVault);

        vm.prank(admin);
        router.updateVault(newVault);
        assertEq(router.lumenCardVault(), newVault);
    }
}
