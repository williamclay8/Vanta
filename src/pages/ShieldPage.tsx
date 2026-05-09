import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
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
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import { toVantaWalletAuthorizationRecoveryMessage } from "@/wallet/walletAuthorizationError.mjs";
import {
  createNativeSolShieldMemoInstruction,
  createShieldMemoInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
  VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
  VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
  type VantaShieldedSolNote,
} from "@/solana/vantaShieldState";
import { recordCanonicalShieldFromLiveShield } from "@/zk/liveShieldBridge";
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
  "Solana could not find one of the required mainnet accounts for this Shield transaction. This does not mean your wallet has no SOL; refresh Vanta balances or try another browser-compatible mainnet RPC, then try Shield again.";

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
    return "The public Solana RPC is rate-limited while checking this Shield transaction. Vanta did not ask for another transfer; wait a moment or use recovery if the deposit already landed.";
  }

  if (isSolanaRpcHttpAccessError(error)) {
    return "The browser RPC endpoint blocked access while checking this Shield transaction. Vanta did not ask for another transfer; try a browser-compatible mainnet RPC or use recovery if the deposit already landed.";
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
    return `${amountLabel} was recorded as a local Private Core note; production privacy remains blocked.${suffix}`;
  }

  if (recentShield.claimTier === "local_shield_state") {
    return `${amountLabel} was recorded in local shield-state; proof-backed production privacy remains blocked.${suffix}`;
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
  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState("native:SOL");
  const [amount, setAmount] = useState("");
  const [viewingKeyBackupText, setViewingKeyBackupText] = useState("");
  const [viewingKeyImportText, setViewingKeyImportText] = useState("");
  const [viewingKeyCustodyStatus, setViewingKeyCustodyStatus] = useState<
    "idle" | "exported" | "imported" | "reset" | "failed"
  >("idle");
  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingShieldAmount, setPendingShieldAmount] = useState<number | null>(null);
  const [pendingShieldAmountDisplay, setPendingShieldAmountDisplay] = useState<string | null>(null);
  const [pendingShieldMemoCreatedAt, setPendingShieldMemoCreatedAt] = useState<number | null>(null);
  const [pendingDepositSignature, setPendingDepositSignature] = useState<string | null>(null);
  const [pendingShieldAsset, setPendingShieldAsset] = useState<LiveShieldTokenAssetKey | "SOL" | null>(null);
  const [pendingShieldTarget, setPendingShieldTarget] = useState<LiveShieldTokenAssetConfig | null>(null);
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

  async function beginShieldTransfer(
    amountDisplay: string,
    amountNumeric: number,
    routeEvidence: PublicShieldRouteEvidence | null = null,
  ) {
    if (!walletAddress || !selectedShieldAsset?.mintAddress || !selectedShieldAsset?.vaultOwner) {
      throw new Error("Shield target is not configured.");
    }

    setPendingShieldAmount(amountNumeric);
    setPendingShieldAmountDisplay(amountDisplay);
    const shieldMemoCreatedAt = Date.now();
    setPendingShieldMemoCreatedAt(shieldMemoCreatedAt);
    setPendingDepositSignature(null);
    setPendingShieldAsset(selectedShieldAsset.assetKey);
    setPendingShieldTarget(selectedShieldAsset);
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
    validationMessage = "Connect a wallet to shield assets.";
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

  return (
    <section className="send-page shield-page">
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Add privacy</span>
          <h2>Shield</h2>
          <p>Shield an asset so you can send, swap, or hold it privately.</p>
        </div>

        <div className="module-state">
          <strong>Private entry</strong>
          <p>Supported assets enter Vanta before private actions begin.</p>
        </div>
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Choose what to shield</span>
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

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>From</span>
                </div>
                <div className="send-asset-field">
                  <select
                    aria-label="From asset"
                    value={sourceSelectValue}
                    disabled={sourceSelectDisabled}
                    onChange={(event) => {
                      setSelectedSourceAssetId(event.target.value);
                      setStatus("idle");
                      setRecentShield(null);
                      setFlowError(null);
                    }}
                  >
                    {executableSourceAssets.length === 0 && (
                      <option value="">{sourcePlaceholderLabel}</option>
                    )}
                    {executableSourceAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {formatShieldSourceAssetOptionLabel(asset)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>To</span>
                  <div className="shield-balance-stack">
                    <div className="send-balance-line shield-helper shield-helper--meta">
                      Shielded balance: {targetShieldedBalanceLabel}
                    </div>
                    {hasPendingNativeSolShieldEvidence && (
                      <div className="send-balance-line shield-helper shield-helper--meta">
                        Local SOL evidence pending ledger sync
                      </div>
                    )}
                  </div>
                </div>
                <div className="swap-quote-line">
                  <strong>{isNativeSolShield ? "Shielded SOL" : capability.targetShieldAsset?.label ?? "Shielded asset"}</strong>
                  <span>{targetShieldName ?? (walletConnected ? "Choose target" : "Connect wallet")}</span>
                </div>
                <p className="shield-helper shield-helper--route">
                  Route: {selectedSourceAsset?.symbol ?? "Asset"} {"->"} {capability.targetShieldAsset?.label ?? "Shielded asset"}
                </p>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
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
                    <strong>Recover SOL already sent to the vault</strong>
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

              <details className="shield-viewing-key-panel">
                <summary>
                  <span>Balance recovery</span>
                  <strong>{viewingKey ? "Ready" : "Connect wallet"}</strong>
                </summary>
                <div className="shield-viewing-key-panel__body">
                  <p className="shield-helper shield-helper--meta">
                    Lets this browser recognize your shielded notes. Back it up if you use Vanta
                    on another device.
                  </p>
                  <div className="shield-viewing-key-panel__actions">
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={!viewingKey}
                      onClick={() => {
                        if (!viewingKey) {
                          return;
                        }

                        setViewingKeyBackupText(viewingKey.exportText);
                        setViewingKeyCustodyStatus("exported");
                      }}
                    >
                      Show backup
                    </button>
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={!viewingKey || viewingKeyImportText.trim() === ""}
                      onClick={() => {
                        if (!viewingKey) {
                          return;
                        }

                        try {
                          viewingKey.importText(viewingKeyImportText);
                          setViewingKeyBackupText("");
                          setViewingKeyImportText("");
                          setViewingKeyCustodyStatus("imported");
                        } catch {
                          setViewingKeyCustodyStatus("failed");
                        }
                      }}
                    >
                      Restore backup
                    </button>
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={!viewingKey}
                      onClick={() => {
                        if (!viewingKey) {
                          return;
                        }

                        viewingKey.reset();
                        setViewingKeyBackupText("");
                        setViewingKeyImportText("");
                        setViewingKeyCustodyStatus("reset");
                      }}
                    >
                      Reset recovery key
                    </button>
                  </div>
                  <label className="shield-viewing-key-panel__field">
                    <span>Recovery backup</span>
                    <textarea
                      readOnly
                      value={viewingKeyBackupText}
                      placeholder="Show backup to reveal this browser's recovery key."
                    />
                  </label>
                  <label className="shield-viewing-key-panel__field">
                    <span>Restore on this browser</span>
                    <textarea
                      value={viewingKeyImportText}
                      onChange={(event) => {
                        setViewingKeyImportText(event.target.value);
                        setViewingKeyCustodyStatus("idle");
                      }}
                      placeholder="Paste a recovery backup from another browser."
                    />
                  </label>
                  {viewingKeyCustodyStatus !== "idle" && (
                    <p className="shield-helper shield-helper--meta">
                      {viewingKeyCustodyStatus === "exported"
                        ? "Backup shown. Store it somewhere private."
                        : viewingKeyCustodyStatus === "imported"
                          ? "Recovery key restored."
                          : viewingKeyCustodyStatus === "reset"
                            ? "New recovery key created. Existing notes may need the old backup to appear."
                            : "Could not restore that backup."}
                    </p>
                  )}
                </div>
              </details>

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
                    status === "routing_public_swap" ||
                    status === "shielding_in_progress" ||
                    status === "entering_shielded_state"
                  }
                >
                  {isBetaMode ? "Beta mode" : "Shield asset"}
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
              <div
                className={
                  status === "complete"
                    ? "status-panel status-panel--success"
                    : status === "recovery_recorded"
                      ? "status-panel status-panel--success"
                      : status === "failed"
                        ? "status-panel status-panel--error"
                        : "status-panel status-panel--processing"
                }
              >
                <span>
                  {status === "awaiting_wallet_confirmation"
                    ? "Awaiting wallet confirmation"
                    : status === "routing_public_swap"
                      ? "Preparing shield route"
                      : status === "shielding_in_progress"
                        ? "Shielding in progress"
                        : status === "entering_shielded_state"
                          ? "Recording local shield state"
                          : status === "recovery_recorded"
                            ? "SOL recovery recorded"
                            : status === "complete"
                              ? recentShield?.claimTier === "proof_receipt_verified"
                                ? "Shield proof receipt verified"
                                : "Shield deposit recorded"
                              : "Shield failed"}
                </span>
                <p>
                  {status === "complete"
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
                            : "Approve the shield action in your wallet to continue."}
                </p>
                {pendingUmbraApprovalDisplay && status !== "complete" && status !== "failed" && (
                  <details className="shield-approval-review" aria-label="Wallet approval review">
                    <summary>
                      <span>Vault transfer approval</span>
                      <strong>{pendingUmbraApprovalDisplay.walletPrompt}</strong>
                    </summary>
                    <div className="shield-approval-review__rows">
                      {pendingUmbraApprovalDisplay.rows.map((row) => (
                        <div key={row.label}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
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
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
