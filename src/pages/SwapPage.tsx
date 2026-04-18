import { useEffect, useMemo, useState } from "react";
import {
  useSendTransaction,
  useSolanaClient,
  useSplToken,
  useWalletSession,
} from "@solana/react-hooks";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  buildPublicToVusdSwapInstructions,
  fetchPublicToVusdQuote,
  formatAssetAmount,
  listExecutableShieldedAssets,
  listExecutableSourceAssets,
  type PublicSwapAssetKey,
  type PublicToVusdQuote,
  type ShieldedSwapAssetKey,
} from "@/solana/publicSwapRoute";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { createSwapIntentPayload, signSwapIntent } from "@/solana/swapAuth";
import {
  liveShieldAsset,
  liveSwapPair,
  SHIELD_HOOK_FALLBACK_MINT,
} from "@/solana/shieldConfig";
import {
  fetchSwapLaneHealth,
  fetchSwapQuote,
  requestOperatorSwap,
  type SwapLaneHealth,
  type SwapQuote,
} from "@/solana/swapOperatorClient";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  createShieldMemoInstruction,
  createPreparedSwapMemo,
  createSpentMarkerInstruction,
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
  type VantaShieldNote,
} from "@/solana/vantaShieldState";
import { useWalletState } from "@/data/context/WalletContext";
import { recordCanonicalShieldFromLiveShield } from "@/zk/liveShieldBridge";
import { recordCanonicalSwapFromLiveSwap } from "@/zk/liveSwapBridge";

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

type PendingImplicitShieldSwap = {
  amountDisplay: string;
  amountNumeric: number;
  createdAt: number;
  depositSignature?: string;
  targetShieldedAsset: ShieldedSwapAssetKey;
};

type PendingPublicRoute = {
  previousVusdBalance: number;
  quote: PublicToVusdQuote;
  targetShieldedAsset: ShieldedSwapAssetKey;
};

type SwapStatus =
  | "idle"
  | "quoting"
  | "awaiting_confirmation"
  | "routing_public_swap"
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

function readTokenDecimals(balance: unknown) {
  if (typeof balance !== "object" || balance === null) {
    return undefined;
  }

  const candidate = (balance as { decimals?: unknown }).decimals;
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0
    ? candidate
    : undefined;
}

function toVusdBaseUnits(value: number) {
  return Math.round(value * 1_000_000);
}

