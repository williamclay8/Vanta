import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const writerPath = resolve(repoRoot, "scripts/write-vanta-actual-private-mainnet-settlement-evidence.mjs");
const packagePath = resolve(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const writerSource = readFileSync(writerPath, "utf8");
const fixtureRelayerSignature = "4".repeat(88);
const fixtureDepositSignature = "5".repeat(88);
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();
const fixtureCurrentApprovalWindowRef = `approval-window:${approvalStatus.approvalWindowRef
  .replace(" ", "-")
  .replace("/", "_")}`;

const okRun = spawnSync("node", [writerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "solscan-root-review:actual-private-demo-root",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "review:asset-id-commitment-present-raw-asset-hidden",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "reviewer:clay-mainnet-evidence-packet",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF: fixtureCurrentApprovalWindowRef,
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "operator-nullifier-replay:production-duplicate-rejected-demo",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "operator-receipt:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "review:public-transcript-no-linkage",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF: `solana-tx:${fixtureRelayerSignature}`,
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "review:safe-telemetry-no-private-inputs",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: `solana-tx:${fixtureDepositSignature}`,
  },
});

assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);
const evidence = JSON.parse(okRun.stdout);

assert.equal(evidence.version, "vanta-actual-private-mainnet-settlement-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.liveMainnetSettlementProven, false);
assert.equal(evidence.currentStatus, "filled-refs-awaiting-review");
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.equal(evidence.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(evidence.evidenceRefs.assetIdCommitmentReviewRef, "review:asset-id-commitment-present-raw-asset-hidden");
assert.equal(evidence.evidenceRefs.protocolSettlementRef, "operator-protocol-settlement:actual-private-settlement");
assert.equal(evidence.evidenceRefs.relayerSubmittedSpendTxRef, `solana-tx:${fixtureRelayerSignature}`);
assert.equal(evidence.evidenceRefs.sharedCohortDepositTxRef, `solana-tx:${fixtureDepositSignature}`);
assert.equal(Object.keys(evidence.evidenceRefs).length, 11);

const serialized = JSON.stringify(evidence);
for (const forbidden of [
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
]) {
  assert.ok(!serialized.includes(forbidden), `Settlement evidence writer must not output ${forbidden}.`);
}

const blockedRun = spawnSync("node", [writerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "ok-root-ref",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "ok-asset-id-commitment-review-ref",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "ok-reviewer-ref",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF: fixtureCurrentApprovalWindowRef,
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "operator-nullifier-replay:production-duplicate-rejected-demo",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "ok-receipt-ref",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "ok-protocol-ref",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "ok-transcript-ref",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF: "signedTransaction:raw",
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "ok-telemetry-ref",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: "ok-deposit-ref",
  },
});

assert.notEqual(blockedRun.status, 0, "Writer must reject secret-like evidence refs.");
assert.ok(!blockedRun.stdout.includes("signedTransaction:raw"), "Writer must not echo rejected signed transaction material.");

const operatorRefAsRelayerTxRun = spawnSync("node", [writerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "ok-root-ref",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "ok-asset-id-commitment-review-ref",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "ok-reviewer-ref",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF: fixtureCurrentApprovalWindowRef,
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "operator-nullifier-replay:production-duplicate-rejected-demo",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "ok-receipt-ref",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "ok-transcript-ref",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF:
      "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "ok-telemetry-ref",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: `solana-tx:${fixtureDepositSignature}`,
  },
});

assert.notEqual(operatorRefAsRelayerTxRun.status, 0, "Writer must reject operator refs in the relayer tx slot.");
assert.match(operatorRefAsRelayerTxRun.stderr, /solana-tx:<signature> ref/);

const staleApprovalWindowRun = spawnSync("node", [writerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "ok-root-ref",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "ok-asset-id-commitment-review-ref",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "ok-reviewer-ref",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF:
      "approval-window:2026-04-28T18:00:00-19:00:00-America-Los_Angeles",
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "operator-nullifier-replay:production-duplicate-rejected-demo",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "ok-receipt-ref",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "ok-transcript-ref",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF: `solana-tx:${fixtureRelayerSignature}`,
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "ok-telemetry-ref",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: `solana-tx:${fixtureDepositSignature}`,
  },
});

