import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-production-privacy-reviewer.packet.json");
const packagePath = resolve(repoRoot, "package.json");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

assert.ok(existsSync(packetPath), "Missing production privacy reviewer packet.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const production = readJson("ops/mainnet/actual-private-production-evidence.packet.json");
const settlementReview = readJson("ops/mainnet/actual-private-mainnet-settlement-review.evidence.json");
const relayerReview = readJson("ops/mainnet/private-pool-v2-production-relayer-review.evidence.json");
const anonymity = readJson("ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const hardBlockers = readJson("ops/mainnet/actual-private-hard-blockers.packet.json");

const mainnetRefs = {
  network: "mainnet-beta",
  programId: "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm",
  programDeployTxRef:
    "solana-tx:34syPdrcrwjUvFLiDRzPA597MxNqB8CassbJYu77DN4ECm1u5gLjL2uwhz5bcnHKbeZH4A819kjofCGBvpkP764p",
  createAccountsTxRef:
    "solana-tx:368JyAHH4aAuvFiSuhGhoejuwPvyTDwMtHdrzLgRhqVnbQNrbaCjCHxjsR8Ty7PcoR4kb9xjR7Q674NKZ9BABdGo",
  initTxRef:
    "solana-tx:3zfqv9jKCwWJ2vtwFaViBq2GuaTP6HqjbUqfW8PGYjraumdSvvtVFHiYG1uyLTDDvpLgtwwN4d4XmTjd7D2RQEGU",
  spendEvidenceTxRef:
    "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
  poolState: "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ",
  nullifierSet: "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k",
  outputQueue: "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ",
};

assert.equal(packet.version, "vanta-private-pool-v2-production-privacy-reviewer-packet-0.1");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.privacyClaimAllowed, false);
assert.equal(packet.meaningfulPrivacyReady, false);
assert.equal(packet.reviewPacketReady, true);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");
assert.deepEqual(packet.publicMainnetRefs, mainnetRefs);

for (const [key, relativePath] of Object.entries(packet.evidencePackets)) {
  assert.ok(existsSync(resolve(repoRoot, relativePath)), `Missing evidence packet ${key}: ${relativePath}`);
}

assert.equal(production.privacyClaimAllowed, false);
assert.equal(production.productionReady, false);
assert.equal(settlementReview.reviewStatus, "reviewed-blocked");
assert.equal(settlementReview.liveMainnetSettlementProven, false);
assert.equal(relayerReview.productionRelayerReviewReady, false);
assert.equal(relayerReview.currentReviewRefs.independentReviewerRef, null);
assert.equal(anonymity.currentMeasurement.status, "measured-below-threshold");
assert.equal(anonymity.currentMeasurement.distinctCommitmentCount, 2);
assert.equal(anonymity.currentMeasurement.minimumDistinctCommitments, 1024);
assert.equal(anonymity.currentMeasurement.reviewerAccepted, false);

assert.equal(packet.currentReviewerInputs.relayerSubmittedSpendTxRef, mainnetRefs.spendEvidenceTxRef);
assert.equal(
  packet.currentReviewerInputs.freshBoundedApprovalRef,
  "Clay/founder-approval/2026-04-29-reviewer-packet-evidence-1849-2049",
);
assert.equal(
  packet.currentReviewerInputs.freshBoundedApprovalWindowRef,
  "2026-04-29T18:49:00-20:49:00 America/Los_Angeles",
);
assert.equal(
  packet.currentReviewerInputs.spendProgramConfigRef,
  relayerReview.currentReviewRefs.spendProgramConfigRef,
);
assert.equal(packet.freshReviewerPacketRun.approvalActionRef, "reviewer-packet/mainnet-evidence-run-2026-04-29-1849-2049");
assert.equal(packet.freshReviewerPacketRun.approvalWindowStatus, "expired");
if (hardBlockers.stopBoundary?.liveMainnetActionsAllowedNow === false) {
  assert.notEqual(packet.freshReviewerPacketRun.approvalWindowStatus, "active");
}
assert.equal(packet.freshReviewerPacketRun.fundsMoved, false);
assert.equal(packet.freshReviewerPacketRun.liveTransactionSubmitted, false);
assert.equal(packet.freshReviewerPacketRun.maximumFundsAtRiskRef, "0.015 SOL");
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.status, 200);
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.runtimeMode, "remote-services");
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.storageKind, "postgres-jsonb-snapshot-store");
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.durableStoreConfigured, true);
assert.equal(
  packet.freshReviewerPacketRun.noFundsReplayStatus.nullifierReplayGuardMode,
  "postgres-durable-claim-preflight-and-accepted-reservation",
);
assert.equal(
  packet.freshReviewerPacketRun.actualPrivateReplayProbeCommand,
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-probe-auth",
);
assert.equal(
  packet.freshReviewerPacketRun.actualPrivateReplayReconciliationCommand,
  "doppler run --config prd --project vanta -- npm run mainnet:actual-private-replay-reconcile-auth",
);
assert.equal(
  packet.freshReviewerPacketRun.actualPrivateReplayProbeRefShape,
  "operator-nullifier-replay:<production-duplicate-rejection-ref>",
);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.httpStatus, 200);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.accepted, false);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.replay, true);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.mutated, false);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.reason, "conflicting-durable-nullifier-replay");
assert.equal(
  packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.operatorNullifierReplayRef,
  "operator-nullifier-replay:production-duplicate-rejected-0979e25cb4f98ecba9bb",
);
assert.equal(packet.freshReviewerPacketRun.actualPrivateReplayProbeLastObserved.reconciliationBlocker, null);
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.nullifierReplayGuardStorageMode, "postgres-unique-index");
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.nullifierReplayAcceptedCount, 0);
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.nullifierReplayReservedCount, 0);
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.finalProtocolLayerImplemented, true);
assert.equal(packet.freshReviewerPacketRun.noFundsReplayStatus.productionReady, false);
assert.equal(packet.freshReviewerPacketRun.duplicateNullifierReplayPromotionSatisfied, true);
assert.equal(packet.currentAnonymityMeasurement.distinctCommitmentCount, anonymity.currentMeasurement.distinctCommitmentCount);
assert.equal(packet.currentAnonymityMeasurement.minimumDistinctCommitments, anonymity.currentMeasurement.minimumDistinctCommitments);
assert.equal(packet.currentAnonymityMeasurement.meetsMinimumDistinctCommitments, false);
assert.equal(packet.currentAnonymityMeasurement.reviewerAccepted, false);

