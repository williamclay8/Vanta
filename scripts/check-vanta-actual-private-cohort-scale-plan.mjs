import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-actual-private-cohort-scale-plan.mjs");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

const checkedAt = "2026-04-30T12:00:00.000Z";
const result = spawnSync(process.execPath, [scriptPath, "--json", "--checked-at", checkedAt], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL: "",
  },
});

assert.equal(result.status, 0, result.stderr || result.stdout);

const plan = JSON.parse(result.stdout);
assert.equal(plan.version, "vanta-actual-private-cohort-scale-plan-0.1");
assert.equal(plan.checkedAt, checkedAt);
assert.equal(plan.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(plan.network, "mainnet-beta");
assert.equal(plan.mainnetReady, false);
assert.equal(plan.productionReady, false);
assert.equal(plan.privacyClaimAllowed, false);
assert.equal(plan.movesFunds, false);
assert.equal(plan.submitsTransaction, false);
assert.equal(plan.mutatesProduction, false);
assert.equal(plan.currentMeasurement.outputRecordCount, 1);
assert.equal(plan.currentMeasurement.distinctCommitmentCount, 2);
assert.equal(plan.currentMeasurement.minimumDistinctCommitments, 1024);
assert.equal(plan.currentMeasurement.meetsMinimumDistinctCommitments, false);
assert.equal(plan.scaleRequirement.outputCommitmentsPerRecord, 2);
assert.equal(plan.scaleRequirement.requiredAdditionalDistinctCommitments, 1022);
assert.equal(plan.scaleRequirement.requiredAdditionalOutputRecords, 511);
assert.equal(plan.scaleRequirement.targetOutputRecordCount, 512);
assert.equal(plan.scaleRequirement.requiredMinimumOutputQueueSlots, 512);
assert.equal(plan.scaleRequirement.accountByteSizes.poolState, 56);
assert.equal(plan.scaleRequirement.accountByteSizes.nullifierSet, 16400);
assert.equal(plan.scaleRequirement.accountByteSizes.outputQueue, 49168);
assert.equal(plan.scaleRequirement.totalNewAccountDataBytes, 65624);
assert.equal(plan.practicalTransactionClassesAfterFreshApproval.length, 4);
assert.ok(
  plan.practicalTransactionClassesAfterFreshApproval.some(
    (txClass) => txClass.id === "append-live-output-records" && txClass.requiresHumanWalletSignature === true,
  ),
);
assert.equal(plan.approvalGate.canonicalStatusCommand, "npm run mainnet:real-funds-approval-status-check");
assert.ok(typeof plan.approvalGate.liveMainnetActionsAllowedNow === "boolean");
assert.ok(plan.blockers.includes("511-additional-live-output-records-required-from-current-evidence"));
assert.ok(plan.nonClaims.includes("does not submit or sign a transaction"));
assert.equal(plan.rentEstimates.status, "not-estimated-env-missing");

assert.equal(
  packageJson.scripts["mainnet:actual-private-cohort-scale-plan"],
  "node scripts/print-vanta-actual-private-cohort-scale-plan.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-cohort-scale-plan-json"],
  "node scripts/print-vanta-actual-private-cohort-scale-plan.mjs --json",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-cohort-scale-plan-check"],
  "node scripts/check-vanta-actual-private-cohort-scale-plan.mjs",
);

console.log("Vanta actual-private cohort scale plan check: PASS");
