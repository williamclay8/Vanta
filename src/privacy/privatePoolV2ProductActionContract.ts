export const VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_VERSION =
  "vanta-private-pool-v2-product-action-contract-0.1";

export type VantaPrivatePoolV2ProductActionId = "send" | "swap" | "unshield";

export type VantaPrivatePoolV2SendActionEvidence = {
  legacyUiStatus?: string;
  privateCoreExecutionStatus?: string;
  sendLedgerGateReady?: boolean;
  runtimeActualPrivateSpendProofServiceReady?: boolean;
  noWitnessProofArtifactPresent?: boolean;
  operatorProofReceiptPresent?: boolean;
  operatorProofSendLinkReady?: boolean;
  operatorSendBoundaryReady?: boolean;
  operatorContinuityReady?: boolean;
  resultingRootRecorded?: boolean;
  protocolSettlementReceiptBound?: boolean;
  replayProtectionLinked?: boolean;
  memoCiphertextBodyHashBound?: boolean;
  liveMainnetSettlementReviewed?: boolean;
  productionVerifierAccepted?: boolean;
  sharedAnonymityReviewed?: boolean;
  relayerSeparationReviewed?: boolean;
  auditAccepted?: boolean;
  programmaticProductionPrivateReady?: boolean;
  programmaticPrivacyClaimAllowed?: boolean;
  programmaticMainnetReady?: boolean;
  productionPrivacyClaimsLocked?: boolean;
  externalReviewAccepted?: boolean;
  ownerApprovedProductionScope?: boolean;
};

export type VantaPrivatePoolV2UnshieldActionEvidence = {
  uiStatus?: string;
  operatorReleaseSignaturePresent?: boolean;
  releaseModel?: string;
  pausedBannerVisible?: boolean;
  unshieldProofRequestReady?: boolean;
  runtimeVerifierWired?: boolean;
  strictNoWitnessArtifactPresent?: boolean;
  operatorProgramReleaseReceiptPresent?: boolean;
  protocolSettlementReceiptBound?: boolean;
  replayProtectionLinked?: boolean;
  releaseEnabledAuditGate?: "blocked" | "enabled-reviewed";
  publicExitVerified?: boolean;
  liveMainnetSettlementReviewed?: boolean;
  productionVerifierAccepted?: boolean;
  sharedAnonymityReviewed?: boolean;
  relayerSeparationReviewed?: boolean;
  auditAccepted?: boolean;
  programmaticProductionPrivateReady?: boolean;
  programmaticPrivacyClaimAllowed?: boolean;
  programmaticMainnetReady?: boolean;
  productionPrivacyClaimsLocked?: boolean;
  externalReviewAccepted?: boolean;
  ownerApprovedProductionScope?: boolean;
};

export type VantaPrivatePoolV2SwapActionEvidence = {
  uiStatus?: string;
  exactSpendableNoteSelected?: boolean;
  quoteFresh?: boolean;
  canonicalSwapBridgePresent?: boolean;
  committedSettlementTermsReady?: boolean;
  operatorSwapAuthorizationPresent?: boolean;
  protocolSettlementReceiptBound?: boolean;
  swapToShieldedProofReceiptPresent?: boolean;
  noWitnessProofReceiptReady?: boolean;
  replayProtectionLinked?: boolean;
  outputCommitmentBound?: boolean;
  resultingRootRecorded?: boolean;
  liveMainnetSettlementReviewed?: boolean;
  productionVerifierAccepted?: boolean;
  sharedAnonymityReviewed?: boolean;
  relayerSeparationReviewed?: boolean;
  auditAccepted?: boolean;
  programmaticProductionPrivateReady?: boolean;
  programmaticPrivacyClaimAllowed?: boolean;
  programmaticMainnetReady?: boolean;
  productionPrivacyClaimsLocked?: boolean;
  externalReviewAccepted?: boolean;
  ownerApprovedProductionScope?: boolean;
};

export type VantaPrivatePoolV2ProductActionContractResult = {
  action: VantaPrivatePoolV2ProductActionId;
  legacyVisibleCompletionAllowed: boolean;
  localPrivateCompletionAllowed: boolean;
  productionPrivateCompletionAllowed: boolean;
  visibleCompletionScope:
    | "not-complete"
    | "legacy-local-transition-not-production-private"
    | "local-proof-bound-not-production-private"
    | "swap-beta-route-not-private"
    | "public-operator-release-not-private"
    | "production-private";
  blockers: readonly string[];
};

type BooleanRequirement<TEvidence> = {
  id: string;
  isSatisfied: (evidence: TEvidence) => boolean;
};

