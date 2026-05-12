import { poseidon1, poseidon2, poseidon4, poseidon12 } from "poseidon-lite";
import {
  buildVantaPrivatePoolV2SparseMerkleTree,
  directionBitsForLeafIndex,
  VANTA_PRIVATE_POOL_V2_CIRCUIT_MERKLE_DEPTH,
} from "./privatePoolV2MerkleFixtureHelpers";
import {
  createVantaPrivatePoolV2SendProofRequest,
  deriveVantaPrivatePoolV2MemoCiphertextBodyHashField,
} from "./privatePoolV2ProofRequests";
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
  change_memo_ciphertext_body_hash_field: bigint;
  change_append_path: readonly bigint[];
  change_append_path_direction_bits: readonly bigint[];
  recipient_memo_ciphertext_body_hash_field: bigint;
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

export type VantaPrivatePoolV2SendCircuitFixtureMemoBodyHashes = {
  changeMemoCiphertextBodyHash?: string | undefined;
  recipientMemoCiphertextBodyHash?: string | undefined;
};

export type VantaPrivatePoolV2SendCircuitWitnessInput = {
  asset_id_commitment: bigint | string;
  change_append_path: readonly (bigint | string)[];
  change_append_path_direction_bits: readonly (bigint | string)[];
  change_amount: bigint | string;
  change_leaf_index: bigint | string;
  change_memo_ciphertext_body_hash: string;
  change_memo_ciphertext_body_hash_field: bigint | string;
  change_output_commitment: bigint | string;
  change_output_root: bigint | string;
  economics_blinding: bigint | string;
  economics_commitment: bigint | string;
  input_amount: bigint | string;
  input_commitment: bigint | string;
  input_leaf_index: bigint | string;
  input_root: bigint | string;
  membership_path: readonly (bigint | string)[];
  membership_path_direction_bits: readonly (bigint | string)[];
  nullifier: bigint | string;
  owner_commitment: bigint | string;
  owner_secret: bigint | string;
  recipient_amount: bigint | string;
  recipient_append_path: readonly (bigint | string)[];
  recipient_append_path_direction_bits: readonly (bigint | string)[];
  recipient_leaf_index: bigint | string;
  recipient_memo_ciphertext_body_hash: string;
  recipient_memo_ciphertext_body_hash_field: bigint | string;
  recipient_output_commitment: bigint | string;
  recipient_output_root: bigint | string;
  request_version: bigint | string;
  send_context_tag: bigint | string;
};

export type VantaPrivatePoolV2SendCircuitFixtureMode =
  | "valid"
  | "forged-input-membership"
  | "forged-recipient-append-path"
  | "forged-change-append-path"
  | "invalid-amount-conservation"
  | "invalid-amount-range"
  | "invalid-binding"
  | "invalid-memo-ciphertext-hash"
  | "invalid-nullifier"
  | "invalid-output-root";

const DEFAULT_WITNESS_ECONOMICS = {
  change_amount: 1250n,
  economics_blinding: 1203n,
  input_amount: 5000n,
  recipient_amount: 3750n,
};

const DEFAULT_RECIPIENT_MEMO_CIPHERTEXT_BODY_HASH_HEX = "11".repeat(32);
const DEFAULT_CHANGE_MEMO_CIPHERTEXT_BODY_HASH_HEX = "22".repeat(32);

function splitMemoCiphertextBodyHashHex(hex: string) {
  return {
    hi: BigInt(`0x${hex.slice(0, 32)}`),
    lo: BigInt(`0x${hex.slice(32)}`),
  };
}

function memoCiphertextBodyHashFieldFromHex(hex: string) {
  const limbs = splitMemoCiphertextBodyHashHex(hex);
  return poseidon2([limbs.hi, limbs.lo]);
}

function memoCiphertextBodyHashFromHex(hex: string) {
  return `sha256:${hex}`;
}

