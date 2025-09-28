import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient, GasPrice } from "@cosmjs/cosmwasm-stargate";
import { DeliverTxResponse, Log } from "@cosmjs/stargate";
import { fromBase64 } from "@cosmjs/encoding";
import { ethers } from "ethers";
import { setTimeout as sleep } from "timers/promises";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type BytesLike = Uint8Array;

interface CliOptions {
  seiRpc: string;
  tokenMessenger: string;
  destinationDomain: number;
  mintRecipient: string;
  amount?: string;
  amountBase?: string;
  decimals: number;
  burnToken: string;
  gasPrice: string;
  bech32Prefix: string;
  circleApi: string;
  circleApiKey?: string;
  attestationPollInterval: number;
  attestationTimeout: number;
  messageTransmitter: string;
  evmRpc: string;
  evmKey?: string;
  memo?: string;
  mintGasLimit?: string;
  skipMint: boolean;
  seiMnemonic?: string;
}

interface BurnResult {
  txHash: string;
  messageBytes: BytesLike;
  messageHash: string;
  nonce?: string;
  messageId?: string;
}

interface AttestationResult {
  attestation: string;
  attestationBytes: BytesLike;
}

interface MintResult {
  transactionHash: string;
  blockNumber: number;
}

function toBaseUnits(amount: string | undefined, decimals: number): string {
  if (!amount) {
    throw new Error("Amount must be provided when amountBase is not supplied");
  }
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const baseUnits = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
  return baseUnits.toString();
}

function normalizeRecipient(recipient: string): string {
  const normalized = recipient.trim().toLowerCase();
  const hex = normalized.startsWith("0x") ? normalized.slice(2) : normalized;
  if (hex.length === 64) {
    return "0x" + hex;
  }
  if (hex.length === 40) {
    return "0x" + "0".repeat(24) + hex;
  }
  throw new Error("mintRecipient must be a 20 byte EVM address or a 32 byte hex string");
}

function decodeData(value: string): BytesLike {
  const trimmed = value.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return ethers.getBytes(trimmed);
  }
  return fromBase64(trimmed);
}

function searchLogForAttribute(logs: readonly Log[], key: string): string | undefined {
  for (const log of logs) {
    for (const event of log.events) {
      for (const attribute of event.attributes) {
        if (attribute.key === key) {
          return attribute.value;
        }
      }
    }
  }
  return undefined;
}

function extractMessage(tx: DeliverTxResponse): { message?: string; nonce?: string; messageId?: string } {
  const candidateKeys = ["message", "cctp_message", "message_bytes"];
  for (const key of candidateKeys) {
    const value = searchLogForAttribute(tx.logs ?? [], key);
    if (value) {
      const nonce =
        searchLogForAttribute(tx.logs ?? [], "nonce") ||
        searchLogForAttribute(tx.logs ?? [], "cctp_nonce");
      const messageId =
        searchLogForAttribute(tx.logs ?? [], "message_id") ||
        searchLogForAttribute(tx.logs ?? [], "cctp_message_id");
      return { message: value, nonce, messageId };
    }
  }

  if (!tx.rawLog) {
    return {};
  }

  try {
    const raw = JSON.parse(tx.rawLog) as Array<{ events: Array<{ type: string; attributes: Array<{ key: string; value: string }> }> }>;
    for (const log of raw) {
      for (const event of log.events) {
        if (event.type !== "wasm") {
          continue;
        }
        for (const attr of event.attributes) {
          if (candidateKeys.includes(attr.key)) {
            const nonceAttr = event.attributes.find((a) => a.key === "nonce" || a.key === "cctp_nonce");
            const idAttr = event.attributes.find((a) => a.key === "message_id" || a.key === "cctp_message_id");
            return { message: attr.value, nonce: nonceAttr?.value, messageId: idAttr?.value };
          }
        }
      }
    }
  } catch (error) {
    // Ignore JSON parsing errors and fall through
  }

  return {};
}

async function burnOnSei(options: CliOptions): Promise<BurnResult> {
  const mnemonic = options.seiMnemonic ?? process.env.SEI_MNEMONIC ?? process.env.NOBLE_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Missing Noble/Sei mnemonic. Provide via --sei-mnemonic or SEI_MNEMONIC/NOBLE_MNEMONIC environment variable.");
  }

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: options.bech32Prefix,
  });
  const [account] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(options.seiRpc, wallet, {
    gasPrice: GasPrice.fromString(options.gasPrice),
  });

  const amount = options.amountBase ?? toBaseUnits(options.amount, options.decimals);
  const msg = {
    deposit_for_burn: {
      amount,
      destination_domain: String(options.destinationDomain),
      mint_recipient: normalizeRecipient(options.mintRecipient),
      burn_token: options.burnToken,
    },
  };

  const response = await client.execute(account.address, options.tokenMessenger, msg, "auto", options.memo);

  if (!response.transactionHash) {
    throw new Error("Failed to retrieve transaction hash for burn transaction");
  }

  const extracted = extractMessage(response);
  if (!extracted.message) {
    throw new Error("Unable to locate CCTP message payload in burn transaction logs");
  }

  const messageBytes = decodeData(extracted.message);
  const messageHash = ethers.keccak256(messageBytes);

  return {
    txHash: response.transactionHash,
    messageBytes,
    messageHash,
    nonce: extracted.nonce,
    messageId: extracted.messageId,
  };
}

