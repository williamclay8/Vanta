import { readFileSync } from "node:fs";

import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaPrivatePoolV2AnonymitySetReadiness } from "./privatePoolV2AnonymitySetReadiness.mjs";
import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";

const productionSmokeEvidencePath = new URL("../../ops/mainnet/private-pool-v2-production-smoke.evidence.json", import.meta.url);
const routeHealthEvidencePath = new URL("../../ops/mainnet/private-pool-v2-route-health.evidence.json", import.meta.url);
const nullifierReplayEvidencePath = new URL("../../ops/mainnet/private-pool-v2-nullifier-replay.evidence.json", import.meta.url);
const actualPrivateSettlementEvidencePath = new URL(
  "../../ops/mainnet/actual-private-mainnet-settlement.evidence.json",
  import.meta.url,
);
const actualPrivateSettlementReviewPath = new URL(
  "../../ops/mainnet/actual-private-mainnet-settlement-review.evidence.json",
  import.meta.url,
);

export function createVantaMainnetPrivateSettlementStatus() {
  const productionSmokeEvidence = JSON.parse(readFileSync(productionSmokeEvidencePath, "utf8"));
  const routeHealthEvidence = JSON.parse(readFileSync(routeHealthEvidencePath, "utf8"));
  const nullifierReplayEvidence = JSON.parse(readFileSync(nullifierReplayEvidencePath, "utf8"));
  const actualPrivateSettlementEvidence = JSON.parse(readFileSync(actualPrivateSettlementEvidencePath, "utf8"));
  const actualPrivateSettlementReview = JSON.parse(readFileSync(actualPrivateSettlementReviewPath, "utf8"));
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const anonymitySetReadiness = createVantaPrivatePoolV2AnonymitySetReadiness();
  const privacyRail = createVantaPrivacyRailContract({ activeRailId: "vanta-private-pool-v2" });

  const routeHealthPublicPassed = routeHealthEvidence.services.every((service) => service.publicHealth === "passed");
  const routeHealthAuthenticatedPassed = routeHealthEvidence.services.every(
    (service) => service.authenticatedReadiness === "passed",
  );
  const productionSmokeHealthPassed = productionSmokeEvidence.services.every(
    (service) => service.health?.ok === true && service.readiness?.ok === true,
  );
  const productionSmokeTargetsPassed = productionSmokeEvidence.smokeTargets.every((target) => target.status === "pass");
  const actualPrivateSmokeTarget = productionSmokeEvidence.smokeTargets.find(
    (target) => target.id === "actual-private-spend-simulation",
  );
  const actualPrivateSettlementApprovalScoped =
    typeof realFundsApproval.approvalActionRef === "string" &&
    realFundsApproval.approvalActionRef.startsWith("actual-private/");
  const settlementEvidenceApprovalWindowRef =
    actualPrivateSettlementReview.reviewedSettlementRefs?.approvalWindowRef ?? null;
  const currentApprovalWindowRef = realFundsApproval.approvalWindowRef;
  const settlementEvidenceMatchesCurrentApproval =
    settlementEvidenceApprovalWindowRef === currentApprovalWindowRef;
  const boundedRealFundsApprovalWindowActive =
    realFundsApproval.liveMainnetActionsAllowedNow && actualPrivateSettlementApprovalScoped;
  const reviewedLiveSettlementProven =
    actualPrivateSettlementReview.reviewStatus === "reviewed-live" &&
    actualPrivateSettlementReview.promotionDecision?.reviewedLiveAllowed === true &&
    settlementEvidenceMatchesCurrentApproval &&
    actualPrivateSettlementEvidence.liveMainnetSettlementProven === true;
  const spendProgramCompatibilityStatus = {
    version: "vanta-private-pool-v2-spend-program-compatibility-0.1",
    status: "blocked-pre-output-record-pda-abi-evidence",
    currentLocalAbi: "output-record-pda-eight-account-spend-v1",
    reviewedMainnetEvidenceAbi: "pre-authority-gate-spend-v1",
    compatibleWithCurrentLocalAbi: false,
    blocker: "mainnet-spend-program-evidence-pre-output-record-pda-abi-incompatible",
    requiredAction:
      "Rebuild, redeploy, and reinitialize the spend program/accounts with operator authority, root-history binding, nullifier-marker PDAs, and output-record PDAs before using reviewed mainnet evidence for current ABI claims.",
  };
  const meaningfulPrivacyBlockedBy = [
    "no-proven-audited-shared-anonymity-set",
    "no-proven-live-mainnet-private-settlement-evidence",
    spendProgramCompatibilityStatus.blocker,
    ...(boundedRealFundsApprovalWindowActive ? [] : ["no-active-actual-private-settlement-approval-window"]),
  ];
  const approvalWindowTruth = boundedRealFundsApprovalWindowActive
    ? `the current bounded real-funds approval window is active only for ${realFundsApproval.approvalActionRef}`
    : realFundsApproval.liveMainnetActionsAllowedNow && !actualPrivateSettlementApprovalScoped
      ? `the current bounded real-funds approval window is active only for ${realFundsApproval.approvalActionRef}, not actual-private settlement`
    : realFundsApproval.stopCondition.appliesToCurrentApproval
      ? "the bounded real-funds approval window has already hit its stop condition"
      : "there is no active bounded real-funds approval window";

  return {
    activePrivacyRailId: privacyRail.activeRailId,
    anonymitySetReadiness,
    auditedSharedAnonymitySetAvailable: false,
    boundedRealFundsApprovalWindowActive,
    checkedAt: new Date().toISOString(),
    checkedEvidenceRefs: [
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
    ],
    deploymentTruth: `Vanta Private Pool v2 currently has authenticated route-health across deployed production role services, no-real-funds production smoke coverage, a deployed final replay protocol layer, and observed mainnet spend-program evidence, but the reviewed spend-program evidence predates the current output-record PDA eight-account spend ABI and it still must not be presented as live mainnet private settlement because there is no proven audited shared anonymity set, no reviewed shared-cohort deposit evidence, no reviewed live production replay rejection, and ${approvalWindowTruth}.`,
    actualPrivateMainnetEvidence: {
      evidenceRefs: actualPrivateSettlementEvidence.evidenceRefs,
      evidenceStatus: actualPrivateSettlementEvidence.currentStatus,
      mainnetSpendProgramEvidence: actualPrivateSettlementEvidence.mainnetSpendProgramEvidence,
      spendProgramCompatibilityStatus,
      reviewStatus: actualPrivateSettlementReview.reviewStatus,
      reviewVerdict: actualPrivateSettlementReview.finalVerdict,
      promotionDecision: actualPrivateSettlementReview.promotionDecision,
      hardPromotionBlockers: actualPrivateSettlementEvidence.hardPromotionBlockers,
      lineage: {
        currentApprovalActionRef: realFundsApproval.approvalActionRef,
        currentApprovalWindowRef,
        settlementEvidenceApprovalWindowRef,
        settlementEvidenceMatchesCurrentApproval,
        lineageWarning: settlementEvidenceMatchesCurrentApproval
          ? null
          : "The reviewed settlement evidence belongs to a previous approval window; current approval/stop-condition status must not be read as promoting that historical evidence.",
      },
      liveMainnetSettlementProven: reviewedLiveSettlementProven,
      noRealFundsSmokeTargetPassed: actualPrivateSmokeTarget?.status === "pass",
      noRealFundsSmokeTranscript: actualPrivateSmokeTarget?.publicTranscript ?? "missing",
      requiredLiveEvidence: [
        "bounded real-funds approval for the exact actual-private action",
        "live mainnet deposit transaction into the shared cohort",
        "live mainnet relayer-submitted private spend transaction",
        "operator receipt binding accepted root, nullifier, output commitments, and proof public-input hash",
        "post-settlement nullifier replay rejection against the live production store",
        "reviewer packet proving no source wallet, merchant address, raw amount, input commitment, input leaf index, deposit signature, plaintext memo, or same-fee-payer linkage appears in the public spend transcript",
      ],
      status:
        reviewedLiveSettlementProven
          ? "reviewed-live-evidence-path"
          : actualPrivateSettlementReview.reviewStatus === "reviewed-blocked"
          ? actualPrivateSettlementEvidence.currentStatus
          : actualPrivateSettlementEvidence.currentStatus === "filled-refs-awaiting-review"
            ? "live-refs-collected-awaiting-review"
          : "no-real-funds-smoke-only",
    },
    lastRouteHealthRef: routeHealthEvidence.lastAuthenticatedReadinessRef,
    lastSmokeRef: "npm run mainnet:private-pool-v2-production-smoke-check",
    liveMainnetPrivateSettlementAvailable: false,
    mainnetReady: false,
    meaningfulPrivacyReady: false,
    meaningfulPrivacyBlockedBy: [
      ...new Set([...anonymitySetReadiness.blockers, ...meaningfulPrivacyBlockedBy]),
    ],
    noRealFundsSmokeOnly: productionSmokeEvidence.realFundsAllowed === false,
    privacyClaimAllowed: false,
    privacyRailCanClaimMeaningfulPrivacy: privacyRail.activeRail.canClaimMeaningfulPrivacy,
    productionReady: false,
    productionSmokeHealthPassed,
    productionSmokeTargetsPassed,
    privateSettlementApprovalScoped: actualPrivateSettlementApprovalScoped,
    realFundsApprovalRecorded: realFundsApproval.realFundsApprovalRecorded,
    realFundsAllowedNow: boundedRealFundsApprovalWindowActive,
    realFundsApprovalAllowedNow: realFundsApproval.liveMainnetActionsAllowedNow,
    realFundsApprovalActionRef: realFundsApproval.approvalActionRef,
    realFundsApprovalWindowStatus: realFundsApproval.approvalWindowStatus,
    realFundsStopCondition: realFundsApproval.stopCondition,
    replayProtocolLayerImplemented: nullifierReplayEvidence.protocolEnforcementFinalLayerImplemented === true,
    routeHealthAuthenticatedPassed,
    routeHealthPublicPassed,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transaction material, or customer private inputs are printed.",
    settlementReadiness: "no-real-funds-production-smoke-only",
    spendProgramCompatibilityStatus,
    version: "vanta-mainnet-private-settlement-status-0.1",
  };
}
