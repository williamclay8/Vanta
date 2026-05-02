import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSolanaClient,
  useWalletSession,
} from "@solana/react-hooks";
import { isBetaMode } from "@/config/deploymentMode";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  createTransitionAuthorizedSolUnshieldIntent,
  createSolUnshieldIntentPayload,
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
  createTransitionAuthorizedUnshieldIntent,
  createUnshieldIntentPayload,
} from "@/solana/unshieldAuth";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  createPreparedSendMemo,
  createPreparedSolUnshieldMemo,
  createPreparedUnshieldMemo,
  createSpentMarkerInstruction,
  fetchVantaShieldAccountState,
  VANTA_NATIVE_SOL_ASSET_ID,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";
import {
  listCanonicalUnshieldDiagnosticsSummaries,
  recordCanonicalUnshieldFromLiveUnshield,
} from "@/zk/liveUnshieldBridge";
import { createUmbraUnshieldActionApprovalReview } from "@/privacy/umbraUnshieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { createUnshieldTransactionEvidence } from "@/transactions/vantaTransactionEvidence";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import type { VantaWalletSafeSendResult } from "@/wallet/walletSafeSendBoundary.mjs";

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

function formatUnshieldAmount(value: number, asset: UnshieldLane) {
  return asset === "SOL"
    ? formatSolAmount(value)
    : formatShieldTokenAmount(value, asset);
}

function formatShieldedLaneLabel(asset: UnshieldLane) {
  return `Shielded ${asset}`;
}

