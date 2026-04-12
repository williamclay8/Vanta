import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPrivateCoreConsumeStore } from "../operator/private-core-consume-store.mjs";
import { proveAndVerifyVantaPrivateCoreUnshield } from "../operator/private-core-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-consume-check-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

try {
  const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
  const proofBoundarySource = readFileSync(
    resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
    "utf8",
  ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

  mkdirSync(tempTsDir, { recursive: true });
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

  const compiledModule = await import(pathToFileURL(compiledProofBoundaryPath).href);
  const fixture = compiledModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
  const witnessPackage = fixture.validBoundary.noirWitnessPackage;
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;

  const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({ witnessPackage });
  printStatus(
    `operator proof seam: PASS (${proofReceipt.proofFieldCount} fields / ${proofReceipt.publicInputCount} public inputs)`,
  );

  const consumeStore = createPrivateCoreConsumeStore({
    defaultPath: join(tempRoot, "consumes.json"),
  });

  if (consumeStore.hasNullifier(sourcePublicInputs.nullifier)) {
    throw new Error("operator consume store unexpectedly contained the fixture nullifier");
  }

  consumeStore.recordConsume({
    assetId: sourcePublicInputs.assetId,
    amount: sourcePublicInputs.amount,
    completedAt: Date.now(),
    leafIndex: witnessPackage.privateWitness.leaf_index,
    nullifier: sourcePublicInputs.nullifier,
    proofFieldCount: proofReceipt.proofFieldCount,
    publicInputCount: proofReceipt.publicInputCount,
    releaseDestination: sourcePublicInputs.releaseDestination,
    root: sourcePublicInputs.stateRoot,
  });
  printStatus("operator consume first pass: PASS");

  if (!consumeStore.hasNullifier(sourcePublicInputs.nullifier)) {
    throw new Error("operator consume store did not retain the first-consume nullifier");
  }

  printStatus("operator replay rejection basis: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
