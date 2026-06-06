import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-pay-api-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "tokens/vantaTokenCatalog.ts",
  "pay/vantaPayAssets.ts",
  "pay/vantaPayTypes.ts",
  "pay/vantaPayRuntime.ts",
  "pay/vantaPayPrivateSettlementAdapter.ts",
  "privacy/protocolAdapter.ts",
  "privacy/umbraCapabilityProfile.ts",
  "privacy/privatePoolV2CapabilityProfile.ts",
  "privacy/privatePoolV2Types.ts",
  "privacy/privatePoolV2LocalIndexer.ts",
  "privacy/privatePoolV2LocalProver.ts",
  "privacy/privatePoolV2LocalRelayer.ts",
  "privacy/privatePoolV2LocalVerifierRegistry.ts",
  "privacy/privatePoolV2MockRuntime.ts",
  "privacy/privatePoolV2ProofRequests.ts",
  "privacy/privatePoolV2SettlementPolicy.ts",
];
const port = 11280 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const privatePoolPort = port + 2_000;
const privatePoolBaseUrl = `http://127.0.0.1:${privatePoolPort}`;
const payInternalSettlementToken = "vanta-pay-internal-settlement-test-token";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: "Bearer sk_test_vanta",
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

  return { ok: response.ok, parsed, status: response.status, text };
}

async function requestPrivatePoolJson(path, { authToken, body, method = "GET" } = {}) {
  const response = await fetch(`${privatePoolBaseUrl}${path}`, {
    ...(body ? { body } : {}),
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    method,
  });
  const text = await response.text();
  return {
    ok: response.ok,
    parsed: text ? JSON.parse(text) : null,
    status: response.status,
    text,
  };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson("/health", {
        headers: { Authorization: "" },
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta Pay merchant API did not become healthy.");
}

async function waitForPrivatePoolHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestPrivatePoolJson("/health");
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await sleep(250);
  }

  throw new Error("Private Pool v2 operator did not become healthy.");
}

async function startWebhookReceiver() {
  const received = [];
  let attempts = 0;
  const receiverPort = port + 1_000;
  const receiver = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      attempts += 1;
      received.push({
        body,
        signature: request.headers["vanta-signature"],
      });
      response.writeHead(attempts === 1 ? 503 : 200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: attempts > 1 }));
    });
  });

  await new Promise((resolvePromise) => {
    receiver.listen(receiverPort, "127.0.0.1", resolvePromise);
  });

  return {
    endpoint: `http://127.0.0.1:${receiverPort}/webhooks/vanta`,
    received,
    async stop() {
      await new Promise((resolvePromise) => receiver.close(resolvePromise));
    },
  };
}

