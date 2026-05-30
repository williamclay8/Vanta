import { createVantaMainnetPrivateSettlementStatus } from "./mainnetPrivateSettlementStatus.mjs";
import { isActiveBlockerRemoved } from "./operatorExternalGateSkips.mjs";
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
    proofBoundDestinationCommitment:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
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

function createOnchainUnshieldCustodyStatus() {
  return {
    version: "vanta-onchain-unshield-custody-status-0.6", // + PDA vault custody path; direct operator keypair release removed from source endpoint
    status: "blocked",
    custodyModel: "program-pda-fail-closed",
    currentReleaseModel: "program-tag-unshield-pda-cpi-fail-closed",
    productionCustodyReady: false,
    programOwnedVaultReady: false,
    programOwnedVaultPdaReady: false,
    sourceOnlyVaultAuthorityPreflightReady: true,
    sourceOnlyVaultAssetRegistryReady: true,
    sourceOnlyVaultTokenAccountPreflightReady: true,
    sourceOnlyRootPreflightReady: true,
    sourceOnlyNullifierMarkerPreflightReady: true,
    sourceOnlyVerifierKeyPreflightReady: true,
    onchainUnshieldInstructionReady: false,
    onchainUnshieldInstructionStatus:
      "reserved-fail-closed-vault-asset-and-verifier-key-preflight-source-only",
    tagUnshieldReleaseReady: false,
    tagUnshieldVaultAssetRegistryReleaseEnabled: false,
    tokenCpiReleaseReady: false,
    onchainProofVerifierReady: false,
    operatorKeypairReleaseRemoved: true,
    // Native SOL long-term TAG6 boundary (program-owned SOL vault PDA + system_program::transfer CPI)
    nativeSolProgramOwnedVaultPdaReady: false,
    nativeSolTagUnshieldSystemCpiReady: false,
    nativeSolVaultAssetRegistryReady: false,
    nativeSolAssetIdSentinelConfigured: true, // sentinel defined in docs; code adoption in progress for v2 ingestion
    nativeSolV2IndexerIngestionReady: false, // Phase 1 indexer ingestion implemented; not yet live in production indexer
    productionCustodyReadyForSol: false, // Still operator-keypair until TAG6 + program-owned SOL PDA is live
    blockers: [
      "program-owned-vault-pda-not-deployed",
      "tag-unshield-reserved-fail-closed",
      "onchain-unshield-proof-verifier-not-wired",
      "tag-unshield-token-cpi-release-not-wired",
      "operator-vault-keypair-env-release-removed",
      "native-sol-program-owned-vault-pda-not-deployed",
      "tag-unshield-sol-kind-not-wired",
      "native-sol-vault-asset-registry-not-registered",
      "native-sol-sentinel-asset-id-not-indexed-in-v2-tree", // locally addressable via Phase 1 ingestion (sentinel Day 1); live production snapshot evidence pending
    ],
    checkedRefs: {
      custodyGuard: "npm run private-pool-v2:onchain-unshield-custody-check",
      pdaVaultCustodyGuard: "npm run private-pool-v2:pda-vault-custody-check",
      userVaultOwner: "npm run shield:user-vault-check",
      publicExitSurface: "npm run unshield:public-exit-surface-check",
      solOperatorEndpoint: "npm run unshield:sol-operator-endpoint-check",
      onchainProofBoundary: "npm run zk:c01-onchain-proof-boundary-check",
    },
    requiredBeforeProduction: [
      "Deploy a program-owned vault PDA or equivalent on-chain custody account for Shielded funds.",
      "Replace the reserved fail-closed TAG_UNSHIELD preflight source ABI with an on-chain release instruction that consumes a nullifier and releases from the program-owned vault.",
      "Verify a real Unshield proof or verifier CPI on chain before PDA-signed release.",
      "Wire token CPI release from the program-owned custody account after proof and nullifier checks.",
      "Keep operator vault-keypair release authority removed from the production Unshield path.",
      "Deploy program-owned SOL vault PDA (lamports holder) + VAULT_ASSET_KIND_SOL registration + system_program CPI path in TAG_UNSHIELD for native SOL (using fixed asset ID sentinel).",
      "Extend vault asset registry and release preflights/require_* to support native SOL sentinel without mint/token accounts.",
    ],
    truth:
      "Current Unshield release is program-tag-unshield-pda-cpi-fail-closed: the operator no longer loads a vault keypair or sends SPL/SOL transfers directly, and instead returns a TAG_UNSHIELD relay receipt shape without consuming state until a program transaction signature exists. The local TAG_UNSHIELD source ABI is reserved fail-closed with source-only root/root-record/verifier-key/nullifier/vault-authority/vault-asset/token-account preflight and cannot release funds. The source-level vault-asset registry scaffold keeps releaseEnabled false and is not production custody; production should eventually require releaseEnabled true only when the proof/root/nullifier path is real. For native SOL: long-term boundary is program-owned SOL vault PDA + system_program::transfer in TAG_UNSHIELD (asset_id = fixed sentinel, asset_kind=SOL). SPL release target is transfer_checked from a vault token account whose authority is the vanta2vault PDA. No production custody claim until on-chain proof + PDA + SOL/SPL-kind live evidence per §12. Strict fail-closed.",
  };
}

