import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSendTransaction, useWaitForSignature } from "@solana/react-hooks";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { usePrivacyFlow, type PrivacyAssetKey } from "@/context/PrivacyFlowContext";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import { liveShieldAsset } from "@/solana/shieldConfig";
import {
  createPreparedSendMemo,
  createSpentMarkerInstruction,
} from "@/solana/vantaShieldState";

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

export function SendPage({ dashboard = false }: SendPageProps) {
  const { recentShield } = usePrivacyFlow();
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
  const sendNoteTransaction = useSendTransaction();
  const sendNoteWait = useWaitForSignature(sendNoteTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !sendNoteTransaction.signature,
  });
  const spentMarkerTransaction = useSendTransaction();
  const spentMarkerWait = useWaitForSignature(spentMarkerTransaction.signature ?? undefined, {
    commitment: "confirmed",
    disabled: !spentMarkerTransaction.signature,
  });

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

  const recentShieldLabel =
    recentShield &&
    `${formatBalance(recentShield.amount, recentShield.asset)} shielded`;

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
    void spentMarkerTransaction
      .send({
        instructions: [
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
      })
      .catch((error) => {
        setStatus("failed");
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
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "success") {
      return;
    }

    void refreshShieldState()
      .then(() => {
        setStatus("complete");
        setFlowError(null);
        setPendingSpentMarker(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Send settled, but shielded state could not be refreshed.",
        );
      });
  }, [refreshShieldState, spentMarkerWait.waitStatus]);

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

      await sendNoteTransaction.send({
        instructions: [
          preparedSend.instruction,
        ],
      });
    } catch (error) {
      setPendingSpentMarker(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Send request was not approved.",
      );
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
            <NoteStatePanel
              account={shieldAccount}
              title="Resolved VUSD notes"
            />
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
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setRecipient("");
                    setAmount(selectedSpendableNote?.amount.toFixed(2) ?? "");
                    setStatus("idle");
                    setFlowError(null);
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
      </div>
    </section>
  );
}
