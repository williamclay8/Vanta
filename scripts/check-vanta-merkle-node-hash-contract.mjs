import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

const noirMerkleNodeFiles = [
  "zk/noir/canonical_note_membership/src/main.nr",
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr",
  "zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr",
  "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr",
  "zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr",
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr",
];

const noirSingleFieldMembershipFiles = [
  "zk/noir/vanta_private_core_single_note_send/src/main.nr",
  "zk/noir/vanta_private_core_single_note_swap/src/main.nr",
  "zk/noir/vanta_private_core_single_note_unshield/src/main.nr",
];

for (const file of noirMerkleNodeFiles) {
  const source = read(file);

  assert(
    source.includes("fn hash_merkle_node(left: Field, right: Field) -> Field"),
    `${file} must expose a standard two-input Merkle node helper`,
  );
  assert(
    source.includes("bn254::hash_2([left, right])"),
    `${file} must hash Merkle nodes as Poseidon(left, right)`,
  );
  assert(
    !source.includes("hash_merkle_node(left: Field, right: Field, is_current_right"),
    `${file} must not pass direction bits into hash_merkle_node`,
  );
  assert(
    !source.includes("bn254::hash_3([left, right, is_current_right])"),
    `${file} must not hash direction bits into Merkle nodes`,
  );
}

for (const file of noirSingleFieldMembershipFiles) {
  const source = read(file);

  assert(
    source.includes("fn hash_merkle_node(left: Field, right: Field) -> Field"),
    `${file} must expose a standard two-input Merkle node helper`,
  );
  assert(
    source.includes("bn254::hash_2([left, right])"),
    `${file} must hash Merkle nodes as Poseidon(left, right)`,
  );
  assert(
    source.includes("membership_path: [Field; MERKLE_DEPTH]"),
    `${file} must use a single field per Merkle sibling`,
  );
  assert(
    !source.includes("membership_path_hi") && !source.includes("membership_path_lo"),
    `${file} must not expose split hi/lo Merkle sibling witnesses`,
  );
  assert(
    !source.includes("hash_merkle_node(left: Field, right: Field, is_current_right") &&
      !source.includes("bn254::hash_3([left, right, is_current_right])") &&
      !source.includes("bn254::hash_4([current, sibling_hi, sibling_lo, is_current_right])"),
    `${file} must not hash direction bits or split sibling limbs into Merkle nodes`,
  );
}

const fixtureFiles = [
  "src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts",
  "src/privacy/privatePoolV2ClaimCircuitFixture.ts",
  "src/privacy/privatePoolV2SendCircuitFixture.ts",
  "src/privacy/privatePoolV2ShieldCircuitFixture.ts",
  "src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts",
];

for (const file of fixtureFiles) {
  const source = read(file);

  assert(
    source.includes("poseidon2([sibling, current])") &&
      source.includes("poseidon2([current, sibling])"),
    `${file} must mirror Merkle node hashing with Poseidon(left, right)`,
  );
  assert(
    !source.includes("poseidon3([sibling, current, directionBit])") &&
      !source.includes("poseidon3([current, sibling, directionBit])"),
    `${file} must not hash direction bits into Merkle nodes`,
  );
}

const privatePoolV2AppendProofFiles = [
  "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr",
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr",
  "src/privacy/privatePoolV2SendCircuitFixture.ts",
  "src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts",
];

for (const file of privatePoolV2AppendProofFiles) {
  const source = read(file);

  assert(
    !source.includes("hash_3([previous_root, output_commitment, leaf_index])") &&
      !source.includes("poseidon3([previous_root, output_commitment, leaf_index])"),
    `${file} must not reintroduce transitional hash_3 successor append roots`,
  );
}

const privateCoreProofFiles = [
  "src/zk/vantaPrivateCoreSendProof.ts",
  "src/zk/vantaPrivateCoreSwapProof.ts",
  "src/zk/vantaPrivateCoreUnshieldProof.ts",
];

for (const file of privateCoreProofFiles) {
  const source = read(file);

  assert(
    source.includes("membership_path: FieldDecimalString[]"),
    `${file} must expose single-field Merkle path witnesses`,
  );
  assert(
    source.includes("deriveMerkleSiblingField(entry)") &&
      source.includes("poseidon2([sibling, current])") &&
      source.includes("poseidon2([current, sibling])"),
    `${file} must mirror standard Poseidon(left, right) Merkle node hashing`,
  );
  assert(
    !source.includes("membership_path_hi") &&
      !source.includes("membership_path_lo") &&
      !source.includes("poseidon3([sibling, current, isCurrentRight])") &&
      !source.includes("poseidon3([current, sibling, isCurrentRight])") &&
      !source.includes("poseidon4(["),
    `${file} must not reintroduce split sibling limbs or direction-bit node hashing`,
  );
}

console.log("Vanta Merkle node hash contract: PASS");
