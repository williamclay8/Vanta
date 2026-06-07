import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-pay-hidden-economics-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
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

function assertNoRawTerms(request, rawTerms) {
  const serialized = serialize(request);
  for (const term of rawTerms) {
    assert(!serialized.includes(term), `Pay hidden-economics request leaked raw term: ${term}`);
  }
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
    createVantaPayCheckoutHiddenEconomicsProofRequest,
    createVantaPayPrivateSettlementAdapter,
  } = await import(pathToFileURL(join(tempJsDir, "pay/vantaPayPrivateSettlementAdapter.js")).href);
  const { createVantaPayRuntime } = await import(
    pathToFileURL(join(tempJsDir, "pay/vantaPayRuntime.js")).href
  );

  const payRuntime = createVantaPayRuntime();
  const merchant = payRuntime.getMerchant();
  const session = payRuntime.createCheckoutSession({
    amount: "123.45",
    cancelUrl: merchant.callbackUrls.cancelUrl,
    currency: "USDC",
    customerEmail: "buyer@example.com",
    lineItems: [{ amount: "123.45", name: "Hidden economics settlement", quantity: 1 }],
    merchantId: merchant.id,
    mode: "payment",
    successUrl: merchant.callbackUrls.successUrl,
    uiMode: "hosted",
  });

  const request = await createVantaPayCheckoutHiddenEconomicsProofRequest(session);
  assert(request.intent === "private-send", "Expected Pay checkout to use hidden private-send request shape.");
  assert(request.assetId === "hidden:economic-terms", "Expected hidden asset sentinel.");
  assert(request.amountBaseUnits === 1n, "Expected hidden amount sentinel.");
  assert(!request.operatorVisibleTerms, "Pay checkout must not expose operator-visible raw terms.");
  assert(!request.shadowCommitments, "Pay checkout must not use raw-term shadow commitments.");
  const expectedPrefixes = [
    "vanta-private-pool-v2-hidden-economics-proof-request-0.1:version",
    "intent:private-send",
    "settlement-commitment:",
    "owner-commitment:",
    "nullifier-or-replay-commitment:",
    "nullifier:",
    "route-commitment:",
    "economics-commitment:",
    "output-commitment:",
  ];
  assert(
    request.publicInputs.length === expectedPrefixes.length &&
      expectedPrefixes.every((prefix, index) => request.publicInputs[index]?.startsWith(prefix)),
    `Expected stable Pay hidden-economics public-input ordering, received ${JSON.stringify(request.publicInputs)}.`,
  );
  assertNoRawTerms(request, [
    "USDC",
    "123.45",
    "123450000",
    "buyer@example.com",
    session.clientToken,
    session.id,
    merchant.id,
    "amount:",
    "asset:",
    "source-mint:",
    "target-mint:",
    "destination:",
  ]);
  console.log("vanta-pay hidden-economics checkout request: PASS");

  const adapter = createVantaPayPrivateSettlementAdapter();
  assert(
    typeof adapter.settleCheckoutSession === "function",
    "Expected existing Pay settlement adapter behavior to remain available.",
  );
  console.log("vanta-pay hidden-economics boundary is non-routing: PASS");
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
