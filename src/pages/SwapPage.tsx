import { useCallback, useEffect, useMemo, useState } from "react";
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
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import {
  fetchSwapLaneHealth,
  fetchSwapQuote,
  requestOperatorSwap,
  type SwapLaneHealth,
  type SwapQuote,
} from "@/solana/swapOperatorClient";
import {
  fetchSolToShieldedRouteQuote,
  requestSolToShieldedRouteExecution,
  type SolToShieldedRouteQuote,
} from "@/solana/solToShieldedRouteAdapter";
import {
  getShieldedSwapPairCapability,
  listShieldedSwapAssetOptions,
} from "@/solana/shieldedSwapCapability";
import { getSwapTrustContract } from "@/solana/swapTrustContract";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  createPreparedSwapMemo,
  createSpentMarkerInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
  type VantaShieldAccountState,
  type VantaShieldNote,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";
import { useWalletState } from "@/data/context/WalletContext";
import { requestVantaPrivatePoolV2ProtocolSettlement } from "@/privacy/privatePoolV2ProtocolSettlementClient";
import {
  createCommittedSwapSettlementTerms,
  persistCanonicalSwapRecord,
  recordCanonicalSwapFromLiveSwap,
} from "@/zk/liveSwapBridge";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import { signWalletMessageIntentWithSafety } from "@/wallet/walletMessageIntentSafety.mjs";

type PendingSpentMarker = {
  asset: ShieldedSwapAssetKey;
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
    asset: ShieldedSwapAssetKey;
    amountDisplay: string;
    mintAddress: string;
    noteId: string;
    stateSignature: string;
  };
  output: {
    amountDisplay: string;
    asset: ShieldedSwapAssetKey;
    assetId: string;
    noteId: string;
  };
  transition: {
    noteId: string;
  };
  venue: {
    family: "Aggregator" | "DLMM";
    inputMintAddress?: string;
    name: string;
    network: "Mainnet";
    outputMintAddress?: string;
    poolAddress: string;
    quoteExpiresAt: number;
    quoteId: string;
    quoteTimestamp: number;
    routePlanHash?: string;
    routeProvider?: string;
    slippageBps?: number;
  };
};

type ActiveSwapQuote = SwapQuote | SolToShieldedRouteQuote;
const STALE_EXECUTION_QUOTE_MESSAGE =
  "The latest live quote expired, so the swap path is blocked until a fresh quote is available.";

function assertFreshExecutionQuote(freshQuote: ActiveSwapQuote) {
  if (freshQuote.quoteExpiresAt <= Date.now()) {
    throw new Error(STALE_EXECUTION_QUOTE_MESSAGE);
  }
}

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

function toAssetBaseUnits(value: number, asset: ShieldedSwapAssetKey) {
  if (asset === "SOL") {
    return Math.round(value * 1_000_000_000);
  }

  return Math.round(value * 10 ** getLiveShieldTokenAsset(asset).decimals);
}

