import { poseidon1, poseidon2, poseidon3, poseidon4, poseidon11 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
  VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
} from "./privatePoolV2MerkleFixtureHelpers";
import { createVantaPrivatePoolV2ClaimProofRequest } from "./privatePoolV2ProofRequests";
import type {
  VantaPrivatePoolV2ClaimQuote,
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2MerkleProof,
  VantaPrivatePoolV2ProofRequest,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_CLAIM_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-claim-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2ClaimCircuitWitness = {
  amount: bigint;
  asset_id: bigint;
  destination: bigint;
  input_commitment: bigint;
  input_root: bigint;
  leaf_index: bigint;
  membership_path: readonly bigint[];
  membership_path_direction_bits: readonly bigint[];
  nullifier: bigint;
  owner_commitment: bigint;
  owner_secret: bigint;
  quote_expires_at_slot: bigint;
  relayer_fee: bigint;
  relayer_id: bigint;
  request_version: bigint;
  tree_id: bigint;
};

export type VantaPrivatePoolV2ClaimCircuitFixture = {
  claimPublicInputHash: bigint;
  proofRequest: VantaPrivatePoolV2ProofRequest;
  witness: VantaPrivatePoolV2ClaimCircuitWitness;
};

export type VantaPrivatePoolV2ClaimCircuitWitnessInput = {
  amount: bigint | string;
  asset_id: bigint | string;
  destination: bigint | string;
  input_commitment: bigint | string;
  input_root: bigint | string;
  leaf_index: bigint | string;
  membership_path: readonly (bigint | string)[];
  membership_path_direction_bits: readonly (bigint | string)[];
  nullifier: bigint | string;
  owner_commitment: bigint | string;
  owner_secret: bigint | string;
  quote_expires_at_slot: bigint | string;
  relayer_fee: bigint | string;
  relayer_id: bigint | string;
  request_version: bigint | string;
  tree_id: bigint | string;
};

export type VantaPrivatePoolV2ClaimCircuitNoirInputs = {
  amount: string;
  asset_id: string;
  claim_public_input_hash: string;
  destination: string;
  input_commitment: string;
  input_root: string;
  leaf_index: string;
  membership_path: string[];
  membership_path_direction_bits: string[];
  nullifier: string;
  owner_commitment: string;
  owner_secret: string;
  quote_expires_at_slot: string;
  relayer_fee: string;
  relayer_id: string;
  request_version: string;
  tree_id: string;
};

export type VantaPrivatePoolV2ClaimCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-amount-range";

const CLAIM_WITNESS_FIELDS = [
  "amount",
  "asset_id",
  "destination",
  "input_commitment",
  "input_root",
  "leaf_index",
  "membership_path",
  "membership_path_direction_bits",
  "nullifier",
  "owner_commitment",
  "owner_secret",
  "quote_expires_at_slot",
  "relayer_fee",
  "relayer_id",
  "request_version",
  "tree_id",
] as const;

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const U128_MAX = (1n << 128n) - 1n;

const DEFAULT_WITNESS_BASE = {
  amount: 1_000_000n,
  asset_id: 404n,
  destination: 909n,
  input_commitment: 808n,
  leaf_index: 5n,
  membership_path: [] as readonly bigint[],
  membership_path_direction_bits: [] as readonly bigint[],
  owner_commitment: 505n,
  owner_secret: 303n,
  quote_expires_at_slot: 1_000_150n,
  relayer_fee: 100n,
  relayer_id: 707n,
  request_version: 202n,
  tree_id: 606n,
};

const DEFAULT_TREE = buildVantaPrivatePoolV2SparseMerkleTree({
  leaves: [
    {
      leafIndex: DEFAULT_WITNESS_BASE.leaf_index,
      leafValue: DEFAULT_WITNESS_BASE.input_commitment,
    },
  ],
});

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  input_root: DEFAULT_TREE.root,
  membership_path: DEFAULT_TREE.pathForLeaf(DEFAULT_WITNESS_BASE.leaf_index),
  membership_path_direction_bits: directionBitsForLeafIndex(
    DEFAULT_WITNESS_BASE.leaf_index,
  ),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_ROOT,
  nullifier: computeVantaPrivatePoolV2ClaimNullifier(DEFAULT_WITH_ROOT),
} satisfies VantaPrivatePoolV2ClaimCircuitWitness;

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

