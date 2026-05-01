import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const target = process.argv[2] ?? "shield";

const targets = {
  shield: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_shield_entry"),
    circuitName: "vanta_private_pool_v2_shield_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-shield-fixture.mjs"),
  },
  claim: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry"),
    circuitName: "vanta_private_pool_v2_claim_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-claim-fixture.mjs"),
  },
  send: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry"),
    circuitName: "vanta_private_pool_v2_send_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-send-fixture.mjs"),
  },
  "swap-to-shielded": {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry"),
    circuitName: "vanta_private_pool_v2_swap_to_shielded_entry",
    fixtureWriterPath: resolve(
      repoRoot,
      "scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs",
    ),
  },
  "actual-private-spend": {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_actual_private_spend_entry"),
    circuitName: "vanta_private_pool_v2_actual_private_spend_entry",
    fixtureWriterPath: resolve(
      repoRoot,
      "scripts/write-vanta-private-pool-v2-actual-private-spend-fixture.mjs",
    ),
  },
};

if (!targets[target]) {
  console.error(
    'Expected target "shield", "claim", "send", "swap-to-shielded", or "actual-private-spend".',
  );
  process.exit(1);
}

const config = targets[target];
const compiledProgramPath = resolve(config.circuitDir, `target/${config.circuitName}.json`);
const witnessPath = resolve(config.circuitDir, `target/${config.circuitName}.gz`);
const proofReceiptPath = resolve(config.circuitDir, `target/${config.circuitName}.proof.json`);
const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: "pipe",
  });
}

function printCapturedOutput(output) {
  const trimmed = output.trim();
  if (trimmed) {
    console.log(trimmed);
  }
}

function writeFixture() {
  runCommand("node", [config.fixtureWriterPath, "valid"], { cwd: repoRoot, env: process.env });
}

function runNargo(args) {
  return runCommand("nargo", args, { cwd: config.circuitDir, env: nargoEnv });
}

let restoredValidFixture = false;

try {
  writeFixture();
  restoredValidFixture = true;
  console.log("valid fixture write: PASS");

  printCapturedOutput(runNargo(["compile"]));
  console.log("nargo compile: PASS");

  printCapturedOutput(runNargo(["execute"]));
  console.log("witness generation: PASS");

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

    mkdirSync(resolve(config.circuitDir, "target"), { recursive: true });
    writeFileSync(
      proofReceiptPath,
      `${JSON.stringify(
        {
          backend: "barretenberg-ultrahonk",
          circuit: config.circuitName,
          proofByteLength: proofData.proof.length,
          proofHex: Buffer.from(proofData.proof).toString("hex"),
          publicInputCount: proofData.publicInputs.length,
          publicInputs: proofData.publicInputs,
          verified,
          witnessSource: `target/${config.circuitName}.gz`,
          bytecodeSource: `target/${config.circuitName}.json`,
        },
        null,
        2,
      )}\n`,
    );

    console.log("proof generation: PASS");
    console.log("proof verification: PASS");
    console.log(`proof receipt written: ${proofReceiptPath}`);
  } finally {
    await api.destroy();
  }

  writeFixture();
  console.log("fixture restore: PASS");
} catch (error) {
  try {
    writeFixture();
    restoredValidFixture = true;
    console.log("fixture restore after failure: PASS");
  } catch (restoreError) {
    const restoreMessage =
      restoreError instanceof Error ? restoreError.message : String(restoreError);
    console.error(`fixture restore after failure: FAIL\n${restoreMessage}`);
  }

  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (!restoredValidFixture) {
    process.exitCode = 1;
  }
}