export function createVantaUnshieldMainnetProductionStatus() {
  const privateSettlement = createVantaMainnetPrivateSettlementStatus();
  const realFundsApproval = createVantaMainnetRealFundsApprovalStatus();
  const walletSigning = createVantaWalletSigningStatus();
  const actualPrivateUnshieldPlan = createLocalActualPrivateUnshieldPlanStatus();
  const runtimeProductionControls = createUnshieldRuntimeProductionControlsStatus();
  const onchainUnshieldCustody = createOnchainUnshieldCustodyStatus();

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
    onchainUnshieldCustody.productionCustodyReady &&
    privateSettlement.auditedSharedAnonymitySetAvailable &&
    privateSettlement.liveMainnetPrivateSettlementAvailable &&
    privateSettlement.privacyClaimAllowed;

  const blockers = [
    ...(localLaneCovered ? [] : ["unshield-safe-send-or-message-intent-boundary-missing"]),
    ...(actualPrivateUnshieldPlan.localPlanCovered ? [] : ["actual-private-unshield-plan-missing"]),
    ...(runtimeProductionControls.covered ? [] : runtimeProductionControls.pending),
    ...(onchainUnshieldCustody.productionCustodyReady ? [] : onchainUnshieldCustody.blockers),
    ...(noFundsOperatorEndpointCovered ? [] : ["unshield-production-operator-smoke-or-replay-evidence-missing"]),
    ...(liveSettlementProven ? [] : ["no-reviewed-live-mainnet-unshield-settlement-evidence"]),
    ...(exactUnshieldApprovalScoped ? [] : ["no-exact-unshield-bounded-approval-window"]),
    ...(boundedApprovalActive ? [] : realFundsApproval.mainnetFundsBlockedBy),
    ...privateSettlement.meaningfulPrivacyBlockedBy,
    ...(privateSettlement.auditedSharedAnonymitySetAvailable || isActiveBlockerRemoved("no-third-party-audit")
      ? []
      : ["no-third-party-audit"]),
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
    onchainUnshieldCustody,
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
	      unshieldBalanceLedger: "npm run unshield:balance-ledger-check",
	      unshieldNoFundsEndpoint: "npm run unshield:sol-operator-endpoint-check",
	      unshieldPublicExitSurface: "npm run unshield:public-exit-surface-check",
      privateCoreVerify: "npm run private-core:verify",
      unshieldActualPrivatePlan: "npm run mainnet:actual-private-settlement-plan-check",
      unshieldActualPrivatePlanJson: "npm run mainnet:actual-private-settlement-plan-json-check",
      onchainUnshieldCustody: "npm run private-pool-v2:onchain-unshield-custody-check",
      pdaVaultCustodyGuard: "npm run private-pool-v2:pda-vault-custody-check",
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
      ...onchainUnshieldCustody.requiredBeforeProduction,
      "Keep Unshield wallet approvals behind safe-send transaction summaries and typed message-intent boundaries.",
    ],
    safety:
      "No auth tokens, database URLs, wallet keys, signed transactions, seed phrases, or raw private inputs are printed.",
    truth:
      "Unshield has local no-funds operator and wallet-safety coverage, and the source endpoint no longer performs operator-keypair public exits. The current release model is program-tag-unshield-pda-cpi-fail-closed, so no funds are released until a real on-chain TAG_UNSHIELD proof/root/nullifier path can produce and record a program transaction signature. The source-level vault-asset registry scaffold keeps releaseEnabled false and does not release funds. Unshield must not be called mainnet-production-ready until live reviewed settlement evidence, active real-funds approval, program-owned vault custody with on-chain TAG_UNSHIELD proof-verified release, audited/shared anonymity-set evidence, and production replay evidence are all present.",
  };
}
