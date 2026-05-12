import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_swap");
const fixtureWriterPath = resolve(repoRoot, "scripts/write-vanta-private-core-swap-fixture.mjs");

const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

let restoredValidFixture = false;

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function writeFixture(mode) {
  runCommand("node", [fixtureWriterPath, mode], { cwd: repoRoot, env: process.env });
}

function runNargo(args) {
  return runCommand("nargo", args, { cwd: circuitDir, env: nargoEnv });
}

function printStatus(message) {
  console.log(message);
}

function printCapturedOutput(output) {
  const trimmed = output.trim();
  if (trimmed) {
    console.log(trimmed);
  }
}

try {
  writeFixture("valid");
  printStatus("valid fixture write: PASS");

  const checkOutput = runNargo(["check"]);
  printCapturedOutput(checkOutput);
  printStatus("nargo check: PASS");

  const validExecuteOutput = runNargo(["execute"]);
  printCapturedOutput(validExecuteOutput);
  printStatus("valid fixture: PASS");

  writeFixture("invalid-direction");
  printStatus("invalid-direction fixture write: PASS");

  expectExecuteFailure("invalid-direction");

  writeFixture("invalid-leaf-index");
  printStatus("invalid-leaf-index fixture write: PASS");
  expectExecuteFailure("invalid-leaf-index");

  writeFixture("invalid-sender-secret");
  printStatus("invalid-sender-secret fixture write: PASS");
  expectExecuteFailure("invalid-sender-secret");

  writeFixture("invalid-context-split");
  printStatus("invalid-context-split fixture write: PASS");
  expectExecuteFailure("invalid-context-split");

  writeFixture("invalid-amount-range");
  printStatus("invalid-amount-range fixture write: PASS");
  expectExecuteFailure("invalid-amount-range");

  writeFixture("valid-asset-sum-collision");
  printStatus("valid-asset-sum-collision fixture write: PASS");
  const validAssetSumCollisionOutput = runNargo(["execute"]);
  printCapturedOutput(validAssetSumCollisionOutput);
  printStatus("valid-asset-sum-collision fixture: PASS");

  writeFixture("valid");
  restoredValidFixture = true;
  printStatus("fixture restore: PASS");
} catch (error) {
  try {
    writeFixture("valid");
    restoredValidFixture = true;
    printStatus("fixture restore after failure: PASS");
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

function expectExecuteFailure(label) {
  try {
    const invalidExecuteOutput = runNargo(["execute"]);
    printCapturedOutput(invalidExecuteOutput);
    throw new Error(`${label} fixture unexpectedly succeeded`);
  } catch (error) {
    if (error instanceof Error && error.message === `${label} fixture unexpectedly succeeded`) {
      throw error;
    }

    const stdout = String(error.stdout ?? "").trim();
    const stderr = String(error.stderr ?? "").trim();
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
    printStatus(`${label} fixture: expected failure observed`);
  }
}
