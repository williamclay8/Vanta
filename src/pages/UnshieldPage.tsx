import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSolanaClient,
  useWalletSession,
} from "@solana/react-hooks";
import { isBetaMode } from "@/config/deploymentMode";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import { UnshieldAdvancedPanel } from "@/components/UnshieldAdvancedPanel";
import {
  UnshieldReceiptModal,
  type UnshieldReceiptModalDetails,
} from "@/components/UnshieldReceiptModal";
import {
  PrivacySummary,
  type PrivacySummaryItem,
} from "@/components/PrivacySummary";
import type { NotePickerOption } from "@/components/NotePicker";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  createSolUnshieldIntentPayload,
  signSolUnshieldIntent,
  VANTA_SOL_UNSHIELD_INTENT_TTL_MS,
} from "@/solana/solUnshieldAuth";
import { fetchSolUnshieldOperatorHealth } from "@/solana/solUnshieldOperatorHealth";
import { requestOperatorSolUnshield } from "@/solana/solUnshieldOperatorClient";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import {
  createUnshieldIntentPayload,
  signUnshieldIntent,
  VANTA_UNSHIELD_INTENT_TTL_MS,
} from "@/solana/unshieldAuth";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  createPreparedSendMemo,
  createPreparedSolUnshieldMemo,
  createPreparedUnshieldMemo,
  createSpentMarkerInstruction,
  fetchVantaShieldAccountState,
  VANTA_NATIVE_SOL_ASSET_ID,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";
import { getUnshieldTrustContract } from "@/solana/unshieldTrustContract";
import {
  listCanonicalUnshieldDiagnosticsSummaries,
  recordCanonicalUnshieldFromLiveUnshield,
} from "@/zk/liveUnshieldBridge";
import { createUmbraUnshieldActionApprovalReview } from "@/privacy/umbraUnshieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { createUnshieldTransactionEvidence } from "@/transactions/vantaTransactionEvidence";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import type { VantaWalletSafeSendResult } from "@/wallet/walletSafeSendBoundary.mjs";
import { signWalletMessageIntentWithSafety } from "@/wallet/walletMessageIntentSafety.mjs";

type UnshieldLane = LiveShieldTokenAssetKey | "SOL";
type UnshieldStatus =
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

type PendingSpentMarker = {
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

type PendingSplitMarker = {
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

type PendingSplitFollowup = {
  amountNumeric: number;
  childNoteId: string;
};

type PreparedWalletApproval = Extract<VantaWalletSafeSendResult, { status: "prepared" }>;

type PendingUnshieldBridge = {
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

const UNSHIELD_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a public exit transaction to your connected wallet",
  },
  {
    label: "Recipient (you) sees",
    value: "full amount, asset, and release receipt",
  },
  {
    label: "Operator sees",
    value: "exit terms and release status, not your full shielded history",
  },
];

type SpendableTokenNote = {
  amount: number;
  createdAt: number;
  noteId: string;
  stateSignature: string;
};

function formatShieldTokenAmount(value: number, asset: LiveShieldTokenAssetKey) {
  const decimals = Math.min(getLiveShieldTokenAsset(asset).decimals, 6);
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  })} ${asset}`;
}

function formatSolAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} SOL`;
}

