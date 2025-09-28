import { ethers } from "hardhat";

type DeploymentConfig = {
  messageTransmitter: string;
  verifier?: string;
};

function getConfig(): DeploymentConfig {
  const messageTransmitter = process.env.MESSAGE_TRANSMITTER_ADDRESS;
  const verifier = process.env.ZK_VERIFIER_ADDRESS;

  if (!messageTransmitter) {
    throw new Error("MESSAGE_TRANSMITTER_ADDRESS env var must be provided");
  }

  return { messageTransmitter, verifier: verifier || undefined };
}

async function deployVerifierIfNeeded(verifierAddress?: string): Promise<string> {
  if (verifierAddress) {
    return verifierAddress;
  }

  const verifierFactory = await ethers.getContractFactory("ZkMultiFactorProofVerifier");
  const verifier = await verifierFactory.deploy();
  await verifier.waitForDeployment();

  const deployedAddress = await verifier.getAddress();
  console.log(`ZkMultiFactorProofVerifier deployed to: ${deployedAddress}`);
  return deployedAddress;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with: ${deployer.address}`);

  const config = getConfig();
  const verifier = await deployVerifierIfNeeded(config.verifier);

  const gateFactory = await ethers.getContractFactory("CrossChainSoulKeyGate");
  const gate = await gateFactory.deploy(verifier, config.messageTransmitter);
  await gate.waitForDeployment();

  console.log(`CrossChainSoulKeyGate deployed to: ${await gate.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
