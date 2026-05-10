import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

async function loadSwapBoundaryModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-boundary-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(
      join(tempTsDir, "vantaPrivateCore.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
    );
    writeFileSync(
      join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"), "utf8").replaceAll(
        '@/zk/vantaPrivateCore',
        "./vantaPrivateCore.js",
      ),
    );

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

    return await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSwapProof.js")).href);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const swapProof = await loadSwapBoundaryModule();
const boundary = swapProof.getVantaPrivateCoreSwapProofBoundaryExample();

if (boundary.readiness !== "ready") {
  throw new Error(`expected ready swap boundary, received ${boundary.readiness}`);
}
if (boundary.blockers.length !== 0) {
  throw new Error(`expected zero swap boundary blockers, received ${boundary.blockers.length}`);
}
if (boundary.noirWitnessPackage.merkleDepth !== 20) {
  throw new Error(`expected swap witness merkle depth 20, received ${String(boundary.noirWitnessPackage.merkleDepth)}`);
}
if (boundary.publicInputs.inputAssetId === boundary.publicInputs.outputAssetId) {
  throw new Error("expected swap boundary to change assets");
}
if (boundary.publicInputs.inputNoteVersion !== 0 || boundary.publicInputs.outputNoteVersion !== 0) {
  throw new Error("expected swap boundary to remain on note-v0");
}
if (boundary.noirWitnessPackage.publicInputs.input_note_version !== "0") {
  throw new Error("expected encoded input note version to be 0");
}
if (boundary.noirWitnessPackage.publicInputs.output_note_version !== "0") {
  throw new Error("expected encoded output note version to be 0");
}
if (boundary.noirWitnessPackage.publicInputs.swap_context_tag_lo === "0") {
  throw new Error("expected swap context tag to be populated");
}
if (
  boundary.noirWitnessPackage.privateWitness.membership_path_direction_bits.length !==
  boundary.noirWitnessPackage.merkleDepth
) {
  throw new Error("expected swap boundary membership path to match fixed depth");
}

printStatus("private-core swap boundary example: PASS");
