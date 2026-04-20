import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-shield-request-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
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

  const {
    createVantaPrivatePoolV2ClaimProofRequest,
    createVantaPrivatePoolV2ShieldProofRequest,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);
  const treeCommitment = {
    assetId: "USDC",
    commitment: "field:output-commitment",
    leafIndex: 42,
    merkleRoot: "field:output-root",
    treeId: "vanta-private-pool-v2-usdc",
  };
  const request = createVantaPrivatePoolV2ShieldProofRequest({
    amountBaseUnits: 1_000_000n,
    ownerCommitment: "field:owner",
    previousRoot: "field:previous-root",
    routeCommitment: "field:route",
    sourceMintAddress: "mint:public-usdc",
    targetAssetId: "USDC",
    targetMintAddress: "mint:shielded-usdc",
    treeCommitment,
  });

  const expectedPublicInputs = [
    "vanta-private-pool-v2-shield-proof-request-0.1:version",
    "source-mint:mint:public-usdc",
    "target-mint:mint:shielded-usdc",
    "target-asset:USDC",
    "amount:1000000",
    "owner-commitment:field:owner",
    "route-commitment:field:route",
    "tree-id:vanta-private-pool-v2-usdc",
    "leaf-index:42",
    "output-commitment:field:output-commitment",
    "previous-root:field:previous-root",
    "output-root:field:output-root",
  ];

  assert(request.intent === "shield", "Expected shield intent.");
  assert(request.assetId === "USDC", "Expected target asset id.");
  assert(request.amountBaseUnits === 1_000_000n, "Expected amount base units.");
  assert(
    JSON.stringify(request.publicInputs) === JSON.stringify(expectedPublicInputs),
    "Expected stable shield proof public-input ordering.",
  );
  console.log("shield proof request public inputs: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ShieldProofRequest({
        amountBaseUnits: 0n,
        ownerCommitment: "field:owner",
        sourceMintAddress: "mint:public-usdc",
        targetAssetId: "USDC",
        targetMintAddress: "mint:shielded-usdc",
        treeCommitment,
      }),
    "amount must be positive",
  );
  console.log("shield proof request positive amount guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ShieldProofRequest({
        amountBaseUnits: 1n,
        ownerCommitment: " ",
        sourceMintAddress: "mint:public-usdc",
        targetAssetId: "USDC",
        targetMintAddress: "mint:shielded-usdc",
        treeCommitment,
      }),
    "owner commitment",
  );
  console.log("shield proof request owner guard: PASS");

  const merkleProof = {
    leaf: treeCommitment,
    path: ["field:sibling-0", "field:sibling-1"],
    pathIndices: [0, 1],
    root: "field:input-root",
  };
  const quote = {
    estimatedFeeBaseUnits: 100n,
    expiresAtSlot: 1_000_150n,
    relayerId: "relayer:vanta-local",
  };
  const claimRequest = createVantaPrivatePoolV2ClaimProofRequest({
    amountBaseUnits: 1_000_000n,
    destinationAddress: "recipient-public-address",
    merkleProof,
    nullifier: "field:nullifier",
    ownerCommitment: "field:owner",
    quote,
  });
  const expectedClaimPublicInputs = [
    "vanta-private-pool-v2-claim-proof-request-0.1:version",
    "asset:USDC",
    "amount:1000000",
    "owner-commitment:field:owner",
    "tree-id:vanta-private-pool-v2-usdc",
    "leaf-index:42",
    "input-commitment:field:output-commitment",
    "input-root:field:input-root",
    "nullifier:field:nullifier",
    "destination:recipient-public-address",
    "relayer:relayer:vanta-local",
    "relayer-fee:100",
    "quote-expires-at-slot:1000150",
  ];

  assert(claimRequest.intent === "claim", "Expected claim intent.");
  assert(claimRequest.assetId === "USDC", "Expected claim asset id.");
  assert(
    JSON.stringify(claimRequest.publicInputs) === JSON.stringify(expectedClaimPublicInputs),
    "Expected stable claim proof public-input ordering.",
  );
  console.log("claim proof request public inputs: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2ClaimProofRequest({
        amountBaseUnits: 1n,
        destinationAddress: "recipient-public-address",
        merkleProof,
        nullifier: " ",
        ownerCommitment: "field:owner",
        quote,
      }),
    "nullifier",
  );
  console.log("claim proof request nullifier guard: PASS");
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
