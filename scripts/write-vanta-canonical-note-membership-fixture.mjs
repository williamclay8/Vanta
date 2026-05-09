import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { poseidon1, poseidon10, poseidon2 } from "poseidon-lite";

const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(repoRoot, "zk/noir/canonical_note_membership/Prover.toml");
const mode = process.argv[2] ?? "valid";
const MERKLE_DEPTH = 20;

const supportedModes = new Set([
  "valid",
  "invalid-commitment",
  "invalid-direction-bit",
  "invalid-leaf-index",
  "invalid-membership-root",
]);

if (!supportedModes.has(mode)) {
  console.error(
    `Expected fixture mode ${Array.from(supportedModes, (value) => `"${value}"`).join(", ")}.`,
  );
  process.exit(1);
}

function toCircuitString(value) {
  return value.toString(10);
}

function indexBits(leafIndex) {
  return Array.from({ length: MERKLE_DEPTH }, (_, index) =>
    (leafIndex >> BigInt(index)) & 1n,
  );
}

function computeCommitment(witness) {
  return poseidon10([
    witness.version,
    witness.asset_id_hi,
    witness.asset_id_lo,
    witness.amount_lo,
    witness.amount_hi,
    witness.owner_public_key,
    witness.note_nonce,
    witness.note_secret,
    witness.blinding,
    witness.derivation_tag,
  ]);
}

function computeRoot({ commitment, membershipPath, membershipPathIndexBits }) {
  return membershipPath.reduce((current, sibling, index) => {
    const directionBit = membershipPathIndexBits[index] ?? 0n;
    return directionBit === 1n
      ? poseidon2([sibling, current])
      : poseidon2([current, sibling]);
  }, poseidon1([commitment]));
}

const baseLeafIndex = 13n;
const baseMembershipPath = Array.from({ length: MERKLE_DEPTH }, (_, index) =>
  BigInt(1000 + index * 17),
);
const baseWitness = {
  amount_hi: 0n,
  amount_lo: 50_000_000n,
  asset_id_hi: 101n,
  asset_id_lo: 202n,
  blinding: 606n,
  derivation_tag: 707n,
  leaf_index: baseLeafIndex,
  membership_path: baseMembershipPath,
  membership_path_index_bits: indexBits(baseLeafIndex),
  note_nonce: 404n,
  note_secret: 505n,
  owner_public_key: 303n,
  version: 1n,
};
const validCommitment = computeCommitment(baseWitness);
const validRoot = computeRoot({
  commitment: validCommitment,
  membershipPath: baseWitness.membership_path,
  membershipPathIndexBits: baseWitness.membership_path_index_bits,
});

const witness =
  mode === "invalid-direction-bit"
    ? {
        ...baseWitness,
        membership_path_index_bits: [2n, ...baseWitness.membership_path_index_bits.slice(1)],
      }
    : mode === "invalid-leaf-index"
      ? { ...baseWitness, leaf_index: baseWitness.leaf_index + 1n }
      : baseWitness;

const commitment = mode === "invalid-commitment" ? validCommitment + 1n : validCommitment;
const membershipRoot = mode === "invalid-membership-root" ? validRoot + 1n : validRoot;

const toml = [
  `amount_hi = "${toCircuitString(witness.amount_hi)}"`,
  `amount_lo = "${toCircuitString(witness.amount_lo)}"`,
  `asset_id_hi = "${toCircuitString(witness.asset_id_hi)}"`,
  `asset_id_lo = "${toCircuitString(witness.asset_id_lo)}"`,
  `blinding = "${toCircuitString(witness.blinding)}"`,
  `commitment = "${toCircuitString(commitment)}"`,
  `derivation_tag = "${toCircuitString(witness.derivation_tag)}"`,
  `leaf_index = "${toCircuitString(witness.leaf_index)}"`,
  `membership_path = [${witness.membership_path.map((value) => `"${toCircuitString(value)}"`).join(", ")}]`,
  `membership_path_index_bits = [${witness.membership_path_index_bits.map((value) => `"${toCircuitString(value)}"`).join(", ")}]`,
  `membership_root = "${toCircuitString(membershipRoot)}"`,
  `note_nonce = "${toCircuitString(witness.note_nonce)}"`,
  `note_secret = "${toCircuitString(witness.note_secret)}"`,
  `owner_public_key = "${toCircuitString(witness.owner_public_key)}"`,
  `version = "${toCircuitString(witness.version)}"`,
  "",
].join("\n");

writeFileSync(outputPath, toml);
console.log(`Wrote ${mode} canonical note membership fixture to ${outputPath}`);
