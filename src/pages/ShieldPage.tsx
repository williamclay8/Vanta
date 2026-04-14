import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSendTransaction,
  useSplToken,
} from "@solana/react-hooks";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import { useWalletState } from "@/data/context/WalletContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import {
  SHIELD_HOOK_FALLBACK_MINT,
  liveShieldAsset,
} from "@/solana/shieldConfig";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { createShieldMemoInstruction } from "@/solana/vantaShieldState";
import {
  listCanonicalShieldDiagnosticsSummaries,
  recordCanonicalShieldFromLiveShield,
} from "@/zk/liveShieldBridge";

type ShieldPageProps = {
  dashboard?: boolean;
};

type AssetConfig = {
  symbol: PrivacyAssetKey;
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

const assetCatalog: AssetConfig[] = [
  {
    symbol: liveShieldAsset.assetKey,
    name: liveShieldAsset.name,
    live: liveShieldAsset.configured,
    supported: true,
    statusLabel: liveShieldAsset.configured ? "Live on devnet" : "Needs config",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    live: false,
    supported: false,
    statusLabel: "Planned",
  },
  {
    symbol: "JTO",
    name: "Jito",
    live: false,
    supported: false,
    statusLabel: "Planned",
  },
];

function formatBalance(value: number, symbol: PrivacyAssetKey) {
  if (symbol === "USDC" || symbol === "VUSD") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
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
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorSupportedSendLaneKind,
    privateCoreOperatorSupportedSendLaneNote,
    privateCoreOperatorSupportedSendLaneStatus,
    privateCoreOperatorSupportedSendLaneVersion,
    privateCoreOperatorSupportedUnshieldLaneKind,
    privateCoreOperatorSupportedUnshieldLaneNote,
    privateCoreOperatorSupportedUnshieldLaneStatus,
    privateCoreOperatorSupportedUnshieldLaneVersion,
    privateCoreOperatorSupportedReleaseLaneKind,
    privateCoreOperatorSupportedReleaseLaneNote,
    privateCoreOperatorSupportedReleaseLaneStatus,
    privateCoreOperatorSupportedReleaseLaneVersion,
    privateCoreOperatorSupportedFlowKind,
    privateCoreOperatorSupportedFlowNote,
    privateCoreOperatorSupportedFlowStatus,
    privateCoreOperatorSupportedFlowVersion,
    privateCoreOperatorSupportedAssetSymbol,
    privateCoreOperatorSupportedEnvironment,
    privateCoreOperatorSupportedRecipientModel,
    privateCoreOperatorSupportedReleaseDestinationModel,
    privateCoreOperatorSupportedProofSystem,
    privateCoreOperatorSupportedUnshieldCircuit,
    privateCoreOperatorSupportedSendCircuit,
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    privateCoreOperatorSupportedReleaseRootPolicy,
    privateCoreOperatorOwnerAuthorizationMode,
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
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootError,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreRecentShield,
    privateCoreSendState,
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
  const [selectedAsset, setSelectedAsset] = useState<PrivacyAssetKey>("VUSD");
  const [amount, setAmount] = useState("0.25");
  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingShieldAmount, setPendingShieldAmount] = useState<number | null>(null);
  const [pendingShieldAmountDisplay, setPendingShieldAmountDisplay] = useState<string | null>(null);
  const [pendingDepositSignature, setPendingDepositSignature] = useState<string | null>(null);
  const recordedStateSignatureRef = useRef<string | null>(null);

  const selectedConfig = assetCatalog.find((asset) => asset.symbol === selectedAsset)!;
  const supportedToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    {
      config: { tokenProgram: "auto" },
    },
  );
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
  const {
    account: shieldAccount,
    error: shieldStateError,
    isReady: shieldStateReady,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();

  const parsedAmount = Number(amount);
  const hasSupportedAssets = assetCatalog.some((asset) => asset.live && asset.supported);
  const publicBalance =
    selectedAsset === liveShieldAsset.assetKey
      ? Number(supportedToken.balance?.uiAmount ?? "0")
      : 0;
  const shieldedBalance =
    selectedAsset === liveShieldAsset.assetKey
      ? shieldAccount?.balance ?? 0
      : 0;
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
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner ||
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
    const mintAddress = liveShieldAsset.mintAddress;
    const vaultOwner = liveShieldAsset.vaultOwner;

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
            asset: "VUSD",
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
    const mintAddress = liveShieldAsset.mintAddress;
    const owner = supportedToken.owner;
    const stateSignature = stateTransaction.signature;
    const vaultOwner = liveShieldAsset.vaultOwner;

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
          assetSymbol: "VUSD",
          createdAt: Date.now(),
          depositSignature: pendingDepositSignature ?? undefined,
          mintAddress,
          owner,
          stateSignature,
          tokenDecimals: readTokenDecimals(supportedToken.balance),
          vaultOwner,
        });
        const privateCoreShield = runPrivateCoreShield({
          amountDisplay: pendingShieldAmountDisplay,
          asset: "VUSD",
        });
        const nextBalance = Number(
          ((shieldAccount?.balance ?? 0) + pendingShieldAmount).toFixed(6),
        );
        setRecentShield({
          amount: pendingShieldAmount,
          asset: "VUSD",
          depositSignature: pendingDepositSignature ?? undefined,
          resultingShieldedBalance: nextBalance,
          settlement: "confirmed_deposit",
          signature: stateTransaction.signature ?? undefined,
          source: "shield",
          timestamp: Date.now(),
          zkBridge: {
            commitment: privateCoreShield.sourceNoteCommitment || zkRecord.artifacts.commitment.value,
            insertionIndex: zkRecord.insertion.index,
            root: privateCoreShield.sourceMerkleRoot || zkRecord.insertion.root,
            source: "canonical_note_v1",
          },
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
      !liveShieldAsset.vaultOwner ||
      selectedAsset !== liveShieldAsset.assetKey
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
        destinationOwner: liveShieldAsset.vaultOwner,
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
            Move supported Solana assets out of transparent wallet flows and
            into the Vanta privacy layer. Shielded state becomes the foundation
            for private actions beginning with send.
          </p>
        </div>

        <div className="module-state">
          <strong>Plain-English explanation</strong>
          <p>
            Shielding in Vanta means moving supported assets out of Public
            Wallet state and into a dedicated privacy-preserving layer. For the
            first live milestone, the supported devnet token now uses a real
            wallet-signed deposit path into Vanta&apos;s controlled shield vault.
          </p>
        </div>
      </div>

      <div className="shield-scenario-bar">
        <div>
          <span>Wallet state</span>
          <p>
            Public Wallet is grounded in a real Solana wallet connection on
            {` ${clusterLabel}`}. The live token path now performs a real
            devnet transfer before Vanta credits shielded state in-app.
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
                Source balance from the connected wallet for the first live
                supported devnet token.
              </p>
            </div>

            <div className="state-arrow">
              <span>Enter Privacy Layer</span>
            </div>

            <div className="state-panel state-panel--accent">
              <span>Shielded State</span>
              <strong>{formatBalance(shieldedBalance, selectedAsset)}</strong>
              <p>
                Vanta-recognized shielded balance resolved from confirmed
                onchain shield notes for the first devnet milestone.
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
                    asset.symbol === liveShieldAsset.assetKey ? publicBalance : 0;

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
              {liveShieldAsset.configured && walletConnected && (
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
            {liveShieldAsset.vaultOwner && (
              <div className="review-row">
                <span>Shield vault owner</span>
                <strong>{abbreviate(liveShieldAsset.vaultOwner)}</strong>
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
                holdState={privateCoreHoldState}
                sendState={privateCoreSendState}
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
                operatorBoundaryPrimaryNote={privateCoreOperatorBoundaryPrimaryNote}
                operatorBoundaryStatusLabel={privateCoreOperatorBoundaryStatusLabel}
                operatorSupportedSendLaneKind={privateCoreOperatorSupportedSendLaneKind}
                operatorSupportedSendLaneNote={privateCoreOperatorSupportedSendLaneNote}
                operatorSupportedSendLaneStatus={privateCoreOperatorSupportedSendLaneStatus}
                operatorSupportedSendLaneVersion={privateCoreOperatorSupportedSendLaneVersion}
                operatorSupportedUnshieldLaneKind={privateCoreOperatorSupportedUnshieldLaneKind}
                operatorSupportedUnshieldLaneNote={privateCoreOperatorSupportedUnshieldLaneNote}
                operatorSupportedUnshieldLaneStatus={privateCoreOperatorSupportedUnshieldLaneStatus}
                operatorSupportedUnshieldLaneVersion={privateCoreOperatorSupportedUnshieldLaneVersion}
                operatorSupportedReleaseLaneKind={privateCoreOperatorSupportedReleaseLaneKind}
                operatorSupportedReleaseLaneNote={privateCoreOperatorSupportedReleaseLaneNote}
                operatorSupportedReleaseLaneStatus={privateCoreOperatorSupportedReleaseLaneStatus}
                operatorSupportedReleaseLaneVersion={privateCoreOperatorSupportedReleaseLaneVersion}
                operatorSupportedFlowKind={privateCoreOperatorSupportedFlowKind}
                operatorSupportedFlowNote={privateCoreOperatorSupportedFlowNote}
                operatorSupportedFlowStatus={privateCoreOperatorSupportedFlowStatus}
                operatorSupportedFlowVersion={privateCoreOperatorSupportedFlowVersion}
                operatorSupportedAssetSymbol={privateCoreOperatorSupportedAssetSymbol}
                operatorSupportedEnvironment={privateCoreOperatorSupportedEnvironment}
                operatorSupportedRecipientModel={privateCoreOperatorSupportedRecipientModel}
                operatorSupportedReleaseDestinationModel={
                  privateCoreOperatorSupportedReleaseDestinationModel
                }
                operatorSupportedProofSystem={privateCoreOperatorSupportedProofSystem}
                operatorSupportedUnshieldCircuit={privateCoreOperatorSupportedUnshieldCircuit}
                operatorSupportedSendCircuit={privateCoreOperatorSupportedSendCircuit}
                operatorSupportedReleaseAuthorizationBasis={
                  privateCoreOperatorSupportedReleaseAuthorizationBasis
                }
                operatorSupportedReleaseRootPolicy={privateCoreOperatorSupportedReleaseRootPolicy}
                operatorOwnerAuthorizationMode={privateCoreOperatorOwnerAuthorizationMode}
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
                operatorProofConsumeLinkStatus={privateCoreOperatorProofConsumeLinkStatus}
                operatorProofError={privateCoreOperatorProofError}
                operatorProofs={privateCoreOperatorProofs}
                operatorProofSendLinkStatus={privateCoreOperatorProofSendLinkStatus}
                operatorProofReleaseLinkStatus={privateCoreOperatorProofReleaseLinkStatus}
                operatorReleaseError={privateCoreOperatorReleaseError}
                operatorReleases={privateCoreOperatorReleases}
                operatorRootCurrentnessLabel={privateCoreOperatorRootCurrentnessLabel}
                operatorRootError={privateCoreOperatorRootError}
                operatorRootRegistrationStatus={privateCoreOperatorRootRegistrationStatus}
                operatorRoots={privateCoreOperatorRoots}
                operatorSendError={privateCoreOperatorSendError}
                operatorSends={privateCoreOperatorSends}
                operatorSendProofError={privateCoreOperatorSendProofError}
                operatorSendProofs={privateCoreOperatorSendProofs}
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
                          Amount: {record.amountDisplay} VUSD ({record.amountBaseUnits} base units)
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
