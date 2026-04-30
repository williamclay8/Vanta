import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Connection, PublicKey } from "@solana/web3.js";

const OUTPUT_MAGIC = Buffer.from("VNTA2OUT", "ascii");
const VERSION = 1;
const HEADER_LEN = 16;
const COUNT_OFFSET = 12;
const HASH_LEN = 32;
const OUTPUT_RECORD_LEN = HASH_LEN * 3;
const MINIMUM_DISTINCT_COMMITMENTS = 1024;

const repoRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");
const reviewPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");

const jsonMode = process.argv.includes("--json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const review = JSON.parse(readFileSync(reviewPath, "utf8"));
const relayerService = (manifest.services ?? []).find((service) => service.id === "relayer");
const spendProgramAccountRefs = relayerService?.deployedService?.spendProgramAccountRefs ?? {};

const accountDataBase64 = readOptionValue("--account-data-base64") || readOptionalEnv("VANTA_PRIVATE_POOL_V2_ANONYMITY_OUTPUT_QUEUE_DATA_BASE64");
const measuredAt = readOptionValue("--measured-at") || new Date().toISOString();
const programId = readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID");
const outputQueue = readOptionalEnv("VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE");
const rpcUrl = readOptionalEnv("VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL");

const measurement = accountDataBase64
  ? measureOutputQueueData(Buffer.from(accountDataBase64, "base64"))
  : await measureConfiguredOutputQueue({ outputQueue, rpcUrl });

const result = {
  version: "vanta-private-pool-v2-anonymity-set-metrics-0.1",
  railId: "vanta-private-pool-v2",
  network: "mainnet-beta",
  measuredAt,
  minimumDistinctCommitments: MINIMUM_DISTINCT_COMMITMENTS,
  measurementStatus:
    measurement.distinctCommitmentCount >= MINIMUM_DISTINCT_COMMITMENTS
      ? "measured-meets-threshold"
      : "measured-below-threshold",
  privacyClaimAllowed: false,
  productionReady: false,
  configuredSolanaRefs: {
    programIdRef: spendProgramAccountRefs.programIdRef ?? null,
    outputQueueRef: spendProgramAccountRefs.outputQueueRef ?? null,
  },
  configuredSolanaInputsPresent: {
    programId: Boolean(programId),
    outputQueue: Boolean(outputQueue),
    rpcUrl: Boolean(rpcUrl),
  },
  liveSolanaOutputQueueMeasurement: measurement,
  currentMainnetSpendEvidence: {
    evidenceRef: "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
    reviewedCheckId: "indexer-output-commitments-found",
    observedOutputCommitments: reviewedOutputCommitmentCount(review),
    status: "reviewed-blocked",
  },
  blockers: [
    "measured-below-threshold",
    "no-proven-audited-shared-anonymity-set",
    "no-independent-reviewer-accepted-anonymity-set-measurement",
  ],
  nonClaims: [
    "no anonymity guarantee",
    "no production mainnet privacy claim",
    "no audited shared anonymity set claim",
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Private Pool v2 anonymity-set metrics");
  console.log(`- rail: ${result.railId}`);
  console.log(`- network: ${result.network}`);
  console.log(`- measurementStatus: ${result.measurementStatus}`);
  console.log(`- outputRecordCount: ${result.liveSolanaOutputQueueMeasurement.outputRecordCount}`);
  console.log(`- distinctCommitmentCount: ${result.liveSolanaOutputQueueMeasurement.distinctCommitmentCount}`);
  console.log(`- minimumDistinctCommitments: ${result.minimumDistinctCommitments}`);
  console.log(`- privacyClaimAllowed: ${String(result.privacyClaimAllowed)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
  console.log("- canonical verification: npm run private-pool-v2:anonymity-set-metrics-check");
}

function readOptionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return process.argv[index + 1]?.trim() ?? "";
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

async function measureConfiguredOutputQueue({ outputQueue: outputQueueAddress, rpcUrl: configuredRpcUrl }) {
  if (!outputQueueAddress || !configuredRpcUrl) {
    return {
      source: "configured-output-queue",
      status: "not-read-env-missing",
      outputRecordCount: reviewedOutputRecordCount(review),
      outputCommitmentCount: reviewedOutputCommitmentCount(review),
      distinctCommitmentCount: reviewedOutputCommitmentCount(review),
      note: "Set VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL and VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE to read the live output queue account.",
    };
  }

  const connection = new Connection(configuredRpcUrl, "confirmed");
  const account = await connection.getAccountInfo(new PublicKey(outputQueueAddress), "confirmed");
  if (!account) {
    throw new Error("Configured VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE account was not found.");
  }

  return {
    ...measureOutputQueueData(account.data),
    owner: account.owner.toBase58(),
    source: "configured-output-queue",
  };
}

function measureOutputQueueData(data) {
  if (data.length < HEADER_LEN || !data.subarray(0, 8).equals(OUTPUT_MAGIC) || data[8] !== VERSION) {
    throw new Error("Output queue account data is not an initialized Vanta Private Pool v2 output queue.");
  }

  const outputRecordCount = data.readUInt32LE(COUNT_OFFSET);
  const capacity = Math.floor((data.length - HEADER_LEN) / OUTPUT_RECORD_LEN);
  if (outputRecordCount > capacity) {
    throw new Error("Output queue record count exceeds account capacity.");
  }

  const commitments = [];
  for (let index = 0; index < outputRecordCount; index += 1) {
    const start = HEADER_LEN + index * OUTPUT_RECORD_LEN;
    commitments.push(data.subarray(start, start + HASH_LEN).toString("hex"));
    commitments.push(data.subarray(start + HASH_LEN, start + HASH_LEN * 2).toString("hex"));
  }

  return {
    source: "provided-output-queue-data",
    status: "read",
    outputRecordCount,
    outputCommitmentCount: commitments.length,
    distinctCommitmentCount: new Set(commitments).size,
    capacity,
  };
}

function reviewedOutputRecordCount(reviewPacket) {
  return reviewedOutputCommitmentCount(reviewPacket) > 0 ? 1 : 0;
}

function reviewedOutputCommitmentCount(reviewPacket) {
  const outputCheck = (reviewPacket.passedChecks ?? []).find((check) => check.id === "indexer-output-commitments-found");
  return outputCheck?.result === "pass" ? 2 : 0;
}
