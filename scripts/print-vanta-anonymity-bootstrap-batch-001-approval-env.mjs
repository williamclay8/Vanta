import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const planPath = resolve(
  repoRoot,
  "ops/mainnet/anonymity-bootstrap-requests/anonymity-bootstrap-batch-001-plan.evidence.json",
);
const approvalEvidencePath = resolve(repoRoot, "ops/mainnet/mainnet-real-funds-approval.evidence.json");

const jsonMode = process.argv.includes("--json");
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const approvalEvidence = JSON.parse(readFileSync(approvalEvidencePath, "utf8"));

const window = buildLaunchWindowRef(process.argv.includes("--start-now") ? new Date() : null);
const actionRef = `anonymity-bootstrap/batch-001-stablecoin-usdc-v1-${window.slug}-central`;
const actionSummary = plan.approvalActionSummaryShape.replace(
  "Anonymity bootstrap batch 001:",
  "Anonymity bootstrap batch 001:",
);

const env = {
  VANTA_MAINNET_APPROVAL_RECORD_REF: "VANTA_MAINNET_REAL_FUNDS_APPROVAL_REF",
  VANTA_MAINNET_APPROVAL_ACTION_REF: actionRef,
  VANTA_MAINNET_APPROVAL_ACTION_SUMMARY: actionSummary,
  VANTA_MAINNET_APPROVAL_ENVIRONMENT: "mainnet-beta",
  VANTA_MAINNET_APPROVAL_FEE_PAYER_REF:
    approvalEvidence.approvalRecord?.approvedFeePayerRef ??
    "wallet/public-fee-payer-vanta-mainnet-5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
  VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF: window.ref,
  VANTA_MAINNET_APPROVAL_ROLLBACK_PLAN_REF: "runbook/disable-private-pool-v2-services-and-live-actions",
  VANTA_MAINNET_APPROVAL_STOP_LOSS_PLAN_REF:
    "stop-after-batch-001-if-unexpected-indexer-count-preflight-failure-replay-check-failure-or-515-usdc-cap",
  VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF: plan.fundsAtRisk.maximumFundsAtRiskRef,
  VANTA_MAINNET_APPROVAL_APPROVED_BY_REF: "Clay/founder-approval/2026-05-30-anonymity-bootstrap-batch-001",
};

const result = {
  version: "vanta-anonymity-bootstrap-batch-001-approval-env-0.1",
  checkedAt: new Date().toISOString(),
  batchId: plan.batchId,
  cohortId: plan.cohort.id,
  fixedBucketUsdc: plan.fixedDenomination.bucketAmount,
  shieldCount: plan.batchPlan.shieldCount,
  launchWindowRef: window.ref,
  launchWindowSlug: window.slug,
  currentApprovalExpired: approvalEvidence.approvalRecord?.approvedLaunchWindowRef ?? null,
  env,
  previewCommand: "npm run mainnet:real-funds-approval-preview",
  writeCommand: "npm run mainnet:real-funds-approval-write",
  safety:
    "Refs-only helper. Review the window and funds cap before write. Do not paste private keys, seeds, DB URLs, or bearer tokens.",
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("# Anonymity bootstrap batch 001 — bounded approval env");
  console.log(`# cohort: ${plan.cohort.id}`);
  console.log(`# bucket: ${plan.fixedDenomination.bucketAmount} USDC × ${plan.batchPlan.shieldCount} shields + 1 shared-cohort deposit`);
  console.log(`# estimated depth after batch: ${plan.batchPlan.estimatedDepthAfterBatch}/1024`);
  console.log(`# launch window: ${window.ref}`);
  console.log("");
  for (const [key, value] of Object.entries(env)) {
    console.log(`export ${key}=${shellQuote(value)}`);
  }
  console.log("");
  console.log("npm run mainnet:real-funds-approval-preview");
  console.log("# after review:");
  console.log("npm run mainnet:real-funds-approval-write");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildLaunchWindowRef(startAt) {
  const start = startAt ?? defaultStart();
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const date = formatChicagoParts(start).date;
  const startTime = formatChicagoParts(start).time;
  const endTime = formatChicagoParts(end).time;
  const slug = `${date.replace(/-/g, "")}-${startTime.replace(/:/g, "").slice(0, 4)}-${endTime
    .replace(/:/g, "")
    .slice(0, 4)}`;
  return {
    ref: `${date}T${startTime}-${endTime} America/Chicago`,
    slug,
  };
}

function defaultStart() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
  now.setSeconds(0, 0);
  return now;
}

function formatChicagoParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}
