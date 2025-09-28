import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("CrossChainSoulKeyGate", () => {
  async function deployGateFixture() {
    const [owner, user, other] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("MockZkMultiFactorProofVerifier");
    const verifier = await Verifier.deploy();

    const MessageTransmitter = await ethers.getContractFactory("MockMessageTransmitter");
    const transmitter = await MessageTransmitter.deploy();

    const Gate = await ethers.getContractFactory("CrossChainSoulKeyGate");
    const gate = await Gate.deploy(await verifier.getAddress(), await transmitter.getAddress());

    return { owner, user, other, verifier, transmitter, gate };
  }

  function randomBytes(size: number): string {
    return ethers.hexlify(ethers.randomBytes(size));
  }

  it("grants access with a valid local proof", async () => {
    const { gate, verifier, user } = await loadFixture(deployGateFixture);

    const proof = randomBytes(96);
    const publicInputs = randomBytes(128);
    const nullifier = ethers.keccak256(randomBytes(32));

    await verifier.setExpectation(proof, publicInputs, true);

    await expect(gate.grantAccess(user.address, nullifier, proof, publicInputs))
      .to.emit(gate, "AccessGranted")
      .withArgs(user.address, nullifier, 0);

    expect(await gate.hasVaultAccess(user.address)).to.equal(true);
    expect(await gate.hasConsumedNullifier(nullifier)).to.equal(true);
  });

  it("prevents nullifier reuse", async () => {
    const { gate, verifier, user, other } = await loadFixture(deployGateFixture);

    const proof = randomBytes(96);
    const publicInputs = randomBytes(128);
    const nullifier = ethers.keccak256(randomBytes(32));

    await verifier.setExpectation(proof, publicInputs, true);
    await gate.grantAccess(user.address, nullifier, proof, publicInputs);

    const newProof = randomBytes(96);
    const newInputs = randomBytes(64);
    await verifier.setExpectation(newProof, newInputs, true);

    await expect(
      gate.grantAccess(other.address, nullifier, newProof, newInputs)
    ).to.be.revertedWithCustomError(gate, "NullifierAlreadyUsed");
  });

  it("reverts when the verifier rejects the proof", async () => {
    const { gate, user } = await loadFixture(deployGateFixture);

    const proof = randomBytes(32);
    const publicInputs = randomBytes(32);
    const nullifier = ethers.keccak256(randomBytes(32));

    await expect(
      gate.grantAccess(user.address, nullifier, proof, publicInputs)
    ).to.be.revertedWithCustomError(gate, "InvalidProof");
  });

  it("grants access via cross-chain message", async () => {
    const { gate, verifier, user } = await loadFixture(deployGateFixture);

    const proof = randomBytes(96);
    const publicInputs = randomBytes(64);
    const nullifier = ethers.keccak256(randomBytes(32));

    await verifier.setExpectation(proof, publicInputs, true);

    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,bytes32,bytes,bytes)"],
      [[user.address, nullifier, proof, publicInputs]]
    );

    const attestation = "0x";

    await expect(gate.grantAccessFromCrossChain(payload, attestation))
      .to.emit(gate, "AccessGranted")
      .withArgs(user.address, nullifier, 1);
  });

  it("reverts when the message transmitter rejects the message", async () => {
    const { gate, verifier, transmitter, user } = await loadFixture(deployGateFixture);

    const proof = randomBytes(96);
    const publicInputs = randomBytes(64);
    const nullifier = ethers.keccak256(randomBytes(32));
    await verifier.setExpectation(proof, publicInputs, true);

    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,bytes32,bytes,bytes)"],
      [[user.address, nullifier, proof, publicInputs]]
    );

    await transmitter.setAcceptance(false);

    await expect(
      gate.grantAccessFromCrossChain(payload, "0x")
    ).to.be.revertedWithCustomError(gate, "MessageRejected");
  });
});