const SEND_LOCAL_PRIVATE_REQUIREMENTS: readonly BooleanRequirement<VantaPrivatePoolV2SendActionEvidence>[] =
  [
    {
      id: "private-core-send-execution-verified",
      isSatisfied: (evidence) => evidence.privateCoreExecutionStatus === "verified",
    },
    {
      id: "send-ledger-gate-ready",
      isSatisfied: (evidence) => evidence.sendLedgerGateReady === true,
    },
    {
      id: "actual-private-spend-runtime-proof-service-ready",
      isSatisfied: (evidence) => evidence.runtimeActualPrivateSpendProofServiceReady === true,
    },
    {
      id: "no-witness-proof-artifact-present",
      isSatisfied: (evidence) => evidence.noWitnessProofArtifactPresent === true,
    },
    {
      id: "operator-proof-receipt-present",
      isSatisfied: (evidence) => evidence.operatorProofReceiptPresent === true,
    },
    {
      id: "operator-proof-send-link-ready",
      isSatisfied: (evidence) => evidence.operatorProofSendLinkReady === true,
    },
    {
      id: "operator-send-boundary-ready",
      isSatisfied: (evidence) => evidence.operatorSendBoundaryReady === true,
    },
    {
      id: "operator-continuity-ready",
      isSatisfied: (evidence) => evidence.operatorContinuityReady === true,
    },
    {
      id: "resulting-root-recorded",
      isSatisfied: (evidence) => evidence.resultingRootRecorded === true,
    },
    {
      id: "protocol-settlement-receipt-bound",
      isSatisfied: (evidence) => evidence.protocolSettlementReceiptBound === true,
    },
    {
      id: "replay-protection-linked",
      isSatisfied: (evidence) => evidence.replayProtectionLinked === true,
    },
    {
      id: "memo-ciphertext-body-hash-bound",
      isSatisfied: (evidence) => evidence.memoCiphertextBodyHashBound === true,
    },
  ];

const UNSHIELD_LOCAL_PRIVATE_REQUIREMENTS: readonly BooleanRequirement<VantaPrivatePoolV2UnshieldActionEvidence>[] =
  [
    {
      id: "unshield-ui-complete",
      isSatisfied: (evidence) => evidence.uiStatus === "complete",
    },
    {
      id: "operator-release-signature-present",
      isSatisfied: (evidence) => evidence.operatorReleaseSignaturePresent === true,
    },
    {
      id: "tag-unshield-release-enabled",
      isSatisfied: (evidence) => evidence.releaseModel === "program-tag-unshield-pda-cpi-enabled",
    },
    {
      id: "withdrawals-not-paused",
      isSatisfied: (evidence) => evidence.pausedBannerVisible !== true,
    },
    {
      id: "unshield-proof-request-ready",
      isSatisfied: (evidence) => evidence.unshieldProofRequestReady === true,
    },
    {
      id: "runtime-verifier-wired",
      isSatisfied: (evidence) => evidence.runtimeVerifierWired === true,
    },
    {
      id: "strict-no-witness-artifact-present",
      isSatisfied: (evidence) => evidence.strictNoWitnessArtifactPresent === true,
    },
    {
      id: "operator-program-release-receipt-present",
      isSatisfied: (evidence) => evidence.operatorProgramReleaseReceiptPresent === true,
    },
    {
      id: "protocol-settlement-receipt-bound",
      isSatisfied: (evidence) => evidence.protocolSettlementReceiptBound === true,
    },
    {
      id: "replay-protection-linked",
      isSatisfied: (evidence) => evidence.replayProtectionLinked === true,
    },
    {
      id: "release-enabled-audit-gate-reviewed",
      isSatisfied: (evidence) => evidence.releaseEnabledAuditGate === "enabled-reviewed",
    },
    {
      id: "public-exit-verified",
      isSatisfied: (evidence) => evidence.publicExitVerified === true,
    },
  ];

const SWAP_LOCAL_PRIVATE_REQUIREMENTS: readonly BooleanRequirement<VantaPrivatePoolV2SwapActionEvidence>[] =
  [
    {
      id: "swap-ui-complete",
      isSatisfied: (evidence) => evidence.uiStatus === "complete",
    },
    {
      id: "swap-exact-spendable-note-selected",
      isSatisfied: (evidence) => evidence.exactSpendableNoteSelected === true,
    },
    {
      id: "swap-quote-fresh",
      isSatisfied: (evidence) => evidence.quoteFresh === true,
    },
    {
      id: "canonical-swap-bridge-present",
      isSatisfied: (evidence) => evidence.canonicalSwapBridgePresent === true,
    },
    {
      id: "committed-swap-settlement-terms-ready",
      isSatisfied: (evidence) => evidence.committedSettlementTermsReady === true,
    },
    {
      id: "operator-swap-authorization-present",
      isSatisfied: (evidence) => evidence.operatorSwapAuthorizationPresent === true,
    },
    {
      id: "protocol-settlement-receipt-bound",
      isSatisfied: (evidence) => evidence.protocolSettlementReceiptBound === true,
    },
    {
      id: "swap-to-shielded-proof-receipt-present",
      isSatisfied: (evidence) => evidence.swapToShieldedProofReceiptPresent === true,
    },
    {
      id: "no-witness-proof-receipt-ready",
      isSatisfied: (evidence) => evidence.noWitnessProofReceiptReady === true,
    },
    {
      id: "replay-protection-linked",
      isSatisfied: (evidence) => evidence.replayProtectionLinked === true,
    },
    {
      id: "output-commitment-bound",
      isSatisfied: (evidence) => evidence.outputCommitmentBound === true,
    },
    {
      id: "resulting-root-recorded",
      isSatisfied: (evidence) => evidence.resultingRootRecorded === true,
    },
  ];

