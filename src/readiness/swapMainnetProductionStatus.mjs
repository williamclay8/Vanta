import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { isActiveBlockerRemoved } from "./operatorExternalGateSkips.mjs";
import { createVantaMainnetRealFundsApprovalStatus } from "./mainnetRealFundsApprovalStatus.mjs";
import { createVantaWalletSigningStatus } from "./walletSigningStatus.mjs";

export function createVantaSwapMainnetProductionStatus() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const walletSigning = createVantaWalletSigningStatus();

  const localLaneCovered =
    walletSigning.protocolPagesWithSafeSendAdoption.includes("Swap") &&
    walletSigning.messageIntentPages.includes("Swap");
  const localSwapProofBoundaryCovered = true;
  const committedSettlementCovered = true;
  const localAtomicMutationCovered = true;
  const noFundsOperatorEndpointCovered =
    privateSettlement.routeHealthPublicPassed &&
    privateSettlement.routeHealthAuthenticatedPassed &&
    privateSettlement.productionSmokeHealthPassed &&
    privateSettlement.productionSmokeTargetsPassed &&
    privateSettlement.replayProtocolLayerImplemented;
  const liveSettlementProven =
    privateSettlement.actualPrivateMainnetEvidence.liveMainnetSettlementProven === true &&
    privateSettlement.actualPrivateMainnetEvidence.status === "reviewed-live-evidence-path";
  const turnkeyLiquiditySignerDryRunCovered = true;
  const turnkeyLiquidityLiveSignerAdapterCovered = true;
  const exactSwapApprovalScoped =
    typeof realFundsApproval.approvalActionRef === "string" &&
    realFundsApproval.approvalActionRef.startsWith("actual-private/swap");
  const boundedApprovalActive =
    realFundsApproval.liveMainnetActionsAllowedNow &&
    exactSwapApprovalScoped &&
    !realFundsApproval.stopCondition.appliesToCurrentApproval;
  const quoteRoutePrivacyProven = false;
  const liveVenuePrivacyProven = false;
  const productionReady =
    localLaneCovered &&
    localSwapProofBoundaryCovered &&
    committedSettlementCovered &&
    localAtomicMutationCovered &&
    noFundsOperatorEndpointCovered &&
    turnkeyLiquiditySignerDryRunCovered &&
    turnkeyLiquidityLiveSignerAdapterCovered &&
    liveSettlementProven &&
    boundedApprovalActive &&
    quoteRoutePrivacyProven &&
    liveVenuePrivacyProven &&
    privateSettlement.auditedSharedAnonymitySetAvailable &&
    privateSettlement.liveMainnetPrivateSettlementAvailable &&
    privateSettlement.privacyClaimAllowed;

  const blockers = [
    ...(localLaneCovered ? [] : ["swap-safe-send-or-message-intent-boundary-missing"]),
    ...(noFundsOperatorEndpointCovered ? [] : ["swap-production-operator-smoke-or-replay-evidence-missing"]),
    ...(turnkeyLiquiditySignerDryRunCovered ? [] : ["turnkey-liquidity-signer-dry-run-missing"]),
    ...(turnkeyLiquidityLiveSignerAdapterCovered
      ? []
      : ["turnkey-liquidity-live-signer-adapter-missing"]),
    ...(liveSettlementProven ? [] : ["no-reviewed-live-mainnet-swap-settlement-evidence"]),
    ...(exactSwapApprovalScoped ? [] : ["no-exact-swap-bounded-approval-window"]),
    ...(boundedApprovalActive ? [] : realFundsApproval.mainnetFundsBlockedBy),
    ...(quoteRoutePrivacyProven ? [] : ["swap-quote-route-privacy-not-production-proven"]),
    ...(liveVenuePrivacyProven ? [] : ["swap-live-venue-privacy-not-production-proven"]),
    ...privateSettlement.meaningfulPrivacyBlockedBy,
    ...(privateSettlement.auditedSharedAnonymitySetAvailable || isActiveBlockerRemoved("no-third-party-audit")
      ? []
      : ["no-third-party-audit"]),
  ];

  return {
    version: "vanta-swap-mainnet-production-status-0.1",
    activePrivacyRailId: privateSettlement.activePrivacyRailId,
    checkedAt: new Date().toISOString(),
    localLaneCovered,
    localSwapProofBoundaryCovered,
    committedSettlementCovered,
    localAtomicMutationCovered,
    noFundsOperatorEndpointCovered,
    turnkeyLiquiditySignerDryRunCovered,
    turnkeyLiquidityLiveSignerAdapterCovered,
    quoteRoutePrivacyProven,
    liveVenuePrivacyProven,
    liveSettlementProven,
    exactSwapApprovalScoped,
    boundedApprovalActive,
    mainnetReady: productionReady,
    productionReady,
    privacyClaimAllowed: productionReady,
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
      swapCommittedSettlement: "npm run swap:committed-settlement-check",
      swapTrustPacket: "npm run swap:trust-packet-check",
      swapProofRequest: "npm run private-pool-v2:swap-to-shielded-proof-request-check",
      swapCircuit: "npm run private-pool-v2:swap-to-shielded-circuit-check",
      turnkeyLiquiditySignerDryRun: "npm run swap:turnkey-liquidity-signer-dry-run-check",
      turnkeyLiquidityLiveSignerAdapter: "npm run swap:turnkey-liquidity-live-signer-adapter-check",
      swapProve: "npm run private-pool-v2:swap-to-shielded-prove",
      swapLivePath: "npm run private-core:swap-live-path-check",
      privateCoreVerify: "npm run private-core:verify",
      privatePoolV2Verify: "npm run private-pool-v2:verify",
      mainnetPreflight: "npm run mainnet:preflight",
    },
    requiredBeforeProduction: [
      "Prove quote and route privacy before operator settlement for the exact Swap action.",
      "Review the Turnkey liquidity signer dry-run packet before any live Jupiter signer mode.",
      "Provision governed Turnkey runtime credentials, signer/policy refs, review packet ref, and exact live signing approval.",
      "Prove the live execution venue cannot link raw route/economic terms to the shielded input/output path.",
      "Record a fresh active bounded approval window for the exact actual-private Swap mainnet action.",
      "Record reviewed live mainnet shared-cohort deposit evidence.",
      "Record reviewed live relayer-submitted Swap settlement evidence for the active approval window.",
      "Record live nullifier replay rejection evidence against the production store after the Swap settlement.",
      "Record independent reviewer or audit acceptance for the public transcript, route privacy, and anonymity-set measurement.",
    ],
    safety:
      "No auth tokens, database URLs, wallet keys, signed transactions, seed phrases, raw route quotes, or raw private inputs are printed.",
    truth:
      "Swap has local proof-request, circuit, committed-settlement, trust-packet, wallet-safety, Turnkey liquidity signer dry-run, server-only Turnkey live signer adapter, and atomic verifier/indexer coverage, but it must not be called mainnet-production-ready until governed runtime signer refs/approval, quote/route privacy, live venue privacy, reviewed live settlement evidence, active real-funds approval, audited/shared anonymity-set evidence, and production replay evidence are all present.",
  };
}
