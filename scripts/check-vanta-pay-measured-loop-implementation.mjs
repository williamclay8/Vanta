import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION } from "../src/pay/vantaPayMeasuredLoopImplementation.ts";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];

function sourceOf(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${path}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function jsonOf(path) {
  const source = sourceOf(path);
  if (!source) {
    return {};
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`Invalid JSON in ${path}: ${error.message}`);
    return {};
  }
}

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${path}`);
    }
  }
}

function assertSafeNpmRunCommand(command, label, packageJson) {
  assert.equal(typeof command, "string", `${label} must be a string.`);
  assert.ok(!/[;&|`$<>]/u.test(command), `${label} must not include shell operators: ${command}`);
  const match = command.match(/^npm run ([A-Za-z0-9:_-]+)$/u);
  assert.ok(match, `${label} must be an npm run command: ${command}`);
  assert.ok(packageJson.scripts?.[match[1]], `${label} references missing package script: ${match[1]}`);
}

function assertFalseControls(claimControls, label) {
  assert.equal(claimControls.adoptionClaimAllowed, false, `${label} adoption claim must stay blocked.`);
  assert.equal(claimControls.anonymityClaimAllowed, false, `${label} anonymity claim must stay blocked.`);
  assert.equal(
    claimControls.complianceSafeClaimAllowed,
    false,
    `${label} compliance-safe claim must stay blocked.`,
  );
  assert.equal(claimControls.productionReady, false, `${label} production readiness must stay blocked.`);
  assert.equal(
    claimControls.regulatorApprovalClaimAllowed,
    false,
    `${label} regulator approval claim must stay blocked.`,
  );
}

const packet = VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION;
const packageJson = jsonOf("package.json");
const publicDiscovery = jsonOf("public/.well-known/vanta-audit.json");
const publicPacket = publicDiscovery.payMeasuredLoopImplementation ?? {};

assert.equal(packet.schemaVersion, "vanta-pay-measured-loop-implementation-v0.1");
assert.equal(packet.object, "pay_measured_loop_implementation");
assert.equal(packet.status, "implemented-live-redacted-claim-blocked");
assert.equal(packet.measurementMode, "live-redacted-first-party");
assert.equal(packet.liveMeasurementEnabled, true);
assert.equal(packet.implementedSurfaces.runtimeRedactedEventLedger, true);
assert.equal(packet.implementedSurfaces.automaticReceiptGeneratedEvent, true);
assert.equal(packet.implementedSurfaces.counterpartyActivationSurface, true);
assert.equal(packet.implementedSurfaces.committedCheckoutAcceptanceSurface, true);
assert.equal(packet.implementedSurfaces.eventLedgerSnapshotPersistence, true);
assert.equal(packet.implementedSurfaces.publicAuditDiscovery, true);
assert.equal(packet.implementedSurfaces.operatorStatusEndpoint, "GET /v1/growth-loop/status");
assert.equal(packet.implementedSurfaces.eventIntakeEndpoint, "POST /v1/growth-loop/events");
assert.equal(packet.implementedSurfaces.receiptVerifierSurface, "/receipt/:receiptId");
assert.equal(packet.liveDeployReceipt.verifiedCommit, "749db79a633599d37a1b91bef553ff61beeac69a");
assert.equal(packet.liveDeployReceipt.staticDeployId, "dep-d8ie1fv41pts739c6fm0");
assert.equal(packet.liveDeployReceipt.operatorDeployId, "dep-d8ie1fv41pts739c6ggg");
assert.equal(packet.liveDeployReceipt.liveUrl, "https://vantaprivacy.xyz");
assert.equal(packet.liveDeployReceipt.operatorUrl, "https://vanta-0wwi.onrender.com");
assert.equal(packet.privacyBoundary.customerEmailStored, false);
assert.equal(packet.privacyBoundary.fullAuditDisclosureIdStored, false);
assert.equal(packet.privacyBoundary.fullPrivateRailReceiptIdStored, false);
assert.equal(packet.privacyBoundary.ipAddressStored, false);
assert.equal(packet.privacyBoundary.privateInputsStored, false);
assert.equal(packet.privacyBoundary.rawSettlementTermsStored, false);
assert.equal(packet.privacyBoundary.userAgentStored, false);
assert.equal(packet.privacyBoundary.witnessStored, false);
assertFalseControls(packet.claimControls, "source packet");
assert.equal(packet.claimControls.claimLiftBlockedUntilReviewedLiveEvidence, true);
assert.ok(
  packet.truthBoundary.includes("not an adoption"),
  "Implementation truth boundary must block adoption claims.",
);
assert.ok(
  packet.truthBoundary.includes("mainnet readiness claim"),
  "Implementation truth boundary must block mainnet readiness claims.",
);

assert.deepEqual(publicPacket, packet, "Public discovery must mirror the measured-loop implementation packet.");
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.measuredLoopImplementationSchema,
  "vanta-pay-measured-loop-implementation-v0.1",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.measuredLoopImplementationStatus,
  "implemented-live-redacted-claim-blocked",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.implementationCheckCommand,
  "npm run pay:measured-loop-implementation-check",
);
assertFalseControls(publicPacket.claimControls, "public packet");

