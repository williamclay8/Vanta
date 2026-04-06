import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSendTransaction,
  useSplToken,
  useWaitForSignature,
} from "@solana/react-hooks";
import { NoteStatePanel } from "@/components/NoteStatePanel";
import { useWalletState } from "@/context/WalletContext";
import { liveShieldAsset, SHIELD_HOOK_FALLBACK_MINT } from "@/solana/shieldConfig";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
import { useVantaShieldState } from "@/solana/useVantaShieldState";
import {
  createPreparedUnshieldMemo,
  createSpentMarkerInstruction,
} from "@/solana/vantaShieldState";

type PendingSpentMarker = {
  amount: number;
  consumedNoteId: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  transitionKind: "unshield";
  transitionNoteId: string;
  vaultOwner: string;
};

type UnshieldStatus =
  | "idle"
  | "review"
  | "awaiting_confirmation"
  | "recording_transition"
  | "returning_to_wallet"
  | "finalizing_state"
  | "complete"
  | "failed";

function formatBalance(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} VUSD`;
}

export function UnshieldPage() {
  const { walletAddress, walletAddressShort, walletConnected } = useWalletState();
  const {
    account: shieldAccount,
    error: shieldStateError,
    isRefreshing: shieldStateRefreshing,
    refresh: refreshShieldState,
  } = useVantaShieldState();
  const supportedToken = useSplToken(
    liveShieldAsset.mintAddress ?? SHIELD_HOOK_FALLBACK_MINT,
    { config: { tokenProgram: "auto" } },
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [lastAmount, setLastAmount] = useState<number | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [returnTransferSignature, setReturnTransferSignature] = useState<string | null>(null);
  const [lastTransitionSignature, setLastTransitionSignature] = useState<string | null>(null);
  const [lastSpentMarkerSignature, setLastSpentMarkerSignature] = useState<string | null>(null);
  const transitionTransaction = useSendTransaction();
  const transitionWait = useWaitForSignature(
    transitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !transitionTransaction.signature,
    },
  );
  const spentMarkerTransaction = useSendTransaction();
  const spentMarkerWait = useWaitForSignature(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );
  const returnTransferWait = useWaitForSignature(returnTransferSignature ?? undefined, {
    commitment: "confirmed",
    disabled: !returnTransferSignature,
  });

  const spendableNotes = shieldAccount?.spendableShieldNotes ?? [];

  useEffect(() => {
    if (!spendableNotes.length) {
      setSelectedNoteId(null);
      return;
    }

    if (!selectedNoteId || !spendableNotes.some((note) => note.noteId === selectedNoteId)) {
      setSelectedNoteId(spendableNotes[0].noteId);
    }
  }, [selectedNoteId, spendableNotes]);

  const selectedNote = useMemo(() => {
    return spendableNotes.find((note) => note.noteId === selectedNoteId) ?? null;
  }, [selectedNoteId, spendableNotes]);

  const publicBalance = Number(supportedToken.balance?.uiAmount ?? "0");
  const shieldedBalance = shieldAccount?.balance ?? 0;
  const postUnshieldPublicBalance =
    selectedNote && status !== "complete" ? publicBalance + selectedNote.amount : publicBalance;
  const postUnshieldShieldedBalance =
    selectedNote && status !== "complete"
      ? Number(Math.max(shieldedBalance - selectedNote.amount, 0).toFixed(6))
      : shieldedBalance;
  const isReady =
    walletConnected &&
    Boolean(walletAddress) &&
    Boolean(selectedNote) &&
    Boolean(liveShieldAsset.mintAddress) &&
    Boolean(liveShieldAsset.vaultOwner) &&
    liveShieldAsset.unshieldConfigured;

  useEffect(() => {
    if (transitionTransaction.status === "loading") {
      setStatus("recording_transition");
      return;
    }

    if (transitionTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        transitionTransaction.error instanceof Error
          ? transitionTransaction.error.message
          : "The Vanta unshield record could not be submitted.",
      );
      setPendingSpentMarker(null);
    }
  }, [transitionTransaction.error, transitionTransaction.status]);

  useEffect(() => {
    if (transitionWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      transitionWait.waitError instanceof Error
        ? transitionWait.waitError.message
        : "The Vanta unshield record was submitted but not confirmed.",
    );
    setPendingSpentMarker(null);
  }, [transitionWait.waitError, transitionWait.waitStatus]);

  useEffect(() => {
    if (
      transitionWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      !walletAddress ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner ||
      returnTransferSignature
    ) {
      return;
    }

    setStatus("returning_to_wallet");
    void requestOperatorUnshield({
      amount: pendingSpentMarker.amount.toString(),
      destinationOwner: walletAddress,
      mintAddress: pendingSpentMarker.mintAddress,
      noteId: pendingSpentMarker.consumedNoteId,
      owner: pendingSpentMarker.owner,
      vaultOwner: pendingSpentMarker.vaultOwner,
    })
      .then(({ signature }) => {
        setReturnTransferSignature(signature);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The unshield operator could not return VUSD to Public Wallet.",
        );
      });
  }, [
    pendingSpentMarker,
    returnTransferSignature,
    transitionWait.waitStatus,
    walletAddress,
  ]);

  useEffect(() => {
    if (returnTransferWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      returnTransferWait.waitError instanceof Error
        ? returnTransferWait.waitError.message
        : "The public wallet return transfer was submitted but not confirmed.",
    );
  }, [returnTransferWait.waitError, returnTransferWait.waitStatus]);

  useEffect(() => {
    if (
      returnTransferWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_state");
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
            : "The spent marker could not be submitted.",
        );
      });
  }, [
    pendingSpentMarker,
    returnTransferWait.waitStatus,
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

    void Promise.all([refreshShieldState(), supportedToken.refresh()])
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
            : "Unshield completed, but wallet or Vanta state could not be refreshed.",
        );
      });
  }, [refreshShieldState, spentMarkerWait.waitStatus, supportedToken]);

  async function handleUnshield() {
    if (
      !isReady ||
      !selectedNote ||
      !walletAddress ||
      !liveShieldAsset.mintAddress ||
      !liveShieldAsset.vaultOwner
    ) {
      return;
    }

    transitionTransaction.reset();
    spentMarkerTransaction.reset();
    setFlowError(null);
    setReturnTransferSignature(null);
    setLastTransitionSignature(null);
    setLastSpentMarkerSignature(null);
    setLastAmount(selectedNote.amount);
    setStatus("awaiting_confirmation");

    try {
      const createdAt = Date.now();
      const preparedUnshield = createPreparedUnshieldMemo({
        amount: selectedNote.amount.toString(),
        asset: "VUSD",
        consumedNoteId: selectedNote.noteId,
        createdAt,
        destinationOwner: walletAddress,
        mintAddress: liveShieldAsset.mintAddress,
        owner: shieldAccount?.owner ?? walletAddress,
        vaultOwner: liveShieldAsset.vaultOwner,
      });

      setPendingSpentMarker({
        amount: selectedNote.amount,
        consumedNoteId: selectedNote.noteId,
        createdAt,
        mintAddress: liveShieldAsset.mintAddress,
        owner: shieldAccount?.owner ?? walletAddress,
        transitionKind: "unshield",
        transitionNoteId: preparedUnshield.noteId,
        vaultOwner: liveShieldAsset.vaultOwner,
      });

      await transitionTransaction.send({
        instructions: [preparedUnshield.instruction],
      });
    } catch (error) {
      setPendingSpentMarker(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Unshield request was not approved.",
      );
    }
  }

  useEffect(() => {
    if (transitionTransaction.signature) {
      setLastTransitionSignature(transitionTransaction.signature);
    }
  }, [transitionTransaction.signature]);

  useEffect(() => {
    if (spentMarkerTransaction.signature) {
      setLastSpentMarkerSignature(spentMarkerTransaction.signature);
    }
  }, [spentMarkerTransaction.signature]);

  let validationMessage =
    "Unshield currently supports one spendable VUSD note at a time and returns the full note value through a constrained operator-backed devnet path.";

  if (!walletConnected) {
    validationMessage = "Connect a wallet to use Public Wallet as the return destination.";
  } else if (!liveShieldAsset.unshieldConfigured) {
    validationMessage =
      "Unshield requires the live VUSD mint and vault path to be configured.";
  } else if (shieldStateRefreshing || supportedToken.isFetching) {
    validationMessage = "Refreshing wallet and Vanta note state from devnet.";
  } else if (shieldStateError) {
    validationMessage = shieldStateError;
  } else if (!selectedNote) {
    validationMessage =
      "No spendable VUSD note is currently available to return to Public Wallet.";
  }

  return (
    <section className="send-page">
      <div className="module-page__hero send-page__hero">
        <div>
          <span className="eyebrow">Live</span>
          <h2>Unshield</h2>
          <p>
            Return value from Vanta&apos;s constrained shielded note system back
            into Public Wallet state. This milestone supports one `VUSD` note
            at a time with a real devnet exit path.
          </p>
        </div>

        <div className="module-state">
          <strong>Workflow role</strong>
          <p>
            Unshield completes the first meaningful lifecycle for `VUSD`:
            Public Wallet to Shielded State and back out again through a
            constrained real exit.
          </p>
        </div>
      </div>

      <div className="send-flow-indicator">
        {["Public Wallet", "Shield", "Shielded State", "Unshield"].map((step, index) => (
          <div
            key={step}
            className={index === 3 ? "send-flow-step send-flow-step--active" : "send-flow-step"}
          >
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Exit to Public Wallet</span>
              <h3>Return one spendable note</h3>
            </div>
            <small>VUSD only, one note at a time</small>
          </div>

          <div className="shield-form">
            <div className="shield-form__section">
              <label>Spendable notes</label>
              <div className="asset-list">
                {!walletConnected ? (
                  <div className="preview-card">
                    <span>Wallet not connected</span>
                    <strong>Connect to unshield</strong>
                  </div>
                ) : spendableNotes.length === 0 ? (
                  <div className="preview-card">
                    <span>No spendable notes</span>
                    <strong>Shield VUSD first</strong>
                  </div>
                ) : (
                  spendableNotes.map((note) => (
                    <button
                      key={note.noteId}
                      type="button"
                      className={
                        selectedNoteId === note.noteId
                          ? "asset-row asset-row--active"
                          : "asset-row"
                      }
                      onClick={() => {
                        setSelectedNoteId(note.noteId);
                        setStatus("idle");
                        setFlowError(null);
                      }}
                    >
                      <div>
                        <strong>{formatBalance(note.amount)}</strong>
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
              <p className="shield-helper">{validationMessage}</p>
            </div>

            <div className="preview-grid">
              <div className="preview-card">
                <span>Current Public Wallet</span>
                <strong>{formatBalance(publicBalance)}</strong>
              </div>
              <div className="preview-card preview-card--accent">
                <span>Current Shielded Balance</span>
                <strong>{formatBalance(shieldedBalance)}</strong>
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-card preview-card--accent">
                <span>Returned to Public Wallet</span>
                <strong>{formatBalance(selectedNote?.amount ?? 0)}</strong>
              </div>
              <div className="preview-card">
                <span>Post-unshield Shielded State</span>
                <strong>{formatBalance(postUnshieldShieldedBalance)}</strong>
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
                disabled={!isReady || status === "recording_transition" || status === "finalizing_state"}
              >
                Review unshield
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  void handleUnshield();
                }}
                disabled={!isReady || status === "recording_transition" || status === "finalizing_state"}
              >
                Exit to Public Wallet
              </button>
            </div>
          </div>
        </article>

        <article className="send-card">
          <div className="shield-card__header">
            <div>
              <span>Unshield context</span>
              <h3>Constrained exit path</h3>
            </div>
            <small>{walletAddressShort ?? "No wallet connected"}</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Selected note</span>
              <strong>
                {selectedNote
                  ? `${selectedNote.noteId.slice(0, 10)}...${selectedNote.noteId.slice(-6)}`
                  : "None selected"}
              </strong>
            </div>
            <div className="review-row">
              <span>Unshield amount</span>
              <strong>{formatBalance(selectedNote?.amount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Return destination</span>
              <strong>{walletAddressShort ?? "Connect wallet"}</strong>
            </div>
            <div className="review-row">
              <span>Exit model</span>
              <strong>Full-note-only for v1</strong>
            </div>
            <div className="review-row">
              <span>Vault path</span>
              <strong>Operator-backed devnet return path</strong>
            </div>
            <div className="review-row">
              <span>Projected Public Wallet</span>
              <strong>{formatBalance(postUnshieldPublicBalance)}</strong>
            </div>
          </div>

          <p className="shield-review-note">
            This first Unshield milestone is intentionally narrow. It supports
            one `VUSD` note at a time, returns the full note value to Public
            Wallet, and then finalizes note consumption through the current
            spent-marker model.
          </p>

          <NoteStatePanel account={shieldAccount} title="Resolved VUSD notes" />

          {status === "review" && (
            <div className="status-panel">
              <span>Ready to unshield</span>
              <p>
                Submit a constrained real Unshield transition for the selected
                note, return the value to Public Wallet, then finalize note
                consumption.
              </p>
              <div className="status-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    void handleUnshield();
                  }}
                >
                  Confirm Unshield
                </button>
              </div>
            </div>
          )}

          {status === "awaiting_confirmation" && (
            <div className="status-panel">
              <span>Awaiting wallet confirmation</span>
              <p>Approve the Vanta unshield transition for the selected note.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "recording_transition" && (
            <div className="status-panel status-panel--processing">
              <span>Recording unshield transition</span>
              <p>Submitting the Vanta unshield note on devnet.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "returning_to_wallet" && (
            <div className="status-panel status-panel--processing">
              <span>Returning to Public Wallet</span>
              <p>Moving `VUSD` from the configured Vanta vault back to your wallet through the local operator path.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "finalizing_state" && (
            <div className="status-panel status-panel--processing">
              <span>Finalizing shielded state</span>
              <p>Submitting the spent marker and refreshing Vanta note state.</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Unshield failed</span>
              <p>
                The constrained exit flow did not complete cleanly, so Vanta
                will continue to resolve note spendability from confirmed state only.
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
                Retry unshield
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="status-panel status-panel--success">
              <span>Unshield complete</span>
              <p>
                {lastAmount !== null
                  ? `${formatBalance(lastAmount)} returned to Public Wallet and the source shielded note is no longer spendable.`
                  : "The constrained Vanta unshield flow completed."}
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Returned to Public Wallet</span>
                  <strong>{formatBalance(lastAmount ?? 0)}</strong>
                </div>
                <div className="preview-card">
                  <span>Remaining Shielded Balance</span>
                  <strong>{formatBalance(shieldAccount?.balance ?? 0)}</strong>
                </div>
              </div>
              <div className="success-metrics">
                <div className="preview-card">
                  <span>Public Wallet after unshield</span>
                  <strong>{formatBalance(Number(supportedToken.balance?.uiAmount ?? "0"))}</strong>
                </div>
                <div className="preview-card">
                  <span>Spendable notes after unshield</span>
                  <strong>{shieldAccount?.spendableShieldNotes.length ?? 0}</strong>
                </div>
              </div>
              {lastTransitionSignature && (
                <p className="shield-helper shield-helper--meta">
                  Vanta unshield note: {`${lastTransitionSignature.slice(0, 8)}...${lastTransitionSignature.slice(-8)}`}
                </p>
              )}
              {returnTransferSignature && (
                <p className="shield-helper shield-helper--meta">
                  Public wallet return transfer: {`${returnTransferSignature.slice(0, 8)}...${returnTransferSignature.slice(-8)}`}
                </p>
              )}
              {lastSpentMarkerSignature && (
                <p className="shield-helper shield-helper--meta">
                  Spent marker: {`${lastSpentMarkerSignature.slice(0, 8)}...${lastSpentMarkerSignature.slice(-8)}`}
                </p>
              )}
              <div className="status-actions">
                <Link className="button button-primary" to="/app/shield">
                  Back to Shield
                </Link>
                <Link className="button button-ghost" to="/app/send">
                  Continue to Send
                </Link>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
