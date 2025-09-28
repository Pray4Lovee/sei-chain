const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossChainSoulKeyGate", function () {
  let owner;
  let remoteUser;
  let transmitter;
  let verifier;
  let gate;

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const proof = {
    a: [11n, 12n],
    b: [
      [13n, 14n],
      [15n, 16n]
    ],
    c: [17n, 18n],
    publicSignals: [19n, 20n]
  };

  beforeEach(async function () {
    [owner, remoteUser] = await ethers.getSigners();

    const Transmitter = await ethers.getContractFactory("MockMessageTransmitter");
    transmitter = await Transmitter.deploy();
    await transmitter.waitForDeployment();

    const Verifier = await ethers.getContractFactory("MockZkProofVerifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Gate = await ethers.getContractFactory("CrossChainSoulKeyGate");
    gate = await Gate.deploy(transmitter.target, verifier.target);
    await gate.waitForDeployment();
  });

  function encodeMessage(user) {
    return abiCoder.encode(
      ["address", "uint256[2]", "uint256[2][2]", "uint256[2]", "uint256[]"],
      [user.address, proof.a, proof.b, proof.c, proof.publicSignals]
    );
  }

  it("grants access for a valid attested proof", async function () {
    const message = encodeMessage(remoteUser);
    const attestation = "0x1234";

    await expect(gate.connect(remoteUser).grantAccessFromCrossChain(message, attestation))
      .to.emit(gate, "AccessGranted")
      .withArgs(remoteUser.address);

    expect(await gate.hasAccess(remoteUser.address)).to.equal(true);
    expect(await gate.connect(remoteUser).accessVault()).to.equal(true);
    expect(await transmitter.lastMessage()).to.equal(message);
    expect(await transmitter.lastAttestation()).to.equal(attestation);
  });

  it("reverts when the message attestation is invalid", async function () {
    await transmitter.setShouldSucceed(false);
    const message = encodeMessage(remoteUser);
    await expect(gate.grantAccessFromCrossChain(message, "0x"))
      .to.be.revertedWithCustomError(gate, "InvalidAttestation");
  });

  it("reverts when the zk proof fails validation", async function () {
    await verifier.setResult(false);
    const message = encodeMessage(remoteUser);
    await expect(gate.grantAccessFromCrossChain(message, "0x"))
      .to.be.revertedWithCustomError(gate, "InvalidProof");
  });

  it("allows the owner to update the verifier and transmitter", async function () {
    const Transmitter = await ethers.getContractFactory("MockMessageTransmitter");
    const newTransmitter = await Transmitter.deploy();
    await newTransmitter.waitForDeployment();

    const Verifier = await ethers.getContractFactory("MockZkProofVerifier");
    const newVerifier = await Verifier.deploy();
    await newVerifier.waitForDeployment();

    await expect(gate.setMessageTransmitter(newTransmitter.target))
      .to.emit(gate, "MessageTransmitterUpdated")
      .withArgs(newTransmitter.target);

    await expect(gate.setVerifier(newVerifier.target))
      .to.emit(gate, "VerifierUpdated")
      .withArgs(newVerifier.target);
  });

  it("allows the owner to revoke cross-chain access", async function () {
    const message = encodeMessage(remoteUser);
    await gate.grantAccessFromCrossChain(message, "0x");
    await expect(gate.denyAccess(remoteUser.address))
      .to.emit(gate, "AccessDenied")
      .withArgs(remoteUser.address);
    expect(await gate.hasAccess(remoteUser.address)).to.equal(false);
  });
});
