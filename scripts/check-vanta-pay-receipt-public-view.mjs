import { strict as assert } from "node:assert";

import { createVantaPayRuntime } from "../src/pay/vantaPayRuntime.ts";
import { buildVantaPayReceiptPublicView } from "../src/pay/vantaPayReceiptPublicView.ts";

const runtime = createVantaPayRuntime();
const merchant = runtime.getMerchant();
const session = runtime.createCheckoutSession({
  amount: "42.00",
  cancelUrl: merchant.callbackUrls.cancelUrl,
  currency: "USDC",
  customerEmail: "buyer@example.com",
  lineItems: [{ amount: "42.00", name: "Redacted view test", quantity: 1 }],
  merchantId: merchant.id,
  mode: "payment",
  successUrl: merchant.callbackUrls.successUrl,
  uiMode: "hosted",
});
const privateRailReceipt = runtime.createPrivateRailReceipt({
  checkoutSessionId: session.id,
  rail: session.privacyRoute.rail,
});
const { payment, receipt } = runtime.completeCheckoutSession(session.id, {
  privateRailReceiptId: privateRailReceipt.id,
});
const publicView = buildVantaPayReceiptPublicView(receipt);
const serialized = JSON.stringify(publicView);

assert.equal(publicView.version, "vanta-pay-receipt-public-view-0.1");
assert.equal(publicView.object, "receipt_public_view");
assert.equal(publicView.receiptId, receipt.id);
assert.equal(publicView.paymentId, payment.id);
assert.equal(publicView.checkoutSessionId, session.id);
assert.equal(publicView.merchantId, merchant.id);
assert.equal(publicView.amount, receipt.amount);
assert.equal(publicView.asset, receipt.asset);
assert.equal(publicView.status, "paid");
assert.equal(publicView.customer.emailCollected, true);
assert.equal(publicView.customer.emailRedacted, true);
assert.equal(publicView.privateSettlement.policyMode, "legible-trust");
assert.equal(publicView.privateSettlement.productionReady, false);
assert.equal(publicView.privateSettlement.railReceipt.redacted, true);
assert.equal(publicView.privateSettlement.auditDisclosure.redacted, true);
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
