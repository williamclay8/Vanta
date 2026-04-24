export type VantaPrivatePoolV2AnonymitySetReadiness = {
  version: "vanta-private-pool-v2-anonymity-set-readiness-0.1";
  railId: "vanta-private-pool-v2";
  anonymitySetReadiness: "blocked";
  auditedSharedAnonymitySetAvailable: false;
  liveAnonymitySetAvailable: false;
  liveMainnetPrivateSettlementAvailable: false;
  mainnetReady: false;
  meaningfulPrivacyReady: false;
  minimumDistinctCommitments: number;
  privacyClaimAllowed: false;
  productionAnonymityMetricsAvailable: false;
  productionReady: false;
  assetCohortRules: { required: string[] };
  relayerSeparation: { requiredEvidenceRefs: string[] };
  nullifierUniqueness: { requiredEvidenceRefs: string[] };
  safeLogging: { required: string[] };
  currentEvidenceRefs: string[];
  requiredEvidenceRefs: string[];
  blockers: string[];
  nonClaims: string[];
  userFacingRule: string;
};

export function createVantaPrivatePoolV2AnonymitySetReadiness(): VantaPrivatePoolV2AnonymitySetReadiness;
