const { expect } = require("chai");
const { ethers } = require("hardhat");

function buildCctpMessage(router, recipient, amount, userId) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const messageBody = abiCoder.encode([
    "address",
    "uint256",
    "string",
  ], [
    recipient,
    amount,
    userId,
  ]);

  return abiCoder.encode([
    "uint32",
    "uint32",
    "uint32",
    "bytes32",
    "bytes32",
    "bytes32",
    "bytes32",
    "bytes",
  ], [
    0,
    2,
    7,
    ethers.zeroPadValue("0x1234", 32),
    ethers.zeroPadValue(router, 32),
    ethers.zeroPadValue(router, 32),
    ethers.ZeroHash,
    messageBody,
  ]);
}

describe("KeeperRoyaltyRouter", function () {
  let owner, user, merchant, verifier;
  let usdc, vault, router, transmitter;

  beforeEach(async function () {
    [owner, user, merchant, verifier] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const LumenCardVault = await ethers.getContractFactory("LumenCardVault");
    vault = await LumenCardVault.deploy(await usdc.getAddress(), owner.address, ethers.ZeroAddress, verifier.address);
    await vault.waitForDeployment();

    const MockMessageTransmitter = await ethers.getContractFactory("MockMessageTransmitter");
    transmitter = await MockMessageTransmitter.deploy(await usdc.getAddress());
    await transmitter.waitForDeployment();

    const KeeperRoyaltyRouter = await ethers.getContractFactory("KeeperRoyaltyRouter");
    router = await KeeperRoyaltyRouter.deploy(
      await vault.getAddress(),
      await transmitter.getAddress(),
      await usdc.getAddress()
    );
    await router.waitForDeployment();

    await transmitter.setRouter(await router.getAddress());
    await usdc.setMinter(await transmitter.getAddress());
    await vault.setKeeperRouter(await router.getAddress());
  });

  it("credits the vault after a valid Circle attestation", async function () {
    const amount = 1_000_000n;
    const message = buildCctpMessage(
      await router.getAddress(),
      user.address,
      amount,
      "sei1user"
    );
    const attestation = ethers.hexlify(ethers.randomBytes(32));

    await expect(router.settleRoyalty(message, attestation))
      .to.emit(router, "RoyaltySettled")
      .withArgs(user.address, amount, "sei1user", 2);

    const [spendable] = await vault.balanceOf(user.address);
    expect(spendable).to.equal(amount);

    expect(await usdc.balanceOf(await vault.getAddress())).to.equal(amount);
    expect(await usdc.balanceOf(await router.getAddress())).to.equal(0);
  });

  it("requires the message transmitter to succeed", async function () {
    await transmitter.setShouldRevert(true);
    const message = buildCctpMessage(
      await router.getAddress(),
      user.address,
      1_000n,
      "sei1user"
    );

    await expect(router.settleRoyalty(message, "0x"))
      .to.be.revertedWith("Circle attestation failed");
  });

  it("blocks spending without Holo verification", async function () {
    const amount = 500_000n;
    const message = buildCctpMessage(
      await router.getAddress(),
      user.address,
      amount,
      "sei1user"
    );

    await router.settleRoyalty(message, "0x");

    await expect(vault.connect(user).spend(merchant.address, amount))
      .to.be.revertedWith("holo verification required");

    await vault.connect(verifier).updateHoloStatus(user.address, true);

    const spendAmount = 200_000n;
    await expect(vault.connect(user).spend(merchant.address, spendAmount))
      .to.emit(vault, "Spend")
      .withArgs(user.address, merchant.address, spendAmount);

    const [spendable] = await vault.balanceOf(user.address);
    expect(spendable).to.equal(amount - spendAmount);
    expect(await usdc.balanceOf(merchant.address)).to.equal(spendAmount);
  });
});
