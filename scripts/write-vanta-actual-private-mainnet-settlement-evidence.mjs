import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement.evidence.json");
const templatePath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json");
const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--write");
const writeMode = process.argv.includes("--write");

const requiredEnv = [
  "VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF",
  "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF",
  "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF",
  "VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF",
  "VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF",
  "VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF",
  "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF",
  "VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF",
  "VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF",
  "VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF",
  "VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF",
];

const forbiddenFragments = [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
  "inputCommitment",
  "inputLeafIndex",
  "noteSecret",
  "merchantSettlementAddress",
];

function readRequiredRef(name) {
  const value = process.env[name]?.trim();
  assert.ok(value, `Missing required actual-private settlement evidence ref ${name}.`);
  assertRefLike(name, value);
  for (const forbidden of forbiddenFragments) {
    assert.ok(!value.includes(forbidden), `${name} must not contain ${forbidden}.`);
  }
  return value;
}

function readRequiredSolanaTxRef(name) {
  const value = readRequiredRef(name);
  const signature = value.startsWith("solscan:") ? value.slice("solscan:".length) : value;
  assert.ok(
    /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature),
    `${name} must be a Solana transaction signature ref, not an operator receipt or placeholder.`,
  );
  return value;
}

function assertRefLike(name, value) {
  assert.ok(
    value.endsWith("_REF") || /^[A-Za-z0-9/_:.\-#]+$/.test(value),
    `${name} must be a refs-only identifier, not raw private material.`,
  );
}

function buildEvidence() {
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  const refs = Object.fromEntries(requiredEnv.map((name) => [name, readRequiredRef(name)]));
  refs.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF = readRequiredSolanaTxRef(
    "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF",
  );
  refs.VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF = readRequiredSolanaTxRef(
    "VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF",
  );

  return {
    activePrivacyRailId: template.activePrivacyRailId,
    checkedAt: new Date().toISOString(),
    currentStatus: "filled-refs-awaiting-review",
    evidenceRefs: {
      acceptedRootFreshnessRef: refs.VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF,
      assetIdCommitmentReviewRef: refs.VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF,
      auditOrReviewerRef: refs.VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF,
      boundedApprovalWindowRef: refs.VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF,
      nullifierReplayRejectionRef: refs.VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF,
      operatorReceiptRef: refs.VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF,
      protocolSettlementRef: refs.VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF,
      publicTranscriptReviewRef: refs.VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF,
      relayerSubmittedSpendTxRef: refs.VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF,
      safeTelemetryReviewRef: refs.VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF,
      sharedCohortDepositTxRef: refs.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF,
    },
    liveMainnetSettlementProven: false,
    mainnetReady: false,
    privacyClaimAllowed: false,
    productionReady: false,
    requiredApprovalRef: template.requiredApprovalRef,
    requiredChecksAfterLiveRun: template.requiredChecksAfterLiveRun,
    requiredPreflightRef: template.requiredPreflightRef,
    secretPolicy: template.secretPolicy,
    templateRef: "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json",
    version: "vanta-actual-private-mainnet-settlement-evidence-0.1",
  };
}

const evidence = buildEvidence();
const serialized = JSON.stringify(evidence, null, 2);
for (const forbidden of forbiddenFragments) {
  assert.ok(!serialized.includes(forbidden), `Actual-private settlement evidence leaked ${forbidden}.`);
}

console.log(serialized);
if (writeMode && !dryRun) {
  writeFileSync(outputPath, `${serialized}\n`);
}
