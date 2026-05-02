import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaWalletSigningStatus } from "./walletSigningStatus.mjs";

export function createVantaUnshieldMainnetProductionStatus() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const walletSigning = createVantaWalletSigningStatus();

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
    mainnetReady: false,
    productionReady,
    privacyClaimAllowed: false,
    status: productionReady ? "ready" : "blocked",
    blockers: [...new Set(blockers)],
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
