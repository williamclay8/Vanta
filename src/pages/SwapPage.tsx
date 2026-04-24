import { useEffect, useMemo, useState } from "react";
import { useWalletSession } from "@solana/react-hooks";
import { isBetaMode } from "@/config/deploymentMode";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  formatAssetAmount,
  type ShieldedSwapAssetKey,
} from "@/solana/publicSwapRoute";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  VANTA_SWAP_INTENT_TTL_MS,
  createSwapIntentPayload,
  signSwapIntent,
} from "@/solana/swapAuth";
import {
  getLiveShieldTokenAsset,
  liveShieldAsset,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import {
  fetchSwapLaneHealth,
  fetchSwapQuote,
  requestOperatorSwap,
  type SwapLaneHealth,
  type SwapQuote,
} from "@/solana/swapOperatorClient";
import {
  getShieldedSwapPairCapability,
  listShieldedSwapAssetOptions,
} from "@/solana/shieldedSwapCapability";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  createPreparedSwapMemo,
  createSpentMarkerInstruction,
  type VantaShieldAccountState,
  type VantaShieldNote,
} from "@/solana/vantaShieldState";
import { useWalletState } from "@/data/context/WalletContext";
import { recordCanonicalSwapFromLiveSwap } from "@/zk/liveSwapBridge";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import { signWalletMessageIntentWithSafety } from "@/wallet/walletMessageIntentSafety.mjs";

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
  | "awaiting_confirmation"
  | "recording_transition"
  | "authorizing_operator"
  | "finalizing_state"
  | "complete"
  | "failed";

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

function toVusdBaseUnits(value: number) {
  return Math.round(value * 1_000_000);
}

