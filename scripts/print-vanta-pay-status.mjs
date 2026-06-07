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
    "tokens/vantaTokenCatalog.ts",
    "pay/vantaPayAssets.ts",
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
    "privacy/actualPrivateTransactionRail.ts",
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
const productionDurableStoreConfigured = Boolean(process.env.VANTA_PAY_DATABASE_URL);
const privatePoolOperatorConfigured = Boolean(process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL);
const privatePoolOperatorAuthConfigured = Boolean(
  process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN,
);
const internalSettlementCompletionTokenConfigured = Boolean(
  process.env.VANTA_PAY_INTERNAL_SETTLEMENT_TOKEN,
);
const productionLaunchApproved = process.env.VANTA_PAY_PRODUCTION_LAUNCH_APPROVED === "true";
const customerPaymentEvidenceWired = privateSettlement.customerPaymentEvidenceWired === true;
const payProductionReady =
  productionDurableStoreConfigured &&
  privatePoolOperatorConfigured &&
  privatePoolOperatorAuthConfigured &&
  internalSettlementCompletionTokenConfigured &&
  productionLaunchApproved &&
  customerPaymentEvidenceWired;
const growthLoopEvidence = {
  schemaVersion: "vanta-pay-growth-loop-evidence-v0.1",
  measurementMode: "local-fixture-only",
  liveMeasurementEnabled: false,
  derivedCounters: {
    invitedCounterparties7d: 1,
    invitedCounterparties30d: 1,
    counterpartyVerifierOpened7d: 1,
    counterpartyVerifierOpened30d: 1,
    nextPrivateSettlementRequests7d: 1,
    nextPrivateSettlementRequests30d: 1,
    repeatedPrivateActions7d: 1,
    repeatedPrivateActions30d: 1,
    transactionCount7d: 1,
    transactionCount30d: 1,
    volume7dUsd: 2400,
    volume30dUsd: 2400,
  },
  claimControls: {
    adoptionClaimAllowed: false,
    anonymityClaimAllowed: false,
    claimLiftBlockedUntilLiveEvidence: true,
    complianceSafeClaimAllowed: false,
    productionReady: false,
    regulatorApprovalClaimAllowed: false,
  },
  verificationCommand: "npm run pay:growth-loop-check",
};
const liveGrowthLoopMeasurement = {
  schemaVersion: "vanta-pay-live-growth-loop-measurement-v0.1",
  object: "pay_growth_loop_live_measurement",
  measurementMode: "live-redacted-first-party",
  liveMeasurementEnabled: true,
  statusEndpoint: "GET /v1/growth-loop/status",
  eventIntakeEndpoint: "POST /v1/growth-loop/events",
  retainedFields: [
    "eventId",
    "eventType",
    "counterpartyRole",
    "occurredAt",
    "receiptId",
    "sharePath",
    "measurementSource",
  ],
  forbiddenFields: [
    "customerEmail",
    "customerPaymentEvidenceRef",
    "privateRailReceiptId",
    "auditDisclosureId",
    "privateInputs",
    "witness",
    "ipAddress",
    "userAgent",
  ],
  claimControls: {
    adoptionClaimAllowed: false,
    anonymityClaimAllowed: false,
    claimLiftBlockedUntilReviewedLiveEvidence: true,
    complianceSafeClaimAllowed: false,
    productionReady: false,
    regulatorApprovalClaimAllowed: false,
  },
  verificationCommand: "npm run pay:growth-loop-check",
};
const measuredLoopImplementation = {
  schemaVersion: "vanta-pay-measured-loop-implementation-v0.1",
  object: "pay_measured_loop_implementation",
  status: "implemented-live-redacted-claim-blocked",
  measurementMode: "live-redacted-first-party",
  liveMeasurementEnabled: true,
  implementedSurfaces: {
    automaticReceiptGeneratedEvent: true,
    eventIntakeEndpoint: "POST /v1/growth-loop/events",
    eventLedgerSnapshotPersistence: true,
    operatorStatusEndpoint: "GET /v1/growth-loop/status",
    publicAuditDiscovery: true,
    receiptVerifierSurface: "/receipt/:receiptId",
    runtimeRedactedEventLedger: true,
  },
  claimControls: {
    adoptionClaimAllowed: false,
    anonymityClaimAllowed: false,
    claimLiftBlockedUntilReviewedLiveEvidence: true,
    complianceSafeClaimAllowed: false,
    productionReady: false,
    regulatorApprovalClaimAllowed: false,
  },
  verificationCommand: "npm run pay:measured-loop-implementation-check",
};

