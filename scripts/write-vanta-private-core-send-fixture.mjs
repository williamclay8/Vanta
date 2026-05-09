import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_core_single_note_send/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";

async function main() {
  if (
    fixtureMode !== "valid" &&
    fixtureMode !== "invalid-direction" &&
    fixtureMode !== "invalid-leaf-index"
  ) {
    throw new Error(
      'Expected fixture mode "valid", "invalid-direction", or "invalid-leaf-index". Example: node scripts/write-vanta-private-core-send-fixture.mjs invalid-direction',
    );
  }

  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-send-fixture-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCore.ts");
    const sendProofSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts");
    const privateCoreSource = readFileSync(privateCoreSourcePath, "utf8");
    const sendProofSource = readFileSync(sendProofSourcePath, "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore"',
    );

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSendProof.ts"), sendProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
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

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    const compiledSource = readFileSync(compiledPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    );
    writeFileSync(compiledPath, compiledSource);

    const compiledModule = await import(pathToFileURL(compiledPath).href);
    const fixture = compiledModule.getVantaPrivateCoreFixedDepthSendFixtureV0();
    const witnessPackage = createWitnessPackageForMode(fixture, fixtureMode);
    const toml = compiledModule.serializeVantaPrivateCoreNoirSendWitnessPackageToToml(
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
