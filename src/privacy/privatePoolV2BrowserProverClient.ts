import {
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
  type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendCompressedWitnessPayload,
  type VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
  type VantaPrivatePoolV2BrowserWorkerProverMessage,
  type VantaPrivatePoolV2BrowserWorkerProverPayload,
  type VantaPrivatePoolV2BrowserWorkerProverResponse,
  type VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload,
  type VantaPrivatePoolV2BrowserWorkerSendProverPayload,
} from "./privatePoolV2BrowserProverProtocol";
import type {
  VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  VantaPrivatePoolV2SendProofArtifact,
} from "./privatePoolV2Types";

export type VantaPrivatePoolV2BrowserProverClientArgs = {
  timeoutMs?: number;
  workerFactory?: () => Worker;
};

export type VantaPrivatePoolV2BrowserProverClient = {
  proveActualPrivateSpend(
    payload: VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
  ): Promise<VantaPrivatePoolV2ActualPrivateSpendProofArtifact>;
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
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload,
): payload is
  | VantaPrivatePoolV2BrowserWorkerSendCompressedWitnessPayload
  | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendCompressedWitnessPayload {
  return "compressedWitness" in payload && payload.compressedWitness !== undefined;
}

function copyCompressedWitnessForTransfer(value: ArrayBuffer | Uint8Array) {
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

function copyPayloadForTransfer<T extends VantaPrivatePoolV2BrowserWorkerProverPayload>(
  payload: T,
): T {
  if (!hasCompressedWitnessPayload(payload)) {
    return { ...payload };
  }

  return {
    ...payload,
    compressedWitness: copyCompressedWitnessForTransfer(payload.compressedWitness),
  } as T;
}

function transferListForPayload(
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload,
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

function postWorkerProverRequest({
  payload,
  requestKind,
  responseKind,
  timeoutMs,
  workerFactory,
}: {
  payload: VantaPrivatePoolV2BrowserWorkerProverPayload;
  requestKind:
    | typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE
    | typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE;
  responseKind:
    | typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE
    | typeof VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE;
  timeoutMs: number;
  workerFactory: () => Worker;
}): Promise<
  VantaPrivatePoolV2SendProofArtifact | VantaPrivatePoolV2ActualPrivateSpendProofArtifact
> {
  const worker = workerFactory();
  const requestPayload = copyPayloadForTransfer(payload);
  const id = messageId();
  const request = {
    id,
    kind: requestKind,
    payload: requestPayload,
  } as VantaPrivatePoolV2BrowserWorkerProverMessage;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Private Pool v2 browser worker prover timed out."));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<VantaPrivatePoolV2BrowserWorkerProverResponse>) => {
      const response = event.data;
      if (response?.kind !== responseKind || response.id !== id) {
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
}

export function createVantaPrivatePoolV2BrowserProverClient({
  timeoutMs = 120_000,
  workerFactory = createVantaPrivatePoolV2BrowserProverWorker,
}: VantaPrivatePoolV2BrowserProverClientArgs = {}): VantaPrivatePoolV2BrowserProverClient {
  return {
    proveActualPrivateSpend(payload) {
      return postWorkerProverRequest({
        payload,
        requestKind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_MESSAGE,
        responseKind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_ACTUAL_PRIVATE_SPEND_RESPONSE,
        timeoutMs,
        workerFactory,
      }) as Promise<VantaPrivatePoolV2ActualPrivateSpendProofArtifact>;
    },
    proveSend(payload) {
      return postWorkerProverRequest({
        payload,
        requestKind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
        responseKind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
        timeoutMs,
        workerFactory,
      }) as Promise<VantaPrivatePoolV2SendProofArtifact>;
    },
  };
}
