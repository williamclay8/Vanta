import { poseidon1, poseidon2, poseidon4, poseidon11 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
} from "./privatePoolV2MerkleFixtureHelpers";
import { createVantaPrivatePoolV2SendProofRequest } from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SEND_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-send-circuit-fixture-0.2" as const;

export type VantaPrivatePoolV2SendCircuitWitness = {
  asset_id_commitment: bigint;
  change_leaf_index: bigint;
  change_amount: bigint;
  change_output_commitment: bigint;
  change_output_root: bigint;
  economics_blinding: bigint;
  economics_commitment: bigint;
  input_amount: bigint;
  input_commitment: bigint;
  input_leaf_index: bigint;
  input_root: bigint;
  membership_path: readonly bigint[];
  membership_path_direction_bits: readonly bigint[];
  nullifier: bigint;
  owner_commitment: bigint;
  owner_secret: bigint;
  change_append_path: readonly bigint[];
  change_append_path_direction_bits: readonly bigint[];
  recipient_amount: bigint;
  recipient_leaf_index: bigint;
  recipient_append_path: readonly bigint[];
  recipient_append_path_direction_bits: readonly bigint[];
  recipient_output_commitment: bigint;
  recipient_output_root: bigint;
  request_version: bigint;
  send_context_tag: bigint;
};

export type VantaPrivatePoolV2SendCircuitFixture = {
  proofRequest: VantaPrivatePoolV2ProofRequest;
  sendPublicInputHash: bigint;
  witness: VantaPrivatePoolV2SendCircuitWitness;
};

export type VantaPrivatePoolV2SendCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "forged-recipient-append-path"
  | "forged-change-append-path"
  | "invalid-amount-conservation"
  | "invalid-amount-range"
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-output-root";

const DEFAULT_WITNESS_ECONOMICS = {
  change_amount: 1250n,
  economics_blinding: 1203n,
  input_amount: 5000n,
  recipient_amount: 3750n,
};

const DEFAULT_WITNESS_BASE = {
  asset_id_commitment: 707n,
  change_leaf_index: 7n,
  change_amount: DEFAULT_WITNESS_ECONOMICS.change_amount,
  change_output_commitment: 1001n,
  economics_blinding: DEFAULT_WITNESS_ECONOMICS.economics_blinding,
  economics_commitment: computeVantaPrivatePoolV2SendEconomicsCommitment(
    DEFAULT_WITNESS_ECONOMICS,
  ),
  input_amount: DEFAULT_WITNESS_ECONOMICS.input_amount,
  input_commitment: 303n,
  input_leaf_index: 5n,
  membership_path: [] as readonly bigint[],
  membership_path_direction_bits: [] as readonly bigint[],
  owner_commitment: 606n,
  owner_secret: 404n,
  recipient_amount: DEFAULT_WITNESS_ECONOMICS.recipient_amount,
  recipient_leaf_index: 6n,
  recipient_output_commitment: 909n,
  request_version: 101n,
  send_context_tag: 1102n,
};

const DEFAULT_TREE = buildVantaPrivatePoolV2SendTrees(DEFAULT_WITNESS_BASE);

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  input_root: DEFAULT_TREE.inputRoot,
  membership_path: DEFAULT_TREE.inputMembershipPath,
  membership_path_direction_bits: DEFAULT_TREE.inputMembershipPathDirectionBits,
  recipient_append_path: DEFAULT_TREE.recipientAppendPath,
  recipient_append_path_direction_bits: DEFAULT_TREE.recipientAppendPathDirectionBits,
};

const DEFAULT_WITH_NULLIFIER = {
  ...DEFAULT_WITH_ROOT,
  nullifier: computeVantaPrivatePoolV2SendNullifier(DEFAULT_WITH_ROOT),
};

const DEFAULT_WITH_RECIPIENT_ROOT = {
  ...DEFAULT_WITH_NULLIFIER,
  recipient_output_root: DEFAULT_TREE.recipientOutputRoot,
  change_append_path: DEFAULT_TREE.changeAppendPath,
  change_append_path_direction_bits: DEFAULT_TREE.changeAppendPathDirectionBits,
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_RECIPIENT_ROOT,
  change_output_root: DEFAULT_TREE.changeOutputRoot,
} satisfies VantaPrivatePoolV2SendCircuitWitness;

function toCircuitString(value: bigint) {
  return value.toString(10);
}

export function computeVantaPrivatePoolV2SendNullifier(
  witness: Pick<VantaPrivatePoolV2SendCircuitWitness, "input_commitment" | "owner_secret">,
) {
  return poseidon2([witness.input_commitment, witness.owner_secret]);
}

