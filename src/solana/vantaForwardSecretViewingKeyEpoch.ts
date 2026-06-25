export const VANTA_FORWARD_SECRET_VIEWING_KEY_EPOCH_VERSION =
  "vanta-forward-secret-viewing-key-epoch-0.1" as const;

export type VantaForwardSecretViewingKeyEpoch = {
  epochId: string;
  viewingKeyCommitment: string;
  validFromSlot: string;
  validUntilSlot: string;
};

export type VantaForwardSecretViewingKeyEpochPolicy = {
  version: typeof VANTA_FORWARD_SECRET_VIEWING_KEY_EPOCH_VERSION;
  productionReady: false;
  privacyClaimAllowed: false;
  selectiveTransparencyReady: false;
  guardCommand: "npm run privacy:forward-secret-viewing-key-epoch-check";
  truthBoundary: string;
};

export function getVantaForwardSecretViewingKeyEpochPolicy(): VantaForwardSecretViewingKeyEpochPolicy {
  return {
    version: VANTA_FORWARD_SECRET_VIEWING_KEY_EPOCH_VERSION,
    productionReady: false,
    privacyClaimAllowed: false,
    selectiveTransparencyReady: false,
    guardCommand: "npm run privacy:forward-secret-viewing-key-epoch-check",
    truthBoundary:
      "Forward-secret viewing-key epochs are scaffolded only. Production selective transparency requires reviewed key-rotation, recipient-discovery, and compliance workflows before any privacy claim lift.",
  };
}

/**
 * Scaffold for forward-secret viewing-key epoch rotation. Returns null until a real
 * epoch schedule and commitment derivation path is wired to circuits and indexer discovery.
 */
export function resolveVantaForwardSecretViewingKeyEpoch(args: {
  ownerCommitment: string;
  slot: string | number;
}): VantaForwardSecretViewingKeyEpoch | null {
  const ownerCommitment = args.ownerCommitment.trim();
  const slotText = String(args.slot).trim();

  if (!ownerCommitment || !slotText) {
    return null;
  }

  return null;
}
