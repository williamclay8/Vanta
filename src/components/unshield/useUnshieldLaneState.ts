import { useCallback, useEffect, useMemo, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import type { NotePickerOption } from "@/components/NotePicker";
import { formatEditableAmount } from "@/components/shield/shieldPanelUtils";
import { buildUnshieldValidationMessage } from "@/components/unshield/buildUnshieldValidationMessage";
import {
  abbreviate,
  formatUnshieldAmount,
  type UnshieldLane,
} from "@/components/unshield/unshieldPanelUtils";
import {
  amountsRoughlyMatch,
  chooseSelectedSpendableNote,
  isCanonicalSolSpendableNote,
  isCanonicalTokenSpendableNote,
  isPendingLocalSolShieldStateNote,
  isVisibleSolShieldStateNote,
  parseEditableAmount,
  sumSpendableAmounts,
  type SpendableTokenNote,
} from "@/components/unshield/unshieldNoteUtils";
import { fetchSolUnshieldOperatorHealth } from "@/solana/solUnshieldOperatorHealth";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import type { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import type { useVantaShieldState } from "@/solana/useVantaShieldState";

type ShieldRegistry = ReturnType<typeof useVantaShieldAssetRegistryState>;
type CanonicalShieldState = ReturnType<typeof useVantaShieldState>;

type UseUnshieldLaneStateArgs = {
  canonicalShieldState: CanonicalShieldState;
  resetFlowStatus: () => void;
  setUnshieldReceiptCopyStatus: (status: "idle" | "copied" | "failed") => void;
  shieldRegistry: ShieldRegistry;
  usdcShieldEntry: ShieldRegistry["byAssetKey"]["USDC"];
  walletAddressShort: string | null | undefined;
  walletConnected: boolean;
};

export function useUnshieldLaneState({
  canonicalShieldState,
  resetFlowStatus,
  setUnshieldReceiptCopyStatus,
  shieldRegistry,
  usdcShieldEntry,
  walletAddressShort,
  walletConnected,
}: UseUnshieldLaneStateArgs) {
  const [selectedLane, setSelectedLane] = useState<UnshieldLane>("USDC");
  const [selectedUnshieldNoteId, setSelectedUnshieldNoteId] = useState<string | null>(null);
  const [requestedAmountInput, setRequestedAmountInput] = useState("");
  const [solUnshieldOperatorHealth, setSolUnshieldOperatorHealth] = useState<
    "idle" | "checking" | "ready" | "blocked"
  >("idle");
  const [solUnshieldOperatorHealthError, setSolUnshieldOperatorHealthError] =
    useState<string | null>(null);

  const spendableShieldNotesByLane = useMemo(
    () =>
      ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.reduce(
        (nextNotesByLane, assetKey) => {
          nextNotesByLane[assetKey] = (
            shieldRegistry.byAssetKey[assetKey].account?.spendableShieldNotes ?? []
          ).filter(isCanonicalTokenSpendableNote);
          return nextNotesByLane;
        },
        {} as Record<LiveShieldTokenAssetKey, SpendableTokenNote[]>,
      ),
    [shieldRegistry.byAssetKey],
  );
  const canonicalSpendableShieldNotesByLane = spendableShieldNotesByLane;
  const shieldedSolSourceEntry =
    shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
    shieldRegistry.entries.find(
      (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
    ) ??
    shieldRegistry.entries.find((entry) =>
      (entry.account?.shieldedSolNotes ?? []).some(isPendingLocalSolShieldStateNote),
    ) ??
    null;
  const canonicalSolAccount =
    (canonicalShieldState.account?.shieldedSolBalance ?? 0) > 0 ||
    (canonicalShieldState.account?.spendableShieldedSolNotes.length ?? 0) > 0 ||
    (canonicalShieldState.account?.shieldedSolNotes ?? []).some(isPendingLocalSolShieldStateNote)
      ? canonicalShieldState.account
      : null;
  const solShieldAccount =
    shieldedSolSourceEntry?.account ?? canonicalSolAccount ?? usdcShieldEntry.account;
  const visibleSolNotes = useMemo(
    () => (solShieldAccount?.shieldedSolNotes ?? []).filter(isVisibleSolShieldStateNote),
    [solShieldAccount],
  );
  const spendableSolNotes = useMemo(
    () =>
      (solShieldAccount?.spendableShieldedSolNotes ?? []).filter(isCanonicalSolSpendableNote),
    [solShieldAccount],
  );
  const pendingSolNotes = useMemo(
    () => visibleSolNotes.filter(isPendingLocalSolShieldStateNote),
    [visibleSolNotes],
  );
  const solShieldStateError =
    spendableSolNotes.length > 0 || pendingSolNotes.length > 0
      ? null
      : canonicalShieldState.error;

  useEffect(() => {
    const availableLanes = [
      ...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS.map((assetKey) =>
        canonicalSpendableShieldNotesByLane[assetKey].length > 0 ? assetKey : null,
      ),
      spendableSolNotes.length > 0 || pendingSolNotes.length > 0 ? "SOL" : null,
    ].filter(Boolean) as UnshieldLane[];

    if (availableLanes.length === 0) {
      return;
    }

    if (!availableLanes.includes(selectedLane)) {
      setSelectedLane(availableLanes[0]);
    }
  }, [
    canonicalSpendableShieldNotesByLane,
    pendingSolNotes.length,
    selectedLane,
    spendableSolNotes.length,
  ]);

  const selectedSolNote = useMemo(
    () => chooseSelectedSpendableNote(spendableSolNotes, selectedUnshieldNoteId),
    [selectedUnshieldNoteId, spendableSolNotes],
  );
  const selectedShieldAsset = selectedLane === "SOL" ? null : getLiveShieldTokenAsset(selectedLane);
  const selectedShieldEntry = selectedLane === "SOL" ? null : shieldRegistry.byAssetKey[selectedLane];
  const selectedShieldAccount = selectedShieldEntry?.account ?? null;
  const selectedShieldNote =
    selectedLane === "SOL"
      ? null
      : chooseSelectedSpendableNote(
          canonicalSpendableShieldNotesByLane[selectedLane],
          selectedUnshieldNoteId,
        );
  const currentSpendableUnshieldNotes =
    selectedLane === "SOL" ? spendableSolNotes : canonicalSpendableShieldNotesByLane[selectedLane];
  const selectedUnshieldNote = selectedLane === "SOL" ? selectedSolNote : selectedShieldNote;
  const unshieldNotePickerOptions = useMemo<NotePickerOption[]>(
    () =>
      currentSpendableUnshieldNotes.map((note) => ({
        id: note.noteId,
        metaLabel: "Ledger-spendable exit note",
        primaryLabel: formatUnshieldAmount(note.amount, selectedLane),
        secondaryLabel: abbreviate(note.noteId),
      })),
    [currentSpendableUnshieldNotes, selectedLane],
  );

  useEffect(() => {
    if (!selectedUnshieldNoteId) {
      return;
    }

    if (!currentSpendableUnshieldNotes.some((note) => note.noteId === selectedUnshieldNoteId)) {
      setSelectedUnshieldNoteId(null);
    }
  }, [currentSpendableUnshieldNotes, selectedUnshieldNoteId]);

  useEffect(() => {
    if (selectedUnshieldNoteId) {
      return;
    }

    setRequestedAmountInput("");
  }, [selectedLane, selectedShieldNote, selectedSolNote, selectedUnshieldNoteId]);

  const selectedSolAggregateAmount = sumSpendableAmounts(spendableSolNotes, 9);
  const selectedSolPendingAmount = sumSpendableAmounts(pendingSolNotes, 9);
  const selectedFullAmount =
    selectedLane === "SOL" ? selectedSolNote?.amount ?? 0 : selectedShieldNote?.amount ?? 0;
  const selectedDisplayAmount = selectedFullAmount;

  useEffect(() => {
    if (selectedLane !== "SOL" || !liveSwapPair.solUnshieldOperatorUrl) {
      setSolUnshieldOperatorHealth("idle");
      setSolUnshieldOperatorHealthError(null);
      return;
    }

    let cancelled = false;
    setSolUnshieldOperatorHealth("checking");
    setSolUnshieldOperatorHealthError(null);

    void fetchSolUnshieldOperatorHealth()
      .then(() => {
        if (!cancelled) {
          setSolUnshieldOperatorHealth("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSolUnshieldOperatorHealth("blocked");
          setSolUnshieldOperatorHealthError(
            error instanceof Error
              ? error.message
              : "The SOL unshield operator is not reachable.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLane]);

  const availableLaneOptions = useMemo(
    () =>
      ([...ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS, "SOL"] as UnshieldLane[]).map((lane) => {
        const amount =
          lane === "SOL"
            ? selectedSolAggregateAmount
            : sumSpendableAmounts(canonicalSpendableShieldNotesByLane[lane], 6);

        return {
          amount,
          hasSpendableBalance:
            lane === "SOL"
              ? spendableSolNotes.length > 0
              : canonicalSpendableShieldNotesByLane[lane].length > 0,
          lane,
          pendingAmount: lane === "SOL" ? selectedSolPendingAmount : 0,
        };
      }),
    [
      canonicalSpendableShieldNotesByLane,
      selectedSolAggregateAmount,
      selectedSolPendingAmount,
      spendableSolNotes.length,
    ],
  );

  const selectedLaneDecimals =
    selectedLane === "SOL" ? 9 : getLiveShieldTokenAsset(selectedLane).decimals;

  const selectUnshieldLane = useCallback(
    (nextLane: UnshieldLane) => {
      setSelectedLane(nextLane);
      setSelectedUnshieldNoteId(null);
      resetFlowStatus();
      setUnshieldReceiptCopyStatus("idle");
    },
    [resetFlowStatus, setUnshieldReceiptCopyStatus],
  );

  const handleSelectUnshieldNote = useCallback(
    (nextNoteId: string | null) => {
      if (!nextNoteId) {
        setSelectedUnshieldNoteId(null);
        return;
      }

      const nextNote = currentSpendableUnshieldNotes.find((note) => note.noteId === nextNoteId);

      if (!nextNote) {
        setSelectedUnshieldNoteId(null);
        return;
      }

      setSelectedUnshieldNoteId(nextNote.noteId);

      if (selectedLane === "USDC") {
        setRequestedAmountInput(formatEditableAmount(nextNote.amount, selectedLaneDecimals));
      }

      resetFlowStatus();
    },
    [currentSpendableUnshieldNotes, resetFlowStatus, selectedLane, selectedLaneDecimals],
  );

  const requestedAmountNumeric =
    selectedLane === "USDC" ? parseEditableAmount(requestedAmountInput) : selectedFullAmount;
  const selectedAmount = requestedAmountNumeric !== null ? requestedAmountNumeric : 0;
  const requiresExactSplit =
    selectedLane === "USDC" &&
    selectedShieldNote !== null &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric > 0 &&
    requestedAmountNumeric < selectedShieldNote.amount &&
    !amountsRoughlyMatch(requestedAmountNumeric, selectedShieldNote.amount);
  const canUseLane = selectedLane === "SOL" ? Boolean(selectedSolNote) : Boolean(selectedShieldNote);
  const hasValidRequestedAmount =
    selectedLane === "USDC"
      ? requestedAmountNumeric !== null &&
        requestedAmountNumeric > 0 &&
        requestedAmountNumeric <= selectedFullAmount + 0.000001
      : selectedFullAmount > 0;
  const exitConsequenceAmount =
    selectedLane === "USDC"
      ? hasValidRequestedAmount && !requiresExactSplit
        ? requestedAmountNumeric
        : null
      : selectedFullAmount > 0
        ? selectedFullAmount
        : null;
  const exitConsequenceDisplay =
    exitConsequenceAmount !== null
      ? formatUnshieldAmount(exitConsequenceAmount, selectedLane)
      : requiresExactSplit
        ? "Shield exact USDC amount first"
        : `Enter ${selectedLane} amount`;
  const exitConsequenceDestination = walletAddressShort ?? "Connect wallet";
  const isReady =
    walletConnected &&
    canUseLane &&
    hasValidRequestedAmount &&
    !requiresExactSplit &&
    Boolean(usdcShieldEntry.asset.vaultOwner) &&
    (selectedLane === "SOL"
      ? Boolean(liveSwapPair.solUnshieldOperatorUrl) && solUnshieldOperatorHealth === "ready"
      : Boolean(selectedShieldAsset?.mintAddress) && Boolean(selectedShieldAsset?.unshieldConfigured));

  const validationMessage = buildUnshieldValidationMessage({
    isRefreshingRegistry: shieldRegistry.configuredEntries.some(
      (entry) => entry.isRefreshing || entry.token.isFetching,
    ),
    requestedAmountNumeric,
    requiresExactSplit,
    selectedFullAmount,
    selectedLane,
    selectedShieldAsset,
    selectedShieldEntryError: selectedShieldEntry?.error,
    selectedShieldNote,
    selectedSolNote,
    selectedSolPendingAmount,
    solShieldStateError,
    solUnshieldOperatorHealth,
    solUnshieldOperatorHealthError,
    solUnshieldOperatorUrl: liveSwapPair.solUnshieldOperatorUrl,
    walletConnected,
  });

  const selectedUnshieldNoteLabel = selectedUnshieldNote
    ? `${formatUnshieldAmount(selectedUnshieldNote.amount, selectedLane)} note - ${abbreviate(
        selectedUnshieldNote.noteId,
      )}`
    : `No ledger-spendable shielded ${selectedLane} note selected`;
  const unshieldPrimaryActionLabel = isBetaMode
    ? "Beta mode"
    : selectedAmount > 0
      ? `Withdraw ${formatUnshieldAmount(selectedAmount, selectedLane)}`
      : `Withdraw ${selectedLane}`;

  const handleMaxRequestedAmount = useCallback(() => {
    if (selectedFullAmount <= 0) {
      return;
    }

    setRequestedAmountInput(formatEditableAmount(selectedFullAmount, selectedLaneDecimals));
    resetFlowStatus();
  }, [resetFlowStatus, selectedFullAmount, selectedLaneDecimals]);

  const handleRequestedAmountChange = useCallback(
    (value: string) => {
      setRequestedAmountInput(value);
      resetFlowStatus();
    },
    [resetFlowStatus],
  );

  return {
    availableLaneOptions,
    canUseLane,
    currentSpendableUnshieldNotes,
    exitConsequenceDestination,
    exitConsequenceDisplay,
    handleMaxRequestedAmount,
    handleRequestedAmountChange,
    handleSelectUnshieldNote,
    isReady,
    requestedAmountInput,
    requestedAmountNumeric,
    requiresExactSplit,
    selectUnshieldLane,
    selectedDisplayAmount,
    selectedFullAmount,
    selectedLane,
    selectedLaneDecimals,
    selectedShieldAccount,
    selectedShieldAsset,
    selectedShieldNote,
    selectedSolNote,
    selectedSolPendingAmount,
    selectedUnshieldNote,
    selectedUnshieldNoteId,
    selectedUnshieldNoteLabel,
    solShieldAccount,
    solUnshieldOperatorHealth,
    unshieldNotePickerOptions,
    unshieldPrimaryActionLabel,
    validationMessage,
  };
}
