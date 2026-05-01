import { useMemo } from "react";
import { useSplToken } from "@solana/react-hooks";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  SHIELD_HOOK_FALLBACK_MINT,
  type LiveShieldTokenAssetConfig,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { useVantaShieldAssetState } from "@/solana/useVantaShieldAssetState";
import type {
  VantaAppNoteState,
  VantaLifecycleActivity,
  VantaShieldAccountState,
  VantaShieldActivity,
  VantaShieldNote,
} from "@/solana/vantaShieldState";

export type VantaShieldAssetRegistryEntry = {
  account: ReturnType<typeof useVantaShieldAssetState>["account"];
  asset: LiveShieldTokenAssetConfig;
  error: string | null;
  isReady: boolean;
  isRefreshing: boolean;
  publicBalance: number;
  refresh: () => Promise<void>;
  token: ReturnType<typeof useSplToken>;
};

type RecentShieldTokenContext = NonNullable<ReturnType<typeof usePrivacyFlow>["recentShield"]> & {
  asset: LiveShieldTokenAssetKey;
  signature: string;
};

export function useVantaShieldAssetRegistryState() {
  const { recentShield } = usePrivacyFlow();
  const { walletAddress } = useWalletState();
  const usdcAsset = getLiveShieldTokenAsset("USDC");
  const jtoAsset = getLiveShieldTokenAsset("JTO");
  const bonkAsset = getLiveShieldTokenAsset("BONK");
  const jupAsset = getLiveShieldTokenAsset("JUP");
  const pyusdAsset = getLiveShieldTokenAsset("PYUSD");
  const wifAsset = getLiveShieldTokenAsset("WIF");
  const kmnoAsset = getLiveShieldTokenAsset("KMNO");

  const usdcAccountState = useVantaShieldAssetState({
    includeLocallyReleasedSolNotes: true,
    mintAddress: usdcAsset.mintAddress,
    vaultOwner: usdcAsset.vaultOwner,
  });
  const jtoAccountState = useVantaShieldAssetState({
    mintAddress: jtoAsset.mintAddress,
    vaultOwner: jtoAsset.vaultOwner,
  });
  const bonkAccountState = useVantaShieldAssetState({
    mintAddress: bonkAsset.mintAddress,
    vaultOwner: bonkAsset.vaultOwner,
  });
  const jupAccountState = useVantaShieldAssetState({
    mintAddress: jupAsset.mintAddress,
    vaultOwner: jupAsset.vaultOwner,
  });
  const pyusdAccountState = useVantaShieldAssetState({
    mintAddress: pyusdAsset.mintAddress,
    vaultOwner: pyusdAsset.vaultOwner,
  });
  const wifAccountState = useVantaShieldAssetState({
    mintAddress: wifAsset.mintAddress,
    vaultOwner: wifAsset.vaultOwner,
  });
  const kmnoAccountState = useVantaShieldAssetState({
    mintAddress: kmnoAsset.mintAddress,
    vaultOwner: kmnoAsset.vaultOwner,
  });

  const usdcToken = useSplToken(usdcAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const jtoToken = useSplToken(jtoAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const bonkToken = useSplToken(bonkAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const jupToken = useSplToken(jupAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const pyusdToken = useSplToken(pyusdAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const wifToken = useSplToken(wifAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });
  const kmnoToken = useSplToken(kmnoAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT, {
    config: { tokenProgram: "auto" },
  });

  return useMemo(() => {
    const entries = [
      {
        account: mergeRecentShieldTokenAccount({
          account: usdcAccountState.account,
          asset: usdcAsset,
          recentShield,
          walletAddress,
        }),
        asset: usdcAsset,
        error: usdcAccountState.error,
        isReady: usdcAccountState.isReady,
        isRefreshing: usdcAccountState.isRefreshing,
        publicBalance: Number(usdcToken.balance?.uiAmount ?? "0"),
        refresh: usdcAccountState.refresh,
        token: usdcToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: jtoAccountState.account,
          asset: jtoAsset,
          recentShield,
          walletAddress,
        }),
        asset: jtoAsset,
        error: jtoAccountState.error,
        isReady: jtoAccountState.isReady,
        isRefreshing: jtoAccountState.isRefreshing,
        publicBalance: Number(jtoToken.balance?.uiAmount ?? "0"),
        refresh: jtoAccountState.refresh,
        token: jtoToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: bonkAccountState.account,
          asset: bonkAsset,
          recentShield,
          walletAddress,
        }),
        asset: bonkAsset,
        error: bonkAccountState.error,
        isReady: bonkAccountState.isReady,
        isRefreshing: bonkAccountState.isRefreshing,
        publicBalance: Number(bonkToken.balance?.uiAmount ?? "0"),
        refresh: bonkAccountState.refresh,
        token: bonkToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: jupAccountState.account,
          asset: jupAsset,
          recentShield,
          walletAddress,
        }),
        asset: jupAsset,
        error: jupAccountState.error,
        isReady: jupAccountState.isReady,
        isRefreshing: jupAccountState.isRefreshing,
        publicBalance: Number(jupToken.balance?.uiAmount ?? "0"),
        refresh: jupAccountState.refresh,
        token: jupToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: pyusdAccountState.account,
          asset: pyusdAsset,
          recentShield,
          walletAddress,
        }),
        asset: pyusdAsset,
        error: pyusdAccountState.error,
        isReady: pyusdAccountState.isReady,
        isRefreshing: pyusdAccountState.isRefreshing,
        publicBalance: Number(pyusdToken.balance?.uiAmount ?? "0"),
        refresh: pyusdAccountState.refresh,
        token: pyusdToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: wifAccountState.account,
          asset: wifAsset,
          recentShield,
          walletAddress,
        }),
        asset: wifAsset,
        error: wifAccountState.error,
        isReady: wifAccountState.isReady,
        isRefreshing: wifAccountState.isRefreshing,
        publicBalance: Number(wifToken.balance?.uiAmount ?? "0"),
        refresh: wifAccountState.refresh,
        token: wifToken,
      },
      {
        account: mergeRecentShieldTokenAccount({
          account: kmnoAccountState.account,
          asset: kmnoAsset,
          recentShield,
          walletAddress,
        }),
        asset: kmnoAsset,
        error: kmnoAccountState.error,
        isReady: kmnoAccountState.isReady,
        isRefreshing: kmnoAccountState.isRefreshing,
        publicBalance: Number(kmnoToken.balance?.uiAmount ?? "0"),
        refresh: kmnoAccountState.refresh,
        token: kmnoToken,
      },
    ] satisfies VantaShieldAssetRegistryEntry[];

    const byAssetKey = Object.fromEntries(
      entries.map((entry) => [entry.asset.assetKey, entry]),
    ) as Record<LiveShieldTokenAssetKey, VantaShieldAssetRegistryEntry>;

    return {
      byAssetKey,
      configuredEntries: entries.filter((entry) => entry.asset.executable),
      entries,
      orderedAssetKeys: ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
    };
  }, [
    bonkAccountState.account,
    bonkAccountState.error,
    bonkAccountState.isReady,
    bonkAccountState.isRefreshing,
    bonkAccountState.refresh,
    bonkAsset,
    bonkToken,
    recentShield,
    jupAccountState.account,
    jupAccountState.error,
    jupAccountState.isReady,
    jupAccountState.isRefreshing,
    jupAccountState.refresh,
    jupAsset,
    jupToken,
    kmnoAccountState.account,
    kmnoAccountState.error,
    kmnoAccountState.isReady,
    kmnoAccountState.isRefreshing,
    kmnoAccountState.refresh,
    kmnoAsset,
    kmnoToken,
    pyusdAccountState.account,
    pyusdAccountState.error,
    pyusdAccountState.isReady,
    pyusdAccountState.isRefreshing,
    pyusdAccountState.refresh,
    pyusdAsset,
    pyusdToken,
    jtoAccountState.account,
    jtoAccountState.error,
    jtoAccountState.isReady,
    jtoAccountState.isRefreshing,
    jtoAccountState.refresh,
    jtoAsset,
    jtoToken,
    usdcAccountState.account,
    usdcAccountState.error,
    usdcAccountState.isReady,
    usdcAccountState.isRefreshing,
    usdcAccountState.refresh,
    usdcAsset,
    usdcToken,
    walletAddress,
    wifAccountState.account,
    wifAccountState.error,
    wifAccountState.isReady,
    wifAccountState.isRefreshing,
    wifAccountState.refresh,
    wifAsset,
    wifToken,
  ]);
}

