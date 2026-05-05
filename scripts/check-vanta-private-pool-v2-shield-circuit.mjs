import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_shield_entry");
const fixtureWriterPath = resolve(
  repoRoot,
  "scripts/write-vanta-private-pool-v2-shield-fixture.mjs",
);

const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

let restoredValidFixture = false;

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

function clearCircuitTarget() {
  rmSync(resolve(circuitDir, "target"), { recursive: true, force: true });
}

function printCapturedOutput(output) {
  const trimmed = output.trim();
  if (trimmed) {
    console.log(trimmed);
  }
}

try {
  writeFixture("valid");
  console.log("valid fixture write: PASS");

  clearCircuitTarget();
  printCapturedOutput(runNargo(["check"]));
  console.log("nargo check: PASS");

  clearCircuitTarget();
  printCapturedOutput(runNargo(["execute"]));
  console.log("valid fixture: PASS");

  writeFixture("invalid-binding");
  console.log("invalid-binding fixture write: PASS");

  try {
    clearCircuitTarget();
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-binding fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-binding fixture unexpectedly succeeded") {
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
    console.log("invalid-binding fixture: expected failure observed");
  }

  writeFixture("invalid-root");
  console.log("invalid-root fixture write: PASS");

  try {
    clearCircuitTarget();
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-root fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-root fixture unexpectedly succeeded") {
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
    console.log("invalid-root fixture: expected failure observed");
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
