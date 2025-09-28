import "dotenv/config";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
  getBytes,
  keccak256,
  zeroPadValue,
} from "ethers";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface KeeperRouterConfig {
  address: string;
  abiPath?: string;
  functionName: string;
  args: unknown[];
}

interface Config {
  seiMnemonic: string;
  seiRpcUrl: string;
  seiChainId: string;
  seiAddressPrefix: string;
  seiGasPrice: string;
  tokenMessenger: string;
  burnAmount: string;
  burnToken: string;
  destinationDomain: string;
  evmRecipient: string;
  messageTransmitter: string;
  evmRpcUrl: string;
  relayerPrivateKey: string;
  attestationBaseUrl: string;
  attestationPollIntervalMs: number;
  outputDirectory: string;
  keeperRouter?: KeeperRouterConfig;
}

interface CircleMessage {
  messageHex: string;
  messageHash: string;
  nonce?: string;
  destinationDomain?: string;
}

type Attribute = { key: string; value: string };

type Event = { type: string; attributes: readonly Attribute[] };

type ParsedLogs = Array<{
  events?: Array<{
    type: string;
    attributes?: Array<{ key: string; value: string }>;
  }>;
}>;

function getEnvOrThrow(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normaliseAmount(amount: string): string {
  if (!/^\d+$/.test(amount)) {
    throw new Error(`BURN_AMOUNT must be an integer string in the smallest denomination, received: ${amount}`);
  }
  return amount;
}

function normaliseAddress(address: string): string {
  const checksummed = getAddress(address);
  const padded = zeroPadValue(checksummed, 32);
  return padded;
}

function ensureDirectory(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function looksLikeBase64(input: string): boolean {
  return /^[0-9A-Za-z+/=]+$/.test(input) && input.length % 4 === 0;
}

function toHexFromUnknownBytes(value: string, label: string): string {
  let candidate = value.trim();
  if (candidate.startsWith("0x")) {
    return candidate.toLowerCase();
  }

  if (/^[0-9a-fA-F]+$/.test(candidate)) {
    return `0x${candidate.toLowerCase()}`;
  }

  if (looksLikeBase64(candidate)) {
    const decoded = Buffer.from(candidate, "base64");
    if (decoded.length === 0) {
      throw new Error(`Decoded empty ${label} from base64`);
    }
    return `0x${decoded.toString("hex")}`;
  }

  throw new Error(`Unable to normalise ${label}. Received: ${value}`);
}

function decodeAttributes(event: Event): Record<string, string> {
  const record: Record<string, string> = {};
  for (const attribute of event.attributes ?? []) {
    record[attribute.key] = attribute.value;
  }
  return record;
}

function parseRawLogs(rawLog?: string): ParsedLogs {
  if (!rawLog) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawLog);
    return Array.isArray(parsed) ? (parsed as ParsedLogs) : [];
  } catch (error) {
    console.warn("Failed to parse rawLog", error);
    return [];
  }
}

function findCircleEvent(events: readonly Event[] | undefined, rawLog?: string): CircleMessage {
  const circleMessage: Partial<CircleMessage> = {};
  const inspectEvent = (event: { type: string; attributes?: Array<{ key: string; value: string }> }) => {
    const attributes = event.attributes ?? [];
    const attributeMap: Record<string, string> = {};
    for (const attribute of attributes) {
      attributeMap[attribute.key] = attribute.value;
    }

    const action = attributeMap.action ?? attributeMap["wasm.action"];
    const hasDeposit = action === "deposit_for_burn" || attributeMap["method"] === "deposit_for_burn";
    const looksCircle =
      event.type.includes("circle") || event.type.includes("cctp") || hasDeposit || attributeMap["message"];

    if (!looksCircle) {
      return;
    }

    if (attributeMap["message"]) {
      circleMessage.messageHex = toHexFromUnknownBytes(attributeMap["message"], "Circle message");
    }
    if (attributeMap["message_hash"]) {
      circleMessage.messageHash = toHexFromUnknownBytes(attributeMap["message_hash"], "Circle message hash");
    }
    if (attributeMap["nonce"]) {
      circleMessage.nonce = attributeMap["nonce"];
    }
    if (attributeMap["destination_domain"]) {
      circleMessage.destinationDomain = attributeMap["destination_domain"];
    }
  };

  for (const event of events ?? []) {
    inspectEvent(event);
  }

  const parsedLogs = parseRawLogs(rawLog);
  for (const log of parsedLogs) {
    for (const event of log.events ?? []) {
      inspectEvent(event);
    }
  }

  if (!circleMessage.messageHex) {
    throw new Error("Failed to locate Circle CCTP message bytes in transaction logs");
  }

  if (!circleMessage.messageHash) {
    circleMessage.messageHash = keccak256(circleMessage.messageHex);
  }

  return circleMessage as CircleMessage;
}

