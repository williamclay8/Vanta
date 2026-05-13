import { bytesToHex } from "@noble/hashes/utils.js";

import {
  createVantaPrivatePoolV2BrowserProverClient,
  type VantaPrivatePoolV2BrowserProverClient,
} from "./privatePoolV2BrowserProverClient";
import type {
  VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload,
  VantaPrivatePoolV2BrowserWorkerSendProverPayload,
} from "./privatePoolV2BrowserProverProtocol";
import {
  createVantaPrivatePoolV2LocalBbFixtureProver,
  VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
} from "./privatePoolV2LocalProver";
import type {
  VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  VantaPrivatePoolV2ProofRequest,
  VantaPrivatePoolV2ProofResult,
  VantaPrivatePoolV2Prover,
  VantaPrivatePoolV2Readiness,
  VantaPrivatePoolV2SendProofArtifact,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROOF_RESULT_ADAPTER_SCHEME =
  "vanta-private-pool-v2-browser-worker-proof-result-adapter-0.1" as const;

export type VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget =
  | "actual-private-spend"
  | "send";

type VantaPrivatePoolV2BrowserWorkerProofResultAdapterPayloadByTarget = {
  "actual-private-spend": VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload;
  send: VantaPrivatePoolV2BrowserWorkerSendProverPayload;
};

type VantaPrivatePoolV2BrowserWorkerProofResultAdapterArtifactByTarget = {
  "actual-private-spend": VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
  send: VantaPrivatePoolV2SendProofArtifact;
};

type VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig = {
  circuit: VantaPrivatePoolV2BrowserWorkerProofResultAdapterArtifactByTarget[
    VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget
  ]["circuit"];
  displayName: string;
  publicInputLabel: string;
  target: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget;
};

export type VantaPrivatePoolV2BrowserWorkerProofResultAdapterArgs<
  Target extends VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget =
    VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget,
> = {
  client?: VantaPrivatePoolV2BrowserProverClient;
  enabled?: boolean;
  fixtureProofRequest: VantaPrivatePoolV2ProofRequest;
  payload: VantaPrivatePoolV2BrowserWorkerProofResultAdapterPayloadByTarget[Target];
  target: Target;
};

const TARGET_CONFIGS = {
  "actual-private-spend": {
    circuit: "vanta_private_pool_v2_actual_private_spend_entry",
    displayName: "Actual-private-spend",
    publicInputLabel: "private-spend-public-input-hash",
    target: "actual-private-spend",
  },
  send: {
    circuit: "vanta_private_pool_v2_send_entry",
    displayName: "Send",
    publicInputLabel: "send-public-input-hash",
    target: "send",
  },
} as const satisfies Record<
  VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget,
  VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig
>;

function requestTranscript(request: VantaPrivatePoolV2ProofRequest) {
  return JSON.stringify({
    amountBaseUnits: request.amountBaseUnits.toString(),
    assetId: request.assetId,
    circuitPublicInputs: [...(request.circuitPublicInputs ?? [])],
    intent: request.intent,
    operatorVisibleTerms: [...(request.operatorVisibleTerms ?? [])],
    publicInputs: [...request.publicInputs],
    shadowCommitments: request.shadowCommitments ?? null,
  });
}

function assertSameRequestTranscript({
  config,
  request,
  fixtureProofRequest,
}: {
  config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig;
  fixtureProofRequest: VantaPrivatePoolV2ProofRequest;
  request: VantaPrivatePoolV2ProofRequest;
}) {
  if (requestTranscript(request) !== requestTranscript(fixtureProofRequest)) {
    throw new Error(
      `${config.displayName} browser-worker proof-result adapter request transcript must match bound proof request.`,
    );
  }
}

function readCircuitPublicInput(request: VantaPrivatePoolV2ProofRequest, label: string) {
  const prefix = `${label}:`;
  return request.circuitPublicInputs
    ?.find((input) => input.startsWith(prefix))
    ?.slice(prefix.length);
}

function normalizeFieldString(value: string, label: string) {
  const trimmed = value.trim();
  const parsed = /^0x[0-9a-f]+$/u.test(trimmed)
    ? BigInt(trimmed)
    : /^(0|[1-9][0-9]*)$/u.test(trimmed)
      ? BigInt(trimmed)
      : null;

  if (parsed === null) {
    throw new Error(`${label} must be a BN254 field string.`);
  }

  return parsed.toString(10);
}

function expectedPublicInputHash({
  config,
  request,
}: {
  config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig;
  request: VantaPrivatePoolV2ProofRequest;
}) {
  const value = readCircuitPublicInput(request, config.publicInputLabel);
  if (!value) {
    throw new Error(
      `${config.displayName} browser-worker proof-result adapter requires ${config.publicInputLabel}.`,
    );
  }

  return normalizeFieldString(value, `${config.publicInputLabel} public input`);
}

function assertPayloadMatchesTarget({
  config,
  payload,
}: {
  config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig;
  payload:
    | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload
    | VantaPrivatePoolV2BrowserWorkerSendProverPayload;
}) {
  if (payload.target !== config.target || payload.circuit !== config.circuit) {
    throw new Error(
      `${config.displayName} browser-worker proof-result adapter payload target is unsupported.`,
    );
  }
}

function assertPayloadPublicInputHash({
  config,
  expected,
  payload,
}: {
  config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig;
  expected: string;
  payload:
    | VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload
    | VantaPrivatePoolV2BrowserWorkerSendProverPayload;
}) {
  if (
    payload.expectedPublicInputHash !== undefined &&
    normalizeFieldString(payload.expectedPublicInputHash, "payload expected public input hash") !==
      expected
  ) {
    throw new Error(
      `${config.displayName} browser-worker proof-result adapter expected public input hash mismatch.`,
    );
  }
}

function assertDerivedArtifact({
  artifact,
  config,
}: {
  artifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact | VantaPrivatePoolV2SendProofArtifact;
  config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig;
}) {
  if (artifact.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND) {
    throw new Error(
      `${config.displayName} browser-worker proof-result adapter requires local-bb-derived-artifact evidence.`,
    );
  }
}

function sameProofBytes(left: Uint8Array, right: Uint8Array) {
  return bytesToHex(left) === bytesToHex(right);
}

async function browserWorkerErrorBoundary<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error && error.message.includes("browser-worker proof-result adapter")) {
      throw error;
    }

    throw new Error("Private Pool v2 browser-worker proof-result adapter failed.");
  }
}

