export type VantaPassportEligibilityPolicy = {
  policyId: string;
  policyHash: string;
  verifierId: string;
  issuerHash: string;
  minReputationScore: number;
  minWalletAgeBucket: number;
  minVolumeTier: number;
  allowlistRoot: string;
  expirySlot: number;
};

export type VantaPassportEligibilityWitness = {
  reputationScore: number;
  walletAgeBucket: number;
  volumeTier: number;
  riskFlag: 0 | 1;
  passportSecret: string;
  claimWalletSecret: string;
  claimWalletBlinding: string;
  allowlistLeafSecret: string;
  allowlistPath: readonly string[];
  allowlistPathIndices: readonly number[];
};

export type VantaPassportEligibilityPublicInputs = {
  policyId: string;
  policyHash: string;
  verifierId: string;
  issuerHash: string;
  minReputationScore: number;
  minWalletAgeBucket: number;
  minVolumeTier: number;
  allowlistRoot: string;
  passportCommitment: string;
  claimWalletCommitment: string;
  eligibilityNullifier: string;
  expirySlot: number;
  currentSlotFloor: number;
};

export type VantaPassportEligibilityHeader = {
  schemaVersion: "vanta-passport-eligibility-header-v0.1";
  adapterId: "passportReputationGate";
  circuitId: "vanta_passport_reputation_gate";
  policyHash: string;
  verifierId: string;
  issuerHash: string;
  publicInputHash: string;
  eligibilityNullifier: string;
  proofEncoding: "groth16-bn254" | "noir-bb-candidate";
  proof: string;
  redactedFields: readonly string[];
  claimBoundary: string;
};

export type VantaPassportEligibilityDeps = {
  currentSlotFloor(): Promise<number>;
  derivePublicInputs(args: {
    policy: VantaPassportEligibilityPolicy;
    witness: VantaPassportEligibilityWitness;
    currentSlotFloor: number;
  }): Promise<VantaPassportEligibilityPublicInputs>;
  proveLocal(args: {
    circuitId: "vanta_passport_reputation_gate";
    witness: VantaPassportEligibilityWitness;
    publicInputs: VantaPassportEligibilityPublicInputs;
  }): Promise<{ proof: string; proofEncoding: VantaPassportEligibilityHeader["proofEncoding"] }>;
  verifyLocal(args: {
    proof: string;
    proofEncoding: VantaPassportEligibilityHeader["proofEncoding"];
    publicInputs: VantaPassportEligibilityPublicInputs;
  }): Promise<boolean>;
  hasActiveVerifier(args: {
    circuitId: "vanta_passport_reputation_gate";
    policyHash: string;
    verifierId: string;
    issuerHash: string;
  }): Promise<boolean>;
  hasConsumedNullifier(nullifier: string): Promise<boolean>;
  hashPublicInputs(publicInputs: VantaPassportEligibilityPublicInputs): Promise<string>;
};

export async function createVantaPassportEligibilityHeader(args: {
  policy: VantaPassportEligibilityPolicy;
  witness: VantaPassportEligibilityWitness;
  deps: VantaPassportEligibilityDeps;
}): Promise<VantaPassportEligibilityHeader> {
  const { policy, witness, deps } = args;
  const currentSlotFloor = await deps.currentSlotFloor();

  if (!policy.policyId || !policy.policyHash || !policy.verifierId || !policy.issuerHash) {
    throw new Error("passport eligibility policy is incomplete");
  }
  if (!policy.allowlistRoot) {
    throw new Error("passport eligibility allowlist root is required");
  }
  if (policy.expirySlot < currentSlotFloor) {
    throw new Error("passport eligibility policy expired");
  }
  if (witness.riskFlag !== 0) {
    throw new Error("passport eligibility risk flag is not acceptable");
  }
  if (witness.allowlistPath.length !== 3 || witness.allowlistPathIndices.length !== 3) {
    throw new Error("passport eligibility allowlist path must match circuit depth");
  }

  const publicInputs = await deps.derivePublicInputs({ policy, witness, currentSlotFloor });
  const verifierActive = await deps.hasActiveVerifier({
    circuitId: "vanta_passport_reputation_gate",
    policyHash: publicInputs.policyHash,
    verifierId: publicInputs.verifierId,
    issuerHash: publicInputs.issuerHash,
  });
  if (!verifierActive) {
    throw new Error("passport eligibility verifier is not active");
  }
  if (await deps.hasConsumedNullifier(publicInputs.eligibilityNullifier)) {
    throw new Error("passport eligibility nullifier already consumed");
  }

  const proofResult = await deps.proveLocal({
    circuitId: "vanta_passport_reputation_gate",
    witness,
    publicInputs,
  });
  const proofAccepted = await deps.verifyLocal({
    proof: proofResult.proof,
    proofEncoding: proofResult.proofEncoding,
    publicInputs,
  });
  if (!proofAccepted) {
    throw new Error("passport eligibility proof failed local verification");
  }

  return {
    schemaVersion: "vanta-passport-eligibility-header-v0.1",
    adapterId: "passportReputationGate",
    circuitId: "vanta_passport_reputation_gate",
    policyHash: publicInputs.policyHash,
    verifierId: publicInputs.verifierId,
    issuerHash: publicInputs.issuerHash,
    publicInputHash: await deps.hashPublicInputs(publicInputs),
    eligibilityNullifier: publicInputs.eligibilityNullifier,
    proofEncoding: proofResult.proofEncoding,
    proof: proofResult.proof,
    redactedFields: [
      "wallet_history",
      "main_wallet_address",
      "portfolio",
      "reputationScore",
      "walletAgeBucket",
      "volumeTier",
      "riskFlag",
      "passport_secret",
      "claim_wallet_secret",
      "claim_wallet_blinding",
      "allowlist_leaf_secret",
      "allowlist_path",
      "allowlist_path_indices",
      "witness",
    ],
    claimBoundary:
      "local-proof-header-candidate-not-zkmedusa-integration-not-production-private",
  };
}
