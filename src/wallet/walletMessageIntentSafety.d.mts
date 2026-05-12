export type WalletMessageIntentKind =
  | "shield-key-derivation-intent"
  | "swap-intent"
  | "unshield-intent"
  | "sol-unshield-intent";

export type WalletMessageIntentSafetySummary = {
  amount: string;
  asset: string;
  expiresAt: number;
  intentKind: WalletMessageIntentKind;
  issuedAt: number;
  kind: "vanta-wallet-message-intent-safety-summary";
  messagePreview: string;
  owner: string;
  recipient: string;
  requestId: string;
  requester: string;
  requiresHumanApproval: true;
  requiresNonceOrRequestId: true;
  requiresWalletMessageApproval: true;
  version: "vanta-wallet-message-intent-safety-0.1";
};

export type WalletMessageIntentSafetyDecision = {
  accepted: boolean;
  reason: string;
};

export type WalletMessageIntentSafetyInput = {
  amount: string;
  asset: string;
  connectedWalletAddress?: string;
  expiresAt: number;
  humanApprovedSummary?: boolean;
  intentKind: WalletMessageIntentKind;
  issuedAt: number;
  message: string | Uint8Array;
  now?: number;
  owner: string;
  privateKeyMaterialHandled?: boolean;
  recipient: string;
  requestId: string;
  requester: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

export declare function createWalletMessageIntentSafetySummary(
  input: WalletMessageIntentSafetyInput,
): WalletMessageIntentSafetySummary;

export declare function validateWalletMessageIntentSafetySummary(
  summary: WalletMessageIntentSafetySummary,
  options?: {
    connectedWalletAddress?: string;
    humanApprovedSummary?: boolean;
    now?: number;
    privateKeyMaterialHandled?: boolean;
  },
): WalletMessageIntentSafetyDecision;

export declare function signWalletMessageIntentWithSafety(
  input: WalletMessageIntentSafetyInput & {
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  },
): Promise<{
  decision: WalletMessageIntentSafetyDecision;
  signatureBase64: string | null;
  signatureBytes: Uint8Array | null;
  signed: boolean;
  summary: WalletMessageIntentSafetySummary;
}>;