function mergeRecentShieldTokenAccount(args: {
  account: VantaShieldAccountState | null;
  asset: LiveShieldTokenAssetConfig;
  recentShield: ReturnType<typeof usePrivacyFlow>["recentShield"];
  walletAddress: string | null;
}): VantaShieldAccountState | null {
  const { asset, recentShield, walletAddress } = args;
  const account =
    args.account ??
    createRecentShieldTokenAccountShell({
      asset,
      recentShield,
      walletAddress,
    });

  if (
    !account ||
    !asset.mintAddress ||
    !asset.vaultOwner ||
    !isRecentShieldTokenContext(recentShield) ||
    recentShield.asset !== asset.assetKey ||
    recentShield.amount <= 0
  ) {
    return account;
  }

  const recentNote = createRecentShieldTokenNote({
    account,
    asset,
    recentShield,
  });
  const alreadyPresent = account.shieldNotes.some(
    (note) =>
      note.noteId === recentNote.noteId ||
      note.stateSignature === recentNote.stateSignature ||
      (note.depositSignature && note.depositSignature === recentNote.depositSignature),
  );

  if (alreadyPresent) {
    return account;
  }

  const shieldNotes = [...account.shieldNotes, recentNote].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const spendableShieldNotes = [recentNote, ...account.spendableShieldNotes].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const noteState = createRecentShieldTokenNoteState(recentNote);
  const noteStates = [noteState, ...account.noteStates].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const activity = [...account.activity, recentNote].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const lifecycleActivity = createRecentShieldTokenLifecycleActivity(recentNote);
  const lifecycleActivities = [lifecycleActivity, ...account.lifecycleActivities].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  const balance = Number(
    spendableShieldNotes
      .reduce((sum, note) => sum + note.amount, 0)
      .toFixed(asset.decimals),
  );

  return {
    ...account,
    activity,
    balance,
    lifecycleActivities,
    noteStates,
    noteStatusSummary: {
      ...account.noteStatusSummary,
      spendable: account.noteStatusSummary.spendable + 1,
      total: account.noteStatusSummary.total + 1,
    },
    shieldNotes,
    spendableShieldNotes,
  } satisfies VantaShieldAccountState;
}

