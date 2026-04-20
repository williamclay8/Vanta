export type VantaPrivacyRailId = "alpha-public-warning" | "umbra-mainnet" | "vanta-private-pool-v2";

export type VantaPrivacyRail = {
  id: VantaPrivacyRailId;
  label: string;
  mode: "mainnet-alpha" | "external-privacy-rail" | "vanta-operated-private-pool";
  canClaimMeaningfulPrivacy: false;
  requiredEvidence: string[];
  blockers: string[];
};

export type VantaPrivacyRailContract = {
  version: "vanta-privacy-rail-contract-0.1";
  activeRailId: VantaPrivacyRailId;
  mainnetReady: false;
  meaningfulPrivacyReady: false;
  productionReady: false;
  rails: VantaPrivacyRail[];
  requiredVerificationCommands: string[];
  userFacingRule: string;
};

export function createVantaPrivacyRailContract(): VantaPrivacyRailContract;
