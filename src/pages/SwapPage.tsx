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
import { useVantaShieldOwnerContext } from "@/solana/useVantaShieldOwnerContext";
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
  listCanonicalSwapRecords,
  persistCanonicalSwapRecord,
  recordCanonicalSwapFromLiveSwap,
  type LiveSwapCanonicalRecord,
} from "@/zk/liveSwapBridge";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import { signWalletMessageIntentWithSafety } from "@/wallet/walletMessageIntentSafety.mjs";
import type { CanonicalNoteOwnerContext } from "@/zk/canonicalNote";
import type { AssetPickerGridOption } from "@/components/AssetPickerGrid";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { QuoteCountdownBar, type QuoteCountdownBarTone } from "@/components/QuoteCountdownBar";
import { SwapAdvancedPanel } from "@/components/SwapAdvancedPanel";
import { SwapReceiptModal, type SwapReceiptModalDetails } from "@/components/SwapReceiptModal";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import {
  PrivacySummary,
  type PrivacySummaryItem,
} from "@/components/PrivacySummary";
import type { NotePickerOption } from "@/components/NotePicker";

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
  ownerContext: CanonicalNoteOwnerContext;
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

type SwapReceiptSummary = {
  createdAt?: number;
  inputAsset: ShieldedSwapAssetKey;
  inputAmount: number;
  outputAsset: ShieldedSwapAssetKey;
  outputAmount: number;
  outputNoteId: string;
  quoteExpiresAt: number;
  quoteId: string;
  quoteTimestamp: number;
  recordId?: string;
  requestId?: string;
  storageScope?: "browser-local" | "local-session";
  transitionNoteId: string;
  venueFamily: "Aggregator" | "DLMM";
  venueName: string;
  venueNetwork: "Mainnet";
  venuePoolAddress: string;
};

