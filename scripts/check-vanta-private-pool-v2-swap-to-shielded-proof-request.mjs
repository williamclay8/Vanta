import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-swap-request-"));
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

function assertNoRawTerms(request, rawTerms) {
  const serialized = JSON.stringify(request, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  for (const term of rawTerms) {
    assert(!serialized.includes(term), `Private swap proof request leaked raw term: ${term}.`);
  }
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
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    createVantaPrivatePoolV2SwapToShieldedProofRequest,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);

  assert(
    typeof createVantaPrivatePoolV2SwapToShieldedProofRequest === "function",
    "Expected createVantaPrivatePoolV2SwapToShieldedProofRequest export.",
  );

  const request = createVantaPrivatePoolV2SwapToShieldedProofRequest({
    economicsCommitment: "field:economics",
    inputCommitment: "field:input-note",
    inputRoot: "field:input-root",
    minOutputAmount: "4700",
    nullifierOrReplayCommitment: "field:nullifier",
    outputAmount: "4800",
    outputCommitment: "field:output-note",
    outputLeafIndex: "51",
    outputRoot: "field:output-root",
    ownerCommitment: "field:owner",
    routeCommitment: "field:route",
    settlementCommitment: "field:settlement",
    slippageBps: "50",
    swapContextTag: "field:swap-context",
    swapPublicInputHash: "field:swap-public-input-hash",
    validUntilSlot: "1000275",
  });

  assert(request.intent === "swap-to-shielded", "Expected swap-to-shielded intent.");
  assert(
    request.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Expected private swap proof request to use the hidden-economics asset sentinel.",
  );
  assert(
    request.amountBaseUnits === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Expected private swap proof request to use the hidden-economics amount sentinel.",
  );
  assert(
    JSON.stringify(request.publicInputs) ===
      JSON.stringify([
        "vanta-private-pool-v2-swap-to-shielded-proof-request-0.1:version",
        "input-root:field:input-root",
        "input-commitment:field:input-note",
        "nullifier-or-replay-commitment:field:nullifier",
        "settlement-commitment:field:settlement",
        "route-commitment:field:route",
        "economics-commitment:field:economics",
        "output-commitment:field:output-note",
        "output-leaf-index:51",
        "output-root:field:output-root",
        "owner-commitment:field:owner",
        "swap-context-tag:field:swap-context",
        "valid-until-slot:1000275",
      ]),
    "Expected stable private swap proof public-input ordering.",
  );
  assert(
    JSON.stringify(request.circuitPublicInputs) ===
      JSON.stringify(["swap-public-input-hash:field:swap-public-input-hash"]),
    "Expected private swap circuit public inputs to be hash-only.",
  );
  assert(
    request.operatorVisibleTerms === undefined,
    "Private swap proof request must not mark raw terms as operator-visible.",
  );
  assert(
    request.shadowCommitments === undefined,
    "Private swap proof request must not reuse shield/claim operator-visible shadow commitments.",
  );
  assertNoRawTerms(request, [
    "USDC",
    "SOL",
    "USDC",
    "1000000",
    "250000000",
    "Meteora",
    "DLMM",
    "pool-address",
    "quote-id",
    "amount:",
    "asset:",
    "input-asset:",
    "output-asset:",
    "input-amount:",
    "output-amount:",
    "min-output-amount:",
    "slippage-bps:",
    "4700",
    "4800",
    "50",
    "venue:",
  ]);
  console.log("private-pool-v2 swap proof request public inputs: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "",
        minOutputAmount: "4700",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: "4800",
        outputCommitment: "field:output-note",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: "50",
        swapContextTag: "field:swap-context",
        validUntilSlot: "1000275",
      }),
    "input root",
  );
  console.log("private-pool-v2 swap proof request input-root guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        minOutputAmount: "4700",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: "4800",
        outputCommitment: " ",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: "50",
        swapContextTag: "field:swap-context",
        validUntilSlot: "1000275",
      }),
    "output commitment",
  );
  console.log("private-pool-v2 swap proof request output guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        minOutputAmount: "4700",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: " ",
        outputCommitment: "field:output-note",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: "50",
        swapContextTag: "field:swap-context",
        validUntilSlot: "1000275",
      }),
    "output amount",
  );
  console.log("private-pool-v2 swap proof request output amount guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        minOutputAmount: " ",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: "4800",
        outputCommitment: "field:output-note",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: "50",
        swapContextTag: "field:swap-context",
        validUntilSlot: "1000275",
      }),
    "minimum output amount",
  );
  console.log("private-pool-v2 swap proof request min output amount guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        minOutputAmount: "4700",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: "4800",
        outputCommitment: "field:output-note",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: " ",
        swapContextTag: "field:swap-context",
        validUntilSlot: "1000275",
      }),
    "slippage bps",
  );
  console.log("private-pool-v2 swap proof request slippage bps guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SwapToShieldedProofRequest({
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        minOutputAmount: "4700",
        nullifierOrReplayCommitment: "field:nullifier",
        outputAmount: "4800",
        outputCommitment: "field:output-note",
        outputLeafIndex: "51",
        outputRoot: "field:output-root",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        slippageBps: "50",
        swapContextTag: "field:swap-context",
        validUntilSlot: " ",
      }),
    "valid-until slot",
  );
  console.log("private-pool-v2 swap proof request valid-until slot guard: PASS");
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
