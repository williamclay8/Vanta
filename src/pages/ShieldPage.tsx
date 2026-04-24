import { useEffect, useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { buildNativeSolShieldTransferInstructions } from "@/solana/nativeSolShield";
import {
  buildPublicToVusdSwapInstructions,
  createPublicShieldRouteEvidence,
  fetchPublicToVusdQuote,
  formatAssetAmount,
  type PublicShieldRouteEvidence,
  type PublicToVusdQuote,
} from "@/solana/publicSwapRoute";
import { requestVantaPrivatePoolV2ProtocolSettlement } from "@/privacy/privatePoolV2ProtocolSettlementClient";
import { createUmbraShieldActionApprovalReview } from "@/privacy/umbraShieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { createShieldAssetCapability } from "@/solana/shieldAssetCapability";
import {
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { selectUniversalShieldTarget } from "@/solana/universalShieldTarget";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { buildSplTokenShieldTransferInstructions } from "@/solana/splShieldTransfer";
import { useWalletPublicAssets } from "@/solana/useWalletPublicAssets";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import {
  createNativeSolShieldMemoInstruction,
  createShieldMemoInstruction,
  VANTA_NATIVE_SOL_ASSET_ID,
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

export function ShieldPage(_props: ShieldPageProps) {
  const { recentShield, runPrivateCoreShield, setRecentShield } = usePrivacyFlow();
  const { solBalance, walletAddress, walletConnected } = useWalletState();
  const shieldRegistry = useVantaShieldAssetRegistryState();
  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState("native:SOL");
  const [amount, setAmount] = useState("");
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
  const recordedStateSignatureRef = useRef<string | null>(null);

  const executableShieldTargets = useMemo(
    () =>
      shieldRegistry.configuredEntries.filter(
        (entry) => entry.asset.configured && entry.asset.mintAddress && entry.asset.vaultOwner,
      ),
    [shieldRegistry.configuredEntries],
  );
  const {
    assets: executableSourceAssets,
    error: publicAssetsError,
    loading: publicAssetsLoading,
  } = useWalletPublicAssets({
    solBalance,
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
  const selectedShieldAsset = selectedRegistryEntry?.asset ?? null;
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
  const maxAvailableAmount = sourceBalance;
  const routeProgressLabel = publicRouteWait.detailLabel;
  const stateProgressLabel = stateSignatureWait.detailLabel;
  const isAmountValid =
    walletConnected &&
    !!selectedShieldAsset?.mintAddress &&
    !!selectedShieldAsset?.vaultOwner &&
    !!selectedSourceAsset &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= sourceBalance;
  const sourceSelectValue = selectedSourceAsset?.id ?? "";
  const sourceSelectDisabled =
    !walletConnected || publicAssetsLoading || executableSourceAssets.length === 0;
  const sourcePlaceholderLabel = !walletConnected
    ? "Connect wallet"
    : publicAssetsLoading
      ? "Loading assets..."
      : publicAssetsError
        ? "Asset load failed"
        : "No wallet assets available";

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
      cluster: "devnet",
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
    if (!walletAddress || !selectedShieldAsset?.mintAddress || !selectedShieldAsset.vaultOwner) {
      throw new Error("Native SOL shield target is not configured.");
    }

    setPendingShieldAmount(amountNumeric);
    setPendingShieldAmountDisplay(amountDisplay);
    setPendingDepositSignature(null);
    setPendingShieldAsset("SOL");
    setPendingProtocolSettlement({ capability, routeEvidence: null });
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraShieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(amountDisplay, 9),
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: selectedShieldAsset.mintAddress,
        requester: walletAddress,
      }),
    );
    setStatus("awaiting_wallet_confirmation");

    const instructions = buildNativeSolShieldTransferInstructions({
      amount: amountDisplay,
      owner: walletAddress,
      vaultOwner: selectedShieldAsset.vaultOwner,
    });

    await nativeSolShieldTransaction.send({
      amount: amountDisplay,
      asset: "SOL",
      cluster: "devnet",
      connectedWalletAddress: walletAddress,
      estimatedFees: "wallet-estimated",
      feePayer: walletAddress,
      humanApprovedSummary: true,
      instructions,
      label: "shield-native-sol",
      recipient: selectedShieldAsset.vaultOwner,
      summaryInstructions: ["native-sol-shield-transfer"],
      transactionFingerprint: `shield-native-sol:${walletAddress}:${selectedShieldAsset.vaultOwner}:${amountDisplay}`,
    });
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
      setPendingPublicRoute(null);
      setPendingUmbraApprovalDisplay(null);
      setFlowError(
        toErrorMessage(nativeSolShieldTransaction.error, "The native SOL shield transfer could not be completed."),
      );
      return;
    }

    if (nativeSolShieldTransaction.status === "success" && nativeSolShieldTransaction.signature) {
      setStatus("shielding_in_progress");
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
    setFlowError(
      toErrorMessage(
        splShieldTransferWait.waitError,
        "The shield transfer was submitted but not confirmed.",
      ),
    );
  }, [splShieldTransferWait.waitError, splShieldTransferWait.waitStatus]);

  useEffect(() => {
    const depositConfirmed =
      pendingShieldAsset === "SOL"
        ? nativeSolShieldWait.waitStatus === "success"
        : splShieldTransferWait.waitStatus === "success";

    if (
      !depositConfirmed ||
      pendingShieldAmount === null ||
      !pendingDepositSignature ||
      !selectedShieldAsset?.vaultOwner ||
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
            ? createNativeSolShieldMemoInstruction({
                amount: pendingShieldAmountDisplay ?? amount,
                assetId: VANTA_NATIVE_SOL_ASSET_ID,
                createdAt: Date.now(),
                depositSignature: pendingDepositSignature,
                owner,
                vaultOwner,
              })
            : createShieldMemoInstruction({
                amount: pendingShieldAmountDisplay ?? amount,
                asset: selectedShieldAsset.assetKey,
                createdAt: Date.now(),
                depositSignature: pendingDepositSignature,
                mintAddress,
                owner,
                vaultOwner,
              }),
        ];

        return stateTransaction.send({
          amount: pendingShieldAmountDisplay ?? amount,
          asset: selectedShieldAsset.assetKey,
          cluster: "devnet",
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
    nativeSolShieldWait.waitStatus,
    selectedShieldAsset,
    splShieldTransferWait.waitStatus,
    stateTransaction,
    supportedToken,
    walletAddress,
  ]);

  useEffect(() => {
    if (
      stateSignatureWait.waitStatus !== "success" ||
      !stateTransaction.signature ||
      recordedStateSignatureRef.current === stateTransaction.signature ||
      pendingShieldAmount === null ||
      !pendingShieldAmountDisplay ||
      !selectedShieldAsset?.vaultOwner ||
      (pendingShieldAsset !== "SOL" && !selectedShieldAsset?.mintAddress) ||
      (pendingShieldAsset !== "SOL" && !supportedToken?.owner)
    ) {
      return;
    }

    recordedStateSignatureRef.current = stateTransaction.signature;

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
                stateSignature: stateTransaction.signature!,
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

        setRecentShield({
          amount: pendingShieldAmount,
          asset: pendingShieldAsset ?? selectedShieldAsset.assetKey,
          depositSignature: pendingDepositSignature ?? undefined,
          resultingShieldedBalance: nextBalance,
          settlement: "confirmed_deposit",
          signature: stateTransaction.signature ?? undefined,
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

        if (pendingProtocolSettlement?.capability.sourceAsset && walletAddress) {
          void requestVantaPrivatePoolV2ProtocolSettlement({
            action: "shield",
            amount: pendingShieldAmountDisplay,
            asset: pendingProtocolSettlement.capability.sourceAsset.symbol,
            destination:
              pendingProtocolSettlement.capability.targetShieldAsset?.mintAddress ??
              selectedShieldAsset.mintAddress!,
            owner: walletAddress,
            settlementId: stateTransaction.signature!,
            shieldCapability: pendingProtocolSettlement.capability,
            shieldRouteEvidence: pendingProtocolSettlement.routeEvidence,
          }).catch(() => null);
        }

        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingProtocolSettlement(null);
        setPendingUmbraApprovalDisplay(null);
        setFlowError(null);
        setStatus("complete");
        void supportedToken?.refresh();
      })
      .catch((error) => {
        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setPendingShieldAsset(null);
        setPendingProtocolSettlement(null);
        setPendingUmbraApprovalDisplay(null);
        setStatus("failed");
        setFlowError(
          toErrorMessage(
            error,
            "Shield settled, but the canonical shield bridge could not be recorded.",
          ),
        );
      });
  }, [
    pendingDepositSignature,
    pendingShieldAsset,
    pendingShieldAmount,
    pendingShieldAmountDisplay,
    pendingProtocolSettlement,
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
      !selectedShieldAsset?.mintAddress ||
      !selectedShieldAsset.vaultOwner ||
      !supportedToken
    ) {
      return;
    }

    recordedStateSignatureRef.current = null;
    publicRouteTransaction.reset();
    splShieldTransferTransaction.reset();
    nativeSolShieldTransaction.reset();
    supportedToken.resetSend();
    stateTransaction.reset();
    setRecentShield(null);
    setFlowError(null);
    setPendingPublicRoute(null);
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingDepositSignature(null);
    setPendingShieldAsset(null);
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
        cluster: "devnet",
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
      setPendingUmbraApprovalDisplay(null);
    }
  }

  let validationMessage = "Choose a source asset, enter an amount, and Vanta will shield it automatically.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to shield assets.";
  } else if (isBetaMode) {
    validationMessage = "Beta mode keeps shielding visible but prevents live transfers while production services are offline.";
  } else if (publicAssetsLoading) {
    validationMessage = "Loading wallet assets.";
  } else if (publicAssetsError) {
    validationMessage = publicAssetsError;
  } else if (!selectedSourceAsset) {
    validationMessage = "No wallet assets are currently available to shield.";
  } else if (!selectedShieldAsset?.mintAddress || !selectedShieldAsset.vaultOwner) {
    validationMessage = "The selected shield target is not configured.";
  } else if (capability.blockers.length > 0) {
    validationMessage = capability.blockers[0] ?? "This asset is not currently supported.";
  } else if (supportedToken?.status === "loading" || supportedToken?.isFetching) {
    validationMessage = "Refreshing the target shield asset balance.";
  } else if (supportedToken?.status === "error") {
    validationMessage = "The app could not read the target shield asset balance.";
  } else if (!shieldStateReady) {
    validationMessage = "The Vanta shield state layer is not fully configured for this target yet.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta shielded state.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (amount.trim() === "") {
    validationMessage = "Enter an amount to shield.";
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
          <span className="eyebrow product-intro__eyebrow">Shield</span>
          <h2>Shield</h2>
          <p>{routeLabel}</p>
        </div>
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Shield</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>You send</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Balance: {selectedSourceAsset ? formatAssetAmount(sourceBalance, selectedSourceAsset.symbol) : sourcePlaceholderLabel}
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
                  <span>Asset</span>
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
                        {asset.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Shielded state</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Shielded balance: {targetShieldSymbol ? formatAssetAmount(targetShieldedBalance, targetShieldSymbol) : "Unavailable"}
                  </div>
                </div>
                <div className="swap-quote-line">
                  <strong>{isNativeSolShield ? "Shielded SOL" : capability.targetShieldAsset?.label ?? "Shielded asset"}</strong>
                  <span>{targetShieldName ?? "Target unavailable"}</span>
                </div>
                <p className="shield-helper shield-helper--route">
                  Route: {selectedSourceAsset?.symbol ?? "Asset"} {"->"} {capability.targetShieldAsset?.label ?? "Shielded asset"}
                </p>
              </div>

              <p className="shield-helper shield-helper--meta">{routeLabel}</p>
              <p className="shield-helper">{validationMessage}</p>

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
                      ? "Routing source asset"
                      : status === "shielding_in_progress"
                        ? "Shielding in progress"
                        : status === "entering_shielded_state"
                          ? "Entering shielded state"
                          : status === "complete"
                            ? "Shield complete"
                            : "Shield failed"}
                </span>
                <p>
                  {status === "complete"
                    ? recentShield
                      ? `${formatAssetAmount(recentShield.amount, recentShield.asset)} is now available in shielded state.`
                      : "The selected asset was shielded successfully."
                    : status === "failed"
                      ? flowError ?? "The shield action could not be completed."
                      : status === "routing_public_swap"
                        ? `Routing ${selectedSourceAsset?.symbol ?? "the source asset"} into ${targetShieldSymbol ?? "the selected shield asset"} before entering Vanta.`
                        : status === "shielding_in_progress"
                          ? "Submitting the shield transfer into the Vanta vault."
                          : status === "entering_shielded_state"
                            ? "Recording the Vanta shield state note."
                            : "Approve the shield action in your wallet to continue."}
                </p>
                {pendingUmbraApprovalDisplay && status !== "complete" && status !== "failed" && (
                  <details className="shield-approval-review" aria-label="Wallet approval review">
                    <summary>
                      <span>Private rail approval</span>
                      <strong>{pendingUmbraApprovalDisplay.walletPrompt}</strong>
                    </summary>
                    <div className="shield-approval-review__rows">
                      {pendingUmbraApprovalDisplay.rows.slice(0, 4).map((row) => (
                        <div key={row.label}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
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