function normalizeU128WitnessField(value: unknown, label: string) {
  const parsed = normalizeWitnessField(value, label);
  if (parsed > U128_MAX) {
    throw new Error(`${label} must fit in u128.`);
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
  const allowed = new Set<string>(CLAIM_WITNESS_FIELDS);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Claim witness input contains unexpected field ${key}.`);
    }
  }

  for (const key of allowed) {
    if (!(key in input)) {
      throw new Error(`Claim witness input is missing ${key}.`);
    }
  }
}

function leafIndexFromDirectionBits(directionBits: readonly bigint[]) {
  return directionBits.reduce(
    (leafIndex, bit, index) => leafIndex + (bit << BigInt(index)),
    0n,
  );
}

function toCommitment(witness: VantaPrivatePoolV2ClaimCircuitWitness): VantaPrivatePoolV2Commitment {
  return {
    assetId: toCircuitString(witness.asset_id),
    commitment: toCircuitString(witness.input_commitment),
    leafIndex: Number(witness.leaf_index),
    merkleRoot: toCircuitString(witness.input_root),
    treeId: toCircuitString(witness.tree_id),
  };
}

function toMerkleProof(
  witness: VantaPrivatePoolV2ClaimCircuitWitness,
): VantaPrivatePoolV2MerkleProof {
  return {
    leaf: toCommitment(witness),
    path: witness.membership_path.map(toCircuitString),
    pathIndices: witness.membership_path_direction_bits.map(Number),
    root: toCircuitString(witness.input_root),
  };
}

function toQuote(witness: VantaPrivatePoolV2ClaimCircuitWitness): VantaPrivatePoolV2ClaimQuote {
  return {
    estimatedFeeBaseUnits: witness.relayer_fee,
    expiresAtSlot: witness.quote_expires_at_slot,
    relayerId: toCircuitString(witness.relayer_id),
  };
}

export function computeVantaPrivatePoolV2ClaimNullifier(
  witness: Pick<
    VantaPrivatePoolV2ClaimCircuitWitness,
    "input_commitment" | "owner_secret"
  >,
) {
  return poseidon2([witness.input_commitment, witness.owner_secret]);
}

export function computeVantaPrivatePoolV2ClaimLeaf(
  witness: Pick<VantaPrivatePoolV2ClaimCircuitWitness, "input_commitment">,
) {
  return poseidon1([witness.input_commitment]);
}

export function computeVantaPrivatePoolV2ClaimNode({
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

export function computeVantaPrivatePoolV2ClaimInputRoot(
  witness: Pick<
    VantaPrivatePoolV2ClaimCircuitWitness,
    "input_commitment" | "membership_path" | "membership_path_direction_bits"
  >,
) {
  return witness.membership_path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2ClaimNode({
        current,
        directionBit: witness.membership_path_direction_bits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2ClaimLeaf(witness),
  );
}

export function computeVantaPrivatePoolV2ClaimPublicInputHash(
  witness: VantaPrivatePoolV2ClaimCircuitWitness,
) {
  const inputMembership = poseidon3([
    witness.tree_id,
    witness.leaf_index,
    witness.input_root,
  ]);
  const claimTerms = poseidon4([
    witness.destination,
    witness.relayer_id,
    witness.relayer_fee,
    witness.quote_expires_at_slot,
  ]);

  return poseidon11([
    witness.request_version,
    witness.asset_id,
    witness.amount,
    witness.owner_commitment,
    inputMembership,
    witness.input_commitment,
    witness.nullifier,
    claimTerms,
    witness.tree_id,
    witness.leaf_index,
    witness.input_root,
  ]);
}

export function normalizeVantaPrivatePoolV2ClaimCircuitWitnessInput(
  input: unknown,
): VantaPrivatePoolV2ClaimCircuitWitness {
  assertRecord(input, "Claim witness input");
  assertNoUnexpectedWitnessFields(input);

  const witness: VantaPrivatePoolV2ClaimCircuitWitness = {
    amount: normalizeU128WitnessField(input.amount, "amount"),
    asset_id: normalizeWitnessField(input.asset_id, "asset_id"),
    destination: normalizeWitnessField(input.destination, "destination"),
    input_commitment: normalizeWitnessField(input.input_commitment, "input_commitment"),
    input_root: normalizeWitnessField(input.input_root, "input_root"),
    leaf_index: normalizeWitnessField(input.leaf_index, "leaf_index"),
    membership_path: normalizeWitnessFieldArray(input.membership_path, "membership_path"),
    membership_path_direction_bits: normalizeWitnessFieldArray(
      input.membership_path_direction_bits,
      "membership_path_direction_bits",
    ),
    nullifier: normalizeWitnessField(input.nullifier, "nullifier"),
    owner_commitment: normalizeWitnessField(input.owner_commitment, "owner_commitment"),
    owner_secret: normalizeWitnessField(input.owner_secret, "owner_secret"),
    quote_expires_at_slot: normalizeWitnessField(
      input.quote_expires_at_slot,
      "quote_expires_at_slot",
    ),
    relayer_fee: normalizeU128WitnessField(input.relayer_fee, "relayer_fee"),
    relayer_id: normalizeWitnessField(input.relayer_id, "relayer_id"),
    request_version: normalizeWitnessField(input.request_version, "request_version"),
    tree_id: normalizeWitnessField(input.tree_id, "tree_id"),
  };

  for (const [index, bit] of witness.membership_path_direction_bits.entries()) {
    if (bit !== 0n && bit !== 1n) {
      throw new Error(`membership_path_direction_bits[${index}] must be 0 or 1.`);
    }
  }

  if (
    witness.leaf_index !== leafIndexFromDirectionBits(witness.membership_path_direction_bits)
  ) {
    throw new Error("Claim witness leaf_index must match direction bits.");
  }

  if (witness.input_root !== computeVantaPrivatePoolV2ClaimInputRoot(witness)) {
    throw new Error("Claim witness input_root must match the input membership path.");
  }

  if (witness.nullifier !== computeVantaPrivatePoolV2ClaimNullifier(witness)) {
    throw new Error("Claim witness nullifier must match the input commitment and owner secret.");
  }

  return witness;
}

export function createVantaPrivatePoolV2ClaimCircuitFixture({
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  mode?: VantaPrivatePoolV2ClaimCircuitFixtureMode;
  witness?: VantaPrivatePoolV2ClaimCircuitWitness;
} = {}): VantaPrivatePoolV2ClaimCircuitFixture {
  const circuitWitness =
    mode === "forged-input-membership"
      ? { ...witness, input_root: witness.input_root + 1n }
      : mode === "invalid-nullifier"
      ? {
          ...witness,
          nullifier: witness.nullifier + 1n,
        }
      : mode === "invalid-amount-range"
      ? {
          ...witness,
          amount: 1n << 128n,
        }
      : witness;
  const validPublicHash = computeVantaPrivatePoolV2ClaimPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: circuitWitness.amount,
    claimPublicInputHash: toCircuitString(validPublicHash),
    destinationAddress: toCircuitString(witness.destination),
    merkleProof: toMerkleProof(circuitWitness),
    nullifier: toCircuitString(circuitWitness.nullifier),
    ownerCommitment: toCircuitString(witness.owner_commitment),
    quote: toQuote(witness),
  });

  return {
    claimPublicInputHash: mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    proofRequest,
    witness: circuitWitness,
  };
}

export function createVantaPrivatePoolV2ClaimCircuitFixtureFromWitnessInput(input: unknown) {
  return createVantaPrivatePoolV2ClaimCircuitFixture({
    witness: normalizeVantaPrivatePoolV2ClaimCircuitWitnessInput(input),
  });
}

export function createVantaPrivatePoolV2ClaimCircuitNoirInputs(
  fixture: VantaPrivatePoolV2ClaimCircuitFixture,
): VantaPrivatePoolV2ClaimCircuitNoirInputs {
  const { witness } = fixture;

  return {
    amount: toCircuitString(witness.amount),
    asset_id: toCircuitString(witness.asset_id),
    claim_public_input_hash: toCircuitString(fixture.claimPublicInputHash),
    destination: toCircuitString(witness.destination),
    input_commitment: toCircuitString(witness.input_commitment),
    input_root: toCircuitString(witness.input_root),
    leaf_index: toCircuitString(witness.leaf_index),
    membership_path: witness.membership_path.map(toCircuitString),
    membership_path_direction_bits: witness.membership_path_direction_bits.map(toCircuitString),
    nullifier: toCircuitString(witness.nullifier),
    owner_commitment: toCircuitString(witness.owner_commitment),
    owner_secret: toCircuitString(witness.owner_secret),
    quote_expires_at_slot: toCircuitString(witness.quote_expires_at_slot),
    relayer_fee: toCircuitString(witness.relayer_fee),
    relayer_id: toCircuitString(witness.relayer_id),
    request_version: toCircuitString(witness.request_version),
    tree_id: toCircuitString(witness.tree_id),
  };
}

export function serializeVantaPrivatePoolV2ClaimCircuitFixtureToToml(
  fixture: VantaPrivatePoolV2ClaimCircuitFixture,
) {
  const { witness } = fixture;

  return [
    `claim_public_input_hash = "${fixture.claimPublicInputHash.toString(10)}"`,
    `request_version = "${witness.request_version.toString(10)}"`,
    `asset_id = "${witness.asset_id.toString(10)}"`,
    `amount = "${witness.amount.toString(10)}"`,
    `owner_commitment = "${witness.owner_commitment.toString(10)}"`,
    `tree_id = "${witness.tree_id.toString(10)}"`,
    `leaf_index = "${witness.leaf_index.toString(10)}"`,
    `input_commitment = "${witness.input_commitment.toString(10)}"`,
    `input_root = "${witness.input_root.toString(10)}"`,
    `membership_path = [${witness.membership_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `membership_path_direction_bits = [${witness.membership_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `nullifier = "${witness.nullifier.toString(10)}"`,
    `destination = "${witness.destination.toString(10)}"`,
    `relayer_id = "${witness.relayer_id.toString(10)}"`,
    `relayer_fee = "${witness.relayer_fee.toString(10)}"`,
    `quote_expires_at_slot = "${witness.quote_expires_at_slot.toString(10)}"`,
    `owner_secret = "${witness.owner_secret.toString(10)}"`,
    "",
  ].join("\n");
}
