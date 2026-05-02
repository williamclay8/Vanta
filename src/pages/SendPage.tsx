import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sha256 } from "@noble/hashes/sha2";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { isBetaMode } from "@/config/deploymentMode";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  getShieldedSendAssetCapability,
  listShieldedSendAssetOptions,
  type ShieldedSendAssetKey,
} from "@/solana/shieldedSendCapability";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  liveShieldAsset,
  type LiveShieldTokenAssetKey,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import {
  createPreparedSendMemo,
  createSpentMarkerInstruction,
  type VantaShieldAccountState,
  type VantaShieldNote,
} from "@/solana/vantaShieldState";
import {
  listCanonicalSendDiagnosticsSummaries,
  recordCanonicalSendFromLiveSend,
} from "@/zk/liveSendBridge";
import {
  buildVantaPrivateCoreSendProofEnvelope,
  buildVantaPrivateCoreSendTransition,
  deriveVantaPrivateCoreSourceArtifactsFromHeldNote,
  summarizeVantaPrivateCoreSendProofEnvelopeConsistency,
  summarizeVantaPrivateCoreSendProofEnvelopeVerification,
  type SendTransitionV0,
  type Bytes32Hex,
} from "@/zk/vantaPrivateCore";
import { buildVantaPrivateCoreSendProofBoundary } from "@/zk/vantaPrivateCoreSendProof";
import { buildVantaPrivateCoreUnshieldProofBoundary } from "@/zk/vantaPrivateCoreUnshieldProof";
import {
  requestVantaPrivateCoreOperatorSendTransition,
} from "@/zk/vantaPrivateCoreOperatorClient";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";

type SendPageProps = {
  dashboard?: boolean;
};

type PendingSpentMarker = {
  consumedNoteId: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  transitionKind: "send";
  transitionNoteId: string;
  vaultOwner: string;
};

type PendingSendBridge = {
  changeAmountDisplay: string;
  createdAt: number;
  predecessor: {
    amountDisplay: string;
    noteId: string;
    stateSignature: string;
  };
  recipient: string;
  sentAmountDisplay: string;
  transition: {
    changeNoteId?: string;
    noteId: string;
  };
};

type PrivateCoreSendPreview = {
  boundary: ReturnType<typeof buildVantaPrivateCoreSendProofBoundary>;
  changeAmountBaseUnits: string;
  recipientPublicKey: Bytes32Hex;
  sendAmountBaseUnits: string;
  sourceConsistencyLabel: string;
  sourceVerificationLabel: string;
  transition: SendTransitionV0;
};

type PrivateCoreSendExecutionState = {
  errorMessage: string | null;
  latestProofAction: string | null;
  latestProofId: string | null;
  latestSendId: string | null;
  proofFieldCount: number | null;
  proofPublicInputCount: number | null;
  status: "idle" | "running" | "verified" | "failed";
};

const DEFAULT_USDC_DECIMALS = 6;

function getInitialSendAsset(asset: PrivacyAssetKey | undefined): ShieldedSendAssetKey {
  return asset ?? "USDC";
}

