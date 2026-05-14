import { poseidon1, poseidon2, poseidon3, poseidon5, poseidon8 } from "poseidon-lite";
import {
  directionBitsForLeafIndex,
  emptyMerklePathForLeafIndex,
  VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
} from "./privatePoolV2MerkleFixtureHelpers";
import { createVantaPrivatePoolV2ShieldProofRequest } from "./privatePoolV2ProofRequests";
import type {
  VantaPrivatePoolV2Commitment,
  VantaPrivatePoolV2ProofRequest,
} from "./privatePoolV2Types";

export const VANTA_PRIVATE_POOL_V2_SHIELD_CIRCUIT_FIXTURE_VERSION =
  "vanta-private-pool-v2-shield-circuit-fixture-0.1" as const;

export type VantaPrivatePoolV2ShieldCircuitWitness = {
  amount: bigint;
  append_path: readonly bigint[];
  append_path_direction_bits: readonly bigint[];
  economics_blinding: bigint;
  economics_commitment: bigint;
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

export type VantaPrivatePoolV2ShieldCircuitWitnessInput = {
  amount: bigint | string;
  append_path: readonly (bigint | string)[];
  append_path_direction_bits: readonly (bigint | string)[];
  economics_blinding: bigint | string;
  economics_commitment: bigint | string;
  leaf_index: bigint | string;
  output_commitment: bigint | string;
  output_root: bigint | string;
  owner_commitment: bigint | string;
  previous_root: bigint | string;
  request_version: bigint | string;
  route_commitment: bigint | string;
  source_mint: bigint | string;
  target_asset_id: bigint | string;
  target_mint: bigint | string;
  tree_id: bigint | string;
};

export type VantaPrivatePoolV2ShieldCircuitNoirInputs = {
  amount: string;
  append_path: string[];
  append_path_direction_bits: string[];
  economics_blinding: string;
  economics_commitment: string;
  leaf_index: string;
  output_commitment: string;
  output_root: string;
  owner_commitment: string;
  previous_root: string;
  request_version: string;
  route_commitment: string;
  shield_public_input_hash: string;
  source_mint: string;
  target_asset_id: string;
  target_mint: string;
  tree_id: string;
};

export type VantaPrivatePoolV2ShieldCircuitFixtureMode =
  | "valid"
  | "forged-append-path"
  | "invalid-economics-commitment"
  | "invalid-binding"
  | "invalid-root"
  | "invalid-amount-range";

const SHIELD_WITNESS_FIELDS = [
  "amount",
  "append_path",
  "append_path_direction_bits",
  "economics_blinding",
  "economics_commitment",
  "leaf_index",
  "output_commitment",
  "output_root",
  "owner_commitment",
  "previous_root",
  "request_version",
  "route_commitment",
  "source_mint",
  "target_asset_id",
  "target_mint",
  "tree_id",
] as const;

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const U128_MAX = (1n << 128n) - 1n;

const DEFAULT_WITNESS_BASE = {
  amount: 1_000_000n,
  append_path: emptyMerklePathForLeafIndex(5n),
  append_path_direction_bits: directionBitsForLeafIndex(5n),
  economics_blinding: 9191n,
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
  economics_commitment: computeVantaPrivatePoolV2ShieldEconomicsCommitment({
    amount: DEFAULT_WITNESS_BASE.amount,
    economics_blinding: DEFAULT_WITNESS_BASE.economics_blinding,
    source_mint: DEFAULT_WITNESS_BASE.source_mint,
    target_asset_id: DEFAULT_WITNESS_BASE.target_asset_id,
    target_mint: DEFAULT_WITNESS_BASE.target_mint,
  }),
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
  const allowed = new Set<string>(SHIELD_WITNESS_FIELDS);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Shield witness input contains unexpected field ${key}.`);
    }
  }

  for (const key of allowed) {
    if (!(key in input)) {
      throw new Error(`Shield witness input is missing ${key}.`);
    }
  }
}

function leafIndexFromDirectionBits(directionBits: readonly bigint[]) {
  return directionBits.reduce(
    (leafIndex, bit, index) => leafIndex + (bit << BigInt(index)),
    0n,
  );
}

function toTreeCommitment(
  witness: VantaPrivatePoolV2ShieldCircuitWitness,
): VantaPrivatePoolV2Commitment {
  return {
    assetId: "hidden:economic-terms",
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

  return poseidon8([
    witness.request_version,
    witness.economics_commitment,
    witness.owner_commitment,
    witness.route_commitment,
    witness.tree_id,
    witness.leaf_index,
    witness.output_commitment,
    rootTransition,
  ]);
}

export function computeVantaPrivatePoolV2ShieldEconomicsCommitment({
  amount,
  economics_blinding,
  source_mint,
  target_asset_id,
  target_mint,
}: Pick<
  VantaPrivatePoolV2ShieldCircuitWitness,
  "amount" | "economics_blinding" | "source_mint" | "target_asset_id" | "target_mint"
>) {
  return poseidon5([
    source_mint,
    target_mint,
    target_asset_id,
    amount,
    economics_blinding,
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
  path: readonly bigint[];
  pathDirectionBits: readonly bigint[];
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

export function normalizeVantaPrivatePoolV2ShieldCircuitWitnessInput(
  input: unknown,
): VantaPrivatePoolV2ShieldCircuitWitness {
  assertRecord(input, "Shield witness input");
  assertNoUnexpectedWitnessFields(input);

  const witness: VantaPrivatePoolV2ShieldCircuitWitness = {
    amount: normalizeU128WitnessField(input.amount, "amount"),
    append_path: normalizeWitnessFieldArray(input.append_path, "append_path"),
    append_path_direction_bits: normalizeWitnessFieldArray(
      input.append_path_direction_bits,
      "append_path_direction_bits",
    ),
    economics_blinding: normalizeWitnessField(
      input.economics_blinding,
      "economics_blinding",
    ),
    economics_commitment: normalizeWitnessField(
      input.economics_commitment,
      "economics_commitment",
    ),
    leaf_index: normalizeWitnessField(input.leaf_index, "leaf_index"),
    output_commitment: normalizeWitnessField(input.output_commitment, "output_commitment"),
    output_root: normalizeWitnessField(input.output_root, "output_root"),
    owner_commitment: normalizeWitnessField(input.owner_commitment, "owner_commitment"),
    previous_root: normalizeWitnessField(input.previous_root, "previous_root"),
    request_version: normalizeWitnessField(input.request_version, "request_version"),
    route_commitment: normalizeWitnessField(input.route_commitment, "route_commitment"),
    source_mint: normalizeWitnessField(input.source_mint, "source_mint"),
    target_asset_id: normalizeWitnessField(input.target_asset_id, "target_asset_id"),
    target_mint: normalizeWitnessField(input.target_mint, "target_mint"),
    tree_id: normalizeWitnessField(input.tree_id, "tree_id"),
  };

  for (const [index, bit] of witness.append_path_direction_bits.entries()) {
    if (bit !== 0n && bit !== 1n) {
      throw new Error(`append_path_direction_bits[${index}] must be 0 or 1.`);
    }
  }

  if (witness.leaf_index !== leafIndexFromDirectionBits(witness.append_path_direction_bits)) {
    throw new Error("Shield witness leaf_index must match direction bits.");
  }

  if (
    witness.previous_root !==
    computeVantaPrivatePoolV2ShieldRootFromLeaf({
      leaf_value: 0n,
      path: witness.append_path,
      pathDirectionBits: witness.append_path_direction_bits,
    })
  ) {
    throw new Error("Shield witness previous_root must match the empty append path.");
  }

  if (
    witness.output_root !==
    computeVantaPrivatePoolV2ShieldRootFromLeaf({
      leaf_value: witness.output_commitment,
      path: witness.append_path,
      pathDirectionBits: witness.append_path_direction_bits,
    })
  ) {
    throw new Error("Shield witness output_root must match the output append path.");
  }

  if (
    witness.economics_commitment !==
    computeVantaPrivatePoolV2ShieldEconomicsCommitment(witness)
  ) {
    throw new Error("Shield witness economics_commitment must match the hidden economics fields.");
  }

  return witness;
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
      : mode === "invalid-economics-commitment"
      ? {
          ...witness,
          economics_commitment: witness.economics_commitment + 1n,
        }
      : mode === "invalid-root"
      ? {
          ...witness,
          output_root: witness.output_root + 1n,
        }
      : mode === "invalid-amount-range"
      ? createInvalidAmountRangeWitness(witness)
      : witness;
  const validPublicHash = computeVantaPrivatePoolV2ShieldPublicInputHash(circuitWitness);
  const proofRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: circuitWitness.amount,
    economicsCommitment: toCircuitString(circuitWitness.economics_commitment),
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

export function createVantaPrivatePoolV2ShieldCircuitFixtureFromWitnessInput(input: unknown) {
  return createVantaPrivatePoolV2ShieldCircuitFixture({
    witness: normalizeVantaPrivatePoolV2ShieldCircuitWitnessInput(input),
  });
}

export function createVantaPrivatePoolV2ShieldCircuitNoirInputs(
  fixture: VantaPrivatePoolV2ShieldCircuitFixture,
): VantaPrivatePoolV2ShieldCircuitNoirInputs {
  const { witness } = fixture;

  return {
    amount: toCircuitString(witness.amount),
    append_path: witness.append_path.map(toCircuitString),
    append_path_direction_bits: witness.append_path_direction_bits.map(toCircuitString),
    economics_blinding: toCircuitString(witness.economics_blinding),
    economics_commitment: toCircuitString(witness.economics_commitment),
    leaf_index: toCircuitString(witness.leaf_index),
    output_commitment: toCircuitString(witness.output_commitment),
    output_root: toCircuitString(witness.output_root),
    owner_commitment: toCircuitString(witness.owner_commitment),
    previous_root: toCircuitString(witness.previous_root),
    request_version: toCircuitString(witness.request_version),
    route_commitment: toCircuitString(witness.route_commitment),
    shield_public_input_hash: toCircuitString(fixture.shieldPublicInputHash),
    source_mint: toCircuitString(witness.source_mint),
    target_asset_id: toCircuitString(witness.target_asset_id),
    target_mint: toCircuitString(witness.target_mint),
    tree_id: toCircuitString(witness.tree_id),
  };
}

function createInvalidAmountRangeWitness(
  witness: VantaPrivatePoolV2ShieldCircuitWitness,
): VantaPrivatePoolV2ShieldCircuitWitness {
  const amount = 1n << 128n;

  return {
    ...witness,
    amount,
    economics_commitment: computeVantaPrivatePoolV2ShieldEconomicsCommitment({
      amount,
      economics_blinding: witness.economics_blinding,
      source_mint: witness.source_mint,
      target_asset_id: witness.target_asset_id,
      target_mint: witness.target_mint,
    }),
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
    `economics_blinding = "${witness.economics_blinding.toString(10)}"`,
    `economics_commitment = "${witness.economics_commitment.toString(10)}"`,
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
