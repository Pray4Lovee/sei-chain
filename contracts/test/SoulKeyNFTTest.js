const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulKeyNFT", function () {
    let owner;
    let alice;
    let bob;
    let verifier;
    let soulKey;

    const root = 123n;
    const proofParams = {
        a: [0n, 0n],
        b: [[0n, 0n], [0n, 0n]],
        c: [0n, 0n],
    };

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();
        const verifierFactory = await ethers.getContractFactory("MockZkSoulProofVerifier");
        verifier = await verifierFactory.deploy();
        await verifier.waitForDeployment();

        const soulKeyFactory = await ethers.getContractFactory("SoulKeyNFT");
        soulKey = await soulKeyFactory.deploy(await verifier.getAddress(), root, "https://example.com/");
        await soulKey.waitForDeployment();
    });

    it("mints with a valid proof", async function () {
        await verifier.connect(owner).setShouldVerify(true);
        const signals = [root, 456n, 789n];

        await expect(soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, signals))
            .to.emit(soulKey, "SoulKeyMinted")
            .withArgs(alice.address, 1n, signals[1], signals[2]);

        expect(await soulKey.ownerOf(1n)).to.equal(alice.address);
        expect(await soulKey.hasMinted(alice.address)).to.equal(true);
        expect(await soulKey.isNullifierUsed(ethers.zeroPadValue(ethers.toBeHex(signals[1]), 32))).to.equal(true);
    });

    it("rejects proofs for unknown roots", async function () {
        await verifier.connect(owner).setShouldVerify(true);
        const signals = [999n, 456n, 789n];
        await expect(soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, signals)).to.be.revertedWith(
            "unknown merkle root"
        );
    });

    it("rejects invalid proofs", async function () {
        await verifier.connect(owner).setShouldVerify(false);
        const signals = [root, 456n, 789n];
        await expect(soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, signals)).to.be.revertedWith(
            "invalid ZK proof"
        );
    });

    it("prevents nullifier re-use", async function () {
        await verifier.connect(owner).setShouldVerify(true);
        const signals = [root, 456n, 789n];
        await soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, signals);
        await expect(soulKey.connect(bob).mintWithZk(proofParams.a, proofParams.b, proofParams.c, signals)).to.be.revertedWith(
            "nullifier already used"
        );
    });

    it("blocks multiple mints per account", async function () {
        await verifier.connect(owner).setShouldVerify(true);
        const firstSignals = [root, 456n, 789n];
        const secondSignals = [root, 999n, 111n];

        await soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, firstSignals);
        await expect(
            soulKey.connect(alice).mintWithZk(proofParams.a, proofParams.b, proofParams.c, secondSignals)
        ).to.be.revertedWith("already minted");
    });

    it("allows the owner to update the merkle root", async function () {
        const newRoot = 777n;
        await expect(soulKey.connect(owner).setMerkleRoot(newRoot))
            .to.emit(soulKey, "MerkleRootUpdated")
            .withArgs(root, newRoot);
        expect(await soulKey.merkleRoot()).to.equal(newRoot);
    });
});
