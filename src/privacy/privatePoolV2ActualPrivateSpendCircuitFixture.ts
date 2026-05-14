import { poseidon1, poseidon2, poseidon3, poseidon5, poseidon11 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
  VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
} from "./privatePoolV2MerkleFixtureHelpers";
import { createVantaPrivatePoolV2ActualPrivateSpendProofRequest } from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-actual-private-spend-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2ActualPrivateSpendCircuitWitness = {
  accepted_root: bigint;
  asset_cohort: bigint;
  context_hash: bigint;
  input_blinding: bigint;
  input_commitment: bigint;
  input_derivation_tag: bigint;
  leaf_index: bigint;
  membership_path: readonly bigint[];
  membership_path_direction_bits: readonly bigint[];
  nullifier: bigint;
  note_secret: bigint;
  output_commitment_0: bigint;
  output_commitment_1: bigint;
  pool_id: bigint;
  request_version: bigint;
};

export type VantaPrivatePoolV2ActualPrivateSpendCircuitFixture = {
  privateSpendPublicInputHash: bigint;
  proofRequest: VantaPrivatePoolV2ProofRequest;
  witness: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness;
};

export type VantaPrivatePoolV2ActualPrivateSpendCircuitFixtureMode =
  | "valid"
  | "invalid-binding"
  | "invalid-direction-bit"
  | "invalid-input-commitment-preimage"
  | "invalid-leaf-index"
  | "invalid-membership-root"
  | "invalid-nullifier";

export type VantaPrivatePoolV2ActualPrivateSpendCircuitWitnessInput = {
  accepted_root: bigint | string;
  asset_cohort: bigint | string;
  context_hash: bigint | string;
  input_blinding: bigint | string;
  input_commitment: bigint | string;
  input_derivation_tag: bigint | string;
  leaf_index: bigint | string;
  membership_path: readonly (bigint | string)[];
  membership_path_direction_bits: readonly (bigint | string)[];
  nullifier: bigint | string;
  note_secret: bigint | string;
  output_commitment_0: bigint | string;
  output_commitment_1: bigint | string;
  pool_id: bigint | string;
  request_version: bigint | string;
};

export type VantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs = {
  accepted_root: string;
  asset_cohort: string;
  context_hash: string;
  input_blinding: string;
  input_commitment: string;
  input_derivation_tag: string;
  leaf_index: string;
  membership_path: string[];
  membership_path_direction_bits: string[];
  nullifier: string;
  note_secret: string;
  output_commitment_0: string;
  output_commitment_1: string;
  pool_id: string;
  private_spend_public_input_hash: string;
  request_version: string;
};

const DEFAULT_WITNESS_BASE = {
  asset_cohort: 202n,
  context_hash: 909n,
  input_blinding: 404n,
  input_derivation_tag: 405n,
  leaf_index: 5n,
  membership_path: [] as readonly bigint[],
  membership_path_direction_bits: [] as readonly bigint[],
  note_secret: 303n,
  output_commitment_0: 1001n,
  output_commitment_1: 1002n,
  pool_id: 101n,
  request_version: 701n,
} satisfies Omit<
  VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
  "accepted_root" | "input_commitment" | "nullifier"
>;

const DEFAULT_WITH_INPUT_COMMITMENT = {
  ...DEFAULT_WITNESS_BASE,
  input_commitment: computeVantaPrivatePoolV2ActualPrivateSpendInputCommitment(
    DEFAULT_WITNESS_BASE,
  ),
};

