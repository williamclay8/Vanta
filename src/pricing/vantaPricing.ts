export type VantaPricedSurface =
  | "pay"
  | "shield"
  | "send"
  | "swap"
  | "unshield"
  | "strategy"
  | "dashboard";

export type VantaActionStatus =
  | "preview_only"
  | "submitted"
  | "settled"
  | "executed"
  | "completed"
  | "failed"
  | "read_only";

export const VANTA_PRICING_CONTRACT = {
  monthlyFeeUsd: 0,
  successFeeBps: 25,
  successFeeRateDisplay: "0.25%",
  passThroughCostLabels: [
    "Network fees",
    "Off-ramp fees",
    "Third-party execution costs",
  ],
} as const;

export const VANTA_PRICING_COPY = {
  headline:
    "0 monthly fee. 0.25% only when a supported action completes successfully.",
  supporting:
    "Vanta only charges when a supported product action completes successfully.",
  passThrough:
    "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
  tokenRoadmap:
    "$VANTA should be utility-first. Any later buyback policy should use a defined share of Vanta-collected net transaction fees rather than all gross fees.",
} as const;

const LIVE_FEE_SURFACES = new Set<VantaPricedSurface>([
  "pay",
  "shield",
  "send",
  "swap",
  "unshield",
]);

export function shouldChargeVantaFee(input: {
  surface: VantaPricedSurface;
  status: VantaActionStatus;
}): boolean {
  if (input.surface === "dashboard" || input.surface === "strategy") {
    return false;
  }

  if (!LIVE_FEE_SURFACES.has(input.surface)) {
    return false;
  }

  return ["settled", "executed", "completed"].includes(input.status);
}

export function describePricingForSurface(surface: VantaPricedSurface): {
  feeLabel: string;
  passThroughLabel: string;
  shouldShowLiveFeeCopy: boolean;
} {
  if (surface === "strategy") {
    return {
      feeLabel: "No fee while Strategy remains preview-only.",
      passThroughLabel:
        "If live execution ships later, external execution costs should stay separate.",
      shouldShowLiveFeeCopy: false,
    };
  }

  if (surface === "dashboard") {
    return {
      feeLabel: "No monthly fee for dashboard access during the traction phase.",
      passThroughLabel: "No billing is attached to passive dashboard usage.",
      shouldShowLiveFeeCopy: false,
    };
  }

  const labelMap: Record<
    Exclude<VantaPricedSurface, "strategy" | "dashboard">,
    string
  > = {
    pay: "0.25% on verified supported payment actions after preview",
    send: "0.25% on successful service-backed sends",
    shield: "0.25% on successful service-backed shield actions",
    swap: "0.25% on verified swaps routed through Vanta",
    unshield: "0.25% on successful exits when Vanta executes the release path",
  };

  return {
    feeLabel: labelMap[surface],
    passThroughLabel:
      "Network, off-ramp, and third-party execution costs stay separate.",
    shouldShowLiveFeeCopy: true,
  };
}
