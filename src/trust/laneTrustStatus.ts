import { getVantaPayReceiptPrivacyContract } from "@/pay/vantaPayReceiptPrivacyContract";
import { getStrategyPrivateRailTrustContract } from "@/strategy/strategyPrivateRailTrustContract";
import { getSendTrustContract } from "@/solana/sendTrustContract";
import { getShieldTrustContract } from "@/solana/shieldTrustContract";
import { getSwapTrustContract } from "@/solana/swapTrustContract";
import { getUnshieldTrustContract } from "@/solana/unshieldTrustContract";

export const LANE_TRUST_STATUS_LOCKED_LABEL = "Action: locked. Receipt: gate check" as const;

export type LaneTrustStatusId =
  | "shield"
  | "send"
  | "swap"
  | "unshield"
  | "strategy"
  | "pay";

export type LaneTrustStatus = {
  id: LaneTrustStatusId;
  label: "Shield" | "Send" | "Swap" | "Unshield" | "Strategy" | "Pay";
  contractVersion: string;
  currentTruth: string;
  claimControls: {
    fullyPrivateClaim: false;
    liveProductionClaim: false;
    mainnetReady: false;
    productionPrivacyClaimsLocked: true;
    programmaticPrivateSwapClaim?: false;
  };
  claimLocked: true;
  statusLabel: typeof LANE_TRUST_STATUS_LOCKED_LABEL;
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
};

type StandardClaimControls = {
  fullyPrivateShieldClaim?: false;
  fullyPrivateSendClaim?: false;
  fullyPrivateSwapClaim?: false;
  fullyPrivateUnshieldClaim?: false;
  fullyPrivateStrategyClaim?: false;
  liveProductionClaim: false;
  mainnetReady: false;
  productionPrivacyClaimsLocked: true;
  programmaticPrivateSwapClaim?: false;
};

type NormalizedClaimControls = LaneTrustStatus["claimControls"];

function normalizeStandardClaimControls(
  controls: StandardClaimControls,
): NormalizedClaimControls {
  const fullyPrivateClaim =
    controls.fullyPrivateShieldClaim ??
    controls.fullyPrivateSendClaim ??
    controls.fullyPrivateSwapClaim ??
    controls.fullyPrivateUnshieldClaim ??
    controls.fullyPrivateStrategyClaim ??
    false;

  return {
    fullyPrivateClaim,
    liveProductionClaim: controls.liveProductionClaim,
    mainnetReady: controls.mainnetReady,
    productionPrivacyClaimsLocked: controls.productionPrivacyClaimsLocked,
    programmaticPrivateSwapClaim: controls.programmaticPrivateSwapClaim,
  };
}

function normalizePayClaimControls(controls: {
  fully_private_pay_claim: false;
  production_privacy_claims_locked: true;
}): NormalizedClaimControls {
  return {
    fullyPrivateClaim: controls.fully_private_pay_claim,
    liveProductionClaim: false,
    mainnetReady: false,
    productionPrivacyClaimsLocked: controls.production_privacy_claims_locked,
  };
}

function buildLaneTrustStatus(input: {
  id: LaneTrustStatusId;
  label: LaneTrustStatus["label"];
  contractVersion: string;
  currentTruth: string;
  claimControls: NormalizedClaimControls;
  visibleStatusCopy: string;
  verificationSurfaces: readonly string[];
}): LaneTrustStatus {
  return {
    ...input,
    claimLocked: input.claimControls.productionPrivacyClaimsLocked,
    statusLabel: LANE_TRUST_STATUS_LOCKED_LABEL,
  };
}

function buildLaneTrustStatuses(): readonly LaneTrustStatus[] {
  const shield = getShieldTrustContract();
  const send = getSendTrustContract();
  const swap = getSwapTrustContract();
  const unshield = getUnshieldTrustContract();
  const strategy = getStrategyPrivateRailTrustContract();
  const pay = getVantaPayReceiptPrivacyContract();

  return [
    buildLaneTrustStatus({
      id: "shield",
      label: "Shield",
      contractVersion: shield.version,
      currentTruth: shield.currentTruth,
      claimControls: normalizeStandardClaimControls(shield.claimControls),
      visibleStatusCopy: shield.visibleStatusCopy,
      verificationSurfaces: shield.verificationSurfaces,
    }),
    buildLaneTrustStatus({
      id: "send",
      label: "Send",
      contractVersion: send.version,
      currentTruth: send.currentTruth,
      claimControls: normalizeStandardClaimControls(send.claimControls),
      visibleStatusCopy: send.visibleStatusCopy,
      verificationSurfaces: send.verificationSurfaces,
    }),
    buildLaneTrustStatus({
      id: "swap",
      label: "Swap",
      contractVersion: swap.version,
      currentTruth: swap.currentTruth,
      claimControls: normalizeStandardClaimControls(swap.claimControls),
      visibleStatusCopy: swap.visibleStatusCopy,
      verificationSurfaces: swap.verificationSurfaces,
    }),
    buildLaneTrustStatus({
      id: "unshield",
      label: "Unshield",
      contractVersion: unshield.version,
      currentTruth: unshield.currentTruth,
      claimControls: normalizeStandardClaimControls(unshield.claimControls),
      visibleStatusCopy: unshield.visibleStatusCopy,
      verificationSurfaces: unshield.verificationSurfaces,
    }),
    buildLaneTrustStatus({
      id: "strategy",
      label: "Strategy",
      contractVersion: strategy.version,
      currentTruth: strategy.currentTruth,
      claimControls: normalizeStandardClaimControls(strategy.claimControls),
      visibleStatusCopy: "Action: Strategy rail. Receipt: hash-bound evidence only.",
      verificationSurfaces: strategy.verificationSurfaces,
    }),
    buildLaneTrustStatus({
      id: "pay",
      label: "Pay",
      contractVersion: pay.version,
      currentTruth: pay.currentTruth,
      claimControls: normalizePayClaimControls(pay.claimControls),
      visibleStatusCopy: `Action: Pay. Receipt: ${pay.currentTruth}.`,
      verificationSurfaces: pay.verificationSurfaces,
    }),
  ] as const;
}

const laneTrustStatuses = buildLaneTrustStatuses();

export function getLaneTrustStatuses(): readonly LaneTrustStatus[] {
  return laneTrustStatuses;
}
