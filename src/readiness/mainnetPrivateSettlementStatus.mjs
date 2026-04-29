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
  const boundedRealFundsApprovalWindowActive = realFundsApproval.liveMainnetActionsAllowedNow;
  const meaningfulPrivacyBlockedBy = [
    "no-proven-audited-shared-anonymity-set",
    "no-live-mainnet-private-settlement-path",
    "no-live-actual-private-mainnet-settlement-evidence",
    ...(boundedRealFundsApprovalWindowActive ? [] : ["no-active-bounded-real-funds-approval-window"]),
  ];
  const approvalWindowTruth = boundedRealFundsApprovalWindowActive
    ? "the current bounded real-funds approval window is active"
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
    deploymentTruth: `Vanta Private Pool v2 currently has authenticated route-health across deployed production role services, no-real-funds production smoke coverage, and a deployed final replay protocol layer, but it still must not be presented as live mainnet private settlement because there is no proven audited shared anonymity set, no live mainnet private settlement path, and ${approvalWindowTruth}.`,
    actualPrivateMainnetEvidence: {
      evidenceRefs: actualPrivateSettlementEvidence.evidenceRefs,
      evidenceStatus: actualPrivateSettlementEvidence.currentStatus,
      reviewStatus: actualPrivateSettlementReview.reviewStatus,
      reviewVerdict: actualPrivateSettlementReview.finalVerdict,
      liveMainnetSettlementProven: actualPrivateSettlementEvidence.liveMainnetSettlementProven === true,
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
        actualPrivateSettlementReview.reviewStatus === "reviewed-blocked"
          ? "live-refs-reviewed-blocked"
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
    realFundsApprovalRecorded: realFundsApproval.realFundsApprovalRecorded,
    realFundsAllowedNow: realFundsApproval.liveMainnetActionsAllowedNow,
    realFundsApprovalWindowStatus: realFundsApproval.approvalWindowStatus,
    realFundsStopCondition: realFundsApproval.stopCondition,
    replayProtocolLayerImplemented: nullifierReplayEvidence.protocolEnforcementFinalLayerImplemented === true,
    routeHealthAuthenticatedPassed,
    routeHealthPublicPassed,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transaction material, or customer private inputs are printed.",
    settlementReadiness: "no-real-funds-production-smoke-only",
    version: "vanta-mainnet-private-settlement-status-0.1",
  };
}