for (const ref of packet.sourceRefs) {
  assert.ok(existsSync(resolve(repoRoot, ref)), `Source ref must exist: ${ref}`);
}

for (const [index, command] of packet.verificationCommands.entries()) {
  assertSafeNpmRunCommand(command, `packet.verificationCommands[${index}]`, packageJson);
}

assert.equal(
  packageJson.scripts?.["pay:measured-loop-implementation-check"],
  "node scripts/check-vanta-pay-measured-loop-implementation.mjs",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes("npm run pay:measured-loop-implementation-check"),
  "pay:verify must include the measured-loop implementation gate.",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes("npm run pay:counterparty-activation-check"),
  "pay:verify must include the counterparty activation gate.",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes(
    "npm run pay:committed-checkout-acceptance-check",
  ),
  "pay:verify must include the committed-checkout acceptance gate.",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes(
    "npm run pay:measured-loop-implementation-check",
  ),
  "twitter-intelligence:check must include the measured-loop implementation gate.",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes(
    "npm run pay:counterparty-activation-check",
  ),
  "twitter-intelligence:check must include the counterparty activation gate.",
);
assert.ok(
  publicDiscovery.safeCommands?.includes("npm run pay:measured-loop-implementation-check"),
  "Public discovery safeCommands must include the measured-loop implementation gate.",
);

requireMarkers("src/pay/vantaPayTypes.ts", [
  "VantaPayMeasuredLoopImplementation",
  "VantaPayCommittedCheckoutAcceptance",
  "vanta-pay-measured-loop-implementation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "implemented-live-redacted-claim-blocked",
  "runtimeRedactedEventLedger",
  "counterpartyActivationSurface",
  "committedCheckoutAcceptanceSurface",
  "claimLiftBlockedUntilReviewedLiveEvidence",
]);
requireMarkers("src/pay/vantaPayMeasuredLoopImplementation.ts", [
  "VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION",
  "counterpartyActivationSurface",
  "committedCheckoutAcceptanceSurface",
  "GET /v1/growth-loop/status",
  "POST /v1/growth-loop/events",
  "pay:counterparty-activation-check",
  "pay:committed-checkout-acceptance-check",
  "dep-d8ie1fv41pts739c6fm0",
  "dep-d8ie1fv41pts739c6ggg",
]);
requireMarkers("src/pay/vantaPayRuntime.ts", [
  "recordGrowthLoopEvent",
  "getGrowthLoopMeasurement",
  "growthLoopEvents",
  "pay-operator-live-redacted",
  "receipt_generated",
]);
requireMarkers("operator/pay-server.mjs", [
  "measuredLoopImplementation",
  "growthLoopMeasuredImplementation",
  "growthLoopCommittedCheckoutAcceptance",
  "implemented-live-redacted-claim-blocked",
  "GET /v1/growth-loop/status",
  "POST /v1/growth-loop/events",
]);
requireMarkers("scripts/print-vanta-pay-status.mjs", [
  "measuredLoopImplementation",
  "pay:measured-loop-implementation-check",
  "committedCheckoutAcceptance",
  "pay:committed-checkout-acceptance-check",
  "implemented-live-redacted-claim-blocked",
  "live-redacted-first-party",
]);
requireMarkers("scripts/check-vanta-pay-growth-loop.mjs", [
  "VantaPayMeasuredLoopImplementation",
  "vanta-pay-measured-loop-implementation-v0.1",
  "implemented-live-redacted-claim-blocked",
]);
requireMarkers("docs/audit-package.md", [
  "payMeasuredLoopImplementation",
  "vanta-pay-measured-loop-implementation-v0.1",
  "npm run pay:measured-loop-implementation-check",
]);
requireMarkers("docs/privacy-rail-contract.md", [
  "measured loop implementation",
  "vanta-pay-measured-loop-implementation-v0.1",
  "npm run pay:measured-loop-implementation-check",
]);
requireMarkers("docs/twitter-intelligence/2026-06-06-requirements.md", [
  "measured loop implementation",
  "vanta-pay-measured-loop-implementation-v0.1",
  "npm run pay:measured-loop-implementation-check",
]);

for (const source of [
  sourceOf("src/pay/vantaPayMeasuredLoopImplementation.ts"),
  sourceOf("operator/pay-server.mjs"),
  sourceOf("scripts/print-vanta-pay-status.mjs"),
  sourceOf("public/.well-known/vanta-audit.json"),
  sourceOf("docs/audit-package.md"),
  sourceOf("docs/privacy-rail-contract.md"),
  sourceOf("docs/twitter-intelligence/2026-06-06-requirements.md"),
]) {
  for (const banned of [
    "viral growth guaranteed",
    "network effects guaranteed",
    "Vanta has live institutional volume",
    "Production-ready private checkout",
    "Fully private Pay",
    "Anonymous payments",
    "Untraceable settlement",
    "Compliance-safe private settlement",
    "Regulator-approved private settlement",
    "live adoption proven",
    "mainnet-ready Pay",
  ]) {
    if (source.includes(banned)) {
      failures.push(`Banned measured-loop implementation claim found: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay measured-loop implementation check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay measured-loop implementation check: PASS");
