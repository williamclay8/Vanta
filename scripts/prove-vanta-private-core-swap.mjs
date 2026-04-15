import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_swap");
const fixtureWriterPath = resolve(
  repoRoot,
  "scripts/write-vanta-private-core-swap-fixture.mjs",
);
const compiledProgramPath = resolve(
  circuitDir,
  "target/vanta_private_core_single_note_swap.json",
);
const witnessPath = resolve(circuitDir, "target/vanta_private_core_single_note_swap.gz");
const proofReceiptPath = resolve(
  circuitDir,
  "target/vanta_private_core_single_note_swap.proof.json",
);

const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    stdio: "pipe",
    encoding: "utf8",
  });
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

function writeFixture(mode) {
  runCommand("node", [fixtureWriterPath, mode], { cwd: repoRoot, env: process.env });
}

function runNargo(args) {
  return runCommand("nargo", args, { cwd: circuitDir, env: nargoEnv });
}

let restoredValidFixture = false;

try {
  writeFixture("valid");
  restoredValidFixture = true;
  printStatus("valid fixture write: PASS");

  const compileOutput = runNargo(["compile"]);
  printCapturedOutput(compileOutput);
  printStatus("nargo compile: PASS");

  const executeOutput = runNargo(["execute"]);
  printCapturedOutput(executeOutput);
  printStatus("witness generation: PASS");

  const compiledProgram = JSON.parse(readFileSync(compiledProgramPath, "utf8"));
  const compressedWitness = readFileSync(witnessPath);

  const api = await Barretenberg.new({ threads: 1 });
  try {
    const backend = new UltraHonkBackend(compiledProgram.bytecode, api);
    const proofData = await backend.generateProof(compressedWitness);
    const verified = await backend.verifyProof(proofData);

    if (!verified) {
      throw new Error("proof verification returned false");
    }

    mkdirSync(resolve(circuitDir, "target"), { recursive: true });
    writeFileSync(
      proofReceiptPath,
      `${JSON.stringify(
        {
          circuit: "vanta_private_core_single_note_swap",
          backend: "barretenberg-ultrahonk",
          witnessSource: "target/vanta_private_core_single_note_swap.gz",
          bytecodeSource: "target/vanta_private_core_single_note_swap.json",
          publicInputCount: proofData.publicInputs.length,
          proofByteLength: proofData.proof.length,
          publicInputs: proofData.publicInputs,
          proofHex: Buffer.from(proofData.proof).toString("hex"),
          verified,
        },
        null,
        2,
      )}\n`,
    );

    printStatus("proof generation: PASS");
    printStatus("proof verification: PASS");
    printStatus(`proof receipt written: ${proofReceiptPath}`);
  } finally {
    await api.destroy();
  }

  writeFixture("valid");
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
