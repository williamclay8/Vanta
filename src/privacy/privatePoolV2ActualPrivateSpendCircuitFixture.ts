import { poseidon1, poseidon2, poseidon3, poseidon6, poseidon11 } from "poseidon-lite";
import { createVantaPrivatePoolV2ActualPrivateSpendProofRequest } from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-actual-private-spend-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2ActualPrivateSpendCircuitWitness = {
  accepted_root: bigint;
  asset_cohort: bigint;
  context_hash: bigint;
  input_commitment: bigint;
  leaf_index: bigint;
  membership_path: readonly [bigint, bigint, bigint];
  membership_path_direction_bits: readonly [bigint, bigint, bigint];
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
  | "invalid-leaf-index"
  | "invalid-membership-root"
  | "invalid-nullifier";

const DEFAULT_WITNESS_BASE = {
  asset_cohort: 202n,
  context_hash: 909n,
  input_commitment: 404n,
  leaf_index: 5n,
  membership_path: [505n, 606n, 707n],
  membership_path_direction_bits: [1n, 0n, 1n],
  note_secret: 303n,
  output_commitment_0: 1001n,
  output_commitment_1: 1002n,
  pool_id: 101n,
  request_version: 701n,
} satisfies Omit<
  VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
  "accepted_root" | "nullifier"
>;

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  accepted_root: computeVantaPrivatePoolV2ActualPrivateSpendRoot(DEFAULT_WITNESS_BASE),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_ROOT,
  nullifier: computeVantaPrivatePoolV2ActualPrivateSpendNullifier(DEFAULT_WITH_ROOT),
} satisfies VantaPrivatePoolV2ActualPrivateSpendCircuitWitness;

function toCircuitString(value: bigint) {
  return value.toString(10);
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

export function computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash(
  witness: VantaPrivatePoolV2ActualPrivateSpendCircuitWitness,
) {
  const outputCommitmentHash = poseidon2([
    witness.output_commitment_0,
    witness.output_commitment_1,
  ]);
  const membershipBinding = poseidon6([
    witness.accepted_root,
    witness.input_commitment,
    witness.leaf_index,
    witness.membership_path_direction_bits[0],
    witness.membership_path_direction_bits[1],
    witness.membership_path_direction_bits[2],
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
          ? { ...witness, membership_path_direction_bits: [2n, 0n, 1n] as const }
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
    `membership_path = [${witness.membership_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `membership_path_direction_bits = [${witness.membership_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    "",
  ].join("\n");
}
