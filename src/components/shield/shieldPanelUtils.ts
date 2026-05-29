import type { RecentShieldContext } from "@/data/context/PrivacyFlowContext";
import { formatAssetAmount } from "@/solana/publicSwapRoute";

export function formatEditableAmount(value: number, decimals: number) {
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "")
    .replace(/\.$/u, "");
}

export function describeRecentShieldCompletion(
  recentShield: RecentShieldContext,
  warning: string | null,
) {
  const amountLabel = formatAssetAmount(recentShield.amount, recentShield.asset);
  const suffix = warning ? ` Receipt check warning: ${warning}` : "";

  if (recentShield.claimTier === "proof_receipt_verified") {
    return `${amountLabel} has a verified local Shield proof receipt.${suffix}`;
  }

  if (recentShield.claimTier === "local_private_core_note") {
    return `${amountLabel} was recorded as a local Private Core note. Production privacy is not enabled.${suffix}`;
  }

  if (recentShield.claimTier === "local_shield_state") {
    return `${amountLabel} was recorded in local shield-state. Production privacy is not enabled.${suffix}`;
  }

  return `${amountLabel} reached the Vanta vault as a public deposit; local shield-state proof is still unavailable.${suffix}`;
}
