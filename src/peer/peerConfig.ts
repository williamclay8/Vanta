import { isBetaMode } from "@/config/deploymentMode";

import type { PeerOnrampAvailability } from "./peerOnrampTypes";

function readFlag(value: string | undefined) {
  return value?.trim() === "true";
}

export function getPeerOnrampConfig() {
  const enabled = readFlag(import.meta.env.VITE_VANTA_ENABLE_PEER_ONRAMP);
  const liveFundingEnabled = readFlag(import.meta.env.VITE_VANTA_ENABLE_LIVE_PEER_FUNDING);

  return {
    enabled,
    liveFundingEnabled,
    launchAllowed: enabled && (!isBetaMode || liveFundingEnabled),
  };
}

export function getPeerOnrampAvailability({
  desktopSurface,
  walletAddress,
}: {
  desktopSurface: boolean;
  walletAddress?: string | null;
}): PeerOnrampAvailability {
  const config = getPeerOnrampConfig();

  if (!config.enabled) {
    return "disabled";
  }

  if (!config.launchAllowed) {
    return "beta_blocked";
  }

  if (!desktopSurface) {
    return "unsupported_surface";
  }

  if (!walletAddress) {
    return "needs_wallet";
  }

  return "available";
}