assert.notEqual(staleApprovalWindowRun.status, 0, "Writer must reject stale approval-window refs by default.");
assert.match(staleApprovalWindowRun.stderr, /must match the current bounded approval window/);

const historicalApprovalWindowRun = spawnSync("node", [writerPath, "--dry-run", "--allow-historical-approval"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "ok-root-ref",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "ok-asset-id-commitment-review-ref",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "ok-reviewer-ref",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF:
      "approval-window:2026-04-28T18:00:00-19:00:00-America-Los_Angeles",
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "operator-nullifier-replay:production-duplicate-rejected-demo",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "ok-receipt-ref",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "ok-transcript-ref",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF: `solana-tx:${fixtureRelayerSignature}`,
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "ok-telemetry-ref",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: `solana-tx:${fixtureDepositSignature}`,
  },
});

assert.equal(
  historicalApprovalWindowRun.status,
  0,
  historicalApprovalWindowRun.stderr || historicalApprovalWindowRun.stdout,
);
assert.equal(
  JSON.parse(historicalApprovalWindowRun.stdout).currentStatus,
  "historical-approval-refs-awaiting-review",
  "Historical approval evidence must not use the fresh filled-refs status.",
);

const reviewRefAsReplayRun = spawnSync("node", [writerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_FRESHNESS_REF: "ok-root-ref",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REVIEW_REF: "ok-asset-id-commitment-review-ref",
    VANTA_ACTUAL_PRIVATE_AUDIT_OR_REVIEWER_REF: "ok-reviewer-ref",
    VANTA_ACTUAL_PRIVATE_BOUNDED_APPROVAL_WINDOW_REF: fixtureCurrentApprovalWindowRef,
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REPLAY_REJECTION_REF:
      "review:nullifier-replay-live-retry-not-run-stop-condition-preserved",
    VANTA_ACTUAL_PRIVATE_OPERATOR_RECEIPT_REF: "ok-receipt-ref",
    VANTA_ACTUAL_PRIVATE_PROTOCOL_SETTLEMENT_REF: "operator-protocol-settlement:actual-private-settlement",
    VANTA_ACTUAL_PRIVATE_PUBLIC_TRANSCRIPT_REVIEW_REF: "ok-transcript-ref",
    VANTA_ACTUAL_PRIVATE_RELAYER_SUBMITTED_SPEND_TX_REF: `solana-tx:${fixtureRelayerSignature}`,
    VANTA_ACTUAL_PRIVATE_SAFE_TELEMETRY_REVIEW_REF: "ok-telemetry-ref",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: `solana-tx:${fixtureDepositSignature}`,
  },
});

assert.notEqual(reviewRefAsReplayRun.status, 0, "Writer must reject review refs in the live replay slot.");
assert.match(reviewRefAsReplayRun.stderr, /operator-nullifier-replay:<production-duplicate-rejection-ref>/);

for (const forbiddenSourceTerm of ["sendRawTransaction", "sendAndConfirmTransaction", "Keypair.fromSecretKey", "bs58.decode"]) {
  assert.ok(!writerSource.includes(forbiddenSourceTerm), `Evidence writer must not submit transactions: ${forbiddenSourceTerm}`);
}
assert.ok(
  writerSource.includes("allowConsumedApprovalEvidence"),
  "Evidence writer must include an explicit consumed-approval evidence mode.",
);
assert.ok(
  writerSource.includes("approvalStatus.stopCondition.appliesToCurrentApproval"),
  "Evidence writer must inspect the current approval stop condition before writing fresh evidence.",
);
assert.ok(
  writerSource.includes("consumed-approval"),
  "Evidence writer must have a non-promoting consumed approval status.",
);

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-evidence-preview"],
  "node scripts/write-vanta-actual-private-mainnet-settlement-evidence.mjs --dry-run",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-evidence-writer-check"],
  "node scripts/check-vanta-actual-private-mainnet-settlement-evidence-writer.mjs",
);

console.log("Vanta actual-private mainnet settlement evidence writer check: PASS");
