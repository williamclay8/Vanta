import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import { useWalletState } from "@/data/context/WalletContext";
import {
  createUnshieldConsumedNoteReferenceHash,
  fetchLocallyReleasedSolNoteReferenceHashes,
  fetchLocallyReleasedUnshieldNoteReferenceHashes,
} from "@/solana/operatorStateClient";
import { loadRecoveredNativeSolShieldNotes } from "@/solana/recoveredNativeSolShieldNotes";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT,
  VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY,
  loadVerifiedNativeSolShieldNotes,
} from "@/solana/verifiedNativeSolShieldNotes";
import {
  VERIFIED_SPL_SHIELD_NOTES_CHANGED_EVENT,
  VERIFIED_SPL_SHIELD_NOTES_STORAGE_KEY,
  loadVerifiedSplShieldNotes,
} from "@/solana/verifiedSplShieldNotes";
import {
  getLiveShieldTokenAssetByMint,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import {
  fetchVantaShieldAccountState,
  type VantaShieldAccountState,
  type VantaShieldNote,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";

export type VantaShieldAssetStateRefreshOptions = {
  signatureHint?: string | null;
};

type VantaShieldAssetStateResult = {
  account: VantaShieldAccountState | null;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  refresh: (options?: VantaShieldAssetStateRefreshOptions) => Promise<void>;
};

export function useVantaShieldAssetState(args: {
  includeLocallyReleasedSolNotes?: boolean;
  mintAddress: string | null;
  unshieldOperatorUrl?: string | null;
  vaultOwner: string | null;
}): VantaShieldAssetStateResult {
  const client = useSolanaClient();
  const { walletAddress, walletConnected } = useWalletState();
  const viewingKey = useVantaShieldViewingKey();
  const [account, setAccount] = useState<VantaShieldAccountState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (options: VantaShieldAssetStateRefreshOptions = {}) => {
    if (!walletConnected || !walletAddress || !args.mintAddress || !args.vaultOwner) {
      setAccount(null);
      setError(null);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const localNativeSolShieldNotes = loadLocalNativeSolShieldNotes({
        owner: walletAddress,
        vaultOwner: args.vaultOwner,
      });
      const localSplShieldNotes = loadVerifiedSplShieldNotes({
        mintAddress: args.mintAddress,
        owner: walletAddress,
        vaultOwner: args.vaultOwner,
      });
      const [
        locallyReleasedSolNoteReferenceHashes,
        locallyReleasedTokenNoteReferenceHashes,
      ] = await Promise.all([
        args.includeLocallyReleasedSolNotes
          ? fetchLocallyReleasedSolNoteReferenceHashes().catch(() => new Set<string>())
          : Promise.resolve(new Set<string>()),
        args.unshieldOperatorUrl
          ? fetchLocallyReleasedUnshieldNoteReferenceHashes(args.unshieldOperatorUrl)
          : Promise.resolve(new Set<string>()),
      ]);

      let nextAccount: VantaShieldAccountState;

      try {
        nextAccount = await fetchVantaShieldAccountState({
          client,
          mintAddress: args.mintAddress,
          owner: walletAddress,
          signatureHints: options.signatureHint ? [options.signatureHint] : undefined,
          vaultOwner: args.vaultOwner,
          viewingSecretKey: viewingKey?.secretKey,
        });
      } catch (nextError) {
        const localSplAccountFallback = createLocalSplShieldAccountState({
          mintAddress: args.mintAddress,
          notes: localSplShieldNotes,
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
        });
        const localNativeSolAccountFallback = createLocalNativeSolShieldAccountState({
          mintAddress: args.mintAddress,
          notes: localNativeSolShieldNotes,
          owner: walletAddress,
          vaultOwner: args.vaultOwner,
        });
        const localAccountFallback = localSplAccountFallback
          ? mergeRecoveredNativeSolShieldNotes(
              localSplAccountFallback,
              localNativeSolShieldNotes,
            )
          : localNativeSolAccountFallback;

        if (!localAccountFallback) {
          throw nextError;
        }

        setAccount(
          args.includeLocallyReleasedSolNotes
            ? reconcileLocallyReleasedSolNotes(
                localAccountFallback,
                locallyReleasedSolNoteReferenceHashes,
              )
            : localAccountFallback,
        );
        setError(null);
        return;
      }

      const accountWithVerifiedSplNotes = mergeVerifiedSplShieldNotes(
        nextAccount,
        localSplShieldNotes,
      );
      const accountWithRecoveredSolNotes = mergeRecoveredNativeSolShieldNotes(
        accountWithVerifiedSplNotes,
        localNativeSolShieldNotes,
      );
      const accountWithReleasedTokenNotes = reconcileLocallyReleasedShieldNotes(
        accountWithRecoveredSolNotes,
        locallyReleasedTokenNoteReferenceHashes,
      );
      setAccount(
        args.includeLocallyReleasedSolNotes
          ? reconcileLocallyReleasedSolNotes(
              accountWithReleasedTokenNotes,
              locallyReleasedSolNoteReferenceHashes,
            )
          : accountWithReleasedTokenNotes,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load Vanta shield state from mainnet.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    args.includeLocallyReleasedSolNotes,
    args.mintAddress,
    args.unshieldOperatorUrl,
    args.vaultOwner,
    client,
    viewingKey?.secretKey,
    walletAddress,
    walletConnected,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return;
    }

    let refreshQueued = false;
    const queueRefresh = () => {
      if (refreshQueued) {
        return;
      }

      refreshQueued = true;
      window.setTimeout(() => {
        refreshQueued = false;
        void refresh();
      }, 0);
    };
    const handleVerifiedNativeSolShieldNotesChanged = () => {
      queueRefresh();
    };
    const handleVerifiedSplShieldNotesChanged = () => {
      queueRefresh();
    };
    const handleStorageChanged = (event: StorageEvent) => {
      if (
        event.key === VERIFIED_NATIVE_SOL_SHIELD_NOTES_STORAGE_KEY ||
        event.key === VERIFIED_SPL_SHIELD_NOTES_STORAGE_KEY ||
        event.key === null
      ) {
        queueRefresh();
      }
    };

    window.addEventListener(
      VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT,
      handleVerifiedNativeSolShieldNotesChanged,
    );
    window.addEventListener(
      VERIFIED_SPL_SHIELD_NOTES_CHANGED_EVENT,
      handleVerifiedSplShieldNotesChanged,
    );
    window.addEventListener("storage", handleStorageChanged);

    return () => {
      window.removeEventListener(
        VERIFIED_NATIVE_SOL_SHIELD_NOTES_CHANGED_EVENT,
        handleVerifiedNativeSolShieldNotesChanged,
      );
      window.removeEventListener(
        VERIFIED_SPL_SHIELD_NOTES_CHANGED_EVENT,
        handleVerifiedSplShieldNotesChanged,
      );
      window.removeEventListener("storage", handleStorageChanged);
    };
  }, [refresh]);

  return {
    account,
    error,
    isReady: Boolean(walletConnected && walletAddress && args.mintAddress && args.vaultOwner),
    isRefreshing,
    refresh,
  };
}

function loadLocalNativeSolShieldNotes(args: {
  owner: string;
  vaultOwner: string;
}): VantaShieldedSolNote[] {
  return dedupeLocalNativeSolShieldNotes([
    ...loadVerifiedNativeSolShieldNotes(args),
    ...loadRecoveredNativeSolShieldNotes(args),
  ]);
}

function dedupeLocalNativeSolShieldNotes(
  notes: readonly VantaShieldedSolNote[],
): VantaShieldedSolNote[] {
  const notesByKey = new Map<string, VantaShieldedSolNote>();

  for (const note of notes) {
    const key = note.depositSignature ? `deposit:${note.depositSignature}` : note.noteId;
    const existingNote = notesByKey.get(key);

    if (!existingNote || (existingNote.lifecycleStatus !== "spendable" && note.lifecycleStatus === "spendable")) {
      notesByKey.set(key, note);
    }
  }

  return [...notesByKey.values()];
}

function createLocalNativeSolShieldAccountState(args: {
  mintAddress: string;
  notes: readonly VantaShieldedSolNote[];
  owner: string;
  vaultOwner: string;
}): VantaShieldAccountState | null {
  if (args.notes.length === 0) {
    return null;
  }

  const asset = getLiveShieldTokenAssetByMint(args.mintAddress)?.assetKey ?? "USDC";
  const shieldedSolNotes = [...args.notes].sort((left, right) => right.createdAt - left.createdAt);
  const spendableShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "spendable",
  );
  const consumedShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "consumed",
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );
  const lifecycleActivities = shieldedSolNotes.map((note) => ({
    amount: note.amount,
    amountLabel: `${note.amount.toFixed(4)} SOL`,
    createdAt: note.createdAt,
    description:
      note.lifecycleStatus === "spendable"
        ? "Locally verified native SOL Shield note resolved from transaction evidence."
        : "Native SOL Shield deposit is pending shield-state reconciliation.",
    impact: "public_to_shielded" as const,
    noteId: note.noteId,
    sourceState: "Public Wallet" as const,
    targetState: "Shielded State" as const,
    title: note.lifecycleStatus === "spendable" ? "Shielded SOL verified" : "Shielded SOL pending",
    type: "shield" as const,
  }));

  return {
    accountId: `local-native-sol:${args.owner}:${args.vaultOwner}:${args.mintAddress}`,
    activity: [],
    asset: asset as LiveShieldTokenAssetKey,
    balance: 0,
    changeNotes: [],
    consumedShieldedSolNotes,
    lifecycleActivities,
    mintAddress: args.mintAddress,
    noteStates: [],
    noteStatusSummary: {
      changeDerived: 0,
      consumed: 0,
      spendable: 0,
      swapDerived: 0,
      total: 0,
    },
    owner: args.owner,
    sendNotes: [],
    shieldNotes: [],
    shieldedSolBalance,
    shieldedSolNotes,
    solUnshieldNotes: [],
    source: "vanta_onchain_notes",
    spendableShieldedSolNotes,
    spendableShieldNotes: [],
    spentMarkers: [],
    spentShieldNotes: [],
    status: "ready",
    swapNotes: [],
    unshieldNotes: [],
    vaultOwner: args.vaultOwner,
  } satisfies VantaShieldAccountState;
}

