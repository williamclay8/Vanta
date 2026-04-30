import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaMainnetPrivateSettlementStatus } from "../src/readiness/mainnetPrivateSettlementStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");

const result = createVantaMainnetPrivateSettlementStatus();
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.equal(result.version, "vanta-mainnet-private-settlement-status-0.1");
assert.equal(result.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(
  result.anonymitySetReadiness?.version,
  "vanta-private-pool-v2-anonymity-set-readiness-0.1",
);
assert.equal(result.anonymitySetReadiness?.anonymitySetReadiness, "blocked");
assert.equal(result.anonymitySetReadiness?.minimumDistinctCommitments, 1024);
assert.equal(result.mainnetReady, false);
assert.equal(result.productionReady, false);
assert.equal(result.meaningfulPrivacyReady, false);
assert.equal(result.auditedSharedAnonymitySetAvailable, false);
assert.equal(result.liveMainnetPrivateSettlementAvailable, false);
assert.equal(
  result.boundedRealFundsApprovalWindowActive,
  result.realFundsApprovalWindowStatus === "active" &&
    !result.realFundsStopCondition.appliesToCurrentApproval &&
    result.privateSettlementApprovalScoped,
);
assert.equal(result.privacyClaimAllowed, false);
assert.equal(result.privacyRailCanClaimMeaningfulPrivacy, false);
assert.equal(result.settlementReadiness, "no-real-funds-production-smoke-only");
assert.equal(result.routeHealthPublicPassed, true);
assert.equal(result.routeHealthAuthenticatedPassed, true);
assert.equal(result.productionSmokeHealthPassed, true);
assert.equal(result.productionSmokeTargetsPassed, true);
assert.equal(result.replayProtocolLayerImplemented, true);
assert.equal(
  result.actualPrivateMainnetEvidence.evidenceStatus,
  "mainnet-spend-program-evidence-observed-reviewed-blocked",
);
assert.equal(result.actualPrivateMainnetEvidence.reviewStatus, "reviewed-blocked");
assert.equal(result.actualPrivateMainnetEvidence.liveMainnetSettlementProven, false);
assert.equal(result.actualPrivateMainnetEvidence.noRealFundsSmokeTargetPassed, true);
assert.equal(
  result.actualPrivateMainnetEvidence.noRealFundsSmokeTranscript,
  "pool-cohort-root-nullifier-output-context-only",
);
assert.equal(
  result.actualPrivateMainnetEvidence.promotionDecision.reviewedLiveAllowed,
  false,
);
assert.equal(
  result.actualPrivateMainnetEvidence.promotionDecision.requiredApprovedReviewStatus,
  "reviewed-live",
);
assert.deepEqual(result.actualPrivateMainnetEvidence.promotionDecision.blockedBy, [
  "shared-cohort-deposit-transaction",
  "independent-reviewer-or-audit",
]);
assert.equal(
  result.actualPrivateMainnetEvidence.lineage.currentApprovalActionRef,
  result.realFundsApprovalActionRef,
);
assert.ok(
  /^approval-window:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}-America[-_]Los_Angeles$/.test(
    result.actualPrivateMainnetEvidence.evidenceRefs.boundedApprovalWindowRef,
  ),
  "Settlement evidence approval window must remain a refs-only bounded approval window.",
);
assert.equal(
  result.actualPrivateMainnetEvidence.lineage.settlementEvidenceMatchesCurrentApproval,
  result.actualPrivateMainnetEvidence.lineage.settlementEvidenceApprovalWindowRef ===
    result.actualPrivateMainnetEvidence.lineage.currentApprovalWindowRef,
);
assert.ok(
  result.actualPrivateMainnetEvidence.lineage.lineageWarning.includes("must not be read as promoting"),
  "Private settlement status must preserve approval-lineage non-promotion warning.",
);
for (const [key, value] of Object.entries(result.actualPrivateMainnetEvidence.evidenceRefs)) {
  assert.ok(typeof value === "string" && value.length > 0, `Missing actual-private evidence ref ${key}.`);
}
assert.match(
  result.actualPrivateMainnetEvidence.evidenceRefs.relayerSubmittedSpendTxRef,
  /^solana-tx:[1-9A-HJ-NP-Za-km-z]{64,88}$/,
);
assert.match(
  result.actualPrivateMainnetEvidence.evidenceRefs.nullifierReplayRejectionRef,
  /^operator-nullifier-replay:[A-Za-z0-9/_:.\-#]+$/,
);
const hardPromotionBlockers = new Map(
  result.actualPrivateMainnetEvidence.hardPromotionBlockers.map((blocker) => [blocker.id, blocker]),
);
assert.equal(
  hardPromotionBlockers.get("shared-cohort-deposit-transaction")?.requiredRefShape,
  "solana-tx:<shared-cohort-deposit-mainnet-signature>",
);
assert.equal(
  hardPromotionBlockers.get("shared-cohort-deposit-transaction")?.currentState,
  "placeholder-review-ref",
);
assert.equal(
  hardPromotionBlockers.get("live-nullifier-replay-rejection")?.requiredRefShape,
  "operator-nullifier-replay:<production-duplicate-rejection-ref>",
);
for (const requiredLiveEvidence of [
  "bounded real-funds approval for the exact actual-private action",
  "live mainnet deposit transaction into the shared cohort",
  "live mainnet relayer-submitted private spend transaction",
  "post-settlement nullifier replay rejection against the live production store",
]) {
  assert.ok(
    result.actualPrivateMainnetEvidence.requiredLiveEvidence.includes(requiredLiveEvidence),
    `Missing required live evidence text: ${requiredLiveEvidence}`,
  );
}
assert.equal(result.actualPrivateMainnetEvidence.status, "mainnet-spend-program-evidence-observed-reviewed-blocked");
assert.equal(result.realFundsApprovalRecorded, true);
assert.equal(result.realFundsAllowedNow, result.boundedRealFundsApprovalWindowActive);
assert.equal(
  result.realFundsApprovalAllowedNow,
  result.realFundsApprovalWindowStatus === "active" && !result.realFundsStopCondition.appliesToCurrentApproval,
);
assert.equal(result.privateSettlementApprovalScoped, result.realFundsApprovalActionRef.startsWith("actual-private/"));
assert.equal(result.noRealFundsSmokeOnly, true);
const expectedMeaningfulPrivacyBlockedBy = [
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  "no-third-party-audit",
  "production-anonymity-set-measured-below-threshold",
  "no-independent-anonymity-set-measurement-review",
  "no-independent-production-relayer-separation-review",
  "no-proven-audited-shared-anonymity-set",
  "no-proven-live-mainnet-private-settlement-evidence",
  ...(result.boundedRealFundsApprovalWindowActive ? [] : ["no-active-actual-private-settlement-approval-window"]),
];
assert.deepEqual(result.meaningfulPrivacyBlockedBy, [...new Set(expectedMeaningfulPrivacyBlockedBy)]);
assert.ok(
  ["scheduled", "active", "expired"].includes(result.realFundsApprovalWindowStatus),
  "Private settlement status must expose a bounded approval-window status.",
);
assert.deepEqual(result.checkedEvidenceRefs, [
  "ops/mainnet/private-pool-v2-route-health.evidence.json",
  "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
  "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
  "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
  "ops/mainnet/actual-private-production-evidence.packet.json",
  "ops/mainnet/actual-private-mainnet-settlement.evidence.template.json",
  "ops/mainnet/actual-private-mainnet-settlement.evidence.json",
  "ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
  "ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json",
  "ops/mainnet/service-deployment.evidence.json",
  "ops/mainnet/mainnet-real-funds-approval.evidence.json",
]);
assert.ok(
  result.deploymentTruth.includes("no-real-funds production smoke coverage"),
  "Private settlement status must preserve the no-real-funds production smoke truth.",
);
assert.ok(
  result.deploymentTruth.includes("observed mainnet spend-program evidence"),
  "Private settlement status must expose observed mainnet spend-program evidence without promoting readiness.",
);
assert.ok(
  result.deploymentTruth.includes("must not be presented as live mainnet private settlement"),
  "Private settlement status must preserve the non-ready user-facing truth.",
);
assert.ok(
  result.deploymentTruth.includes("no proven audited shared anonymity set"),
  "Private settlement status must preserve the missing audited-anonymity-set truth.",
);
assert.ok(
  result.deploymentTruth.includes("no reviewed shared-cohort deposit evidence"),
  "Private settlement status must preserve the missing shared-cohort deposit truth.",
);
assert.ok(
  result.deploymentTruth.includes("no reviewed live production replay rejection"),
  "Private settlement status must preserve the missing live production replay truth.",
);
assert.ok(
  result.boundedRealFundsApprovalWindowActive
    ? result.deploymentTruth.includes("current bounded real-funds approval window is active only for")
    : result.realFundsApprovalAllowedNow && !result.privateSettlementApprovalScoped
      ? result.deploymentTruth.includes("not actual-private settlement")
    : result.realFundsStopCondition.appliesToCurrentApproval
      ? result.deploymentTruth.includes("bounded real-funds approval window has already hit its stop condition")
    : result.deploymentTruth.includes("no active bounded real-funds approval window"),
  "Private settlement status must preserve the current bounded-approval-window truth.",
);

assert.equal(
  packageJson.scripts["mainnet:private-settlement-status"],
  "node scripts/print-vanta-mainnet-private-settlement-status.mjs",
  "package.json must expose mainnet:private-settlement-status.",
);
assert.equal(
  packageJson.scripts["mainnet:private-settlement-status-check"],
  "node scripts/print-vanta-mainnet-private-settlement-status.mjs --check",
  "package.json must expose mainnet:private-settlement-status-check.",
);
assert.equal(
  packageJson.scripts["mainnet:private-settlement-check"],
  "node scripts/check-vanta-mainnet-private-settlement-status.mjs",
  "package.json must expose mainnet:private-settlement-check.",
);
assert.equal(
  packageJson.scripts["private-pool-v2:anonymity-set-readiness-check"],
  "node scripts/check-vanta-private-pool-v2-anonymity-set-readiness.mjs",
  "package.json must expose private-pool-v2:anonymity-set-readiness-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:private-settlement-check"),
  "mainnet:preflight must include the private settlement status check.",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-production-evidence-check"],
  "node scripts/check-vanta-actual-private-production-evidence.mjs",
  "package.json must expose mainnet:actual-private-production-evidence-check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-production-evidence-check"),
  "mainnet:preflight must include actual-private production evidence check.",
);

console.log("Vanta mainnet private settlement status check: PASS");