const result = {
  capabilities: {
    browserCheckoutVerification: true,
    durableStoreConfigured: Boolean(
      process.env.VANTA_PAY_STORE_PATH || process.env.VANTA_PAY_DATABASE_URL,
    ),
    growthLoopAdoptionClaimAllowed: false,
    growthLoopLiveMeasurement: "redacted-first-party-claim-blocked",
    growthLoopMeasuredImplementation: "implemented-live-redacted-claim-blocked",
    hostedCheckoutSessions: true,
    idempotency: {
      checkoutCompletion: true,
      checkoutSessions: true,
      refunds: true,
      withdrawals: true,
    },
    internalSettlementCompletionTokenConfigured,
    paymentLinkCreation: true,
    privateExitWithdrawalRequired: true,
    privatePoolOperatorAuthConfigured,
    privatePoolOperatorConfigured,
    privateRailCompletionRequired: true,
    productionDatabaseRequired: true,
    productionDurableStoreConfigured,
    productionDurableStoreRequired: true,
    productionHttpsWebhooks: true,
    productionLaunchApproved,
    requestValidation: "fail-closed",
    webhookDeliveryRetries: true,
    webhookSignatures: "t-v1-hmac-sha256",
  },
  contractVersion: "vanta-pay-merchant-api-0.1",
  kind: "Vanta Pay status",
  ok: true,
  privateSettlement,
  productionReady: payProductionReady,
  growthLoopEvidence,
  liveGrowthLoopMeasurement,
  measuredLoopImplementation,
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
    "pay:receipt-privacy-contract-check",
    "pay:receipt-public-view-check",
    "pay:institutional-disclosure-receipt-check",
    "pay:growth-loop-check",
    "pay:measured-loop-implementation-check",
    "pay:hidden-economics-request-check",
    "pay:committed-checkout-acceptance-check",
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
  console.log(
    `- internal settlement completion token configured: ${String(result.capabilities.internalSettlementCompletionTokenConfigured)}`,
  );
  console.log(`- storage: ${result.storage.kind}`);
  for (const [surface, status] of Object.entries(result.surfaces)) {
    console.log(`- ${surface}: ${status}`);
  }
  console.log("- merchant trust surface: npm run pay:merchant-trust-status");
  console.log("- approval packet contract: npm run pay:approval-packet-check");
  console.log("- receipt privacy contract: npm run pay:receipt-privacy-contract-check");
  console.log("- receipt public view: npm run pay:receipt-public-view-check");
  console.log(
    "- institutional disclosure receipt: npm run pay:institutional-disclosure-receipt-check",
  );
  console.log("- receipt growth loop: npm run pay:growth-loop-check");
  console.log(
    `- growth loop evidence: invitedCounterparties7d=${result.growthLoopEvidence.derivedCounters.invitedCounterparties7d}, repeatedPrivateActions7d=${result.growthLoopEvidence.derivedCounters.repeatedPrivateActions7d}, liveMeasurementEnabled=${String(result.growthLoopEvidence.liveMeasurementEnabled)}`,
  );
  console.log(
    `- live growth loop measurement: mode=${result.liveGrowthLoopMeasurement.measurementMode}, intake="${result.liveGrowthLoopMeasurement.eventIntakeEndpoint}", adoptionClaimAllowed=${String(result.liveGrowthLoopMeasurement.claimControls.adoptionClaimAllowed)}, productionReady=${String(result.liveGrowthLoopMeasurement.claimControls.productionReady)}`,
  );
  console.log(
    `- measured loop implementation: status=${result.measuredLoopImplementation.status}, command=${result.measuredLoopImplementation.verificationCommand}`,
  );
  console.log(`- settlement lifecycle: ${result.privateSettlement.lifecycleModel}`);
  console.log(`- checkout proof boundary: ${result.privateSettlement.checkoutProofBoundary}`);
  console.log(`- checkout settlement route: ${result.privateSettlement.checkoutSettlementRoute}`);
  console.log(`- checkout completion auth: ${result.privateSettlement.checkoutCompletionAuth}`);
  console.log(`- checkout completion endpoint: ${result.privateSettlement.checkoutCompletionEndpoint}`);
  console.log(
    `- accepted checkout settlement boundary: ${result.privateSettlement.acceptedCheckoutSettlementBoundary}`,
  );
  console.log(`- withdrawal proof boundary: ${result.privateSettlement.withdrawalProofBoundary}`);
  console.log(
    `- raw economics in Pay proof request: ${String(result.privateSettlement.rawEconomicTermsInProofRequest)}`,
  );
  console.log(
    `- raw economics in accepted checkout settlement: ${String(result.privateSettlement.rawEconomicTermsInAcceptedCheckoutSettlement)}`,
  );
  console.log(
    `- raw economics in live checkout settlement: ${String(result.privateSettlement.rawEconomicTermsInLiveCheckoutSettlement)}`,
  );
  console.log(
    `- hidden-economics production privacy claim allowed: ${String(result.privateSettlement.hiddenEconomicsProductionPrivacyClaimAllowed)}`,
  );
  console.log(`- proof boundary verification: ${result.privateSettlement.proofBoundaryVerificationCommand}`);
  console.log(
    `- accepted checkout verification: ${result.privateSettlement.acceptedCheckoutSettlementVerificationCommand}`,
  );
  console.log(`- refunds: ${result.privateSettlement.refundState}`);
  console.log(`- withdrawals: ${result.privateSettlement.withdrawalState}`);
  console.log(`- reconciliation: ${result.privateSettlement.reconciliationState}`);
  console.log(
    "- canonical verification: npm run pay:verify (includes merchant trust, approval packet, receipt privacy, receipt public-view, institutional disclosure receipt, receipt growth loop, measured-loop implementation, Pay hidden-economics boundary, and committed checkout acceptance checks)",
  );
}
