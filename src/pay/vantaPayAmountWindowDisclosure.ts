import type {
  VantaPayAmountWindowDisclosureSummary,
  VantaPayAsset,
  VantaPayReceipt,
} from "./vantaPayTypes.ts";

export const VANTA_PAY_AMOUNT_WINDOW_DISCLOSURE_SCHEMA_VERSION =
  "vanta-pay-amount-window-disclosure-v0.1" as const;

const SUPPORTED_THRESHOLDS = ["10.00", "25.00", "50.00", "100.00", "250.00", "500.00", "1000.00"] as const;
const PREDICATE_KINDS = ["amountAboveThreshold", "disclosureWindowActive"] as const;
const VERIFICATION_COMMANDS = [
  "npm run pay:institutional-disclosure-receipt-check",
  "npm run compliance:gateway-check",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run pay:receipt-public-view-check",
] as const;

function toDisclosureWindowEndsAt(createdAt: string): string {
  const createdAtDate = new Date(createdAt);
  createdAtDate.setUTCDate(createdAtDate.getUTCDate() + 7);
  return createdAtDate.toISOString();
}

function selectThresholdAmount(amount: string): string {
  const numericAmount = Number.parseFloat(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return amount;
  }

  let selected = amount;
  for (const threshold of SUPPORTED_THRESHOLDS) {
    if (numericAmount >= Number.parseFloat(threshold)) {
      selected = threshold;
    }
  }

  return selected;
}

function buildSummary(
  amount: string,
  asset: VantaPayAsset,
  createdAt: string,
): VantaPayAmountWindowDisclosureSummary {
  const thresholdAmount = selectThresholdAmount(amount);
  return {
    schemaVersion: VANTA_PAY_AMOUNT_WINDOW_DISCLOSURE_SCHEMA_VERSION,
    purpose: "receipt-bound amount-and-window selective disclosure",
    predicateKinds: PREDICATE_KINDS,
    thresholdAsset: asset,
    thresholdAmount,
    thresholdSelection: "supported-bucket-floor-or-exact-amount-fallback",
    thresholdSatisfied: Number.parseFloat(amount) >= Number.parseFloat(thresholdAmount),
    disclosureWindow: {
      basis: "receipt-created-at-plus-7d",
      startsAt: createdAt,
      endsAt: toDisclosureWindowEndsAt(createdAt),
      windowActiveForShareLink: true,
    },
    proofMaterialPubliclyDisclosed: false,
    privateInputsDisclosed: false,
    witnessDisclosed: false,
    proofMode: "summary-only-real-noir-adapter-pending",
    realNoirAdapter: {
      adapterId: "vanta-selective-disclosure-noir-v0.1",
      circuitPath: "zk/noir/vanta_selective_disclosure",
      status: "candidate-package-check-wired",
    },
    verificationCommands: VERIFICATION_COMMANDS,
    claimBoundary: "beta-selective-disclosure-not-production-private-or-regulator-approved",
  };
}

export function buildVantaPayAmountWindowDisclosure(
  receipt: Pick<VantaPayReceipt, "amount" | "asset" | "createdAt">,
): VantaPayAmountWindowDisclosureSummary {
  return buildSummary(receipt.amount, receipt.asset, receipt.createdAt);
}