export function computeVantaPrivatePoolV2SendEconomicsCommitment(
  witness: Pick<
    VantaPrivatePoolV2SendCircuitWitness,
    "input_amount" | "recipient_amount" | "change_amount" | "economics_blinding"
  >,
) {
  return poseidon4([
    witness.input_amount,
    witness.recipient_amount,
    witness.change_amount,
    witness.economics_blinding,
  ]);
}

export function computeVantaPrivatePoolV2SendLeaf(
  witness: Pick<VantaPrivatePoolV2SendCircuitWitness, "input_commitment">,
) {
  return poseidon1([witness.input_commitment]);
}

function computeVantaPrivatePoolV2SendLeafValue(value: bigint) {
  return poseidon1([value]);
}

export function computeVantaPrivatePoolV2SendNode({
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

export function computeVantaPrivatePoolV2SendInputRoot(
  witness: Pick<
    VantaPrivatePoolV2SendCircuitWitness,
    "input_commitment" | "membership_path" | "membership_path_direction_bits"
  >,
) {
  return witness.membership_path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2SendNode({
        current,
        directionBit: witness.membership_path_direction_bits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2SendLeaf(witness),
  );
}

export function computeVantaPrivatePoolV2SendRootFromLeaf({
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
      computeVantaPrivatePoolV2SendNode({
        current,
        directionBit: pathDirectionBits[index] ?? 0n,
        sibling,
      }),
    computeVantaPrivatePoolV2SendLeafValue(leafValue),
  );
}

export function computeVantaPrivatePoolV2SendPublicInputHash(
  witness: VantaPrivatePoolV2SendCircuitWitness,
) {
  const outputTransition = poseidon4([
    witness.recipient_leaf_index,
    witness.recipient_output_root,
    witness.change_leaf_index,
    witness.change_output_root,
  ]);

  return poseidon11([
    witness.request_version,
    witness.input_root,
    witness.input_commitment,
    witness.nullifier,
    witness.recipient_output_commitment,
    witness.change_output_commitment,
    witness.asset_id_commitment,
    witness.economics_commitment,
    witness.owner_commitment,
    witness.send_context_tag,
    outputTransition,
  ]);
}

export function createVantaPrivatePoolV2SendCircuitFixture({
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  mode?: VantaPrivatePoolV2SendCircuitFixtureMode;
  witness?: VantaPrivatePoolV2SendCircuitWitness;
} = {}): VantaPrivatePoolV2SendCircuitFixture {
  const circuitWitness =
    mode === "forged-input-membership"
      ? forgeVantaPrivatePoolV2SendInputMembership(witness)
      : mode === "forged-recipient-append-path"
        ? {
            ...witness,
            recipient_append_path: forgePath(witness.recipient_append_path),
          }
      : mode === "forged-change-append-path"
        ? {
            ...witness,
            change_append_path: forgePath(witness.change_append_path),
          }
      : mode === "invalid-amount-conservation"
        ? createInvalidAmountConservationWitness(witness)
      : mode === "invalid-amount-range"
        ? createInvalidAmountRangeWitness(witness)
      : mode === "invalid-nullifier"
      ? {
          ...witness,
          nullifier: witness.nullifier + 1n,
        }
      : mode === "invalid-output-root"
        ? {
            ...witness,
            change_output_root: witness.change_output_root + 1n,
          }
        : witness;
  const validPublicHash = computeVantaPrivatePoolV2SendPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: toCircuitString(witness.asset_id_commitment),
    changeLeafIndex: toCircuitString(witness.change_leaf_index),
    changeOutputCommitment: toCircuitString(witness.change_output_commitment),
    changeOutputRoot: toCircuitString(circuitWitness.change_output_root),
    economicsCommitment: toCircuitString(circuitWitness.economics_commitment),
    inputCommitment: toCircuitString(witness.input_commitment),
    inputRoot: toCircuitString(witness.input_root),
    nullifier: toCircuitString(circuitWitness.nullifier),
    ownerCommitment: toCircuitString(witness.owner_commitment),
    recipientLeafIndex: toCircuitString(witness.recipient_leaf_index),
    recipientOutputCommitment: toCircuitString(witness.recipient_output_commitment),
    recipientOutputRoot: toCircuitString(circuitWitness.recipient_output_root),
    sendContextTag: toCircuitString(witness.send_context_tag),
    sendPublicInputHash: toCircuitString(validPublicHash),
  });

  return {
    proofRequest,
    sendPublicInputHash: mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    witness: circuitWitness,
  };
}

function createInvalidAmountConservationWitness(
  witness: VantaPrivatePoolV2SendCircuitWitness,
): VantaPrivatePoolV2SendCircuitWitness {
  const unbalancedWitness = {
    ...witness,
    change_amount: witness.change_amount + 1n,
  };

  return {
    ...unbalancedWitness,
    economics_commitment: computeVantaPrivatePoolV2SendEconomicsCommitment(
      unbalancedWitness,
    ),
  };
}

function createInvalidAmountRangeWitness(
  witness: VantaPrivatePoolV2SendCircuitWitness,
): VantaPrivatePoolV2SendCircuitWitness {
  const outOfRangeInputAmount = 1n << 128n;
  const rangeOverflowWitness = {
    ...witness,
    input_amount: outOfRangeInputAmount,
    recipient_amount: outOfRangeInputAmount - witness.change_amount,
  };

  return {
    ...rangeOverflowWitness,
    economics_commitment: computeVantaPrivatePoolV2SendEconomicsCommitment(
      rangeOverflowWitness,
    ),
  };
}

function forgeVantaPrivatePoolV2SendInputMembership(
  witness: VantaPrivatePoolV2SendCircuitWitness,
): VantaPrivatePoolV2SendCircuitWitness {
  const forgedInputRoot = witness.input_root + 1n;

  return {
    ...witness,
    input_root: forgedInputRoot,
  };
}

function forgePath(path: readonly bigint[]) {
  return path.map((value, index) => (index === 0 ? value + 1n : value));
}

function buildVantaPrivatePoolV2SendTrees(
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
  const recipientTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: witness.input_leaf_index,
        leafValue: witness.input_commitment,
      },
      {
        leafIndex: witness.recipient_leaf_index,
        leafValue: witness.recipient_output_commitment,
      },
    ],
  });
  const changeTree = buildVantaPrivatePoolV2SparseMerkleTree({
    leaves: [
      {
        leafIndex: witness.input_leaf_index,
        leafValue: witness.input_commitment,
      },
      {
        leafIndex: witness.recipient_leaf_index,
        leafValue: witness.recipient_output_commitment,
      },
      {
        leafIndex: witness.change_leaf_index,
        leafValue: witness.change_output_commitment,
      },
    ],
  });

  return {
    changeAppendPath: recipientTree.pathForLeaf(witness.change_leaf_index),
    changeAppendPathDirectionBits: directionBitsForLeafIndex(witness.change_leaf_index),
    changeOutputRoot: changeTree.root,
    inputMembershipPath: inputTree.pathForLeaf(witness.input_leaf_index),
    inputMembershipPathDirectionBits: directionBitsForLeafIndex(witness.input_leaf_index),
    inputRoot: inputTree.root,
    recipientAppendPath: inputTree.pathForLeaf(witness.recipient_leaf_index),
    recipientAppendPathDirectionBits: directionBitsForLeafIndex(witness.recipient_leaf_index),
    recipientOutputRoot: recipientTree.root,
  };
}