function parseSwapReceiptAmountDisplay(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSwapReceiptSummaryKey(summary: SwapReceiptSummary) {
  return summary.recordId ?? `${summary.transitionNoteId}:${summary.outputNoteId}`;
}

function createSwapReceiptDedupeKey(summary: SwapReceiptSummary) {
  return `${summary.transitionNoteId}:${summary.outputNoteId}:${summary.quoteId}`;
}

function swapReceiptSummaryFromCanonicalRecord(
  record: LiveSwapCanonicalRecord,
): SwapReceiptSummary {
  return {
    createdAt: record.createdAt,
    inputAsset: record.liveSwap.inputAsset,
    inputAmount: parseSwapReceiptAmountDisplay(record.liveSwap.inputAmountDisplay),
    outputAsset: record.liveSwap.outputAsset,
    outputAmount: parseSwapReceiptAmountDisplay(record.liveSwap.outputAmountDisplay),
    outputNoteId: record.liveSwap.outputNoteId,
    quoteExpiresAt: record.liveSwap.quoteExpiresAt,
    quoteId: record.liveSwap.quoteId,
    quoteTimestamp: record.liveSwap.quoteTimestamp,
    recordId: record.recordId,
    requestId: record.liveSwap.operatorRequestId,
    storageScope: "browser-local",
    transitionNoteId: record.liveSwap.transitionNoteId,
    venueFamily: record.liveSwap.venueFamily,
    venueName: record.liveSwap.venueName,
    venueNetwork: record.liveSwap.venueNetwork,
    venuePoolAddress: record.liveSwap.venuePoolAddress,
  };
}

function mergeRecentSwapReceiptSummaries(
  summaries: readonly SwapReceiptSummary[],
): SwapReceiptSummary[] {
  const seen = new Set<string>();
  return summaries
    .filter((summary) => {
      const key = createSwapReceiptDedupeKey(summary);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
    .slice(0, 5);
}

function buildRecentSwapReceiptSummaries(): SwapReceiptSummary[] {
  return mergeRecentSwapReceiptSummaries(
    listCanonicalSwapRecords().map(swapReceiptSummaryFromCanonicalRecord),
  );
}

type ActiveSwapQuote = SwapQuote | SolToShieldedRouteQuote;
const STALE_EXECUTION_QUOTE_MESSAGE =
  "The latest live quote expired, so the swap path is blocked until a fresh quote is available.";
const SWAP_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a transaction happened plus encrypted swap memo packets",
  },
  {
    label: "Venue sees",
    value: "operator-visible route settlement terms; Swap production privacy is not enabled",
  },
  {
    label: "You see",
    value: "a shielded output note after settlement finalizes",
  },
];

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

function formatShortSwapId(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatSwapSlippage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Route adapter default";
  }

  return `${(value / 100).toFixed(2).replace(/\.?0+$/, "")}% max`;
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
  const shieldOwnerContext = useVantaShieldOwnerContext();
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
  const [quoteClockMs, setQuoteClockMs] = useState(() => Date.now());
  const [autoRefreshingQuoteId, setAutoRefreshingQuoteId] = useState<string | null>(null);
  const [selectedSwapNoteId, setSelectedSwapNoteId] = useState<string | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingSwapBridge, setPendingSwapBridge] = useState<PendingSwapBridge | null>(null);
  const [swapBridgeError, setSwapBridgeError] = useState<string | null>(null);
  const [operatorAuthorizationStarted, setOperatorAuthorizationStarted] = useState(false);
  const [swapReceiptModalOpen, setSwapReceiptModalOpen] = useState(false);
  const [optimisticallyConsumedNoteId, setOptimisticallyConsumedNoteId] = useState<string | null>(
    null,
  );
  const [lastSwapSummary, setLastSwapSummary] = useState<SwapReceiptSummary | null>(null);
  const [recentSwapSummaries, setRecentSwapSummaries] = useState<SwapReceiptSummary[]>(
    () => buildRecentSwapReceiptSummaries(),
  );
  const [selectedSwapReceiptKey, setSelectedSwapReceiptKey] = useState<string | null>(null);
  const swapTransaction = useVantaSafeSendTransaction();
  const swapWait = useRealtimeSignatureProgress(swapTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !swapTransaction.signature,
  });
  const spentMarkerTransaction = useVantaSafeSendTransaction();

  useEffect(() => {
    if (status !== "complete") {
      setSwapReceiptModalOpen(false);
    }
  }, [status]);
  useEffect(() => {
    if (status === "complete" && lastSwapSummary) {
      const summaryKey = createSwapReceiptSummaryKey(lastSwapSummary);
      setRecentSwapSummaries((currentSummaries) =>
        mergeRecentSwapReceiptSummaries([
          lastSwapSummary,
          ...buildRecentSwapReceiptSummaries(),
          ...currentSummaries,
        ]),
      );
      setSelectedSwapReceiptKey(summaryKey);
    }
  }, [lastSwapSummary, status]);
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
  const swapSourceAssetPickerOptions = useMemo<AssetPickerGridOption[]>(
    () =>
      availableSourceAssetOptions.map((asset) => ({
        balanceLabel: formatAssetAmount(asset.balance, asset.symbol),
        id: asset.symbol,
        label: formatReadyAssetOptionLabel({
          balance: asset.balance,
          configured: asset.configured,
          label: asset.label,
          symbol: asset.symbol,
        }),
        name: asset.name,
        statusLabel: "Ready",
        symbol: asset.symbol,
      })),
    [availableSourceAssetOptions],
  );
  const swapTargetAssetPickerOptions = useMemo<AssetPickerGridOption[]>(
    () =>
      shieldedSwapAssets.map((asset) => {
        const pairCapability = getShieldedSwapPairCapability({
          inputAsset: selectedSourceAsset,
          outputAsset: asset.symbol,
        });
        const disabled = pairCapability.status !== "live";

        return {
          disabled,
          disabledReason: disabled ? pairCapability.blockers[0] ?? "Route unavailable" : undefined,
          id: asset.symbol,
          label: asset.label,
          name: asset.name,
          statusLabel: disabled ? "Unavailable" : "Ready",
          symbol: asset.symbol,
        };
      }),
    [selectedSourceAsset, shieldedSwapAssets],
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
    if (!selectedSwapNoteId) {
      return;
    }

    if (!spendableNotes.some((note) => note.noteId === selectedSwapNoteId)) {
      setSelectedSwapNoteId(null);
    }
  }, [selectedSwapNoteId, spendableNotes]);

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
    const exactNotes = spendableNotes.filter(
      (note) => toAssetBaseUnits(note.amount, selectedSourceAsset) === targetAmount,
    );

    if (selectedSwapNoteId) {
      return (
        exactNotes.find((note) => note.noteId === selectedSwapNoteId) ??
        exactNotes[0] ??
        null
      );
    }

    return exactNotes[0] ?? null;
  }, [parsedAmount, selectedSourceAsset, selectedSwapNoteId, spendableNotes]);
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
  const swapNotePickerOptions = useMemo<NotePickerOption[]>(
    () =>
      spendableNotes.map((note) => ({
        id: note.noteId,
        metaLabel: "Exact-note source candidate",
        primaryLabel: formatAssetAmount(note.amount, selectedSourceAsset),
        secondaryLabel: formatShortSwapId(note.noteId),
      })),
    [selectedSourceAsset, spendableNotes],
  );
  const handleSelectSwapNote = useCallback(
    (nextNoteId: string | null) => {
      if (!nextNoteId) {
        setSelectedSwapNoteId(null);
        return;
      }

      const nextNote = spendableNotes.find((note) => note.noteId === nextNoteId);

      if (!nextNote) {
        setSelectedSwapNoteId(null);
        return;
      }

      setSelectedSwapNoteId(nextNote.noteId);
      setAmount(formatExactSwapInputAmount(nextNote.amount, selectedSourceAsset));
      setStatus("idle");
      setFlowError(null);
      setQuote(null);
      setQuoteError(null);
    },
    [selectedSourceAsset, spendableNotes],
  );
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
  const isQuoteFresh = quote ? quoteClockMs <= quote.quoteExpiresAt : true;
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

  useEffect(() => {
    if (!quote) {
      setAutoRefreshingQuoteId(null);
      return;
    }

    setQuoteClockMs(Date.now());
    const quoteClock = window.setInterval(() => {
      setQuoteClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(quoteClock);
    };
  }, [quote]);

  useEffect(() => {
    if (!quote) {
      return;
    }

    if (quote.quoteExpiresAt > quoteClockMs) {
      if (autoRefreshingQuoteId === quote.quoteId) {
        setAutoRefreshingQuoteId(null);
      }
      return;
    }

    if (
      autoRefreshingQuoteId === quote.quoteId ||
      !walletConnected ||
      !isAmountValid ||
      sourcePairCapability.status !== "live" ||
      status === "quoting"
    ) {
      return;
    }

    setAutoRefreshingQuoteId(quote.quoteId);
    setQuoteRefreshNonce((currentNonce) => currentNonce + 1);
  }, [
    autoRefreshingQuoteId,
    isAmountValid,
    quote,
    quoteClockMs,
    sourcePairCapability.status,
    status,
    walletConnected,
  ]);
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
          ownerContext: pendingSwapBridge.ownerContext,
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
      const canonicalSummary = swapReceiptSummaryFromCanonicalRecord(canonicalRecord);
      setRecentSwapSummaries((currentSummaries) =>
        mergeRecentSwapReceiptSummaries([
          canonicalSummary,
          ...buildRecentSwapReceiptSummaries(),
          ...currentSummaries,
        ]),
      );
      setSelectedSwapReceiptKey(createSwapReceiptSummaryKey(canonicalSummary));
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
    const ownerContext = await shieldOwnerContext.ensureOwnerContext();
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
      ownerContext,
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
      createdAt,
      inputAsset: "USDC",
      inputAmount: args.note.amount,
      outputAsset: "SOL",
      outputAmount: Number(args.swapQuote.outputAmount),
      outputNoteId: preparedSwap.outputNoteId,
      quoteExpiresAt: args.swapQuote.quoteExpiresAt,
      quoteId: args.swapQuote.quoteId,
      quoteTimestamp: args.swapQuote.quoteTimestamp,
      storageScope: "local-session",
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
    const ownerContext = await shieldOwnerContext.ensureOwnerContext();
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
      ownerContext,
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
      createdAt,
      inputAsset: "SOL",
      inputAmount: args.note.amount,
      outputAsset: args.swapQuote.outputAsset,
      outputAmount: Number(args.swapQuote.outputAmount),
      outputNoteId: preparedSwap.outputNoteId,
      quoteExpiresAt: args.swapQuote.quoteExpiresAt,
      quoteId: args.swapQuote.quoteId,
      quoteTimestamp: args.swapQuote.quoteTimestamp,
      storageScope: "local-session",
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

  let validationMessage = "Enter amount to swap & receive receipt.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to swap.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode — Swap is visible but live routes are paused.";
  } else if (sourcePairCapability.status !== "live") {
    validationMessage =
      sourcePairCapability.blockers[0] ??
      "This pair has no live route adapter yet.";
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
  const quoteTotalMs = quote
    ? Math.max(quote.quoteExpiresAt - quote.quoteTimestamp, 1)
    : 1;
  const quoteRemainingMs = quote
    ? Math.max(quote.quoteExpiresAt - quoteClockMs, 0)
    : 0;
  const quoteRemainingSeconds = Math.ceil(quoteRemainingMs / 1000);
  const quoteProgressPercent = quote
    ? Math.max(0, Math.min(100, Math.round((quoteRemainingMs / quoteTotalMs) * 100)))
    : 0;
  const quoteProgressTone: QuoteCountdownBarTone =
    quote && quoteRemainingSeconds <= 0
      ? "refreshing"
      : quote && quoteProgressPercent <= 24
        ? "warning"
        : "fresh";
  const quoteStatusLabel = quote
    ? quoteRemainingSeconds > 0
      ? `Quote refreshes in ${quoteRemainingSeconds}s`
      : "Refreshing quote"
    : status === "quoting"
      ? "Fetching quote"
      : "Quote appears after amount";
  const quoteVenueLabel = quote
    ? `${quote.venueName} ${quote.venueFamily}`
    : sourcePairCapability.status === "live"
      ? "Live route adapter"
      : "Route unavailable";
  const selectedSwapNoteLabel = exactSpendableNote
    ? `${formatAssetAmount(exactSpendableNote.amount, selectedSourceAsset)} note · ${formatShortSwapId(exactSpendableNote.noteId)}`
    : spendableNotes.length > 0
      ? "Choose a note or enter an exact note amount"
      : `No spendable shielded ${selectedSourceAsset} note ready`;
  const quoteSlippageBps =
    quote && "slippageBps" in quote ? quote.slippageBps : null;
  const swapPrimaryActionLabel = isBetaMode
    ? "Beta mode"
    : isReady
      ? `Swap ${formatAssetAmount(parsedAmount, selectedSourceAsset)} for ${formatAssetAmount(
          expectedOutputAmount,
          selectedTargetAsset,
        )}`
      : sourcePairCapability.actionLabel;
  const swapFlowActiveIndex =
    status === "complete"
      ? 3
      : status === "awaiting_confirmation" ||
          status === "recording_transition" ||
          status === "authorizing_operator" ||
          status === "finalizing_state"
        ? 2
        : status === "quoting" || Boolean(quote)
          ? 1
          : 0;
  const selectedRecentSwapSummary =
    recentSwapSummaries.find(
      (summary) => createSwapReceiptSummaryKey(summary) === selectedSwapReceiptKey,
    ) ??
    recentSwapSummaries[0] ??
    null;
  const swapReceiptSource =
    selectedRecentSwapSummary ?? (status === "complete" ? lastSwapSummary : null);
  const swapReceiptDetails: SwapReceiptModalDetails | null = swapReceiptSource
    ? {
        bridgeWarning: swapBridgeError ?? undefined,
        inputLabel: formatAssetAmount(swapReceiptSource.inputAmount, swapReceiptSource.inputAsset),
        outputLabel: formatAssetAmount(swapReceiptSource.outputAmount, swapReceiptSource.outputAsset),
        outputNoteId: formatShortSwapId(swapReceiptSource.outputNoteId),
        quoteExpiresLabel: formatQuoteTimestamp(swapReceiptSource.quoteExpiresAt),
        quoteId: formatShortSwapId(swapReceiptSource.quoteId),
        quoteIssuedLabel: formatQuoteTimestamp(swapReceiptSource.quoteTimestamp),
        requestId: swapReceiptSource.requestId
          ? formatShortSwapId(swapReceiptSource.requestId)
          : "Pending operator request",
        routeTruthLabel,
        transitionNoteId: formatShortSwapId(swapReceiptSource.transitionNoteId),
        venueLabel: `${swapReceiptSource.venueName} ${swapReceiptSource.venueFamily}`,
        venuePoolAddress: swapReceiptSource.venuePoolAddress
          ? formatShortSwapId(swapReceiptSource.venuePoolAddress)
          : "Route adapter default",
      }
    : null;

  return (
    <section className="send-page swap-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Guarded beta</span>
          <h2>Swap</h2>
          <p>Swap inside your private balance.</p>
        </div>

        <div
          className="module-state"
          data-production-privacy-claims-locked={
            swapTrustContract.claimControls.productionPrivacyClaimsLocked
          }
        >
          <strong>Beta — routes are constrained</strong>
          <details>
            <summary>Technical status</summary>
            <p>Current truth: {swapTrustContract.currentTruth}.</p>
            <p>{swapTrustContract.visibleStatusCopy}</p>
          </details>
        </div>
      </div>

      <LaneFlowIndicator
        ariaLabel="Swap flow"
        activeStepIndex={swapFlowActiveIndex}
        steps={[
          { id: "choose-trade", label: "Choose trade" },
          { id: "quote", label: "Quote" },
          { id: "settle", label: "Settle" },
          { id: "receive-note", label: "Receive note" },
        ]}
      />

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Choose trade</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <QuoteCountdownBar
                label={quoteStatusLabel}
                progressPercent={quoteProgressPercent}
                tone={quoteProgressTone}
              />

              <div className="swap-route-card" aria-label="Swap route">
                <div className="swap-route-card__row">
                  <div className="swap-choice-group" role="group" aria-label="From shielded asset">
                    <span>From (shielded)</span>
                    <select
                      className="swap-asset-select"
                      value={selectedSourceAsset}
                      onChange={(event) => {
                        const next = event.target.value as ShieldedSwapAssetKey;
                        setSelectedSourceAsset(next);
                        setSelectedSwapNoteId(null);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      {swapSourceAssetPickerOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.symbol} — {opt.label} (Balance: {opt.balanceLabel ?? "0"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="swap-choice-group swap-amount-group" role="group" aria-label="Amount to swap">
                    <span>Amount</span>
                    <div className="swap-amount-controls">
                      <input
                        id="swap-amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value);
                          setSelectedSwapNoteId(null);
                          setStatus("idle");
                          setFlowError(null);
                          setQuote(null);
                          setQuoteError(null);
                        }}
                        placeholder="0.00"
                      />
                      <button
                        className="button button-ghost swap-max-btn"
                        type="button"
                        disabled={maxAvailableAmount <= 0}
                        onClick={() => {
                          if (maxAvailableAmount <= 0 || !maxSwappableNote) {
                            return;
                          }
                          setSelectedSwapNoteId(maxSwappableNote.noteId);
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

                <div className="swap-route-card__connector" aria-hidden="true">
                  to
                </div>

                <div className="swap-route-card__row">
                  <div className="swap-choice-group" role="group" aria-label="To shielded asset">
                    <span>To</span>
                    <select
                      className="swap-asset-select"
                      value={selectedTargetAsset}
                      onChange={(event) => {
                        const next = event.target.value as ShieldedSwapAssetKey;
                        setSelectedTargetAsset(next);
                        setStatus("idle");
                        setFlowError(null);
                        setQuote(null);
                        setQuoteError(null);
                      }}
                    >
                      {swapTargetAssetPickerOptions.map((opt) => (
                        <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                          {opt.symbol} — {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="swap-choice-group swap-quote-group" role="group" aria-label="Expected output">
                    <span>You receive</span>
                    <div className="swap-quote-value">
                      <strong>
                        {status === "quoting"
                          ? "Getting best quote..."
                          : formatAssetAmount(expectedOutputAmount, selectedTargetAsset)}
                      </strong>
                      <span>{`Shielded ${selectedTargetAsset}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="swap-route-summary">
                <strong>{`${selectedSourceAsset} -> ${selectedTargetAsset} via ${quoteVenueLabel}`}</strong>
                <span>{quoteStatusLabel}</span>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
              <p className="shield-helper shield-helper--meta">{routeTruthLabel}</p>
              <p className="shield-helper">{validationMessage}</p>

              <PrivacySummary
                items={SWAP_PRIVACY_SUMMARY_ITEMS}
                note="Swap production privacy is locked until route adapters, verifier-backed settlement, audit, and operator gates pass."
              />

              <SwapAdvancedPanel
                maxSlippageLabel={formatSwapSlippage(quoteSlippageBps)}
                notePickerOptions={swapNotePickerOptions}
                noteSelectionLabel={selectedSwapNoteLabel}
                onSelectNote={handleSelectSwapNote}
                routeTruthLabel={routeTruthLabel}
                selectedNoteId={selectedSwapNoteId}
                sourceAssetLabel={selectedSourceAsset}
                venueLabel={quoteVenueLabel}
              />

              <section
                className="swap-recent-swaps"
                data-vanta-swap-recent-list
                aria-label="Recent swaps"
              >
                <div className="swap-recent-swaps__header">
                  <span>Recent swaps</span>
                  <strong>Browser-local history</strong>
                </div>
                {recentSwapSummaries.length > 0 ? (
                  <div
                    className="swap-recent-swaps__items"
                    data-vanta-swap-recent-browser-local
                  >
                    {recentSwapSummaries.map((summary) => (
                      <article
                        className="swap-recent-swaps__card"
                        data-vanta-swap-recent-card
                        key={createSwapReceiptSummaryKey(summary)}
                      >
                        <div>
                          <span>
                            {summary.storageScope === "browser-local"
                              ? "Stored in this browser"
                              : "Latest swap"}
                          </span>
                          <strong>
                            {formatAssetAmount(summary.inputAmount, summary.inputAsset)}
                            {" -> "}
                            {formatAssetAmount(summary.outputAmount, summary.outputAsset)}
                          </strong>
                          <p>
                            {summary.venueName} {summary.venueFamily} · Output note{" "}
                            {formatShortSwapId(summary.outputNoteId)}
                            {summary.createdAt
                              ? ` · ${formatQuoteTimestamp(summary.createdAt)}`
                              : ""}
                          </p>
                        </div>
                        <button
                          className="button button-ghost"
                          type="button"
                          onClick={() => {
                            setSelectedSwapReceiptKey(createSwapReceiptSummaryKey(summary));
                            setSwapReceiptModalOpen(true);
                          }}
                        >
                          Open receipt
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="swap-recent-swaps__empty" data-vanta-swap-recent-empty>
                    Completed swaps with committed receipt evidence will appear here for review.
                    Stored in this browser only; this history does not prove Swap production
                    privacy.
                  </p>
                )}
              </section>

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
                  {swapPrimaryActionLabel}
                </button>
              </div>
            </div>

            {(status === "awaiting_confirmation" ||
              status === "recording_transition" ||
              status === "authorizing_operator" ||
              status === "finalizing_state" ||
              status === "complete" ||
              status === "failed") && (
              <TransactionStatusToast
                tone={
                  status === "complete"
                    ? "success"
                    : status === "failed"
                      ? "error"
                      : status === "awaiting_confirmation"
                        ? "pending"
                        : "processing"
                }
                phase={
                  status === "complete"
                    ? "complete"
                    : status === "failed"
                      ? "failed"
                      : status === "awaiting_confirmation"
                        ? "pending"
                        : "confirmed"
                }
                title={
                  status === "awaiting_confirmation"
                    ? "Awaiting wallet confirmation"
                    : status === "recording_transition"
                      ? "Recording swap transition"
                      : status === "authorizing_operator"
                        ? "Authorizing swap"
                        : status === "finalizing_state"
                          ? "Finalizing beta route evidence"
                          : status === "complete"
                            ? "Swap recorded"
                            : "Swap failed"
                }
                message={
                  status === "complete" && lastSwapSummary
                    ? `Recorded ${formatAssetAmount(lastSwapSummary.inputAmount, lastSwapSummary.inputAsset)} into ${formatAssetAmount(lastSwapSummary.outputAmount, lastSwapSummary.outputAsset)} with committed receipt checks.`
                    : status === "complete"
                      ? `Recorded ${formatAssetAmount(parsedAmount, selectedSourceAsset)} into shielded ${selectedTargetAsset} (beta route).`
                    : status === "failed"
                      ? flowError ?? "The swap could not be completed."
                      : status === "authorizing_operator"
                        ? "Authorizing the swap on the selected route."
                      : status === "finalizing_state"
                          ? `Registering spent-marker and committed receipt evidence for shielded ${selectedTargetAsset}.`
                          : "Approve the swap in your wallet to continue."
                }
                progress={status !== "complete" && status !== "failed"}
                floating
              >
                {quote &&
                  status !== "failed" &&
                  status !== "complete" && (
                  <p className="shield-helper shield-helper--meta">
                    Quote from {quote.venueName} {quote.venueFamily} ·{" "}
                    {formatQuoteTimestamp(quote.quoteTimestamp)}
                  </p>
                )}
                {status === "awaiting_confirmation" && (
                  <WalletApprovalSheet
                    heading="Swap wallet approval"
                    walletPrompt="Wallet approval"
                    signingMode="Transaction approval"
                    rows={[
                      {
                        label: "Action",
                        value: "Authorize swap on constrained route",
                      },
                      {
                        label: "From",
                        value: formatAssetAmount(parsedAmount, selectedSourceAsset),
                      },
                      {
                        label: "To",
                        value: formatAssetAmount(expectedOutputAmount, selectedTargetAsset),
                      },
                      { label: "Venue", value: quoteVenueLabel },
                      {
                        label: "Input note",
                        value: exactSpendableNote
                          ? formatShortSwapId(exactSpendableNote.noteId)
                          : "Exact-note match required",
                      },
                    ]}
                    note="Approve only if the wallet shows the same route, asset, amount, and destination."
                    truthBoundary="Local review. Swap is in beta with constrained routes; production privacy is not enabled."
                  />
                )}
                {swapBridgeError && status === "complete" && (
                  <p className="shield-helper shield-helper--meta">{swapBridgeError}</p>
                )}
                {status === "complete" && lastSwapSummary && (
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => setSwapReceiptModalOpen(true)}
                  >
                    View swap receipt
                  </button>
                )}
                {status === "complete" && !lastSwapSummary && (
                  <p className="shield-helper shield-helper--meta">
                    Swap receipt unavailable until a completed swap exists.
                  </p>
                )}
              </TransactionStatusToast>
            )}
            {swapReceiptDetails && (
              <SwapReceiptModal
                details={swapReceiptDetails}
                open={swapReceiptModalOpen}
                onClose={() => setSwapReceiptModalOpen(false)}
              />
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
