import { useCallback, useEffect, useMemo, useState } from "react";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { LaneProgressiveSection } from "@/components/LaneProgressiveSection";
import { SendContextBanner } from "@/components/SendContextBanner";
import { SendOperatorStatePanel } from "@/components/SendOperatorStatePanel";
import { SendWorkspaceCard } from "@/components/SendWorkspaceCard";
import {
  SendProofLanePanel,
  type PrivateCoreSendExecutionState,
  type PrivateCoreSendPreview,
} from "@/components/SendProofLanePanel";
import {
  abbreviate,
  DEFAULT_USDC_DECIMALS,
  formatBaseUnits,
} from "@/components/send/sendPanelUtils";
import { NotePicker, type NotePickerOption } from "@/components/NotePicker";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { SendReceiptModal, type SendReceiptModalDetails } from "@/components/SendReceiptModal";
import { isBetaMode } from "@/config/deploymentMode";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  validateLiveSendRecipient,
  type SendRecipientInputSource,
} from "@/solana/sendRecipientValidation";
import { findVantaRecipientViewingKeyExchangePacket } from "@/solana/vantaRecipientViewingKeyExchange";
import {
  getShieldedSendAssetCapability,
  listShieldedSendAssetOptions,
  type ShieldedSendAssetKey,
} from "@/solana/shieldedSendCapability";
import { getSendTrustContract } from "@/solana/sendTrustContract";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  liveShieldAsset,
  type LiveShieldTokenAssetKey,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldOwnerContext } from "@/solana/useVantaShieldOwnerContext";
import {
  createPreparedSendDualAeadMemo,
  createPreparedSendMemo,
  createSpentMarkerInstruction,
  type VantaShieldAccountState,
  type VantaShieldNote,
} from "@/solana/vantaShieldState";
import {
  listCanonicalSendDiagnosticsSummaries,
  recordCanonicalSendFromLiveSend,
} from "@/zk/liveSendBridge";
import { listCanonicalShieldRecords } from "@/zk/liveShieldBridge";
import {
  buildVantaPrivateCoreSendProofEnvelope,
  buildVantaPrivateCoreSendTransition,
  deriveVantaPrivateCoreSourceArtifactsFromHeldNote,
  summarizeVantaPrivateCoreSendProofEnvelopeConsistency,
  summarizeVantaPrivateCoreSendProofEnvelopeVerification,
  type Bytes32Hex,
} from "@/zk/vantaPrivateCore";
import { buildVantaPrivateCoreSendProofBoundary } from "@/zk/vantaPrivateCoreSendProof";
import { buildVantaPrivateCoreUnshieldProofBoundary } from "@/zk/vantaPrivateCoreUnshieldProof";
import {
  requestVantaPrivateCoreOperatorSendTransition,
} from "@/zk/vantaPrivateCoreOperatorClient";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import type { CanonicalNoteOwnerContext } from "@/zk/canonicalNote";

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
  ownerContext: CanonicalNoteOwnerContext;
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

