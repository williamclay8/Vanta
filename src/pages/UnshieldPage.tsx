import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSendTransaction,
  useSplToken,
  useWalletSession,
} from "@solana/react-hooks";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  createSolUnshieldIntentPayload,
  signSolUnshieldIntent,
} from "@/solana/solUnshieldAuth";
import { requestOperatorSolUnshield } from "@/solana/solUnshieldOperatorClient";
import {
  getLiveShieldTokenAsset,
  liveShieldAsset,
  liveSwapPair,
  liveUsdcShieldAsset,
  SHIELD_HOOK_FALLBACK_MINT,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import {
  createUnshieldIntentPayload,
  signUnshieldIntent,
} from "@/solana/unshieldAuth";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
import { useVantaShieldAssetState } from "@/solana/useVantaShieldAssetState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  createPreparedSolUnshieldMemo,
  createPreparedUnshieldMemo,
  createSpentMarkerInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
} from "@/solana/vantaShieldState";
import {
  listCanonicalUnshieldDiagnosticsSummaries,
  recordCanonicalUnshieldFromLiveUnshield,
} from "@/zk/liveUnshieldBridge";

type UnshieldLane = LiveShieldTokenAssetKey | "SOL";
type UnshieldStatus =
  | "idle"
  | "review"
  | "awaiting_confirmation"
  | "recording_transition"
  | "authorizing_operator"
  | "finalizing_state"
  | "complete"
  | "failed";

