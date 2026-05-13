import {
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
  type VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload,
  type VantaPrivatePoolV2BrowserWorkerSendProverMessage,
  type VantaPrivatePoolV2BrowserWorkerSendProverPayload,
  type VantaPrivatePoolV2BrowserWorkerSendProverResponse,
} from "./privatePoolV2BrowserProverProtocol";
import type { VantaPrivatePoolV2SendProofArtifact } from "./privatePoolV2Types";

export type VantaPrivatePoolV2BrowserProverClientArgs = {
  timeoutMs?: number;
  workerFactory?: () => Worker;
};

export type VantaPrivatePoolV2BrowserProverClient = {
  proveSend(
    payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
  ): Promise<VantaPrivatePoolV2SendProofArtifact>;
};

function createVantaPrivatePoolV2BrowserProverWorker() {
  return new Worker(new URL("./privatePoolV2BrowserProverWorker.ts", import.meta.url), {
    name: "vanta-private-pool-v2-browser-prover",
    type: "module",
  });
}

function messageId() {
  return `vanta-private-pool-v2-browser-prover-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function hasCompressedWitnessPayload(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): payload is VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload {
  return "compressedWitness" in payload && payload.compressedWitness !== undefined;
}

function copyCompressedWitnessForTransfer(value: ArrayBuffer | Uint8Array) {
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

function copyPayloadForTransfer(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): VantaPrivatePoolV2BrowserWorkerSendProverPayload {
  if (!hasCompressedWitnessPayload(payload)) {
    return { ...payload };
  }

  return {
    circuit: payload.circuit,
    compiledProgramBytecode: payload.compiledProgramBytecode,
    compressedWitness: copyCompressedWitnessForTransfer(payload.compressedWitness),
    expectedPublicInputHash: payload.expectedPublicInputHash,
    proofRuntimeVersion: payload.proofRuntimeVersion,
    target: payload.target,
  };
}

function transferListForPayload(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): Transferable[] {
  if (!hasCompressedWitnessPayload(payload)) {
    return [];
  }

  return [
    payload.compressedWitness instanceof Uint8Array
      ? (payload.compressedWitness.buffer as ArrayBuffer)
      : payload.compressedWitness,
  ];
}

export function createVantaPrivatePoolV2BrowserProverClient({
  timeoutMs = 120_000,
  workerFactory = createVantaPrivatePoolV2BrowserProverWorker,
}: VantaPrivatePoolV2BrowserProverClientArgs = {}): VantaPrivatePoolV2BrowserProverClient {
  return {
    proveSend(payload) {
      const worker = workerFactory();
      const requestPayload = copyPayloadForTransfer(payload);
      const id = messageId();
      const request = {
        id,
        kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
        payload: requestPayload,
      } satisfies VantaPrivatePoolV2BrowserWorkerSendProverMessage;

      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error("Private Pool v2 browser worker prover timed out."));
        }, timeoutMs);
        const cleanup = () => {
          window.clearTimeout(timeout);
          worker.terminate();
        };

        worker.onmessage = (
          event: MessageEvent<VantaPrivatePoolV2BrowserWorkerSendProverResponse>,
        ) => {
          const response = event.data;
          if (
            response?.kind !== VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE ||
            response.id !== id
          ) {
            return;
          }

          cleanup();

          if (response.ok) {
            resolve(response.artifact);
            return;
          }

          reject(new Error("error" in response ? response.error : "Private Pool v2 browser worker prover failed."));
        };

        worker.onerror = (event) => {
          cleanup();
          reject(new Error(event.message || "Private Pool v2 browser worker prover failed."));
        };

        try {
          worker.postMessage(request, transferListForPayload(requestPayload));
        } catch (error) {
          cleanup();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
  };
}
