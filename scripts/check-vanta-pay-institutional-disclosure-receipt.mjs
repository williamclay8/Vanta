import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildVantaPayInstitutionalDisclosureReceipt } from "../src/pay/vantaPayInstitutionalDisclosureReceipt.ts";
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
  amount: "42.00",
  asset: "USDC",
  auditDisclosureId: "aud_7a1d3a7fd97ce95f7f06c32c",
  checkoutSessionId: "cs_institutional_disclosure_test",
  completionBasis: "local-test-harness",
  createdAt: "2026-05-02T00:00:00.000Z",
  customerEmail: "institutional-buyer@example.com",
  customerPaymentEvidenceRef: "evidence_should_not_be_disclosed",
  id: "rcpt_institutional_disclosure_test",
  invoiceReference: "INV-4242",
  merchantId: "merchant_vanta_demo",
  object: "receipt",
  orderId: "order_institutional_disclosure_test",
  paymentId: "pay_institutional_disclosure_test",
  privateRailReceiptId: "prail_4c4cfd71f6f024c629d06902",
  status: "paid",
};

const disclosureReceipt = buildVantaPayInstitutionalDisclosureReceipt(receipt);
const publicView = buildVantaPayReceiptPublicView(receipt);
const serializedDisclosure = JSON.stringify(disclosureReceipt);
const serializedPublicView = JSON.stringify(publicView);

