import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const noirFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter((path) => path.startsWith("zk/noir/") && path.endsWith("/src/main.nr"));
const privateCoreHarnessFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (path) =>
      path.startsWith("scripts/check-vanta-private-core-") && path.endsWith(".mjs"),
  );

const forbiddenPatterns = [
  {
    pattern: /assert\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*==\s*\1\s*\)/u,
    message: "self-equality assert does not constrain the witness",
  },
  {
    pattern: /assert\(\s*[A-Za-z_][A-Za-z0-9_]*\s*==\s*sender_secret_key_hi\s*\+\s*sender_secret_key_lo\s*\)/u,
    message: "sender secret liveness must not be a restated witness sum",
  },
  {
    pattern: /owner_auth_placeholder/u,
    message: "owner auth placeholder must not be reintroduced",
  },
  {
    pattern: /owner_secret_key_hi\s*\+\s*owner_secret_key_lo\s*!=\s*0/u,
    message: "owner secret liveness must be a key relation, not a nonzero witness sum",
  },
  {
    pattern: /assert\(\s*owner_public_key_lo\s*==\s*owner_public_key_lo\s*\)/u,
    message: "owner public key self-equality does not constrain the witness",
  },
  {
    pattern: /input_asset_id_hi\s*\+\s*input_asset_id_lo\s*!=\s*output_asset_id_hi\s*\+\s*output_asset_id_lo/u,
    message: "asset inequality must compare limbs, not additive limb sums",
  },
  {
    pattern: /computed_(?:send|swap)_context_tag\s*==\s*(?:send|swap)_context_tag_hi\s*\+\s*(?:send|swap)_context_tag_lo/u,
    message: "context-tag splits must use zero-high-limb canonical encoding, not additive limb sums",
  },
  {
    pattern: /membership_path_hi\s*\[[^\]]+\]\s*\+\s*membership_path_lo\s*\[[^\]]+\]/u,
    message: "hi/lo membership path addition collapses distinct witnesses",
  },
  {
    pattern: /TODO:\s*replace with Poseidon/iu,
    message: "placeholder hash TODO is still present",
  },
  {
    pattern: /hash_merkle_node\s*\(\s*left:\s*Field\s*,\s*right:\s*Field\s*,\s*is_current_right/u,
    message: "Merkle node hash must not include the direction bit",
  },
  {
    pattern: /hash_3\s*\(\s*\[\s*previous_root\s*,\s*output_commitment\s*,\s*leaf_index\s*\]\s*\)/u,
    message: "successor append root must be path-derived, not a hash_3 shortcut",
  },
  {
    pattern: /send_amount_lo\s*\+\s*change_amount_lo/u,
    message: "Private Core Send input amount must use carry-aware limb reconstruction",
  },
  {
    pattern: /send_amount_hi\s*\+\s*change_amount_hi/u,
    message: "Private Core Send input amount must use carry-aware limb reconstruction",
  },
  {
    pattern: /fn\s+hash_note[^{]*\{[^}]*\bversion\s*\+\s*asset_id/isu,
    message: "note hash must not be additive placeholder arithmetic",
  },
];

const failures = [];
const depth3Open = [];

for (const file of noirFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");

  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(source)) {
      failures.push(`${file}: ${message}`);
    }
  }

  if (source.includes("global MERKLE_DEPTH: u32 = 3;")) {
    depth3Open.push(file);
  }

  if (file.startsWith("zk/noir/vanta_private_core_single_note_")) {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\b(?:send_|change_|input_|output_)?amount_(?:lo|hi)\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: Private Core amount limbs in main ABI must be u64, not raw Field`);
    }
  }

  if (file === "zk/noir/canonical_note_membership/src/main.nr") {
    const mainStart = source.indexOf("pub fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount_(?:lo|hi)\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: canonical note amount limbs in main ABI must be u64, not raw Field`);
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr") {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: shield amount in main ABI must be u128, not raw Field`);
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr") {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: claim amount in main ABI must be u128, not raw Field`);
    }
    if (/\brelayer_fee\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: claim relayer fee in main ABI must be u128, not raw Field`);
    }
  }

  const publicInputs = [
    ...source.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*pub\s+Field\b/gu),
  ].map((match) => match[1]);

  for (const inputName of publicInputs) {
    const occurrences = source.match(new RegExp(`\\b${inputName}\\b`, "gu"))?.length ?? 0;
    if (occurrences < 2) {
      failures.push(`${file}: public input ${inputName} appears only in the ABI`);
    }
  }
}

for (const file of privateCoreHarnessFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  if (/circuitMerkleDepth:\s*3\b/u.test(source)) {
    failures.push(`${file}: Private Core harness must not request stale circuitMerkleDepth 3`);
  }
}

if (failures.length > 0) {
  console.error("Vanta circuit soundness lint: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (depth3Open.length > 0) {
  console.error("Vanta circuit soundness lint: FAIL");
  console.error("Active proving lanes must use MERKLE_DEPTH = 20 before depth migration is closed.");
  for (const file of depth3Open) {
    console.error(`- ${file}: still uses MERKLE_DEPTH = 3`);
  }
  process.exit(1);
}

console.log("Vanta circuit soundness lint: PASS");
console.log(
  JSON.stringify(
    {
      checkedNoirFiles: noirFiles.length,
      depth3OpenCount: depth3Open.length,
      depth3Open,
      depth20MigrationStatus: depth3Open.length > 0 ? "open" : "complete",
    },
    null,
    2,
  ),
);