export function SwapPage() {
  const client = useSolanaClient();
  const { solBalance, walletAddress, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isReady: shieldStateReady,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const supportedToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    {
      config: { tokenProgram: "auto" },
    },
  );
  const executableSourceAssets = useMemo(() => listExecutableSourceAssets(), []);
  const executableShieldedAssets = useMemo(() => listExecutableShieldedAssets(), []);
  const [amount, setAmount] = useState("");
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<PublicSwapAssetKey>("VUSD");
  const [selectedTargetAsset, setSelectedTargetAsset] = useState<ShieldedSwapAssetKey>("SOL");
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [publicRouteQuote, setPublicRouteQuote] = useState<PublicToVusdQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [laneHealth, setLaneHealth] = useState<SwapLaneHealth | null>(null);
  const [laneHealthError, setLaneHealthError] = useState<string | null>(null);
  const [quoteRefreshNonce, setQuoteRefreshNonce] = useState(0);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingSwapBridge, setPendingSwapBridge] = useState<PendingSwapBridge | null>(null);
  const [pendingPublicRoute, setPendingPublicRoute] = useState<PendingPublicRoute | null>(null);
  const [pendingImplicitShieldSwap, setPendingImplicitShieldSwap] =
    useState<PendingImplicitShieldSwap | null>(null);
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
  const publicRouteTransaction = useSendTransaction();
  const swapTransaction = useSendTransaction();
  const implicitShieldStateTransaction = useSendTransaction();
  const publicRouteWait = useRealtimeSignatureProgress(
    publicRouteTransaction.signature ?? undefined,
    {
    commitment: "confirmed",
      disabled: !publicRouteTransaction.signature,
    },
  );
  const swapWait = useRealtimeSignatureProgress(swapTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !swapTransaction.signature,
  });
  const implicitShieldTransferWait = useRealtimeSignatureProgress(
    supportedToken.sendSignature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !supportedToken.sendSignature,
    },
  );
  const implicitShieldStateWait = useRealtimeSignatureProgress(
    implicitShieldStateTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !implicitShieldStateTransaction.signature,
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

  const parsedAmount = Number(amount);
  const publicVusdBalance = Number(supportedToken.balance?.uiAmount ?? "0");
  const sourceBalance =
    selectedSourceAsset === "SOL" ? Number(solBalance ?? 0) : publicVusdBalance;
  const exactSpendableNote = useMemo(() => {
    if (
      selectedSourceAsset !== "VUSD" ||
      selectedTargetAsset !== "SOL" ||
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
  const requiresPublicRoute = selectedSourceAsset !== "VUSD";
  const requiresPrivateSwap = selectedTargetAsset === "SOL";

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
    if (!walletConnected || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setQuote(null);
      setPublicRouteQuote(null);
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
      if (selectedSourceAsset === "VUSD" && selectedTargetAsset === "VUSD") {
        setPublicRouteQuote(null);
        setQuote(null);
        return;
      }

      const nextPublicRouteQuote = requiresPublicRoute
        ? await fetchPublicToVusdQuote({
            amount: parsedAmount.toString(),
            inputAsset: selectedSourceAsset,
          })
        : null;

      if (controller.signal.aborted) {
        return;
      }

      setPublicRouteQuote(nextPublicRouteQuote);

      if (!requiresPrivateSwap) {
        setQuote(null);
        return;
      }

      const privateInputAmount = nextPublicRouteQuote?.outputAmount ?? parsedAmount.toString();
      const nextQuote = await fetchSwapQuote(privateInputAmount);

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
        setPublicRouteQuote(null);
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
    requiresPrivateSwap,
    requiresPublicRoute,
    selectedSourceAsset,
    selectedTargetAsset,
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
    if (!pendingPublicRoute) {
      return;
    }

    if (publicRouteTransaction.status === "loading") {
      setStatus("routing_public_swap");
      return;
    }

    if (publicRouteTransaction.status === "error") {
      setStatus("failed");
      setPendingPublicRoute(null);
      setFlowError(
        publicRouteTransaction.error instanceof Error
          ? publicRouteTransaction.error.message
          : "The public route could not be submitted.",
      );
    }
  }, [pendingPublicRoute, publicRouteTransaction.error, publicRouteTransaction.status]);

  useEffect(() => {
    if (!pendingPublicRoute || publicRouteWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingPublicRoute(null);
    setFlowError(
      publicRouteWait.waitError instanceof Error
        ? publicRouteWait.waitError.message
        : "The public route was submitted but not confirmed.",
    );
  }, [pendingPublicRoute, publicRouteWait.waitError, publicRouteWait.waitStatus]);

  useEffect(() => {
    if (
      !pendingPublicRoute ||
      publicRouteWait.waitStatus !== "success" ||
      !liveShieldAsset.vaultOwner ||
      pendingImplicitShieldSwap
    ) {
      return;
    }

    const continueFromPublicRoute = async () => {
      try {
        const refreshedBalance = await supportedToken.refresh();
        const nextPublicVusdBalance = Number(refreshedBalance?.uiAmount ?? "0");
        const routedAmount = Number(
          Math.max(nextPublicVusdBalance - pendingPublicRoute.previousVusdBalance, 0).toFixed(6),
        );
        const amountNumeric =
          routedAmount > 0 ? routedAmount : Number(pendingPublicRoute.quote.outputAmount);

        if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
          throw new Error("The public route completed, but Vanta could not resolve the routed VUSD.");
        }

        await startImplicitShield({
          amountDisplay: amountNumeric.toFixed(6),
          amountNumeric,
          targetShieldedAsset: pendingPublicRoute.targetShieldedAsset,
        });
        setPendingPublicRoute(null);
      } catch (error) {
        setStatus("failed");
        setPendingPublicRoute(null);
        setFlowError(
          error instanceof Error
            ? error.message
            : "The public route completed, but Vanta could not continue into the shielded flow.",
        );
      }
    };

    void continueFromPublicRoute();
  }, [
    pendingImplicitShieldSwap,
    pendingPublicRoute,
    publicRouteWait.waitStatus,
    supportedToken,
  ]);

  useEffect(() => {
    if (!pendingImplicitShieldSwap) {
      return;
    }

    if (supportedToken.sendStatus === "loading") {
      setStatus("recording_transition");
      return;
    }

    if (supportedToken.sendStatus === "error") {
      setStatus("failed");
      setPendingImplicitShieldSwap(null);
      setFlowError(
        supportedToken.sendError instanceof Error
          ? supportedToken.sendError.message
          : "The implicit shield transfer was not approved.",
      );
      return;
    }

    if (supportedToken.sendStatus === "success" && supportedToken.sendSignature) {
      setPendingImplicitShieldSwap((current) =>
        current
          ? {
              ...current,
              depositSignature: supportedToken.sendSignature ?? current.depositSignature,
            }
          : current,
      );
    }
  }, [
    pendingImplicitShieldSwap,
    supportedToken.sendError,
    supportedToken.sendSignature,
    supportedToken.sendStatus,
  ]);

  useEffect(() => {
    if (!pendingImplicitShieldSwap || implicitShieldTransferWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingImplicitShieldSwap(null);
    setFlowError(
      implicitShieldTransferWait.waitError instanceof Error
        ? implicitShieldTransferWait.waitError.message
        : "The implicit shield transfer was submitted but not confirmed.",
    );
  }, [
    implicitShieldTransferWait.waitError,
    implicitShieldTransferWait.waitStatus,
    pendingImplicitShieldSwap,
  ]);

  useEffect(() => {
    if (
      !pendingImplicitShieldSwap ||
      implicitShieldTransferWait.waitStatus !== "success" ||
      !pendingImplicitShieldSwap.depositSignature ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner ||
      !supportedToken.owner
    ) {
      return;
    }

    if (
      implicitShieldStateTransaction.status === "loading" ||
      implicitShieldStateTransaction.signature
    ) {
      return;
    }

    const depositSignature = pendingImplicitShieldSwap.depositSignature;

    if (!depositSignature) {
      return;
    }

    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        liveShieldAsset.mintAddress,
        supportedToken.owner,
        depositSignature,
        liveShieldAsset.vaultOwner,
      ],
      action: "shield_state",
    })
      .then((priorityFeeInstructions) =>
        implicitShieldStateTransaction.send({
          instructions: [
            ...priorityFeeInstructions,
            createShieldMemoInstruction({
              amount: pendingImplicitShieldSwap.amountDisplay,
              asset: "VUSD",
              createdAt: pendingImplicitShieldSwap.createdAt,
              depositSignature,
              mintAddress: liveShieldAsset.mintAddress!,
              owner: supportedToken.owner!,
              vaultOwner: liveShieldAsset.vaultOwner!,
            }),
          ],
        }),
      )
      .catch((error) => {
        setStatus("failed");
        setPendingImplicitShieldSwap(null);
        setFlowError(
          error instanceof Error
            ? error.message
            : "The implicit shield state note could not be recorded.",
        );
      });
  }, [
    implicitShieldStateTransaction,
    implicitShieldTransferWait.waitStatus,
    liveShieldAsset.mintAddress,
    liveShieldAsset.vaultOwner,
    pendingImplicitShieldSwap,
    supportedToken.owner,
  ]);

  useEffect(() => {
    if (!pendingImplicitShieldSwap || implicitShieldStateWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingImplicitShieldSwap(null);
    setFlowError(
      implicitShieldStateWait.waitError instanceof Error
        ? implicitShieldStateWait.waitError.message
        : "The implicit shield state note was submitted but not confirmed.",
    );
  }, [
    implicitShieldStateWait.waitError,
    implicitShieldStateWait.waitStatus,
    pendingImplicitShieldSwap,
  ]);

  useEffect(() => {
    if (
      !pendingImplicitShieldSwap ||
      implicitShieldStateWait.waitStatus !== "success" ||
      !implicitShieldStateTransaction.signature ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner ||
      !supportedToken.owner ||
      swapTransaction.status === "loading" ||
      swapTransaction.signature
    ) {
      return;
    }

    const continueImplicitShieldFlow = async () => {
      try {
        const shieldStateSignature = implicitShieldStateTransaction.signature?.toString();

        if (!shieldStateSignature) {
          throw new Error("The implicit shield state signature was unavailable.");
        }

        await refreshShieldState();

        const refreshedAccount = await fetchVantaShieldAccountState({
          client,
          mintAddress: liveShieldAsset.mintAddress!,
          owner: supportedToken.owner!,
          vaultOwner: liveShieldAsset.vaultOwner!,
        });
        const freshlyShieldedNote = refreshedAccount.spendableShieldNotes.find(
          (note) => note.stateSignature === shieldStateSignature,
        );

        if (!freshlyShieldedNote) {
          throw new Error(
            "The shielded note was created, but Vanta could not resolve it for the swap step.",
          );
        }

        await recordCanonicalShieldFromLiveShield({
          amountDisplay: pendingImplicitShieldSwap.amountDisplay,
          amountNumeric: pendingImplicitShieldSwap.amountNumeric,
          assetSymbol: "VUSD",
          createdAt: pendingImplicitShieldSwap.createdAt,
          depositSignature: pendingImplicitShieldSwap.depositSignature,
          mintAddress: liveShieldAsset.mintAddress!,
          owner: supportedToken.owner!,
          stateSignature: shieldStateSignature,
          tokenDecimals: readTokenDecimals(supportedToken.balance),
          vaultOwner: liveShieldAsset.vaultOwner!,
        });

        if (pendingImplicitShieldSwap.targetShieldedAsset === "VUSD") {
          await refreshShieldState();
          setStatus("complete");
          setFlowError(null);
          setPendingImplicitShieldSwap(null);
          return;
        }

        const freshQuote = await fetchSwapQuote(pendingImplicitShieldSwap.amountNumeric.toString());
        setQuote(freshQuote);
        await performLiveSwapFromNote({
          note: freshlyShieldedNote,
          shieldAccountState: refreshedAccount,
          swapQuote: freshQuote,
        });
        setPendingImplicitShieldSwap(null);
      } catch (error) {
        setStatus("failed");
        setPendingImplicitShieldSwap(null);
        setFlowError(
          error instanceof Error
            ? error.message
            : "Vanta could not finish the implicit shield before swapping.",
        );
      }
    };

    void continueImplicitShieldFlow();
  }, [
    client,
    implicitShieldStateTransaction.signature,
    implicitShieldStateWait.waitStatus,
    liveShieldAsset.mintAddress,
    liveShieldAsset.vaultOwner,
    pendingImplicitShieldSwap,
    refreshShieldState,
    supportedToken.balance,
    supportedToken.owner,
    swapTransaction.signature,
    swapTransaction.status,
  ]);

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
    selectedTargetAsset === "SOL"
      ? Number(quote?.outputAmount ?? "0")
      : Number(publicRouteQuote?.outputAmount ?? (Number.isFinite(parsedAmount) ? parsedAmount : 0));
  const isQuoteFresh = quote ? Date.now() <= quote.quoteExpiresAt : true;
  const isLaneHealthy = requiresPrivateSwap ? laneHealth?.status === "healthy" : true;
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canUseExistingNote =
    selectedSourceAsset === "VUSD" &&
    selectedTargetAsset === "SOL" &&
    Boolean(exactSpendableNote);
  const canImplicitShield =
    walletConnected &&
    shieldStateReady &&
    isAmountValid &&
    parsedAmount <= sourceBalance &&
    Boolean(liveShieldAsset.mintAddress) &&
    Boolean(liveShieldAsset.vaultOwner);
  const hasRouteQuote =
    selectedTargetAsset === "VUSD" ? !requiresPublicRoute || Boolean(publicRouteQuote) : Boolean(quote);
  const isReady =
    walletConnected &&
    isAmountValid &&
    hasRouteQuote &&
    isQuoteFresh &&
    isLaneHealthy &&
    (!requiresPrivateSwap || Boolean(walletSession?.signMessage)) &&
    Boolean(liveShieldAsset.mintAddress) &&
    Boolean(liveShieldAsset.vaultOwner) &&
    liveSwapPair.configured &&
    canImplicitShield;
  const routeLabel = (() => {
    if (!isAmountValid) {
      return "Enter a valid amount to continue.";
    }

    if (selectedSourceAsset === "VUSD" && selectedTargetAsset === "VUSD") {
      return "Vanta will shield VUSD automatically.";
    }

    if (selectedSourceAsset === "VUSD" && selectedTargetAsset === "SOL" && canUseExistingNote) {
      return "Using an existing shielded VUSD note before the private swap.";
    }

    if (selectedSourceAsset === "VUSD" && selectedTargetAsset === "SOL") {
      return "Vanta will shield VUSD automatically, then swap into shielded SOL.";
    }

    if (selectedSourceAsset === "SOL" && selectedTargetAsset === "VUSD") {
      return "Vanta will route SOL into VUSD, then shield it automatically.";
    }

    return "Vanta will route SOL into VUSD, shield it automatically, then swap into shielded SOL.";
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

    await swapTransaction.send({
      instructions: [...priorityFeeInstructions, preparedSwap.instruction],
    });
  }

  async function startImplicitShield(args: {
    amountDisplay: string;
    amountNumeric: number;
    targetShieldedAsset: ShieldedSwapAssetKey;
  }) {
    if (!liveShieldAsset.vaultOwner) {
      throw new Error("Vanta shield vault is not configured.");
    }

    supportedToken.resetSend();
    implicitShieldStateTransaction.reset();
    swapTransaction.reset();
    spentMarkerTransaction.reset();
    setPendingSpentMarker(null);
    setPendingSwapBridge(null);
    setFlowError(null);
    setStatus("awaiting_confirmation");
    setPendingImplicitShieldSwap({
      amountDisplay: args.amountDisplay,
      amountNumeric: args.amountNumeric,
      createdAt: Date.now(),
      targetShieldedAsset: args.targetShieldedAsset,
    });

    await supportedToken.send({
      amount: args.amountDisplay,
      destinationOwner: liveShieldAsset.vaultOwner,
    });
  }

  async function handleSwap() {
    if (!liveShieldAsset.mintAddress) {
      return;
    }

    if (canUseExistingNote && shieldAccount && selectedTargetAsset === "SOL") {
      const freshQuote =
        quote && isQuoteFresh ? quote : await fetchSwapQuote(parsedAmount.toString());
      setQuote(freshQuote);

      try {
        await performLiveSwapFromNote({
          note: exactSpendableNote!,
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

    if (!canImplicitShield) {
      return;
    }

    try {
      if (requiresPublicRoute) {
        const freshPublicRouteQuote =
          publicRouteQuote ??
          (await fetchPublicToVusdQuote({
            amount,
            inputAsset: selectedSourceAsset,
          }));

        setPublicRouteQuote(freshPublicRouteQuote);
        setPendingPublicRoute({
          previousVusdBalance: publicVusdBalance,
          quote: freshPublicRouteQuote,
          targetShieldedAsset: selectedTargetAsset,
        });
        publicRouteTransaction.reset();
        setStatus("awaiting_confirmation");
        setFlowError(null);
        const instructions = await buildPublicToVusdSwapInstructions({
          quote: freshPublicRouteQuote,
          userPublicKey: walletAddress!,
        });
        await publicRouteTransaction.send({
          instructions,
        });
        return;
      }

      await startImplicitShield({
        amountDisplay: amount,
        amountNumeric: parsedAmount,
        targetShieldedAsset: selectedTargetAsset,
      });
    } catch (error) {
      setPendingPublicRoute(null);
      setPendingImplicitShieldSwap(null);
      setStatus("failed");
      setFlowError(error instanceof Error ? error.message : "Swap request was not approved.");
    }
  }

  let validationMessage = "Enter an amount to continue.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to swap.";
  } else if (!liveSwapPair.configured) {
    validationMessage = "Swap requires the live VUSD mint, vault, and local operator path.";
  } else if (!liveSwapPair.venuePoolAddress) {
    validationMessage = "Swap requires one configured Meteora DLMM devnet pool.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta state.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (requiresPrivateSwap && !walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing.";
  } else if (requiresPrivateSwap && laneHealth && laneHealth.status !== "healthy") {
    validationMessage = laneHealth.message;
  } else if (requiresPrivateSwap && laneHealthError) {
    validationMessage = laneHealthError;
  } else if (!isAmountValid) {
    validationMessage = `Enter a valid ${selectedSourceAsset} amount.`;
  } else if (parsedAmount > sourceBalance) {
    validationMessage = `Insufficient ${selectedSourceAsset} balance.`;
  } else if (requiresPrivateSwap && quote && !isQuoteFresh) {
    validationMessage = "Refreshing the current quote will unlock this swap.";
  } else if (!hasRouteQuote && status !== "quoting") {
    validationMessage = quoteError ?? "The current quote is not available yet.";
  }

  return (
    <section className="send-page swap-page">
      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Private Swap</span>
            </div>
            <small>One input, one destination, one action</small>
          </div>

          <div className="shield-form">
            <div className="shield-form__section">
              <label>Swap</label>
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
                      setPublicRouteQuote(null);
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
                      setPublicRouteQuote(null);
                      setQuoteError(null);
                    }}
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="swap-choice-grid" aria-label="Swap route">
                <div className="swap-choice-group" role="group" aria-label="From asset">
                  <span>From</span>
                  <div className="swap-choice-row">
                    {executableSourceAssets.map((asset) => (
                      <button
                        key={asset.symbol}
                        className={
                          asset.symbol === selectedSourceAsset
                            ? "swap-choice-chip swap-choice-chip--active"
                            : "swap-choice-chip"
                        }
                        type="button"
                        aria-pressed={asset.symbol === selectedSourceAsset}
                        onClick={() => {
                          setSelectedSourceAsset(asset.symbol);
                          setStatus("idle");
                          setFlowError(null);
                          setQuote(null);
                          setPublicRouteQuote(null);
                          setQuoteError(null);
                        }}
                      >
                        {asset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="swap-choice-group" role="group" aria-label="To shielded asset">
                  <span>To</span>
                  <div className="swap-choice-row">
                    {executableShieldedAssets.map((asset) => (
                      <button
                        key={asset.symbol}
                        className={
                          asset.symbol === selectedTargetAsset
                            ? "swap-choice-chip swap-choice-chip--active"
                            : "swap-choice-chip"
                        }
                        type="button"
                        aria-pressed={asset.symbol === selectedTargetAsset}
                        onClick={() => {
                          setSelectedTargetAsset(asset.symbol);
                          setStatus("idle");
                          setFlowError(null);
                          setQuote(null);
                          setPublicRouteQuote(null);
                          setQuoteError(null);
                        }}
                      >
                        {asset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="send-balance-line shield-helper shield-helper--meta">
                Balance: {formatAssetAmount(sourceBalance, selectedSourceAsset)}
              </div>
            </div>

            <div className="shield-form__section">
              <label>Receive</label>
              <div className="swap-quote-line">
                <strong>
                  {status === "quoting"
                    ? "Loading quote..."
                    : formatAssetAmount(expectedOutputAmount, selectedTargetAsset)}
                </strong>
                <span>{selectedTargetAsset === "SOL" ? "Shielded SOL" : "Shielded VUSD"}</span>
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
                  !isReady ||
                  status === "routing_public_swap" ||
                  status === "recording_transition" ||
                  status === "authorizing_operator" ||
                  status === "finalizing_state"
                }
              >
                {selectedTargetAsset === "SOL" ? "Swap to shielded SOL" : "Swap to shielded VUSD"}
              </button>
            </div>

            {(status === "awaiting_confirmation" ||
              status === "routing_public_swap" ||
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
                    : status === "routing_public_swap"
                      ? "Routing public swap"
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
                      ? `Converted ${formatAssetAmount(parsedAmount, selectedSourceAsset)} into shielded VUSD.`
                    : status === "failed"
                      ? flowError ?? "The swap could not be completed."
                      : status === "routing_public_swap"
                        ? "Routing the public asset into VUSD before Vanta enters the shielded flow."
                      : status === "authorizing_operator"
                        ? "Submitting the authenticated swap intent to the operator."
                      : status === "finalizing_state"
                          ? "Recording the spent marker and resolving the new shielded SOL note."
                          : "Approve the swap in your wallet to continue."}
                </p>
                {((quote && requiresPrivateSwap) || publicRouteQuote) &&
                  status !== "failed" &&
                  status !== "complete" && (
                  <p className="shield-helper shield-helper--meta">
                    Quote from {requiresPrivateSwap && quote ? quote.venueName : "Meteora"}{" "}
                    {requiresPrivateSwap && quote ? quote.venueFamily : "DLMM"} ·{" "}
                    {formatQuoteTimestamp(
                      requiresPrivateSwap && quote ? quote.quoteTimestamp : Date.now(),
                    )}
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