function normaliseAttestation(attestation: string): string {
  const trimmed = attestation.trim();
  if (trimmed.startsWith("0x")) {
    return trimmed.toLowerCase();
  }
  if (looksLikeBase64(trimmed)) {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 0) {
      throw new Error("Decoded attestation is empty");
    }
    return `0x${decoded.toString("hex")}`;
  }
  throw new Error(`Unexpected attestation format: ${attestation}`);
}

function loadKeeperRouterConfig(): KeeperRouterConfig | undefined {
  const address = process.env.KEEPER_ROUTER_ADDRESS;
  if (!address) {
    return undefined;
  }
  const functionName = process.env.KEEPER_ROUTER_FUNCTION ?? "settleRoyalties";
  const argsRaw = process.env.KEEPER_ROUTER_ARGS ?? "[]";
  let args: unknown[] = [];
  try {
    const parsed = JSON.parse(argsRaw);
    if (!Array.isArray(parsed)) {
      throw new Error("KEEPER_ROUTER_ARGS must be a JSON array");
    }
    args = parsed;
  } catch (error) {
    throw new Error(`Failed to parse KEEPER_ROUTER_ARGS: ${error instanceof Error ? error.message : String(error)}`);
  }
  const abiPath = process.env.KEEPER_ROUTER_ABI_PATH;
  return {
    address,
    abiPath,
    functionName,
    args,
  };
}

function buildConfig(): Config {
  return {
    seiMnemonic: getEnvOrThrow("SEI_MNEMONIC"),
    seiRpcUrl: getEnvOrThrow("SEI_RPC_URL"),
    seiChainId: getEnvOrThrow("SEI_CHAIN_ID", "noble-1"),
    seiAddressPrefix: getEnvOrThrow("SEI_ADDRESS_PREFIX", "noble"),
    seiGasPrice: getEnvOrThrow("SEI_GAS_PRICE", "0.0025uusdc"),
    tokenMessenger: getEnvOrThrow("TOKEN_MESSENGER_ADDRESS"),
    burnAmount: normaliseAmount(getEnvOrThrow("BURN_AMOUNT")),
    burnToken: getEnvOrThrow("BURN_TOKEN", "uusdc"),
    destinationDomain: getEnvOrThrow("DESTINATION_DOMAIN"),
    evmRecipient: normaliseAddress(getEnvOrThrow("EVM_RECIPIENT")),
    messageTransmitter: getEnvOrThrow("MESSAGE_TRANSMITTER_ADDRESS"),
    evmRpcUrl: getEnvOrThrow("EVM_RPC_URL"),
    relayerPrivateKey: getEnvOrThrow("RELAYER_PRIVATE_KEY"),
    attestationBaseUrl: getEnvOrThrow("ATTESTATION_BASE_URL", "https://iris-api.circle.com/attestations"),
    attestationPollIntervalMs: parseInt(getEnvOrThrow("ATTESTATION_POLL_INTERVAL_MS", "5000"), 10),
    outputDirectory: getEnvOrThrow("CCTP_OUTPUT_DIRECTORY", path.resolve("cctp-artifacts")),
    keeperRouter: loadKeeperRouterConfig(),
  };
}

async function depositForBurn(config: Config): Promise<{
  tx: ExecuteResult;
  circleMessage: CircleMessage;
}> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.seiMnemonic, {
    prefix: config.seiAddressPrefix,
  });
  const [account] = await wallet.getAccounts();
  console.log(`Sei/Noble relayer address: ${account.address}`);

  const client = await SigningCosmWasmClient.connectWithSigner(config.seiRpcUrl, wallet, {
    prefix: config.seiAddressPrefix,
    gasPrice: GasPrice.fromString(config.seiGasPrice),
  });

  const chainId = await client.getChainId();
  if (chainId !== config.seiChainId) {
    throw new Error(`Connected to chain id ${chainId}, expected ${config.seiChainId}`);
  }
  console.log(`Connected to Sei/Noble chain id: ${chainId}`);

  const message = {
    deposit_for_burn: {
      amount: config.burnAmount,
      destination_domain: config.destinationDomain,
      mint_recipient: config.evmRecipient,
      burn_token: config.burnToken,
    },
  };

  console.log("Submitting deposit_for_burn...");
  const tx = await client.execute(account.address, config.tokenMessenger, message, "auto");
  console.log(`Burn transaction hash: ${tx.transactionHash}`);

  const circleMessage = findCircleEvent(tx.events as readonly Event[] | undefined, tx.rawLog);
  console.log(`Circle message hash: ${circleMessage.messageHash}`);

  return { tx, circleMessage };
}

