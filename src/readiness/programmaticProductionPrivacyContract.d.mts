export type VantaProgrammaticProductionPrivacyRequirementStatus =
  | "blocked"
  | "partially-satisfied"
  | "satisfied";

export type VantaProgrammaticProductionPrivacyRequirement = {
  id: string;
  status: VantaProgrammaticProductionPrivacyRequirementStatus;
  currentTruth: string;
  requiredEvidenceRefs: string[];
};

export type VantaProgrammaticProductionPrivacyContract = {
  version: "vanta-programmatic-production-privacy-contract-0.1";
  definition: string;
  selectedRailId: "vanta-private-pool-v2";
  productionPrivateReady: false;
  privacyClaimAllowed: false;
  mainnetReady: false;
  score: number;
  maxScore: number;
  requirements: VantaProgrammaticProductionPrivacyRequirement[];
  blockedRequirementIds: string[];
  partiallySatisfiedRequirementIds: string[];
  currentTruth: string;
  currentSignals: {
    liveMainnetPrivateSettlementAvailable: boolean;
    meaningfulPrivacyReady: boolean;
    auditedSharedAnonymitySetAvailable: boolean;
    boundedRealFundsApprovalWindowActive: boolean;
    realFundsApprovalWindowStatus: "scheduled" | "active" | "expired";
    currentDistinctCommitmentCount: number;
    minimumDistinctCommitments: number;
  };
  requiredVerificationCommands: string[];
  userFacingRule: string;
};

export function createVantaProgrammaticProductionPrivacyContract(): VantaProgrammaticProductionPrivacyContract;