export function serializeVantaPrivatePoolV2SendCircuitFixtureToToml(
  fixture: VantaPrivatePoolV2SendCircuitFixture,
) {
  const { witness } = fixture;

  return [
    `send_public_input_hash = "${fixture.sendPublicInputHash.toString(10)}"`,
    `request_version = "${witness.request_version.toString(10)}"`,
    `input_root = "${witness.input_root.toString(10)}"`,
    `input_commitment = "${witness.input_commitment.toString(10)}"`,
    `input_leaf_index = "${witness.input_leaf_index.toString(10)}"`,
    `membership_path = [${witness.membership_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `membership_path_direction_bits = [${witness.membership_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `nullifier = "${witness.nullifier.toString(10)}"`,
    `recipient_output_commitment = "${witness.recipient_output_commitment.toString(10)}"`,
    `change_output_commitment = "${witness.change_output_commitment.toString(10)}"`,
    `asset_id_commitment = "${witness.asset_id_commitment.toString(10)}"`,
    `economics_commitment = "${witness.economics_commitment.toString(10)}"`,
    `owner_commitment = "${witness.owner_commitment.toString(10)}"`,
    `send_context_tag = "${witness.send_context_tag.toString(10)}"`,
    `recipient_leaf_index = "${witness.recipient_leaf_index.toString(10)}"`,
    `recipient_output_root = "${witness.recipient_output_root.toString(10)}"`,
    `recipient_append_path = [${witness.recipient_append_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `recipient_append_path_direction_bits = [${witness.recipient_append_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `change_leaf_index = "${witness.change_leaf_index.toString(10)}"`,
    `change_output_root = "${witness.change_output_root.toString(10)}"`,
    `change_append_path = [${witness.change_append_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `change_append_path_direction_bits = [${witness.change_append_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `input_amount = "${witness.input_amount.toString(10)}"`,
    `recipient_amount = "${witness.recipient_amount.toString(10)}"`,
    `change_amount = "${witness.change_amount.toString(10)}"`,
    `economics_blinding = "${witness.economics_blinding.toString(10)}"`,
    `owner_secret = "${witness.owner_secret.toString(10)}"`,
    "",
  ].join("\n");
}
