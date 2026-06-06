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
    claimSummary: "production privacy not enabled",
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
        field: "local_proving_evidence",
        merchantInternal: "visible",
        buyerShareable: "visible",
        operatorVerification: "visible",
        note: "Receipt packets must show that client-side proving is the default and server proving remains explicit fallback evidence only.",
      },
      {
        field: "usage_velocity_evidence",
        merchantInternal: "visible",
        buyerShareable: "visible",
        operatorVerification: "visible",
        note: "Usage velocity is tracked red-first; claim lift remains blocked until reviewer-verifiable on-chain metrics exist.",
      },
      {
        field: "institutional_disclosure_scope",
        merchantInternal: "visible",
        buyerShareable: "selective_disclosure",
        operatorVerification: "visible",
        note: "Institutional disclosure must be explicit, time/scope-limited, and verifiable without exposing full transaction history.",
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
      "npm run twitter-intelligence:check",
      "npm run pay:verify",
      "npm run mainnet:private-settlement-check",
    ],
  };
}

/**
 * L9 fix (2026-05-22): runtime privacy-flag guard.
 *
 * The privacy contract's `claimControls.production_privacy_claims_locked`
 * field is currently static (it is `true` in the contract type literal and
 * `true` in the live contract above). That made any code path that asserts
 * "production-privacy is allowed" a TypeScript guarantee but NOT a runtime
 * guarantee — a future refactor that elevates the static literal (or that
 * imports the contract from a service that returns a mutated copy) would
 * silently allow a production-privacy claim with no defensive check.
 *
 * This guard is the runtime version. Any pay code path about to surface
 * "production-private" / "fully-private" / "mainnet-private" copy or to
 * accept a `fully_private_pay_claim` request must call this first. The
 * guard throws — it does not return a status code — because failing
 * silently on a privacy claim is exactly the kind of drift the truth
 * boundary is designed to prevent.
 */
export class VantaPayProductionPrivacyClaimLockedError extends Error {
  readonly code = "vanta-pay-production-privacy-claim-locked";
  readonly attemptedClaim: string;
  constructor(attemptedClaim: string) {
    super(
      `Vanta Pay production-privacy claim "${attemptedClaim}" is locked by ` +
        `the receipt privacy contract. Promote the contract via the audited ` +
        `claim-gate flow before this code path can run. See ` +
        `docs/AUDIT_2026-05-22_findings.md L9.`,
    );
    this.name = "VantaPayProductionPrivacyClaimLockedError";
    this.attemptedClaim = attemptedClaim;
  }
}

/**
 * Throws VantaPayProductionPrivacyClaimLockedError if any caller asks to
 * make a production-privacy claim while the static contract says claims
 * are locked. Returns the validated contract when allowed.
 *
 * Usage:
 *   assertVantaPayProductionPrivacyClaimAllowed("fully_private_pay_claim");
 *   // ... proceed with production-privacy code path ...
 */
export function assertVantaPayProductionPrivacyClaimAllowed(
  attemptedClaim:
    | "fully_private_pay_claim"
    | "production_private_pay_claim"
    | "mainnet_private_pay_claim",
  contract: VantaPayReceiptPrivacyContract = getVantaPayReceiptPrivacyContract(),
): VantaPayReceiptPrivacyContract {
  const claimControls = contract.claimControls as Readonly<Record<string, unknown>>;
  if (claimControls.production_privacy_claims_locked === true) {
    throw new VantaPayProductionPrivacyClaimLockedError(attemptedClaim);
  }
  if (
    attemptedClaim === "fully_private_pay_claim" &&
    claimControls.fully_private_pay_claim !== true
  ) {
    throw new VantaPayProductionPrivacyClaimLockedError(attemptedClaim);
  }
  return contract;
}
