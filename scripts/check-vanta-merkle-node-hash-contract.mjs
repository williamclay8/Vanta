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

console.log("Vanta Merkle node hash contract: PASS");
