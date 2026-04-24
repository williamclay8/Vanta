import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const approvalEvidencePath = resolve(repoRoot, "ops/mainnet/mainnet-real-funds-approval.evidence.json");
const approvalGatesEvidencePath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.evidence.json");
const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--write");
const writeMode = process.argv.includes("--write");

const requiredEnv = [
  "VANTA_MAINNET_APPROVAL_RECORD_REF",
  "VANTA_MAINNET_APPROVAL_ACTION_REF",
  "VANTA_MAINNET_APPROVAL_ACTION_SUMMARY",
  "VANTA_MAINNET_APPROVAL_ENVIRONMENT",
  "VANTA_MAINNET_APPROVAL_FEE_PAYER_REF",
  "VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF",
  "VANTA_MAINNET_APPROVAL_ROLLBACK_PLAN_REF",
  "VANTA_MAINNET_APPROVAL_STOP_LOSS_PLAN_REF",
  "VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF",
  "VANTA_MAINNET_APPROVAL_APPROVED_BY_REF",
];

const forbiddenFragments = [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "sk_live_",
];

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  assert.ok(value, `Missing required environment variable ${name}.`);
  for (const forbidden of forbiddenFragments) {
    assert.ok(!value.includes(forbidden), `${name} must not contain ${forbidden}.`);
  }
  return value;
}

function assertRefLike(name, value) {
  assert.ok(
    /^[A-Za-z0-9/_:.\-]+(?: [A-Za-z0-9/_:.\-]+)*$/.test(value) || value.endsWith("_REF"),
    `${name} must remain a refs-only string, not a secret or opaque credential.`,
  );
}

function assertLaunchWindowRef(value) {
  assert.match(
    value,
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2}) ([A-Za-z_]+\/[A-Za-z_]+)$/,
    "VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF must use '<date>T<start>-<end> <IANA timezone>' format.",
  );
}

function buildApprovalRecord() {
  const approvalRecordRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_RECORD_REF");
  const approvedActionRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_ACTION_REF");
  const approvedActionSummary = readRequiredEnv("VANTA_MAINNET_APPROVAL_ACTION_SUMMARY");
  const approvedEnvironment = readRequiredEnv("VANTA_MAINNET_APPROVAL_ENVIRONMENT");
  const approvedFeePayerRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_FEE_PAYER_REF");
  const approvedLaunchWindowRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF");
  const rollbackPlanRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_ROLLBACK_PLAN_REF");
  const stopLossPlanRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_STOP_LOSS_PLAN_REF");
  const maximumFundsAtRiskRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF");
  const approvedByRef = readRequiredEnv("VANTA_MAINNET_APPROVAL_APPROVED_BY_REF");

  assert.ok(approvalRecordRef.endsWith("_REF"), "VANTA_MAINNET_APPROVAL_RECORD_REF must remain a ref name.");
  assertLaunchWindowRef(approvedLaunchWindowRef);
  for (const [name, value] of [
    ["VANTA_MAINNET_APPROVAL_ACTION_REF", approvedActionRef],
    ["VANTA_MAINNET_APPROVAL_FEE_PAYER_REF", approvedFeePayerRef],
    ["VANTA_MAINNET_APPROVAL_ROLLBACK_PLAN_REF", rollbackPlanRef],
    ["VANTA_MAINNET_APPROVAL_STOP_LOSS_PLAN_REF", stopLossPlanRef],
    ["VANTA_MAINNET_APPROVAL_MAX_FUNDS_REF", maximumFundsAtRiskRef],
    ["VANTA_MAINNET_APPROVAL_APPROVED_BY_REF", approvedByRef],
  ]) {
    assertRefLike(name, value);
  }
  assert.ok(
    approvedEnvironment === "mainnet-beta" || approvedEnvironment === "mainnet",
    "VANTA_MAINNET_APPROVAL_ENVIRONMENT must remain mainnet-beta or mainnet.",
  );

  return {
    status: "approved",
    approvalRecordRef,
    approvedActionRef,
    approvedActionSummary,
    approvedEnvironment,
    approvedFeePayerRef,
    approvedLaunchWindowRef,
    rollbackPlanRef,
    stopLossPlanRef,
    maximumFundsAtRiskRef,
    approvedByRef,
  };
}

