import type {
  VantaPayInstitutionalDisclosureReceipt,
  VantaPayReceipt,
  VantaPayReceiptRedactedReference,
} from "./vantaPayTypes.ts";

export const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION =
  "vanta-pay-institutional-disclosure-receipt-v0.1" as const;

export const VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS = [
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

function createScopeExpiry(createdAt: string): string {
  const createdAtDate = new Date(createdAt);
  createdAtDate.setUTCDate(createdAtDate.getUTCDate() + 7);
  return createdAtDate.toISOString();
}

export function buildVantaPayInstitutionalDisclosureReceipt(
  receipt: VantaPayReceipt,
): VantaPayInstitutionalDisclosureReceipt {
  return {
    schemaVersion: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_SCHEMA_VERSION,
    object: "institutional_disclosure_receipt",
    disclosureMode: "selective_disclosure_receipt",
    purpose: "counterparty-verifiable private settlement",
    receiptRef: {
      amount: receipt.amount,
      asset: receipt.asset,
      auditDisclosure: redactReference(receipt.auditDisclosureId),
      invoiceReference: receipt.invoiceReference,
      paymentId: receipt.paymentId,
      privateSettlementReference: redactReference(receipt.privateRailReceiptId),
      receiptId: receipt.id,
      status: receipt.status,
    },
    scope: {
      audience: "buyer-shareable-or-authorized-reviewer",
      basis: "time-and-scope-limited",
      expiresAt: createScopeExpiry(receipt.createdAt),
      jurisdiction: "jurisdiction-aware-design-only",
      receiptScope: "receipt_only",
    },
    disclosedFields: VANTA_PAY_INSTITUTIONAL_DISCLOSURE_RECEIPT_DISCLOSED_FIELDS,
    redactions: {
      customerEmailValueDisclosed: false,
      fullAuditDisclosureIdDisclosed: false,
      fullPrivateRailReceiptIdDisclosed: false,
      fullTransactionHistoryDisclosed: false,
      privateInputsDisclosed: false,
      witnessDisclosed: false,
    },
    claimControls: {
      anonymityClaimAllowed: false,
      complianceSafeClaimAllowed: false,
      productionReady: false,
      regulatorApprovalClaimAllowed: false,
    },
    verification: {
      claimBoundary: "beta-selective-disclosure-not-production-private-or-regulator-approved",
      commands: [
        "npm run pay:institutional-disclosure-receipt-check",
        "npm run institutional-lane-check",
        "npm run pay:receipt-public-view-check",
      ],
    },
  };
}
