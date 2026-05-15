import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { NotePicker, type NotePickerOption } from "@/components/NotePicker";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { PrivacySummary, type PrivacySummaryItem } from "@/components/PrivacySummary";
import { RecipientField } from "@/components/RecipientField";
import { SendReceiptModal, type SendReceiptModalDetails } from "@/components/SendReceiptModal";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
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
  type SendTransitionV0,
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

const SEND_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a transaction happened, plus encrypted memo packets",
  },
  {
    label: "Recipient sees",
    value: "amount, asset, and recovery data with the matched viewing key",
  },
  {
    label: "Operator sees",
    value: "proof and settlement status, not witness values or plaintext memo contents",
  },
];

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
          <p>Send shielded assets privately to other Vanta users.</p>
        </div>

        <div className="module-state">
          <strong>{sendTrustContract.currentTruth}</strong>
          <p>
            {sendTrustContract.claimControls.productionPrivacyClaimsLocked
              ? "Send is in guarded beta. Private recipient discovery is not yet available."
              : "Production Send privacy claims are unlocked by current evidence."}
          </p>
        </div>
      </div>

      <LaneFlowIndicator
        ariaLabel="Send flow"
        activeStepIndex={1}
        steps={[
          { id: "shield", label: "Shield" },
          { id: "send", label: "Send" },
          { id: "hold-change", label: "Change" },
        ]}
      />

      {recentShield ? (
        <div className="send-context-banner">
          <div>
            <span>Syncing</span>
            <h3>{formatBalance(recentShield.amount, recentShield.asset)} deposit recorded.</h3>
            <p>Wait for ledger reconciliation before sending.</p>
          </div>
          <div className="send-context-banner__meta">
            <strong>Pending</strong>
            <small>Not spendable yet</small>
          </div>
        </div>
      ) : (
        <div className="send-context-banner send-context-banner--quiet">
          <div>
            <span>Empty Vault</span>
            <h3>No send-ready balance yet.</h3>
            <p>Start with Shield.</p>
          </div>
          <Link className="button button-ghost" to="/app/shield">
            Shield first
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
              <RecipientField
                id="send-recipient"
                label="To"
                onValueChange={(nextRecipient, inputSource) => {
                  setRecipient(nextRecipient);
                  setRecipientInputSource(inputSource);
                  setStatus("idle");
                  setFlowError(null);
                }}
                recentRecipients={recentSendRecipients}
                validation={recipientValidation}
                value={recipient}
              />

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Amount</span>
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
              </div>

              <div className="send-note-summary">
                <div>
                  <span>Spending</span>
                  <strong>
                    {selectedSpendableNote
                      ? `${formatBalance(selectedSpendableNote.amount, selectedAsset)} note`
                      : "No send-ready note"}
                  </strong>
                  {selectedSpendableNote && (
                    <small>
                      {abbreviate(selectedSpendableNote.noteId) ?? selectedSpendableNote.noteId}
                    </small>
                  )}
                </div>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setIsSendAdvancedOpen(true);
                  }}
                  disabled={spendableNotes.length === 0}
                >
                  Change note
                </button>
              </div>

              <PrivacySummary
                items={SEND_PRIVACY_SUMMARY_ITEMS}
                note="Beta truth: production Send privacy remains claim-locked until live evidence, approval, audit, replay, and operator gates pass."
              />

              <details
                className="send-advanced-panel"
                data-vanta-send-advanced-panel
                open={isSendAdvancedOpen}
                onToggle={(event) => {
                  setIsSendAdvancedOpen(event.currentTarget.open);
                }}
              >
                <summary>Advanced send settings</summary>
                <div className="send-advanced-panel__grid">
                  <label className="send-advanced-panel__field">
                    <span>Custom note selection</span>
                    <NotePicker
                      ariaLabel="Send note selection"
                      automaticLabel="Automatic best note"
                      emptyCopy="start with Shield to create a send-ready note."
                      emptyOptionLabel="No send-ready notes"
                      helperText="Sends from your current shielded notes."
                      onSelectNote={(nextNoteId) => {
                        setSelectedNoteId(nextNoteId);
                        setAmount("");
                        setStatus("idle");
                        setFlowError(null);
                      }}
                      options={sendNotePickerOptions}
                      selectedNoteId={selectedNoteId}
                    />
                  </label>

                  <div className="send-advanced-panel__field">
                    <span>Encrypted recipient memo</span>
                    <strong>Automatic v2 AEAD packet</strong>
                    <small>Plaintext memo contents stay out of the operator packet.</small>
                  </div>

                  <div className="send-advanced-panel__field">
                    <span>Spent marker</span>
                    <strong>Automatic</strong>
                    <small>The marker is attached after wallet confirmation.</small>
                  </div>
                </div>
              </details>

              <p className="shield-helper" data-vanta-send-ledger-gate-status>
                {sendHelperMessage}
              </p>

              <div className="shield-form__actions">
                <button
                  className="button button-primary"
                  data-vanta-send-primary-action
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
                  {sendPrimaryActionLabel}
                </button>
              </div>
            </div>
          </div>

          {status === "awaiting_confirmation" && (
            <TransactionStatusToast
              tone="pending"
              phase="pending"
              title="Awaiting wallet confirmation"
              message="Approve this shielded-state send in your wallet."
              progress
              floating
            >
              <WalletApprovalSheet
                heading="Send wallet approval"
                walletPrompt="Wallet approval"
                signingMode="Transaction approval"
                rows={[
                  { label: "Action", value: "Record a constrained Send transition" },
                  { label: "Asset", value: selectedAsset },
                  {
                    label: "Amount",
                    value: isAmountValid ? formatBalance(parsedAmount, selectedAsset) : "Pending",
                  },
                  { label: "Recipient", value: abbreviate(trimmedRecipient) ?? "Pending" },
                  {
                    label: "Input note",
                    value: abbreviate(selectedSpendableNote?.noteId) ?? "Automatic best note",
                  },
                ]}
                note="Approve this shielded-state send only after the wallet prompt matches the selected recipient, asset, and amount."
                truthBoundary="This is a local wallet approval review. Production privacy is not enabled for Send, and this does not prove live private settlement."
              />
            </TransactionStatusToast>
          )}

          {status === "sending" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Send in progress"
              message="Recording the constrained Send transition from your shielded balance."
              progress
              floating
            >
              {sendProgressLabel && (
                <p className="shield-helper shield-helper--meta">{sendProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "settling" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Updating your private balance"
              message="Confirming the spent marker and resolving the next spendable note set, including any residual change note."
              progress
              floating
            >
              {settleProgressLabel && (
                <p className="shield-helper shield-helper--meta">{settleProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "failed" && (
            <TransactionStatusToast
              tone="error"
              phase="failed"
              title="Send failed"
              message="Your shielded balance was not changed. Try again."
              floating
            >
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
            </TransactionStatusToast>
          )}

          {status === "complete" && (
            <TransactionStatusToast
              tone="success"
              phase="complete"
              title="Send complete"
              message={
                lastSentAmount !== null && lastRecipient
                  ? `${formatBalance(lastSentAmount, "USDC")} was recorded from shielded state for recipient ${lastRecipient}.`
                  : "The constrained Vanta send note was confirmed."
              }
              floating
            >
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
              <div className="status-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setSendReceiptModalOpen(true)}
                  disabled={!sendReceiptModalDetails}
                >
                  View send receipt
                </button>
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
            </TransactionStatusToast>
          )}

          {shieldStateRefreshing && status === "idle" && (
            <div className="status-panel status-panel--processing">
              <span>Refreshing state</span>
              <p>Loading the latest spendable shield notes and residual change notes from the active cluster.</p>
            </div>
          )}
        </article>

        <article className="send-card" data-vanta-send-proof-panel>
          <div className="shield-card__header">
            <div>
              <span>Private-core send</span>
              <h3>Proof lane</h3>
            </div>
            <small>Ready when a private note is held</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Ledger basis</span>
              <strong>{sendLedgerGateStatus.basis}</strong>
            </div>
            <div className="review-row">
              <span>Ledger note</span>
              <strong>{abbreviate(selectedCanonicalSendLedgerNote?.noteId) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Ledger gate</span>
              <strong>{sendLedgerGateStatus.statusLabel}</strong>
            </div>
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
            Private Send is in guarded beta. It uses zero-knowledge proofs and requires operator
            verification.
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
                !isPrivateCoreUsdcSendReady ||
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
                recovery remains separate. The remaining balance can stay held or move to
                Unshield.
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
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setSendReceiptModalOpen(true)}
                  disabled={!sendReceiptModalDetails}
                >
                  View send receipt
                </button>
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
                    {privateCoreSendState.recipientAmount
                      ? `${formatBaseUnits(BigInt(privateCoreSendState.recipientAmount), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Amount hidden"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual note</span>
                  <strong>
                    {privateCoreSendState.changeAmount
                      ? `${formatBaseUnits(BigInt(privateCoreSendState.changeAmount), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Amount hidden"}
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
                  onClick={() => setSendReceiptModalOpen(true)}
                  disabled={!sendReceiptModalDetails}
                >
                  View send receipt
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
