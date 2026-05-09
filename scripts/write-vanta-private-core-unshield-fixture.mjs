import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

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

  throw new Error(`Unsupported fixture mode ${mode}`);
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
