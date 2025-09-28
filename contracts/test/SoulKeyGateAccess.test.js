const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulKeyGate", function () {
  let verifier;
  let gate;
  let user;

  const proof = {
    a: [1n, 2n],
    b: [
      [3n, 4n],
      [5n, 6n]
    ],
    c: [7n, 8n],
    publicSignals: [9n, 10n]
  };

  beforeEach(async function () {
    [user] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("MockZkProofVerifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Gate = await ethers.getContractFactory("SoulKeyGate");
    gate = await Gate.deploy(verifier.target);
    await gate.waitForDeployment();
  });

  it("grants access when the verifier approves the proof", async function () {
    await expect(gate.connect(user).grantAccess(proof.a, proof.b, proof.c, proof.publicSignals))
      .to.emit(gate, "AccessGranted")
      .withArgs(user.address);

    expect(await gate.hasAccess(user.address)).to.equal(true);
    expect(await gate.connect(user).accessVault()).to.equal(true);
  });

  it("reverts when the verifier rejects the proof", async function () {
    await verifier.setResult(false);
    await expect(gate.connect(user).grantAccess(proof.a, proof.b, proof.c, proof.publicSignals)).to.be.revertedWithCustomError(
      gate,
      "InvalidProof"
    );
  });

  it("allows the owner to revoke access", async function () {
    await gate.connect(user).grantAccess(proof.a, proof.b, proof.c, proof.publicSignals);
    await expect(gate.denyAccess(user.address)).to.emit(gate, "AccessDenied").withArgs(user.address);
    expect(await gate.hasAccess(user.address)).to.equal(false);
  });
});
