import type { CompiledCircuit } from "@noir-lang/noir_js";

import type { VantaPrivatePoolV2ActualPrivateSpendCircuitWitnessInput } from "./privatePoolV2ActualPrivateSpendCircuitFixture";
import type { VantaPrivatePoolV2ClaimCircuitWitnessInput } from "./privatePoolV2ClaimCircuitFixture";
import type { VantaPrivatePoolV2SendCircuitWitnessInput } from "./privatePoolV2SendCircuitFixture";
import type { VantaPrivatePoolV2ShieldCircuitWitnessInput } from "./privatePoolV2ShieldCircuitFixture";
import type {
  VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  VantaPrivatePoolV2ClaimProofArtifact,
  VantaPrivatePoolV2SendProofArtifact,
  VantaPrivatePoolV2ShieldProofArtifact,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVER_SCHEME =
  "vanta-private-pool-v2-browser-worker-prover-0.1" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE =
  "vanta-private-pool-v2-browser-worker-prove-send" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE =
  "vanta-private-pool-v2-browser-worker-prove-send-response" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_MESSAGE =
  "vanta-private-pool-v2-browser-worker-prove-shield" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE =
  "vanta-private-pool-v2-browser-worker-prove-shield-response" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_MESSAGE =
  "vanta-private-pool-v2-browser-worker-prove-claim" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE =
  "vanta-private-pool-v2-browser-worker-prove-claim-response" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE =
  "vanta-private-pool-v2-browser-worker-prove-actual-private-spend" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE =
  "vanta-private-pool-v2-browser-worker-prove-actual-private-spend-response" as const;

export type VantaPrivatePoolV2BrowserWorkerSendProverBasePayload = {
  circuit: "vanta_private_pool_v2_send_entry";
  compiledProgramBytecode: string;
  expectedPublicInputHash?: string;
  proofRuntimeVersion: string;
  target: "send";
};

export type VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload =
  VantaPrivatePoolV2BrowserWorkerSendProverBasePayload & {
    compiledProgramAbi?: never;
    compressedWitness: ArrayBuffer | Uint8Array;
    witnessInput?: never;
  };

export type VantaPrivatePoolV2BrowserWorkerSendWitnessInputPayload =
  VantaPrivatePoolV2BrowserWorkerSendProverBasePayload & {
    compiledProgramAbi: CompiledCircuit["abi"];
    compressedWitness?: never;
    witnessInput: VantaPrivatePoolV2SendCircuitWitnessInput;
  };

export type VantaPrivatePoolV2BrowserWorkerSendProverPayload =
  | VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload
  | VantaPrivatePoolV2BrowserWorkerSendWitnessInputPayload;

export type VantaPrivatePoolV2BrowserWorkerShieldProverBasePayload = {
  circuit: "vanta_private_pool_v2_shield_entry";
  compiledProgramBytecode: string;
  expectedPublicInputHash?: string;
  proofRuntimeVersion: string;
  target: "shield";
};

export type VantaPrivatePoolV2BrowserWorkerShieldCompressedWitnessPayload =
  VantaPrivatePoolV2BrowserWorkerShieldProverBasePayload & {
    compiledProgramAbi?: never;
    compressedWitness: ArrayBuffer | Uint8Array;
    witnessInput?: never;
  };

export type VantaPrivatePoolV2BrowserWorkerShieldWitnessInputPayload =
  VantaPrivatePoolV2BrowserWorkerShieldProverBasePayload & {
    compiledProgramAbi: CompiledCircuit["abi"];
    compressedWitness?: never;
    witnessInput: VantaPrivatePoolV2ShieldCircuitWitnessInput;
  };

export type VantaPrivatePoolV2BrowserWorkerShieldProverPayload =
  | VantaPrivatePoolV2BrowserWorkerShieldCompressedWitnessPayload
  | VantaPrivatePoolV2BrowserWorkerShieldWitnessInputPayload;

export type VantaPrivatePoolV2BrowserWorkerClaimProverBasePayload = {
  circuit: "vanta_private_pool_v2_claim_entry";
  compiledProgramBytecode: string;
  expectedPublicInputHash?: string;
  proofRuntimeVersion: string;
  target: "claim";
};

export type VantaPrivatePoolV2BrowserWorkerClaimCompressedWitnessPayload =
  VantaPrivatePoolV2BrowserWorkerClaimProverBasePayload & {
    compiledProgramAbi?: never;
    compressedWitness: ArrayBuffer | Uint8Array;
    witnessInput?: never;
  };

export type VantaPrivatePoolV2BrowserWorkerClaimWitnessInputPayload =
  VantaPrivatePoolV2BrowserWorkerClaimProverBasePayload & {
    compiledProgramAbi: CompiledCircuit["abi"];
    compressedWitness?: never;
    witnessInput: VantaPrivatePoolV2ClaimCircuitWitnessInput;
  };

export type VantaPrivatePoolV2BrowserWorkerClaimProverPayload =
  | VantaPrivatePoolV2BrowserWorkerClaimCompressedWitnessPayload
  | VantaPrivatePoolV2BrowserWorkerClaimWitnessInputPayload;

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverBasePayload = {
  circuit: "vanta_private_pool_v2_actual_private_spend_entry";
  compiledProgramBytecode: string;
  expectedPublicInputHash?: string;
  proofRuntimeVersion: string;
  target: "actual-private-spend";
};

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendCompressedWitnessPayload =
  VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverBasePayload & {
    compiledProgramAbi?: never;
    compressedWitness: ArrayBuffer | Uint8Array;
    witnessInput?: never;
  };

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendWitnessInputPayload =
  VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverBasePayload & {
    compiledProgramAbi: CompiledCircuit["abi"];
    compressedWitness?: never;
    witnessInput: VantaPrivatePoolV2ActualPrivateSpendCircuitWitnessInput;
  };

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload =
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendCompressedWitnessPayload
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendWitnessInputPayload;

export type VantaPrivatePoolV2BrowserWorkerProverPayload =
  | VantaPrivatePoolV2BrowserWorkerSendProverPayload
  | VantaPrivatePoolV2BrowserWorkerShieldProverPayload
  | VantaPrivatePoolV2BrowserWorkerClaimProverPayload
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload;

export type VantaPrivatePoolV2BrowserWorkerSendProverMessage = {
  id: string;
  kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE;
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload;
};

export type VantaPrivatePoolV2BrowserWorkerSendProverResponse =
  | {
      artifact: VantaPrivatePoolV2SendProofArtifact;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE;
      ok: true;
    }
  | {
      error: string;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE;
      ok: false;
    };

export type VantaPrivatePoolV2BrowserWorkerShieldProverMessage = {
  id: string;
  kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_MESSAGE;
  payload: VantaPrivatePoolV2BrowserWorkerShieldProverPayload;
};

export type VantaPrivatePoolV2BrowserWorkerShieldProverResponse =
  | {
      artifact: VantaPrivatePoolV2ShieldProofArtifact;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE;
      ok: true;
    }
  | {
      error: string;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SHIELD_RESPONSE;
      ok: false;
    };

export type VantaPrivatePoolV2BrowserWorkerClaimProverMessage = {
  id: string;
  kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_MESSAGE;
  payload: VantaPrivatePoolV2BrowserWorkerClaimProverPayload;
};

export type VantaPrivatePoolV2BrowserWorkerClaimProverResponse =
  | {
      artifact: VantaPrivatePoolV2ClaimProofArtifact;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE;
      ok: true;
    }
  | {
      error: string;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_CLAIM_RESPONSE;
      ok: false;
    };

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverMessage = {
  id: string;
  kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE;
  payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload;
};

export type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverResponse =
  | {
      artifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE;
      ok: true;
    }
  | {
      error: string;
      id: string;
      kind: typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE;
      ok: false;
    };

export type VantaPrivatePoolV2BrowserWorkerProverMessage =
  | VantaPrivatePoolV2BrowserWorkerSendProverMessage
  | VantaPrivatePoolV2BrowserWorkerShieldProverMessage
  | VantaPrivatePoolV2BrowserWorkerClaimProverMessage
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverMessage;

export type VantaPrivatePoolV2BrowserWorkerProverResponse =
  | VantaPrivatePoolV2BrowserWorkerSendProverResponse
  | VantaPrivatePoolV2BrowserWorkerShieldProverResponse
  | VantaPrivatePoolV2BrowserWorkerClaimProverResponse
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverResponse;
