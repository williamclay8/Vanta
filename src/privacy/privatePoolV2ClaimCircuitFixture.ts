import { poseidon1, poseidon2, poseidon3, poseidon4, poseidon11 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
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

export type VantaPrivatePoolV2ClaimCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-amount-range";

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
