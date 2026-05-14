import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import {
  VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION,
  type VantaPrivatePoolV2ActualPrivateSpendProofArtifact,
  type VantaPrivatePoolV2ClaimProofArtifact,
  type VantaPrivatePoolV2ProofBackend,
  type VantaPrivatePoolV2ProofRequest,
  type VantaPrivatePoolV2ProofResult,
  type VantaPrivatePoolV2Prover,
  type VantaPrivatePoolV2Readiness,
  type VantaPrivatePoolV2SendProofArtifact,
  type VantaPrivatePoolV2ShieldProofArtifact,
  type VantaPrivatePoolV2SwapToShieldedProofArtifact,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME =
  "sha256-private-pool-v2-local-prover-0.1" as const;
export const VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND =
  "local-mock" satisfies VantaPrivatePoolV2ProofBackend;
export const VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND =
  "local-bb-fixture-artifact" satisfies VantaPrivatePoolV2ProofBackend;
export const VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND =
  "local-bb-derived-artifact" satisfies VantaPrivatePoolV2ProofBackend;

export type VantaPrivatePoolV2LocalProverArgs = {
  enabled?: boolean;
  provingKeyId?: string;
};

type VantaPrivatePoolV2LocalBbFixtureProofArtifact =
  | VantaPrivatePoolV2ActualPrivateSpendProofArtifact
  | VantaPrivatePoolV2ClaimProofArtifact
  | VantaPrivatePoolV2SendProofArtifact
  | VantaPrivatePoolV2ShieldProofArtifact
  | VantaPrivatePoolV2SwapToShieldedProofArtifact;

type VantaPrivatePoolV2LocalBbFixtureTarget =
  | "actual-private-spend"
  | "claim"
  | "send"
  | "shield"
  | "swap-to-shielded";

export type VantaPrivatePoolV2LocalBbFixtureProverArgs = {
  enabled?: boolean;
  fixtureProofRequest: VantaPrivatePoolV2ProofRequest;
  proofArtifact: VantaPrivatePoolV2LocalBbFixtureProofArtifact;
  target: VantaPrivatePoolV2LocalBbFixtureTarget;
};

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function hashParts(...parts: readonly string[]) {
  return `0x${bytesToHex(
    sha256(new TextEncoder().encode(parts.join("\u001f"))),
  )}`;
}

function serializeProofRequest(request: VantaPrivatePoolV2ProofRequest) {
  const circuitPublicInputs = request.circuitPublicInputs ?? request.publicInputs;

  return JSON.stringify({
    amountBaseUnits: request.amountBaseUnits.toString(),
    assetId: request.assetId,
    circuitPublicInputs: [...circuitPublicInputs],
    intent: request.intent,
    publicInputs: [...request.publicInputs],
  });
}

function readCircuitPublicInput(request: VantaPrivatePoolV2ProofRequest, label: string) {
  const prefix = `${label}:`;
  return request.circuitPublicInputs
    ?.find((input) => input.startsWith(prefix))
    ?.slice(prefix.length);
}

function requiredPublicInputValue(
  request: VantaPrivatePoolV2ProofRequest,
  label: string,
) {
  const prefix = `${label}:`;
  const matches = request.publicInputs.filter((input) => input.startsWith(prefix));
  if (matches.length !== 1) {
    throw new Error(`Actual-private-spend fixture prover requires one ${label} public input.`);
  }

  return matches[0]!.slice(prefix.length);
}

function normalizeFieldString(value: string, label: string) {
  const trimmed = value.trim();
  const parsed = /^0x[0-9a-f]+$/u.test(trimmed)
    ? BigInt(trimmed)
    : /^(0|[1-9][0-9]*)$/u.test(trimmed)
      ? BigInt(trimmed)
      : null;

  if (parsed === null) {
    throw new Error(`Actual-private-spend fixture prover requires ${label} to be a BN254 field string.`);
  }

  if (parsed >= BN254_SCALAR_FIELD) {
    throw new Error(`Actual-private-spend fixture prover requires ${label} to fit in BN254.`);
  }

  return parsed.toString(10);
}

function proofArtifactPublicInputCommitment(publicInputs: readonly string[]) {
  return `sha256:${bytesToHex(
    sha256(new TextEncoder().encode(JSON.stringify(publicInputs))),
  )}`;
}

function sameArray(left: readonly string[] | undefined, right: readonly string[] | undefined) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sameShadowCommitments(
  left: VantaPrivatePoolV2ProofRequest["shadowCommitments"],
  right: VantaPrivatePoolV2ProofRequest["shadowCommitments"],
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

type VantaPrivatePoolV2LocalBbFixtureTargetConfig = {
  allowedProofBackends: readonly VantaPrivatePoolV2ProofBackend[];
  circuit: VantaPrivatePoolV2LocalBbFixtureProofArtifact["circuit"];
  displayName: string;
  intent: VantaPrivatePoolV2ProofRequest["intent"];
  publicInputLabel: string;
  requiredPublicInputLabels: readonly string[];
  target: VantaPrivatePoolV2LocalBbFixtureTarget;
  versionPrefix: string;
};

const LOCAL_BB_FIXTURE_TARGET_CONFIGS = {
  "actual-private-spend": {
    allowedProofBackends: [
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND,
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
    ],
    circuit: "vanta_private_pool_v2_actual_private_spend_entry",
    displayName: "Actual-private-spend",
    intent: "private-send",
    publicInputLabel: "private-spend-public-input-hash",
    requiredPublicInputLabels: [
      "pool-id",
      "asset-cohort",
      "accepted-root",
      "nullifier",
      "output-commitment-0",
      "output-commitment-1",
      "context-hash",
      "private-spend-public-input-hash",
    ],
    target: "actual-private-spend",
    versionPrefix: "vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version",
  },
  claim: {
    allowedProofBackends: [VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND],
    circuit: "vanta_private_pool_v2_claim_entry",
    displayName: "Claim",
    intent: "claim",
    publicInputLabel: "claim-public-input-hash",
    requiredPublicInputLabels: [
      "asset",
      "amount",
      "owner-commitment",
      "tree-id",
      "leaf-index",
      "input-commitment",
      "input-root",
      "nullifier",
      "destination",
      "relayer",
      "relayer-fee",
      "quote-expires-at-slot",
    ],
    target: "claim",
    versionPrefix: "vanta-private-pool-v2-claim-proof-request-0.1:version",
  },
  send: {
    allowedProofBackends: [
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND,
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
    ],
    circuit: "vanta_private_pool_v2_send_entry",
    displayName: "Send",
    intent: "private-send",
    publicInputLabel: "send-public-input-hash",
    requiredPublicInputLabels: [
      "input-root",
      "input-commitment",
      "nullifier",
      "recipient-output-commitment",
      "recipient-leaf-index",
      "recipient-output-root",
      "change-output-commitment",
      "change-leaf-index",
      "change-output-root",
      "recipient-memo-ciphertext-body-hash-field",
      "change-memo-ciphertext-body-hash-field",
      "asset-id-commitment",
      "economics-commitment",
      "owner-commitment",
      "send-context-tag",
    ],
    target: "send",
    versionPrefix: "vanta-private-pool-v2-send-proof-request-0.1:version",
  },
  shield: {
    allowedProofBackends: [
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND,
      VANTA_PRIVATE_POOL_V2_LOCAL_BB_DERIVED_PROOF_BACKEND,
    ],
    circuit: "vanta_private_pool_v2_shield_entry",
    displayName: "Shield",
    intent: "shield",
    publicInputLabel: "shield-public-input-hash",
    requiredPublicInputLabels: [
      "economics-commitment",
      "owner-commitment",
      "route-commitment",
      "tree-id",
      "leaf-index",
      "output-commitment",
      "previous-root",
      "output-root",
    ],
    target: "shield",
    versionPrefix: "vanta-private-pool-v2-shield-proof-request-0.1:version",
  },
  "swap-to-shielded": {
    allowedProofBackends: [VANTA_PRIVATE_POOL_V2_LOCAL_BB_FIXTURE_PROOF_BACKEND],
    circuit: "vanta_private_pool_v2_swap_to_shielded_entry",
    displayName: "Swap-to-shielded",
    intent: "swap-to-shielded",
    publicInputLabel: "swap-public-input-hash",
    requiredPublicInputLabels: [
      "input-root",
      "input-commitment",
      "nullifier-or-replay-commitment",
      "settlement-commitment",
      "route-commitment",
      "economics-commitment",
      "output-commitment",
      "output-leaf-index",
      "output-root",
      "owner-commitment",
      "swap-context-tag",
    ],
    target: "swap-to-shielded",
    versionPrefix: "vanta-private-pool-v2-swap-to-shielded-proof-request-0.1:version",
  },
} as const satisfies Record<
  VantaPrivatePoolV2LocalBbFixtureTarget,
  VantaPrivatePoolV2LocalBbFixtureTargetConfig
>;

function assertLocalBbProofArtifact(
  artifact: VantaPrivatePoolV2LocalBbFixtureProofArtifact,
  config: VantaPrivatePoolV2LocalBbFixtureTargetConfig,
) {
  if (artifact.circuit !== config.circuit) {
    const artifactName =
      config.target === "actual-private-spend" ? config.target : config.displayName;
    throw new Error(`${config.displayName} fixture prover requires a ${artifactName} artifact.`);
  }

  if (artifact.backend !== "barretenberg-ultrahonk") {
    throw new Error(`${config.displayName} fixture prover requires barretenberg-ultrahonk evidence.`);
  }

  if (!config.allowedProofBackends.includes(artifact.proofBackend)) {
    throw new Error(
      `${config.displayName} fixture prover requires ${config.allowedProofBackends.join(" or ")} evidence.`,
    );
  }

  if (artifact.proofSystem !== "noir-bb") {
    throw new Error(`${config.displayName} fixture prover requires noir-bb proof evidence.`);
  }

  if (JSON.stringify(artifact.publicInputLabels) !== JSON.stringify([config.publicInputLabel])) {
    throw new Error(`${config.displayName} fixture prover requires ${config.publicInputLabel} artifact evidence.`);
  }

  if (artifact.publicInputs.length !== 1 || !artifact.publicInputs[0]?.trim()) {
    throw new Error(`${config.displayName} fixture prover requires one public input.`);
  }

  normalizeFieldString(artifact.publicInputs[0], "artifact publicInputs[0]");

  if (artifact.publicInputCommitment !== proofArtifactPublicInputCommitment(artifact.publicInputs)) {
    throw new Error(`${config.displayName} fixture prover publicInputCommitment mismatch.`);
  }

  if (artifact.proofHex.length === 0 || artifact.proofHex.length % 2 !== 0 || !/^[0-9a-f]+$/u.test(artifact.proofHex)) {
    throw new Error(`${config.displayName} fixture prover requires lowercase even-length proofHex.`);
  }

  if (artifact.verifyingKeyHashKind !== "local-acir-bytecode-hash-not-production-vk") {
    throw new Error(`${config.displayName} fixture prover must remain local verifying-key evidence.`);
  }

  const expectedVerifyingKeyId = `local-acir-bytecode:${config.circuit}:${artifact.acirBytecodeHash}`;
  if (
    !/^sha256:[0-9a-f]{64}$/u.test(artifact.acirBytecodeHash) ||
    !/^sha256:[0-9a-f]{64}$/u.test(artifact.verifyingKeyHash) ||
    artifact.verifyingKeyHash !== artifact.acirBytecodeHash ||
    !artifact.verifyingKeyId.startsWith(`local-acir-bytecode:${config.circuit}:sha256:`) ||
    artifact.verifyingKeyId !== expectedVerifyingKeyId
  ) {
    throw new Error(`${config.displayName} fixture prover requires local ACIR bytecode key metadata.`);
  }
}

function assertLocalBbFixtureRequestShape(
  request: VantaPrivatePoolV2ProofRequest,
  config: VantaPrivatePoolV2LocalBbFixtureTargetConfig,
) {
  if (request.intent !== config.intent) {
    throw new Error(`${config.displayName} fixture prover only supports ${config.intent} proof requests.`);
  }

  if (
    request.publicInputs.filter((input) => input.startsWith(config.versionPrefix)).length !== 1
  ) {
    const versionName =
      config.target === "actual-private-spend" ? config.target : config.displayName;
    throw new Error(`${config.displayName} fixture prover requires a ${versionName} proof request version.`);
  }

  if (
    !request.circuitPublicInputs ||
    request.circuitPublicInputs.length !== 1 ||
    !request.circuitPublicInputs[0]?.startsWith(`${config.publicInputLabel}:`)
  ) {
    throw new Error(`${
      config.displayName
    } fixture prover requires request.circuitPublicInputs.${config.publicInputLabel}.`);
  }

  for (const label of config.requiredPublicInputLabels) {
    normalizeFieldString(requiredPublicInputValue(request, label), `${label} public input`);
  }

  if (config.target === "actual-private-spend") {
    const outputs = [
      requiredPublicInputValue(request, "output-commitment-0"),
      requiredPublicInputValue(request, "output-commitment-1"),
    ].map((value) => normalizeFieldString(value, "output commitment public input"));
    if (new Set(outputs).size !== outputs.length) {
      throw new Error("Actual-private-spend fixture prover requires unique output commitments.");
    }
  }
}

function assertLocalBbFixtureRequestMatchesArtifact(
  request: VantaPrivatePoolV2ProofRequest,
  fixtureProofRequest: VantaPrivatePoolV2ProofRequest,
  artifact: VantaPrivatePoolV2LocalBbFixtureProofArtifact,
  config: VantaPrivatePoolV2LocalBbFixtureTargetConfig,
) {
  assertLocalBbProofArtifact(artifact, config);
  assertLocalBbFixtureRequestShape(request, config);
  assertLocalBbFixtureRequestShape(fixtureProofRequest, config);

  const expectedPublicInput = readCircuitPublicInput(request, config.publicInputLabel);
  if (!expectedPublicInput) {
    throw new Error(`${
      config.displayName
    } fixture prover requires request.circuitPublicInputs.${config.publicInputLabel}.`);
  }

  if (
    normalizeFieldString(artifact.publicInputs[0], "artifact public input") !==
    normalizeFieldString(expectedPublicInput, "request public input")
  ) {
    throw new Error(`${config.displayName} fixture prover artifact public input must match the request public input.`);
  }

  if (
    !sameArray(request.publicInputs, fixtureProofRequest.publicInputs) ||
    !sameArray(request.circuitPublicInputs, fixtureProofRequest.circuitPublicInputs)
  ) {
    throw new Error(`${config.displayName} fixture prover request public inputs must match the fixture proof request.`);
  }

  if (
    request.amountBaseUnits !== fixtureProofRequest.amountBaseUnits ||
    request.assetId !== fixtureProofRequest.assetId ||
    request.intent !== fixtureProofRequest.intent ||
    !sameArray(request.operatorVisibleTerms, fixtureProofRequest.operatorVisibleTerms) ||
    !sameShadowCommitments(request.shadowCommitments, fixtureProofRequest.shadowCommitments)
  ) {
    throw new Error(`${config.displayName} fixture prover request transcript must match the fixture proof request.`);
  }
}

export class VantaPrivatePoolV2LocalProver implements VantaPrivatePoolV2Prover {
  readonly scheme = VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME;

  #enabled: boolean;
  #provingKeyId: string;

  constructor({
    enabled = true,
    provingKeyId = `${VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION}:local-proving-key-0.1`,
  }: VantaPrivatePoolV2LocalProverArgs = {}) {
    this.#enabled = enabled;
    this.#provingKeyId = provingKeyId;
  }

  async prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult> {
    const readiness = this.readiness();

    if (!readiness.ready) {
      throw new Error(readiness.blockers.join(" "));
    }

    if (request.amountBaseUnits <= 0n) {
      throw new Error("Proof amount must be positive.");
    }

    if ((request.circuitPublicInputs ?? request.publicInputs).length === 0) {
      throw new Error("Proof request must bind at least one public input.");
    }

    const serializedRequest = serializeProofRequest(request);
    const publicInputCommitment = hashParts(this.scheme, "public-inputs", serializedRequest);
    const proofMaterial = hashParts(
      this.scheme,
      "proof",
      this.#provingKeyId,
      publicInputCommitment,
    );

    return {
      proofBackend: VANTA_PRIVATE_POOL_V2_LOCAL_PROOF_BACKEND,
      proofBytes: new TextEncoder().encode(proofMaterial),
      proofSystem: "mock",
      publicInputCommitment,
      verifyingKeyId: this.#provingKeyId.replace("proving", "verifying"),
    };
  }

  readiness(): VantaPrivatePoolV2Readiness {
    if (!this.#enabled) {
      return {
        blockers: ["Local Private Pool v2 prover is disabled."],
        ready: false,
        warnings: [],
      };
    }

    return {
      blockers: [],
      ready: true,
      warnings: [
        "Local Private Pool v2 prover is deterministic harness code, not a production ZK proof.",
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
      bytesToHex(proof.proofBytes) === bytesToHex(expected.proofBytes)
    );
  }
}

export function createVantaPrivatePoolV2LocalProver(args?: VantaPrivatePoolV2LocalProverArgs) {
  return new VantaPrivatePoolV2LocalProver(args);
}

export class VantaPrivatePoolV2LocalBbFixtureProver implements VantaPrivatePoolV2Prover {
  readonly scheme = "vanta-private-pool-v2-local-bb-fixture-prover-0.1" as const;

  #enabled: boolean;
  #fixtureProofRequest: VantaPrivatePoolV2ProofRequest;
  #proofArtifact: VantaPrivatePoolV2LocalBbFixtureProofArtifact;
  #target: VantaPrivatePoolV2LocalBbFixtureTarget;

  constructor({
    enabled = true,
    fixtureProofRequest,
    proofArtifact,
    target,
  }: VantaPrivatePoolV2LocalBbFixtureProverArgs) {
    this.#enabled = enabled;
    this.#fixtureProofRequest = fixtureProofRequest;
    this.#proofArtifact = proofArtifact;
    this.#target = target;
  }

  async prove(request: VantaPrivatePoolV2ProofRequest): Promise<VantaPrivatePoolV2ProofResult> {
    const readiness = this.readiness();
    if (!readiness.ready) {
      throw new Error(readiness.blockers.join(" "));
    }

    const config: VantaPrivatePoolV2LocalBbFixtureTargetConfig | undefined = (
      LOCAL_BB_FIXTURE_TARGET_CONFIGS as Partial<
        Record<string, VantaPrivatePoolV2LocalBbFixtureTargetConfig>
      >
    )[this.#target];
    if (!config) {
      throw new Error("Local bb fixture prover target is unsupported.");
    }

    assertLocalBbFixtureRequestMatchesArtifact(
      request,
      this.#fixtureProofRequest,
      this.#proofArtifact,
      config,
    );

    return {
      proofBackend: this.#proofArtifact.proofBackend,
      proofBytes: hexToBytes(this.#proofArtifact.proofHex),
      proofSystem: "noir-bb",
      publicInputCommitment: this.#proofArtifact.publicInputCommitment,
      verifyingKeyId: this.#proofArtifact.verifyingKeyId,
    };
  }

  readiness(): VantaPrivatePoolV2Readiness {
    if (!this.#enabled) {
      return {
        blockers: ["Local Private Pool v2 bb fixture prover is disabled."],
        ready: false,
        warnings: [],
      };
    }

    return {
      blockers: [],
      ready: true,
      warnings: [
        "Local Private Pool v2 bb fixture prover replays verified local proof artifacts. Fixture artifacts are exact fixture replay; derived actual-private-spend and Send artifacts are generated by the local Node proof script. Neither is a production ZK proof service.",
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
      bytesToHex(proof.proofBytes) === bytesToHex(expected.proofBytes)
    );
  }
}

export function createVantaPrivatePoolV2LocalBbFixtureProver(
  args: VantaPrivatePoolV2LocalBbFixtureProverArgs,
) {
  return new VantaPrivatePoolV2LocalBbFixtureProver(args);
}
