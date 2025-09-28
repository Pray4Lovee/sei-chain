// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {CrossChainSoulKeyGate} from "../src/crosschain/CrossChainSoulKeyGate.sol";

contract MockVerifier is CrossChainSoulKeyGate.IZkMultiFactorProofVerifier {
    bool private _shouldVerify = true;

    function setVerificationResult(bool shouldVerify) external {
        _shouldVerify = shouldVerify;
    }

    function verifyProof(bytes calldata, uint256[] calldata) external view override returns (bool) {
        return _shouldVerify;
    }
}

contract CrossChainSoulKeyGateTest is Test {
    MockVerifier private verifier;
    CrossChainSoulKeyGate private gate;

    address private constant MESSAGE_TRANSMITTER = address(0xCC1P);
    address private constant ACCOUNT = address(0xBEEF);
    bytes32 private constant MERKLE_ROOT = bytes32(uint256(1));

    function setUp() public {
        verifier = new MockVerifier();
        gate = new CrossChainSoulKeyGate(address(verifier), MESSAGE_TRANSMITTER);
        gate.setMerkleRootStatus(MERKLE_ROOT, true);
    }

    function testGrantAccessLocally() public {
        bytes memory proof = hex"1234";
        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = 42;
        publicInputs[1] = 7;
        publicInputs[2] = 9001;
        bytes32 nullifier = keccak256("local-nullifier");

        gate.grantAccess(proof, publicInputs, MERKLE_ROOT, nullifier, ACCOUNT);

        assertTrue(gate.hasAccess(ACCOUNT));
        assertTrue(gate.consumedNullifiers(nullifier));
    }

    function testGrantAccessFromCrossChain() public {
        bytes memory proof = hex"abcd";
        uint256[] memory publicInputs = new uint256[](2);
        publicInputs[0] = 8;
        publicInputs[1] = 9;
        bytes32 nullifier = keccak256("cross-nullifier");

        CrossChainSoulKeyGate.CrossChainProofPayload memory payload = CrossChainSoulKeyGate
            .CrossChainProofPayload({account: ACCOUNT, proof: proof, publicInputs: publicInputs, merkleRoot: MERKLE_ROOT, nullifier: nullifier});

        CrossChainSoulKeyGate.CrossChainAttestation memory meta = CrossChainSoulKeyGate.CrossChainAttestation({
            account: ACCOUNT,
            sourceChain: bytes32(uint256(731))
        });

        bytes memory message = abi.encode(payload);
        bytes memory attestation = abi.encode(meta);

        vm.prank(MESSAGE_TRANSMITTER);
        gate.grantAccessFromCrossChain(message, attestation);

        assertTrue(gate.hasAccess(ACCOUNT));
        assertTrue(gate.consumedNullifiers(nullifier));
    }

    function testRevertsWhenNullifierReused() public {
        bytes memory proof = hex"abcd";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 11;
        bytes32 nullifier = keccak256("reused");

        gate.grantAccess(proof, publicInputs, MERKLE_ROOT, nullifier, ACCOUNT);
        vm.expectRevert(CrossChainSoulKeyGate.NullifierAlreadyUsed.selector);
        gate.grantAccess(proof, publicInputs, MERKLE_ROOT, nullifier, ACCOUNT);
    }

    function testRevertsWithUnknownMerkleRoot() public {
        bytes memory proof = hex"abcd";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 77;
        bytes32 nullifier = keccak256("unknown-root");

        bytes32 unknownRoot = bytes32(uint256(999));

        vm.expectRevert(abi.encodeWithSelector(CrossChainSoulKeyGate.UnknownMerkleRoot.selector, unknownRoot));
        gate.grantAccess(proof, publicInputs, unknownRoot, nullifier, ACCOUNT);
    }

    function testRevertsWhenVerifierRejects() public {
        bytes memory proof = hex"ffff";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 55;
        bytes32 nullifier = keccak256("bad-proof");

        verifier.setVerificationResult(false);
        vm.expectRevert(CrossChainSoulKeyGate.ProofVerificationFailed.selector);
        gate.grantAccess(proof, publicInputs, MERKLE_ROOT, nullifier, ACCOUNT);
    }

    function testRevertsWhenAccountIsZero() public {
        bytes memory proof = hex"aa";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 13;
        bytes32 nullifier = keccak256("zero-account");

        vm.expectRevert(
            abi.encodeWithSelector(CrossChainSoulKeyGate.InvalidAccount.selector, address(0))
        );
        gate.grantAccess(proof, publicInputs, MERKLE_ROOT, nullifier, address(0));
    }

    function testRevertsWhenAttestationMismatched() public {
        bytes memory proof = hex"abcd";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 1;
        bytes32 nullifier = keccak256("cross-mismatch");

        CrossChainSoulKeyGate.CrossChainProofPayload memory payload = CrossChainSoulKeyGate.CrossChainProofPayload({
            account: ACCOUNT,
            proof: proof,
            publicInputs: publicInputs,
            merkleRoot: MERKLE_ROOT,
            nullifier: nullifier
        });

        CrossChainSoulKeyGate.CrossChainAttestation memory meta = CrossChainSoulKeyGate.CrossChainAttestation({
            account: address(0x1234),
            sourceChain: bytes32(uint256(99))
        });

        bytes memory message = abi.encode(payload);
        bytes memory attestation = abi.encode(meta);

        vm.prank(MESSAGE_TRANSMITTER);
        vm.expectRevert(
            abi.encodeWithSelector(
                CrossChainSoulKeyGate.AttestedAccountMismatch.selector,
                meta.account,
                payload.account
            )
        );
        gate.grantAccessFromCrossChain(message, attestation);
    }

    function testRevertsForUntrustedTransmitter() public {
        bytes memory proof = hex"abcd";
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 2;
        bytes32 nullifier = keccak256("bad-transmitter");

        CrossChainSoulKeyGate.CrossChainProofPayload memory payload = CrossChainSoulKeyGate.CrossChainProofPayload({
            account: ACCOUNT,
            proof: proof,
            publicInputs: publicInputs,
            merkleRoot: MERKLE_ROOT,
            nullifier: nullifier
        });

        CrossChainSoulKeyGate.CrossChainAttestation memory meta = CrossChainSoulKeyGate.CrossChainAttestation({
            account: ACCOUNT,
            sourceChain: bytes32(uint256(12))
        });

        bytes memory message = abi.encode(payload);
        bytes memory attestation = abi.encode(meta);

        vm.expectRevert(abi.encodeWithSelector(CrossChainSoulKeyGate.InvalidMessageTransmitter.selector, address(this)));
        gate.grantAccessFromCrossChain(message, attestation);
    }
}
