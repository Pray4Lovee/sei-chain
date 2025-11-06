const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossChainSoulKeyGate", function () {
  let owner;
  let user;
  let gateContract;
  let verifierContract;

  const toBytes = (value) => ethers.hexlify(ethers.toUtf8Bytes(value));
  const chainId = (name) => ethers.id(name);

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("MockZkMultiFactorProofVerifier");
    verifierContract = await Verifier.deploy();

    const Gate = await ethers.getContractFactory("CrossChainSoulKeyGate");
    gateContract = await Gate.deploy(await verifierContract.getAddress(), owner.address);
  });

  it("grants access with a valid Sei proof", async function () {
    const proof = toBytes("sei-proof");
    const publicSignals = toBytes("sei-public");
    const sourceChain = chainId("sei");

    await verifierContract.setVerificationResult(proof, publicSignals, true);

    await expect(
      gateContract
        .connect(owner)
        .grantAccessFromCrossChain(user.address, sourceChain, proof, publicSignals)
    )
      .to.emit(gateContract, "CrossChainAccessGranted")
      .withArgs(
        user.address,
        sourceChain,
        ethers.keccak256(ethers.concat([proof, publicSignals]))
      );

    expect(await gateContract.hasVaultAccess(user.address)).to.equal(true);
    expect(await gateContract.hasChainAccess(user.address, sourceChain)).to.equal(true);

    const chains = await gateContract.getAccessChains(user.address);
    expect(chains).to.deep.equal([sourceChain]);
  });

  it("rejects invalid proofs from Solana", async function () {
    const proof = toBytes("invalid-solana-proof");
    const publicSignals = toBytes("invalid-signal");
    const sourceChain = chainId("solana");

    await expect(
      gateContract
        .connect(owner)
        .grantAccessFromCrossChain(user.address, sourceChain, proof, publicSignals)
    ).to.be.revertedWith("Invalid zk proof");
  });

  it("tracks multi-chain eligibility across Sei, Polygon, and Solana", async function () {
    const seiProof = toBytes("sei-proof");
    const seiSignals = toBytes("sei-signal");
    const polygonProof = toBytes("polygon-proof");
    const polygonSignals = toBytes("polygon-signal");
    const solanaProof = toBytes("solana-proof");
    const solanaSignals = toBytes("solana-signal");

    const sei = chainId("sei");
    const polygon = chainId("polygon");
    const solana = chainId("solana");

    await verifierContract.setVerificationResult(seiProof, seiSignals, true);
    await gateContract
      .connect(owner)
      .grantAccessFromCrossChain(user.address, sei, seiProof, seiSignals);

    await verifierContract.setVerificationResult(polygonProof, polygonSignals, true);
    await gateContract
      .connect(owner)
      .grantAccessFromCrossChain(user.address, polygon, polygonProof, polygonSignals);

    await verifierContract.setVerificationResult(solanaProof, solanaSignals, true);
    await gateContract
      .connect(owner)
      .grantAccessFromCrossChain(user.address, solana, solanaProof, solanaSignals);

    expect(await gateContract.hasVaultAccess(user.address)).to.equal(true);
    expect(await gateContract.hasChainAccess(user.address, sei)).to.equal(true);
    expect(await gateContract.hasChainAccess(user.address, polygon)).to.equal(true);
    expect(await gateContract.hasChainAccess(user.address, solana)).to.equal(true);

    const chains = await gateContract.getAccessChains(user.address);
    expect(chains).to.have.lengthOf(3);
    expect(chains).to.include.members([sei, polygon, solana]);
  });
});
