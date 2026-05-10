import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { poseidon1, poseidon2, poseidon8, poseidon15 } from "poseidon-lite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_core_single_note_unshield/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";

async function main() {
  const supportedFixtureModes = new Set([
    "valid",
    "invalid-direction",
    "invalid-leaf-index",
    "invalid-consume-context-split",
    "invalid-sibling-field",
    "invalid-amount-range",
    "invalid-owner-secret",
  ]);
  if (!supportedFixtureModes.has(fixtureMode)) {
    throw new Error(
      `Expected fixture mode ${Array.from(supportedFixtureModes).join(", ")}. Example: node scripts/write-vanta-private-core-unshield-fixture.mjs invalid-direction`,
    );
  }

  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-fixture-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCore.ts");
    const proofBoundarySourcePath = resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts");
    const privateCoreSource = readFileSync(privateCoreSourcePath, "utf8");
    const proofBoundarySource = readFileSync(proofBoundarySourcePath, "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore"',
    );

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), proofBoundarySource);

    try {
      execFileSync(
        resolve(repoRoot, "node_modules/.bin/tsc"),
        [
          join(tempTsDir, "vantaPrivateCore.ts"),
          join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
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
    } catch (error) {
      const stdout = String(error.stdout ?? "");
      const stderr = String(error.stderr ?? "");
      if (stdout) {
        console.error(stdout);
      }
      if (stderr) {
        console.error(stderr);
      }
      throw error;
    }

    const compiledProofBoundaryPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    const compiledProofBoundarySource = readFileSync(compiledProofBoundaryPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    );
    writeFileSync(compiledProofBoundaryPath, compiledProofBoundarySource);

    const compiledModule = await import(pathToFileURL(compiledProofBoundaryPath).href);
    const fixture = compiledModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
    const witnessPackage = createWitnessPackageForMode(
      fixture.validBoundary.noirWitnessPackage,
      fixtureMode,
    );
    const toml = compiledModule.serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(
      witnessPackage,
    );

    writeFileSync(outputPath, `${toml}\n`);
    console.log(`Wrote ${fixtureMode} fixture to ${outputPath}`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function createWitnessPackageForMode(validWitnessPackage, mode) {
  if (mode === "valid") {
    return validWitnessPackage;
  }

  if (mode === "invalid-direction") {
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        membership_path_direction_bits:
          validWitnessPackage.privateWitness.membership_path_direction_bits.map((bit, index) =>
            index === 0 ? (bit === "1" ? "0" : "1") : bit,
          ),
      },
    };
  }

  if (mode === "invalid-leaf-index") {
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        leaf_index: String(Number(validWitnessPackage.privateWitness.leaf_index) + 1),
      },
    };
  }

  if (mode === "invalid-consume-context-split") {
    const contextLo = BigInt(validWitnessPackage.publicInputs.consume_context_tag_lo ?? "0");
    return {
      ...validWitnessPackage,
      publicInputs: {
        ...validWitnessPackage.publicInputs,
        consume_context_tag_hi: "1",
        consume_context_tag_lo: (contextLo - 1n).toString(10),
      },
    };
  }

  if (mode === "invalid-sibling-field") {
    const sibling = BigInt(validWitnessPackage.privateWitness.membership_path[0]);
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        membership_path: validWitnessPackage.privateWitness.membership_path.map((value, index) =>
          index === 0 ? (sibling + 1n).toString(10) : value,
        ),
      },
    };
  }

  if (mode === "invalid-amount-range") {
    return createInvalidAmountRangeWitnessPackage(validWitnessPackage);
  }

  if (mode === "invalid-owner-secret") {
    const ownerSecretLo = BigInt(validWitnessPackage.privateWitness.owner_secret_key_lo);
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        owner_secret_key_lo: (ownerSecretLo + 1n).toString(10),
      },
    };
  }

  throw new Error(`Unsupported fixture mode ${mode}`);
}

function createInvalidAmountRangeWitnessPackage(validWitnessPackage) {
  const privateWitness = {
    ...validWitnessPackage.privateWitness,
    amount_lo: (1n << 64n).toString(10),
  };
  const commitment = deriveNoteCommitment(privateWitness, validWitnessPackage.publicInputs.note_version);
  const leaf = poseidon1([BigInt(commitment)]).toString(10);
  const stateRoot = deriveRoot({
    leaf,
    path: privateWitness.membership_path,
    pathDirectionBits: privateWitness.membership_path_direction_bits,
  });
  const nullifier = deriveNullifier(privateWitness, stateRoot, leaf);
  const consumeContextTag = poseidon8([
    BigInt(privateWitness.release_destination_hi),
    BigInt(privateWitness.release_destination_lo),
    BigInt(privateWitness.asset_id_hi),
    BigInt(privateWitness.asset_id_lo),
    BigInt(privateWitness.amount_lo),
    BigInt(privateWitness.amount_hi),
    BigInt(validWitnessPackage.publicInputs.note_version),
    BigInt(nullifier),
  ]).toString(10);
  const unshieldEconomicTermsHash = poseidon8([
    BigInt(privateWitness.release_destination_hi),
    BigInt(privateWitness.release_destination_lo),
    BigInt(privateWitness.asset_id_hi),
    BigInt(privateWitness.asset_id_lo),
    BigInt(privateWitness.amount_lo),
    BigInt(privateWitness.amount_hi),
    BigInt(validWitnessPackage.publicInputs.note_version),
    0n,
  ]).toString(10);

  return {
    ...validWitnessPackage,
    publicInputs: {
      ...validWitnessPackage.publicInputs,
      consume_context_tag_hi: "0",
      consume_context_tag_lo: consumeContextTag,
      nullifier,
      state_root: stateRoot,
      unshield_economic_terms_hash: unshieldEconomicTermsHash,
    },
    privateWitness,
  };
}

function deriveNullifier(privateWitness, stateRoot, leaf) {
  return poseidon8([
    BigInt(privateWitness.owner_public_key_hi),
    BigInt(privateWitness.owner_public_key_lo),
    BigInt(privateWitness.note_secret_hi),
    BigInt(privateWitness.note_secret_lo),
    BigInt(privateWitness.note_nonce_hi),
    BigInt(privateWitness.note_nonce_lo),
    BigInt(stateRoot),
    BigInt(leaf),
  ]).toString(10);
}

function deriveNoteCommitment(privateWitness, noteVersion) {
  const noteHeader = poseidon2([
    BigInt(noteVersion),
    BigInt(privateWitness.note_type_code),
  ]);

  return poseidon15([
    noteHeader,
    BigInt(privateWitness.asset_id_hi),
    BigInt(privateWitness.asset_id_lo),
    BigInt(privateWitness.amount_lo),
    BigInt(privateWitness.amount_hi),
    BigInt(privateWitness.owner_public_key_hi),
    BigInt(privateWitness.owner_public_key_lo),
    BigInt(privateWitness.note_nonce_hi),
    BigInt(privateWitness.note_nonce_lo),
    BigInt(privateWitness.note_secret_hi),
    BigInt(privateWitness.note_secret_lo),
    BigInt(privateWitness.blinding_hi),
    BigInt(privateWitness.blinding_lo),
    BigInt(privateWitness.derivation_tag_hi),
    BigInt(privateWitness.derivation_tag_lo),
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
