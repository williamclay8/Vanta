import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSendTransaction,
  useWalletSession,
} from "@solana/react-hooks";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { createSwapIntentPayload, signSwapIntent } from "@/solana/swapAuth";
import { liveShieldAsset, liveSwapPair } from "@/solana/shieldConfig";
import {
  fetchSwapLaneHealth,
  fetchSwapQuote,
  requestOperatorSwap,
  type SwapLaneHealth,
  type SwapQuote,
} from "@/solana/swapOperatorClient";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  fetchVantaPrivateCoreOperatorSwapProofs,
  registerVantaPrivateCoreOperatorRoot,
  requestVantaPrivateCoreOperatorSwapProof,
  requestVantaPrivateCoreOperatorSwapTransition,
} from "@/zk/vantaPrivateCoreOperatorClient";
import {
  deriveVantaPrivateCoreSourceArtifactsFromHeldNote,
} from "@/zk/vantaPrivateCore";
import {
  getVantaPrivateCoreFixedDepthSwapFixtureV0,
  prepareVantaPrivateCoreLiveSwapCandidate,
} from "@/zk/vantaPrivateCoreSwapProof";
import {
  buildVantaPrivateCoreUnshieldProofBoundary,
  getVantaPrivateCoreFixedDepthUnshieldFixtureV0,
} from "@/zk/vantaPrivateCoreUnshieldProof";
import {
  createPreparedSwapMemo,
  createSpentMarkerInstruction,
} from "@/solana/vantaShieldState";
import {
  listCanonicalSwapDiagnosticsSummaries,
  recordCanonicalSwapFromLiveSwap,
} from "@/zk/liveSwapBridge";

type PendingSpentMarker = {
  consumedNoteId: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  transitionKind: "swap";
  transitionNoteId: string;
  vaultOwner: string;
};

type PendingSwapBridge = {
  createdAt: number;
  owner: string;
  vaultOwner: string;
  input: {
    amountDisplay: string;
    mintAddress: string;
    noteId: string;
    stateSignature: string;
  };
  output: {
    amountDisplay: string;
    assetId: string;
    noteId: string;
  };
  transition: {
    noteId: string;
  };
  venue: {
    family: "DLMM";
    name: "Meteora";
    network: "Devnet";
    poolAddress: string;
    quoteExpiresAt: number;
    quoteId: string;
    quoteTimestamp: number;
  };
};

type SwapStatus =
  | "idle"
  | "quoting"
  | "review"
  | "awaiting_confirmation"
  | "recording_transition"
  | "authorizing_operator"
  | "finalizing_state"
  | "complete"
  | "failed";

type PrivateCoreSwapProofExecution = {
  errorMessage: string | null;
  latestProofAction: string | null;
  latestProofId: string | null;
  proofFieldCount: number | null;
  proofPublicInputCount: number | null;
  status: "idle" | "verifying" | "verified" | "failed";
};

