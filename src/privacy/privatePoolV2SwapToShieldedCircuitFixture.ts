import { poseidon1, poseidon2, poseidon12 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
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

export type VantaPrivatePoolV2SwapToShieldedCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "forged-output-append-path"
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-output-root";

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