function updateApprovalEvidence(record) {
  const current = JSON.parse(readFileSync(approvalEvidencePath, "utf8"));
  return {
    ...current,
    checkedAt: new Date().toISOString(),
    realFundsAllowed: true,
    status: "approved-bounded-action",
    approvalRecord: record,
  };
}

function updateApprovalGatesEvidence(record) {
  const current = JSON.parse(readFileSync(approvalGatesEvidencePath, "utf8"));
  const gates = current.gates.map((gate) =>
    gate.id === "explicit-mainnet-funds-approval"
      ? {
          ...gate,
          status: "approved-bounded-action",
          currentEvidenceStatus: "approved-bounded-mainnet-action",
          approvedActionSummary: record.approvedActionSummary,
          approvedActionRef: record.approvedActionRef,
          approvedFeePayerRef: record.approvedFeePayerRef,
          approvedLaunchWindowRef: record.approvedLaunchWindowRef,
          rollbackPlanRef: record.rollbackPlanRef,
          stopLossPlanRef: record.stopLossPlanRef,
          maximumFundsAtRiskRef: record.maximumFundsAtRiskRef,
          approvedByRef: record.approvedByRef,
          nextAction:
            "Execute only the approved bounded action or return this gate to blocked before changing action, window, fee payer, or funds at risk.",
        }
      : gate,
  );

  const limitations = current.limitations.map((entry) =>
    entry.startsWith("Explicit mainnet real-funds approval is recorded only for ")
      ? `Explicit mainnet real-funds approval is recorded only for ${record.approvedActionSummary}.`
      : entry,
  );

  return {
    ...current,
    checkedAt: new Date().toISOString(),
    realFundsAllowed: true,
    status: "bounded-real-funds-approval-recorded-with-operator-skipped-controls",
    gates,
    limitations,
  };
}

const approvalRecord = buildApprovalRecord();
const nextApprovalEvidence = updateApprovalEvidence(approvalRecord);
const nextApprovalGatesEvidence = updateApprovalGatesEvidence(approvalRecord);

const result = {
  checkedAt: nextApprovalEvidence.checkedAt,
  dryRun,
  files: {
    approvalEvidenceRef: "ops/mainnet/mainnet-real-funds-approval.evidence.json",
    approvalGatesEvidenceRef: "ops/mainnet/mainnet-approval-gates.evidence.json",
  },
  mainnetReady: false,
  productionReady: false,
  realFundsAllowed: true,
  safety:
    "No private keys, seed phrases, raw database URLs, bearer tokens, or signed transactions are written by this command.",
  updatedApproval: {
    actionRef: approvalRecord.approvedActionRef,
    actionSummary: approvalRecord.approvedActionSummary,
    approvedByRef: approvalRecord.approvedByRef,
    environment: approvalRecord.approvedEnvironment,
    feePayerRef: approvalRecord.approvedFeePayerRef,
    launchWindowRef: approvalRecord.approvedLaunchWindowRef,
    maximumFundsAtRiskRef: approvalRecord.maximumFundsAtRiskRef,
    rollbackPlanRef: approvalRecord.rollbackPlanRef,
    stopLossPlanRef: approvalRecord.stopLossPlanRef,
  },
  version: "vanta-mainnet-real-funds-approval-writer-0.1",
};

if (writeMode) {
  writeFileSync(approvalEvidencePath, `${JSON.stringify(nextApprovalEvidence, null, 2)}\n`);
  writeFileSync(approvalGatesEvidencePath, `${JSON.stringify(nextApprovalGatesEvidence, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
