import { readFileSync } from "node:fs";

import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaPrivatePoolV2AnonymitySetReadiness } from "./privatePoolV2AnonymitySetReadiness.mjs";
import { createVantaPrivacyRailContract } from "./privacyRailContract.mjs";

const productionSmokeEvidencePath = new URL("../../ops/mainnet/private-pool-v2-production-smoke.evidence.json", import.meta.url);
const routeHealthEvidencePath = new URL("../../ops/mainnet/private-pool-v2-route-health.evidence.json", import.meta.url);
const nullifierReplayEvidencePath = new URL("../../ops/mainnet/private-pool-v2-nullifier-replay.evidence.json", import.meta.url);

export function createVantaMainnetPrivateSettlementStatus() {
  const productionSmokeEvidence = JSON.parse(readFileSync(productionSmokeEvidencePath, "utf8"));
  const routeHealthEvidence = JSON.parse(readFileSync(routeHealthEvidencePath, "utf8"));
  const nullifierReplayEvidence = JSON.parse(readFileSync(nullifierReplayEvidencePath, "utf8"));
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
  const boundedRealFundsApprovalWindowActive = realFundsApproval.approvalWindowStatus === "active";
  const meaningfulPrivacyBlockedBy = [
    "no-proven-audited-shared-anonymity-set",
    "no-live-mainnet-private-settlement-path",
    ...(boundedRealFundsApprovalWindowActive ? [] : ["no-active-bounded-real-funds-approval-window"]),
  ];
  const approvalWindowTruth = boundedRealFundsApprovalWindowActive
    ? "the current bounded real-funds approval window is active"
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
      "ops/mainnet/service-deployment.evidence.json",
      "ops/mainnet/mainnet-real-funds-approval.evidence.json",
    ],
    deploymentTruth: `Vanta Private Pool v2 currently has authenticated route-health across deployed production role services, no-real-funds production smoke coverage, and a deployed final replay protocol layer, but it still must not be presented as live mainnet private settlement because there is no proven audited shared anonymity set, no live mainnet private settlement path, and ${approvalWindowTruth}.`,
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
    replayProtocolLayerImplemented: nullifierReplayEvidence.protocolEnforcementFinalLayerImplemented === true,
    routeHealthAuthenticatedPassed,
    routeHealthPublicPassed,
    safety:
      "No auth token values, database URLs, bearer values, wallet keys, signed transaction material, or customer private inputs are printed.",
    settlementReadiness: "no-real-funds-production-smoke-only",
    version: "vanta-mainnet-private-settlement-status-0.1",
  };
}
