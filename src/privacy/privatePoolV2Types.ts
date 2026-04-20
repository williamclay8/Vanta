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

export type VantaPrivatePoolV2ProofIntent =
  | "shield"
  | "private-send"
  | "swap-to-shielded"
  | "unshield"
  | "claim";

export type VantaPrivatePoolV2ProofRequest = {
  amountBaseUnits: bigint;
  assetId: string;
  intent: VantaPrivatePoolV2ProofIntent;
  publicInputs: readonly string[];
};

export type VantaPrivatePoolV2ProofResult = {
  publicInputCommitment: string;
  proofBytes: Uint8Array;
  proofSystem: "noir-bb" | "groth16" | "plonk" | "mock";
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
    publicInputCommitment: string;
    receiptId: string;
    recordedAtSlot: bigint;
    replayKey: string;
  }>;
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
