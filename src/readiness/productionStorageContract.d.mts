export type VantaProductionStorageStore = {
  id: "pay" | "privatePoolV2" | "strategy" | "operator";
  label: string;
  requiredIndexes: string[];
  requiredMigrations: string[];
  requiredTables: string[];
  restoreChecks: string[];
  safetyRequirements: string[];
  status: "not-wired";
};

export type VantaProductionStorageContract = {
  globalRequirements: string[];
  mainnetReady: false;
  nextImplementationStep: string;
  productionReady: false;
  requiredVerificationCommands: string[];
  secretPolicy: "names-only-no-secret-values";
  stores: VantaProductionStorageStore[];
  version: "vanta-production-storage-contract-0.1";
};

export function createVantaProductionStorageContract(): VantaProductionStorageContract;
