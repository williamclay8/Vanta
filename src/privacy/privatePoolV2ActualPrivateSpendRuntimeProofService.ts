import { bytesToHex } from "@noble/hashes/utils.js";

import {
  createVantaPrivatePoolV2LocalBbFixtureProver,
  VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
} from "./privatePoolV2LocalProver";
import {
  VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
  VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
} from "./privatePoolV2ProofRequests";
import type {
  VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  VantaPrivatePoolV2ProofArtifactVerificationReceipt,
  VantaPrivatePoolV2ProofRequest,
  VantaPrivatePoolV2ProofResult,
  VantaPrivatePoolV2Prover,
  VantaPrivatePoolV2Readiness,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_RUNTIME_PROOF_SERVICE_SCHEME =
  "vanta-private-pool-v2-actual-private-spend-runtime-proof-service-0.1" as const;

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactProducerArgs = {
  expectedPublicInputHash: string;
  request: VantaPrivatePoolV2ProofRequest;
};

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactBundle = {
  proofArtifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
  proofRequest: VantaPrivatePoolV2ProofRequest;
};

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactProducer = (
  args: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactProducerArgs,
) =>
  | Promise<VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactBundle>
  | VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactBundle;

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactVerifierArgs = {
  expectedPublicInputHash: string;
  proofArtifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
  request: VantaPrivatePoolV2ProofRequest;
};

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactVerifier = (
  args: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactVerifierArgs,
) =>
  | Promise<VantaPrivatePoolV2ProofArtifactVerificationReceipt>
  | VantaPrivatePoolV2ProofArtifactVerificationReceipt;

export type VantaPrivatePoolV2ActualPrivateSpendRuntimeProofServiceArgs = {
  artifactProducer: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactProducer;
  artifactVerifier: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactVerifier;
  enabled?: boolean;
};

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const ACTUAL_PRIVATE_SPEND_CIRCUIT = "vanta_private_pool_v2_actual_private_spend_entry";
const ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL = "private-spend-public-input-hash";
const ACTUAL_PRIVATE_SPEND_REQUEST_VERSION_PREFIX =
  "vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version";

const ACTUAL_PRIVATE_SPEND_REQUIRED_PUBLIC_INPUT_LABELS = [
  "pool-id",
  "asset-cohort",
  "accepted-root",
  "nullifier",
  "output-commitment-0",
  "output-commitment-1",
  "context-hash",
  ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL,
] as const;

const FORBIDDEN_NO_WITNESS_NORMALIZED_KEYS = new Set([
  "bytecodesource",
  "notesecret",
  "privateinput",
  "privateinputs",
  "privatewitness",
  "provertoml",
  "secret",
  "secrets",
  "sourceartifact",
  "sourceartifacts",
  "sourcepublicinput",
  "sourcepublicinputs",
  "witness",
  "witnesspackage",
  "witnesssource",
]);

const FORBIDDEN_NO_WITNESS_NORMALIZED_FRAGMENTS = [
  "notesecret",
  "privateinput",
  "privatewitness",
  "sourceartifact",
  "sourcepublicinput",
  "witness",
] as const;

const FORBIDDEN_NO_WITNESS_STRING_FRAGMENTS = [
  "Prover.toml",
  "privateInputs",
  "private_inputs",
  "privateWitness",
  "noteSecret",
  "secret",
  "sourcePublicInputs",
  "sourceArtifacts",
  "witness",
  "witnessPackage",
  "vanta_private_pool_v2_actual_private_spend_entry.gz",
] as const;

function normalizeNoWitnessKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

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
  proofRequest,
  request,
}: {
  proofRequest: VantaPrivatePoolV2ProofRequest;
  request: VantaPrivatePoolV2ProofRequest;
}) {
  if (requestTranscript(request) !== requestTranscript(proofRequest)) {
    throw new Error(
      "Actual-private-spend runtime proof service producer proof request must match the requested transcript.",
    );
  }
}

function assertNoWitnessMaterial(
  value: unknown,
  artifactLabel = "Actual-private-spend runtime proof artifact",
) {
  function visit(node: unknown, path: readonly string[] = []) {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === "string") {
      const normalizedValue = normalizeNoWitnessKey(node);
      for (const fragment of FORBIDDEN_NO_WITNESS_STRING_FRAGMENTS) {
        if (
          node.includes(fragment) ||
          normalizedValue.includes(normalizeNoWitnessKey(fragment))
        ) {
          throw new Error(`${artifactLabel} exposes forbidden no-witness value ${fragment}.`);
        }
      }
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]));
      return;
    }

    for (const [key, entry] of Object.entries(node)) {
      const normalizedKey = normalizeNoWitnessKey(key);
      if (
        FORBIDDEN_NO_WITNESS_NORMALIZED_KEYS.has(normalizedKey) ||
        FORBIDDEN_NO_WITNESS_NORMALIZED_FRAGMENTS.some((fragment) =>
          normalizedKey.includes(fragment),
        )
      ) {
        throw new Error(
          `${artifactLabel} exposes forbidden no-witness field ${[...path, key].join(".")}.`,
        );
      }
      visit(entry, [...path, key]);
    }
  }

  visit(value);
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

  if (parsed >= BN254_SCALAR_FIELD) {
    throw new Error(`${label} must fit in BN254.`);
  }

  return parsed.toString(10);
}

