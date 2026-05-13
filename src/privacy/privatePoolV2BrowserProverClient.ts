import {
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
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

function copyPayloadForTransfer(payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload) {
  return {
    ...payload,
    compressedWitness:
      payload.compressedWitness instanceof Uint8Array
        ? new Uint8Array(payload.compressedWitness)
        : new Uint8Array(payload.compressedWitness.slice(0)),
  };
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

          window.clearTimeout(timeout);
          worker.terminate();

          if (response.ok) {
            resolve(response.artifact);
            return;
          }

          reject(new Error("error" in response ? response.error : "Private Pool v2 browser worker prover failed."));
        };

        worker.onerror = (event) => {
          window.clearTimeout(timeout);
          worker.terminate();
          reject(new Error(event.message || "Private Pool v2 browser worker prover failed."));
        };

        worker.postMessage(request, [requestPayload.compressedWitness.buffer]);
      });
    },
  };
}
