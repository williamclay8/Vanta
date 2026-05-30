import type { UnshieldLane } from "@/components/unshield/unshieldPanelUtils";
import type { VantaWalletSafeSendResult } from "@/wallet/walletSafeSendBoundary.mjs";

export type UnshieldStatus =
  | "idle"
  | "review"
  | "awaiting_confirmation"
  | "transition_ready"
  | "splitting_note"
  | "split_finalization_ready"
  | "recording_transition"
  | "finalizing_split"
  | "operator_ready"
  | "authorizing_operator"
  | "release_ready"
  | "finalizing_state"
  | "complete"
  | "failed";

export type PendingSpentMarker = {
  amount: string;
  amountNumeric: number;
  asset: UnshieldLane;
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  owner: string;
  transitionKind: "unshield" | "sol_unshield";
  transitionNoteId: string;
  vaultOwner: string;
};

export type PendingSplitMarker = {
  amount: string;
  amountNumeric: number;
  consumedNoteId: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  recipientNoteId: string;
  recipientValue: string;
  transitionNoteId: string;
  vaultOwner: string;
};

export type PendingSplitFollowup = {
  amountNumeric: number;
  childNoteId: string;
};

export type PreparedWalletApproval = Extract<VantaWalletSafeSendResult, { status: "prepared" }>;

export type PendingUnshieldBridge = {
  amountDisplay: string;
  asset: UnshieldLane;
  assetId: string;
  createdAt: number;
  destinationOwner: string;
  mintAddress?: string;
  owner: string;
  consumed: {
    noteId: string;
    stateSignature: string;
    sourceSwapNoteId?: string;
  };
  transition: {
    noteId: string;
  };
  vaultOwner: string;
};

export type UnshieldCompletion = {
  amount: number;
  asset: UnshieldLane;
  requestId?: string;
  transitionNoteId: string;
};
