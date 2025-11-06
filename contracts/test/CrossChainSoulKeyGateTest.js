const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossChainSoulKeyGate", function () {
  async function deployFixture() {
    const [deployer, userSei, userPolygon, wormholeRelayer] = await ethers.getSigners();

    const Gate = await ethers.getContractFactory("CrossChainSoulKeyGate");
    const Transmitter = await ethers.getContractFactory("BasicMessageTransmitter");
    const SeiBridge = await ethers.getContractFactory("SeiToEvmBridge");
    const PolygonBridge = await ethers.getContractFactory("PolygonSoulKeyGate");
    const SolanaBridge = await ethers.getContractFactory("SolanaToEvmBridge");

    const gate = await Gate.deploy(ethers.ZeroAddress, ethers.ZeroAddress);
    const transmitter = await Transmitter.deploy(gate.target);
    const seiBridge = await SeiBridge.deploy(transmitter.target);
    const polygonBridge = await PolygonBridge.deploy(transmitter.target);
    const solanaBridge = await SolanaBridge.deploy(wormholeRelayer.address, gate.target);

    await Promise.all([
      gate.waitForDeployment(),
      transmitter.waitForDeployment(),
      seiBridge.waitForDeployment(),
      polygonBridge.waitForDeployment(),
      solanaBridge.waitForDeployment()
    ]);

    await gate.setMessageTransmitter(transmitter.target);
    await gate.setSolanaRelayer(solanaBridge.target);
    await gate.registerBridge(seiBridge.target, 1); // SourceChain.Sei
    await gate.registerBridge(polygonBridge.target, 2); // SourceChain.Polygon

    return {
      deployer,
      userSei,
      userPolygon,
      wormholeRelayer,
      gate,
      transmitter,
      seiBridge,
      polygonBridge,
      solanaBridge
    };
  }

  it("records access grants from Sei CCIP messages", async function () {
    const { userSei, gate, seiBridge } = await deployFixture();
    const proofHash = ethers.id("sei-proof-hash");

    await expect(seiBridge.transferToEVM(userSei.address, 5n, proofHash)).to.emit(seiBridge, "SeiProofForwarded");

    const [isValid, storedProofHash, source, amount] = await gate
      .getAccessGrant(userSei.address)
      .then(result => [result[0], result[1], result[2], result[3]]);

    expect(isValid).to.equal(true);
    expect(storedProofHash).to.equal(proofHash);
    expect(source).to.equal(1n); // SourceChain.Sei
    expect(amount).to.equal(5n);
    expect(await gate.hasAccess(userSei.address)).to.equal(true);
  });

  it("supports Polygon bridge metadata and grant revocation", async function () {
    const { gate, polygonBridge, userPolygon } = await deployFixture();
    const proofHash = ethers.id("polygon-proof");
    const metadata = ethers.AbiCoder.defaultAbiCoder().encode([
      "string",
      "bytes32"
    ], ["polygon", proofHash]);

    await expect(
      polygonBridge.grantAccessFromPolygon(userPolygon.address, 42n, proofHash, metadata)
    ).to.emit(polygonBridge, "PolygonProofForwarded");

    const [isValid, storedProofHash, source, amount, timestamp, attestationHash] = await gate.getAccessGrant(
      userPolygon.address
    );

    expect(isValid).to.equal(true);
    expect(storedProofHash).to.equal(proofHash);
    expect(source).to.equal(2n); // SourceChain.Polygon
    expect(amount).to.equal(42n);
    expect(timestamp).to.be.greaterThan(0);
    expect(attestationHash).to.not.equal(ethers.ZeroHash);

    await expect(gate.revokeAccess(userPolygon.address)).to.emit(gate, "AccessRevoked");
    const [validAfter] = await gate.getAccessGrant(userPolygon.address);
    expect(validAfter).to.equal(false);
  });

  it("receives Wormhole proofs for Solana access", async function () {
    const { gate, solanaBridge, wormholeRelayer } = await deployFixture();
    const proofHash = ethers.id("solana-proof");
    const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode([
      "address",
      "bytes32",
      "uint256"
    ], [wormholeRelayer.address, proofHash, 7n]);

    await expect(
      solanaBridge.connect(wormholeRelayer).receiveSolanaProof(encodedProof, ethers.toUtf8Bytes("wormhole"))
    ).to.emit(solanaBridge, "SolanaProofForwarded");

    const [isValid, storedProofHash, source, amount] = await gate
      .getAccessGrant(wormholeRelayer.address)
      .then(result => [result[0], result[1], result[2], result[3]]);

    expect(isValid).to.equal(true);
    expect(storedProofHash).to.equal(proofHash);
    expect(source).to.equal(3n); // SourceChain.Solana
    expect(amount).to.equal(7n);
  });
});
