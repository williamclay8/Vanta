import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-pay-committed-checkout-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const storePath = join(tempRoot, "private-pool-v2-receipts.json");
const port = 10_180 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const authToken = "vanta-pay-committed-checkout-test-token";
const sourceFiles = [
  "tokens/vantaTokenCatalog.ts",
  "pay/vantaPayAssets.ts",
  "pay/vantaPayTypes.ts",
  "pay/vantaPayGrowthLoopEvidence.ts",
  "pay/vantaPayRuntime.ts",
  "pay/vantaPayPrivateSettlementAdapter.ts",
  "privacy/protocolAdapter.ts",
  "privacy/umbraCapabilityProfile.ts",
  "privacy/privatePoolV2CapabilityProfile.ts",
  "privacy/actualPrivateTransactionRail.ts",
  "privacy/privatePoolV2Types.ts",
  "privacy/privatePoolV2LocalIndexer.ts",
  "privacy/privatePoolV2LocalProver.ts",
  "privacy/privatePoolV2LocalRelayer.ts",
  "privacy/privatePoolV2LocalVerifierRegistry.ts",
  "privacy/privatePoolV2MockRuntime.ts",
  "privacy/privatePoolV2ProofRequests.ts",
  "privacy/privatePoolV2SettlementPolicy.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }
    await sleep(250);
  }

  throw new Error("Private Pool V2 operator did not become healthy.");
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.error ?? text ?? `Request failed: ${response.status}`);
  }

  return parsed;
}

async function stopOperator() {
  if (!operator) {
    return;
  }

  const closing = new Promise((resolveClose) => {
    operator.once("close", resolveClose);
  });
  operator.kill("SIGTERM");
  await Promise.race([closing, sleep(2_000)]);
  operator = null;
}

