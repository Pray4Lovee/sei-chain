const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulSigilNFT", function () {
  let owner;
  let minter;
  let claimant;
  let other;
  let soulSigil;

  const sampleUri =
    "data:application/json;base64,eyJuYW1lIjoiU291bFNpZ2lsIzEiLCJkZXNjcmlwdGlvbiI6IlJveWFsdHkgY2xhaW0gc291bmRicmFuZCBwcm9vZiIsImF0dHJpYnV0ZXMiOlt7InRyYWl0X3R5cGUiOiJBbW91bnQiLCJ2YWx1ZSI6IjQuMiBVU0RDI" +
    "n0seyJ0cmFpdF90eXBlIjoiQ2hhaW4iLCJ2YWx1ZSI6IlNlaSJ9XX0=";

  beforeEach(async function () {
    [owner, minter, claimant, other] = await ethers.getSigners();

    const SoulSigilNFT = await ethers.getContractFactory("SoulSigilNFT");
    soulSigil = await SoulSigilNFT.deploy();
    await soulSigil.waitForDeployment();
  });

  it("allows only approved minters to mint soul sigils", async function () {
    await expect(
      soulSigil.connect(minter).mint(claimant.address, sampleUri)
    ).to.be.revertedWith("not approved");

    await expect(soulSigil.setMinter(minter.address, true))
      .to.emit(soulSigil, "MinterUpdated")
      .withArgs(minter.address, true);

    const tx = await soulSigil.connect(minter).mint(claimant.address, sampleUri);
    await tx.wait();

    expect(await soulSigil.ownerOf(0n)).to.equal(claimant.address);
    expect(await soulSigil.tokenURI(0n)).to.equal(sampleUri);
  });

  it("prevents transferring soulbound tokens", async function () {
    await soulSigil.setMinter(minter.address, true);
    await soulSigil.connect(minter).mint(claimant.address, sampleUri);

    await expect(
      soulSigil.connect(claimant).transferFrom(claimant.address, other.address, 0n)
    ).to.be.revertedWith("Soulbound: no transfers");

    await expect(
      soulSigil
        .connect(claimant)
        ["safeTransferFrom(address,address,uint256)"](claimant.address, other.address, 0n)
    ).to.be.revertedWith("Soulbound: no transfers");
  });
});