async function waitForAttestation(options: CliOptions, messageHash: string): Promise<AttestationResult> {
  const baseUrl = options.circleApi.replace(/\/$/, "");
  const url = `${baseUrl}/attestations/${messageHash}`;
  const headers: Record<string, string> = {};
  if (options.circleApiKey) {
    headers["Authorization"] = `Bearer ${options.circleApiKey}`;
  }

  const start = Date.now();
  while (true) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch attestation: ${response.status} ${response.statusText} ${body}`);
    }
    const data = (await response.json()) as { status?: string; attestation?: string };
    if (data.status === "complete" && data.attestation) {
      const attestationBytes = decodeData(data.attestation);
      return { attestation: data.attestation, attestationBytes };
    }

    if (Date.now() - start > options.attestationTimeout) {
      throw new Error("Timed out while waiting for attestation");
    }

    await sleep(options.attestationPollInterval);
  }
}

async function mintOnEvm(
  options: CliOptions,
  messageBytes: BytesLike,
  attestationBytes: BytesLike,
): Promise<MintResult> {
  const privateKey = options.evmKey ?? process.env.RELAYER_PK;
  if (!privateKey) {
    throw new Error("Missing EVM relayer private key. Provide via --evm-key or RELAYER_PK environment variable.");
  }

  const provider = new ethers.JsonRpcProvider(options.evmRpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = ["function receiveMessage(bytes message, bytes attestation) external returns (bool)"];
  const contract = new ethers.Contract(options.messageTransmitter, abi, wallet);

  const messageArg = ethers.hexlify(messageBytes);
  const attestationArg = ethers.hexlify(attestationBytes);

  const overrides = options.mintGasLimit ? { gasLimit: BigInt(options.mintGasLimit) } : {};
  const tx = await contract.receiveMessage(messageArg, attestationArg, overrides);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Mint transaction was not confirmed");
  }
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .scriptName("cctp-relay")
    .option("seiRpc", {
      type: "string",
      demandOption: true,
      describe: "RPC endpoint for the Sei/Noble chain",
    })
    .option("tokenMessenger", {
      type: "string",
      demandOption: true,
      describe: "TokenMessenger contract address on Sei/Noble",
    })
    .option("destinationDomain", {
      type: "number",
      demandOption: true,
      describe: "Circle domain identifier for the destination chain",
    })
    .option("mintRecipient", {
      type: "string",
      demandOption: true,
      describe: "EVM address or bytes32 recipient for the minted USDC",
    })
    .option("amount", {
      type: "string",
      describe: "USDC amount (human readable) to burn",
    })
    .option("amountBase", {
      type: "string",
      describe: "USDC amount in base units (6 decimals) to burn",
    })
    .option("decimals", {
      type: "number",
      default: 6,
      describe: "Number of decimals for the burn token",
    })
    .option("burnToken", {
      type: "string",
      default: "uusdc",
      describe: "Denom of the USDC token on Noble/Sei",
    })
    .option("gasPrice", {
      type: "string",
      default: "0.1uusdc",
      describe: "Gas price for the Noble/Sei transaction",
    })
    .option("bech32Prefix", {
      type: "string",
      default: "noble",
      describe: "Bech32 address prefix for the Noble/Sei wallet",
    })
    .option("circleApi", {
      type: "string",
      default: "https://iris-api.circle.com",
      describe: "Circle attestation service base URL",
    })
    .option("circleApiKey", {
      type: "string",
      describe: "Optional Circle API key",
    })
    .option("attestationPollInterval", {
      type: "number",
      default: 5000,
      describe: "Milliseconds between attestation polling attempts",
    })
    .option("attestationTimeout", {
      type: "number",
      default: 10 * 60 * 1000,
      describe: "Milliseconds to wait before timing out attestation polling",
    })
    .option("messageTransmitter", {
      type: "string",
      demandOption: true,
      describe: "Circle MessageTransmitter contract address on the destination chain",
    })
    .option("evmRpc", {
      type: "string",
      demandOption: true,
      describe: "RPC endpoint for the destination EVM chain",
    })
    .option("evmKey", {
      type: "string",
      describe: "Private key for the EVM relayer",
    })
    .option("mintGasLimit", {
      type: "string",
      describe: "Optional gas limit override for receiveMessage",
    })
    .option("memo", {
      type: "string",
      describe: "Optional memo for the deposit_for_burn transaction",
    })
    .option("skipMint", {
      type: "boolean",
      default: false,
      describe: "If true, skip calling receiveMessage after fetching attestation",
    })
    .option("seiMnemonic", {
      type: "string",
      describe: "Mnemonic for the Noble/Sei wallet",
    })
    .check((argv) => {
      if (!argv.amount && !argv.amountBase) {
        throw new Error("Either --amount or --amountBase must be provided");
      }
      return true;
    })
    .strict()
    .help()
    .parseAsync();

  const options = args as unknown as CliOptions;
  console.log("Initiating CCTP burn on Sei/Noble...");
  const burnResult = await burnOnSei(options);
  console.log("Burn transaction submitted:", burnResult.txHash);
  console.log("CCTP message hash:", burnResult.messageHash);
  if (burnResult.nonce) {
    console.log("CCTP nonce:", burnResult.nonce);
  }
  if (burnResult.messageId) {
    console.log("CCTP message ID:", burnResult.messageId);
  }

  console.log("Waiting for Circle attestation...");
  const attestation = await waitForAttestation(options, burnResult.messageHash);
  console.log("Attestation received with length", attestation.attestationBytes.length);

  if (options.skipMint) {
    console.log("Skipping mint step as requested. Save the attestation and message for later use.");
    return;
  }

  console.log("Submitting receiveMessage on destination chain...");
  const mintResult = await mintOnEvm(options, burnResult.messageBytes, attestation.attestationBytes);
  console.log("USDC minted on destination chain:", mintResult.transactionHash);
  console.log("Included in block:", mintResult.blockNumber);
}

main().catch((error) => {
  console.error("CCTP relay flow failed:", error);
  process.exit(1);
});
