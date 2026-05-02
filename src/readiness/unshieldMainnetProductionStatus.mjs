import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaAbuseObservabilityRuntimeStatus } from "./abuseObservabilityRuntimeStatus.mjs";
import { createVantaProductionServiceDeploymentStatus } from "./productionServiceDeploymentStatus.mjs";
import { createVantaWalletSigningStatus } from "./walletSigningStatus.mjs";
import {
  createVantaActualPrivateSettlementPlan,
  validateVantaActualPrivateSettlementPlan,
} from "../mainnet/actualPrivateSettlementPlan.mjs";

function createLocalActualPrivateUnshieldPlanStatus() {
  const plan = createVantaActualPrivateSettlementPlan({
    action: "unshield",
    assetCohort: "stablecoin-usdc-v1",
    assetIdCommitment: "commitment:asset-id",
    economicsCommitment: "commitment:economics",
    exitTermsCommitment: "commitment:exit-terms",
    inputCommitment: "commitment:input-note",
    inputRoot: "root:input",
    nullifier: "nullifier:actual-private-unshield-status",
    ownerCommitment: "commitment:owner",
    poolId: "pool:stablecoin-usdc-v1",
    routeCommitment: "commitment:route",
    settlementCommitment: "commitment:settlement",
    settlementId: "settlement:actual-private-unshield-status",
    unshieldContextTag: "context:actual-private-unshield-status",
    unshieldPublicInputHash: "public-input-hash:actual-private-unshield-status",
  });
  const decision = validateVantaActualPrivateSettlementPlan(plan);

  return {
    action: plan.request.action,
    localPlanCovered: decision.accepted,
    operatorEndpoint: plan.operatorEndpoint,
    requiredOperatorProofMode: "committed_unshield_or_claim_circuit_request",
    validationReason: decision.reason,
  };
}

function createUnshieldRuntimeProductionControlsStatus() {
  const deployment = createVantaProductionServiceDeploymentStatus();
  const runtime = createVantaAbuseObservabilityRuntimeStatus();
  const blockers = [
    ...(deployment.observabilityControlsPending ? ["observability-provider-controls-pending"] : []),
    ...(deployment.realFundsReadinessPending ? ["real-funds-readiness-pending"] : []),
    ...(runtime.operatorEventSinkProductionReady ? [] : ["operator-event-sink-not-production-ready"]),
    ...(runtime.privatePoolV2RuntimeMatchesPreferredRateLimiter
      ? []
      : ["private-pool-v2-rate-limiter-not-production-preferred"]),
    ...(runtime.privatePoolV2RuntimeMode === "remote-services"
      ? []
      : ["private-pool-v2-runtime-mode-not-verified"]),
    ...(runtime.privatePoolV2StorageKind === "postgres-jsonb-snapshot-store"
      ? []
      : ["private-pool-v2-storage-kind-not-verified"]),
    ...runtime.pendingObservabilityControls.map((control) => `observability-control-pending:${control}`),
  ];

  return {
    covered: blockers.length === 0,
    checkedRefs: {
      abuseObservabilityStatus: "npm run mainnet:abuse-observability-status-check",
      abuseObservabilityRuntimeStatus:
        "doppler run --config prd --project vanta -- npm run mainnet:abuse-observability-runtime-status-auth",
      serviceDeploymentStatus: "npm run mainnet:service-deployment-status-check",
    },
    deploymentPendingProductionControls: deployment.pendingProductionControls,
    operatorEventSinkProductionReady: runtime.operatorEventSinkProductionReady,
    pending: [...new Set(blockers)],
    privatePoolV2RuntimeMatchesPreferredRateLimiter:
      runtime.privatePoolV2RuntimeMatchesPreferredRateLimiter,
    privatePoolV2RuntimeMode: runtime.privatePoolV2RuntimeMode,
    privatePoolV2StorageKind: runtime.privatePoolV2StorageKind,
  };
}