assert.equal(
  disclosureReceipt.schemaVersion,
  "vanta-pay-institutional-disclosure-receipt-v0.1",
);
assert.equal(disclosureReceipt.object, "institutional_disclosure_receipt");
assert.equal(disclosureReceipt.disclosureMode, "selective_disclosure_receipt");
assert.equal(disclosureReceipt.purpose, "counterparty-verifiable private settlement");
assert.equal(disclosureReceipt.scope.basis, "time-and-scope-limited");
assert.equal(disclosureReceipt.scope.expiresAt, "2026-05-09T00:00:00.000Z");
assert.equal(disclosureReceipt.scope.jurisdiction, "jurisdiction-aware-design-only");
assert.deepEqual(disclosureReceipt.disclosedFields, [
  "receipt_id",
  "payment_id",
  "payment_status",
  "asset",
  "amount",
  "invoice_reference",
  "compliance_gateway_summary",
  "amount_window_disclosure_summary",
  "private_settlement_reference_prefix",
  "audit_disclosure_reference_prefix",
  "claim_boundary",
  "verification_commands",
]);
assert.equal(disclosureReceipt.redactions.customerEmailValueDisclosed, false);
assert.equal(disclosureReceipt.redactions.fullPrivateRailReceiptIdDisclosed, false);
assert.equal(disclosureReceipt.redactions.fullAuditDisclosureIdDisclosed, false);
assert.equal(disclosureReceipt.redactions.privateInputsDisclosed, false);
assert.equal(disclosureReceipt.redactions.witnessDisclosed, false);
assert.equal(disclosureReceipt.redactions.fullTransactionHistoryDisclosed, false);
assert.equal(disclosureReceipt.claimControls.productionReady, false);
assert.equal(disclosureReceipt.claimControls.regulatorApprovalClaimAllowed, false);
assert.equal(disclosureReceipt.claimControls.complianceSafeClaimAllowed, false);
assert.equal(disclosureReceipt.claimControls.anonymityClaimAllowed, false);
assert.deepEqual(disclosureReceipt.verification.commands, [
  "npm run pay:institutional-disclosure-receipt-check",
  "npm run compliance:gateway-check",
  "npm run institutional-lane-check",
  "npm run pay:receipt-public-view-check",
]);
assert.equal(
  disclosureReceipt.verification.claimBoundary,
  "beta-selective-disclosure-not-production-private-or-regulator-approved",
);
assert.equal(
  publicView.institutionalDisclosure.receiptSchemaVersion,
  "vanta-pay-institutional-disclosure-receipt-v0.1",
);
assert.equal(publicView.institutionalDisclosure.mode, "selective_disclosure_receipt");
assert.equal(publicView.institutionalDisclosure.regulatorScope, "time-and-scope-limited");
assert.equal(publicView.institutionalDisclosure.expiresAt, "2026-05-09T00:00:00.000Z");
assert.equal(publicView.institutionalDisclosure.privateInputsDisclosed, false);
assert.equal(publicView.institutionalDisclosure.witnessDisclosed, false);
assert.equal(publicView.institutionalDisclosure.productionReady, false);
assert.equal(
  publicView.institutionalDisclosure.verificationCommand,
  "npm run pay:institutional-disclosure-receipt-check",
);
assert.equal(
  disclosureReceipt.receiptRef.complianceGateway.verificationCommand,
  "npm run compliance:gateway-check",
);
assert.equal(
  disclosureReceipt.receiptRef.amountWindowDisclosure.schemaVersion,
  "vanta-pay-amount-window-disclosure-v0.1",
);
assert.deepEqual(disclosureReceipt.receiptRef.amountWindowDisclosure.predicateKinds, [
  "amountAboveThreshold",
  "disclosureWindowActive",
]);
assert.equal(disclosureReceipt.receiptRef.amountWindowDisclosure.thresholdAsset, "USDC");
assert.equal(disclosureReceipt.receiptRef.amountWindowDisclosure.thresholdAmount, "25.00");
assert.equal(disclosureReceipt.receiptRef.amountWindowDisclosure.thresholdSatisfied, true);
assert.equal(
  disclosureReceipt.receiptRef.amountWindowDisclosure.disclosureWindow.basis,
  "receipt-created-at-plus-7d",
);
assert.equal(
  disclosureReceipt.receiptRef.amountWindowDisclosure.disclosureWindow.startsAt,
  "2026-05-02T00:00:00.000Z",
);
assert.equal(
  disclosureReceipt.receiptRef.amountWindowDisclosure.disclosureWindow.endsAt,
  "2026-05-09T00:00:00.000Z",
);
assert.equal(
  disclosureReceipt.receiptRef.amountWindowDisclosure.proofMaterialPubliclyDisclosed,
  false,
);
assert.equal(disclosureReceipt.receiptRef.amountWindowDisclosure.privateInputsDisclosed, false);
assert.equal(disclosureReceipt.receiptRef.amountWindowDisclosure.witnessDisclosed, false);
assert.deepEqual(disclosureReceipt.receiptRef.amountWindowDisclosure.verificationCommands, [
  "npm run pay:institutional-disclosure-receipt-check",
  "npm run compliance:gateway-check",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run pay:receipt-public-view-check",
]);
assert.equal(
  disclosureReceipt.receiptRef.complianceGateway.proofMaterialPubliclyDisclosed,
  false,
);
assert.equal(
  publicView.institutionalDisclosure.amountWindowDisclosure.schemaVersion,
  "vanta-pay-amount-window-disclosure-v0.1",
);
assert.equal(
  publicView.institutionalDisclosure.amountWindowDisclosure.thresholdAmount,
  "25.00",
);
assert.equal(
  publicView.institutionalDisclosure.amountWindowDisclosure.disclosureWindow.endsAt,
  "2026-05-09T00:00:00.000Z",
);
assert.equal(publicView.institutionalDisclosure.complianceGateway.privateInputsDisclosed, false);
assert.equal(publicView.institutionalDisclosure.complianceGateway.witnessDisclosed, false);
assert.equal(
  publicView.institutionalDisclosure.complianceGateway.realNoirAdapter.circuitPath,
  "zk/noir/vanta_selective_disclosure",
);
assert.ok(
  publicView.verification.commands.includes("npm run pay:institutional-disclosure-receipt-check"),
);

for (const leaked of [
  receipt.customerEmail,
  receipt.customerPaymentEvidenceRef,
  receipt.privateRailReceiptId,
  receipt.auditDisclosureId,
]) {
  assert.ok(!serializedDisclosure.includes(leaked), `${leaked} leaked in disclosure receipt`);
  assert.ok(!serializedPublicView.includes(leaked), `${leaked} leaked in public view`);
}

