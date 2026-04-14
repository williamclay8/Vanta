import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sha256 } from "@noble/hashes/sha2";
import { useSendTransaction } from "@solana/react-hooks";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import { liveShieldAsset } from "@/solana/shieldConfig";
import {
  createPreparedSendMemo,
  createSpentMarkerInstruction,
} from "@/solana/vantaShieldState";
import {
  listCanonicalSendDiagnosticsSummaries,
  recordCanonicalSendFromLiveSend,
} from "@/zk/liveSendBridge";
import {
  buildVantaPrivateCoreSendProofEnvelope,
  buildVantaPrivateCoreSendTransition,
  deriveVantaPrivateCoreSourceArtifactsFromHeldNote,
  summarizeVantaPrivateCoreSendProofEnvelopeConsistency,
  summarizeVantaPrivateCoreSendProofEnvelopeVerification,
  type SendTransitionV0,
  type Bytes32Hex,
} from "@/zk/vantaPrivateCore";
import { buildVantaPrivateCoreSendProofBoundary } from "@/zk/vantaPrivateCoreSendProof";
import { buildVantaPrivateCoreUnshieldProofBoundary } from "@/zk/vantaPrivateCoreUnshieldProof";
import {
  requestVantaPrivateCoreOperatorSendTransition,
} from "@/zk/vantaPrivateCoreOperatorClient";

type SendPageProps = {
  dashboard?: boolean;
};

type PendingSpentMarker = {
  consumedNoteId: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  transitionKind: "send";
  transitionNoteId: string;
  vaultOwner: string;
};

type PendingSendBridge = {
  changeAmountDisplay: string;
  createdAt: number;
  predecessor: {
    amountDisplay: string;
    noteId: string;
    stateSignature: string;
  };
  recipient: string;
  sentAmountDisplay: string;
  transition: {
    changeNoteId?: string;
    noteId: string;
  };
};

type PrivateCoreSendPreview = {
  boundary: ReturnType<typeof buildVantaPrivateCoreSendProofBoundary>;
  changeAmountBaseUnits: string;
  recipientPublicKey: Bytes32Hex;
  sendAmountBaseUnits: string;
  sourceConsistencyLabel: string;
  sourceVerificationLabel: string;
  transition: SendTransitionV0;
};

type PrivateCoreSendExecutionState = {
  errorMessage: string | null;
  latestProofAction: string | null;
  latestProofId: string | null;
  latestSendId: string | null;
  proofFieldCount: number | null;
  proofPublicInputCount: number | null;
  status: "idle" | "running" | "verified" | "failed";
};

const assetNames: Record<PrivacyAssetKey, string> = {
  VUSD: "Vanta Devnet Test Dollar",
  USDC: "USD Coin",
  JTO: "Jito",
  BONK: "Bonk",
};

const fallbackShieldedBalances: Record<PrivacyAssetKey, number> = {
  VUSD: 0,
  USDC: 2800,
  JTO: 180,
  BONK: 0,
};

const DEFAULT_VUSD_DECIMALS = 6;

function formatBalance(value: number, symbol: PrivacyAssetKey) {
  if (symbol === "USDC" || symbol === "VUSD") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  }

  if (symbol === "BONK") {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} ${symbol}`;
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} ${symbol}`;
}