export function createVantaUnshieldMainnetProductionStatus() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const walletSigning = createVantaWalletSigningStatus();
  const actualPrivateUnshieldPlan = createLocalActualPrivateUnshieldPlanStatus();
  const runtimeProductionControls = createUnshieldRuntimeProductionControlsStatus();

  const localLaneCovered =
    walletSigning.protocolPagesWithSafeSendAdoption.includes("Unshield") &&
    walletSigning.messageIntentPages.includes("Unshield");
  const noFundsOperatorEndpointCovered =
    privateSettlement.routeHealthPublicPassed &&
    privateSettlement.routeHealthAuthenticatedPassed &&
    privateSettlement.productionSmokeHealthPassed &&
    privateSettlement.productionSmokeTargetsPassed &&
    privateSettlement.replayProtocolLayerImplemented;
  const liveSettlementProven =
    privateSettlement.actualPrivateMainnetEvidence.liveMainnetSettlementProven === true &&
    privateSettlement.actualPrivateMainnetEvidence.status === "reviewed-live-evidence-path";
  const exactUnshieldApprovalScoped =
    typeof realFundsApproval.approvalActionRef === "string" &&
    realFundsApproval.approvalActionRef.startsWith("actual-private/unshield");
  const boundedApprovalActive =
    realFundsApproval.liveMainnetActionsAllowedNow &&
    exactUnshieldApprovalScoped &&
    !realFundsApproval.stopCondition.appliesToCurrentApproval;
  const productionReady =
    localLaneCovered &&
    noFundsOperatorEndpointCovered &&
    liveSettlementProven &&
    boundedApprovalActive &&
    privateSettlement.auditedSharedAnonymitySetAvailable &&
    privateSettlement.liveMainnetPrivateSettlementAvailable &&
    privateSettlement.privacyClaimAllowed;

  const blockers = [
    ...(localLaneCovered ? [] : ["unshield-safe-send-or-message-intent-boundary-missing"]),
    ...(actualPrivateUnshieldPlan.localPlanCovered ? [] : ["actual-private-unshield-plan-missing"]),
    ...(runtimeProductionControls.covered ? [] : runtimeProductionControls.pending),
    ...(noFundsOperatorEndpointCovered ? [] : ["unshield-production-operator-smoke-or-replay-evidence-missing"]),
    ...(liveSettlementProven ? [] : ["no-reviewed-live-mainnet-unshield-settlement-evidence"]),
    ...(exactUnshieldApprovalScoped ? [] : ["no-exact-unshield-bounded-approval-window"]),
    ...(boundedApprovalActive ? [] : realFundsApproval.mainnetFundsBlockedBy),
    ...privateSettlement.meaningfulPrivacyBlockedBy,
    ...(privateSettlement.auditedSharedAnonymitySetAvailable ? [] : ["no-third-party-audit"]),
  ];

  return {
    version: "vanta-unshield-mainnet-production-status-0.1",
    activePrivacyRailId: privateSettlement.activePrivacyRailId,
    checkedAt: new Date().toISOString(),
    localLaneCovered,
    noFundsOperatorEndpointCovered,
    liveSettlementProven,
    exactUnshieldApprovalScoped,
    boundedApprovalActive,
    mainnetReady: productionReady,
    productionReady,
    privacyClaimAllowed: productionReady,
    status: productionReady ? "ready" : "blocked",
    blockers: [...new Set(blockers)],
    actualPrivateUnshieldPlan,
    runtimeProductionControls,
    currentApproval: {
      actionRef: realFundsApproval.approvalActionRef,
      approvalWindowRef: realFundsApproval.approvalWindowRef,
      approvalWindowStatus: realFundsApproval.approvalWindowStatus,
      liveMainnetActionsAllowedNow: realFundsApproval.liveMainnetActionsAllowedNow,
      stopCondition: realFundsApproval.stopCondition,
    },
    evidenceRefs: {
      privateSettlementStatus: "npm run --silent mainnet:private-settlement-status-json",
      realFundsApprovalStatus: "npm run --silent mainnet:real-funds-approval-status-json",
      walletSigningStatus: "npm run mainnet:wallet-signing-status-check",
      unshieldNoFundsEndpoint: "npm run unshield:sol-operator-endpoint-check",
      unshieldPublicExitSurface: "npm run unshield:public-exit-surface-check",
      privateCoreVerify: "npm run private-core:verify",
      unshieldActualPrivatePlan: "npm run mainnet:actual-private-settlement-plan-check",
      unshieldActualPrivatePlanJson: "npm run mainnet:actual-private-settlement-plan-json-check",
      runtimeProductionControls: "npm run mainnet:abuse-observability-runtime-status-auth",
      serviceDeploymentStatus: "npm run mainnet:service-deployment-status-check",
      mainnetPreflight: "npm run mainnet:preflight",
    },
    requiredBeforeProduction: [
      "Record a fresh active bounded approval window for the exact Unshield/actual-private mainnet action.",
      "Record reviewed live mainnet shared-cohort deposit evidence.",
      "Record reviewed live relayer-submitted spend or unshield settlement evidence for the active approval window.",
      "Record live nullifier replay rejection evidence against the production store after the settlement.",
      "Record independent reviewer or audit acceptance for the public transcript and anonymity-set measurement.",
      "Keep Unshield wallet approvals behind safe-send transaction summaries and typed message-intent boundaries.",
    ],
    safety:
      "No auth tokens, database URLs, wallet keys, signed transactions, seed phrases, or raw private inputs are printed.",
    truth:
      "Unshield has local no-funds operator and wallet-safety coverage, but it must not be called mainnet-production-ready until live reviewed settlement evidence, active real-funds approval, audited/shared anonymity-set evidence, and production replay evidence are all present.",
  };
}
