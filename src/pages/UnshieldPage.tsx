import { useEffect, useMemo, useRef, useState } from "react";
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
import { liveShieldAsset, liveSwapPair, SHIELD_HOOK_FALLBACK_MINT } from "@/solana/shieldConfig";
import {
  createUnshieldIntentPayload,
  signUnshieldIntent,
} from "@/solana/unshieldAuth";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
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

type UnshieldLane = "VUSD" | "SOL";
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

function formatVusdAmount(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} VUSD`;
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
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSwaps,
    privateCoreOperatorSwapProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreSendState,
    privateCoreSwapState,
    privateCoreUnshieldState,
    runPrivateCoreReplayAttempt,
    runPrivateCoreUnshield,
  } = usePrivacyFlow();
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const supportedToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    { config: { tokenProgram: "auto" } },
  );
  const [selectedLane, setSelectedLane] = useState<UnshieldLane>("VUSD");
  const [selectedVusdNoteId, setSelectedVusdNoteId] = useState<string | null>(null);
  const [selectedSolNoteId, setSelectedSolNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingUnshieldBridge, setPendingUnshieldBridge] = useState<PendingUnshieldBridge | null>(null);
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

  const spendableVusdNotes = shieldAccount?.spendableShieldNotes ?? [];
  const spendableSolNotes = shieldAccount?.spendableShieldedSolNotes ?? [];

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
    if (selectedLane === "VUSD" && spendableVusdNotes.length === 0 && spendableSolNotes.length > 0) {
      setSelectedLane("SOL");
    }

    if (selectedLane === "SOL" && spendableSolNotes.length === 0 && spendableVusdNotes.length > 0) {
      setSelectedLane("VUSD");
    }
  }, [selectedLane, spendableSolNotes.length, spendableVusdNotes.length]);

  const selectedVusdNote = useMemo(() => {
    return spendableVusdNotes.find((note) => note.noteId === selectedVusdNoteId) ?? null;
  }, [selectedVusdNoteId, spendableVusdNotes]);
  const selectedSolNote = useMemo(() => {
    return spendableSolNotes.find((note) => note.noteId === selectedSolNoteId) ?? null;
  }, [selectedSolNoteId, spendableSolNotes]);

  const selectedAmount = selectedLane === "VUSD"
    ? selectedVusdNote?.amount ?? 0
    : selectedSolNote?.amount ?? 0;
  const selectedNoteLabel = selectedLane === "VUSD"
    ? (selectedVusdNote ? abbreviate(selectedVusdNote.noteId) : "None selected")
    : (selectedSolNote ? abbreviate(selectedSolNote.noteId) : "None selected");
  const canUseLane =
    selectedLane === "VUSD"
      ? Boolean(selectedVusdNote)
      : Boolean(selectedSolNote);
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
    (selectedLane === "VUSD"
      ? Boolean(liveShieldAsset.mintAddress) && liveShieldAsset.unshieldConfigured
      : Boolean(liveSwapPair.solUnshieldOperatorUrl));

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

    if (pendingSpentMarker.asset === "VUSD") {
      void signUnshieldIntent(
        createUnshieldIntentPayload({
          amount: selectedAmount.toString(),
          destinationOwner: walletAddress,
          mintAddress: liveShieldAsset.mintAddress ?? "",
          noteId: pendingSpentMarker.consumedNoteId,
          owner: pendingSpentMarker.owner,
          requester: walletAddress,
          transitionNoteId: pendingSpentMarker.transitionNoteId,
          transitionStateSignature: transitionTransaction.signature ?? undefined,
          vaultOwner: pendingSpentMarker.vaultOwner,
        }),
        walletSession.signMessage,
      )
        .then((signedIntent) => requestOperatorUnshield(signedIntent))
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
                  asset: "VUSD",
                  assetId: liveShieldAsset.mintAddress ?? "",
                  consumedNoteId: pendingSpentMarker.consumedNoteId,
                  createdAt: pendingSpentMarker.createdAt,
                  mintAddress: liveShieldAsset.mintAddress ?? undefined,
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
              : "The VUSD unshield operator could not process the request.",
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

    void Promise.all([refreshShieldState(), supportedToken.refresh()])
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
    refreshShieldState,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    supportedToken,
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
    if (!shieldAccount || !liveShieldAsset.vaultOwner) {
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

      if (selectedLane === "VUSD") {
        if (!selectedVusdNote || !liveShieldAsset.mintAddress) {
          return;
        }

        const prepared = createPreparedUnshieldMemo({
          amount: selectedVusdNote.amount.toString(),
          asset: "VUSD",
          consumedNoteId: selectedVusdNote.noteId,
          createdAt,
          destinationOwner: walletAddress ?? shieldAccount.owner,
          mintAddress: liveShieldAsset.mintAddress,
          owner: shieldAccount.owner,
          vaultOwner: shieldAccount.vaultOwner,
        });

        setPendingSpentMarker({
          asset: "VUSD",
          assetId: liveShieldAsset.mintAddress,
          consumedNoteId: selectedVusdNote.noteId,
          createdAt,
          owner: shieldAccount.owner,
          transitionKind: "unshield",
          transitionNoteId: prepared.noteId,
          vaultOwner: shieldAccount.vaultOwner,
        });
        setPendingUnshieldBridge({
          amountDisplay: selectedVusdNote.amount.toFixed(2),
          asset: "VUSD",
          assetId: liveShieldAsset.mintAddress,
          createdAt,
          destinationOwner: walletAddress ?? shieldAccount.owner,
          mintAddress: liveShieldAsset.mintAddress,
          owner: shieldAccount.owner,
          consumed: {
            noteId: selectedVusdNote.noteId,
            stateSignature: selectedVusdNote.stateSignature,
          },
          transition: {
            noteId: prepared.noteId,
          },
          vaultOwner: shieldAccount.vaultOwner,
        });
        setLastCompletion({
          amount: selectedVusdNote.amount,
          asset: "VUSD",
          transitionNoteId: prepared.noteId,
        });
        const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
          accountKeys: [
            selectedVusdNote.noteId,
            liveShieldAsset.mintAddress,
            shieldAccount.owner,
            prepared.noteId,
            shieldAccount.vaultOwner,
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
        destinationOwner: walletAddress ?? shieldAccount.owner,
        owner: shieldAccount.owner,
        vaultOwner: shieldAccount.vaultOwner,
      });

      setPendingSpentMarker({
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        consumedNoteId: selectedSolNote.noteId,
        createdAt,
        owner: shieldAccount.owner,
        transitionKind: "sol_unshield",
        transitionNoteId: prepared.noteId,
        vaultOwner: shieldAccount.vaultOwner,
      });
      setPendingUnshieldBridge({
        amountDisplay: selectedSolNote.amount.toFixed(6),
        asset: "SOL",
        assetId: liveSwapPair.solAssetId,
        createdAt,
        destinationOwner: walletAddress ?? shieldAccount.owner,
        owner: shieldAccount.owner,
        consumed: {
          noteId: selectedSolNote.noteId,
          stateSignature: selectedSolNote.stateSignature,
          sourceSwapNoteId: selectedSolNote.sourceSwapNoteId,
        },
        transition: {
          noteId: prepared.noteId,
        },
        vaultOwner: shieldAccount.vaultOwner,
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
          shieldAccount.owner,
          prepared.noteId,
          shieldAccount.vaultOwner,
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
    selectedLane === "VUSD"
      ? "Unshield VUSD returns one full spendable VUSD note to Public Wallet through the constrained operator path."
      : "Unshield SOL returns one full shielded SOL note created by Swap back to Public Wallet through the constrained operator path.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to use Public Wallet as the exit destination.";
  } else if (shieldStateRefreshing || supportedToken.isFetching) {
    validationMessage = "Refreshing wallet and Vanta state from devnet.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (!walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing to authorize Unshield.";
  } else if (selectedLane === "VUSD" && !selectedVusdNote) {
    validationMessage = "No spendable VUSD note is currently available for unshield.";
  } else if (selectedLane === "SOL" && !selectedSolNote) {
    validationMessage = "No shielded SOL note is currently available for the SOL exit lane.";
  }

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero">
        <div>
          <span className="eyebrow">Live</span>
          <h2>Unshield</h2>
          <p>
            Return one constrained internal state back to Public Wallet. Vanta now
            supports both `VUSD` note exit and the first shielded `SOL` exit lane
            created by Swap.
          </p>
        </div>

        <div className="module-state">
          <strong>Workflow role</strong>
          <p>
            Unshield closes lanes cleanly. For `VUSD`, it returns a spendable shielded
            note to Public Wallet. For `SOL`, it consumes one shielded swap-output note
            and releases public-wallet SOL through a separate operator-backed path.
          </p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {[
          "Public Wallet",
          "Shield",
          "Shielded State",
          selectedLane === "VUSD" ? "Unshield VUSD" : "Unshield SOL",
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
          This lane uses the Vanta Private Core for note recovery, witness state, nullifier derivation,
          one-time consume, and replay rejection while the existing live unshield path remains intact.
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
            <span>5. Operator boundary</span>
            <strong>
              {privateCoreOperatorBoundaryStatusLabel
                ? `${privateCoreOperatorBoundaryStatusLabel} · ${privateCoreOperatorBoundaryPrimaryNote ?? "No note"}`
                : "Awaiting operator summary"}
            </strong>
          </div>
        </div>

        <VantaPrivateCoreStatePanel
          holdState={privateCoreHoldState}
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
              <span>Return to Public Wallet</span>
              <h3>Choose the constrained exit lane</h3>
            </div>
            <small>One note at a time, full consumption only</small>
          </div>

          <div className="asset-list">
            {(["VUSD", "SOL"] as UnshieldLane[]).map((asset) => {
              const isSelected = selectedLane === asset;
              const count =
                asset === "VUSD" ? spendableVusdNotes.length : spendableSolNotes.length;
              const amountLabel =
                asset === "VUSD"
                  ? formatVusdAmount(shieldAccount?.balance ?? 0)
                  : formatSolAmount(shieldAccount?.shieldedSolBalance ?? 0);

              return (
                <button
                  key={asset}
                  type="button"
                  className={isSelected ? "asset-row asset-row--active" : "asset-row"}
                  onClick={() => {
                    setSelectedLane(asset);
                    setStatus("idle");
                    setFlowError(null);
                  }}
                >
                  <div>
                    <strong>{asset === "VUSD" ? "Unshield VUSD" : "Unshield SOL"}</strong>
                    <span>{asset === "VUSD" ? "Shielded note exit" : "Swap-output note exit"}</span>
                  </div>
                  <div className="asset-row__meta">
                    <small>{amountLabel}</small>
                    <em>{count} eligible note{count === 1 ? "" : "s"}</em>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="shield-form">
            <div className="shield-form__section">
              <label>{selectedLane === "VUSD" ? "Spendable VUSD notes" : "Shielded SOL notes"}</label>
              <div className="asset-list">
                {selectedLane === "VUSD" ? (
                  spendableVusdNotes.length === 0 ? (
                    <div className="preview-card">
                      <span>No spendable VUSD notes</span>
                      <strong>Shield VUSD first</strong>
                    </div>
                  ) : (
                    spendableVusdNotes.map((note) => (
                      <button
                        key={note.noteId}
                        type="button"
                        className={
                          selectedVusdNoteId === note.noteId
                            ? "asset-row asset-row--active"
                            : "asset-row"
                        }
                        onClick={() => {
                          setSelectedVusdNoteId(note.noteId);
                          setStatus("idle");
                          setFlowError(null);
                        }}
                      >
                        <div>
                          <strong>{formatVusdAmount(note.amount)}</strong>
                          <span>{abbreviate(note.noteId)}</span>
                        </div>
                        <div className="asset-row__meta">
                          <small>{note.origin === "change" ? "Residual note" : "Deposit note"}</small>
                          <em>Eligible exit</em>
                        </div>
                      </button>
                    ))
                  )
                ) : spendableSolNotes.length === 0 ? (
                  <div className="preview-card">
                    <span>No shielded SOL notes</span>
                    <strong>Swap VUSD into SOL first</strong>
                  </div>
                ) : (
                  spendableSolNotes.map((note) => (
                    <button
                      key={note.noteId}
                      type="button"
                      className={
                        selectedSolNoteId === note.noteId
                          ? "asset-row asset-row--active"
                          : "asset-row"
                      }
                      onClick={() => {
                        setSelectedSolNoteId(note.noteId);
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      <div>
                        <strong>{formatSolAmount(note.amount)}</strong>
                        <span>{abbreviate(note.noteId)}</span>
                      </div>
                      <div className="asset-row__meta">
                        <small>Swap output {abbreviate(note.sourceSwapNoteId)}</small>
                        <em>Eligible exit</em>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="shield-helper">{validationMessage}</p>
            </div>

            <div className="preview-grid">
              <div className="preview-card preview-card--accent">
                <span>Selected exit amount</span>
                <strong>
                  {selectedLane === "VUSD"
                    ? formatVusdAmount(selectedAmount)
                    : formatSolAmount(selectedAmount)}
                </strong>
              </div>
              <div className="preview-card">
                <span>Destination</span>
                <strong>{walletAddressShort ?? "Connect wallet"}</strong>
              </div>
            </div>

            {selectedLane === "VUSD" && (
              <div className="preview-grid">
                <div className="preview-card">
                  <span>Current Public Wallet VUSD</span>
                  <strong>{formatVusdAmount(Number(supportedToken.balance?.uiAmount ?? "0"))}</strong>
                </div>
                <div className="preview-card">
                  <span>Remaining shielded VUSD</span>
                  <strong>
                    {formatVusdAmount(
                      Number(Math.max((shieldAccount?.balance ?? 0) - selectedAmount, 0).toFixed(6)),
                    )}
                  </strong>
                </div>
              </div>
            )}

            {selectedLane === "SOL" && (
              <div className="preview-grid">
                <div className="preview-card">
                  <span>Current shielded SOL</span>
                  <strong>{formatSolAmount(shieldAccount?.shieldedSolBalance ?? 0)}</strong>
                </div>
                <div className="preview-card">
                  <span>Remaining shielded SOL</span>
                  <strong>
                    {formatSolAmount(
                      Number(
                        Math.max((shieldAccount?.shieldedSolBalance ?? 0) - selectedAmount, 0).toFixed(9),
                      ),
                    )}
                  </strong>
                </div>
              </div>
            )}

            <div className="shield-form__actions">
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setFlowError(null);
                }}
                disabled={!isReady || status === "recording_transition" || status === "finalizing_state"}
              >
                Review unshield
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void handleUnshield();
                }}
                disabled={!isReady || status === "recording_transition" || status === "finalizing_state"}
              >
                {selectedLane === "VUSD" ? "Return VUSD to Public Wallet" : "Return SOL to Public Wallet"}
              </button>
            </div>
          </div>
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Unshield context</span>
              <h3>{selectedLane === "VUSD" ? "VUSD exit lane" : "Shielded SOL exit lane"}</h3>
            </div>
            <small>{walletAddressShort ?? "No wallet connected"}</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Selected lane</span>
              <strong>{selectedLane === "VUSD" ? "Unshield VUSD" : "Unshield SOL"}</strong>
            </div>
            <div className="review-row">
              <span>Selected note</span>
              <strong>{selectedNoteLabel}</strong>
            </div>
            <div className="review-row">
              <span>Exit amount</span>
              <strong>
                {selectedLane === "VUSD"
                  ? formatVusdAmount(selectedAmount)
                  : formatSolAmount(selectedAmount)}
              </strong>
            </div>
            <div className="review-row">
              <span>Destination wallet</span>
              <strong>{walletAddressShort ?? "Connect wallet"}</strong>
            </div>
            <div className="review-row">
              <span>Execution model</span>
              <strong>Authenticated operator-backed devnet exit</strong>
            </div>
            <div className="review-row">
              <span>Consumption model</span>
              <strong>Full note consumption with explicit spent marker</strong>
            </div>
            <div className="review-row">
              <span>Lane posture</span>
              <strong>
                {selectedLane === "VUSD"
                  ? "Existing VUSD exit path"
                  : "First constrained shielded SOL exit path"}
              </strong>
            </div>
          </div>

          <p className="shield-review-note">
            Unshield remains intentionally narrow. It supports one note at a time,
            uses wallet-authenticated operator execution, and finalizes consumption
            only after the matching exit release is accepted.
          </p>

          <NoteStatePanel account={shieldAccount} title="Resolved note state" />
          <LifecycleTimeline account={shieldAccount} title="Constrained lifecycle timeline" />

          {status === "review" && (
            <div className="status-panel">
              <span>Ready to unshield</span>
              <p>
                {selectedLane === "VUSD"
                  ? "Confirm the constrained VUSD exit for one spendable note."
                  : "Confirm the constrained shielded SOL exit for one swap-created note."}
              </p>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleUnshield();
                  }}
                >
                  Confirm {selectedLane === "VUSD" ? "VUSD" : "SOL"} Unshield
                </button>
              </div>
            </div>
          )}

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
              <span>{lastCompletion.asset === "VUSD" ? "VUSD unshield complete" : "SOL unshield complete"}</span>
              <p>
                {lastCompletion.asset === "VUSD"
                  ? `${formatVusdAmount(lastCompletion.amount)} returned to Public Wallet and the source shielded VUSD note is no longer spendable.`
                  : `${formatSolAmount(lastCompletion.amount)} returned to Public Wallet and the source shielded SOL note is now consumed.`}
              </p>
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
