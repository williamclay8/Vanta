import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VANTA_PAY_COUNTERPARTY_ACTIVATION,
  buildVantaPayCounterpartyActivation,
} from "../src/pay/vantaPayCounterpartyActivation.ts";
import { VANTA_PAY_GROWTH_LOOP_EVENT_TYPES } from "../src/pay/vantaPayGrowthLoopEvidence.ts";
import { VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION } from "../src/pay/vantaPayMeasuredLoopImplementation.ts";
import { buildVantaPayReceiptPublicView } from "../src/pay/vantaPayReceiptPublicView.ts";

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

function assertFalseClaimControls(claimControls, label) {
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

const receipt = {
  amount: "2400.00",
  asset: "USDC",
  auditDisclosureId: "aud_counterparty_activation_7a1d3a7fd97ce95f7f06c32c",
  checkoutSessionId: "cs_counterparty_activation_test",
  completionBasis: "local-test-harness",
  createdAt: "2026-05-02T00:00:00.000Z",
  customerEmail: "counterparty@example.com",
  customerPaymentEvidenceRef: "evidence_counterparty_activation_should_not_leak",
  id: "rcpt_counterparty_activation_test",
  invoiceReference: "INV-ACTIVATE-1",
  merchantId: "merchant_vanta_demo",
  object: "receipt",
  orderId: "order_counterparty_activation_test",
  paymentId: "pay_counterparty_activation_test",
  privateRailReceiptId: "prail_counterparty_activation_4c4cfd71f6f024c629d06902",
  status: "paid",
};

const packageJson = jsonOf("package.json");
const publicDiscovery = jsonOf("public/.well-known/vanta-audit.json");
const activation = buildVantaPayCounterpartyActivation(receipt);
const publicView = buildVantaPayReceiptPublicView(receipt);
const sourcePacket = VANTA_PAY_COUNTERPARTY_ACTIVATION;
const measuredImplementation = VANTA_PAY_MEASURED_LOOP_IMPLEMENTATION;
const serializedActivation = JSON.stringify(activation);
const serializedPublicView = JSON.stringify(publicView);

assert.equal(sourcePacket.schemaVersion, "vanta-pay-counterparty-activation-v0.1");
assert.equal(sourcePacket.object, "pay_counterparty_activation");
assert.equal(sourcePacket.status, "actionable-live-redacted-claim-blocked");
assert.equal(sourcePacket.activationMode, "receipt-bound-counterparty-next-action");
assert.equal(sourcePacket.measurementMode, "live-redacted-first-party");
assert.equal(sourcePacket.liveMeasurementEnabled, true);
assert.deepEqual(sourcePacket.activationEventTypes, [
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
]);
assert.deepEqual(sourcePacket.actionableSurfaces, {
  committedCheckoutAcceptancePacket: true,
  counterpartyActivationPacket: true,
  counterpartyIntentEvents: true,
  operatorStatusDiscovery: true,
  publicAuditDiscovery: true,
  receiptVerifierNextAction: true,
});
assert.equal(sourcePacket.primaryAction.eventType, "next_settlement_intent_created");
assert.equal(sourcePacket.primaryAction.nextAction, "request_next_private_settlement");
assert.equal(sourcePacket.primaryAction.route, "/app/pay");
assert.equal(sourcePacket.primaryAction.ctaLabel, "Request private settlement");
assert.equal(sourcePacket.primaryAction.policySafeCopy, "Request the next private settlement using this receipt as context.");
assert.equal(sourcePacket.verificationCommand, "npm run pay:counterparty-activation-check");
assertFalseClaimControls(sourcePacket.claimControls, "source activation packet");
assert.equal(sourcePacket.claimControls.claimLiftBlockedUntilReviewedLiveEvidence, true);
assert.equal(sourcePacket.privacyBoundary.customerEmailStored, false);
assert.equal(sourcePacket.privacyBoundary.fullAuditDisclosureIdStored, false);
assert.equal(sourcePacket.privacyBoundary.fullPrivateRailReceiptIdStored, false);
assert.equal(sourcePacket.privacyBoundary.ipAddressStored, false);
assert.equal(sourcePacket.privacyBoundary.privateInputsStored, false);
assert.equal(sourcePacket.privacyBoundary.rawSettlementTermsStored, false);
assert.equal(sourcePacket.privacyBoundary.userAgentStored, false);
assert.equal(sourcePacket.privacyBoundary.witnessStored, false);
assert.ok(
  sourcePacket.truthBoundary.includes("not an adoption"),
  "Activation truth boundary must block adoption claims.",
);
assert.ok(
  sourcePacket.truthBoundary.includes("not production privacy"),
  "Activation truth boundary must block production privacy claims.",
);

assert.equal(activation.schemaVersion, "vanta-pay-counterparty-activation-v0.1");
assert.equal(activation.object, "pay_counterparty_activation");
assert.equal(activation.status, "actionable-live-redacted-claim-blocked");
assert.equal(activation.receiptRef.receiptId, receipt.id);
assert.equal(activation.receiptRef.amount, receipt.amount);
assert.equal(activation.receiptRef.asset, receipt.asset);
assert.equal(activation.receiptRef.status, receipt.status);
assert.equal(activation.receiptRef.sharePath, `/receipt/${receipt.id}`);
assert.equal(activation.verifiedFacts.receiptStatus, true);
assert.equal(activation.verifiedFacts.amountAndAsset, true);
assert.equal(activation.verifiedFacts.redactedSettlementReferences, true);
assert.equal(activation.privacyBoundary.customerEmailStored, false);
assert.equal(activation.privacyBoundary.fullPrivateRailReceiptIdStored, false);
assert.equal(activation.privacyBoundary.privateInputsStored, false);
assert.deepEqual(activation.counterpartyNextAction, {
  eventType: "next_settlement_intent_created",
  nextAction: "request_next_private_settlement",
  route: "/app/pay",
  ctaLabel: "Request private settlement",
  policySafeCopy: "Request the next private settlement using this receipt as context.",
});
assert.deepEqual(activation.measurement.eventTypes, [
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
]);
assert.equal(activation.measurement.eventIntakeEndpoint, "POST /v1/growth-loop/events");
assert.equal(activation.measurement.statusEndpoint, "GET /v1/growth-loop/status");
assert.equal(activation.measurement.measurementMode, "live-redacted-first-party");
assert.equal(activation.measurement.redactedFirstParty, true);
assert.equal(activation.measurement.noCustomerEmailValue, true);
assert.equal(activation.measurement.noIpAddressOrUserAgent, true);
assertFalseClaimControls(activation.claimControls, "receipt activation packet");
assert.equal(activation.verification.command, "npm run pay:counterparty-activation-check");
assert.ok(
  activation.verification.commands.includes("npm run pay:measured-loop-implementation-check"),
  "Activation verification must include measured-loop implementation check.",
);

assert.ok(
  VANTA_PAY_GROWTH_LOOP_EVENT_TYPES.includes("counterparty_invite_created"),
  "Growth-loop event types must include counterparty_invite_created.",
);
assert.ok(
  VANTA_PAY_GROWTH_LOOP_EVENT_TYPES.includes("counterparty_invite_opened"),
  "Growth-loop event types must include counterparty_invite_opened.",
);
assert.ok(
  VANTA_PAY_GROWTH_LOOP_EVENT_TYPES.includes("next_settlement_intent_created"),
  "Growth-loop event types must include next_settlement_intent_created.",
);
assert.ok(
  VANTA_PAY_GROWTH_LOOP_EVENT_TYPES.includes("committed_checkout_acceptance_created"),
  "Growth-loop event types must include committed_checkout_acceptance_created.",
);

assert.equal(
  measuredImplementation.implementedSurfaces.counterpartyActivationSurface,
  true,
  "Measured-loop implementation must expose counterparty activation as an implemented surface.",
);
assert.ok(
  measuredImplementation.verificationCommands.includes("npm run pay:counterparty-activation-check"),
  "Measured-loop implementation must include activation gate in verification commands.",
);

assert.equal(publicView.counterpartyActivation.schemaVersion, activation.schemaVersion);
assert.equal(publicView.counterpartyActivation.status, "actionable-live-redacted-claim-blocked");
assert.equal(publicView.counterpartyActivation.counterpartyNextAction.nextAction, "request_next_private_settlement");
assert.equal(publicView.counterpartyActivation.counterpartyNextAction.route, "/app/pay");
assert.equal(publicView.counterpartyActivation.measurement.eventTypes.length, 3);
assert.equal(publicView.counterpartyActivation.claimControls.adoptionClaimAllowed, false);
assert.ok(
  publicView.verification.commands.includes("npm run pay:counterparty-activation-check"),
  "Public receipt view verification commands must include activation gate.",
);

assert.deepEqual(
  publicDiscovery.payCounterpartyActivation,
  sourcePacket,
  "Public discovery must mirror the counterparty activation packet.",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.counterpartyActivationSchema,
  "vanta-pay-counterparty-activation-v0.1",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.activationCheckCommand,
  "npm run pay:counterparty-activation-check",
);
assert.ok(
  publicDiscovery.payGrowthLoopDiscovery?.fixtureEventTypes?.includes("counterparty_invite_created"),
  "Public growth-loop discovery must include activation invite-created event.",
);
assert.ok(
  publicDiscovery.payGrowthLoopDiscovery?.fixtureEventTypes?.includes("next_settlement_intent_created"),
  "Public growth-loop discovery must include activation intent event.",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceSchema,
  "vanta-pay-committed-checkout-acceptance-v0.1",
);
assert.equal(
  publicDiscovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceCheckCommand,
  "npm run pay:committed-checkout-acceptance-check",
);
assert.ok(
  publicDiscovery.payGrowthLoopDiscovery?.fixtureEventTypes?.includes(
    "committed_checkout_acceptance_created",
  ),
  "Public growth-loop discovery must include committed checkout acceptance event.",
);
assertSafeNpmRunCommand(
  publicDiscovery.payGrowthLoopDiscovery?.activationCheckCommand,
  "public activation check command",
  packageJson,
);
assert.ok(
  publicDiscovery.safeCommands?.includes("npm run pay:counterparty-activation-check"),
  "Public discovery safeCommands must include activation gate.",
);

assert.equal(
  packageJson.scripts?.["pay:counterparty-activation-check"],
  "node scripts/check-vanta-pay-counterparty-activation.mjs",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes("npm run pay:counterparty-activation-check"),
  "pay:verify must include the counterparty activation gate.",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes("npm run pay:counterparty-activation-check"),
  "twitter-intelligence:check must include the counterparty activation gate.",
);

for (const ref of sourcePacket.sourceRefs) {
  assert.ok(existsSync(resolve(repoRoot, ref)), `Activation source ref must exist: ${ref}`);
}

for (const command of sourcePacket.verificationCommands) {
  assertSafeNpmRunCommand(command, `sourcePacket.verificationCommands ${command}`, packageJson);
}

requireMarkers("src/pay/vantaPayTypes.ts", [
  "VantaPayCounterpartyActivation",
  "VantaPayCommittedCheckoutAcceptance",
  "vanta-pay-counterparty-activation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
  "counterpartyActivation",
  "committedCheckoutAcceptance",
]);
requireMarkers("src/pay/vantaPayCounterpartyActivation.ts", [
  "VANTA_PAY_COUNTERPARTY_ACTIVATION",
  "buildVantaPayCounterpartyActivation",
  "actionable-live-redacted-claim-blocked",
  "Request private settlement",
  "POST /v1/growth-loop/events",
  "GET /v1/growth-loop/status",
]);
requireMarkers("src/pay/vantaPayGrowthLoopEvidence.ts", [
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
]);
requireMarkers("src/pay/vantaPayMeasuredLoopImplementation.ts", [
  "counterpartyActivationSurface",
  "committedCheckoutAcceptanceSurface",
  "pay:counterparty-activation-check",
  "pay:committed-checkout-acceptance-check",
]);
requireMarkers("src/pay/vantaPayReceiptPublicView.ts", [
  "counterpartyActivation",
  "committedCheckoutAcceptance",
  "buildVantaPayCounterpartyActivation",
  "buildVantaPayCommittedCheckoutAcceptance",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
]);
requireMarkers("src/components/PayReceiptPacketCard.tsx", [
  "data-vanta-pay-counterparty-activation",
  "data-vanta-pay-committed-checkout-acceptance",
  "Counterparty activation",
  "Committed checkout acceptance",
  "Request private settlement",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
  "pay:counterparty-activation-check",
  "pay:committed-checkout-acceptance-check",
]);
requireMarkers("src/pages/ReceiptVerificationPage.tsx", [
  "data-vanta-pay-counterparty-activation",
  "data-vanta-pay-committed-checkout-acceptance",
  "Request private settlement",
  "Accept committed checkout",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
  "counterparty_invite_opened",
  "pay:counterparty-activation-check",
  "pay:committed-checkout-acceptance-check",
]);
requireMarkers("operator/pay-server.mjs", [
  "counterpartyActivation",
  "committedCheckoutAcceptance",
  "growthLoopCounterpartyActivation",
  "growthLoopCommittedCheckoutAcceptance",
  "counterparty_invite_created",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
]);
requireMarkers("scripts/check-vanta-pay-merchant-api.mjs", [
  "growthLoopCounterpartyActivation",
  "growthLoopCommittedCheckoutAcceptance",
  "counterparty_invite_created",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
]);
requireMarkers("docs/audit-package.md", [
  "payCounterpartyActivation",
  "payCommittedCheckoutAcceptance",
  "vanta-pay-counterparty-activation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
]);
requireMarkers("docs/privacy-rail-contract.md", [
  "counterparty activation",
  "committed checkout acceptance",
  "vanta-pay-counterparty-activation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
]);
requireMarkers("docs/twitter-intelligence/2026-06-06-requirements.md", [
  "counterparty activation",
  "committed checkout acceptance",
  "vanta-pay-counterparty-activation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
]);

for (const leaked of [
  receipt.customerEmail,
  receipt.customerPaymentEvidenceRef,
  receipt.privateRailReceiptId,
  receipt.auditDisclosureId,
]) {
  assert.ok(!serializedActivation.includes(leaked), `${leaked} leaked in activation packet`);
  assert.ok(!serializedPublicView.includes(leaked), `${leaked} leaked in public view`);
}

for (const source of [
  sourceOf("src/pay/vantaPayCounterpartyActivation.ts"),
  sourceOf("src/pay/vantaPayReceiptPublicView.ts"),
  sourceOf("src/components/PayReceiptPacketCard.tsx"),
  sourceOf("src/pages/ReceiptVerificationPage.tsx"),
  sourceOf("operator/pay-server.mjs"),
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
      failures.push(`Banned activation claim found: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay counterparty activation check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay counterparty activation check: PASS");
