import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { poseidon1, poseidon2, poseidon6, poseidon8, poseidon15 } from "poseidon-lite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_core_single_note_swap/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";

async function main() {
  if (
    fixtureMode !== "valid" &&
    fixtureMode !== "invalid-direction" &&
    fixtureMode !== "invalid-leaf-index" &&
    fixtureMode !== "invalid-sender-secret" &&
    fixtureMode !== "invalid-amount-range" &&
    fixtureMode !== "valid-asset-sum-collision"
  ) {
    throw new Error(
      'Expected fixture mode "valid", "invalid-direction", "invalid-leaf-index", "invalid-sender-secret", "invalid-amount-range", or "valid-asset-sum-collision". Example: node scripts/write-vanta-private-core-swap-fixture.mjs invalid-direction',
    );
  }

  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-swap-fixture-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCore.ts");
    const swapProofSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts");
    const privateCoreSource = readFileSync(privateCoreSourcePath, "utf8");
    const swapProofSource = readFileSync(swapProofSourcePath, "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    );

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSwapProof.ts"), swapProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--lib",
        "ES2022,DOM",
        "--skipLibCheck",
        "--outDir",
        tempJsDir,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSwapProof.js");
    const compiledModule = await import(pathToFileURL(compiledPath).href);
    const fixture = compiledModule.getVantaPrivateCoreFixedDepthSwapFixtureV0();
    const witnessPackage = createWitnessPackageForMode(fixture, fixtureMode);
    const toml = compiledModule.serializeVantaPrivateCoreNoirSwapWitnessPackageToToml(
      witnessPackage,
    );

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${toml}\n`);
    console.log(`Wrote ${fixtureMode} fixture to ${outputPath}`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function createWitnessPackageForMode(fixture, mode) {
  const validWitnessPackage = fixture.validBoundary.noirWitnessPackage;

  if (mode === "valid") {
    return validWitnessPackage;
  }

  if (mode === "invalid-direction") {
    return fixture.invalidDirectionWitnessPackage;
  }

  if (mode === "invalid-leaf-index") {
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        input_leaf_index: String(Number(validWitnessPackage.privateWitness.input_leaf_index) + 1),
      },
    };
  }

  if (mode === "invalid-sender-secret") {
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        sender_secret_key_hi: "0",
        sender_secret_key_lo: "0",
      },
    };
  }

  if (mode === "invalid-amount-range") {
    return createInvalidAmountRangeWitnessPackage(validWitnessPackage);
  }

  if (mode === "valid-asset-sum-collision") {
    return createValidAssetSumCollisionWitnessPackage(validWitnessPackage);
  }

  throw new Error(`Unsupported fixture mode ${mode}`);
}

function createInvalidAmountRangeWitnessPackage(validWitnessPackage) {
  const privateWitness = {
    ...validWitnessPackage.privateWitness,
    input_amount_lo: (1n << 64n).toString(10),
  };
  const inputCommitment = deriveInputCommitment(privateWitness);
  const inputLeaf = poseidon1([BigInt(inputCommitment)]).toString(10);
  const stateRoot = deriveRoot({
    leaf: inputLeaf,
    path: privateWitness.membership_path,
    pathDirectionBits: privateWitness.membership_path_direction_bits,
  });
  const inputNullifier = poseidon6([
    BigInt(privateWitness.input_note_secret_hi),
    BigInt(privateWitness.input_note_secret_lo),
    BigInt(privateWitness.input_note_nonce_hi),
    BigInt(privateWitness.input_note_nonce_lo),
    BigInt(stateRoot),
    BigInt(inputLeaf),
  ]).toString(10);
  const swapEconomicTermsHash = poseidon8([
    BigInt(privateWitness.input_asset_id_hi),
    BigInt(privateWitness.input_asset_id_lo),
    BigInt(privateWitness.output_asset_id_hi),
    BigInt(privateWitness.output_asset_id_lo),
    BigInt(privateWitness.input_amount_lo),
    BigInt(privateWitness.input_amount_hi),
    BigInt(privateWitness.output_amount_lo),
    BigInt(privateWitness.output_amount_hi),
  ]).toString(10);
  const swapContextTag = poseidon6([
    BigInt(inputNullifier),
    BigInt(validWitnessPackage.publicInputs.output_commitment),
    BigInt(swapEconomicTermsHash),
    BigInt(validWitnessPackage.publicInputs.input_note_version),
    BigInt(validWitnessPackage.publicInputs.output_note_version),
    0n,
  ]).toString(10);

  return {
    ...validWitnessPackage,
    publicInputs: {
      ...validWitnessPackage.publicInputs,
      input_nullifier: inputNullifier,
      state_root: stateRoot,
      swap_context_tag_hi: "0",
      swap_context_tag_lo: swapContextTag,
      swap_economic_terms_hash: swapEconomicTermsHash,
    },
    privateWitness,
  };
}

function createValidAssetSumCollisionWitnessPackage(validWitnessPackage) {
  const privateWitness = validWitnessPackage.privateWitness;
  const inputAssetHi = BigInt(privateWitness.input_asset_id_hi);
  const inputAssetLo = BigInt(privateWitness.input_asset_id_lo);
  const outputAssetHi = inputAssetHi + 1n;
  const outputAssetLo = inputAssetLo - 1n;
  const outputCommitment = deriveOutputCommitment({
    ...privateWitness,
    output_asset_id_hi: outputAssetHi.toString(10),
    output_asset_id_lo: outputAssetLo.toString(10),
  });
  const swapEconomicTermsHash = poseidon8([
    inputAssetHi,
    inputAssetLo,
    outputAssetHi,
    outputAssetLo,
    BigInt(privateWitness.input_amount_lo),
    BigInt(privateWitness.input_amount_hi),
    BigInt(privateWitness.output_amount_lo),
    BigInt(privateWitness.output_amount_hi),
  ]).toString(10);
  const swapContextTag = poseidon6([
    BigInt(validWitnessPackage.publicInputs.input_nullifier),
    BigInt(outputCommitment),
    BigInt(swapEconomicTermsHash),
    BigInt(validWitnessPackage.publicInputs.input_note_version),
    BigInt(validWitnessPackage.publicInputs.output_note_version),
    0n,
  ]).toString(10);

  return {
    ...validWitnessPackage,
    publicInputs: {
      ...validWitnessPackage.publicInputs,
      output_commitment: outputCommitment,
      swap_economic_terms_hash: swapEconomicTermsHash,
      swap_context_tag_hi: "0",
      swap_context_tag_lo: swapContextTag,
    },
    privateWitness: {
      ...privateWitness,
      output_asset_id_hi: outputAssetHi.toString(10),
      output_asset_id_lo: outputAssetLo.toString(10),
    },
  };
}

function deriveOutputCommitment(privateWitness) {
  const noteHeader = poseidon2([
    BigInt(privateWitness.output_note_version ?? "0"),
    BigInt(privateWitness.output_note_type_code),
  ]);

  return poseidon15([
    noteHeader,
    BigInt(privateWitness.output_asset_id_hi),
    BigInt(privateWitness.output_asset_id_lo),
    BigInt(privateWitness.output_amount_lo),
    BigInt(privateWitness.output_amount_hi),
    BigInt(privateWitness.output_owner_public_key_hi),
    BigInt(privateWitness.output_owner_public_key_lo),
    BigInt(privateWitness.output_note_nonce_hi),
    BigInt(privateWitness.output_note_nonce_lo),
    BigInt(privateWitness.output_note_secret_hi),
    BigInt(privateWitness.output_note_secret_lo),
    BigInt(privateWitness.output_blinding_hi),
    BigInt(privateWitness.output_blinding_lo),
    BigInt(privateWitness.output_derivation_tag_hi),
    BigInt(privateWitness.output_derivation_tag_lo),
  ]).toString(10);
}

function deriveInputCommitment(privateWitness) {
  const noteHeader = poseidon2([
    BigInt(privateWitness.input_note_version ?? "0"),
    BigInt(privateWitness.input_note_type_code),
  ]);

  return poseidon15([
    noteHeader,
    BigInt(privateWitness.input_asset_id_hi),
    BigInt(privateWitness.input_asset_id_lo),
    BigInt(privateWitness.input_amount_lo),
    BigInt(privateWitness.input_amount_hi),
    BigInt(privateWitness.sender_public_key_hi),
    BigInt(privateWitness.sender_public_key_lo),
    BigInt(privateWitness.input_note_nonce_hi),
    BigInt(privateWitness.input_note_nonce_lo),
    BigInt(privateWitness.input_note_secret_hi),
    BigInt(privateWitness.input_note_secret_lo),
    BigInt(privateWitness.input_blinding_hi),
    BigInt(privateWitness.input_blinding_lo),
    BigInt(privateWitness.input_derivation_tag_hi),
    BigInt(privateWitness.input_derivation_tag_lo),
  ]).toString(10);
}

function deriveRoot({ leaf, path, pathDirectionBits }) {
  return path.reduce((current, sibling, index) => {
    const isCurrentRight = pathDirectionBits[index] === "1";
    return (
      isCurrentRight
        ? poseidon2([BigInt(sibling), BigInt(current)])
        : poseidon2([BigInt(current), BigInt(sibling)])
    ).toString(10);
  }, leaf);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  setImmediate(() => process.exit(process.exitCode ?? 0));
}
