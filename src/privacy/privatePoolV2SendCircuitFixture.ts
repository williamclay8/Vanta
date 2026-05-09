import { poseidon1, poseidon2, poseidon3, poseidon4, poseidon11 } from "poseidon-lite";
import { createVantaPrivatePoolV2SendProofRequest } from "./privatePoolV2ProofRequests";
import type { VantaPrivatePoolV2ProofRequest } from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SEND_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-send-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2SendCircuitWitness = {
  asset_id_commitment: bigint;
  change_leaf_index: bigint;
  change_output_commitment: bigint;
  change_output_root: bigint;
  economics_commitment: bigint;
  input_commitment: bigint;
  input_leaf_index: bigint;
  input_root: bigint;
  membership_path: readonly [bigint, bigint, bigint];
  membership_path_direction_bits: readonly [bigint, bigint, bigint];
  nullifier: bigint;
  owner_commitment: bigint;
  owner_secret: bigint;
  recipient_leaf_index: bigint;
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
  | "invalid-binding"
  | "invalid-nullifier"
  | "invalid-output-root";

const DEFAULT_WITNESS_BASE = {
  asset_id_commitment: 707n,
  change_leaf_index: 2n,
  change_output_commitment: 1001n,
  economics_commitment: 808n,
  input_commitment: 303n,
  input_leaf_index: 5n,
  membership_path: [1202n, 1303n, 1404n] as const,
  membership_path_direction_bits: [1n, 0n, 1n] as const,
  owner_commitment: 606n,
  owner_secret: 404n,
  recipient_leaf_index: 1n,
  recipient_output_commitment: 909n,
  request_version: 101n,
  send_context_tag: 1102n,
};

const DEFAULT_WITH_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  input_root: computeVantaPrivatePoolV2SendInputRoot(DEFAULT_WITNESS_BASE),
};

const DEFAULT_WITH_NULLIFIER = {
  ...DEFAULT_WITH_ROOT,
  nullifier: computeVantaPrivatePoolV2SendNullifier(DEFAULT_WITH_ROOT),
};

const DEFAULT_WITH_RECIPIENT_ROOT = {
  ...DEFAULT_WITH_NULLIFIER,
  recipient_output_root: computeVantaPrivatePoolV2SendAppendRoot({
    leaf_index: DEFAULT_WITH_NULLIFIER.recipient_leaf_index,
    output_commitment: DEFAULT_WITH_NULLIFIER.recipient_output_commitment,
    previous_root: DEFAULT_WITH_NULLIFIER.input_root,
  }),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_RECIPIENT_ROOT,
  change_output_root: computeVantaPrivatePoolV2SendAppendRoot({
    leaf_index: DEFAULT_WITH_RECIPIENT_ROOT.change_leaf_index,
    output_commitment: DEFAULT_WITH_RECIPIENT_ROOT.change_output_commitment,
    previous_root: DEFAULT_WITH_RECIPIENT_ROOT.recipient_output_root,
  }),
} satisfies VantaPrivatePoolV2SendCircuitWitness;

function toCircuitString(value: bigint) {
  return value.toString(10);
}

export function computeVantaPrivatePoolV2SendNullifier(
  witness: Pick<VantaPrivatePoolV2SendCircuitWitness, "input_commitment" | "owner_secret">,
) {
  return poseidon2([witness.input_commitment, witness.owner_secret]);
}

export function computeVantaPrivatePoolV2SendLeaf(
  witness: Pick<VantaPrivatePoolV2SendCircuitWitness, "input_commitment">,
) {
  return poseidon1([witness.input_commitment]);
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
    ? poseidon3([sibling, current, directionBit])
    : poseidon3([current, sibling, directionBit]);
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

export function computeVantaPrivatePoolV2SendAppendRoot({
  leaf_index,
  output_commitment,
  previous_root,
}: {
  leaf_index: bigint;
  output_commitment: bigint;
  previous_root: bigint;
}) {
  return poseidon3([previous_root, output_commitment, leaf_index]);
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
    economicsCommitment: toCircuitString(witness.economics_commitment),
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

function forgeVantaPrivatePoolV2SendInputMembership(
  witness: VantaPrivatePoolV2SendCircuitWitness,
): VantaPrivatePoolV2SendCircuitWitness {
  const forgedInputRoot = witness.input_root + 1n;
  const recipientOutputRoot = computeVantaPrivatePoolV2SendAppendRoot({
    leaf_index: witness.recipient_leaf_index,
    output_commitment: witness.recipient_output_commitment,
    previous_root: forgedInputRoot,
  });

  return {
    ...witness,
    change_output_root: computeVantaPrivatePoolV2SendAppendRoot({
      leaf_index: witness.change_leaf_index,
      output_commitment: witness.change_output_commitment,
      previous_root: recipientOutputRoot,
    }),
    input_root: forgedInputRoot,
    recipient_output_root: recipientOutputRoot,
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
    `change_leaf_index = "${witness.change_leaf_index.toString(10)}"`,
    `change_output_root = "${witness.change_output_root.toString(10)}"`,
    `owner_secret = "${witness.owner_secret.toString(10)}"`,
    "",
  ].join("\n");
}
