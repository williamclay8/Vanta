import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createVantaPrivatePoolV2ProofArtifactPublicInputCommitment,
  createVantaPrivatePoolV2ProofArtifactVerifyingKeyMetadata,
} from "../operator/private-pool-v2-proof-artifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
let target = "shield";
let witnessJsonPath = null;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--witness-json") {
    witnessJsonPath = args[index + 1] ?? null;
    index += 1;
    continue;
  }

  target = arg ?? target;
}

const targets = {
  shield: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_shield_entry"),
    circuitName: "vanta_private_pool_v2_shield_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-shield-fixture.mjs"),
    noWitnessProofArtifact: true,
    publicInputLabels: ["shield-public-input-hash"],
  },
  claim: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_claim_entry"),
    circuitName: "vanta_private_pool_v2_claim_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-claim-fixture.mjs"),
    noWitnessProofArtifact: true,
    publicInputLabels: ["claim-public-input-hash"],
  },
  send: {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_send_entry"),
    circuitName: "vanta_private_pool_v2_send_entry",
    fixtureWriterPath: resolve(repoRoot, "scripts/write-vanta-private-pool-v2-send-fixture.mjs"),
    noWitnessProofArtifact: true,
    publicInputLabels: ["send-public-input-hash"],
  },
  "swap-to-shielded": {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry"),
    circuitName: "vanta_private_pool_v2_swap_to_shielded_entry",
    fixtureWriterPath: resolve(
      repoRoot,
      "scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs",
    ),
    noWitnessProofArtifact: true,
    publicInputLabels: ["swap-public-input-hash"],
  },
  "actual-private-spend": {
    circuitDir: resolve(repoRoot, "zk/noir/vanta_private_pool_v2_actual_private_spend_entry"),
    circuitName: "vanta_private_pool_v2_actual_private_spend_entry",
    fixtureWriterPath: resolve(
      repoRoot,
      "scripts/write-vanta-private-pool-v2-actual-private-spend-fixture.mjs",
    ),
    noWitnessProofArtifact: true,
    publicInputLabels: ["private-spend-public-input-hash"],
  },
};

if (!targets[target]) {
  console.error(
    'Expected target "shield", "claim", "send", "swap-to-shielded", or "actual-private-spend".',
  );
  process.exit(1);
}

if (witnessJsonPath !== null && !witnessJsonPath.trim()) {
  console.error("--witness-json requires a path.");
  process.exit(1);
}

if (
  witnessJsonPath !== null &&
  target !== "actual-private-spend" &&
  target !== "send"
) {
  console.error("--witness-json is only supported for actual-private-spend or send.");
  process.exit(1);
}

const config = targets[target];
const proofBackend =
  witnessJsonPath === null ? "local-bb-fixture-artifact" : "local-bb-derived-artifact";
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

function writeFixture({ useWitnessInput = false } = {}) {
  const args = [config.fixtureWriterPath, "valid"];
  if (useWitnessInput && witnessJsonPath !== null) {
    args.push("--witness-json", witnessJsonPath);
  }
  runCommand("node", args, { cwd: repoRoot, env: process.env });
}

function runNargo(args) {
  return runCommand("nargo", args, { cwd: config.circuitDir, env: nargoEnv });
}

let restoredValidFixture = false;

try {
  writeFixture({ useWitnessInput: true });
  restoredValidFixture = true;
  console.log(witnessJsonPath === null ? "valid fixture write: PASS" : "witness-input fixture write: PASS");

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

    const proofReceipt = {
      backend: "barretenberg-ultrahonk",
      circuit: config.circuitName,
      proofBackend,
      proofByteLength: proofData.proof.length,
      proofHex: Buffer.from(proofData.proof).toString("hex"),
      proofSystem: "noir-bb",
      publicInputCommitment: createVantaPrivatePoolV2ProofArtifactPublicInputCommitment(
        proofData.publicInputs,
      ),
      publicInputCount: proofData.publicInputs.length,
      publicInputLabels: config.publicInputLabels ?? [],
      publicInputs: proofData.publicInputs,
      verified,
      ...createVantaPrivatePoolV2ProofArtifactVerifyingKeyMetadata(
        compiledProgram,
        config.circuitName,
      ),
      ...(config.noWitnessProofArtifact
        ? {}
        : {
            witnessSource: `target/${config.circuitName}.gz`,
            bytecodeSource: `target/${config.circuitName}.json`,
          }),
    };

    mkdirSync(resolve(config.circuitDir, "target"), { recursive: true });
    writeFileSync(
      proofReceiptPath,
      `${JSON.stringify(proofReceipt, null, 2)}\n`,
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
