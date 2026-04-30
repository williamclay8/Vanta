import { useEffect, useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  buildNativeSolShieldTransferInstructions,
  fetchNativeSolShieldDepositCandidates,
  type NativeSolShieldDepositCandidate,
} from "@/solana/nativeSolShield";
import {
  buildPublicToVusdSwapInstructions,
  createPublicShieldRouteEvidence,
  fetchPublicToVusdQuote,
  formatAssetAmount,
  type PublicShieldRouteEvidence,
  type PublicToVusdQuote,
} from "@/solana/publicSwapRoute";
import { requestVantaPrivatePoolV2ProtocolSettlement } from "@/privacy/privatePoolV2ProtocolSettlementClient";
import { runShieldWithDecoys } from "@/privacy/shieldDecoyBatcher";
import { createVantaShieldCommittedEconomicsSettlementRequest } from "@/privacy/vantaShieldCommittedSettlement";
import { createUmbraShieldActionApprovalReview } from "@/privacy/umbraShieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { createShieldAssetCapability } from "@/solana/shieldAssetCapability";
import {
  type LiveShieldTokenAssetKey,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import { selectUniversalShieldTarget } from "@/solana/universalShieldTarget";
import { resolveUserVaultOwner } from "@/solana/userVaultOwner";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { buildSplTokenShieldTransferInstructions } from "@/solana/splShieldTransfer";
import { useWalletPublicAssets } from "@/solana/useWalletPublicAssets";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  createNativeSolShieldMemoInstruction,
  createShieldMemoInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
  VANTA_NATIVE_SOL_SAME_TRANSACTION_DEPOSIT_SIGNATURE,
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
  | "complete"
  | "failed";

type PendingPublicRoute = {
  previousTargetBalance: number;
  quote: PublicToVusdQuote;
  targetAssetKey: LiveShieldTokenAssetKey;
};

type PendingShieldProtocolSettlement = {
  capability: ReturnType<typeof createShieldAssetCapability>;
  routeEvidence: PublicShieldRouteEvidence | null;
};

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toRecoverableSolDepositsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (
    message.includes("-32600") ||
    message.includes("getTransaction") ||
    message.toLowerCase().includes("solana rpc")
  ) {
    return "Recent SOL vault deposits could not be checked because the Solana RPC endpoint blocked the request.";
  }

  return toErrorMessage(error, "Recent SOL vault deposits could not be checked.");
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

export function ShieldPage(_props: ShieldPageProps) {
  const { recentShield, runPrivateCoreShield, setRecentShield } = usePrivacyFlow();
  const {
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
  const [pendingDepositSignature, setPendingDepositSignature] = useState<string | null>(null);
  const [pendingShieldAsset, setPendingShieldAsset] = useState<LiveShieldTokenAssetKey | "SOL" | null>(null);
  const [pendingPublicRoute, setPendingPublicRoute] = useState<PendingPublicRoute | null>(null);
  const [pendingProtocolSettlement, setPendingProtocolSettlement] =
    useState<PendingShieldProtocolSettlement | null>(null);
  const [pendingUmbraApprovalDisplay, setPendingUmbraApprovalDisplay] =
    useState<UmbraOperationApprovalDisplay | null>(null);
  const [pendingNativeSolDepositRecovery, setPendingNativeSolDepositRecovery] = useState(false);
  const [recoverableSolDeposits, setRecoverableSolDeposits] = useState<
    NativeSolShieldDepositCandidate[]
  >([]);
  const [recoverableSolDepositsLoading, setRecoverableSolDepositsLoading] = useState(false);
  const [recoverableSolDepositsError, setRecoverableSolDepositsError] = useState<string | null>(null);
  const recordedStateSignatureRef = useRef<string | null>(null);

  const executableShieldTargets = useMemo(
    () =>
      shieldRegistry.configuredEntries.filter(
        (entry) => entry.asset.configured && entry.asset.mintAddress,
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
    () =>
      executableSourceAssets.find((asset) => asset.id === selectedSourceAssetId) ??
      executableSourceAssets[0] ??
      null,
    [executableSourceAssets, selectedSourceAssetId],
  );

  useEffect(() => {
    if (selectedSourceAsset) {
      return;
    }

    if (executableSourceAssets[0]) {
      setSelectedSourceAssetId(executableSourceAssets[0].id);
    }
  }, [executableSourceAssets, selectedSourceAsset]);

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
  const refreshShieldState = selectedRegistryEntry?.refresh ?? (async () => {});
  const supportedToken = selectedRegistryEntry?.token ?? null;
  const publicBalance = selectedRegistryEntry?.publicBalance ?? 0;
  const shieldedBalance = shieldAccount?.balance ?? 0;
  const isNativeSolShield = selectedSourceAsset?.kind === "native" && selectedSourceAsset.symbol === "SOL";
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
    ? shieldAccount?.shieldedSolBalance ?? 0
    : shieldedBalance;
  const latestRecoverableSolDeposit = recoverableSolDeposits[0] ?? null;
  const nativeSolShieldBlockedByRecoverableDeposit =
    isNativeSolShield && Boolean(latestRecoverableSolDeposit);

  useEffect(() => {
    if (!isNativeSolShield || !walletAddress || !selectedShieldAsset?.vaultOwner) {
      setRecoverableSolDeposits([]);
      setRecoverableSolDepositsError(null);
      setRecoverableSolDepositsLoading(false);
      return;
    }

    let cancelled = false;
    const existingDepositSignatures = new Set(
      (shieldAccount?.shieldedSolNotes ?? [])
        .map((note) => note.depositSignature)
        .filter((signature): signature is string => typeof signature === "string" && signature.length > 0),
    );

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
    selectedShieldAsset?.vaultOwner,
    shieldAccount?.shieldedSolNotes,
    walletAddress,
  ]);

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
  const stateTransaction = useVantaSafeSendTransaction();
  const stateSignatureWait = useRealtimeSignatureProgress(
    stateTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !stateTransaction.signature,
    },
  );

  const parsedAmount = Number(amount);
  const sourceBalance = selectedSourceAsset?.balance ?? 0;
  const selectedSourceBalanceStatus = selectedSourceAsset?.balanceStatus ?? "ready";
  const selectedSourceBalanceUnavailable = selectedSourceBalanceStatus !== "ready";
  const maxAvailableAmount = sourceBalance;
  const routeProgressLabel = publicRouteWait.detailLabel;
  const stateProgressLabel = stateSignatureWait.detailLabel;
  const isAmountValid =
    walletConnected &&
    (isNativeSolShield ? !!selectedShieldAsset?.vaultOwner : !!selectedShieldAsset?.mintAddress) &&
    !!selectedShieldAsset?.vaultOwner &&
    !!selectedSourceAsset &&
    !selectedSourceBalanceUnavailable &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= sourceBalance &&
    !nativeSolShieldBlockedByRecoverableDeposit;
  const sourceSelectValue = selectedSourceAsset?.id ?? "";
  const sourceSelectDisabled =
    !walletConnected || publicAssetsLoading || executableSourceAssets.length === 0;
  const sourcePlaceholderLabel = !walletConnected
    ? "Connect wallet"
    : publicAssetsLoading
      ? "Loading assets..."
      : publicAssetsError
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
      : supportedToken?.status === "loading" || supportedToken?.isFetching || shieldStateRefreshing
        ? "Loading..."
        : supportedToken?.status === "error" || shieldStateError
          ? "Temporarily unavailable"
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
    setPendingDepositSignature(null);
    setPendingShieldAsset(selectedShieldAsset.assetKey);
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

    const instructions = await buildSplTokenShieldTransferInstructions({
      amount: amountDisplay,
      decimals: selectedShieldAsset.decimals,
      mintAddress: selectedShieldAsset.mintAddress,
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    });

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
    setPendingDepositSignature(null);
    setPendingShieldAsset("SOL");
    setPendingNativeSolDepositRecovery(false);
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

  function beginNativeSolShieldDepositRecovery(deposit: NativeSolShieldDepositCandidate) {
    if (!walletAddress || !selectedSourceAsset?.mintAddress || !selectedShieldAsset?.vaultOwner) {
      throw new Error("Native SOL shield recovery target is not configured.");
    }

    const approvalIssuedAt = Date.now();
    setPendingShieldAmount(deposit.amount);
    setPendingShieldAmountDisplay(deposit.amountDisplay);
    setPendingDepositSignature(deposit.signature);
    setPendingShieldAsset("SOL");
    setPendingNativeSolDepositRecovery(true);
    setPendingProtocolSettlement({ capability, routeEvidence: null });
    setPendingUmbraApprovalDisplay(
      createUmbraShieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(deposit.amountDisplay, 9),
        destinationAddress: selectedShieldAsset.vaultOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: selectedSourceAsset.mintAddress,
        requester: walletAddress,
      }),
    );
    setFlowError(null);
    setStatus("entering_shielded_state");
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
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingNativeSolDepositRecovery(false);
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
    }
  }, [
    nativeSolShieldTransaction.error,
    nativeSolShieldTransaction.signature,
    nativeSolShieldTransaction.status,
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
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingNativeSolDepositRecovery(false);
      setPendingPublicRoute(null);
      setPendingUmbraApprovalDisplay(null);
      setFlowError(
        toErrorMessage(splShieldTransferTransaction.error, "The shield transfer could not be completed."),
      );
      return;
    }

    if (splShieldTransferTransaction.status === "success" && splShieldTransferTransaction.signature) {
      setStatus("entering_shielded_state");
      setPendingDepositSignature(splShieldTransferTransaction.signature);
    }
  }, [
    splShieldTransferTransaction.error,
    splShieldTransferTransaction.signature,
    splShieldTransferTransaction.status,
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
    if (!pendingPublicRoute || publicRouteWait.waitStatus !== "error") {
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
      publicRouteWait.waitStatus !== "success" ||
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
    publicRouteWait.waitStatus,
    publicRouteTransaction.signature,
    selectedShieldAsset?.decimals,
    supportedToken,
  ]);

  useEffect(() => {
    if (stateSignatureWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      toErrorMessage(
        stateSignatureWait.waitError,
        "The Vanta shield state note was submitted but not confirmed.",
      ),
    );
  }, [stateSignatureWait.waitError, stateSignatureWait.waitStatus]);

  useEffect(() => {
    if (nativeSolShieldWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingNativeSolDepositRecovery(false);
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
    if (splShieldTransferWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingNativeSolDepositRecovery(false);
    setFlowError(
      toErrorMessage(
        splShieldTransferWait.waitError,
        "The shield transfer was submitted but not confirmed.",
      ),
    );
  }, [splShieldTransferWait.waitError, splShieldTransferWait.waitStatus]);

  useEffect(() => {
    const depositConfirmed =
      pendingNativeSolDepositRecovery
        ? true
        : pendingShieldAsset === "SOL"
        ? nativeSolShieldWait.waitStatus === "success"
        : splShieldTransferWait.waitStatus === "success";

    if (
      (pendingShieldAsset === "SOL" && !pendingNativeSolDepositRecovery) ||
      !depositConfirmed ||
      pendingShieldAmount === null ||
      !pendingDepositSignature ||
      !selectedShieldAsset?.vaultOwner ||
      !viewingKey?.publicKey ||
      (pendingShieldAsset !== "SOL" && !selectedShieldAsset?.mintAddress) ||
      (pendingShieldAsset !== "SOL" && !supportedToken?.owner) ||
      (pendingShieldAsset === "SOL" && !walletAddress)
    ) {
      return;
    }

    if (stateTransaction.status === "loading" || stateTransaction.signature) {
      return;
    }

    const mintAddress =
      pendingShieldAsset === "SOL" ? VANTA_NATIVE_SOL_ASSET_ID : selectedShieldAsset.mintAddress!;
    const owner = pendingShieldAsset === "SOL" ? walletAddress! : supportedToken!.owner!;
    const vaultOwner = selectedShieldAsset.vaultOwner;

    void buildHeliusPriorityFeeInstructions({
      accountKeys: [mintAddress, owner, pendingDepositSignature, vaultOwner],
      action: "shield_state",
    })
      .then((priorityFeeInstructions) => {
        const instructions = [
          ...priorityFeeInstructions,
          pendingShieldAsset === "SOL"
            ? createNativeSolShieldMemoInstruction(
                {
                  amount: pendingShieldAmountDisplay ?? amount,
                  assetId: VANTA_NATIVE_SOL_ASSET_ID,
                  createdAt: Date.now(),
                  depositSignature: pendingDepositSignature,
                  owner,
                  vaultOwner,
                },
                { viewingPublicKey: viewingKey?.publicKey },
              )
            : createShieldMemoInstruction(
                {
                  amount: pendingShieldAmountDisplay ?? amount,
                  asset: selectedShieldAsset.assetKey,
                  createdAt: Date.now(),
                  depositSignature: pendingDepositSignature,
                  mintAddress,
                  owner,
                  vaultOwner,
                },
                { viewingPublicKey: viewingKey?.publicKey },
              ),
        ];

        return stateTransaction.send({
          amount: pendingShieldAmountDisplay ?? amount,
          asset: pendingShieldAsset === "SOL" ? "SOL" : selectedShieldAsset.assetKey,
          cluster: vantaSolanaCluster,
          explicitMainnetApproval: vantaExplicitMainnetApproval,
          connectedWalletAddress: walletAddress ?? owner,
          estimatedFees: "wallet-estimated",
          feePayer: walletAddress ?? owner,
          humanApprovedSummary: true,
          instructions,
          label: "shield-state",
          recipient: vaultOwner,
          summaryInstructions: ["shield-state-memo"],
          transactionFingerprint: `shield-state:${owner}:${vaultOwner}:${pendingDepositSignature}`,
        });
      })
      .catch((error) => {
        setStatus("failed");
        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingNativeSolDepositRecovery(false);
        setPendingUmbraApprovalDisplay(null);
        setFlowError(
          toErrorMessage(error, "The Vanta shield state note could not be recorded."),
        );
      });
  }, [
    amount,
    pendingDepositSignature,
    pendingShieldAsset,
    pendingShieldAmount,
    pendingShieldAmountDisplay,
    pendingNativeSolDepositRecovery,
    nativeSolShieldWait.waitStatus,
    selectedShieldAsset,
    splShieldTransferWait.waitStatus,
    stateTransaction,
    supportedToken,
    viewingKey?.publicKey,
    walletAddress,
  ]);

  useEffect(() => {
    const activeStateSignature =
      pendingShieldAsset === "SOL" && !pendingNativeSolDepositRecovery
        ? nativeSolShieldTransaction.signature
        : stateTransaction.signature;
    const stateRecorded =
      pendingShieldAsset === "SOL" && !pendingNativeSolDepositRecovery
        ? nativeSolShieldWait.waitStatus === "success"
        : stateSignatureWait.waitStatus === "success";

    if (
      !stateRecorded ||
      !activeStateSignature ||
      recordedStateSignatureRef.current === activeStateSignature ||
      pendingShieldAmount === null ||
      !pendingShieldAmountDisplay ||
      !selectedShieldAsset?.vaultOwner ||
      (pendingShieldAsset !== "SOL" && !selectedShieldAsset?.mintAddress) ||
      (pendingShieldAsset !== "SOL" && !supportedToken?.owner)
    ) {
      return;
    }

    recordedStateSignatureRef.current = activeStateSignature;

    void refreshShieldState()
      .then(async () => {
        const zkRecord =
          pendingShieldAsset === "SOL"
            ? null
            : await recordCanonicalShieldFromLiveShield({
                amountDisplay: pendingShieldAmountDisplay,
                amountNumeric: pendingShieldAmount,
                assetSymbol: selectedShieldAsset.assetKey,
                createdAt: Date.now(),
                depositSignature: pendingDepositSignature ?? undefined,
                mintAddress: selectedShieldAsset.mintAddress!,
                owner: supportedToken!.owner!,
                stateSignature: activeStateSignature,
                tokenDecimals: readTokenDecimals(supportedToken!.balance),
                vaultOwner: selectedShieldAsset.vaultOwner!,
              });

        const privateCoreShield =
          pendingShieldAsset === "VUSD"
            ? runPrivateCoreShield({
                amountDisplay: pendingShieldAmountDisplay,
                asset: "VUSD",
              })
            : null;
        const nextBalance = Number((targetShieldedBalance + pendingShieldAmount).toFixed(6));

        if (!pendingProtocolSettlement?.capability.sourceAsset || !walletAddress) {
          throw new Error("Shield protocol settlement is missing its source asset or owner.");
        }

        if (!pendingProtocolSettlement.capability.targetShieldAsset) {
          throw new Error("Shield protocol settlement is missing its target shield asset.");
        }

        if (!pendingDepositSignature) {
          throw new Error("Shield protocol settlement is missing its deposit signature.");
        }

        const committedRequest = createVantaShieldCommittedEconomicsSettlementRequest({
          amount: pendingShieldAmountDisplay,
          depositSignature: pendingDepositSignature,
          owner: walletAddress,
          routeEvidence: pendingProtocolSettlement.routeEvidence,
          settlementId: activeStateSignature,
          shieldCapability: pendingProtocolSettlement.capability,
          sourceAsset: pendingProtocolSettlement.capability.sourceAsset.symbol,
          vaultOwner: selectedShieldAsset.vaultOwner!,
        });
        let protocolSettlement: Awaited<
          ReturnType<typeof requestVantaPrivatePoolV2ProtocolSettlement>
        > | null = null;
        let protocolSettlementWarning: string | null = null;

        try {
          protocolSettlement = await runShieldWithDecoys(() =>
            requestVantaPrivatePoolV2ProtocolSettlement(committedRequest),
          );

          if (!protocolSettlement) {
            protocolSettlementWarning =
              "Private Pool v2 receipt service did not return a Shield receipt.";
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
          protocolSettlementWarning = toErrorMessage(
            error,
            "Private Pool v2 Shield receipt could not be checked.",
          );
        }

        setRecentShield({
          amount: pendingShieldAmount,
          asset: pendingShieldAsset ?? selectedShieldAsset.assetKey,
          depositSignature: pendingDepositSignature ?? undefined,
          protocolSettlementReceipt: protocolSettlementWarning
            ? undefined
            : protocolSettlement?.protocolSettlementReceipt,
          proofReceipt: protocolSettlementWarning ? undefined : protocolSettlement?.proofReceipt,
          resultingShieldedBalance: nextBalance,
          settlement: "confirmed_deposit",
          signature: activeStateSignature,
          source: "shield",
          timestamp: Date.now(),
          zkBridge:
            pendingShieldAsset === "VUSD" && zkRecord
              ? {
                  commitment:
                    privateCoreShield?.sourceNoteCommitment || zkRecord.artifacts.commitment.value,
                  insertionIndex: zkRecord.insertion.index,
                  root: privateCoreShield?.sourceMerkleRoot || zkRecord.insertion.root,
                  source: "canonical_note_v1",
                }
              : undefined,
        });

        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingNativeSolDepositRecovery(false);
        setPendingProtocolSettlement(null);
        setPendingUmbraApprovalDisplay(null);
        setFlowError(protocolSettlementWarning);
        setStatus("complete");
        void supportedToken?.refresh();
      })
      .catch((error) => {
        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingNativeSolDepositRecovery(false);
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
    pendingProtocolSettlement,
    nativeSolShieldTransaction.signature,
    nativeSolShieldWait.waitStatus,
    refreshShieldState,
    runPrivateCoreShield,
    selectedShieldAsset,
    setRecentShield,
    stateSignatureWait.waitStatus,
    stateTransaction.signature,
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
    publicRouteTransaction.reset();
    splShieldTransferTransaction.reset();
    nativeSolShieldTransaction.reset();
    supportedToken?.resetSend();
    stateTransaction.reset();
    setRecentShield(null);
    setFlowError(null);
    setPendingPublicRoute(null);
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
    setPendingNativeSolDepositRecovery(false);
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

      const quote = await fetchPublicToVusdQuote({
        amount,
        inputAsset: selectedSourceAsset,
        outputAsset: selectedShieldAsset.assetKey,
      });
      const instructions = await buildPublicToVusdSwapInstructions({
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
      setPendingDepositSignature(null);
      setPendingShieldAsset(null);
      setPendingNativeSolDepositRecovery(false);
      setPendingUmbraApprovalDisplay(null);
    }
  }

  let validationMessage = "Choose an asset and amount. Vanta will show the route before you approve.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to shield assets.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps shielding visible but prevents live transfers while production services are offline.";
  } else if (publicAssetsLoading) {
    validationMessage = "Loading wallet assets.";
  } else if (publicAssetsError) {
    validationMessage = `${publicAssetsError} Refresh the page or try another wallet RPC.`;
  } else if (!selectedSourceAsset) {
    validationMessage = "No wallet assets are currently available to shield.";
  } else if (selectedVaultOwnerResolution.kind === "derived-pda") {
    validationMessage = selectedVaultOwnerResolution.blocker;
  } else if (!selectedShieldAsset?.mintAddress || !selectedShieldAsset.vaultOwner) {
    validationMessage = "The selected shield target is not configured.";
  } else if (capability.blockers.length > 0) {
    validationMessage = capability.blockers[0] ?? "This asset is not currently supported.";
  } else if (supportedToken?.status === "loading" || supportedToken?.isFetching) {
    validationMessage = "Refreshing the target shield asset balance.";
  } else if (supportedToken?.status === "error") {
    validationMessage = "The app could not read the target shield asset balance.";
  } else if (!shieldStateReady) {
    validationMessage = "This shield route is not ready yet.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta shielded state.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
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
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Shielded balance: {targetShieldedBalanceLabel}
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
              <p className="shield-helper">{validationMessage}</p>
              {isNativeSolShield && (
                <div className="shield-recovery-panel">
                  <div>
                    <strong>Recover SOL already sent to the vault</strong>
                    <p>
                      {latestRecoverableSolDeposit
                        ? `${latestRecoverableSolDeposit.amountDisplay} SOL reached the Vanta vault but has no matching shield-state record yet.`
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
                  {status === "awaiting_wallet_confirmation"
                    ? "Awaiting wallet confirmation"
                    : status === "routing_public_swap"
                      ? "Preparing shield route"
                      : status === "shielding_in_progress"
                        ? "Shielding in progress"
                        : status === "entering_shielded_state"
                          ? "Adding to private balance"
                          : status === "complete"
                            ? "Shield complete"
                            : "Shield failed"}
                </span>
                <p>
                  {status === "complete"
                    ? recentShield
                      ? flowError
                        ? `${formatAssetAmount(recentShield.amount, recentShield.asset)} is now available in shielded state. Receipt check warning: ${flowError}`
                        : `${formatAssetAmount(recentShield.amount, recentShield.asset)} is now available in shielded state.`
                      : "The selected asset was shielded successfully."
                    : status === "failed"
                      ? flowError ?? "The shield action could not be completed."
                      : status === "routing_public_swap"
                        ? `Routing ${selectedSourceAsset?.symbol ?? "the source asset"} into ${targetShieldSymbol ?? "the selected shield asset"} before entering Vanta.`
                        : status === "shielding_in_progress"
                          ? "Submitting the shield transfer into the Vanta vault."
                        : status === "entering_shielded_state"
                            ? "Adding this to your private balance."
                            : "Approve the shield action in your wallet to continue."}
                </p>
                {pendingUmbraApprovalDisplay && status !== "complete" && status !== "failed" && (
                  <details className="shield-approval-review" aria-label="Wallet approval review">
                    <summary>
                      <span>Private rail approval</span>
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
                {stateProgressLabel && status === "entering_shielded_state" && (
                  <p className="shield-helper shield-helper--meta">{stateProgressLabel}</p>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
