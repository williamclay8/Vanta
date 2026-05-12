import type {
  VantaPrivacyAsset,
  VantaPrivacyInfrastructureRequirement,
  VantaPrivacyNetwork,
} from "./protocolAdapter";

export const VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION = "vanta-private-pool-v2-contract-0.1";

export type VantaPrivatePoolV2Asset = VantaPrivacyAsset & {
  poolMintAddress: string;
  poolStatus: "benchmark" | "planned" | "live";
  routeablePublicEntry: boolean;
};

export type VantaPrivatePoolV2Commitment = {
  assetId: string;
  commitment: string;
  leafIndex: number;
  merkleRoot: string;
  treeId: string;
};

export type VantaPrivatePoolV2Nullifier = {
  nullifier: string;
  spentAtSlot: bigint | null;
};

export type VantaPrivatePoolV2MerkleProof = {
  leaf: VantaPrivatePoolV2Commitment;
  path: readonly string[];
  pathIndices: readonly 0[] | readonly 1[] | readonly number[];
  root: string;
};

export type VantaPrivatePoolV2ClaimQuote = {
  estimatedFeeBaseUnits: bigint;
  expiresAtSlot: bigint;
  relayerId: string;
};

export type VantaPrivatePoolV2PrivateSpendSubmission = {
  relayerId: string;
  signature: string;
  submittedBy: "relayer";
};

export type VantaPrivatePoolV2ActualPrivateSpendExpectedAccounts = {
  nullifierMarker?: string;
  nullifierSet?: string;
  operatorAuthority?: string;
  outputRecord?: string;
  outputQueue?: string;
  poolState?: string;
  programId?: string;
  relayerFeePayer?: string;
  rootHistory?: string;
  systemProgram?: string;
};

export type VantaPrivatePoolV2ActualPrivateSpendExpectedPublicInputs = {
  acceptedRoot: string;
  changeOutputCommitment?: string;
  nullifier?: string;
  nullifierOrReplayCommitment?: string;
  outputCommitment?: string;
  outputCommitments?: readonly [string, string];
  privateSpendPublicInputHash: string;
};

export type VantaPrivatePoolV2ProofIntent =
  | "shield"
  | "private-send"
  | "swap-to-shielded"
  | "unshield"
  | "claim";

export type VantaPrivatePoolV2ShadowCommitments = {
  economicsCommitment: string;
  operatorVisibleTermsCommitment: string;
  scheme: "vanta-private-pool-v2-shadow-operator-visible-terms-sha256-0.1";
};

export type VantaPrivatePoolV2ProofRequest = {
  amountBaseUnits: bigint;
  assetId: string;
  circuitPublicInputs?: readonly string[];
  intent: VantaPrivatePoolV2ProofIntent;
  operatorVisibleTerms?: readonly string[];
  publicInputs: readonly string[];
  shadowCommitments?: VantaPrivatePoolV2ShadowCommitments;
};

export type VantaPrivatePoolV2ProofSystem = "noir-bb" | "groth16" | "plonk" | "mock";
export type VantaPrivatePoolV2ProofBackend =
  | "local-mock"
  | "local-bb-fixture-artifact"
  | "local-bb-derived-artifact"
  | "remote-service";
export type VantaPrivatePoolV2ProofArtifactVerifyingKeyHashKind =
  | "local-acir-bytecode-hash-not-production-vk"
  | "production-verifying-key-hash";