async function startOperator(extraEnv = {}) {
  operator = spawn(process.execPath, [resolve(repoRoot, "operator/private-pool-v2-server.mjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
      VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: authToken,
      VANTA_PRIVATE_POOL_V2_OPERATOR_HOST: "127.0.0.1",
      VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(port),
      VANTA_PRIVATE_POOL_V2_STORE_PATH: storePath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForHealth();
}

async function seedCommittedCheckoutInput(request) {
  const seed = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      action: "shield",
      economicsCommitment: request.economicsCommitment,
      economicsMode: "committed-economics",
      nullifierOrReplayCommitment: `${request.nullifierOrReplayCommitment}:seed`,
      outputCommitment: request.inputCommitment,
      ownerCommitment: request.ownerCommitment,
      routeCommitment: request.routeCommitment,
      settlementCommitment: `${request.settlementCommitment}:seed`,
      settlementId: `${request.settlementId}_input`,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });

  assert(
    seed?.protocolSettlementReceipt?.status === "confirmed",
    "Expected committed checkout input seed to be accepted.",
  );
  assertNoRawTerms("Pay committed checkout input seed", seed, [
    "USDC",
    "123.45",
    "123450000",
    "77.77",
    "77770000",
    "buyer@example.com",
    "routed-buyer@example.com",
  ]);
}

function copySource(relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"')
    .replace(/import\(\s*"((?:\.\.?\/)[^"]+)\.ts"\s*\)/g, 'import("$1.js")')
    .replace(/import\(\s*"((?:\.\.?\/)[^"]+)(?<!\.js)"\s*\)/g, 'import("$1.js")');
  writeFileSync(filePath, source);
}

function serialize(value) {
  return JSON.stringify(value, (_, nested) =>
    typeof nested === "bigint" ? nested.toString() : nested,
  );
}

function assertNoRawTerms(label, value, rawTerms) {
  const serialized = serialize(value);
  for (const term of rawTerms) {
    assert(!serialized.includes(term), `${label} leaked raw term: ${term}`);
  }
}

async function assertCommittedCheckoutUsesSendProofBoundary({
  createActualPrivateSpendProofRequest,
  createLocalProver,
  label,
  request,
  settlement,
}) {
  const expectedProofRequest = createActualPrivateSpendProofRequest({
    acceptedRoot: request.acceptedRoot,
    assetCohort: request.assetCohort,
    contextHash: request.privateSpendContextHash,
    nullifier: request.nullifierOrReplayCommitment,
    outputCommitments: [request.outputCommitment, request.changeOutputCommitment],
    poolId: request.poolId,
    privateSpendPublicInputHash: request.privateSpendPublicInputHash,
  });
  const expectedProof = await createLocalProver().prove(expectedProofRequest);

  assert(
    expectedProofRequest.publicInputs[0] ===
      "vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version",
    `${label} must use the actual-private spend proof request version.`,
  );
  assert(
    JSON.stringify(expectedProofRequest.circuitPublicInputs) ===
      JSON.stringify([`private-spend-public-input-hash:${request.privateSpendPublicInputHash}`]),
    `${label} must bind the private spend public input hash on the circuit-public lane.`,
  );
  assert(
    settlement?.proofReceipt?.publicInputCommitment === expectedProof.publicInputCommitment,
    `${label} proof receipt did not match the actual-private spend proof request public inputs/circuit hash.`,
  );
  assert(
    settlement?.protocolSettlementReceipt?.proofReceiptPublicInputCommitment ===
      expectedProof.publicInputCommitment,
    `${label} protocol receipt did not expose the accepted send proof public input commitment.`,
  );
}

let operator = null;

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
    createVantaPayPrivateSettlementAdapter,
    createVantaPayCheckoutCommittedEconomicsSettlementRequest,
  } = await import(pathToFileURL(join(tempJsDir, "pay/vantaPayPrivateSettlementAdapter.js")).href);
  const { createVantaPrivatePoolV2LocalProver } = await import(
    pathToFileURL(join(tempJsDir, "privacy/privatePoolV2LocalProver.js")).href
  );
  const { createVantaPrivatePoolV2ActualPrivateSpendProofRequest } = await import(
    pathToFileURL(join(tempJsDir, "privacy/privatePoolV2ProofRequests.js")).href
  );
  const { createVantaPayRuntime } = await import(
    pathToFileURL(join(tempJsDir, "pay/vantaPayRuntime.js")).href
  );
  assert(
    typeof createVantaPayCheckoutCommittedEconomicsSettlementRequest === "function",
    "Expected Pay adapter to export committed-economics checkout settlement builder.",
  );

  const payRuntime = createVantaPayRuntime();
  const merchant = payRuntime.getMerchant();
  const session = payRuntime.createCheckoutSession({
    amount: "123.45",
    cancelUrl: merchant.callbackUrls.cancelUrl,
    currency: "USDC",
    customerEmail: "buyer@example.com",
    lineItems: [{ amount: "123.45", name: "Committed checkout", quantity: 1 }],
    merchantId: merchant.id,
    mode: "payment",
    successUrl: merchant.callbackUrls.successUrl,
    uiMode: "hosted",
  });

  const committedRequest = createVantaPayCheckoutCommittedEconomicsSettlementRequest(session);
  assert(committedRequest.action === "send", "Expected Pay checkout to map to private-send protocol action.");
  assert(
    committedRequest.economicsMode === "committed-economics",
    "Expected Pay checkout to use committed economics.",
  );
  assert(
    committedRequest.settlementId.startsWith("pay_checkout_"),
    "Expected Pay checkout committed settlement id.",
  );
  for (const rawField of ["amount", "asset", "destination", "owner", "session"]) {
    assert(!(rawField in committedRequest), `Committed Pay checkout request must omit ${rawField}.`);
  }
  for (const boundaryField of [
    "acceptedRoot",
    "assetCohort",
    "changeOutputCommitment",
    "nullifierOrReplayCommitment",
    "outputCommitment",
    "ownerCommitment",
    "poolId",
    "privateSpendContextHash",
    "privateSpendPublicInputHash",
    "routeCommitment",
    "settlementCommitment",
  ]) {
    assert(
      typeof committedRequest[boundaryField] === "string" &&
        committedRequest[boundaryField].trim().length > 0,
      `Committed Pay checkout request must include ${boundaryField}.`,
    );
  }
  for (const forbiddenSourceStateField of [
    "assetIdCommitment",
    "changeLeafIndex",
    "changeOutputRoot",
    "inputCommitment",
    "inputRoot",
    "outputLeafIndex",
    "outputRoot",
    "recipientLeafIndex",
    "recipientOutputCommitment",
    "recipientOutputRoot",
    "sendContextTag",
    "sendPublicInputHash",
  ]) {
    assert(
      !(forbiddenSourceStateField in committedRequest),
      `Committed Pay checkout request must omit ${forbiddenSourceStateField}.`,
    );
  }
  const directSendProofRequest = createVantaPrivatePoolV2ActualPrivateSpendProofRequest({
    acceptedRoot: committedRequest.acceptedRoot,
    assetCohort: committedRequest.assetCohort,
    contextHash: committedRequest.privateSpendContextHash,
    nullifier: committedRequest.nullifierOrReplayCommitment,
    outputCommitments: [committedRequest.outputCommitment, committedRequest.changeOutputCommitment],
    poolId: committedRequest.poolId,
    privateSpendPublicInputHash: committedRequest.privateSpendPublicInputHash,
  });
  assert(
    committedRequest.outputCommitment !== committedRequest.changeOutputCommitment,
    "Committed Pay checkout request must keep recipient and change outputs distinct.",
  );
  assert(
    directSendProofRequest.publicInputs[0] ===
      "vanta-private-pool-v2-actual-private-spend-proof-request-0.1:version",
    "Expected Pay committed checkout request to map to actual-private spend proof request public inputs.",
  );
  assert(
    JSON.stringify(directSendProofRequest.circuitPublicInputs) ===
      JSON.stringify([`private-spend-public-input-hash:${committedRequest.privateSpendPublicInputHash}`]),
    "Expected Pay committed checkout request to bind an actual-private public input hash.",
  );
  assertNoRawTerms("Pay committed checkout request", committedRequest, [
    "USDC",
    "123.45",
    "123450000",
    "buyer@example.com",
    session.clientToken,
    session.id,
    merchant.id,
  ]);
  console.log("vanta-pay committed checkout request redaction: PASS");

  await startOperator();
  const settlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify(committedRequest),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    settlement?.protocolSettlementReceipt?.object === "protocol_settlement_receipt",
    "Expected accepted committed Pay checkout protocol receipt.",
  );
  assert(
    settlement.protocolSettlementReceipt.economicsMode === "committed-economics",
    "Expected committed Pay checkout receipt to preserve committed economics mode.",
  );
  assert(
    settlement.proofReceipt?.intent === "private-send",
    "Expected committed Pay checkout proof receipt to use private-send intent.",
  );
  await assertCommittedCheckoutUsesSendProofBoundary({
    createActualPrivateSpendProofRequest: createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
    createLocalProver: createVantaPrivatePoolV2LocalProver,
    label: "Pay committed checkout acceptance",
    request: committedRequest,
    settlement,
  });
  for (const rawField of ["amount", "asset", "destination", "owner"]) {
    assert(
      !(rawField in settlement.protocolSettlementReceipt),
      `Committed Pay checkout receipt must omit ${rawField}.`,
    );
  }
  assertNoRawTerms("Pay committed checkout receipt", settlement, [
    "USDC",
    "123.45",
    "123450000",
    "buyer@example.com",
    session.clientToken,
    session.id,
    merchant.id,
  ]);
  console.log("vanta-pay committed checkout acceptance: PASS");

  const replayReview = await requestJson("/private-pool-v2/nullifier-replay-checks", {
    body: serialize({
      request: directSendProofRequest,
      requestId: "review-only-conflicting-private-send-nullifier",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    replayReview.kind === "Private Pool V2 nullifier replay check",
    "Expected replay review endpoint response.",
  );
  assert(
    replayReview.accepted === false && replayReview.decision?.replay === true,
    "Expected review-only private-send nullifier replay rejection.",
  );
  assert(replayReview.context === "private-pool-v2-private-send", "Expected private-send replay context.");
  assert(replayReview.mutated === false, "Expected review-only replay check to avoid mutation.");
  console.log("vanta-pay committed checkout no-funds replay review: PASS");

  const repeatedSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify(committedRequest),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  });
  assert(
    repeatedSettlement?.protocolSettlementReceipt?.id === settlement.protocolSettlementReceipt.id,
    "Expected committed Pay checkout replay to be idempotent.",
  );
  console.log("vanta-pay committed checkout replay idempotency: PASS");

  const conflictingSettlement = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      ...committedRequest,
      economicsCommitment: "0xconflicting_pay_checkout_economics",
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  }).then(
    () => ({ ok: true, error: "" }),
    (error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  assert(!conflictingSettlement.ok, "Expected conflicting committed Pay checkout replay rejection.");
  assert(
    conflictingSettlement.error.includes("conflicts"),
    conflictingSettlement.error || "Expected conflicting replay error.",
  );
  console.log("vanta-pay committed checkout conflict rejection: PASS");

  await stopOperator();
  rmSync(storePath, { force: true });
  await startOperator({
    VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION: "true",
  });
  const txGateRequest = {
    ...committedRequest,
    changeOutputCommitment: `${committedRequest.changeOutputCommitment}:tx-gate`,
    nullifierOrReplayCommitment: `${committedRequest.nullifierOrReplayCommitment}:tx-gate`,
    outputCommitment: `${committedRequest.outputCommitment}:tx-gate`,
    privateSpendContextHash: `${committedRequest.privateSpendContextHash}:tx-gate`,
    privateSpendPublicInputHash: `${committedRequest.privateSpendPublicInputHash}:tx-gate`,
    settlementCommitment: `${committedRequest.settlementCommitment}:tx-gate`,
  };
  const missingRelayerTransaction = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      ...txGateRequest,
      settlementId: `${committedRequest.settlementId}_requires_tx`,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  }).then(
    () => ({ ok: true, error: "" }),
    (error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  assert(!missingRelayerTransaction.ok, "Expected missing relayer serialized transaction rejection.");
  assert(
    missingRelayerTransaction.error.includes("requires relayerSerializedTransaction"),
    missingRelayerTransaction.error || "Expected relayer transaction gate error.",
  );
  await stopOperator();
  rmSync(storePath, { force: true });
  await startOperator({
    VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION: "true",
  });
  const missingSolanaSpendAccountRefs = await requestJson("/private-pool-v2/protocol-settlements", {
    body: JSON.stringify({
      ...txGateRequest,
      changeOutputCommitment: `${txGateRequest.changeOutputCommitment}:with-tx`,
      nullifierOrReplayCommitment: `${txGateRequest.nullifierOrReplayCommitment}:with-tx`,
      outputCommitment: `${txGateRequest.outputCommitment}:with-tx`,
      privateSpendContextHash: `${txGateRequest.privateSpendContextHash}:with-tx`,
      privateSpendPublicInputHash: `${txGateRequest.privateSpendPublicInputHash}:with-tx`,
      relayerSerializedTransaction: `base64:${Buffer.from("actual-private-relayer-transaction").toString("base64")}`,
      settlementId: `${committedRequest.settlementId}_with_tx`,
      settlementCommitment: `${txGateRequest.settlementCommitment}:with-tx`,
    }),
    headers: { Authorization: `Bearer ${authToken}` },
    method: "POST",
  }).then(
    () => ({ ok: true, error: "" }),
    (error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  assert(
    !missingSolanaSpendAccountRefs.ok,
    "Expected required relayer transaction gate to reject missing Solana spend account refs.",
  );
  assert(
    missingSolanaSpendAccountRefs.error.includes("requires expected Solana spend account refs"),
    missingSolanaSpendAccountRefs.error || "Expected Solana spend account-ref gate error.",
  );
  console.log("vanta-pay committed checkout Solana spend account-ref gate: PASS");

  await stopOperator();
  rmSync(storePath, { force: true });
  await startOperator();

  const routedSession = payRuntime.createCheckoutSession({
    amount: "77.77",
    cancelUrl: merchant.callbackUrls.cancelUrl,
    currency: "USDC",
    customerEmail: "routed-buyer@example.com",
    lineItems: [{ amount: "77.77", name: "Routed committed checkout", quantity: 1 }],
    merchantId: merchant.id,
    mode: "payment",
    successUrl: merchant.callbackUrls.successUrl,
    uiMode: "hosted",
  });
  const routedRequest = createVantaPayCheckoutCommittedEconomicsSettlementRequest(routedSession);
  const settlementAdapter = createVantaPayPrivateSettlementAdapter({
    privatePoolOperatorAuthToken: authToken,
    privatePoolOperatorUrl: baseUrl,
  });
  const routedReceipt = await settlementAdapter.settleCheckoutSession({ session: routedSession });
  assert(routedReceipt.status === "confirmed", "Expected routed committed checkout receipt.");
  assert(routedReceipt.proofReceiptId.startsWith("ppv2_"), "Expected routed proof receipt id.");
  assert(routedReceipt.id.startsWith("prail_"), "Expected routed Pay private rail receipt id.");
  assertNoRawTerms("Routed committed Pay private rail receipt", routedReceipt, [
    "routed-buyer@example.com",
    routedSession.clientToken,
    merchant.id,
  ]);

  const finalStatus = await requestJson("/state/private-pool-v2-receipts", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(finalStatus.paySettlementCount === 0, "Expected live Pay checkout route to avoid raw pay-settlements.");
  assert(
    finalStatus.protocolSettlements.some(
      (record) => record.protocolSettlementReceipt?.settlementId === routedRequest.settlementId,
    ),
    "Expected live Pay checkout route to register committed protocol settlement.",
  );
  const routedSettlement = finalStatus.protocolSettlements.find(
    (record) => record.protocolSettlementReceipt?.settlementId === routedRequest.settlementId,
  );
  await assertCommittedCheckoutUsesSendProofBoundary({
    createActualPrivateSpendProofRequest: createVantaPrivatePoolV2ActualPrivateSpendProofRequest,
    createLocalProver: createVantaPrivatePoolV2LocalProver,
    label: "Routed committed Pay checkout",
    request: routedRequest,
    settlement: routedSettlement,
  });
  assertNoRawTerms("Routed committed Pay protocol settlement", routedSettlement, [
    "USDC",
    "77.77",
    "77770000",
    "routed-buyer@example.com",
    routedSession.clientToken,
    routedSession.id,
    merchant.id,
  ]);
  console.log("vanta-pay live checkout committed routing: PASS");
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
  await stopOperator();
  rmSync(tempRoot, { recursive: true, force: true });
}
