import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-local-runtime-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2LocalIndexer.ts",
  "privatePoolV2LocalProver.ts",
  "privatePoolV2LocalRelayer.ts",
  "privatePoolV2LocalVerifierRegistry.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

async function expectRejection(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", received "${message}".`,
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
}

try {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
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

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const [
    { createVantaPrivatePoolV2ClaimProofRequest, createVantaPrivatePoolV2ShieldProofRequest },
    { createVantaPrivatePoolV2LocalIndexer },
    { createVantaPrivatePoolV2LocalProver },
    { createVantaPrivatePoolV2LocalRelayer },
    { createVantaPrivatePoolV2LocalVerifierRegistry },
  ] = await Promise.all([
    import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalIndexer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalProver.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalRelayer.js")).href),
    import(pathToFileURL(join(tempJsDir, "privatePoolV2LocalVerifierRegistry.js")).href),
  ]);

  const indexer = createVantaPrivatePoolV2LocalIndexer();
  const previousRoot = await indexer.getCurrentRoot("vanta-test-tree");
  const commitment = indexer.appendCommitment({
    assetId: "USDC",
    commitment: "field:shield-output-commitment",
    treeId: "vanta-test-tree",
  });
  const currentRoot = await indexer.getCurrentRoot("vanta-test-tree");
  const merkleProof = await indexer.getMerkleProof(commitment.commitment);
  const listedCommitments = await indexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });

  assert(commitment.leafIndex === 0, "Expected first local commitment to be leaf 0.");
  assert(commitment.merkleRoot === currentRoot, "Expected appended commitment root to be current.");
  assert(merkleProof.root === currentRoot, "Expected Merkle proof to bind current root.");
  assert(listedCommitments.length === 1, "Expected one listed local commitment.");
  console.log("local indexer append: PASS");

  const nullifier = indexer.registerNullifier({
    nullifier: "field:manual-nullifier",
    spentAtSlot: 1_000_001n,
  });
  assert(nullifier.spentAtSlot === 1_000_001n, "Expected registered nullifier slot.");
  assert(
    (await indexer.getNullifier("field:manual-nullifier"))?.nullifier === "field:manual-nullifier",
    "Expected registered nullifier lookup.",
  );
  console.log("local indexer nullifier registration: PASS");

  await expectRejection(
    () =>
      indexer.registerNullifier({
        nullifier: "field:manual-nullifier",
        spentAtSlot: 1_000_002n,
      }),
    "already registered",
  );
  console.log("local indexer nullifier replay rejection: PASS");

  const proofRequest = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 1_000_000n,
    ownerCommitment: "field:owner",
    previousRoot,
    routeCommitment: "field:route",
    sourceMintAddress: "mint:public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:shielded-usdc",
    treeCommitment: commitment,
  });
  const prover = createVantaPrivatePoolV2LocalProver();
  const proof = await prover.prove(proofRequest);
  assert(await prover.verify({ proof, request: proofRequest }), "Expected local proof to verify.");
  console.log("local prover verify: PASS");

  const verifierIndexer = createVantaPrivatePoolV2LocalIndexer();
  const verifierRegistry = createVantaPrivatePoolV2LocalVerifierRegistry({
    indexer: verifierIndexer,
    prover,
  });
  const shieldReceipt = await verifierRegistry.acceptProof({
    proof,
    request: proofRequest,
  });
  assert(shieldReceipt.intent === "shield", "Expected shield receipt.");
  assert(verifierRegistry.receipts.length === 1, "Expected one verifier receipt.");
  const verifierCommitments = await verifierIndexer.listCommitments({
    assetId: "USDC",
    treeId: "vanta-test-tree",
  });
  assert(verifierCommitments.length === 1, "Expected verifier to append shield commitment.");
  assert(
    verifierCommitments[0]?.commitment === "field:shield-output-commitment",
    "Expected verifier commitment output to match shield public inputs.",
  );
  console.log("local verifier shield commitment append: PASS");
  console.log("local verifier shield receipt: PASS");

  const tamperedProof = {
    ...proof,
    publicInputCommitment: `${proof.publicInputCommitment}:tampered`,
  };
  assert(
    !(await prover.verify({ proof: tamperedProof, request: proofRequest })),
    "Expected tampered local proof to be rejected.",
  );
  console.log("local prover tamper rejection: PASS");

  const relayer = createVantaPrivatePoolV2LocalRelayer();
  const quote = await relayer.quoteClaim({
    amountBaseUnits: 1_000_000n,
    assetId: "USDC",
    destinationAddress: "recipient-public-address",
  });
  const claim = await relayer.submitClaim({
    quote,
    serializedTransaction: "serialized-claim-transaction",
  });

  assert(claim.signature.startsWith("0x"), "Expected deterministic local claim signature.");
  assert(relayer.submittedClaims.length === 1, "Expected one submitted local relayer claim.");
  console.log("local relayer claim: PASS");

  const claimProofRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 1_000_000n,
    destinationAddress: "recipient-public-address",
    merkleProof,
    nullifier: "field:nullifier",
    ownerCommitment: "field:owner",
    quote,
  });
  const claimProof = await prover.prove(claimProofRequest);
  assert(
    await prover.verify({ proof: claimProof, request: claimProofRequest }),
    "Expected local claim proof to verify.",
  );
  console.log("local claim proof verify: PASS");

  const claimReceipt = await verifierRegistry.acceptProof({
    proof: claimProof,
    request: claimProofRequest,
  });
  assert(claimReceipt.intent === "claim", "Expected claim receipt.");
  assert(
    (await verifierIndexer.getNullifier("field:nullifier"))?.nullifier === "field:nullifier",
    "Expected verifier registry to register claim nullifier.",
  );
  console.log("local verifier claim receipt: PASS");

  await expectRejection(
    () =>
      verifierRegistry.acceptProof({
        proof: claimProof,
        request: claimProofRequest,
      }),
    "already been accepted",
  );
  console.log("local verifier nullifier replay rejection: PASS");

  await expectRejection(
    () =>
      relayer.submitClaim({
        quote,
        serializedTransaction: "serialized-claim-transaction",
      }),
    "already been submitted",
  );
  console.log("local relayer replay rejection: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