const DEFAULT_MEMO_CIPHERTEXT_BODY_HASHES = {
  changeMemoCiphertextBodyHash: memoCiphertextBodyHashFromHex(
    DEFAULT_CHANGE_MEMO_CIPHERTEXT_BODY_HASH_HEX,
  ),
  recipientMemoCiphertextBodyHash: memoCiphertextBodyHashFromHex(
    DEFAULT_RECIPIENT_MEMO_CIPHERTEXT_BODY_HASH_HEX,
  ),
} satisfies Required<VantaPrivatePoolV2SendCircuitFixtureMemoBodyHashes>;

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
  change_memo_ciphertext_body_hash_field: memoCiphertextBodyHashFieldFromHex(
    DEFAULT_CHANGE_MEMO_CIPHERTEXT_BODY_HASH_HEX,
  ),
  recipient_memo_ciphertext_body_hash_field: memoCiphertextBodyHashFieldFromHex(
    DEFAULT_RECIPIENT_MEMO_CIPHERTEXT_BODY_HASH_HEX,
  ),
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

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const U128_MAX = (1n << 128n) - 1n;

const SEND_WITNESS_FIELDS = [
  "asset_id_commitment",
  "change_append_path",
  "change_append_path_direction_bits",
  "change_amount",
  "change_leaf_index",
  "change_memo_ciphertext_body_hash",
  "change_memo_ciphertext_body_hash_field",
  "change_output_commitment",
  "change_output_root",
  "economics_blinding",
  "economics_commitment",
  "input_amount",
  "input_commitment",
  "input_leaf_index",
  "input_root",
  "membership_path",
  "membership_path_direction_bits",
  "nullifier",
  "owner_commitment",
  "owner_secret",
  "recipient_amount",
  "recipient_append_path",
  "recipient_append_path_direction_bits",
  "recipient_leaf_index",
  "recipient_memo_ciphertext_body_hash",
  "recipient_memo_ciphertext_body_hash_field",
  "recipient_output_commitment",
  "recipient_output_root",
  "request_version",
  "send_context_tag",
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

function normalizeWitnessAmount(value: unknown, label: string) {
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

function normalizeMemoCiphertextBodyHash(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a sha256 memo ciphertext body hash string.`);
  }

  const trimmed = value.trim();
  deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(trimmed, label);
  return trimmed;
}

function assertNoUnexpectedWitnessFields(input: Record<string, unknown>) {
  const allowed = new Set<string>(SEND_WITNESS_FIELDS);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Send witness input contains unexpected field ${key}.`);
    }
  }

  for (const key of allowed) {
    if (!(key in input)) {
      throw new Error(`Send witness input is missing ${key}.`);
    }
  }
}

function assertDirectionBits(bits: readonly bigint[], label: string) {
  for (const [index, bit] of bits.entries()) {
    if (bit !== 0n && bit !== 1n) {
      throw new Error(`${label}[${index}] must be 0 or 1.`);
    }
  }
}

function leafIndexFromDirectionBits(directionBits: readonly bigint[]) {
  return directionBits.reduce(
    (leafIndex, bit, index) => leafIndex + (bit << BigInt(index)),
    0n,
  );
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

  const memoDiscovery = poseidon2([
    witness.recipient_memo_ciphertext_body_hash_field,
    witness.change_memo_ciphertext_body_hash_field,
  ]);

  return poseidon12([
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
    memoDiscovery,
  ]);
}

