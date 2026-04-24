import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-hidden-economics-"));
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
    assert(!serialized.includes(term), `Hidden economics request leaked raw term: ${term}.`);
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
    createVantaPrivatePoolV2HiddenEconomicsProofRequest,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);

  const baseArgs = {
    economicsCommitment: "field:economics",
    nullifierOrReplayCommitment: "field:replay",
    outputCommitment: "field:output-note",
    ownerCommitment: "field:owner",
    routeCommitment: "field:route",
    settlementCommitment: "field:settlement",
  };

  const sendRequest = createVantaPrivatePoolV2HiddenEconomicsProofRequest({
    ...baseArgs,
    intent: "private-send",
  });
  const swapRequest = createVantaPrivatePoolV2HiddenEconomicsProofRequest({
    ...baseArgs,
    inputCommitment: "field:input-note",
    intent: "swap-to-shielded",
  });

  for (const request of [sendRequest, swapRequest]) {
    assert(
      request.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
      "Expected redacted hidden-economics asset id.",
    );
    assert(
      request.amountBaseUnits === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
      "Expected redacted hidden-economics amount sentinel.",
    );
    assert(
      request.publicInputs.includes("economics-commitment:field:economics"),
      "Expected economics commitment public input.",
    );
    assertNoRawTerms(request, [
      "USDC",
      "1000000",
      "recipient-public-address",
      "settlement-id:checkout_123",
      "asset:",
      "asset-id:",
      "amount:",
      "destination:",
    ]);
  }

  assert(
    JSON.stringify(sendRequest.publicInputs) ===
      JSON.stringify([
        "vanta-private-pool-v2-hidden-economics-proof-request-0.1:version",
        "intent:private-send",
        "settlement-commitment:field:settlement",
        "owner-commitment:field:owner",
        "nullifier-or-replay-commitment:field:replay",
        "route-commitment:field:route",
        "economics-commitment:field:economics",
        "output-commitment:field:output-note",
      ]),
    "Expected stable private-send hidden-economics public-input ordering.",
  );
  console.log("private-pool-v2 hidden economics send request: PASS");

  assert(
    JSON.stringify(swapRequest.publicInputs) ===
      JSON.stringify([
        "vanta-private-pool-v2-hidden-economics-proof-request-0.1:version",
        "intent:swap-to-shielded",
        "settlement-commitment:field:settlement",
        "owner-commitment:field:owner",
        "nullifier-or-replay-commitment:field:replay",
        "route-commitment:field:route",
        "economics-commitment:field:economics",
        "input-commitment:field:input-note",
        "output-commitment:field:output-note",
      ]),
    "Expected stable swap hidden-economics public-input ordering.",
  );
  console.log("private-pool-v2 hidden economics swap request: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2HiddenEconomicsProofRequest({
        ...baseArgs,
        intent: "claim",
      }),
    "only supports private-send and swap-to-shielded",
  );
  console.log("private-pool-v2 hidden economics intent guard: PASS");
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