function readLabeledPublicInput(request: VantaPrivatePoolV2ProofRequest, label: string) {
  const prefix = `${label}:`;
  const matches = request.publicInputs.filter((input) => input.startsWith(prefix));
  if (matches.length !== 1) {
    throw new Error(`Actual-private-spend runtime proof service requires one ${label} public input.`);
  }

  return normalizeFieldString(matches[0]!.slice(prefix.length), `${label} public input`);
}

function expectedCircuitPublicInput(request: VantaPrivatePoolV2ProofRequest) {
  const prefix = `${ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL}:`;
  const matches = request.circuitPublicInputs?.filter((input) => input.startsWith(prefix)) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `Actual-private-spend runtime proof service requires request.circuitPublicInputs.${ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL}.`,
    );
  }

  return normalizeFieldString(
    matches[0]!.slice(prefix.length),
    `${ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL} circuit public input`,
  );
}

function assertActualPrivateSpendRequest(request: VantaPrivatePoolV2ProofRequest) {
  if (request.intent !== "private-send") {
    throw new Error("Actual-private-spend runtime proof service only supports private-send proof requests.");
  }

  if (
    request.publicInputs.filter((input) =>
      input.startsWith(ACTUAL_PRIVATE_SPEND_REQUEST_VERSION_PREFIX),
    ).length !== 1
  ) {
    throw new Error("Actual-private-spend runtime proof service requires an actual-private-spend proof request version.");
  }

  if (request.amountBaseUnits <= 0n) {
    throw new Error("Actual-private-spend runtime proof service requires a positive amount.");
  }

  if (request.amountBaseUnits !== VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS) {
    throw new Error(
      "Actual-private-spend runtime proof service requires the hidden-economics amount sentinel.",
    );
  }

  if (request.assetId !== VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID) {
    throw new Error(
      "Actual-private-spend runtime proof service requires the hidden-economics asset sentinel.",
    );
  }

  for (const label of ACTUAL_PRIVATE_SPEND_REQUIRED_PUBLIC_INPUT_LABELS) {
    readLabeledPublicInput(request, label);
  }

  const circuitPublicInput = expectedCircuitPublicInput(request);
  const transcriptPublicInput = readLabeledPublicInput(
    request,
    ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL,
  );
  if (circuitPublicInput !== transcriptPublicInput) {
    throw new Error(
      "Actual-private-spend runtime proof service requires matching transcript and circuit public inputs.",
    );
  }

  const outputCommitments = [
    readLabeledPublicInput(request, "output-commitment-0"),
    readLabeledPublicInput(request, "output-commitment-1"),
  ];
  if (new Set(outputCommitments).size !== outputCommitments.length) {
    throw new Error("Actual-private-spend runtime proof service requires unique output commitments.");
  }

  return circuitPublicInput;
}

function assertActualPrivateSpendRuntimeArtifact({
  artifact,
  expectedPublicInputHash,
}: {
  artifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
  expectedPublicInputHash: string;
}) {
  assertNoWitnessMaterial(artifact);

  if (artifact.circuit !== ACTUAL_PRIVATE_SPEND_CIRCUIT) {
    throw new Error("Actual-private-spend runtime proof service requires the actual-private-spend circuit artifact.");
  }

  if (artifact.proofBackend !== VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND) {
    throw new Error("Actual-private-spend runtime proof service requires local-bb-derived-artifact evidence.");
  }

  if (artifact.proofSystem !== "noir-bb" || artifact.backend !== "barretenberg-ultrahonk") {
    throw new Error("Actual-private-spend runtime proof service requires noir-bb barretenberg-ultrahonk evidence.");
  }

  if (
    artifact.publicInputs.length !== 1 ||
    normalizeFieldString(artifact.publicInputs[0]!, "artifact public input") !==
      expectedPublicInputHash
  ) {
    throw new Error("Actual-private-spend runtime proof service artifact public input must match the proof request.");
  }

  if (
    JSON.stringify(artifact.publicInputLabels) !==
    JSON.stringify([ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL])
  ) {
    throw new Error(
      `Actual-private-spend runtime proof service requires ${ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL} artifact evidence.`,
    );
  }

  if (artifact.verifyingKeyHashKind !== "local-acir-bytecode-hash-not-production-vk") {
    throw new Error("Actual-private-spend runtime proof service must remain local verifying-key evidence.");
  }
}