export function normalizeVantaPrivatePoolV2SendCircuitWitnessInput(input: unknown): {
  memoCiphertextBodyHashes: Required<VantaPrivatePoolV2SendCircuitFixtureMemoBodyHashes>;
  witness: VantaPrivatePoolV2SendCircuitWitness;
} {
  assertRecord(input, "Send witness input");
  assertNoUnexpectedWitnessFields(input);

  const memoCiphertextBodyHashes = {
    changeMemoCiphertextBodyHash: normalizeMemoCiphertextBodyHash(
      input.change_memo_ciphertext_body_hash,
      "change memo ciphertext body hash",
    ),
    recipientMemoCiphertextBodyHash: normalizeMemoCiphertextBodyHash(
      input.recipient_memo_ciphertext_body_hash,
      "recipient memo ciphertext body hash",
    ),
  };
  const witness: VantaPrivatePoolV2SendCircuitWitness = {
    asset_id_commitment: normalizeWitnessField(
      input.asset_id_commitment,
      "asset_id_commitment",
    ),
    change_amount: normalizeWitnessAmount(input.change_amount, "change_amount"),
    change_append_path: normalizeWitnessFieldArray(
      input.change_append_path,
      "change_append_path",
    ),
    change_append_path_direction_bits: normalizeWitnessFieldArray(
      input.change_append_path_direction_bits,
      "change_append_path_direction_bits",
    ),
    change_leaf_index: normalizeWitnessField(input.change_leaf_index, "change_leaf_index"),
    change_memo_ciphertext_body_hash_field: normalizeWitnessField(
      input.change_memo_ciphertext_body_hash_field,
      "change_memo_ciphertext_body_hash_field",
    ),
    change_output_commitment: normalizeWitnessField(
      input.change_output_commitment,
      "change_output_commitment",
    ),
    change_output_root: normalizeWitnessField(input.change_output_root, "change_output_root"),
    economics_blinding: normalizeWitnessField(input.economics_blinding, "economics_blinding"),
    economics_commitment: normalizeWitnessField(
      input.economics_commitment,
      "economics_commitment",
    ),
    input_amount: normalizeWitnessAmount(input.input_amount, "input_amount"),
    input_commitment: normalizeWitnessField(input.input_commitment, "input_commitment"),
    input_leaf_index: normalizeWitnessField(input.input_leaf_index, "input_leaf_index"),
    input_root: normalizeWitnessField(input.input_root, "input_root"),
    membership_path: normalizeWitnessFieldArray(input.membership_path, "membership_path"),
    membership_path_direction_bits: normalizeWitnessFieldArray(
      input.membership_path_direction_bits,
      "membership_path_direction_bits",
    ),
    nullifier: normalizeWitnessField(input.nullifier, "nullifier"),
    owner_commitment: normalizeWitnessField(input.owner_commitment, "owner_commitment"),
    owner_secret: normalizeWitnessField(input.owner_secret, "owner_secret"),
    recipient_amount: normalizeWitnessAmount(input.recipient_amount, "recipient_amount"),
    recipient_append_path: normalizeWitnessFieldArray(
      input.recipient_append_path,
      "recipient_append_path",
    ),
    recipient_append_path_direction_bits: normalizeWitnessFieldArray(
      input.recipient_append_path_direction_bits,
      "recipient_append_path_direction_bits",
    ),
    recipient_leaf_index: normalizeWitnessField(
      input.recipient_leaf_index,
      "recipient_leaf_index",
    ),
    recipient_memo_ciphertext_body_hash_field: normalizeWitnessField(
      input.recipient_memo_ciphertext_body_hash_field,
      "recipient_memo_ciphertext_body_hash_field",
    ),
    recipient_output_commitment: normalizeWitnessField(
      input.recipient_output_commitment,
      "recipient_output_commitment",
    ),
    recipient_output_root: normalizeWitnessField(
      input.recipient_output_root,
      "recipient_output_root",
    ),
    request_version: normalizeWitnessField(input.request_version, "request_version"),
    send_context_tag: normalizeWitnessField(input.send_context_tag, "send_context_tag"),
  };

  assertDirectionBits(witness.membership_path_direction_bits, "membership_path_direction_bits");
  assertDirectionBits(
    witness.recipient_append_path_direction_bits,
    "recipient_append_path_direction_bits",
  );
  assertDirectionBits(
    witness.change_append_path_direction_bits,
    "change_append_path_direction_bits",
  );

  if (witness.input_leaf_index !== leafIndexFromDirectionBits(witness.membership_path_direction_bits)) {
    throw new Error("Send witness input_leaf_index must match membership direction bits.");
  }
  if (
    witness.recipient_leaf_index !==
    leafIndexFromDirectionBits(witness.recipient_append_path_direction_bits)
  ) {
    throw new Error("Send witness recipient_leaf_index must match recipient append direction bits.");
  }
  if (
    witness.change_leaf_index !==
    leafIndexFromDirectionBits(witness.change_append_path_direction_bits)
  ) {
    throw new Error("Send witness change_leaf_index must match change append direction bits.");
  }

  if (computeVantaPrivatePoolV2SendInputRoot(witness) !== witness.input_root) {
    throw new Error("Send witness input_root must match the Merkle path.");
  }

  if (computeVantaPrivatePoolV2SendNullifier(witness) !== witness.nullifier) {
    throw new Error("Send witness nullifier must match the owner secret.");
  }

  if (witness.input_amount !== witness.recipient_amount + witness.change_amount) {
    throw new Error("Send witness amount conservation must hold.");
  }

  if (computeVantaPrivatePoolV2SendEconomicsCommitment(witness) !== witness.economics_commitment) {
    throw new Error("Send witness economics commitment must match amounts and blinding.");
  }

  if (
    BigInt(
      deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(
        memoCiphertextBodyHashes.recipientMemoCiphertextBodyHash,
        "recipient memo ciphertext body hash",
      ),
    ) !== witness.recipient_memo_ciphertext_body_hash_field
  ) {
    throw new Error("Send witness recipient memo ciphertext body hash field mismatch.");
  }

  if (
    BigInt(
      deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(
        memoCiphertextBodyHashes.changeMemoCiphertextBodyHash,
        "change memo ciphertext body hash",
      ),
    ) !== witness.change_memo_ciphertext_body_hash_field
  ) {
    throw new Error("Send witness change memo ciphertext body hash field mismatch.");
  }

  if (
    computeVantaPrivatePoolV2SendRootFromLeaf({
      leafValue: 0n,
      path: witness.recipient_append_path,
      pathDirectionBits: witness.recipient_append_path_direction_bits,
    }) !== witness.input_root
  ) {
    throw new Error("Send witness recipient append path must start from the input root.");
  }

  if (
    computeVantaPrivatePoolV2SendRootFromLeaf({
      leafValue: witness.recipient_output_commitment,
      path: witness.recipient_append_path,
      pathDirectionBits: witness.recipient_append_path_direction_bits,
    }) !== witness.recipient_output_root
  ) {
    throw new Error("Send witness recipient_output_root must match the append path.");
  }

  if (
    computeVantaPrivatePoolV2SendRootFromLeaf({
      leafValue: 0n,
      path: witness.change_append_path,
      pathDirectionBits: witness.change_append_path_direction_bits,
    }) !== witness.recipient_output_root
  ) {
    throw new Error("Send witness change append path must start from the recipient output root.");
  }

  if (
    computeVantaPrivatePoolV2SendRootFromLeaf({
      leafValue: witness.change_output_commitment,
      path: witness.change_append_path,
      pathDirectionBits: witness.change_append_path_direction_bits,
    }) !== witness.change_output_root
  ) {
    throw new Error("Send witness change_output_root must match the append path.");
  }

  if (witness.recipient_output_commitment === witness.change_output_commitment) {
    throw new Error("Send witness output commitments must be unique.");
  }

  return {
    memoCiphertextBodyHashes,
    witness,
  };
}