function formatExactSwapInputAmount(value: number, asset: ShieldedSwapAssetKey) {
  const decimals = asset === "SOL" ? 9 : getLiveShieldTokenAsset(asset).decimals;

  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

function isLiveShieldTokenAssetKey(asset: ShieldedSwapAssetKey): asset is LiveShieldTokenAssetKey {
  return asset !== "SOL";
}

function formatReadyAssetOptionLabel(args: {
  balance: number;
  configured: boolean;
  label: string;
  symbol: ShieldedSwapAssetKey;
}) {
  return args.label;
}

export function SwapPage() {
  const swapTrustContract = useMemo(() => getSwapTrustContract(), []);
  const { walletAddress, walletConnected } = useWalletState();
  const walletSession = useWalletSession();
  const viewingKey = useVantaShieldViewingKey();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const shieldAssetRegistry = useVantaShieldAssetRegistryState();
  const shieldedSwapAssets = useMemo(() => listShieldedSwapAssetOptions(), []);
  const [amount, setAmount] = useState("");
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<ShieldedSwapAssetKey>("USDC");
  const [selectedTargetAsset, setSelectedTargetAsset] = useState<ShieldedSwapAssetKey>("SOL");
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ActiveSwapQuote | null>(null);
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
    venueFamily: "Aggregator" | "DLMM";
    venueName: string;
    venueNetwork: "Mainnet";
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
  const selectedTokenTargetEntry =
    selectedTargetAsset === "SOL" ? null : shieldAssetRegistry.byAssetKey[selectedTargetAsset];
  const shieldedSolSourceEntry =
    shieldAssetRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
    shieldAssetRegistry.entries.find((entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0) ??
    null;
  const shieldedSolSourceAccount = shieldedSolSourceEntry?.account ?? shieldAccount;
  const selectedSourceAccount =
    selectedSourceAsset === "SOL" ? shieldedSolSourceAccount : selectedTokenSourceEntry?.account ?? null;
  const getShieldedAssetBalance = useCallback((asset: ShieldedSwapAssetKey) => {
    if (asset === "SOL") {
      return shieldedSolSourceAccount?.shieldedSolBalance ?? 0;
    }

    return shieldAssetRegistry.byAssetKey[asset]?.account?.balance ?? 0;
  }, [
    shieldAssetRegistry.byAssetKey,
    shieldedSolSourceAccount?.shieldedSolBalance,
  ]);

  const readySourceAssetOptions = useMemo(
    () =>
      shieldedSwapAssets
        .map((asset, index) => {
          const balance = getShieldedAssetBalance(asset.symbol);

          return {
            ...asset,
            balance,
            index,
            ready: asset.configured && balance > 0,
          };
        })
        .sort((left, right) => {
          if (left.ready !== right.ready) {
            return left.ready ? -1 : 1;
          }

          if (left.configured !== right.configured) {
            return left.configured ? -1 : 1;
          }

          return left.index - right.index;
        }),
    [
      getShieldedAssetBalance,
      shieldedSwapAssets,
    ],
  );

  const preferredReadySourceAsset = useMemo(
    () =>
      readySourceAssetOptions.find((asset) => asset.ready) ?? null,
    [readySourceAssetOptions],
  );
  const availableSourceAssetOptions = useMemo(
    () => readySourceAssetOptions.filter((asset) => asset.ready),
    [readySourceAssetOptions],
  );

  useEffect(() => {
    if (!preferredReadySourceAsset) {
      return;
    }

    const selectedSourceOption = readySourceAssetOptions.find(
      (asset) => asset.symbol === selectedSourceAsset,
    );

    if (selectedSourceOption?.ready || selectedSourceAsset === preferredReadySourceAsset.symbol) {
      return;
    }

    setSelectedSourceAsset(preferredReadySourceAsset.symbol);
    setStatus("idle");
    setFlowError(null);
    setQuote(null);
    setQuoteError(null);

    if (selectedTargetAsset === preferredReadySourceAsset.symbol) {
      const nextTargetAsset = shieldedSwapAssets.find(
        (asset) => asset.symbol !== preferredReadySourceAsset.symbol,
      );

      if (nextTargetAsset) {
        setSelectedTargetAsset(nextTargetAsset.symbol);
      }
    }
  }, [
    preferredReadySourceAsset,
    readySourceAssetOptions,
    selectedSourceAsset,
    selectedTargetAsset,
    shieldedSwapAssets,
  ]);

  const spendableNotes = useMemo(() => {
    const baseSpendableNotes =
      selectedSourceAsset === "SOL"
        ? shieldedSolSourceAccount?.spendableShieldedSolNotes ?? []
        : selectedSourceAccount?.spendableShieldNotes ?? [];

    return baseSpendableNotes.filter((note) => {
      return note.noteId !== optimisticallyConsumedNoteId;
    });
  }, [
    optimisticallyConsumedNoteId,
    selectedSourceAccount?.spendableShieldNotes,
    selectedSourceAsset,
    shieldedSolSourceAccount?.spendableShieldedSolNotes,
  ]);

  useEffect(() => {
    if (!optimisticallyConsumedNoteId) {
      return;
    }

    const baseSpendableNotes =
      selectedSourceAsset === "SOL"
        ? shieldedSolSourceAccount?.spendableShieldedSolNotes ?? []
        : selectedSourceAccount?.spendableShieldNotes ?? [];

    if (!baseSpendableNotes.some((note) => note.noteId === optimisticallyConsumedNoteId)) {
      setOptimisticallyConsumedNoteId(null);
    }
  }, [
    optimisticallyConsumedNoteId,
    selectedSourceAccount?.spendableShieldNotes,
    selectedSourceAsset,
    shieldedSolSourceAccount?.spendableShieldedSolNotes,
  ]);

  const parsedAmount = Number(amount);
  const selectedShieldAssetKey: LiveShieldTokenAssetKey = isLiveShieldTokenAssetKey(
    selectedTargetAsset,
  )
    ? selectedTargetAsset
    : "USDC";
  const selectedShieldAsset = getLiveShieldTokenAsset(selectedShieldAssetKey);
  const sourceBalance =
    selectedSourceAsset === "SOL"
      ? shieldedSolSourceAccount?.shieldedSolBalance ?? 0
      : selectedSourceAccount?.balance ?? 0;
  const exactSpendableNote = useMemo(() => {
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return null;
    }

    const targetAmount = toAssetBaseUnits(parsedAmount, selectedSourceAsset);
    return (
      spendableNotes.find(
        (note) => toAssetBaseUnits(note.amount, selectedSourceAsset) === targetAmount,
      ) ?? null
    );
  }, [parsedAmount, selectedSourceAsset, spendableNotes]);
  const maxSwappableNote = useMemo(() => {
    return spendableNotes.reduce<VantaShieldNote | VantaShieldedSolNote | null>(
      (largestNote, note) => {
        if (!largestNote || note.amount > largestNote.amount) {
          return note;
        }

        return largestNote;
      },
      null,
    );
  }, [spendableNotes]);
  const maxAvailableAmount = maxSwappableNote?.amount ?? 0;
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
      const nextQuote =
        sourcePairCapability.executionMode === "operator-sol-to-shielded" &&
        selectedSourceAsset === "SOL" &&
        isLiveShieldTokenAssetKey(selectedTargetAsset)
          ? await fetchSolToShieldedRouteQuote({
              inputAmount: parsedAmount.toString(),
              outputAsset: selectedTargetAsset,
            })
          : await fetchSwapQuote(parsedAmount.toString());

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
    selectedSourceAsset,
    selectedTargetAsset,
    sourcePairCapability.executionMode,
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
      !lastSwapSummary ||
      (pendingSwapBridge.input.asset !== "SOL" && !walletSession?.signMessage) ||
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

    if (pendingSwapBridge.input.asset === "SOL" && pendingSwapBridge.output.asset !== "SOL") {
      void requestSolToShieldedRouteExecution({
        consumedNoteId: pendingSwapBridge.input.noteId,
        inputAmount: pendingSwapBridge.input.amountDisplay,
        inputMintAddress: pendingSwapBridge.venue.inputMintAddress ?? VANTA_NATIVE_SOL_ASSET_ID,
        outputAmount: pendingSwapBridge.output.amountDisplay,
        outputAsset: pendingSwapBridge.output.asset as Exclude<ShieldedSwapAssetKey, "SOL">,
        outputMintAddress: pendingSwapBridge.venue.outputMintAddress ?? pendingSwapBridge.output.assetId,
        outputNoteId: pendingSwapBridge.output.noteId,
        owner: pendingSwapBridge.owner,
        quoteExpiresAt: pendingSwapBridge.venue.quoteExpiresAt,
        quoteId: pendingSwapBridge.venue.quoteId,
        quoteTimestamp: pendingSwapBridge.venue.quoteTimestamp,
        requester: walletAddress,
        routePlanHash: pendingSwapBridge.venue.routePlanHash ?? "",
        routeProvider: pendingSwapBridge.venue.routeProvider ?? pendingSwapBridge.venue.name,
        slippageBps: pendingSwapBridge.venue.slippageBps ?? 0,
        transitionNoteId: pendingSpentMarker.transitionNoteId,
        transitionStateSignature: transitionSignature,
        vaultOwner: pendingSwapBridge.vaultOwner,
      })
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
                asset: pendingSpentMarker.asset,
                assetId: pendingSpentMarker.mintAddress,
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
              amount: pendingSwapBridge.input.amountDisplay,
              asset: pendingSwapBridge.input.asset,
              cluster: vantaSolanaCluster,
              explicitMainnetApproval: vantaExplicitMainnetApproval,
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
              : "The shielded SOL route adapter rejected the request.",
          );
          setPendingSwapBridge(null);
        });
      return;
    }

    const signMessage = walletSession?.signMessage;

    if (!signMessage) {
      setStatus("failed");
      setFlowError("The connected wallet must support message signing.");
      setOperatorAuthorizationStarted(false);
      return;
    }

    const payload = createSwapIntentPayload({
      consumedNoteId: pendingSwapBridge.input.noteId,
      inputAmount: pendingSwapBridge.input.amountDisplay,
      inputAsset: "USDC",
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
      venueFamily: "DLMM",
      venueName: "Meteora",
      venueNetwork: "Mainnet",
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
              asset: pendingSpentMarker.asset,
              assetId: pendingSpentMarker.mintAddress,
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
            amount: pendingSwapBridge.input.amountDisplay,
            asset: "USDC",
            cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
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
    viewingKey?.publicKey,
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
      .then(() => shieldedSolSourceEntry?.refresh?.())
      .then(() => selectedTokenTargetEntry?.refresh?.())
      .then(async () => {
        if (swapTransaction.signature && pendingSwapBridge?.input.asset === "USDC") {
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
    pendingSwapBridge,
    refreshShieldState,
    shieldedSolSourceEntry,
    selectedTokenTargetEntry,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    swapTransaction.signature,
  ]);

  useEffect(() => {
    if (status !== "finalizing_state" || !pendingSpentMarker || !lastSwapSummary) {
      return;
    }

    const refreshCurrentSwapState = async () => {
      await refreshShieldState();
      await shieldedSolSourceEntry?.refresh?.();
      await selectedTokenTargetEntry?.refresh?.();
    };

    void refreshCurrentSwapState().catch(() => {
      // Ignore transient refresh errors during finalization fallback polling.
    });

    const refreshInterval = window.setInterval(() => {
      void refreshCurrentSwapState().catch(() => {
        // Ignore transient refresh errors during finalization fallback polling.
      });
    }, 1500);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [
    lastSwapSummary,
    pendingSpentMarker,
    refreshShieldState,
    shieldedSolSourceEntry,
    selectedTokenTargetEntry,
    status,
  ]);

  useEffect(() => {
    const sourceResolutionAccount =
      pendingSpentMarker && pendingSpentMarker.asset === "SOL"
        ? shieldedSolSourceAccount
        : shieldAccount;
    const solResolutionAccount = shieldedSolSourceAccount ?? shieldAccount;

    if (
      status !== "finalizing_state" ||
      !sourceResolutionAccount ||
      !solResolutionAccount ||
      !pendingSpentMarker ||
      !lastSwapSummary
    ) {
      return;
    }

    const inputResolved =
      pendingSpentMarker.asset === "SOL"
        ? !sourceResolutionAccount.spendableShieldedSolNotes.some(
            (note) => note.noteId === pendingSpentMarker.consumedNoteId,
          )
        : !sourceResolutionAccount.spendableShieldNotes.some(
            (note) => note.noteId === pendingSpentMarker.consumedNoteId,
          );
    const outputResolved =
      selectedTargetAsset === "SOL"
        ? solResolutionAccount.shieldedSolNotes.some(
            (note) => note.noteId === lastSwapSummary.outputNoteId,
          )
        : Boolean(
            selectedTokenTargetEntry?.account?.shieldNotes.some(
              (note) => note.noteId === lastSwapSummary.outputNoteId,
            ),
          );

    if (!inputResolved || !outputResolved) {
      return;
    }

    void (async () => {
      if (swapTransaction.signature && pendingSwapBridge?.input.asset === "USDC") {
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
    pendingSwapBridge,
    selectedTargetAsset,
    selectedTokenTargetEntry?.account?.shieldNotes,
    shieldAccount,
    shieldedSolSourceAccount,
    spentMarkerTransaction.signature,
    status,
    swapTransaction.signature,
  ]);

  const expectedOutputAmount =
    sourcePairCapability.status === "live" ? Number(quote?.outputAmount ?? "0") : 0;
  const isQuoteFresh = quote ? Date.now() <= quote.quoteExpiresAt : true;
  const usesLegacyUsdcSolOperator =
    sourcePairCapability.executionMode === "operator-usdc-sol";
  const isLaneHealthy =
    requiresPrivateSwap && usesLegacyUsdcSolOperator ? laneHealth?.status === "healthy" : true;
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
    (!requiresPrivateSwap || !usesLegacyUsdcSolOperator || Boolean(walletSession?.signMessage)) &&
    Boolean(selectedShieldAsset.mintAddress) &&
    Boolean(selectedShieldAsset.vaultOwner) &&
    (!requiresPrivateSwap || !usesLegacyUsdcSolOperator || liveSwapPair.configured) &&
    canUseExistingNote;
  const routeLabel = (() => {
    if (sourcePairCapability.blockers.length > 0) {
      return sourcePairCapability.blockers[0];
    }

    if (!isAmountValid) {
      return "Enter a valid amount to continue.";
    }

    if (canUseExistingNote) {
      return `Ready to route shielded ${selectedSourceAsset} through the selected beta lane.`;
    }

    return `Shield the exact ${selectedSourceAsset} amount first, then return here to swap.`;
  })();
  const routeTruthLabel = sourcePairCapability.userFacingRouteTruth;

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
      const canonicalRecord = await recordCanonicalSwapFromLiveSwap(
        {
          createdAt: pendingSwapBridge.createdAt,
          owner: pendingSwapBridge.owner,
          vaultOwner: pendingSwapBridge.vaultOwner,
          input: {
            asset: "USDC",
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
            family: "DLMM",
            name: "Meteora",
            network: "Mainnet",
            poolAddress: pendingSwapBridge.venue.poolAddress,
            quoteId: pendingSwapBridge.venue.quoteId,
            quoteTimestamp: pendingSwapBridge.venue.quoteTimestamp,
            quoteExpiresAt: pendingSwapBridge.venue.quoteExpiresAt,
          },
        },
        { persist: false },
      );
      const committedSettlementTerms =
        await createCommittedSwapSettlementTerms(canonicalRecord);
      const settlementReceipt = await requestVantaPrivatePoolV2ProtocolSettlement({
        action: "swap",
        economicsMode: "committed-economics",
        ...committedSettlementTerms,
      });
      if (settlementReceipt?.proofReceipt?.intent !== "swap-to-shielded") {
        throw new Error("Committed Swap settlement did not return a swap-to-shielded proof receipt.");
      }
      persistCanonicalSwapRecord(canonicalRecord);
      setSwapBridgeError(null);
    } catch (error) {
      setSwapBridgeError(
        error instanceof Error
          ? error.message
          : "Swap completed, but the committed swap-to-shielded proof receipt could not be registered.",
      );
      throw error;
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
    if (!viewingKey?.publicKey) {
      throw new Error("Vanta action memo encryption requires your Shield viewing key to be ready.");
    }
    const preparedSwap = createPreparedSwapMemo(
      {
        consumedNoteId: args.note.noteId,
        createdAt,
        inputAmount: args.note.amount.toString(),
        inputAsset: "USDC",
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
        venuePoolAddress: args.swapQuote.venuePoolAddress ?? undefined,
        vaultOwner: args.shieldAccountState.vaultOwner,
      },
      { viewingPublicKey: viewingKey?.publicKey },
    );

    setPendingSpentMarker({
      asset: "USDC",
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
        asset: "USDC",
        amountDisplay: args.note.amount.toFixed(2),
        mintAddress: liveShieldAsset.mintAddress!,
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      output: {
        asset: "SOL",
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
      venuePoolAddress: args.swapQuote.venuePoolAddress ?? undefined,
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
      asset: "USDC",
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
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

  async function performLiveSolToShieldedSwapFromNote(args: {
    note: VantaShieldedSolNote;
    shieldAccountState: VantaShieldAccountState;
    swapQuote: SolToShieldedRouteQuote;
  }) {
    if (!isLiveShieldTokenAssetKey(args.swapQuote.outputAsset)) {
      throw new Error("Shielded SOL route output must be a configured shielded asset.");
    }

    const targetAsset = getLiveShieldTokenAsset(args.swapQuote.outputAsset);

    if (!targetAsset.mintAddress || !targetAsset.vaultOwner) {
      throw new Error(`Shielded ${args.swapQuote.outputAsset} is not configured yet.`);
    }

    swapTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    setSwapBridgeError(null);
    setOperatorAuthorizationStarted(false);
    setPendingSwapBridge(null);
    setStatus("awaiting_confirmation");

    const createdAt = Date.now();
    if (!viewingKey?.publicKey) {
      throw new Error("Vanta action memo encryption requires your Shield viewing key to be ready.");
    }
    const preparedSwap = createPreparedSwapMemo(
      {
        consumedNoteId: args.note.noteId,
        createdAt,
        inputAmount: args.note.amount.toString(),
        inputAsset: "SOL",
        mintAddress: VANTA_NATIVE_SOL_ASSET_ID,
        outputAmount: args.swapQuote.outputAmount,
        outputAsset: args.swapQuote.outputAsset,
        owner: args.shieldAccountState.owner,
        quoteExpiresAt: args.swapQuote.quoteExpiresAt,
        quoteId: args.swapQuote.quoteId,
        quoteTimestamp: args.swapQuote.quoteTimestamp,
        venueFamily: args.swapQuote.venueFamily,
        venueName: args.swapQuote.venueName,
        venueNetwork: args.swapQuote.venueNetwork,
        venuePoolAddress: args.swapQuote.venuePoolAddress ?? undefined,
        vaultOwner: args.shieldAccountState.vaultOwner,
      },
      { viewingPublicKey: viewingKey?.publicKey },
    );

    setPendingSpentMarker({
      asset: "SOL",
      consumedNoteId: args.note.noteId,
      createdAt,
      mintAddress: VANTA_NATIVE_SOL_ASSET_ID,
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
        asset: "SOL",
        amountDisplay: args.note.amount.toFixed(9),
        mintAddress: VANTA_NATIVE_SOL_ASSET_ID,
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      output: {
        amountDisplay: args.swapQuote.outputAmount,
        asset: args.swapQuote.outputAsset,
        assetId: targetAsset.mintAddress,
        noteId: preparedSwap.outputNoteId,
      },
      transition: {
        noteId: preparedSwap.noteId,
      },
      venue: {
        family: args.swapQuote.venueFamily,
        inputMintAddress: args.swapQuote.inputMintAddress,
        name: args.swapQuote.venueName,
        network: args.swapQuote.venueNetwork,
        outputMintAddress: args.swapQuote.outputMintAddress,
        poolAddress: args.swapQuote.venuePoolAddress ?? "",
        quoteId: args.swapQuote.quoteId,
        quoteTimestamp: args.swapQuote.quoteTimestamp,
        quoteExpiresAt: args.swapQuote.quoteExpiresAt,
        routePlanHash: args.swapQuote.routePlanHash,
        routeProvider: args.swapQuote.routeProvider,
        slippageBps: args.swapQuote.slippageBps,
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
      venuePoolAddress: args.swapQuote.venuePoolAddress ?? "",
    });

    const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
      accountKeys: [
        args.note.noteId,
        VANTA_NATIVE_SOL_ASSET_ID,
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
      asset: "SOL",
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
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
      selectedSourceAccount &&
      exactSpendableNote &&
      sourcePairCapability.executionMode === "operator-usdc-sol"
    ) {
      const freshQuote =
        quote && isQuoteFresh ? (quote as SwapQuote) : await fetchSwapQuote(parsedAmount.toString());
      assertFreshExecutionQuote(freshQuote);
      setQuote(freshQuote);

      try {
        await performLiveSwapFromNote({
          note: exactSpendableNote as VantaShieldNote,
          shieldAccountState: selectedSourceAccount,
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

    if (
      canUseExistingNote &&
      selectedSourceAccount &&
      exactSpendableNote &&
      sourcePairCapability.executionMode === "operator-sol-to-shielded" &&
      selectedSourceAsset === "SOL" &&
      isLiveShieldTokenAssetKey(selectedTargetAsset)
    ) {
      const freshQuote =
        quote && isQuoteFresh
          ? (quote as SolToShieldedRouteQuote)
          : await fetchSolToShieldedRouteQuote({
              inputAmount: parsedAmount.toString(),
              outputAsset: selectedTargetAsset,
            });
      assertFreshExecutionQuote(freshQuote);
      setQuote(freshQuote);

      try {
        await performLiveSolToShieldedSwapFromNote({
          note: exactSpendableNote as VantaShieldedSolNote,
          shieldAccountState: selectedSourceAccount,
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
      "This shielded pair needs a route adapter with committed settlement evidence before it can execute.";
  } else if (!selectedShieldAsset.configured) {
    validationMessage = `Shielded ${selectedSourceAsset} is not configured yet.`;
  } else if (requiresPrivateSwap && usesLegacyUsdcSolOperator && !liveSwapPair.configured) {
    validationMessage = "This swap route is not ready yet.";
  } else if ((requiresPrivateSwap || selectedShieldAssetKey === "USDC") && shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta state.";
  } else if ((requiresPrivateSwap || selectedShieldAssetKey === "USDC") && shieldStateError) {
    validationMessage = shieldStateError;
  } else if (requiresPrivateSwap && usesLegacyUsdcSolOperator && !walletSession?.signMessage) {
    validationMessage = "The connected wallet must support message signing.";
  } else if (requiresPrivateSwap && usesLegacyUsdcSolOperator && laneHealth && laneHealth.status !== "healthy") {
    validationMessage = laneHealth.message;
  } else if (requiresPrivateSwap && usesLegacyUsdcSolOperator && laneHealthError) {
    validationMessage = laneHealthError;
  } else if (!isAmountValid) {
    validationMessage = `Enter a valid shielded ${selectedSourceAsset} amount.`;
  } else if (parsedAmount > sourceBalance) {
    validationMessage = `Insufficient shielded ${selectedSourceAsset} balance.`;
  } else if (spendableNotes.length === 0) {
    validationMessage = `No spendable shielded ${selectedSourceAsset} note is ready yet. If you just shielded, refresh state and try again.`;
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
          <span className="eyebrow product-intro__eyebrow">Operator-visible swap beta</span>
          <h2>Swap</h2>
          <p>{swapTrustContract.visibleStatusCopy}</p>
        </div>

        <div className="module-state">
          <strong>{swapTrustContract.currentTruth}</strong>
          <p>
            {swapTrustContract.claimControls.productionPrivacyClaimsLocked
              ? swapTrustContract.visibleStatusCopy
              : "Production Swap privacy claims are unlocked by current evidence."}
          </p>
        </div>
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Choose trade</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>You send</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Shielded balance: {sourceBalanceLabel}
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

                        setAmount(formatExactSwapInputAmount(maxAvailableAmount, selectedSourceAsset));
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
                      value={
                        availableSourceAssetOptions.some((asset) => asset.symbol === selectedSourceAsset)
                          ? selectedSourceAsset
                          : ""
                      }
                      disabled={availableSourceAssetOptions.length === 0}
                      onChange={(event) => {
                        setSelectedSourceAsset(event.target.value as ShieldedSwapAssetKey);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      {availableSourceAssetOptions.length === 0 && (
                        <option value="">No shielded assets ready</option>
                      )}
                      {availableSourceAssetOptions.map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {formatReadyAssetOptionLabel({
                            balance: asset.balance,
                            configured: asset.configured,
                            label: asset.label,
                            symbol: asset.symbol,
                          })}
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
                      ? "Getting best available quote..."
                      : formatAssetAmount(expectedOutputAmount, selectedTargetAsset)}
                  </strong>
                  <span>{`Shielded ${selectedTargetAsset}`}</span>
                </div>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
              <p className="shield-helper shield-helper--meta">{routeTruthLabel}</p>
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
                  {isBetaMode ? "Beta mode" : sourcePairCapability.actionLabel}
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
                        ? "Authorizing swap"
                        : status === "finalizing_state"
                          ? "Finalizing beta route evidence"
                          : status === "complete"
                            ? "Swap recorded"
                            : "Swap failed"}
                </span>
                <p>
                  {status === "complete" && selectedTargetAsset === "SOL" && lastSwapSummary
                    ? `Recorded ${formatAssetAmount(lastSwapSummary.inputAmount, "USDC")} into ${formatAssetAmount(lastSwapSummary.outputAmount, "SOL")} with committed receipt checks and operator-visible settlement.`
                    : status === "complete"
                      ? `Recorded ${formatAssetAmount(parsedAmount, selectedSourceAsset)} into shielded ${selectedTargetAsset}; route settlement remains operator-visible.`
                    : status === "failed"
                      ? flowError ?? "The swap could not be completed."
                      : status === "authorizing_operator"
                        ? "Authorizing the operator-visible route settlement."
                      : status === "finalizing_state"
                          ? `Registering spent-marker and committed receipt evidence for shielded ${selectedTargetAsset}.`
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
