import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-nullifier-binding-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const circuitDir = resolve(repoRoot, "zk/noir/vanta_private_core_single_note_unshield");
const nargoEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
};
const createdCircuitFiles = new Set();

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
  const commitment = privateCore.deriveVantaPrivateCoreNoteCommitment(note);
  const rootAWitness = {
    kind: "vanta-private-core-witness-response-v0",
    commitment: commitment.value,
    leafIndex: fixture.validBoundary.privateWitness.leafIndex,
    proof: fixture.validBoundary.privateWitness.merkleProof,
    requestCommitment: commitment.value,
    root: fixture.validBoundary.privateWitness.merkleProof.root,
  };
  const rootBProof = extendProofToNewAcceptedRoot(privateCore, rootAWitness.proof);
  const rootBWitness = {
    ...rootAWitness,
    root: rootBProof.root,
    proof: rootBProof,
  };

  const leafIndexNullifier = privateCore.deriveVantaPrivateCoreNullifier(note, {
    ...rootAWitness,
    leafIndex: rootAWitness.leafIndex + 1,
  });
  const rootANullifier = privateCore.deriveVantaPrivateCoreNullifier(note, rootAWitness);
  const rootBNullifier = privateCore.deriveVantaPrivateCoreNullifier(note, rootBWitness);

  assert.equal(
    leafIndexNullifier.value,
    rootANullifier.value,
    "Nullifier must remain stable if leafIndex changes without changing the proved note/path.",
  );
  assert.notEqual(rootAWitness.root, rootBWitness.root, "Fixture must cover two distinct roots.");
  assert.equal(
    rootBNullifier.value,
    rootANullifier.value,
    "Nullifier must remain stable when the same note is proved under a different accepted root.",
  );

  const rootABoundary = fixture.validBoundary;
  const rootBBoundary = proofBoundary.buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote: {
      note,
      commitment,
      witness: rootBWitness,
    },
    ownerSecretKey: fixture.validBoundary.privateWitness.ownerSecretKey,
    releaseDestination: fixture.releaseDestination,
    circuitMerkleDepth: fixture.merkleDepth,
    requireNontrivialMerklePath: true,
  });

  assert.equal(
    rootABoundary.privateWitness.noteCommitment,
    rootBBoundary.privateWitness.noteCommitment,
    "Both fixtures must prove the same note commitment.",
  );
  assert.notEqual(
    rootABoundary.noirWitnessPackage.publicInputs.state_root,
    rootBBoundary.noirWitnessPackage.publicInputs.state_root,
    "Noir fixtures must cover two distinct proving roots.",
  );
  assert.equal(
    rootBBoundary.noirWitnessPackage.publicInputs.nullifier,
    rootABoundary.noirWitnessPackage.publicInputs.nullifier,
    "Noir nullifier public input must remain stable across accepted roots for the same note.",
  );

  runNargoWitnessPackage(
    proofBoundary,
    rootABoundary.noirWitnessPackage,
    "ppa_unshield_nullifier_root_a",
  );
  runNargoWitnessPackage(
    proofBoundary,
    rootBBoundary.noirWitnessPackage,
    "ppa_unshield_nullifier_root_b",
  );
  expectNargoWitnessPackageFailure(
    proofBoundary,
    withTamperedNullifier(rootBBoundary.noirWitnessPackage),
    "ppa_unshield_nullifier_tampered",
  );

  console.log("Vanta private core unshield nullifier binding fixture check: PASS");
} finally {
  for (const file of createdCircuitFiles) {
    rmSync(file, { force: true });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

function extendProofToNewAcceptedRoot(privateCore, proof) {
  const extensionSibling = "0x7777777777777777777777777777777777777777777777777777777777777777";
  return {
    ...proof,
    root: privateCore.deriveVantaPrivateCoreMerkleNodeHash(proof.root, extensionSibling),
    path: [
      ...proof.path,
      {
        direction: "right",
        sibling: extensionSibling,
      },
    ],
  };
}

function runNargoWitnessPackage(proofBoundary, witnessPackage, label) {
  const proverName = `${label}_${process.pid}`;
  const witnessName = `${label}_witness_${process.pid}`;
  const proverPath = join(circuitDir, `${proverName}.toml`);
  const witnessPath = join(circuitDir, "target", `${witnessName}.gz`);
  createdCircuitFiles.add(proverPath);
  createdCircuitFiles.add(witnessPath);

  writeFileSync(
    proverPath,
    `${proofBoundary.serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(witnessPackage)}\n`,
  );

  try {
    execFileSync("nargo", ["execute", "--prover-name", proverName, witnessName], {
      cwd: circuitDir,
      env: nargoEnv,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const status = error.status === undefined ? "unknown" : String(error.status);
    throw new Error(`nargo execute failed for ${label}; exit status ${status}`);
  } finally {
    rmSync(proverPath, { force: true });
    rmSync(witnessPath, { force: true });
  }
}

function expectNargoWitnessPackageFailure(proofBoundary, witnessPackage, label) {
  try {
    runNargoWitnessPackage(proofBoundary, witnessPackage, label);
  } catch {
    return;
  }

  throw new Error(`${label} fixture unexpectedly succeeded`);
}

function withTamperedNullifier(witnessPackage) {
  return {
    ...witnessPackage,
    publicInputs: {
      ...witnessPackage.publicInputs,
      nullifier: (BigInt(witnessPackage.publicInputs.nullifier) + 1n).toString(10),
    },
  };
}
