import { poseidon1, poseidon2, poseidon12 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
  VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
} from "./privatePoolV2MerkleFixtureHelpers";
import { createVantaPrivatePoolV2SwapToShieldedProofRequest } from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-swap-to-shielded-circuit-fixture-0.2" as const;

export type VantaPrivatePoolV2SwapToShieldedCircuitWitness = {
  economics_commitment: bigint;
  input_commitment: bigint;
  input_leaf_index: bigint;
  input_root: bigint;
  membership_path: readonly bigint[];
  membership_path_direction_bits: readonly bigint[];
  nullifier_or_replay_commitment: bigint;
  output_append_path: readonly bigint[];
  output_append_path_direction_bits: readonly bigint[];
  output_commitment: bigint;
  output_leaf_index: bigint;
  output_root: bigint;
  owner_commitment: bigint;
  owner_secret: bigint;
  request_version: bigint;
  route_commitment: bigint;
  settlement_commitment: bigint;
  swap_context_tag: bigint;
};

export type VantaPrivatePoolV2SwapToShieldedCircuitFixture = {
  proofRequest: VantaPrivatePoolV2ProofRequest;
  swapPublicInputHash: bigint;
  witness: VantaPrivatePoolV2SwapToShieldedCircuitWitness;
};

export type VantaPrivatePoolV2SwapToShieldedCircuitWitnessInput = {
  economics_commitment: bigint | string;
  input_commitment: bigint | string;
  input_leaf_index: bigint | string;
  input_root: bigint | string;
  membership_path: readonly (bigint | string)[];
  membership_path_direction_bits: readonly (bigint | string)[];
  nullifier_or_replay_commitment: bigint | string;
  output_append_path: readonly (bigint | string)[];
  output_append_path_direction_bits: readonly (bigint | string)[];
  output_commitment: bigint | string;
  output_leaf_index: bigint | string;
  output_root: bigint | string;
  owner_commitment: bigint | string;
  owner_secret: bigint | string;
  request_version: bigint | string;
  route_commitment: bigint | string;
  settlement_commitment: bigint | string;
  swap_context_tag: bigint | string;
};

export type VantaPrivatePoolV2SwapToShieldedCircuitNoirInputs = {
  economics_commitment: string;
  input_commitment: string;
  input_leaf_index: string;
  input_root: string;
  membership_path: string[];
  membership_path_direction_bits: string[];
  nullifier_or_replay_commitment: string;
  output_append_path: string[];
  output_append_path_direction_bits: string[];
  output_commitment: string;
  output_leaf_index: string;
  output_root: string;
  owner_commitment: string;
  owner_secret: string;
  request_version: string;
  route_commitment: string;
  settlement_commitment: string;
  swap_context_tag: string;
  swap_public_input_hash: string;
};

export type VantaPrivatePoolV2SwapToShieldedCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "forged-output-append-path"
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-output-root";

const SWAP_TO_SHIELDED_WITNESS_FIELDS = [
  "economics_commitment",
  "input_commitment",
  "input_leaf_index",
  "input_root",
  "membership_path",
  "membership_path_direction_bits",
  "nullifier_or_replay_commitment",
  "output_append_path",
  "output_append_path_direction_bits",
  "output_commitment",
  "output_leaf_index",
  "output_root",
  "owner_commitment",
  "owner_secret",
  "request_version",
  "route_commitment",
  "settlement_commitment",
  "swap_context_tag",
] as const;

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const DEFAULT_WITNESS_BASE = {
  economics_commitment: 808n,
  input_commitment: 303n,
  input_leaf_index: 5n,
  membership_path: [] as readonly bigint[],
  membership_path_direction_bits: [] as readonly bigint[],
  output_commitment: 1201n,
  output_leaf_index: 6n,
  owner_commitment: 606n,
  owner_secret: 404n,
  request_version: 101n,
  route_commitment: 909n,
  settlement_commitment: 707n,
  swap_context_tag: 1302n,
};

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  ...buildVantaPrivatePoolV2SwapToShieldedTree(DEFAULT_WITNESS_BASE),
};