async function pollForAttestation(config: Config, messageHash: string): Promise<string> {
  const url = `${config.attestationBaseUrl}/${messageHash}`;
  console.log(`Polling Circle attestation at ${url}`);

  while (true) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Attestation API error (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      status: string;
      attestation?: string;
    };

    if (payload.status === "complete" && payload.attestation) {
      console.log("Attestation is ready.");
      return normaliseAttestation(payload.attestation);
    }

    if (payload.status === "failed") {
      throw new Error(`Attestation failed according to Circle API response: ${JSON.stringify(payload)}`);
    }

    console.log("Waiting for attestation...");
    await new Promise((resolve) => setTimeout(resolve, config.attestationPollIntervalMs));
  }
}

async function mintOnEvm(
  config: Config,
  messageHex: string,
  attestationHex: string,
): Promise<{ txHash: string; receipt: unknown }> {
  const provider = new JsonRpcProvider(config.evmRpcUrl);
  const signer = new Wallet(config.relayerPrivateKey, provider);

  const messageTransmitter = new Contract(
    config.messageTransmitter,
    ["function receiveMessage(bytes message, bytes attestation) external returns (bool)"],
    signer,
  );

  console.log(`Submitting receiveMessage() from relayer ${await signer.getAddress()}...`);
  const txResponse = await messageTransmitter.receiveMessage(getBytes(messageHex), getBytes(attestationHex));
  const receipt = await txResponse.wait();
  console.log(`Mint transaction hash: ${receipt?.hash ?? txResponse.hash}`);
  return { txHash: receipt?.hash ?? txResponse.hash, receipt };
}

async function maybeSettleRoyalties(config: Config): Promise<void> {
  if (!config.keeperRouter) {
    return;
  }
  const provider = new JsonRpcProvider(config.evmRpcUrl);
  const signer = new Wallet(config.relayerPrivateKey, provider);

  let abi: unknown;
  if (config.keeperRouter.abiPath) {
    const resolved = path.resolve(config.keeperRouter.abiPath);
    abi = JSON.parse(readFileSync(resolved, "utf8"));
  } else {
    abi = ["function settleRoyalties() external"];
  }

  const router = new Contract(config.keeperRouter.address, abi, signer);
  const fn = config.keeperRouter.functionName;
  let contractFunction: ((...args: unknown[]) => Promise<unknown>) | undefined;
  try {
    contractFunction = router.getFunction(fn) as unknown as ((...args: unknown[]) => Promise<unknown>);
  } catch (error) {
    throw new Error(`Keeper router ABI does not include function ${fn}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof contractFunction !== "function") {
    throw new Error(`Keeper router ABI does not include callable function ${fn}`);
  }
  console.log(`Calling KeeperRoyaltyRouter.${fn}...`);
  const tx = await contractFunction(...config.keeperRouter.args);
  const receipt = await tx.wait();
  console.log(`KeeperRoyaltyRouter transaction hash: ${receipt?.hash ?? tx.hash}`);
}

async function main() {
  try {
    const config = buildConfig();
    ensureDirectory(config.outputDirectory);

    const { tx, circleMessage } = await depositForBurn(config);

    const messagePath = path.join(
      config.outputDirectory,
      `${tx.transactionHash}-message.hex`,
    );
    writeFileSync(messagePath, `${circleMessage.messageHex}\n`);

    const attestationHex = await pollForAttestation(config, circleMessage.messageHash);
    const attestationPath = path.join(
      config.outputDirectory,
      `${tx.transactionHash}-attestation.hex`,
    );
    writeFileSync(attestationPath, `${attestationHex}\n`);

    const { txHash } = await mintOnEvm(config, circleMessage.messageHex, attestationHex);

    const metadataPath = path.join(
      config.outputDirectory,
      `${tx.transactionHash}-metadata.json`,
    );
    writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          burnTxHash: tx.transactionHash,
          messageHash: circleMessage.messageHash,
          nonce: circleMessage.nonce,
          destinationDomain: circleMessage.destinationDomain,
          messagePath,
          attestationPath,
          mintTxHash: txHash,
        },
        null,
        2,
      ),
    );

    await maybeSettleRoyalties(config);

    console.log("CCTP relay flow completed successfully.");
  } catch (error) {
    console.error("CCTP relay flow failed:", error);
    process.exitCode = 1;
  }
}

main();
