import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-send-request-"));
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
    assert(!serialized.includes(term), `Private-send proof request leaked raw term: ${term}.`);
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

function memoBodyHash(byteHex) {
  return `sha256:${byteHex.repeat(32)}`;
}

function memoBodyHashLimbs(bodyHash) {
  const digestHex = bodyHash.slice("sha256:".length);
  return {
    hi: BigInt(`0x${digestHex.slice(0, 32)}`).toString(10),
    lo: BigInt(`0x${digestHex.slice(32)}`).toString(10),
  };
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
    createVantaPrivatePoolV2SendProofRequest,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);

  assert(
    typeof createVantaPrivatePoolV2SendProofRequest === "function",
    "Expected createVantaPrivatePoolV2SendProofRequest export.",
  );

  const recipientMemoCiphertextBodyHash = memoBodyHash("11");
  const recipientMemoCiphertextBodyHashLimbs = memoBodyHashLimbs(
    recipientMemoCiphertextBodyHash,
  );
  const changeMemoCiphertextBodyHash = memoBodyHash("22");
  const changeMemoCiphertextBodyHashLimbs = memoBodyHashLimbs(
    changeMemoCiphertextBodyHash,
  );

  const request = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: "field:asset",
    changeLeafIndex: "43",
    changeMemoCiphertextBodyHash,
    changeOutputCommitment: "field:change-output",
    changeOutputRoot: "field:change-root",
    economicsCommitment: "field:economics",
    inputCommitment: "field:input-note",
    inputRoot: "field:input-root",
    nullifier: "field:nullifier",
    ownerCommitment: "field:owner",
    recipientLeafIndex: "42",
    recipientMemoCiphertextBodyHash,
    recipientOutputCommitment: "field:recipient-output",
    recipientOutputRoot: "field:recipient-root",
    sendContextTag: "field:send-context",
    sendPublicInputHash: "field:send-public-input-hash",
  });

  assert(request.intent === "private-send", "Expected private-send intent.");
  assert(
    request.assetId === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID,
    "Expected private-send proof request to use the hidden-economics asset sentinel.",
  );
  assert(
    request.amountBaseUnits === VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS,
    "Expected private-send proof request to use the hidden-economics amount sentinel.",
  );
  assert(
    JSON.stringify(request.publicInputs) ===
      JSON.stringify([
        "vanta-private-pool-v2-send-proof-request-0.1:version",
        "input-root:field:input-root",
        "input-commitment:field:input-note",
        "nullifier:field:nullifier",
        "recipient-output-commitment:field:recipient-output",
        "recipient-leaf-index:42",
        "recipient-output-root:field:recipient-root",
        "change-output-commitment:field:change-output",
        "change-leaf-index:43",
        "change-output-root:field:change-root",
        `recipient-memo-ciphertext-body-hash-hi:${recipientMemoCiphertextBodyHashLimbs.hi}`,
        `recipient-memo-ciphertext-body-hash-lo:${recipientMemoCiphertextBodyHashLimbs.lo}`,
        `change-memo-ciphertext-body-hash-hi:${changeMemoCiphertextBodyHashLimbs.hi}`,
        `change-memo-ciphertext-body-hash-lo:${changeMemoCiphertextBodyHashLimbs.lo}`,
        "asset-id-commitment:field:asset",
        "economics-commitment:field:economics",
        "owner-commitment:field:owner",
        "send-context-tag:field:send-context",
      ]),
    "Expected stable private-send proof public-input ordering.",
  );
  assert(
    JSON.stringify(request.circuitPublicInputs) ===
      JSON.stringify(["send-public-input-hash:field:send-public-input-hash"]),
    "Expected private-send circuit public inputs to be hash-only.",
  );
  assert(
    request.operatorVisibleTerms === undefined,
    "Private-send proof request must not mark raw terms as operator-visible.",
  );
  assert(
    request.shadowCommitments === undefined,
    "Private-send proof request must not reuse shield/claim operator-visible shadow commitments.",
  );
  assertNoRawTerms(request, [
    "USDC",
    "1000000",
    "recipient-public-address",
    "destination:",
    "amount:",
    "asset:",
    "asset-id:",
  ]);
  console.log("private-pool-v2 send proof request public inputs: PASS");

  const noChangeRequest = createVantaPrivatePoolV2SendProofRequest({
    assetIdCommitment: "field:asset",
    changeLeafIndex: "43",
    changeOutputRoot: "field:change-root",
    economicsCommitment: "field:economics",
    inputCommitment: "field:input-note",
    inputRoot: "field:input-root",
    nullifier: "field:nullifier",
    ownerCommitment: "field:owner",
    recipientLeafIndex: "42",
    recipientMemoCiphertextBodyHash,
    recipientOutputCommitment: "field:recipient-output",
    recipientOutputRoot: "field:recipient-root",
    sendContextTag: "field:send-context",
  });
  assert(
    noChangeRequest.publicInputs.includes("change-output-commitment:0"),
    "Expected no-change private-send request to bind a zero change commitment.",
  );
  assert(
    noChangeRequest.publicInputs.includes("change-memo-ciphertext-body-hash-hi:0") &&
      noChangeRequest.publicInputs.includes("change-memo-ciphertext-body-hash-lo:0"),
    "Expected no-change private-send request to bind zero change memo ciphertext body hash limbs.",
  );
  console.log("private-pool-v2 send proof request no-change binding: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SendProofRequest({
        assetIdCommitment: "field:asset",
        changeLeafIndex: "43",
        changeOutputCommitment: "field:change-output",
        changeOutputRoot: "field:change-root",
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifier: "field:nullifier",
        ownerCommitment: "field:owner",
        recipientLeafIndex: "42",
        recipientMemoCiphertextBodyHash,
        recipientOutputCommitment: "field:recipient-output",
        recipientOutputRoot: "field:recipient-root",
        sendContextTag: "field:send-context",
      }),
    "change memo ciphertext body hash",
  );
  console.log("private-pool-v2 send proof request change memo guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SendProofRequest({
        assetIdCommitment: "field:asset",
        changeLeafIndex: "43",
        changeOutputRoot: "field:change-root",
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifier: " ",
        ownerCommitment: "field:owner",
        recipientLeafIndex: "42",
        recipientMemoCiphertextBodyHash,
        recipientOutputCommitment: "field:recipient-output",
        recipientOutputRoot: "field:recipient-root",
        sendContextTag: "field:send-context",
      }),
    "nullifier",
  );
  console.log("private-pool-v2 send proof request nullifier guard: PASS");

  await expectRejection(
    () =>
      createVantaPrivatePoolV2SendProofRequest({
        assetIdCommitment: "field:asset",
        changeLeafIndex: "43",
        changeOutputRoot: "field:change-root",
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifier: "field:nullifier",
        ownerCommitment: "field:owner",
        recipientLeafIndex: "42",
        recipientMemoCiphertextBodyHash,
        recipientOutputCommitment: "",
        recipientOutputRoot: "field:recipient-root",
        sendContextTag: "field:send-context",
      }),
    "recipient output commitment",
  );
  console.log("private-pool-v2 send proof request recipient guard: PASS");

  for (const [bodyHash, message] of [
    [" ", "non-empty recipient memo ciphertext body hash"],
    [`sha512:${"11".repeat(32)}`, "sha256:<64 lowercase hex>"],
    [`sha256:${"gg".repeat(32)}`, "sha256:<64 lowercase hex>"],
    [`sha256:${"11".repeat(31)}`, "sha256:<64 lowercase hex>"],
    [`sha256:${"00".repeat(32)}`, "zero memo ciphertext body hash limbs"],
  ]) {
    await expectRejection(
      () =>
        createVantaPrivatePoolV2SendProofRequest({
          assetIdCommitment: "field:asset",
          changeLeafIndex: "43",
          changeOutputRoot: "field:change-root",
          economicsCommitment: "field:economics",
          inputCommitment: "field:input-note",
          inputRoot: "field:input-root",
          nullifier: "field:nullifier",
          ownerCommitment: "field:owner",
          recipientLeafIndex: "42",
          recipientMemoCiphertextBodyHash: bodyHash,
          recipientOutputCommitment: "field:recipient-output",
          recipientOutputRoot: "field:recipient-root",
          sendContextTag: "field:send-context",
        }),
      message,
    );
  }
  await expectRejection(
    () =>
      createVantaPrivatePoolV2SendProofRequest({
        assetIdCommitment: "field:asset",
        changeLeafIndex: "43",
        changeMemoCiphertextBodyHash: `sha256:${"00".repeat(32)}`,
        changeOutputRoot: "field:change-root",
        economicsCommitment: "field:economics",
        inputCommitment: "field:input-note",
        inputRoot: "field:input-root",
        nullifier: "field:nullifier",
        ownerCommitment: "field:owner",
        recipientLeafIndex: "42",
        recipientMemoCiphertextBodyHash,
        recipientOutputCommitment: "field:recipient-output",
        recipientOutputRoot: "field:recipient-root",
        sendContextTag: "field:send-context",
      }),
    "zero memo ciphertext body hash limbs",
  );
  console.log("private-pool-v2 send proof request memo ciphertext body hash guard: PASS");
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
