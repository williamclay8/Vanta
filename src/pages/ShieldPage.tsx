import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { AssetPickerGrid, type AssetPickerGridOption } from "@/components/AssetPickerGrid";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { RecoveryPanelController } from "@/components/RecoveryPanelController";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import {
  usePrivacyFlow,
  type RecentShieldContext,
  type VantaPrivateCoreLedgerBinding,
} from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import {
  assertNativeSolShieldSourceAccountReady,
  buildNativeSolShieldTransferInstructions,
  fetchNativeSolShieldDepositCandidates,
  isNativeSolSourceAccountNotReadyError,
  solToLamports,
  VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE,
  verifyNativeSolShieldDepositSignature,
  type NativeSolShieldDepositCandidate,
} from "@/solana/nativeSolShield";
import {
  buildPublicToUsdcSwapInstructions,
  createPublicShieldRouteEvidence,
  fetchPublicToUsdcQuote,
  formatAssetAmount,
  type PublicShieldRouteEvidence,
  type PublicToUsdcQuote,
} from "@/solana/publicSwapRoute";
import { requestVantaPrivatePoolV2BrowserShieldReceipt } from "@/privacy/privatePoolV2ProtocolSettlementClient";
import { runShieldWithDecoys } from "@/privacy/shieldDecoyBatcher";
import { createVantaShieldCommittedEconomicsSettlement } from "@/privacy/vantaShieldCommittedSettlement";
import { createUmbraShieldActionApprovalReview } from "@/privacy/umbraShieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { isSolanaRpcHttpAccessError, isSolanaRpcRateLimitError } from "@/solana/rpcErrors";
import { recordRecoveredNativeSolShieldNote } from "@/solana/recoveredNativeSolShieldNotes";
import {
  hasVerifiedNativeSolShieldNote,
  loadVerifiedNativeSolShieldDepositSignatures,
  recordVerifiedNativeSolShieldNote,
} from "@/solana/verifiedNativeSolShieldNotes";
import { recordVerifiedSplShieldNote } from "@/solana/verifiedSplShieldNotes";
import { recordRecentShieldTokenNote } from "@/solana/recentShieldTokenNotes";
import { createShieldAssetCapability } from "@/solana/shieldAssetCapability";
import { getShieldTrustContract } from "@/solana/shieldTrustContract";
import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import {
  type LiveShieldTokenAssetKey,
  type LiveShieldTokenAssetConfig,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import { selectUniversalShieldTarget } from "@/solana/universalShieldTarget";
import { resolveUserVaultOwner } from "@/solana/userVaultOwner";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import type { RealtimeSignatureStage } from "@/solana/useRealtimeSignatureProgress";
import { buildSplTokenShieldTransferInstructions } from "@/solana/splShieldTransfer";
import { useWalletPublicAssets } from "@/solana/useWalletPublicAssets";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldOwnerContext } from "@/solana/useVantaShieldOwnerContext";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import { toVantaWalletAuthorizationRecoveryMessage } from "@/wallet/walletAuthorizationError.mjs";
import {
  createNativeSolShieldMemoInstruction,
  createShieldMemoInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
  NATIVE_SOL_ASSET_ID_SENTINEL,
  computeNativeSolShieldPoseidonCommitment,
  migrateLegacyVantaShieldedSolNoteToV2,
  VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
  VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";
import {
  getVantaLegacyNativeSolWsolMigrationPolicy,
  loadNonMigratedLegacyNativeSolShieldNotes,
  removeLegacyNativeSolShieldNoteAfterMigration,
} from "@/solana/verifiedNativeSolShieldNotes";
import {
  recordCanonicalShieldFromLiveShield,
} from "@/zk/liveShieldBridge";
import type { CanonicalNoteOwnerContext } from "@/zk/canonicalNote";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";

type ShieldPageProps = {
  dashboard?: boolean;
};

type ShieldStatus =
  | "idle"
  | "awaiting_wallet_confirmation"
  | "routing_public_swap"
  | "shielding_in_progress"
  | "entering_shielded_state"
  | "recovery_recorded"
  | "complete"
  | "failed";

const NATIVE_SOL_SHIELD_FEE_RESERVE_SOL = 0.00001;
const SHIELD_STATE_HYDRATION_RETRY_DELAYS_MS = [400, 1_200, 3_000, 6_000] as const;
  const VANTA_SHIELD_REQUIRED_ACCOUNT_NOT_FOUND_MESSAGE =
  "Required account not found. Refresh balances or try another RPC.";

function isConfirmedSignatureStage(stage: RealtimeSignatureStage) {
  return stage === "confirmed" || stage === "finalized";
}

type PendingPublicRoute = {
  previousTargetBalance: number;
  quote: PublicToUsdcQuote;
  targetAssetKey: LiveShieldTokenAssetKey;
};

type PendingShieldProtocolSettlement = {
  capability: ReturnType<typeof createShieldAssetCapability>;
  routeEvidence: PublicShieldRouteEvidence | null;
};

function toErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const maybeContext =
    typeof error === "object" && error !== null
      ? (error as { context?: { message?: unknown; statusCode?: unknown }; __code?: unknown })
      : null;
  const code = maybeContext?.__code;
  const walletAuthorizationMessage = toVantaWalletAuthorizationRecoveryMessage(error);

  if (walletAuthorizationMessage) {
    return walletAuthorizationMessage;
  }

  if (isSolanaRpcRateLimitError(error)) {
    return "RPC rate-limited. Wait or use recovery.";
  }

  if (isSolanaRpcHttpAccessError(error)) {
    return "RPC blocked. Try compatible mainnet RPC or recovery.";
  }

  if (code === 8100002 || message.includes("Solana error #8100002")) {
    const statusCode = maybeContext?.context?.statusCode;
    const providerMessage = maybeContext?.context?.message;
    const detail =
      typeof statusCode === "number" || typeof providerMessage === "string"
        ? ` (${[statusCode, providerMessage].filter(Boolean).join(": ")})`
        : "";

    return `Solana RPC returned an HTTP error${detail}. Shield was not confirmed through the browser RPC endpoint; try again with a browser-compatible mainnet RPC.`;
  }

  if (isNativeSolSourceAccountNotReadyError(error)) {
    return VANTA_NATIVE_SOL_ACCOUNT_NOT_ACTIVE_MESSAGE;
  }

  if (message.includes("AccountNotFound")) {
    return VANTA_SHIELD_REQUIRED_ACCOUNT_NOT_FOUND_MESSAGE;
  }

  return error instanceof Error ? error.message : fallback;
}

function toRecoverableSolDepositsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (isSolanaRpcRateLimitError(error)) {
    return "The public Solana RPC is rate-limited while checking recent SOL vault deposits. Try again in a moment; Vanta will not ask for another transfer.";
  }

  if (isSolanaRpcHttpAccessError(error)) {
    return "Recent SOL vault deposits could not be checked because the browser RPC endpoint blocked access. Try a browser-compatible mainnet RPC; Vanta will not ask for another transfer.";
  }

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("load failed") ||
    normalizedMessage.includes("networkerror") ||
    message.includes("-32600") ||
    message.includes("getTransaction") ||
    normalizedMessage.includes("solana rpc")
  ) {
    return "Recent SOL vault deposits could not be checked because the browser RPC endpoint blocked the request. Vanta will not ask for another transfer.";
  }

  return toErrorMessage(error, "Recent SOL vault deposits could not be checked.");
}

function toPrivatePoolShieldReceiptWarning(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("load failed") ||
    normalizedMessage.includes("networkerror")
  ) {
    return "Private Pool v2 Shield receipt is unavailable from the browser right now; local Shield evidence was recorded and Vanta will not ask for another transfer.";
  }

  return toErrorMessage(error, "Private Pool v2 Shield receipt could not be checked.");
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

function formatEditableAmount(value: number, decimals: number) {
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "")
    .replace(/\.$/u, "");
}