function startPrivatePoolServer({ authToken, storePath } = {}) {
  const child = spawn("node", ["operator/private-pool-v2-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...(authToken ? { VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: authToken } : {}),
      VANTA_PRIVATE_POOL_V2_OPERATOR_HOST: "127.0.0.1",
      VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(privatePoolPort),
      ...(storePath ? { VANTA_PRIVATE_POOL_V2_STORE_PATH: storePath } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = { stderr: "", stdout: "" };
  child.stdout.on("data", (chunk) => {
    logs.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    logs.stderr += chunk.toString("utf8");
  });

  return { child, logs };
}

function startServer({
  databaseUrl,
  includeSecrets = true,
  internalSettlementToken = payInternalSettlementToken,
  nodeEnv,
  privatePoolOperatorAuthToken,
  privatePoolOperatorUrl,
  secretKey = "sk_test_vanta",
  storePath,
  webhookSecret = "whsec_test_vanta",
} = {}) {
  const child = spawn("node", ["operator/pay-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...(nodeEnv ? { NODE_ENV: nodeEnv } : {}),
      VANTA_PAY_OPERATOR_HOST: "127.0.0.1",
      VANTA_PAY_OPERATOR_PORT: String(port),
      ...(databaseUrl ? { VANTA_PAY_DATABASE_URL: databaseUrl } : {}),
      ...(privatePoolOperatorAuthToken
        ? { VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: privatePoolOperatorAuthToken }
        : {}),
      ...(privatePoolOperatorUrl
        ? { VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL: privatePoolOperatorUrl }
        : {}),
      ...(includeSecrets ? { VANTA_PAY_SECRET_KEY: secretKey } : {}),
      ...(includeSecrets ? { VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN: internalSettlementToken } : {}),
      ...(storePath ? { VANTA_PAY_STORE_PATH: storePath } : {}),
      ...(includeSecrets ? { VANTA_PAY_WEBHOOK_SECRET: webhookSecret } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = { stderr: "", stdout: "" };
  child.stdout.on("data", (chunk) => {
    logs.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    logs.stderr += chunk.toString("utf8");
  });

  return { child, logs };
}

async function waitForExit(server, timeoutMs = 1_000) {
  if (server.child.exitCode !== null) {
    return server.child.exitCode;
  }

  return await new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(null), timeoutMs);
    server.child.once("close", (code) => {
      clearTimeout(timer);
      resolvePromise(code);
    });
  });
}

async function stopServer(server) {
  if (server.child.exitCode !== null) {
    return;
  }

  await new Promise((resolvePromise) => {
    server.child.once("close", resolvePromise);
    server.child.kill("SIGTERM");
  });
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
    VANTA_PAY_WEBHOOK_EVENTS,
    createVantaPayRuntime,
    verifyVantaPayWebhookSignature,
  } = await import(pathToFileURL(join(tempJsDir, "pay/vantaPayRuntime.js")).href);
  const { createVantaPayPrivateSettlementAdapter } = await import(
    pathToFileURL(join(tempJsDir, "pay/vantaPayPrivateSettlementAdapter.js")).href
  );

  assert(
    VANTA_PAY_WEBHOOK_EVENTS.includes("checkout.session.completed"),
    "Expected checkout session completed webhook support.",
  );
  assert(
    VANTA_PAY_WEBHOOK_EVENTS.includes("payment.completed"),
    "Expected payment completed webhook support.",
  );
  assert(
    VANTA_PAY_WEBHOOK_EVENTS.includes("withdrawal.completed"),
    "Expected withdrawal completed webhook support.",
  );

  const runtime = createVantaPayRuntime();
  const session = runtime.createCheckoutSession({
    amount: "125.00",
    cancelUrl: "https://merchant.com/cancel",
    collectEmail: true,
    collectName: true,
    currency: "USDC",
    customerEmail: "buyer@example.com",
    lineItems: [{ name: "Premium Membership", quantity: 1, unitAmount: "125.00" }],
    merchantId: "mrc_123",
    mode: "payment",
    orderId: "order_987",
    successUrl: "https://merchant.com/success",
    uiMode: "embedded",
  });

  assert(session.object === "checkout_session", "Expected checkout session object.");
  assert(session.id.startsWith("vcs_"), "Expected Vanta checkout session id.");
  assert(session.clientToken.startsWith("vtok_"), "Expected client token.");
  assert(session.checkoutUrl.includes(`/cs/${session.id}`), "Expected hosted checkout URL.");
  assert(session.privacyRoute?.rail === "umbra", "Expected Umbra privacy route by default.");
  console.log("vanta-pay checkout session object: PASS");

  try {
    runtime.completeCheckoutSession(session.id);
    throw new Error("Expected completion without private rail receipt to fail.");
  } catch (error) {
    assert(
      String(error instanceof Error ? error.message : error).includes("Private rail receipt required"),
      "Expected private rail receipt guard.",
    );
  }
  assert(runtime.getBalances().available.length === 0, "Expected no balance before private settlement.");
  console.log("vanta-pay private completion guard: PASS");

  const settlementAdapter = createVantaPayPrivateSettlementAdapter();
  const status =
    typeof runtime.getMerchantApiStatus === "function"
      ? runtime.getMerchantApiStatus()
      : { privateSettlement: runtime.privateSettlement ?? null };

  assert(status.privateSettlement, "Merchant API status must expose privateSettlement summary.");
  assert(
    status.privateSettlement.lifecycleModel === "preview-approve-execute-settle",
    "Merchant API must expose the payment lifecycle model.",
  );
  assert(
    status.privateSettlement.checkoutCompletionDefaultBasis === "local-test-harness",
    "Merchant API must expose the local checkout completion harness boundary.",
  );
  assert(
    status.privateSettlement.checkoutCompletionAuth === "internal-settlement-token-only",
    "Merchant API must expose the internal settlement token completion boundary.",
  );
  assert(
    status.privateSettlement.checkoutCompletionEndpoint === "chain-subscriber-internal",
    "Merchant API must expose the internal chain-subscriber completion boundary.",
  );
  assert(
    status.privateSettlement.customerPaymentEvidenceRequiredForProduction === true,
    "Merchant API must require customer payment evidence before production completion.",
  );
  assert(
    status.privateSettlement.customerPaymentEvidenceWired === false,
    "Merchant API must not imply the customer payment evidence flow is wired.",
  );
  assert(
    status.privateSettlement.operatorSeesRawMerchantApiTerms === true,
    "Merchant API must disclose that the operator receives raw merchant API checkout terms.",
  );
  assert(
    status.privateSettlement.operatorSeesRawSettlementAdapterTerms === false,
    "Merchant API must disclose the scoped settlement-adapter redaction boundary.",
  );
  assert(
    status.privateSettlement.refundState === "merchant-visible",
    "Merchant API must expose merchant-visible refund state.",
  );
  assert(
    status.privateSettlement.withdrawalState === "merchant-visible",
    "Merchant API must expose merchant-visible withdrawal state.",
  );
  assert(
    status.privateSettlement.reconciliationState === "merchant-visible",
    "Merchant API must expose merchant-visible reconciliation state.",
  );
  assert(
    status.privateSettlement.checkoutProofBoundary === "hidden-economics-request",
    "Merchant API must expose the Pay checkout hidden-economics proof boundary.",
  );
  assert(
    status.privateSettlement.withdrawalProofBoundary ===
      "committed-exit-terms-protocol-settlement",
    "Merchant API must expose the committed withdrawal proof boundary.",
  );
  assert(
    status.privateSettlement.rawEconomicTermsInLiveWithdrawalSettlement === false,
    "Merchant API must expose the live withdrawal settlement redaction state.",
  );
  assert(
    status.privateSettlement.rawEconomicTermsInProofRequest === false,
    "Merchant API must expose the checkout proof request redaction state.",
  );
  assert(
    status.privateSettlement.acceptedCheckoutSettlementBoundary ===
      "actual-private-spend-protocol-settlement",
    "Merchant API must expose the actual-private checkout acceptance boundary.",
  );
  assert(
    status.privateSettlement.checkoutSettlementRoute === "actual-private-spend-protocol-settlement",
    "Merchant API must expose the actual-private live checkout settlement route.",
  );
  assert(
    status.privateSettlement.rawEconomicTermsInAcceptedCheckoutSettlement === false,
    "Merchant API must expose the committed checkout settlement redaction state.",
  );
  assert(
    status.privateSettlement.rawEconomicTermsInLiveCheckoutSettlement === false,
    "Merchant API must expose the live checkout settlement redaction state.",
  );
  assert(
    status.privateSettlement.hiddenEconomicsProductionPrivacyClaimAllowed === false,
    "Merchant API must keep hidden-economics production privacy claims locked.",
  );
  assert(
    settlementAdapter.privateSettlement?.lifecycleModel === "preview-approve-execute-settle",
    "Private settlement adapter must expose the merchant lifecycle model.",
  );
  assert(
    settlementAdapter.privateSettlement?.refundState === "merchant-visible",
    "Private settlement adapter must expose merchant-visible refund state.",
  );
  assert(
    settlementAdapter.privateSettlement?.withdrawalState === "merchant-visible",
    "Private settlement adapter must expose merchant-visible withdrawal state.",
  );
  assert(
    settlementAdapter.privateSettlement?.reconciliationState === "merchant-visible",
    "Private settlement adapter must expose merchant-visible reconciliation state.",
  );
  assert(
    settlementAdapter.privateSettlement?.proofBoundaryVerificationCommand ===
      "npm run pay:hidden-economics-request-check",
    "Private settlement adapter must expose the Pay hidden-economics verification command.",
  );
  assert(
    settlementAdapter.privateSettlement?.acceptedCheckoutSettlementVerificationCommand ===
      "npm run pay:committed-checkout-acceptance-check",
    "Private settlement adapter must expose the Pay committed checkout acceptance command.",
  );
  const privateRailReceipt = await settlementAdapter.settleCheckoutSession({
    session,
  });
  assert(privateRailReceipt.status === "confirmed", "Expected confirmed private rail receipt.");
  assert(
    privateRailReceipt.proofReceiptId.startsWith("ppv2_"),
    "Expected Private Pool v2-backed private proof receipt.",
  );
  runtime.registerPrivateRailReceipt(privateRailReceipt);

  try {
    runtime.completeCheckoutSession(session.id, {
      completionBasis: "customer-payment-evidence",
      privateRailReceiptId: privateRailReceipt.id,
    });
    throw new Error("Expected evidence-based completion without evidence to fail.");
  } catch (error) {
    assert(
      String(error instanceof Error ? error.message : error).includes(
        "Customer payment evidence reference required",
      ),
      "Expected customer payment evidence guard.",
    );
  }

  const completion = runtime.completeCheckoutSession(session.id, {
    privateRailReceiptId: privateRailReceipt.id,
  });
  assert(completion.payment.status === "completed", "Expected completed payment.");
  assert(completion.payment.railStatus === "settled", "Expected settled private rail status.");
  assert(
    completion.payment.completionBasis === "local-test-harness",
    "Expected default completion to stay labeled as local test harness.",
  );
  assert(
    completion.payment.customerPaymentEvidenceRef === null,
    "Expected local harness completion to omit customer payment evidence.",
  );
  assert(
    completion.payment.privateRailReceiptId === privateRailReceipt.id,
    "Expected payment to reference private rail receipt.",
  );
  assert(completion.receipt.status === "paid", "Expected paid receipt.");
  assert(
    completion.receipt.completionBasis === "local-test-harness",
    "Expected receipt to disclose the local test harness completion basis.",
  );
  assert(
    completion.receipt.privateRailReceiptId === privateRailReceipt.id,
    "Expected receipt to reference private rail receipt.",
  );
  assert(
    completion.receipt.auditDisclosureId?.startsWith("aud_"),
    "Expected selective audit disclosure reference.",
  );
  assert(completion.events.some((event) => event.type === "payment.completed"), "Expected event.");
  console.log("vanta-pay payment completion: PASS");

  const evidenceRuntime = createVantaPayRuntime();
  const evidenceSettlementAdapter = createVantaPayPrivateSettlementAdapter();
  const evidenceSession = evidenceRuntime.createCheckoutSession({
    amount: "1.25",
    cancelUrl: "https://merchant.com/cancel",
    collectEmail: false,
    collectName: false,
    currency: "USDC",
    lineItems: [{ name: "Evidence-mode item", quantity: 1, unitAmount: "1.25" }],
    merchantId: "mrc_123",
    mode: "payment",
    orderId: "order_evidence_001",
    successUrl: "https://merchant.com/success",
    uiMode: "hosted",
  });
  const evidenceRailReceipt = await evidenceSettlementAdapter.settleCheckoutSession({
    session: evidenceSession,
  });
  evidenceRuntime.registerPrivateRailReceipt(evidenceRailReceipt);
  try {
    evidenceRuntime.completeCheckoutSession(evidenceSession.id, {
      customerPaymentEvidenceRef: "not-an-evidence-ref",
      privateRailReceiptId: evidenceRailReceipt.id,
    });
    throw new Error("Expected malformed customer payment evidence reference to fail.");
  } catch (error) {
    assert(
      String(error instanceof Error ? error.message : error).includes(
        "typed customer payment evidence reference",
      ),
      "Expected typed customer payment evidence reference guard.",
    );
  }
  const validCustomerPaymentEvidenceRef = `solana:signature:${"2".repeat(88)}`;
  const evidenceCompletion = evidenceRuntime.completeCheckoutSession(evidenceSession.id, {
    customerPaymentEvidenceRef: validCustomerPaymentEvidenceRef,
    privateRailReceiptId: evidenceRailReceipt.id,
  });
  assert(
    evidenceCompletion.payment.completionBasis === "customer-payment-evidence",
    "Expected explicit customer evidence to set evidence-based completion.",
  );
  assert(
    evidenceCompletion.receipt.customerPaymentEvidenceRef === validCustomerPaymentEvidenceRef,
    "Expected receipt to preserve the customer payment evidence reference.",
  );
  console.log("vanta-pay customer payment evidence completion: PASS");

  const signed = runtime.signWebhookEvent(completion.events[0], "whsec_test_vanta");
  assert(
    verifyVantaPayWebhookSignature({
      payload: signed.payload,
      secret: "whsec_test_vanta",
      signatureHeader: signed.signatureHeader,
    }),
    "Expected valid webhook signature.",
  );
  const signedTimestamp = Number(signed.signatureHeader.match(/(?:^|,)t=([^,]+)/)?.[1] ?? "0");
  assert(
    verifyVantaPayWebhookSignature({
      currentTimestamp: signedTimestamp + 60,
      payload: signed.payload,
      secret: "whsec_test_vanta",
      signatureHeader: signed.signatureHeader,
      toleranceSeconds: 300,
    }),
    "Expected fresh webhook signature inside tolerance.",
  );
  assert(
    !verifyVantaPayWebhookSignature({
      currentTimestamp: signedTimestamp + 1_000,
      payload: signed.payload,
      secret: "whsec_test_vanta",
      signatureHeader: signed.signatureHeader,
      toleranceSeconds: 300,
    }),
    "Expected stale webhook signature outside tolerance to fail.",
  );
  console.log("vanta-pay webhook signature: PASS");

  let deliveryAttempts = 0;
  let forcedRetry = false;
  const deliveries = await runtime.deliverWebhookEvents({
    endpoint: "https://merchant.com/webhooks/vanta",
    maxAttempts: 3,
    secret: "whsec_test_vanta",
    send: async ({ signatureHeader }) => {
      deliveryAttempts += 1;
      assert(signatureHeader.startsWith("t="), "Expected signed webhook delivery.");
      if (!forcedRetry) {
        forcedRetry = true;
        return { ok: false, status: 503 };
      }
      return { ok: true, status: 200 };
    },
  });
  assert(deliveryAttempts >= 2, "Expected webhook delivery retry.");
  assert(deliveries[0]?.status === "delivered", "Expected delivered webhook record.");
  assert(deliveries[0]?.attempts === 2, "Expected delivered webhook attempt count.");
  const failedDeliveries = await runtime.deliverWebhookEvents({
    endpoint: "https://merchant.com/webhooks/vanta-fail",
    maxAttempts: 2,
    secret: "whsec_test_vanta",
    send: async () => ({ ok: false, status: 500 }),
  });
  assert(failedDeliveries[0]?.status === "failed", "Expected failed webhook delivery record.");
  assert(failedDeliveries[0]?.attempts === 2, "Expected failed webhook attempt count.");
  assert(failedDeliveries[0]?.deliveredAt === null, "Expected failed webhook delivery timestamp to stay null.");
  console.log("vanta-pay webhook delivery: PASS");

  const balances = runtime.getBalances();
  assert(balances.available[0]?.amount === "125.00", "Expected available balance.");
  const preciseCheckoutSession = runtime.createCheckoutSession({
    amount: "1.234567",
    cancelUrl: "https://merchant.example/cancel",
    currency: "USDC",
    lineItems: [{ amount: "1.234567", name: "Precise item", quantity: 1 }],
    merchantId: "mrc_123",
    mode: "payment",
    successUrl: "https://merchant.example/success",
    uiMode: "hosted",
  });
  assert(
    preciseCheckoutSession.amount === "1.234567",
    "Expected checkout session to preserve USDC precision.",
  );
  const precisePrivateRailReceipt = await settlementAdapter.settleCheckoutSession({
    session: preciseCheckoutSession,
  });
  assert(
    precisePrivateRailReceipt.amount === "1.234567",
    "Expected private settlement adapter to preserve USDC precision.",
  );
  try {
    runtime.createWithdrawal({
      amount: "25.00",
      asset: "USDC",
      destination: "Treasury",
      destinationType: "treasury_address",
      merchantId: "mrc_123",
    });
    throw new Error("Expected withdrawal without private exit receipt to fail.");
  } catch (error) {
    assert(
      String(error instanceof Error ? error.message : error).includes("Private exit receipt required"),
      "Expected private exit receipt guard.",
    );
  }
  const privateExitReceipt = await settlementAdapter.settleWithdrawal({
    amount: "25.00",
    asset: "USDC",
    destination: "Treasury",
    merchantId: "mrc_123",
  });
  runtime.registerPrivateExitReceipt(privateExitReceipt);
  const withdrawal = runtime.createWithdrawal({
    amount: "25.00",
    asset: "USDC",
    destination: "Treasury",
    destinationType: "treasury_address",
    merchantId: "mrc_123",
    privateExitReceiptId: privateExitReceipt.id,
  });
  assert(withdrawal.status === "completed", "Expected completed local withdrawal.");
  assert(
    withdrawal.privateExitReceiptId === privateExitReceipt.id,
    "Expected withdrawal to reference private exit receipt.",
  );
  const repeatedWithdrawal = runtime.createWithdrawal({
    amount: "25.00",
    asset: "USDC",
    destination: "Treasury",
    destinationType: "treasury_address",
    merchantId: "mrc_123",
    privateExitReceiptId: privateExitReceipt.id,
  });
  assert(
    repeatedWithdrawal.id === withdrawal.id,
    "Expected repeated withdrawal without client idempotency key to return the existing withdrawal.",
  );
  assert(runtime.getBalances().withdrawable[0]?.amount === "100.00", "Expected updated balance.");
  console.log("vanta-pay balances and withdrawals: PASS");

  const paymentLink = runtime.createPaymentLink({
    amount: "125.00",
    asset: "USDC",
    collectEmail: true,
    collectName: true,
    description: "Premium Membership",
    linkName: "Premium Membership",
    merchantId: "mrc_123",
  });
  assert(paymentLink.url.includes(paymentLink.id), "Expected payment-link URL.");
  const invoice = runtime.createInvoice({
    asset: "USDC",
    customerContact: "buyer@example.com",
    customerName: "Buyer Example",
    dueDate: "2026-05-01",
    invoiceNumber: "INV-1001",
    lineItems: [{ amount: "125.00", name: "Premium Membership", quantity: 1 }],
    merchantId: "mrc_123",
  });
    assert(invoice.status === "sent", "Expected sent invoice.");
    console.log("vanta-pay links and invoices: PASS");

  const payStorePath = join(tempRoot, "vanta-pay-store.json");
  const privatePoolStorePath = join(tempRoot, "vanta-private-pool-v2-store.json");
  const insecureProductionServer = startServer({
    includeSecrets: false,
    nodeEnv: "production",
    storePath: join(tempRoot, "vanta-pay-insecure-production-store.json"),
  });
  const insecureProductionExitCode = await waitForExit(insecureProductionServer);
  if (insecureProductionExitCode === null) {
    await stopServer(insecureProductionServer);
    throw new Error("Expected insecure production Pay API to exit.");
  }
  assert(
    insecureProductionServer.logs.stderr.includes("VANTA_PAY_SECRET_KEY") ||
      insecureProductionServer.logs.stderr.includes("VANTA_PAY_WEBHOOK_SECRET"),
    "Expected missing production secret error.",
  );
  const storelessProductionServer = startServer({
    includeSecrets: true,
    nodeEnv: "production",
    secretKey: "sk_live_vanta",
    webhookSecret: "whsec_live_vanta",
  });
  const storelessProductionExitCode = await waitForExit(storelessProductionServer);
  if (storelessProductionExitCode === null) {
    await stopServer(storelessProductionServer);
    throw new Error("Expected production Pay API without durable store to exit.");
  }
  assert(
    storelessProductionServer.logs.stderr.includes("VANTA_PAY_DATABASE_URL"),
    "Expected missing production database URL error.",
  );
  console.log("vanta-pay api production secret guard: PASS");

  const privatePoolOperatorAuthToken = "vanta-private-pool-v2-pay-test-token";
  const privatePoolServer = startPrivatePoolServer({
    authToken: privatePoolOperatorAuthToken,
    storePath: privatePoolStorePath,
  });
  await waitForPrivatePoolHealth();
  let server = startServer({
    privatePoolOperatorAuthToken,
    privatePoolOperatorUrl: privatePoolBaseUrl,
    storePath: payStorePath,
  });

  try {
    await waitForHealth();

    const apiStatus = await requestJson("/v1/status");
    assert(apiStatus.ok, apiStatus.text || "Expected Pay API status response.");
    assert(
      apiStatus.parsed?.contractVersion === "vanta-pay-merchant-api-0.1",
      "Expected Pay API contract version.",
    );
    assert(apiStatus.parsed?.storeSchemaVersion === 1, "Expected Pay API store schema version.");
    assert(
      apiStatus.parsed?.capabilities?.privateRailCompletionRequired === true,
      "Expected private-rail completion policy.",
    );
    assert(
      apiStatus.parsed?.capabilities?.internalSettlementCompletionTokenConfigured === true,
      "Expected internal settlement completion token configuration to be visible without exposing the token.",
    );
    assert(
      apiStatus.parsed?.capabilities?.privatePoolOperatorConfigured === true,
      "Expected configured Private Pool v2 operator status.",
    );
    assert(
      apiStatus.parsed?.capabilities?.privatePoolOperatorAuthConfigured === true,
      "Expected configured Private Pool v2 operator auth status.",
    );
    assert(
      apiStatus.parsed?.capabilities?.productionLaunchApproved === false,
      "Expected production launch approval to stay false in local Pay status.",
    );
    assert(
      apiStatus.parsed?.capabilities?.productionDurableStoreConfigured === false,
      "Expected local JSON store to avoid claiming production durable-store configuration.",
    );
    assert(
      apiStatus.parsed?.capabilities?.idempotency?.checkoutSessions === true,
      "Expected checkout-session idempotency capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.idempotency?.checkoutCompletion === true,
      "Expected checkout-completion idempotency capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.idempotency?.refunds === true,
      "Expected refund idempotency capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.idempotency?.withdrawals === true,
      "Expected withdrawal idempotency capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.productionDatabaseRequired === true,
      "Expected production database requirement capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.productionDurableStoreRequired === true,
      "Expected production durable-store capability.",
    );
    assert(
      apiStatus.parsed?.capabilities?.durableStoreConfigured === true,
      "Expected durable store configured capability.",
    );
    assert(
      apiStatus.parsed?.readiness?.durableStoreConfigured === true,
      "Expected Pay status readiness to expose durable-store configuration.",
    );
    assert(
      apiStatus.parsed?.readiness?.privatePoolOperatorConfigured === true,
      "Expected Pay status readiness to expose Private Pool operator configuration.",
    );
    assert(
      apiStatus.parsed?.readiness?.privatePoolOperatorAuthConfigured === true,
      "Expected Pay status readiness to expose Private Pool operator auth configuration.",
    );
    assert(
      apiStatus.parsed?.readiness?.internalSettlementCompletionTokenConfigured === true,
      "Expected Pay status readiness to expose internal settlement token presence.",
    );
    assert(
      apiStatus.parsed?.readiness?.productionDatabaseConfigured === false,
      "Expected local Pay status readiness to avoid claiming production database configuration.",
    );
    assert(
      apiStatus.parsed?.readiness?.productionDurableStoreConfigured === false,
      "Expected local Pay status readiness to avoid claiming production durable-store configuration.",
    );
    assert(
      apiStatus.parsed?.readiness?.productionLaunchApproved === false,
      "Expected Pay status readiness to expose missing production launch approval.",
    );
    assert(
      apiStatus.parsed?.readiness?.productionReady === false,
      "Expected Pay status readiness to keep productionReady false.",
    );
    assert(
      apiStatus.parsed?.capabilities?.productionHttpsWebhooks === true,
      "Expected production HTTPS webhook capability.",
    );
    assert(
      apiStatus.parsed?.privateSettlement?.lifecycleModel === "preview-approve-execute-settle",
      "Expected real Pay API status to expose the merchant settlement lifecycle model.",
    );
    assert(
      apiStatus.parsed?.privateSettlement?.refundState === "merchant-visible",
      "Expected real Pay API status to expose merchant-visible refund state.",
    );
    assert(
      apiStatus.parsed?.privateSettlement?.withdrawalState === "merchant-visible",
      "Expected real Pay API status to expose merchant-visible withdrawal state.",
    );
    assert(
      apiStatus.parsed?.privateSettlement?.reconciliationState === "merchant-visible",
      "Expected real Pay API status to expose merchant-visible reconciliation state.",
    );
    console.log("vanta-pay api status: PASS");

    const malformedSessionResponse = await requestJson("/v1/checkout/sessions", {
      body: JSON.stringify({
        amount: "125.00",
        cancel_url: "https://merchant.com/cancel",
        merchant_id: "mrc_123",
        success_url: "https://merchant.com/success",
      }),
      method: "POST",
    });
    assert(!malformedSessionResponse.ok, "Expected malformed checkout session to fail.");
    assert(
      malformedSessionResponse.text.includes("currency"),
      malformedSessionResponse.text || "Expected missing currency error.",
    );
    console.log("vanta-pay api checkout validation: PASS");

    const idempotentSessionPayload = {
      amount: "75.00",
      cancel_url: "https://merchant.com/cancel",
      currency: "USDC",
      idempotency_key: "idem_order_555",
      line_items: [{ name: "Replay-safe Membership", quantity: 1, unit_amount: "75.00" }],
      merchant_id: "mrc_123",
      mode: "payment",
      order_id: "order_555",
      success_url: "https://merchant.com/success",
      ui_mode: "hosted",
    };
    const firstIdempotentSession = await requestJson("/v1/checkout/sessions", {
      body: JSON.stringify(idempotentSessionPayload),
      method: "POST",
    });
    assert(
      firstIdempotentSession.ok,
      firstIdempotentSession.text || "Expected first idempotent session.",
    );
    const secondIdempotentSession = await requestJson("/v1/checkout/sessions", {
      body: JSON.stringify(idempotentSessionPayload),
      method: "POST",
    });
    assert(
      secondIdempotentSession.parsed?.id === firstIdempotentSession.parsed?.id,
      "Expected repeated idempotency key to return the original checkout session.",
    );
    const conflictingIdempotentSession = await requestJson("/v1/checkout/sessions", {
      body: JSON.stringify({
        ...idempotentSessionPayload,
        amount: "76.00",
      }),
      method: "POST",
    });
    assert(!conflictingIdempotentSession.ok, "Expected conflicting idempotent session to fail.");
    assert(
      conflictingIdempotentSession.text.includes("idempotency"),
      conflictingIdempotentSession.text || "Expected idempotency conflict error.",
    );
    console.log("vanta-pay api checkout idempotency: PASS");

    const sessionResponse = await requestJson("/v1/checkout/sessions", {
      body: JSON.stringify({
        amount: "125.00",
        cancel_url: "https://merchant.com/cancel",
        collect_email: true,
        collect_name: true,
        currency: "USDC",
        customer_email: "buyer@example.com",
        line_items: [{ name: "Premium Membership", quantity: 1, unit_amount: "125.00" }],
        merchant_id: "mrc_123",
        mode: "payment",
        order_id: "order_987",
        success_url: "https://merchant.com/success",
        ui_mode: "embedded",
      }),
      method: "POST",
    });
    assert(sessionResponse.ok, sessionResponse.text || "Expected session creation response.");
    assert(sessionResponse.parsed?.object === "checkout_session", "Expected API checkout session object.");
    assert(sessionResponse.parsed?.id?.startsWith("vcs_"), "Expected API session id.");
    assert(sessionResponse.parsed?.clientToken?.startsWith("vtok_"), "Expected API client token.");
    assert(
      sessionResponse.parsed?.checkoutUrl?.includes(`/cs/${sessionResponse.parsed.id}`),
      "Expected API checkout URL to include the session id.",
    );
    console.log("vanta-pay api checkout session: PASS");

    const merchantOnlyCompletion = await requestJson(
      `/v1/checkout/sessions/${sessionResponse.parsed.id}/complete`,
      { method: "POST" },
    );
    assert(!merchantOnlyCompletion.ok, "Expected merchant-only API completion to fail closed.");
    assert(
      merchantOnlyCompletion.status === 403,
      merchantOnlyCompletion.text || "Expected missing internal settlement token rejection.",
    );
    assert(
      merchantOnlyCompletion.text.includes("internal settlement token"),
      merchantOnlyCompletion.text || "Expected internal settlement token rejection.",
    );
    console.log("vanta-pay api merchant-only completion rejection: PASS");

    const completed = await requestJson(
      `/v1/checkout/sessions/${sessionResponse.parsed.id}/complete`,
      {
        headers: {
          "x-vanta-pay-internal-settlement-token": payInternalSettlementToken,
        },
        method: "POST",
      },
    );
    assert(completed.ok, completed.text || "Expected completion response.");
    assert(completed.parsed?.payment?.status === "completed", "Expected completed API payment.");
    assert(
      completed.parsed?.payment?.completionBasis === "local-test-harness",
      "Expected bare API completion to be labeled as the local test harness.",
    );
    assert(
      completed.parsed?.payment?.customerPaymentEvidenceRef === null,
      "Expected bare API completion to omit customer payment evidence.",
    );
    assert(
      completed.parsed?.payment?.privateRailReceiptId?.startsWith("prail_"),
      "Expected API payment private rail receipt.",
    );
    assert(completed.parsed?.receipt?.id?.startsWith("rcpt_"), "Expected API receipt id.");
    assert(completed.parsed?.receipt?.status === "paid", "Expected API receipt paid status.");
    assert(
      completed.parsed?.receipt?.completionBasis === "local-test-harness",
      "Expected API receipt to disclose local harness completion.",
    );
    assert(
      completed.parsed?.receipt?.privateRailReceiptId === completed.parsed?.payment?.privateRailReceiptId,
      "Expected API receipt to reference the payment private rail receipt.",
    );
    assert(
      completed.parsed?.receipt?.auditDisclosureId?.startsWith("aud_"),
      "Expected API receipt audit disclosure id.",
    );
    const repeatedCompletion = await requestJson(
      `/v1/checkout/sessions/${sessionResponse.parsed.id}/complete`,
      {
        headers: {
          "x-vanta-pay-internal-settlement-token": payInternalSettlementToken,
        },
        method: "POST",
      },
    );
    assert(repeatedCompletion.ok, repeatedCompletion.text || "Expected repeated completion response.");
    assert(
      repeatedCompletion.parsed?.payment?.id === completed.parsed.payment.id,
      "Expected repeated checkout completion to return the existing payment.",
    );
    console.log("vanta-pay api payment completion: PASS");

    const paymentDetail = await requestJson(`/v1/payments/${completed.parsed.payment.id}`);
    assert(paymentDetail.ok, paymentDetail.text || "Expected payment detail response.");
    assert(paymentDetail.parsed?.id === completed.parsed.payment.id, "Expected payment detail id.");
    console.log("vanta-pay api payment detail: PASS");

    const receipts = await requestJson("/v1/receipts");
    assert(receipts.ok, receipts.text || "Expected receipts response.");
    assert(receipts.parsed?.data?.length === 1, "Expected one receipt.");
    assert(
      receipts.parsed?.data?.[0]?.object === "receipt_public_view",
      "Expected receipt list to return public receipt views.",
    );
    assert(
      receipts.parsed?.data?.[0]?.receiptId === completed.parsed.receipt.id,
      "Expected public receipt view to preserve receipt id.",
    );
    assert(
      receipts.parsed?.data?.[0]?.customer?.emailRedacted === true,
      "Expected public receipt view to redact customer email.",
    );
    assert(
      !JSON.stringify(receipts.parsed.data[0]).includes("buyer@example.com"),
      "Expected receipt list public view to omit raw customer email.",
    );
    console.log("vanta-pay api receipts: PASS");

    const receiptDetail = await requestJson(`/v1/receipts/${completed.parsed.receipt.id}`);
    assert(receiptDetail.ok, receiptDetail.text || "Expected receipt detail response.");
    assert(receiptDetail.parsed?.receiptId === completed.parsed.receipt.id, "Expected receipt detail id.");
    assert(receiptDetail.parsed?.object === "receipt_public_view", "Expected receipt detail public view.");
    assert(
      receiptDetail.parsed?.privateSettlement?.railReceipt?.redacted === true,
      "Expected receipt detail to redact the private rail receipt.",
    );
    assert(
      !JSON.stringify(receiptDetail.parsed).includes(completed.parsed.receipt.privateRailReceiptId),
      "Expected receipt detail to omit full private rail receipt id.",
    );
    console.log("vanta-pay api receipt detail: PASS");

    const apiPaymentLink = await requestJson("/v1/payment-links", {
      body: JSON.stringify({
        amount: "125.00",
        asset: "USDC",
        collect_email: true,
        collect_name: true,
        description: "Premium Membership",
        link_name: "Premium Membership",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(apiPaymentLink.ok, apiPaymentLink.text || "Expected payment link response.");
    assert(apiPaymentLink.parsed?.id?.startsWith("plink_"), "Expected API payment-link id.");
    const apiPaymentLinks = await requestJson("/v1/payment-links");
    assert(apiPaymentLinks.ok, apiPaymentLinks.text || "Expected payment links response.");
    assert(apiPaymentLinks.parsed?.data?.length === 1, "Expected one API payment link.");
    console.log("vanta-pay api payment links: PASS");

    const webhookEvents = await requestJson("/v1/webhook-events");
    assert(webhookEvents.ok, webhookEvents.text || "Expected webhook events response.");
    assert(webhookEvents.parsed?.data?.[0]?.signature?.startsWith("t="), "Expected signature.");
    console.log("vanta-pay api webhooks: PASS");

    const webhookReceiver = await startWebhookReceiver();
    try {
      const deliveryFlush = await requestJson("/v1/webhook-events/deliver", {
        body: JSON.stringify({ endpoint: webhookReceiver.endpoint, max_attempts: 3 }),
        method: "POST",
      });
      assert(deliveryFlush.ok, deliveryFlush.text || "Expected webhook delivery response.");
      assert(
        deliveryFlush.parsed?.data?.[0]?.status === "delivered",
        "Expected delivered webhook API record.",
      );
      assert(webhookReceiver.received.length >= 2, "Expected webhook receiver retry.");
      assert(
        String(webhookReceiver.received[0]?.signature ?? "").startsWith("t="),
        "Expected Vanta webhook signature header.",
      );

      const deliveryRecords = await requestJson("/v1/webhook-deliveries");
      assert(deliveryRecords.ok, deliveryRecords.text || "Expected webhook deliveries response.");
      assert(
        deliveryRecords.parsed?.data?.[0]?.status === "delivered",
        "Expected persisted webhook delivery record.",
      );
      console.log("vanta-pay api webhook delivery: PASS");
    } finally {
      await webhookReceiver.stop();
    }

    const apiBalances = await requestJson("/v1/balances");
    assert(apiBalances.ok, apiBalances.text || "Expected balances response.");
    assert(apiBalances.parsed?.available?.[0]?.amount === "125.00", "Expected API balance.");
    console.log("vanta-pay api balances: PASS");

    const apiRefund = await requestJson("/v1/refunds", {
      body: JSON.stringify({
        amount: "5.00",
        idempotency_key: "idem_refund_555",
        merchant_id: "mrc_123",
        payment_id: completed.parsed.payment.id,
        reason: "customer_request",
      }),
      method: "POST",
    });
    assert(apiRefund.ok, apiRefund.text || "Expected refund response.");
    assert(apiRefund.parsed?.id?.startsWith("rfnd_"), "Expected API refund id.");
    assert(apiRefund.parsed?.status === "refunded", "Expected completed refund.");
    const repeatedApiRefund = await requestJson("/v1/refunds", {
      body: JSON.stringify({
        amount: "5.00",
        idempotency_key: "idem_refund_555",
        merchant_id: "mrc_123",
        payment_id: completed.parsed.payment.id,
        reason: "customer_request",
      }),
      method: "POST",
    });
    assert(repeatedApiRefund.ok, repeatedApiRefund.text || "Expected repeated refund response.");
    assert(
      repeatedApiRefund.parsed?.id === apiRefund.parsed.id,
      "Expected repeated refund idempotency key to return the original refund.",
    );
    const conflictingApiRefund = await requestJson("/v1/refunds", {
      body: JSON.stringify({
        amount: "6.00",
        idempotency_key: "idem_refund_555",
        merchant_id: "mrc_123",
        payment_id: completed.parsed.payment.id,
        reason: "customer_request",
      }),
      method: "POST",
    });
    assert(!conflictingApiRefund.ok, "Expected conflicting refund idempotency key to fail.");
    assert(
      conflictingApiRefund.text.includes("idempotency"),
      conflictingApiRefund.text || "Expected refund idempotency conflict error.",
    );
    const apiRefunds = await requestJson("/v1/refunds");
    assert(apiRefunds.ok, apiRefunds.text || "Expected refunds response.");
    assert(apiRefunds.parsed?.data?.length === 1, "Expected one API refund.");
    const refundedPaymentDetail = await requestJson(`/v1/payments/${completed.parsed.payment.id}`);
    assert(
      refundedPaymentDetail.parsed?.refundedAmount === "5.00",
      "Expected payment detail to expose refunded amount.",
    );
    assert(
      refundedPaymentDetail.parsed?.status === "completed",
      "Expected partial refund to keep payment completed.",
    );
    const apiBalancesAfterRefund = await requestJson("/v1/balances");
    assert(
      apiBalancesAfterRefund.parsed?.available?.[0]?.amount === "120.00",
      "Expected refund-adjusted API balance.",
    );
    console.log("vanta-pay api refunds: PASS");

    const malformedWithdrawal = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "25.00",
        asset: "USDC",
        destination_type: "treasury_address",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(!malformedWithdrawal.ok, "Expected malformed withdrawal to fail.");
    assert(
      malformedWithdrawal.text.includes("destination"),
      malformedWithdrawal.text || "Expected missing destination error.",
    );
    console.log("vanta-pay api withdrawal validation: PASS");

    const apiWithdrawal = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "25.00",
        asset: "USDC",
        destination: "Treasury",
        destination_type: "treasury_address",
        idempotency_key: "idem_withdrawal_555",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(apiWithdrawal.ok, apiWithdrawal.text || "Expected withdrawal response.");
    assert(apiWithdrawal.parsed?.status === "completed", "Expected API withdrawal.");
    assert(
      apiWithdrawal.parsed?.privateExitReceiptId?.startsWith("pexit_"),
      "Expected API withdrawal private exit receipt.",
    );
    const repeatedApiWithdrawal = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "25.00",
        asset: "USDC",
        destination: "Treasury",
        destination_type: "treasury_address",
        idempotency_key: "idem_withdrawal_555",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(
      repeatedApiWithdrawal.ok,
      repeatedApiWithdrawal.text || "Expected repeated withdrawal response.",
    );
    assert(
      repeatedApiWithdrawal.parsed?.id === apiWithdrawal.parsed.id,
      "Expected repeated withdrawal idempotency key to return the original withdrawal.",
    );
    const apiWithdrawalWithoutIdempotency = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "10.000001",
        asset: "USDC",
        destination: "Treasury Precision",
        destination_type: "treasury_address",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(
      apiWithdrawalWithoutIdempotency.ok,
      apiWithdrawalWithoutIdempotency.text || "Expected withdrawal without explicit idempotency key.",
    );
    const repeatedApiWithdrawalWithoutIdempotency = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "10.000001",
        asset: "USDC",
        destination: "Treasury Precision",
        destination_type: "treasury_address",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(
      repeatedApiWithdrawalWithoutIdempotency.ok,
      repeatedApiWithdrawalWithoutIdempotency.text || "Expected repeated withdrawal without explicit idempotency key.",
    );
    assert(
      repeatedApiWithdrawalWithoutIdempotency.parsed?.id ===
        apiWithdrawalWithoutIdempotency.parsed?.id,
      "Expected repeated withdrawal without explicit idempotency key to return the original withdrawal.",
    );
    assert(
      apiWithdrawalWithoutIdempotency.parsed?.amount === "10.000001",
      "Expected API withdrawal to preserve USDC precision.",
    );
    const conflictingApiWithdrawal = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "26.00",
        asset: "USDC",
        destination: "Treasury",
        destination_type: "treasury_address",
        idempotency_key: "idem_withdrawal_555",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(!conflictingApiWithdrawal.ok, "Expected conflicting withdrawal idempotency key to fail.");
    assert(
      conflictingApiWithdrawal.text.includes("idempotency"),
      conflictingApiWithdrawal.text || "Expected withdrawal idempotency conflict error.",
    );
    console.log("vanta-pay api withdrawals: PASS");

    const privatePoolReceipts = await requestPrivatePoolJson("/state/private-pool-v2-receipts", {
      authToken: privatePoolOperatorAuthToken,
    });
    assert(privatePoolReceipts.ok, privatePoolReceipts.text || "Expected private pool receipts.");
    assert(
      privatePoolReceipts.parsed?.receiptCount >= 2,
      "Expected Pay settlements to submit receipts to the Private Pool v2 operator.",
    );
    assert(
      privatePoolReceipts.parsed?.protocolSettlementCount >= 1,
      "Expected Pay checkout and withdrawal settlement to use committed protocol settlements.",
    );
    assert(
      privatePoolReceipts.parsed?.paySettlementCount === 0,
      "Expected Pay operator route to avoid raw pay-settlements for checkout and withdrawal.",
    );
    assert(
      privatePoolReceipts.parsed?.protocolSettlements?.some((record) => {
        const serialized = JSON.stringify(record);
        return (
          record.protocolSettlementReceipt?.action === "unshield" &&
          record.protocolSettlementReceipt?.economicsMode === "committed-economics" &&
          record.proofReceipt?.intent === "unshield" &&
          !serialized.includes("25.00") &&
          !serialized.includes("Treasury")
        );
      }),
      "Expected Pay withdrawal to register a committed unshield settlement without raw terms.",
    );
    console.log("vanta-pay private-pool operator settlement: PASS");

    const writtenPayStore = JSON.parse(readFileSync(payStorePath, "utf8"));
    assert(writtenPayStore.stateVersion === 1, "Expected Vanta Pay store schema v1.");
    assert(writtenPayStore.sessions?.length === 2, "Expected persisted Pay checkout sessions.");
    assert(
      writtenPayStore.sessions?.some((session) => session.idempotencyKey === "idem_order_555"),
      "Expected persisted Pay idempotency key.",
    );
    assert(writtenPayStore.receipts?.length === 1, "Expected persisted Pay receipt.");
    console.log("vanta-pay api store schema: PASS");

    await stopServer(server);
    server = startServer({
      privatePoolOperatorAuthToken,
      privatePoolOperatorUrl: privatePoolBaseUrl,
      storePath: payStorePath,
    });
    await waitForHealth();

    const persistedPayments = await requestJson("/v1/payments");
    assert(persistedPayments.ok, persistedPayments.text || "Expected persisted payments response.");
    assert(
      persistedPayments.parsed?.data?.[0]?.status === "completed",
      "Expected payment to persist after API restart.",
    );
    const persistedDeliveries = await requestJson("/v1/webhook-deliveries");
    assert(
      persistedDeliveries.parsed?.data?.[0]?.status === "delivered",
      "Expected webhook delivery to persist after API restart.",
    );
    const persistedRefunds = await requestJson("/v1/refunds");
    assert(persistedRefunds.ok, persistedRefunds.text || "Expected persisted refunds response.");
    assert(
      persistedRefunds.parsed?.data?.some(
        (refund) =>
          refund.id === apiRefund.parsed.id && refund.idempotencyKey === "idem_refund_555",
      ),
      "Expected refund idempotency key to persist after API restart.",
    );
    const persistedWithdrawals = await requestJson("/v1/withdrawals");
    assert(
      persistedWithdrawals.ok,
      persistedWithdrawals.text || "Expected persisted withdrawals response.",
    );
    assert(
      persistedWithdrawals.parsed?.data?.some(
        (withdrawal) =>
          withdrawal.id === apiWithdrawal.parsed.id &&
          withdrawal.idempotencyKey === "idem_withdrawal_555",
      ),
      "Expected withdrawal idempotency key to persist after API restart.",
    );
    const repeatedPersistedRefund = await requestJson("/v1/refunds", {
      body: JSON.stringify({
        amount: "5.00",
        idempotency_key: "idem_refund_555",
        merchant_id: "mrc_123",
        payment_id: completed.parsed.payment.id,
        reason: "customer_request",
      }),
      method: "POST",
    });
    assert(
      repeatedPersistedRefund.parsed?.id === apiRefund.parsed.id,
      "Expected refund retry after API restart to return the persisted refund.",
    );
    const repeatedPersistedWithdrawal = await requestJson("/v1/withdrawals", {
      body: JSON.stringify({
        amount: "25.00",
        asset: "USDC",
        destination: "Treasury",
        destination_type: "treasury_address",
        idempotency_key: "idem_withdrawal_555",
        merchant_id: "mrc_123",
      }),
      method: "POST",
    });
    assert(
      repeatedPersistedWithdrawal.parsed?.id === apiWithdrawal.parsed.id,
      "Expected withdrawal retry after API restart to return the persisted withdrawal.",
    );
    console.log("vanta-pay api persistence: PASS");
  } finally {
    await stopServer(server);
    await stopServer(privatePoolServer);
  }
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
