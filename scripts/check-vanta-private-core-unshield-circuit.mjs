import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_unshield");
const fixtureWriterPath = resolve(
  repoRoot,
  "scripts/write-vanta-private-core-unshield-fixture.mjs",
);

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

  try {
    const invalidExecuteOutput = runNargo(["execute"]);
    printCapturedOutput(invalidExecuteOutput);
    throw new Error("invalid-direction fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-direction fixture unexpectedly succeeded") {
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
    printStatus("invalid-direction fixture: expected failure observed");
  }

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