const DEFAULT_TREE = buildVantaPrivatePoolV2SparseMerkleTree({
  leaves: [
    {
      leafIndex: DEFAULT_WITH_INPUT_COMMITMENT.leaf_index,
      leafValue: DEFAULT_WITH_INPUT_COMMITMENT.input_commitment,
    },
  ],
});

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITH_INPUT_COMMITMENT,
  accepted_root: DEFAULT_TREE.root,
  membership_path: DEFAULT_TREE.pathForLeaf(DEFAULT_WITH_INPUT_COMMITMENT.leaf_index),
  membership_path_direction_bits: directionBitsForLeafIndex(
    DEFAULT_WITH_INPUT_COMMITMENT.leaf_index,
  ),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_ROOT,
  nullifier: computeVantaPrivatePoolV2ActualPrivateSpendNullifier(DEFAULT_WITH_ROOT),
} satisfies VantaPrivatePoolV2ActualPrivateSpendCircuitWitness;

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const ACTUAL_PRIVATE_SPEND_WITNESS_FIELDS = [
  "accepted_root",
  "asset_cohort",
  "context_hash",
  "input_blinding",
  "input_commitment",
  "input_derivation_tag",
  "leaf_index",
  "membership_path",
  "membership_path_direction_bits",
  "nullifier",
  "note_secret",
  "output_commitment_0",
  "output_commitment_1",
  "pool_id",
  "request_version",
] as const;

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
  const allowed = new Set<string>(ACTUAL_PRIVATE_SPEND_WITNESS_FIELDS);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Actual-private-spend witness input contains unexpected field ${key}.`);
    }
  }

  for (const key of allowed) {
    if (!(key in input)) {
      throw new Error(`Actual-private-spend witness input is missing ${key}.`);
    }
  }
}

function leafIndexFromDirectionBits(directionBits: readonly bigint[]) {
  return directionBits.reduce(
    (leafIndex, bit, index) => leafIndex + (bit << BigInt(index)),
    0n,
  );
}

export function computeVantaPrivatePoolV2ActualPrivateSpendLeaf(
  witness: Pick<VantaPrivatePoolV2ActualPrivateSpendCircuitWitness, "input_commitment">,
) {
  return poseidon1([witness.input_commitment]);
}

export function computeVantaPrivatePoolV2ActualPrivateSpendNode({
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

export function computeVantaPrivatePoolV2ActualPrivateSpendRoot(
  witness: Pick<
    VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
    "input_commitment" | "membership_path" | "membership_path_direction_bits"
  >,
) {
  return witness.membership_path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2ActualPrivateSpendNode({
        current,
        directionBit: witness.membership_path_direction_bits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2ActualPrivateSpendLeaf(witness),
  );
}

export function computeVantaPrivatePoolV2ActualPrivateSpendNullifier(
  witness: Pick<
    VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
    "accepted_root" | "input_commitment" | "note_secret" | "pool_id"
  >,
) {
  return poseidon3([witness.input_commitment, witness.note_secret, witness.pool_id]);
}

export function computeVantaPrivatePoolV2ActualPrivateSpendInputCommitment(
  witness: Pick<
    VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
    "asset_cohort" | "input_blinding" | "input_derivation_tag" | "note_secret" | "pool_id"
  >,
) {
  return poseidon5([
    witness.note_secret,
    witness.pool_id,
    witness.asset_cohort,
    witness.input_blinding,
    witness.input_derivation_tag,
  ]);
}

export function computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash(
  witness: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
) {
  const outputCommitmentHash = poseidon2([
    witness.output_commitment_0,
    witness.output_commitment_1,
  ]);
  const membershipBinding = poseidon3([
    witness.accepted_root,
    witness.input_commitment,
    witness.leaf_index,
  ]);

  return poseidon11([
    witness.request_version,
    witness.pool_id,
    witness.asset_cohort,
    membershipBinding,
    witness.nullifier,
    outputCommitmentHash,
    witness.context_hash,
    witness.output_commitment_0,
    witness.output_commitment_1,
    witness.accepted_root,
    witness.leaf_index,
  ]);
}

export function normalizeVantaPrivatePoolV2ActualPrivateSpendCircuitWitnessInput(
  input: unknown,
): VantaPrivatePoolV2ActualPrivateSpendCircuitWitness {
  assertRecord(input, "Actual-private-spend witness input");
  assertNoUnexpectedWitnessFields(input);

  const witness: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness = {
    accepted_root: normalizeWitnessField(input.accepted_root, "accepted_root"),
    asset_cohort: normalizeWitnessField(input.asset_cohort, "asset_cohort"),
    context_hash: normalizeWitnessField(input.context_hash, "context_hash"),
    input_blinding: normalizeWitnessField(input.input_blinding, "input_blinding"),
    input_commitment: normalizeWitnessField(input.input_commitment, "input_commitment"),
    input_derivation_tag: normalizeWitnessField(
      input.input_derivation_tag,
      "input_derivation_tag",
    ),
    leaf_index: normalizeWitnessField(input.leaf_index, "leaf_index"),
    membership_path: normalizeWitnessFieldArray(input.membership_path, "membership_path"),
    membership_path_direction_bits: normalizeWitnessFieldArray(
      input.membership_path_direction_bits,
      "membership_path_direction_bits",
    ),
    nullifier: normalizeWitnessField(input.nullifier, "nullifier"),
    note_secret: normalizeWitnessField(input.note_secret, "note_secret"),
    output_commitment_0: normalizeWitnessField(
      input.output_commitment_0,
      "output_commitment_0",
    ),
    output_commitment_1: normalizeWitnessField(
      input.output_commitment_1,
      "output_commitment_1",
    ),
    pool_id: normalizeWitnessField(input.pool_id, "pool_id"),
    request_version: normalizeWitnessField(input.request_version, "request_version"),
  };

  for (const [index, bit] of witness.membership_path_direction_bits.entries()) {
    if (bit !== 0n && bit !== 1n) {
      throw new Error(`membership_path_direction_bits[${index}] must be 0 or 1.`);
    }
  }

  const expectedLeafIndex = leafIndexFromDirectionBits(witness.membership_path_direction_bits);
  if (witness.leaf_index !== expectedLeafIndex) {
    throw new Error("Actual-private-spend witness leaf_index must match direction bits.");
  }

  if (witness.accepted_root !== computeVantaPrivatePoolV2ActualPrivateSpendRoot(witness)) {
    throw new Error("Actual-private-spend witness accepted_root must match the Merkle path.");
  }

  if (
    witness.input_commitment !==
    computeVantaPrivatePoolV2ActualPrivateSpendInputCommitment(witness)
  ) {
    throw new Error("Actual-private-spend witness input_commitment must match the note preimage.");
  }

  if (witness.nullifier !== computeVantaPrivatePoolV2ActualPrivateSpendNullifier(witness)) {
    throw new Error("Actual-private-spend witness nullifier must match the note secret.");
  }

  if (witness.output_commitment_0 === witness.output_commitment_1) {
    throw new Error("Actual-private-spend witness output commitments must be unique.");
  }

  return witness;
}

export function createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  mode?: VantaPrivatePoolV2ActualPrivateSpendCircuitFixtureMode;
  witness?: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness;
} = {}): VantaPrivatePoolV2ActualPrivateSpendCircuitFixture {
  const circuitWitness: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness =
    mode === "invalid-membership-root"
      ? { ...witness, accepted_root: witness.accepted_root + 1n }
      : mode === "invalid-nullifier"
        ? { ...witness, nullifier: witness.nullifier + 1n }
        : mode === "invalid-direction-bit"
          ? {
              ...witness,
              membership_path_direction_bits:
                witness.membership_path_direction_bits.map((bit, index) =>
                  index === 0 ? 2n : bit,
                ),
            }
          : mode === "invalid-input-commitment-preimage"
            ? { ...witness, input_blinding: witness.input_blinding + 1n }
          : mode === "invalid-leaf-index"
            ? { ...witness, leaf_index: witness.leaf_index + 1n }
            : witness;
  const validPublicHash =
    computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
    acceptedRoot: toCircuitString(circuitWitness.accepted_root),
    assetCohort: toCircuitString(witness.asset_cohort),
    contextHash: toCircuitString(witness.context_hash),
    nullifier: toCircuitString(circuitWitness.nullifier),
    outputCommitments: [
      toCircuitString(witness.output_commitment_0),
      toCircuitString(witness.output_commitment_1),
    ],
    poolId: toCircuitString(witness.pool_id),
    privateSpendPublicInputHash: toCircuitString(validPublicHash),
  });

  return {
    privateSpendPublicInputHash:
      mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    proofRequest,
    witness: circuitWitness,
  };
}

export function createVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureFromWitnessInput(
  input: unknown,
) {
  return createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture({
    witness: normalizeVantaPrivatePoolV2ActualPrivateSpendCircuitWitnessInput(input),
  });
}

export function createVantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs(
  fixture: VantaPrivatePoolV2ActualPrivateSpendCircuitFixture,
): VantaPrivatePoolV2ActualPrivateSpendCircuitNoirInputs {
  const { witness } = fixture;

  return {
    accepted_root: toCircuitString(witness.accepted_root),
    asset_cohort: toCircuitString(witness.asset_cohort),
    context_hash: toCircuitString(witness.context_hash),
    input_blinding: toCircuitString(witness.input_blinding),
    input_commitment: toCircuitString(witness.input_commitment),
    input_derivation_tag: toCircuitString(witness.input_derivation_tag),
    leaf_index: toCircuitString(witness.leaf_index),
    membership_path: witness.membership_path.map(toCircuitString),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(toCircuitString),
    nullifier: toCircuitString(witness.nullifier),
    note_secret: toCircuitString(witness.note_secret),
    output_commitment_0: toCircuitString(witness.output_commitment_0),
    output_commitment_1: toCircuitString(witness.output_commitment_1),
    pool_id: toCircuitString(witness.pool_id),
    private_spend_public_input_hash: toCircuitString(fixture.privateSpendPublicInputHash),
    request_version: toCircuitString(witness.request_version),
  };
}

export function serializeVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureToToml(
  fixture: VantaPrivatePoolV2ActualPrivateSpendCircuitFixture,
) {
  const { witness } = fixture;

  return [
    `private_spend_public_input_hash = "${fixture.privateSpendPublicInputHash.toString(10)}"`,
    `request_version = "${witness.request_version.toString(10)}"`,
    `pool_id = "${witness.pool_id.toString(10)}"`,
    `asset_cohort = "${witness.asset_cohort.toString(10)}"`,
    `accepted_root = "${witness.accepted_root.toString(10)}"`,
    `input_commitment = "${witness.input_commitment.toString(10)}"`,
    `leaf_index = "${witness.leaf_index.toString(10)}"`,
    `nullifier = "${witness.nullifier.toString(10)}"`,
    `output_commitment_0 = "${witness.output_commitment_0.toString(10)}"`,
    `output_commitment_1 = "${witness.output_commitment_1.toString(10)}"`,
    `context_hash = "${witness.context_hash.toString(10)}"`,
    `note_secret = "${witness.note_secret.toString(10)}"`,
    `input_blinding = "${witness.input_blinding.toString(10)}"`,
    `input_derivation_tag = "${witness.input_derivation_tag.toString(10)}"`,
    `membership_path = [${witness.membership_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `membership_path_direction_bits = [${witness.membership_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    "",
  ].join("\n");
}
