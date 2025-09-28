const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulKeyNFT", function () {
  async function deployFixture() {
    const [deployer, user, other] = await ethers.getSigners();

    const verifierFactory = await ethers.getContractFactory("MockZkSoulProofVerifier");
    const verifier = await verifierFactory.deploy();

    const soulKeyFactory = await ethers.getContractFactory("SoulKeyNFT");
    const soulKey = await soulKeyFactory.deploy(await verifier.getAddress(), "https://example.com/");

    return { deployer, user, other, verifier, soulKey };
  }

  function dummyProofInputs(nullifier) {
    const root = 1n;
    const nullifierHash = nullifier ?? 2n;
    const signalHash = 3n;
    const publicSignals = [root, nullifierHash, signalHash];

    const a = [0n, 0n];
    const b = [
      [0n, 0n],
      [0n, 0n],
    ];
    const c = [0n, 0n];

    return { a, b, c, publicSignals };
  }

  it("mints a soul key when the proof verifies", async function () {
    const { user, soulKey } = await deployFixture();

    const proof = dummyProofInputs();
    await expect(soulKey.connect(user).mintWithZk(proof.a, proof.b, proof.c, proof.publicSignals))
      .to.emit(soulKey, "SoulKeyMinted")
      .withArgs(await user.getAddress(), 1n, ethers.toBeHex(proof.publicSignals[1], 32));

    expect(await soulKey.hasMinted(await user.getAddress())).to.equal(true);
    expect(await soulKey.balanceOf(await user.getAddress())).to.equal(1n);
  });

  it("prevents the same address from minting twice", async function () {
    const { user, soulKey } = await deployFixture();
    const proof = dummyProofInputs();

    await soulKey.connect(user).mintWithZk(proof.a, proof.b, proof.c, proof.publicSignals);

    await expect(
      soulKey.connect(user).mintWithZk(proof.a, proof.b, proof.c, proof.publicSignals)
    ).to.be.revertedWithCustomError(soulKey, "AlreadyMinted");
  });

  it("blocks re-use of a nullifier", async function () {
    const { user, other, soulKey } = await deployFixture();
    const sharedProof = dummyProofInputs(5n);

    await soulKey.connect(user).mintWithZk(sharedProof.a, sharedProof.b, sharedProof.c, sharedProof.publicSignals);

    await expect(
      soulKey.connect(other).mintWithZk(sharedProof.a, sharedProof.b, sharedProof.c, sharedProof.publicSignals)
    ).to.be.revertedWithCustomError(soulKey, "NullifierAlreadyUsed");
  });

  it("reverts when the verifier reports failure", async function () {
    const { user, soulKey, verifier } = await deployFixture();
    await verifier.setShouldVerify(false);

    const proof = dummyProofInputs();
    await expect(
      soulKey.connect(user).mintWithZk(proof.a, proof.b, proof.c, proof.publicSignals)
    ).to.be.revertedWithCustomError(soulKey, "InvalidProof");
  });
});
