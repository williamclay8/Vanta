import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import {
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE,
  VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
  type VantaPrivatePoolV2BrowserWorkerSendProverMessage,
  type VantaPrivatePoolV2BrowserWorkerSendProverPayload,
  type VantaPrivatePoolV2BrowserWorkerSendProverResponse,
} from "./privatePoolV2BrowserProverProtocol";
import type { VantaPrivatePoolV2SendProofArtifact } from "./privatePoolV2Types";

const SEND_CIRCUIT = "vanta_private_pool_v2_send_entry" as const;
const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256HexUtf8(value: string) {
  const subtle = globalThis.crypto?.subtle;
  assert(subtle, "Browser worker prover requires Web Crypto SHA-256.");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function proofArtifactPublicInputCommitment(publicInputs: readonly string[]) {
  return `sha256:${await sha256HexUtf8(JSON.stringify(publicInputs))}`;
}

function normalizeFieldString(value: string, label: string) {
  const input = value.trim();
  const parsed = /^0x[0-9a-f]+$/u.test(input)
    ? BigInt(input)
    : /^(0|[1-9][0-9]*)$/u.test(input)
      ? BigInt(input)
      : null;

  assert(parsed !== null, `${label} must be a BN254 field string.`);
  assert(parsed < BN254_SCALAR_FIELD, `${label} must fit in BN254.`);
  return parsed.toString(10);
}

function compressedWitnessBytes(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
  assert(bytes.byteLength > 0, "Browser worker prover requires non-empty compressed proof input bytes.");
  return bytes;
}

function assertSendPayload(payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload) {
  assert(payload.target === "send", "Browser worker prover only supports Send.");
  assert(payload.circuit === SEND_CIRCUIT, "Browser worker prover requires the Send circuit.");
  assert(
    typeof payload.compiledProgramBytecode === "string" &&
      payload.compiledProgramBytecode.length > 0,
    "Browser worker prover requires compiled ACIR bytecode.",
  );
  assert(
    typeof payload.proofRuntimeVersion === "string" && payload.proofRuntimeVersion.length > 0,
    "Browser worker prover requires the bb.js runtime version.",
  );
  if (payload.expectedPublicInputHash !== undefined) {
    normalizeFieldString(payload.expectedPublicInputHash, "expected Send public input hash");
  }
}

async function proveVantaPrivatePoolV2SendInBrowserWorkerImpl(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): Promise<VantaPrivatePoolV2SendProofArtifact> {
  assertSendPayload(payload);
  const compressedWitness = compressedWitnessBytes(payload.compressedWitness);
  const api = await Barretenberg.new({ threads: 1 });

  try {
    const backend = new UltraHonkBackend(payload.compiledProgramBytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);
    assert(verified, "Browser worker prover generated a proof that did not verify.");

    const publicInputs = proofData.publicInputs.map((input) => String(input));
    assert(publicInputs.length === 1, "Browser worker Send proof must expose one public input.");
    const publicInput = normalizeFieldString(publicInputs[0]!, "browser worker Send public input");
    if (payload.expectedPublicInputHash !== undefined) {
      assert(
        publicInput === normalizeFieldString(payload.expectedPublicInputHash, "expected Send public input hash"),
        "Browser worker Send proof public input does not match the expected Send public-input hash.",
      );
    }

    const acirBytecodeHash = `sha256:${await sha256HexUtf8(payload.compiledProgramBytecode)}`;
    const proofHex = bytesToHex(new Uint8Array(proofData.proof));

    return {
      acirBytecodeHash,
      backend: "barretenberg-ultrahonk",
      circuit: SEND_CIRCUIT,
      proofBackend: "local-bb-derived-artifact",
      proofHex,
      proofRuntimePackage: "@aztec/bb.js",
      proofRuntimeVersion: payload.proofRuntimeVersion,
      proofSystem: "noir-bb",
      publicInputCommitment: await proofArtifactPublicInputCommitment(publicInputs),
      publicInputLabels: ["send-public-input-hash"],
      publicInputs,
      verifyingKeyHash: acirBytecodeHash,
      verifyingKeyHashKind: "local-acir-bytecode-hash-not-production-vk",
      verifyingKeyId: `local-acir-bytecode:${SEND_CIRCUIT}:${acirBytecodeHash}`,
    };
  } finally {
    await api.destroy();
  }
}

export function proveVantaPrivatePoolV2SendInBrowserWorker(
  payload: VantaPrivatePoolV2BrowserWorkerSendProverPayload,
): Promise<VantaPrivatePoolV2SendProofArtifact> {
  return proveVantaPrivatePoolV2SendInBrowserWorkerImpl(payload);
}

type WorkerLikeGlobal = typeof globalThis & {
  addEventListener?: (
    type: "message",
    listener: (event: MessageEvent<VantaPrivatePoolV2BrowserWorkerSendProverMessage>) => void,
  ) => void;
  document?: unknown;
  postMessage?: (message: VantaPrivatePoolV2BrowserWorkerSendProverResponse) => void;
};

const workerGlobal = globalThis as WorkerLikeGlobal;
const isWorkerScope =
  workerGlobal.document === undefined &&
  typeof workerGlobal.addEventListener === "function" &&
  typeof workerGlobal.postMessage === "function";

if (isWorkerScope) {
  workerGlobal.addEventListener!("message", (event) => {
    const message = event.data;
    if (message?.kind !== VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_MESSAGE) {
      return;
    }

    void proveVantaPrivatePoolV2SendInBrowserWorker(message.payload)
      .then((artifact) => {
        workerGlobal.postMessage!({
          artifact,
          id: message.id,
          kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
          ok: true,
        });
      })
      .catch((error: unknown) => {
        workerGlobal.postMessage!({
          error: error instanceof Error ? error.message : String(error),
          id: message.id,
          kind: VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROVE_SEND_RESPONSE,
          ok: false,
        });
      });
  });
}
