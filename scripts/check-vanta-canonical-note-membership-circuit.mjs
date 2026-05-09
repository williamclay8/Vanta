import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/canonical_note_membership");
const sourcePath = resolve(circuitDir, "src/main.nr");
const fixtureWriterPath = resolve(
  repoRoot,
  "scripts/write-vanta-canonical-note-membership-fixture.mjs",
);
const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

let restoredValidFixture = false;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: "pipe",
  });
}

function writeFixture(mode) {
  runCommand("node", [fixtureWriterPath, mode], { cwd: repoRoot, env: process.env });
}

function runNargo(args) {
  return runCommand("nargo", args, { cwd: circuitDir, env: nargoEnv });
}

function printCapturedOutput(output) {
  const trimmed = output.trim();
  if (trimmed) {
    console.log(trimmed);
  }
}

function printExpectedFailure(error) {
  const stdout = String(error.stdout ?? "").trim();
  const stderr = String(error.stderr ?? "").trim();
  if (stdout) {
    console.log(stdout);
  }
  if (stderr) {
    console.log(stderr);
  }
}

const source = readFileSync(sourcePath, "utf8");
assert(
  source.includes("use ::poseidon::poseidon::bn254;"),
  "canonical note membership circuit must use the repo-standard Poseidon bn254 import",
);
assert(
  source.includes("bn254::hash_10"),
  "canonical note membership circuit must use Poseidon for note commitment hashing",
);
assert(
  source.includes("bn254::hash_1"),
  "canonical note membership circuit must Poseidon-hash the commitment into a Merkle leaf",
);
assert(
  source.includes("bn254::hash_2"),
  "canonical note membership circuit must use Poseidon node hashing",
);
assert(
  !source.includes("current + sibling") && !source.includes("+ direction + leaf_index"),
  "canonical note membership circuit must not use additive placeholder Merkle hashing",
);
assert(
  !source.includes("Placeholder Poseidon proving lane") &&
    !source.includes("TODO: replace with Poseidon"),
  "canonical note membership circuit must not retain placeholder Poseidon comments",
);
assert(
  source.includes("assert_direction_bit"),
  "canonical note membership circuit must constrain membership path direction bits",
);
assert(
  source.includes("computed_leaf_index == leaf_index"),
  "canonical note membership circuit must bind direction bits to the declared leaf index",
);

try {
  writeFixture("valid");
  console.log("valid fixture write: PASS");

  printCapturedOutput(runNargo(["check"]));
  console.log("nargo check: PASS");

  printCapturedOutput(runNargo(["execute"]));
  console.log("valid fixture: PASS");

  for (const mode of [
    "invalid-commitment",
    "invalid-membership-root",
    "invalid-direction-bit",
    "invalid-leaf-index",
    "invalid-amount-range",
  ]) {
    writeFixture(mode);
    console.log(`${mode} fixture write: PASS`);

    try {
      printCapturedOutput(runNargo(["execute"]));
      throw new Error(`${mode} fixture unexpectedly succeeded`);
    } catch (error) {
      if (error instanceof Error && error.message === `${mode} fixture unexpectedly succeeded`) {
        throw error;
      }

      printExpectedFailure(error);
      console.log(`${mode} fixture: expected failure observed`);
    }
  }

  writeFixture("valid");
  restoredValidFixture = true;
  console.log("fixture restore: PASS");
} catch (error) {
  try {
    writeFixture("valid");
    restoredValidFixture = true;
    console.log("fixture restore after failure: PASS");
  } catch (restoreError) {
    const restoreMessage =
      restoreError instanceof Error ? restoreError.message : String(restoreError);
    console.error(`fixture restore after failure: FAIL\n${restoreMessage}`);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  if (!restoredValidFixture) {
    process.exitCode = 1;
  }
}
