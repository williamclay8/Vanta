import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = "ops/mainnet/anonymity-bootstrap-requests/anonymity-set-1024-bootstrap.evidence.json";
const runbookPath = "ops/mainnet/anonymity-bootstrap-requests/ANONYMITY-SET-1024-BOOTSTRAP-RUNBOOK-2026-05-30.md";
const batchTemplatePath = "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-batch-record.template.json";
const measurementTemplatePath =
  "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-measurement-receipt.template.json";
const anonymityEvidencePath = "ops/mainnet/private-pool-v2-anonymity-set.evidence.json";

function fail(message) {
  console.error(`anonymity set 1024 bootstrap prep: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const evidence = readJson(evidencePath);
const runbook = read(runbookPath);
const batchTemplate = readJson(batchTemplatePath);
const measurementTemplate = readJson(measurementTemplatePath);
const anonymityEvidence = readJson(anonymityEvidencePath);
const packageJson = readJson("package.json");
const scripts = packageJson.scripts ?? {};

assert(evidence.version === "vanta-anonymity-set-1024-bootstrap-0.1", "version mismatch");
assert(evidence.status === "active-bootstrap-confirmed-awaiting-approval", "status mismatch");
assert(evidence.productionReady === false, "productionReady must remain false");
assert(evidence.privacyClaimAllowed === false, "privacyClaimAllowed must remain false");
assert(evidence.threshold.minimumDistinctCommitments === 1024, "threshold must remain 1024");
assert(
  evidence.operatorConfirmed?.cohortId === "stablecoin-usdc-v1-mainnet-private-pool-v2",
  "operator confirmation must record stablecoin-usdc-v1 cohort",
);
assert(evidence.operatorConfirmed?.fixedBucketUsdc === "10.000000", "operator confirmation must record 10 USDC bucket");
assert(evidence.operatorConfirmed?.shieldsPerBatch === 50, "operator confirmation must record batch size 50");
assert(
  existsSync(resolve(repoRoot, evidence.operatorConfirmed?.activeBatchPlanRef ?? "")),
  "active batch plan ref must exist",
);
assert(
  evidence.targetCohort.id === "stablecoin-usdc-v1-mainnet-private-pool-v2",
  "target cohort mismatch",
);
assert(
  anonymityEvidence.currentMeasurement.distinctCommitmentCount === evidence.currentProgress.distinctCommitmentCount,
  "bootstrap evidence must match anonymity-set evidence distinct count",
);

for (const path of evidence.scriptSurface ?? []) {
  assert(existsSync(resolve(repoRoot, path)), `script surface missing ${path}`);
}

for (const path of evidence.runbookRefs ?? []) {
  assert(existsSync(resolve(repoRoot, path)), `runbook ref missing ${path}`);
}

includes(runbook, "1024", "runbook");
includes(runbook, "stablecoin-usdc-v1", "runbook");
includes(runbook, "anonymity:1024-bootstrap-prep-check", "runbook");
includes(runbook, batchTemplatePath, "runbook");
includes(runbook, measurementTemplatePath, "runbook");
includes(runbook, "Do not set `privacyClaimAllowed: true`", "runbook");

assert(batchTemplate.productionReady === false, "batch template must keep productionReady false");
assert(measurementTemplate.reviewerAccepted === false, "measurement template must keep reviewerAccepted false");
assert(measurementTemplate.minimumDistinctCommitments === 1024, "measurement template threshold mismatch");

for (const command of evidence.canonicalCommands ?? []) {
  const key = command.replace(/^npm run /, "");
  assert(typeof scripts[key] === "string", `package.json missing script ${key}`);
}

assert(
  existsSync(resolve(repoRoot, "scripts/anonymity-bootstrap/run-anonymity-set-1024-bootstrap-checklist.mjs")),
  "missing bootstrap checklist runner",
);

console.log("anonymity set 1024 bootstrap prep: PASS");
console.log(
  `depth: ${evidence.currentProgress.distinctCommitmentCount}/${evidence.threshold.minimumDistinctCommitments}`,
);
console.log(`remaining: ${evidence.currentProgress.remainingToThreshold}`);
console.log("privacy claim: blocked");
