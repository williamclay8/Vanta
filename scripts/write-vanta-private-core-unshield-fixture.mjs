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

if (fixtureMode !== "valid" && fixtureMode !== "invalid-direction") {
  console.error(
    'Expected fixture mode "valid" or "invalid-direction". Example: node scripts/write-vanta-private-core-unshield-fixture.mjs invalid-direction',
  );
  process.exit(1);
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
  const witnessPackage =
    fixtureMode === "invalid-direction"
      ? {
          ...fixture.validBoundary.noirWitnessPackage,
          privateWitness: {
            ...fixture.validBoundary.noirWitnessPackage.privateWitness,
            membership_path_direction_bits:
              fixture.validBoundary.noirWitnessPackage.privateWitness.membership_path_direction_bits.map(
                (bit, index) => (index === 0 ? (bit === "1" ? "0" : "1") : bit),
              ),
          },
        }
      : fixture.validBoundary.noirWitnessPackage;
  const toml = compiledModule.serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(
    witnessPackage,
  );

  writeFileSync(outputPath, `${toml}\n`);
  console.log(`Wrote ${fixtureMode} fixture to ${outputPath}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
