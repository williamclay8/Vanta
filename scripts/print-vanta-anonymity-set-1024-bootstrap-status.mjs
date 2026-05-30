import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const bootstrapPath = resolve(
  repoRoot,
  "ops/mainnet/anonymity-bootstrap-requests/anonymity-set-1024-bootstrap.evidence.json",
);
const anonymityPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");

const jsonMode = process.argv.includes("--json");
const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"));
const anonymity = JSON.parse(readFileSync(anonymityPath, "utf8"));

const distinct = anonymity.currentMeasurement.distinctCommitmentCount;
const minimum = anonymity.currentMeasurement.minimumDistinctCommitments;
const remaining = Math.max(minimum - distinct, 0);
const milestones = bootstrap.threshold.milestones ?? [64, 256, 512, 1024];
const nextMilestone = milestones.find((value) => distinct < value) ?? minimum;

const result = {
  version: "vanta-anonymity-set-1024-bootstrap-status-0.1",
  checkedAt: new Date().toISOString(),
  bootstrapStatus: bootstrap.status,
  cohortId: bootstrap.targetCohort.id,
  fixedDenominationBucketUsdc: bootstrap.targetCohort.fixedDenominationPolicy.recommendedBucketUsdc,
  distinctCommitmentCount: distinct,
  minimumDistinctCommitments: minimum,
  remainingToThreshold: remaining,
  percentOfThreshold: Number(((distinct / minimum) * 100).toFixed(4)),
  nextMilestone,
  remainingToNextMilestone: Math.max(nextMilestone - distinct, 0),
  measurementStatus: anonymity.currentMeasurement.status,
  reviewerAccepted: anonymity.currentMeasurement.reviewerAccepted,
  productionReady: false,
  privacyClaimAllowed: false,
  nextOperatorCommands: [
    "npm run anonymity:1024-bootstrap-checklist -- --write-evidence",
    "npm run mainnet:shared-cohort-next-action",
    "npm run mainnet:real-funds-approval-preview",
  ],
  runbookRef: "ops/mainnet/anonymity-bootstrap-requests/ANONYMITY-SET-1024-BOOTSTRAP-RUNBOOK-2026-05-30.md",
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Anonymity set 1024 bootstrap status");
  console.log(`- cohort: ${result.cohortId}`);
  console.log(`- fixed bucket: ${result.fixedDenominationBucketUsdc} USDC`);
  console.log(`- depth: ${result.distinctCommitmentCount}/${result.minimumDistinctCommitments}`);
  console.log(`- remaining: ${result.remainingToThreshold}`);
  console.log(`- next milestone: ${result.nextMilestone} (${result.remainingToNextMilestone} to go)`);
  console.log(`- measurement status: ${result.measurementStatus}`);
  console.log(`- reviewer accepted: ${String(result.reviewerAccepted)}`);
  console.log(`- privacy claim: blocked`);
  console.log("- next:");
  for (const command of result.nextOperatorCommands) {
    console.log(`  ${command}`);
  }
}