type PrivateCoreSwapTransitionExecution = {
  errorMessage: string | null;
  latestSwapId: string | null;
  latestProofId: string | null;
  resultingRoot: string | null;
  status: "idle" | "recording" | "recorded" | "failed";
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

function formatQuoteTimestamp(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Pending";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDiagnosticValue(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return value;
}

export function SwapPage() {
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const privacyFlow = usePrivacyFlow();
  const {
    privateCoreSwapState,
    privateCoreOperatorSwapBoundaryPrimaryNote,
    privateCoreOperatorSwapBoundaryStatusLabel,
    privateCoreOperatorSwapContinuityPrimaryNote,
    privateCoreOperatorSwapContinuityStatusLabel,
    privateCoreOperatorLatestSwap,
    privateCoreOperatorLatestSwapLinkedProof,
    privateCoreOperatorLatestSwapProof,
    privateCoreOperatorProofSwapLinkStatus,
    privateCoreOperatorSwapResultingRootLinkedProof,
    privateCoreOperatorSwapResultingRootPrimaryNote,
    privateCoreOperatorSwapResultingRootProofLinkStatus,
    privateCoreOperatorSwapResultingRootRecord,
    privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
    privateCoreOperatorSwapResultingRootStatusLabel,
    privateCoreOperatorSwapProofs,
    privateCoreOperatorSwaps,
    refreshPrivateCoreOperatorSummary,
  } = privacyFlow;
  const walletSession = useWalletSession();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [laneHealth, setLaneHealth] = useState<SwapLaneHealth | null>(null);
  const [laneHealthError, setLaneHealthError] = useState<string | null>(null);
  const [quoteRefreshNonce, setQuoteRefreshNonce] = useState(0);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingSwapBridge, setPendingSwapBridge] = useState<PendingSwapBridge | null>(null);
  const [swapBridgeError, setSwapBridgeError] = useState<string | null>(null);
  const [operatorAuthorizationStarted, setOperatorAuthorizationStarted] = useState(false);
  const [optimisticallyConsumedNoteId, setOptimisticallyConsumedNoteId] = useState<string | null>(
    null,
  );
  const [lastSwapSummary, setLastSwapSummary] = useState<{
    inputAmount: number;
    outputAmount: number;
    outputNoteId: string;
    quoteExpiresAt: number;
    quoteId: string;
    quoteTimestamp: number;
    requestId?: string;
    transitionNoteId: string;
    venueFamily: "DLMM";
    venueName: "Meteora";
    venueNetwork: "Devnet";
    venuePoolAddress: string;
  } | null>(null);
  const [privateCoreSwapProofExecution, setPrivateCoreSwapProofExecution] =
    useState<PrivateCoreSwapProofExecution>({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "idle",
    });
  const [privateCoreSwapTransitionExecution, setPrivateCoreSwapTransitionExecution] =
    useState<PrivateCoreSwapTransitionExecution>({
      errorMessage: null,
      latestProofId: null,
      latestSwapId: null,
      resultingRoot: null,
      status: "idle",
    });
  const [privateCoreSwapProofError, setPrivateCoreSwapProofError] = useState<string | null>(null);
  const [privateCoreSwapProofs, setPrivateCoreSwapProofs] = useState<
    Array<{
      action: string;
      proofId: string;
      proofFieldCount: number;
      publicInputCount: number;
      root: string;
    }>
  >([]);
  const swapTransaction = useSendTransaction();
  const swapWait = useRealtimeSignatureProgress(swapTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !swapTransaction.signature,
  });
  const spentMarkerTransaction = useSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );

  const spendableNotes = useMemo(() => {
    const baseSpendableNotes = shieldAccount?.spendableShieldNotes ?? [];

    return baseSpendableNotes.filter((note) => {
      return note.noteId !== optimisticallyConsumedNoteId;
    });
  }, [optimisticallyConsumedNoteId, shieldAccount?.spendableShieldNotes]);

  useEffect(() => {
    if (!optimisticallyConsumedNoteId) {
      return;
    }

    const baseSpendableNotes = shieldAccount?.spendableShieldNotes ?? [];

    if (!baseSpendableNotes.some((note) => note.noteId === optimisticallyConsumedNoteId)) {
      setOptimisticallyConsumedNoteId(null);
    }
  }, [optimisticallyConsumedNoteId, shieldAccount?.spendableShieldNotes]);

  useEffect(() => {
    if (!spendableNotes.length) {
      setSelectedNoteId(null);
      return;
    }

    if (!selectedNoteId || !spendableNotes.some((note) => note.noteId === selectedNoteId)) {
      setSelectedNoteId(spendableNotes[0].noteId);
    }
  }, [selectedNoteId, spendableNotes]);

  const selectedNote = useMemo(() => {
    return spendableNotes.find((note) => note.noteId === selectedNoteId) ?? null;
  }, [selectedNoteId, spendableNotes]);

  useEffect(() => {
    let cancelled = false;

    void fetchVantaPrivateCoreOperatorSwapProofs()
      .then((state) => {
        if (cancelled) {
          return;
        }

        setPrivateCoreSwapProofError(null);
        setPrivateCoreSwapProofs(state.records);
        setPrivateCoreSwapProofExecution((current) => ({
          ...current,
          latestProofAction: state.latestProof?.action ?? current.latestProofAction,
          latestProofId: state.latestProof?.proofId ?? current.latestProofId,
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setPrivateCoreSwapProofError(
          error instanceof Error
            ? error.message
            : "The private-core swap proof operator state could not be loaded.",
        );
        setPrivateCoreSwapProofs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [quoteRefreshNonce, status]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchSwapLaneHealth()
      .then((nextHealth) => {
        if (controller.signal.aborted) {
          return;
        }

        setLaneHealth(nextHealth);
        setLaneHealthError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setLaneHealth(null);
        setLaneHealthError(
          error instanceof Error
            ? error.message
            : "The swap lane health check could not be loaded.",
        );
      });

    return () => {
      controller.abort();
    };
  }, [quoteRefreshNonce]);

  useEffect(() => {
    if (!walletConnected || !selectedNote) {
      setQuote(null);
      setQuoteError(null);
      if (status === "quoting") {
        setStatus("idle");
      }
      return;
    }

    const controller = new AbortController();
    setStatus((currentStatus) => (currentStatus === "idle" ? "quoting" : currentStatus));
    setQuoteError(null);

    void fetchSwapQuote(selectedNote.amount.toString())
      .then((nextQuote) => {
        if (controller.signal.aborted) {
          return;
        }

        setQuote(nextQuote);
        setStatus((currentStatus) => (currentStatus === "quoting" ? "idle" : currentStatus));
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setQuote(null);
        setQuoteError(
          error instanceof Error
            ? error.message
            : "The constrained swap quote could not be loaded.",
        );
        setStatus((currentStatus) => (currentStatus === "quoting" ? "failed" : currentStatus));
      });

    return () => {
      controller.abort();
    };
  }, [quoteRefreshNonce, selectedNote, walletConnected]);

  useEffect(() => {
    if (swapTransaction.status === "loading") {
      setStatus("recording_transition");
      return;
    }

    if (swapTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        swapTransaction.error instanceof Error
          ? swapTransaction.error.message
          : "The Vanta swap transition could not be submitted.",
      );
      setOperatorAuthorizationStarted(false);
      setPendingSpentMarker(null);
      setPendingSwapBridge(null);
    }
  }, [swapTransaction.error, swapTransaction.status]);

  useEffect(() => {
    if (swapWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      swapWait.waitError instanceof Error
        ? swapWait.waitError.message
        : "The Vanta swap transition was submitted but not confirmed.",
    );
    setOperatorAuthorizationStarted(false);
    setPendingSpentMarker(null);
    setPendingSwapBridge(null);
  }, [swapWait.waitError, swapWait.waitStatus]);

  useEffect(() => {
    if (
      swapWait.waitStatus !== "success" ||
      !selectedNote ||
      !quote ||
      !pendingSpentMarker ||
      !walletAddress ||
      !walletSession?.signMessage ||
      !swapTransaction.signature ||
      !lastSwapSummary ||
      operatorAuthorizationStarted ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setOperatorAuthorizationStarted(true);
    setStatus("authorizing_operator");

    const payload = createSwapIntentPayload({
      consumedNoteId: pendingSpentMarker.consumedNoteId,
      inputAmount: selectedNote.amount.toString(),
      inputAsset: "VUSD",
      mintAddress: pendingSpentMarker.mintAddress,
      outputAmount: quote.outputAmount,
      outputAsset: "SOL",
      outputNoteId: lastSwapSummary.outputNoteId,
      owner: pendingSpentMarker.owner,
      quoteExpiresAt: quote.quoteExpiresAt,
      quoteId: quote.quoteId,
      quoteTimestamp: quote.quoteTimestamp,
      requester: walletAddress,
      transitionNoteId: pendingSpentMarker.transitionNoteId,
      transitionStateSignature: swapTransaction.signature,
      vaultOwner: pendingSpentMarker.vaultOwner,
      venueFamily: quote.venueFamily,
      venueName: quote.venueName,
      venueNetwork: quote.venueNetwork,
      venuePoolAddress: quote.venuePoolAddress,
    });

    void signSwapIntent(payload, walletSession.signMessage)
      .then((signedIntent) => requestOperatorSwap(signedIntent))
      .then(({ requestId }) => {
        setLastSwapSummary((currentSummary) =>
          currentSummary
            ? {
                ...currentSummary,
                requestId,
              }
            : currentSummary,
        );
        setStatus("finalizing_state");
        return buildHeliusPriorityFeeInstructions({
          accountKeys: [
            pendingSpentMarker.consumedNoteId,
            pendingSpentMarker.mintAddress,
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
                consumedNoteId: pendingSpentMarker.consumedNoteId,
                createdAt: pendingSpentMarker.createdAt,
                mintAddress: pendingSpentMarker.mintAddress,
                owner: pendingSpentMarker.owner,
                transitionKind: pendingSpentMarker.transitionKind,
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
            : "The constrained swap operator rejected the request.",
        );
        setPendingSwapBridge(null);
      });
  }, [
    lastSwapSummary,
    operatorAuthorizationStarted,
    pendingSpentMarker,
    quote,
    selectedNote,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
    swapTransaction.signature,
    swapWait.waitStatus,
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
        : "The swap spent marker could not be submitted.",
    );
    setOperatorAuthorizationStarted(false);
    setPendingSwapBridge(null);
  }, [spentMarkerTransaction.error, spentMarkerTransaction.status]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerWait.waitError instanceof Error
        ? spentMarkerWait.waitError.message
        : "The swap spent marker was submitted but not confirmed.",
    );
    setPendingSwapBridge(null);
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "success") {
      return;
    }

    const completedConsumedNoteId = pendingSpentMarker?.consumedNoteId ?? null;

    void refreshShieldState()
      .then(async () => {
        if (swapTransaction.signature) {
          await retainCanonicalSwapBridge({
            spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
            transitionSignature: swapTransaction.signature,
          });
        }

        if (completedConsumedNoteId) {
          setOptimisticallyConsumedNoteId(completedConsumedNoteId);
        }
        setStatus("complete");
        setFlowError(null);
        setOperatorAuthorizationStarted(false);
        setPendingSpentMarker(null);
        setPendingSwapBridge(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Swap completed, but Vanta state could not be refreshed.",
        );
        setOperatorAuthorizationStarted(false);
      });
  }, [
    pendingSpentMarker,
    refreshShieldState,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    swapTransaction.signature,
  ]);

  useEffect(() => {
    if (status !== "finalizing_state" || !pendingSpentMarker || !lastSwapSummary) {
      return;
    }

    void refreshShieldState().catch(() => {
      // The fallback poll should stay quiet and let the existing wait/error
      // handlers surface the real failure if finalization never lands.
    });

    const refreshInterval = window.setInterval(() => {
      void refreshShieldState().catch(() => {
        // Ignore transient refresh errors during finalization fallback polling.
      });
    }, 1500);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [lastSwapSummary, pendingSpentMarker, refreshShieldState, status]);

  useEffect(() => {
    if (
      status !== "finalizing_state" ||
      !shieldAccount ||
      !pendingSpentMarker ||
      !lastSwapSummary
    ) {
      return;
    }

    const inputResolved = !shieldAccount.spendableShieldNotes.some(
      (note) => note.noteId === pendingSpentMarker.consumedNoteId,
    );
    const outputResolved = shieldAccount.shieldedSolNotes.some(
      (note) => note.noteId === lastSwapSummary.outputNoteId,
    );

    if (!inputResolved || !outputResolved) {
      return;
    }

    void (async () => {
      if (swapTransaction.signature) {
        await retainCanonicalSwapBridge({
          spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
          transitionSignature: swapTransaction.signature,
        });
      }

      setOptimisticallyConsumedNoteId(pendingSpentMarker.consumedNoteId);
      setStatus("complete");
      setFlowError(null);
      setOperatorAuthorizationStarted(false);
      setPendingSpentMarker(null);
      setPendingSwapBridge(null);
    })();
  }, [
    lastSwapSummary,
    pendingSpentMarker,
    shieldAccount,
    spentMarkerTransaction.signature,
    status,
    swapTransaction.signature,
  ]);

  const currentShieldedVusdBalance = shieldAccount?.balance ?? 0;
  const currentShieldedSolBalance = shieldAccount?.shieldedSolBalance ?? 0;
  const expectedOutputAmount = quote ? Number(quote.outputAmount) : 0;
  const isQuoteFresh = quote ? Date.now() <= quote.quoteExpiresAt : false;
  const isLaneHealthy = laneHealth?.status === "healthy";
  const projectedShieldedVusdBalance = selectedNote
    ? Number(Math.max(currentShieldedVusdBalance - selectedNote.amount, 0).toFixed(6))
    : currentShieldedVusdBalance;
  const projectedShieldedSolBalance = Number(
    (currentShieldedSolBalance + expectedOutputAmount).toFixed(9),
  );
  const transitionProgressLabel = swapWait.detailLabel;
  const finalizationProgressLabel = spentMarkerWait.detailLabel;
  const swapZkDiagnostics = listCanonicalSwapDiagnosticsSummaries().slice(0, 5);
  const currentSwapZkDiagnostics =
    (swapTransaction.signature
      ? swapZkDiagnostics.find((record) => record.transitionSignature === swapTransaction.signature)
      : null) ??
    swapZkDiagnostics[0] ??
    null;
  const preparedCurrentPrivateCoreSwapCandidate = useMemo(
    () =>
      prepareVantaPrivateCoreLiveSwapCandidate({
        heldNote: privacyFlow.privateCoreHoldState?.heldNote ?? null,
        outputAssetId: liveSwapPair.solAssetId as `0x${string}`,
        quoteExpiresAt: quote?.quoteExpiresAt ?? null,
        quoteInputAmount: quote?.inputAmount ?? null,
        quoteOutputAmount: quote?.outputAmount ?? null,
        recipientOwnerPublicKey: privacyFlow.privateCoreOwner.publicKey,
        senderSecretKey: privacyFlow.privateCoreOwner.secretKey,
      }),
    [
      privacyFlow.privateCoreHoldState,
      privacyFlow.privateCoreOwner.publicKey,
      privacyFlow.privateCoreOwner.secretKey,
      quote,
    ],
  );
  const currentPrivateCoreSwapPathNote = preparedCurrentPrivateCoreSwapCandidate.note;
  const currentPrivateCoreSwapPathStatusLabel =
    preparedCurrentPrivateCoreSwapCandidate.status === "ready"
      ? "Ready"
      : preparedCurrentPrivateCoreSwapCandidate.status === "blocked"
        ? "Blocked"
        : "Fixture fallback";
  const currentPrivateCoreSwapPathBlockerCount =
    preparedCurrentPrivateCoreSwapCandidate.status === "blocked"
      ? preparedCurrentPrivateCoreSwapCandidate.proofBoundary.blockers.length
      : 0;
  const currentPrivateCoreSwapPathPrimaryBlocker =
    preparedCurrentPrivateCoreSwapCandidate.status === "blocked"
      ? preparedCurrentPrivateCoreSwapCandidate.proofBoundary.blockers[0] ?? null
      : null;
  const swapProofBasisLabel =
    preparedCurrentPrivateCoreSwapCandidate.status === "ready"
      ? "Current held note + live quote"
      : preparedCurrentPrivateCoreSwapCandidate.status === "blocked"
        ? "Current held note blocked -> fixture fallback"
        : "Deterministic fixture fallback";
  const swapProofActionLabel =
    preparedCurrentPrivateCoreSwapCandidate.status === "ready"
      ? "Verify current private swap proof"
      : "Verify fixture private swap proof";
  const swapTransitionActionLabel =
    preparedCurrentPrivateCoreSwapCandidate.status === "ready"
      ? "Record current private swap transition"
      : "Record fixture private swap transition";
  const currentPrivateCoreSwapCandidate = useMemo(() => {
    if (
      preparedCurrentPrivateCoreSwapCandidate.status !== "ready" ||
      !privacyFlow.privateCoreHoldState
    ) {
      return null;
    }

    const heldNote = privacyFlow.privateCoreHoldState.heldNote;
    const inputProofBoundary = buildVantaPrivateCoreUnshieldProofBoundary({
      heldNote,
      ownerSecretKey: privacyFlow.privateCoreOwner.secretKey,
      releaseDestination:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    });
    const sourceArtifacts = deriveVantaPrivateCoreSourceArtifactsFromHeldNote(heldNote);
    const preview = privacyFlow.previewPrivateCoreSwapTransition(
      preparedCurrentPrivateCoreSwapCandidate.transition,
    );

    return {
      executionMode: "current-held-note" as const,
      inputProofBoundary,
      proofBoundary: preparedCurrentPrivateCoreSwapCandidate.proofBoundary,
      resultingRoot: preview.resultingRoot,
      sourceArtifacts,
      transition: preparedCurrentPrivateCoreSwapCandidate.transition,
    };
  }, [
    preparedCurrentPrivateCoreSwapCandidate,
    privacyFlow.previewPrivateCoreSwapTransition,
    privacyFlow.privateCoreHoldState,
    privacyFlow.privateCoreOwner.secretKey,
  ]);
  const shouldShowDiagnostics =
    status !== "idle" ||
    Boolean(flowError) ||
    Boolean(swapTransaction.signature) ||
    Boolean(spentMarkerTransaction.signature) ||
    Boolean(lastSwapSummary?.requestId);
  const isReady =
    walletConnected &&
    Boolean(walletAddress) &&
    Boolean(selectedNote) &&
    Boolean(quote) &&
    isQuoteFresh &&
    isLaneHealthy &&
    Boolean(walletSession?.signMessage) &&
    Boolean(liveShieldAsset.mintAddress) &&
    Boolean(liveShieldAsset.vaultOwner) &&
    liveSwapPair.configured;

  async function retainCanonicalSwapBridge(params: {
    spentMarkerSignature?: string;
    transitionSignature: string;
  }) {
    if (!pendingSwapBridge || !lastSwapSummary) {
      setSwapBridgeError(
        "Swap completed, but the canonical swap bridge context was unavailable for retention.",
      );
      return;
    }

    try {
      await recordCanonicalSwapFromLiveSwap({
        createdAt: pendingSwapBridge.createdAt,
        owner: pendingSwapBridge.owner,
        vaultOwner: pendingSwapBridge.vaultOwner,
        input: {
          asset: "VUSD",
          mintAddress: pendingSwapBridge.input.mintAddress,
          amountDisplay: pendingSwapBridge.input.amountDisplay,
          noteId: pendingSwapBridge.input.noteId,
          stateSignature: pendingSwapBridge.input.stateSignature,
        },
        output: {
          asset: "SOL",
          assetId: pendingSwapBridge.output.assetId,
          amountDisplay: pendingSwapBridge.output.amountDisplay,
          noteId: pendingSwapBridge.output.noteId,
          stateSignature: `${params.transitionSignature}:sol-output`,
        },
        transition: {
          noteId: pendingSwapBridge.transition.noteId,
          signature: params.transitionSignature,
          spentMarkerSignature: params.spentMarkerSignature,
        },
        operator: {
          requestId: lastSwapSummary.requestId,
        },
        venue: {
          family: pendingSwapBridge.venue.family,
          name: pendingSwapBridge.venue.name,
          network: pendingSwapBridge.venue.network,
          poolAddress: pendingSwapBridge.venue.poolAddress,
          quoteId: pendingSwapBridge.venue.quoteId,
          quoteTimestamp: pendingSwapBridge.venue.quoteTimestamp,
          quoteExpiresAt: pendingSwapBridge.venue.quoteExpiresAt,
        },
      });
      setSwapBridgeError(null);
    } catch (error) {
      setSwapBridgeError(
        error instanceof Error
          ? error.message
          : "Swap completed, but canonical swap diagnostics could not be retained.",
      );
    }
  }

  async function handleSwap() {
    if (
      !selectedNote ||
      !quote ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner ||
      !shieldAccount
    ) {
      return;
    }

    swapTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    setSwapBridgeError(null);
    setOperatorAuthorizationStarted(false);
    setPendingSwapBridge(null);
    setStatus("awaiting_confirmation");

    try {
      const createdAt = Date.now();
      const preparedSwap = createPreparedSwapMemo({
        consumedNoteId: selectedNote.noteId,
        createdAt,
        inputAmount: selectedNote.amount.toString(),
        inputAsset: "VUSD",
        mintAddress: liveShieldAsset.mintAddress,
        outputAmount: quote.outputAmount,
        outputAsset: "SOL",
        owner: shieldAccount.owner,
        quoteExpiresAt: quote.quoteExpiresAt,
        quoteId: quote.quoteId,
        quoteTimestamp: quote.quoteTimestamp,
        venueFamily: quote.venueFamily,
        venueName: quote.venueName,
        venueNetwork: quote.venueNetwork,
        venuePoolAddress: quote.venuePoolAddress,
        vaultOwner: shieldAccount.vaultOwner,
      });

      setPendingSpentMarker({
        consumedNoteId: selectedNote.noteId,
        createdAt,
        mintAddress: liveShieldAsset.mintAddress,
        owner: shieldAccount.owner,
        transitionKind: "swap",
        transitionNoteId: preparedSwap.noteId,
        vaultOwner: shieldAccount.vaultOwner,
      });
      setPendingSwapBridge({
        createdAt,
        owner: shieldAccount.owner,
        vaultOwner: shieldAccount.vaultOwner,
        input: {
          amountDisplay: selectedNote.amount.toFixed(2),
          mintAddress: liveShieldAsset.mintAddress,
          noteId: selectedNote.noteId,
          stateSignature: selectedNote.stateSignature,
        },
        output: {
          amountDisplay: quote.outputAmount,
          assetId: liveSwapPair.solAssetId,
          noteId: preparedSwap.outputNoteId,
        },
        transition: {
          noteId: preparedSwap.noteId,
        },
        venue: {
          family: quote.venueFamily,
          name: quote.venueName,
          network: quote.venueNetwork,
          poolAddress: quote.venuePoolAddress,
          quoteId: quote.quoteId,
          quoteTimestamp: quote.quoteTimestamp,
          quoteExpiresAt: quote.quoteExpiresAt,
        },
      });
      setLastSwapSummary({
        inputAmount: selectedNote.amount,
        outputAmount: Number(quote.outputAmount),
        outputNoteId: preparedSwap.outputNoteId,
        quoteExpiresAt: quote.quoteExpiresAt,
        quoteId: quote.quoteId,
        quoteTimestamp: quote.quoteTimestamp,
        transitionNoteId: preparedSwap.noteId,
        venueFamily: quote.venueFamily,
        venueName: quote.venueName,
        venueNetwork: quote.venueNetwork,
        venuePoolAddress: quote.venuePoolAddress,
      });
      const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
        accountKeys: [
          selectedNote.noteId,
          liveShieldAsset.mintAddress,
          shieldAccount.owner,
          preparedSwap.noteId,
          preparedSwap.outputNoteId,
          shieldAccount.vaultOwner,
          walletAddress,
        ],
        action: "swap_transition",
      });

      await swapTransaction.send({
        instructions: [...priorityFeeInstructions, preparedSwap.instruction],
      });
    } catch (error) {
      setOperatorAuthorizationStarted(false);
      setPendingSpentMarker(null);
      setPendingSwapBridge(null);
      setStatus("failed");
      setFlowError(error instanceof Error ? error.message : "Swap request was not approved.");
    }
  }

  async function handleVerifyPrivateCoreSwapProof() {
    setPrivateCoreSwapProofExecution((current) => ({
      ...current,
      errorMessage: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "verifying",
    }));

    try {
      const fixture = getVantaPrivateCoreFixedDepthSwapFixtureV0();
      const witnessPackage =
        currentPrivateCoreSwapCandidate?.proofBoundary.noirWitnessPackage ??
        fixture.validBoundary.noirWitnessPackage;
      const proofReceipt = await requestVantaPrivateCoreOperatorSwapProof({
        witnessPackage,
      });
      const nextState = await fetchVantaPrivateCoreOperatorSwapProofs();

      setPrivateCoreSwapProofError(null);
      setPrivateCoreSwapProofs(nextState.records);
      setPrivateCoreSwapProofExecution({
        errorMessage: null,
        latestProofAction: nextState.latestProof?.action ?? null,
        latestProofId: nextState.latestProof?.proofId ?? null,
        proofFieldCount: proofReceipt.proofFieldCount,
        proofPublicInputCount: proofReceipt.publicInputCount,
        status: "verified",
      });
    } catch (error) {
      setPrivateCoreSwapProofExecution({
        errorMessage:
          error instanceof Error
            ? error.message
            : "The private-core swap proof lane failed.",
        latestProofAction: null,
        latestProofId: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        status: "failed",
      });
    }
  }

  async function handleRecordPrivateCoreSwapTransition() {
    setPrivateCoreSwapTransitionExecution({
      errorMessage: null,
      latestProofId: null,
      latestSwapId: null,
      resultingRoot: null,
      status: "recording",
    });

    try {
      const swapFixture = getVantaPrivateCoreFixedDepthSwapFixtureV0();
      const rootFixture = getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
      const rootRegistrationArgs = currentPrivateCoreSwapCandidate
        ? {
            sourceArtifacts: currentPrivateCoreSwapCandidate.sourceArtifacts,
            witnessPackage: currentPrivateCoreSwapCandidate.inputProofBoundary.noirWitnessPackage,
          }
        : {
            sourceArtifacts: rootFixture.validSourceArtifacts,
            witnessPackage: rootFixture.validBoundary.noirWitnessPackage,
          };
      const swapBoundary =
        currentPrivateCoreSwapCandidate?.proofBoundary ?? swapFixture.validBoundary;
      const resultingRoot =
        currentPrivateCoreSwapCandidate?.resultingRoot ?? swapFixture.validResultingRoot;

      await registerVantaPrivateCoreOperatorRoot(rootRegistrationArgs);

      const transitionReceipt = await requestVantaPrivateCoreOperatorSwapTransition({
        executionQuoteReference: quote?.quoteId ?? null,
        executionVenueLabel: quote
          ? `${quote.venueName} ${quote.venueFamily} (${quote.venueNetwork})`
          : null,
        resultingRoot,
        witnessPackage: swapBoundary.noirWitnessPackage,
      });

      if (currentPrivateCoreSwapCandidate) {
        privacyFlow.runPrivateCoreSwapTransition(currentPrivateCoreSwapCandidate.transition, {
          executionBasisLabel: "Current held note + live quote",
          executionPrimaryNote: currentPrivateCoreSwapPathNote,
          executionVenueLabel: quote
            ? `${quote.venueName} ${quote.venueFamily} (${quote.venueNetwork})`
            : null,
          executionQuoteReference: quote?.quoteId ?? null,
          livePathStatusLabel: currentPrivateCoreSwapPathStatusLabel,
          livePathPrimaryNote: currentPrivateCoreSwapPathNote,
          livePathPrimaryBlocker: currentPrivateCoreSwapPathPrimaryBlocker,
        });
      }

      await refreshPrivateCoreOperatorSummary();

      setPrivateCoreSwapTransitionExecution({
        errorMessage: null,
        latestProofId: transitionReceipt.proofId,
        latestSwapId: transitionReceipt.swapId,
        resultingRoot: transitionReceipt.resultingRoot,
        status: "recorded",
      });
    } catch (error) {
      setPrivateCoreSwapTransitionExecution({
        errorMessage:
          error instanceof Error
            ? error.message
            : "The private-core swap transition lane failed.",
        latestProofId: null,
        latestSwapId: null,
        resultingRoot: null,
        status: "failed",
      });
    }
  }

  let validationMessage =
    "Swap v2 supports one full spendable VUSD note at a time and replaces it with one shielded SOL output state inside Vanta using a constrained Meteora-aware operator quote.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to authenticate the constrained swap request.";
  } else if (!liveSwapPair.configured) {
    validationMessage =
      "Swap requires the live VUSD mint, vault, and local operator path to be configured.";
  } else if (!liveSwapPair.venuePoolAddress) {
    validationMessage =
      "Swap v2 requires one explicit Meteora DLMM devnet pool to be configured for the live VUSD -> SOL lane.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing current Vanta note state from devnet.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (!walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing to authorize Swap.";
  } else if (laneHealth && laneHealth.status !== "healthy") {
    validationMessage = laneHealth.message;
  } else if (laneHealthError) {
    validationMessage = laneHealthError;
  } else if (!selectedNote) {
    validationMessage =
      "No spendable VUSD note is currently available for the constrained VUSD -> SOL path.";
  } else if (quote && !isQuoteFresh) {
    validationMessage =
      "The Meteora-aware devnet quote expired. Refresh the constrained venue quote to continue.";
  } else if (!quote && status !== "quoting") {
    validationMessage =
      quoteError ?? "The constrained Meteora-aware operator quote is not available for this note yet.";
  }

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero">
        <div>
          <span className="eyebrow">Live</span>
          <h2>Swap v2</h2>
          <p>
            Transform one spendable shielded `VUSD` note into one new shielded `SOL`
            output state inside Vanta. Expected output is now informed by one
            constrained Meteora devnet venue context, not a detached internal rate.
          </p>
        </div>

        <div className="module-state">
          <strong>Workflow role</strong>
          <p>
            Swap extends the live lifecycle beyond movement and exit. It proves that
            Vanta can support asset transformation inside shielded state while staying
            narrow: one pair, one note in, one note out, one venue family, one operator path.
          </p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {["Public Wallet", "Shield", "Shielded State", "Swap", "Shielded SOL"].map(
          (step, index) => (
            <div
              key={step}
              className={
                index === 3 || index === 4
                  ? "send-flow-step send-flow-step--active"
                  : "send-flow-step"
              }
            >
              <span>{step}</span>
            </div>
          ),
        )}
      </div>

      <div className="send-context-banner">
        <div>
          <span>Constrained live pair</span>
          <h3>`VUSD` into `SOL`, entirely inside Vanta.</h3>
          <p>
            The selected input must be one currently spendable shielded `VUSD` note.
            Swap v2 fully consumes that note, records one swap transition, and resolves
            one new shielded `SOL` output note without exiting to Public Wallet, while
            grounding expected output in Meteora DLMM devnet pool context.
          </p>
        </div>
        <div className="send-context-banner__meta">
          <strong>{formatSolAmount(currentShieldedSolBalance)}</strong>
          <small>Current shielded SOL resolved inside Vanta</small>
        </div>
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Shielded transformation</span>
              <h3>Select one spendable VUSD note</h3>
            </div>
            <small>One input note, one swap transition, one shielded SOL output</small>
          </div>

          <div className="shield-form">
            <div className="shield-form__section">
              <label>Spendable VUSD notes</label>
              <div className="asset-list">
                {!walletConnected ? (
                  <div className="preview-card">
                    <span>Wallet not connected</span>
                    <strong>Connect to swap</strong>
                  </div>
                ) : spendableNotes.length === 0 ? (
                  <div className="preview-card">
                    <span>No spendable notes</span>
                    <strong>Shield VUSD first</strong>
                  </div>
                ) : (
                  spendableNotes.map((note) => (
                    <button
                      key={note.noteId}
                      type="button"
                      className={
                        selectedNoteId === note.noteId
                          ? "asset-row asset-row--active"
                          : "asset-row"
                      }
                      onClick={() => {
                        setSelectedNoteId(note.noteId);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      <div>
                        <strong>{formatVusdAmount(note.amount)}</strong>
                        <span>{abbreviate(note.noteId)}</span>
                      </div>
                      <div className="asset-row__meta">
                        <small>{note.origin === "change" ? "Residual note" : "Deposit note"}</small>
                        <em>Eligible input</em>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="shield-helper">{validationMessage}</p>
            </div>

            <div className="preview-grid">
              <div className="preview-card preview-card--accent">
                <span>Input note</span>
                <strong>{formatVusdAmount(selectedNote?.amount ?? 0)}</strong>
              </div>
              <div className="preview-card">
                <span>Expected output</span>
                <strong>
                  {status === "quoting" ? "Loading quote..." : formatSolAmount(expectedOutputAmount)}
                </strong>
                {quote && (
                  <small>
                    {quote.venueName} {quote.venueFamily} · {quote.venueNetwork}
                  </small>
                )}
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-card">
                <span>Post-swap shielded VUSD</span>
                <strong>{formatVusdAmount(projectedShieldedVusdBalance)}</strong>
              </div>
              <div className="preview-card">
                <span>Post-swap shielded SOL</span>
                <strong>{formatSolAmount(projectedShieldedSolBalance)}</strong>
              </div>
            </div>

            <div className="shield-form__actions">
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setQuote(null);
                  setQuoteError(null);
                  setLaneHealth(null);
                  setLaneHealthError(null);
                  setStatus("quoting");
                  setQuoteRefreshNonce((current) => current + 1);
                }}
                disabled={
                  !walletConnected ||
                  !selectedNote ||
                  status === "recording_transition" ||
                  status === "authorizing_operator" ||
                  status === "finalizing_state"
                }
              >
                Refresh quote
              </button>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setFlowError(null);
                }}
                disabled={
                  !isReady ||
                  status === "recording_transition" ||
                  status === "authorizing_operator" ||
                  status === "finalizing_state"
                }
              >
                Review swap
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void handleSwap();
                }}
                disabled={
                  !isReady ||
                  status === "recording_transition" ||
                  status === "authorizing_operator" ||
                  status === "finalizing_state"
                }
              >
                Swap into shielded SOL
              </button>
            </div>
          </div>
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Swap context</span>
              <h3>Operator-mediated VUSD to SOL</h3>
            </div>
            <small>{walletAddressShort ?? "No wallet connected"}</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Live pair</span>
              <strong>VUSD {"->"} SOL</strong>
            </div>
            <div className="review-row">
              <span>Selected input note</span>
              <strong>{selectedNote ? abbreviate(selectedNote.noteId) : "None selected"}</strong>
            </div>
            <div className="review-row">
              <span>Input amount</span>
              <strong>{formatVusdAmount(selectedNote?.amount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Expected output</span>
              <strong>{formatSolAmount(expectedOutputAmount)}</strong>
            </div>
            <div className="review-row">
              <span>Venue</span>
              <strong>
                {quote
                  ? `${quote.venueName} ${quote.venueFamily}`
                  : `${liveSwapPair.venueName} ${liveSwapPair.venueFamily}`}
              </strong>
            </div>
            <div className="review-row">
              <span>Lane health</span>
              <strong>
                {laneHealth
                  ? laneHealth.status[0].toUpperCase() + laneHealth.status.slice(1)
                  : "Checking"}
              </strong>
            </div>
            <div className="review-row">
              <span>Network</span>
              <strong>{quote?.venueNetwork ?? liveSwapPair.venueNetwork}</strong>
            </div>
            <div className="review-row">
              <span>Pool context</span>
              <strong>
                {quote?.venuePoolAddress
                  ? abbreviate(quote.venuePoolAddress)
                  : liveSwapPair.venuePoolAddress
                    ? abbreviate(liveSwapPair.venuePoolAddress)
                    : "Not configured"}
              </strong>
            </div>
            <div className="review-row">
              <span>Quote freshness</span>
              <strong>
                {quote
                  ? `${isQuoteFresh ? "Fresh" : "Expired"} · ${formatQuoteTimestamp(quote.quoteTimestamp)}`
                  : "Awaiting quote"}
              </strong>
            </div>
            <div className="review-row">
              <span>Quote source</span>
              <strong>{quote ? `${quote.pairLabel} via Meteora devnet` : "Awaiting Meteora quote"}</strong>
            </div>
            <div className="review-row">
              <span>Execution model</span>
              <strong>Authenticated operator-backed devnet path</strong>
            </div>
            <div className="review-row">
              <span>Output location</span>
              <strong>New shielded SOL note inside Vanta</strong>
            </div>
          </div>

          <p className="shield-review-note">
            Swap v2 stays intentionally narrow. It uses one Meteora venue family,
            one explicit devnet pool context, one operator path, and no route comparison
            or generalized execution engine.
          </p>

          <NoteStatePanel account={shieldAccount} title="Resolved note state" />
          <LifecycleTimeline
            account={shieldAccount}
            title="Constrained lifecycle timeline"
          />

          {status === "review" && (
            <div className="status-panel">
              <span>Ready to swap</span>
              <p>
                Confirm one constrained swap transition for the selected full `VUSD`
                note, then authorize the operator to resolve the resulting shielded
                `SOL` output state against the current Meteora-aware devnet quote.
              </p>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleSwap();
                  }}
                >
                  Confirm Swap
                </button>
              </div>
            </div>
          )}

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>Approve the Meteora-aware Vanta swap transition for the selected note.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "recording_transition" && (
            <div className="status-panel status-panel--processing">
              <span>Recording swap transition</span>
              <p>Submitting the constrained VUSD to SOL transition note on devnet.</p>
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
              <span>Authorizing operator path</span>
              <p>
                Sending the authenticated swap intent to the constrained operator so it
                can validate the eligible input note against Meteora DLMM devnet context
                and accept the VUSD {"->"} SOL transition.
              </p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "finalizing_state" && (
            <div className="status-panel status-panel--processing">
              <span>Finalizing shielded state</span>
              <p>
                Recording the spent marker so the consumed VUSD note resolves as spent
                and the new shielded SOL output can appear in Vanta state.
              </p>
              {finalizationProgressLabel && (
                <p className="shield-helper shield-helper--meta">{finalizationProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "complete" && lastSwapSummary && (
            <div className="status-panel status-panel--success">
              <span>Swap complete</span>
              <p>
                Swapped {formatVusdAmount(lastSwapSummary.inputAmount)} into{" "}
                {formatSolAmount(lastSwapSummary.outputAmount)} and resolved a new
                shielded SOL note inside Vanta via {lastSwapSummary.venueName}{" "}
                {lastSwapSummary.venueFamily} on devnet.
              </p>
              <div className="review-list">
                <div className="review-row">
                  <span>Swap transition</span>
                  <strong>{abbreviate(lastSwapSummary.transitionNoteId)}</strong>
                </div>
                <div className="review-row">
                  <span>Output note</span>
                  <strong>{abbreviate(lastSwapSummary.outputNoteId)}</strong>
                </div>
                <div className="review-row">
                  <span>Quote id</span>
                  <strong>{abbreviate(lastSwapSummary.quoteId)}</strong>
                </div>
                <div className="review-row">
                  <span>Venue pool</span>
                  <strong>{abbreviate(lastSwapSummary.venuePoolAddress)}</strong>
                </div>
                <div className="review-row">
                  <span>Operator request</span>
                  <strong>
                    {lastSwapSummary.requestId
                      ? abbreviate(lastSwapSummary.requestId)
                      : "Accepted"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest swap proof</span>
                  <strong>
                    {privateCoreSwapProofExecution.latestProofId
                      ? abbreviate(privateCoreSwapProofExecution.latestProofId)
                      : privateCoreSwapProofs[0]?.proofId
                        ? abbreviate(privateCoreSwapProofs[0].proofId)
                        : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest swap transition</span>
                  <strong>
                    {privateCoreOperatorLatestSwap?.swapId
                      ? abbreviate(privateCoreOperatorLatestSwap.swapId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest swap linked proof</span>
                  <strong>
                    {privateCoreOperatorLatestSwapLinkedProof?.proofId
                      ? abbreviate(privateCoreOperatorLatestSwapLinkedProof.proofId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Recorded swap transition</span>
                  <strong>
                    {privateCoreSwapTransitionExecution.latestSwapId
                      ? abbreviate(privateCoreSwapTransitionExecution.latestSwapId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap execution basis</span>
                  <strong>
                    {privateCoreSwapState?.executionBasisLabel ?? swapProofBasisLabel}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap live path</span>
                  <strong>
                    {privateCoreSwapState?.livePathStatusLabel ??
                      currentPrivateCoreSwapPathStatusLabel}
                  </strong>
                </div>
              </div>
              <p className="shield-helper shield-helper--meta">
                {privateCoreSwapState?.livePathPrimaryNote ?? currentPrivateCoreSwapPathNote}
              </p>
              {(privateCoreSwapState?.livePathPrimaryBlocker ??
                currentPrivateCoreSwapPathPrimaryBlocker) && (
                <p className="shield-helper shield-helper--meta">
                  Live path blocker:{" "}
                  {privateCoreSwapState?.livePathPrimaryBlocker ??
                    currentPrivateCoreSwapPathPrimaryBlocker}
                </p>
              )}
              <details className="preview-card" style={{ marginTop: 16 }}>
                <summary>Internal zk diagnostics</summary>
                <p className="shield-helper shield-helper--meta">
                  Internal/debug only. This shows the retained canonical input/output
                  bridge for the latest live swap record.
                </p>
                {swapBridgeError && (
                  <p className="shield-helper shield-helper--meta" style={{ color: "#b42318" }}>
                    Canonical bridge retention issue: {swapBridgeError}
                  </p>
                )}
                {currentSwapZkDiagnostics ? (
                  <div className="review-list" style={{ marginTop: 12 }}>
                    <div className="review-row">
                      <span>Input live note</span>
                      <strong>{abbreviate(currentSwapZkDiagnostics.inputLiveNoteId)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Input canonical ref</span>
                      <strong>
                        {currentSwapZkDiagnostics.inputCanonicalCommitment
                          ? abbreviate(currentSwapZkDiagnostics.inputCanonicalCommitment)
                          : "Not yet resolvable"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Input source</span>
                      <strong>{currentSwapZkDiagnostics.inputCanonicalRecordSource ?? "Unresolved"}</strong>
                    </div>
                    <div className="review-row">
                      <span>Output commitment</span>
                      <strong>{abbreviate(currentSwapZkDiagnostics.outputCommitment)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Insertion index</span>
                      <strong>{currentSwapZkDiagnostics.outputInsertionIndex}</strong>
                    </div>
                    <div className="review-row">
                      <span>Snapshot root</span>
                      <strong>{abbreviate(currentSwapZkDiagnostics.outputSnapshotRoot)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Assets</span>
                      <strong>
                        {currentSwapZkDiagnostics.inputAsset} {"->"} {currentSwapZkDiagnostics.outputAsset}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Output amount</span>
                      <strong>{currentSwapZkDiagnostics.outputAmountDisplay}</strong>
                    </div>
                    <div className="review-row">
                      <span>Transition signature</span>
                      <strong>{abbreviate(currentSwapZkDiagnostics.transitionSignature)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Operator request</span>
                      <strong>
                        {currentSwapZkDiagnostics.operatorRequestId
                          ? abbreviate(currentSwapZkDiagnostics.operatorRequestId)
                          : "Unavailable"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Spent marker</span>
                      <strong>
                        {currentSwapZkDiagnostics.spentMarkerSignature
                          ? abbreviate(currentSwapZkDiagnostics.spentMarkerSignature)
                          : "Unavailable"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Venue</span>
                      <strong>{currentSwapZkDiagnostics.venueSummary}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="shield-helper shield-helper--meta">
                    No retained canonical swap diagnostics are available yet for this client.
                  </p>
                )}
              </details>
            </div>
          )}

          {privateCoreSwapState && privateCoreSwapTransitionExecution.status !== "recorded" && (
            <div className="status-panel status-panel--success">
              <span>Latest private swap</span>
              <p>
                The latest private swap handoff is still available from shared state, so
                this flow can resume after refresh. The shielded output remains private
                and the downstream root can continue into registration or unshield.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Swap output</span>
                  <strong>{privateCoreSwapState.noteSummary}</strong>
                </div>
                <div className="preview-card">
                  <span>Observation mode</span>
                  <strong>{privateCoreSwapState.observationMode}</strong>
                </div>
                <div className="preview-card">
                  <span>Swap execution basis</span>
                  <strong>{privateCoreSwapState.executionBasisLabel}</strong>
                </div>
                <div className="preview-card">
                  <span>Execution venue</span>
                  <strong>{privateCoreSwapState.executionVenueLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
                  <span>Live path status</span>
                  <strong>{privateCoreSwapState.livePathStatusLabel}</strong>
                </div>
                <div className="preview-card">
                  <span>Swap boundary</span>
                  <strong>{privateCoreSwapState.boundaryStatusLabel}</strong>
                </div>
                <div className="preview-card">
                  <span>Downstream continuity</span>
                  <strong>{privateCoreSwapState.continuityStatusLabel}</strong>
                </div>
              </div>
              <p className="shield-helper shield-helper--meta">
                Swap execution basis: {privateCoreSwapState.executionBasisLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap execution note: {privateCoreSwapState.executionPrimaryNote}
              </p>
              <p className="shield-helper shield-helper--meta">
                Execution venue: {privateCoreSwapState.executionVenueLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Quote reference: {privateCoreSwapState.executionQuoteReference ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap live path: {privateCoreSwapState.livePathStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Live path note: {privateCoreSwapState.livePathPrimaryNote}
              </p>
              {privateCoreSwapState.livePathPrimaryBlocker && (
                <p className="shield-helper shield-helper--meta">
                  Live path blocker: {privateCoreSwapState.livePathPrimaryBlocker}
                </p>
              )}
              <p className="shield-helper shield-helper--meta">
                Output recovery: {privateCoreSwapState.outputRecoveryStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Output unshield: {privateCoreSwapState.outputUnshieldStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap resulting root: {privateCoreSwapState.resultingRootStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap root note: {privateCoreSwapState.resultingRootPrimaryNote}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap boundary: {privateCoreSwapState.boundaryStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Swap boundary note: {privateCoreSwapState.boundaryPrimaryNote}
              </p>
              <p className="shield-helper shield-helper--meta">
                Downstream continuity: {privateCoreSwapState.continuityStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Continuity note: {privateCoreSwapState.continuityPrimaryNote}
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--warning">
              <span>Swap did not complete</span>
              <p>{flowError ?? quoteError ?? "The constrained swap flow encountered an issue."}</p>
              <div className="status-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setFlowError(null);
                    setOperatorAuthorizationStarted(false);
                  }}
                >
                  Reset state
                </button>
                <Link className="button button-primary" to="/app/shield">
                  Go to Shield
                </Link>
              </div>
            </div>
          )}

          {shouldShowDiagnostics && (
            <div className="status-panel">
              <span>Swap diagnostics</span>
              <div className="review-list">
                <div className="review-row">
                  <span>Page status</span>
                  <strong>{status}</strong>
                </div>
                <div className="review-row">
                  <span>Transition signature</span>
                  <strong>{formatDiagnosticValue(swapTransaction.signature ?? undefined)}</strong>
                </div>
                <div className="review-row">
                  <span>Transition wait</span>
                  <strong>{formatDiagnosticValue(swapWait.waitStatus)}</strong>
                </div>
                <div className="review-row">
                  <span>Operator auth</span>
                  <strong>{operatorAuthorizationStarted ? "started" : "pending"}</strong>
                </div>
                <div className="review-row">
                  <span>Operator request</span>
                  <strong>{formatDiagnosticValue(lastSwapSummary?.requestId)}</strong>
                </div>
                <div className="review-row">
                  <span>Spent marker status</span>
                  <strong>{formatDiagnosticValue(spentMarkerTransaction.status)}</strong>
                </div>
                <div className="review-row">
                  <span>Spent marker signature</span>
                  <strong>
                    {formatDiagnosticValue(spentMarkerTransaction.signature ?? undefined)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Spent marker wait</span>
                  <strong>{formatDiagnosticValue(spentMarkerWait.waitStatus)}</strong>
                </div>
                <div className="review-row">
                  <span>Flow error</span>
                  <strong>{formatDiagnosticValue(flowError)}</strong>
                </div>
                <div className="review-row">
                  <span>Private-core swap proof</span>
                  <strong>{privateCoreSwapProofExecution.status}</strong>
                </div>
                <div className="review-row">
                  <span>Latest operator swap proof</span>
                  <strong>
                    {privateCoreSwapProofError
                      ? privateCoreSwapProofError
                      : privateCoreSwapProofExecution.latestProofId
                        ? abbreviate(privateCoreSwapProofExecution.latestProofId)
                        : privateCoreSwapProofs[0]?.proofId
                          ? abbreviate(privateCoreSwapProofs[0].proofId)
                          : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest swap proof action</span>
                  <strong>
                    {privateCoreSwapProofError
                      ? privateCoreSwapProofError
                      : privateCoreSwapProofExecution.latestProofAction ??
                        privateCoreSwapProofs[0]?.action ??
                        "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap proof records</span>
                  <strong>
                    {privateCoreSwapProofError ? "Unavailable" : String(privateCoreSwapProofs.length)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap proof shape</span>
                  <strong>
                    {privateCoreSwapProofExecution.proofFieldCount &&
                    privateCoreSwapProofExecution.proofPublicInputCount
                      ? `${privateCoreSwapProofExecution.proofFieldCount} fields · ${privateCoreSwapProofExecution.proofPublicInputCount} public inputs`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Operator swap records</span>
                  <strong>{String(privateCoreOperatorSwaps.length)}</strong>
                </div>
                <div className="review-row">
                  <span>Operator swap proof records</span>
                  <strong>{String(privateCoreOperatorSwapProofs.length)}</strong>
                </div>
                <div className="review-row">
                  <span>Latest operator swap transition</span>
                  <strong>
                    {privateCoreOperatorLatestSwap?.swapId
                      ? abbreviate(privateCoreOperatorLatestSwap.swapId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest operator swap linked proof</span>
                  <strong>
                    {privateCoreOperatorLatestSwapLinkedProof?.proofId
                      ? abbreviate(privateCoreOperatorLatestSwapLinkedProof.proofId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest operator swap proof summary</span>
                  <strong>
                    {privateCoreOperatorLatestSwapProof?.proofId
                      ? abbreviate(privateCoreOperatorLatestSwapProof.proofId)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Latest swap resulting root</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorLatestSwap?.resultingRoot ?? undefined)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root status</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapResultingRootStatusLabel)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root note</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapResultingRootPrimaryNote)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root registration</span>
                  <strong>
                    {formatDiagnosticValue(
                      privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
                    )}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap root registration note</span>
                  <strong>
                    {formatDiagnosticValue(
                      privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
                    )}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root record</span>
                  <strong>
                    {formatDiagnosticValue(privateCoreOperatorSwapResultingRootRecord?.root)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root proof</span>
                  <strong>
                    {formatDiagnosticValue(privateCoreOperatorSwapResultingRootRecord?.proofId)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root linked proof</span>
                  <strong>
                    {formatDiagnosticValue(privateCoreOperatorSwapResultingRootLinkedProof?.proofId)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap resulting root proof link</span>
                  <strong>
                    {formatDiagnosticValue(privateCoreOperatorSwapResultingRootProofLinkStatus)}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap continuity status</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapContinuityStatusLabel)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap continuity note</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapContinuityPrimaryNote)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap boundary status</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapBoundaryStatusLabel)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap boundary note</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorSwapBoundaryPrimaryNote)}</strong>
                </div>
                <div className="review-row">
                  <span>Recorded transition status</span>
                  <strong>{privateCoreSwapTransitionExecution.status}</strong>
                </div>
                <div className="review-row">
                  <span>Recorded transition proof</span>
                  <strong>{formatDiagnosticValue(privateCoreSwapTransitionExecution.latestProofId)}</strong>
                </div>
                <div className="review-row">
                  <span>Recorded transition root</span>
                  <strong>{formatDiagnosticValue(privateCoreSwapTransitionExecution.resultingRoot)}</strong>
                </div>
                <div className="review-row">
                  <span>Proof/swap link</span>
                  <strong>{formatDiagnosticValue(privateCoreOperatorProofSwapLinkStatus)}</strong>
                </div>
                <div className="review-row">
                  <span>Swap proof basis</span>
                  <strong>{swapProofBasisLabel}</strong>
                </div>
                <div className="review-row">
                  <span>Swap proof action</span>
                  <strong>{swapProofActionLabel}</strong>
                </div>
                <div className="review-row">
                  <span>Swap transition action</span>
                  <strong>{swapTransitionActionLabel}</strong>
                </div>
                <div className="review-row">
                  <span>Swap proof path note</span>
                  <strong>{currentPrivateCoreSwapPathNote}</strong>
                </div>
                <div className="review-row">
                  <span>Swap live path status</span>
                  <strong>{currentPrivateCoreSwapPathStatusLabel}</strong>
                </div>
                <div className="review-row">
                  <span>Swap live path blockers</span>
                  <strong>
                    {currentPrivateCoreSwapPathBlockerCount > 0
                      ? String(currentPrivateCoreSwapPathBlockerCount)
                      : "None"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Swap live path primary blocker</span>
                  <strong>{formatDiagnosticValue(currentPrivateCoreSwapPathPrimaryBlocker)}</strong>
                </div>
              </div>
              <div className="status-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    void handleVerifyPrivateCoreSwapProof();
                  }}
                  disabled={privateCoreSwapProofExecution.status === "verifying"}
                >
                  {privateCoreSwapProofExecution.status === "verifying"
                    ? "Verifying swap proof"
                    : swapProofActionLabel}
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    void handleRecordPrivateCoreSwapTransition();
                  }}
                  disabled={privateCoreSwapTransitionExecution.status === "recording"}
                >
                  {privateCoreSwapTransitionExecution.status === "recording"
                    ? "Recording swap transition"
                    : swapTransitionActionLabel}
                </button>
              </div>
              <p className="shield-helper shield-helper--meta">
                Swap live path: {currentPrivateCoreSwapPathStatusLabel}. {currentPrivateCoreSwapPathNote}
              </p>
              {currentPrivateCoreSwapPathPrimaryBlocker && (
                <p className="shield-helper shield-helper--meta">
                  Primary live-path blocker: {currentPrivateCoreSwapPathPrimaryBlocker}
                </p>
              )}
              {privateCoreSwapProofExecution.errorMessage && (
                <p className="shield-helper shield-helper--meta" style={{ color: "#b42318" }}>
                  Swap proof error: {privateCoreSwapProofExecution.errorMessage}
                </p>
              )}
              {privateCoreSwapTransitionExecution.errorMessage && (
                <p className="shield-helper shield-helper--meta" style={{ color: "#b42318" }}>
                  Swap transition error: {privateCoreSwapTransitionExecution.errorMessage}
                </p>
              )}
            </div>
          )}
        </article>
      </div>

      <VantaPrivateCoreStatePanel
        holdState={privacyFlow.privateCoreHoldState}
        shieldState={privacyFlow.privateCoreRecentShield}
        sendState={privacyFlow.privateCoreSendState}
        swapState={privacyFlow.privateCoreSwapState}
        unshieldState={privacyFlow.privateCoreUnshieldState}
        operatorCurrentRoot={privacyFlow.privateCoreOperatorCurrentRoot}
        operatorConsumeError={privacyFlow.privateCoreOperatorConsumeError}
        operatorConsumes={privacyFlow.privateCoreOperatorConsumes}
        operatorLatestConsume={privacyFlow.privateCoreOperatorLatestConsume}
        operatorLatestConsumeProof={privacyFlow.privateCoreOperatorLatestConsumeProof}
        operatorLatestProof={privacyFlow.privateCoreOperatorLatestProof}
        operatorLatestRelease={privacyFlow.privateCoreOperatorLatestRelease}
        operatorLatestReleaseProof={privacyFlow.privateCoreOperatorLatestReleaseProof}
        operatorLatestRoot={privacyFlow.privateCoreOperatorLatestRoot}
        operatorLatestSend={privacyFlow.privateCoreOperatorLatestSend}
        operatorLatestSendLinkedProof={privacyFlow.privateCoreOperatorLatestSendLinkedProof}
        operatorLatestSendProof={privacyFlow.privateCoreOperatorLatestSendProof}
        operatorLatestSwap={privacyFlow.privateCoreOperatorLatestSwap}
        operatorLatestSwapLinkedProof={privacyFlow.privateCoreOperatorLatestSwapLinkedProof}
        operatorLatestSwapProof={privacyFlow.privateCoreOperatorLatestSwapProof}
        operatorBoundaryPrimaryNote={privacyFlow.privateCoreOperatorBoundaryPrimaryNote}
        operatorBoundaryStatusLabel={privacyFlow.privateCoreOperatorBoundaryStatusLabel}
        operatorContractMirrorPrimaryNote={privacyFlow.privateCoreOperatorContractMirrorPrimaryNote}
        operatorContractMirrorStatusLabel={privacyFlow.privateCoreOperatorContractMirrorStatusLabel}
        operatorReleaseBoundaryPrimaryNote={
          privacyFlow.privateCoreOperatorReleaseBoundaryPrimaryNote
        }
        operatorReleaseBoundaryStatusLabel={
          privacyFlow.privateCoreOperatorReleaseBoundaryStatusLabel
        }
        operatorRequiredLanesPrimaryNote={
          privacyFlow.privateCoreOperatorRequiredLanesPrimaryNote
        }
        operatorRequiredLanesStatusLabel={
          privacyFlow.privateCoreOperatorRequiredLanesStatusLabel
        }
        operatorZkV1ShippingPrimaryNote={
          privacyFlow.privateCoreOperatorZkV1ShippingPrimaryNote
        }
        operatorZkV1ShippingStatusLabel={
          privacyFlow.privateCoreOperatorZkV1ShippingStatusLabel
        }
        operatorSendBoundaryPrimaryNote={privacyFlow.privateCoreOperatorSendBoundaryPrimaryNote}
        operatorSendBoundaryStatusLabel={privacyFlow.privateCoreOperatorSendBoundaryStatusLabel}
        operatorSendContinuityPrimaryNote={privacyFlow.privateCoreOperatorSendContinuityPrimaryNote}
        operatorSendContinuityStatusLabel={privacyFlow.privateCoreOperatorSendContinuityStatusLabel}
        operatorSwapBoundaryPrimaryNote={privacyFlow.privateCoreOperatorSwapBoundaryPrimaryNote}
        operatorSwapBoundaryStatusLabel={privacyFlow.privateCoreOperatorSwapBoundaryStatusLabel}
        operatorSwapContinuityPrimaryNote={privacyFlow.privateCoreOperatorSwapContinuityPrimaryNote}
        operatorSwapContinuityStatusLabel={privacyFlow.privateCoreOperatorSwapContinuityStatusLabel}
        operatorSupportedSendLaneKind={privacyFlow.privateCoreOperatorSupportedSendLaneKind}
        operatorSupportedSendLaneNote={privacyFlow.privateCoreOperatorSupportedSendLaneNote}
        operatorSupportedSendLaneStatus={privacyFlow.privateCoreOperatorSupportedSendLaneStatus}
        operatorSupportedSendLaneVersion={privacyFlow.privateCoreOperatorSupportedSendLaneVersion}
        operatorSupportedSendV1Decision={privacyFlow.privateCoreOperatorSupportedSendV1Decision}
        operatorSupportedSendV1DecisionNote={privacyFlow.privateCoreOperatorSupportedSendV1DecisionNote}
        operatorSupportedUnshieldLaneKind={privacyFlow.privateCoreOperatorSupportedUnshieldLaneKind}
        operatorSupportedUnshieldLaneNote={privacyFlow.privateCoreOperatorSupportedUnshieldLaneNote}
        operatorSupportedUnshieldLaneStatus={privacyFlow.privateCoreOperatorSupportedUnshieldLaneStatus}
        operatorSupportedUnshieldLaneVersion={privacyFlow.privateCoreOperatorSupportedUnshieldLaneVersion}
        operatorSupportedUnshieldV1Decision={privacyFlow.privateCoreOperatorSupportedUnshieldV1Decision}
        operatorSupportedUnshieldV1DecisionNote={privacyFlow.privateCoreOperatorSupportedUnshieldV1DecisionNote}
        operatorSupportedReleaseLaneKind={privacyFlow.privateCoreOperatorSupportedReleaseLaneKind}
        operatorSupportedReleaseLaneNote={privacyFlow.privateCoreOperatorSupportedReleaseLaneNote}
        operatorSupportedReleaseLaneStatus={privacyFlow.privateCoreOperatorSupportedReleaseLaneStatus}
        operatorSupportedReleaseLaneVersion={privacyFlow.privateCoreOperatorSupportedReleaseLaneVersion}
        operatorSupportedReleaseV1Decision={privacyFlow.privateCoreOperatorSupportedReleaseV1Decision}
        operatorSupportedReleaseV1DecisionNote={privacyFlow.privateCoreOperatorSupportedReleaseV1DecisionNote}
        operatorSupportedSwapLaneKind={privacyFlow.privateCoreOperatorSupportedSwapLaneKind}
        operatorSupportedSwapLaneNote={privacyFlow.privateCoreOperatorSupportedSwapLaneNote}
        operatorSupportedSwapLaneStatus={privacyFlow.privateCoreOperatorSupportedSwapLaneStatus}
        operatorSupportedSwapLaneVersion={privacyFlow.privateCoreOperatorSupportedSwapLaneVersion}
        operatorSupportedSwapV1Decision={privacyFlow.privateCoreOperatorSupportedSwapV1Decision}
        operatorSupportedSwapV1DecisionNote={privacyFlow.privateCoreOperatorSupportedSwapV1DecisionNote}
        operatorSupportedSwapV1Role={privacyFlow.privateCoreOperatorSupportedSwapV1Role}
        operatorSupportedSwapV1RoleNote={privacyFlow.privateCoreOperatorSupportedSwapV1RoleNote}
        operatorSupportedSwapVenue={privacyFlow.privateCoreOperatorSupportedSwapVenue}
        operatorSupportedSwapOutputModel={privacyFlow.privateCoreOperatorSupportedSwapOutputModel}
        operatorSupportedSwapResultingRootBasis={privacyFlow.privateCoreOperatorSupportedSwapResultingRootBasis}
        operatorSupportedSwapInputRootPolicy={privacyFlow.privateCoreOperatorSupportedSwapInputRootPolicy}
        operatorSupportedSwapOutputRegistrationPolicy={privacyFlow.privateCoreOperatorSupportedSwapOutputRegistrationPolicy}
        operatorSupportedFlowKind={privacyFlow.privateCoreOperatorSupportedFlowKind}
        operatorSupportedFlowNote={privacyFlow.privateCoreOperatorSupportedFlowNote}
        operatorSupportedFlowStatus={privacyFlow.privateCoreOperatorSupportedFlowStatus}
        operatorSupportedFlowVersion={privacyFlow.privateCoreOperatorSupportedFlowVersion}
        operatorSupportedZkV1ScopeDecision={privacyFlow.privateCoreOperatorSupportedZkV1ScopeDecision}
        operatorSupportedZkV1ScopeNote={privacyFlow.privateCoreOperatorSupportedZkV1ScopeNote}
        operatorSupportedZkV1RequiredLanes={privacyFlow.privateCoreOperatorSupportedZkV1RequiredLanes}
        operatorSupportedZkV1RequiredLanesNote={privacyFlow.privateCoreOperatorSupportedZkV1RequiredLanesNote}
        operatorZkV1FinishLineStatusLabel={
          privacyFlow.privateCoreOperatorZkV1FinishLineStatusLabel
        }
        operatorZkV1FinishLinePrimaryNote={
          privacyFlow.privateCoreOperatorZkV1FinishLinePrimaryNote
        }
        operatorSupportedAssetSymbol={privacyFlow.privateCoreOperatorSupportedAssetSymbol}
        operatorSupportedEnvironment={privacyFlow.privateCoreOperatorSupportedEnvironment}
        operatorSupportedNoteSchema={privacyFlow.privateCoreOperatorSupportedNoteSchema}
        operatorSupportedNoteVersion={privacyFlow.privateCoreOperatorSupportedNoteVersion}
        operatorSupportedRootRegistrationProvenance={privacyFlow.privateCoreOperatorSupportedRootRegistrationProvenance}
        operatorSupportedSendResultingRootBasis={privacyFlow.privateCoreOperatorSupportedSendResultingRootBasis}
        operatorSupportedSendInputRootPolicy={privacyFlow.privateCoreOperatorSupportedSendInputRootPolicy}
        operatorSupportedSendOutputRegistrationPolicy={privacyFlow.privateCoreOperatorSupportedSendOutputRegistrationPolicy}
        operatorSupportedRecipientModel={privacyFlow.privateCoreOperatorSupportedRecipientModel}
        operatorSupportedReleaseDestinationModel={privacyFlow.privateCoreOperatorSupportedReleaseDestinationModel}
        operatorSupportedProofSystem={privacyFlow.privateCoreOperatorSupportedProofSystem}
        operatorSupportedUnshieldCircuit={privacyFlow.privateCoreOperatorSupportedUnshieldCircuit}
        operatorSupportedSendCircuit={privacyFlow.privateCoreOperatorSupportedSendCircuit}
        operatorSupportedUnshieldMerkleDepth={privacyFlow.privateCoreOperatorSupportedUnshieldMerkleDepth}
        operatorSupportedSendMerkleDepth={privacyFlow.privateCoreOperatorSupportedSendMerkleDepth}
        operatorSupportedReleaseAuthorizationBasis={privacyFlow.privateCoreOperatorSupportedReleaseAuthorizationBasis}
        operatorSupportedReleaseRootPolicy={privacyFlow.privateCoreOperatorSupportedReleaseRootPolicy}
        operatorSupportedReleaseExecutionModel={privacyFlow.privateCoreOperatorSupportedReleaseExecutionModel}
        operatorSupportedReleaseAtomicityModel={privacyFlow.privateCoreOperatorSupportedReleaseAtomicityModel}
        operatorSupportedReleasePersistenceModel={privacyFlow.privateCoreOperatorSupportedReleasePersistenceModel}
        operatorOwnerAuthorizationMode={privacyFlow.privateCoreOperatorOwnerAuthorizationMode}
        operatorOwnerAuthorizationDecision={privacyFlow.privateCoreOperatorOwnerAuthorizationDecision}
        operatorOwnerAuthorizationDecisionNote={privacyFlow.privateCoreOperatorOwnerAuthorizationDecisionNote}
        operatorSourceArtifactTruthBasis={privacyFlow.privateCoreOperatorSourceArtifactTruthBasis}
        operatorProvingArtifactTruthBasis={privacyFlow.privateCoreOperatorProvingArtifactTruthBasis}
        operatorSourceProvingRelationship={privacyFlow.privateCoreOperatorSourceProvingRelationship}
        operatorNullifierKeyMode={privacyFlow.privateCoreOperatorNullifierKeyMode}
        operatorProvingHashLane={privacyFlow.privateCoreOperatorProvingHashLane}
        operatorCurrentRootLinkedProof={privacyFlow.privateCoreOperatorCurrentRootLinkedProof}
        operatorCurrentRootProofLinkStatus={privacyFlow.privateCoreOperatorCurrentRootProofLinkStatus}
        operatorProofConsumeLinkStatus={privacyFlow.privateCoreOperatorProofConsumeLinkStatus}
        operatorProofError={privacyFlow.privateCoreOperatorProofError}
        operatorProofs={privacyFlow.privateCoreOperatorProofs}
        operatorProofSendLinkStatus={privacyFlow.privateCoreOperatorProofSendLinkStatus}
        operatorProofSwapLinkStatus={privacyFlow.privateCoreOperatorProofSwapLinkStatus}
        operatorProofReleaseLinkStatus={privacyFlow.privateCoreOperatorProofReleaseLinkStatus}
        operatorReleaseError={privacyFlow.privateCoreOperatorReleaseError}
        operatorReleases={privacyFlow.privateCoreOperatorReleases}
        operatorRootCurrentnessLabel={privacyFlow.privateCoreOperatorRootCurrentnessLabel}
        operatorRootError={privacyFlow.privateCoreOperatorRootError}
        operatorRootRegistrationStatus={privacyFlow.privateCoreOperatorRootRegistrationStatus}
        operatorRoots={privacyFlow.privateCoreOperatorRoots}
        operatorContractStateVersion={privacyFlow.privateCoreOperatorContractStateVersion}
        operatorContractVersion={privacyFlow.privateCoreOperatorContractVersion}
        operatorContractSummaryVersion={privacyFlow.privateCoreOperatorContractSummaryVersion}
        operatorStatusVersion={privacyFlow.privateCoreOperatorStatusVersion}
        operatorStatusKind={privacyFlow.privateCoreOperatorStatusKind}
        operatorSnapshotVersion={privacyFlow.privateCoreOperatorSnapshotVersion}
        operatorSnapshotKind={privacyFlow.privateCoreOperatorSnapshotKind}
        operatorSupportedStatusTransport={privacyFlow.privateCoreOperatorSupportedStatusTransport}
        operatorSupportedStatusEndpoint={privacyFlow.privateCoreOperatorSupportedStatusEndpoint}
        operatorSupportedStatusGateVersion={
          privacyFlow.privateCoreOperatorSupportedStatusGateVersion
        }
        operatorSupportedStatusGateKind={privacyFlow.privateCoreOperatorSupportedStatusGateKind}
        operatorSupportedStatusGateNote={privacyFlow.privateCoreOperatorSupportedStatusGateNote}
        operatorSupportedStatusGateTransport={
          privacyFlow.privateCoreOperatorSupportedStatusGateTransport
        }
        operatorSupportedStatusGateEndpoint={
          privacyFlow.privateCoreOperatorSupportedStatusGateEndpoint
        }
        operatorSupportedSnapshotGateVersion={
          privacyFlow.privateCoreOperatorSupportedSnapshotGateVersion
        }
        operatorSupportedSnapshotGateKind={
          privacyFlow.privateCoreOperatorSupportedSnapshotGateKind
        }
        operatorSupportedSnapshotGateNote={
          privacyFlow.privateCoreOperatorSupportedSnapshotGateNote
        }
        operatorSupportedSnapshotGateTransport={
          privacyFlow.privateCoreOperatorSupportedSnapshotGateTransport
        }
        operatorSupportedSnapshotGateEndpoint={
          privacyFlow.privateCoreOperatorSupportedSnapshotGateEndpoint
        }
        operatorSupportedShippingDecisionGateVersion={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionGateVersion
        }
        operatorSupportedShippingDecisionGateKind={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionGateKind
        }
        operatorSupportedShippingDecisionGateNote={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionGateNote
        }
        operatorSupportedShippingDecisionGateTransport={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionGateTransport
        }
        operatorSupportedShippingDecisionGateEndpoint={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionGateEndpoint
        }
        operatorSupportedShippingDecisionTransport={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionTransport
        }
        operatorSupportedShippingDecisionEndpoint={
          privacyFlow.privateCoreOperatorSupportedShippingDecisionEndpoint
        }
        operatorSupportedShippingArtifactGateVersion={
          privacyFlow.privateCoreOperatorSupportedShippingArtifactGateVersion
        }
        operatorSupportedShippingArtifactGateKind={
          privacyFlow.privateCoreOperatorSupportedShippingArtifactGateKind
        }
        operatorSupportedShippingArtifactGateNote={
          privacyFlow.privateCoreOperatorSupportedShippingArtifactGateNote
        }
        operatorSupportedShippingArtifactGateTransport={
          privacyFlow.privateCoreOperatorSupportedShippingArtifactGateTransport
        }
        operatorSupportedShippingArtifactGateEndpoint={
          privacyFlow.privateCoreOperatorSupportedShippingArtifactGateEndpoint
        }
        operatorSupportedSnapshotTransport={privacyFlow.privateCoreOperatorSupportedSnapshotTransport}
        operatorSupportedSnapshotEndpoint={privacyFlow.privateCoreOperatorSupportedSnapshotEndpoint}
        operatorSupportedShippingArtifactTransport={privacyFlow.privateCoreOperatorSupportedShippingArtifactTransport}
        operatorSupportedShippingArtifactEndpoint={privacyFlow.privateCoreOperatorSupportedShippingArtifactEndpoint}
        operatorShippingArtifactVersion={privacyFlow.privateCoreOperatorShippingArtifactVersion}
        operatorShippingArtifactKind={privacyFlow.privateCoreOperatorShippingArtifactKind}
        operatorShippingDecisionVersion={privacyFlow.privateCoreOperatorShippingDecisionVersion}
        operatorShippingDecisionKind={privacyFlow.privateCoreOperatorShippingDecisionKind}
        operatorSendResultingRootLinkedProof={privacyFlow.privateCoreOperatorSendResultingRootLinkedProof}
        operatorSendResultingRootRecord={privacyFlow.privateCoreOperatorSendResultingRootRecord}
        operatorSendResultingRootPrimaryNote={privacyFlow.privateCoreOperatorSendResultingRootPrimaryNote}
        operatorSendResultingRootRegistrationPrimaryNote={privacyFlow.privateCoreOperatorSendResultingRootRegistrationPrimaryNote}
        operatorSendResultingRootProofLinkStatus={privacyFlow.privateCoreOperatorSendResultingRootProofLinkStatus}
        operatorSendResultingRootRegistrationStatusLabel={privacyFlow.privateCoreOperatorSendResultingRootRegistrationStatusLabel}
        operatorSendResultingRootStatusLabel={privacyFlow.privateCoreOperatorSendResultingRootStatusLabel}
        operatorSwapResultingRootLinkedProof={privacyFlow.privateCoreOperatorSwapResultingRootLinkedProof}
        operatorSwapResultingRootRecord={privacyFlow.privateCoreOperatorSwapResultingRootRecord}
        operatorSwapResultingRootPrimaryNote={privacyFlow.privateCoreOperatorSwapResultingRootPrimaryNote}
        operatorSwapResultingRootRegistrationPrimaryNote={privacyFlow.privateCoreOperatorSwapResultingRootRegistrationPrimaryNote}
        operatorSwapResultingRootProofLinkStatus={privacyFlow.privateCoreOperatorSwapResultingRootProofLinkStatus}
        operatorSwapResultingRootRegistrationStatusLabel={privacyFlow.privateCoreOperatorSwapResultingRootRegistrationStatusLabel}
        operatorSwapResultingRootStatusLabel={privacyFlow.privateCoreOperatorSwapResultingRootStatusLabel}
        operatorSendError={privacyFlow.privateCoreOperatorSendError}
        operatorSends={privacyFlow.privateCoreOperatorSends}
        operatorSendProofError={privacyFlow.privateCoreOperatorSendProofError}
        operatorSendProofs={privacyFlow.privateCoreOperatorSendProofs}
        operatorSwaps={privacyFlow.privateCoreOperatorSwaps}
        operatorSwapProofs={privacyFlow.privateCoreOperatorSwapProofs}
        operatorSummaryUpdatedAt={privacyFlow.privateCoreOperatorSummaryUpdatedAt}
        title="Shared private-core state"
      />
    </section>
  );
}
