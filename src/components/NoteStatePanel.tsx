import {
  getLiveShieldTokenAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";
import { formatVantaSolAmount } from "@/solana/solAmountFormat";
import type { VantaShieldAccountState } from "@/solana/vantaShieldState";

type NoteStatePanelProps = {
  account: VantaShieldAccountState | null;
  compact?: boolean;
  maxNotes?: number;
  title?: string;
};

function abbreviate(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatAmount(value: number, asset: LiveShieldTokenAssetKey) {
  const decimals = Math.min(getLiveShieldTokenAsset(asset).decimals, 4);
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  })} ${asset}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function NoteStatePanel({
  account,
  compact = false,
  maxNotes = 5,
  title = "Current note state",
}: NoteStatePanelProps) {
  if (!account) {
    return (
      <div className="note-state-panel">
        <div className="shield-card__header">
          <div>
            <span>Shielded note state</span>
            <h3>{title}</h3>
          </div>
          <small>Shield notes + SOL outputs</small>
        </div>
        <p className="shield-review-note">
          Connect a wallet and enter a live shielded lane to resolve current
          spendable, consumed, change-derived, and swap-derived notes, plus any
          shielded SOL outputs created by Swap.
        </p>
      </div>
    );
  }

  const visibleShieldedSolNotes = account.spendableShieldedSolNotes;

  return (
    <div className="note-state-panel">
      <div className="shield-card__header">
        <div>
          <span>Shielded note state</span>
          <h3>{title}</h3>
        </div>
        <small>
          {account.noteStatusSummary.total + visibleShieldedSolNotes.length} resolved states
        </small>
      </div>

      <div className="preview-grid note-state-summary">
        <div className="preview-card preview-card--accent">
          <span>Spendable</span>
          <strong>{account.noteStatusSummary.spendable}</strong>
        </div>
        <div className="preview-card">
          <span>Consumed</span>
          <strong>{account.noteStatusSummary.consumed}</strong>
        </div>
        <div className="preview-card">
          <span>Change-derived</span>
          <strong>{account.noteStatusSummary.changeDerived}</strong>
        </div>
        <div className="preview-card">
          <span>Swap-derived</span>
          <strong>{account.noteStatusSummary.swapDerived}</strong>
        </div>
        <div className="preview-card">
          <span>Shielded balance</span>
          <strong>{formatAmount(account.balance, account.asset)}</strong>
        </div>
        <div className="preview-card">
          <span>Shielded SOL</span>
          <strong>{formatVantaSolAmount(account.shieldedSolBalance)}</strong>
        </div>
      </div>

      <div className="note-state-list">
        {account.noteStates.slice(0, maxNotes).map((note) => (
          <div key={note.noteId} className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(note.amount, note.asset)}</strong>
                <span>{abbreviate(note.noteId)}</span>
              </div>
              <div className="note-state-chips">
                <span
                  className={
                    note.lifecycleStatus === "spendable"
                      ? "note-state-chip note-state-chip--spendable"
                      : "note-state-chip note-state-chip--consumed"
                  }
                >
                  {note.lifecycleStatus === "spendable" ? "Spendable" : "Consumed"}
                </span>
                {note.sourceType === "change_derived" && (
                  <span className="note-state-chip note-state-chip--change">
                    Change-derived
                  </span>
                )}
                {note.sourceType === "swap_derived" && (
                  <span className="note-state-chip note-state-chip--change">
                    Swap-derived
                  </span>
                )}
              </div>
            </div>

            <div className="note-state-row__meta">
              <span>Created {formatDate(note.createdAt)}</span>
              {note.parentNoteId && <span>Parent {abbreviate(note.parentNoteId)}</span>}
              {note.consumedByTransitionId && note.consumedByTransitionKind && (
                <span>
                  {note.consumedByTransitionKind === "send"
                    ? "Send"
                    : note.consumedByTransitionKind === "swap"
                      ? "Swap"
                      : "Unshield"}{" "}
                  {abbreviate(note.consumedByTransitionId)}
                </span>
              )}
              {note.spentMarkerId && <span>Spent {abbreviate(note.spentMarkerId)}</span>}
            </div>
          </div>
        ))}
      </div>

      {visibleShieldedSolNotes.length > 0 && (
        <div className="note-state-list">
          {visibleShieldedSolNotes
            .slice(0, Math.max(1, Math.min(maxNotes, 3)))
            .map((note) => (
            <div key={note.noteId} className="note-state-row note-state-row--sol">
              <div className="note-state-row__header">
                <div>
                  <strong>{formatVantaSolAmount(note.amount)}</strong>
                  <span>{abbreviate(note.noteId)}</span>
                </div>
                <div className="note-state-chips">
                  <span className="note-state-chip note-state-chip--sol">Shielded SOL</span>
                  <span className="note-state-chip note-state-chip--spendable">Unshieldable</span>
                </div>
              </div>

              <div className="note-state-row__meta">
                <span>Created {formatDate(note.createdAt)}</span>
                <span>Swap output {abbreviate(note.sourceSwapNoteId)}</span>
                {note.consumedByTransitionId && (
                  <span>Unshield SOL {abbreviate(note.consumedByTransitionId)}</span>
                )}
                {note.spentMarkerId && <span>Spent {abbreviate(note.spentMarkerId)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!compact && (
        <p className="shield-review-note">
          This view reflects Vanta&apos;s current constrained resolver:
          shield-note identity, spendability, change lineage, swap-derived
          token outputs, and shielded `SOL` outputs created by Swap. It is a
          product-facing protocol summary, not a full explorer.
        </p>
      )}
    </div>
  );
}
