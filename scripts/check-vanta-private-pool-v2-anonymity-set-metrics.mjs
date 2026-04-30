import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-private-pool-v2-anonymity-set-metrics.mjs");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

const measuredAt = "2026-04-29T04:20:00.000Z";
const result = spawnSync(
  process.execPath,
  [
    scriptPath,
    "--json",
    "--measured-at",
    measuredAt,
    "--account-data-base64",
    createOutputQueueDataBase64(),
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);

assert.equal(result.status, 0, result.stderr || result.stdout);

const metrics = JSON.parse(result.stdout);
assert.equal(metrics.version, "vanta-private-pool-v2-anonymity-set-metrics-0.1");
assert.equal(metrics.railId, "vanta-private-pool-v2");
assert.equal(metrics.network, "mainnet-beta");
assert.equal(metrics.measuredAt, measuredAt);
assert.equal(metrics.minimumDistinctCommitments, 1024);
assert.equal(metrics.measurementStatus, "measured-below-threshold");
assert.equal(metrics.privacyClaimAllowed, false);
assert.equal(metrics.productionReady, false);
assert.equal(metrics.configuredSolanaRefs.programIdRef, "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID_REF");
assert.equal(metrics.configuredSolanaRefs.outputQueueRef, "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE_REF");
assert.equal(metrics.liveSolanaOutputQueueMeasurement.status, "read");
assert.equal(metrics.liveSolanaOutputQueueMeasurement.outputRecordCount, 1);
assert.equal(metrics.liveSolanaOutputQueueMeasurement.outputCommitmentCount, 2);
assert.equal(metrics.liveSolanaOutputQueueMeasurement.distinctCommitmentCount, 2);
assert.equal(metrics.liveSolanaOutputQueueMeasurement.capacity, 2);
assert.equal(metrics.currentMainnetSpendEvidence.observedOutputCommitments, 2);
assert.equal(metrics.currentMainnetSpendEvidence.status, "reviewed-blocked");
assert.ok(metrics.blockers.includes("measured-below-threshold"));
assert.ok(metrics.nonClaims.includes("no anonymity guarantee"));

assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-metrics"],
  "node scripts/print-vanta-private-pool-v2-anonymity-set-metrics.mjs",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-metrics-json"],
  "node scripts/print-vanta-private-pool-v2-anonymity-set-metrics.mjs --json",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-metrics-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-metrics.mjs",
);

console.log("Vanta Private Pool v2 anonymity-set metrics check: PASS");

function createOutputQueueDataBase64() {
  const headerLength = 16;
  const outputRecordLength = 96;
  const data = Buffer.alloc(headerLength + outputRecordLength * 2);
  data.write("VNTA2OUT", 0, "ascii");
  data[8] = 1;
  data.writeUInt32LE(1, 12);
  Buffer.alloc(32, 0x22).copy(data, headerLength);
  Buffer.alloc(32, 0x33).copy(data, headerLength + 32);
  Buffer.alloc(32, 0x44).copy(data, headerLength + 64);
  return data.toString("base64");
}