const DEFAULT_WITH_NULLIFIER = {
  ...DEFAULT_WITH_ROOT,
  nullifier_or_replay_commitment:
    computeVantaPrivatePoolV2SwapToShieldedNullifierOrReplayCommitment(DEFAULT_WITH_ROOT),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_NULLIFIER,
} satisfies VantaPrivatePoolV2SwapToShieldedCircuitWitness;

function toCircuitString(value: bigint) {
  return value.toString(10);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function normalizeWitnessField(value: unknown, label: string) {
  const parsed =
    typeof value === "bigint"
      ? value
      : typeof value === "string" && (value === "0" || /^[1-9][0-9]*$/u.test(value))
        ? BigInt(value)
        : null;

  if (parsed === null) {
    throw new Error(`${label} must be a canonical decimal BN254 field string.`);
  }

  if (parsed < 0n || parsed >= BN254_SCALAR_FIELD) {
    throw new Error(`${label} must fit in BN254.`);
  }

  return parsed;
}

function normalizeWitnessFieldArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length !== VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH) {
    throw new Error(
      `${label} must contain ${VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH} fields.`,
    );
  }

  return value.map((entry, index) => normalizeWitnessField(entry, `${label}[${index}]`));
}

function assertNoUnexpectedWitnessFields(input: Record<string, unknown>) {
  const allowed = new Set<string>(SWAP_TO_SHIELDED_WITNESS_FIELDS);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Swap-to-shielded witness input contains unexpected field ${key}.`);
    }
  }

  for (const key of allowed) {
    if (!(key in input)) {
      throw new Error(`Swap-to-shielded witness input is missing ${key}.`);
    }
  }
}

function leafIndexFromDirectionBits(directionBits: readonly bigint[]) {
  return directionBits.reduce(
    (leafIndex, bit, index) => leafIndex + (bit << BigInt(index)),
    0n,
  );
}

function assertDirectionBits(directionBits: readonly bigint[], label: string) {
  for (const [index, bit] of directionBits.entries()) {
    if (bit !== 0n && bit !== 1n) {
      throw new Error(`${label}[${index}] must be 0 or 1.`);
    }
  }
}

export function computeVantaPrivatePoolV2SwapToShieldedNullifierOrReplayCommitment(
  witness: Pick<
    VantaPrivatePoolV2SwapToShieldedCircuitWitness,
    "input_commitment" | "owner_secret"
  >,
) {
  return poseidon2([witness.input_commitment, witness.owner_secret]);
}

export function computeVantaPrivatePoolV2SwapToShieldedLeaf(
  witness: Pick<VantaPrivatePoolV2SwapToShieldedCircuitWitness, "input_commitment">,
) {
  return poseidon1([witness.input_commitment]);
}

function computeVantaPrivatePoolV2SwapToShieldedLeafValue(value: bigint) {
  return poseidon1([value]);
}

export function computeVantaPrivatePoolV2SwapToShieldedNode({
  current,
  directionBit,
  sibling,
}: {
  current: bigint;
  directionBit: bigint;
  sibling: bigint;
}) {
  return directionBit === 1n
    ? poseidon2([sibling, current])
    : poseidon2([current, sibling]);
}

export function computeVantaPrivatePoolV2SwapToShieldedInputRoot(
  witness: Pick<
    VantaPrivatePoolV2SwapToShieldedCircuitWitness,
    "input_commitment" | "membership_path" | "membership_path_direction_bits"
  >,
) {
  return witness.membership_path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2SwapToShieldedNode({
        current,
        directionBit: witness.membership_path_direction_bits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2SwapToShieldedLeaf(witness),
  );
}

export function computeVantaPrivatePoolV2SwapToShieldedRootFromLeaf({
  leafValue,
  path,
  pathDirectionBits,
}: {
  leafValue: bigint;
  path: readonly bigint[];
  pathDirectionBits: readonly bigint[];
}) {
  return path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2SwapToShieldedNode({
        current,
        directionBit: pathDirectionBits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2SwapToShieldedLeafValue(leafValue),
  );
}

export function computeVantaPrivatePoolV2SwapToShieldedPublicInputHash(
  witness: VantaPrivatePoolV2SwapToShieldedCircuitWitness,
) {
  return poseidon12([
    witness.request_version,
    witness.input_root,
    witness.input_commitment,
    witness.nullifier_or_replay_commitment,
    witness.settlement_commitment,
    witness.route_commitment,
    witness.economics_commitment,
    witness.output_commitment,
    witness.output_leaf_index,
    witness.output_root,
    witness.owner_commitment,
    witness.swap_context_tag,
  ]);
}

export function normalizeVantaPrivatePoolV2SwapToShieldedCircuitWitnessInput(
  input: unknown,
): VantaPrivatePoolV2SwapToShieldedCircuitWitness {
  assertRecord(input, "Swap-to-shielded witness input");
  assertNoUnexpectedWitnessFields(input);

  const witness: VantaPrivatePoolV2SwapToShieldedCircuitWitness = {
    economics_commitment: normalizeWitnessField(
      input.economics_commitment,
      "economics_commitment",
    ),
    input_commitment: normalizeWitnessField(input.input_commitment, "input_commitment"),
    input_leaf_index: normalizeWitnessField(input.input_leaf_index, "input_leaf_index"),
    input_root: normalizeWitnessField(input.input_root, "input_root"),
    membership_path: normalizeWitnessFieldArray(input.membership_path, "membership_path"),
    membership_path_direction_bits: normalizeWitnessFieldArray(
      input.membership_path_direction_bits,
      "membership_path_direction_bits",
    ),
    nullifier_or_replay_commitment: normalizeWitnessField(
      input.nullifier_or_replay_commitment,
      "nullifier_or_replay_commitment",
    ),
    output_append_path: normalizeWitnessFieldArray(
      input.output_append_path,
      "output_append_path",
    ),
    output_append_path_direction_bits: normalizeWitnessFieldArray(
      input.output_append_path_direction_bits,
      "output_append_path_direction_bits",
    ),
    output_commitment: normalizeWitnessField(input.output_commitment, "output_commitment"),
    output_leaf_index: normalizeWitnessField(input.output_leaf_index, "output_leaf_index"),
    output_root: normalizeWitnessField(input.output_root, "output_root"),
    owner_commitment: normalizeWitnessField(input.owner_commitment, "owner_commitment"),
    owner_secret: normalizeWitnessField(input.owner_secret, "owner_secret"),
    request_version: normalizeWitnessField(input.request_version, "request_version"),
    route_commitment: normalizeWitnessField(input.route_commitment, "route_commitment"),
    settlement_commitment: normalizeWitnessField(
      input.settlement_commitment,
      "settlement_commitment",
    ),
    swap_context_tag: normalizeWitnessField(input.swap_context_tag, "swap_context_tag"),
  };

  assertDirectionBits(witness.membership_path_direction_bits, "membership_path_direction_bits");
  assertDirectionBits(
    witness.output_append_path_direction_bits,
    "output_append_path_direction_bits",
  );

  if (
    witness.input_leaf_index !==
    leafIndexFromDirectionBits(witness.membership_path_direction_bits)
  ) {
    throw new Error("Swap-to-shielded witness input_leaf_index must match direction bits.");
  }

  if (
    witness.output_leaf_index !==
    leafIndexFromDirectionBits(witness.output_append_path_direction_bits)
  ) {
    throw new Error("Swap-to-shielded witness output_leaf_index must match direction bits.");
  }

  if (witness.input_root !== computeVantaPrivatePoolV2SwapToShieldedInputRoot(witness)) {
    throw new Error("Swap-to-shielded witness input_root must match the input membership path.");
  }

  if (
    witness.nullifier_or_replay_commitment !==
    computeVantaPrivatePoolV2SwapToShieldedNullifierOrReplayCommitment(witness)
  ) {
    throw new Error(
      "Swap-to-shielded witness nullifier_or_replay_commitment must match the input commitment and owner secret.",
    );
  }

  const appendPathPreviousRoot = computeVantaPrivatePoolV2SwapToShieldedRootFromLeaf({
    leafValue: 0n,
    path: witness.output_append_path,
    pathDirectionBits: witness.output_append_path_direction_bits,
  });
  if (appendPathPreviousRoot !== witness.input_root) {
    throw new Error("Swap-to-shielded witness append path must start from the input root.");
  }

  const outputRoot = computeVantaPrivatePoolV2SwapToShieldedRootFromLeaf({
    leafValue: witness.output_commitment,
    path: witness.output_append_path,
    pathDirectionBits: witness.output_append_path_direction_bits,
  });
  if (witness.output_root !== outputRoot) {
    throw new Error("Swap-to-shielded witness output_root must match the output append path.");
  }

  return witness;
}

export function createVantaPrivatePoolV2SwapToShieldedCircuitFixture({
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  mode?: VantaPrivatePoolV2SwapToShieldedCircuitFixtureMode;
  witness?: VantaPrivatePoolV2SwapToShieldedCircuitWitness;
} = {}): VantaPrivatePoolV2SwapToShieldedCircuitFixture {
  const circuitWitness =
    mode === "forged-input-membership"
      ? forgeVantaPrivatePoolV2SwapToShieldedInputMembership(witness)
      : mode === "forged-output-append-path"
        ? {
            ...witness,
            output_append_path: forgePath(witness.output_append_path),
          }
      : mode === "invalid-nullifier"
      ? {
          ...witness,
          nullifier_or_replay_commitment: witness.nullifier_or_replay_commitment + 1n,
        }
      : mode === "invalid-output-root"
        ? {
            ...witness,
            output_root: witness.output_root + 1n,
          }
        : witness;
  const validPublicHash =
    computeVantaPrivatePoolV2SwapToShieldedPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2SwapToShieldedProofRequest({
    economicsCommitment: toCircuitString(witness.economics_commitment),
    inputCommitment: toCircuitString(witness.input_commitment),
    inputRoot: toCircuitString(witness.input_root),
    nullifierOrReplayCommitment: toCircuitString(
      circuitWitness.nullifier_or_replay_commitment,
    ),
    outputCommitment: toCircuitString(witness.output_commitment),
    outputLeafIndex: toCircuitString(witness.output_leaf_index),
    outputRoot: toCircuitString(circuitWitness.output_root),
    ownerCommitment: toCircuitString(witness.owner_commitment),
    routeCommitment: toCircuitString(witness.route_commitment),
    settlementCommitment: toCircuitString(witness.settlement_commitment),
    swapContextTag: toCircuitString(witness.swap_context_tag),
    swapPublicInputHash: toCircuitString(validPublicHash),
  });

  return {
    proofRequest,
    swapPublicInputHash: mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    witness: circuitWitness,
  };
}

export function createVantaPrivatePoolV2SwapToShieldedCircuitFixtureFromWitnessInput(
  input: unknown,
) {
  return createVantaPrivatePoolV2SwapToShieldedCircuitFixture({
    witness: normalizeVantaPrivatePoolV2SwapToShieldedCircuitWitnessInput(input),
  });
}

export function createVantaPrivatePoolV2SwapToShieldedCircuitNoirInputs(
  fixture: VantaPrivatePoolV2SwapToShieldedCircuitFixture,
): VantaPrivatePoolV2SwapToShieldedCircuitNoirInputs {
  const { witness } = fixture;

  return {
    economics_commitment: toCircuitString(witness.economics_commitment),
    input_commitment: toCircuitString(witness.input_commitment),
    input_leaf_index: toCircuitString(witness.input_leaf_index),
    input_root: toCircuitString(witness.input_root),
    membership_path: witness.membership_path.map(toCircuitString),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(toCircuitString),
    nullifier_or_replay_commitment: toCircuitString(
      witness.nullifier_or_replay_commitment,
    ),
    output_append_path: witness.output_append_path.map(toCircuitString),
    output_append_path_direction_bits:
      witness.output_append_path_direction_bits.map(toCircuitString),
    output_commitment: toCircuitString(witness.output_commitment),
    output_leaf_index: toCircuitString(witness.output_leaf_index),
    output_root: toCircuitString(witness.output_root),
    owner_commitment: toCircuitString(witness.owner_commitment),
    owner_secret: toCircuitString(witness.owner_secret),
    request_version: toCircuitString(witness.request_version),
    route_commitment: toCircuitString(witness.route_commitment),
    settlement_commitment: toCircuitString(witness.settlement_commitment),
    swap_context_tag: toCircuitString(witness.swap_context_tag),
    swap_public_input_hash: toCircuitString(fixture.swapPublicInputHash),
  };
}

function forgeVantaPrivatePoolV2SwapToShieldedInputMembership(
  witness: VantaPrivatePoolV2SwapToShieldedCircuitWitness,
): VantaPrivatePoolV2SwapToShieldedCircuitWitness {
  const forgedInputRoot = witness.input_root + 1n;

  return {
    ...witness,
    input_root: forgedInputRoot,
  };
}

function forgePath(path: readonly bigint[]) {
  return path.map((value, index) => (index === 0 ? value + 1n : value));
}

function buildVantaPrivatePoolV2SwapToShieldedTree(
  witness: typeof DEFAULT_WITNESS_BASE,
) {
  const inputTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: witness.input_leaf_index,
        leafValue: witness.input_commitment,
      },
    ],
  });
  const outputTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: witness.input_leaf_index,
        leafValue: witness.input_commitment,
      },
      {
        leafIndex: witness.output_leaf_index,
        leafValue: witness.output_commitment,
      },
    ],
  });

  return {
    input_root: inputTree.root,
    membership_path: inputTree.pathForLeaf(witness.input_leaf_index),
    membership_path_direction_bits: directionBitsForLeafIndex(witness.input_leaf_index),
    output_append_path: inputTree.pathForLeaf(witness.output_leaf_index),
    output_append_path_direction_bits: directionBitsForLeafIndex(witness.output_leaf_index),
    output_root: outputTree.root,
  };
}

export function serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml(
  fixture: VantaPrivatePoolV2SwapToShieldedCircuitFixture,
) {
  const { witness } = fixture;

  return [
    `swap_public_input_hash = "${fixture.swapPublicInputHash.toString(10)}"`,
    `request_version = "${witness.request_version.toString(10)}"`,
    `input_root = "${witness.input_root.toString(10)}"`,
    `input_commitment = "${witness.input_commitment.toString(10)}"`,
    `input_leaf_index = "${witness.input_leaf_index.toString(10)}"`,
    `membership_path = [${witness.membership_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `membership_path_direction_bits = [${witness.membership_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `nullifier_or_replay_commitment = "${witness.nullifier_or_replay_commitment.toString(10)}"`,
    `settlement_commitment = "${witness.settlement_commitment.toString(10)}"`,
    `route_commitment = "${witness.route_commitment.toString(10)}"`,
    `economics_commitment = "${witness.economics_commitment.toString(10)}"`,
    `output_commitment = "${witness.output_commitment.toString(10)}"`,
    `output_leaf_index = "${witness.output_leaf_index.toString(10)}"`,
    `output_root = "${witness.output_root.toString(10)}"`,
    `output_append_path = [${witness.output_append_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `output_append_path_direction_bits = [${witness.output_append_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `owner_commitment = "${witness.owner_commitment.toString(10)}"`,
    `swap_context_tag = "${witness.swap_context_tag.toString(10)}"`,
    `owner_secret = "${witness.owner_secret.toString(10)}"`,
    "",
  ].join("\n");
}