const promotionItems = new Map(packet.requiredToPromote.map((item) => [item.id, item]));
for (const id of [
  "shared-cohort-deposit-transaction",
  "live-nullifier-replay-rejection",
  "independent-reviewer-or-audit",
  "audited-anonymity-set",
  "third-party-audit-report-and-fix-verification",
  "minimum-live-commitments",
]) {
  assert.ok(promotionItems.has(id), `Missing reviewer promotion blocker ${id}.`);
}
assert.equal(promotionItems.get("shared-cohort-deposit-transaction").currentRef, null);
assert.equal(
  promotionItems.get("live-nullifier-replay-rejection").currentRef,
  "operator-nullifier-replay:production-duplicate-rejected-0979e25cb4f98ecba9bb",
);
assert.equal(promotionItems.get("independent-reviewer-or-audit").currentRef, null);
assert.equal(promotionItems.get("audited-anonymity-set").currentRef, null);
assert.equal(promotionItems.get("third-party-audit-report-and-fix-verification").currentRef, null);
assert.equal(promotionItems.get("third-party-audit-report-and-fix-verification").status, "blocked");
assert.equal(promotionItems.get("minimum-live-commitments").status, "blocked-below-threshold");

for (const command of [
  "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  "npm run mainnet:actual-private-production-evidence-check",
  "npm run mainnet:actual-private-settlement-review-check",
  "npm run private-pool-v2:production-relayer-review-check",
  "npm run private-pool-v2:anonymity-set-metrics-check",
  "npm run private-pool-v2:anonymity-set-evidence-check",
  "npm run private-pool-v2:relayer-separation-evidence-check",
  "npm run mainnet:actual-private-replay-probe-check",
  "npm run mainnet:actual-private-replay-reconcile-check",
  "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
  "npm run truth:privacy-claim-gate",
  "npm run mainnet:private-settlement-check",
]) {
  assert.ok(packet.canonicalVerificationCommands.includes(command), `Missing canonical command: ${command}`);
}

const replayProbeChecklist = packet.reviewerChecklist.find(
  (item) => item.id === "probe-actual-private-production-replay",
);
assert.ok(replayProbeChecklist, "Reviewer packet must expose the production replay probe step.");
assert.equal(replayProbeChecklist.status, "ready-auth-required-non-mutating");
assert.equal(replayProbeChecklist.command, "npm run mainnet:actual-private-replay-probe-auth");

const replayReconciliationChecklist = packet.reviewerChecklist.find(
  (item) => item.id === "reconcile-actual-private-replay-state",
);
assert.ok(replayReconciliationChecklist, "Reviewer packet must expose the actual-private replay reconciliation step.");
assert.equal(replayReconciliationChecklist.status, "ready-auth-required-non-mutating");
assert.equal(replayReconciliationChecklist.command, "npm run mainnet:actual-private-replay-reconcile-auth");

const sharedCohortDepositChecklist = packet.reviewerChecklist.find(
  (item) => item.id === "inspect-shared-cohort-deposit-requirement",
);
assert.ok(sharedCohortDepositChecklist, "Reviewer packet must expose the shared-cohort deposit review step.");
assert.equal(sharedCohortDepositChecklist.status, "ready-blocked-no-live-solana-tx");
assert.equal(
  sharedCohortDepositChecklist.command,
  "npm run mainnet:actual-private-shared-cohort-deposit-review",
);

for (const nonClaim of [
  "not production private",
  "not anonymous",
  "not untraceable",
  "not audited",
  "not mainnet-ready private settlement",
  "not a third-party-reviewed privacy claim",
]) {
  assert.ok(packet.nonClaims.includes(nonClaim), `Missing non-claim: ${nonClaim}`);
}

const serialized = JSON.stringify(packet);
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
  "fee-payer keypair JSON:",
]) {
  assert.ok(!serialized.includes(forbidden), `Production privacy reviewer packet must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["private-pool-v2:production-privacy-reviewer-packet-check"],
  "node scripts/check-vanta-private-pool-v2-production-privacy-reviewer-packet.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes(
    "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  ),
  "mainnet:preflight must include the production privacy reviewer packet check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes(
    "npm run private-pool-v2:production-privacy-reviewer-packet-check",
  ),
  "private-pool-v2:verify must include the production privacy reviewer packet check.",
);

console.log("Vanta Private Pool v2 production privacy reviewer packet check: PASS");