export function SwapPage() {
  const { walletAddress, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const shieldAssetRegistry = useVantaShieldAssetRegistryState();
  const shieldedSwapAssets = useMemo(() => listShieldedSwapAssetOptions(), []);
  const [amount, setAmount] = useState("");
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<ShieldedSwapAssetKey>("VUSD");
  const [selectedTargetAsset, setSelectedTargetAsset] = useState<ShieldedSwapAssetKey>("SOL");
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
  const swapTransaction = useVantaSafeSendTransaction();
  const swapWait = useRealtimeSignatureProgress(swapTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !swapTransaction.signature,
  });
  const spentMarkerTransaction = useVantaSafeSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );

  const sourcePairCapability = useMemo(
    () =>
      getShieldedSwapPairCapability({
        inputAsset: selectedSourceAsset,
        outputAsset: selectedTargetAsset,
      }),
    [selectedSourceAsset, selectedTargetAsset],
  );
  const selectedTokenSourceEntry =
    selectedSourceAsset === "SOL" ? null : shieldAssetRegistry.byAssetKey[selectedSourceAsset];
  const selectedSourceAccount =
    selectedSourceAsset === "SOL" ? shieldAccount : selectedTokenSourceEntry?.account ?? null;

  const spendableNotes = useMemo(() => {
    const baseSpendableNotes =
      selectedSourceAsset === "SOL"
        ? shieldAccount?.spendableShieldedSolNotes ?? []
        : selectedSourceAccount?.spendableShieldNotes ?? [];

    return baseSpendableNotes.filter((note) => {
      return note.noteId !== optimisticallyConsumedNoteId;
    });
  }, [
    optimisticallyConsumedNoteId,
    selectedSourceAccount?.spendableShieldNotes,
    selectedSourceAsset,
    shieldAccount?.spendableShieldedSolNotes,
  ]);

  useEffect(() => {
    if (!optimisticallyConsumedNoteId) {
      return;
    }

    const baseSpendableNotes =
      selectedSourceAsset === "SOL"
        ? shieldAccount?.spendableShieldedSolNotes ?? []
        : selectedSourceAccount?.spendableShieldNotes ?? [];

    if (!baseSpendableNotes.some((note) => note.noteId === optimisticallyConsumedNoteId)) {
      setOptimisticallyConsumedNoteId(null);
    }
  }, [
    optimisticallyConsumedNoteId,
    selectedSourceAccount?.spendableShieldNotes,
    selectedSourceAsset,
    shieldAccount?.spendableShieldedSolNotes,
  ]);

  const parsedAmount = Number(amount);
  const selectedShieldAssetKey: LiveShieldTokenAssetKey = "VUSD";
  const selectedShieldAsset = getLiveShieldTokenAsset(selectedShieldAssetKey);
  const sourceBalance =
    selectedSourceAsset === "SOL"
      ? shieldAccount?.shieldedSolBalance ?? 0
      : selectedSourceAccount?.balance ?? 0;
  const exactSpendableNote = useMemo(() => {
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return null;
    }

    const targetAmount = toVusdBaseUnits(parsedAmount);
    return (
      spendableNotes.find((note) => toVusdBaseUnits(note.amount) === targetAmount) ?? null
    );
  }, [parsedAmount, spendableNotes]);
  const maxAvailableAmount = sourceBalance;
  const requiresPrivateSwap = sourcePairCapability.status === "live";

  useEffect(() => {
    let cancelled = false;

    void fetchSwapLaneHealth()
      .then((nextHealth) => {
        if (cancelled) {
          return;
        }

        setLaneHealth(nextHealth);
        setLaneHealthError(null);
      })
      .catch((error) => {
        if (cancelled) {
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
      cancelled = true;
    };
  }, [quoteRefreshNonce]);

  useEffect(() => {
    if (
      !walletConnected ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      sourcePairCapability.status !== "live"
    ) {
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

    const loadQuote = async () => {
      const nextQuote = await fetchSwapQuote(parsedAmount.toString());

      if (controller.signal.aborted) {
        return;
      }

      setQuote(nextQuote);
    };

    void loadQuote()
      .then(() => {
        if (!controller.signal.aborted) {
          setStatus((currentStatus) => (currentStatus === "quoting" ? "idle" : currentStatus));
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setQuote(null);
        setQuoteError(
          error instanceof Error
            ? error.message
            : "The swap route quote could not be loaded.",
        );
        setStatus((currentStatus) => (currentStatus === "quoting" ? "failed" : currentStatus));
      });

    return () => {
      controller.abort();
    };
  }, [
    parsedAmount,
    quoteRefreshNonce,
    sourcePairCapability.status,
    status,
    walletConnected,
  ]);

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
      !pendingSpentMarker ||
      !pendingSwapBridge ||
      !walletAddress ||
      !walletSession?.signMessage ||
      !lastSwapSummary ||
      operatorAuthorizationStarted ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setOperatorAuthorizationStarted(true);
    setStatus("authorizing_operator");
    const transitionSignature = swapTransaction.signature?.toString();

    if (!transitionSignature) {
      setStatus("failed");
      setFlowError("The swap transition signature was unavailable.");
      setOperatorAuthorizationStarted(false);
      return;
    }

    const signMessage = walletSession.signMessage;

    const payload = createSwapIntentPayload({
      consumedNoteId: pendingSwapBridge.input.noteId,
      inputAmount: pendingSwapBridge.input.amountDisplay,
      inputAsset: "VUSD",
      mintAddress: pendingSwapBridge.input.mintAddress,
      outputAmount: pendingSwapBridge.output.amountDisplay,
      outputAsset: "SOL",
      outputNoteId: lastSwapSummary.outputNoteId,
      owner: pendingSwapBridge.owner,
      quoteExpiresAt: pendingSwapBridge.venue.quoteExpiresAt,
      quoteId: pendingSwapBridge.venue.quoteId,
      quoteTimestamp: pendingSwapBridge.venue.quoteTimestamp,
      requester: walletAddress,
      transitionNoteId: pendingSpentMarker.transitionNoteId,
      transitionStateSignature: transitionSignature,
      vaultOwner: pendingSwapBridge.vaultOwner,
      venueFamily: pendingSwapBridge.venue.family,
      venueName: pendingSwapBridge.venue.name,
      venueNetwork: pendingSwapBridge.venue.network,
      venuePoolAddress: pendingSwapBridge.venue.poolAddress,
    });

    void signSwapIntent(payload, async (message) => {
      const messageIntentSignature = await signWalletMessageIntentWithSafety({
        amount: payload.inputAmount,
        asset: payload.inputAsset,
        connectedWalletAddress: walletAddress,
        expiresAt: Math.min(payload.issuedAt + VANTA_SWAP_INTENT_TTL_MS, payload.quoteExpiresAt),
        humanApprovedSummary: true,
        intentKind: "swap-intent",
        issuedAt: payload.issuedAt,
        message,
        owner: payload.owner,
        recipient: payload.outputNoteId,
        requestId: payload.requestId,
        requester: payload.requester,
        signMessage,
      });

      if (
        !messageIntentSignature.signed ||
        !messageIntentSignature.signatureBytes ||
        messageIntentSignature.decision.reason !== "message-intent-ready-for-wallet-approval"
      ) {
        throw new Error(`The swap intent could not be signed: ${messageIntentSignature.decision.reason}.`);
      }

      return messageIntentSignature.signatureBytes;
    })
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
        }).then((priorityFeeInstructions) => {
          const instructions = [
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
          ];

          return spentMarkerTransaction.send({
            amount: pendingSwapBridge.input.amountDisplay,
            asset: "VUSD",
            cluster: "devnet",
            connectedWalletAddress: pendingSpentMarker.owner,
            estimatedFees: "wallet-estimated",
            feePayer: pendingSpentMarker.owner,
            humanApprovedSummary: true,
            instructions,
            label: "swap-spent-marker",
            recipient: pendingSpentMarker.vaultOwner,
            summaryInstructions: ["swap-spent-marker"],
            transactionFingerprint: `swap-spent-marker:${pendingSpentMarker.owner}:${pendingSpentMarker.consumedNoteId}:${pendingSpentMarker.transitionNoteId}`,
          });
        });
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
    pendingSwapBridge,
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
      // Ignore transient refresh errors during finalization fallback polling.
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

  const expectedOutputAmount =
    sourcePairCapability.status === "live" ? Number(quote?.outputAmount ?? "0") : 0;
  const isQuoteFresh = quote ? Date.now() <= quote.quoteExpiresAt : true;
  const isLaneHealthy = requiresPrivateSwap ? laneHealth?.status === "healthy" : true;
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canUseExistingNote =
    sourcePairCapability.status === "live" &&
    Boolean(exactSpendableNote);
  const hasRouteQuote = sourcePairCapability.status === "live" && Boolean(quote);
  const isReady =
    walletConnected &&
    isAmountValid &&
    hasRouteQuote &&
    isQuoteFresh &&
    isLaneHealthy &&
    (!requiresPrivateSwap || Boolean(walletSession?.signMessage)) &&
    Boolean(selectedShieldAsset.mintAddress) &&
    Boolean(selectedShieldAsset.vaultOwner) &&
    (!requiresPrivateSwap || liveSwapPair.configured) &&
    canUseExistingNote;
  const routeLabel = (() => {
    if (sourcePairCapability.blockers.length > 0) {
      return sourcePairCapability.blockers[0];
    }

    if (!isAmountValid) {
      return "Enter a valid amount to continue.";
    }

    if (canUseExistingNote) {
      return "Using an existing shielded VUSD note before the private swap.";
    }

    return `Shield the exact ${selectedSourceAsset} amount first, then return here to swap.`;
  })();

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

  async function performLiveSwapFromNote(args: {
    note: VantaShieldNote;
    shieldAccountState: VantaShieldAccountState;
    swapQuote: SwapQuote;
  }) {
    swapTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    setSwapBridgeError(null);
    setOperatorAuthorizationStarted(false);
    setPendingSwapBridge(null);
    setStatus("awaiting_confirmation");

    const createdAt = Date.now();
    const preparedSwap = createPreparedSwapMemo({
      consumedNoteId: args.note.noteId,
      createdAt,
      inputAmount: args.note.amount.toString(),
      inputAsset: "VUSD",
      mintAddress: liveShieldAsset.mintAddress!,
      outputAmount: args.swapQuote.outputAmount,
      outputAsset: "SOL",
      owner: args.shieldAccountState.owner,
      quoteExpiresAt: args.swapQuote.quoteExpiresAt,
      quoteId: args.swapQuote.quoteId,
      quoteTimestamp: args.swapQuote.quoteTimestamp,
      venueFamily: args.swapQuote.venueFamily,
      venueName: args.swapQuote.venueName,
      venueNetwork: args.swapQuote.venueNetwork,
      venuePoolAddress: args.swapQuote.venuePoolAddress,
      vaultOwner: args.shieldAccountState.vaultOwner,
    });

    setPendingSpentMarker({
      consumedNoteId: args.note.noteId,
      createdAt,
      mintAddress: liveShieldAsset.mintAddress!,
      owner: args.shieldAccountState.owner,
      transitionKind: "swap",
      transitionNoteId: preparedSwap.noteId,
      vaultOwner: args.shieldAccountState.vaultOwner,
    });
    setPendingSwapBridge({
      createdAt,
      owner: args.shieldAccountState.owner,
      vaultOwner: args.shieldAccountState.vaultOwner,
      input: {
        amountDisplay: args.note.amount.toFixed(2),
        mintAddress: liveShieldAsset.mintAddress!,
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      output: {
        amountDisplay: args.swapQuote.outputAmount,
        assetId: liveSwapPair.solAssetId,
        noteId: preparedSwap.outputNoteId,
      },
      transition: {
        noteId: preparedSwap.noteId,
      },
      venue: {
        family: args.swapQuote.venueFamily,
        name: args.swapQuote.venueName,
        network: args.swapQuote.venueNetwork,
        poolAddress: args.swapQuote.venuePoolAddress,
        quoteId: args.swapQuote.quoteId,
        quoteTimestamp: args.swapQuote.quoteTimestamp,
        quoteExpiresAt: args.swapQuote.quoteExpiresAt,
      },
    });
    setLastSwapSummary({
      inputAmount: args.note.amount,
      outputAmount: Number(args.swapQuote.outputAmount),
      outputNoteId: preparedSwap.outputNoteId,
      quoteExpiresAt: args.swapQuote.quoteExpiresAt,
      quoteId: args.swapQuote.quoteId,
      quoteTimestamp: args.swapQuote.quoteTimestamp,
      transitionNoteId: preparedSwap.noteId,
      venueFamily: args.swapQuote.venueFamily,
      venueName: args.swapQuote.venueName,
      venueNetwork: args.swapQuote.venueNetwork,
      venuePoolAddress: args.swapQuote.venuePoolAddress,
    });
    const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
      accountKeys: [
        args.note.noteId,
        liveShieldAsset.mintAddress!,
        args.shieldAccountState.owner,
        preparedSwap.noteId,
        preparedSwap.outputNoteId,
        args.shieldAccountState.vaultOwner,
        walletAddress ?? args.shieldAccountState.owner,
      ],
      action: "swap_transition",
    });

    const instructions = [...priorityFeeInstructions, preparedSwap.instruction];

    await swapTransaction.send({
      amount: args.note.amount.toString(),
      asset: "VUSD",
      cluster: "devnet",
      connectedWalletAddress: args.shieldAccountState.owner,
      estimatedFees: "wallet-estimated",
      feePayer: args.shieldAccountState.owner,
      humanApprovedSummary: true,
      instructions,
      label: "swap-transition",
      recipient: args.shieldAccountState.vaultOwner,
      summaryInstructions: ["swap-transition"],
      transactionFingerprint: `swap-transition:${args.shieldAccountState.owner}:${args.note.noteId}:${preparedSwap.noteId}`,
    });
  }

  async function handleSwap() {
    if (isBetaMode) {
      return;
    }

    if (!selectedShieldAsset.mintAddress) {
      return;
    }

    if (
      canUseExistingNote &&
      shieldAccount &&
      exactSpendableNote &&
      sourcePairCapability.executionMode === "operator-vusd-sol"
    ) {
      const freshQuote =
        quote && isQuoteFresh ? quote : await fetchSwapQuote(parsedAmount.toString());
      setQuote(freshQuote);

      try {
        await performLiveSwapFromNote({
          note: exactSpendableNote as VantaShieldNote,
          shieldAccountState: shieldAccount,
          swapQuote: freshQuote,
        });
      } catch (error) {
        setPendingSpentMarker(null);
        setPendingSwapBridge(null);
        setStatus("failed");
        setFlowError(error instanceof Error ? error.message : "Swap request was not approved.");
      }
      return;
    }
  }

  let validationMessage = "Enter an amount to continue.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to swap.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps Swap visible but prevents live route execution while production services are offline.";
  } else if (sourcePairCapability.status !== "live") {
    validationMessage =
      sourcePairCapability.blockers[0] ??
      "This shielded pair needs a private route adapter before it can execute.";
  } else if (!selectedShieldAsset.configured) {
    validationMessage = `Shielded ${selectedSourceAsset} is not configured yet.`;
  } else if (requiresPrivateSwap && !liveSwapPair.configured) {
    validationMessage = "Swap requires the live VUSD mint, vault, and local operator path.";
  } else if ((requiresPrivateSwap || selectedShieldAssetKey === "VUSD") && shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta state.";
  } else if ((requiresPrivateSwap || selectedShieldAssetKey === "VUSD") && shieldStateError) {
    validationMessage = shieldStateError;
  } else if (requiresPrivateSwap && !walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing.";
  } else if (requiresPrivateSwap && laneHealth && laneHealth.status !== "healthy") {
    validationMessage = laneHealth.message;
  } else if (requiresPrivateSwap && laneHealthError) {
    validationMessage = laneHealthError;
  } else if (!isAmountValid) {
    validationMessage = `Enter a valid shielded ${selectedSourceAsset} amount.`;
  } else if (parsedAmount > sourceBalance) {
    validationMessage = `Insufficient shielded ${selectedSourceAsset} balance.`;
  } else if (!exactSpendableNote) {
    validationMessage = `Shield the exact ${selectedSourceAsset} amount first, then return here to swap.`;
  } else if (requiresPrivateSwap && quote && !isQuoteFresh) {
    validationMessage = "Refreshing the current quote will unlock this swap.";
  } else if (!hasRouteQuote && status !== "quoting") {
    validationMessage = quoteError ?? "The current quote is not available yet.";
  }

  const sourceBalanceLabel = formatAssetAmount(
    sourceBalance,
    selectedSourceAsset,
  );

  return (
    <section className="send-page swap-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Private Swap</span>
          <h2>Private Swap</h2>
          <p>{routeLabel}</p>
        </div>
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Private Swap</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>You send</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Balance: {sourceBalanceLabel}
                  </div>
                </div>
                <div className="send-entry-grid swap-entry-grid">
                  <div className="amount-field">
                    <input
                      id="swap-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                      placeholder="0.00"
                    />
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={maxAvailableAmount <= 0}
                      onClick={() => {
                        if (maxAvailableAmount <= 0) {
                          return;
                        }

                        setAmount(maxAvailableAmount.toFixed(2));
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <div className="swap-choice-grid" aria-label="Swap route">
                <div className="swap-choice-group" role="group" aria-label="From shielded asset">
                  <span>From</span>
                  <div className="send-asset-field">
                    <select
                      aria-label="From shielded asset"
                      value={selectedSourceAsset}
                      onChange={(event) => {
                        setSelectedSourceAsset(event.target.value as ShieldedSwapAssetKey);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      {shieldedSwapAssets.map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {asset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="swap-choice-group" role="group" aria-label="To shielded asset">
                  <span>To</span>
                  <div className="send-asset-field">
                    <select
                      aria-label="To shielded asset"
                      value={selectedTargetAsset}
                      onChange={(event) => {
                        setSelectedTargetAsset(event.target.value as ShieldedSwapAssetKey);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      {shieldedSwapAssets.map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {asset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>You receive</span>
                </div>
                <div className="swap-quote-line">
                  <strong>
                    {status === "quoting"
                      ? "Loading quote..."
                      : formatAssetAmount(expectedOutputAmount, selectedTargetAsset)}
                  </strong>
                  <span>{`Shielded ${selectedTargetAsset}`}</span>
                </div>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
              <p className="shield-helper">{validationMessage}</p>

              <div className="shield-form__actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleSwap();
                  }}
                  disabled={
                    isBetaMode ||
                    !isReady ||
                    status === "recording_transition" ||
                    status === "authorizing_operator" ||
                    status === "finalizing_state"
                  }
                >
                  {isBetaMode ? "Beta mode" : `Swap to shielded ${selectedTargetAsset}`}
                </button>
              </div>
            </div>

            {(status === "awaiting_confirmation" ||
              status === "recording_transition" ||
              status === "authorizing_operator" ||
              status === "finalizing_state" ||
              status === "complete" ||
              status === "failed") && (
              <div
                className={
                  status === "complete"
                    ? "status-panel status-panel--success"
                    : status === "failed"
                      ? "status-panel status-panel--error"
                      : "status-panel status-panel--processing"
                }
              >
                <span>
                  {status === "awaiting_confirmation"
                    ? "Awaiting wallet confirmation"
                    : status === "recording_transition"
                      ? "Recording swap transition"
                      : status === "authorizing_operator"
                        ? "Authorizing operator"
                        : status === "finalizing_state"
                          ? "Finalizing shielded state"
                          : status === "complete"
                            ? "Swap complete"
                            : "Swap failed"}
                </span>
                <p>
                  {status === "complete" && selectedTargetAsset === "SOL" && lastSwapSummary
                    ? `Swapped ${formatAssetAmount(lastSwapSummary.inputAmount, "VUSD")} into ${formatAssetAmount(lastSwapSummary.outputAmount, "SOL")}.`
                    : status === "complete"
                      ? `Converted ${formatAssetAmount(parsedAmount, selectedSourceAsset)} into shielded ${selectedTargetAsset}.`
                    : status === "failed"
                      ? flowError ?? "The swap could not be completed."
                      : status === "authorizing_operator"
                        ? "Submitting the authenticated swap intent to the operator."
                      : status === "finalizing_state"
                          ? "Recording the spent marker and resolving the new shielded SOL note."
                          : "Approve the swap in your wallet to continue."}
                </p>
                {quote &&
                  status !== "failed" &&
                  status !== "complete" && (
                  <p className="shield-helper shield-helper--meta">
                    Quote from {quote.venueName} {quote.venueFamily} ·{" "}
                    {formatQuoteTimestamp(quote.quoteTimestamp)}
                  </p>
                )}
                {swapBridgeError && status === "complete" && (
                  <p className="shield-helper shield-helper--meta">{swapBridgeError}</p>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