function formatBalance(value: number, symbol: PrivacyAssetKey) {
  if (symbol === "USDC") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  }

  if (symbol === "BONK") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} ${symbol}`;
  }

  if (symbol === "SOL") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    })} ${symbol}`;
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} ${symbol}`;
}

function abbreviate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatOperatorSummaryFreshness(value: number | null) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SendPage({ dashboard = false }: SendPageProps) {
  const {
    ensurePrivateCoreOperatorRootKnown,
    privateCoreHoldState,
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorCurrentRootLinkedProof,
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
    privateCoreOperatorCurrentRootProofLinkStatus,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestConsumeProof,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorLatestSend,
    privateCoreOperatorLatestSendLinkedProof,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorLatestSwap,
    privateCoreOperatorLatestSwapLinkedProof,
    privateCoreOperatorLatestSwapProof,
    privateCoreOperatorOwnerAuthorizationMode,
    privateCoreOperatorNullifierKeyMode,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSwapLinkStatus,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorSendResultingRootRecord,
    privateCoreOperatorSendResultingRootLinkedProof,
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
    privateCoreOperatorProvingHashLane,
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
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSwaps,
    privateCoreOperatorSwapProofs,
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
    privateCoreOperatorOwnerAuthorizationDecision,
    privateCoreOperatorOwnerAuthorizationDecisionNote,
    privateCoreOperatorSourceArtifactTruthBasis,
    privateCoreOperatorProvingArtifactTruthBasis,
    privateCoreOperatorSourceProvingRelationship,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreOwner,
    privateCoreRecentShield,
    recentShield,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    privateCoreSendState,
    privateCoreSwapState,
    privateCoreUnshieldState,
    previewPrivateCoreSendTransition,
    refreshPrivateCoreOperatorSummary,
    runPrivateCoreSendTransition,
  } = usePrivacyFlow();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const shieldAssetRegistry = useVantaShieldAssetRegistryState();
  const baseSendShieldedAssetOptions = useMemo(() => listShieldedSendAssetOptions(), []);
  const [selectedAsset, setSelectedAsset] = useState<ShieldedSendAssetKey>(
    getInitialSendAsset(recentShield?.asset),
  );
  const [recipient, setRecipient] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<
    "idle" | "review" | "awaiting_confirmation" | "sending" | "settling" | "complete" | "failed"
  >("idle");
  const [releaseHandoffRefreshPending, setReleaseHandoffRefreshPending] = useState(false);
  const [releasePackageExportStatus, setReleasePackageExportStatus] = useState<
    "idle" | "summary-copy" | "json-copy" | "summary-download" | "json-download" | "failed"
  >("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [lastRecipient, setLastRecipient] = useState<string | null>(null);
  const [lastSentAmount, setLastSentAmount] = useState<number | null>(null);
  const [lastChangeAmount, setLastChangeAmount] = useState<number | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingSendBridge, setPendingSendBridge] = useState<PendingSendBridge | null>(null);
  const [privateCoreSendExecution, setPrivateCoreSendExecution] =
    useState<PrivateCoreSendExecutionState>({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "idle",
    });
  const sendNoteTransaction = useVantaSafeSendTransaction();
  const sendNoteWait = useRealtimeSignatureProgress(sendNoteTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !sendNoteTransaction.signature,
  });
  const spentMarkerTransaction = useVantaSafeSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );

  const selectedSendCapability = useMemo(
    () => getShieldedSendAssetCapability(selectedAsset),
    [selectedAsset],
  );
  const shieldedSolSourceEntry =
    shieldAssetRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
    shieldAssetRegistry.entries.find(
      (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
    ) ??
    null;
  const shieldedSolSourceAccount = shieldedSolSourceEntry?.account ?? shieldAccount;
  const selectedShieldAssetEntry =
    selectedAsset === "SOL" ? null : shieldAssetRegistry.byAssetKey[selectedAsset];
  const selectedShieldAccount =
    selectedAsset === "SOL"
      ? shieldedSolSourceAccount
      : selectedAsset === "USDC"
        ? shieldAccount
        : selectedShieldAssetEntry?.account ?? null;
  const getShieldedSendAssetBalance = useCallback(
    (asset: ShieldedSendAssetKey) => {
      if (asset === "SOL") {
        return shieldedSolSourceAccount?.shieldedSolBalance ?? 0;
      }

      if (asset === "USDC") {
        return shieldAccount?.balance ?? 0;
      }

      return shieldAssetRegistry.byAssetKey[asset]?.account?.balance ?? 0;
    },
    [
      shieldAccount?.balance,
      shieldAssetRegistry.byAssetKey,
      shieldedSolSourceAccount?.shieldedSolBalance,
    ],
  );
  const getShieldedSendAssetSpendableNoteCount = useCallback(
    (asset: ShieldedSendAssetKey) => {
      if (asset === "SOL") {
        return shieldedSolSourceAccount?.spendableShieldedSolNotes.length ?? 0;
      }

      if (asset === "USDC") {
        return shieldAccount?.spendableShieldNotes.length ?? 0;
      }

      return shieldAssetRegistry.byAssetKey[asset]?.account?.spendableShieldNotes.length ?? 0;
    },
    [
      shieldAccount?.spendableShieldNotes.length,
      shieldAssetRegistry.byAssetKey,
      shieldedSolSourceAccount?.spendableShieldedSolNotes.length,
    ],
  );
  const sendShieldedAssetOptions = useMemo(
    () =>
      baseSendShieldedAssetOptions
        .map((asset, index) => {
          const capability = getShieldedSendAssetCapability(asset.symbol);
          const spendableNoteCount = getShieldedSendAssetSpendableNoteCount(asset.symbol);

          return {
            ...asset,
            balance: getShieldedSendAssetBalance(asset.symbol),
            executable: capability.status === "live",
            index,
            ready: capability.status === "live" && spendableNoteCount > 0,
            spendableNoteCount,
          };
        })
        .sort((left, right) => {
          if (left.ready !== right.ready) {
            return left.ready ? -1 : 1;
          }

          if (left.spendableNoteCount !== right.spendableNoteCount) {
            return right.spendableNoteCount - left.spendableNoteCount;
          }

          if (left.executable !== right.executable) {
            return left.executable ? -1 : 1;
          }

          if (left.balance !== right.balance) {
            return right.balance - left.balance;
          }

          return left.index - right.index;
        }),
    [
      baseSendShieldedAssetOptions,
      getShieldedSendAssetBalance,
      getShieldedSendAssetSpendableNoteCount,
    ],
  );

  const spendableNotes = useMemo(() => {
    return selectedAsset === "SOL"
      ? selectedShieldAccount?.spendableShieldedSolNotes ?? []
      : selectedShieldAccount?.spendableShieldNotes ?? [];
  }, [selectedAsset, selectedShieldAccount]);

  useEffect(() => {
    if (spendableNotes.length > 0) {
      return;
    }

    const preferredReadyAsset = sendShieldedAssetOptions.find((asset) => asset.ready);

    if (!preferredReadyAsset || preferredReadyAsset.symbol === selectedAsset) {
      return;
    }

    setSelectedAsset(preferredReadyAsset.symbol);
    setStatus("idle");
    setFlowError(null);
  }, [selectedAsset, sendShieldedAssetOptions, spendableNotes.length]);

  useEffect(() => {
    if (!spendableNotes.length) {
      setSelectedNoteId(null);
      setAmount("");
      return;
    }

    if (
      !selectedNoteId ||
      !spendableNotes.some((note) => note.noteId === selectedNoteId)
    ) {
      const nextSelectedNote = spendableNotes[0];
      setSelectedNoteId(nextSelectedNote.noteId);
      setAmount("");
    }
  }, [selectedNoteId, spendableNotes]);

  const selectedSpendableNote = useMemo(() => {
    return spendableNotes.find((note) => note.noteId === selectedNoteId) ?? null;
  }, [selectedNoteId, spendableNotes]);

  const selectedBalance =
    selectedAsset === "SOL"
      ? selectedShieldAccount?.shieldedSolBalance ?? 0
      : selectedShieldAccount?.balance ?? 0;
  const parsedAmount = Number(amount);
  const maxNoteAmount = selectedSpendableNote?.amount ?? 0;
  const changeAmount =
    selectedSpendableNote && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Number(Math.max(selectedSpendableNote.amount - parsedAmount, 0).toFixed(6))
      : 0;
  const isAmountValid =
    Boolean(selectedSpendableNote) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxNoteAmount;
  const isRecipientValid = recipient.trim().length >= 8;
  const isRealSendReady =
    selectedSendCapability.status === "live" &&
    Boolean(selectedSpendableNote) &&
    isAmountValid &&
    isRecipientValid &&
    Boolean(liveShieldAsset.mintAddress);
  const sendProgressLabel = sendNoteWait.detailLabel;
  const settleProgressLabel = spentMarkerWait.detailLabel;
  const privateCoreSendPreview = useMemo<PrivateCoreSendPreview | null>(() => {
    if (
      selectedAsset !== "USDC" ||
      !privateCoreHoldState ||
      !isRecipientValid ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return null;
    }

    try {
      const sendAmountBaseUnits = decimalToBaseUnitsExact(amount, DEFAULT_USDC_DECIMALS);
      if (sendAmountBaseUnits > privateCoreHoldState.heldNote.note.amount) {
        return null;
      }

      const recipientPublicKey = derivePrivateCoreRecipientPublicKey(recipient.trim());
      const transition = buildVantaPrivateCoreSendTransition({
        input: privateCoreHoldState.heldNote,
        sendAmount: sendAmountBaseUnits,
        recipientOwnerPublicKey: recipientPublicKey,
      });
      const envelope = buildVantaPrivateCoreSendProofEnvelope(transition);
      const sourceVerification = summarizeVantaPrivateCoreSendProofEnvelopeVerification(envelope);
      const sourceConsistency = summarizeVantaPrivateCoreSendProofEnvelopeConsistency({
        envelope,
        sourceArtifacts: deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
          privateCoreHoldState.heldNote,
        ),
        expectedNullifier: envelope.publicInputs.inputNullifier,
      });
      const boundary = buildVantaPrivateCoreSendProofBoundary({
        senderSecretKey: privateCoreOwner.secretKey,
        transition,
      });

      return {
        boundary,
        changeAmountBaseUnits: transition.change?.note.amount.toString(10) ?? "0",
        recipientPublicKey,
        sendAmountBaseUnits: sendAmountBaseUnits.toString(10),
        sourceConsistencyLabel: sourceConsistency.overallStatusLabel,
        sourceVerificationLabel: sourceVerification.statusLabel,
        transition,
      };
    } catch {
      return null;
    }
  }, [
    amount,
    isRecipientValid,
    parsedAmount,
    privateCoreHoldState,
    privateCoreOwner.secretKey,
    recipient,
    selectedAsset,
  ]);
  const isPrivateCoreUsdcSendReady =
    selectedAsset === "USDC" &&
    selectedSendCapability.executionMode === "operator-usdc-send" &&
    selectedSendCapability.status === "live" &&
    privateCoreSendPreview?.boundary.readiness === "ready";

  const recentShieldLabel =
    recentShield &&
    `${formatBalance(recentShield.amount, recentShield.asset)} shielded`;
  const sendZkDiagnostics = listCanonicalSendDiagnosticsSummaries().slice(0, 5);

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

  useEffect(() => {
    setPrivateCoreSendExecution({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "idle",
    });
  }, [amount, privateCoreHoldState, recipient, selectedAsset]);

  useEffect(() => {
    if (sendNoteTransaction.status === "loading") {
      setStatus("sending");
    } else if (sendNoteTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        sendNoteTransaction.error instanceof Error
          ? sendNoteTransaction.error.message
          : "The Vanta send record could not be submitted.",
      );
      setPendingSpentMarker(null);
      setPendingSendBridge(null);
    } else if (sendNoteTransaction.signature) {
      setStatus("settling");
    }
  }, [
    sendNoteTransaction.error,
    sendNoteTransaction.signature,
    sendNoteTransaction.status,
  ]);

  useEffect(() => {
    if (sendNoteWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      sendNoteWait.waitError instanceof Error
        ? sendNoteWait.waitError.message
        : "The Vanta send record was submitted but not confirmed.",
    );
    setPendingSpentMarker(null);
    setPendingSendBridge(null);
  }, [sendNoteWait.waitError, sendNoteWait.waitStatus]);

  useEffect(() => {
    if (
      sendNoteWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("settling");
    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        pendingSpentMarker.consumedNoteId,
        pendingSpentMarker.mintAddress,
        pendingSpentMarker.owner,
        pendingSpentMarker.transitionNoteId,
        pendingSpentMarker.vaultOwner,
        recipient.trim(),
      ],
      action: "state_finalize",
    })
      .then((priorityFeeInstructions) => {
        const instructions = [
          ...priorityFeeInstructions,
          createSpentMarkerInstruction({
            asset: "USDC",
            consumedNoteId: pendingSpentMarker.consumedNoteId,
            createdAt: pendingSpentMarker.createdAt,
            mintAddress: pendingSpentMarker.mintAddress,
            owner: pendingSpentMarker.owner,
            transitionKind: pendingSpentMarker.transitionKind,
            transitionNoteId: pendingSpentMarker.transitionNoteId,
            vaultOwner: pendingSpentMarker.vaultOwner,
          }),
        ];

        return spentMarkerTransaction.send({
          amount: pendingSendBridge?.sentAmountDisplay ?? "0",
          asset: "USDC",
          cluster: vantaSolanaCluster,
          explicitMainnetApproval: vantaExplicitMainnetApproval,
          connectedWalletAddress: pendingSpentMarker.owner,
          estimatedFees: "wallet-estimated",
          feePayer: pendingSpentMarker.owner,
          humanApprovedSummary: true,
          instructions,
          label: "send-spent-marker",
          recipient: pendingSpentMarker.vaultOwner,
          summaryInstructions: ["send-spent-marker"],
          transactionFingerprint: `send-spent-marker:${pendingSpentMarker.owner}:${pendingSpentMarker.consumedNoteId}:${pendingSpentMarker.transitionNoteId}`,
        });
      })
      .catch((error) => {
        setStatus("failed");
        setPendingSendBridge(null);
        setFlowError(
          error instanceof Error
            ? error.message
            : "The Vanta spent marker could not be submitted.",
        );
      });
  }, [
    pendingSpentMarker,
    pendingSendBridge?.sentAmountDisplay,
    sendNoteWait.waitStatus,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
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
    setPendingSendBridge(null);
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
    setPendingSendBridge(null);
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (
      spentMarkerWait.waitStatus !== "success" ||
      !pendingSendBridge ||
      !shieldAccount ||
      !liveShieldAsset.mintAddress
    ) {
      return;
    }

    const mintAddress = liveShieldAsset.mintAddress;

    void refreshShieldState()
      .then(async () => {
        await recordCanonicalSendFromLiveSend({
          assetSymbol: "USDC",
          mintAddress,
          owner: shieldAccount.owner,
          vaultOwner: shieldAccount.vaultOwner,
          createdAt: pendingSendBridge.createdAt,
          recipient: pendingSendBridge.recipient,
          sentAmountDisplay: pendingSendBridge.sentAmountDisplay,
          changeAmountDisplay: pendingSendBridge.changeAmountDisplay,
          tokenDecimals: DEFAULT_USDC_DECIMALS,
          predecessor: pendingSendBridge.predecessor,
          transition: {
            noteId: pendingSendBridge.transition.noteId,
            signature: sendNoteTransaction.signature ?? pendingSendBridge.transition.noteId,
            spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
            changeNoteId: pendingSendBridge.transition.changeNoteId,
          },
        });
        setStatus("complete");
        setFlowError(null);
        setPendingSpentMarker(null);
        setPendingSendBridge(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Send settled, but canonical successor-note bridge state could not be recorded.",
        );
      });
  }, [
    pendingSendBridge,
    refreshShieldState,
    sendNoteTransaction.signature,
    shieldAccount,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
  ]);

  async function performLiveSendFromNote(args: {
    amountNumeric: number;
    note: VantaShieldNote;
    recipientValue: string;
    shieldAccountState: VantaShieldAccountState;
  }) {
    sendNoteTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    const trimmedRecipient = args.recipientValue.trim();
    const nextChangeAmount = Number(
      Math.max(args.note.amount - args.amountNumeric, 0).toFixed(6),
    );
    setLastRecipient(trimmedRecipient);
    setLastSentAmount(args.amountNumeric);
    setLastChangeAmount(nextChangeAmount);
    setStatus("awaiting_confirmation");

    const createdAt = Date.now();
    const preparedSend = createPreparedSendMemo({
      amount: args.amountNumeric.toString(),
      asset: "USDC",
      changeAmount: nextChangeAmount.toString(),
      consumedNoteId: args.note.noteId,
      createdAt,
      mintAddress: liveShieldAsset.mintAddress!,
      owner: args.shieldAccountState.owner,
      recipient: trimmedRecipient,
      vaultOwner: args.shieldAccountState.vaultOwner,
    });

    setPendingSpentMarker({
      consumedNoteId: args.note.noteId,
      createdAt,
      mintAddress: liveShieldAsset.mintAddress!,
      owner: args.shieldAccountState.owner,
      transitionKind: "send",
      transitionNoteId: preparedSend.noteId,
      vaultOwner: args.shieldAccountState.vaultOwner,
    });
    setPendingSendBridge({
      changeAmountDisplay: nextChangeAmount.toString(),
      createdAt,
      predecessor: {
        amountDisplay: args.note.amount.toString(),
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      recipient: trimmedRecipient,
      sentAmountDisplay: args.amountNumeric.toString(),
      transition: {
        changeNoteId: preparedSend.changeNoteId,
        noteId: preparedSend.noteId,
      },
    });
    const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
      accountKeys: [
        args.note.noteId,
        liveShieldAsset.mintAddress!,
        args.shieldAccountState.owner,
        preparedSend.noteId,
        args.shieldAccountState.vaultOwner,
        trimmedRecipient,
      ],
      action: "send_transition",
    });

    const instructions = [...priorityFeeInstructions, preparedSend.instruction];

    await sendNoteTransaction.send({
      amount: args.amountNumeric.toString(),
      asset: "USDC",
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
      connectedWalletAddress: args.shieldAccountState.owner,
      estimatedFees: "wallet-estimated",
      feePayer: args.shieldAccountState.owner,
      humanApprovedSummary: true,
      instructions,
      label: "send-note-transition",
      recipient: trimmedRecipient,
      summaryInstructions: ["send-note-transition"],
      transactionFingerprint: `send-note-transition:${args.shieldAccountState.owner}:${args.note.noteId}:${preparedSend.noteId}`,
    });
  }

  async function handleSend() {
    if (isBetaMode) {
      return;
    }

    if (isPrivateCoreUsdcSendReady) {
      await handlePrivateCoreSendProof();
      return;
    }

    setStatus("failed");
    setFlowError("Private-core send currently supports shielded USDC.");
  }

  async function handlePrivateCoreSendProof() {
    if (isBetaMode) {
      return;
    }

    if (!privateCoreSendPreview) {
      return;
    }

    setPrivateCoreSendExecution({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "running",
    });

    try {
      const previewResult = previewPrivateCoreSendTransition(privateCoreSendPreview.transition);
      const releaseCandidateId = ["private-core-release-candidate", crypto.randomUUID()].join(":");

      if (privateCoreHoldState) {
        await ensurePrivateCoreOperatorRootKnown({
          proofBoundary: buildVantaPrivateCoreUnshieldProofBoundary({
            heldNote: privateCoreHoldState.heldNote,
            ownerSecretKey: privateCoreOwner.secretKey,
            releaseDestination:
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          }),
          sourceArtifacts: deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
            privateCoreHoldState.heldNote,
          ),
        });
      }

      const sendReceipt = await requestVantaPrivateCoreOperatorSendTransition({
        releaseCandidateId,
        resultingRoot: previewResult.resultingRoot,
        witnessPackage: privateCoreSendPreview.boundary.noirWitnessPackage,
      });
      runPrivateCoreSendTransition(privateCoreSendPreview.transition, {
        releaseCandidateId: sendReceipt.releaseCandidateId ?? releaseCandidateId,
      });
      const summaryState = await refreshPrivateCoreOperatorSummary();

      setPrivateCoreSendExecution({
        errorMessage: null,
        latestProofAction: "send-transition",
        latestProofId: sendReceipt.proofId,
        latestSendId: summaryState.latestSend?.sendId ?? sendReceipt.sendId,
        proofFieldCount: sendReceipt.proofFieldCount,
        proofPublicInputCount: sendReceipt.publicInputCount,
        status: "verified",
      });
    } catch (error) {
      setPrivateCoreSendExecution({
        errorMessage: error instanceof Error ? error.message : "The private-core send proof failed.",
        latestProofAction: null,
        latestProofId: null,
        latestSendId: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        status: "failed",
      });
    }
  }

  const projectedRemainingBalance =
    selectedAsset === "USDC" && isAmountValid && selectedSpendableNote
      ? Number(Math.max(selectedBalance - parsedAmount, 0).toFixed(6))
      : selectedBalance;
  const sendHelperMessage = shieldStateError
    ? shieldStateError
    : isBetaMode
      ? "Beta mode keeps private-core send visible but prevents live settlement while production evidence, approval, audit, replay, and operator-surface gates remain blocked."
      : selectedSendCapability.executionMode === "unsupported-private-send-asset"
        ? selectedSendCapability.blockers[0] ??
          "Private-core send currently supports shielded USDC."
      : isPrivateCoreUsdcSendReady
      ? "Ready to verify a private-core send transition."
      : !selectedSpendableNote
        ? "Shield the asset first, then return here to send it."
        : "Enter a valid amount and destination address.";

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">{dashboard ? "Dashboard" : "Send shielded"}</span>
          <h2>Send</h2>
          <p>Record a send transition from your shielded balance.</p>
        </div>

        <div className="module-state">
          <strong>Shielded balance</strong>
          <p>Send part of your balance and keep any change shielded.</p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {["Shield", "Send", "Hold change"].map((step, index) => (
          <div
            key={step}
            className={index === 1 ? "send-flow-step send-flow-step--active" : "send-flow-step"}
          >
            <span>{step}</span>
          </div>
        ))}
      </div>

      {recentShield ? (
        <div className="send-context-banner">
          <div>
            <span>Ready</span>
            <h3>{formatBalance(recentShield.amount, recentShield.asset)} shielded.</h3>
            <p>Send now or keep holding privately.</p>
          </div>
          <div className="send-context-banner__meta">
            <strong>{formatBalance(recentShield.resultingShieldedBalance, recentShield.asset)}</strong>
            <small>Current shielded balance</small>
          </div>
        </div>
      ) : (
        <div className="send-context-banner send-context-banner--quiet">
          <div>
            <span>Start with Shield</span>
            <h3>No shielded funds ready to send.</h3>
            <p>Shield first, then send from the private balance.</p>
          </div>
          <Link className="button button-ghost" to="/app/shield">
            Shield funds first
          </Link>
        </div>
      )}

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Send</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>You send</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Shielded balance: {formatBalance(selectedBalance, selectedAsset)}
                  </div>
                </div>
                <div className="send-entry-grid">
                  <div className="amount-field">
                    <input
                      id="send-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setStatus("idle");
                        setFlowError(null);
                      }}
                      placeholder="0.00"
                      disabled={selectedSendCapability.status !== "live"}
                    />
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={selectedSendCapability.status !== "live" || !selectedSpendableNote}
                      onClick={() => {
                        if (!selectedSpendableNote) {
                          return;
                        }

                        setAmount(selectedSpendableNote.amount.toFixed(2));
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      Max
                    </button>
                  </div>
              </div>
                <div className="send-asset-field">
                  <select
                    aria-label="Send shielded asset"
                    value={selectedAsset}
                    onChange={(event) => {
                      setSelectedAsset(event.target.value as ShieldedSendAssetKey);
                      setStatus("idle");
                      setFlowError(null);
                    }}
                  >
                    {sendShieldedAssetOptions.map(({ label, symbol }) => (
                      <option key={symbol} value={symbol}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Destination address</span>
                </div>
                <div className="amount-field">
                  <input
                    id="send-recipient"
                    className="input-compact"
                    value={recipient}
                    onChange={(event) => {
                      setRecipient(event.target.value);
                      setStatus("idle");
                      setFlowError(null);
                    }}
                    placeholder="Destination address"
                  />
                </div>
              </div>

              <p className="shield-helper">{sendHelperMessage}</p>

              <div className="shield-form__actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={
                    isBetaMode ||
                    !isPrivateCoreUsdcSendReady ||
                    privateCoreSendExecution.status === "running" ||
                    status === "sending" ||
                    status === "settling"
                  }
                >
                  {isBetaMode ? "Beta mode" : "Verify private-core send proof"}
                </button>
              </div>
            </div>
          </div>

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>Approve this private send in your wallet.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "sending" && (
            <div className="status-panel status-panel--processing">
              <span>Send in progress</span>
              <p>Sending from your shielded balance.</p>
              {sendProgressLabel && (
                <p className="shield-helper shield-helper--meta">{sendProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "settling" && (
            <div className="status-panel status-panel--processing">
              <span>Updating your private balance</span>
              <p>
                Confirming the spent marker and resolving the next spendable
                note set, including any residual change note.
              </p>
              {settleProgressLabel && (
                <p className="shield-helper shield-helper--meta">{settleProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Send failed</span>
              <p>Your shielded balance was not changed. Try again.</p>
              {flowError && <p className="shield-helper shield-helper--error">{flowError}</p>}
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setFlowError(null);
                }}
              >
                Retry send
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="status-panel status-panel--success">
              <span>Send complete</span>
              <p>
                {lastSentAmount !== null && lastRecipient
                  ? `${formatBalance(lastSentAmount, "USDC")} was sent from shielded state for recipient ${lastRecipient}.`
                  : "The constrained Vanta send note was confirmed."}
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Amount sent</span>
                  <strong>{formatBalance(lastSentAmount ?? 0, "USDC")}</strong>
                </div>
                <div className="preview-card">
                  <span>Residual shielded note</span>
                  <strong>{formatBalance(lastChangeAmount ?? 0, "USDC")}</strong>
                </div>
              </div>
              <div className="success-metrics">
                <div className="preview-card">
                  <span>Remaining shielded balance</span>
                  <strong>{formatBalance(shieldAccount?.balance ?? 0, "USDC")}</strong>
                </div>
                <div className="preview-card">
                  <span>Spendable notes after send</span>
                  <strong>{shieldAccount?.spendableShieldNotes.length ?? 0}</strong>
                </div>
              </div>
              {sendNoteTransaction.signature && (
                <p className="shield-helper shield-helper--meta">
                  Vanta send note: {`${sendNoteTransaction.signature.slice(0, 8)}...${sendNoteTransaction.signature.slice(-8)}`}
                </p>
              )}
              {spentMarkerTransaction.signature && (
                <p className="shield-helper shield-helper--meta">
                  Spent marker: {`${spentMarkerTransaction.signature.slice(0, 8)}...${spentMarkerTransaction.signature.slice(-8)}`}
                </p>
              )}
              <details className="shield-helper shield-helper--meta">
                <summary>Internal zk diagnostics</summary>
                <p>
                  Internal/debug only. Inspect canonical predecessor linkage and
                  successor note insertions created from recent live send actions.
                </p>
                {sendZkDiagnostics.length === 0 ? (
                  <p>No retained canonical send bridge records were found.</p>
                ) : (
                  <div className="success-metrics">
                    {sendZkDiagnostics.map((record) => (
                      <div key={record.recordId} className="preview-card">
                        <span>{new Date(record.createdAt).toLocaleTimeString()}</span>
                        <strong>
                          {abbreviate(record.transitionSignature) ?? record.transitionSignature}
                        </strong>
                        <small>Send transition</small>
                        <p className="shield-helper shield-helper--meta">
                          Predecessor: {record.predecessorLiveNoteId}
                        </p>
                        {record.predecessorCanonicalCommitment && (
                          <p className="shield-helper shield-helper--meta">
                            Canonical predecessor:{" "}
                            {abbreviate(record.predecessorCanonicalCommitment) ??
                              record.predecessorCanonicalCommitment}
                          </p>
                        )}
                        <p className="shield-helper shield-helper--meta">
                          Recipient: {record.recipient}
                        </p>
                        {record.spentMarkerSignature && (
                          <p className="shield-helper shield-helper--meta">
                            Spent marker:{" "}
                            {abbreviate(record.spentMarkerSignature) ??
                              record.spentMarkerSignature}
                          </p>
                        )}
                        {record.successors.map((successor) => (
                          <p
                            key={`${record.recordId}:${successor.kind}`}
                            className="shield-helper shield-helper--meta"
                          >
                            {successor.kind} successor #{successor.insertionIndex}:{" "}
                            {abbreviate(successor.commitment) ?? successor.commitment} · root{" "}
                            {abbreviate(successor.snapshotRoot) ?? successor.snapshotRoot}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </details>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setRecipient("");
                    setAmount(selectedSpendableNote?.amount.toFixed(2) ?? "");
                    setStatus("idle");
                    setFlowError(null);
                    setPendingSendBridge(null);
                  }}
                >
                  Send More
                </button>
                <Link className="button button-ghost" to="/app/shield">
                  Back to Shield
                </Link>
              </div>
            </div>
          )}

          {shieldStateRefreshing && status === "idle" && (
            <div className="status-panel status-panel--processing">
              <span>Refreshing state</span>
              <p>Loading the latest spendable shield notes and residual change notes from the active cluster.</p>
            </div>
          )}
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Private-core send</span>
              <h3>Proof lane</h3>
            </div>
            <small>Ready when a private note is held</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Held private note</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Requested send</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
                  : "Not ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Projected change</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.changeAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
                  : "Not ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Boundary readiness</span>
              <strong>{privateCoreSendPreview?.boundary.readiness ?? "Blocked"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof</span>
              <strong>{privateCoreSendPreview?.sourceVerificationLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source consistency</span>
              <strong>{privateCoreSendPreview?.sourceConsistencyLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Recipient key</span>
              <strong>{abbreviate(privateCoreSendPreview?.recipientPublicKey) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator send proof</span>
              <strong>
                {privateCoreSendExecution.status === "verified"
                  ? "Verified"
                  : privateCoreSendExecution.status === "running"
                    ? "Running"
                    : privateCoreSendExecution.status === "failed"
                      ? "Failed"
                      : "Not run yet"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send</span>
              <strong>{abbreviate(privateCoreOperatorLatestSend?.sendId) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Residual private-core output</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Residual note readiness</span>
              <strong>
                {privateCoreSendExecution.status === "verified"
                  ? privateCoreHoldState?.witnessAvailable
                    ? "Recovered and ready"
                    : "Awaiting witness"
                  : "Not yet transitioned"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked send proof</span>
              <strong>
                {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ?? "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Proof/send link</span>
              <strong>{privateCoreOperatorProofSendLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator boundary</span>
              <strong>{privateCoreOperatorBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send resulting root</span>
              <strong>{privateCoreOperatorSendResultingRootStatusLabel ?? "Unavailable"}</strong>
            </div>
          </div>

          <p className="shield-review-note">
            This is the currently supported narrow private-send lane for Vanta zk v1. It proves
            the current held note can support one recipient output and one optional change output,
            then asks the operator to verify the frozen send witness package over HTTP.
          </p>

          <div className="status-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void handlePrivateCoreSendProof();
              }}
              disabled={
                isBetaMode ||
                !privateCoreSendPreview ||
                privateCoreSendPreview.boundary.readiness !== "ready" ||
                privateCoreSendExecution.status === "running"
              }
            >
              {isBetaMode ? "Beta mode" : "Verify private-core send proof"}
            </button>
          </div>

          {privateCoreSendExecution.status === "running" && (
            <div className="status-panel status-panel--processing">
              <span>Verifying send proof</span>
              <p>Submitting the current private-core send witness package to the operator.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {privateCoreSendExecution.status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Send proof failed</span>
              <p>The operator did not accept the current private-core send witness package.</p>
              {privateCoreSendExecution.errorMessage && (
                <p className="shield-helper shield-helper--error">
                  {privateCoreSendExecution.errorMessage}
                </p>
              )}
            </div>
          )}

          {privateCoreSendExecution.status === "verified" && (
            <div className="status-panel status-panel--success">
              <span>Send proof verified</span>
              <p>
                The operator verified and recorded the send transition. Recipient delivery or
                recovery remains a separate supported flow; the remaining private balance is ready
                for the next hold or unshield step.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Proof fields</span>
                  <strong>{privateCoreSendExecution.proofFieldCount ?? 0}</strong>
                </div>
                <div className="preview-card">
                  <span>Public inputs</span>
                  <strong>{privateCoreSendExecution.proofPublicInputCount ?? 0}</strong>
                </div>
                <div className="preview-card">
                  <span>Recipient output amount</span>
                  <strong>
                    {privateCoreSendPreview
                      ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual private-core output</span>
                  <strong>
                    {privateCoreHoldState
                      ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Send boundary</span>
                  <strong>{privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
                  <span>Downstream continuity</span>
                  <strong>{privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
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
              <p className="shield-helper shield-helper--meta">
                Latest send proof:{" "}
                {abbreviate(privateCoreSendExecution.latestProofId) ??
                  privateCoreSendExecution.latestProofId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Latest send proof action: {privateCoreSendExecution.latestProofAction ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Latest send transition:{" "}
                {abbreviate(privateCoreSendExecution.latestSendId) ??
                  privateCoreSendExecution.latestSendId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Linked send proof:{" "}
                {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ??
                  privateCoreOperatorLatestSendLinkedProof?.proofId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Proof/send link: {privateCoreOperatorProofSendLinkStatus ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary: {privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary note: {privateCoreOperatorSendBoundaryPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Downstream continuity: {privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Continuity note: {privateCoreOperatorSendContinuityPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Exact candidate:{" "}
                {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Candidate note:{" "}
                {privateCoreReleaseCandidateState?.lifecyclePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow prepare:{" "}
                {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow check: {privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow ship: {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow note: {privateCoreReleaseWorkflowState?.shipPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff: {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff note: {privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Next handoff action: {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package identity: {privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Release package:{" "}
                {privateCoreReleasePackageState?.packageStatusLabel ??
                  privateCoreReleaseHandoffState?.packageStatusLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package note:{" "}
                {privateCoreReleasePackageState?.packagePrimaryNote ??
                  privateCoreReleaseHandoffState?.packagePrimaryNote ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package gate: {privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Gate note: {privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Artifact identity:{" "}
                {privateCoreReleasePackageState?.artifactIdentityLabel ??
                  privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Decision identity:{" "}
                {privateCoreReleasePackageState?.decisionIdentityLabel ??
                  privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Contract identity: {privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Snapshot identity: {privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Summary generated: {privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package lineage: {privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Recipient recovery: Recipient can recover the sent note privately with the matched
                private key.
              </p>
              <p className="shield-helper shield-helper--meta">
                Residual note ready:{" "}
                {privateCoreHoldState?.witnessAvailable ? "Yes" : "Awaiting refreshed hold state"}
              </p>
              <div className="status-actions">
                <Link
                  className="button button-primary"
                  to={privateCoreReleaseHandoffState?.nextActionHref ?? "/app/unshield"}
                >
                  {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unshield Residual Note"}
                </Link>
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
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setFlowError(null);
                    setPrivateCoreSendExecution({
                      errorMessage: null,
                      latestProofAction: null,
                      latestProofId: null,
                      latestSendId: null,
                      proofFieldCount: null,
                      proofPublicInputCount: null,
                      status: "idle",
                    });
                  }}
                >
                  Continue Sending
                </button>
              </div>
            </div>
          )}

          {privateCoreSendState && privateCoreSendExecution.status !== "verified" && (
            <div className="status-panel status-panel--success">
              <span>Latest private-core send</span>
              <p>
                The latest private-core send handoff is still available from shared state, so this
                flow can resume after refresh. Recipient delivery and recovery remain separate from
                this operator proof state; the sender residual state stays visible for the next hold
                or unshield step.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Recipient output</span>
                  <strong>
                    {formatBaseUnits(BigInt(privateCoreSendState.recipientAmount), DEFAULT_USDC_DECIMALS)} USDC
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual note</span>
                  <strong>
                    {formatBaseUnits(BigInt(privateCoreSendState.changeAmount), DEFAULT_USDC_DECIMALS)} USDC
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Observation mode</span>
                  <strong>{privateCoreSendState.observationMode}</strong>
                </div>
                <div className="preview-card">
                  <span>Send boundary</span>
                  <strong>{privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
                  <span>Downstream continuity</span>
                  <strong>{privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
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
              <p className="shield-helper shield-helper--meta">
                Recipient recovery: {privateCoreSendState.recipientRecoveryStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Recipient unshield: {privateCoreSendState.recipientUnshieldStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send resulting root: {privateCoreSendState.resultingRootStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send root note: {privateCoreSendState.resultingRootPrimaryNote}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary: {privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary note: {privateCoreOperatorSendBoundaryPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Downstream continuity: {privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Continuity note: {privateCoreOperatorSendContinuityPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Exact candidate:{" "}
                {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Candidate note:{" "}
                {privateCoreReleaseCandidateState?.lifecyclePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow prepare:{" "}
                {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow check: {privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow ship: {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow note: {privateCoreReleaseWorkflowState?.checkPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff: {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff note: {privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Next handoff action: {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package identity: {privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Release package:{" "}
                {privateCoreReleasePackageState?.packageStatusLabel ??
                  privateCoreReleaseHandoffState?.packageStatusLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package note:{" "}
                {privateCoreReleasePackageState?.packagePrimaryNote ??
                  privateCoreReleaseHandoffState?.packagePrimaryNote ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package gate: {privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Gate note: {privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Artifact identity:{" "}
                {privateCoreReleasePackageState?.artifactIdentityLabel ??
                  privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Decision identity:{" "}
                {privateCoreReleasePackageState?.decisionIdentityLabel ??
                  privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Contract identity: {privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Snapshot identity: {privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Summary generated: {privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package lineage: {privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send root record: {abbreviate(privateCoreOperatorSendResultingRootRecord?.root) ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Residual state: {privateCoreSendState.residualStateStatus}
              </p>
              <div className="status-actions">
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
            </div>
          )}

          <details className="shield-helper shield-helper--meta">
            <summary>Internal send-proof diagnostics</summary>
            {privateCoreSendPreview ? (
              <>
                <p>Send circuit: {privateCoreSendPreview.boundary.circuit}</p>
                <p>Send backend: {privateCoreSendPreview.boundary.backend}</p>
                <p>
                  Source input root:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.stateRoot) ??
                    privateCoreSendPreview.boundary.publicInputs.stateRoot}
                </p>
                <p>
                  Source input nullifier:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.inputNullifier) ??
                    privateCoreSendPreview.boundary.publicInputs.inputNullifier}
                </p>
                <p>
                  Recipient commitment:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.recipientCommitment) ??
                    privateCoreSendPreview.boundary.publicInputs.recipientCommitment}
                </p>
                <p>
                  Change commitment:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.changeCommitment) ??
                    privateCoreSendPreview.boundary.publicInputs.changeCommitment ??
                    "None"}
                </p>
                <p>
                  Send context tag:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.sendContextTag) ??
                    privateCoreSendPreview.boundary.publicInputs.sendContextTag}
                </p>
                <p>
                  Latest operator send proof:{" "}
                  {abbreviate(privateCoreOperatorLatestSendProof?.proofId) ?? "Unavailable"}
                </p>
                <p>
                  Latest linked send proof:{" "}
                  {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ?? "Unavailable"}
                </p>
                <p>Operator boundary status: {privateCoreOperatorBoundaryStatusLabel ?? "Unavailable"}</p>
                <p>Operator boundary note: {privateCoreOperatorBoundaryPrimaryNote ?? "Unavailable"}</p>
                <p>
                  Send resulting root status:{" "}
                  {privateCoreOperatorSendResultingRootStatusLabel ?? "Unavailable"}
                </p>
                <p>
                  Send resulting root note:{" "}
                  {privateCoreOperatorSendResultingRootPrimaryNote ?? "Unavailable"}
                </p>
                <p>
                  Current root proof link: {privateCoreOperatorCurrentRootProofLinkStatus ?? "Unavailable"}
                </p>
                <p>
                  Send resulting root proof link:{" "}
                  {privateCoreOperatorSendResultingRootProofLinkStatus ?? "Unavailable"}
                </p>
                <p>
                  Operator summary refresh: {formatOperatorSummaryFreshness(privateCoreOperatorSummaryUpdatedAt)}
                </p>
                {privateCoreSendPreview.boundary.blockers.length > 0 && (
                  <p>
                    Blockers: {privateCoreSendPreview.boundary.blockers.join(" | ")}
                  </p>
                )}
              </>
            ) : (
              <p>No private-core send proof preview is ready yet.</p>
            )}
          </details>
        </article>
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
        operatorSupportedStatusGateTransport={privateCoreOperatorSupportedStatusGateTransport}
        operatorSupportedStatusGateEndpoint={privateCoreOperatorSupportedStatusGateEndpoint}
        operatorSupportedSnapshotGateVersion={privateCoreOperatorSupportedSnapshotGateVersion}
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
        title="Vanta Private Core send state"
        unshieldState={privateCoreUnshieldState}
      />
    </section>
  );
}

function decimalToBaseUnitsExact(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Amount is required.");
  }

  const [wholePartRaw, fractionPartRaw = ""] = trimmed.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionPartRaw)) {
    throw new Error("Amount must be numeric.");
  }

  const normalizedFraction = `${fractionPartRaw}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(normalizedFraction || "0");
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString(10);
  }

  return `${whole.toString(10)}.${fraction.toString(10).padStart(decimals, "0").replace(/0+$/, "")}`;
}

function derivePrivateCoreRecipientPublicKey(reference: string): Bytes32Hex {
  const bytes = sha256(
    new TextEncoder().encode(`vanta.private-core.send-recipient.v0:${reference.trim().toLowerCase()}`),
  );
  return (`0x${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`) as Bytes32Hex;
}
