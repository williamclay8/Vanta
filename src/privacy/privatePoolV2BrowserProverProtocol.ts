import type { CompiledCircuit } from "@noir-lang/noir_js";

import type { VantaPrivatePoolV2SendCircuitWitnessInput } from "./privatePoolV2SendCircuitFixture";
import type { VantaPrivatePoolV2SendProofArtifact } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVER_SCHEME =
  "vanta-private-pool-v2-browser-worker-prover-0.1" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE =
  "vanta-private-pool-v2-browser-worker-prove-send" as const;
export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE =
  "vanta-private-pool-v2-browser-worker-prove-send-response" as const;

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