function abbreviate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatOperatorSummaryFreshness(value: number | null) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SendPage({ dashboard = false }: SendPageProps) {
  const {
    ensurePrivateCoreOperatorRootKnown,
    privateCoreHoldState,
    privateCoreOperatorConsumeError,
    privateCoreOperatorConsumes,
    privateCoreOperatorCurrentRoot,
    privateCoreOperatorCurrentRootLinkedProof,
    privateCoreOperatorBoundaryPrimaryNote,
    privateCoreOperatorBoundaryStatusLabel,
    privateCoreOperatorCurrentRootProofLinkStatus,
    privateCoreOperatorLatestConsume,
    privateCoreOperatorLatestConsumeProof,
    privateCoreOperatorLatestProof,
    privateCoreOperatorLatestRelease,
    privateCoreOperatorLatestReleaseProof,
    privateCoreOperatorLatestRoot,
    privateCoreOperatorLatestSend,
    privateCoreOperatorLatestSendLinkedProof,
    privateCoreOperatorLatestSendProof,
    privateCoreOperatorOwnerAuthorizationMode,
    privateCoreOperatorNullifierKeyMode,
    privateCoreOperatorProofConsumeLinkStatus,
    privateCoreOperatorProofError,
    privateCoreOperatorProofs,
    privateCoreOperatorProofReleaseLinkStatus,
    privateCoreOperatorSendResultingRootRecord,
    privateCoreOperatorSendResultingRootLinkedProof,
    privateCoreOperatorSendResultingRootPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationPrimaryNote,
    privateCoreOperatorSendResultingRootRegistrationStatusLabel,
    privateCoreOperatorSendResultingRootProofLinkStatus,
    privateCoreOperatorSendResultingRootStatusLabel,
    privateCoreOperatorProvingHashLane,
    privateCoreOperatorReleaseError,
    privateCoreOperatorReleases,
    privateCoreOperatorRootCurrentnessLabel,
    privateCoreOperatorRootError,
    privateCoreOperatorRootRegistrationStatus,
    privateCoreOperatorRoots,
    privateCoreOperatorProofSendLinkStatus,
    privateCoreOperatorSendError,
    privateCoreOperatorSends,
    privateCoreOperatorSendProofError,
    privateCoreOperatorSendProofs,
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
    privateCoreOperatorSupportedReleaseAuthorizationBasis,
    privateCoreOperatorSupportedReleaseRootPolicy,
    privateCoreOperatorSummaryUpdatedAt,
    privateCoreOwner,
    privateCoreRecentShield,
    recentShield,
    privateCoreSendState,
    privateCoreUnshieldState,
    previewPrivateCoreSendTransition,
    refreshPrivateCoreOperatorSummary,
    runPrivateCoreSendTransition,
  } = usePrivacyFlow();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const [selectedAsset, setSelectedAsset] = useState<PrivacyAssetKey>(
    recentShield?.asset ?? "VUSD",
  );
  const [recipient, setRecipient] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<
    "idle" | "review" | "awaiting_confirmation" | "sending" | "settling" | "complete" | "failed"
  >("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [lastRecipient, setLastRecipient] = useState<string | null>(null);
  const [lastSentAmount, setLastSentAmount] = useState<number | null>(null);
  const [lastChangeAmount, setLastChangeAmount] = useState<number | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingSendBridge, setPendingSendBridge] = useState<PendingSendBridge | null>(null);
  const [privateCoreSendExecution, setPrivateCoreSendExecution] =
    useState<PrivateCoreSendExecutionState>({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "idle",
    });
  const sendNoteTransaction = useSendTransaction();
  const sendNoteWait = useRealtimeSignatureProgress(sendNoteTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !sendNoteTransaction.signature,
  });
  const spentMarkerTransaction = useSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );

  const spendableNotes = useMemo(() => {
    if (selectedAsset !== "VUSD") {
      return [];
    }

    return shieldAccount?.spendableShieldNotes ?? [];
  }, [selectedAsset, shieldAccount]);

  useEffect(() => {
    if (!spendableNotes.length) {
      setSelectedNoteId(null);
      setAmount("");
      return;
    }

    if (
      !selectedNoteId ||
      !spendableNotes.some((note) => note.noteId === selectedNoteId)
    ) {
      const nextSelectedNote = spendableNotes[0];
      setSelectedNoteId(nextSelectedNote.noteId);
      setAmount(nextSelectedNote.amount.toFixed(2));
    }
  }, [selectedNoteId, spendableNotes]);

  const selectedSpendableNote = useMemo(() => {
    return spendableNotes.find((note) => note.noteId === selectedNoteId) ?? null;
  }, [selectedNoteId, spendableNotes]);

  const selectedBalance =
    selectedAsset === "VUSD"
      ? shieldAccount?.balance ?? fallbackShieldedBalances[selectedAsset]
      : fallbackShieldedBalances[selectedAsset];
  const parsedAmount = Number(amount);
  const maxNoteAmount = selectedSpendableNote?.amount ?? 0;
  const changeAmount =
    selectedSpendableNote && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Number(Math.max(selectedSpendableNote.amount - parsedAmount, 0).toFixed(6))
      : 0;
  const isAmountValid =
    Boolean(selectedSpendableNote) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxNoteAmount;
  const isRecipientValid = recipient.trim().length >= 8;
  const isRealSendReady =
    selectedAsset === "VUSD" &&
    Boolean(selectedSpendableNote) &&
    isAmountValid &&
    isRecipientValid &&
    Boolean(liveShieldAsset.mintAddress);
  const sendProgressLabel = sendNoteWait.detailLabel;
  const settleProgressLabel = spentMarkerWait.detailLabel;
  const privateCoreSendPreview = useMemo<PrivateCoreSendPreview | null>(() => {
    if (
      selectedAsset !== "VUSD" ||
      !privateCoreHoldState ||
      !isRecipientValid ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return null;
    }

    try {
      const sendAmountBaseUnits = decimalToBaseUnitsExact(amount, DEFAULT_VUSD_DECIMALS);
      if (sendAmountBaseUnits > privateCoreHoldState.heldNote.note.amount) {
        return null;
      }

      const recipientPublicKey = derivePrivateCoreRecipientPublicKey(recipient.trim());
      const transition = buildVantaPrivateCoreSendTransition({
        input: privateCoreHoldState.heldNote,
        sendAmount: sendAmountBaseUnits,
        recipientOwnerPublicKey: recipientPublicKey,
      });
      const envelope = buildVantaPrivateCoreSendProofEnvelope(transition);
      const sourceVerification = summarizeVantaPrivateCoreSendProofEnvelopeVerification(envelope);
      const sourceConsistency = summarizeVantaPrivateCoreSendProofEnvelopeConsistency({
        envelope,
        sourceArtifacts: deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
          privateCoreHoldState.heldNote,
        ),
        expectedNullifier: envelope.publicInputs.inputNullifier,
      });
      const boundary = buildVantaPrivateCoreSendProofBoundary({
        senderSecretKey: privateCoreOwner.secretKey,
        transition,
      });

      return {
        boundary,
        changeAmountBaseUnits: transition.change?.note.amount.toString(10) ?? "0",
        recipientPublicKey,
        sendAmountBaseUnits: sendAmountBaseUnits.toString(10),
        sourceConsistencyLabel: sourceConsistency.overallStatusLabel,
        sourceVerificationLabel: sourceVerification.statusLabel,
        transition,
      };
    } catch {
      return null;
    }
  }, [
    amount,
    isRecipientValid,
    parsedAmount,
    privateCoreHoldState,
    privateCoreOwner.secretKey,
    recipient,
    selectedAsset,
  ]);

  const recentShieldLabel =
    recentShield &&
    `${formatBalance(recentShield.amount, recentShield.asset)} shielded`;
  const sendZkDiagnostics = listCanonicalSendDiagnosticsSummaries().slice(0, 5);

  useEffect(() => {
    setPrivateCoreSendExecution({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "idle",
    });
  }, [amount, privateCoreHoldState, recipient, selectedAsset]);

  useEffect(() => {
    if (sendNoteTransaction.status === "loading") {
      setStatus("sending");
    } else if (sendNoteTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        sendNoteTransaction.error instanceof Error
          ? sendNoteTransaction.error.message
          : "The Vanta send record could not be submitted.",
      );
      setPendingSpentMarker(null);
      setPendingSendBridge(null);
    } else if (sendNoteTransaction.signature) {
      setStatus("settling");
    }
  }, [
    sendNoteTransaction.error,
    sendNoteTransaction.signature,
    sendNoteTransaction.status,
  ]);

  useEffect(() => {
    if (sendNoteWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      sendNoteWait.waitError instanceof Error
        ? sendNoteWait.waitError.message
        : "The Vanta send record was submitted but not confirmed.",
    );
    setPendingSpentMarker(null);
    setPendingSendBridge(null);
  }, [sendNoteWait.waitError, sendNoteWait.waitStatus]);

  useEffect(() => {
    if (
      sendNoteWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("settling");
    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        pendingSpentMarker.consumedNoteId,
        pendingSpentMarker.mintAddress,
        pendingSpentMarker.owner,
        pendingSpentMarker.transitionNoteId,
        pendingSpentMarker.vaultOwner,
        recipient.trim(),
      ],
      action: "state_finalize",
    })
      .then((priorityFeeInstructions) =>
        spentMarkerTransaction.send({
          instructions: [
            ...priorityFeeInstructions,
            createSpentMarkerInstruction({
              asset: "VUSD",
              consumedNoteId: pendingSpentMarker.consumedNoteId,
              createdAt: pendingSpentMarker.createdAt,
              mintAddress: pendingSpentMarker.mintAddress,
              owner: pendingSpentMarker.owner,
              transitionKind: pendingSpentMarker.transitionKind,
              transitionNoteId: pendingSpentMarker.transitionNoteId,
              vaultOwner: pendingSpentMarker.vaultOwner,
            }),
          ],
        }),
      )
      .catch((error) => {
        setStatus("failed");
        setPendingSendBridge(null);
        setFlowError(
          error instanceof Error
            ? error.message
            : "The Vanta spent marker could not be submitted.",
        );
      });
  }, [
    pendingSpentMarker,
    sendNoteWait.waitStatus,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
  ]);

  useEffect(() => {
    if (spentMarkerTransaction.status !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerTransaction.error instanceof Error
        ? spentMarkerTransaction.error.message
        : "The spent marker could not be submitted.",
    );
    setPendingSendBridge(null);
  }, [spentMarkerTransaction.error, spentMarkerTransaction.status]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerWait.waitError instanceof Error
        ? spentMarkerWait.waitError.message
        : "The spent marker was submitted but not confirmed.",
    );
    setPendingSendBridge(null);
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (
      spentMarkerWait.waitStatus !== "success" ||
      !pendingSendBridge ||
      !shieldAccount ||
      !liveShieldAsset.mintAddress
    ) {
      return;
    }

    const mintAddress = liveShieldAsset.mintAddress;

    void refreshShieldState()
      .then(async () => {
        await recordCanonicalSendFromLiveSend({
          assetSymbol: "VUSD",
          mintAddress,
          owner: shieldAccount.owner,
          vaultOwner: shieldAccount.vaultOwner,
          createdAt: pendingSendBridge.createdAt,
          recipient: pendingSendBridge.recipient,
          sentAmountDisplay: pendingSendBridge.sentAmountDisplay,
          changeAmountDisplay: pendingSendBridge.changeAmountDisplay,
          tokenDecimals: DEFAULT_VUSD_DECIMALS,
          predecessor: pendingSendBridge.predecessor,
          transition: {
            noteId: pendingSendBridge.transition.noteId,
            signature: sendNoteTransaction.signature ?? pendingSendBridge.transition.noteId,
            spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
            changeNoteId: pendingSendBridge.transition.changeNoteId,
          },
        });
        setStatus("complete");
        setFlowError(null);
        setPendingSpentMarker(null);
        setPendingSendBridge(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Send settled, but canonical successor-note bridge state could not be recorded.",
        );
      });
  }, [
    pendingSendBridge,
    refreshShieldState,
    sendNoteTransaction.signature,
    shieldAccount,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
  ]);

  async function handleSend() {
    if (!isRealSendReady || !shieldAccount || !selectedSpendableNote || !liveShieldAsset.mintAddress) {
      return;
    }

    sendNoteTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    setLastRecipient(recipient.trim());
    setLastSentAmount(parsedAmount);
    setLastChangeAmount(changeAmount);
    setStatus("awaiting_confirmation");

    try {
      const createdAt = Date.now();
      const preparedSend = createPreparedSendMemo({
        amount: parsedAmount.toString(),
        asset: "VUSD",
        changeAmount: changeAmount.toString(),
        consumedNoteId: selectedSpendableNote.noteId,
        createdAt,
        mintAddress: liveShieldAsset.mintAddress,
        owner: shieldAccount.owner,
        recipient: recipient.trim(),
        vaultOwner: shieldAccount.vaultOwner,
      });

      setPendingSpentMarker({
        consumedNoteId: selectedSpendableNote.noteId,
        createdAt,
        mintAddress: liveShieldAsset.mintAddress,
        owner: shieldAccount.owner,
        transitionKind: "send",
        transitionNoteId: preparedSend.noteId,
        vaultOwner: shieldAccount.vaultOwner,
      });
      setPendingSendBridge({
        changeAmountDisplay: changeAmount.toString(),
        createdAt,
        predecessor: {
          amountDisplay: selectedSpendableNote.amount.toString(),
          noteId: selectedSpendableNote.noteId,
          stateSignature: selectedSpendableNote.stateSignature,
        },
        recipient: recipient.trim(),
        sentAmountDisplay: parsedAmount.toString(),
        transition: {
          changeNoteId: preparedSend.changeNoteId,
          noteId: preparedSend.noteId,
        },
      });
      const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
        accountKeys: [
          selectedSpendableNote.noteId,
          liveShieldAsset.mintAddress,
          shieldAccount.owner,
          preparedSend.noteId,
          shieldAccount.vaultOwner,
          recipient.trim(),
        ],
        action: "send_transition",
      });

      await sendNoteTransaction.send({
        instructions: [...priorityFeeInstructions, preparedSend.instruction],
      });
    } catch (error) {
      setPendingSpentMarker(null);
      setPendingSendBridge(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Send request was not approved.",
      );
    }
  }

  async function handlePrivateCoreSendProof() {
    if (!privateCoreSendPreview) {
      return;
    }

    setPrivateCoreSendExecution({
      errorMessage: null,
      latestProofAction: null,
      latestProofId: null,
      latestSendId: null,
      proofFieldCount: null,
      proofPublicInputCount: null,
      status: "running",
    });

    try {
      const previewResult = previewPrivateCoreSendTransition(privateCoreSendPreview.transition);

      if (privateCoreHoldState) {
        await ensurePrivateCoreOperatorRootKnown({
          proofBoundary: buildVantaPrivateCoreUnshieldProofBoundary({
            heldNote: privateCoreHoldState.heldNote,
            ownerSecretKey: privateCoreOwner.secretKey,
            releaseDestination:
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          }),
          sourceArtifacts: deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
            privateCoreHoldState.heldNote,
          ),
        });
      }

      const sendReceipt = await requestVantaPrivateCoreOperatorSendTransition({
        resultingRoot: previewResult.resultingRoot,
        witnessPackage: privateCoreSendPreview.boundary.noirWitnessPackage,
      });
      runPrivateCoreSendTransition(privateCoreSendPreview.transition);
      const summaryState = await refreshPrivateCoreOperatorSummary();

      setPrivateCoreSendExecution({
        errorMessage: null,
        latestProofAction: "send-transition",
        latestProofId: sendReceipt.proofId,
        latestSendId: summaryState.latestSend?.sendId ?? sendReceipt.sendId,
        proofFieldCount: sendReceipt.proofFieldCount,
        proofPublicInputCount: sendReceipt.publicInputCount,
        status: "verified",
      });
    } catch (error) {
      setPrivateCoreSendExecution({
        errorMessage: error instanceof Error ? error.message : "The private-core send proof failed.",
        latestProofAction: null,
        latestProofId: null,
        latestSendId: null,
        proofFieldCount: null,
        proofPublicInputCount: null,
        status: "failed",
      });
    }
  }

  const projectedRemainingBalance =
    selectedAsset === "VUSD" && isAmountValid
      ? Number(Math.max(selectedBalance - parsedAmount, 0).toFixed(6))
      : selectedBalance;

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero">
        <div>
          <span className="eyebrow">{dashboard ? "Dashboard / Send" : "Live"}</span>
          <h2>Private Send</h2>
          <p>
            Use shielded balances to execute the first constrained real Send
            transition inside Vanta. This milestone now supports one-note sends
            with one optional residual change note for `VUSD`.
          </p>
        </div>

        <div className="module-state">
          <strong>Workflow role</strong>
          <p>
            Private Send is the first workflow unlocked by shielded state. For
            `VUSD`, Send now consumes one spendable note, records the sent
            amount, and preserves leftover value as a new shielded note.
          </p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {["Public Wallet", "Shield", "Shielded State", "Send"].map((step, index) => (
          <div
            key={step}
            className={index === 3 ? "send-flow-step send-flow-step--active" : "send-flow-step"}
          >
            <span>{step}</span>
          </div>
        ))}
      </div>

      {recentShield ? (
        <div className="send-context-banner">
          <div>
            <span>Ready to Send</span>
            <h3>You just shielded {formatBalance(recentShield.amount, recentShield.asset)}.</h3>
            <p>
              Shielded balance is now available for private send inside the
              Vanta privacy layer. In the current constrained model, one note
              can be partially spent and any residual value stays shielded.
            </p>
          </div>
          <div className="send-context-banner__meta">
            <strong>{formatBalance(recentShield.resultingShieldedBalance, recentShield.asset)}</strong>
            <small>Current shielded balance</small>
          </div>
        </div>
      ) : (
        <div className="send-context-banner send-context-banner--quiet">
          <div>
            <span>No recent Shield context</span>
            <h3>Send now supports constrained change-note handling for `VUSD`.</h3>
            <p>
              Begin at Shield or use one of the currently spendable `VUSD`
              notes below to execute the first residual-value send transition.
            </p>
          </div>
          <Link className="button button-ghost" to="/app/shield">
            Start at Shield
          </Link>
        </div>
      )}

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Private Send</span>
              <h3>Evolve shielded notes</h3>
            </div>
            <small>One input note, one send, one optional change note</small>
          </div>

          <div className="asset-list">
            {(Object.keys(assetNames) as PrivacyAssetKey[]).map((asset) => (
              <button
                key={asset}
                type="button"
                className={selectedAsset === asset ? "asset-row asset-row--active" : "asset-row"}
                onClick={() => {
                  setSelectedAsset(asset);
                  setStatus("idle");
                  setFlowError(null);
                }}
              >
                <div>
                  <strong>{assetNames[asset]}</strong>
                  <span>{asset}</span>
                </div>
                <div className="asset-row__meta">
                  <small>
                    {formatBalance(
                      asset === "VUSD"
                        ? shieldAccount?.balance ?? fallbackShieldedBalances[asset]
                        : fallbackShieldedBalances[asset],
                      asset,
                    )}
                  </small>
                  <em>{asset === "VUSD" ? "Live send path" : "Not live yet"}</em>
                </div>
              </button>
            ))}
          </div>

          <div className="shield-form">
            <div className="shield-form__section">
              <label>Spendable notes</label>
              <div className="asset-list">
                {selectedAsset !== "VUSD" ? (
                  <div className="preview-card">
                    <span>Unsupported asset</span>
                    <strong>Send not live yet</strong>
                  </div>
                ) : spendableNotes.length === 0 ? (
                  <div className="preview-card">
                    <span>No spendable notes</span>
                    <strong>Shield VUSD first</strong>
                  </div>
                ) : (
                  spendableNotes.map((note) => (
                    <button
                      key={note.stateSignature}
                      type="button"
                      className={
                        selectedNoteId === note.noteId
                          ? "asset-row asset-row--active"
                          : "asset-row"
                      }
                      onClick={() => {
                        setSelectedNoteId(note.noteId);
                        setAmount(note.amount.toFixed(2));
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      <div>
                        <strong>{formatBalance(note.amount, "VUSD")}</strong>
                        <span>{`${note.noteId.slice(0, 10)}...${note.noteId.slice(-6)}`}</span>
                      </div>
                      <div className="asset-row__meta">
                        <small>{note.origin === "change" ? "Residual note" : "Deposit note"}</small>
                        <em>Spendable note</em>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="shield-helper">
                The current constrained model supports one input note at a time.
                If you send less than the note amount, the remainder becomes a
                new shielded change note.
              </p>
            </div>

            <div className="shield-form__section">
              <label htmlFor="send-recipient">Recipient</label>
              <div className="amount-field">
                <input
                  id="send-recipient"
                  value={recipient}
                  onChange={(event) => {
                    setRecipient(event.target.value);
                    setStatus("idle");
                    setFlowError(null);
                  }}
                  placeholder="Destination wallet or recipient reference"
                />
              </div>
              <p className="shield-helper">
                Provide a constrained v1 recipient reference for the first real
                Send transition.
              </p>
            </div>

            <div className="shield-form__section">
              <label htmlFor="send-amount">Send amount</label>
              <div className="amount-field">
                <input
                  id="send-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setStatus("idle");
                    setFlowError(null);
                  }}
                  placeholder="0.00"
                  disabled={!selectedSpendableNote}
                />
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={!selectedSpendableNote}
                  onClick={() => {
                    if (!selectedSpendableNote) {
                      return;
                    }

                    setAmount(selectedSpendableNote.amount.toFixed(2));
                    setStatus("idle");
                    setFlowError(null);
                  }}
                >
                  Max
                </button>
              </div>
              <p className="shield-helper">
                {shieldStateError
                  ? shieldStateError
                  : isRealSendReady
                    ? "This send will consume the selected note and, if any value remains, derive a new shielded change note."
                    : "Select one spendable VUSD note, then enter a valid amount up to that note and a valid recipient."}
              </p>
            </div>

            <div className="preview-grid">
              <div className="preview-card preview-card--accent">
                <span>Selected note amount</span>
                <strong>{formatBalance(maxNoteAmount, selectedAsset)}</strong>
              </div>
              <div className="preview-card">
                <span>Residual change note</span>
                <strong>{formatBalance(changeAmount, selectedAsset)}</strong>
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-card">
                <span>Available shielded balance</span>
                <strong>{formatBalance(selectedBalance, selectedAsset)}</strong>
              </div>
              <div className="preview-card">
                <span>Post-send shielded balance</span>
                <strong>{formatBalance(projectedRemainingBalance, selectedAsset)}</strong>
              </div>
            </div>

            <div className="shield-form__actions">
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setFlowError(null);
                }}
                disabled={!isRealSendReady || status === "sending" || status === "settling"}
              >
                Review send
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void handleSend();
                }}
                disabled={!isRealSendReady || status === "sending" || status === "settling"}
              >
                Private Send
              </button>
            </div>
          </div>
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Send context</span>
              <h3>Change-note flow</h3>
            </div>
            <small>{recentShield ? "Connected flow" : "Standalone flow"}</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Selected asset</span>
              <strong>{selectedAsset}</strong>
            </div>
            <div className="review-row">
              <span>Shielded balance</span>
              <strong>{formatBalance(selectedBalance, selectedAsset)}</strong>
            </div>
            <div className="review-row">
              <span>Spendable notes</span>
              <strong>{selectedAsset === "VUSD" ? spendableNotes.length : 0}</strong>
            </div>
            <div className="review-row">
              <span>Selected note</span>
              <strong>
                {selectedSpendableNote
                  ? `${selectedSpendableNote.noteId.slice(0, 10)}...${selectedSpendableNote.noteId.slice(-6)}`
                  : "None selected"}
              </strong>
            </div>
            <div className="review-row">
              <span>Send amount</span>
              <strong>{formatBalance(parsedAmount || 0, "VUSD")}</strong>
            </div>
            <div className="review-row">
              <span>Residual change</span>
              <strong>{formatBalance(changeAmount, "VUSD")}</strong>
            </div>
            <div className="review-row">
              <span>Recipient</span>
              <strong>{recipient.trim() || "Not set"}</strong>
            </div>
            <div className="review-row">
              <span>Recent activity</span>
              <strong>
                {recentShieldLabel ??
                  (selectedBalance > 0
                    ? "Vanta-recognized spendable state available"
                    : "No spendable shielded state")}
              </strong>
            </div>
            <div className="review-row">
              <span>Spend model</span>
              <strong>
                {selectedAsset === "VUSD"
                  ? "One input note plus explicit spent marker"
                  : "Not live yet"}
              </strong>
            </div>
            <div className="review-row">
              <span>Note identity</span>
              <strong>
                {selectedAsset === "VUSD"
                  ? "Deterministic Vanta note id"
                  : "Not live yet"}
              </strong>
            </div>
          </div>

          <p className="shield-review-note">
            Send now uses constrained note evolution for `VUSD`. One shield note
            can be partially spent, any leftover value persists as a new
            spendable shield note, and spentness is now finalized through a
            separate Vanta spent marker. Multi-note composition and full
            privacy semantics are still not live.
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

          {status === "review" && (
            <div className="status-panel">
              <span>Ready to Send</span>
              <p>
                Submit a constrained real Send transition that consumes the
                selected `VUSD` note, writes send metadata, and then confirms
                spentness through a separate marker.
              </p>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                >
                  Confirm Send
                </button>
              </div>
            </div>
          )}

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>Approve the constrained Vanta send note for the selected shield note.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "sending" && (
            <div className="status-panel status-panel--processing">
              <span>Send in progress</span>
              <p>Submitting the Vanta send transition metadata on devnet.</p>
              {sendProgressLabel && (
                <p className="shield-helper shield-helper--meta">{sendProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "settling" && (
            <div className="status-panel status-panel--processing">
              <span>Updating shielded state</span>
              <p>
                Confirming the spent marker and resolving the next spendable
                note set, including any residual change note.
              </p>
              {settleProgressLabel && (
                <p className="shield-helper shield-helper--meta">{settleProgressLabel}</p>
              )}
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Send failed</span>
              <p>
                Shielded state remains intact, but the constrained note
                evolution transition did not complete.
              </p>
              {flowError && <p className="shield-helper shield-helper--error">{flowError}</p>}
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setStatus("review");
                  setFlowError(null);
                }}
              >
                Retry send
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="status-panel status-panel--success">
              <span>Send complete</span>
              <p>
                {lastSentAmount !== null && lastRecipient
                  ? `${formatBalance(lastSentAmount, "VUSD")} was sent from shielded state for recipient ${lastRecipient}.`
                  : "The constrained Vanta send note was confirmed."}
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Amount sent</span>
                  <strong>{formatBalance(lastSentAmount ?? 0, "VUSD")}</strong>
                </div>
                <div className="preview-card">
                  <span>Residual shielded note</span>
                  <strong>{formatBalance(lastChangeAmount ?? 0, "VUSD")}</strong>
                </div>
              </div>
              <div className="success-metrics">
                <div className="preview-card">
                  <span>Remaining shielded balance</span>
                  <strong>{formatBalance(shieldAccount?.balance ?? 0, "VUSD")}</strong>
                </div>
                <div className="preview-card">
                  <span>Spendable notes after send</span>
                  <strong>{shieldAccount?.spendableShieldNotes.length ?? 0}</strong>
                </div>
              </div>
              {sendNoteTransaction.signature && (
                <p className="shield-helper shield-helper--meta">
                  Vanta send note: {`${sendNoteTransaction.signature.slice(0, 8)}...${sendNoteTransaction.signature.slice(-8)}`}
                </p>
              )}
              {spentMarkerTransaction.signature && (
                <p className="shield-helper shield-helper--meta">
                  Spent marker: {`${spentMarkerTransaction.signature.slice(0, 8)}...${spentMarkerTransaction.signature.slice(-8)}`}
                </p>
              )}
              <details className="shield-helper shield-helper--meta">
                <summary>Internal zk diagnostics</summary>
                <p>
                  Internal/debug only. Inspect canonical predecessor linkage and
                  successor note insertions created from recent live send actions.
                </p>
                {sendZkDiagnostics.length === 0 ? (
                  <p>No retained canonical send bridge records were found.</p>
                ) : (
                  <div className="success-metrics">
                    {sendZkDiagnostics.map((record) => (
                      <div key={record.recordId} className="preview-card">
                        <span>{new Date(record.createdAt).toLocaleTimeString()}</span>
                        <strong>
                          {abbreviate(record.transitionSignature) ?? record.transitionSignature}
                        </strong>
                        <small>Send transition</small>
                        <p className="shield-helper shield-helper--meta">
                          Predecessor: {record.predecessorLiveNoteId}
                        </p>
                        {record.predecessorCanonicalCommitment && (
                          <p className="shield-helper shield-helper--meta">
                            Canonical predecessor:{" "}
                            {abbreviate(record.predecessorCanonicalCommitment) ??
                              record.predecessorCanonicalCommitment}
                          </p>
                        )}
                        <p className="shield-helper shield-helper--meta">
                          Recipient: {record.recipient}
                        </p>
                        {record.spentMarkerSignature && (
                          <p className="shield-helper shield-helper--meta">
                            Spent marker:{" "}
                            {abbreviate(record.spentMarkerSignature) ??
                              record.spentMarkerSignature}
                          </p>
                        )}
                        {record.successors.map((successor) => (
                          <p
                            key={`${record.recordId}:${successor.kind}`}
                            className="shield-helper shield-helper--meta"
                          >
                            {successor.kind} successor #{successor.insertionIndex}:{" "}
                            {abbreviate(successor.commitment) ?? successor.commitment} · root{" "}
                            {abbreviate(successor.snapshotRoot) ?? successor.snapshotRoot}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </details>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setRecipient("");
                    setAmount(selectedSpendableNote?.amount.toFixed(2) ?? "");
                    setStatus("idle");
                    setFlowError(null);
                    setPendingSendBridge(null);
                  }}
                >
                  Send More
                </button>
                <Link className="button button-ghost" to="/app/shield">
                  Back to Shield
                </Link>
              </div>
            </div>
          )}

          {shieldStateRefreshing && status === "idle" && (
            <div className="status-panel status-panel--processing">
              <span>Refreshing state</span>
              <p>Loading the latest spendable shield notes and residual change notes from devnet.</p>
            </div>
          )}
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Vanta Private Core</span>
              <h3>Private send proof lane</h3>
            </div>
            <small>Supported zk v1 send lane</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Held private note</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_VUSD_DECIMALS)} VUSD`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Requested send</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_VUSD_DECIMALS)} VUSD`
                  : "Not ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Projected change</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.changeAmountBaseUnits), DEFAULT_VUSD_DECIMALS)} VUSD`
                  : "Not ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Boundary readiness</span>
              <strong>{privateCoreSendPreview?.boundary.readiness ?? "Blocked"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof</span>
              <strong>{privateCoreSendPreview?.sourceVerificationLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source consistency</span>
              <strong>{privateCoreSendPreview?.sourceConsistencyLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Recipient key</span>
              <strong>{abbreviate(privateCoreSendPreview?.recipientPublicKey) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator send proof</span>
              <strong>
                {privateCoreSendExecution.status === "verified"
                  ? "Verified"
                  : privateCoreSendExecution.status === "running"
                    ? "Running"
                    : privateCoreSendExecution.status === "failed"
                      ? "Failed"
                      : "Not run yet"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send</span>
              <strong>{abbreviate(privateCoreOperatorLatestSend?.sendId) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Residual private note</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_VUSD_DECIMALS)} VUSD`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Residual note readiness</span>
              <strong>
                {privateCoreSendExecution.status === "verified"
                  ? privateCoreHoldState?.witnessAvailable
                    ? "Recovered and ready"
                    : "Awaiting witness"
                  : "Not yet transitioned"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked send proof</span>
              <strong>
                {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ?? "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Proof/send link</span>
              <strong>{privateCoreOperatorProofSendLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator boundary</span>
              <strong>{privateCoreOperatorBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Send resulting root</span>
              <strong>{privateCoreOperatorSendResultingRootStatusLabel ?? "Unavailable"}</strong>
            </div>
          </div>

          <p className="shield-review-note">
            This is the currently supported narrow private-send lane for Vanta zk v1. It proves
            the current held note can support one recipient output and one optional change output,
            then asks the operator to verify the frozen send witness package over HTTP.
          </p>

          <div className="status-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void handlePrivateCoreSendProof();
              }}
              disabled={
                !privateCoreSendPreview ||
                privateCoreSendPreview.boundary.readiness !== "ready" ||
                privateCoreSendExecution.status === "running"
              }
            >
              Verify private send proof
            </button>
          </div>

          {privateCoreSendExecution.status === "running" && (
            <div className="status-panel status-panel--processing">
              <span>Verifying send proof</span>
              <p>Submitting the current private send witness package to the operator.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {privateCoreSendExecution.status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Send proof failed</span>
              <p>The operator did not accept the current private send witness package.</p>
              {privateCoreSendExecution.errorMessage && (
                <p className="shield-helper shield-helper--error">
                  {privateCoreSendExecution.errorMessage}
                </p>
              )}
            </div>
          )}

          {privateCoreSendExecution.status === "verified" && (
            <div className="status-panel status-panel--success">
              <span>Send proof verified</span>
              <p>
                The operator verified the current private send witness package and recorded a
                proof-backed send transition. The recipient now has a private note for the sent
                value, and the shared private-core state advances to the residual change note so
                the next hold or unshield step can continue from the updated private balance.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Proof fields</span>
                  <strong>{privateCoreSendExecution.proofFieldCount ?? 0}</strong>
                </div>
                <div className="preview-card">
                  <span>Public inputs</span>
                  <strong>{privateCoreSendExecution.proofPublicInputCount ?? 0}</strong>
                </div>
                <div className="preview-card">
                  <span>Recipient private note</span>
                  <strong>
                    {privateCoreSendPreview
                      ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_VUSD_DECIMALS)} VUSD`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual private note</span>
                  <strong>
                    {privateCoreHoldState
                      ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_VUSD_DECIMALS)} VUSD`
                      : "Unavailable"}
                  </strong>
                </div>
              </div>
              <p className="shield-helper shield-helper--meta">
                Latest send proof:{" "}
                {abbreviate(privateCoreSendExecution.latestProofId) ??
                  privateCoreSendExecution.latestProofId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Latest send proof action: {privateCoreSendExecution.latestProofAction ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Latest send transition:{" "}
                {abbreviate(privateCoreSendExecution.latestSendId) ??
                  privateCoreSendExecution.latestSendId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Linked send proof:{" "}
                {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ??
                  privateCoreOperatorLatestSendLinkedProof?.proofId ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Proof/send link: {privateCoreOperatorProofSendLinkStatus ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Recipient recovery: Recipient can recover the sent note privately with the matched
                private key.
              </p>
              <p className="shield-helper shield-helper--meta">
                Residual note ready:{" "}
                {privateCoreHoldState?.witnessAvailable ? "Yes" : "Awaiting refreshed hold state"}
              </p>
              <div className="status-actions">
                <Link className="button button-primary" to="/app/unshield">
                  Unshield Residual Note
                </Link>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setFlowError(null);
                    setPrivateCoreSendExecution({
                      errorMessage: null,
                      latestProofAction: null,
                      latestProofId: null,
                      latestSendId: null,
                      proofFieldCount: null,
                      proofPublicInputCount: null,
                      status: "idle",
                    });
                  }}
                >
                  Continue Sending
                </button>
              </div>
            </div>
          )}

          {privateCoreSendState && privateCoreSendExecution.status !== "verified" && (
            <div className="status-panel status-panel--success">
              <span>Latest private send</span>
              <p>
                The latest private send handoff is still available from shared state, so this flow
                can resume after refresh. The recipient note remains private, and the sender
                residual state stays visible for the next hold or unshield step.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Recipient note</span>
                  <strong>
                    {formatBaseUnits(BigInt(privateCoreSendState.recipientAmount), DEFAULT_VUSD_DECIMALS)} VUSD
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual note</span>
                  <strong>
                    {formatBaseUnits(BigInt(privateCoreSendState.changeAmount), DEFAULT_VUSD_DECIMALS)} VUSD
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Observation mode</span>
                  <strong>{privateCoreSendState.observationMode}</strong>
                </div>
              </div>
              <p className="shield-helper shield-helper--meta">
                Recipient recovery: {privateCoreSendState.recipientRecoveryStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Recipient unshield: {privateCoreSendState.recipientUnshieldStatus}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send resulting root: {privateCoreSendState.resultingRootStatusLabel}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send root note: {privateCoreSendState.resultingRootPrimaryNote}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send root record: {abbreviate(privateCoreOperatorSendResultingRootRecord?.root) ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Residual state: {privateCoreSendState.residualStateStatus}
              </p>
            </div>
          )}

          <details className="shield-helper shield-helper--meta">
            <summary>Internal send-proof diagnostics</summary>
            {privateCoreSendPreview ? (
              <>
                <p>Send circuit: {privateCoreSendPreview.boundary.circuit}</p>
                <p>Send backend: {privateCoreSendPreview.boundary.backend}</p>
                <p>
                  Source input root:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.stateRoot) ??
                    privateCoreSendPreview.boundary.publicInputs.stateRoot}
                </p>
                <p>
                  Source input nullifier:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.inputNullifier) ??
                    privateCoreSendPreview.boundary.publicInputs.inputNullifier}
                </p>
                <p>
                  Recipient commitment:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.recipientCommitment) ??
                    privateCoreSendPreview.boundary.publicInputs.recipientCommitment}
                </p>
                <p>
                  Change commitment:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.changeCommitment) ??
                    privateCoreSendPreview.boundary.publicInputs.changeCommitment ??
                    "None"}
                </p>
                <p>
                  Send context tag:{" "}
                  {abbreviate(privateCoreSendPreview.boundary.publicInputs.sendContextTag) ??
                    privateCoreSendPreview.boundary.publicInputs.sendContextTag}
                </p>
                <p>
                  Latest operator send proof:{" "}
                  {abbreviate(privateCoreOperatorLatestSendProof?.proofId) ?? "Unavailable"}
                </p>
                <p>
                  Latest linked send proof:{" "}
                  {abbreviate(privateCoreOperatorLatestSendLinkedProof?.proofId) ?? "Unavailable"}
                </p>
                <p>Operator boundary status: {privateCoreOperatorBoundaryStatusLabel ?? "Unavailable"}</p>
                <p>Operator boundary note: {privateCoreOperatorBoundaryPrimaryNote ?? "Unavailable"}</p>
                <p>
                  Send resulting root status:{" "}
                  {privateCoreOperatorSendResultingRootStatusLabel ?? "Unavailable"}
                </p>
                <p>
                  Send resulting root note:{" "}
                  {privateCoreOperatorSendResultingRootPrimaryNote ?? "Unavailable"}
                </p>
                <p>
                  Current root proof link: {privateCoreOperatorCurrentRootProofLinkStatus ?? "Unavailable"}
                </p>
                <p>
                  Send resulting root proof link:{" "}
                  {privateCoreOperatorSendResultingRootProofLinkStatus ?? "Unavailable"}
                </p>
                <p>
                  Operator summary refresh: {formatOperatorSummaryFreshness(privateCoreOperatorSummaryUpdatedAt)}
                </p>
                {privateCoreSendPreview.boundary.blockers.length > 0 && (
                  <p>
                    Blockers: {privateCoreSendPreview.boundary.blockers.join(" | ")}
                  </p>
                )}
              </>
            ) : (
              <p>No private-core send proof preview is ready yet.</p>
            )}
          </details>
        </article>
      </div>

      <VantaPrivateCoreStatePanel
        holdState={privateCoreHoldState}
        sendState={privateCoreSendState}
        operatorCurrentRoot={privateCoreOperatorCurrentRoot}
        operatorConsumeError={privateCoreOperatorConsumeError}
        operatorConsumes={privateCoreOperatorConsumes}
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
        title="Vanta Private Core send state"
        unshieldState={privateCoreUnshieldState}
      />
    </section>
  );
}

function decimalToBaseUnitsExact(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Amount is required.");
  }

  const [wholePartRaw, fractionPartRaw = ""] = trimmed.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionPartRaw)) {
    throw new Error("Amount must be numeric.");
  }

  const normalizedFraction = `${fractionPartRaw}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(normalizedFraction || "0");
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString(10);
  }

  return `${whole.toString(10)}.${fraction.toString(10).padStart(decimals, "0").replace(/0+$/, "")}`;
}

function derivePrivateCoreRecipientPublicKey(reference: string): Bytes32Hex {
  const bytes = sha256(
    new TextEncoder().encode(`vanta.private-core.send-recipient.v0:${reference.trim().toLowerCase()}`),
  );
  return (`0x${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`) as Bytes32Hex;
}