requireMarkers("src/pay/vantaPayTypes.ts", [
  "VantaPayInstitutionalDisclosureReceipt",
  "selective_disclosure_receipt",
  "amount_window_disclosure_summary",
  "VantaPayAmountWindowDisclosureSummary",
  "time-and-scope-limited",
  "privateInputsDisclosed",
  "witnessDisclosed",
  "regulatorApprovalClaimAllowed",
  "complianceSafeClaimAllowed",
  "VantaPayComplianceGatewaySummary",
]);
requireMarkers("src/pay/vantaPayInstitutionalDisclosureReceipt.ts", [
  "vanta-pay-institutional-disclosure-receipt-v0.1",
  "counterparty-verifiable private settlement",
  "beta-selective-disclosure-not-production-private-or-regulator-approved",
  "amount_window_disclosure_summary",
  "privateInputsDisclosed: false",
  "witnessDisclosed: false",
  "npm run compliance:gateway-check",
]);
requireMarkers("src/pay/vantaPayAmountWindowDisclosure.ts", [
  "vanta-pay-amount-window-disclosure-v0.1",
  "receipt-bound amount-and-window selective disclosure",
  "supported-bucket-floor-or-exact-amount-fallback",
  "disclosureWindowActive",
  "npm run pay:committed-checkout-acceptance-check",
]);
requireMarkers("src/pay/vantaPayReceiptPublicView.ts", [
  "VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION",
  "receiptSchemaVersion",
  "amountWindowDisclosure",
  "npm run pay:institutional-disclosure-receipt-check",
  "vanta-compliance-gateway-summary-v0.1",
]);
requireMarkers("src/components/PayReceiptPacketCard.tsx", [
  "Selective disclosure receipt",
  "Amount/window disclosure",
  "windowActiveForShareLink",
  "Disclosure expires",
  "Private inputs disclosed",
  "Witness disclosed",
  "Gateway check",
  "publicView.institutionalDisclosure.receiptSchemaVersion",
]);
requireMarkers("operator/pay-server.mjs", [
  "pay/vantaPayInstitutionalDisclosureReceipt.ts",
]);
requireMarkers("scripts/print-vanta-pay-status.mjs", [
  "pay:institutional-disclosure-receipt-check",
  "institutional disclosure receipt",
]);
requireMarkers("docs/privacy-rail-contract.md", [
  "Institutional selective-disclosure receipt",
  "vanta-pay-institutional-disclosure-receipt-v0.1",
  "npm run pay:institutional-disclosure-receipt-check",
]);
requireMarkers("docs/twitter-intelligence/2026-06-06-requirements.md", [
  "selective-disclosure receipt",
  "vanta-pay-institutional-disclosure-receipt-v0.1",
  "npm run pay:institutional-disclosure-receipt-check",
]);

const packageJson = JSON.parse(sourceOf("package.json"));
assert.equal(
  packageJson.scripts?.["pay:institutional-disclosure-receipt-check"],
  "node scripts/check-vanta-pay-institutional-disclosure-receipt.mjs",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes(
    "npm run compliance:gateway-check",
  ),
  "twitter-intelligence:check must include the Compliance Gateway gate",
);
assert.ok(
  packageJson.scripts?.["twitter-intelligence:check"]?.includes(
    "npm run pay:institutional-disclosure-receipt-check",
  ),
  "twitter-intelligence:check must include the Pay institutional disclosure receipt gate",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes(
    "npm run compliance:gateway-check",
  ),
  "pay:verify must include the Compliance Gateway gate",
);
assert.ok(
  packageJson.scripts?.["pay:verify"]?.includes(
    "npm run pay:institutional-disclosure-receipt-check",
  ),
  "pay:verify must include the Pay institutional disclosure receipt gate",
);

for (const source of [
  sourceOf("src/pay/vantaPayInstitutionalDisclosureReceipt.ts"),
  sourceOf("src/pay/vantaPayReceiptPublicView.ts"),
  sourceOf("src/components/PayReceiptPacketCard.tsx"),
  sourceOf("docs/privacy-rail-contract.md"),
  sourceOf("docs/twitter-intelligence/2026-06-06-requirements.md"),
]) {
  for (const banned of [
    "Fully private Pay",
    "Anonymous payments",
    "Untraceable settlement",
    "Production-ready private checkout",
    "Live mainnet private payment",
    "Regulator-approved",
    "Compliance-safe",
  ]) {
    if (source.includes(banned)) {
      failures.push(`Banned institutional disclosure claim found: ${banned}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Vanta Pay institutional disclosure receipt check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta Pay institutional disclosure receipt check: PASS");
