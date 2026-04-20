export type VantaProductionServiceId = "indexer" | "relayer" | "prover" | "verifier" | "operator";

export type VantaProductionServiceContractEntry = {
  deploymentStatus: "not-deployed";
  id: VantaProductionServiceId;
  label: string;
  requiredChecks: string[];
  requiredEndpoints: string[];
  requiredEnv: string[];
  securityRequirements: string[];
};

export type VantaProductionServiceContract = {
  crossServiceRequirements: string[];
  mainnetReady: false;
  nextImplementationStep: string;
  productionReady: false;
  requiredVerificationCommands: string[];
  services: VantaProductionServiceContractEntry[];
  version: "vanta-production-service-contract-0.1";
};

export function createVantaProductionServiceContract(): VantaProductionServiceContract;
