import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSendTransaction,
} from "@solana/react-hooks";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  getLiveShieldTokenAsset,
  getPrimaryLiveShieldTokenAsset,
  listLiveShieldTokenAssets,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import { createShieldMemoInstruction } from "@/solana/vantaShieldState";
import {
  listCanonicalShieldDiagnosticsSummaries,
  recordCanonicalShieldFromLiveShield,
} from "@/zk/liveShieldBridge";

type ShieldPageProps = {
  dashboard?: boolean;
};

type AssetConfig = {
  symbol: LiveShieldTokenAssetKey;
  name: string;
  live: boolean;
  supported: boolean;
  statusLabel: string;
};

type ShieldStatus =
  | "idle"
  | "review"
  | "awaiting_wallet_confirmation"
  | "shielding_in_progress"
  | "entering_shielded_state"
  | "complete"
  | "failed";

function formatBalance(value: number, symbol: string) {
  try {
    const decimals = Math.min(getLiveShieldTokenAsset(symbol as LiveShieldTokenAssetKey).decimals, 6);
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: Math.min(decimals, 2),
      maximumFractionDigits: decimals,
    })} ${symbol}`;
  } catch {
    // fall through to generic formatting for non-registry symbols
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} ${symbol}`;
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function abbreviate(value: string | null) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function ShieldPage({ dashboard = false }: ShieldPageProps) {
  const {
    privateCoreHoldState,
    privateCoreOwner,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestConsumeProof,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorLatestSendLinkedProof,
    privateCoreOperatorLatestSend,
    privateCoreOperatorLatestSwapProof,
    privateCoreOperatorLatestSwapLinkedProof,
    privateCoreOperatorLatestSwap,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorContractMirrorPrimaryNote,
    privateCoreOperatorContractMirrorStatusLabel,
    privateCoreOperatorReleaseBoundaryPrimaryNote,
    privateCoreOperatorReleaseBoundaryStatusLabel,
    privateCoreOperatorRequiredLanesPrimaryNote,
    privateCoreOperatorRequiredLanesStatusLabel,
    privateCoreOperatorZkV1ShippingPrimaryNote,
    privateCoreOperatorZkV1ShippingStatusLabel,
    privateCoreOperatorZkV1FinishLinePrimaryNote,
    privateCoreOperatorZkV1FinishLineStatusLabel,
    privateCoreOperatorSendBoundaryPrimaryNote,
    privateCoreOperatorSendBoundaryStatusLabel,
    privateCoreOperatorSendContinuityPrimaryNote,
    privateCoreOperatorSendContinuityStatusLabel,
    privateCoreOperatorSwapBoundaryPrimaryNote,
    privateCoreOperatorSwapBoundaryStatusLabel,
    privateCoreOperatorSwapContinuityPrimaryNote,
    privateCoreOperatorSwapContinuityStatusLabel,
    privateCoreOperatorSupportedSendLaneKind,
    privateCoreOperatorSupportedSendLaneNote,
    privateCoreOperatorSupportedSendLaneStatus,
    privateCoreOperatorSupportedSendLaneVersion,
    privateCoreOperatorSupportedSendV1Decision,
    privateCoreOperatorSupportedSendV1DecisionNote,
    privateCoreOperatorSupportedUnshieldLaneKind,
    privateCoreOperatorSupportedUnshieldLaneNote,
    privateCoreOperatorSupportedUnshieldLaneStatus,
    privateCoreOperatorSupportedUnshieldLaneVersion,
    privateCoreOperatorSupportedUnshieldV1Decision,
    privateCoreOperatorSupportedUnshieldV1DecisionNote,
    privateCoreOperatorSupportedReleaseLaneKind,
    privateCoreOperatorSupportedReleaseLaneNote,
    privateCoreOperatorSupportedReleaseLaneStatus,
    privateCoreOperatorSupportedReleaseLaneVersion,
    privateCoreOperatorSupportedSwapLaneKind,
    privateCoreOperatorSupportedSwapLaneNote,
    privateCoreOperatorSupportedSwapLaneStatus,
    privateCoreOperatorSupportedSwapLaneVersion,
    privateCoreOperatorSupportedSwapV1Decision,
    privateCoreOperatorSupportedSwapV1DecisionNote,
    privateCoreOperatorSupportedSwapV1Role,
    privateCoreOperatorSupportedSwapV1RoleNote,
    privateCoreOperatorSupportedSwapVenue,
    privateCoreOperatorSupportedSwapOutputModel,
    privateCoreOperatorSupportedSwapResultingRootBasis,
    privateCoreOperatorSupportedSwapInputRootPolicy,
    privateCoreOperatorSupportedSwapOutputRegistrationPolicy,
    privateCoreOperatorSupportedReleaseV1Decision,
    privateCoreOperatorSupportedReleaseV1DecisionNote,
    privateCoreOperatorSupportedFlowKind,
    privateCoreOperatorSupportedFlowNote,
    privateCoreOperatorSupportedFlowStatus,
    privateCoreOperatorSupportedFlowVersion,
    privateCoreOperatorSupportedZkV1ScopeDecision,
    privateCoreOperatorSupportedZkV1ScopeNote,
    privateCoreOperatorSupportedZkV1RequiredLanes,
    privateCoreOperatorSupportedZkV1RequiredLanesNote,
    privateCoreOperatorSupportedAssetSymbol,
    privateCoreOperatorSupportedEnvironment,
    privateCoreOperatorSupportedNoteSchema,
    privateCoreOperatorSupportedNoteVersion,
    privateCoreOperatorSupportedRootRegistrationProvenance,
    privateCoreOperatorSupportedSendResultingRootBasis,
    privateCoreOperatorSupportedSendInputRootPolicy,
    privateCoreOperatorSupportedSendOutputRegistrationPolicy,
    privateCoreOperatorSupportedRecipientModel,
    privateCoreOperatorSupportedReleaseDestinationModel,
    privateCoreOperatorSupportedProofSystem,
    privateCoreOperatorSupportedUnshieldCircuit,
    privateCoreOperatorSupportedSendCircuit,
    privateCoreOperatorSupportedUnshieldMerkleDepth,
    privateCoreOperatorSupportedSendMerkleDepth,
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    privateCoreOperatorSupportedReleaseRootPolicy,
    privateCoreOperatorSupportedReleaseExecutionModel,
    privateCoreOperatorSupportedReleaseAtomicityModel,
    privateCoreOperatorSupportedReleasePersistenceModel,
    privateCoreOperatorOwnerAuthorizationMode,
    privateCoreOperatorOwnerAuthorizationDecision,
    privateCoreOperatorOwnerAuthorizationDecisionNote,
    privateCoreOperatorSourceArtifactTruthBasis,
    privateCoreOperatorProvingArtifactTruthBasis,
    privateCoreOperatorSourceProvingRelationship,
    privateCoreOperatorNullifierKeyMode,
    privateCoreOperatorProvingHashLane,
    privateCoreOperatorCurrentRootLinkedProof,
    privateCoreOperatorCurrentRootProofLinkStatus,
    privateCoreOperatorSendResultingRootLinkedProof,
    privateCoreOperatorSendResultingRootRecord,
    privateCoreOperatorSendResultingRootPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationStatusLabel,
    privateCoreOperatorSendResultingRootProofLinkStatus,
    privateCoreOperatorSendResultingRootStatusLabel,
    privateCoreOperatorSwapResultingRootLinkedProof,
    privateCoreOperatorSwapResultingRootRecord,
    privateCoreOperatorSwapResultingRootPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSwapResultingRootRegistrationStatusLabel,
    privateCoreOperatorSwapResultingRootProofLinkStatus,
    privateCoreOperatorSwapResultingRootStatusLabel,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorProofSwapLinkStatus,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootError,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreOperatorContractStateVersion,
    privateCoreOperatorContractVersion,
    privateCoreOperatorContractSummaryVersion,
    privateCoreOperatorStatusKind,
    privateCoreOperatorStatusVersion,
    privateCoreOperatorSnapshotKind,
    privateCoreOperatorSnapshotVersion,
    privateCoreOperatorSupportedStatusNote,
    privateCoreOperatorSupportedStatusTransport,
    privateCoreOperatorSupportedStatusEndpoint,
    privateCoreOperatorSupportedStatusGateVersion,
    privateCoreOperatorSupportedStatusGateKind,
    privateCoreOperatorSupportedStatusGateNote,
    privateCoreOperatorSupportedStatusGateTransport,
    privateCoreOperatorSupportedStatusGateEndpoint,
    privateCoreOperatorSupportedSnapshotGateVersion,
    privateCoreOperatorSupportedSnapshotGateKind,
    privateCoreOperatorSupportedSnapshotGateNote,
    privateCoreOperatorSupportedSnapshotGateTransport,
    privateCoreOperatorSupportedSnapshotGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionGateVersion,
    privateCoreOperatorSupportedShippingDecisionGateKind,
    privateCoreOperatorSupportedShippingDecisionGateNote,
    privateCoreOperatorSupportedShippingDecisionGateTransport,
    privateCoreOperatorSupportedShippingDecisionGateEndpoint,
    privateCoreOperatorSupportedShippingDecisionTransport,
    privateCoreOperatorSupportedShippingDecisionEndpoint,
    privateCoreOperatorSupportedShippingArtifactGateVersion,
    privateCoreOperatorSupportedShippingArtifactGateKind,
    privateCoreOperatorSupportedShippingArtifactGateNote,
    privateCoreOperatorSupportedShippingArtifactGateTransport,
    privateCoreOperatorSupportedShippingArtifactGateEndpoint,
    privateCoreOperatorSupportedSnapshotNote,
    privateCoreOperatorSupportedSnapshotTransport,
    privateCoreOperatorSupportedSnapshotEndpoint,
    privateCoreOperatorSupportedShippingArtifactNote,
    privateCoreOperatorSupportedShippingArtifactTransport,
    privateCoreOperatorSupportedShippingArtifactEndpoint,
    privateCoreOperatorSupportedReleaseCandidateVersion,
    privateCoreOperatorSupportedReleaseCandidateKind,
    privateCoreOperatorSupportedReleaseCandidateNote,
    privateCoreOperatorSupportedReleaseCandidateScope,
    privateCoreOperatorSupportedReleaseCandidateScopeNote,
    privateCoreOperatorSupportedReleaseCandidateGateVersion,
    privateCoreOperatorSupportedReleaseCandidateGateKind,
    privateCoreOperatorSupportedReleaseCandidateGateNote,
    privateCoreOperatorSupportedReleaseCandidateGateTransport,
    privateCoreOperatorSupportedReleaseCandidateGateEndpoint,
    privateCoreOperatorSupportedReleaseCandidateTransport,
    privateCoreOperatorSupportedReleaseCandidateEndpoint,
    privateCoreOperatorShippingArtifactKind,
    privateCoreOperatorShippingArtifactVersion,
    privateCoreOperatorShippingDecisionKind,
    privateCoreOperatorShippingDecisionVersion,
    privateCoreOperatorSupportedShippingDecisionNote,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSwaps,
    privateCoreOperatorSwapProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    privateCoreSendState,
    privateCoreSwapState,
    privateCoreUnshieldState,
    recentShield,
    runPrivateCoreShield,
    setRecentShield,
  } = usePrivacyFlow();
  const {
    clusterLabel,
    connectWallet,
    currentConnectorName,
    disconnectWallet,
    preferredWalletConnector,
    walletAddressShort,
    walletConnected,
    walletReady,
  } = useWalletState();
  const primaryShieldAsset = getPrimaryLiveShieldTokenAsset();
  const [selectedAsset, setSelectedAsset] = useState<LiveShieldTokenAssetKey>(
    primaryShieldAsset.assetKey,
  );
  const [amount, setAmount] = useState("0.25");
  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingShieldAmount, setPendingShieldAmount] = useState<number | null>(null);
  const [pendingShieldAmountDisplay, setPendingShieldAmountDisplay] = useState<string | null>(null);
  const [pendingDepositSignature, setPendingDepositSignature] = useState<string | null>(null);
  const recordedStateSignatureRef = useRef<string | null>(null);

  const shieldAssetRegistry = useVantaShieldAssetRegistryState();
  const assetCatalog = useMemo<AssetConfig[]>(
    () =>
      shieldAssetRegistry.entries.map((entry) => ({
        symbol: entry.asset.assetKey,
        name: entry.asset.name,
        live: entry.asset.configured,
        supported: true,
        statusLabel: entry.asset.configured ? "Live on devnet" : "Needs config",
      })),
    [shieldAssetRegistry.entries],
  );
  const selectedConfig = assetCatalog.find((asset) => asset.symbol === selectedAsset) ?? assetCatalog[0]!;
  const selectedRegistryEntry = shieldAssetRegistry.byAssetKey[selectedConfig.symbol];
  const supportedToken = selectedRegistryEntry.token;
  const shieldAccount = selectedRegistryEntry.account;
  const shieldStateError = selectedRegistryEntry.error;
  const shieldStateReady = selectedRegistryEntry.isReady;
  const shieldStateRefreshing = selectedRegistryEntry.isRefreshing;
  const refreshShieldState = selectedRegistryEntry.refresh;
  const selectedShieldAsset = selectedRegistryEntry.asset;
  const signatureWait = useRealtimeSignatureProgress(supportedToken.sendSignature ?? undefined, {
    commitment: "confirmed",
    disabled: !supportedToken.sendSignature,
  });
  const stateTransaction = useSendTransaction();
  const stateSignatureWait = useRealtimeSignatureProgress(
    stateTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !stateTransaction.signature,
    },
  );
  const parsedAmount = Number(amount);
  const hasSupportedAssets = assetCatalog.some((asset) => asset.live && asset.supported);
  const publicBalance = selectedRegistryEntry?.publicBalance ?? 0;
  const shieldedBalance = shieldAccount?.balance ?? 0;
  const depositProgressLabel = signatureWait.detailLabel;
  const stateProgressLabel = stateSignatureWait.detailLabel;
  const hasPublicBalance = publicBalance > 0;
  const isAmountValid =
    walletConnected &&
    selectedConfig.live &&
    selectedConfig.supported &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= publicBalance;

  useEffect(() => {
    if (supportedToken.sendStatus === "loading") {
      setStatus("shielding_in_progress");
      return;
    }

    if (supportedToken.sendStatus === "error") {
      setStatus("failed");
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingDepositSignature(null);
      setFlowError(
        toErrorMessage(
          supportedToken.sendError,
          "The devnet Shield transaction did not complete.",
        ),
      );
      return;
    }

    if (supportedToken.sendStatus === "success" && supportedToken.sendSignature) {
      setStatus("entering_shielded_state");
      setPendingDepositSignature(supportedToken.sendSignature);
    }
  }, [supportedToken.sendError, supportedToken.sendSignature, supportedToken.sendStatus]);

  useEffect(() => {
    if (signatureWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setPendingShieldAmount(null);
    setPendingShieldAmountDisplay(null);
    setPendingDepositSignature(null);
    setFlowError(
      toErrorMessage(
        signatureWait.waitError,
        "The devnet Shield transfer was submitted but not confirmed.",
      ),
    );
  }, [signatureWait.waitError, signatureWait.waitStatus]);

  useEffect(() => {
    if (
      signatureWait.waitStatus !== "success" ||
      pendingShieldAmount === null ||
      !pendingDepositSignature ||
      !selectedShieldAsset.mintAddress ||
      !selectedShieldAsset.vaultOwner ||
      !walletAddressShort
    ) {
      return;
    }

    if (stateTransaction.status === "loading" || stateTransaction.signature) {
      return;
    }

    const owner = supportedToken.owner;

    if (!owner) {
      return;
    }
    const mintAddress = selectedShieldAsset.mintAddress;
    const vaultOwner = selectedShieldAsset.vaultOwner;

    if (!mintAddress || !vaultOwner) {
      return;
    }

    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        mintAddress,
        owner,
        pendingDepositSignature,
        vaultOwner,
      ],
      action: "shield_state",
    }).then((priorityFeeInstructions) =>
      stateTransaction.send({
        instructions: [
          ...priorityFeeInstructions,
          createShieldMemoInstruction({
            amount,
            asset: selectedShieldAsset.assetKey,
            createdAt: Date.now(),
            depositSignature: pendingDepositSignature,
            mintAddress,
            owner,
            vaultOwner,
          }),
        ],
      }),
    ).catch((error) => {
      setStatus("failed");
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingDepositSignature(null);
      setFlowError(
        toErrorMessage(error, "The Vanta shield state note could not be recorded."),
      );
    });
  }, [
    amount,
    pendingDepositSignature,
    pendingShieldAmount,
    selectedShieldAsset.assetKey,
    selectedShieldAsset.mintAddress,
    selectedShieldAsset.vaultOwner,
    signatureWait.waitStatus,
    stateTransaction,
    supportedToken.owner,
    walletAddressShort,
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
    if (
      stateSignatureWait.waitStatus !== "success" ||
      !stateTransaction.signature ||
      recordedStateSignatureRef.current === stateTransaction.signature ||
      pendingShieldAmount === null ||
      !pendingShieldAmountDisplay
    ) {
      return;
    }

    recordedStateSignatureRef.current = stateTransaction.signature;
    const mintAddress = selectedShieldAsset.mintAddress;
    const owner = supportedToken.owner;
    const stateSignature = stateTransaction.signature;
    const vaultOwner = selectedShieldAsset.vaultOwner;

    if (!mintAddress || !owner || !stateSignature || !vaultOwner) {
      setStatus("failed");
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setPendingDepositSignature(null);
      setFlowError("Shield settled, but canonical zk inputs were incomplete.");
      return;
    }

    void refreshShieldState()
      .then(async () => {
        const zkRecord = await recordCanonicalShieldFromLiveShield({
          amountDisplay: pendingShieldAmountDisplay,
          amountNumeric: pendingShieldAmount,
          assetSymbol: selectedShieldAsset.assetKey,
          createdAt: Date.now(),
          depositSignature: pendingDepositSignature ?? undefined,
          mintAddress,
          owner,
          stateSignature,
          tokenDecimals: readTokenDecimals(supportedToken.balance),
          vaultOwner,
        });
        const privateCoreShield =
          selectedShieldAsset.assetKey === "VUSD"
            ? runPrivateCoreShield({
                amountDisplay: pendingShieldAmountDisplay,
                asset: "VUSD",
              })
            : null;
        const nextBalance = Number(
          ((shieldAccount?.balance ?? 0) + pendingShieldAmount).toFixed(6),
        );
        setRecentShield({
          amount: pendingShieldAmount,
          asset: selectedShieldAsset.assetKey as PrivacyAssetKey,
          depositSignature: pendingDepositSignature ?? undefined,
          resultingShieldedBalance: nextBalance,
          settlement: "confirmed_deposit",
          signature: stateTransaction.signature ?? undefined,
          source: "shield",
          timestamp: Date.now(),
          zkBridge:
            selectedShieldAsset.assetKey === "VUSD"
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
        setFlowError(null);
        setStatus("complete");
        void supportedToken.refresh();
      })
      .catch((error) => {
        setPendingShieldAmount(null);
        setPendingShieldAmountDisplay(null);
        setPendingDepositSignature(null);
        setStatus("failed");
        setFlowError(
          toErrorMessage(
            error,
            "Shield deposit settled, but the canonical zk shield bridge could not be recorded.",
          ),
        );
      });
  }, [
    pendingDepositSignature,
    pendingShieldAmount,
    pendingShieldAmountDisplay,
    refreshShieldState,
    runPrivateCoreShield,
    selectedShieldAsset.assetKey,
    selectedShieldAsset.mintAddress,
    selectedShieldAsset.vaultOwner,
    setRecentShield,
    shieldAccount?.balance,
    stateSignatureWait.waitStatus,
    stateTransaction.signature,
    supportedToken,
  ]);

  const remainingPublicBalance =
    isAmountValid && status !== "complete" ? publicBalance - parsedAmount : publicBalance;
  const projectedShieldedBalance =
    isAmountValid && status !== "complete"
      ? shieldedBalance + parsedAmount
      : shieldedBalance;
  const zkDiagnostics = listCanonicalShieldDiagnosticsSummaries().slice(0, 5);

  async function handleShield() {
    if (
      !isAmountValid ||
      !selectedShieldAsset.vaultOwner
    ) {
      return;
    }

    recordedStateSignatureRef.current = null;
    supportedToken.resetSend();
    stateTransaction.reset();
    setFlowError(null);
    setPendingShieldAmount(parsedAmount);
    setPendingShieldAmountDisplay(amount);
    setPendingDepositSignature(null);
    setStatus("awaiting_wallet_confirmation");

    try {
      await supportedToken.send({
        amount,
        destinationOwner: selectedShieldAsset.vaultOwner,
      });
    } catch (error) {
      setPendingShieldAmount(null);
      setPendingShieldAmountDisplay(null);
      setStatus("failed");
      setFlowError(toErrorMessage(error, "Shield request was not approved."));
    }
  }

  let validationMessage =
    "This live path uses a real devnet token balance and a real wallet-signed transfer into the first constrained Vanta vault.";

  if (!walletReady) {
    validationMessage = "Preparing wallet connection layer.";
  } else if (!walletConnected) {
    validationMessage = "Connect a wallet to use real Public Wallet state as the source for Shield.";
  } else if (!hasSupportedAssets) {
    validationMessage =
      "Configure the first controlled devnet token mint and vault owner to activate the live Shield path.";
  } else if (!selectedConfig.supported || !selectedConfig.live) {
    validationMessage = "This asset is not yet wired to real wallet-backed Shield input.";
  } else if (supportedToken.status === "loading" || supportedToken.isFetching) {
    validationMessage = "Reading supported token balance from the connected wallet.";
  } else if (supportedToken.status === "error") {
    validationMessage = "The app could not read the supported token balance from devnet.";
  } else if (!shieldStateReady) {
    validationMessage =
      "The supported token deposit path is live, but the Vanta shield state layer is not fully configured yet.";
  } else if (shieldStateRefreshing) {
    validationMessage = "Refreshing Vanta-recognized shielded state from devnet.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (!hasPublicBalance) {
    validationMessage =
      "No supported shieldable balance is currently available in Public Wallet for the live devnet token.";
  } else if (amount.trim() === "") {
    validationMessage = "Enter an amount to move into the Vanta privacy layer.";
  } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    validationMessage = "Enter a valid amount greater than zero.";
  } else if (parsedAmount > publicBalance) {
    validationMessage = "Amount exceeds the available Public Wallet balance.";
  }

  const progressSteps = [
    "Public Wallet",
    "Awaiting wallet confirmation",
    "Shielding in progress",
    "Entering shielded state",
    "Available for Private Send",
  ];

  const activeStepCount =
    status === "idle"
      ? 1
      : status === "review"
        ? 1
        : status === "awaiting_wallet_confirmation"
          ? 2
          : status === "shielding_in_progress"
            ? 3
            : status === "entering_shielded_state"
              ? 4
              : status === "complete"
                ? 5
                : 2;

  return (
    <section className="shield-page">
      <div className="module-page__hero shield-page__hero">
        <div>
          <span className="eyebrow">{dashboard ? "Dashboard / Shield" : "Live / MVP"}</span>
          <h2>Shield Assets</h2>
          <p>
            Move supported Solana assets out of public wallet flow and into the
            private layer. Shield is where the Vanta lane begins.
          </p>
        </div>

        <div className="module-state">
          <strong>What this page does</strong>
          <p>
            A real devnet wallet signs the deposit. Vanta records the shielded
            state and turns that balance into something private send can use.
          </p>
        </div>
      </div>

      <div className="shield-scenario-bar">
        <div>
          <span>Wallet state</span>
          <p>
            Public Wallet is live on {clusterLabel}. The first token path makes
            a real devnet transfer before Vanta credits private balance.
          </p>
        </div>
        <div className="shield-scenario-pills">
          <span className="scenario-pill scenario-pill--active">
            {walletConnected ? walletAddressShort ?? "Connected" : "Disconnected"}
          </span>
          {currentConnectorName && <span className="scenario-pill">{currentConnectorName}</span>}
        </div>
      </div>

      <div className="shield-layout">
        <article className="shield-card shield-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Shield Assets</span>
              <h3>Enter Privacy Layer</h3>
            </div>
            <small>Source: Public Wallet to Shielded State</small>
          </div>

          <div className="shield-state-grid">
            <div className="state-panel">
              <span>Public Wallet</span>
              <strong>
                {selectedConfig.live && walletConnected
                  ? supportedToken.status === "loading" || supportedToken.isFetching
                    ? "Loading..."
                    : formatBalance(publicBalance, selectedAsset)
                  : "Connect wallet"}
              </strong>
              <p>
                Live source balance from the connected wallet.
              </p>
            </div>

            <div className="state-arrow">
              <span>Enter Privacy Layer</span>
            </div>

            <div className="state-panel state-panel--accent">
              <span>Shielded State</span>
              <strong>{formatBalance(shieldedBalance, selectedAsset)}</strong>
              <p>
                Shielded balance recognized by Vanta after confirmed shield notes.
              </p>
            </div>
          </div>

          {!walletConnected && (
            <div className="shield-banner">
              <strong>Wallet not connected</strong>
              <p>
                Connect a real Solana wallet to use actual Public Wallet state
                as the source for Shield.
              </p>
              {walletReady && preferredWalletConnector ? (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void connectWallet(preferredWalletConnector.id).catch(() => {});
                  }}
                >
                  Connect {preferredWalletConnector.name}
                </button>
              ) : (
                <button className="button button-ghost" type="button" disabled>
                  {walletReady ? "No wallet connector detected" : "Preparing wallets..."}
                </button>
              )}
            </div>
          )}

          {walletConnected && !hasSupportedAssets && (
            <div className="shield-banner shield-banner--warning">
              <strong>Live token path not configured</strong>
              <p>
                Wallet connection is real, but the first controlled devnet
                token mint and Vanta vault owner still need to be configured in
                local environment variables.
              </p>
            </div>
          )}

          <div className="shield-form">
            <div className="shield-form__section">
              <label>Supported assets</label>
              <div className="asset-list">
                {assetCatalog.map((asset) => {
                  const isActive = asset.symbol === selectedAsset;
                  const assetPublicBalance =
                    shieldAssetRegistry.byAssetKey[asset.symbol].publicBalance;

                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      className={isActive ? "asset-row asset-row--active" : "asset-row"}
                      onClick={() => {
                        setSelectedAsset(asset.symbol);
                        setStatus("idle");
                        setRecentShield(null);
                        setFlowError(null);
                      }}
                    >
                      <div>
                        <strong>{asset.name}</strong>
                        <span>{asset.symbol}</span>
                      </div>
                      <div className="asset-row__meta">
                        <small>
                          {asset.live && walletConnected
                            ? formatBalance(assetPublicBalance, asset.symbol)
                            : asset.live
                              ? "Connect wallet"
                              : "Planned"}
                        </small>
                        <em>{asset.statusLabel}</em>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shield-form__section">
              <label htmlFor="shield-amount">Amount</label>
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
                  disabled={
                    !walletConnected ||
                    !selectedConfig.live ||
                    !selectedConfig.supported ||
                    !hasPublicBalance
                  }
                />
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setAmount(publicBalance.toString());
                    setStatus("idle");
                    setRecentShield(null);
                    setFlowError(null);
                  }}
                  disabled={
                    !walletConnected ||
                    !selectedConfig.live ||
                    !selectedConfig.supported ||
                    !hasPublicBalance
                  }
                >
                  Max
                </button>
              </div>

              <div className="percent-row">
                {[25, 50, 75].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    className="percent-pill"
                    disabled={
                      !walletConnected ||
                      !selectedConfig.live ||
                      !selectedConfig.supported ||
                      !hasPublicBalance
                    }
                    onClick={() => {
                      setAmount(((publicBalance * percent) / 100).toFixed(3));
                      setStatus("idle");
                      setRecentShield(null);
                      setFlowError(null);
                    }}
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              <p className="shield-helper">{validationMessage}</p>
              {selectedShieldAsset.configured && walletConnected && (
                <p className="shield-helper shield-helper--meta">
                  Supported token ATA: {supportedToken.balance?.ataAddress?.toString() ?? "Loading..."}
                </p>
              )}

              <div className="preview-grid">
                <div className="preview-card">
                  <span>Remaining Public Wallet</span>
                  <strong>
                    {walletConnected
                      ? formatBalance(Math.max(remainingPublicBalance, 0), selectedAsset)
                      : "--"}
                  </strong>
                </div>
                <div className="preview-card preview-card--accent">
                  <span>Resulting Shielded State</span>
                  <strong>{formatBalance(projectedShieldedBalance, selectedAsset)}</strong>
                </div>
              </div>
            </div>

            <div className="shield-form__actions">
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setRecentShield(null);
                  setFlowError(null);
                }}
                disabled={
                  !isAmountValid ||
                  status === "awaiting_wallet_confirmation" ||
                  status === "shielding_in_progress" ||
                  status === "entering_shielded_state"
                }
              >
                Review shield
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setRecentShield(null);
                  void handleShield();
                }}
                disabled={
                  !isAmountValid ||
                  status === "awaiting_wallet_confirmation" ||
                  status === "shielding_in_progress" ||
                  status === "entering_shielded_state"
                }
              >
                Shield Assets
              </button>
            </div>
          </div>
        </article>

        <article className="shield-card">
          <div className="shield-card__header">
            <div>
              <span>Review panel</span>
              <h3>Transition summary</h3>
            </div>
            <small>{status === "complete" ? "Completed" : "Real devnet token path"}</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Wallet address</span>
              <strong>{walletAddressShort ?? "Not connected"}</strong>
            </div>
            <div className="review-row">
              <span>Selected asset</span>
              <strong>{selectedConfig.symbol}</strong>
            </div>
            <div className="review-row">
              <span>Source</span>
              <strong>Public Wallet</strong>
            </div>
            <div className="review-row">
              <span>Destination</span>
              <strong>Shielded State / Vanta Privacy Layer</strong>
            </div>
            <div className="review-row">
              <span>Live boundary</span>
              <strong>
                {selectedConfig.live
                  ? "Real token deposit plus Vanta state note"
                  : "Asset input not live yet"}
              </strong>
            </div>
            <div className="review-row">
              <span>Next available action</span>
              <strong>Available for Private Send</strong>
            </div>
            {selectedShieldAsset.vaultOwner && (
              <div className="review-row">
                <span>Shield vault owner</span>
                <strong>{abbreviate(selectedShieldAsset.vaultOwner)}</strong>
              </div>
            )}
          </div>

          <p className="shield-review-note">
            After shielding, this balance becomes available for private
            workflows inside Vanta. In this milestone, the supported token path
            performs a real devnet deposit and then writes a minimal Vanta
            state note onchain before the app resolves shielded balance.
          </p>

          {selectedAsset === "VUSD" && (
            <>
              <NoteStatePanel
                account={shieldAccount}
                title="Resolved VUSD notes"
              />
              <LifecycleTimeline
                account={shieldAccount}
                title="VUSD lifecycle timeline"
              />
            </>
          )}

          <div className="progress-rail">
            {progressSteps.map((label, index) => (
              <div
                key={label}
                className={
                  index < activeStepCount
                    ? "progress-step progress-step--active"
                    : "progress-step"
                }
              >
                <span>{label}</span>
              </div>
            ))}
          </div>

          {status === "review" && (
            <div className="status-panel">
              <span>Ready to shield</span>
              <p>
                Public Wallet context is live and the supported token path is
                configured for a real devnet deposit into the Vanta privacy
                layer and a matching Vanta state note.
              </p>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleShield();
                  }}
                >
                  Enter Privacy Layer
                </button>
              </div>
            </div>
          )}

          {status === "awaiting_wallet_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>
                Confirm the supported token transfer from Public Wallet into the
                configured Vanta shield vault.
              </p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "shielding_in_progress" && (
            <div className="status-panel status-panel--processing">
              <span>Shielding in progress</span>
              <p>Submitting the real devnet Shield transfer from Public Wallet.</p>
              {depositProgressLabel && (
                <p className="shield-helper shield-helper--meta">{depositProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "entering_shielded_state" && (
            <div className="status-panel status-panel--processing">
              <span>Entering shielded state</span>
              <p>
                Waiting for confirmed Vanta state settlement before crediting
                Shielded State.
              </p>
              {stateProgressLabel && (
                <p className="shield-helper shield-helper--meta">{stateProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Shield failed</span>
              <p>
                Real wallet state remains connected, but the live devnet Shield
                flow did not complete cleanly.
              </p>
              {flowError && <p className="shield-helper shield-helper--error">{flowError}</p>}
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setFlowError(null);
                  setStatus("review");
                }}
              >
                Retry shield
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="status-panel status-panel--success">
              <span>Shield complete</span>
              <p>
                {recentShield
                  ? `${formatBalance(recentShield.amount, recentShield.asset)} is now in shielded state and available for private workflows inside the Vanta layer.`
                  : "The supported token deposit was confirmed and shielded state has been updated."}
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Amount shielded</span>
                  <strong>
                    {formatBalance(recentShield?.amount ?? parsedAmount, selectedAsset)}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Resulting shielded balance</span>
                  <strong>{formatBalance(shieldedBalance, selectedAsset)}</strong>
                </div>
              </div>
              {privateCoreRecentShield && (
                <div className="status-panel status-panel--processing" style={{ marginTop: 16 }}>
                  <span>Private note created</span>
                  <p>
                    Your private balance is now shielded inside the Vanta Private Core v0.1 lane,
                    with encrypted recovery material and Merkle-backed witness state ready for hold and unshield.
                  </p>
                  <div className="review-list" style={{ marginTop: 12 }}>
                    <div className="review-row">
                      <span>Private owner</span>
                      <strong>{abbreviate(privateCoreOwner.publicKey) ?? privateCoreOwner.publicKey}</strong>
                    </div>
                    <div className="review-row">
                      <span>Source note commitment</span>
                      <strong>{abbreviate(privateCoreRecentShield.sourceNoteCommitment) ?? privateCoreRecentShield.sourceNoteCommitment}</strong>
                    </div>
                    <div className="review-row">
                      <span>Source Merkle root</span>
                      <strong>{abbreviate(privateCoreRecentShield.sourceMerkleRoot) ?? privateCoreRecentShield.sourceMerkleRoot}</strong>
                    </div>
                    <div className="review-row">
                      <span>Encrypted payload</span>
                      <strong>{privateCoreRecentShield.encryptedPayload ? "Present" : "Missing"}</strong>
                    </div>
                    {privateCoreHoldState && (
                      <div className="review-row">
                        <span>Proving preview lane</span>
                        <strong>{privateCoreHoldState.provingPreviewHashLane}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {recentShield?.signature && (
                <p className="shield-helper shield-helper--meta">
                  Vanta state note: {`${recentShield.signature.slice(0, 8)}...${recentShield.signature.slice(-8)}`}
                </p>
              )}
              <VantaPrivateCoreStatePanel
                compact
                holdState={privateCoreHoldState}
                releaseCandidateState={privateCoreReleaseCandidateState}
                releaseHandoffState={privateCoreReleaseHandoffState}
                releasePackageState={privateCoreReleasePackageState}
                releaseWorkflowState={privateCoreReleaseWorkflowState}
                sendState={privateCoreSendState}
                swapState={privateCoreSwapState}
                operatorCurrentRoot={privateCoreOperatorCurrentRoot}
                operatorLatestConsume={privateCoreOperatorLatestConsume}
                operatorLatestConsumeProof={privateCoreOperatorLatestConsumeProof}
                operatorLatestProof={privateCoreOperatorLatestProof}
                operatorLatestRelease={privateCoreOperatorLatestRelease}
                operatorLatestReleaseProof={privateCoreOperatorLatestReleaseProof}
                operatorLatestRoot={privateCoreOperatorLatestRoot}
                operatorLatestSend={privateCoreOperatorLatestSend}
                operatorLatestSendLinkedProof={privateCoreOperatorLatestSendLinkedProof}
                operatorLatestSendProof={privateCoreOperatorLatestSendProof}
                operatorLatestSwap={privateCoreOperatorLatestSwap}
                operatorLatestSwapLinkedProof={privateCoreOperatorLatestSwapLinkedProof}
                operatorLatestSwapProof={privateCoreOperatorLatestSwapProof}
                operatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
                operatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
                operatorContractMirrorPrimaryNote={privateCoreOperatorContractMirrorPrimaryNote}
                operatorContractMirrorStatusLabel={privateCoreOperatorContractMirrorStatusLabel}
                operatorReleaseBoundaryPrimaryNote={privateCoreOperatorReleaseBoundaryPrimaryNote}
                operatorReleaseBoundaryStatusLabel={privateCoreOperatorReleaseBoundaryStatusLabel}
                operatorRequiredLanesPrimaryNote={privateCoreOperatorRequiredLanesPrimaryNote}
                operatorRequiredLanesStatusLabel={privateCoreOperatorRequiredLanesStatusLabel}
                operatorZkV1ShippingPrimaryNote={privateCoreOperatorZkV1ShippingPrimaryNote}
                operatorZkV1ShippingStatusLabel={privateCoreOperatorZkV1ShippingStatusLabel}
                operatorSendBoundaryPrimaryNote={privateCoreOperatorSendBoundaryPrimaryNote}
                operatorSendBoundaryStatusLabel={privateCoreOperatorSendBoundaryStatusLabel}
                operatorSendContinuityPrimaryNote={privateCoreOperatorSendContinuityPrimaryNote}
                operatorSendContinuityStatusLabel={privateCoreOperatorSendContinuityStatusLabel}
                operatorSwapBoundaryPrimaryNote={privateCoreOperatorSwapBoundaryPrimaryNote}
                operatorSwapBoundaryStatusLabel={privateCoreOperatorSwapBoundaryStatusLabel}
                operatorSwapContinuityPrimaryNote={privateCoreOperatorSwapContinuityPrimaryNote}
                operatorSwapContinuityStatusLabel={privateCoreOperatorSwapContinuityStatusLabel}
                operatorSupportedSendLaneKind={privateCoreOperatorSupportedSendLaneKind}
                operatorSupportedSendLaneNote={privateCoreOperatorSupportedSendLaneNote}
                operatorSupportedSendLaneStatus={privateCoreOperatorSupportedSendLaneStatus}
                operatorSupportedSendLaneVersion={privateCoreOperatorSupportedSendLaneVersion}
                operatorSupportedSendV1Decision={privateCoreOperatorSupportedSendV1Decision}
                operatorSupportedSendV1DecisionNote={privateCoreOperatorSupportedSendV1DecisionNote}
                operatorSupportedUnshieldLaneKind={privateCoreOperatorSupportedUnshieldLaneKind}
                operatorSupportedUnshieldLaneNote={privateCoreOperatorSupportedUnshieldLaneNote}
                operatorSupportedUnshieldLaneStatus={privateCoreOperatorSupportedUnshieldLaneStatus}
                operatorSupportedUnshieldLaneVersion={privateCoreOperatorSupportedUnshieldLaneVersion}
                operatorSupportedUnshieldV1Decision={privateCoreOperatorSupportedUnshieldV1Decision}
                operatorSupportedUnshieldV1DecisionNote={
                  privateCoreOperatorSupportedUnshieldV1DecisionNote
                }
                operatorSupportedReleaseLaneKind={privateCoreOperatorSupportedReleaseLaneKind}
                operatorSupportedReleaseLaneNote={privateCoreOperatorSupportedReleaseLaneNote}
                operatorSupportedReleaseLaneStatus={privateCoreOperatorSupportedReleaseLaneStatus}
                operatorSupportedReleaseLaneVersion={privateCoreOperatorSupportedReleaseLaneVersion}
                operatorSupportedSwapLaneKind={privateCoreOperatorSupportedSwapLaneKind}
                operatorSupportedSwapLaneNote={privateCoreOperatorSupportedSwapLaneNote}
                operatorSupportedSwapLaneStatus={privateCoreOperatorSupportedSwapLaneStatus}
                operatorSupportedSwapLaneVersion={privateCoreOperatorSupportedSwapLaneVersion}
                operatorSupportedSwapV1Decision={privateCoreOperatorSupportedSwapV1Decision}
                operatorSupportedSwapV1DecisionNote={
                  privateCoreOperatorSupportedSwapV1DecisionNote
                }
                operatorSupportedSwapV1Role={privateCoreOperatorSupportedSwapV1Role}
                operatorSupportedSwapV1RoleNote={privateCoreOperatorSupportedSwapV1RoleNote}
                operatorSupportedSwapVenue={privateCoreOperatorSupportedSwapVenue}
                operatorSupportedSwapOutputModel={privateCoreOperatorSupportedSwapOutputModel}
                operatorSupportedSwapResultingRootBasis={privateCoreOperatorSupportedSwapResultingRootBasis}
                operatorSupportedSwapInputRootPolicy={privateCoreOperatorSupportedSwapInputRootPolicy}
                operatorSupportedSwapOutputRegistrationPolicy={
                  privateCoreOperatorSupportedSwapOutputRegistrationPolicy
                }
                operatorSupportedReleaseV1Decision={privateCoreOperatorSupportedReleaseV1Decision}
                operatorSupportedReleaseV1DecisionNote={
                  privateCoreOperatorSupportedReleaseV1DecisionNote
                }
                operatorSupportedFlowKind={privateCoreOperatorSupportedFlowKind}
                operatorSupportedFlowNote={privateCoreOperatorSupportedFlowNote}
                operatorSupportedFlowStatus={privateCoreOperatorSupportedFlowStatus}
                operatorSupportedFlowVersion={privateCoreOperatorSupportedFlowVersion}
                operatorSupportedZkV1ScopeDecision={privateCoreOperatorSupportedZkV1ScopeDecision}
                operatorSupportedZkV1ScopeNote={privateCoreOperatorSupportedZkV1ScopeNote}
                operatorSupportedZkV1RequiredLanes={privateCoreOperatorSupportedZkV1RequiredLanes}
                operatorSupportedZkV1RequiredLanesNote={
                  privateCoreOperatorSupportedZkV1RequiredLanesNote
                }
                operatorZkV1FinishLineStatusLabel={
                  privateCoreOperatorZkV1FinishLineStatusLabel
                }
                operatorZkV1FinishLinePrimaryNote={
                  privateCoreOperatorZkV1FinishLinePrimaryNote
                }
                operatorSupportedAssetSymbol={privateCoreOperatorSupportedAssetSymbol}
                operatorSupportedEnvironment={privateCoreOperatorSupportedEnvironment}
                operatorSupportedNoteSchema={privateCoreOperatorSupportedNoteSchema}
                operatorSupportedNoteVersion={privateCoreOperatorSupportedNoteVersion}
                operatorSupportedRootRegistrationProvenance={
                  privateCoreOperatorSupportedRootRegistrationProvenance
                }
                operatorSupportedSendResultingRootBasis={
                  privateCoreOperatorSupportedSendResultingRootBasis
                }
                operatorSupportedSendInputRootPolicy={
                  privateCoreOperatorSupportedSendInputRootPolicy
                }
                operatorSupportedSendOutputRegistrationPolicy={
                  privateCoreOperatorSupportedSendOutputRegistrationPolicy
                }
                operatorSupportedRecipientModel={privateCoreOperatorSupportedRecipientModel}
                operatorSupportedReleaseDestinationModel={
                  privateCoreOperatorSupportedReleaseDestinationModel
                }
                operatorSupportedProofSystem={privateCoreOperatorSupportedProofSystem}
                operatorSupportedUnshieldCircuit={privateCoreOperatorSupportedUnshieldCircuit}
                operatorSupportedSendCircuit={privateCoreOperatorSupportedSendCircuit}
                operatorSupportedUnshieldMerkleDepth={privateCoreOperatorSupportedUnshieldMerkleDepth}
                operatorSupportedSendMerkleDepth={privateCoreOperatorSupportedSendMerkleDepth}
                operatorSupportedReleaseAuthorizationBasis={
                  privateCoreOperatorSupportedReleaseAuthorizationBasis
                }
                operatorSupportedReleaseRootPolicy={privateCoreOperatorSupportedReleaseRootPolicy}
                operatorSupportedReleaseExecutionModel={
                  privateCoreOperatorSupportedReleaseExecutionModel
                }
                operatorSupportedReleaseAtomicityModel={
                  privateCoreOperatorSupportedReleaseAtomicityModel
                }
                operatorSupportedReleasePersistenceModel={
                  privateCoreOperatorSupportedReleasePersistenceModel
                }
                operatorOwnerAuthorizationMode={privateCoreOperatorOwnerAuthorizationMode}
                operatorOwnerAuthorizationDecision={privateCoreOperatorOwnerAuthorizationDecision}
                operatorOwnerAuthorizationDecisionNote={
                  privateCoreOperatorOwnerAuthorizationDecisionNote
                }
                operatorSourceArtifactTruthBasis={privateCoreOperatorSourceArtifactTruthBasis}
                operatorProvingArtifactTruthBasis={privateCoreOperatorProvingArtifactTruthBasis}
                operatorSourceProvingRelationship={privateCoreOperatorSourceProvingRelationship}
                operatorNullifierKeyMode={privateCoreOperatorNullifierKeyMode}
                operatorProvingHashLane={privateCoreOperatorProvingHashLane}
                operatorCurrentRootLinkedProof={privateCoreOperatorCurrentRootLinkedProof}
                operatorCurrentRootProofLinkStatus={privateCoreOperatorCurrentRootProofLinkStatus}
                operatorSendResultingRootLinkedProof={privateCoreOperatorSendResultingRootLinkedProof}
                operatorSendResultingRootRecord={privateCoreOperatorSendResultingRootRecord}
                operatorSendResultingRootPrimaryNote={privateCoreOperatorSendResultingRootPrimaryNote}
                operatorSendResultingRootRegistrationPrimaryNote={
                  privateCoreOperatorSendResultingRootRegistrationPrimaryNote
                }
                operatorSendResultingRootRegistrationStatusLabel={
                  privateCoreOperatorSendResultingRootRegistrationStatusLabel
                }
                operatorSendResultingRootProofLinkStatus={privateCoreOperatorSendResultingRootProofLinkStatus}
                operatorSendResultingRootStatusLabel={privateCoreOperatorSendResultingRootStatusLabel}
                operatorSwapResultingRootLinkedProof={privateCoreOperatorSwapResultingRootLinkedProof}
                operatorSwapResultingRootRecord={privateCoreOperatorSwapResultingRootRecord}
                operatorSwapResultingRootPrimaryNote={privateCoreOperatorSwapResultingRootPrimaryNote}
                operatorSwapResultingRootRegistrationPrimaryNote={
                  privateCoreOperatorSwapResultingRootRegistrationPrimaryNote
                }
                operatorSwapResultingRootRegistrationStatusLabel={
                  privateCoreOperatorSwapResultingRootRegistrationStatusLabel
                }
                operatorSwapResultingRootProofLinkStatus={
                  privateCoreOperatorSwapResultingRootProofLinkStatus
                }
                operatorSwapResultingRootStatusLabel={privateCoreOperatorSwapResultingRootStatusLabel}
                operatorProofConsumeLinkStatus={privateCoreOperatorProofConsumeLinkStatus}
                operatorProofError={privateCoreOperatorProofError}
                operatorProofs={privateCoreOperatorProofs}
                operatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
                operatorProofSwapLinkStatus={privateCoreOperatorProofSwapLinkStatus}
                operatorProofReleaseLinkStatus={privateCoreOperatorProofReleaseLinkStatus}
                operatorReleaseError={privateCoreOperatorReleaseError}
                operatorReleases={privateCoreOperatorReleases}
                operatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
                operatorRootError={privateCoreOperatorRootError}
                operatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
                operatorRoots={privateCoreOperatorRoots}
                operatorContractStateVersion={privateCoreOperatorContractStateVersion}
                operatorContractVersion={privateCoreOperatorContractVersion}
                operatorContractSummaryVersion={privateCoreOperatorContractSummaryVersion}
                operatorStatusVersion={privateCoreOperatorStatusVersion}
                operatorStatusKind={privateCoreOperatorStatusKind}
                operatorSnapshotVersion={privateCoreOperatorSnapshotVersion}
                operatorSnapshotKind={privateCoreOperatorSnapshotKind}
                operatorSupportedStatusNote={privateCoreOperatorSupportedStatusNote}
                operatorSupportedStatusTransport={privateCoreOperatorSupportedStatusTransport}
                operatorSupportedStatusEndpoint={privateCoreOperatorSupportedStatusEndpoint}
                operatorSupportedStatusGateVersion={privateCoreOperatorSupportedStatusGateVersion}
                operatorSupportedStatusGateKind={privateCoreOperatorSupportedStatusGateKind}
                operatorSupportedStatusGateNote={privateCoreOperatorSupportedStatusGateNote}
                operatorSupportedStatusGateTransport={
                  privateCoreOperatorSupportedStatusGateTransport
                }
                operatorSupportedStatusGateEndpoint={
                  privateCoreOperatorSupportedStatusGateEndpoint
                }
                operatorSupportedSnapshotGateVersion={
                  privateCoreOperatorSupportedSnapshotGateVersion
                }
                operatorSupportedSnapshotGateKind={privateCoreOperatorSupportedSnapshotGateKind}
                operatorSupportedSnapshotGateNote={privateCoreOperatorSupportedSnapshotGateNote}
                operatorSupportedSnapshotGateTransport={
                  privateCoreOperatorSupportedSnapshotGateTransport
                }
                operatorSupportedSnapshotGateEndpoint={
                  privateCoreOperatorSupportedSnapshotGateEndpoint
                }
                operatorSupportedShippingDecisionGateVersion={
                  privateCoreOperatorSupportedShippingDecisionGateVersion
                }
                operatorSupportedShippingDecisionGateKind={
                  privateCoreOperatorSupportedShippingDecisionGateKind
                }
                operatorSupportedShippingDecisionGateNote={
                  privateCoreOperatorSupportedShippingDecisionGateNote
                }
                operatorSupportedShippingDecisionGateTransport={
                  privateCoreOperatorSupportedShippingDecisionGateTransport
                }
                operatorSupportedShippingDecisionGateEndpoint={
                  privateCoreOperatorSupportedShippingDecisionGateEndpoint
                }
                operatorSupportedShippingDecisionTransport={
                  privateCoreOperatorSupportedShippingDecisionTransport
                }
                operatorSupportedShippingDecisionEndpoint={
                  privateCoreOperatorSupportedShippingDecisionEndpoint
                }
                operatorSupportedShippingArtifactGateVersion={
                  privateCoreOperatorSupportedShippingArtifactGateVersion
                }
                operatorSupportedShippingArtifactGateKind={
                  privateCoreOperatorSupportedShippingArtifactGateKind
                }
                operatorSupportedShippingArtifactGateNote={
                  privateCoreOperatorSupportedShippingArtifactGateNote
                }
                operatorSupportedShippingArtifactGateTransport={
                  privateCoreOperatorSupportedShippingArtifactGateTransport
                }
                operatorSupportedShippingArtifactGateEndpoint={
                  privateCoreOperatorSupportedShippingArtifactGateEndpoint
                }
                operatorSupportedSnapshotNote={privateCoreOperatorSupportedSnapshotNote}
                operatorSupportedSnapshotTransport={privateCoreOperatorSupportedSnapshotTransport}
                operatorSupportedSnapshotEndpoint={privateCoreOperatorSupportedSnapshotEndpoint}
                operatorSupportedShippingArtifactNote={
                  privateCoreOperatorSupportedShippingArtifactNote
                }
                operatorSupportedShippingArtifactTransport={privateCoreOperatorSupportedShippingArtifactTransport}
                operatorSupportedShippingArtifactEndpoint={privateCoreOperatorSupportedShippingArtifactEndpoint}
                operatorSupportedReleaseCandidateVersion={
                  privateCoreOperatorSupportedReleaseCandidateVersion
                }
                operatorSupportedReleaseCandidateKind={
                  privateCoreOperatorSupportedReleaseCandidateKind
                }
                operatorSupportedReleaseCandidateNote={
                  privateCoreOperatorSupportedReleaseCandidateNote
                }
                operatorSupportedReleaseCandidateGateVersion={
                  privateCoreOperatorSupportedReleaseCandidateGateVersion
                }
                operatorSupportedReleaseCandidateGateKind={
                  privateCoreOperatorSupportedReleaseCandidateGateKind
                }
                operatorSupportedReleaseCandidateGateNote={
                  privateCoreOperatorSupportedReleaseCandidateGateNote
                }
                operatorSupportedReleaseCandidateGateTransport={
                  privateCoreOperatorSupportedReleaseCandidateGateTransport
                }
                operatorSupportedReleaseCandidateGateEndpoint={
                  privateCoreOperatorSupportedReleaseCandidateGateEndpoint
                }
                operatorSupportedReleaseCandidateTransport={
                  privateCoreOperatorSupportedReleaseCandidateTransport
                }
                operatorSupportedReleaseCandidateEndpoint={
                  privateCoreOperatorSupportedReleaseCandidateEndpoint
                }
                operatorShippingArtifactVersion={privateCoreOperatorShippingArtifactVersion}
                operatorShippingArtifactKind={privateCoreOperatorShippingArtifactKind}
                operatorShippingDecisionVersion={privateCoreOperatorShippingDecisionVersion}
                operatorShippingDecisionKind={privateCoreOperatorShippingDecisionKind}
                operatorSupportedShippingDecisionNote={
                  privateCoreOperatorSupportedShippingDecisionNote
                }
                operatorSendError={privateCoreOperatorSendError}
                operatorSends={privateCoreOperatorSends}
                operatorSendProofError={privateCoreOperatorSendProofError}
                operatorSendProofs={privateCoreOperatorSendProofs}
                operatorSwaps={privateCoreOperatorSwaps}
                operatorSwapProofs={privateCoreOperatorSwapProofs}
                operatorSummaryUpdatedAt={privateCoreOperatorSummaryUpdatedAt}
                shieldState={privateCoreRecentShield}
                title="Vanta Private Core hold state"
                unshieldState={privateCoreUnshieldState}
              />
              <details className="shield-helper shield-helper--meta">
                <summary>Internal zk diagnostics</summary>
                <p>
                  Internal/debug only. Inspect the canonical note, commitment, and
                  append-only shielded state record created from recent live shield actions.
                </p>
                {zkDiagnostics.length === 0 ? (
                  <p>No retained canonical shield records were found.</p>
                ) : (
                  <div className="success-metrics">
                    {zkDiagnostics.map((record) => (
                      <div key={record.recordId} className="preview-card">
                        <span>
                          Insert #{record.insertionIndex} · {new Date(record.createdAt).toLocaleTimeString()}
                        </span>
                        <strong>{abbreviate(record.commitment) ?? record.commitment}</strong>
                        <small>Commitment</small>
                        <p className="shield-helper shield-helper--meta">
                          Root: {abbreviate(record.snapshotRoot) ?? record.snapshotRoot}
                        </p>
                        <p className="shield-helper shield-helper--meta">
                          Asset ID: {record.assetId}
                        </p>
                        <p className="shield-helper shield-helper--meta">
                          Amount: {record.amountDisplay} {record.assetSymbol} ({record.amountBaseUnits} base units)
                        </p>
                        <p className="shield-helper shield-helper--meta">
                          Owner: {abbreviate(record.ownerPublicKey) ?? record.ownerPublicKey}
                        </p>
                        <p className="shield-helper shield-helper--meta">
                          Hint: {record.creationHintSummary}
                        </p>
                        {record.depositSignature && (
                          <p className="shield-helper shield-helper--meta">
                            Deposit: {abbreviate(record.depositSignature) ?? record.depositSignature}
                          </p>
                        )}
                        <p className="shield-helper shield-helper--meta">
                          State note: {abbreviate(record.stateSignature) ?? record.stateSignature}
                        </p>
                        <p className="shield-helper shield-helper--meta">
                          Snapshot leaves: {record.snapshotLeafCount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </details>
              <div className="status-actions">
                <Link className="button button-primary" to="/app/send">
                  Continue to Send
                </Link>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setAmount(selectedAsset === "VUSD" ? "0.25" : "0");
                    setStatus("idle");
                    setRecentShield(null);
                    setFlowError(null);
                  }}
                >
                  Shield More
                </button>
                <Link className="button button-ghost" to="/app/send">
                  View Shielded Balance
                </Link>
                {walletConnected && (
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      void disconnectWallet();
                    }}
                  >
                    Disconnect wallet
                  </button>
                )}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
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