function formatAvailableLaneLabel(asset: UnshieldLane, amount: number) {
  return `${formatShieldedLaneLabel(asset)} - ${formatUnshieldAmount(amount, asset)} available`;
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

function createRecentShieldedSolNote(args: {
  amount: number;
  createdAt: number;
  depositSignature?: string;
  owner: string;
  signature: string;
  vaultOwner: string;
}): VantaShieldedSolNote {
  const depositSignature = args.depositSignature ?? args.signature;

  return {
    amount: args.amount,
    asset: "SOL",
    createdAt: args.createdAt,
    depositSignature,
    lifecycleStatus: "spendable",
    noteId: `vnta_native_sol_recent_${args.owner}_${args.vaultOwner}_${depositSignature}`,
    owner: args.owner,
    sourceSwapNoteId: "native-sol-recent-shield",
    stateSignature: args.signature,
    vaultOwner: args.vaultOwner,
  };
}

export function UnshieldPage() {
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
    recentShield,
    refreshPrivateCoreOperatorSummary,
    runPrivateCoreReplayAttempt,
    runPrivateCoreUnshield,
  } = usePrivacyFlow();
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const canonicalShieldState = useVantaShieldState();
  const usdcShieldEntry = shieldRegistry.byAssetKey.USDC;
  const [selectedLane, setSelectedLane] = useState<UnshieldLane>("USDC");
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
      Object.fromEntries(
        ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.map((assetKey) => [
          assetKey,
          shieldRegistry.byAssetKey[assetKey].account?.spendableShieldNotes ?? [],
        ]),
      ) as Record<LiveShieldTokenAssetKey, NonNullable<typeof usdcShieldEntry.account>["spendableShieldNotes"]>,
    [shieldRegistry.byAssetKey, usdcShieldEntry.account],
  );
  const shieldedSolSourceEntry =
    shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
    shieldRegistry.entries.find(
      (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
    ) ??
    null;
  const canonicalSolAccount =
    (canonicalShieldState.account?.shieldedSolBalance ?? 0) > 0 ||
    (canonicalShieldState.account?.spendableShieldedSolNotes.length ?? 0) > 0
      ? canonicalShieldState.account
      : null;
  const solShieldAccount =
    shieldedSolSourceEntry?.account ?? canonicalSolAccount ?? usdcShieldEntry.account;
  const solShieldStateError =
    shieldedSolSourceEntry?.error ?? canonicalShieldState.error ?? usdcShieldEntry.error;
  const recentShieldedSolNote = useMemo(() => {
    if (
      recentShield?.asset !== "SOL" ||
      recentShield.amount <= 0 ||
      !walletAddress ||
      !usdcShieldEntry.asset.vaultOwner ||
      !recentShield.signature
    ) {
      return null;
    }

    return createRecentShieldedSolNote({
      amount: recentShield.amount,
      createdAt: recentShield.timestamp,
      depositSignature: recentShield.depositSignature,
      owner: walletAddress,
      signature: recentShield.signature,
      vaultOwner: usdcShieldEntry.asset.vaultOwner,
    });
  }, [
    recentShield?.amount,
    recentShield?.asset,
    recentShield?.depositSignature,
    recentShield?.signature,
    recentShield?.timestamp,
    usdcShieldEntry.asset.vaultOwner,
    walletAddress,
  ]);
  const spendableSolNotes = useMemo(() => {
    const baseNotes = solShieldAccount?.spendableShieldedSolNotes ?? [];

    if (!recentShieldedSolNote) {
      return baseNotes;
    }

    const alreadyPresent = baseNotes.some(
      (note) =>
        note.noteId === recentShieldedSolNote.noteId ||
        (note.depositSignature &&
          note.depositSignature === recentShieldedSolNote.depositSignature),
    );

    return alreadyPresent ? baseNotes : [recentShieldedSolNote, ...baseNotes];
  }, [recentShieldedSolNote, solShieldAccount?.spendableShieldedSolNotes]);
  const recentShieldedSolBalance =
    recentShield?.asset === "SOL" ? recentShield.resultingShieldedBalance : 0;

  useEffect(() => {
    const availableLanes = [
      ...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.map((assetKey) =>
        spendableShieldNotesByLane[assetKey].length > 0 ? assetKey : null,
      ),
      spendableSolNotes.length > 0 ? "SOL" : null,
    ].filter(Boolean) as UnshieldLane[];

    if (availableLanes.length === 0) {
      return;
    }

    if (!availableLanes.includes(selectedLane)) {
      setSelectedLane(availableLanes[0]);
    }
  }, [
    selectedLane,
    spendableShieldNotesByLane,
    spendableSolNotes.length,
  ]);
  const selectedSolNote = useMemo(
    () => chooseBestSpendableNote(spendableSolNotes),
    [spendableSolNotes],
  );

  const selectedShieldAsset = selectedLane === "SOL" ? null : getLiveShieldTokenAsset(selectedLane);
  const selectedShieldEntry = selectedLane === "SOL" ? null : shieldRegistry.byAssetKey[selectedLane];
  const selectedShieldAccount = selectedShieldEntry?.account ?? null;
  const selectedShieldNote =
    selectedLane === "SOL"
      ? null
      : chooseBestSpendableNote(spendableShieldNotesByLane[selectedLane]);
  useEffect(() => {
    setRequestedAmountInput("");
  }, [selectedLane, selectedShieldNote, selectedSolNote]);
  const selectedSolAggregateAmount = Math.max(
    solShieldAccount?.shieldedSolBalance ?? 0,
    recentShieldedSolBalance,
  );
  const selectedFullAmount =
    selectedLane === "SOL" ? selectedSolNote?.amount ?? 0 : selectedShieldNote?.amount ?? 0;
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
            : shieldRegistry.byAssetKey[lane].account?.balance ?? 0;

        return {
          amount,
          hasSpendableBalance:
            lane === "SOL"
              ? spendableSolNotes.length > 0
              : spendableShieldNotesByLane[lane].length > 0,
          lane,
        };
      }),
    [
      shieldRegistry.byAssetKey,
      solShieldAccount?.shieldedSolBalance,
      recentShieldedSolBalance,
      selectedSolAggregateAmount,
      spendableShieldNotesByLane,
      spendableSolNotes.length,
    ],
  );
  const selectedLaneDecimals =
    selectedLane === "SOL" ? 9 : getLiveShieldTokenAsset(selectedLane).decimals;
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
          }),
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
  ]);

  const authorizePendingOperatorRelease = useCallback(async () => {
    if (
      transitionWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      !walletAddress ||
      operatorAuthorizationStarted ||
      operatorAuthorizationLockRef.current === pendingSpentMarker.transitionNoteId ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    operatorAuthorizationLockRef.current = pendingSpentMarker.transitionNoteId;
    setOperatorAuthorizationStarted(true);
    setStatus("authorizing_operator");

    if (pendingSpentMarker.asset !== "SOL") {
      const pendingTokenAsset = getLiveShieldTokenAsset(pendingSpentMarker.asset);

      const unshieldPayload = createUnshieldIntentPayload({
        amount: pendingSpentMarker.amount,
        destinationOwner: walletAddress,
        mintAddress: pendingTokenAsset.mintAddress ?? "",
        noteId: pendingSpentMarker.consumedNoteId,
        owner: pendingSpentMarker.owner,
        requester: walletAddress,
        transitionNoteId: pendingSpentMarker.transitionNoteId,
        transitionStateSignature: transitionTransaction.signature ?? undefined,
        vaultOwner: pendingSpentMarker.vaultOwner,
      });

      void Promise.resolve(createTransitionAuthorizedUnshieldIntent(unshieldPayload))
        .then((intent) => requestOperatorUnshield(intent, pendingTokenAsset.unshieldOperatorUrl))
        .then(async ({ requestId, signature }) => {
          setOperatorReleaseSignature(signature);
          setLastCompletion((current) =>
            current ? { ...current, requestId } : current,
          );
          const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
            accountKeys: [
              pendingSpentMarker.assetId,
              pendingSpentMarker.consumedNoteId,
              pendingSpentMarker.owner,
              pendingSpentMarker.transitionNoteId,
              pendingSpentMarker.vaultOwner,
              walletAddress,
            ],
            action: "state_finalize",
          });
          const finalizationApproval = await spentMarkerTransaction.preflight({
            amount: pendingSpentMarker.amount,
            asset: pendingSpentMarker.asset,
            cluster: vantaSolanaCluster,
            explicitMainnetApproval: vantaExplicitMainnetApproval,
            connectedWalletAddress: pendingSpentMarker.owner,
            estimatedFees: "wallet-estimated",
            feePayer: pendingSpentMarker.owner,
            humanApprovedSummary: true,
            instructions: [
              ...priorityFeeInstructions,
              createSpentMarkerInstruction({
                asset: pendingSpentMarker.asset,
                assetId: pendingTokenAsset.mintAddress ?? "",
                consumedNoteId: pendingSpentMarker.consumedNoteId,
                createdAt: pendingSpentMarker.createdAt,
                mintAddress: pendingTokenAsset.mintAddress ?? undefined,
                owner: pendingSpentMarker.owner,
                transitionKind: "unshield",
                transitionNoteId: pendingSpentMarker.transitionNoteId,
                vaultOwner: pendingSpentMarker.vaultOwner,
              }),
            ],
            label: "unshield-spent-marker",
            recipient: pendingSpentMarker.vaultOwner,
            summaryInstructions: ["unshield-spent-marker"],
            transactionFingerprint: `unshield-spent-marker:${pendingSpentMarker.owner}:${pendingSpentMarker.consumedNoteId}:${pendingSpentMarker.transitionNoteId}`,
          });

          if (finalizationApproval.status === "blocked") {
            throw new Error(`The unshield spent marker is blocked before wallet approval: ${finalizationApproval.reason}.`);
          }

          setPendingFinalizationApproval(finalizationApproval);
          setStatus("release_ready");
        })
        .catch((error) => {
          setStatus("failed");
          setFlowError(
            error instanceof Error
              ? error.message
              : `The ${pendingSpentMarker.asset} unshield operator could not process the request.`,
          );
          setOperatorAuthorizationStarted(false);
          operatorAuthorizationLockRef.current = null;
          setPendingSpentMarker(null);
          setPendingUnshieldBridge(null);
        });

      return;
    }

    const solUnshieldPayload = createSolUnshieldIntentPayload({
      amount: pendingSpentMarker.amount,
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      consumedNoteId: pendingSpentMarker.consumedNoteId,
      destinationOwner: walletAddress,
      owner: pendingSpentMarker.owner,
      requester: walletAddress,
      transitionNoteId: pendingSpentMarker.transitionNoteId,
      transitionStateSignature: transitionTransaction.signature ?? undefined,
      vaultOwner: pendingSpentMarker.vaultOwner,
    });

    void Promise.resolve(createTransitionAuthorizedSolUnshieldIntent(solUnshieldPayload))
      .then((intent) => requestOperatorSolUnshield(intent))
      .then(async ({ requestId, signature }) => {
        setOperatorReleaseSignature(signature);
        setLastCompletion((current) =>
          current ? { ...current, requestId } : current,
        );
        const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
          accountKeys: [
            pendingSpentMarker.assetId,
            pendingSpentMarker.consumedNoteId,
            pendingSpentMarker.owner,
            pendingSpentMarker.transitionNoteId,
            pendingSpentMarker.vaultOwner,
            walletAddress,
          ],
          action: "state_finalize",
        });
        const finalizationApproval = await spentMarkerTransaction.preflight({
          amount: pendingSpentMarker.amount,
          asset: "SOL",
          cluster: vantaSolanaCluster,
          explicitMainnetApproval: vantaExplicitMainnetApproval,
          connectedWalletAddress: pendingSpentMarker.owner,
          estimatedFees: "wallet-estimated",
          feePayer: pendingSpentMarker.owner,
          humanApprovedSummary: true,
          instructions: [
            ...priorityFeeInstructions,
            createSpentMarkerInstruction({
              asset: "SOL",
              assetId: VANTA_NATIVE_SOL_ASSET_ID,
              consumedNoteId: pendingSpentMarker.consumedNoteId,
              createdAt: pendingSpentMarker.createdAt,
              owner: pendingSpentMarker.owner,
              transitionKind: "sol_unshield",
              transitionNoteId: pendingSpentMarker.transitionNoteId,
              vaultOwner: pendingSpentMarker.vaultOwner,
            }),
          ],
          label: "sol-unshield-spent-marker",
          recipient: pendingSpentMarker.vaultOwner,
          summaryInstructions: ["sol-unshield-spent-marker"],
          transactionFingerprint: `sol-unshield-spent-marker:${pendingSpentMarker.owner}:${pendingSpentMarker.consumedNoteId}:${pendingSpentMarker.transitionNoteId}`,
        });

        if (finalizationApproval.status === "blocked") {
          throw new Error(`The SOL unshield spent marker is blocked before wallet approval: ${finalizationApproval.reason}.`);
        }

        setPendingFinalizationApproval(finalizationApproval);
        setStatus("release_ready");
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The SOL unshield operator could not process the request.",
        );
        setOperatorAuthorizationStarted(false);
        operatorAuthorizationLockRef.current = null;
        setPendingSpentMarker(null);
        setPendingUnshieldBridge(null);
      });
  }, [
    operatorAuthorizationStarted,
    pendingSpentMarker,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
    transitionWait.waitStatus,
    transitionTransaction.signature,
    walletAddress,
    walletSession,
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
    const prepared = createPreparedUnshieldMemo({
      amount: args.note.amount.toString(),
      asset: args.shieldAsset.assetKey,
      consumedNoteId: args.note.noteId,
      createdAt,
      destinationOwner,
      mintAddress,
      owner: args.shieldAccount.owner,
      vaultOwner: args.shieldAccount.vaultOwner,
    });

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: args.shieldAsset.assetKey,
      assetId: mintAddress,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "unshield",
      transitionNoteId: prepared.noteId,
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
        noteId: prepared.noteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: args.shieldAsset.assetKey,
      transitionNoteId: prepared.noteId,
    });
    const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
      accountKeys: [
        args.note.noteId,
        mintAddress,
        args.shieldAccount.owner,
        prepared.noteId,
        args.shieldAccount.vaultOwner,
        walletAddress,
      ],
      action: "unshield_transition",
    });

    const instructions = [...priorityFeeInstructions, prepared.instruction];

    const transitionApproval = await transitionTransaction.preflight({
      amount: args.note.amount.toString(),
      asset: args.shieldAsset.assetKey,
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
      connectedWalletAddress: args.shieldAccount.owner,
      estimatedFees: "wallet-estimated",
      feePayer: args.shieldAccount.owner,
      humanApprovedSummary: true,
      instructions,
      label: "unshield-transition",
      recipient: walletAddress ?? args.shieldAccount.owner,
      summaryInstructions: ["unshield-transition"],
      transactionFingerprint: `unshield-transition:${args.shieldAccount.owner}:${args.note.noteId}:${prepared.noteId}`,
    });

    if (transitionApproval.status === "blocked") {
      throw new Error(`The unshield transition is blocked before wallet approval: ${transitionApproval.reason}.`);
    }

    setPendingTransitionApproval(transitionApproval);
    setStatus("transition_ready");
  }

  async function beginSolUnshieldFromNote(args: {
    note: NonNullable<typeof selectedSolNote>;
    shieldAccount: NonNullable<typeof usdcShieldEntry.account>;
  }) {
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
    const prepared = createPreparedSolUnshieldMemo({
      amount: args.note.amount.toString(),
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      consumedNoteId: args.note.noteId,
      createdAt,
      destinationOwner,
      owner: args.shieldAccount.owner,
      vaultOwner: args.shieldAccount.vaultOwner,
    });

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "sol_unshield",
      transitionNoteId: prepared.noteId,
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
        noteId: prepared.noteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: "SOL",
      transitionNoteId: prepared.noteId,
    });
    const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
      accountKeys: [
        args.note.noteId,
        liveSwapPair.solAssetId,
        args.shieldAccount.owner,
        prepared.noteId,
        args.shieldAccount.vaultOwner,
        walletAddress,
      ],
      action: "sol_unshield_transition",
    });

    const instructions = [...priorityFeeInstructions, prepared.instruction];

    const transitionApproval = await transitionTransaction.preflight({
      amount: args.note.amount.toString(),
      asset: "SOL",
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
      connectedWalletAddress: args.shieldAccount.owner,
      estimatedFees: "wallet-estimated",
      feePayer: args.shieldAccount.owner,
      humanApprovedSummary: true,
      instructions,
      label: "sol-unshield-transition",
      recipient: walletAddress ?? args.shieldAccount.owner,
      summaryInstructions: ["sol-unshield-transition"],
      transactionFingerprint: `sol-unshield-transition:${args.shieldAccount.owner}:${args.note.noteId}:${prepared.noteId}`,
    });

    if (transitionApproval.status === "blocked") {
      throw new Error(`The SOL unshield transition is blocked before wallet approval: ${transitionApproval.reason}.`);
    }

    setPendingTransitionApproval(transitionApproval);
    setStatus("transition_ready");
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
          const preparedSplit = createPreparedSendMemo({
            amount: requestedAmountNumeric.toString(),
            asset: "USDC",
            changeAmount: nextChangeAmount.toString(),
            consumedNoteId: selectedShieldNote.noteId,
            createdAt,
            mintAddress: selectedShieldAsset.mintAddress,
            owner: activeShieldAccount.owner,
            recipient: activeShieldAccount.owner,
            vaultOwner: activeShieldAccount.vaultOwner,
          });

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
    validationMessage = "Connect a wallet to use Public Wallet as the exit destination.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps Unshield visible but prevents live withdrawals while production services are offline.";
  } else if (
    shieldRegistry.configuredEntries.some(
      (entry) => entry.isRefreshing || entry.token.isFetching,
    )
  ) {
    validationMessage = "Refreshing wallet and Vanta state from devnet.";
  } else if (selectedLane === "SOL" && solShieldStateError) {
    validationMessage = solShieldStateError;
  } else if (selectedLane !== "SOL" && selectedShieldEntry?.error) {
    validationMessage = selectedShieldEntry.error;
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
    validationMessage = `No shielded ${selectedLane} balance is currently available to return.`;
  } else if (selectedLane === "SOL" && !selectedSolNote) {
    validationMessage = "No shielded SOL balance is currently available to return.";
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
    validationMessage = "Unshield amount cannot exceed the available shielded balance.";
  }

  return (
    <section className="send-page unshield-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Move out</span>
          <h2>Unshield</h2>
          <p>Move shielded funds back to your public wallet.</p>
        </div>

        <div className="module-state">
          <strong>Public exit</strong>
          <p>Use one shielded note and release funds once.</p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {[
          "Shield",
          "Hold",
          `Unshield ${selectedLane}`,
        ].map((step, index, steps) => (
          <div
            key={step}
            className={
              index === steps.length - 1
                ? "send-flow-step send-flow-step--active"
                : "send-flow-step"
            }
          >
            <span>{step}</span>
          </div>
        ))}
      </div>

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
              <span>Exit ticket</span>
              <h3>{selectedLane} to public wallet</h3>
            </div>
            <small>{formatUnshieldAmount(selectedFullAmount, selectedLane)} available</small>
          </div>

          <div className="unshield-balance-strip" aria-label="Available shielded balances">
            {availableLaneOptions.map((option) => (
              <button
                key={option.lane}
                className={
                  option.lane === selectedLane
                    ? "unshield-balance-pill unshield-balance-pill--active"
                    : option.hasSpendableBalance
                      ? "unshield-balance-pill unshield-balance-pill--available"
                      : "unshield-balance-pill"
                }
                type="button"
                onClick={() => {
                  setSelectedLane(option.lane);
                  setStatus("idle");
                  setFlowError(null);
                }}
              >
                <span>{formatShieldedLaneLabel(option.lane)}</span>
                <strong>{formatUnshieldAmount(option.amount, option.lane)}</strong>
              </button>
            ))}
          </div>

          <div className="shield-form swap-widget unshield-ticket">
            <div className="swap-module unshield-ticket__module">
              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--from">
                <div className="swap-module__label-row">
                  <span>Shielded asset</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Available: {formatUnshieldAmount(selectedFullAmount, selectedLane)}
                  </div>
                </div>
                <div className="send-asset-field">
                  <select
                    aria-label="Unshield asset"
                    value={selectedLane}
                    onChange={(event) => {
                      setSelectedLane(event.target.value as UnshieldLane);
                      setStatus("idle");
                      setFlowError(null);
                    }}
                  >
                    {availableLaneOptions.map((option) => (
                      <option key={option.lane} value={option.lane}>
                        {formatAvailableLaneLabel(option.lane, option.amount)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--to">
                <div className="swap-module__label-row">
                  <span>Destination</span>
                </div>
                <div className="unshield-fixed-field">
                  <strong>{walletAddressShort ?? "Connect wallet"}</strong>
                  <small>Public wallet</small>
                </div>
              </div>

              <div className="swap-module__field unshield-ticket__field unshield-ticket__field--amount">
                <div className="swap-module__label-row">
                  <span>Amount</span>
                </div>
                {selectedLane === "USDC" ? (
                  <div className="amount-field amount-field--solo">
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
                  </div>
                ) : (
                  <div className="unshield-fixed-field unshield-fixed-field--amount">
                    <strong>{formatEditableAmount(selectedFullAmount, selectedLaneDecimals)}</strong>
                    <small>{selectedLane} fixed note exit</small>
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
                  {isBetaMode ? "Beta mode" : "Move to public wallet"}
                </button>
              </div>
            </div>
          </div>

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Preparing wallet approval</span>
              <p>
                {requiresExactSplit
                  ? "Approve the private split so Vanta can isolate the exact USDC amount first."
                  : "Vanta is preparing and simulating the constrained unshield transition."}
              </p>
              {pendingUmbraApprovalDisplay && (
                <details className="shield-approval-review" aria-label="Wallet approval review">
                  <summary>
                    <span>Private rail approval</span>
                    <strong>{pendingUmbraApprovalDisplay.walletPrompt}</strong>
                  </summary>
                  <div className="shield-approval-review__rows">
                    {pendingUmbraApprovalDisplay.rows.slice(0, 4).map((row) => (
                      <div key={row.label}>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
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
            <div className="status-panel status-panel--processing">
              <span>Preparing exact amount</span>
              <p>Preparing the exact amount to move out.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "recording_transition" && (
            <div className="status-panel status-panel--processing">
              <span>Recording unshield transition</span>
              <p>Moving the selected shielded funds toward public release.</p>
              {transitionProgressLabel && (
                <p className="shield-helper shield-helper--meta">{transitionProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "finalizing_split" && (
            <div className="status-panel status-panel--processing">
              <span>Finalizing split state</span>
              <p>Recording the hidden split spent marker before the exact note is unshielded.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
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
              <span>Ready for release approval</span>
              <p>Approve the signed Unshield release request in your wallet to continue.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void authorizePendingOperatorRelease();
                }}
                disabled={operatorAuthorizationStarted}
              >
                Approve release in wallet
              </button>
            </div>
          )}

          {status === "authorizing_operator" && (
            <div className="status-panel status-panel--processing">
              <span>Authorizing public release</span>
              <p>Approve the public release for this {selectedLane} exit.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
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
            <div className="status-panel status-panel--processing">
              <span>Finalizing shielded state</span>
              <p>Recording the spent marker and refreshing Vanta state.</p>
              {finalizationProgressLabel && (
                <p className="shield-helper shield-helper--meta">{finalizationProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--warning">
              <span>Funds were not moved</span>
              <p>{flowError ?? "The exit did not complete. Try again."}</p>
            </div>
          )}

          {status === "complete" && lastCompletion && (
            <div className="status-panel status-panel--success">
              <span>
                {operatorReleaseSignature
                  ? `${lastCompletion.asset} unshield complete`
                  : `${lastCompletion.asset} exit transition recorded`}
              </span>
              <p>
                {operatorReleaseSignature
                  ? lastCompletion.asset === "SOL"
                    ? `${formatSolAmount(lastCompletion.amount)} returned to Public Wallet and the source shielded SOL note is now consumed.`
                    : `${formatShieldTokenAmount(lastCompletion.amount, lastCompletion.asset)} returned to Public Wallet and the source shielded ${lastCompletion.asset} note is no longer spendable.`
                  : lastCompletion.asset === "SOL"
                    ? `${formatSolAmount(lastCompletion.amount)} exit transition was recorded. Operator release is still pending.`
                    : `${formatShieldTokenAmount(lastCompletion.amount, lastCompletion.asset)} exit transition was recorded. Operator release is still pending.`}
              </p>
              <div className="preview-grid unshield-evidence-grid">
                <div className="preview-card preview-card--accent">
                  <span>Transaction evidence</span>
                  <strong>
                    {currentUnshieldTransactionEvidence.operator.status === "recorded"
                      ? "Proof-backed release record"
                      : currentUnshieldTransactionEvidence.wallet.status === "signature-recorded"
                        ? "Transition signature captured"
                        : "Pending operator release"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Operator release</span>
                  <strong>
                    {operatorReleaseSignature ? abbreviate(operatorReleaseSignature) : "Pending"}
                  </strong>
                </div>
              </div>
              <div className="review-list">
                <div className="review-row">
                  <span>Transition note</span>
                  <strong>{abbreviate(lastCompletion.transitionNoteId)}</strong>
                </div>
                <div className="review-row">
                  <span>Operator request</span>
                  <strong>{lastCompletion.requestId ? abbreviate(lastCompletion.requestId) : "Accepted"}</strong>
                </div>
                <div className="review-row">
                  <span>Settlement scope</span>
                  <strong>{currentUnshieldTransactionEvidence.settlement.status}</strong>
                </div>
              </div>
              <details className="unshield-completion-details">
                <summary>Operator workflow and export details</summary>
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
                <summary>Internal zk diagnostics</summary>
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
                      <span>Consumed live note</span>
                      <strong>{abbreviate(currentUnshieldZkDiagnostics.consumedLiveNoteId)}</strong>
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
                    {currentUnshieldZkDiagnostics.sourceSwapNoteId && (
                      <div className="review-row">
                        <span>Source swap note</span>
                        <strong>{abbreviate(currentUnshieldZkDiagnostics.sourceSwapNoteId)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="shield-helper shield-helper--meta">
                    No retained canonical unshield diagnostics are available yet for this client.
                  </p>
                )}
              </details>
              <div className="status-actions">
                <Link className="button button-primary" to="/app/shield">
                  Back to Home
                </Link>
                <Link className="button button-ghost" to="/app/swap">
                  Open Swap
                </Link>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