export class VantaPrivatePoolV2BrowserWorkerProofResultAdapter<
    Target extends VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget =
      VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget,
  >
  implements VantaPrivatePoolV2Prover
{
  readonly scheme = VANTA_PRIVATE_POOL_V2_BROWSER_WORKER_PROOF_RESULT_ADAPTER_SCHEME;

  #client: VantaPrivatePoolV2BrowserProverClient;
  #enabled: boolean;
  #fixtureProofRequest: VantaPrivatePoolV2ProofRequest;
  #payload: VantaPrivatePoolV2BrowserWorkerProofResultAdapterPayloadByTarget[Target];
  #target: Target;

  constructor({
    client = createVantaPrivatePoolV2BrowserProverClient(),
    enabled = true,
    fixtureProofRequest,
    payload,
    target,
  }: VantaPrivatePoolV2BrowserWorkerProofResultAdapterArgs<Target>) {
    this.#client = client;
    this.#enabled = enabled;
    this.#fixtureProofRequest = fixtureProofRequest;
    this.#payload = payload;
    this.#target = target;
  }

  async prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult> {
    const readiness = this.readiness();
    if (!readiness.ready) {
      throw new Error(readiness.blockers.join(" "));
    }

    const config = (
      TARGET_CONFIGS as Partial<
        Record<string, VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig>
      >
    )[this.#target];
    if (!config) {
      throw new Error("Private Pool v2 browser-worker proof-result adapter unsupported target.");
    }

    assertPayloadMatchesTarget({ config, payload: this.#payload });
    assertSameRequestTranscript({
      config,
      fixtureProofRequest: this.#fixtureProofRequest,
      request,
    });

    const expected = expectedPublicInputHash({ config, request });
    assertPayloadPublicInputHash({
      config,
      expected,
      payload: this.#payload,
    });

    const artifact = await browserWorkerErrorBoundary(() => this.#proveWithClient(config, expected));
    assertDerivedArtifact({ artifact, config });

    return createVantaPrivatePoolV2LocalBbFixtureProver({
      fixtureProofRequest: this.#fixtureProofRequest,
      proofArtifact: artifact,
      target: config.target,
    }).prove(request);
  }

  readiness(): VantaPrivatePoolV2Readiness {
    if (!this.#enabled) {
      return {
        blockers: ["Private Pool v2 browser-worker proof-result adapter is disabled."],
        ready: false,
        warnings: [],
      };
    }

    return {
      blockers: [],
      ready: true,
      warnings: [
        "Private Pool v2 browser-worker proof-result adapter is dev-only browser/Web Worker proof execution and local no-real-funds evidence. The default local prover remains mock / local-mock; this is not live Send routing, not routed live actual-private-spend execution, not a production browser runtime prover, not a production remote proof service, not on-chain proof verification, not production verifying-key evidence, not audit acceptance, not live deployment evidence, and not real-funds readiness.",
      ],
    };
  }

  async verify({
    proof,
    request,
  }: {
    proof: VantaPrivatePoolV2ProofResult;
    request: VantaPrivatePoolV2ProofRequest;
  }) {
    const expected = await this.prove(request);
    return (
      proof.proofBackend === expected.proofBackend &&
      proof.proofSystem === expected.proofSystem &&
      proof.publicInputCommitment === expected.publicInputCommitment &&
      proof.verifyingKeyId === expected.verifyingKeyId &&
      sameProofBytes(proof.proofBytes, expected.proofBytes)
    );
  }

  #proveWithClient(
    config: VantaPrivatePoolV2BrowserWorkerProofResultAdapterTargetConfig,
    expectedPublicInputHashValue: string,
  ): Promise<VantaPrivatePoolV2ActualPrivateSpendProofArtifact | VantaPrivatePoolV2SendProofArtifact> {
    if (config.target === "actual-private-spend") {
      return this.#client.proveActualPrivateSpend({
        ...this.#payload,
        expectedPublicInputHash: expectedPublicInputHashValue,
      } as VantaPrivatePoolV2BrowserWorkerActualPrivateSpendProverPayload);
    }

    if (config.target === "send") {
      return this.#client.proveSend({
        ...this.#payload,
        expectedPublicInputHash: expectedPublicInputHashValue,
      } as VantaPrivatePoolV2BrowserWorkerSendProverPayload);
    }

    throw new Error("Private Pool v2 browser-worker proof-result adapter unsupported target.");
  }
}

export function createVantaPrivatePoolV2BrowserWorkerProofResultAdapter<
  Target extends VantaPrivatePoolV2BrowserWorkerProofResultAdapterTarget,
>(args: VantaPrivatePoolV2BrowserWorkerProofResultAdapterArgs<Target>) {
  return new VantaPrivatePoolV2BrowserWorkerProofResultAdapter(args);
}
