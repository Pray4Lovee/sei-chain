// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {LumenCardVault} from "../src/LumenCardVault.sol";
import {TestToken} from "../src/TestToken.sol";

contract LumenCardVaultTest is Test {
    LumenCardVault internal vault;
    TestToken internal token;

    address internal owner = address(this);
    address internal keeper = address(0xBEEF);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        token = new TestToken("Test USDC", "tUSDC");
        vault = new LumenCardVault(token);
        vault.setKeeperRouter(keeper);
    }

    function testCreditRequiresKeeper() public {
        vm.expectRevert(LumenCardVault.Unauthorized.selector);
        vault.credit(alice, 100);

        vm.prank(keeper);
        vault.credit(alice, 100);
        (uint256 spendable,) = vault.balanceOf(alice);
        assertEq(spendable, 100);
    }

    function testSpendRequiresVerification() public {
        vm.prank(keeper);
        vault.credit(alice, 500);
        token.transfer(address(vault), 500);

        vm.expectRevert(LumenCardVault.VerificationRequired.selector);
        vm.prank(alice);
        vault.spend(bob, 200);

        vault.markHoloVerified(alice, true);
        vm.prank(alice);
        vault.spend(bob, 200);

        (uint256 spendable,) = vault.balanceOf(alice);
        assertEq(spendable, 300);
        assertEq(token.balanceOf(bob), 200);
    }

    function testSpendRejectsInsufficientBalance() public {
        vault.markHoloVerified(alice, true);
        vm.expectRevert(LumenCardVault.InsufficientBalance.selector);
        vm.prank(alice);
        vault.spend(bob, 1);
    }
}
