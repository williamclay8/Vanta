import type { VantaPayReceiptPrivacyContract } from "./vantaPayTypes";

export const VANTA_PAY_RECEIPT_PRIVACY_CONTRACT_VERSION =
  "vanta-pay-receipt-privacy-contract-0.1" as const;

export function getVantaPayReceiptPrivacyContract(): VantaPayReceiptPrivacyContract {
  return {
    version: VANTA_PAY_RECEIPT_PRIVACY_CONTRACT_VERSION,
    audiences: ["merchant_internal", "buyer_shareable", "operator_verification"],
    claimControls: {
      fully_private_pay_claim: false,
      production_privacy_claims_locked: true,
    },
    claimSummary: "production privacy claims remain locked",
    currentTruth: "receipt-backed test settlement",
    fields: [
      {
        field: "payment_record",
        merchantInternal: "visible",
        buyerShareable: "visible",
        operatorVerification: "visible",
        note: "A receipt-backed payment record is visible after private rail receipt confirmation.",
      },
      {
        field: "customer_email",
        merchantInternal: "visible",
        buyerShareable: "selective_disclosure",
        operatorVerification: "redacted",
        note: "Customer contact data belongs in merchant context, not default operator verification.",
      },
      {
        field: "client_token",
        merchantInternal: "redacted",
        buyerShareable: "redacted",
        operatorVerification: "redacted",
        note: "Client tokens are checkout secrets and must not appear in shareable receipt packets.",
      },
      {
        field: "private_rail_receipt_id",
        merchantInternal: "visible",
        buyerShareable: "selective_disclosure",
        operatorVerification: "visible",
        note: "The proof receipt verifies settlement without making every internal ID buyer-visible by default.",
      },
      {
        field: "audit_disclosure_id",
        merchantInternal: "visible",
        buyerShareable: "selective_disclosure",
        operatorVerification: "visible",
        note: "Audit disclosure is explicit and scoped, not a broad privacy claim.",
      },
      {
        field: "raw_private_economics",
        merchantInternal: "selective_disclosure",
        buyerShareable: "selective_disclosure",
        operatorVerification: "redacted",
        note: "Raw economics should move toward hidden-economics proof requests before stronger privacy claims.",
      },
    ],
    packetStates: ["draft_request", "checkout_issued", "receipt_pending", "receipt_packet_ready"],
    verificationSurfaces: [
      "npm run pay:receipt-privacy-contract-check",
      "npm run pay:verify",
      "npm run mainnet:private-settlement-check",
    ],
  };
}
