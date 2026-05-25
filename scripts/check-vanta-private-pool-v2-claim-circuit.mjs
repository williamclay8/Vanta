import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry");
const fixtureWriterPath = resolve(
  repoRoot,
  "scripts/write-vanta-private-pool-v2-claim-fixture.mjs",
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

try {
  writeFixture("valid");
  console.log("valid fixture write: PASS");

  printCapturedOutput(runNargo(["check"]));
  console.log("nargo check: PASS");

  printCapturedOutput(runNargo(["execute"]));
  console.log("valid fixture: PASS");

  writeFixture("invalid-binding");
  console.log("invalid-binding fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-binding fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-binding fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-binding fixture: expected failure observed");
  }

  writeFixture("invalid-nullifier");
  console.log("invalid-nullifier fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-nullifier fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-nullifier fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-nullifier fixture: expected failure observed");
  }

  writeFixture("invalid-owner-secret-binding");
  console.log("invalid-owner-secret-binding fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-owner-secret-binding fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-owner-secret-binding fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-owner-secret-binding fixture: expected failure observed");
  }

  writeFixture("invalid-input-commitment-preimage");
  console.log("invalid-input-commitment-preimage fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-input-commitment-preimage fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-input-commitment-preimage fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-input-commitment-preimage fixture: expected failure observed");
  }

  writeFixture("invalid-net-payout-conservation");
  console.log("invalid-net-payout-conservation fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-net-payout-conservation fixture unexpectedly succeeded");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "invalid-net-payout-conservation fixture unexpectedly succeeded"
    ) {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-net-payout-conservation fixture: expected failure observed");
  }

  writeFixture("invalid-net-payout-public-binding");
  console.log("invalid-net-payout-public-binding fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-net-payout-public-binding fixture unexpectedly succeeded");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "invalid-net-payout-public-binding fixture unexpectedly succeeded"
    ) {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-net-payout-public-binding fixture: expected failure observed");
  }

  writeFixture("invalid-relayer-fee-exceeds-amount");
  console.log("invalid-relayer-fee-exceeds-amount fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-relayer-fee-exceeds-amount fixture unexpectedly succeeded");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "invalid-relayer-fee-exceeds-amount fixture unexpectedly succeeded"
    ) {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-relayer-fee-exceeds-amount fixture: expected failure observed");
  }

  writeFixture("invalid-amount-range");
  console.log("invalid-amount-range fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("invalid-amount-range fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-amount-range fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("invalid-amount-range fixture: expected failure observed");
  }

  writeFixture("forged-input-membership");
  console.log("forged-input-membership fixture write: PASS");

  try {
    printCapturedOutput(runNargo(["execute"]));
    throw new Error("forged-input-membership fixture unexpectedly succeeded");
  } catch (error) {
    if (error instanceof Error && error.message === "forged-input-membership fixture unexpectedly succeeded") {
      throw error;
    }

    printExpectedFailure(error);
    console.log("forged-input-membership fixture: expected failure observed");
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
