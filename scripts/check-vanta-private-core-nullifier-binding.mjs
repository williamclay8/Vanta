import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-nullifier-binding-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

try {
  mkdirSync(tempTsDir, { recursive: true });
  const privateCoreSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCore.ts");
  const proofBoundarySourcePath = resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts");
  const privateCoreSource = readFileSync(privateCoreSourcePath, "utf8");
  const proofBoundarySource = readFileSync(proofBoundarySourcePath, "utf8").replace(
    /from "@\/zk\/vantaPrivateCore"/g,
    'from "./vantaPrivateCore"',
  );

  writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
  writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), proofBoundarySource);

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

  const compiledProofBoundaryPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
  writeFileSync(
    compiledProofBoundaryPath,
    readFileSync(compiledProofBoundaryPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    ),
  );

  const privateCore = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href);
  const proofBoundary = await import(pathToFileURL(compiledProofBoundaryPath).href);
  const fixture = proofBoundary.getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
  const note = privateCore.parseSerializedVantaPrivateCoreNoteV0(
    fixture.validBoundary.privateWitness.note,
  );
  const witness = {
    kind: "vanta-private-core-witness-response-v0",
    commitment: fixture.validBoundary.privateWitness.noteCommitment,
    leafIndex: fixture.validBoundary.privateWitness.leafIndex,
    proof: fixture.validBoundary.privateWitness.merkleProof,
    requestCommitment: fixture.validBoundary.privateWitness.noteCommitment,
    root: fixture.validBoundary.publicInputs.stateRoot,
  };
  const validNullifier = privateCore.deriveVantaPrivateCoreNullifier(note, witness);
  const alternateLeafIndexNullifier = privateCore.deriveVantaPrivateCoreNullifier(note, {
    ...witness,
    leafIndex: witness.leafIndex + 1,
  });

  assert.equal(
    alternateLeafIndexNullifier.value,
    validNullifier.value,
    "Nullifier must remain stable if leafIndex changes without changing the proved note/path.",
  );

  console.log("Vanta private core nullifier binding check: PASS");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