function getInitialSendAsset(asset: PrivacyAssetKey | undefined): ShieldedSendAssetKey {
  if (asset === "SOL") {
    return "USDC";
  }

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

function noteAmountToBaseUnits(note: VantaShieldNote, decimals: number) {
  return decimalToBaseUnitsExact(note.amount.toFixed(decimals), decimals);
}

function sumSpendableNoteAmounts(notes: { amount: number }[]) {
  return Number(notes.reduce((sum, note) => sum + note.amount, 0).toFixed(6));
}

export function SendPage({ dashboard = false }: SendPageProps) {
  const sendTrustContract = useMemo(() => getSendTrustContract(), []);
  const viewingKey = useVantaShieldViewingKey();
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
  const shieldOwnerContext = useVantaShieldOwnerContext();
  const baseSendShieldedAssetOptions = useMemo(() => listShieldedSendAssetOptions(), []);
  const [selectedAsset, setSelectedAsset] = useState<ShieldedSendAssetKey>(
    getInitialSendAsset(recentShield?.asset),
  );
  const [recipient, setRecipient] = useState("");
  const [recipientInputSource, setRecipientInputSource] =
    useState<SendRecipientInputSource>("typed");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSendAdvancedOpen, setIsSendAdvancedOpen] = useState(false);
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
  const [sendReceiptModalOpen, setSendReceiptModalOpen] = useState(false);
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
    shieldAssetRegistry.entries.find(
      (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
    ) ?? null;
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
        return sumSpendableNoteAmounts(shieldedSolSourceAccount?.spendableShieldedSolNotes ?? []);
      }

      if (asset === "USDC") {
        return shieldAccount?.balance ?? 0;
      }

      return shieldAssetRegistry.byAssetKey[asset]?.account?.balance ?? 0;
    },
    [
      shieldAccount?.balance,
      shieldAssetRegistry.byAssetKey,
      shieldedSolSourceAccount?.spendableShieldedSolNotes,
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
  const sendNotePickerOptions = useMemo<NotePickerOption[]>(
    () =>
      spendableNotes.map((note) => ({
        id: note.noteId,
        metaLabel: "Ledger-spendable note",
        primaryLabel: formatBalance(note.amount, note.asset),
        secondaryLabel: abbreviate(note.noteId) ?? note.noteId,
      })),
    [spendableNotes],
  );

  const selectedCanonicalSendLedgerNote = useMemo(() => {
    if (
      selectedAsset !== "USDC" ||
      !selectedSpendableNote ||
      selectedSpendableNote.asset !== "USDC" ||
      selectedSpendableNote.noteId.startsWith("local-") ||
      selectedSpendableNote.stateSignature.startsWith("local-")
    ) {
      return null;
    }

    return selectedSpendableNote;
  }, [selectedAsset, selectedSpendableNote]);

  const selectedCanonicalSendLedgerAmountBaseUnits = useMemo(() => {
    if (!selectedCanonicalSendLedgerNote) {
      return null;
    }

    try {
      return noteAmountToBaseUnits(selectedCanonicalSendLedgerNote, DEFAULT_USDC_DECIMALS);
    } catch {
      return null;
    }
  }, [selectedCanonicalSendLedgerNote]);
  const selectedCanonicalShieldRecord = useMemo(() => {
    if (!selectedCanonicalSendLedgerNote) {
      return null;
    }

    return (
      listCanonicalShieldRecords().find(
        (record) =>
          record.liveShield.stateSignature === selectedCanonicalSendLedgerNote.stateSignature &&
          record.liveShield.assetSymbol === selectedCanonicalSendLedgerNote.asset &&
          record.liveShield.mintAddress === selectedCanonicalSendLedgerNote.mintAddress &&
          record.liveShield.owner === selectedCanonicalSendLedgerNote.owner &&
          record.liveShield.vaultOwner === selectedCanonicalSendLedgerNote.vaultOwner,
      ) ?? null
    );
  }, [selectedCanonicalSendLedgerNote]);

  const selectedBalance =
    selectedAsset === "SOL"
      ? sumSpendableNoteAmounts(selectedShieldAccount?.spendableShieldedSolNotes ?? [])
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
  const recipientValidation = useMemo(
    () =>
      validateLiveSendRecipient(
        recipient,
        selectedCanonicalSendLedgerNote?.owner ?? shieldAccount?.owner ?? null,
        recipientInputSource,
      ),
    [recipient, recipientInputSource, selectedCanonicalSendLedgerNote?.owner, shieldAccount?.owner],
  );
  const trimmedRecipient =
    recipientValidation.ready && recipientValidation.kind === "solana-address"
      ? recipientValidation.canonicalAddress
      : recipient.trim();
  const isRecipientValid = recipientValidation.ready;
  const isSelfPrivateCoreRecipient =
    recipientValidation.ready &&
    recipientValidation.kind === "solana-address" &&
    recipientValidation.isSelf;
  const matchedRecipientViewingKeyExchange = useMemo(
    () =>
      recipientValidation.ready && recipientValidation.kind === "solana-address"
        ? findVantaRecipientViewingKeyExchangePacket(recipientValidation.canonicalAddress)
        : null,
    [recipientValidation],
  );
  const recipientViewingPublicKey =
    isSelfPrivateCoreRecipient
      ? viewingKey?.publicKey ?? null
      : matchedRecipientViewingKeyExchange?.viewingPublicKey ?? null;
  const recipientProofOwnerPublicKey =
    isSelfPrivateCoreRecipient
      ? privateCoreOwner.publicKey
      : matchedRecipientViewingKeyExchange?.recipientOwnerPublicKey ?? null;
  const isRealSendReady =
    selectedSendCapability.status === "live" &&
    Boolean(selectedSpendableNote) &&
    isAmountValid &&
    isRecipientValid &&
    Boolean(liveShieldAsset.mintAddress);
  const privateCoreHeldAmountMatchesLedgerNote =
    Boolean(privateCoreHoldState) &&
    selectedCanonicalSendLedgerAmountBaseUnits !== null &&
    privateCoreHoldState?.heldNote.note.amount === selectedCanonicalSendLedgerAmountBaseUnits;
  const privateCoreHeldLedgerBindingMatchesSelectedNote =
    Boolean(privateCoreHoldState?.sourceLedgerBinding) &&
    Boolean(selectedCanonicalSendLedgerNote) &&
    Boolean(selectedCanonicalShieldRecord) &&
    selectedCanonicalSendLedgerAmountBaseUnits !== null &&
    privateCoreHoldState?.sourceLedgerBinding?.basis === "canonical-spendable-note-ledger" &&
    privateCoreHoldState.sourceLedgerBinding.source === "live_shield_v1" &&
    privateCoreHoldState.sourceLedgerBinding.asset === selectedCanonicalSendLedgerNote?.asset &&
    privateCoreHoldState.sourceLedgerBinding.noteStateSignature ===
      selectedCanonicalSendLedgerNote?.stateSignature &&
    privateCoreHoldState.sourceLedgerBinding.amountBaseUnits ===
      selectedCanonicalSendLedgerAmountBaseUnits.toString(10) &&
    privateCoreHoldState.sourceLedgerBinding.mintAddress ===
      selectedCanonicalSendLedgerNote?.mintAddress &&
    privateCoreHoldState.sourceLedgerBinding.owner === selectedCanonicalSendLedgerNote?.owner &&
    privateCoreHoldState.sourceLedgerBinding.vaultOwner ===
      selectedCanonicalSendLedgerNote?.vaultOwner &&
    privateCoreHoldState.sourceLedgerBinding.canonicalCommitment ===
      selectedCanonicalShieldRecord?.artifacts.commitment.value &&
    privateCoreHoldState.sourceLedgerBinding.canonicalRoot ===
      selectedCanonicalShieldRecord?.insertion.root &&
    privateCoreHoldState.sourceLedgerBinding.canonicalNullifierBasis ===
      selectedCanonicalShieldRecord?.artifacts.nullifierBasis.value &&
    privateCoreHoldState.sourceLedgerBinding.privateCoreCommitment ===
      privateCoreHoldState.heldNote.commitment.value &&
    privateCoreHoldState.sourceLedgerBinding.privateCoreRoot ===
      privateCoreHoldState.heldNote.witness.root;
  const sendLedgerGateStatus = useMemo(() => {
    const basis = "canonical-spendable-note-ledger";

    if (selectedAsset !== "USDC") {
      return {
        basis,
        detail: "Private Core Send currently supports the shielded USDC ledger lane only.",
        primaryNote: null,
        ready: false,
        statusLabel: "Unsupported asset",
      };
    }

    if (!selectedCanonicalSendLedgerNote) {
      return {
        basis,
        detail:
          "Select a shielded note to send.",
        primaryNote: null,
        ready: false,
        statusLabel: "No canonical note",
      };
    }

    if (!privateCoreHoldState) {
      return {
        basis,
        detail:
          "Hold a matching private-core note for the selected ledger note.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: "No held private note",
      };
    }

    if (!privateCoreHeldAmountMatchesLedgerNote) {
      return {
        basis,
        detail:
          "Held note does not match ledger note. Refresh shielded state.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: "Ledger mismatch",
      };
    }

    if (!selectedCanonicalShieldRecord) {
      return {
        basis,
        detail:
          "Ledger note missing shield proof. Refresh shielded state.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: "Missing ledger proof",
      };
    }

    if (!privateCoreHeldLedgerBindingMatchesSelectedNote) {
      return {
        basis,
        detail:
          "Held note not bound to ledger note. Select matching Shield note or refresh.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: "Ledger binding mismatch",
      };
    }

    if (!isAmountValid || !isRecipientValid) {
      return {
        basis,
        detail: !isRecipientValid
          ? recipientValidation.detail
          : "Enter a valid amount for the selected ledger note.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: !isRecipientValid ? recipientValidation.statusLabel : "Waiting for input",
      };
    }

    if (!isSelfPrivateCoreRecipient) {
      if (matchedRecipientViewingKeyExchange) {
        return {
          basis,
          detail:
            recipientProofOwnerPublicKey
              ? "Direct recipient key exchange is present for this recipient, including viewing and proof-owner public keys, but external Private Core Send still waits until the external Send proof path is enabled."
              : "Direct viewing-key exchange is present for this recipient, but Private Core external Send still needs proof-owner exchange before proof preview or execution.",
          primaryNote: selectedCanonicalSendLedgerNote,
          ready: false,
          statusLabel: recipientProofOwnerPublicKey
            ? "External proof path blocked"
            : "Proof-owner key required",
        };
      }

      return {
        basis,
        detail:
          "External Private Core Send requires recipient viewing-key exchange before proof preview or execution.",
        primaryNote: selectedCanonicalSendLedgerNote,
        ready: false,
        statusLabel: "Recipient key required",
      };
    }

    return {
      basis,
      detail: "Ready from canonical spendable-note ledger.",
      primaryNote: selectedCanonicalSendLedgerNote,
      ready: true,
      statusLabel: "Ready",
    };
  }, [
    isAmountValid,
    isRecipientValid,
    isSelfPrivateCoreRecipient,
    matchedRecipientViewingKeyExchange,
    privateCoreHeldLedgerBindingMatchesSelectedNote,
    privateCoreHeldAmountMatchesLedgerNote,
    privateCoreHoldState,
    recipientProofOwnerPublicKey,
    recipientValidation.detail,
    recipientValidation.statusLabel,
    selectedAsset,
    selectedCanonicalShieldRecord,
    selectedCanonicalSendLedgerNote,
  ]);
  const sendProgressLabel = sendNoteWait.detailLabel;
  const settleProgressLabel = spentMarkerWait.detailLabel;
  const privateCoreSendPreview = useMemo<PrivateCoreSendPreview | null>(() => {
    if (
      selectedAsset !== "USDC" ||
      !privateCoreHoldState ||
      !sendLedgerGateStatus.ready ||
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

      if (recipientValidation.kind !== "solana-address" || !recipientValidation.isSelf) {
        return null;
      }

      const recipientPublicKey = privateCoreOwner.publicKey as Bytes32Hex;
      const transition = buildVantaPrivateCoreSendTransition({
        input: privateCoreHoldState.heldNote,
        sendAmount: sendAmountBaseUnits,
        recipientOwnerPublicKey: privateCoreOwner.publicKey as `0x${string}`,
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
        senderSecretKey: (privateCoreOwner as any).secretKey,
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
    privateCoreOwner.publicKey,
    recipientValidation,
    sendLedgerGateStatus.ready,
    selectedAsset,
  ]);
  const isPrivateCoreUsdcSendReady =
    selectedAsset === "USDC" &&
    selectedSendCapability.executionMode === "operator-usdc-send" &&
    selectedSendCapability.status === "live" &&
    sendLedgerGateStatus.ready &&
    privateCoreSendPreview?.boundary.readiness === "ready";

  const recentShieldLabel =
    recentShield &&
    `${formatBalance(recentShield.amount, recentShield.asset)} shielded`;
  const sendZkDiagnostics = useMemo(
    () => listCanonicalSendDiagnosticsSummaries().slice(0, 5),
    [status],
  );
  const recentSendRecipients = useMemo(() => {
    const seen = new Set<string>();
    const candidates = [
      lastRecipient,
      selectedCanonicalSendLedgerNote?.owner,
      ...sendZkDiagnostics.map((record) => record.recipient),
    ];

    return candidates
      .flatMap((candidate) => {
        const recentValidation = validateLiveSendRecipient(candidate ?? "", null, "recent");

        if (!recentValidation.ready || recentValidation.kind !== "solana-address") {
          return [];
        }

        if (seen.has(recentValidation.canonicalAddress)) {
          return [];
        }

        seen.add(recentValidation.canonicalAddress);
        return [recentValidation.canonicalAddress];
      })
      .slice(0, 4);
  }, [lastRecipient, selectedCanonicalSendLedgerNote?.owner, sendZkDiagnostics]);
  const sendReceiptModalDetails = useMemo<SendReceiptModalDetails | null>(() => {
    const privateCoreSendAmountLabel = privateCoreSendState?.recipientAmount
      ? `${formatBaseUnits(BigInt(privateCoreSendState.recipientAmount), DEFAULT_USDC_DECIMALS)} USDC`
      : privateCoreSendPreview
        ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
        : null;
    const privateCoreResidualLabel =
      privateCoreSendState?.changeAmount !== null && privateCoreSendState?.changeAmount !== undefined
        ? `${formatBaseUnits(BigInt(privateCoreSendState.changeAmount), DEFAULT_USDC_DECIMALS)} USDC`
        : privateCoreHoldState
          ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
          : null;

    if (privateCoreSendExecution.status === "verified" || privateCoreSendState) {
      return {
        amountLabel: privateCoreSendAmountLabel ?? formatBalance(lastSentAmount ?? 0, "USDC"),
        proofStatusLabel:
          privateCoreSendExecution.status === "verified"
            ? `Verified locally (${privateCoreSendExecution.proofPublicInputCount ?? 0} public inputs)`
            : (privateCoreSendState?.observationMode ?? "Private-core send state retained"),
        recipientLabel:
          lastRecipient ??
          (trimmedRecipient.length > 0 ? trimmedRecipient : null) ??
          abbreviate(privateCoreSendState?.recipientCommitment) ??
          "Recipient commitment unavailable",
        releasePackageLabel:
          privateCoreReleasePackageState?.packageStatusLabel ??
          privateCoreReleaseHandoffState?.packageStatusLabel ??
          "No operator package available",
        remainingBalanceLabel: privateCoreSendState?.residualStateStatus ?? "Residual state unavailable",
        residualNoteLabel:
          privateCoreResidualLabel ??
          privateCoreSendState?.residualStateStatus ??
          "Residual note unavailable",
        sendNoteLabel:
          abbreviate(privateCoreSendExecution.latestSendId) ??
          abbreviate(privateCoreSendState?.resultingRoot) ??
          "Operator send id unavailable",
        spentMarkerLabel:
          abbreviate(privateCoreOperatorLatestSendLinkedProof?.nullifier) ??
          "Operator nullifier link unavailable",
      };
    }

    if (status !== "complete") {
      return null;
    }

    return {
      amountLabel: formatBalance(lastSentAmount ?? 0, "USDC"),
      proofStatusLabel: "Local send transition recorded",
      recipientLabel: lastRecipient ?? "Recipient unavailable",
      releasePackageLabel:
        privateCoreReleasePackageState?.packageStatusLabel ??
        privateCoreReleaseHandoffState?.packageStatusLabel ??
        "No operator package available",
      remainingBalanceLabel: formatBalance(shieldAccount?.balance ?? 0, "USDC"),
      residualNoteLabel: formatBalance(lastChangeAmount ?? 0, "USDC"),
      sendNoteLabel: abbreviate(sendNoteTransaction.signature) ?? "No send-note signature retained",
      spentMarkerLabel:
        abbreviate(spentMarkerTransaction.signature) ?? "No spent-marker signature retained",
    };
  }, [
    lastChangeAmount,
    lastRecipient,
    lastSentAmount,
    privateCoreHoldState,
    privateCoreOperatorLatestSendLinkedProof?.nullifier,
    privateCoreReleaseHandoffState?.packageStatusLabel,
    privateCoreReleasePackageState?.packageStatusLabel,
    privateCoreSendExecution.latestSendId,
    privateCoreSendExecution.proofPublicInputCount,
    privateCoreSendExecution.status,
    privateCoreSendPreview,
    privateCoreSendState,
    sendNoteTransaction.signature,
    shieldAccount?.balance,
    spentMarkerTransaction.signature,
    status,
    trimmedRecipient,
  ]);

  useEffect(() => {
    if (!sendReceiptModalDetails) {
      setSendReceiptModalOpen(false);
    }
  }, [sendReceiptModalDetails]);

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
          }, { viewingPublicKey: viewingKey?.publicKey }),
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
    viewingKey?.publicKey,
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
          ownerContext: pendingSendBridge.ownerContext,
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
    const liveRecipientValidation = validateLiveSendRecipient(
      args.recipientValue,
      args.shieldAccountState.owner,
      recipientInputSource,
    );

    if (!liveRecipientValidation.ready || liveRecipientValidation.kind !== "solana-address") {
      throw new Error(liveRecipientValidation.detail);
    }

    const trimmedRecipient = liveRecipientValidation.canonicalAddress;
    const nextChangeAmount = Number(
      Math.max(args.note.amount - args.amountNumeric, 0).toFixed(6),
    );
    setLastRecipient(trimmedRecipient);
    setLastSentAmount(args.amountNumeric);
    setLastChangeAmount(nextChangeAmount);
    if (trimmedRecipient !== args.shieldAccountState.owner) {
      throw new Error(
        "External Vanta Send v2 requires recipient viewing-key exchange before action memo creation.",
      );
    }
    if (!viewingKey?.publicKey) {
      throw new Error("Vanta action memo encryption requires your Shield viewing key to be ready.");
    }
    const ownerContext = await shieldOwnerContext.ensureOwnerContext();
    setStatus("awaiting_confirmation");

    const createdAt = Date.now();
    const preparedSend = createPreparedSendMemo(
      {
        amount: args.amountNumeric.toString(),
        asset: "USDC",
        changeAmount: nextChangeAmount.toString(),
        consumedNoteId: args.note.noteId,
        createdAt,
        mintAddress: liveShieldAsset.mintAddress!,
        owner: args.shieldAccountState.owner,
        recipient: trimmedRecipient,
        vaultOwner: args.shieldAccountState.vaultOwner,
      },
      { viewingPublicKey: viewingKey?.publicKey },
    );

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
      ownerContext,
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

    if (!sendLedgerGateStatus.ready) {
      const errorMessage =
        sendLedgerGateStatus.detail ||
        "Send requires a canonical ledger-spendable note before the private-core proof lane can run.";

      setStatus("failed");
      setFlowError(errorMessage);
      setPrivateCoreSendExecution({
        errorMessage,
        latestProofAction: null,
        latestProofId: null,
        latestSendId: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        status: "failed",
      });
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
      const noWitnessProofArtifact = privateCoreSendPreview.boundary.proofArtifact;

      if (!noWitnessProofArtifact) {
        throw new Error("Browser proving not enabled yet. Send blocked.");
      }

      if (!selectedCanonicalSendLedgerNote) {
        throw new Error("Select a ledger note first.");
      }

      if (!viewingKey?.publicKey) {
        throw new Error("Shield viewing key required.");
      }

      if (!recipientViewingPublicKey) {
        throw new Error("Recipient viewing-key exchange required.");
      }

      const preparedPrivateCoreSendMemo = createPreparedSendDualAeadMemo(
        {
          amount: formatBaseUnits(
            BigInt(privateCoreSendPreview.sendAmountBaseUnits),
            DEFAULT_USDC_DECIMALS,
          ),
          asset: "USDC",
          changeAmount: formatBaseUnits(
            BigInt(privateCoreSendPreview.changeAmountBaseUnits),
            DEFAULT_USDC_DECIMALS,
          ),
          consumedNoteId: selectedCanonicalSendLedgerNote.noteId,
          consumedShieldStateSignature: selectedCanonicalSendLedgerNote.stateSignature,
          createdAt: Date.now(),
          mintAddress: selectedCanonicalSendLedgerNote.mintAddress,
          owner: selectedCanonicalSendLedgerNote.owner,
          recipient: trimmedRecipient,
          vaultOwner: selectedCanonicalSendLedgerNote.vaultOwner,
        },
        {
          changeViewingPublicKey: viewingKey.publicKey,
          recipientViewingPublicKey,
        },
      );

      if (privateCoreHoldState) {
        await ensurePrivateCoreOperatorRootKnown({
          proofBoundary: buildVantaPrivateCoreUnshieldProofBoundary({
            heldNote: privateCoreHoldState.heldNote,
            ownerSecretKey: (privateCoreOwner as any).secretKey,
            releaseDestination:
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          }),
          sourceArtifacts: deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
            privateCoreHoldState.heldNote,
          ),
        });
      }

      const sendReceipt = await requestVantaPrivateCoreOperatorSendTransition({
        proofArtifact: noWitnessProofArtifact,
        releaseCandidateId,
        resultingRoot: previewResult.resultingRoot,
      });
      runPrivateCoreSendTransition(privateCoreSendPreview.transition, {
        changeMemoCiphertextBodyHash:
          preparedPrivateCoreSendMemo.changeMemoCiphertextBodyHash,
        releaseCandidateId: sendReceipt.releaseCandidateId ?? releaseCandidateId,
        recipientMemoCiphertextBodyHash:
          preparedPrivateCoreSendMemo.recipientMemoCiphertextBodyHash,
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
  const sendPrimaryActionLabel = isAmountValid
    ? `Send ${formatBalance(parsedAmount, selectedAsset)}`
    : `Send ${selectedAsset}`;
  const sendHelperMessage = shieldStateError
    ? shieldStateError
    : isBetaMode
      ? "Beta: Send visible. Live settlement blocked until gates pass."
      : selectedSendCapability.executionMode === "unsupported-private-send-asset"
        ? selectedSendCapability.blockers[0] ??
          "Private-core send currently supports shielded USDC."
      : recipient.trim().length > 0 && !recipientValidation.ready
        ? recipientValidation.detail
      : isPrivateCoreUsdcSendReady
      ? "Ready to verify a ledger-gated private-core send transition."
      : !sendLedgerGateStatus.ready && selectedAsset === "USDC"
        ? sendLedgerGateStatus.detail
      : !selectedSpendableNote
        ? "Shield the asset first, then return here to send it."
        : "Enter a valid amount and recipient wallet address.";

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">{dashboard ? "Dashboard" : "Send shielded"}</span>
          <h2>Send</h2>
          <p>Send from your private balance to another wallet.</p>
        </div>

        <div
          className="module-state"
          data-production-privacy-claims-locked={
            sendTrustContract.claimControls.productionPrivacyClaimsLocked
          }
        >
          <strong>Beta — recipient discovery is not yet live</strong>
          <details>
            <summary>Technical status</summary>
            <p>Current truth: {sendTrustContract.currentTruth}.</p>
            <p>{sendTrustContract.visibleStatusCopy}</p>
          </details>
        </div>
      </div>

      <LaneFlowIndicator
        ariaLabel="Send flow"
        activeStepIndex={1}
        steps={[
          { id: "shield", label: "Shield" },
          { id: "send", label: "Send" },
          { id: "hold-change", label: "Hold change" },
        ]}
      />

      <SendContextBanner formatBalance={formatBalance} recentShield={recentShield} />

      <div className="send-layout">
        <SendWorkspaceCard
          amount={amount}
          formatBalance={formatBalance}
          flowError={flowError}
          handleSend={handleSend}
          isAmountValid={isAmountValid}
          isBetaMode={isBetaMode}
          isPrivateCoreUsdcSendReady={isPrivateCoreUsdcSendReady}
          isSendAdvancedOpen={isSendAdvancedOpen}
          lastChangeAmount={lastChangeAmount}
          lastRecipient={lastRecipient}
          lastSentAmount={lastSentAmount}
          parsedAmount={parsedAmount}
          privateCoreSendExecution={privateCoreSendExecution}
          recentSendRecipients={recentSendRecipients}
          recipient={recipient}
          recipientValidation={recipientValidation}
          selectedAsset={selectedAsset}
          selectedBalance={selectedBalance}
          selectedSendCapability={selectedSendCapability}
          selectedSpendableNote={selectedSpendableNote}
          selectedNoteId={selectedNoteId}
          sendHelperMessage={sendHelperMessage}
          sendNotePickerOptions={sendNotePickerOptions}
          sendNoteSignature={sendNoteTransaction.signature}
          sendPrimaryActionLabel={sendPrimaryActionLabel}
          sendProgressLabel={sendProgressLabel}
          sendReceiptModalDetails={sendReceiptModalDetails}
          sendShieldedAssetOptions={sendShieldedAssetOptions}
          settleProgressLabel={settleProgressLabel}
          shieldAccount={shieldAccount}
          shieldStateRefreshing={shieldStateRefreshing}
          spentMarkerSignature={spentMarkerTransaction.signature}
          spendableNotes={spendableNotes}
          status={status}
          trimmedRecipient={trimmedRecipient}
          onAmountChange={(value) => {
            setAmount(value);
            setStatus("idle");
            setFlowError(null);
          }}
          onAssetChange={(asset) => {
            setSelectedAsset(asset);
            setStatus("idle");
            setFlowError(null);
          }}
          onRecipientChange={(nextRecipient, inputSource) => {
            setRecipient(nextRecipient);
            setRecipientInputSource(inputSource);
            setStatus("idle");
            setFlowError(null);
          }}
          onRetryAfterFailure={() => {
            setStatus("review");
            setFlowError(null);
          }}
          onSelectNote={(nextNoteId) => {
            setSelectedNoteId(nextNoteId);
            setAmount("");
            setStatus("idle");
            setFlowError(null);
          }}
          onSendAdvancedOpenChange={setIsSendAdvancedOpen}
          onSendMore={() => {
            setRecipient("");
            setAmount(selectedSpendableNote?.amount.toFixed(2) ?? "");
            setStatus("idle");
            setFlowError(null);
            setPendingSendBridge(null);
          }}
          onSetSendAdvancedOpen={setIsSendAdvancedOpen}
          setSendReceiptModalOpen={setSendReceiptModalOpen}
        />

        <LaneProgressiveSection summary="Private-core proof lane (reviewer)" variant="reviewer">
          <SendProofLanePanel
            copyReleasePackageExport={copyReleasePackageExport}
            downloadReleasePackageExport={downloadReleasePackageExport}
            handlePrivateCoreSendProof={handlePrivateCoreSendProof}
            isBetaMode={isBetaMode}
            isPrivateCoreUsdcSendReady={isPrivateCoreUsdcSendReady}
            privateCoreHoldState={privateCoreHoldState}
            privateCoreOperatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
            privateCoreOperatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
            privateCoreOperatorCurrentRootProofLinkStatus={privateCoreOperatorCurrentRootProofLinkStatus}
            privateCoreOperatorLatestSend={privateCoreOperatorLatestSend}
            privateCoreOperatorLatestSendLinkedProof={privateCoreOperatorLatestSendLinkedProof}
            privateCoreOperatorLatestSendProof={privateCoreOperatorLatestSendProof}
            privateCoreOperatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
            privateCoreOperatorSendBoundaryPrimaryNote={privateCoreOperatorSendBoundaryPrimaryNote}
            privateCoreOperatorSendBoundaryStatusLabel={privateCoreOperatorSendBoundaryStatusLabel}
            privateCoreOperatorSendContinuityPrimaryNote={privateCoreOperatorSendContinuityPrimaryNote}
            privateCoreOperatorSendContinuityStatusLabel={privateCoreOperatorSendContinuityStatusLabel}
            privateCoreOperatorSendResultingRootPrimaryNote={privateCoreOperatorSendResultingRootPrimaryNote}
            privateCoreOperatorSendResultingRootProofLinkStatus={privateCoreOperatorSendResultingRootProofLinkStatus}
            privateCoreOperatorSendResultingRootRecord={privateCoreOperatorSendResultingRootRecord}
            privateCoreOperatorSendResultingRootStatusLabel={privateCoreOperatorSendResultingRootStatusLabel}
            privateCoreOperatorSummaryUpdatedAt={privateCoreOperatorSummaryUpdatedAt}
            privateCoreReleaseCandidateState={privateCoreReleaseCandidateState}
            privateCoreReleaseHandoffState={privateCoreReleaseHandoffState}
            privateCoreReleasePackageState={privateCoreReleasePackageState}
            privateCoreReleaseWorkflowState={privateCoreReleaseWorkflowState}
            privateCoreSendExecution={privateCoreSendExecution}
            privateCoreSendPreview={privateCoreSendPreview}
            privateCoreSendState={privateCoreSendState}
            refreshPrivateCoreOperatorSummary={refreshPrivateCoreOperatorSummary}
            releaseHandoffRefreshPending={releaseHandoffRefreshPending}
            releasePackageExportStatus={releasePackageExportStatus}
            selectedCanonicalSendLedgerNote={selectedCanonicalSendLedgerNote}
            sendLedgerGateStatus={sendLedgerGateStatus}
            sendReceiptModalDetails={sendReceiptModalDetails}
            setFlowError={setFlowError}
            setPrivateCoreSendExecution={setPrivateCoreSendExecution}
            setReleaseHandoffRefreshPending={setReleaseHandoffRefreshPending}
            setSendReceiptModalOpen={setSendReceiptModalOpen}
            setStatus={setStatus}
          />
        </LaneProgressiveSection>
      </div>

      {sendReceiptModalDetails && (
        <SendReceiptModal
          details={sendReceiptModalDetails}
          open={sendReceiptModalOpen}
          onClose={() => setSendReceiptModalOpen(false)}
        >
          <details className="send-completion-details shield-helper shield-helper--meta">
            <summary>Internal send diagnostics</summary>
            <p>
              Internal/debug only. Inspect canonical predecessor linkage and successor note
              insertions created from recent live send actions.
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
        </SendReceiptModal>
      )}

      <LaneProgressiveSection summary="Full private-core operator state (reviewer)" variant="reviewer">
        <SendOperatorStatePanel
          statePanelProps={{
            compact: true,
            holdState: privateCoreHoldState,
            releaseCandidateState: privateCoreReleaseCandidateState,
            releaseHandoffState: privateCoreReleaseHandoffState,
            releasePackageState: privateCoreReleasePackageState,
            releaseWorkflowState: privateCoreReleaseWorkflowState,
            sendState: privateCoreSendState,
            swapState: privateCoreSwapState,
            operatorCurrentRoot: privateCoreOperatorCurrentRoot,
            operatorConsumeError: privateCoreOperatorConsumeError,
            operatorConsumes: privateCoreOperatorConsumes,
            operatorLatestConsume: privateCoreOperatorLatestConsume,
            operatorLatestConsumeProof: privateCoreOperatorLatestConsumeProof,
            operatorLatestProof: privateCoreOperatorLatestProof,
            operatorLatestRelease: privateCoreOperatorLatestRelease,
            operatorLatestReleaseProof: privateCoreOperatorLatestReleaseProof,
            operatorLatestRoot: privateCoreOperatorLatestRoot,
            operatorLatestSend: privateCoreOperatorLatestSend,
            operatorLatestSendLinkedProof: privateCoreOperatorLatestSendLinkedProof,
            operatorLatestSendProof: privateCoreOperatorLatestSendProof,
            operatorLatestSwap: privateCoreOperatorLatestSwap,
            operatorLatestSwapLinkedProof: privateCoreOperatorLatestSwapLinkedProof,
            operatorLatestSwapProof: privateCoreOperatorLatestSwapProof,
            operatorBoundaryPrimaryNote: privateCoreOperatorBoundaryPrimaryNote,
            operatorBoundaryStatusLabel: privateCoreOperatorBoundaryStatusLabel,
            operatorContractMirrorPrimaryNote: privateCoreOperatorContractMirrorPrimaryNote,
            operatorContractMirrorStatusLabel: privateCoreOperatorContractMirrorStatusLabel,
            operatorReleaseBoundaryPrimaryNote: privateCoreOperatorReleaseBoundaryPrimaryNote,
            operatorReleaseBoundaryStatusLabel: privateCoreOperatorReleaseBoundaryStatusLabel,
            operatorRequiredLanesPrimaryNote: privateCoreOperatorRequiredLanesPrimaryNote,
            operatorRequiredLanesStatusLabel: privateCoreOperatorRequiredLanesStatusLabel,
            operatorZkV1ShippingPrimaryNote: privateCoreOperatorZkV1ShippingPrimaryNote,
            operatorZkV1ShippingStatusLabel: privateCoreOperatorZkV1ShippingStatusLabel,
            operatorSendBoundaryPrimaryNote: privateCoreOperatorSendBoundaryPrimaryNote,
            operatorSendBoundaryStatusLabel: privateCoreOperatorSendBoundaryStatusLabel,
            operatorSendContinuityPrimaryNote: privateCoreOperatorSendContinuityPrimaryNote,
            operatorSendContinuityStatusLabel: privateCoreOperatorSendContinuityStatusLabel,
            operatorSwapBoundaryPrimaryNote: privateCoreOperatorSwapBoundaryPrimaryNote,
            operatorSwapBoundaryStatusLabel: privateCoreOperatorSwapBoundaryStatusLabel,
            operatorSwapContinuityPrimaryNote: privateCoreOperatorSwapContinuityPrimaryNote,
            operatorSwapContinuityStatusLabel: privateCoreOperatorSwapContinuityStatusLabel,
            operatorSupportedSendLaneKind: privateCoreOperatorSupportedSendLaneKind,
            operatorSupportedSendLaneNote: privateCoreOperatorSupportedSendLaneNote,
            operatorSupportedSendLaneStatus: privateCoreOperatorSupportedSendLaneStatus,
            operatorSupportedSendLaneVersion: privateCoreOperatorSupportedSendLaneVersion,
            operatorSupportedSendV1Decision: privateCoreOperatorSupportedSendV1Decision,
            operatorSupportedSendV1DecisionNote: privateCoreOperatorSupportedSendV1DecisionNote,
            operatorSupportedUnshieldLaneKind: privateCoreOperatorSupportedUnshieldLaneKind,
            operatorSupportedUnshieldLaneNote: privateCoreOperatorSupportedUnshieldLaneNote,
            operatorSupportedUnshieldLaneStatus: privateCoreOperatorSupportedUnshieldLaneStatus,
            operatorSupportedUnshieldLaneVersion: privateCoreOperatorSupportedUnshieldLaneVersion,
            operatorSupportedUnshieldV1Decision: privateCoreOperatorSupportedUnshieldV1Decision,
            operatorSupportedUnshieldV1DecisionNote: privateCoreOperatorSupportedUnshieldV1DecisionNote,
            operatorSupportedReleaseLaneKind: privateCoreOperatorSupportedReleaseLaneKind,
            operatorSupportedReleaseLaneNote: privateCoreOperatorSupportedReleaseLaneNote,
            operatorSupportedReleaseLaneStatus: privateCoreOperatorSupportedReleaseLaneStatus,
            operatorSupportedReleaseLaneVersion: privateCoreOperatorSupportedReleaseLaneVersion,
            operatorSupportedSwapLaneKind: privateCoreOperatorSupportedSwapLaneKind,
            operatorSupportedSwapLaneNote: privateCoreOperatorSupportedSwapLaneNote,
            operatorSupportedSwapLaneStatus: privateCoreOperatorSupportedSwapLaneStatus,
            operatorSupportedSwapLaneVersion: privateCoreOperatorSupportedSwapLaneVersion,
            operatorSupportedSwapV1Decision: privateCoreOperatorSupportedSwapV1Decision,
            operatorSupportedSwapV1DecisionNote: privateCoreOperatorSupportedSwapV1DecisionNote,
            operatorSupportedSwapV1Role: privateCoreOperatorSupportedSwapV1Role,
            operatorSupportedSwapV1RoleNote: privateCoreOperatorSupportedSwapV1RoleNote,
            operatorSupportedSwapVenue: privateCoreOperatorSupportedSwapVenue,
            operatorSupportedSwapOutputModel: privateCoreOperatorSupportedSwapOutputModel,
            operatorSupportedSwapResultingRootBasis: privateCoreOperatorSupportedSwapResultingRootBasis,
            operatorSupportedSwapInputRootPolicy: privateCoreOperatorSupportedSwapInputRootPolicy,
            operatorSupportedSwapOutputRegistrationPolicy: privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
            operatorSupportedReleaseV1Decision: privateCoreOperatorSupportedReleaseV1Decision,
            operatorSupportedReleaseV1DecisionNote: privateCoreOperatorSupportedReleaseV1DecisionNote,
            operatorSupportedFlowKind: privateCoreOperatorSupportedFlowKind,
            operatorSupportedFlowNote: privateCoreOperatorSupportedFlowNote,
            operatorSupportedFlowStatus: privateCoreOperatorSupportedFlowStatus,
            operatorSupportedFlowVersion: privateCoreOperatorSupportedFlowVersion,
            operatorSupportedZkV1ScopeDecision: privateCoreOperatorSupportedZkV1ScopeDecision,
            operatorSupportedZkV1ScopeNote: privateCoreOperatorSupportedZkV1ScopeNote,
            operatorSupportedZkV1RequiredLanes: privateCoreOperatorSupportedZkV1RequiredLanes,
            operatorSupportedZkV1RequiredLanesNote: privateCoreOperatorSupportedZkV1RequiredLanesNote,
            operatorZkV1FinishLineStatusLabel: privateCoreOperatorZkV1FinishLineStatusLabel,
            operatorZkV1FinishLinePrimaryNote: privateCoreOperatorZkV1FinishLinePrimaryNote,
            operatorSupportedAssetSymbol: privateCoreOperatorSupportedAssetSymbol,
            operatorSupportedEnvironment: privateCoreOperatorSupportedEnvironment,
            operatorSupportedNoteSchema: privateCoreOperatorSupportedNoteSchema,
            operatorSupportedNoteVersion: privateCoreOperatorSupportedNoteVersion,
            operatorSupportedRootRegistrationProvenance: privateCoreOperatorSupportedRootRegistrationProvenance,
            operatorSupportedSendResultingRootBasis: privateCoreOperatorSupportedSendResultingRootBasis,
            operatorSupportedSendInputRootPolicy: privateCoreOperatorSupportedSendInputRootPolicy,
            operatorSupportedSendOutputRegistrationPolicy: privateCoreOperatorSupportedSendOutputRegistrationPolicy,
            operatorSupportedRecipientModel: privateCoreOperatorSupportedRecipientModel,
            operatorSupportedReleaseDestinationModel: privateCoreOperatorSupportedReleaseDestinationModel,
            operatorSupportedProofSystem: privateCoreOperatorSupportedProofSystem,
            operatorSupportedUnshieldCircuit: privateCoreOperatorSupportedUnshieldCircuit,
            operatorSupportedSendCircuit: privateCoreOperatorSupportedSendCircuit,
            operatorSupportedUnshieldMerkleDepth: privateCoreOperatorSupportedUnshieldMerkleDepth,
            operatorSupportedSendMerkleDepth: privateCoreOperatorSupportedSendMerkleDepth,
            operatorSupportedReleaseAuthorizationBasis: privateCoreOperatorSupportedReleaseAuthorizationBasis,
            operatorSupportedReleaseRootPolicy: privateCoreOperatorSupportedReleaseRootPolicy,
            operatorSupportedReleaseExecutionModel: privateCoreOperatorSupportedReleaseExecutionModel,
            operatorSupportedReleaseAtomicityModel: privateCoreOperatorSupportedReleaseAtomicityModel,
            operatorSupportedReleasePersistenceModel: privateCoreOperatorSupportedReleasePersistenceModel,
            operatorOwnerAuthorizationMode: privateCoreOperatorOwnerAuthorizationMode,
            operatorOwnerAuthorizationDecision: privateCoreOperatorOwnerAuthorizationDecision,
            operatorOwnerAuthorizationDecisionNote: privateCoreOperatorOwnerAuthorizationDecisionNote,
            operatorSourceArtifactTruthBasis: privateCoreOperatorSourceArtifactTruthBasis,
            operatorProvingArtifactTruthBasis: privateCoreOperatorProvingArtifactTruthBasis,
            operatorSourceProvingRelationship: privateCoreOperatorSourceProvingRelationship,
            operatorNullifierKeyMode: privateCoreOperatorNullifierKeyMode,
            operatorProvingHashLane: privateCoreOperatorProvingHashLane,
            operatorCurrentRootLinkedProof: privateCoreOperatorCurrentRootLinkedProof,
            operatorCurrentRootProofLinkStatus: privateCoreOperatorCurrentRootProofLinkStatus,
            operatorSendResultingRootLinkedProof: privateCoreOperatorSendResultingRootLinkedProof,
            operatorSendResultingRootRecord: privateCoreOperatorSendResultingRootRecord,
            operatorSendResultingRootPrimaryNote: privateCoreOperatorSendResultingRootPrimaryNote,
            operatorSendResultingRootRegistrationPrimaryNote: privateCoreOperatorSendResultingRootRegistrationPrimaryNote,
            operatorSendResultingRootRegistrationStatusLabel: privateCoreOperatorSendResultingRootRegistrationStatusLabel,
            operatorSendResultingRootProofLinkStatus: privateCoreOperatorSendResultingRootProofLinkStatus,
            operatorSendResultingRootStatusLabel: privateCoreOperatorSendResultingRootStatusLabel,
            operatorSwapResultingRootLinkedProof: privateCoreOperatorSwapResultingRootLinkedProof,
            operatorSwapResultingRootRecord: privateCoreOperatorSwapResultingRootRecord,
            operatorSwapResultingRootPrimaryNote: privateCoreOperatorSwapResultingRootPrimaryNote,
            operatorSwapResultingRootRegistrationPrimaryNote: privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
            operatorSwapResultingRootRegistrationStatusLabel: privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
            operatorSwapResultingRootProofLinkStatus: privateCoreOperatorSwapResultingRootProofLinkStatus,
            operatorSwapResultingRootStatusLabel: privateCoreOperatorSwapResultingRootStatusLabel,
            operatorProofConsumeLinkStatus: privateCoreOperatorProofConsumeLinkStatus,
            operatorProofError: privateCoreOperatorProofError,
            operatorProofs: privateCoreOperatorProofs,
            operatorProofSendLinkStatus: privateCoreOperatorProofSendLinkStatus,
            operatorProofSwapLinkStatus: privateCoreOperatorProofSwapLinkStatus,
            operatorProofReleaseLinkStatus: privateCoreOperatorProofReleaseLinkStatus,
            operatorReleaseError: privateCoreOperatorReleaseError,
            operatorReleases: privateCoreOperatorReleases,
            operatorRootCurrentnessLabel: privateCoreOperatorRootCurrentnessLabel,
            operatorRootError: privateCoreOperatorRootError,
            operatorRootRegistrationStatus: privateCoreOperatorRootRegistrationStatus,
            operatorRoots: privateCoreOperatorRoots,
            operatorContractStateVersion: privateCoreOperatorContractStateVersion,
            operatorContractVersion: privateCoreOperatorContractVersion,
            operatorContractSummaryVersion: privateCoreOperatorContractSummaryVersion,
            operatorStatusVersion: privateCoreOperatorStatusVersion,
            operatorStatusKind: privateCoreOperatorStatusKind,
            operatorSnapshotVersion: privateCoreOperatorSnapshotVersion,
            operatorSnapshotKind: privateCoreOperatorSnapshotKind,
            operatorSupportedStatusNote: privateCoreOperatorSupportedStatusNote,
            operatorSupportedStatusTransport: privateCoreOperatorSupportedStatusTransport,
            operatorSupportedStatusEndpoint: privateCoreOperatorSupportedStatusEndpoint,
            operatorSupportedStatusGateVersion: privateCoreOperatorSupportedStatusGateVersion,
            operatorSupportedStatusGateKind: privateCoreOperatorSupportedStatusGateKind,
            operatorSupportedStatusGateNote: privateCoreOperatorSupportedStatusGateNote,
            operatorSupportedStatusGateTransport: privateCoreOperatorSupportedStatusGateTransport,
            operatorSupportedStatusGateEndpoint: privateCoreOperatorSupportedStatusGateEndpoint,
            operatorSupportedSnapshotGateVersion: privateCoreOperatorSupportedSnapshotGateVersion,
            operatorSupportedSnapshotGateKind: privateCoreOperatorSupportedSnapshotGateKind,
            operatorSupportedSnapshotGateNote: privateCoreOperatorSupportedSnapshotGateNote,
            operatorSupportedSnapshotGateTransport: privateCoreOperatorSupportedSnapshotGateTransport,
            operatorSupportedSnapshotGateEndpoint: privateCoreOperatorSupportedSnapshotGateEndpoint,
            operatorSupportedShippingDecisionGateVersion: privateCoreOperatorSupportedShippingDecisionGateVersion,
            operatorSupportedShippingDecisionGateKind: privateCoreOperatorSupportedShippingDecisionGateKind,
            operatorSupportedShippingDecisionGateNote: privateCoreOperatorSupportedShippingDecisionGateNote,
            operatorSupportedShippingDecisionGateTransport: privateCoreOperatorSupportedShippingDecisionGateTransport,
            operatorSupportedShippingDecisionGateEndpoint: privateCoreOperatorSupportedShippingDecisionGateEndpoint,
            operatorSupportedShippingDecisionTransport: privateCoreOperatorSupportedShippingDecisionTransport,
            operatorSupportedShippingDecisionEndpoint: privateCoreOperatorSupportedShippingDecisionEndpoint,
            operatorSupportedShippingArtifactGateVersion: privateCoreOperatorSupportedShippingArtifactGateVersion,
            operatorSupportedShippingArtifactGateKind: privateCoreOperatorSupportedShippingArtifactGateKind,
            operatorSupportedShippingArtifactGateNote: privateCoreOperatorSupportedShippingArtifactGateNote,
            operatorSupportedShippingArtifactGateTransport: privateCoreOperatorSupportedShippingArtifactGateTransport,
            operatorSupportedShippingArtifactGateEndpoint: privateCoreOperatorSupportedShippingArtifactGateEndpoint,
            operatorSupportedSnapshotNote: privateCoreOperatorSupportedSnapshotNote,
            operatorSupportedSnapshotTransport: privateCoreOperatorSupportedSnapshotTransport,
            operatorSupportedSnapshotEndpoint: privateCoreOperatorSupportedSnapshotEndpoint,
            operatorSupportedShippingArtifactNote: privateCoreOperatorSupportedShippingArtifactNote,
            operatorSupportedShippingArtifactTransport: privateCoreOperatorSupportedShippingArtifactTransport,
            operatorSupportedShippingArtifactEndpoint: privateCoreOperatorSupportedShippingArtifactEndpoint,
            operatorSupportedReleaseCandidateVersion: privateCoreOperatorSupportedReleaseCandidateVersion,
            operatorSupportedReleaseCandidateKind: privateCoreOperatorSupportedReleaseCandidateKind,
            operatorSupportedReleaseCandidateNote: privateCoreOperatorSupportedReleaseCandidateNote,
            operatorSupportedReleaseCandidateGateVersion: privateCoreOperatorSupportedReleaseCandidateGateVersion,
            operatorSupportedReleaseCandidateGateKind: privateCoreOperatorSupportedReleaseCandidateGateKind,
            operatorSupportedReleaseCandidateGateNote: privateCoreOperatorSupportedReleaseCandidateGateNote,
            operatorSupportedReleaseCandidateGateTransport: privateCoreOperatorSupportedReleaseCandidateGateTransport,
            operatorSupportedReleaseCandidateGateEndpoint: privateCoreOperatorSupportedReleaseCandidateGateEndpoint,
            operatorSupportedReleaseCandidateTransport: privateCoreOperatorSupportedReleaseCandidateTransport,
            operatorSupportedReleaseCandidateEndpoint: privateCoreOperatorSupportedReleaseCandidateEndpoint,
            operatorShippingArtifactVersion: privateCoreOperatorShippingArtifactVersion,
            operatorShippingArtifactKind: privateCoreOperatorShippingArtifactKind,
            operatorShippingDecisionVersion: privateCoreOperatorShippingDecisionVersion,
            operatorShippingDecisionKind: privateCoreOperatorShippingDecisionKind,
            operatorSupportedShippingDecisionNote: privateCoreOperatorSupportedShippingDecisionNote,
            operatorSendError: privateCoreOperatorSendError,
            operatorSends: privateCoreOperatorSends,
            operatorSendProofError: privateCoreOperatorSendProofError,
            operatorSendProofs: privateCoreOperatorSendProofs,
            operatorSwaps: privateCoreOperatorSwaps,
            operatorSwapProofs: privateCoreOperatorSwapProofs,
            operatorSummaryUpdatedAt: privateCoreOperatorSummaryUpdatedAt,
            shieldState: privateCoreRecentShield,
            title: "Vanta Private Core send state",
            unshieldState: privateCoreUnshieldState,
          }}
        />
      </LaneProgressiveSection>
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