function createLocalSplShieldAccountState(args: {
  mintAddress: string;
  notes: readonly VantaShieldNote[];
  owner: string;
  vaultOwner: string;
}): VantaShieldAccountState | null {
  if (args.notes.length === 0) {
    return null;
  }

  const asset = getLiveShieldTokenAssetByMint(args.mintAddress)?.assetKey ?? args.notes[0]?.asset ?? "USDC";

  return mergeVerifiedSplShieldNotes({
    accountId: `local-spl-shield:${args.owner}:${args.vaultOwner}:${args.mintAddress}`,
    activity: [],
    asset,
    balance: 0,
    changeNotes: [],
    consumedShieldedSolNotes: [],
    lifecycleActivities: [],
    mintAddress: args.mintAddress,
    noteStates: [],
    noteStatusSummary: {
      changeDerived: 0,
      consumed: 0,
      spendable: 0,
      swapDerived: 0,
      total: 0,
    },
    owner: args.owner,
    sendNotes: [],
    shieldedSolBalance: 0,
    shieldedSolNotes: [],
    shieldNotes: [],
    solUnshieldNotes: [],
    source: "vanta_onchain_notes",
    spendableShieldedSolNotes: [],
    spendableShieldNotes: [],
    spentMarkers: [],
    spentShieldNotes: [],
    status: "ready",
    swapNotes: [],
    unshieldNotes: [],
    vaultOwner: args.vaultOwner,
  }, args.notes);
}

