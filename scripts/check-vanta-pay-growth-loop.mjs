import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildVantaPayReceiptGrowthLoop } from "../src/pay/vantaPayReceiptGrowthLoop.ts";
import {
  VANTA_PAY_GROWTH_LOOP_EVENT_TYPES,
  buildVantaPayGrowthLoopEvidence,
  createVantaPayGrowthLoopFixtureEvents,
} from "../src/pay/vantaPayGrowthLoopEvidence.ts";
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

function requireMarkers(path, markers) {
  const source = sourceOf(path);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${path}`);
    }
  }
  return source;
}

const receipt = {
  amount: "2400.00",
  asset: "USDC",
  auditDisclosureId: "aud_growth_loop_7a1d3a7fd97ce95f7f06c32c",
  checkoutSessionId: "cs_growth_loop_test",
  completionBasis: "local-test-harness",
  createdAt: "2026-05-02T00:00:00.000Z",
  customerEmail: "counterparty@example.com",
  customerPaymentEvidenceRef: "evidence_growth_loop_should_not_leak",
  id: "rcpt_growth_loop_test",
  invoiceReference: "INV-GROWTH-1",
  merchantId: "merchant_vanta_demo",
  object: "receipt",
  orderId: "order_growth_loop_test",
  paymentId: "pay_growth_loop_test",
  privateRailReceiptId: "prail_growth_loop_4c4cfd71f6f024c629d06902",
  status: "paid",
};

const growthLoop = buildVantaPayReceiptGrowthLoop(receipt);
const publicView = buildVantaPayReceiptPublicView(receipt);
const fixtureEvents = createVantaPayGrowthLoopFixtureEvents(receipt);
const growthLoopEvidence = buildVantaPayGrowthLoopEvidence(receipt, fixtureEvents);
const serializedGrowthLoop = JSON.stringify(growthLoop);
const serializedPublicView = JSON.stringify(publicView);
const serializedGrowthLoopEvidence = JSON.stringify(growthLoopEvidence);

assert.equal(growthLoop.schemaVersion, "vanta-pay-receipt-growth-loop-v0.1");
assert.equal(growthLoop.object, "receipt_growth_loop");
assert.equal(growthLoop.loopName, "counterparty-verifiable private settlement");
assert.deepEqual(growthLoop.loopSteps, [
  "private_action",
  "trust_packet_ready",
  "counterparty_verification",
  "invited_use",
  "repeated_private_action",
]);
assert.equal(growthLoop.privateAction.primitive, "Pay");
assert.equal(growthLoop.privateAction.receiptId, receipt.id);
assert.equal(growthLoop.privateAction.amount, receipt.amount);
assert.equal(growthLoop.privateAction.asset, receipt.asset);
assert.equal(growthLoop.trustPacket.schemaVersion, publicView.version);
assert.equal(growthLoop.trustPacket.sharePath, `/receipt/${receipt.id}`);
assert.equal(growthLoop.trustPacket.claimBoundary, "receipt-backed-test-settlement-not-production-private");
assert.deepEqual(growthLoop.counterpartyVerification.verifierRoute, "/receipt/:receiptId");
assert.equal(growthLoop.counterpartyVerification.verifierSurface, "ReceiptVerificationPage");
assert.equal(growthLoop.counterpartyVerification.operatorStatusSurface, "npm run pay:production-readiness-json");
assert.equal(growthLoop.counterpartyVerification.verificationCommand, "npm run pay:growth-loop-check");
assert.equal(growthLoop.counterpartyVerification.productionReady, false);
assert.equal(growthLoop.invitedUse.nextAction, "share_receipt_with_counterparty");
assert.equal(growthLoop.invitedUse.invitationStatus, "local-preview-only");
assert.equal(growthLoop.invitedUse.invitationClaimAllowed, false);
assert.equal(growthLoop.repeatedPrivateAction.repeatIntent, "counterparty_can_request_next_private_settlement");
assert.equal(growthLoop.repeatedPrivateAction.liveUsageMeasured, false);
assert.deepEqual(VANTA_PAY_GROWTH_LOOP_EVENT_TYPES, [
  "receipt_generated",
  "share_link_copied",
  "counterparty_verifier_opened",
  "next_private_settlement_requested",
]);
assert.equal(growthLoop.evidence.schemaVersion, "vanta-pay-growth-loop-evidence-v0.1");
assert.equal(growthLoop.evidence.measurementMode, "local-fixture-only");
assert.equal(growthLoop.evidence.verificationCommand, "npm run pay:growth-loop-check");
assert.equal(growthLoop.evidence.eventLedger.object, "growth_loop_event_ledger");
assert.equal(growthLoop.evidence.eventLedger.liveMeasurementEnabled, false);
assert.equal(growthLoop.evidence.eventLedger.events.length, 4);
assert.equal(growthLoop.evidence.eventLedger.events[0].eventType, "receipt_generated");
assert.equal(growthLoop.evidence.eventLedger.events[1].eventType, "share_link_copied");
assert.equal(growthLoop.evidence.eventLedger.events[2].eventType, "counterparty_verifier_opened");
assert.equal(growthLoop.evidence.eventLedger.events[3].eventType, "next_private_settlement_requested");
assert.equal(growthLoop.evidence.eventLedger.events[1].counterpartyRole, "buyer");
assert.equal(growthLoop.evidence.eventLedger.events[2].counterpartyRole, "counterparty");
assert.equal(growthLoop.evidence.eventLedger.events[3].counterpartyRole, "counterparty");
assert.equal(growthLoop.evidence.derivedCounters.invitedCounterparties7d, 1);
assert.equal(growthLoop.evidence.derivedCounters.repeatedPrivateActions7d, 1);
assert.equal(growthLoop.evidence.derivedCounters.transactionCount7d, 1);
assert.equal(growthLoop.evidence.derivedCounters.volume7dUsd, 2400);
assert.equal(growthLoop.evidence.derivedCounters.transactionCount30d, 1);
assert.equal(growthLoop.evidence.derivedCounters.volume30dUsd, 2400);
assert.equal(growthLoop.evidence.claimControls.claimLiftBlockedUntilLiveEvidence, true);
assert.equal(growthLoop.evidence.claimControls.adoptionClaimAllowed, false);
assert.equal(growthLoop.evidence.claimControls.productionReady, false);
assert.equal(growthLoopEvidence.derivedCounters.invitedCounterparties7d, 1);
assert.equal(growthLoopEvidence.derivedCounters.repeatedPrivateActions7d, 1);
assert.equal(growthLoopEvidence.eventLedger.events.length, 4);
assert.equal(growthLoopEvidence.publicSummary.receiptId, receipt.id);
assert.equal(growthLoopEvidence.publicSummary.sharePath, `/receipt/${receipt.id}`);
assert.equal(growthLoopEvidence.publicSummary.nextAction, "request_next_private_settlement");
assert.equal(growthLoop.usageVelocity.invitedCounterparties7d, 1);
assert.equal(growthLoop.usageVelocity.repeatedPrivateActions7d, 1);
assert.equal(growthLoop.usageVelocity.transactionCount7d, 1);
assert.equal(growthLoop.usageVelocity.volume7dUsd, 2400);
assert.equal(growthLoop.usageVelocity.transactionCount30d, 1);
assert.equal(growthLoop.usageVelocity.volume30dUsd, 2400);
assert.equal(growthLoop.usageVelocity.evidenceStatus, "local-fixture-measured-claim-blocked");
assert.deepEqual(growthLoop.usageVelocity, {
  primitive: "Pay",
  evidenceStatus: "local-fixture-measured-claim-blocked",
  metricSurface: "npm run usage-velocity-check",
  volume7dUsd: 2400,
  volume30dUsd: 2400,
  transactionCount7d: 1,
  transactionCount30d: 1,
  invitedCounterparties7d: 1,
  repeatedPrivateActions7d: 1,
  claimLiftBlockedUntilMeasured: true,
});
assert.deepEqual(growthLoop.claimControls, {
  adoptionClaimAllowed: false,
  anonymityClaimAllowed: false,
  complianceSafeClaimAllowed: false,
  productionReady: false,
  regulatorApprovalClaimAllowed: false,
});
assert.deepEqual(growthLoop.verification.commands, [
  "npm run pay:growth-loop-check",
  "npm run pay:receipt-public-view-check",
  "npm run usage-velocity-check",
  "npm run pay:verify",
]);

assert.equal(publicView.growthLoop.schemaVersion, "vanta-pay-receipt-growth-loop-v0.1");
assert.equal(publicView.growthLoop.sharePath, `/receipt/${receipt.id}`);
assert.equal(publicView.growthLoop.counterpartyVerification.verifierRoute, "/receipt/:receiptId");
assert.equal(publicView.growthLoop.counterpartyVerification.verificationCommand, "npm run pay:growth-loop-check");
assert.equal(publicView.growthLoop.invitedUse.nextAction, "share_receipt_with_counterparty");
assert.equal(publicView.growthLoop.evidence.eventLedger.events.length, 4);
assert.equal(publicView.growthLoop.evidence.derivedCounters.invitedCounterparties7d, 1);
assert.equal(publicView.growthLoop.evidence.derivedCounters.repeatedPrivateActions7d, 1);
assert.equal(publicView.growthLoop.usageVelocity.invitedCounterparties7d, 1);
assert.equal(publicView.growthLoop.usageVelocity.repeatedPrivateActions7d, 1);
assert.equal(publicView.growthLoop.productionReady, false);
assert.ok(publicView.verification.commands.includes("npm run pay:growth-loop-check"));

for (const leaked of [
  receipt.customerEmail,
  receipt.customerPaymentEvidenceRef,
  receipt.privateRailReceiptId,
  receipt.auditDisclosureId,
]) {
  assert.ok(!serializedGrowthLoop.includes(leaked), `${leaked} leaked in growth loop packet`);
  assert.ok(!serializedGrowthLoopEvidence.includes(leaked), `${leaked} leaked in evidence packet`);
  assert.ok(!serializedPublicView.includes(leaked), `${leaked} leaked in public view`);
}

requireMarkers("src/pay/vantaPayTypes.ts", [
  "VantaPayReceiptGrowthLoop",
  "receipt_growth_loop",
  "counterparty-verifiable private settlement",
  "invitedCounterparties7d",
  "repeatedPrivateActions7d",
  "VantaPayGrowthLoopEventLedger",
  "VantaPayGrowthLoopEvidence",
]);
requireMarkers("src/pay/vantaPayGrowthLoopEvidence.ts", [
  "vanta-pay-growth-loop-evidence-v0.1",
  "receipt_generated",
  "share_link_copied",
  "counterparty_verifier_opened",
  "next_private_settlement_requested",
  "local-fixture-measured-claim-blocked",
  "request_next_private_settlement",
]);
requireMarkers("src/pay/vantaPayReceiptGrowthLoop.ts", [
  "vanta-pay-receipt-growth-loop-v0.1",
  "private_action",
  "trust_packet_ready",
  "counterparty_verification",
  "invited_use",
  "repeated_private_action",
  "share_receipt_with_counterparty",
  "buildVantaPayGrowthLoopEvidence",
  "local-fixture-measured-claim-blocked",
]);
requireMarkers("src/pay/vantaPayReceiptPublicView.ts", [
  "VANTA_PAY_RECEIPT_GROWTH_LOOP_SCHEMA_VERSION",
  "growthLoop",
  "buildVantaPayGrowthLoopEvidence",
  "npm run pay:growth-loop-check",
]);
requireMarkers("src/components/PayReceiptPacketCard.tsx", [
  "data-vanta-pay-growth-loop",
  "data-vanta-pay-growth-loop-evidence",
  "Growth loop",
  "Local evidence ledger",
  "Counterparty verification",
  "Invited use",
  "Counterparty verifier opens 7d",
  "Next private settlement requests 7d",
  "Repeated private action",
  "publicView.growthLoop.counterpartyVerification.verificationCommand",
]);
requireMarkers("src/pages/ReceiptVerificationPage.tsx", [
  "data-vanta-pay-counterparty-verifier",
  "data-vanta-pay-growth-loop-counterparty-event",
  "Counterparty verifier",
  "What happened",
  "What can be verified",
  "What stays private",
  "Next private settlement",
  "npm run pay:growth-loop-check",
]);
requireMarkers("scripts/print-vanta-pay-status.mjs", [
  "pay:growth-loop-check",
  "receipt growth loop",
  "growthLoopEvidence",
  "invitedCounterparties7d",
  "repeatedPrivateActions7d",
]);
requireMarkers("docs/privacy-rail-contract.md", [
  "Receipt growth loop",
  "vanta-pay-receipt-growth-loop-v0.1",
  "vanta-pay-growth-loop-evidence-v0.1",
  "npm run pay:growth-loop-check",
]);
requireMarkers("docs/twitter-intelligence/2026-06-06-requirements.md", [
  "receipt growth loop",
  "vanta-pay-receipt-growth-loop-v0.1",
  "vanta-pay-growth-loop-evidence-v0.1",
  "npm run pay:growth-loop-check",
]);

const packageJson = JSON.parse(sourceOf("package.json"));
assert.equal(
  packageJson.scripts?.["pay:growth-loop-check"],
  "node scripts/check-vanta-pay-growth-loop.mjs",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes("npm run pay:growth-loop-check"),
  "twitter-intelligence:check must include the Pay growth-loop gate",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes("npm run pay:growth-loop-check"),
  "pay:verify must include the Pay growth-loop gate",
);

for (const source of [
  sourceOf("src/pay/vantaPayReceiptGrowthLoop.ts"),
  sourceOf("src/pay/vantaPayReceiptPublicView.ts"),
  sourceOf("src/components/PayReceiptPacketCard.tsx"),
  sourceOf("src/pages/ReceiptVerificationPage.tsx"),
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
  ]) {
    if (source.includes(banned)) {
      failures.push(`Banned growth-loop claim found: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay growth loop check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay growth loop check: PASS");
