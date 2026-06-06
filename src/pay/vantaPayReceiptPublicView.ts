import type {
  VantaPayInstitutionalDisclosureReceipt,
  VantaPayReceipt,
  VantaPayReceiptPublicView,
  VantaPayReceiptRedactedReference,
} from "./vantaPayTypes";

export const VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION =
  "vanta-pay-receipt-public-view-0.1" as const;
const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION =
  "vanta-pay-institutional-disclosure-receipt-v0.1" as const;
const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS = [
  "receipt_id",
  "payment_id",
  "payment_status",
  "asset",
  "amount",
  "invoice_reference",
  "private_settlement_reference_prefix",
  "audit_disclosure_reference_prefix",
  "claim_boundary",
  "verification_commands",
] as const satisfies VantaPayInstitutionalDisclosureReceipt["disclosedFields"];

function redactReference(id: string | null): VantaPayReceiptRedactedReference {
  if (!id) {
    return {
      idPrefix: null,
      redacted: true,
    };
  }

  return {
    idPrefix: id.slice(0, Math.min(10, id.length)),
    redacted: true,
  };
}

function createInstitutionalDisclosureExpiry(createdAt: string): string {
  const createdAtDate = new Date(createdAt);
  createdAtDate.setUTCDate(createdAtDate.getUTCDate() + 7);
  return createdAtDate.toISOString();
}

export function buildVantaPayReceiptPublicView(
  receipt: VantaPayReceipt,
): VantaPayReceiptPublicView {
  return {
    amount: receipt.amount,
    asset: receipt.asset,
    checkoutSessionId: receipt.checkoutSessionId,
    createdAt: receipt.createdAt,
    customer: {
      emailCollected: Boolean(receipt.customerEmail),
      emailRedacted: true,
    },
    invoiceReference: receipt.invoiceReference,
    merchantId: receipt.merchantId,
    object: "receipt_public_view",
    orderId: receipt.orderId,
    paymentId: receipt.paymentId,
    checkoutCompletion: {
      basis: receipt.completionBasis,
      customerPaymentEvidenceRefPresent: Boolean(receipt.customerPaymentEvidenceRef),
      localHarness: receipt.completionBasis === "local-test-harness",
    },
    privateSettlement: {
      auditDisclosure: redactReference(receipt.auditDisclosureId),
      policyMode: "legible-trust",
      productionReady: false,
      railReceipt: redactReference(receipt.privateRailReceiptId),
    },
    receiptId: receipt.id,
    status: receipt.status,
    verification: {
      claimBoundary: "receipt-backed-test-settlement-not-production-private",
      commands: [
        "npm run pay:receipt-public-view-check",
        "npm run pay:receipt-privacy-contract-check",
        "npm run pay:institutional-disclosure-receipt-check",
        "npm run programmatic-privacy:contract-check",
        "npm run twitter-intelligence:check",
      ],
      operatorStatusSurface: "npm run pay:production-readiness-json",
      productionReady: false,
      redactionPolicy: "customer-email-and-full-private-settlement-refs-redacted",
    },
    localProving: {
      defaultMode: "client_side_only",
      privateInputsLeaveClient: false,
      fallbackAllowed: false,
      evidenceStatus: "declared-red-first",
      verificationCommand: "npm run local-proving-enforced-check",
    },
    usageVelocity: {
      primitive: "Pay",
      evidenceStatus: "red-first-no-live-measurement",
      metricSurface: "npm run usage-velocity-check",
      claimLiftBlockedUntilMeasured: true,
      institutionalVolumeTracked: true,
    },
    institutionalDisclosure: {
      mode: "selective_disclosure_receipt",
      receiptSchemaVersion: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION,
      buyerShareable: "selective_disclosure",
      regulatorScope: "time-and-scope-limited",
      expiresAt: createInstitutionalDisclosureExpiry(receipt.createdAt),
      disclosedFields: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS,
      privateInputsDisclosed: false,
      witnessDisclosed: false,
      fullTransactionHistoryDisclosed: false,
      productionReady: false,
      verificationCommand: "npm run pay:institutional-disclosure-receipt-check",
    },
    version: VANTA_PAY_RECEIPT_PUBLIC_VIEW_VERSION,
  };
}