function reconcileLocallyReleasedShieldNotes(
  account: VantaShieldAccountState,
  locallyReleasedNoteReferenceHashes: Set<string>,
): VantaShieldAccountState {
  if (locallyReleasedNoteReferenceHashes.size === 0) {
    return account;
  }

  const keepSpendableNote = (note: VantaShieldNote) => {
    return !locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(note.noteId));
  };
  const spendableShieldNotes = account.spendableShieldNotes.filter(keepSpendableNote);
  const locallyReleasedNotes = account.spendableShieldNotes.filter((note) =>
    locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(note.noteId)),
  );
  const spentShieldNotes = [...account.spentShieldNotes, ...locallyReleasedNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const noteStates = account.noteStates.map((noteState) =>
    locallyReleasedNoteReferenceHashes.has(createUnshieldConsumedNoteReferenceHash(noteState.noteId))
      ? {
          ...noteState,
          consumedByTransitionKind: "unshield" as const,
          lifecycleStatus: "consumed" as const,
        }
      : noteState,
  );
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    swapDerived: noteStates.filter((note) => note.sourceType === "swap_derived").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    total: noteStates.length,
  };
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );

  return {
    ...account,
    balance,
    noteStates,
    noteStatusSummary,
    spendableShieldNotes,
    spentShieldNotes,
  };
}

