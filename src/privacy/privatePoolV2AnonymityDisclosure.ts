import anonymitySetEvidence from "../../ops/mainnet/private-pool-v2-anonymity-set.evidence.json";

const currentMeasurement = anonymitySetEvidence.currentMeasurement;

export const VANTA_PRIVATE_POOL_V2_PUBLIC_DEPTH_DISCLOSURE_VERSION =
  "vanta-private-pool-v2-public-depth-disclosure-0.1";

export function getVantaPrivatePoolV2AnonymityDisclosure() {
  return {
    version: VANTA_PRIVATE_POOL_V2_PUBLIC_DEPTH_DISCLOSURE_VERSION,
    railId: "vanta-private-pool-v2",
    status: "blocked",
    sourceEvidencePath: "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
    readinessCheck: "npm run private-pool-v2:anonymity-set-readiness-check",
    metricsCheck: "npm run private-pool-v2:anonymity-set-metrics-check",
    evidenceCheck: "npm run private-pool-v2:anonymity-set-evidence-check",
    currentDistinctCommitmentCount: currentMeasurement.distinctCommitmentCount,
    minimumDistinctCommitments: currentMeasurement.minimumDistinctCommitments,
    currentMeasurementStatus: currentMeasurement.status,
    measuredAt: currentMeasurement.measuredAt,
    privacyClaimAllowed: false,
    liveAnonymityClaimAllowed: false,
    productionPrivacyClaimAllowed: false,
    blocker:
      "Current reviewed commitment depth is below the threshold and no independent reviewer has accepted the anonymity-set measurement.",
  } as const;
}
