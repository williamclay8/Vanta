export function createVantaPrivatePoolV2AnonymitySetReadiness() {
  return {
    version: "vanta-private-pool-v2-anonymity-set-readiness-0.1",
    railId: "vanta-private-pool-v2",
    anonymitySetReadiness: "blocked",
    auditedSharedAnonymitySetAvailable: false,
    liveAnonymitySetAvailable: false,
    liveMainnetPrivateSettlementAvailable: false,
    mainnetReady: false,
    meaningfulPrivacyReady: false,
    minimumDistinctCommitments: 1024,
    privacyClaimAllowed: false,
    productionAnonymityMetricsAvailable: false,
    productionReady: false,
    assetCohortRules: {
      required: [
        "single asset cohort per pool",
        "stable target pool mint per cohort",
        "no cross-asset anonymity-set claims",
        "cohort metrics must exclude test fixtures and no-real-funds smoke receipts",
      ],
    },
    relayerSeparation: {
      requiredEvidenceRefs: [
        "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
        "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
        "npm run private-pool-v2:relayer-separation-evidence-check",
      ],
      currentTruth:
        "role-service replay evidence proves correctness barriers; it is not relayer privacy separation evidence",
    },
    nullifierUniqueness: {
      requiredEvidenceRefs: [
        "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
        "npm run mainnet:nullifier-replay-evidence-check",
      ],
    },
    safeLogging: {
      required: [
        "no auth tokens",
        "no database URLs",
        "no wallet keys",
        "no signed transaction material",
        "no customer private inputs",
        "no raw hidden-economics terms in committed-economics receipts",
      ],
    },
    currentEvidenceRefs: [
      "ops/mainnet/private-pool-v2-production-smoke.evidence.json",
      "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
      "ops/mainnet/private-pool-v2-relayer-separation.evidence.json",
      "ops/mainnet/private-pool-v2-nullifier-replay.evidence.json",
      "ops/mainnet/private-pool-v2-role-service-replay.evidence.json",
      "ops/mainnet/private-pool-v2-route-health.evidence.json",
      "ops/mainnet/service-deployment.evidence.json",
    ],
    requiredEvidenceRefs: [
      "VANTA_PRIVATE_POOL_V2_AUDIT_REF",
      "VANTA_PRIVATE_POOL_V2_ANONYMITY_SET_REF",
      "VANTA_PRIVATE_POOL_V2_PRODUCTION_ANONYMITY_METRICS_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_SEPARATION_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_LOG_REDACTION_REF",
      "VANTA_PRIVATE_POOL_V2_RELAYER_DEPLOYMENT_SEPARATION_REF",
    ],
    blockers: [
      "no-proven-audited-shared-anonymity-set",
      "no-live-mainnet-private-settlement-path",
      "no-third-party-audit",
      "no-production-anonymity-set-metrics",
      "no-production-relayer-separation-evidence",
    ],
    nonClaims: [
      "no anonymity guarantee",
      "no audited hidden-economics privacy claim",
      "no production mainnet privacy claim",
      "no legal, compliance, custody, or security certification claim",
    ],
    userFacingRule:
      "Do not claim live anonymity, audited hidden-economics privacy, production mainnet privacy, or security certification until the required evidence refs are filled and reviewed.",
  };
}