function mergeVerifiedSplShieldNotes(
  account: VantaShieldAccountState,
  verifiedNotes: readonly VantaShieldNote[],
): VantaShieldAccountState {
  if (verifiedNotes.length === 0) {
    return account;
  }

  const notesById = new Map<string, VantaShieldNote>();

  for (const note of [...account.shieldNotes, ...verifiedNotes]) {
    notesById.set(note.noteId, note);
  }

  const shieldNotes = [...notesById.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const consumedNoteIds = new Set([
    ...account.spentShieldNotes.map((note) => note.noteId),
    ...account.spentMarkers
      .filter((marker) => marker.asset !== "SOL")
      .map((marker) => marker.consumedNoteId),
  ]);
  const spentMarkerByConsumedNoteId = new Map(
    account.spentMarkers.map((marker) => [marker.consumedNoteId, marker] as const),
  );
  const spentShieldNotes = shieldNotes.filter((note) => consumedNoteIds.has(note.noteId));
  const spendableShieldNotes = shieldNotes.filter((note) => !consumedNoteIds.has(note.noteId));
  const noteStatesById = new Map(account.noteStates.map((note) => [note.noteId, note] as const));

  for (const note of shieldNotes) {
    if (noteStatesById.has(note.noteId)) {
      continue;
    }

    const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
    noteStatesById.set(note.noteId, {
      amount: note.amount,
      asset: note.asset,
      consumedByTransitionId: spentMarker?.transitionNoteId,
      consumedByTransitionKind: spentMarker?.transitionKind,
      createdAt: note.createdAt,
      lifecycleStatus: spentMarker ? "consumed" : "spendable",
      noteId: note.noteId,
      parentNoteId: note.parentNoteId,
      parentSendNoteId: note.parentSendNoteId,
      sourceType:
        note.origin === "change"
          ? "change_derived"
          : note.origin === "swap_output"
            ? "swap_derived"
            : "deposit",
      spentMarkerId: spentMarker?.markerId,
      stateSignature: note.stateSignature,
    });
  }

  const noteStates = [...noteStatesById.values()].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    swapDerived: noteStates.filter((note) => note.sourceType === "swap_derived").length,
    total: noteStates.length,
  };
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );
  const existingActivityKeys = new Set(
    account.activity.map((item) => "noteId" in item ? item.noteId : item.stateSignature),
  );
  const localShieldActivities = shieldNotes
    .filter((note) => !existingActivityKeys.has(note.noteId))
    .map((note) => ({
      amount: note.amount,
      amountLabel: `${note.amount.toFixed(Math.min(getLiveShieldTokenAssetByMint(note.mintAddress)?.decimals ?? 6, 4))} ${note.asset}`,
      createdAt: note.createdAt,
      description:
        "Locally verified SPL Shield note resolved from same-transaction shield evidence.",
      impact: "public_to_shielded" as const,
      noteId: note.noteId,
      sourceState: "Public Wallet" as const,
      targetState: "Shielded State" as const,
      title: `Shielded ${note.asset} verified`,
      type: "shield" as const,
    }));

  return {
    ...account,
    activity: [...account.activity, ...shieldNotes.filter((note) => !existingActivityKeys.has(note.noteId))]
      .sort((left, right) => left.createdAt - right.createdAt),
    balance,
    lifecycleActivities: [...account.lifecycleActivities, ...localShieldActivities].sort(
      (left, right) => right.createdAt - left.createdAt,
    ),
    noteStates,
    noteStatusSummary,
    shieldNotes,
    spendableShieldNotes,
    spentShieldNotes,
  };
}