function assertActualPrivateSpendVerificationReceipt({
  artifact,
  expectedPublicInputHash,
  receipt,
}: {
  artifact: VantaPrivatePoolV2ActualPrivateSpendProofArtifact;
  expectedPublicInputHash: string;
  receipt: VantaPrivatePoolV2ProofArtifactVerificationReceipt;
}) {
  if (receipt.verified !== true) {
    throw new Error("Actual-private-spend runtime proof service requires verified proof bytes.");
  }

  if (
    receipt.circuit !== artifact.circuit ||
    receipt.backend !== artifact.backend ||
    receipt.proofBackend !== artifact.proofBackend ||
    receipt.proofSystem !== artifact.proofSystem ||
    receipt.proofHex !== artifact.proofHex ||
    receipt.publicInputCommitment !== artifact.publicInputCommitment ||
    JSON.stringify(receipt.publicInputLabels) !== JSON.stringify(artifact.publicInputLabels) ||
    JSON.stringify(receipt.publicInputs) !== JSON.stringify(artifact.publicInputs) ||
    receipt.acirBytecodeHash !== artifact.acirBytecodeHash ||
    receipt.verifyingKeyHash !== artifact.verifyingKeyHash ||
    receipt.verifyingKeyHashKind !== artifact.verifyingKeyHashKind ||
    receipt.verifyingKeyId !== artifact.verifyingKeyId
  ) {
    throw new Error(
      "Actual-private-spend runtime proof service verification receipt must match the proof artifact.",
    );
  }

  const verifiedPublicInput =
    receipt.verifiedPublicInputs[ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL] ??
    receipt.verifiedPublicInputs.privateSpendPublicInputHash;
  if (
    verifiedPublicInput === undefined ||
    normalizeFieldString(
      verifiedPublicInput,
      `${ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_LABEL} verified public input`,
    ) !== expectedPublicInputHash
  ) {
    throw new Error(
      "Actual-private-spend runtime proof service verification receipt must bind the requested public input.",
    );
  }
}

function sameProofBytes(left: Uint8Array, right: Uint8Array) {
  return bytesToHex(left) === bytesToHex(right);
}

export class VantaPrivatePoolV2ActualPrivateSpendRuntimeProofService
  implements VantaPrivatePoolV2Prover
{
  readonly scheme = VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_RUNTIME_PROOF_SERVICE_SCHEME;

  #artifactProducer: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactProducer;
  #artifactVerifier: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofArtifactVerifier;
  #enabled: boolean;

  constructor({
    artifactProducer,
    artifactVerifier,
    enabled = true,
  }: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofServiceArgs) {
    this.#artifactProducer = artifactProducer;
    this.#artifactVerifier = artifactVerifier;
    this.#enabled = enabled;
  }

  async prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult> {
    const readiness = this.readiness();
    if (!readiness.ready) {
      throw new Error(readiness.blockers.join(" "));
    }

    const expectedPublicInputHash = assertActualPrivateSpendRequest(request);
    const proofBundle = await this.#artifactProducer({
      expectedPublicInputHash,
      request,
    });
    const producerPublicInputHash = assertActualPrivateSpendRequest(proofBundle.proofRequest);
    if (producerPublicInputHash !== expectedPublicInputHash) {
      throw new Error(
        "Actual-private-spend runtime proof service producer proof request public input mismatch.",
      );
    }
    assertSameRequestTranscript({
      proofRequest: proofBundle.proofRequest,
      request,
    });

    assertActualPrivateSpendRuntimeArtifact({
      artifact: proofBundle.proofArtifact,
      expectedPublicInputHash,
    });

    const verificationReceipt = await this.#artifactVerifier({
      expectedPublicInputHash,
      proofArtifact: proofBundle.proofArtifact,
      request,
    });
    assertActualPrivateSpendVerificationReceipt({
      artifact: proofBundle.proofArtifact,
      expectedPublicInputHash,
      receipt: verificationReceipt,
    });

    return createVantaPrivatePoolV2LocalBbFixtureProver({
      fixtureProofRequest: proofBundle.proofRequest,
      proofArtifact: proofBundle.proofArtifact,
      target: "actual-private-spend",
    }).prove(request);
  }

  readiness(): VantaPrivatePoolV2Readiness {
    if (!this.#enabled) {
      return {
        blockers: ["Actual-private-spend runtime proof service is disabled."],
        ready: false,
        warnings: [],
      };
    }

    return {
      blockers: [],
      ready: true,
      warnings: [
        "Actual-private-spend runtime proof service accepts only local-bb-derived-artifact evidence from a runtime artifact producer. It is local/dev proof execution, not production verifier evidence, not on-chain proof verification, not audit acceptance, not live deployment evidence, and not real-funds readiness.",
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
}

export function createVantaPrivatePoolV2ActualPrivateSpendRuntimeProofService(
  args: VantaPrivatePoolV2ActualPrivateSpendRuntimeProofServiceArgs,
) {
  return new VantaPrivatePoolV2ActualPrivateSpendRuntimeProofService(args);
}
