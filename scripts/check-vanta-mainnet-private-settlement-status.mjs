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
assert.deepEqual(result.actualPrivateMainnetEvidence, {
  evidenceRefs: {
    acceptedRootFreshnessRef: "review:accepted-root-current-production-indexer-2055-2220",
    assetIdCommitmentReviewRef: "review:asset-id-commitment-present-raw-asset-hidden-2055-2220",
    auditOrReviewerRef: "reviewer:clay-mainnet-evidence-packet-2055-2220",
    boundedApprovalWindowRef: "approval-window:2026-04-28T20:55:00-22:20:00-America-Los_Angeles",
    nullifierReplayRejectionRef: "review:nullifier-replay-live-retry-not-run-stop-condition-preserved-2055-2220",
    operatorReceiptRef: "operator-receipt:ppv2_5dc58490314d855c5060eace",
    protocolSettlementRef: "operator-protocol-settlement:proto_1ef774cec8a4964fd8a4650b",
    publicTranscriptReviewRef: "review:public-transcript-no-forbidden-linkage-fields-operator-accepted-2055-2220",
    relayerSubmittedSpendTxRef:
      "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
    safeTelemetryReviewRef: "review:safe-telemetry-no-secret-output-execute-2055-2220",
    sharedCohortDepositTxRef: "review:shared-cohort-deposit-ref-not-yet-solscan-final-reviewed-2055-2220",
  },
  evidenceStatus: "mainnet-spend-program-evidence-observed-reviewed-blocked",
  mainnetSpendProgramEvidence: {
    programId: "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm",
    poolState: "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ",
    nullifierSet: "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k",
    outputQueue: "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ",
    deployTxRef:
      "solana-tx:34syPdrcrwjUvFLiDRzPA597MxNqB8CassbJYu77DN4ECm1u5gLjL2uwhz5bcnHKbeZH4A819kjofCGBvpkP764p",
    createTxRef:
      "solana-tx:368JyAHH4aAuvFiSuhGhoejuwPvyTDwMtHdrzLgRhqVnbQNrbaCjCHxjsR8Ty7PcoR4kb9xjR7Q674NKZ9BABdGo",
    initTxRef:
      "solana-tx:3zfqv9jKCwWJ2vtwFaViBq2GuaTP6HqjbUqfW8PGYjraumdSvvtVFHiYG1uyLTDDvpLgtwwN4d4XmTjd7D2RQEGU",
    spendEvidenceTxRef:
      "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
    replaySimulation: {
      status: "simulation-only",
      observedError: "Custom:1",
      productionReplayRejectionProven: false,
    },
  },
  reviewStatus: "reviewed-blocked",
  reviewVerdict:
    "Do not claim Solscan-untrackable or live-mainnet-private settlement from this packet. Mainnet spend-program evidence is observed, including the spend transaction, but shared-cohort, live replay, independent reviewer, audited-anonymity, and production-readiness gates remain blocked.",
  promotionDecision: {
    reviewedLiveAllowed: false,
    operatorAcceptanceCanPromote: false,
    requiredApprovedReviewStatus: "reviewed-live",
    reviewedLiveRequires: [
      "shared-cohort-deposit-transaction",
      "live-nullifier-replay-rejection",
      "independent-reviewer-or-audit",
    ],
    blockedBy: [
      "shared-cohort-deposit-transaction",
      "live-nullifier-replay-rejection",
      "independent-reviewer-or-audit",
    ],
  },
  hardPromotionBlockers: [
    {
      id: "shared-cohort-deposit-transaction",
      evidenceRefKey: "sharedCohortDepositTxRef",
      currentEvidenceRef: "review:shared-cohort-deposit-ref-not-yet-solscan-final-reviewed-2055-2220",
      requiredRefShape: "solana-tx:<shared-cohort-deposit-mainnet-signature>",
      currentState: "placeholder-review-ref",
      promotionRequired: true,
    },
    {
      id: "live-nullifier-replay-rejection",
      evidenceRefKey: "nullifierReplayRejectionRef",
      currentEvidenceRef: "review:nullifier-replay-live-retry-not-run-stop-condition-preserved-2055-2220",
      requiredRefShape: "operator-nullifier-replay:<production-duplicate-rejection-ref>",
      currentState: "replay-simulation-custom-1-only",
      promotionRequired: true,
    },
  ],
  lineage: {
    currentApprovalActionRef: "actual-private/mainnet-settlement-evidence-run-2026-04-29-2131-2231",
    currentApprovalWindowRef: "2026-04-29T21:31:00-22:31:00 America/Los_Angeles",
    settlementEvidenceApprovalWindowRef: "2026-04-28T20:55:00-22:20:00 America/Los_Angeles",
    settlementEvidenceMatchesCurrentApproval: false,
    lineageWarning:
      "The reviewed settlement evidence belongs to a previous approval window; current approval/stop-condition status must not be read as promoting that historical evidence.",
  },
  liveMainnetSettlementProven: false,
  noRealFundsSmokeTargetPassed: true,
  noRealFundsSmokeTranscript: "pool-cohort-root-nullifier-output-context-only",
  requiredLiveEvidence: [
    "bounded real-funds approval for the exact actual-private action",
    "live mainnet deposit transaction into the shared cohort",
    "live mainnet relayer-submitted private spend transaction",
    "operator receipt binding accepted root, nullifier, output commitments, and proof public-input hash",
    "post-settlement nullifier replay rejection against the live production store",
    "reviewer packet proving no source wallet, merchant address, raw amount, input commitment, input leaf index, deposit signature, plaintext memo, or same-fee-payer linkage appears in the public spend transcript",
  ],
  status: "mainnet-spend-program-evidence-observed-reviewed-blocked",
});
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
