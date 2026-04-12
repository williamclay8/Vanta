import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPrivateCoreConsumeStore } from "../operator/private-core-consume-store.mjs";
import { assertVantaPrivateCoreSourceArtifactConsistency } from "../operator/private-core-proof.mjs";
import { proveAndVerifyVantaPrivateCoreUnshield } from "../operator/private-core-proof.mjs";
import { createPrivateCoreRootStore } from "../operator/private-core-root-store.mjs";
import { createReleaseRecordStore } from "../operator/release-record-store.mjs";

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
  const sourceArtifacts = fixture.validSourceArtifacts;

  const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({ witnessPackage });
  printStatus(
    `operator proof seam: PASS (${proofReceipt.proofFieldCount} fields / ${proofReceipt.publicInputCount} public inputs)`,
  );

  for (const tamperCase of [
    {
      expectedMessage: "mismatched amount public inputs",
      label: "amount",
      mutate: () => ({ amount: "1" }),
    },
    {
      expectedMessage: "mismatched release destination public inputs",
      label: "release-destination",
      mutate: () => ({
        releaseDestination:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      }),
    },
    {
      expectedMessage: "mismatched asset public inputs",
      label: "asset",
      mutate: () => ({
        assetId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    },
    {
      expectedMessage: "mismatched note-version public inputs",
      label: "note-version",
      mutate: () => ({ noteVersion: 99 }),
    },
  ]) {
    const tamperedWitnessPackage = {
      ...witnessPackage,
      sourcePublicInputs: {
        ...witnessPackage.sourcePublicInputs,
        ...tamperCase.mutate(),
      },
    };

    try {
      await proveAndVerifyVantaPrivateCoreUnshield({ witnessPackage: tamperedWitnessPackage });
      throw new Error(
        `operator proof seam unexpectedly accepted mismatched ${tamperCase.label} source public input`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes(tamperCase.expectedMessage)) {
        throw error;
      }
    }
  }
  printStatus("operator source/public consistency gate: PASS");

  try {
    assertVantaPrivateCoreSourceArtifactConsistency(
      {
        noteCommitment: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
      witnessPackage,
    );
    throw new Error("operator source-artifact seam unexpectedly accepted a mismatched note commitment");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("mismatched note commitment")) {
      throw error;
    }
  }
  printStatus("operator source-artifact consistency gate: PASS");

  for (const missingFieldCase of [
    {
      expectedMessage: "missing a note commitment",
      sourceArtifacts: {
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a Merkle leaf",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a witness root",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        merkleLeaf: sourceArtifacts.merkleLeaf,
      },
    },
  ]) {
    try {
      assertVantaPrivateCoreSourceArtifactConsistency(missingFieldCase.sourceArtifacts, witnessPackage);
      throw new Error(
        `operator source-artifact seam unexpectedly accepted ${missingFieldCase.expectedMessage}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes(missingFieldCase.expectedMessage)) {
        throw error;
      }
    }
  }
  printStatus("operator source-artifact required fields: PASS");

  for (const tamperCase of [
    {
      expectedMessage: "mismatched Merkle leaf",
      sourceArtifacts: {
        ...sourceArtifacts,
        merkleLeaf: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    },
    {
      expectedMessage: "mismatched witness root",
      sourceArtifacts: {
        ...sourceArtifacts,
        witnessRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
    },
  ]) {
    try {
      assertVantaPrivateCoreSourceArtifactConsistency(tamperCase.sourceArtifacts, witnessPackage);
      throw new Error(`operator source-artifact seam unexpectedly accepted ${tamperCase.expectedMessage}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes(tamperCase.expectedMessage)) {
        throw error;
      }
    }
  }
  printStatus("operator source-artifact extended gate: PASS");

  const consumeStore = createPrivateCoreConsumeStore({
    defaultPath: join(tempRoot, "consumes.json"),
  });
  const releaseStore = createReleaseRecordStore({
    defaultPath: join(tempRoot, "private-core-releases.json"),
    envKey: "VANTA_PRIVATE_CORE_RELEASE_STORE_PATH",
  });
  const rootStore = createPrivateCoreRootStore({
    defaultPath: join(tempRoot, "roots.json"),
  });

  if (rootStore.hasRoot(sourcePublicInputs.stateRoot)) {
    throw new Error("operator root store unexpectedly contained the fixture root");
  }
  printStatus("operator root currentness basis: PASS");

  rootStore.recordRoot({
    amount: sourcePublicInputs.amount,
    assetId: sourcePublicInputs.assetId,
    noteCommitment: sourceArtifacts.noteCommitment,
    merkleLeaf: sourceArtifacts.merkleLeaf,
    recordedAt: Date.now(),
    root: sourcePublicInputs.stateRoot,
    source: "operator-consume-check",
    witnessRoot: sourceArtifacts.witnessRoot,
  });
  printStatus("operator root registration: PASS");

  if (!rootStore.hasRoot(sourcePublicInputs.stateRoot)) {
    throw new Error("operator root store did not retain the registered root");
  }

  rootStore.recordRoot({
    amount: sourcePublicInputs.amount,
    assetId: sourcePublicInputs.assetId,
    noteCommitment: "stale-root-basis",
    merkleLeaf: sourceArtifacts.merkleLeaf,
    recordedAt: Date.now() + 1,
    root: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    source: "operator-consume-check-stale-root",
    witnessRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });

  if (rootStore.getLatestRoot()?.root !== "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") {
    throw new Error("operator root store did not advance to the newer stale-root basis");
  }
  printStatus("operator stale-root basis: PASS");

  rootStore.recordRoot({
    amount: sourcePublicInputs.amount,
    assetId: sourcePublicInputs.assetId,
    noteCommitment: sourceArtifacts.noteCommitment,
    merkleLeaf: sourceArtifacts.merkleLeaf,
    recordedAt: Date.now() + 2,
    root: sourcePublicInputs.stateRoot,
    source: "operator-consume-check-current-root",
    witnessRoot: sourceArtifacts.witnessRoot,
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
  releaseStore.recordRelease({
    assetId: sourcePublicInputs.assetId,
    amount: sourcePublicInputs.amount,
    completedAt: Date.now(),
    consumedNoteId: `private-core-nullifier:${sourcePublicInputs.nullifier}`,
    nullifier: sourcePublicInputs.nullifier,
    proofFieldCount: proofReceipt.proofFieldCount,
    publicInputCount: proofReceipt.publicInputCount,
    releaseDestination: sourcePublicInputs.releaseDestination,
    releasedAssetId: sourcePublicInputs.assetId,
    releasedAmount: sourcePublicInputs.amount,
    requestId: `private-core-release:${sourcePublicInputs.nullifier}:${sourcePublicInputs.stateRoot}`,
    root: sourcePublicInputs.stateRoot,
    transitionNoteId: `private-core-release:${sourcePublicInputs.stateRoot}:${sourcePublicInputs.releaseDestination}`,
  });
  printStatus("operator consume first pass: PASS");

  if (!consumeStore.hasNullifier(sourcePublicInputs.nullifier)) {
    throw new Error("operator consume store did not retain the first-consume nullifier");
  }

  const registeredRootRecord = rootStore.getLatestRoot();
  if (
    !registeredRootRecord ||
    registeredRootRecord.artifactBundleStatus !== "complete" ||
    registeredRootRecord.artifactBundleVersion !== 1 ||
    registeredRootRecord.noteCommitment !== sourceArtifacts.noteCommitment ||
    registeredRootRecord.merkleLeaf !== sourceArtifacts.merkleLeaf ||
    registeredRootRecord.witnessRoot !== sourceArtifacts.witnessRoot ||
    registeredRootRecord.assetId !== sourcePublicInputs.assetId ||
    registeredRootRecord.amount !== sourcePublicInputs.amount
  ) {
    throw new Error("operator root store metadata did not retain the witness-backed registration basis");
  }
  printStatus("operator root metadata basis: PASS");

  const latestReleaseRecord = releaseStore.listRecords()[0];
  if (
    !latestReleaseRecord ||
    latestReleaseRecord.nullifier !== sourcePublicInputs.nullifier ||
    latestReleaseRecord.root !== sourcePublicInputs.stateRoot ||
    latestReleaseRecord.releaseDestination !== sourcePublicInputs.releaseDestination ||
    latestReleaseRecord.releasedAssetId !== sourcePublicInputs.assetId ||
    latestReleaseRecord.releasedAmount !== sourcePublicInputs.amount ||
    !releaseStore.hasConsumedNoteId(`private-core-nullifier:${sourcePublicInputs.nullifier}`) ||
    !releaseStore.hasRequestId(
      `private-core-release:${sourcePublicInputs.nullifier}:${sourcePublicInputs.stateRoot}`,
    ) ||
    !releaseStore.hasTransitionNoteId(
      `private-core-release:${sourcePublicInputs.stateRoot}:${sourcePublicInputs.releaseDestination}`,
    )
  ) {
    throw new Error("operator release store did not retain the first authorized private-core release");
  }
  printStatus("operator release record basis: PASS");

  if (!releaseStore.hasConsumedNoteId(`private-core-nullifier:${sourcePublicInputs.nullifier}`)) {
    throw new Error("operator release store did not retain the release replay-rejection basis");
  }
  printStatus("operator release replay basis: PASS");

  printStatus("operator replay rejection basis: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