type PendingSpentMarker = {
  asset: UnshieldLane;
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  owner: string;
  transitionKind: "unshield" | "sol_unshield";
  transitionNoteId: string;
  vaultOwner: string;
};

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
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatUnshieldNoteOption(args: {
  amount: number;
  asset: UnshieldLane;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const amountLabel =
    args.asset === "SOL"
      ? formatSolAmount(args.amount)
      : formatShieldTokenAmount(args.amount, args.asset);
  const parts = [amountLabel];

  if (args.primaryLabel) {
    parts.push(args.primaryLabel);
  }

  if (args.secondaryLabel) {
    parts.push(args.secondaryLabel);
  }

  return parts.join(" · ");
}

export function UnshieldPage() {
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
  const {
    account: vusdShieldAccount,
    error: vusdShieldStateError,
    isRefreshing: vusdShieldStateRefreshing,
    refresh: refreshVusdShieldState,
  } = useVantaShieldState();
  const {
    account: usdcShieldAccount,
    error: usdcShieldStateError,
    isRefreshing: usdcShieldStateRefreshing,
    refresh: refreshUsdcShieldState,
  } = useVantaShieldAssetState({
    mintAddress: liveUsdcShieldAsset.mintAddress,
    vaultOwner: liveUsdcShieldAsset.vaultOwner,
  });
  const supportedVusdToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    { config: { tokenProgram: "auto" } },
  );
  const supportedUsdcToken = useSplToken(
    liveUsdcShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    { config: { tokenProgram: "auto" } },
  );
  const [selectedLane, setSelectedLane] = useState<UnshieldLane>("VUSD");
  const [selectedVusdNoteId, setSelectedVusdNoteId] = useState<string | null>(null);
  const [selectedUsdcNoteId, setSelectedUsdcNoteId] = useState<string | null>(null);
  const [selectedSolNoteId, setSelectedSolNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingUnshieldBridge, setPendingUnshieldBridge] = useState<PendingUnshieldBridge | null>(null);
  const [releaseHandoffRefreshPending, setReleaseHandoffRefreshPending] = useState(false);
  const [releasePackageExportStatus, setReleasePackageExportStatus] = useState<
    "idle" | "summary-copy" | "json-copy" | "summary-download" | "json-download" | "failed"
  >("idle");
  const [unshieldBridgeError, setUnshieldBridgeError] = useState<string | null>(null);
  const [operatorAuthorizationStarted, setOperatorAuthorizationStarted] = useState(false);
  const [operatorReleaseSignature, setOperatorReleaseSignature] = useState<string | null>(null);
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
  const transitionTransaction = useSendTransaction();
  const transitionWait = useRealtimeSignatureProgress(
    transitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !transitionTransaction.signature,
    },
  );
  const spentMarkerTransaction = useSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );

  const spendableVusdNotes = vusdShieldAccount?.spendableShieldNotes ?? [];
  const spendableUsdcNotes = usdcShieldAccount?.spendableShieldNotes ?? [];
  const spendableSolNotes = vusdShieldAccount?.spendableShieldedSolNotes ?? [];

  useEffect(() => {
    if (!spendableVusdNotes.length) {
      setSelectedVusdNoteId(null);
      return;
    }

    if (
      !selectedVusdNoteId ||
      !spendableVusdNotes.some((note) => note.noteId === selectedVusdNoteId)
    ) {
      setSelectedVusdNoteId(spendableVusdNotes[0].noteId);
    }
  }, [selectedVusdNoteId, spendableVusdNotes]);

  useEffect(() => {
    if (!spendableUsdcNotes.length) {
      setSelectedUsdcNoteId(null);
      return;
    }

    if (
      !selectedUsdcNoteId ||
      !spendableUsdcNotes.some((note) => note.noteId === selectedUsdcNoteId)
    ) {
      setSelectedUsdcNoteId(spendableUsdcNotes[0].noteId);
    }
  }, [selectedUsdcNoteId, spendableUsdcNotes]);

  useEffect(() => {
    if (!spendableSolNotes.length) {
      setSelectedSolNoteId(null);
      return;
    }

    if (
      !selectedSolNoteId ||
      !spendableSolNotes.some((note) => note.noteId === selectedSolNoteId)
    ) {
      setSelectedSolNoteId(spendableSolNotes[0].noteId);
    }
  }, [selectedSolNoteId, spendableSolNotes]);

  useEffect(() => {
    const availableLanes = [
      spendableVusdNotes.length > 0 ? "VUSD" : null,
      spendableUsdcNotes.length > 0 ? "USDC" : null,
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
    spendableSolNotes.length,
    spendableUsdcNotes.length,
    spendableVusdNotes.length,
  ]);

  const selectedVusdNote = useMemo(() => {
    return spendableVusdNotes.find((note) => note.noteId === selectedVusdNoteId) ?? null;
  }, [selectedVusdNoteId, spendableVusdNotes]);
  const selectedUsdcNote = useMemo(() => {
    return spendableUsdcNotes.find((note) => note.noteId === selectedUsdcNoteId) ?? null;
  }, [selectedUsdcNoteId, spendableUsdcNotes]);
  const selectedSolNote = useMemo(() => {
    return spendableSolNotes.find((note) => note.noteId === selectedSolNoteId) ?? null;
  }, [selectedSolNoteId, spendableSolNotes]);

  const selectedShieldAsset =
    selectedLane === "SOL" ? null : getLiveShieldTokenAsset(selectedLane);
  const selectedShieldAccount =
    selectedLane === "VUSD"
      ? vusdShieldAccount
      : selectedLane === "USDC"
        ? usdcShieldAccount
        : null;
  const selectedShieldNote =
    selectedLane === "VUSD"
      ? selectedVusdNote
      : selectedLane === "USDC"
        ? selectedUsdcNote
        : null;
  const selectedAmount =
    selectedLane === "SOL"
      ? selectedSolNote?.amount ?? 0
      : selectedShieldNote?.amount ?? 0;
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
      label: "Send privately",
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
  const isReady =
    walletConnected &&
    Boolean(walletAddress) &&
    Boolean(walletSession?.signMessage) &&
    canUseLane &&
    Boolean(liveShieldAsset.vaultOwner) &&
    (selectedLane === "SOL"
      ? Boolean(liveSwapPair.solUnshieldOperatorUrl)
      : Boolean(selectedShieldAsset?.mintAddress) && Boolean(selectedShieldAsset?.unshieldConfigured));

  useEffect(() => {
    if (transitionTransaction.status === "loading") {
      setStatus("recording_transition");
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
  }, [transitionTransaction.error, transitionTransaction.status]);

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
    if (
      transitionWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      !walletAddress ||
      !walletSession?.signMessage ||
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

      void signUnshieldIntent(
        createUnshieldIntentPayload({
          amount: selectedAmount.toString(),
          destinationOwner: walletAddress,
          mintAddress: pendingTokenAsset.mintAddress ?? "",
          noteId: pendingSpentMarker.consumedNoteId,
          owner: pendingSpentMarker.owner,
          requester: walletAddress,
          transitionNoteId: pendingSpentMarker.transitionNoteId,
          transitionStateSignature: transitionTransaction.signature ?? undefined,
          vaultOwner: pendingSpentMarker.vaultOwner,
        }),
        walletSession.signMessage,
      )
        .then((signedIntent) =>
          requestOperatorUnshield(signedIntent, pendingTokenAsset.unshieldOperatorUrl),
        )
        .then(({ requestId, signature }) => {
          setOperatorReleaseSignature(signature);
          setLastCompletion((current) =>
            current ? { ...current, requestId } : current,
          );
          setStatus("finalizing_state");
          return buildHeliusPriorityFeeInstructions({
            accountKeys: [
              pendingSpentMarker.assetId,
              pendingSpentMarker.consumedNoteId,
              pendingSpentMarker.owner,
              pendingSpentMarker.transitionNoteId,
              pendingSpentMarker.vaultOwner,
              walletAddress,
            ],
            action: "state_finalize",
          }).then((priorityFeeInstructions) =>
            spentMarkerTransaction.send({
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
            }),
          );
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

    void signSolUnshieldIntent(
      createSolUnshieldIntentPayload({
        amount: selectedAmount.toString(),
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        consumedNoteId: pendingSpentMarker.consumedNoteId,
        destinationOwner: walletAddress,
        owner: pendingSpentMarker.owner,
        requester: walletAddress,
        transitionNoteId: pendingSpentMarker.transitionNoteId,
        vaultOwner: pendingSpentMarker.vaultOwner,
      }),
      walletSession.signMessage,
    )
      .then((signedIntent) => requestOperatorSolUnshield(signedIntent))
      .then(({ requestId, signature }) => {
        setOperatorReleaseSignature(signature);
        setLastCompletion((current) =>
          current ? { ...current, requestId } : current,
        );
        setStatus("finalizing_state");
        return buildHeliusPriorityFeeInstructions({
          accountKeys: [
            pendingSpentMarker.assetId,
            pendingSpentMarker.consumedNoteId,
            pendingSpentMarker.owner,
            pendingSpentMarker.transitionNoteId,
            pendingSpentMarker.vaultOwner,
            walletAddress,
          ],
          action: "state_finalize",
        }).then((priorityFeeInstructions) =>
          spentMarkerTransaction.send({
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
          }),
        );
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
    selectedAmount,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
    transitionWait.waitStatus,
    walletAddress,
    walletSession,
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

    const refreshTasks = [
      refreshVusdShieldState(),
      refreshUsdcShieldState(),
      supportedVusdToken.refresh(),
      supportedUsdcToken.refresh(),
    ];

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
    refreshUsdcShieldState,
    refreshVusdShieldState,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    supportedUsdcToken,
    supportedVusdToken,
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

  async function handleUnshield() {
    const activeShieldAccount = selectedLane === "SOL" ? vusdShieldAccount : selectedShieldAccount;

    if (!activeShieldAccount || !liveShieldAsset.vaultOwner) {
      return;
    }

    transitionTransaction.reset();
    spentMarkerTransaction.reset();
    setOperatorReleaseSignature(null);
    setLastTransitionSignature(null);
    setLastSpentMarkerSignature(null);
    setFlowError(null);
    setUnshieldBridgeError(null);
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingUnshieldBridge(null);
    setStatus("awaiting_confirmation");

    try {
      const createdAt = Date.now();

      if (selectedLane !== "SOL") {
        if (!selectedShieldNote || !selectedShieldAsset?.mintAddress) {
          return;
        }

        const prepared = createPreparedUnshieldMemo({
          amount: selectedShieldNote.amount.toString(),
          asset: selectedLane,
          consumedNoteId: selectedShieldNote.noteId,
          createdAt,
          destinationOwner: walletAddress ?? activeShieldAccount.owner,
          mintAddress: selectedShieldAsset.mintAddress,
          owner: activeShieldAccount.owner,
          vaultOwner: activeShieldAccount.vaultOwner,
        });

        setPendingSpentMarker({
          asset: selectedLane,
          assetId: selectedShieldAsset.mintAddress,
          consumedNoteId: selectedShieldNote.noteId,
          createdAt,
          owner: activeShieldAccount.owner,
          transitionKind: "unshield",
          transitionNoteId: prepared.noteId,
          vaultOwner: activeShieldAccount.vaultOwner,
        });
        setPendingUnshieldBridge({
          amountDisplay: selectedShieldNote.amount.toFixed(2),
          asset: selectedLane,
          assetId: selectedShieldAsset.mintAddress,
          createdAt,
          destinationOwner: walletAddress ?? activeShieldAccount.owner,
          mintAddress: selectedShieldAsset.mintAddress,
          owner: activeShieldAccount.owner,
          consumed: {
            noteId: selectedShieldNote.noteId,
            stateSignature: selectedShieldNote.stateSignature,
          },
          transition: {
            noteId: prepared.noteId,
          },
          vaultOwner: activeShieldAccount.vaultOwner,
        });
        setLastCompletion({
          amount: selectedShieldNote.amount,
          asset: selectedLane,
          transitionNoteId: prepared.noteId,
        });
        const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
          accountKeys: [
            selectedShieldNote.noteId,
            selectedShieldAsset.mintAddress,
            activeShieldAccount.owner,
            prepared.noteId,
            activeShieldAccount.vaultOwner,
            walletAddress,
          ],
          action: "unshield_transition",
        });

        await transitionTransaction.send({
          instructions: [...priorityFeeInstructions, prepared.instruction],
        });
        return;
      }

      if (!selectedSolNote) {
        return;
      }

      const prepared = createPreparedSolUnshieldMemo({
        amount: selectedSolNote.amount.toString(),
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        consumedNoteId: selectedSolNote.noteId,
        createdAt,
        destinationOwner: walletAddress ?? activeShieldAccount.owner,
        owner: activeShieldAccount.owner,
        vaultOwner: activeShieldAccount.vaultOwner,
      });

      setPendingSpentMarker({
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        consumedNoteId: selectedSolNote.noteId,
        createdAt,
        owner: activeShieldAccount.owner,
        transitionKind: "sol_unshield",
        transitionNoteId: prepared.noteId,
        vaultOwner: activeShieldAccount.vaultOwner,
      });
      setPendingUnshieldBridge({
        amountDisplay: selectedSolNote.amount.toFixed(6),
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        createdAt,
        destinationOwner: walletAddress ?? activeShieldAccount.owner,
        owner: activeShieldAccount.owner,
        consumed: {
          noteId: selectedSolNote.noteId,
          stateSignature: selectedSolNote.stateSignature,
          sourceSwapNoteId: selectedSolNote.sourceSwapNoteId,
        },
        transition: {
          noteId: prepared.noteId,
        },
        vaultOwner: activeShieldAccount.vaultOwner,
      });
      setLastCompletion({
        amount: selectedSolNote.amount,
        asset: "SOL",
        transitionNoteId: prepared.noteId,
      });
      const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
        accountKeys: [
          selectedSolNote.noteId,
          liveSwapPair.solAssetId,
          activeShieldAccount.owner,
          prepared.noteId,
          activeShieldAccount.vaultOwner,
          walletAddress,
        ],
        action: "sol_unshield_transition",
      });

      await transitionTransaction.send({
        instructions: [...priorityFeeInstructions, prepared.instruction],
      });
    } catch (error) {
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Unshield request was not approved.",
      );
    }
  }

  let validationMessage =
    selectedLane === "SOL"
      ? "Unshield SOL returns one full shielded SOL note created by Swap back to Public Wallet through the constrained operator path."
      : `Unshield ${selectedLane} returns one full spendable shielded ${selectedLane} note to Public Wallet through the constrained operator path.`

  if (!walletConnected) {
    validationMessage = "Connect a wallet to use Public Wallet as the exit destination.";
  } else if (
    vusdShieldStateRefreshing ||
    usdcShieldStateRefreshing ||
    supportedVusdToken.isFetching ||
    supportedUsdcToken.isFetching
  ) {
    validationMessage = "Refreshing wallet and Vanta state from devnet.";
  } else if ((selectedLane === "VUSD" && vusdShieldStateError) || (selectedLane === "SOL" && vusdShieldStateError)) {
    validationMessage = vusdShieldStateError;
  } else if (selectedLane === "USDC" && usdcShieldStateError) {
    validationMessage = usdcShieldStateError;
  } else if (!walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing to authorize Unshield.";
  } else if (selectedLane === "VUSD" && !selectedVusdNote) {
    validationMessage = "No spendable VUSD note is currently available for unshield.";
  } else if (selectedLane === "USDC" && !selectedUsdcNote) {
    validationMessage = "No spendable USDC note is currently available for unshield.";
  } else if (selectedLane === "SOL" && !selectedSolNote) {
    validationMessage = "No shielded SOL note is currently available for the SOL exit lane.";
  }

  return (
    <section className="send-page unshield-page">
      <div className="module-page__hero send-page__hero">
        <div>
          <span className="eyebrow">Live</span>
          <h2>Unshield</h2>
          <p>
            Return one constrained private state back to public wallet flow.
            Vanta supports both `VUSD` exit and the first shielded `SOL` exit lane.
          </p>
        </div>

        <div className="module-state">
          <strong>Workflow role</strong>
          <p>
            Unshield closes the lane cleanly. Shielded token notes return to public
            wallet flow, and `SOL` exits through the operator-backed swap release path.
          </p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {[
          "Public Wallet",
          "Shield",
          "Shielded State",
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

      <article className="send-card" style={{ marginBottom: 24 }}>
        <div className="shield-card__header">
        <div>
          <span>Vanta Private Core v0.1</span>
          <h3>Private money demo lane</h3>
        </div>
          <small>
            {privateCoreRecentShield
              ? privateCoreOperatorBoundaryStatusLabel ?? "Ready for consume"
              : "Shield first"}
          </small>
        </div>

        <p className="shield-review-note">
          This lane uses Vanta Private Core for note recovery, witness state,
          one-time consume, and replay rejection before value returns to public flow.
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
            {privateCoreActionPending ? "Generating proof..." : "Unshield private core note"}
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
                  : "Private core unshield status"}
            </span>
            <p>
              {privateCoreUnshieldState.consumeSucceeded
                ? "Funds unshielded successfully."
                : privateCoreUnshieldState.replayRejected
                  ? privateCoreUnshieldState.errorMessage ?? "Replay was rejected."
                  : privateCoreUnshieldState.errorMessage ?? "The private core lane is waiting for the next action."}
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

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Unshield</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Asset</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Exit amount: {formatUnshieldAmount(selectedAmount, selectedLane)}
                  </div>
                </div>
                <div className="swap-choice-row" role="group" aria-label="Unshield asset">
                  {(["VUSD", "USDC", "SOL"] as UnshieldLane[]).map((lane) => (
                    <button
                      key={lane}
                      className={
                        lane === selectedLane
                          ? "swap-choice-chip swap-choice-chip--active"
                          : "swap-choice-chip"
                      }
                      type="button"
                      aria-pressed={lane === selectedLane}
                      onClick={() => {
                        setSelectedLane(lane);
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      {lane}
                    </button>
                  ))}
                </div>
              </div>

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Eligible note</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Destination: {walletAddressShort ?? "Connect wallet"}
                  </div>
                </div>
                <div className="send-entry-grid">
                  <div className="send-asset-field">
                    <select
                      aria-label="Eligible note"
                      value={
                        selectedLane === "VUSD"
                          ? selectedVusdNoteId ?? ""
                          : selectedLane === "USDC"
                            ? selectedUsdcNoteId ?? ""
                            : selectedSolNoteId ?? ""
                      }
                      onChange={(event) => {
                        const nextValue = event.target.value || null;
                        if (selectedLane === "VUSD") {
                          setSelectedVusdNoteId(nextValue);
                        } else if (selectedLane === "USDC") {
                          setSelectedUsdcNoteId(nextValue);
                        } else {
                          setSelectedSolNoteId(nextValue);
                        }
                        setStatus("idle");
                        setFlowError(null);
                      }}
                      disabled={
                        selectedLane === "VUSD"
                          ? spendableVusdNotes.length === 0
                          : selectedLane === "USDC"
                            ? spendableUsdcNotes.length === 0
                            : spendableSolNotes.length === 0
                      }
                    >
                      {(selectedLane === "VUSD"
                        ? spendableVusdNotes
                        : selectedLane === "USDC"
                          ? spendableUsdcNotes
                          : spendableSolNotes).length === 0 ? (
                        <option value="">
                          {selectedLane === "VUSD"
                            ? "No spendable VUSD notes"
                            : selectedLane === "USDC"
                              ? "No spendable USDC notes"
                              : "No shielded SOL notes"}
                        </option>
                      ) : selectedLane === "VUSD" ? (
                        spendableVusdNotes.map((note) => (
                          <option key={note.noteId} value={note.noteId}>
                            {formatUnshieldNoteOption({
                              amount: note.amount,
                              asset: "VUSD",
                              primaryLabel: note.origin === "change" ? "Change note" : "Deposit note",
                            })}
                          </option>
                        ))
                      ) : selectedLane === "USDC" ? (
                        spendableUsdcNotes.map((note) => (
                          <option key={note.noteId} value={note.noteId}>
                            {formatUnshieldNoteOption({
                              amount: note.amount,
                              asset: "USDC",
                              primaryLabel: note.origin === "change" ? "Change note" : "Deposit note",
                            })}
                          </option>
                        ))
                      ) : (
                        spendableSolNotes.map((note) => (
                          <option key={note.noteId} value={note.noteId}>
                            {formatUnshieldNoteOption({
                              amount: note.amount,
                              asset: "SOL",
                              primaryLabel: "Swap output note",
                              secondaryLabel: note.sourceSwapNoteId ? "Recovered from swap" : undefined,
                            })}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <p className="shield-helper">{validationMessage}</p>

              <div className="shield-form__actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleUnshield();
                  }}
                  disabled={!isReady || status === "recording_transition" || status === "finalizing_state"}
                >
                  {selectedLane === "SOL"
                    ? "Return SOL to Public Wallet"
                    : `Return ${selectedLane} to Public Wallet`}
                </button>
              </div>
            </div>
          </div>

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>Approve the constrained unshield transition for the selected note.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "recording_transition" && (
            <div className="status-panel status-panel--processing">
              <span>Recording unshield transition</span>
              <p>Submitting the selected Vanta unshield transition on devnet.</p>
              {transitionProgressLabel && (
                <p className="shield-helper shield-helper--meta">{transitionProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "authorizing_operator" && (
            <div className="status-panel status-panel--processing">
              <span>Authorizing operator release</span>
              <p>
                Sending the wallet-authenticated {selectedLane} unshield intent to the
                constrained operator so it can verify and release the selected note.
              </p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
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
              <span>Unshield did not complete</span>
              <p>{flowError ?? "The constrained exit flow encountered an issue."}</p>
            </div>
          )}

          {status === "complete" && lastCompletion && (
            <div className="status-panel status-panel--success">
              <span>{`${lastCompletion.asset} unshield complete`}</span>
              <p>
                {lastCompletion.asset === "SOL"
                  ? `${formatSolAmount(lastCompletion.amount)} returned to Public Wallet and the source shielded SOL note is now consumed.`
                  : `${formatShieldTokenAmount(lastCompletion.amount, lastCompletion.asset)} returned to Public Wallet and the source shielded ${lastCompletion.asset} note is no longer spendable.`}
              </p>
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
                  <span>Transition note</span>
                  <strong>{abbreviate(lastCompletion.transitionNoteId)}</strong>
                </div>
                <div className="review-row">
                  <span>Operator request</span>
                  <strong>{lastCompletion.requestId ? abbreviate(lastCompletion.requestId) : "Accepted"}</strong>
                </div>
                <div className="review-row">
                  <span>Operator release</span>
                  <strong>{operatorReleaseSignature ? abbreviate(operatorReleaseSignature) : "Pending"}</strong>
                </div>
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
                <Link className="button button-primary" to="/app">
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