function abbreviate(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function getSolscanTransactionUrl(signature: string) {
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

function formatUnshieldAmount(value: number, asset: UnshieldLane) {
  return asset === "SOL"
    ? formatSolAmount(value)
    : formatShieldTokenAmount(value, asset);
}

function formatShieldedLaneLabel(asset: UnshieldLane) {
  return `Shielded ${asset}`;
}

function formatAvailableLaneOptionLabel(option: {
  amount: number;
  lane: UnshieldLane;
  pendingAmount?: number;
}) {
  return `${formatShieldedLaneLabel(option.lane)} - ${formatUnshieldAmount(option.amount, option.lane)} ledger spendable`;
}

function formatEditableAmount(value: number, decimals: number) {
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "")
    .replace(/\.$/u, "");
}

function parseDecimalAmountToBaseUnits(amountDisplay: string, decimals: number) {
  const normalized = amountDisplay.trim();

  if (!/^\d+(\.\d+)?$/u.test(normalized)) {
    throw new Error("Vanta Umbra unshield approval requires a decimal amount.");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const wholeBaseUnits = BigInt(wholePart || "0") * 10n ** BigInt(decimals);
  const fractionalBaseUnits = BigInt(fractionalPart.padEnd(decimals, "0").slice(0, decimals) || "0");

  return wholeBaseUnits + fractionalBaseUnits;
}

function parseEditableAmount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountsRoughlyMatch(left: number, right: number) {
  return Math.abs(left - right) <= 0.000001;
}

function chooseBestSpendableNote<T extends { amount: number; createdAt: number }>(
  notes: readonly T[],
) {
  return [...notes].sort((left, right) => {
    if (right.amount !== left.amount) {
      return right.amount - left.amount;
    }

    return right.createdAt - left.createdAt;
  })[0] ?? null;
}

function chooseSelectedSpendableNote<T extends { amount: number; createdAt: number; noteId: string }>(
  notes: readonly T[],
  selectedNoteId: string | null,
) {
  if (selectedNoteId) {
    const selectedNote = notes.find((note) => note.noteId === selectedNoteId);

    if (selectedNote) {
      return selectedNote;
    }
  }

  return chooseBestSpendableNote(notes);
}

function isCanonicalTokenSpendableNote(note: { noteId: string; stateSignature: string }) {
  return !(
    note.noteId.startsWith("vnta_recent_") ||
    note.stateSignature.startsWith("local-token-deposit:")
  );
}

function assertCanonicalTokenSpendableNote(note: { noteId: string; stateSignature: string }) {
  if (!isCanonicalTokenSpendableNote(note)) {
    throw new Error("Vanta is still syncing this shielded token note; it is not spendable yet.");
  }
}

function isCanonicalSolSpendableNote(note: VantaShieldedSolNote) {
  return (
    note.lifecycleStatus !== "spendable" ||
    note.noteId.startsWith("vnta_native_sol_recent_") ||
    note.stateSignature.startsWith("local-sol-recovery:") ||
    note.stateSignature.startsWith("local-sol-shield-state:") ||
    note.sourceSwapNoteId === "native-sol-shield-state"
  )
    ? false
    : true;
}

function isVisibleSolShieldStateNote(note: VantaShieldedSolNote) {
  return note.lifecycleStatus !== "consumed";
}

function isPendingLocalSolShieldStateNote(note: VantaShieldedSolNote) {
  return (
    note.lifecycleStatus === "pending" &&
    (note.stateSignature.startsWith("local-sol-recovery:") ||
      note.stateSignature.startsWith("local-sol-shield-state:") ||
      note.sourceSwapNoteId === "native-sol-recovery" ||
      note.sourceSwapNoteId === "native-sol-shield-state")
  );
}

function assertCanonicalSolSpendableNote(note: VantaShieldedSolNote) {
  if (!isCanonicalSolSpendableNote(note)) {
    throw new Error("Vanta is still syncing this shielded SOL note; it is not spendable yet.");
  }
}

function sumSpendableAmounts(notes: readonly { amount: number }[], decimals: number) {
  return Number(notes.reduce((sum, note) => sum + note.amount, 0).toFixed(decimals));
}

export function UnshieldPage() {
  const unshieldTrustContract = useMemo(() => getUnshieldTrustContract(), []);
  const client = useSolanaClient();
  const {
    privateCoreHoldState,
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestConsumeProof,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorLatestSendLinkedProof,
    privateCoreOperatorLatestSend,
    privateCoreOperatorLatestSwapProof,
    privateCoreOperatorLatestSwapLinkedProof,
    privateCoreOperatorLatestSwap,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorContractMirrorPrimaryNote,
    privateCoreOperatorContractMirrorStatusLabel,
    privateCoreOperatorReleaseBoundaryPrimaryNote,
    privateCoreOperatorReleaseBoundaryStatusLabel,
    privateCoreOperatorRequiredLanesPrimaryNote,
    privateCoreOperatorRequiredLanesStatusLabel,
    privateCoreOperatorZkV1ShippingPrimaryNote,
    privateCoreOperatorZkV1ShippingStatusLabel,
    privateCoreOperatorZkV1FinishLinePrimaryNote,
    privateCoreOperatorZkV1FinishLineStatusLabel,
    privateCoreOperatorSendBoundaryPrimaryNote,
    privateCoreOperatorSendBoundaryStatusLabel,
    privateCoreOperatorSendContinuityPrimaryNote,
    privateCoreOperatorSendContinuityStatusLabel,
    privateCoreOperatorSwapBoundaryPrimaryNote,
    privateCoreOperatorSwapBoundaryStatusLabel,
    privateCoreOperatorSwapContinuityPrimaryNote,
    privateCoreOperatorSwapContinuityStatusLabel,
    privateCoreOperatorSupportedSendLaneKind,
    privateCoreOperatorSupportedSendLaneNote,
    privateCoreOperatorSupportedSendLaneStatus,
    privateCoreOperatorSupportedSendLaneVersion,
    privateCoreOperatorSupportedSendV1Decision,
    privateCoreOperatorSupportedSendV1DecisionNote,
    privateCoreOperatorSupportedUnshieldLaneKind,
    privateCoreOperatorSupportedUnshieldLaneNote,
    privateCoreOperatorSupportedUnshieldLaneStatus,
    privateCoreOperatorSupportedUnshieldLaneVersion,
    privateCoreOperatorSupportedUnshieldV1Decision,
    privateCoreOperatorSupportedUnshieldV1DecisionNote,
    privateCoreOperatorSupportedReleaseLaneKind,
    privateCoreOperatorSupportedReleaseLaneNote,
    privateCoreOperatorSupportedReleaseLaneStatus,
    privateCoreOperatorSupportedReleaseLaneVersion,
    privateCoreOperatorSupportedSwapLaneKind,
    privateCoreOperatorSupportedSwapLaneNote,
    privateCoreOperatorSupportedSwapLaneStatus,
    privateCoreOperatorSupportedSwapLaneVersion,
    privateCoreOperatorSupportedSwapV1Decision,
    privateCoreOperatorSupportedSwapV1DecisionNote,
    privateCoreOperatorSupportedSwapV1Role,
    privateCoreOperatorSupportedSwapV1RoleNote,
    privateCoreOperatorSupportedSwapVenue,
    privateCoreOperatorSupportedSwapOutputModel,
    privateCoreOperatorSupportedSwapResultingRootBasis,
    privateCoreOperatorSupportedSwapInputRootPolicy,
    privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
    privateCoreOperatorSupportedReleaseV1Decision,
    privateCoreOperatorSupportedReleaseV1DecisionNote,
    privateCoreOperatorSupportedFlowKind,
    privateCoreOperatorSupportedFlowNote,
    privateCoreOperatorSupportedFlowStatus,
    privateCoreOperatorSupportedFlowVersion,
    privateCoreOperatorSupportedZkV1ScopeDecision,
    privateCoreOperatorSupportedZkV1ScopeNote,
    privateCoreOperatorSupportedZkV1RequiredLanes,
    privateCoreOperatorSupportedZkV1RequiredLanesNote,
    privateCoreOperatorSupportedAssetSymbol,
    privateCoreOperatorSupportedEnvironment,
    privateCoreOperatorSupportedNoteSchema,
    privateCoreOperatorSupportedNoteVersion,
    privateCoreOperatorSupportedRootRegistrationProvenance,
    privateCoreOperatorSupportedSendResultingRootBasis,
    privateCoreOperatorSupportedSendInputRootPolicy,
    privateCoreOperatorSupportedSendOutputRegistrationPolicy,
    privateCoreOperatorSupportedRecipientModel,
    privateCoreOperatorSupportedReleaseDestinationModel,
    privateCoreOperatorSupportedProofSystem,
    privateCoreOperatorSupportedUnshieldCircuit,
    privateCoreOperatorSupportedSendCircuit,
    privateCoreOperatorSupportedUnshieldMerkleDepth,
    privateCoreOperatorSupportedSendMerkleDepth,
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    privateCoreOperatorSupportedReleaseRootPolicy,
    privateCoreOperatorSupportedReleaseExecutionModel,
    privateCoreOperatorSupportedReleaseAtomicityModel,
    privateCoreOperatorSupportedReleasePersistenceModel,
    privateCoreOperatorOwnerAuthorizationMode,
    privateCoreOperatorOwnerAuthorizationDecision,
    privateCoreOperatorOwnerAuthorizationDecisionNote,
    privateCoreOperatorSourceArtifactTruthBasis,
    privateCoreOperatorProvingArtifactTruthBasis,
    privateCoreOperatorSourceProvingRelationship,
    privateCoreOperatorNullifierKeyMode,
    privateCoreOperatorProvingHashLane,
    privateCoreOperatorCurrentRootLinkedProof,
    privateCoreOperatorCurrentRootProofLinkStatus,
    privateCoreOperatorSendResultingRootLinkedProof,
    privateCoreOperatorSendResultingRootRecord,
    privateCoreOperatorSendResultingRootPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationStatusLabel,
    privateCoreOperatorSendResultingRootProofLinkStatus,
    privateCoreOperatorSendResultingRootStatusLabel,
    privateCoreOperatorSwapResultingRootLinkedProof,
    privateCoreOperatorSwapResultingRootRecord,
    privateCoreOperatorSwapResultingRootPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
    privateCoreOperatorSwapResultingRootProofLinkStatus,
    privateCoreOperatorSwapResultingRootStatusLabel,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorProofSwapLinkStatus,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootError,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreOperatorContractStateVersion,
    privateCoreOperatorContractVersion,
    privateCoreOperatorContractSummaryVersion,
    privateCoreOperatorStatusKind,
    privateCoreOperatorStatusVersion,
    privateCoreOperatorSnapshotKind,
    privateCoreOperatorSnapshotVersion,
    privateCoreOperatorSupportedStatusNote,
    privateCoreOperatorSupportedStatusTransport,
    privateCoreOperatorSupportedStatusEndpoint,
    privateCoreOperatorSupportedStatusGateVersion,
    privateCoreOperatorSupportedStatusGateKind,
    privateCoreOperatorSupportedStatusGateNote,
    privateCoreOperatorSupportedStatusGateTransport,
    privateCoreOperatorSupportedStatusGateEndpoint,
    privateCoreOperatorSupportedSnapshotGateVersion,
    privateCoreOperatorSupportedSnapshotGateKind,
    privateCoreOperatorSupportedSnapshotGateNote,
    privateCoreOperatorSupportedSnapshotGateTransport,
    privateCoreOperatorSupportedSnapshotGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionGateVersion,
    privateCoreOperatorSupportedShippingDecisionGateKind,
    privateCoreOperatorSupportedShippingDecisionGateNote,
    privateCoreOperatorSupportedShippingDecisionGateTransport,
    privateCoreOperatorSupportedShippingDecisionGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionTransport,
    privateCoreOperatorSupportedShippingDecisionEndpoint,
    privateCoreOperatorSupportedShippingArtifactGateVersion,
    privateCoreOperatorSupportedShippingArtifactGateKind,
    privateCoreOperatorSupportedShippingArtifactGateNote,
    privateCoreOperatorSupportedShippingArtifactGateTransport,
    privateCoreOperatorSupportedShippingArtifactGateEndpoint,
    privateCoreOperatorSupportedSnapshotNote,
    privateCoreOperatorSupportedSnapshotTransport,
    privateCoreOperatorSupportedSnapshotEndpoint,
    privateCoreOperatorSupportedShippingArtifactNote,
    privateCoreOperatorSupportedShippingArtifactTransport,
    privateCoreOperatorSupportedShippingArtifactEndpoint,
    privateCoreOperatorSupportedReleaseCandidateVersion,
    privateCoreOperatorSupportedReleaseCandidateKind,
    privateCoreOperatorSupportedReleaseCandidateNote,
    privateCoreOperatorSupportedReleaseCandidateScope,
    privateCoreOperatorSupportedReleaseCandidateScopeNote,
    privateCoreOperatorSupportedReleaseCandidateGateVersion,
    privateCoreOperatorSupportedReleaseCandidateGateKind,
    privateCoreOperatorSupportedReleaseCandidateGateNote,
    privateCoreOperatorSupportedReleaseCandidateGateTransport,
    privateCoreOperatorSupportedReleaseCandidateGateEndpoint,
    privateCoreOperatorSupportedReleaseCandidateTransport,
    privateCoreOperatorSupportedReleaseCandidateEndpoint,
    privateCoreOperatorShippingArtifactKind,
    privateCoreOperatorShippingArtifactVersion,
    privateCoreOperatorShippingDecisionKind,
    privateCoreOperatorShippingDecisionVersion,
    privateCoreOperatorSupportedShippingDecisionNote,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSwaps,
    privateCoreOperatorSwapProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    privateCoreSendState,
    privateCoreSwapState,
    privateCoreUnshieldState,
    refreshPrivateCoreOperatorSummary,
    runPrivateCoreReplayAttempt,
    runPrivateCoreUnshield,
  } = usePrivacyFlow();
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const viewingKey = useVantaShieldViewingKey();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const canonicalShieldState = useVantaShieldState();
  const usdcShieldEntry = shieldRegistry.byAssetKey.USDC;
  const [selectedLane, setSelectedLane] = useState<UnshieldLane>("USDC");
  const [selectedUnshieldNoteId, setSelectedUnshieldNoteId] = useState<string | null>(null);
  const [requestedAmountInput, setRequestedAmountInput] = useState("");
  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingTransitionApproval, setPendingTransitionApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingFinalizationApproval, setPendingFinalizationApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingSplitMarker, setPendingSplitMarker] = useState<PendingSplitMarker | null>(null);
  const [pendingSplitFinalizationApproval, setPendingSplitFinalizationApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingSplitFollowup, setPendingSplitFollowup] = useState<PendingSplitFollowup | null>(null);
  const [pendingUnshieldBridge, setPendingUnshieldBridge] = useState<PendingUnshieldBridge | null>(null);
  const [pendingUmbraApprovalDisplay, setPendingUmbraApprovalDisplay] =
    useState<UmbraOperationApprovalDisplay | null>(null);
  const [releaseHandoffRefreshPending, setReleaseHandoffRefreshPending] = useState(false);
  const [releasePackageExportStatus, setReleasePackageExportStatus] = useState<
    "idle" | "summary-copy" | "json-copy" | "summary-download" | "json-download" | "failed"
  >("idle");
  const [unshieldReceiptCopyStatus, setUnshieldReceiptCopyStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const [unshieldReceiptModalOpen, setUnshieldReceiptModalOpen] = useState(false);
  const [unshieldBridgeError, setUnshieldBridgeError] = useState<string | null>(null);
  const [operatorAuthorizationStarted, setOperatorAuthorizationStarted] = useState(false);
  const [operatorReleaseSignature, setOperatorReleaseSignature] = useState<string | null>(null);
  const [solUnshieldOperatorHealth, setSolUnshieldOperatorHealth] = useState<
    "idle" | "checking" | "ready" | "blocked"
  >("idle");
  const [solUnshieldOperatorHealthError, setSolUnshieldOperatorHealthError] =
    useState<string | null>(null);
  const [lastTransitionSignature, setLastTransitionSignature] = useState<string | null>(null);
  const [lastSpentMarkerSignature, setLastSpentMarkerSignature] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<{
    amount: number;
    asset: UnshieldLane;
    requestId?: string;
    transitionNoteId: string;
  } | null>(null);
  const [privateCoreActionPending, setPrivateCoreActionPending] = useState(false);
  const selectUnshieldLane = useCallback((nextLane: UnshieldLane) => {
    setSelectedLane(nextLane);
    setSelectedUnshieldNoteId(null);
    setStatus("idle");
    setFlowError(null);
    setUnshieldReceiptCopyStatus("idle");
  }, []);
  const operatorAuthorizationLockRef = useRef<string | null>(null);
  const splitFollowupLaunchRef = useRef<string | null>(null);
  const transitionTransaction = useVantaSafeSendTransaction();
  const transitionWait = useRealtimeSignatureProgress(
    transitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !transitionTransaction.signature,
    },
  );
  const spentMarkerTransaction = useVantaSafeSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );
  const splitTransitionTransaction = useVantaSafeSendTransaction();
  const splitTransitionWait = useRealtimeSignatureProgress(
    splitTransitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !splitTransitionTransaction.signature,
    },
  );
  const splitSpentMarkerTransaction = useVantaSafeSendTransaction();
  const splitSpentMarkerWait = useRealtimeSignatureProgress(
    splitSpentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !splitSpentMarkerTransaction.signature,
    },
  );

  const spendableShieldNotesByLane = useMemo(
    () =>
      ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.reduce(
        (nextNotesByLane, assetKey) => {
          nextNotesByLane[assetKey] = (
            shieldRegistry.byAssetKey[assetKey].account?.spendableShieldNotes ?? []
          ).filter(isCanonicalTokenSpendableNote);
          return nextNotesByLane;
        },
        {} as Record<LiveShieldTokenAssetKey, SpendableTokenNote[]>,
      ),
    [shieldRegistry.byAssetKey],
  );
  const canonicalSpendableShieldNotesByLane = spendableShieldNotesByLane;
  const shieldedSolSourceEntry =
    shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
    shieldRegistry.entries.find(
      (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
    ) ??
    shieldRegistry.entries.find((entry) =>
      (entry.account?.shieldedSolNotes ?? []).some(isPendingLocalSolShieldStateNote),
    ) ??
    null;
  const canonicalSolAccount =
    (canonicalShieldState.account?.shieldedSolBalance ?? 0) > 0 ||
    (canonicalShieldState.account?.spendableShieldedSolNotes.length ?? 0) > 0 ||
    (canonicalShieldState.account?.shieldedSolNotes ?? []).some(isPendingLocalSolShieldStateNote)
      ? canonicalShieldState.account
      : null;
  const solShieldAccount =
    shieldedSolSourceEntry?.account ?? canonicalSolAccount ?? usdcShieldEntry.account;
  const visibleSolNotes = useMemo(
    () =>
      (solShieldAccount?.shieldedSolNotes ?? []).filter(
        isVisibleSolShieldStateNote,
      ),
    [solShieldAccount],
  );
  const spendableSolNotes = useMemo(
    () =>
      (solShieldAccount?.spendableShieldedSolNotes ?? []).filter(
        isCanonicalSolSpendableNote,
      ),
    [solShieldAccount],
  );
  const pendingSolNotes = useMemo(
    () => visibleSolNotes.filter(isPendingLocalSolShieldStateNote),
    [visibleSolNotes],
  );
  const solShieldStateError =
    spendableSolNotes.length > 0 || pendingSolNotes.length > 0
      ? null
      : canonicalShieldState.error;

  useEffect(() => {
    const availableLanes = [
      ...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.map((assetKey) =>
        canonicalSpendableShieldNotesByLane[assetKey].length > 0 ? assetKey : null,
      ),
      spendableSolNotes.length > 0 || pendingSolNotes.length > 0 ? "SOL" : null,
    ].filter(Boolean) as UnshieldLane[];

    if (availableLanes.length === 0) {
      return;
    }

    if (!availableLanes.includes(selectedLane)) {
      setSelectedLane(availableLanes[0]);
    }
  }, [
    canonicalSpendableShieldNotesByLane,
    pendingSolNotes.length,
    selectedLane,
    spendableSolNotes.length,
  ]);
  const selectedSolNote = useMemo(
    () => chooseSelectedSpendableNote(spendableSolNotes, selectedUnshieldNoteId),
    [selectedUnshieldNoteId, spendableSolNotes],
  );

  const selectedShieldAsset = selectedLane === "SOL" ? null : getLiveShieldTokenAsset(selectedLane);
  const selectedShieldEntry = selectedLane === "SOL" ? null : shieldRegistry.byAssetKey[selectedLane];
  const selectedShieldAccount = selectedShieldEntry?.account ?? null;
  const selectedShieldNote =
    selectedLane === "SOL"
      ? null
      : chooseSelectedSpendableNote(
          canonicalSpendableShieldNotesByLane[selectedLane],
          selectedUnshieldNoteId,
        );
  const currentSpendableUnshieldNotes =
    selectedLane === "SOL"
      ? spendableSolNotes
      : canonicalSpendableShieldNotesByLane[selectedLane];
  const selectedUnshieldNote =
    selectedLane === "SOL" ? selectedSolNote : selectedShieldNote;
  const unshieldNotePickerOptions = useMemo<NotePickerOption[]>(
    () =>
      currentSpendableUnshieldNotes.map((note) => ({
        id: note.noteId,
        metaLabel: "Ledger-spendable exit note",
        primaryLabel: formatUnshieldAmount(note.amount, selectedLane),
        secondaryLabel: abbreviate(note.noteId),
      })),
    [currentSpendableUnshieldNotes, selectedLane],
  );
  useEffect(() => {
    if (!selectedUnshieldNoteId) {
      return;
    }

    if (!currentSpendableUnshieldNotes.some((note) => note.noteId === selectedUnshieldNoteId)) {
      setSelectedUnshieldNoteId(null);
    }
  }, [currentSpendableUnshieldNotes, selectedUnshieldNoteId]);
  useEffect(() => {
    if (selectedUnshieldNoteId) {
      return;
    }

    setRequestedAmountInput("");
  }, [selectedLane, selectedShieldNote, selectedSolNote, selectedUnshieldNoteId]);
  const selectedSolAggregateAmount = sumSpendableAmounts(spendableSolNotes, 9);
  const selectedSolPendingAmount = sumSpendableAmounts(pendingSolNotes, 9);
  const selectedFullAmount =
    selectedLane === "SOL" ? selectedSolNote?.amount ?? 0 : selectedShieldNote?.amount ?? 0;
  const selectedDisplayAmount = selectedFullAmount;
  useEffect(() => {
    if (selectedLane !== "SOL" || !liveSwapPair.solUnshieldOperatorUrl) {
      setSolUnshieldOperatorHealth("idle");
      setSolUnshieldOperatorHealthError(null);
      return;
    }

    let cancelled = false;
    setSolUnshieldOperatorHealth("checking");
    setSolUnshieldOperatorHealthError(null);

    void fetchSolUnshieldOperatorHealth()
      .then(() => {
        if (!cancelled) {
          setSolUnshieldOperatorHealth("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSolUnshieldOperatorHealth("blocked");
          setSolUnshieldOperatorHealthError(
            error instanceof Error
              ? error.message
              : "The SOL unshield operator is not reachable.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLane]);
  const availableLaneOptions = useMemo(
    () =>
      ([
        ...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
        "SOL",
      ] as UnshieldLane[]).map((lane) => {
        const amount =
          lane === "SOL"
            ? selectedSolAggregateAmount
            : sumSpendableAmounts(canonicalSpendableShieldNotesByLane[lane], 6);

        return {
          amount,
          hasSpendableBalance:
            lane === "SOL"
              ? spendableSolNotes.length > 0
              : canonicalSpendableShieldNotesByLane[lane].length > 0,
          lane,
          pendingAmount: lane === "SOL" ? selectedSolPendingAmount : 0,
        };
      }),
    [
      canonicalSpendableShieldNotesByLane,
      selectedSolAggregateAmount,
      selectedSolPendingAmount,
      spendableSolNotes.length,
    ],
  );
  const selectedLaneDecimals =
    selectedLane === "SOL" ? 9 : getLiveShieldTokenAsset(selectedLane).decimals;
  const handleSelectUnshieldNote = useCallback(
    (nextNoteId: string | null) => {
      if (!nextNoteId) {
        setSelectedUnshieldNoteId(null);
        return;
      }

      const nextNote = currentSpendableUnshieldNotes.find(
        (note) => note.noteId === nextNoteId,
      );

      if (!nextNote) {
        setSelectedUnshieldNoteId(null);
        return;
      }

      setSelectedUnshieldNoteId(nextNote.noteId);

      if (selectedLane === "USDC") {
        setRequestedAmountInput(formatEditableAmount(nextNote.amount, selectedLaneDecimals));
      }

      setStatus("idle");
      setFlowError(null);
    },
    [currentSpendableUnshieldNotes, selectedLane, selectedLaneDecimals],
  );
  const requestedAmountNumeric =
    selectedLane === "USDC"
      ? parseEditableAmount(requestedAmountInput)
      : selectedFullAmount;
  const selectedAmount =
    requestedAmountNumeric !== null ? requestedAmountNumeric : 0;
  const requiresExactSplit =
    selectedLane === "USDC" &&
    selectedShieldNote !== null &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric > 0 &&
    requestedAmountNumeric < selectedShieldNote.amount &&
    !amountsRoughlyMatch(requestedAmountNumeric, selectedShieldNote.amount);
  const canUseLane =
    selectedLane === "SOL" ? Boolean(selectedSolNote) : Boolean(selectedShieldNote);
  const transitionProgressLabel = transitionWait.detailLabel;
  const finalizationProgressLabel = spentMarkerWait.detailLabel;
  const unshieldZkDiagnostics = listCanonicalUnshieldDiagnosticsSummaries().slice(0, 5);
  const currentUnshieldZkDiagnostics =
    (lastTransitionSignature
      ? unshieldZkDiagnostics.find((record) => record.transitionSignature === lastTransitionSignature)
      : null) ??
    unshieldZkDiagnostics[0] ??
    null;
  const latestPrivateCoreOperatorConsume =
    privateCoreOperatorLatestConsume ?? privateCoreOperatorConsumes[0] ?? null;
  const latestPrivateCoreOperatorRelease =
    privateCoreOperatorLatestRelease ?? privateCoreOperatorReleases[0] ?? null;
  const currentUnshieldTransactionEvidence = useMemo(
    () =>
      createUnshieldTransactionEvidence({
        latestProof: privateCoreOperatorLatestReleaseProof ?? privateCoreOperatorLatestProof,
        latestRelease: latestPrivateCoreOperatorRelease,
        transitionSignature: lastTransitionSignature,
      }),
    [
      lastTransitionSignature,
      latestPrivateCoreOperatorRelease,
      privateCoreOperatorLatestProof,
      privateCoreOperatorLatestReleaseProof,
    ],
  );
  const showPrivateReleaseCard = false;
  const copyReleasePackageExport = useCallback(
    async (mode: "summary" | "json") => {
      if (!privateCoreReleasePackageState) {
        setReleasePackageExportStatus("failed");
        return;
      }

      try {
        await navigator.clipboard.writeText(
          mode === "json"
            ? privateCoreReleasePackageState.exportJson
            : privateCoreReleasePackageState.exportText,
        );
        setReleasePackageExportStatus(mode === "json" ? "json-copy" : "summary-copy");
      } catch {
        setReleasePackageExportStatus("failed");
      }
    },
    [privateCoreReleasePackageState],
  );
  const downloadReleasePackageExport = useCallback(
    (mode: "summary" | "json") => {
      if (!privateCoreReleasePackageState) {
        setReleasePackageExportStatus("failed");
        return;
      }

      const blob = new Blob(
        [
          mode === "json"
            ? privateCoreReleasePackageState.exportJson
            : privateCoreReleasePackageState.exportText,
        ],
        {
          type: mode === "json" ? "application/json" : "text/plain;charset=utf-8",
        },
      );
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        mode === "json"
          ? privateCoreReleasePackageState.downloadJsonFilename
          : privateCoreReleasePackageState.downloadSummaryFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setReleasePackageExportStatus(mode === "json" ? "json-download" : "summary-download");
    },
    [privateCoreReleasePackageState],
  );
  const privateCoreSendCompleted = Boolean(
    privateCoreSendState || privateCoreOperatorLatestSend || privateCoreOperatorLatestSendProof,
  );
  const privateCoreDemoSteps = [
    {
      label: "Shield private value",
      status: privateCoreRecentShield ? "done" : "pending",
      summary: privateCoreRecentShield ? "Private note created" : "Shield first",
    },
    {
      label: "Hold confirmed",
      status: privateCoreHoldState?.privateNoteRecovered ? "done" : "pending",
      summary: privateCoreHoldState?.privateNoteRecovered
        ? "Note recovered with witness"
        : "Awaiting recovered note",
    },
    {
      label: "Send from shielded state",
      status: privateCoreSendCompleted ? "done" : "pending",
      summary: privateCoreSendCompleted
        ? privateCoreSendState?.residualStateStatus ?? "Private send verified and applied"
        : "Awaiting first private send",
    },
    {
      label: "Unshield once",
      status: privateCoreUnshieldState?.consumeSucceeded ? "done" : "pending",
      summary: privateCoreUnshieldState?.consumeSucceeded
        ? "Operator-authorized consume succeeded"
        : privateCoreSendCompleted
          ? "Awaiting first consume"
          : "Available after private send",
    },
    {
      label: "Replay rejected",
      status: privateCoreUnshieldState?.replayRejected ? "done" : "pending",
      summary: privateCoreUnshieldState?.replayRejected
        ? "Nullifier reuse blocked"
        : privateCoreUnshieldState?.consumeSucceeded
          ? "Ready to demonstrate"
          : "Available after first consume",
    },
  ] as const;
  const hasValidRequestedAmount =
    selectedLane === "USDC"
      ? requestedAmountNumeric !== null &&
        requestedAmountNumeric > 0 &&
        requestedAmountNumeric <= selectedFullAmount + 0.000001
      : selectedFullAmount > 0;
  const exitConsequenceAmount =
    selectedLane === "USDC"
      ? hasValidRequestedAmount && !requiresExactSplit
        ? requestedAmountNumeric
        : null
      : selectedFullAmount > 0
        ? selectedFullAmount
        : null;
  const exitConsequenceDisplay =
    exitConsequenceAmount !== null
      ? formatUnshieldAmount(exitConsequenceAmount, selectedLane)
      : requiresExactSplit
        ? "Shield exact USDC amount first"
        : `Enter ${selectedLane} amount`;
  const exitConsequenceDestination = walletAddressShort ?? "Connect wallet";
  const isReady =
    walletConnected &&
    Boolean(walletAddress) &&
    canUseLane &&
    hasValidRequestedAmount &&
    !requiresExactSplit &&
    Boolean(usdcShieldEntry.asset.vaultOwner) &&
    (selectedLane === "SOL"
      ? Boolean(liveSwapPair.solUnshieldOperatorUrl) && solUnshieldOperatorHealth === "ready"
      : Boolean(selectedShieldAsset?.mintAddress) && Boolean(selectedShieldAsset?.unshieldConfigured));

  useEffect(() => {
    if (transitionTransaction.status === "loading") {
      if (pendingTransitionApproval) {
        setStatus("recording_transition");
      }
      return;
    }

    if (transitionTransaction.status === "error") {
      setStatus("failed");
    setFlowError(
      transitionTransaction.error instanceof Error
        ? transitionTransaction.error.message
        : "The unshield transition could not be submitted.",
    );
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    }
  }, [pendingTransitionApproval, transitionTransaction.error, transitionTransaction.status]);

  useEffect(() => {
    if (transitionWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      transitionWait.waitError instanceof Error
        ? transitionWait.waitError.message
        : "The unshield transition was submitted but not confirmed.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingSpentMarker(null);
    setPendingUnshieldBridge(null);
  }, [transitionWait.waitError, transitionWait.waitStatus]);

  useEffect(() => {
    if (splitTransitionTransaction.status === "loading") {
      setStatus("splitting_note");
      return;
    }

    if (splitTransitionTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        splitTransitionTransaction.error instanceof Error
          ? splitTransitionTransaction.error.message
          : "The hidden split transition could not be submitted.",
      );
      setPendingSplitMarker(null);
      setPendingSplitFollowup(null);
      splitFollowupLaunchRef.current = null;
    }
  }, [splitTransitionTransaction.error, splitTransitionTransaction.status]);

  useEffect(() => {
    if (splitTransitionWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitTransitionWait.waitError instanceof Error
        ? splitTransitionWait.waitError.message
        : "The hidden split transition was submitted but not confirmed.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitTransitionWait.waitError, splitTransitionWait.waitStatus]);

  useEffect(() => {
    if (
      splitTransitionWait.waitStatus !== "success" ||
      !pendingSplitMarker ||
      splitSpentMarkerTransaction.status === "loading" ||
      splitSpentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_split");
    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        pendingSplitMarker.consumedNoteId,
        pendingSplitMarker.mintAddress,
        pendingSplitMarker.owner,
        pendingSplitMarker.transitionNoteId,
        pendingSplitMarker.vaultOwner,
        pendingSplitMarker.recipientValue,
      ],
      action: "state_finalize",
    })
      .then((priorityFeeInstructions) => {
        const instructions = [
          ...priorityFeeInstructions,
          createSpentMarkerInstruction({
            asset: "USDC",
            consumedNoteId: pendingSplitMarker.consumedNoteId,
            createdAt: pendingSplitMarker.createdAt,
            mintAddress: pendingSplitMarker.mintAddress,
            owner: pendingSplitMarker.owner,
            transitionKind: "send",
            transitionNoteId: pendingSplitMarker.transitionNoteId,
            vaultOwner: pendingSplitMarker.vaultOwner,
          }, { viewingPublicKey: viewingKey?.publicKey }),
        ];

        return splitSpentMarkerTransaction.preflight({
          amount: pendingSplitMarker.amount,
          asset: "USDC",
          cluster: vantaSolanaCluster,
          explicitMainnetApproval: vantaExplicitMainnetApproval,
          connectedWalletAddress: pendingSplitMarker.owner,
          estimatedFees: "wallet-estimated",
          feePayer: pendingSplitMarker.owner,
          humanApprovedSummary: true,
          instructions,
          label: "unshield-split-spent-marker",
          recipient: pendingSplitMarker.vaultOwner,
          summaryInstructions: ["unshield-split-spent-marker"],
          transactionFingerprint: `unshield-split-spent-marker:${pendingSplitMarker.owner}:${pendingSplitMarker.consumedNoteId}:${pendingSplitMarker.transitionNoteId}`,
        });
      })
      .then((splitFinalizationApproval) => {
        if (splitFinalizationApproval.status === "blocked") {
          throw new Error(
            `The hidden split spent marker is blocked before wallet approval: ${splitFinalizationApproval.reason}.`,
          );
        }

        setPendingSplitFinalizationApproval(splitFinalizationApproval);
        setStatus("split_finalization_ready");
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The hidden split spent marker could not be submitted.",
        );
        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
      });
  }, [
    pendingSplitMarker,
    splitSpentMarkerTransaction,
    splitSpentMarkerTransaction.signature,
    splitSpentMarkerTransaction.status,
    splitTransitionWait.waitStatus,
    viewingKey?.publicKey,
  ]);

  useEffect(() => {
    if (splitSpentMarkerTransaction.status !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitSpentMarkerTransaction.error instanceof Error
        ? splitSpentMarkerTransaction.error.message
        : "The hidden split spent marker could not be submitted.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitSpentMarkerTransaction.error, splitSpentMarkerTransaction.status]);

  const finalizePendingSplitState = useCallback(async () => {
    if (
      !pendingSplitFinalizationApproval ||
      splitSpentMarkerTransaction.status === "loading" ||
      splitSpentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_split");

    try {
      await splitSpentMarkerTransaction.sendPrepared(pendingSplitFinalizationApproval);
      setPendingSplitFinalizationApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The hidden split spent marker could not be approved in the wallet.",
      );
      setPendingSplitMarker(null);
      setPendingSplitFinalizationApproval(null);
      setPendingSplitFollowup(null);
      splitFollowupLaunchRef.current = null;
    }
  }, [
    pendingSplitFinalizationApproval,
    splitSpentMarkerTransaction,
    splitSpentMarkerTransaction.signature,
    splitSpentMarkerTransaction.status,
  ]);

  useEffect(() => {
    if (splitSpentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitSpentMarkerWait.waitError instanceof Error
        ? splitSpentMarkerWait.waitError.message
        : "The hidden split spent marker was submitted but not confirmed.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitSpentMarkerWait.waitError, splitSpentMarkerWait.waitStatus]);

  useEffect(() => {
    if (
      splitSpentMarkerWait.waitStatus !== "success" ||
      !pendingSplitFollowup ||
      splitFollowupLaunchRef.current === pendingSplitFollowup.childNoteId ||
      !selectedShieldAsset?.mintAddress ||
      !selectedShieldAccount
    ) {
      return;
    }

    splitFollowupLaunchRef.current = pendingSplitFollowup.childNoteId;
    setStatus("review");

    const refreshTasks = shieldRegistry.configuredEntries.flatMap((entry) => [
      entry.refresh(),
      entry.token.refresh(),
    ]);

    void Promise.all(refreshTasks)
      .then(async () => {
        const splitMintAddress = selectedShieldAsset.mintAddress;

        if (!splitMintAddress) {
          throw new Error("The USDC shield mint is unavailable for the exact unshield split.");
        }

        const refreshedAccount = await fetchVantaShieldAccountState({
          client,
          mintAddress: splitMintAddress,
          owner: selectedShieldAccount.owner,
          vaultOwner: selectedShieldAccount.vaultOwner,
          viewingSecretKey: viewingKey?.secretKey,
        });
        const exactChildNote = refreshedAccount.spendableShieldNotes.find(
          (note) => note.noteId === pendingSplitFollowup.childNoteId,
        );

        if (!exactChildNote) {
          throw new Error(
            "Vanta split the protected balance, but the exact child amount could not be recovered for return.",
          );
        }

        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
        await beginTokenUnshieldFromNote({
          note: exactChildNote,
          shieldAccount: refreshedAccount,
          shieldAsset: selectedShieldAsset,
        });
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The hidden split completed, but Vanta could not recover the exact child note.",
        );
        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
      });
  }, [
    beginTokenUnshieldFromNote,
    client,
    pendingSplitFollowup,
    selectedShieldAccount,
    selectedShieldAsset,
    shieldRegistry.configuredEntries,
    splitSpentMarkerWait.waitStatus,
    viewingKey?.secretKey,
  ]);

  const operatorReleaseDisabledReason = useMemo(() => {
    if (!pendingSpentMarker) {
      return "Prepare an Unshield note before releasing through the operator.";
    }

    if (!walletAddress) {
      return "Connect the shield owner wallet before releasing through the operator.";
    }

    if (walletAddress !== pendingSpentMarker.owner) {
      return "Reconnect the wallet that owns this shielded note before releasing through the operator.";
    }

    if (operatorAuthorizationStarted) {
      return "The operator release request is already in progress.";
    }

    if (operatorAuthorizationLockRef.current === pendingSpentMarker.transitionNoteId) {
      return "The operator release request is already locked for this note.";
    }

    if (
      pendingSpentMarker.asset !== "SOL" &&
      !getLiveShieldTokenAsset(pendingSpentMarker.asset).unshieldOperatorUrl
    ) {
      return `Configure the ${pendingSpentMarker.asset} unshield operator endpoint before release.`;
    }

    if (pendingSpentMarker.asset === "SOL" && !liveSwapPair.solUnshieldOperatorUrl) {
      return "Configure the SOL unshield operator endpoint before release.";
    }

    return null;
  }, [
    liveSwapPair.solUnshieldOperatorUrl,
    operatorAuthorizationStarted,
    pendingSpentMarker,
    walletAddress,
  ]);

  const authorizePendingOperatorRelease = useCallback(async () => {
    if (operatorReleaseDisabledReason || !pendingSpentMarker || !walletAddress) {
      setFlowError(operatorReleaseDisabledReason ?? "Prepare an Unshield note before releasing through the operator.");
      return;
    }

    operatorAuthorizationLockRef.current = pendingSpentMarker.transitionNoteId;
    setOperatorAuthorizationStarted(true);
    setStatus("authorizing_operator");

    try {
      const releaseResult =
        pendingSpentMarker.asset !== "SOL"
          ? await (async () => {
              const signMessage = walletSession?.signMessage;

              if (!signMessage) {
                throw new Error("The connected wallet must support message signing.");
              }

              const tokenAsset = pendingSpentMarker.asset as LiveShieldTokenAssetKey;
              const shieldAsset = getLiveShieldTokenAsset(tokenAsset);
              const payload = createUnshieldIntentPayload({
                amount: pendingSpentMarker.amount,
                destinationOwner: pendingSpentMarker.owner,
                mintAddress: shieldAsset.mintAddress ?? "",
                noteId: pendingSpentMarker.consumedNoteId,
                owner: pendingSpentMarker.owner,
                requester: pendingSpentMarker.owner,
                transitionNoteId: pendingSpentMarker.transitionNoteId,
                vaultOwner: pendingSpentMarker.vaultOwner,
              });

              const signedIntent = await signUnshieldIntent(payload, async (message) => {
                const messageIntentSignature = await signWalletMessageIntentWithSafety({
                  amount: payload.amount,
                  asset: tokenAsset,
                  connectedWalletAddress: walletAddress,
                  expiresAt: payload.issuedAt + VANTA_UNSHIELD_INTENT_TTL_MS,
                  humanApprovedSummary: true,
                  intentKind: "unshield-intent",
                  issuedAt: payload.issuedAt,
                  message,
                  owner: payload.owner,
                  recipient: payload.destinationOwner,
                  requestId: payload.requestId,
                  requester: payload.requester,
                  signMessage,
                });

                if (
                  !messageIntentSignature.signed ||
                  !messageIntentSignature.signatureBytes ||
                  messageIntentSignature.decision.reason !== "message-intent-ready-for-wallet-approval"
                ) {
                  throw new Error(
                    `The token unshield intent could not be signed: ${messageIntentSignature.decision.reason}.`,
                  );
                }

                return messageIntentSignature.signatureBytes;
              });

              return requestOperatorUnshield(signedIntent, shieldAsset.unshieldOperatorUrl);
            })()
          : await (async () => {
              const signMessage = walletSession?.signMessage;

              if (!signMessage) {
                throw new Error("The connected wallet must support message signing.");
              }

              const payload = createSolUnshieldIntentPayload({
                amount: pendingSpentMarker.amount,
                asset: "SOL",
                assetId: liveSwapPair.solAssetId,
                consumedNoteId: pendingSpentMarker.consumedNoteId,
                destinationOwner: pendingSpentMarker.owner,
                owner: pendingSpentMarker.owner,
                requester: pendingSpentMarker.owner,
                transitionNoteId: pendingSpentMarker.transitionNoteId,
                vaultOwner: pendingSpentMarker.vaultOwner,
              });

              const signedIntent = await signSolUnshieldIntent(payload, async (message) => {
                const messageIntentSignature = await signWalletMessageIntentWithSafety({
                  amount: payload.amount,
                  asset: payload.asset,
                  connectedWalletAddress: walletAddress,
                  expiresAt: payload.issuedAt + VANTA_SOL_UNSHIELD_INTENT_TTL_MS,
                  humanApprovedSummary: true,
                  intentKind: "sol-unshield-intent",
                  issuedAt: payload.issuedAt,
                  message,
                  owner: payload.owner,
                  recipient: payload.destinationOwner,
                  requestId: payload.requestId,
                  requester: payload.requester,
                  signMessage,
                });

                if (
                  !messageIntentSignature.signed ||
                  !messageIntentSignature.signatureBytes ||
                  messageIntentSignature.decision.reason !== "message-intent-ready-for-wallet-approval"
                ) {
                  throw new Error(
                    `The SOL unshield intent could not be signed: ${messageIntentSignature.decision.reason}.`,
                  );
                }

                return messageIntentSignature.signatureBytes;
              });

              return requestOperatorSolUnshield(signedIntent);
            })();

      setOperatorReleaseSignature(releaseResult.signature);
      setLastCompletion((current) =>
        current ? { ...current, requestId: releaseResult.requestId } : current,
      );
      setStatus("complete");
      setFlowError(null);
      setUnshieldBridgeError(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
      void Promise.all(shieldRegistry.configuredEntries.flatMap((entry) => [
        entry.refresh(),
        entry.token.refresh(),
      ]));
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : `The ${pendingSpentMarker.asset} unshield operator could not process the request.`,
      );
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    } finally {
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
    }
  }, [
    operatorReleaseDisabledReason,
    liveSwapPair.solAssetId,
    pendingSpentMarker,
    shieldRegistry.configuredEntries,
    walletAddress,
    walletSession?.signMessage,
  ]);

  const approvePreparedUnshieldTransition = useCallback(async () => {
    if (!pendingTransitionApproval || transitionTransaction.status === "loading") {
      return;
    }

    setStatus("recording_transition");

    try {
      await transitionTransaction.sendPrepared(pendingTransitionApproval);
      setPendingTransitionApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The unshield transition could not be approved in the wallet.",
      );
      setPendingTransitionApproval(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    }
  }, [pendingTransitionApproval, transitionTransaction]);

  const finalizePendingUnshieldState = useCallback(async () => {
    if (
      !pendingFinalizationApproval ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_state");

    try {
      await spentMarkerTransaction.sendPrepared(pendingFinalizationApproval);
      setPendingFinalizationApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The spent marker could not be submitted.",
      );
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
      setPendingUnshieldBridge(null);
    }
  }, [
    pendingFinalizationApproval,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
  ]);

  useEffect(() => {
    if (
      transitionWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      operatorAuthorizationStarted ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature ||
      status === "operator_ready" ||
      status === "authorizing_operator" ||
      status === "release_ready" ||
      status === "finalizing_state" ||
      status === "complete" ||
      status === "failed"
    ) {
      return;
    }

    setStatus("operator_ready");
  }, [
    operatorAuthorizationStarted,
    pendingSpentMarker,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
    status,
    transitionWait.waitStatus,
  ]);

  useEffect(() => {
    if (spentMarkerTransaction.status !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerTransaction.error instanceof Error
        ? spentMarkerTransaction.error.message
        : "The spent marker could not be submitted.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingUnshieldBridge(null);
  }, [spentMarkerTransaction.error, spentMarkerTransaction.status]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerWait.waitError instanceof Error
        ? spentMarkerWait.waitError.message
        : "The spent marker was submitted but not confirmed.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingUnshieldBridge(null);
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "success") {
      return;
    }

    const refreshTasks = shieldRegistry.configuredEntries.flatMap((entry) => [
      entry.refresh(),
      entry.token.refresh(),
    ]);

    void Promise.all(refreshTasks)
      .then(async () => {
        if (pendingUnshieldBridge && transitionTransaction.signature) {
          try {
            await recordCanonicalUnshieldFromLiveUnshield({
              amountDisplay: pendingUnshieldBridge.amountDisplay,
              asset: pendingUnshieldBridge.asset,
              assetId: pendingUnshieldBridge.assetId,
              createdAt: pendingUnshieldBridge.createdAt,
              destinationOwner: pendingUnshieldBridge.destinationOwner,
              mintAddress: pendingUnshieldBridge.mintAddress,
              owner: pendingUnshieldBridge.owner,
              consumed: pendingUnshieldBridge.consumed,
              operator: {
                releaseSignature: operatorReleaseSignature ?? undefined,
                requestId: lastCompletion?.requestId,
              },
              transition: {
                noteId: pendingUnshieldBridge.transition.noteId,
                signature: transitionTransaction.signature,
                spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
              },
              vaultOwner: pendingUnshieldBridge.vaultOwner,
            });
            setUnshieldBridgeError(null);
          } catch (error) {
            setUnshieldBridgeError(
              error instanceof Error
                ? error.message
                : "Unshield completed, but canonical exit diagnostics could not be retained.",
            );
          }
        } else {
          setUnshieldBridgeError(
            "Unshield completed, but the canonical exit bridge context was unavailable for retention.",
          );
        }

        setStatus("complete");
        setFlowError(null);
        setOperatorAuthorizationStarted(false);
        operatorAuthorizationLockRef.current = null;
        setPendingSpentMarker(null);
        setPendingUnshieldBridge(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Unshield completed, but wallet or Vanta state could not be refreshed.",
        );
        setOperatorAuthorizationStarted(false);
        operatorAuthorizationLockRef.current = null;
        setPendingUnshieldBridge(null);
      });
  }, [
    lastCompletion?.requestId,
    operatorReleaseSignature,
    pendingUnshieldBridge,
    shieldRegistry.configuredEntries,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    transitionTransaction.signature,
  ]);

  useEffect(() => {
    if (transitionTransaction.signature) {
      setLastTransitionSignature(transitionTransaction.signature);
    }
  }, [transitionTransaction.signature]);

  useEffect(() => {
    if (spentMarkerTransaction.signature) {
      setLastSpentMarkerSignature(spentMarkerTransaction.signature);
    }
  }, [spentMarkerTransaction.signature]);

  function resetDirectUnshieldFlow() {
    transitionTransaction.reset();
    spentMarkerTransaction.reset();
    setOperatorReleaseSignature(null);
    setLastTransitionSignature(null);
    setLastSpentMarkerSignature(null);
    setFlowError(null);
    setUnshieldBridgeError(null);
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingTransitionApproval(null);
    setPendingFinalizationApproval(null);
    setPendingSpentMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingUnshieldBridge(null);
    setPendingUmbraApprovalDisplay(null);
  }

  async function beginTokenUnshieldFromNote(args: {
    note: NonNullable<typeof selectedShieldNote>;
    shieldAccount: NonNullable<typeof selectedShieldAccount>;
    shieldAsset: NonNullable<typeof selectedShieldAsset>;
  }) {
    assertCanonicalTokenSpendableNote(args.note);

    const mintAddress = args.shieldAsset.mintAddress;

    if (!mintAddress) {
      throw new Error("The selected shield asset is missing its mint address.");
    }

    resetDirectUnshieldFlow();

    const createdAt = Date.now();
    const destinationOwner = walletAddress ?? args.shieldAccount.owner;
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraUnshieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(
          formatEditableAmount(args.note.amount, args.shieldAsset.decimals),
          args.shieldAsset.decimals,
        ),
        destinationAddress: destinationOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress,
        requester: walletAddress ?? args.shieldAccount.owner,
      }),
    );
    setStatus("awaiting_confirmation");
    const directTransitionNoteId = `direct:${args.note.noteId}`;

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: args.shieldAsset.assetKey,
      assetId: mintAddress,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "unshield",
      transitionNoteId: directTransitionNoteId,
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setPendingUnshieldBridge({
      amountDisplay: formatEditableAmount(
        args.note.amount,
        args.shieldAsset.decimals,
      ),
      asset: args.shieldAsset.assetKey,
      assetId: mintAddress,
      createdAt,
      destinationOwner,
      mintAddress,
      owner: args.shieldAccount.owner,
      consumed: {
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      transition: {
        noteId: directTransitionNoteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: args.shieldAsset.assetKey,
      transitionNoteId: directTransitionNoteId,
    });
    setStatus("operator_ready");
  }

  async function beginSolUnshieldFromNote(args: {
    note: NonNullable<typeof selectedSolNote>;
    shieldAccount: NonNullable<typeof usdcShieldEntry.account>;
  }) {
    assertCanonicalSolSpendableNote(args.note);

    resetDirectUnshieldFlow();

    const createdAt = Date.now();
    const destinationOwner = walletAddress ?? args.shieldAccount.owner;
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraUnshieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(formatEditableAmount(args.note.amount, 9), 9),
        destinationAddress: destinationOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: liveSwapPair.solAssetId,
        requester: walletAddress ?? args.shieldAccount.owner,
      }),
    );
    setStatus("awaiting_confirmation");
    const directTransitionNoteId = `direct:${args.note.noteId}`;

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "sol_unshield",
      transitionNoteId: directTransitionNoteId,
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setPendingUnshieldBridge({
      amountDisplay: formatEditableAmount(args.note.amount, 9),
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      createdAt,
      destinationOwner,
      owner: args.shieldAccount.owner,
      consumed: {
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
        sourceSwapNoteId: args.note.sourceSwapNoteId,
      },
      transition: {
        noteId: directTransitionNoteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: "SOL",
      transitionNoteId: directTransitionNoteId,
    });
    setStatus("operator_ready");
  }

  async function handleUnshield() {
    if (isBetaMode) {
      return;
    }

    const activeShieldAccount = selectedLane === "SOL" ? solShieldAccount : selectedShieldAccount;

    if (!activeShieldAccount || !usdcShieldEntry.asset.vaultOwner) {
      return;
    }

    splitTransitionTransaction.reset();
    splitSpentMarkerTransaction.reset();
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;

    try {
      if (selectedLane !== "SOL") {
        if (!selectedShieldNote || !selectedShieldAsset?.mintAddress) {
          return;
        }

        assertCanonicalTokenSpendableNote(selectedShieldNote);

        if (
          selectedLane === "USDC" &&
          requestedAmountNumeric !== null &&
          requestedAmountNumeric > 0 &&
          requestedAmountNumeric < selectedShieldNote.amount &&
          !amountsRoughlyMatch(requestedAmountNumeric, selectedShieldNote.amount)
        ) {
          splitTransitionTransaction.reset();
          splitSpentMarkerTransaction.reset();
          setPendingSplitFinalizationApproval(null);
          setPendingSplitFollowup(null);
          splitFollowupLaunchRef.current = null;
          setFlowError(null);
          setUnshieldBridgeError(null);

          const createdAt = Date.now();
          const approvalIssuedAt = Date.now();
          setPendingUmbraApprovalDisplay(
            createUmbraUnshieldActionApprovalReview({
              amountBaseUnits: parseDecimalAmountToBaseUnits(
                formatEditableAmount(requestedAmountNumeric, selectedShieldAsset.decimals),
                selectedShieldAsset.decimals,
              ),
              destinationAddress: walletAddress ?? activeShieldAccount.owner,
              expiresAt: approvalIssuedAt + 2 * 60 * 1000,
              issuedAt: approvalIssuedAt,
              mintAddress: selectedShieldAsset.mintAddress,
              requester: walletAddress ?? activeShieldAccount.owner,
            }),
          );
          setStatus("awaiting_confirmation");
          const nextChangeAmount = Number(
            Math.max(selectedShieldNote.amount - requestedAmountNumeric, 0).toFixed(6),
          );
          if (!viewingKey?.publicKey) {
            throw new Error("Vanta action memo encryption requires your Shield viewing key to be ready.");
          }
          const preparedSplit = createPreparedSendMemo(
            {
              amount: requestedAmountNumeric.toString(),
              asset: "USDC",
              changeAmount: nextChangeAmount.toString(),
              consumedNoteId: selectedShieldNote.noteId,
              createdAt,
              mintAddress: selectedShieldAsset.mintAddress,
              owner: activeShieldAccount.owner,
              recipient: activeShieldAccount.owner,
              vaultOwner: activeShieldAccount.vaultOwner,
            },
            { viewingPublicKey: viewingKey?.publicKey },
          );

          if (!preparedSplit.recipientNoteId) {
            throw new Error("Vanta could not derive the exact split note for this unshield request.");
          }

          setPendingSplitMarker({
            amount: requestedAmountNumeric.toString(),
            amountNumeric: requestedAmountNumeric,
            consumedNoteId: selectedShieldNote.noteId,
            createdAt,
            mintAddress: selectedShieldAsset.mintAddress,
            owner: activeShieldAccount.owner,
            recipientNoteId: preparedSplit.recipientNoteId,
            recipientValue: activeShieldAccount.owner,
            transitionNoteId: preparedSplit.noteId,
            vaultOwner: activeShieldAccount.vaultOwner,
          });
          setPendingSplitFollowup({
            amountNumeric: requestedAmountNumeric,
            childNoteId: preparedSplit.recipientNoteId,
          });
          const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
            accountKeys: [
              selectedShieldNote.noteId,
              selectedShieldAsset.mintAddress,
              activeShieldAccount.owner,
              preparedSplit.noteId,
              activeShieldAccount.vaultOwner,
              activeShieldAccount.owner,
            ],
            action: "send_transition",
          });

          const instructions = [...priorityFeeInstructions, preparedSplit.instruction];

          await splitTransitionTransaction.send({
            amount: requestedAmountNumeric.toString(),
            asset: "USDC",
            cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
            connectedWalletAddress: activeShieldAccount.owner,
            estimatedFees: "wallet-estimated",
            feePayer: activeShieldAccount.owner,
            humanApprovedSummary: true,
            instructions,
            label: "unshield-split-transition",
            recipient: activeShieldAccount.owner,
            summaryInstructions: ["unshield-split-transition"],
            transactionFingerprint: `unshield-split-transition:${activeShieldAccount.owner}:${selectedShieldNote.noteId}:${preparedSplit.noteId}`,
          });
          return;
        }

        await beginTokenUnshieldFromNote({
          note: selectedShieldNote,
          shieldAccount: activeShieldAccount,
          shieldAsset: selectedShieldAsset,
        });
        return;
      }

      if (!selectedSolNote) {
        return;
      }
      assertCanonicalSolSpendableNote(selectedSolNote);
      await beginSolUnshieldFromNote({
        note: selectedSolNote,
        shieldAccount: activeShieldAccount,
      });
    } catch (error) {
      setPendingSplitMarker(null);
      setPendingSplitFinalizationApproval(null);
      setPendingSplitFollowup(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
      setPendingUmbraApprovalDisplay(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Unshield request was not approved.",
      );
    }
  }

  let validationMessage =
    selectedLane === "SOL"
      ? "Return shielded SOL to your public wallet through the constrained operator path."
      : selectedLane === "USDC" && requiresExactSplit
        ? "Vanta will split your protected USDC balance privately, keep the remainder shielded, and return only the requested amount."
        : `Return shielded ${selectedLane} to your public wallet through the constrained operator path.`

  if (!walletConnected) {
    validationMessage = "Connect a wallet so Unshield can release back to your own wallet.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps Unshield visible but prevents live withdrawals while production services are offline.";
  } else if (
    shieldRegistry.configuredEntries.some(
      (entry) => entry.isRefreshing || entry.token.isFetching,
    )
  ) {
    validationMessage = "Refreshing wallet and Vanta state from mainnet.";
  } else if (selectedLane === "SOL" && solShieldStateError) {
    validationMessage = solShieldStateError;
  } else if (selectedLane !== "SOL" && selectedShieldEntry?.error) {
    validationMessage = selectedShieldEntry.error;
  } else if (selectedLane === "SOL" && !selectedSolNote && selectedSolPendingAmount > 0) {
    validationMessage = "SOL pending ledger reconciliation. Please wait before unshielding.";
  } else if (selectedLane === "SOL" && !liveSwapPair.solUnshieldOperatorUrl) {
    validationMessage = "Configure the SOL unshield operator endpoint before shielded SOL can exit.";
  } else if (selectedLane === "SOL" && solUnshieldOperatorHealth === "checking") {
    validationMessage = "Checking the SOL unshield operator endpoint before enabling the exit.";
  } else if (selectedLane === "SOL" && solUnshieldOperatorHealth === "blocked") {
    validationMessage =
      solUnshieldOperatorHealthError ??
      "The SOL unshield operator endpoint is configured but not ready for release.";
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.unshieldOperatorUrl) {
    validationMessage = `Configure the ${selectedLane} unshield operator endpoint before this asset can exit.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.mintAddress) {
    validationMessage = `${selectedLane} is not configured as a live unshield asset yet.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.vaultOwner) {
    validationMessage = `Configure the ${selectedLane} vault owner before this asset can exit.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.unshieldConfigured) {
    validationMessage = `${selectedLane} unshield is not ready for this wallet state yet.`;
  } else if (selectedLane !== "SOL" && !selectedShieldNote) {
    validationMessage = `No ledger-spendable shielded ${selectedLane} note is currently available to return.`;
  } else if (selectedLane === "SOL" && !selectedSolNote) {
    validationMessage = "No ledger-spendable shielded SOL note is currently available to return.";
  } else if (selectedLane === "USDC" && requestedAmountNumeric === null) {
    validationMessage = "Enter a valid USDC amount to unshield.";
  } else if (requiresExactSplit) {
    validationMessage = "For Phantom safety, shield the exact USDC amount first before unshielding.";
  } else if (
    selectedLane === "USDC" &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric <= 0
  ) {
    validationMessage = "Unshield amount must be greater than zero.";
  } else if (
    selectedLane === "USDC" &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric > selectedFullAmount
  ) {
    validationMessage = "Unshield amount cannot exceed the selected ledger-spendable note.";
  }
  const completionEvidenceLabel = operatorReleaseSignature
    ? "Operator release signature returned"
    : currentUnshieldTransactionEvidence.operator.status === "recorded" &&
        currentUnshieldTransactionEvidence.proof.status === "verified"
      ? "Proof-backed release record retained"
      : currentUnshieldTransactionEvidence.wallet.status === "signature-recorded"
        ? "Transition signature captured"
        : "Pending operator release";
  const unshieldReceiptModalDetails = useMemo<UnshieldReceiptModalDetails | null>(() => {
    if (!lastCompletion) {
      return null;
    }

    return {
      amountLabel: formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset),
      evidenceLabel: completionEvidenceLabel,
      exitVisibilityLabel: "public on-chain exit",
      operatorReleaseLabel: operatorReleaseSignature
        ? abbreviate(operatorReleaseSignature)
        : "Pending",
      operatorRequestLabel: lastCompletion.requestId
        ? abbreviate(lastCompletion.requestId)
        : "Pending receipt",
      settlementScopeLabel: currentUnshieldTransactionEvidence.settlement.status,
      solscanUrl: operatorReleaseSignature
        ? getSolscanTransactionUrl(operatorReleaseSignature)
        : undefined,
      transitionNoteLabel: abbreviate(lastCompletion.transitionNoteId),
    };
  }, [
    completionEvidenceLabel,
    currentUnshieldTransactionEvidence.settlement.status,
    lastCompletion,
    operatorReleaseSignature,
  ]);
  useEffect(() => {
    if (status !== "complete") {
      setUnshieldReceiptModalOpen(false);
    }
  }, [status]);
  const selectedUnshieldNoteLabel = selectedUnshieldNote
    ? `${formatUnshieldAmount(selectedUnshieldNote.amount, selectedLane)} note - ${abbreviate(
        selectedUnshieldNote.noteId,
      )}`
    : `No ledger-spendable shielded ${selectedLane} note selected`;
  const unshieldPrimaryActionLabel = isBetaMode
    ? "Beta mode"
    : selectedAmount > 0
      ? `Withdraw ${formatUnshieldAmount(selectedAmount, selectedLane)}`
      : `Withdraw ${selectedLane}`;
  const copyUnshieldReceipt = useCallback(async () => {
    if (!lastCompletion) {
      setUnshieldReceiptCopyStatus("failed");
      return;
    }

    const receiptLines = [
      "Vanta Unshield receipt",
      `Asset: ${lastCompletion.asset}`,
      `Amount: ${formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset)}`,
      `Operator release signature: ${operatorReleaseSignature ?? "pending"}`,
      "Exit visibility: public on-chain exit",
      `Transition note: ${lastCompletion.transitionNoteId}`,
      `Operator request: ${lastCompletion.requestId ?? "pending receipt"}`,
      `Settlement scope: ${currentUnshieldTransactionEvidence.settlement.status}`,
      `Evidence: ${completionEvidenceLabel}`,
      "Verify the public exit transaction before treating funds as moved.",
    ];

    try {
      await navigator.clipboard.writeText(receiptLines.join("\n"));
      setUnshieldReceiptCopyStatus("copied");
    } catch {
      setUnshieldReceiptCopyStatus("failed");
    }
  }, [
    completionEvidenceLabel,
    currentUnshieldTransactionEvidence.settlement.status,
    lastCompletion,
    operatorReleaseSignature,
  ]);

  return (
    <section className="send-page unshield-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Move out</span>
          <h2>Unshield</h2>
          <p className="product-intro__lede">
            Get your shielded assets back to your regular wallet.
          </p>
          <p className="product-intro__meta">
            Beta. Only to the wallet you used to shield them.
          </p>
        </div>

        <div className="module-state">
          <strong>Beta</strong>
          <details className="module-state__details">
            <summary>Moving assets from shielded to unshielded</summary>
            <p>
              {unshieldTrustContract.claimControls.productionPrivacyClaimsLocked
                ? unshieldTrustContract.visibleStatusCopy
                : "Production Unshield privacy claims are unlocked by current evidence."}
              Current Unshield releases only to the connected requester/depositor wallet that signs the exit intent. Fresh-address exits are disabled until the destination is proof-bound.
            </p>
          </details>
        </div>
      </div>

      <LaneFlowIndicator
        ariaLabel="Unshield flow"
        activeStepIndex={2}
        steps={[
          { id: "shield", label: "Shield" },
          { id: "hold", label: "Hold" },
          { id: "unshield", label: `Unshield ${selectedLane}` },
        ]}
      />

      {showPrivateReleaseCard && (
      <article className="send-card" style={{ marginBottom: 24 }}>
        <div className="shield-card__header">
        <div>
          <span>Private release</span>
          <h3>Unshield lane</h3>
        </div>
          <small>
            {privateCoreRecentShield
              ? privateCoreOperatorBoundaryStatusLabel ?? "Ready for consume"
              : "Shield first"}
          </small>
        </div>

        <p className="shield-review-note">
          Recover the held private note, generate the release proof, and move value back to the
          public balance once.
        </p>

        <div className="review-list" style={{ marginBottom: 16 }}>
          {privateCoreDemoSteps.map((step, index) => (
            <div className="review-row" key={step.label}>
              <span>{`${index + 1}. ${step.label}`}</span>
              <strong>
                {step.status === "done" ? `Done · ${step.summary}` : step.summary}
              </strong>
            </div>
          ))}
          <div className="review-row">
            <span>5. Exact release candidate</span>
            <strong>
              {privateCoreReleaseCandidateState
                ? `${privateCoreReleaseCandidateState.lifecycleStatusLabel} · ${privateCoreReleaseCandidateState.lifecyclePrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting exact candidate summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>6. Operator boundary</span>
            <strong>
              {privateCoreOperatorBoundaryStatusLabel
                ? `${privateCoreOperatorBoundaryStatusLabel} · ${privateCoreOperatorBoundaryPrimaryNote ?? "No note"}`
                : "Awaiting operator summary"}
            </strong>
          </div>
          <div className="review-row">
            <span>7. Release workflow</span>
            <strong>
              {privateCoreReleaseWorkflowState
                ? `${privateCoreReleaseWorkflowState.shipStatusLabel} · ${privateCoreReleaseWorkflowState.shipPrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release workflow summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>8. Release handoff</span>
            <strong>
              {privateCoreReleaseHandoffState
                ? `${privateCoreReleaseHandoffState.handoffStatusLabel} · ${privateCoreReleaseHandoffState.handoffPrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release handoff summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>9. Release package</span>
            <strong>
              {privateCoreReleaseHandoffState
                ? `${privateCoreReleaseHandoffState.packageStatusLabel} · ${privateCoreReleaseHandoffState.packagePrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release package summary"
                  : "Available after primary private send"}
            </strong>
          </div>
        </div>

        <VantaPrivateCoreStatePanel
          compact
          holdState={privateCoreHoldState}
          releaseCandidateState={privateCoreReleaseCandidateState}
          releaseHandoffState={privateCoreReleaseHandoffState}
          releasePackageState={privateCoreReleasePackageState}
          releaseWorkflowState={privateCoreReleaseWorkflowState}
          sendState={privateCoreSendState}
          swapState={privateCoreSwapState}
          operatorCurrentRoot={privateCoreOperatorCurrentRoot}
          operatorConsumeError={privateCoreOperatorConsumeError}
          operatorConsumes={privateCoreOperatorConsumes}
          operatorLatestConsume={privateCoreOperatorLatestConsume}
          operatorLatestConsumeProof={privateCoreOperatorLatestConsumeProof}
          operatorLatestProof={privateCoreOperatorLatestProof}
          operatorLatestRelease={privateCoreOperatorLatestRelease}
          operatorLatestReleaseProof={privateCoreOperatorLatestReleaseProof}
          operatorLatestRoot={privateCoreOperatorLatestRoot}
          operatorLatestSend={privateCoreOperatorLatestSend}
          operatorLatestSendLinkedProof={privateCoreOperatorLatestSendLinkedProof}
          operatorLatestSendProof={privateCoreOperatorLatestSendProof}
          operatorLatestSwap={privateCoreOperatorLatestSwap}
          operatorLatestSwapLinkedProof={privateCoreOperatorLatestSwapLinkedProof}
          operatorLatestSwapProof={privateCoreOperatorLatestSwapProof}
          operatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
          operatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
          operatorContractMirrorPrimaryNote={privateCoreOperatorContractMirrorPrimaryNote}
          operatorContractMirrorStatusLabel={privateCoreOperatorContractMirrorStatusLabel}
          operatorReleaseBoundaryPrimaryNote={privateCoreOperatorReleaseBoundaryPrimaryNote}
          operatorReleaseBoundaryStatusLabel={privateCoreOperatorReleaseBoundaryStatusLabel}
          operatorRequiredLanesPrimaryNote={privateCoreOperatorRequiredLanesPrimaryNote}
          operatorRequiredLanesStatusLabel={privateCoreOperatorRequiredLanesStatusLabel}
          operatorZkV1ShippingPrimaryNote={privateCoreOperatorZkV1ShippingPrimaryNote}
          operatorZkV1ShippingStatusLabel={privateCoreOperatorZkV1ShippingStatusLabel}
          operatorSendBoundaryPrimaryNote={privateCoreOperatorSendBoundaryPrimaryNote}
          operatorSendBoundaryStatusLabel={privateCoreOperatorSendBoundaryStatusLabel}
          operatorSendContinuityPrimaryNote={privateCoreOperatorSendContinuityPrimaryNote}
          operatorSendContinuityStatusLabel={privateCoreOperatorSendContinuityStatusLabel}
          operatorSwapBoundaryPrimaryNote={privateCoreOperatorSwapBoundaryPrimaryNote}
          operatorSwapBoundaryStatusLabel={privateCoreOperatorSwapBoundaryStatusLabel}
          operatorSwapContinuityPrimaryNote={privateCoreOperatorSwapContinuityPrimaryNote}
          operatorSwapContinuityStatusLabel={privateCoreOperatorSwapContinuityStatusLabel}
          operatorSupportedSendLaneKind={privateCoreOperatorSupportedSendLaneKind}
          operatorSupportedSendLaneNote={privateCoreOperatorSupportedSendLaneNote}
          operatorSupportedSendLaneStatus={privateCoreOperatorSupportedSendLaneStatus}
          operatorSupportedSendLaneVersion={privateCoreOperatorSupportedSendLaneVersion}
          operatorSupportedSendV1Decision={privateCoreOperatorSupportedSendV1Decision}
          operatorSupportedSendV1DecisionNote={privateCoreOperatorSupportedSendV1DecisionNote}
          operatorSupportedUnshieldLaneKind={privateCoreOperatorSupportedUnshieldLaneKind}
          operatorSupportedUnshieldLaneNote={privateCoreOperatorSupportedUnshieldLaneNote}
          operatorSupportedUnshieldLaneStatus={privateCoreOperatorSupportedUnshieldLaneStatus}
          operatorSupportedUnshieldLaneVersion={privateCoreOperatorSupportedUnshieldLaneVersion}
          operatorSupportedUnshieldV1Decision={privateCoreOperatorSupportedUnshieldV1Decision}
          operatorSupportedUnshieldV1DecisionNote={
            privateCoreOperatorSupportedUnshieldV1DecisionNote
          }
          operatorSupportedReleaseLaneKind={privateCoreOperatorSupportedReleaseLaneKind}
          operatorSupportedReleaseLaneNote={privateCoreOperatorSupportedReleaseLaneNote}
          operatorSupportedReleaseLaneStatus={privateCoreOperatorSupportedReleaseLaneStatus}
          operatorSupportedReleaseLaneVersion={privateCoreOperatorSupportedReleaseLaneVersion}
          operatorSupportedSwapLaneKind={privateCoreOperatorSupportedSwapLaneKind}
          operatorSupportedSwapLaneNote={privateCoreOperatorSupportedSwapLaneNote}
          operatorSupportedSwapLaneStatus={privateCoreOperatorSupportedSwapLaneStatus}
          operatorSupportedSwapLaneVersion={privateCoreOperatorSupportedSwapLaneVersion}
          operatorSupportedSwapV1Decision={privateCoreOperatorSupportedSwapV1Decision}
          operatorSupportedSwapV1DecisionNote={privateCoreOperatorSupportedSwapV1DecisionNote}
          operatorSupportedSwapV1Role={privateCoreOperatorSupportedSwapV1Role}
          operatorSupportedSwapV1RoleNote={privateCoreOperatorSupportedSwapV1RoleNote}
          operatorSupportedSwapVenue={privateCoreOperatorSupportedSwapVenue}
          operatorSupportedSwapOutputModel={privateCoreOperatorSupportedSwapOutputModel}
          operatorSupportedSwapResultingRootBasis={privateCoreOperatorSupportedSwapResultingRootBasis}
          operatorSupportedSwapInputRootPolicy={privateCoreOperatorSupportedSwapInputRootPolicy}
          operatorSupportedSwapOutputRegistrationPolicy={
            privateCoreOperatorSupportedSwapOutputRegistrationPolicy
          }
          operatorSupportedReleaseV1Decision={privateCoreOperatorSupportedReleaseV1Decision}
          operatorSupportedReleaseV1DecisionNote={
            privateCoreOperatorSupportedReleaseV1DecisionNote
          }
          operatorSupportedFlowKind={privateCoreOperatorSupportedFlowKind}
          operatorSupportedFlowNote={privateCoreOperatorSupportedFlowNote}
          operatorSupportedFlowStatus={privateCoreOperatorSupportedFlowStatus}
          operatorSupportedFlowVersion={privateCoreOperatorSupportedFlowVersion}
          operatorSupportedZkV1ScopeDecision={privateCoreOperatorSupportedZkV1ScopeDecision}
          operatorSupportedZkV1ScopeNote={privateCoreOperatorSupportedZkV1ScopeNote}
          operatorSupportedZkV1RequiredLanes={privateCoreOperatorSupportedZkV1RequiredLanes}
          operatorSupportedZkV1RequiredLanesNote={privateCoreOperatorSupportedZkV1RequiredLanesNote}
          operatorZkV1FinishLineStatusLabel={privateCoreOperatorZkV1FinishLineStatusLabel}
          operatorZkV1FinishLinePrimaryNote={privateCoreOperatorZkV1FinishLinePrimaryNote}
          operatorSupportedAssetSymbol={privateCoreOperatorSupportedAssetSymbol}
          operatorSupportedEnvironment={privateCoreOperatorSupportedEnvironment}
          operatorSupportedNoteSchema={privateCoreOperatorSupportedNoteSchema}
          operatorSupportedNoteVersion={privateCoreOperatorSupportedNoteVersion}
          operatorSupportedRootRegistrationProvenance={
            privateCoreOperatorSupportedRootRegistrationProvenance
          }
          operatorSupportedSendResultingRootBasis={
            privateCoreOperatorSupportedSendResultingRootBasis
          }
          operatorSupportedSendInputRootPolicy={
            privateCoreOperatorSupportedSendInputRootPolicy
          }
          operatorSupportedSendOutputRegistrationPolicy={
            privateCoreOperatorSupportedSendOutputRegistrationPolicy
          }
          operatorSupportedRecipientModel={privateCoreOperatorSupportedRecipientModel}
          operatorSupportedReleaseDestinationModel={
            privateCoreOperatorSupportedReleaseDestinationModel
          }
          operatorSupportedProofSystem={privateCoreOperatorSupportedProofSystem}
          operatorSupportedUnshieldCircuit={privateCoreOperatorSupportedUnshieldCircuit}
          operatorSupportedSendCircuit={privateCoreOperatorSupportedSendCircuit}
          operatorSupportedUnshieldMerkleDepth={privateCoreOperatorSupportedUnshieldMerkleDepth}
          operatorSupportedSendMerkleDepth={privateCoreOperatorSupportedSendMerkleDepth}
          operatorSupportedReleaseAuthorizationBasis={
            privateCoreOperatorSupportedReleaseAuthorizationBasis
          }
          operatorSupportedReleaseRootPolicy={privateCoreOperatorSupportedReleaseRootPolicy}
          operatorSupportedReleaseExecutionModel={
            privateCoreOperatorSupportedReleaseExecutionModel
          }
          operatorSupportedReleaseAtomicityModel={
            privateCoreOperatorSupportedReleaseAtomicityModel
          }
          operatorSupportedReleasePersistenceModel={
            privateCoreOperatorSupportedReleasePersistenceModel
          }
          operatorOwnerAuthorizationMode={privateCoreOperatorOwnerAuthorizationMode}
          operatorOwnerAuthorizationDecision={privateCoreOperatorOwnerAuthorizationDecision}
          operatorOwnerAuthorizationDecisionNote={privateCoreOperatorOwnerAuthorizationDecisionNote}
          operatorSourceArtifactTruthBasis={privateCoreOperatorSourceArtifactTruthBasis}
          operatorProvingArtifactTruthBasis={privateCoreOperatorProvingArtifactTruthBasis}
          operatorSourceProvingRelationship={privateCoreOperatorSourceProvingRelationship}
          operatorNullifierKeyMode={privateCoreOperatorNullifierKeyMode}
          operatorProvingHashLane={privateCoreOperatorProvingHashLane}
          operatorCurrentRootLinkedProof={privateCoreOperatorCurrentRootLinkedProof}
          operatorCurrentRootProofLinkStatus={privateCoreOperatorCurrentRootProofLinkStatus}
          operatorSendResultingRootLinkedProof={privateCoreOperatorSendResultingRootLinkedProof}
          operatorSendResultingRootRecord={privateCoreOperatorSendResultingRootRecord}
          operatorSendResultingRootPrimaryNote={privateCoreOperatorSendResultingRootPrimaryNote}
          operatorSendResultingRootRegistrationPrimaryNote={
            privateCoreOperatorSendResultingRootRegistrationPrimaryNote
          }
          operatorSendResultingRootRegistrationStatusLabel={
            privateCoreOperatorSendResultingRootRegistrationStatusLabel
          }
          operatorSendResultingRootProofLinkStatus={privateCoreOperatorSendResultingRootProofLinkStatus}
          operatorSendResultingRootStatusLabel={privateCoreOperatorSendResultingRootStatusLabel}
          operatorSwapResultingRootLinkedProof={privateCoreOperatorSwapResultingRootLinkedProof}
          operatorSwapResultingRootRecord={privateCoreOperatorSwapResultingRootRecord}
          operatorSwapResultingRootPrimaryNote={privateCoreOperatorSwapResultingRootPrimaryNote}
          operatorSwapResultingRootRegistrationPrimaryNote={
            privateCoreOperatorSwapResultingRootRegistrationPrimaryNote
          }
          operatorSwapResultingRootRegistrationStatusLabel={
            privateCoreOperatorSwapResultingRootRegistrationStatusLabel
          }
          operatorSwapResultingRootProofLinkStatus={
            privateCoreOperatorSwapResultingRootProofLinkStatus
          }
          operatorSwapResultingRootStatusLabel={privateCoreOperatorSwapResultingRootStatusLabel}
          operatorProofConsumeLinkStatus={privateCoreOperatorProofConsumeLinkStatus}
          operatorProofError={privateCoreOperatorProofError}
          operatorProofs={privateCoreOperatorProofs}
          operatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
          operatorProofSwapLinkStatus={privateCoreOperatorProofSwapLinkStatus}
          operatorProofReleaseLinkStatus={privateCoreOperatorProofReleaseLinkStatus}
          operatorReleaseError={privateCoreOperatorReleaseError}
          operatorReleases={privateCoreOperatorReleases}
          operatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
          operatorRootError={privateCoreOperatorRootError}
          operatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
          operatorRoots={privateCoreOperatorRoots}
          operatorContractStateVersion={privateCoreOperatorContractStateVersion}
          operatorContractVersion={privateCoreOperatorContractVersion}
          operatorContractSummaryVersion={privateCoreOperatorContractSummaryVersion}
          operatorStatusVersion={privateCoreOperatorStatusVersion}
          operatorStatusKind={privateCoreOperatorStatusKind}
          operatorSnapshotVersion={privateCoreOperatorSnapshotVersion}
          operatorSnapshotKind={privateCoreOperatorSnapshotKind}
          operatorSupportedStatusNote={privateCoreOperatorSupportedStatusNote}
          operatorSupportedStatusTransport={privateCoreOperatorSupportedStatusTransport}
          operatorSupportedStatusEndpoint={privateCoreOperatorSupportedStatusEndpoint}
          operatorSupportedStatusGateVersion={privateCoreOperatorSupportedStatusGateVersion}
          operatorSupportedStatusGateKind={privateCoreOperatorSupportedStatusGateKind}
          operatorSupportedStatusGateNote={privateCoreOperatorSupportedStatusGateNote}
          operatorSupportedStatusGateTransport={
            privateCoreOperatorSupportedStatusGateTransport
          }
          operatorSupportedStatusGateEndpoint={
            privateCoreOperatorSupportedStatusGateEndpoint
          }
          operatorSupportedSnapshotGateVersion={
            privateCoreOperatorSupportedSnapshotGateVersion
          }
          operatorSupportedSnapshotGateKind={privateCoreOperatorSupportedSnapshotGateKind}
          operatorSupportedSnapshotGateNote={privateCoreOperatorSupportedSnapshotGateNote}
          operatorSupportedSnapshotGateTransport={
            privateCoreOperatorSupportedSnapshotGateTransport
          }
          operatorSupportedSnapshotGateEndpoint={
            privateCoreOperatorSupportedSnapshotGateEndpoint
          }
          operatorSupportedShippingDecisionGateVersion={
            privateCoreOperatorSupportedShippingDecisionGateVersion
          }
          operatorSupportedShippingDecisionGateKind={
            privateCoreOperatorSupportedShippingDecisionGateKind
          }
          operatorSupportedShippingDecisionGateNote={
            privateCoreOperatorSupportedShippingDecisionGateNote
          }
          operatorSupportedShippingDecisionGateTransport={
            privateCoreOperatorSupportedShippingDecisionGateTransport
          }
          operatorSupportedShippingDecisionGateEndpoint={
            privateCoreOperatorSupportedShippingDecisionGateEndpoint
          }
          operatorSupportedShippingDecisionTransport={
            privateCoreOperatorSupportedShippingDecisionTransport
          }
          operatorSupportedShippingDecisionEndpoint={
            privateCoreOperatorSupportedShippingDecisionEndpoint
          }
          operatorSupportedShippingArtifactGateVersion={
            privateCoreOperatorSupportedShippingArtifactGateVersion
          }
          operatorSupportedShippingArtifactGateKind={
            privateCoreOperatorSupportedShippingArtifactGateKind
          }
          operatorSupportedShippingArtifactGateNote={
            privateCoreOperatorSupportedShippingArtifactGateNote
          }
          operatorSupportedShippingArtifactGateTransport={
            privateCoreOperatorSupportedShippingArtifactGateTransport
          }
          operatorSupportedShippingArtifactGateEndpoint={
            privateCoreOperatorSupportedShippingArtifactGateEndpoint
          }
          operatorSupportedSnapshotNote={privateCoreOperatorSupportedSnapshotNote}
          operatorSupportedSnapshotTransport={privateCoreOperatorSupportedSnapshotTransport}
          operatorSupportedSnapshotEndpoint={privateCoreOperatorSupportedSnapshotEndpoint}
          operatorSupportedShippingArtifactNote={
            privateCoreOperatorSupportedShippingArtifactNote
          }
          operatorSupportedShippingArtifactTransport={privateCoreOperatorSupportedShippingArtifactTransport}
          operatorSupportedShippingArtifactEndpoint={privateCoreOperatorSupportedShippingArtifactEndpoint}
          operatorSupportedReleaseCandidateVersion={
            privateCoreOperatorSupportedReleaseCandidateVersion
          }
          operatorSupportedReleaseCandidateKind={privateCoreOperatorSupportedReleaseCandidateKind}
          operatorSupportedReleaseCandidateNote={privateCoreOperatorSupportedReleaseCandidateNote}
          operatorSupportedReleaseCandidateGateVersion={
            privateCoreOperatorSupportedReleaseCandidateGateVersion
          }
          operatorSupportedReleaseCandidateGateKind={
            privateCoreOperatorSupportedReleaseCandidateGateKind
          }
          operatorSupportedReleaseCandidateGateNote={
            privateCoreOperatorSupportedReleaseCandidateGateNote
          }
          operatorSupportedReleaseCandidateGateTransport={
            privateCoreOperatorSupportedReleaseCandidateGateTransport
          }
          operatorSupportedReleaseCandidateGateEndpoint={
            privateCoreOperatorSupportedReleaseCandidateGateEndpoint
          }
          operatorSupportedReleaseCandidateTransport={
            privateCoreOperatorSupportedReleaseCandidateTransport
          }
          operatorSupportedReleaseCandidateEndpoint={
            privateCoreOperatorSupportedReleaseCandidateEndpoint
          }
          operatorShippingArtifactVersion={privateCoreOperatorShippingArtifactVersion}
          operatorShippingArtifactKind={privateCoreOperatorShippingArtifactKind}
          operatorShippingDecisionVersion={privateCoreOperatorShippingDecisionVersion}
          operatorShippingDecisionKind={privateCoreOperatorShippingDecisionKind}
          operatorSupportedShippingDecisionNote={
            privateCoreOperatorSupportedShippingDecisionNote
          }
          operatorSendError={privateCoreOperatorSendError}
          operatorSends={privateCoreOperatorSends}
          operatorSendProofError={privateCoreOperatorSendProofError}
          operatorSendProofs={privateCoreOperatorSendProofs}
          operatorSwaps={privateCoreOperatorSwaps}
          operatorSwapProofs={privateCoreOperatorSwapProofs}
          operatorSummaryUpdatedAt={privateCoreOperatorSummaryUpdatedAt}
          shieldState={privateCoreRecentShield}
          title="Vanta Private Core unshield state"
          unshieldState={privateCoreUnshieldState}
        />

        <div className="status-actions" style={{ marginTop: 16 }}>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setPrivateCoreActionPending(true);
              void runPrivateCoreUnshield().finally(() => {
                setPrivateCoreActionPending(false);
              });
            }}
            disabled={
              privateCoreActionPending ||
              !privateCoreHoldState ||
              privateCoreUnshieldState?.consumeSucceeded === true
            }
          >
            {privateCoreActionPending ? "Generating proof..." : "Unshield private note"}
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              setPrivateCoreActionPending(true);
              void runPrivateCoreReplayAttempt().finally(() => {
                setPrivateCoreActionPending(false);
              });
            }}
            disabled={
              privateCoreActionPending ||
              !privateCoreHoldState ||
              !privateCoreUnshieldState?.consumeSucceeded
            }
          >
            Attempt replay rejection
          </button>
        </div>

        {privateCoreUnshieldState && (
          <div
            className={
              privateCoreUnshieldState.consumeSucceeded
                ? "status-panel status-panel--success"
                : privateCoreUnshieldState.replayRejected
                  ? "status-panel status-panel--failed"
                  : "status-panel status-panel--warning"
            }
          >
            <span>
              {privateCoreUnshieldState.consumeSucceeded
                ? "Private note consumed"
                : privateCoreUnshieldState.replayRejected
                  ? "Replay rejected"
                  : "Unshield status"}
            </span>
            <p>
              {privateCoreUnshieldState.consumeSucceeded
                ? "Private note consumed; proof-backed operator release record recorded."
                : privateCoreUnshieldState.replayRejected
                  ? privateCoreUnshieldState.errorMessage ?? "Replay was rejected."
                  : privateCoreUnshieldState.errorMessage ?? "Waiting for the next action."}
            </p>
            <div className="review-list" style={{ marginTop: 12 }}>
              <div className="review-row">
                <span>Private funds</span>
                <strong>
                  {privateCoreUnshieldState.consumeSucceeded
                    ? "Exited once"
                    : privateCoreUnshieldState.replayRejected
                      ? "Second consume blocked"
                      : "Awaiting successful consume"}
                </strong>
              </div>
              <div className="review-row">
                <span>Replay protection</span>
                <strong>
                  {privateCoreUnshieldState.replayRejected
                    ? "Working"
                    : privateCoreUnshieldState.consumeSucceeded
                      ? "Ready to demonstrate"
                      : "Not yet exercised"}
                </strong>
              </div>
            </div>
            <details className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
              <summary>Internal proof diagnostics</summary>
              <div className="review-list" style={{ marginTop: 12 }}>
              <div className="review-row">
                <span>Source nullifier</span>
                <strong>{privateCoreUnshieldState.sourceNullifier ? abbreviate(privateCoreUnshieldState.sourceNullifier) : "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Source witness root</span>
                <strong>
                  {privateCoreHoldState?.sourceWitnessRoot
                    ? abbreviate(privateCoreHoldState.sourceWitnessRoot)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proof envelope</span>
                <strong>
                  {privateCoreUnshieldState.proofEnvelope
                    ? `${privateCoreUnshieldState.proofEnvelope.statement} · leaf ${privateCoreUnshieldState.proofEnvelope.publicInputs.leafIndex}`
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proving lane</span>
                <strong>{privateCoreUnshieldState.provingHashLane ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Proving root</span>
                <strong>
                  {privateCoreUnshieldState.provingStateRoot
                    ? abbreviate(privateCoreUnshieldState.provingStateRoot)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proving nullifier</span>
                <strong>
                  {privateCoreUnshieldState.provingNullifier
                    ? abbreviate(privateCoreUnshieldState.provingNullifier)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Consume context</span>
                <strong>
                  {privateCoreUnshieldState.provingConsumeContextTag
                    ? abbreviate(privateCoreUnshieldState.provingConsumeContextTag)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proof execution</span>
                <strong>{privateCoreUnshieldState.proofExecutionStatus ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Proof shape</span>
                <strong>
                  {privateCoreUnshieldState.proofFieldCount && privateCoreUnshieldState.proofPublicInputCount
                    ? `${privateCoreUnshieldState.proofFieldCount} fields · ${privateCoreUnshieldState.proofPublicInputCount} public inputs`
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator consume records</span>
                <strong>
                  {privateCoreOperatorConsumeError
                    ? "Unavailable"
                    : privateCoreOperatorConsumes.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Latest operator nullifier</span>
                <strong>
                  {privateCoreOperatorConsumeError
                    ? privateCoreOperatorConsumeError
                    : latestPrivateCoreOperatorConsume?.nullifier
                      ? abbreviate(latestPrivateCoreOperatorConsume.nullifier)
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator release records</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? "Unavailable"
                    : privateCoreOperatorReleases.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Latest operator release</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.nullifier
                      ? abbreviate(latestPrivateCoreOperatorRelease.nullifier)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Immediate release request</span>
                <strong>
                  {privateCoreUnshieldState.operatorReleaseRequestId
                    ? abbreviate(privateCoreUnshieldState.operatorReleaseRequestId)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Immediate transition note</span>
                <strong>
                  {privateCoreUnshieldState.operatorReleaseTransitionNoteId
                    ? abbreviate(privateCoreUnshieldState.operatorReleaseTransitionNoteId)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator release destination</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.releaseDestination
                      ? abbreviate(latestPrivateCoreOperatorRelease.releaseDestination)
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator released value</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.releasedAmount &&
                        latestPrivateCoreOperatorRelease?.releasedAssetId
                      ? `${latestPrivateCoreOperatorRelease.releasedAmount} / ${abbreviate(latestPrivateCoreOperatorRelease.releasedAssetId)}`
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator root registration</span>
                <strong>{privateCoreOperatorRootRegistrationStatus ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Operator root currentness</span>
                <strong>{privateCoreOperatorRootCurrentnessLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Operator root records</span>
                <strong>
                  {privateCoreOperatorRootError
                    ? "Unavailable"
                    : privateCoreOperatorRoots.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Consume status</span>
                <strong>
                  {privateCoreUnshieldState.consumeSucceeded
                    ? "Succeeded"
                    : privateCoreUnshieldState.replayRejected
                      ? "Replay blocked"
                      : "Failed"}
                </strong>
              </div>
            </div>
            </details>
          </div>
        )}
      </article>
      )}

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header unshield-ticket__header">
            <div>
              <span>Unshield</span>
              <h3>Send {selectedLane} to your wallet</h3>
            </div>
            <small>
              {`${formatUnshieldAmount(selectedFullAmount, selectedLane)} selected note`}
            </small>
          </div>

          <section
            className="unshield-exit-preview"
            aria-describedby="unshield-exit-preview-copy"
            aria-labelledby="unshield-exit-preview-title"
          >
            <div className="unshield-exit-preview__copy">
              <span id="unshield-exit-preview-title">You'll receive</span>
              <strong>{exitConsequenceDisplay}</strong>
              <small id="unshield-exit-preview-copy">
                {walletAddressShort
                  ? `to ${exitConsequenceDestination}`
                  : "connect wallet for destination"}
              </small>
            </div>
            <div
              className="unshield-exit-recipe"
              role="img"
              aria-label="Selected shielded amount exits to your connected public wallet"
            >
              <span
                className="unshield-exit-recipe__node unshield-exit-recipe__node--shielded"
                aria-hidden="true"
              >
                Shielded note
              </span>
              <span className="unshield-exit-recipe__path" aria-hidden="true">
                <span />
              </span>
              <span
                className="unshield-exit-recipe__node unshield-exit-recipe__node--wallet"
                aria-hidden="true"
              >
                Own wallet
              </span>
            </div>
          </section>

          <div className="shield-form swap-widget unshield-ticket">
            <div className="swap-module unshield-ticket__module">
              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--from">
                <div className="swap-module__label-row">
                  <span>Shielded asset</span>
                  <div
                    aria-label="Ledger spendable shielded balances"
                    className="send-balance-line shield-helper shield-helper--meta"
                  >
                    {`Spendable note: ${formatUnshieldAmount(selectedFullAmount, selectedLane)}`}
                  </div>
                </div>
                <div className="send-asset-field">
                  <select
                    aria-label="Unshield asset"
                    value={selectedLane}
                    onChange={(event) => selectUnshieldLane(event.target.value as UnshieldLane)}
                  >
                    {availableLaneOptions.map((option) => (
                      <option key={option.lane} value={option.lane}>
                        {formatAvailableLaneOptionLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--to">
                <div className="swap-module__label-row">
                  <span>Destination</span>
                </div>
                <div
                  aria-label="Unshield destination wallet"
                  className="unshield-fixed-field unshield-destination-card"
                  title={walletAddress ?? undefined}
                >
                  <strong>{walletAddressShort ?? "Connect wallet"}</strong>
                  <small>Exits go to your connected wallet.</small>
                </div>
              </div>

              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--amount">
                <div className="swap-module__label-row">
                  <span>Amount</span>
                </div>
                {selectedLane === "USDC" ? (
                  <div className="amount-field">
                    <input
                      aria-label="Unshield amount"
                      inputMode="decimal"
                      type="text"
                      value={requestedAmountInput}
                      onChange={(event) => {
                        setRequestedAmountInput(event.target.value);
                        setStatus("idle");
                        setFlowError(null);
                      }}
                      placeholder="0.00"
                    />
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={selectedFullAmount <= 0}
                      onClick={() => {
                        if (selectedFullAmount <= 0) {
                          return;
                        }

                        setRequestedAmountInput(formatEditableAmount(selectedFullAmount, selectedLaneDecimals));
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      Max
                    </button>
                  </div>
                ) : (
                  <div className="unshield-fixed-field unshield-fixed-field--amount">
                    <strong>{formatEditableAmount(selectedDisplayAmount, selectedLaneDecimals)}</strong>
                    <small>
                      {selectedLane === "SOL" && !selectedSolNote && selectedSolPendingAmount > 0
                        ? "SOL pending ledger reconciliation"
                        : `${selectedLane} fixed note exit`}
                    </small>
                  </div>
                )}
              </div>



              <div className="unshield-ticket__action">
                <p className="shield-helper">{validationMessage}</p>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleUnshield();
                  }}
                  disabled={
                    isBetaMode ||
                    !isReady ||
                    status === "splitting_note" ||
                    status === "recording_transition" ||
                    status === "finalizing_split" ||
                    status === "transition_ready" ||
                    status === "operator_ready" ||
                    status === "authorizing_operator" ||
                    status === "release_ready" ||
                    status === "finalizing_state"
                  }
                >
                  {unshieldPrimaryActionLabel}
                </button>
              </div>
            </div>
          </div>

              <PrivacySummary
                items={UNSHIELD_PRIVACY_SUMMARY_ITEMS}
                note="Beta — funds remain visible to the operator until the program-owned release path ships."
              />

              <details className="unshield-advanced-toggle">
                <summary>Advanced</summary>
                <UnshieldAdvancedPanel
                  notePickerOptions={unshieldNotePickerOptions}
                  noteSelectionLabel={selectedUnshieldNoteLabel}
                  onSelectNote={handleSelectUnshieldNote}
                  referenceNoteLabel={
                    selectedUnshieldNote ? abbreviate(selectedUnshieldNote.noteId) : "Unavailable"
                  }
                  selectedNoteId={selectedUnshieldNoteId}
                />
              </details>

          {status === "awaiting_confirmation" && (
            <TransactionStatusToast
              tone="pending"
              phase="pending"
              title="Preparing wallet approval"
              message={
                requiresExactSplit
                  ? "Approve the private split so Vanta can isolate the exact USDC amount first."
                  : "Vanta is preparing and simulating the constrained unshield transition."
              }
              progress
              floating
            >
              {pendingUmbraApprovalDisplay && (
                <WalletApprovalSheet
                  heading="Private rail approval"
                  walletPrompt={pendingUmbraApprovalDisplay.walletPrompt}
                  signingMode={pendingUmbraApprovalDisplay.signingMode}
                  rows={pendingUmbraApprovalDisplay.rows}
                  maxRows={4}
                  note="Approve only if your wallet shows the same asset, amount, cluster, and destination."
                  truthBoundary="Local approval review only; it does not prove production privacy or mainnet readiness."
                />
              )}
            </TransactionStatusToast>
          )}

          {status === "transition_ready" && (
            <div className="status-panel">
              <span>Ready for transition approval</span>
              <p>Approve the prepared Unshield transition in your wallet to continue.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void approvePreparedUnshieldTransition();
                }}
                disabled={
                  !pendingTransitionApproval ||
                  transitionTransaction.status === "loading" ||
                  Boolean(transitionTransaction.signature)
                }
              >
                Approve transition in wallet
              </button>
            </div>
          )}

          {status === "splitting_note" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Preparing exact amount"
              message="Preparing the exact amount to move out."
              progress
              floating
            />
          )}

          {status === "recording_transition" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Recording unshield transition"
              message="Moving the selected shielded funds toward public release."
              progress
              floating
            >
              {transitionProgressLabel && (
                <p className="shield-helper shield-helper--meta">{transitionProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "finalizing_split" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Finalizing split state"
              message="Recording the hidden split spent marker before the exact note is unshielded."
              progress
              floating
            />
          )}

          {status === "split_finalization_ready" && (
            <div className="status-panel">
              <span>Ready to finalize split</span>
              <p>Approve the prepared split spent marker after the first wallet request has closed.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void finalizePendingSplitState();
                }}
                disabled={
                  !pendingSplitFinalizationApproval ||
                  splitSpentMarkerTransaction.status === "loading" ||
                  Boolean(splitSpentMarkerTransaction.signature)
                }
              >
                Finalize split in wallet
              </button>
            </div>
          )}

          {status === "operator_ready" && (
            <div className="status-panel">
              <span>Ready for operator release</span>
              <p>Release the selected note through the configured operator. This Unshield step does not open Phantom.</p>
              {operatorReleaseDisabledReason && (
                <p className="status-panel__warning">{operatorReleaseDisabledReason}</p>
              )}
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void authorizePendingOperatorRelease();
                }}
                disabled={Boolean(operatorReleaseDisabledReason)}
              >
                Release through operator
              </button>
            </div>
          )}

          {status === "authorizing_operator" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Authorizing public release"
              message={`Requesting the constrained public release for this ${selectedLane} exit.`}
              progress
              floating
            />
          )}

          {status === "release_ready" && (
            <div className="status-panel">
              <span>Ready to finalize</span>
              <p>Approve one final wallet request to record the spent marker and refresh Vanta state.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void finalizePendingUnshieldState();
                }}
                disabled={
                  !pendingFinalizationApproval ||
                  spentMarkerTransaction.status === "loading" ||
                  Boolean(spentMarkerTransaction.signature)
                }
              >
                Finalize in wallet
              </button>
            </div>
          )}

          {status === "finalizing_state" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Finalizing shielded state"
              message="Recording the spent marker and refreshing Vanta state."
              progress
              floating
            >
              {finalizationProgressLabel && (
                <p className="shield-helper shield-helper--meta">{finalizationProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "failed" && (
            <TransactionStatusToast
              tone="error"
              phase="failed"
              title="Funds were not moved"
              message={flowError ?? "The exit did not complete. Try again."}
              floating
            />
          )}

          {status === "complete" && lastCompletion && (
            <TransactionStatusToast
              tone="success"
              phase="complete"
              title={`Done — sent ${formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset)} ${lastCompletion.asset} to ${walletAddressShort ?? "wallet"}`}
              message="Beta — operator-assisted release. Verify the public exit transaction."
              floating
            >
              <div className="preview-grid unshield-evidence-grid">
                <div className="preview-card preview-card--accent">
                  <span>Transaction evidence</span>
                  <strong>{completionEvidenceLabel}</strong>
                </div>
                <div className="preview-card unshield-success-signature-card">
                  <span>Operator release</span>
                  <strong>
                    {operatorReleaseSignature ? abbreviate(operatorReleaseSignature) : "Pending"}
                  </strong>
                  {operatorReleaseSignature && (
                    <span className="unshield-success-pulse" aria-hidden="true" />
                  )}
                </div>
              </div>
              <p className="shield-helper">Settlement: {currentUnshieldTransactionEvidence.settlement.status}</p>
              <div className="status-actions unshield-success-actions">
                <Link className="button button-primary" to="/app/shield">
                  Shield more
                </Link>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setUnshieldReceiptModalOpen(true);
                  }}
                >
                  View receipt details
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    void copyUnshieldReceipt();
                  }}
                >
                  {unshieldReceiptCopyStatus === "copied"
                    ? "Receipt copied"
                    : unshieldReceiptCopyStatus === "failed"
                      ? "Receipt copy unavailable"
                      : "Share receipt"}
                </button>
                {operatorReleaseSignature && (
                  <a
                    className="button button-ghost"
                    href={getSolscanTransactionUrl(operatorReleaseSignature)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Solscan
                  </a>
                )}
              </div>
              {unshieldReceiptModalDetails && (
                <UnshieldReceiptModal
                  details={unshieldReceiptModalDetails}
                  open={unshieldReceiptModalOpen}
                  onClose={() => setUnshieldReceiptModalOpen(false)}
                >
                  <details className="unshield-completion-details">
                    <summary>Developer details</summary>
                    <div className="preview-grid">
                      <div className="preview-card preview-card--accent">
                        <span>Exact candidate</span>
                        <strong>
                          {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
                        </strong>
                      </div>
                      <div className="preview-card">
                        <span>Release workflow</span>
                        <strong>
                          {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
                        </strong>
                      </div>
                      <div className="preview-card">
                        <span>Release handoff</span>
                        <strong>
                          {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
                        </strong>
                      </div>
                      <div className="preview-card">
                        <span>Release package</span>
                        <strong>
                          {privateCoreReleasePackageState?.packageStatusLabel ??
                            privateCoreReleaseHandoffState?.packageStatusLabel ??
                            "Unavailable"}
                        </strong>
                      </div>
                    </div>
                    <div className="review-list">
                      <div className="review-row">
                        <span>Workflow prepare</span>
                        <strong>
                          {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Workflow check</span>
                        <strong>{privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Workflow ship</span>
                        <strong>{privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Shipping artifact</span>
                        <strong>
                          {privateCoreReleaseWorkflowState?.artifactStatusLabel ?? "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Workflow note</span>
                        <strong>{privateCoreReleaseWorkflowState?.shipPrimaryNote ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff</span>
                        <strong>{privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Next handoff action</span>
                        <strong>{privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff note</span>
                        <strong>{privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Package identity</span>
                        <strong>{privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Release package</span>
                        <strong>
                          {privateCoreReleasePackageState?.packageStatusLabel ??
                            privateCoreReleaseHandoffState?.packageStatusLabel ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Package note</span>
                        <strong>
                          {privateCoreReleasePackageState?.packagePrimaryNote ??
                            privateCoreReleaseHandoffState?.packagePrimaryNote ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Package gate</span>
                        <strong>{privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Package gate note</span>
                        <strong>{privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact identity</span>
                        <strong>
                          {privateCoreReleasePackageState?.artifactIdentityLabel ??
                            privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Decision identity</span>
                        <strong>
                          {privateCoreReleasePackageState?.decisionIdentityLabel ??
                            privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Contract identity</span>
                        <strong>{privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Snapshot identity</span>
                        <strong>{privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Summary generated</span>
                        <strong>{privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Package lineage</span>
                        <strong>{privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}</strong>
                      </div>
                    </div>
                    <div className="status-actions" style={{ marginTop: 16 }}>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          setReleaseHandoffRefreshPending(true);
                          void refreshPrivateCoreOperatorSummary().finally(() => {
                            setReleaseHandoffRefreshPending(false);
                          });
                        }}
                        disabled={releaseHandoffRefreshPending}
                      >
                        {releaseHandoffRefreshPending ? "Refreshing handoff" : "Refresh release handoff"}
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          void copyReleasePackageExport("summary");
                        }}
                        disabled={!privateCoreReleasePackageState}
                      >
                        {releasePackageExportStatus === "summary-copy"
                          ? "Copied operator package summary"
                          : "Copy operator package summary"}
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          void copyReleasePackageExport("json");
                        }}
                        disabled={!privateCoreReleasePackageState}
                      >
                        {releasePackageExportStatus === "json-copy"
                          ? "Copied operator package JSON"
                          : "Copy operator package JSON"}
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          downloadReleasePackageExport("summary");
                        }}
                        disabled={!privateCoreReleasePackageState}
                      >
                        {releasePackageExportStatus === "summary-download"
                          ? "Downloaded package summary"
                          : "Download package summary"}
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          downloadReleasePackageExport("json");
                        }}
                        disabled={!privateCoreReleasePackageState}
                      >
                        {releasePackageExportStatus === "json-download"
                          ? "Downloaded package JSON"
                          : "Download package JSON"}
                      </button>
                    </div>
                    {lastTransitionSignature && (
                      <p className="shield-helper shield-helper--meta">
                        Unshield transition: {abbreviate(lastTransitionSignature)}
                      </p>
                    )}
                    {lastSpentMarkerSignature && (
                      <p className="shield-helper shield-helper--meta">
                        Spent marker: {abbreviate(lastSpentMarkerSignature)}
                      </p>
                    )}
                  </details>
                  <details className="preview-card" style={{ marginTop: 16 }}>
                    <summary>Diagnostics</summary>
                    <p className="shield-helper shield-helper--meta">
                      Internal/debug only. This shows the retained canonical consumption trace for
                      the latest live unshield bridge record.
                    </p>
                    {unshieldBridgeError && (
                      <p className="shield-helper shield-helper--meta" style={{ color: "#b42318" }}>
                        Canonical bridge retention issue: {unshieldBridgeError}
                      </p>
                    )}
                    {currentUnshieldZkDiagnostics ? (
                      <div className="review-list" style={{ marginTop: 12 }}>
                        <div className="review-row">
                          <span>Lane</span>
                          <strong>{currentUnshieldZkDiagnostics.asset}</strong>
                        </div>
                        <div className="review-row">
                          <span>Consumed note ref</span>
                          <strong>{abbreviate(currentUnshieldZkDiagnostics.consumedReferenceHash)}</strong>
                        </div>
                        <div className="review-row">
                          <span>Canonical consumed ref</span>
                          <strong>
                            {currentUnshieldZkDiagnostics.consumedCanonicalCommitment
                              ? abbreviate(currentUnshieldZkDiagnostics.consumedCanonicalCommitment)
                              : "Not yet resolvable"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Canonical source</span>
                          <strong>{currentUnshieldZkDiagnostics.consumedCanonicalRecordSource ?? "Unresolved"}</strong>
                        </div>
                        <div className="review-row">
                          <span>Exit amount</span>
                          <strong>{currentUnshieldZkDiagnostics.amountDisplay}</strong>
                        </div>
                        <div className="review-row">
                          <span>Destination owner</span>
                          <strong>{abbreviate(currentUnshieldZkDiagnostics.destinationOwner) ?? "Unavailable"}</strong>
                        </div>
                        <div className="review-row">
                          <span>Transition signature</span>
                          <strong>{abbreviate(currentUnshieldZkDiagnostics.transitionSignature)}</strong>
                        </div>
                        <div className="review-row">
                          <span>Operator request</span>
                          <strong>
                            {currentUnshieldZkDiagnostics.operatorRequestId
                              ? abbreviate(currentUnshieldZkDiagnostics.operatorRequestId)
                              : "Unavailable"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Operator release</span>
                          <strong>
                            {currentUnshieldZkDiagnostics.operatorReleaseSignature
                              ? abbreviate(currentUnshieldZkDiagnostics.operatorReleaseSignature)
                              : "Unavailable"}
                          </strong>
                        </div>
                        {currentUnshieldZkDiagnostics.spentMarkerSignature && (
                          <div className="review-row">
                            <span>Spent marker</span>
                            <strong>{abbreviate(currentUnshieldZkDiagnostics.spentMarkerSignature)}</strong>
                          </div>
                        )}
                        {currentUnshieldZkDiagnostics.sourceSwapNoteReferenceHash && (
                          <div className="review-row">
                            <span>Source swap ref</span>
                            <strong>{abbreviate(currentUnshieldZkDiagnostics.sourceSwapNoteReferenceHash)}</strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="shield-helper shield-helper--meta">
                        No retained canonical unshield diagnostics are available yet for this client.
                      </p>
                    )}
                  </details>
                </UnshieldReceiptModal>
              )}
            </TransactionStatusToast>
          )}
        </article>
      </div>
    </section>
  );
}
