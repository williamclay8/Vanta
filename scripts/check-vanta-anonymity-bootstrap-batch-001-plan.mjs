import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const planPath = "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-batch-001-plan.evidence.json";
const bootstrapPath = "ops/mainnet/anonymity-bootstrap-requests/anonymity-set-1024-bootstrap.evidence.json";

function fail(message) {
  console.error(`anonymity bootstrap batch 001 plan: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

const plan = JSON.parse(readFileSync(resolve(repoRoot, planPath), "utf8"));
const bootstrap = JSON.parse(readFileSync(resolve(repoRoot, bootstrapPath), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert(plan.version === "vanta-anonymity-bootstrap-batch-001-plan-0.1", "version mismatch");
assert(plan.status === "confirmed-awaiting-bounded-approval", "status mismatch");
assert(plan.productionReady === false, "productionReady must remain false");
assert(plan.cohort.assetCohort === "stablecoin-usdc-v1", "cohort mismatch");
assert(plan.fixedDenomination.bucketAmount === "10.000000", "bucket mismatch");
assert(plan.batchPlan.shieldCount === 50, "batch size mismatch");
assert(plan.batchPlan.estimatedDepthAfterBatch === 53, "depth estimate mismatch");
assert(
  bootstrap.operatorConfirmed?.cohortId === plan.cohort.id,
  "bootstrap operator confirmation must match batch 001 cohort",
);
assert(
  bootstrap.operatorConfirmed?.fixedBucketUsdc === plan.fixedDenomination.bucketAmount,
  "bootstrap operator confirmation must match batch 001 bucket",
);
assert(
  bootstrap.operatorConfirmed?.shieldsPerBatch === plan.batchPlan.shieldCount,
  "bootstrap operator confirmation must match batch 001 size",
);

assert(
  typeof packageJson.scripts["anonymity:bootstrap-batch-001-plan-check"] === "string",
  "missing anonymity:bootstrap-batch-001-plan-check",
);
assert(
  typeof packageJson.scripts["anonymity:bootstrap-batch-001-approval-env"] === "string",
  "missing anonymity:bootstrap-batch-001-approval-env",
);
assert(existsSync(resolve(repoRoot, "scripts/print-vanta-anonymity-bootstrap-batch-001-approval-env.mjs")));

console.log("anonymity bootstrap batch 001 plan: PASS");
console.log(`batch: ${plan.batchId} (${plan.batchPlan.shieldCount} shields @ ${plan.fixedDenomination.bucketAmount} USDC)`);
console.log(`estimated depth after batch: ${plan.batchPlan.estimatedDepthAfterBatch}/1024`);
