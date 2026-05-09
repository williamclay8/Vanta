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
assert.equal(publicView.verification.claimBoundary, "receipt-backed-test-settlement-not-production-private");
assert.deepEqual(publicView.verification.commands, [
  "npm run pay:receipt-public-view-check",
  "npm run pay:receipt-privacy-contract-check",
  "npm run programmatic-privacy:contract-check",
]);
assert.equal(publicView.verification.operatorStatusSurface, "npm run pay:production-readiness-json");
assert.equal(publicView.verification.productionReady, false);
assert.equal(
  publicView.verification.redactionPolicy,
  "customer-email-and-full-private-settlement-refs-redacted",
);
assert.ok(publicView.privateSettlement.railReceipt.idPrefix);
assert.ok(publicView.privateSettlement.auditDisclosure.idPrefix);
assert.ok(publicView.privateSettlement.railReceipt.idPrefix.length < receipt.privateRailReceiptId.length);
assert.ok(publicView.privateSettlement.auditDisclosure.idPrefix.length < receipt.auditDisclosureId.length);
assert.ok(!serialized.includes("buyer@example.com"), "Public receipt view must redact customer email.");
assert.ok(!serialized.includes("customerEmail"), "Public receipt view must not expose customerEmail.");
assert.ok(
  !serialized.includes(receipt.privateRailReceiptId),
  "Public receipt view must not expose the full private rail receipt ID.",
);
assert.ok(
  !serialized.includes(receipt.auditDisclosureId),
  "Public receipt view must not expose the full audit disclosure ID.",
);

console.log("Vanta Pay receipt public view check: PASS");
