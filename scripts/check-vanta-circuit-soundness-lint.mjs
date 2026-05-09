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

const forbiddenPatterns = [
  {
    pattern: /assert\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*==\s*\1\s*\)/u,
    message: "self-equality assert does not constrain the witness",
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

if (failures.length > 0) {
  console.error("Vanta circuit soundness lint: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
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
