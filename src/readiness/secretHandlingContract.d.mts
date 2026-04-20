export type VantaSecretHandlingScope = {
  allowedSecretRefs: string[];
  forbiddenValues: string[];
  id: "pay" | "privatePoolV2" | "strategy" | "operator" | "wallet";
  label: string;
  rotationRequirements: string[];
  status: "contracted-not-provisioned";
};

export type VantaSecretHandlingContract = {
  globalRequirements: string[];
  mainnetReady: false;
  nextImplementationStep: string;
  privateKeyHandling: "never-request-store-or-load-private-keys";
  productionReady: false;
  requiredVerificationCommands: string[];
  scopes: VantaSecretHandlingScope[];
  version: "vanta-secret-handling-contract-0.1";
};

export function createVantaSecretHandlingContract(): VantaSecretHandlingContract;