function createRecentShieldTokenNote(args: {
  account: VantaShieldAccountState;
  asset: LiveShieldTokenAssetConfig;
  recentShield: RecentShieldTokenContext;
}) {
  const depositSignature = args.recentShield.depositSignature ?? args.recentShield.signature;
  const amount = Number(args.recentShield.amount.toFixed(args.asset.decimals));

  return {
    amount,
    asset: args.asset.assetKey,
    createdAt: args.recentShield.timestamp,
    depositSignature,
    kind: "shield",
    mintAddress: args.asset.mintAddress!,
    noteId: `vnta_recent_${args.asset.assetKey}_${args.account.owner}_${args.asset.vaultOwner}_${depositSignature}`,
    origin: "deposit",
    owner: args.account.owner,
    stateSignature: args.recentShield.signature,
    vaultOwner: args.asset.vaultOwner!,
  } satisfies VantaShieldNote;
}

function createRecentShieldTokenNoteState(note: VantaShieldNote) {
  return {
    amount: note.amount,
    asset: note.asset,
    createdAt: note.createdAt,
    lifecycleStatus: "spendable",
    noteId: note.noteId,
    sourceType: "deposit",
    stateSignature: note.stateSignature,
  } satisfies VantaAppNoteState;
}

function createRecentShieldTokenLifecycleActivity(note: VantaShieldNote) {
  return {
    amount: note.amount,
    amountLabel: `${note.amount} ${note.asset}`,
    createdAt: note.createdAt,
    description: `${note.amount} ${note.asset} entered shielded state.`,
    noteId: note.noteId,
    sourceState: "Public Wallet",
    targetState: "Shielded State",
    title: `Shielded ${note.asset}`,
    type: "shield",
    impact: "public_to_shielded",
  } satisfies VantaLifecycleActivity;
}

function isRecentShieldTokenContext(
  recentShield: ReturnType<typeof usePrivacyFlow>["recentShield"],
): recentShield is RecentShieldTokenContext {
  return Boolean(
    recentShield &&
      recentShield.asset !== "SOL" &&
      recentShield.signature,
  );
}

function createRecentShieldTokenAccountShell(args: {
  asset: LiveShieldTokenAssetConfig;
  recentShield: ReturnType<typeof usePrivacyFlow>["recentShield"];
  walletAddress: string | null;
}): VantaShieldAccountState | null {
  if (
    !args.walletAddress ||
    !args.asset.mintAddress ||
    !args.asset.vaultOwner ||
    !isRecentShieldTokenContext(args.recentShield) ||
    args.recentShield.asset !== args.asset.assetKey
  ) {
    return null;
  }

  return {
    accountId: `recent:${args.walletAddress}:${args.asset.mintAddress}`,
    activity: [],
    asset: args.asset.assetKey,
    balance: 0,
    changeNotes: [],
    consumedShieldedSolNotes: [],
    lifecycleActivities: [],
    mintAddress: args.asset.mintAddress,
    noteStates: [],
    noteStatusSummary: {
      changeDerived: 0,
      consumed: 0,
      spendable: 0,
      swapDerived: 0,
      total: 0,
    },
    owner: args.walletAddress,
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
    vaultOwner: args.asset.vaultOwner,
  };
}