const PRODUCTION_PRIVATE_REQUIREMENTS: readonly BooleanRequirement<
  | VantaPrivatePoolV2SendActionEvidence
  | VantaPrivatePoolV2SwapActionEvidence
  | VantaPrivatePoolV2UnshieldActionEvidence
>[] = [
  {
    id: "live-mainnet-settlement-reviewed",
    isSatisfied: (evidence) => evidence.liveMainnetSettlementReviewed === true,
  },
  {
    id: "production-verifier-accepted",
    isSatisfied: (evidence) => evidence.productionVerifierAccepted === true,
  },
  {
    id: "shared-anonymity-reviewed",
    isSatisfied: (evidence) => evidence.sharedAnonymityReviewed === true,
  },
  {
    id: "relayer-separation-reviewed",
    isSatisfied: (evidence) => evidence.relayerSeparationReviewed === true,
  },
  {
    id: "audit-accepted",
    isSatisfied: (evidence) => evidence.auditAccepted === true,
  },
  {
    id: "programmatic-production-private-ready",
    isSatisfied: (evidence) => evidence.programmaticProductionPrivateReady === true,
  },
  {
    id: "programmatic-privacy-claim-allowed",
    isSatisfied: (evidence) => evidence.programmaticPrivacyClaimAllowed === true,
  },
  {
    id: "programmatic-mainnet-ready",
    isSatisfied: (evidence) => evidence.programmaticMainnetReady === true,
  },
  {
    id: "production-privacy-claims-unlocked",
    isSatisfied: (evidence) => evidence.productionPrivacyClaimsLocked === false,
  },
  {
    id: "external-review-accepted",
    isSatisfied: (evidence) => evidence.externalReviewAccepted === true,
  },
  {
    id: "owner-approved-production-scope",
    isSatisfied: (evidence) => evidence.ownerApprovedProductionScope === true,
  },
];

function missingRequirementIds<TEvidence>(
  requirements: readonly BooleanRequirement<TEvidence>[],
  evidence: TEvidence,
) {
  return requirements
    .filter((requirement) => !requirement.isSatisfied(evidence))
    .map((requirement) => requirement.id);
}

export const VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION = {
  status: "send-swap-unshield-ui-authoritative",
  packageGate: "private-pool-v2:product-action-contract-check",
  send: {
    productSurfaceStatus: "evaluator-authoritative",
    currentVisibleScope: "legacy-local-transition-not-production-private",
    requiredNextGate:
      "Send private-complete copy must stay derived from evaluateVantaPrivatePoolV2SendActionContract.",
  },
  swap: {
    productSurfaceStatus: "evaluator-authoritative",
    currentVisibleScope: "swap-beta-route-not-private",
    requiredNextGate:
      "Swap private-complete copy must stay derived from evaluateVantaPrivatePoolV2SwapActionContract.",
  },
  unshield: {
    productSurfaceStatus: "evaluator-authoritative",
    currentVisibleScope: "public-operator-release-not-private",
    requiredNextGate:
      "Unshield private-complete copy must stay derived from evaluateVantaPrivatePoolV2UnshieldActionContract.",
  },
} as const;

export const VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT = {
  version: VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_VERSION,
  adoption: VANTA_PRIVATE_POOL_V2_PRODUCT_ACTION_CONTRACT_ADOPTION,
  actions: {
    send: {
      action: "send",
      localVisibleCompletionScope: "legacy-local-transition-not-production-private",
      localPrivateCompletionScope: "local-proof-bound-not-production-private",
      productionPrivateCompletionScope: "production-private",
      localPrivateRequirementIds: SEND_LOCAL_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
      productionPrivateRequirementIds: PRODUCTION_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
    },
    swap: {
      action: "swap",
      localVisibleCompletionScope: "swap-beta-route-not-private",
      localPrivateCompletionScope: "local-proof-bound-not-production-private",
      productionPrivateCompletionScope: "production-private",
      localPrivateRequirementIds: SWAP_LOCAL_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
      productionPrivateRequirementIds: PRODUCTION_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
    },
    unshield: {
      action: "unshield",
      localVisibleCompletionScope: "public-operator-release-not-private",
      localPrivateCompletionScope: "local-proof-bound-not-production-private",
      productionPrivateCompletionScope: "production-private",
      localPrivateRequirementIds: UNSHIELD_LOCAL_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
      productionPrivateRequirementIds: PRODUCTION_PRIVATE_REQUIREMENTS.map(
        (requirement) => requirement.id,
      ),
    },
  },
} as const;