export function createVantaPrivatePoolV2SendCircuitFixture({
  memoCiphertextBodyHashes,
  mode = "valid",
  witness = DEFAULT_WITNESS,
}: {
  memoCiphertextBodyHashes?: VantaPrivatePoolV2SendCircuitFixtureMemoBodyHashes;
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
      : mode === "invalid-memo-ciphertext-hash"
        ? {
            ...witness,
            recipient_memo_ciphertext_body_hash_field:
              witness.recipient_memo_ciphertext_body_hash_field + 1n,
          }
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
  const publicHashWitness =
    mode === "invalid-memo-ciphertext-hash" ? witness : circuitWitness;
  const validPublicHash = computeVantaPrivatePoolV2SendPublicInputHash(publicHashWitness);
  const resolvedMemoCiphertextBodyHashes = {
    ...DEFAULT_MEMO_CIPHERTEXT_BODY_HASHES,
    ...memoCiphertextBodyHashes,
  };

  assertMemoCiphertextBodyHashFieldMatches({
    expectedField: publicHashWitness.recipient_memo_ciphertext_body_hash_field,
    fieldName: "recipient memo ciphertext body hash",
    value: resolvedMemoCiphertextBodyHashes.recipientMemoCiphertextBodyHash,
  });
  assertMemoCiphertextBodyHashFieldMatches({
    expectedField: publicHashWitness.change_memo_ciphertext_body_hash_field,
    fieldName: "change memo ciphertext body hash",
    value: resolvedMemoCiphertextBodyHashes.changeMemoCiphertextBodyHash,
  });

  const proofRequest = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: toCircuitString(publicHashWitness.asset_id_commitment),
    changeLeafIndex: toCircuitString(publicHashWitness.change_leaf_index),
    changeMemoCiphertextBodyHash:
      resolvedMemoCiphertextBodyHashes.changeMemoCiphertextBodyHash,
    changeOutputCommitment: toCircuitString(publicHashWitness.change_output_commitment),
    changeOutputRoot: toCircuitString(publicHashWitness.change_output_root),
    economicsCommitment: toCircuitString(publicHashWitness.economics_commitment),
    inputCommitment: toCircuitString(publicHashWitness.input_commitment),
    inputRoot: toCircuitString(publicHashWitness.input_root),
    nullifier: toCircuitString(publicHashWitness.nullifier),
    ownerCommitment: toCircuitString(publicHashWitness.owner_commitment),
    recipientLeafIndex: toCircuitString(publicHashWitness.recipient_leaf_index),
    recipientMemoCiphertextBodyHash:
      resolvedMemoCiphertextBodyHashes.recipientMemoCiphertextBodyHash,
    recipientOutputCommitment: toCircuitString(publicHashWitness.recipient_output_commitment),
    recipientOutputRoot: toCircuitString(publicHashWitness.recipient_output_root),
    sendContextTag: toCircuitString(publicHashWitness.send_context_tag),
    sendPublicInputHash: toCircuitString(validPublicHash),
  });

  return {
    proofRequest,
    sendPublicInputHash: mode === "invalid-binding" ? validPublicHash + 1n : validPublicHash,
    witness: circuitWitness,
  };
}

export function createVantaPrivatePoolV2SendCircuitFixtureFromWitnessInput(input: unknown) {
  const normalized = normalizeVantaPrivatePoolV2SendCircuitWitnessInput(input);
  return createVantaPrivatePoolV2SendCircuitFixture({
    memoCiphertextBodyHashes: normalized.memoCiphertextBodyHashes,
    witness: normalized.witness,
  });
}

function assertMemoCiphertextBodyHashFieldMatches({
  expectedField,
  fieldName,
  value,
}: {
  expectedField: bigint;
  fieldName: string;
  value: string | undefined;
}) {
  const actualField = BigInt(
    deriveVantaPrivatePoolV2MemoCiphertextBodyHashField(value, fieldName),
  );

  if (actualField !== expectedField) {
    throw new Error(
      `Send circuit fixture ${fieldName} must derive field ${expectedField.toString(10)}; received ${actualField.toString(10)}.`,
    );
  }
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
    `recipient_memo_ciphertext_body_hash_field = "${witness.recipient_memo_ciphertext_body_hash_field.toString(10)}"`,
    `change_memo_ciphertext_body_hash_field = "${witness.change_memo_ciphertext_body_hash_field.toString(10)}"`,
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
