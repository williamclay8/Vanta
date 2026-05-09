import { poseidon1, poseidon2, poseidon3, poseidon11 } from "poseidon-lite";
import { createVantaPrivatePoolV2ShieldProofRequest } from "./privatePoolV2ProofRequests";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2ProofRequest,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SHIELD_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-shield-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2ShieldCircuitWitness = {
  amount: bigint;
  append_path: readonly [bigint, bigint, bigint];
  append_path_direction_bits: readonly [bigint, bigint, bigint];
  leaf_index: bigint;
  output_commitment: bigint;
  output_root: bigint;
  owner_commitment: bigint;
  previous_root: bigint;
  request_version: bigint;
  route_commitment: bigint;
  source_mint: bigint;
  target_asset_id: bigint;
  target_mint: bigint;
  tree_id: bigint;
};

export type VantaPrivatePoolV2ShieldCircuitFixture = {
  proofRequest: VantaPrivatePoolV2ProofRequest;
  shieldPublicInputHash: bigint;
  witness: VantaPrivatePoolV2ShieldCircuitWitness;
};

export type VantaPrivatePoolV2ShieldCircuitFixtureMode =
  | "valid"
  | "forged-append-path"
  | "invalid-binding"
  | "invalid-root";

const DEFAULT_WITNESS_BASE = {
  amount: 1_000_000n,
  append_path: [1111n, 1222n, 1333n] as const,
  append_path_direction_bits: [1n, 0n, 1n] as const,
  leaf_index: 5n,
  output_commitment: 808n,
  owner_commitment: 505n,
  request_version: 101n,
  route_commitment: 606n,
  source_mint: 202n,
  target_asset_id: 404n,
  target_mint: 303n,
  tree_id: 707n,
};

const DEFAULT_WITH_PREVIOUS_ROOT = {
  ...DEFAULT_WITNESS_BASE,
  previous_root: computeVantaPrivatePoolV2ShieldRootFromLeaf({
    leaf_value: 0n,
    path: DEFAULT_WITNESS_BASE.append_path,
    pathDirectionBits: DEFAULT_WITNESS_BASE.append_path_direction_bits,
  }),
};

const DEFAULT_WITNESS = {
  ...DEFAULT_WITH_PREVIOUS_ROOT,
  output_root: computeVantaPrivatePoolV2ShieldRootFromLeaf({
    leaf_value: DEFAULT_WITH_PREVIOUS_ROOT.output_commitment,
    path: DEFAULT_WITH_PREVIOUS_ROOT.append_path,
    pathDirectionBits: DEFAULT_WITH_PREVIOUS_ROOT.append_path_direction_bits,
  }),
} satisfies VantaPrivatePoolV2ShieldCircuitWitness;

function toCircuitString(value: bigint) {
  return value.toString(10);
}

function toTreeCommitment(
  witness: VantaPrivatePoolV2ShieldCircuitWitness,
): VantaPrivatePoolV2Commitment {
  return {
    assetId: toCircuitString(witness.target_asset_id),
    commitment: toCircuitString(witness.output_commitment),
    leafIndex: Number(witness.leaf_index),
    merkleRoot: toCircuitString(witness.output_root),
    treeId: toCircuitString(witness.tree_id),
  };
}

export function computeVantaPrivatePoolV2ShieldPublicInputHash(
  witness: VantaPrivatePoolV2ShieldCircuitWitness,
) {
  const rootTransition = poseidon2([witness.previous_root, witness.output_root]);

  return poseidon11([
    witness.request_version,
    witness.source_mint,
    witness.target_mint,
    witness.target_asset_id,
    witness.amount,
    witness.owner_commitment,
    witness.route_commitment,
    witness.tree_id,
    witness.leaf_index,
    witness.output_commitment,
    rootTransition,
  ]);
}

