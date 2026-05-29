import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useSolanaClient,
  useWalletSession,
} from "@solana/react-hooks";
import { isBetaMode } from "@/config/deploymentMode";
import { UnshieldPausedBanner } from "@/components/UnshieldPausedBanner";
import { UnshieldReleaseWorkflowSection } from "@/components/UnshieldReleaseWorkflowSection";
import { UnshieldWorkspaceCard } from "@/components/UnshieldWorkspaceCard";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import type { NotePickerOption } from "@/components/NotePicker";
import { buildPrivateCoreStatePanelProps } from "@/components/privateCore/buildPrivateCoreStatePanelProps";
import { formatEditableAmount } from "@/components/shield/shieldPanelUtils";
import {
  abbreviate,
  formatUnshieldAmount,
  type UnshieldLane,
} from "@/components/unshield/unshieldPanelUtils";
import { buildUnshieldPrivateCoreDemoSteps } from "@/components/unshield/unshieldPrivateCoreDemoSteps";
import { useUnshieldReceiptModal } from "@/components/unshield/useUnshieldReceiptModal";
import { useUnshieldReleasePackageExport } from "@/components/unshield/useUnshieldReleasePackageExport";
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

type SpendableTokenNote = {
  amount: number;
  createdAt: number;
  noteId: string;
  stateSignature: string;
};

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
  const privacyFlow = usePrivacyFlow();
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
  } = privacyFlow;
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
  const privateCoreSendCompleted = Boolean(
    privateCoreSendState || privateCoreOperatorLatestSend || privateCoreOperatorLatestSendProof,
  );
  const {
    copyReleasePackageExport,
    downloadReleasePackageExport,
    releasePackageExportStatus,
  } = useUnshieldReleasePackageExport(privateCoreReleasePackageState);
  const {
    completionEvidenceLabel,
    copyUnshieldReceipt,
    setUnshieldReceiptCopyStatus,
    setUnshieldReceiptModalOpen,
    unshieldReceiptCopyStatus,
    unshieldReceiptModalDetails,
    unshieldReceiptModalOpen,
  } = useUnshieldReceiptModal({
    currentUnshieldTransactionEvidence,
    lastCompletion,
    lastTransitionSignature,
    operatorReleaseSignature,
  });
  const privateCoreDemoSteps = useMemo(
    () =>
      buildUnshieldPrivateCoreDemoSteps({
        privateCoreHoldState,
        privateCoreRecentShield,
        privateCoreSendCompleted,
        privateCoreSendState,
        privateCoreUnshieldState,
      }),
    [
      privateCoreHoldState,
      privateCoreRecentShield,
      privateCoreSendCompleted,
      privateCoreSendState,
      privateCoreUnshieldState,
    ],
  );
  const selectUnshieldLane = useCallback(
    (nextLane: UnshieldLane) => {
      setSelectedLane(nextLane);
      setSelectedUnshieldNoteId(null);
      setStatus("idle");
      setFlowError(null);
      setUnshieldReceiptCopyStatus("idle");
    },
    [setUnshieldReceiptCopyStatus],
  );
  const [privateCoreActionPending, setPrivateCoreActionPending] = useState(false);
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
  const showPrivateReleaseCard = false;
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
      return "Prepare an Unshield note first.";
    }

    if (!walletAddress) {
      return "Connect the shield owner wallet.";
    }

    if (walletAddress !== pendingSpentMarker.owner) {
      return "Connect the wallet that owns this note.";
    }

    if (operatorAuthorizationStarted) {
      return "Release already in progress.";
    }

    if (operatorAuthorizationLockRef.current === pendingSpentMarker.transitionNoteId) {
      return "Release already requested for this note.";
    }

    if (
      pendingSpentMarker.asset !== "SOL" &&
      !getLiveShieldTokenAsset(pendingSpentMarker.asset).unshieldOperatorUrl
    ) {
      return `${pendingSpentMarker.asset} release endpoint isn't configured.`;
    }

    if (pendingSpentMarker.asset === "SOL" && !liveSwapPair.solUnshieldOperatorUrl) {
      return "SOL release endpoint isn't configured.";
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
      setFlowError(operatorReleaseDisabledReason ?? "Prepare an Unshield note first.");
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
                : "Unshield done, but exit diagnostics didn't save.",
            );
          }
        } else {
          setUnshieldBridgeError(
            "Unshield done, but exit bridge context wasn't available.",
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
            : "Unshield done, but wallet or Vanta state didn't refresh.",
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
    validationMessage =
      "Please wait for ledger reconciliation; local SOL evidence pending ledger sync.";
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
  useEffect(() => {
    if (status !== "complete") {
      setUnshieldReceiptModalOpen(false);
    }
  }, [setUnshieldReceiptModalOpen, status]);
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

  const privateCoreStatePanelProps = useMemo(
    () =>
      buildPrivateCoreStatePanelProps(privacyFlow, {
        compact: true,
        title: "Vanta Private Core unshield state",
      }),
    [privacyFlow],
  );

  return (
    <section className="send-page unshield-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Move out</span>
          <h2>Unshield</h2>
          <p className="product-intro__lede">
            Withdraw to your regular wallet once the on-chain verifier ships.
            Withdrawals are paused in this build — see below.
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

      <UnshieldPausedBanner />

      <LaneFlowIndicator
        ariaLabel="Unshield flow"
        activeStepIndex={2}
        steps={[
          { id: "shield", label: "Shield" },
          { id: "hold", label: "Hold" },
          { id: "unshield", label: `Unshield ${selectedLane}` },
        ]}
      />

      <UnshieldReleaseWorkflowSection
        visible={showPrivateReleaseCard}
        latestPrivateCoreOperatorConsume={latestPrivateCoreOperatorConsume}
        latestPrivateCoreOperatorRelease={latestPrivateCoreOperatorRelease}
        privateCoreActionPending={privateCoreActionPending}
        privateCoreDemoSteps={privateCoreDemoSteps}
        privateCoreHoldState={privateCoreHoldState}
        privateCoreOperatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
        privateCoreOperatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
        privateCoreOperatorConsumeError={privateCoreOperatorConsumeError}
        privateCoreOperatorConsumes={privateCoreOperatorConsumes}
        privateCoreOperatorReleaseError={privateCoreOperatorReleaseError}
        privateCoreOperatorReleases={privateCoreOperatorReleases}
        privateCoreOperatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
        privateCoreOperatorRootError={privateCoreOperatorRootError}
        privateCoreOperatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
        privateCoreOperatorRoots={privateCoreOperatorRoots}
        privateCoreRecentShield={privateCoreRecentShield}
        privateCoreReleaseCandidateState={privateCoreReleaseCandidateState}
        privateCoreReleaseHandoffState={privateCoreReleaseHandoffState}
        privateCoreReleaseWorkflowState={privateCoreReleaseWorkflowState}
        privateCoreSendCompleted={privateCoreSendCompleted}
        privateCoreUnshieldState={privateCoreUnshieldState}
        runPrivateCoreReplayAttempt={runPrivateCoreReplayAttempt}
        runPrivateCoreUnshield={runPrivateCoreUnshield}
        setPrivateCoreActionPending={setPrivateCoreActionPending}
        statePanelProps={privateCoreStatePanelProps}
      />

      <div className="send-layout">
        <UnshieldWorkspaceCard
          approvePreparedUnshieldTransition={approvePreparedUnshieldTransition}
          authorizePendingOperatorRelease={authorizePendingOperatorRelease}
          availableLaneOptions={availableLaneOptions}
          completionEvidenceLabel={completionEvidenceLabel}
          copyReleasePackageExport={copyReleasePackageExport}
          copyUnshieldReceipt={copyUnshieldReceipt}
          currentUnshieldTransactionEvidence={currentUnshieldTransactionEvidence}
          currentUnshieldZkDiagnostics={currentUnshieldZkDiagnostics}
          downloadReleasePackageExport={downloadReleasePackageExport}
          exitConsequenceDestination={exitConsequenceDestination}
          exitConsequenceDisplay={exitConsequenceDisplay}
          finalizationProgressLabel={finalizationProgressLabel}
          finalizePendingSplitState={finalizePendingSplitState}
          finalizePendingUnshieldState={finalizePendingUnshieldState}
          flowError={flowError}
          handleSelectUnshieldNote={handleSelectUnshieldNote}
          handleUnshield={handleUnshield}
          isBetaMode={isBetaMode}
          isReady={isReady}
          lastCompletion={lastCompletion}
          lastSpentMarkerSignature={lastSpentMarkerSignature}
          lastTransitionSignature={lastTransitionSignature}
          notePickerOptions={unshieldNotePickerOptions}
          noteSelectionLabel={selectedUnshieldNoteLabel}
          onMaxRequestedAmount={() => {
            if (selectedFullAmount <= 0) {
              return;
            }

            setRequestedAmountInput(formatEditableAmount(selectedFullAmount, selectedLaneDecimals));
            setStatus("idle");
            setFlowError(null);
          }}
          onRequestedAmountChange={(value) => {
            setRequestedAmountInput(value);
            setStatus("idle");
            setFlowError(null);
          }}
          onSelectLane={selectUnshieldLane}
          onSetUnshieldReceiptModalOpen={setUnshieldReceiptModalOpen}
          operatorReleaseDisabledReason={operatorReleaseDisabledReason}
          operatorReleaseSignature={operatorReleaseSignature}
          pendingFinalizationApproval={pendingFinalizationApproval}
          pendingSplitFinalizationApproval={pendingSplitFinalizationApproval}
          pendingTransitionApproval={pendingTransitionApproval}
          pendingUmbraApprovalDisplay={pendingUmbraApprovalDisplay}
          privateCoreReleaseCandidateState={privateCoreReleaseCandidateState}
          privateCoreReleaseHandoffState={privateCoreReleaseHandoffState}
          privateCoreReleasePackageState={privateCoreReleasePackageState}
          privateCoreReleaseWorkflowState={privateCoreReleaseWorkflowState}
          referenceNoteLabel={
            selectedUnshieldNote ? abbreviate(selectedUnshieldNote.noteId) : "Unavailable"
          }
          refreshPrivateCoreOperatorSummary={refreshPrivateCoreOperatorSummary}
          releaseHandoffRefreshPending={releaseHandoffRefreshPending}
          releasePackageExportStatus={releasePackageExportStatus}
          requestedAmountInput={requestedAmountInput}
          requiresExactSplit={requiresExactSplit}
          selectedDisplayAmount={selectedDisplayAmount}
          selectedFullAmount={selectedFullAmount}
          selectedLane={selectedLane}
          selectedLaneDecimals={selectedLaneDecimals}
          selectedSolNote={selectedSolNote}
          selectedSolPendingAmount={selectedSolPendingAmount}
          selectedUnshieldNoteId={selectedUnshieldNoteId}
          setReleaseHandoffRefreshPending={setReleaseHandoffRefreshPending}
          splitSpentMarkerTransaction={splitSpentMarkerTransaction}
          spentMarkerTransaction={spentMarkerTransaction}
          status={status}
          transitionProgressLabel={transitionProgressLabel}
          transitionTransaction={transitionTransaction}
          unshieldBridgeError={unshieldBridgeError}
          unshieldPrimaryActionLabel={unshieldPrimaryActionLabel}
          unshieldReceiptCopyStatus={unshieldReceiptCopyStatus}
          unshieldReceiptModalDetails={unshieldReceiptModalDetails}
          unshieldReceiptModalOpen={unshieldReceiptModalOpen}
          validationMessage={validationMessage}
          walletAddress={walletAddress}
          walletAddressShort={walletAddressShort}
        />
      </div>
    </section>
  );
}