function parseDecimalAmountToBaseUnits(amountDisplay: string, decimals: number) {
  const normalized = amountDisplay.trim();

  if (!/^\d+(\.\d+)?$/u.test(normalized)) {
    throw new Error("Vanta Umbra shield approval requires a decimal amount.");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const wholeBaseUnits = BigInt(wholePart || "0") * 10n ** BigInt(decimals);
  const fractionalBaseUnits = BigInt(fractionalPart.padEnd(decimals, "0").slice(0, decimals) || "0");

  return wholeBaseUnits + fractionalBaseUnits;
}

function formatShieldSourceAssetOptionLabel(asset: {
  label: string;
  mintAddress: string;
  symbol: string;
}) {
  if (asset.label === asset.symbol) {
    return asset.symbol;
  }

  return `${asset.label} (${asset.symbol})`;
}

function describeRecentShieldCompletion(recentShield: RecentShieldContext, warning: string | null) {
  const amountLabel = formatAssetAmount(recentShield.amount, recentShield.asset);
  const suffix = warning ? ` Receipt check warning: ${warning}` : "";

  if (recentShield.claimTier === "proof_receipt_verified") {
    return `${amountLabel} has a verified local Shield proof receipt.${suffix}`;
  }

  if (recentShield.claimTier === "local_private_core_note") {
    return `${amountLabel} was recorded as a local Private Core note. Production privacy is not enabled.${suffix}`;
  }

  if (recentShield.claimTier === "local_shield_state") {
    return `${amountLabel} was recorded in local shield-state. Production privacy is not enabled.${suffix}`;
  }

  return `${amountLabel} reached the Vanta vault as a public deposit; local shield-state proof is still unavailable.${suffix}`;
}

function isPendingNativeSolShieldStateNote(note: VantaShieldedSolNote) {
  return (
    note.lifecycleStatus === "pending" &&
    !note.consumedByTransitionKind &&
    (note.stateSignature.startsWith("local-sol-recovery:") ||
      note.stateSignature.startsWith("local-sol-shield-state:") ||
      note.sourceSwapNoteId === "native-sol-recovery" ||
      note.sourceSwapNoteId === "native-sol-shield-state")
  );
}

function isMissingBrowserCommittedShieldReceiptDepositSignatureWarning(warning: string | null) {
  return Boolean(
    warning?.includes("Browser committed Shield receipt deposit signature was not found on Solana"),
  );
}

function repairVerifiedNativeSolShieldNote(args: {
  amount: number;
  createdAt: number;
  depositSignature: string | null | undefined;
  owner: string | null | undefined;
  stateSignature: string | null | undefined;
  vaultOwner: string | null | undefined;
}) {
  if (
    !args.depositSignature ||
    !args.owner ||
    !args.stateSignature ||
    !args.vaultOwner ||
    !Number.isFinite(args.amount) ||
    args.amount <= 0
  ) {
    return false;
  }

  if (
    hasVerifiedNativeSolShieldNote({
      depositSignature: args.depositSignature,
      owner: args.owner,
      vaultOwner: args.vaultOwner,
    })
  ) {
    return false;
  }

  recordVerifiedNativeSolShieldNote({
    amount: args.amount,
    createdAt: args.createdAt,
    depositSignature: args.depositSignature,
    owner: args.owner,
    stateSignature: args.stateSignature,
    vaultOwner: args.vaultOwner,
  });
  return true;
}

export function ShieldPage(_props: ShieldPageProps) {
  const { recentShield, runPrivateCoreShield, setRecentShield } = usePrivacyFlow();
  const shieldTrustContract = useMemo(() => getShieldTrustContract(), []);
  const {
    lamportsBalance,
    solBalance,
    solBalanceError,
    solBalanceFetching,
    walletAddress,
    walletConnected,
  } = useWalletState();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const viewingKey = useVantaShieldViewingKey();
  const shieldOwnerContext = useVantaShieldOwnerContext();
  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState("native:SOL");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingShieldAmount, setPendingShieldAmount] = useState<number | null>(null);
  const [pendingShieldAmountDisplay, setPendingShieldAmountDisplay] = useState<string | null>(null);
  const [pendingShieldMemoCreatedAt, setPendingShieldMemoCreatedAt] = useState<number | null>(null);
  const [pendingDepositSignature, setPendingDepositSignature] = useState<string | null>(null);
  const [pendingShieldAsset, setPendingShieldAsset] = useState<LiveShieldTokenAssetKey | "SOL" | null>(null);
  const [pendingShieldTarget, setPendingShieldTarget] = useState<LiveShieldTokenAssetConfig | null>(null);
  const [pendingShieldOwnerContext, setPendingShieldOwnerContext] =
    useState<CanonicalNoteOwnerContext | null>(null);
  const [pendingPublicRoute, setPendingPublicRoute] = useState<PendingPublicRoute | null>(null);
  const [pendingProtocolSettlement, setPendingProtocolSettlement] =
    useState<PendingShieldProtocolSettlement | null>(null);
  const [pendingUmbraApprovalDisplay, setPendingUmbraApprovalDisplay] =
    useState<UmbraOperationApprovalDisplay | null>(null);
  const [recoverableSolDeposits, setRecoverableSolDeposits] = useState<
    NativeSolShieldDepositCandidate[]
  >([]);
  const [recoverableSolDepositsLoading, setRecoverableSolDepositsLoading] = useState(false);
  const [recoverableSolDepositsError, setRecoverableSolDepositsError] = useState<string | null>(null);

  // Phase 2 legacy WSOL -> v2 sentinel migration UI state (one-time, fail-closed, design doc §9)
  const [legacySolNotes, setLegacySolNotes] = useState<VantaShieldedSolNote[]>([]);
  const [legacyMigrationStatus, setLegacyMigrationStatus] = useState<Record<string, "idle" | "migrating" | "success" | "error">>({});
  const [legacyMigrationError, setLegacyMigrationError] = useState<string | null>(null);
  const [showLegacyMigrationPanel, setShowLegacyMigrationPanel] = useState(true);
  const [isMigratingAll, setIsMigratingAll] = useState(false);

  useEffect(() => {
    if (pendingShieldAsset === null) {
      setPendingShieldOwnerContext(null);
    }
  }, [pendingShieldAsset]);

  const recordedStateSignatureRef = useRef<string | null>(null);
  const recordedTokenDepositSignatureRef = useRef<string | null>(null);
  const queuedNativeSolHydrationSignatureRef = useRef<string | null>(null);
  const repairedNativeSolReceiptRef = useRef<string | null>(null);
  const shieldStateHydrationTimeoutsRef = useRef<number[]>([]);

  const executableShieldTargets = useMemo(
    () =>
      shieldRegistry.configuredEntries.filter(
        (entry) => entry.asset.executable,
      ),
    [shieldRegistry.configuredEntries],
  );
  const {
    assets: executableSourceAssets,
    error: publicAssetsError,
    loading: publicAssetsLoading,
  } = useWalletPublicAssets({
    solBalance,
    solBalanceError,
    solBalanceFetching,
    walletAddress,
  });

  const selectedSourceAsset = useMemo(
    () => {
      const selectedAsset =
        executableSourceAssets.find((asset) => asset.id === selectedSourceAssetId) ?? null;

      if (selectedAsset?.balanceStatus === "ready") {
        return selectedAsset;
      }

      return (
        executableSourceAssets.find((asset) => asset.balanceStatus === "ready" && asset.balance > 0) ??
        selectedAsset ??
        executableSourceAssets[0] ??
        null
      );
    },
    [executableSourceAssets, selectedSourceAssetId],
  );

  useEffect(() => {
    if (selectedSourceAsset?.id === selectedSourceAssetId) {
      return;
    }

    if (selectedSourceAsset) {
      setSelectedSourceAssetId(selectedSourceAsset.id);
    }
  }, [selectedSourceAsset, selectedSourceAssetId]);

  const selectedRegistryEntry = useMemo(() => {
    if (!executableShieldTargets.length) {
      return null;
    }

    if (!selectedSourceAsset) {
      return executableShieldTargets[0] ?? null;
    }

    return selectUniversalShieldTarget({
      configuredEntries: executableShieldTargets,
      sourceAsset: selectedSourceAsset,
    });
  }, [executableShieldTargets, selectedSourceAsset]);
  const configuredSelectedShieldAsset = selectedRegistryEntry?.asset ?? null;
  const selectedVaultOwnerResolution = useMemo(
    () =>
      resolveUserVaultOwner({
        configuredVaultOwner: configuredSelectedShieldAsset?.vaultOwner ?? null,
        walletAddress,
      }),
    [configuredSelectedShieldAsset?.vaultOwner, walletAddress],
  );
  const selectedShieldAsset = useMemo(
    () =>
      configuredSelectedShieldAsset
        ? {
            ...configuredSelectedShieldAsset,
            vaultOwner: selectedVaultOwnerResolution.liveDepositEnabled
              ? selectedVaultOwnerResolution.vaultOwner
              : null,
          }
        : null,
    [configuredSelectedShieldAsset, selectedVaultOwnerResolution],
  );
  const shieldAccount = selectedRegistryEntry?.account ?? null;
  const shieldStateError = selectedRegistryEntry?.error ?? null;
  const shieldStateReady = selectedRegistryEntry?.isReady ?? false;
  const shieldStateRefreshing = selectedRegistryEntry?.isRefreshing ?? false;
  const refreshShieldState =
    selectedRegistryEntry?.refresh ?? (async (_options?: { signatureHint?: string | null }) => {});
  const supportedToken = selectedRegistryEntry?.token ?? null;
  const publicBalance = selectedRegistryEntry?.publicBalance ?? 0;
  const shieldedBalance = shieldAccount?.balance ?? 0;
  const isNativeSolShield = selectedSourceAsset?.kind === "native" && selectedSourceAsset.symbol === "SOL";
  const nativeSolShieldSourceEntry = useMemo(
    () =>
      shieldRegistry.entries.find((entry) => (entry.account?.shieldedSolBalance ?? 0) > 0) ??
      shieldRegistry.entries.find(
        (entry) => (entry.account?.spendableShieldedSolNotes.length ?? 0) > 0,
      ) ??
      null,
    [shieldRegistry.entries],
  );
  const nativeSolShieldAccount = nativeSolShieldSourceEntry?.account ?? shieldAccount;
  const targetShieldStateError = isNativeSolShield
    ? nativeSolShieldSourceEntry?.error ?? shieldStateError
    : shieldStateError;
  const targetShieldStateRefreshing = isNativeSolShield
    ? nativeSolShieldSourceEntry?.isRefreshing ?? shieldStateRefreshing
    : shieldStateRefreshing;
  const capability = useMemo(
    () =>
      createShieldAssetCapability({
        isNativeSolShield,
        selectedShieldAsset,
        selectedSourceAsset,
      }),
    [isNativeSolShield, selectedShieldAsset, selectedSourceAsset],
  );
  const targetShieldSymbol = capability.targetShieldAsset?.assetKey;
  const targetShieldName = capability.targetShieldAsset?.name;
  const targetShieldedBalance = isNativeSolShield
    ? nativeSolShieldAccount?.shieldedSolBalance ?? 0
    : shieldedBalance;
  const pendingNativeSolShieldEvidenceBalance = isNativeSolShield
    ? Number(
        (nativeSolShieldAccount?.shieldedSolNotes ?? [])
          .filter(isPendingNativeSolShieldStateNote)
          .reduce((sum, note) => sum + note.amount, 0)
          .toFixed(9),
      )
    : 0;
  const hasPendingNativeSolShieldEvidence = pendingNativeSolShieldEvidenceBalance > 0;
  const targetShieldedBalanceReadUnavailable =
    Boolean(walletConnected && capability.targetShieldAsset) &&
    (supportedToken?.status === "error" || Boolean(targetShieldStateError));
  const latestRecoverableSolDeposit = recoverableSolDeposits[0] ?? null;
  const nativeSolShieldBlockedByRecoverableDeposit =
    isNativeSolShield && Boolean(latestRecoverableSolDeposit);

  const clearShieldStateHydrationRetries = useCallback(() => {
    if (typeof window !== "undefined") {
      for (const timeoutId of shieldStateHydrationTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
    }

    shieldStateHydrationTimeoutsRef.current = [];
  }, []);

  const refreshNativeSolShieldState = useCallback(async ({
    signatureHint,
    vaultOwner,
  }: {
    signatureHint?: string | null;
    vaultOwner: string | null;
  }) => {
    const refreshes = new Set([
      refreshShieldState,
      ...shieldRegistry.entries
        .filter((entry) => entry.asset.vaultOwner === vaultOwner)
        .map((entry) => entry.refresh),
    ]);

    await Promise.all(
      [...refreshes].map((refresh) =>
        refresh({ signatureHint }).catch(() => undefined),
      ),
    );
  }, [refreshShieldState, shieldRegistry.entries]);

  const queueShieldStateHydrationRetries = useCallback((
    signatureHint?: string | null,
    nativeSolVaultOwner?: string | null,
  ) => {
    clearShieldStateHydrationRetries();
    const refreshHydrationState = () =>
      nativeSolVaultOwner
        ? refreshNativeSolShieldState({
            signatureHint,
            vaultOwner: nativeSolVaultOwner,
          })
        : refreshShieldState({ signatureHint });

    if (typeof window === "undefined" || typeof window.setTimeout !== "function") {
      void refreshHydrationState().catch(() => undefined);
      return;
    }

    for (const delayMs of SHIELD_STATE_HYDRATION_RETRY_DELAYS_MS) {
      const timeoutId = window.setTimeout(() => {
        shieldStateHydrationTimeoutsRef.current =
          shieldStateHydrationTimeoutsRef.current.filter(
            (queuedTimeoutId) => queuedTimeoutId !== timeoutId,
          );
        void refreshHydrationState().catch(() => undefined);
      }, delayMs);

      shieldStateHydrationTimeoutsRef.current.push(timeoutId);
    }
  }, [
    clearShieldStateHydrationRetries,
    refreshNativeSolShieldState,
    refreshShieldState,
  ]);

  useEffect(() => clearShieldStateHydrationRetries, [clearShieldStateHydrationRetries]);

  // Phase 2: Load non-migrated legacy native SOL notes for migration panel (quarantine pattern)
  // References design doc Phase 2 + getVantaLegacyNativeSolWsolMigrationPolicy
  const loadLegacyNativeSolNotesForMigration = useCallback(() => {
    if (!walletAddress || !selectedShieldAsset?.vaultOwner) {
      setLegacySolNotes([]);
      return;
    }
    const notes = loadNonMigratedLegacyNativeSolShieldNotes({
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    });
    setLegacySolNotes(notes);
  }, [walletAddress, selectedShieldAsset?.vaultOwner]);

  useEffect(() => {
    loadLegacyNativeSolNotesForMigration();
  }, [loadLegacyNativeSolNotesForMigration]);

  // One-time migration handler (concrete Phase 2 flow)
  const handleMigrateLegacySolNote = useCallback(
    async (note: VantaShieldedSolNote) => {
      const noteKey = note.depositSignature || note.noteId;
      setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "migrating" }));
      setLegacyMigrationError(null);

      const policy = getVantaLegacyNativeSolWsolMigrationPolicy();
      console.info("[Phase 2 Migration] Starting legacy WSOL SOL note migration", {
        noteId: note.noteId,
        depositSignature: note.depositSignature,
        policyVersion: policy.version,
        designDoc: "2026-05-14-native-sol-private-pool-v2-integration.md Phase 2 + §9",
      });

      let result = await migrateLegacyVantaShieldedSolNoteToV2({
        legacyNote: note,
      });

      // Automatic one retry for transient "Failed to fetch" / indexer cold-start cases (very common in Phase 2)
      if (!result.success && result.isTransientNetworkError) {
        await new Promise((r) => setTimeout(r, 1200));
        result = await migrateLegacyVantaShieldedSolNoteToV2({ legacyNote: note });
      }

      if (result.success) {
        // Remove from legacy quarantine store (now in v2 unified tree via sentinel commitment)
        const removed = removeLegacyNativeSolShieldNoteAfterMigration({
          depositSignature: note.depositSignature || "",
          owner: note.owner,
          vaultOwner: note.vaultOwner,
        });
        setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "success" }));
        // Refresh list + shield state (now should hydrate from v2 indexer in future fetches)
        loadLegacyNativeSolNotesForMigration();
        void refreshNativeSolShieldState({ signatureHint: note.depositSignature, vaultOwner: note.vaultOwner }).catch(() => undefined);

        // Optional: surface phase1MigrationNote from server
        if (result.phase1MigrationNote) {
          console.info("Server migration note:", result.phase1MigrationNote);
        }
        // Auto-hide panel after all migrated (or leave for multi-note)
        setTimeout(() => {
          if (legacySolNotes.length <= 1) setShowLegacyMigrationPanel(false);
        }, 1500);
      } else {
        setLegacyMigrationStatus((prev) => ({ ...prev, [noteKey]: "error" }));
        const isTransient = result.isTransientNetworkError;
        const errMsg = result.error || "Migration failed (see console). Re-shield recommended as fallback per design doc.";
        setLegacyMigrationError(errMsg);

        if (isTransient) {
          console.warn("[Phase 2 Migration] Transient indexer network error (will keep offering retry + re-shield)", result);
        } else {
          console.warn("[Phase 2 Migration] Failed (fail-closed, legacy note preserved)", result);
        }
      }
    },
    [loadLegacyNativeSolNotesForMigration, legacySolNotes.length, refreshNativeSolShieldState],
  );

  // Bulk "Migrate all" for users with many legacy notes (e.g. 18 pre-v2)
  // Sequentially calls the per-note handler with small delay to be polite to the operator.
  // Updates happen live via the status map and list refresh inside the per-note handler.
  const handleMigrateAllLegacyNotes = useCallback(async () => {
    if (!walletConnected || legacySolNotes.length === 0 || isMigratingAll) return;

    setIsMigratingAll(true);
    setLegacyMigrationError(null);

    const pendingNotes = legacySolNotes.filter((note) => {
      const key = note.depositSignature || note.noteId;
      const st = legacyMigrationStatus[key];
      return st !== "success" && st !== "migrating";
    });

    for (let i = 0; i < pendingNotes.length; i++) {
      const note = pendingNotes[i];
      try {
        await handleMigrateLegacySolNote(note);
        if (i < pendingNotes.length - 1) {
          await new Promise((r) => setTimeout(r, 300)); // be nice to the ingestion endpoint
        }
      } catch (err) {
        console.error("[Bulk Migration] One note failed, continuing with the rest", err);
        // continue — fail-closed per note (the per-note handler already does one retry on transient network errors)
      }
    }

    setIsMigratingAll(false);
  }, [walletConnected, legacySolNotes, legacyMigrationStatus, handleMigrateLegacySolNote, isMigratingAll]);

  useEffect(() => {
    if (!isNativeSolShield || !walletAddress || !selectedShieldAsset?.vaultOwner) {
      setRecoverableSolDeposits([]);
      setRecoverableSolDepositsError(null);
      setRecoverableSolDepositsLoading(false);
      return;
    }

    let cancelled = false;
    const existingDepositSignatures = new Set([
      (nativeSolShieldAccount?.shieldedSolNotes ?? [])
        .map((note) => note.depositSignature)
        .filter((signature): signature is string => typeof signature === "string" && signature.length > 0),
      ...loadVerifiedNativeSolShieldDepositSignatures({
        owner: walletAddress,
        vaultOwner: selectedShieldAsset.vaultOwner,
      }),
    ].flat());

    setRecoverableSolDepositsLoading(true);
    setRecoverableSolDepositsError(null);

    fetchNativeSolShieldDepositCandidates({
      existingDepositSignatures,
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    })
      .then((deposits) => {
        if (!cancelled) {
          setRecoverableSolDeposits(deposits);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecoverableSolDeposits([]);
          setRecoverableSolDepositsError(toRecoverableSolDepositsErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecoverableSolDepositsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isNativeSolShield,
    nativeSolShieldAccount?.shieldedSolNotes,
    selectedShieldAsset?.vaultOwner,
    walletAddress,
  ]);

  useEffect(() => {
    if (
      !recentShield ||
      recentShield.claimTier !== "proof_receipt_verified" ||
      recentShield.asset !== "SOL" ||
      !walletAddress
    ) {
      return;
    }

    const depositSignature =
      recentShield.depositSignature ??
      recentShield.protocolSettlementReceipt?.depositSignature ??
      null;
    const stateSignature =
      recentShield.signature ??
      recentShield.protocolSettlementReceipt?.stateSignature ??
      null;
    const vaultOwner =
      recentShield.protocolSettlementReceipt?.vaultOwner ??
      selectedShieldAsset?.vaultOwner ??
      null;

    if (!depositSignature || !stateSignature || !vaultOwner) {
      return;
    }

    const expectedReceiptBalance = recentShield.resultingShieldedBalance;
    const receiptHydrationMissing =
      Number.isFinite(expectedReceiptBalance) &&
      targetShieldedBalance + 0.000000001 < expectedReceiptBalance;
    const repairKey = `${walletAddress}:${vaultOwner}:${depositSignature}:${
      receiptHydrationMissing ? "missing" : "hydrated"
    }`;

    if (repairedNativeSolReceiptRef.current === repairKey) {
      return;
    }

    repairedNativeSolReceiptRef.current = repairKey;

    const repaired = repairVerifiedNativeSolShieldNote({
      amount: recentShield.amount,
      createdAt: recentShield.timestamp,
      depositSignature,
      owner: walletAddress,
      stateSignature,
      vaultOwner,
    });

    if (repaired || receiptHydrationMissing) {
      void refreshNativeSolShieldState({ signatureHint: stateSignature, vaultOwner }).catch(
        () => undefined,
      );
    }
  }, [
    recentShield,
    refreshNativeSolShieldState,
    selectedShieldAsset?.vaultOwner,
    targetShieldedBalance,
    walletAddress,
  ]);

  useEffect(() => {
    if (
      status !== "complete" ||
      recentShield?.asset !== "SOL" ||
      recentShield.claimTier !== "public_vault_deposit" ||
      !isMissingBrowserCommittedShieldReceiptDepositSignatureWarning(flowError)
    ) {
      return;
    }

    setRecentShield(null);
    setFlowError(null);
    setStatus("recovery_recorded");
  }, [flowError, recentShield, setRecentShield, status]);

  const publicRouteTransaction = useVantaSafeSendTransaction();
  const splShieldTransferTransaction = useVantaSafeSendTransaction();
  const splShieldTransferWait = useRealtimeSignatureProgress(
    splShieldTransferTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !splShieldTransferTransaction.signature,
    },
  );
  const nativeSolShieldTransaction = useVantaSafeSendTransaction();
  const nativeSolShieldWait = useRealtimeSignatureProgress(
    nativeSolShieldTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !nativeSolShieldTransaction.signature,
    },
  );
  const publicRouteWait = useRealtimeSignatureProgress(
    publicRouteTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !publicRouteTransaction.signature,
    },
  );
  const parsedAmount = Number(amount);
  const sourceBalance = selectedSourceAsset?.balance ?? 0;
  const selectedSourceBalanceStatus = selectedSourceAsset?.balanceStatus ?? "ready";
  const selectedSourceBalanceUnavailable = selectedSourceBalanceStatus !== "ready";
  const maxAvailableAmount = isNativeSolShield
    ? Math.max(sourceBalance - NATIVE_SOL_SHIELD_FEE_RESERVE_SOL, 0)
    : sourceBalance;
  const routeProgressLabel = publicRouteWait.detailLabel;
  const sourceAssetsLoading = publicAssetsLoading && !selectedSourceAsset;
  const sourceAssetsBlocked = Boolean(publicAssetsError) && !selectedSourceAsset;
  const isAmountValid =
    walletConnected &&
    (isNativeSolShield ? !!selectedShieldAsset?.vaultOwner : !!selectedShieldAsset?.mintAddress) &&
    !!selectedShieldAsset?.vaultOwner &&
    !!viewingKey?.publicKey &&
    !!selectedSourceAsset &&
    !selectedSourceBalanceUnavailable &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxAvailableAmount &&
    !nativeSolShieldBlockedByRecoverableDeposit;
  const sourceSelectValue = selectedSourceAsset?.id ?? "";
  const sourceSelectDisabled =
    !walletConnected || sourceAssetsLoading || executableSourceAssets.length === 0;
  const sourcePlaceholderLabel = !walletConnected
    ? "Connect wallet"
    : sourceAssetsLoading
      ? "Loading assets..."
      : sourceAssetsBlocked
        ? "Balance recovery unavailable"
        : "No wallet assets available";
  const sourceBalanceLabel = selectedSourceAsset
    ? selectedSourceBalanceStatus === "loading"
      ? "Loading..."
      : selectedSourceBalanceStatus === "error"
        ? "Temporarily unavailable"
        : formatAssetAmount(sourceBalance, selectedSourceAsset.symbol)
    : sourcePlaceholderLabel;
  const targetShieldedBalanceLabel = !walletConnected
    ? "Connect wallet"
    : !capability.targetShieldAsset
      ? "Choose asset"
    : (!isNativeSolShield &&
          ((supportedToken?.status === "loading" || supportedToken?.isFetching) ||
            targetShieldStateRefreshing)) ||
        (isNativeSolShield && targetShieldStateRefreshing && targetShieldedBalance <= 0)
      ? "Loading..."
      : isNativeSolShield
        ? formatVantaSolAmount(targetShieldedBalance)
        : targetShieldSymbol
          ? formatAssetAmount(targetShieldedBalance, targetShieldSymbol)
        : "Choose asset";
  const sourceAssetPickerOptions = useMemo<AssetPickerGridOption[]>(
    () =>
      executableSourceAssets.map((asset) => {
        const loading = asset.balanceStatus === "loading";
        const unavailable = asset.balanceStatus === "error";
        const balanceLabel = loading
          ? "Loading..."
          : unavailable
            ? "Temporarily unavailable"
            : formatAssetAmount(asset.balance, asset.symbol);

        return {
          balanceLabel,
          disabled: !walletConnected || loading || unavailable,
          disabledReason: !walletConnected
            ? "Connect wallet"
            : loading
              ? "Loading balance"
              : unavailable
                ? "Balance recovery unavailable"
                : undefined,
          id: asset.id,
          label: formatShieldSourceAssetOptionLabel(asset),
          loading,
          name: asset.label,
          statusLabel: loading ? "Loading" : unavailable ? "Unavailable" : asset.balance > 0 ? "Ready" : "No balance",
          symbol: asset.symbol,
        };
      }),
    [executableSourceAssets, walletConnected],
  );
  const shieldTargetAssetPickerOptions = useMemo<AssetPickerGridOption[]>(
    () => [
      {
        balanceLabel: targetShieldedBalanceLabel,
        disabled: !capability.targetShieldAsset || !selectedShieldAsset?.vaultOwner,
        disabledReason: !walletConnected
          ? "Connect wallet"
          : !capability.targetShieldAsset
            ? "No configured target"
            : !selectedShieldAsset?.vaultOwner
              ? "Vault owner unavailable"
              : undefined,
        id: capability.targetShieldAsset?.assetKey ?? "no-shield-target",
        label: isNativeSolShield
          ? "Shielded SOL"
          : capability.targetShieldAsset?.label ?? "Shielded asset",
        loading: targetShieldedBalanceLabel === "Loading...",
        name: targetShieldName ?? (walletConnected ? "Automatic shield target" : "Connect wallet"),
        statusLabel: selectedShieldAsset?.vaultOwner ? "Automatic target" : "Unavailable",
        symbol: capability.targetShieldAsset?.assetKey ?? "Vanta",
      },
    ],
    [
      capability.targetShieldAsset,
      isNativeSolShield,
      selectedShieldAsset?.vaultOwner,
      targetShieldName,
      targetShieldedBalanceLabel,
      walletConnected,
    ],
  );

  async function beginShieldTransfer(
    amountDisplay: string,
    amountNumeric: number,
    routeEvidence: PublicShieldRouteEvidence | null = null,
  ) {
    if (!walletAddress || !selectedShieldAsset?.mintAddress || !selectedShieldAsset?.vaultOwner) {
      throw new Error("Shield target is not configured.");
    }

    const ownerContext = await shieldOwnerContext.ensureOwnerContext();

    setPendingShieldAmount(amountNumeric);
    setPendingShieldAmountDisplay(amountDisplay);
    const shieldMemoCreatedAt = Date.now();
    setPendingShieldMemoCreatedAt(shieldMemoCreatedAt);
    setPendingDepositSignature(null);
    setPendingShieldAsset(selectedShieldAsset.assetKey);
    setPendingShieldTarget(selectedShieldAsset);
    setPendingShieldOwnerContext(ownerContext);
    setPendingProtocolSettlement({ capability, routeEvidence });
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraShieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(amountDisplay, selectedShieldAsset.decimals),
        destinationAddress: selectedShieldAsset.vaultOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: selectedShieldAsset.mintAddress,
        requester: walletAddress,
      }),
    );
    setStatus("awaiting_wallet_confirmation");

    const transferInstructions = await buildSplTokenShieldTransferInstructions({
      amount: amountDisplay,
      decimals: selectedShieldAsset.decimals,
      mintAddress: selectedShieldAsset.mintAddress,
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    });
    const instructions = [
      ...transferInstructions,
      createShieldMemoInstruction(
        {
          amount: amountDisplay,
          asset: selectedShieldAsset.assetKey,
          createdAt: shieldMemoCreatedAt,
          depositSignature: VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
          mintAddress: selectedShieldAsset.mintAddress,
          owner: walletAddress,
          vaultOwner: selectedShieldAsset.vaultOwner,
        },
        { viewingPublicKey: viewingKey?.publicKey },
      ),
    ];

    await splShieldTransferTransaction.send({
      amount: amountDisplay,
      asset: selectedShieldAsset.assetKey,
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
      connectedWalletAddress: walletAddress,
      estimatedFees: "wallet-estimated",
      feePayer: walletAddress,
      humanApprovedSummary: true,
      instructions,
      label: "shield-spl-token-transfer",
      recipient: selectedShieldAsset.vaultOwner,
      summaryInstructions: [
        "ensure-vault-associated-token-account",
        "shield-spl-token-transfer",
        "shield-state-memo",
      ],
      transactionFingerprint: `shield-spl-token-transfer:${walletAddress}:${selectedShieldAsset.mintAddress}:${selectedShieldAsset.vaultOwner}:${amountDisplay}`,
    });
  }

  async function beginNativeSolShieldTransfer(amountDisplay: string, amountNumeric: number) {
    if (!walletAddress || !selectedSourceAsset?.mintAddress || !selectedShieldAsset?.vaultOwner) {
      throw new Error("Native SOL shield target is not configured.");
    }

    setPendingShieldAmount(amountNumeric);
    setPendingShieldAmountDisplay(amountDisplay);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset("SOL");
    setPendingShieldTarget(selectedShieldAsset);
    setPendingProtocolSettlement({ capability, routeEvidence: null });
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraShieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(amountDisplay, 9),
        destinationAddress: selectedShieldAsset.vaultOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: selectedSourceAsset.mintAddress,
        requester: walletAddress,
      }),
    );
    setStatus("awaiting_wallet_confirmation");

    await assertNativeSolShieldSourceAccountReady({
      amountDisplay,
      knownLamportsBalance: lamportsBalance,
      owner: walletAddress,
    });

    const instructions = [
      ...buildNativeSolShieldTransferInstructions({
        amount: amountDisplay,
        owner: walletAddress,
        vaultOwner: selectedShieldAsset.vaultOwner,
      }),
      createNativeSolShieldMemoInstruction(
        {
          amount: amountDisplay,
          assetId: VANTA_NATIVE_SOL_ASSET_ID,
          createdAt: Date.now(),
          depositSignature: VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
          owner: walletAddress,
          vaultOwner: selectedShieldAsset.vaultOwner,
        },
        { viewingPublicKey: viewingKey?.publicKey },
      ),
    ];

    await nativeSolShieldTransaction.send({
      amount: amountDisplay,
      asset: "SOL",
      cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
      connectedWalletAddress: walletAddress,
      estimatedFees: "wallet-estimated",
      feePayer: walletAddress,
      humanApprovedSummary: true,
      instructions,
      label: "shield-native-sol",
      recipient: selectedShieldAsset.vaultOwner,
      summaryInstructions: ["native-sol-shield-transfer", "shield-state-memo"],
      transactionFingerprint: `shield-native-sol:${walletAddress}:${selectedShieldAsset.vaultOwner}:${amountDisplay}`,
    });
  }

  function recordSameSessionNativeSolShieldDeposit(deposit: NativeSolShieldDepositCandidate) {
    if (!walletAddress || !selectedShieldAsset?.vaultOwner) {
      return false;
    }

    const activeShieldTarget = selectedShieldAsset;
    const activeVaultOwner = selectedShieldAsset.vaultOwner;
    if (!activeVaultOwner) {
      return false;
    }
    const isActiveSameSessionShield =
      deposit.signature === nativeSolShieldTransaction.signature ||
      deposit.signature === pendingDepositSignature ||
      (recentShield?.asset === "SOL" &&
        (deposit.signature === recentShield.signature ||
          deposit.signature === recentShield.depositSignature));

    if (!isActiveSameSessionShield) {
      return false;
    }

    const sameSessionAmount =
      pendingShieldAmount ??
      (recentShield?.asset === "SOL" ? recentShield.amount : null);
    const amountMatches =
      sameSessionAmount !== null &&
      Number.isFinite(sameSessionAmount) &&
      Math.abs(sameSessionAmount - deposit.amount) <= 0.000000001;
    const refreshSameSessionShieldState = () => {
      void refreshNativeSolShieldState({
        signatureHint: deposit.signature,
        vaultOwner: activeVaultOwner,
      }).catch(() => undefined);
      queueShieldStateHydrationRetries(deposit.signature, activeVaultOwner);
    };

    setRecoverableSolDeposits((deposits) =>
      deposits.filter((candidate) => candidate.signature !== deposit.signature),
    );
    setPendingDepositSignature(deposit.signature);
    setPendingShieldAsset("SOL");
    setPendingShieldTarget(activeShieldTarget);
    setFlowError(null);

    if (!amountMatches || sameSessionAmount === null) {
      setStatus("entering_shielded_state");
      refreshSameSessionShieldState();
      return true;
    }

    const recordedAt = Date.now();
    recordVerifiedNativeSolShieldNote({
      amount: sameSessionAmount,
      createdAt: recordedAt,
      depositSignature: deposit.signature,
      owner: walletAddress,
      stateSignature: deposit.signature,
      vaultOwner: activeVaultOwner,
    });

    // Phase 2: Submit sentinel-based Poseidon commitment to Private Pool v2 ingestion endpoint
    // This makes the native SOL note first-class in the unified v2 tree (see design doc Phase 2)
    try {
      const commitment = computeNativeSolShieldPoseidonCommitment({
        amountLamports: solToLamports(sameSessionAmount.toString()),
        owner: walletAddress,
        // In production, derive proper blinding from viewing key + note secret
        blinding: 0n,
        derivationTag: 0n,
      });

      // TODO: Get the actual memo string that was sent (from createNativeSolShieldMemoInstruction)
      const depositMemo = `vanta:native-sol-shield-note:v2:${JSON.stringify({
        kind: "native_sol_shield",
        asset: "SOL",
        assetId: NATIVE_SOL_ASSET_ID_SENTINEL,
        amount: sameSessionAmount.toString(),
        owner: walletAddress,
        vaultOwner: activeVaultOwner,
        createdAt: recordedAt,
        depositSignature: deposit.signature,
      })}`;

      // Phase 2: Submit sentinel-based Poseidon commitment to Private Pool v2 ingestion (non-blocking)
      // Polished WIP: uses same default as migrateLegacy helper. See design doc Phase 2.
      void (async () => {
        try {
          // Use indexer for native SOL ingestion (operator URL was wrong → caused "Failed to fetch")
          const defaultBase = "https://vanta-prod-private-pool-v2-indexer.onrender.com";
          const baseUrl = defaultBase; // TODO: centralize via privatePoolV2ProtocolSettlementClient or env
          await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/ingest-native-sol-shield-deposit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              depositMemo,
              depositSignature: deposit.signature,
              commitment,
              owner: walletAddress,
              vaultOwner: activeVaultOwner,
              amount: sameSessionAmount.toString(),
              treeId: "vanta-private-pool-v2-unified-tree-v1",
            }),
          });
        } catch (e) {
          console.warn("Native SOL v2 ingestion submission failed (non-fatal for Phase 2, per design doc):", e);
        }
      })();
    } catch (e) {
      console.warn("Failed to compute/submit native SOL v2 commitment:", e);
    }
    setRecentShield({
      amount: sameSessionAmount,
      asset: "SOL",
      claimTier: "local_shield_state",
      depositSignature: deposit.signature,
      resultingShieldedBalance: Number((targetShieldedBalance + sameSessionAmount).toFixed(9)),
      settlement: "confirmed_deposit",
      signature: deposit.signature,
      source: "shield",
      timestamp: recordedAt,
    });
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingShieldTarget(null);
    setPendingProtocolSettlement(null);
    setPendingUmbraApprovalDisplay(null);
    setStatus("complete");
    refreshSameSessionShieldState();
    return true;
  }

  function beginNativeSolShieldDepositRecovery(deposit: NativeSolShieldDepositCandidate) {
    if (!walletAddress || !selectedSourceAsset?.mintAddress || !selectedShieldAsset?.vaultOwner) {
      throw new Error("Native SOL shield recovery target is not configured.");
    }

    if (recordSameSessionNativeSolShieldDeposit(deposit)) {
      return;
    }

    recordRecoveredNativeSolShieldNote({
      deposit,
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    });
    setRecoverableSolDeposits((deposits) =>
      deposits.filter((candidate) => candidate.signature !== deposit.signature),
    );
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingShieldTarget(null);
    setPendingProtocolSettlement(null);
    setPendingUmbraApprovalDisplay(null);
    setRecentShield(null);
    setFlowError(null);
    setStatus("recovery_recorded");
    void refreshNativeSolShieldState({
      signatureHint: deposit.signature,
      vaultOwner: selectedShieldAsset.vaultOwner,
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (nativeSolShieldTransaction.status === "loading") {
      setStatus("shielding_in_progress");
      return;
    }

    if (nativeSolShieldTransaction.status === "error") {
      setStatus("failed");
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingShieldMemoCreatedAt(null);
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingShieldTarget(null);
      setPendingPublicRoute(null);
      setPendingUmbraApprovalDisplay(null);
      setFlowError(
        toErrorMessage(nativeSolShieldTransaction.error, "The native SOL shield transfer could not be completed."),
      );
      return;
    }

    if (nativeSolShieldTransaction.status === "success" && nativeSolShieldTransaction.signature) {
      setStatus("entering_shielded_state");
      setPendingDepositSignature(nativeSolShieldTransaction.signature);
      if (
        selectedShieldAsset?.vaultOwner &&
        queuedNativeSolHydrationSignatureRef.current !== nativeSolShieldTransaction.signature
      ) {
        queuedNativeSolHydrationSignatureRef.current = nativeSolShieldTransaction.signature;
        void refreshNativeSolShieldState({
          signatureHint: nativeSolShieldTransaction.signature,
          vaultOwner: selectedShieldAsset.vaultOwner,
        }).catch(() => undefined);
        queueShieldStateHydrationRetries(
          nativeSolShieldTransaction.signature,
          selectedShieldAsset.vaultOwner,
        );
      }
    }
  }, [
    nativeSolShieldTransaction.error,
    nativeSolShieldTransaction.signature,
    nativeSolShieldTransaction.status,
    queueShieldStateHydrationRetries,
    refreshNativeSolShieldState,
    selectedShieldAsset?.vaultOwner,
  ]);

  useEffect(() => {
    if (splShieldTransferTransaction.status === "loading") {
      setStatus("shielding_in_progress");
      return;
    }

    if (splShieldTransferTransaction.status === "error") {
      setStatus("failed");
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingShieldMemoCreatedAt(null);
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingShieldTarget(null);
      setPendingPublicRoute(null);
      setPendingUmbraApprovalDisplay(null);
      setFlowError(
        toErrorMessage(splShieldTransferTransaction.error, "The shield transfer could not be completed."),
      );
      return;
    }

    if (splShieldTransferTransaction.status === "success" && splShieldTransferTransaction.signature) {
      const depositSignature = splShieldTransferTransaction.signature;
      const activeShieldTarget = pendingShieldTarget ?? selectedShieldAsset;
      if (
        recordedTokenDepositSignatureRef.current !== depositSignature &&
        pendingShieldAsset !== "SOL" &&
        pendingShieldAmount !== null &&
        activeShieldTarget?.mintAddress &&
        activeShieldTarget.vaultOwner &&
        walletAddress
      ) {
        recordedTokenDepositSignatureRef.current = depositSignature;
        const timestamp = Date.now();
        recordRecentShieldTokenNote({
          amount: pendingShieldAmount,
          asset: activeShieldTarget.assetKey,
          createdAt: timestamp,
          depositSignature,
          mintAddress: activeShieldTarget.mintAddress,
          owner: walletAddress,
          stateSignature: `local-token-deposit:${depositSignature}`,
          vaultOwner: activeShieldTarget.vaultOwner,
        });
        setRecentShield({
          amount: pendingShieldAmount,
          asset: activeShieldTarget.assetKey,
          claimTier: "public_vault_deposit",
          depositSignature,
          resultingShieldedBalance: Number(
            ((activeShieldTarget.assetKey === targetShieldSymbol ? targetShieldedBalance : 0) +
              pendingShieldAmount).toFixed(activeShieldTarget.decimals),
          ),
          settlement: "confirmed_deposit",
          signature: `local-token-deposit:${depositSignature}`,
          source: "shield",
          timestamp,
        });
      }
      setStatus("entering_shielded_state");
      setPendingDepositSignature(splShieldTransferTransaction.signature);
    }
  }, [
    splShieldTransferTransaction.error,
    splShieldTransferTransaction.signature,
    splShieldTransferTransaction.status,
    pendingShieldAmount,
    pendingShieldAsset,
    pendingShieldTarget,
    selectedShieldAsset,
    setRecentShield,
    targetShieldSymbol,
    targetShieldedBalance,
    walletAddress,
  ]);

  useEffect(() => {
    if (publicRouteTransaction.status === "loading") {
      setStatus("routing_public_swap");
      return;
    }

    if (publicRouteTransaction.status === "error") {
      setStatus("failed");
      setPendingPublicRoute(null);
      setFlowError(
        toErrorMessage(
          publicRouteTransaction.error,
          "The public route into the shield asset could not be submitted.",
        ),
      );
    }
  }, [publicRouteTransaction.error, publicRouteTransaction.status]);

  useEffect(() => {
    if (
      !pendingPublicRoute ||
      publicRouteWait.waitStatus !== "error" ||
      isSolanaRpcRateLimitError(publicRouteWait.waitError) ||
      isSolanaRpcHttpAccessError(publicRouteWait.waitError)
    ) {
      return;
    }

    setStatus("failed");
    setPendingPublicRoute(null);
    setFlowError(
      toErrorMessage(
        publicRouteWait.waitError,
        "The public route was submitted but not confirmed.",
      ),
    );
  }, [pendingPublicRoute, publicRouteWait.waitError, publicRouteWait.waitStatus]);

  useEffect(() => {
    if (
      !pendingPublicRoute ||
      !isConfirmedSignatureStage(publicRouteWait.stage) ||
      !supportedToken
    ) {
      return;
    }

    void supportedToken
      .refresh()
      .then(async (refreshedBalance) => {
        const nextTargetBalance = Number(refreshedBalance?.uiAmount ?? "0");
        const routedAmount = Number(
          Math.max(nextTargetBalance - pendingPublicRoute.previousTargetBalance, 0).toFixed(6),
        );
        const resultingAmount =
          routedAmount > 0 ? routedAmount : Number(pendingPublicRoute.quote.outputAmount);

        if (!Number.isFinite(resultingAmount) || resultingAmount <= 0) {
          throw new Error("The routed shield asset amount could not be determined.");
        }

        setPendingPublicRoute(null);
        await beginShieldTransfer(
          formatEditableAmount(resultingAmount, selectedShieldAsset?.decimals ?? 6),
          resultingAmount,
          createPublicShieldRouteEvidence({
            quote: pendingPublicRoute.quote,
            routeSignature: publicRouteTransaction.signature ?? "",
            targetAmount: formatEditableAmount(resultingAmount, selectedShieldAsset?.decimals ?? 6),
          }),
        );
      })
      .catch((error) => {
        setStatus("failed");
        setPendingPublicRoute(null);
        setFlowError(
          toErrorMessage(
            error,
            "The routed balance could not be prepared for shielding.",
          ),
        );
      });
  }, [
    beginShieldTransfer,
    pendingPublicRoute,
    publicRouteWait.stage,
    publicRouteTransaction.signature,
    selectedShieldAsset?.decimals,
    supportedToken,
  ]);

  useEffect(() => {
    if (
      nativeSolShieldWait.waitStatus !== "error" ||
      isSolanaRpcRateLimitError(nativeSolShieldWait.waitError) ||
      isSolanaRpcHttpAccessError(nativeSolShieldWait.waitError)
    ) {
      return;
    }

    setStatus("failed");
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingShieldTarget(null);
    setPendingProtocolSettlement(null);
    setPendingUmbraApprovalDisplay(null);
    setFlowError(
      toErrorMessage(
        nativeSolShieldWait.waitError,
        "The native SOL shield transfer was submitted but not confirmed.",
      ),
    );
  }, [nativeSolShieldWait.waitError, nativeSolShieldWait.waitStatus]);

  useEffect(() => {
    if (
      splShieldTransferWait.waitStatus !== "error" ||
      isSolanaRpcRateLimitError(splShieldTransferWait.waitError) ||
      isSolanaRpcHttpAccessError(splShieldTransferWait.waitError)
    ) {
      return;
    }

    setStatus("failed");
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingShieldTarget(null);
    setFlowError(
      toErrorMessage(
        splShieldTransferWait.waitError,
        "The shield transfer was submitted but not confirmed.",
      ),
    );
  }, [splShieldTransferWait.waitError, splShieldTransferWait.waitStatus]);

  useEffect(() => {
    const activeStateSignature =
      pendingShieldAsset === "SOL"
        ? nativeSolShieldTransaction.signature
        : splShieldTransferTransaction.signature;
    const activeDepositSignature = pendingDepositSignature ?? activeStateSignature;
    const stateRecorded =
      pendingShieldAsset === "SOL"
        ? isConfirmedSignatureStage(nativeSolShieldWait.stage)
        : isConfirmedSignatureStage(splShieldTransferWait.stage);
    const activeShieldTarget = pendingShieldTarget ?? selectedShieldAsset;
    const activeShieldEntry =
      activeShieldTarget && pendingShieldAsset !== "SOL"
        ? shieldRegistry.byAssetKey[activeShieldTarget.assetKey]
        : null;
    const activeShieldedBalance =
      pendingShieldAsset === "SOL"
        ? targetShieldedBalance
        : activeShieldEntry?.account?.balance ?? targetShieldedBalance;

    if (
      !stateRecorded ||
      !activeStateSignature ||
      recordedStateSignatureRef.current === activeStateSignature ||
      pendingShieldAmount === null ||
      !pendingShieldAmountDisplay ||
      !pendingShieldOwnerContext ||
      !activeShieldTarget?.vaultOwner ||
      (pendingShieldAsset !== "SOL" && !activeShieldTarget?.mintAddress) ||
      (pendingShieldAsset !== "SOL" && !walletAddress)
    ) {
      return;
    }

    recordedStateSignatureRef.current = activeStateSignature;

    const refreshBeforeCompletion = refreshShieldState({ signatureHint: activeStateSignature });

    void refreshBeforeCompletion
      .then(async () => {
        const zkRecord =
          pendingShieldAsset === "SOL"
            ? null
            : await recordCanonicalShieldFromLiveShield({
                amountDisplay: pendingShieldAmountDisplay,
                amountNumeric: pendingShieldAmount,
                assetSymbol: activeShieldTarget.assetKey,
                createdAt: Date.now(),
                depositSignature: activeDepositSignature ?? undefined,
                mintAddress: activeShieldTarget.mintAddress!,
                owner: walletAddress!,
                ownerContext: pendingShieldOwnerContext,
                stateSignature: activeStateSignature,
                tokenDecimals: activeShieldTarget.decimals,
                vaultOwner: activeShieldTarget.vaultOwner!,
              });

        const privateCoreShield =
          pendingShieldAsset === "USDC"
            ? runPrivateCoreShield({
                amountDisplay: pendingShieldAmountDisplay,
                asset: "USDC",
                sourceLedgerBinding: zkRecord
                  ? ({
                      amountBaseUnits: zkRecord.canonicalNote.amount,
                      asset: "USDC",
                      basis: "canonical-spendable-note-ledger",
                      canonicalCommitment: zkRecord.artifacts.commitment.value,
                      canonicalNullifierBasis: zkRecord.artifacts.nullifierBasis.value,
                      canonicalRoot: zkRecord.insertion.root,
                      depositSignature: activeDepositSignature ?? undefined,
                      mintAddress: activeShieldTarget.mintAddress!,
                      noteStateSignature: activeStateSignature,
                      owner: walletAddress!,
                      source: "live_shield_v1",
                      vaultOwner: activeShieldTarget.vaultOwner!,
                    } satisfies Omit<
                      VantaPrivateCoreLedgerBinding,
                      "privateCoreCommitment" | "privateCoreNullifier" | "privateCoreRoot"
                    >)
                  : null,
              })
            : null;
        if (
          pendingShieldAsset === "SOL" &&
          walletAddress
        ) {
          const nativeSolTransferConfirmed = await verifyNativeSolShieldDepositSignature({
            amountDisplay: pendingShieldAmountDisplay,
            owner: walletAddress,
            signature: activeStateSignature,
            vaultOwner: activeShieldTarget.vaultOwner!,
          });

          if (!nativeSolTransferConfirmed) {
            throw new Error(
              "Shield memo was found, but no matching SOL transfer to the Vanta vault was confirmed.",
            );
          }
        }
        const recentShieldTimestamp = Date.now();
        const splLocalShieldStateNote =
          pendingShieldAsset !== "SOL" &&
          activeDepositSignature &&
          walletAddress
            ? recordVerifiedSplShieldNote({
                amount: pendingShieldAmount,
                amountDisplay: pendingShieldAmountDisplay,
                asset: activeShieldTarget.assetKey,
                createdAt: pendingShieldMemoCreatedAt ?? recentShieldTimestamp,
                depositSignature: activeDepositSignature,
                mintAddress: activeShieldTarget.mintAddress!,
                owner: walletAddress,
                stateSignature: activeStateSignature,
                vaultOwner: activeShieldTarget.vaultOwner!,
              })
            : null;
        const nativeSolLocalShieldStateNote =
          pendingShieldAsset === "SOL" &&
          activeDepositSignature &&
          walletAddress
            ? recordVerifiedNativeSolShieldNote({
                amount: pendingShieldAmount,
                createdAt: recentShieldTimestamp,
                depositSignature: activeDepositSignature,
                owner: walletAddress,
                stateSignature: activeStateSignature,
                vaultOwner: activeShieldTarget.vaultOwner!,
              })
            : null;

        if (nativeSolLocalShieldStateNote) {
          await refreshNativeSolShieldState({
            signatureHint: activeStateSignature,
            vaultOwner: activeShieldTarget.vaultOwner!,
          }).catch(() => undefined);
        }

        const initialClaimTier: RecentShieldContext["claimTier"] =
          privateCoreShield
            ? "local_private_core_note"
            : pendingShieldAsset === "SOL" && nativeSolLocalShieldStateNote
              ? "local_shield_state"
              : pendingShieldAsset === "SOL"
                ? "public_vault_deposit"
                : splLocalShieldStateNote
                  ? "local_shield_state"
                  : "public_vault_deposit";
        const nextBalance = Number(
          (activeShieldedBalance + pendingShieldAmount).toFixed(activeShieldTarget.decimals),
        );
        const recentShieldContext = {
          amount: pendingShieldAmount,
          asset: pendingShieldAsset ?? activeShieldTarget.assetKey,
          claimTier: initialClaimTier,
          depositSignature: activeDepositSignature ?? undefined,
          resultingShieldedBalance: nextBalance,
          settlement: "confirmed_deposit" as const,
          signature: activeStateSignature,
          source: "shield" as const,
          timestamp: recentShieldTimestamp,
          zkBridge:
            pendingShieldAsset === "USDC" && zkRecord
              ? {
                  commitment:
                    privateCoreShield?.sourceNoteCommitment || zkRecord.artifacts.commitment.value,
                  insertionIndex: zkRecord.insertion.index,
                  root: privateCoreShield?.sourceMerkleRoot || zkRecord.insertion.root,
                  source: "canonical_note_v1" as const,
                }
              : undefined,
        };

        if (pendingShieldAsset !== "SOL") {
          recordRecentShieldTokenNote({
            amount: pendingShieldAmount,
            asset: activeShieldTarget.assetKey,
            createdAt: recentShieldTimestamp,
            depositSignature: activeDepositSignature,
            mintAddress: activeShieldTarget.mintAddress!,
            owner: walletAddress!,
            stateSignature: activeStateSignature,
            vaultOwner: activeShieldTarget.vaultOwner!,
          });
        }

        setRecentShield(recentShieldContext);

        if (pendingShieldAsset === "SOL" && nativeSolLocalShieldStateNote) {
          setPendingShieldAmount(null);
          setPendingShieldAmountDisplay(null);
          setPendingShieldMemoCreatedAt(null);
          setPendingDepositSignature(null);
          setPendingShieldAsset(null);
          setPendingShieldTarget(null);
          setPendingProtocolSettlement(null);
          setPendingUmbraApprovalDisplay(null);
          setFlowError(null);
          setStatus("complete");
          void supportedToken?.refresh();
        }

        let protocolSettlement: Awaited<
          ReturnType<typeof requestVantaPrivatePoolV2BrowserShieldReceipt>
        > | null = null;
        let protocolSettlementWarning: string | null = null;

        if (
          pendingProtocolSettlement?.capability.sourceAsset &&
          pendingProtocolSettlement.capability.targetShieldAsset &&
          activeDepositSignature &&
          walletAddress
        ) {
          const committedSettlement = createVantaShieldCommittedEconomicsSettlement({
            amount: pendingShieldAmountDisplay,
            depositSignature: activeDepositSignature,
            owner: walletAddress,
            routeEvidence: pendingProtocolSettlement.routeEvidence,
            settlementId: activeStateSignature,
            shieldCapability: pendingProtocolSettlement.capability,
            sourceAsset: pendingProtocolSettlement.capability.sourceAsset.symbol,
            vaultOwner: activeShieldTarget.vaultOwner!,
          });
          const committedRequest = committedSettlement.request;

          try {
            protocolSettlement = await runShieldWithDecoys(() =>
              requestVantaPrivatePoolV2BrowserShieldReceipt(committedSettlement),
            );

            if (!protocolSettlement) {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt was not returned.";
            } else if (protocolSettlement.protocolSettlementReceipt.economicsMode !== "committed-economics") {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt was not in committed-economics mode.";
            } else if (
              protocolSettlement.protocolSettlementReceipt.economicsCommitment !==
              committedRequest.economicsCommitment
            ) {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt economics commitment did not match the request.";
            } else if (
              protocolSettlement.protocolSettlementReceipt.settlementCommitment !==
              committedRequest.settlementCommitment
            ) {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt settlement commitment did not match the request.";
            } else if (
              protocolSettlement.protocolSettlementReceipt.settlementId !== committedRequest.settlementId
            ) {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt settlement id did not match the committed request.";
            } else if (protocolSettlement.protocolSettlementReceipt.action !== "shield") {
              protocolSettlementWarning =
                "Private Pool v2 Shield receipt action did not match Shield.";
            } else if (protocolSettlement.proofReceipt?.intent !== "shield") {
              protocolSettlementWarning =
                "Private Pool v2 Shield proof receipt intent did not match Shield.";
            }
          } catch (error) {
            protocolSettlementWarning = toPrivatePoolShieldReceiptWarning(error);
          }
        } else {
          protocolSettlementWarning =
            "Private Pool v2 Shield receipt context was not available for this shield.";
        }

        if (
          pendingShieldAsset === "SOL" &&
          protocolSettlement && !protocolSettlementWarning &&
          activeDepositSignature &&
          walletAddress
        ) {
          recordVerifiedNativeSolShieldNote({
            amount: pendingShieldAmount,
            createdAt: recentShieldTimestamp,
            depositSignature: activeDepositSignature,
            owner: walletAddress,
            stateSignature: activeStateSignature,
            vaultOwner: activeShieldTarget.vaultOwner!,
          });
          await refreshNativeSolShieldState({
            signatureHint: activeStateSignature,
            vaultOwner: activeShieldTarget.vaultOwner!,
          }).catch(() => undefined);
        }

        const receiptVerified = !protocolSettlementWarning;

        setRecentShield({
          ...recentShieldContext,
          claimTier: receiptVerified ? "proof_receipt_verified" : recentShieldContext.claimTier,
          protocolSettlementReceipt: receiptVerified
            ? protocolSettlement?.protocolSettlementReceipt
            : undefined,
          proofReceipt: receiptVerified ? protocolSettlement?.proofReceipt : undefined,
        });

        if (receiptVerified) {
          queueShieldStateHydrationRetries(
            activeStateSignature,
            pendingShieldAsset === "SOL" ? activeShieldTarget.vaultOwner! : null,
          );
        }

        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingShieldMemoCreatedAt(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingShieldTarget(null);
        setPendingProtocolSettlement(null);
        setPendingUmbraApprovalDisplay(null);
        setFlowError(protocolSettlementWarning);
        setStatus("complete");
        void supportedToken?.refresh();
      })
      .catch((error) => {
        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingShieldMemoCreatedAt(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingShieldTarget(null);
        setPendingProtocolSettlement(null);
        setPendingUmbraApprovalDisplay(null);
        setStatus("failed");
        setFlowError(
          toErrorMessage(
            error,
            "Shield settled, but the Private Pool v2 Shield receipt could not be verified.",
          ),
        );
      });
  }, [
    pendingDepositSignature,
    pendingShieldAsset,
    pendingShieldAmount,
    pendingShieldAmountDisplay,
    pendingShieldMemoCreatedAt,
    pendingShieldOwnerContext,
    pendingProtocolSettlement,
    pendingShieldTarget,
    nativeSolShieldTransaction.signature,
    nativeSolShieldWait.stage,
    queueShieldStateHydrationRetries,
    refreshNativeSolShieldState,
    refreshShieldState,
    runPrivateCoreShield,
    selectedShieldAsset,
    setRecentShield,
    shieldRegistry.byAssetKey,
    splShieldTransferTransaction.signature,
    splShieldTransferWait.stage,
    supportedToken,
    targetShieldedBalance,
    walletAddress,
  ]);

  async function handleShield() {
    if (isBetaMode) {
      return;
    }

    if (
      !isAmountValid ||
      !selectedSourceAsset ||
      !selectedShieldAsset?.vaultOwner ||
      (!isNativeSolShield && (!selectedShieldAsset.mintAddress || !supportedToken))
    ) {
      return;
    }

    recordedStateSignatureRef.current = null;
    recordedTokenDepositSignatureRef.current = null;
    queuedNativeSolHydrationSignatureRef.current = null;
    publicRouteTransaction.reset();
    splShieldTransferTransaction.reset();
    nativeSolShieldTransaction.reset();
    supportedToken?.resetSend();
    setRecentShield(null);
    setFlowError(null);
    setPendingPublicRoute(null);
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingShieldMemoCreatedAt(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingShieldTarget(null);
    setPendingUmbraApprovalDisplay(null);

    try {
      if (isNativeSolShield) {
        await beginNativeSolShieldTransfer(amount, parsedAmount);
        return;
      }

      if (selectedSourceAsset.mintAddress === selectedShieldAsset.mintAddress) {
        await beginShieldTransfer(amount, parsedAmount);
        return;
      }

      const quote = await fetchPublicToUsdcQuote({
        amount,
        inputAsset: selectedSourceAsset,
        outputAsset: selectedShieldAsset.assetKey,
      });
      const instructions = await buildPublicToUsdcSwapInstructions({
        quote,
        userPublicKey: walletAddress!,
      });

      setPendingPublicRoute({
        previousTargetBalance: publicBalance,
        quote,
        targetAssetKey: selectedShieldAsset.assetKey,
      });
      setStatus("routing_public_swap");

      await publicRouteTransaction.send({
        amount,
        asset: selectedSourceAsset.symbol,
        cluster: vantaSolanaCluster,
        explicitMainnetApproval: vantaExplicitMainnetApproval,
        connectedWalletAddress: walletAddress!,
        estimatedFees: "wallet-estimated",
        feePayer: walletAddress!,
        humanApprovedSummary: true,
        instructions,
        label: "shield-public-route",
        recipient: selectedShieldAsset.vaultOwner,
        summaryInstructions: ["shield-public-route-swap"],
        transactionFingerprint: `shield-public-route:${walletAddress}:${selectedSourceAsset.id}:${selectedShieldAsset.assetKey}:${amount}`,
      });
    } catch (error) {
      setStatus("failed");
      setFlowError(toErrorMessage(error, "Shield request was not approved."));
      setPendingPublicRoute(null);
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingShieldMemoCreatedAt(null);
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingShieldTarget(null);
      setPendingUmbraApprovalDisplay(null);
    }
  }

  let validationMessage = "Choose an asset and amount. Vanta will show the route before you approve.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to shield and receive receipt.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps shielding visible but prevents live transfers while production services are offline.";
  } else if (sourceAssetsLoading) {
    validationMessage = "Loading wallet assets.";
  } else if (sourceAssetsBlocked && publicAssetsError) {
    validationMessage = `${publicAssetsError} Refresh the page or try another wallet RPC.`;
  } else if (!selectedSourceAsset) {
    validationMessage = "No wallet assets are currently available to shield.";
  } else if (selectedVaultOwnerResolution.kind === "derived-pda") {
    validationMessage = selectedVaultOwnerResolution.blocker;
  } else if (!selectedShieldAsset?.mintAddress || !selectedShieldAsset.vaultOwner) {
    validationMessage = "The selected shield target is not configured.";
  } else if (!viewingKey?.publicKey) {
    validationMessage = "Shield needs a local viewing key before it can write recoverable shield-state memos.";
  } else if (!shieldOwnerContext.ownerContext && !shieldOwnerContext.canRequestOwnerContext) {
    validationMessage = "Shield needs wallet message signing to derive recoverable owner keys before recording shielded notes.";
  } else if (shieldOwnerContext.status === "requesting") {
    validationMessage = "Approve the recoverable owner-key message before the Shield transfer.";
  } else if (capability.blockers.length > 0) {
    validationMessage = capability.blockers[0] ?? "This asset is not currently supported.";
  } else if (supportedToken?.status === "loading" || supportedToken?.isFetching) {
    validationMessage = "Refreshing the target shield asset balance.";
  } else if (!shieldStateReady) {
    validationMessage = "This shield route is not ready yet.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta shielded state.";
  } else if (amount.trim() === "") {
    validationMessage = "Enter an amount to shield.";
  } else if (selectedSourceBalanceStatus === "loading") {
    validationMessage = `Loading ${selectedSourceAsset.symbol} balance.`;
  } else if (selectedSourceBalanceStatus === "error") {
    validationMessage = `${selectedSourceAsset.symbol} balance recovery is unavailable. Refresh the page or try another wallet RPC.`;
  } else if (nativeSolShieldBlockedByRecoverableDeposit && latestRecoverableSolDeposit) {
    validationMessage = `${latestRecoverableSolDeposit.amountDisplay} SOL already reached the Vanta vault. Record it as shielded SOL before sending more.`;
  } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    validationMessage = "Enter a valid amount greater than zero.";
  } else if (isNativeSolShield && parsedAmount > maxAvailableAmount) {
    validationMessage = `Leave at least ${formatEditableAmount(NATIVE_SOL_SHIELD_FEE_RESERVE_SOL, 9)} SOL for network fees.`;
  } else if (parsedAmount > sourceBalance) {
    validationMessage = `Insufficient ${selectedSourceAsset.symbol} balance.`;
  }

  const routeLabel = capability.routeLabel;
  const shieldFlowActiveIndex =
    status === "complete" || status === "recovery_recorded"
      ? 2
      : status === "awaiting_wallet_confirmation" ||
          status === "routing_public_swap" ||
          status === "shielding_in_progress" ||
          status === "entering_shielded_state"
        ? 1
        : 0;

  return (
    <section className="send-page shield-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Add privacy</span>
          <h2>Shield</h2>
          <p>{shieldTrustContract.visibleStatusCopy}</p>
        </div>

        <div className="module-state">
          <strong>{shieldTrustContract.currentTruth}</strong>
          <p>
            {shieldTrustContract.claimControls.productionPrivacyClaimsLocked
              ? shieldTrustContract.visibleStatusCopy
              : "Production Shield privacy claims are unlocked by current evidence."}
          </p>
        </div>
      </div>

      <LaneFlowIndicator
        ariaLabel="Shield flow"
        activeStepIndex={shieldFlowActiveIndex}
        steps={[
          { id: "choose-asset", label: "Choose" },
          { id: "approve", label: "Approve" },
          { id: "private-note", label: "Note" },
        ]}
      />

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Choose asset</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Amount</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Balance: {sourceBalanceLabel}
                  </div>
                </div>
                <div className="send-entry-grid swap-entry-grid">
                  <div className="amount-field">
                    <input
                      id="shield-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setStatus("idle");
                        setRecentShield(null);
                        setFlowError(null);
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

                        setAmount(formatEditableAmount(maxAvailableAmount, selectedSourceAsset?.decimals ?? 6));
                        setStatus("idle");
                        setRecentShield(null);
                        setFlowError(null);
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              {/* Crisp 2-column From / To layout for better visual weight and inviting picker boxes */}
              <div className="shield-from-to-row">
                {/* LEFT: From */}
                <div className="swap-module__field shield-picker-column">
                  <div className="swap-module__label-row">
                    <span>From</span>
                  </div>
                  <AssetPickerGrid
                    ariaLabel="Shield source asset"
                    disabled={sourceSelectDisabled}
                    emptyLabel={sourcePlaceholderLabel}
                    onSelectOption={(nextSourceAssetId) => {
                      setSelectedSourceAssetId(nextSourceAssetId);
                      setStatus("idle");
                      setRecentShield(null);
                      setFlowError(null);
                    }}
                    options={sourceAssetPickerOptions}
                    selectedOptionId={sourceSelectValue}
                  />
                  {/* Spacer to match height of To's extra balance lines */}
                  <div className="shield-picker-footer-spacer" />
                </div>

                {/* RIGHT: To */}
                <div className="swap-module__field shield-picker-column">
                  <div className="swap-module__label-row">
                    <span>To</span>
                  </div>
                  <AssetPickerGrid
                    ariaLabel="Shield target asset"
                    options={shieldTargetAssetPickerOptions}
                    onSelectOption={() => undefined}
                    readOnly
                    selectedOptionId={shieldTargetAssetPickerOptions[0]?.id ?? ""}
                  />
                  <div className="shield-balance-stack shield-picker-footer">
                    <div className="send-balance-line shield-helper shield-helper--meta">
                      Shielded balance: {targetShieldedBalanceLabel}
                    </div>
                    {hasPendingNativeSolShieldEvidence && (
                      <div className="send-balance-line shield-helper shield-helper--meta">
                        Local SOL evidence pending ledger sync
                      </div>
                    )}
                  </div>
                  <p className="shield-helper shield-helper--route">
                    Route: {selectedSourceAsset?.symbol ?? "Asset"} → {capability.targetShieldAsset?.label ?? "Shielded asset"}
                  </p>
                </div>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
              <p className="shield-helper shield-helper--meta">
                Shielding uses public transfers to an operator-controlled vault (beta). Full
                program-owned private custody is coming.
              </p>
              {targetShieldedBalanceReadUnavailable && (
                <p className="shield-helper shield-helper--meta">
                  Shielded balance read is delayed by the RPC endpoint; new Shield actions can
                  still proceed through wallet approval and state recording.
                </p>
              )}
              <p className="shield-helper">{validationMessage}</p>
              {isNativeSolShield && (
                <div className="shield-recovery-panel">
                  <div>
                    <strong>Recover SOL vault deposit</strong>
                    <p>
                      {latestRecoverableSolDeposit
                        ? `${latestRecoverableSolDeposit.amountDisplay} SOL reached the Vanta vault but has no matching shield-state record yet.`
                        : hasPendingNativeSolShieldEvidence
                          ? "Local SOL evidence is saved and waiting for ledger sync. No recovery action or second transfer is needed."
                        : recoverableSolDepositsLoading
                          ? "Checking recent wallet-to-vault SOL deposits."
                          : recoverableSolDepositsError
                            ? recoverableSolDepositsError
                            : "No unrecorded SOL vault deposit found in recent wallet activity."}
                    </p>
                  </div>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={
                      isBetaMode ||
                      !latestRecoverableSolDeposit ||
                      status === "routing_public_swap" ||
                      status === "shielding_in_progress" ||
                      status === "entering_shielded_state"
                    }
                    onClick={() => {
                      if (latestRecoverableSolDeposit) {
                        beginNativeSolShieldDepositRecovery(latestRecoverableSolDeposit);
                      }
                    }}
                  >
                    Record shielded SOL
                  </button>
                </div>
              )}

              {/* Phase 2: Dedicated Legacy WSOL SOL Note Migration Panel (practical UI/flow)
                  One-time helper + sentinel commitment + ingestion submit. Fail-closed.
                  References design doc Phase 2 handoff, §9 success criteria, status note "Recommended Next Actions" #3,
                  quarantine policy from verifiedNativeSolShieldNotes.ts, VANTA_ZK_REVIEW.findings.json updates.
                  After migration, legacy notes removed; v2 indexer becomes source for PositionSummary/NoteStatePanel.
              */}
              {isNativeSolShield && legacySolNotes.length > 0 && showLegacyMigrationPanel && (
                <div className="shield-legacy-migration-panel">
                  <div className="legacy-header">
                    <div>
                      <strong>Legacy SOL notes (pre-v2) — migrate for full support</strong>
                      <p>
                        {legacySolNotes.length} note(s) from old WSOL path. Migrate to sentinel + v2 tree for canonical balances and future features. (One-time, unshield still works.)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setShowLegacyMigrationPanel(false)}
                    >
                      Hide
                    </button>
                  </div>

                  {/* Bulk migrate button for users with many legacy notes (e.g. 18) */}
                  {legacySolNotes.length > 1 && (
                    <div style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleMigrateAllLegacyNotes}
                        disabled={isMigratingAll || !walletConnected}
                      >
                        {isMigratingAll ? "Migrating all..." : `Migrate all ${legacySolNotes.length} to v2`}
                      </button>
                      <span style={{ marginLeft: "10px", fontSize: "0.75em", color: "var(--muted-strong)" }}>
                        (recommended for many notes)
                      </span>
                    </div>
                  )}

                  {legacyMigrationError && (
                    <p style={{ color: "#b91c1c", fontSize: "0.82em", margin: "10px 0 4px", lineHeight: 1.35 }}>
                      {legacyMigrationError.includes("waking up") || legacyMigrationError.includes("unreachable") ? (
                        <>Indexer service is waking up or still stabilizing for native SOL (expected in current Phase 2). <strong>Re-shield is the safest option right now.</strong></>
                      ) : (
                        <>Migration error: {legacyMigrationError}</>
                      )}
                    </p>
                  )}

                  <div style={{ marginTop: "8px" }}>
                    {legacySolNotes.map((note) => {
                      const key = note.depositSignature || note.noteId;
                      const status = legacyMigrationStatus[key] || "idle";
                      return (
                        <div key={key} className="legacy-note-row">
                          <span className="legacy-note-info">
                            {formatVantaSolAmount(note.amount)} SOL • {note.depositSignature?.slice(0, 8)}... • {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            className="button button-primary legacy-note-btn"
                            disabled={isMigratingAll || status === "migrating" || status === "success" || !walletConnected}
                            onClick={() => handleMigrateLegacySolNote(note)}
                          >
                            {status === "migrating" ? "Migrating..." : status === "success" ? "✓ Done" : "Migrate to v2"}
                          </button>
                          {status === "error" && (
                            <span className="legacy-note-status" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              Failed — 
                              <button
                                type="button"
                                className="button button-ghost"
                                style={{ fontSize: "0.7em", padding: "1px 6px" }}
                                onClick={() => {
                                  // Quick re-shield fallback: prefill the amount and trigger normal shield flow
                                  setSelectedSourceAssetId("SOL");
                                  setAmount(formatEditableAmount(note.amount, 9));
                                  setStatus("idle");
                                  setLegacyMigrationError(null);
                                  // Scroll user attention to the main shield button
                                  const actions = document.querySelector(".shield-form__actions");
                                  actions?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                              >
                                Re-shield instead (recommended)
                              </button>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="legacy-footer">
                    One-time sentinel commitment + ingest. After migrate, v2 indexer handles your SOL balance.
                  </p>
                </div>
              )}

              <RecoveryPanelController viewingKeyControls={viewingKey} />

              <div className="shield-form__actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleShield();
                  }}
                  disabled={
                    isBetaMode ||
                    !isAmountValid ||
                    (!shieldOwnerContext.ownerContext && !shieldOwnerContext.canRequestOwnerContext) ||
                    shieldOwnerContext.status === "requesting" ||
                    status === "routing_public_swap" ||
                    status === "shielding_in_progress" ||
                    status === "entering_shielded_state"
                  }
                >
                  {isBetaMode ? "Beta mode" : "Shield"}
                </button>
              </div>
            </div>

            {(status === "awaiting_wallet_confirmation" ||
              status === "routing_public_swap" ||
              status === "shielding_in_progress" ||
              status === "entering_shielded_state" ||
              status === "recovery_recorded" ||
              status === "complete" ||
              status === "failed") && (
              <TransactionStatusToast
                tone={
                  status === "complete"
                    ? "success"
                    : status === "recovery_recorded"
                      ? "success"
                      : status === "failed"
                        ? "error"
                        : status === "awaiting_wallet_confirmation"
                          ? "pending"
                          : "processing"
                }
                phase={
                  status === "complete" || status === "recovery_recorded"
                    ? "complete"
                    : status === "failed"
                      ? "failed"
                      : status === "awaiting_wallet_confirmation"
                        ? "pending"
                        : "confirmed"
                }
                title={
                  status === "awaiting_wallet_confirmation"
                    ? "Confirm in wallet"
                    : status === "routing_public_swap"
                      ? "Routing to shield"
                      : status === "shielding_in_progress"
                        ? "Shielding"
                        : status === "entering_shielded_state"
                          ? "Recording state"
                          : status === "recovery_recorded"
                            ? "Recovery recorded"
                            : status === "complete"
                              ? recentShield?.claimTier === "proof_receipt_verified"
                                ? "Receipt verified"
                                : "Complete"
                              : "Shield failed"
                }
                message={
                  status === "complete"
                    ? recentShield
                      ? describeRecentShieldCompletion(recentShield, flowError)
                      : "The selected asset was recorded, but proof-backed Shield state was not confirmed."
                    : status === "failed"
                      ? flowError ?? "The shield action could not be completed."
                      : status === "routing_public_swap"
                        ? `Routing ${selectedSourceAsset?.symbol ?? "the source asset"} into ${targetShieldSymbol ?? "the selected shield asset"} before entering Vanta.`
                        : status === "shielding_in_progress"
                          ? "Submitting the shield transfer into the Vanta vault."
                          : status === "entering_shielded_state"
                          ? "Recording local shield-state evidence."
                          : status === "recovery_recorded"
                            ? "No new transfer was submitted. Vanta saved the existing SOL vault deposit as pending recovery evidence; shielded balance updates after a verified shield-state note is available."
                            : "Approve the shield action in your wallet to continue."
                }
                progress={
                  status !== "complete" &&
                  status !== "failed" &&
                  status !== "recovery_recorded"
                }
                floating
              >
                {pendingUmbraApprovalDisplay && status !== "complete" && status !== "failed" && (
                  <WalletApprovalSheet
                    heading="Vault transfer approval"
                    walletPrompt={pendingUmbraApprovalDisplay.walletPrompt}
                    signingMode={pendingUmbraApprovalDisplay.signingMode}
                    rows={pendingUmbraApprovalDisplay.rows}
                    note="Approve only if your wallet shows the same asset, amount, cluster, and Vanta vault destination."
                    truthBoundary="Local approval review only; it does not prove production privacy or mainnet readiness."
                  />
                )}
                {status === "awaiting_wallet_confirmation" && (
                  <div className="shield-wallet-warning-note" role="note">
                    <strong>Phantom safety check</strong>
                    <p>
                      Phantom can show a malicious-site warning when its own preview cannot
                      confidently simulate a transaction. Vanta already simulated this request
                      before opening the wallet. Continue only if Phantom shows the same asset,
                      amount, cluster, and Vanta vault destination.
                    </p>
                  </div>
                )}
                {routeProgressLabel && status === "routing_public_swap" && (
                  <p className="shield-helper shield-helper--meta">{routeProgressLabel}</p>
                )}
                {(splShieldTransferWait.detailLabel || nativeSolShieldWait.detailLabel) && status === "shielding_in_progress" && (
                  <p className="shield-helper shield-helper--meta">
                    {pendingShieldAsset === "SOL" ? nativeSolShieldWait.detailLabel : splShieldTransferWait.detailLabel}
                  </p>
                )}
              </TransactionStatusToast>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