export function computeVantaPrivatePoolV2ShieldNode({
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

export function computeVantaPrivatePoolV2ShieldRootFromLeaf({
  leaf_value,
  path,
  pathDirectionBits,
}: {
  leaf_value: bigint;
  path: readonly [bigint, bigint, bigint];
  pathDirectionBits: readonly [bigint, bigint, bigint];
}) {
  return path.reduce(
    (current, sibling, index) =>
      computeVantaPrivatePoolV2ShieldNode({
        current,
        directionBit: pathDirectionBits[index] ?? 0n,
        sibling,
      }),
    poseidon1([leaf_value]),
  );
}

export function computeVantaPrivatePoolV2ShieldLegacyAppendRoot(
  witness: Pick<
    VantaPrivatePoolV2ShieldCircuitWitness,
    "leaf_index" | "output_commitment" | "previous_root"
  >,
) {
  return poseidon3([witness.previous_root, witness.output_commitment, witness.leaf_index]);
}

export function createVantaPrivatePoolV2ShieldCircuitFixture({
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  mode?: VantaPrivatePoolV2ShieldCircuitFixtureMode;
  witness?: VantaPrivatePoolV2ShieldCircuitWitness;
} = {}): VantaPrivatePoolV2ShieldCircuitFixture {
  const circuitWitness =
    mode === "forged-append-path"
      ? forgeVantaPrivatePoolV2ShieldAppendPath(witness)
      : mode === "invalid-root"
      ? {
          ...witness,
          output_root: witness.output_root + 1n,
        }
      : witness;
  const validPublicHash = computeVantaPrivatePoolV2ShieldPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: witness.amount,
    ownerCommitment: toCircuitString(witness.owner_commitment),
    previousRoot: toCircuitString(witness.previous_root),
    routeCommitment: toCircuitString(witness.route_commitment),
    shieldPublicInputHash: toCircuitString(validPublicHash),
    sourceMintAddress: toCircuitString(witness.source_mint),
    targetAssetId: toCircuitString(witness.target_asset_id),
    targetMintAddress: toCircuitString(witness.target_mint),
    treeCommitment: toTreeCommitment(circuitWitness),
  });

  return {
    proofRequest,
    shieldPublicInputHash: mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    witness: circuitWitness,
  };
}

function forgeVantaPrivatePoolV2ShieldAppendPath(
  witness: VantaPrivatePoolV2ShieldCircuitWitness,
): VantaPrivatePoolV2ShieldCircuitWitness {
  const forgedPreviousRoot = 909n;

  return {
    ...witness,
    output_root: computeVantaPrivatePoolV2ShieldLegacyAppendRoot({
      leaf_index: witness.leaf_index,
      output_commitment: witness.output_commitment,
      previous_root: forgedPreviousRoot,
    }),
    previous_root: forgedPreviousRoot,
  };
}

export function serializeVantaPrivatePoolV2ShieldCircuitFixtureToToml(
  fixture: VantaPrivatePoolV2ShieldCircuitFixture,
) {
  const { witness } = fixture;

  return [
    `shield_public_input_hash = "${fixture.shieldPublicInputHash.toString(10)}"`,
    `request_version = "${witness.request_version.toString(10)}"`,
    `source_mint = "${witness.source_mint.toString(10)}"`,
    `target_mint = "${witness.target_mint.toString(10)}"`,
    `target_asset_id = "${witness.target_asset_id.toString(10)}"`,
    `amount = "${witness.amount.toString(10)}"`,
    `owner_commitment = "${witness.owner_commitment.toString(10)}"`,
    `route_commitment = "${witness.route_commitment.toString(10)}"`,
    `tree_id = "${witness.tree_id.toString(10)}"`,
    `leaf_index = "${witness.leaf_index.toString(10)}"`,
    `output_commitment = "${witness.output_commitment.toString(10)}"`,
    `previous_root = "${witness.previous_root.toString(10)}"`,
    `output_root = "${witness.output_root.toString(10)}"`,
    `append_path = [${witness.append_path.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    `append_path_direction_bits = [${witness.append_path_direction_bits.map((value) => `"${value.toString(10)}"`).join(", ")}]`,
    "",
  ].join("\n");
}
