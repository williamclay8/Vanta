import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-unshield-request-"));
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
    assert(!serialized.includes(term), `Private unshield proof request leaked raw term: ${term}.`);
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
	    computeVantaPrivatePoolV2UnshieldPublicInputHash,
	    createVantaPrivatePoolV2UnshieldProofRequest,
	  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);

  assert(
    typeof createVantaPrivatePoolV2UnshieldProofRequest === "function",
    "Expected createVantaPrivatePoolV2UnshieldProofRequest export.",
  );

	  const requestArgs = {
	    economicsCommitment: "field:economics",
	    exitTermsCommitment: "field:exit-terms",
	    inputCommitment: "field:input-note",
    inputRoot: "field:input-root",
    nullifierOrReplayCommitment: "field:nullifier",
    ownerCommitment: "field:owner",
	    proofBoundDestinationCommitment:
	      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
	    routeCommitment: "field:route",
	    settlementCommitment: "field:settlement",
	    unshieldContextTag: "field:unshield-context",
	    unshieldPublicInputHash: "field:unshield-public-input-hash",
	  };
	  const request = createVantaPrivatePoolV2UnshieldProofRequest(requestArgs);
	  const expectedUnshieldPublicInputHash =
	    computeVantaPrivatePoolV2UnshieldPublicInputHash(requestArgs);

  assert(request.intent === "unshield", "Expected unshield intent.");
  assert(
    request.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Expected private unshield request to use the hidden-economics asset sentinel.",
  );
  assert(
    request.amountBaseUnits === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Expected private unshield request to use the hidden-economics amount sentinel.",
  );
  assert(
    JSON.stringify(request.publicInputs) ===
      JSON.stringify([
        "vanta-private-pool-v2-unshield-proof-request-0.1:version",
        "input-root:field:input-root",
        "input-commitment:field:input-note",
        "nullifier-or-replay-commitment:field:nullifier",
        "settlement-commitment:field:settlement",
        "route-commitment:field:route",
        "exit-terms-commitment:field:exit-terms",
        "proof-bound-destination-commitment:sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "economics-commitment:field:economics",
        "owner-commitment:field:owner",
        "unshield-context-tag:field:unshield-context",
      ]),
    "Expected stable private unshield proof public-input ordering.",
  );
	  assert(
	    JSON.stringify(request.circuitPublicInputs) ===
	      JSON.stringify([`unshield-public-input-hash:${expectedUnshieldPublicInputHash}`]),
	    "Expected private unshield circuit public inputs to use the computed request hash.",
	  );
  assert(
    request.operatorVisibleTerms === undefined,
    "Private unshield proof request must not mark raw terms as operator-visible.",
  );
  assert(
    request.shadowCommitments === undefined,
    "Private unshield proof request must not reuse shield/claim operator-visible shadow commitments.",
  );
  assertNoRawTerms(request, [
    "USDC",
    "1000000",
    "recipient-public-address",
    "destination:",
    "amount:",
    "asset:",
    "asset-id:",
    "relayer:",
    "relayer-fee:",
    "quote-expires-at-slot:",
    "settlement-id:checkout_123",
  ]);
  console.log("private-pool-v2 unshield proof request public inputs: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2UnshieldProofRequest({
        economicsCommitment: "field:economics",
        exitTermsCommitment: "field:exit-terms",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifierOrReplayCommitment: " ",
        ownerCommitment: "field:owner",
        proofBoundDestinationCommitment:
          "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        unshieldContextTag: "field:unshield-context",
      }),
    "nullifier or replay commitment",
  );
  console.log("private-pool-v2 unshield proof request nullifier guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2UnshieldProofRequest({
        economicsCommitment: "field:economics",
        exitTermsCommitment: "",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifierOrReplayCommitment: "field:nullifier",
        ownerCommitment: "field:owner",
        proofBoundDestinationCommitment:
          "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        unshieldContextTag: "field:unshield-context",
      }),
    "exit terms commitment",
  );
  console.log("private-pool-v2 unshield proof request exit-term guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2UnshieldProofRequest({
        economicsCommitment: "field:economics",
        exitTermsCommitment: "field:exit-terms",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifierOrReplayCommitment: "field:nullifier",
        ownerCommitment: "field:owner",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        unshieldContextTag: "field:unshield-context",
      }),
    "proof-bound destination commitment",
  );
  console.log("private-pool-v2 unshield proof request proof-bound destination required: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2UnshieldProofRequest({
        economicsCommitment: "field:economics",
        exitTermsCommitment: "field:exit-terms",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifierOrReplayCommitment: "field:nullifier",
        ownerCommitment: "field:owner",
        proofBoundDestinationCommitment: "recipient-public-address",
        routeCommitment: "field:route",
        settlementCommitment: "field:settlement",
        unshieldContextTag: "field:unshield-context",
      }),
    "proof-bound destination commitment",
  );
  console.log("private-pool-v2 unshield proof request raw destination guard: PASS");
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
