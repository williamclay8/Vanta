import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const jsonMode = process.argv.includes("--json");
const repoRoot = resolve(import.meta.dirname, "..");

function copySource(tempTsDir, relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src", relativePath), "utf8"),
  );
}

function patchRelativeImports(tempJsDir, relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"')
    .replace(/import\(\s*"((?:\.\.?\/)[^"]+)\.ts"\s*\)/g, 'import("$1.js")')
    .replace(/import\(\s*"((?:\.\.?\/)[^"]+)(?<!\.js)"\s*\)/g, 'import("$1.js")');
  writeFileSync(filePath, source);
}

async function loadPrivateSettlementSummary() {
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-pay-status-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");
  const sourceFiles = [
    "pay/vantaPayPrivateSettlementAdapter.ts",
    "pay/vantaPayTypes.ts",
    "privacy/privatePoolV2MockRuntime.ts",
    "privacy/privatePoolV2ProofRequests.ts",
    "privacy/privatePoolV2Types.ts",
    "privacy/privatePoolV2LocalIndexer.ts",
    "privacy/privatePoolV2LocalProver.ts",
    "privacy/privatePoolV2LocalRelayer.ts",
    "privacy/privatePoolV2LocalVerifierRegistry.ts",
    "privacy/privatePoolV2CapabilityProfile.ts",
    "privacy/umbraCapabilityProfile.ts",
    "privacy/protocolAdapter.ts",
    "privacy/privatePoolV2SettlementPolicy.ts",
  ];

  try {
    mkdirSync(tempTsDir, { recursive: true });
    for (const file of sourceFiles) {
      copySource(tempTsDir, file);
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
      patchRelativeImports(tempJsDir, file);
    }

    const module = await import(
      pathToFileURL(join(tempJsDir, "pay/vantaPayPrivateSettlementAdapter.js")).href
    );
    return module.VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY;
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

const privateSettlement = await loadPrivateSettlementSummary();

const result = {
  capabilities: {
    browserCheckoutVerification: true,
    durableStoreConfigured: Boolean(
      process.env.VANTA_PAY_STORE_PATH || process.env.VANTA_PAY_DATABASE_URL,
    ),
    hostedCheckoutSessions: true,
    idempotency: {
      checkoutCompletion: true,
      checkoutSessions: true,
      refunds: true,
      withdrawals: true,
    },
    paymentLinkCreation: true,
    privateExitWithdrawalRequired: true,
    privatePoolOperatorConfigured: Boolean(process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL),
    privateRailCompletionRequired: true,
    productionDatabaseRequired: true,
    productionDurableStoreRequired: true,
    productionHttpsWebhooks: true,
    requestValidation: "fail-closed",
    webhookDeliveryRetries: true,
    webhookSignatures: "t-v1-hmac-sha256",
  },
  contractVersion: "vanta-pay-merchant-api-0.1",
  kind: "Vanta Pay status",
  ok: true,
  privateSettlement,
  productionReady: false,
  storage: {
    kind: process.env.VANTA_PAY_DATABASE_URL
      ? "postgres-jsonb-snapshot-store"
      : process.env.VANTA_PAY_STORE_PATH
        ? "local-json-snapshot-store"
        : "disabled-snapshot-store",
  },
  surfaces: {
    browserCheckout: "verified",
    merchantApi: "local-operator",
    privateSettlement: "private-pool-v2-adapter",
    webhookDelivery: "signed-retry",
  },
  verificationCommands: [
    "pay:contract-check",
    "pay-tab:copy-check",
    "pay:merchant-trust-status",
    "pay:merchant-trust-status-json",
    "pay:merchant-trust-status-check",
    "pay:approval-packet-check",
    "pay:merchant-api-check",
    "pay:browser-check",
    "pay:verify",
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Pay status");
  console.log(`- contractVersion: ${result.contractVersion}`);
  console.log(`- ready: ${String(result.ok)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
  console.log(
    `- capabilities: hostedCheckoutSessions=${String(result.capabilities.hostedCheckoutSessions)}, webhookSignatures=${result.capabilities.webhookSignatures}, webhookDeliveryRetries=${String(result.capabilities.webhookDeliveryRetries)}`,
  );
  console.log(
    `- idempotency: checkoutSessions=${String(result.capabilities.idempotency.checkoutSessions)}, checkoutCompletion=${String(result.capabilities.idempotency.checkoutCompletion)}, refunds=${String(result.capabilities.idempotency.refunds)}, withdrawals=${String(result.capabilities.idempotency.withdrawals)}`,
  );
  console.log(
    `- productionGuards: database=${String(result.capabilities.productionDatabaseRequired)}, durableStore=${String(result.capabilities.productionDurableStoreRequired)}, httpsWebhooks=${String(result.capabilities.productionHttpsWebhooks)}`,
  );
  console.log(`- storage: ${result.storage.kind}`);
  for (const [surface, status] of Object.entries(result.surfaces)) {
    console.log(`- ${surface}: ${status}`);
  }
  console.log("- merchant trust surface: npm run pay:merchant-trust-status");
  console.log("- approval packet contract: npm run pay:approval-packet-check");
  console.log(`- settlement lifecycle: ${result.privateSettlement.lifecycleModel}`);
  console.log(`- refunds: ${result.privateSettlement.refundState}`);
  console.log(`- withdrawals: ${result.privateSettlement.withdrawalState}`);
  console.log(`- reconciliation: ${result.privateSettlement.reconciliationState}`);
  console.log(
    "- canonical verification: npm run pay:verify (includes npm run pay:merchant-trust-status-check and npm run pay:approval-packet-check)",
  );
}
