import { strict as assert } from "node:assert";

import { buildVantaPayReceiptPublicView } from "../src/pay/vantaPayReceiptPublicView.ts";

const receipt = {
  amount: "42.00",
  asset: "USDC",
  auditDisclosureId: "aud_7a1d3a7fd97ce95f7f06c32c",
  checkoutSessionId: "cs_redacted_public_view_test",
  completionBasis: "local-test-harness",
  createdAt: "2026-05-02T00:00:00.000Z",
  customerEmail: "buyer@example.com",
  customerPaymentEvidenceRef: null,
  id: "rcpt_redacted_public_view_test",
  invoiceReference: null,
  merchantId: "merchant_vanta_demo",
  object: "receipt",
  orderId: "order_redacted_public_view_test",
  paymentId: "pay_redacted_public_view_test",
  privateRailReceiptId: "prail_4c4cfd71f6f024c629d06902",
  status: "paid",
};
const publicView = buildVantaPayReceiptPublicView(receipt);
const serialized = JSON.stringify(publicView);

assert.equal(publicView.version, "vanta-pay-receipt-public-view-0.1");
assert.equal(publicView.object, "receipt_public_view");
assert.equal(publicView.receiptId, receipt.id);
assert.equal(publicView.paymentId, receipt.paymentId);
assert.equal(publicView.checkoutSessionId, receipt.checkoutSessionId);
assert.equal(publicView.merchantId, receipt.merchantId);
assert.equal(publicView.amount, receipt.amount);
assert.equal(publicView.asset, receipt.asset);
assert.equal(publicView.status, "paid");
assert.equal(publicView.checkoutCompletion.basis, "local-test-harness");
assert.equal(publicView.checkoutCompletion.customerPaymentEvidenceRefPresent, false);
assert.equal(publicView.checkoutCompletion.localHarness, true);
assert.equal(publicView.customer.emailCollected, true);
assert.equal(publicView.customer.emailRedacted, true);
assert.equal(publicView.privateSettlement.policyMode, "legible-trust");
assert.equal(publicView.privateSettlement.productionReady, false);
assert.equal(publicView.privateSettlement.railReceipt.redacted, true);
assert.equal(publicView.privateSettlement.auditDisclosure.redacted, true);
assert.equal(publicView.localProving.defaultMode, "client_side_only");
assert.equal(publicView.localProving.privateInputsLeaveClient, false);
assert.equal(publicView.localProving.fallbackAllowed, false);
assert.equal(publicView.localProving.verificationCommand, "npm run local-proving-enforced-check");
assert.equal(publicView.usageVelocity.primitive, "Pay");
assert.equal(publicView.usageVelocity.metricSurface, "npm run usage-velocity-check");
assert.equal(publicView.usageVelocity.claimLiftBlockedUntilMeasured, true);
assert.equal(publicView.usageVelocity.institutionalVolumeTracked, true);
assert.equal(publicView.institutionalDisclosure.mode, "selective_disclosure_receipt");
assert.equal(
  publicView.institutionalDisclosure.receiptSchemaVersion,
  "vanta-pay-institutional-disclosure-receipt-v0.1",
);
assert.equal(publicView.institutionalDisclosure.regulatorScope, "time-and-scope-limited");
assert.equal(publicView.institutionalDisclosure.expiresAt, "2026-05-09T00:00:00.000Z");
assert.equal(publicView.institutionalDisclosure.privateInputsDisclosed, false);
assert.equal(publicView.institutionalDisclosure.witnessDisclosed, false);
assert.equal(publicView.institutionalDisclosure.fullTransactionHistoryDisclosed, false);
assert.equal(publicView.institutionalDisclosure.productionReady, false);
assert.equal(
  publicView.institutionalDisclosure.verificationCommand,
  "npm run pay:institutional-disclosure-receipt-check",
);
assert.equal(
  publicView.institutionalDisclosure.complianceGateway.verificationCommand,
  "npm run compliance:gateway-check",
);
assert.equal(
  publicView.institutionalDisclosure.complianceGateway.proofMaterialPubliclyDisclosed,
  false,
);
assert.equal(publicView.verification.claimBoundary, "receipt-backed-test-settlement-not-production-private");
assert.deepEqual(publicView.verification.commands, [
  "npm run pay:receipt-public-view-check",
  "npm run pay:receipt-privacy-contract-check",
  "npm run pay:institutional-disclosure-receipt-check",
  "npm run compliance:gateway-check",
  "npm run pay:growth-loop-check",
  "npm run pay:measured-loop-implementation-check",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run programmatic-privacy:contract-check",
  "npm run twitter-intelligence:check",
]);
assert.equal(publicView.verification.operatorStatusSurface, "npm run pay:production-readiness-json");
assert.equal(publicView.verification.productionReady, false);
assert.equal(
  publicView.verification.redactionPolicy,
  "customer-email-and-full-private-settlement-refs-redacted",
);
assert.equal(publicView.growthLoop.schemaVersion, "vanta-pay-receipt-growth-loop-v0.1");
assert.equal(publicView.growthLoop.sharePath, `/receipt/${receipt.id}`);
assert.equal(publicView.growthLoop.counterpartyVerification.verifierRoute, "/receipt/:receiptId");
assert.equal(
  publicView.growthLoop.counterpartyVerification.verificationCommand,
  "npm run pay:growth-loop-check",
);
assert.equal(publicView.growthLoop.invitedUse.nextAction, "share_receipt_with_counterparty");
assert.equal(publicView.growthLoop.repeatedPrivateAction.liveUsageMeasured, false);
assert.equal(publicView.growthLoop.evidence.schemaVersion, "vanta-pay-growth-loop-evidence-v0.1");
assert.equal(publicView.growthLoop.evidence.eventLedger.object, "growth_loop_event_ledger");
assert.equal(publicView.growthLoop.evidence.eventLedger.liveMeasurementEnabled, false);
assert.equal(publicView.growthLoop.evidence.eventLedger.events.length, 5);
assert.equal(publicView.growthLoop.evidence.derivedCounters.invitedCounterparties7d, 1);
assert.equal(publicView.growthLoop.evidence.derivedCounters.counterpartyVerifierOpened7d, 1);
assert.equal(publicView.growthLoop.evidence.derivedCounters.nextPrivateSettlementRequests7d, 2);
assert.equal(publicView.growthLoop.evidence.derivedCounters.repeatedPrivateActions7d, 2);
assert.equal(publicView.growthLoop.evidence.claimControls.claimLiftBlockedUntilLiveEvidence, true);
assert.equal(publicView.growthLoop.usageVelocity.invitedCounterparties7d, 1);
assert.equal(publicView.growthLoop.usageVelocity.repeatedPrivateActions7d, 2);
assert.equal(publicView.growthLoop.productionReady, false);
assert.equal(publicView.counterpartyActivation.schemaVersion, "vanta-pay-counterparty-activation-v0.1");
assert.equal(publicView.counterpartyActivation.status, "actionable-live-redacted-claim-blocked");
assert.equal(
  publicView.counterpartyActivation.counterpartyNextAction.nextAction,
  "request_next_private_settlement",
);
assert.equal(publicView.counterpartyActivation.counterpartyNextAction.eventType, "next_settlement_intent_created");
assert.equal(publicView.counterpartyActivation.counterpartyNextAction.route, "/app/pay");
assert.equal(publicView.counterpartyActivation.measurement.eventTypes.length, 3);
assert.equal(publicView.counterpartyActivation.measurement.noCustomerEmailValue, true);
assert.equal(publicView.counterpartyActivation.measurement.noIpAddressOrUserAgent, true);
assert.equal(publicView.counterpartyActivation.claimControls.adoptionClaimAllowed, false);
assert.equal(publicView.counterpartyActivation.claimControls.productionReady, false);
assert.equal(
  publicView.committedCheckoutAcceptance.schemaVersion,
  "vanta-pay-committed-checkout-acceptance-v0.1",
);
assert.equal(
  publicView.committedCheckoutAcceptance.status,
  "acceptance-ready-live-redacted-claim-blocked",
);
assert.equal(
  publicView.committedCheckoutAcceptance.acceptanceAction.eventType,
  "committed_checkout_acceptance_created",
);
assert.equal(
  publicView.committedCheckoutAcceptance.acceptedPrivateSettlement.economicsMode,
  "committed-economics",
);
assert.equal(
  publicView.committedCheckoutAcceptance.acceptedPrivateSettlement.rawEconomicTermsInAcceptedCheckoutSettlement,
  false,
);
assert.equal(
  publicView.committedCheckoutAcceptance.privacyBoundary.rawFutureSettlementTermsStored,
  false,
);
assert.equal(publicView.committedCheckoutAcceptance.claimControls.adoptionClaimAllowed, false);
assert.equal(publicView.committedCheckoutAcceptance.claimControls.productionReady, false);
assert.ok(publicView.privateSettlement.railReceipt.idPrefix);
assert.ok(publicView.privateSettlement.auditDisclosure.idPrefix);
assert.ok(publicView.privateSettlement.railReceipt.idPrefix.length < receipt.privateRailReceiptId.length);
assert.ok(publicView.privateSettlement.auditDisclosure.idPrefix.length < receipt.auditDisclosureId.length);
assert.ok(!serialized.includes("buyer@example.com"), "Public receipt view must redact customer email.");
assert.ok(!/"customerEmail"\s*:/u.test(serialized), "Public receipt view must not expose customerEmail.");
assert.ok(
  !serialized.includes(receipt.privateRailReceiptId),
  "Public receipt view must not expose the full private rail receipt ID.",
);
assert.ok(
  !serialized.includes(receipt.auditDisclosureId),
  "Public receipt view must not expose the full audit disclosure ID.",
);

console.log("Vanta Pay receipt public view check: PASS");
