import type { VantaPayReceiptPrivacyContract } from "./vantaPayTypes";
import { getVantaPayReceiptPrivacyContract } from "./vantaPayReceiptPrivacyContract";

export const VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION =
  "vanta-pay-customer-side-zk-escrow-binding-0.1" as const;

export type VantaPayCustomerSideZkEscrowBindingRequest = {
  checkoutSessionId: string;
  economicsCommitment: string;
  ownerCommitment: string;
  proofArtifactPublicInputCommitment?: string | null;
  settlementCommitment: string;
};

export type VantaPayCustomerSideZkEscrowBindingResult = {
  bound: boolean;
  error?: string;
  version: typeof VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION;
};

export type VantaPayCustomerSideZkEscrowBindingPolicy = {
  version: typeof VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION;
  customerSideZkReady: false;
  productionPrivatePayReady: false;
  privacyClaimAllowed: false;
  receiptPrivacyContractVersion: VantaPayReceiptPrivacyContract["version"];
  guardCommand: "npm run pay:customer-side-zk-escrow-binding-check";
  truthBoundary: string;
};

function requireNonEmptyText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Pay customer-side ZK escrow binding requires ${label}.`);
  }
  return trimmed;
}

function requireHexCommitment(value: string, label: string) {
  const trimmed = requireNonEmptyText(value, label);

  if (/^0x[0-9a-fA-F]+$/.test(trimmed) || /^sha256:[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Pay customer-side ZK escrow binding requires commitment-shaped ${label}.`);
}

export function getVantaPayCustomerSideZkEscrowBindingPolicy(): VantaPayCustomerSideZkEscrowBindingPolicy {
  const receiptContract = getVantaPayReceiptPrivacyContract();
  return {
    version: VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION,
    customerSideZkReady: false,
    productionPrivatePayReady: false,
    privacyClaimAllowed: false,
    receiptPrivacyContractVersion: receiptContract.version,
    guardCommand: "npm run pay:customer-side-zk-escrow-binding-check",
    truthBoundary:
      "Pay checkout can validate commitment-shaped escrow binding locally, but customer-side noir-bb proving and production private settlement remain blocked until remote/browser production prover acceptance and live settlement evidence exist.",
  };
}

/**
 * Fail-closed scaffold: validates commitment-shaped checkout binding fields without
 * accepting mock proofs as production-private Pay settlement.
 */
export function validateVantaPayCustomerSideZkEscrowBinding(
  request: VantaPayCustomerSideZkEscrowBindingRequest,
): VantaPayCustomerSideZkEscrowBindingResult {
  try {
    requireNonEmptyText(request.checkoutSessionId, "checkoutSessionId");
    requireHexCommitment(request.economicsCommitment, "economicsCommitment");
    requireHexCommitment(request.ownerCommitment, "ownerCommitment");
    requireHexCommitment(request.settlementCommitment, "settlementCommitment");

    if (request.proofArtifactPublicInputCommitment) {
      requireHexCommitment(
        request.proofArtifactPublicInputCommitment,
        "proofArtifactPublicInputCommitment",
      );
    }

    return {
      bound: false,
      error: "Customer-side ZK escrow binding scaffold rejects production promotion until noir-bb customer proving is wired.",
      version: VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION,
    };
  } catch (error) {
    return {
      bound: false,
      error: error instanceof Error ? error.message : String(error),
      version: VANTA_PAY_CUSTOMER_SIDE_ZK_ESCROW_BINDING_VERSION,
    };
  }
}