function mergeRecoveredNativeSolShieldNotes(
  account: VantaShieldAccountState,
  recoveredNotes: readonly VantaShieldedSolNote[],
): VantaShieldAccountState {
  if (recoveredNotes.length === 0) {
    return account;
  }

  const notesByKey = new Map<string, VantaShieldedSolNote>();

  for (const note of [...account.shieldedSolNotes, ...recoveredNotes]) {
    const key = nativeSolNoteMergeKey(note);
    const existing = notesByKey.get(key);
    notesByKey.set(key, selectPreferredNativeSolShieldNote(existing, note));
  }

  const shieldedSolNotes = [...notesByKey.values()].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const spendableShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "spendable",
  );
  const consumedShieldedSolNotes = shieldedSolNotes.filter(
    (note) => note.lifecycleStatus === "consumed",
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );

  return {
    ...account,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    spendableShieldedSolNotes,
  };
}

function nativeSolNoteMergeKey(note: VantaShieldedSolNote) {
  return note.depositSignature ? `deposit:${note.depositSignature}` : note.noteId;
}

function selectPreferredNativeSolShieldNote(
  existing: VantaShieldedSolNote | undefined,
  candidate: VantaShieldedSolNote,
) {
  if (!existing) {
    return candidate;
  }

  if (existing.lifecycleStatus === "consumed") {
    return existing;
  }

  if (candidate.lifecycleStatus === "consumed") {
    return candidate;
  }

  if (
    existing.lifecycleStatus !== "spendable" &&
    candidate.lifecycleStatus === "spendable"
  ) {
    return candidate;
  }

  return existing;
}

function reconcileLocallyReleasedSolNotes(
  account: VantaShieldAccountState,
  locallyReleasedSolNoteReferenceHashes: Set<string>,
): VantaShieldAccountState {
  if (locallyReleasedSolNoteReferenceHashes.size === 0) {
    return account;
  }

  const keepSpendableSolNote = (note: VantaShieldedSolNote) => {
    return !locallyReleasedSolNoteReferenceHashes.has(
      createUnshieldConsumedNoteReferenceHash(note.noteId),
    );
  };
  const spendableShieldedSolNotes = account.spendableShieldedSolNotes.filter(keepSpendableSolNote);
  const consumedShieldedSolNotes = [
    ...account.consumedShieldedSolNotes,
    ...account.spendableShieldedSolNotes
      .filter((note) =>
        locallyReleasedSolNoteReferenceHashes.has(
          createUnshieldConsumedNoteReferenceHash(note.noteId),
        ),
      )
      .map((note) => ({
        ...note,
        consumedByTransitionKind: "sol_unshield" as const,
        lifecycleStatus: "consumed" as const,
      })),
  ].sort((left, right) => right.createdAt - left.createdAt);
  const shieldedSolNotes = [...spendableShieldedSolNotes, ...consumedShieldedSolNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );

  return {
    ...account,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    spendableShieldedSolNotes,
  };
}