export function evaluateVantaPrivatePoolV2SendActionContract(
  evidence: VantaPrivatePoolV2SendActionEvidence,
): VantaPrivatePoolV2ProductActionContractResult {
  const localPrivateBlockers = missingRequirementIds(SEND_LOCAL_PRIVATE_REQUIREMENTS, evidence);
  const localPrivateCompletionAllowed = localPrivateBlockers.length === 0;
  const productionBlockers = localPrivateCompletionAllowed
    ? missingRequirementIds(PRODUCTION_PRIVATE_REQUIREMENTS, evidence)
    : ["local-private-send-not-established"];
  const productionPrivateCompletionAllowed =
    localPrivateCompletionAllowed && productionBlockers.length === 0;
  const legacyVisibleCompletionAllowed =
    evidence.legacyUiStatus === "complete" || localPrivateCompletionAllowed;

  return {
    action: "send",
    legacyVisibleCompletionAllowed,
    localPrivateCompletionAllowed,
    productionPrivateCompletionAllowed,
    visibleCompletionScope: productionPrivateCompletionAllowed
      ? "production-private"
      : localPrivateCompletionAllowed
        ? "local-proof-bound-not-production-private"
        : evidence.legacyUiStatus === "complete"
          ? "legacy-local-transition-not-production-private"
          : "not-complete",
    blockers: [...localPrivateBlockers, ...productionBlockers],
  };
}

export function evaluateVantaPrivatePoolV2SwapActionContract(
  evidence: VantaPrivatePoolV2SwapActionEvidence,
): VantaPrivatePoolV2ProductActionContractResult {
  const localPrivateBlockers = missingRequirementIds(SWAP_LOCAL_PRIVATE_REQUIREMENTS, evidence);
  const localPrivateCompletionAllowed = localPrivateBlockers.length === 0;
  const productionBlockers = localPrivateCompletionAllowed
    ? missingRequirementIds(PRODUCTION_PRIVATE_REQUIREMENTS, evidence)
    : ["local-private-swap-not-established"];
  const productionPrivateCompletionAllowed =
    localPrivateCompletionAllowed && productionBlockers.length === 0;
  const legacyVisibleCompletionAllowed =
    evidence.uiStatus === "complete" || localPrivateCompletionAllowed;

  return {
    action: "swap",
    legacyVisibleCompletionAllowed,
    localPrivateCompletionAllowed,
    productionPrivateCompletionAllowed,
    visibleCompletionScope: productionPrivateCompletionAllowed
      ? "production-private"
      : localPrivateCompletionAllowed
        ? "local-proof-bound-not-production-private"
        : evidence.uiStatus === "complete"
          ? "swap-beta-route-not-private"
          : "not-complete",
    blockers: [...localPrivateBlockers, ...productionBlockers],
  };
}

export function evaluateVantaPrivatePoolV2UnshieldActionContract(
  evidence: VantaPrivatePoolV2UnshieldActionEvidence,
): VantaPrivatePoolV2ProductActionContractResult {
  const localPrivateBlockers = missingRequirementIds(
    UNSHIELD_LOCAL_PRIVATE_REQUIREMENTS,
    evidence,
  );
  const localPrivateCompletionAllowed = localPrivateBlockers.length === 0;
  const productionBlockers = localPrivateCompletionAllowed
    ? missingRequirementIds(PRODUCTION_PRIVATE_REQUIREMENTS, evidence)
    : ["local-private-unshield-not-established"];
  const productionPrivateCompletionAllowed =
    localPrivateCompletionAllowed && productionBlockers.length === 0;
  const legacyVisibleCompletionAllowed =
    evidence.uiStatus === "complete" && evidence.operatorReleaseSignaturePresent === true;

  return {
    action: "unshield",
    legacyVisibleCompletionAllowed,
    localPrivateCompletionAllowed,
    productionPrivateCompletionAllowed,
    visibleCompletionScope: productionPrivateCompletionAllowed
      ? "production-private"
      : localPrivateCompletionAllowed
        ? "local-proof-bound-not-production-private"
        : legacyVisibleCompletionAllowed
          ? "public-operator-release-not-private"
          : "not-complete",
    blockers: [...localPrivateBlockers, ...productionBlockers],
  };
}
