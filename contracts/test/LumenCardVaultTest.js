const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LumenCardVault", function () {
  async function deployFixture() {
    const [deployer, user, merchant, royaltyReceiver] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    const stable = await TestToken.deploy("Mock USDC", "mUSDC");
    await stable.waitForDeployment();

    const LumenCardVault = await ethers.getContractFactory("LumenCardVault");
    const vault = await LumenCardVault.deploy(
      await stable.getAddress(),
      royaltyReceiver.address,
      800n
    );
    await vault.waitForDeployment();

    await stable.connect(deployer).setBalance(user.address, ethers.parseUnits("1000", 18));

    return { vault, stable, deployer, user, merchant, royaltyReceiver };
  }

  it("splits deposits between royalty and spendable balance", async function () {
    const { vault, stable, user, royaltyReceiver } = await deployFixture();

    const depositAmount = ethers.parseUnits("100", 18);
    await stable.connect(user).approve(await vault.getAddress(), depositAmount);
    await expect(vault.connect(user).deposit(depositAmount))
      .to.emit(vault, "Deposit")
      .withArgs(user.address, depositAmount, depositAmount * 800n / 10000n, depositAmount - depositAmount * 800n / 10000n);

    const balance = await vault.balances(user.address);
    expect(balance.spendable).to.equal(depositAmount - depositAmount * 800n / 10000n);
    expect(balance.lifetimeDeposits).to.equal(depositAmount);

    expect(await stable.balanceOf(royaltyReceiver.address)).to.equal(depositAmount * 800n / 10000n);
  });

  it("allows users to spend their balance", async function () {
    const { vault, stable, user, merchant } = await deployFixture();

    const depositAmount = ethers.parseUnits("50", 18);
    await stable.connect(user).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user).deposit(depositAmount);

    const spendAmount = ethers.parseUnits("10", 18);
    await expect(vault.connect(user).spend(merchant.address, spendAmount))
      .to.emit(vault, "Spend")
      .withArgs(user.address, merchant.address, spendAmount);

    const balance = await vault.balances(user.address);
    expect(balance.spendable).to.equal(depositAmount - depositAmount * 800n / 10000n - spendAmount);
    expect(await stable.balanceOf(merchant.address)).to.equal(spendAmount);
  });

  it("reverts when spending more than available", async function () {
    const { vault, stable, user, merchant } = await deployFixture();

    const depositAmount = ethers.parseUnits("1", 18);
    await stable.connect(user).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user).deposit(depositAmount);

    const spendAmount = ethers.parseUnits("2", 18);
    await expect(vault.connect(user).spend(merchant.address, spendAmount)).to.be.revertedWith("insufficient balance");
  });
});