export type VantaPrivatePoolV2ProofResult = {
  proofBackend?: VantaPrivatePoolV2ProofBackend;
  publicInputCommitment: string;
  proofBytes: Uint8Array;
  proofSystem: VantaPrivatePoolV2ProofSystem;
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2ShieldProofArtifact = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: "vanta_private_pool_v2_shield_entry";
  proofBackend: "local-bb-fixture-artifact";
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: "noir-bb";
  publicInputCommitment: string;
  publicInputLabels: readonly ["shield-public-input-hash"];
  publicInputs: readonly string[];
  verifyingKeyHash: string;
  verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk";
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2ClaimProofArtifact = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: "vanta_private_pool_v2_claim_entry";
  proofBackend: "local-bb-fixture-artifact";
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: "noir-bb";
  publicInputCommitment: string;
  publicInputLabels: readonly ["claim-public-input-hash"];
  publicInputs: readonly string[];
  verifyingKeyHash: string;
  verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk";
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2SendProofArtifact = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: "vanta_private_pool_v2_send_entry";
  proofBackend: "local-bb-fixture-artifact" | "local-bb-derived-artifact";
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: "noir-bb";
  publicInputCommitment: string;
  publicInputLabels: readonly ["send-public-input-hash"];
  publicInputs: readonly string[];
  verifyingKeyHash: string;
  verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk";
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2SwapToShieldedProofArtifact = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: "vanta_private_pool_v2_swap_to_shielded_entry";
  proofBackend: "local-bb-fixture-artifact";
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: "noir-bb";
  publicInputCommitment: string;
  publicInputLabels: readonly ["swap-public-input-hash"];
  publicInputs: readonly string[];
  verifyingKeyHash: string;
  verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk";
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2ActualPrivateSpendProofArtifact = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: "vanta_private_pool_v2_actual_private_spend_entry";
  proofBackend: "local-bb-fixture-artifact" | "local-bb-derived-artifact";
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: "noir-bb";
  publicInputCommitment: string;
  publicInputLabels: readonly ["private-spend-public-input-hash"];
  publicInputs: readonly string[];
  verifyingKeyHash: string;
  verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk";
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2ProofArtifactVerificationReceipt = {
  acirBytecodeHash: string;
  backend: "barretenberg-ultrahonk";
  circuit: string;
  proofBackend: VantaPrivatePoolV2ProofBackend;
  proofByteLength: number;
  proofFieldCount: number;
  proofHex: string;
  proofRuntimePackage: "@aztec/bb.js";
  proofRuntimeVersion: string;
  proofSystem: VantaPrivatePoolV2ProofSystem;
  publicInputCommitment: string;
  publicInputCount: number;
  publicInputLabels: readonly string[];
  publicInputs: readonly string[];
  verified: boolean;
  verifiedPublicInputs: Record<string, string>;
  verifyingKeyHash: string;
  verifyingKeyHashKind: VantaPrivatePoolV2ProofArtifactVerifyingKeyHashKind;
  verifyingKeyId: string;
};

export type VantaPrivatePoolV2Readiness = {
  blockers: readonly string[];
  ready: boolean;
  warnings: readonly string[];
};

export interface VantaPrivatePoolV2Indexer {
  getCurrentRoot(treeId: string): Promise<string>;
  getMerkleProof(commitment: string): Promise<VantaPrivatePoolV2MerkleProof>;
  getNullifier(nullifier: string): Promise<VantaPrivatePoolV2Nullifier | null>;
  listCommitments(args: {
    assetId?: string;
    fromLeafIndex?: number;
    treeId: string;
  }): Promise<readonly VantaPrivatePoolV2Commitment[]>;
}

export interface VantaPrivatePoolV2Relayer {
  quoteClaim(args: {
    amountBaseUnits: bigint;
    assetId: string;
    destinationAddress: string;
  }): Promise<VantaPrivatePoolV2ClaimQuote>;
  submitClaim(args: {
    quote: VantaPrivatePoolV2ClaimQuote;
    serializedTransaction: string;
  }): Promise<{ relayerId: string; signature: string }>;
  submitPrivateSpend?(args: {
    expectedAccounts?: VantaPrivatePoolV2ActualPrivateSpendExpectedAccounts;
    expectedPublicInputs?: VantaPrivatePoolV2ActualPrivateSpendExpectedPublicInputs;
    proofReceiptId: string;
    publicInputCommitment: string;
    settlementId: string;
    serializedTransaction: string;
  }): Promise<VantaPrivatePoolV2PrivateSpendSubmission>;
}

export interface VantaPrivatePoolV2Prover {
  prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult>;
  readiness(): VantaPrivatePoolV2Readiness;
  verify?(args: {
    proof: VantaPrivatePoolV2ProofResult;
    request: VantaPrivatePoolV2ProofRequest;
  }): Promise<boolean>;
}

export interface VantaPrivatePoolV2VerifierRegistry {
  acceptProof(args: {
    proof: VantaPrivatePoolV2ProofResult;
    request: VantaPrivatePoolV2ProofRequest;
  }): Promise<{
    assetId: string;
    intent: VantaPrivatePoolV2ProofIntent;
    proofBackend?: VantaPrivatePoolV2ProofBackend;
    proofSystem: VantaPrivatePoolV2ProofSystem;
    publicInputCommitment: string;
    receiptId: string;
    recordedAtSlot: bigint;
    replayKey: string;
  }>;
  verifyProofArtifact?(args: {
    expectedPublicInputs?: Record<string, string>;
    proofArtifact: unknown;
  }): Promise<VantaPrivatePoolV2ProofArtifactVerificationReceipt>;
}

export interface VantaPrivatePoolV2Protocol {
  assets: readonly VantaPrivatePoolV2Asset[];
  contractVersion: typeof VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION;
  indexer: VantaPrivatePoolV2Indexer | null;
  infrastructure: readonly VantaPrivacyInfrastructureRequirement[];
  network: VantaPrivacyNetwork;
  prover: VantaPrivatePoolV2Prover | null;
  readiness(): VantaPrivatePoolV2Readiness;
  relayer: VantaPrivatePoolV2Relayer | null;
  verifierRegistry?: VantaPrivatePoolV2VerifierRegistry | null;
}
