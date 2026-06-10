import { Link } from "react-router-dom";
import { NotePicker, type NotePickerOption } from "@/components/NotePicker";
import { PrivacySummary, type PrivacySummaryItem } from "@/components/PrivacySummary";
import { RecipientField } from "@/components/RecipientField";
import type { SendReceiptModalDetails } from "@/components/SendReceiptModal";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import type { PrivateCoreSendExecutionState } from "@/components/SendProofLanePanel";
import { abbreviate } from "@/components/send/sendPanelUtils";
import type { PrivacyAssetKey } from "@/data/context/PrivacyFlowContext";
import type { SendRecipientInputSource, SendRecipientValidationResult } from "@/solana/sendRecipientValidation";
import type { ShieldedSendAssetCapability, ShieldedSendAssetKey } from "@/solana/shieldedSendCapability";
import type { VantaShieldAccountState } from "@/solana/vantaShieldState";

const SEND_PRIVACY_SUMMARY_ITEMS: readonly PrivacySummaryItem[] = [
  {
    label: "Chain sees",
    value: "a transaction happened, plus encrypted memo packets",
  },
  {
    label: "Recipient sees",
    value: "amount, asset, and recovery data with the matched viewing key",
  },
  {
    label: "Operator sees",
    value: "proof and settlement status, not witness values or plaintext memo contents",
  },
];

type SendSpendableNote = {
  amount: number;
  noteId: string;
};

type SendStatus =
  | "idle"
  | "review"
  | "awaiting_confirmation"
  | "sending"
  | "settling"
  | "complete"
  | "failed";

export type SendWorkspaceCardProps = {
  amount: string;
  formatBalance: (value: number, symbol: PrivacyAssetKey) => string;
  flowError: string | null;
  handleSend: () => void | Promise<void>;
  isAmountValid: boolean;
  isBetaMode: boolean;
  isPrivateCoreUsdcSendReady: boolean;
  isSendAdvancedOpen: boolean;
  lastChangeAmount: number | null;
  lastRecipient: string | null;
  lastSentAmount: number | null;
  parsedAmount: number;
  privateCoreSendExecution: PrivateCoreSendExecutionState;
  recentSendRecipients: readonly string[];
  recipient: string;
  recipientValidation: SendRecipientValidationResult;
  selectedAsset: ShieldedSendAssetKey;
  selectedBalance: number;
  selectedSendCapability: ShieldedSendAssetCapability;
  selectedSpendableNote: SendSpendableNote | null;
  sendHelperMessage: string;
  sendNotePickerOptions: NotePickerOption[];
  sendNoteSignature: string | null;
  sendPrimaryActionLabel: string;
  sendProgressLabel: string | null | undefined;
  sendReceiptModalDetails: SendReceiptModalDetails | null;
  sendShieldedAssetOptions: readonly {
    label: string;
    symbol: ShieldedSendAssetKey;
  }[];
  settleProgressLabel: string | null | undefined;
  shieldAccount: VantaShieldAccountState | null | undefined;
  shieldStateRefreshing: boolean;
  spentMarkerSignature: string | null;
  spendableNotes: readonly SendSpendableNote[];
  status: SendStatus;
  trimmedRecipient: string;
  onAmountChange: (value: string) => void;
  onAssetChange: (asset: ShieldedSendAssetKey) => void;
  onRecipientChange: (value: string, inputSource: SendRecipientInputSource) => void;
  onRetryAfterFailure: () => void;
  onSelectNote: (noteId: string | null) => void;
  onSendAdvancedOpenChange: (open: boolean) => void;
  onSendMore: () => void;
  onSetSendAdvancedOpen: (open: boolean) => void;
  setSendReceiptModalOpen: (value: boolean) => void;
  selectedNoteId: string | null;
};

export function SendWorkspaceCard({
  amount,
  formatBalance,
  flowError,
  handleSend,
  isAmountValid,
  isBetaMode,
  isPrivateCoreUsdcSendReady,
  isSendAdvancedOpen,
  lastChangeAmount,
  lastRecipient,
  lastSentAmount,
  parsedAmount,
  privateCoreSendExecution,
  recentSendRecipients,
  recipient,
  recipientValidation,
  selectedAsset,
  selectedBalance,
  selectedSendCapability,
  selectedSpendableNote,
  selectedNoteId,
  sendHelperMessage,
  sendNotePickerOptions,
  sendNoteSignature,
  sendPrimaryActionLabel,
  sendProgressLabel,
  sendReceiptModalDetails,
  sendShieldedAssetOptions,
  settleProgressLabel,
  shieldAccount,
  shieldStateRefreshing,
  spentMarkerSignature,
  spendableNotes,
  status,
  trimmedRecipient,
  onAmountChange,
  onAssetChange,
  onRecipientChange,
  onRetryAfterFailure,
  onSelectNote,
  onSendAdvancedOpenChange,
  onSendMore,
  onSetSendAdvancedOpen,
  setSendReceiptModalOpen,
}: SendWorkspaceCardProps) {
  return (
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Send</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <RecipientField
                id="send-recipient"
                label="To"
                onValueChange={onRecipientChange}
                recentRecipients={recentSendRecipients}
                validation={recipientValidation}
                value={recipient}
              />

              <div className="swap-module__divider" aria-hidden="true" />

              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Amount</span>
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Shielded balance: {formatBalance(selectedBalance, selectedAsset)}
                  </div>
                </div>
                <div className="send-entry-grid">
                  <div className="amount-field">
                    <input
                      id="send-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        onAmountChange(event.target.value);
                      }}
                      placeholder="0.00"
                      disabled={selectedSendCapability.status !== "live"}
                    />
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={selectedSendCapability.status !== "live" || !selectedSpendableNote}
                      onClick={() => {
                        if (!selectedSpendableNote) {
                          return;
                        }

                        onAmountChange(selectedSpendableNote.amount.toFixed(2));
                      }}
                    >
                      Max
                    </button>
                  </div>
                  <div className="send-asset-field">
                    <select
                      aria-label="Send shielded asset"
                      value={selectedAsset}
                      onChange={(event) => {
                        onAssetChange(event.target.value as ShieldedSendAssetKey);
                      }}
                    >
                      {sendShieldedAssetOptions.map(({ label, symbol }) => (
                        <option key={symbol} value={symbol}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="send-note-summary">
                <div>
                  <span>Spending</span>
                  <strong>
                    {selectedSpendableNote
                      ? `${formatBalance(selectedSpendableNote.amount, selectedAsset)} note`
                      : "No send-ready note"}
                  </strong>
                  {selectedSpendableNote && (
                    <small>
                      {abbreviate(selectedSpendableNote.noteId) ?? selectedSpendableNote.noteId}
                    </small>
                  )}
                </div>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    onSetSendAdvancedOpen(true);
                  }}
                  disabled={spendableNotes.length === 0}
                >
                  Change note
                </button>
              </div>

              <details className="send-truth-drawer">
                <summary>Privacy summary</summary>
                <PrivacySummary
                  items={SEND_PRIVACY_SUMMARY_ITEMS}
                  note="Send production privacy is locked until live evidence, approval, audit, replay, and operator gates pass."
                />
              </details>

              <details
                className="send-advanced-panel"
                data-vanta-send-advanced-panel
                open={isSendAdvancedOpen}
                onToggle={(event) => {
                  onSendAdvancedOpenChange(event.currentTarget.open);
                }}
              >
                <summary>Advanced send settings</summary>
                <div className="send-advanced-panel__grid">
                  <label className="send-advanced-panel__field">
                    <span>Custom note selection</span>
                    <NotePicker
                      ariaLabel="Send note selection"
                      automaticLabel="Automatic best note"
                      emptyCopy="start with Shield to create a send-ready note."
                      emptyOptionLabel="No send-ready notes"
                      helperText="Sends from your current shielded notes."
                      onSelectNote={onSelectNote}
                      options={sendNotePickerOptions}
                      selectedNoteId={selectedNoteId}
                    />
                  </label>

                  <div className="send-advanced-panel__field">
                    <span>Encrypted recipient memo</span>
                    <strong>Automatic v2 AEAD packet</strong>
                    <small>Plaintext memo contents stay out of the operator packet.</small>
                  </div>

                  <div className="send-advanced-panel__field">
                    <span>Spent marker</span>
                    <strong>Automatic</strong>
                    <small>Attached after wallet confirmation.</small>
                  </div>
                </div>
              </details>

              <p className="shield-helper send-validation" data-vanta-send-ledger-gate-status>
                {sendHelperMessage}
              </p>

              <div className="shield-form__actions shield-form__actions--primary">
                <button
                  className={`button button-primary${
                    privateCoreSendExecution.status === "running" ||
                    status === "sending" ||
                    status === "settling"
                      ? " button--loading"
                      : ""
                  }`}
                  data-vanta-send-primary-action
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={
                    isBetaMode ||
                    !isPrivateCoreUsdcSendReady ||
                    privateCoreSendExecution.status === "running" ||
                    status === "sending" ||
                    status === "settling"
                  }
                >
                  {sendPrimaryActionLabel}
                </button>
              </div>
            </div>
          </div>

          {status === "awaiting_confirmation" && (
            <TransactionStatusToast
              tone="pending"
              phase="pending"
              title="Awaiting wallet confirmation"
              message="Approve this shielded-state send in your wallet."
              progress
              floating
            >
              <WalletApprovalSheet
                heading="Send wallet approval"
                walletPrompt="Wallet approval"
                signingMode="Transaction approval"
                rows={[
                  { label: "Action", value: "Send privately from shielded balance" },
                  { label: "Asset", value: selectedAsset },
                  {
                    label: "Amount",
                    value: isAmountValid ? formatBalance(parsedAmount, selectedAsset) : "Pending",
                  },
                  { label: "Recipient", value: abbreviate(trimmedRecipient) ?? "Pending" },
                  {
                    label: "Input note",
                    value: abbreviate(selectedSpendableNote?.noteId) ?? "Automatic best note",
                  },
                ]}
                note="Confirm only if the wallet shows the same recipient, asset, and amount."
                truthBoundary="Local review. Production privacy is not enabled for Send."
              />
            </TransactionStatusToast>
          )}

          {status === "sending" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Send in progress"
              message="Encrypting and submitting your send privately. This usually takes a few seconds."
              progress
              floating
            >
              {sendProgressLabel && (
                <p className="shield-helper shield-helper--meta">{sendProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "settling" && (
            <TransactionStatusToast
              tone="processing"
              phase="confirmed"
              title="Updating your private balance"
              message="Securing your updated balance and preparing the next spendable notes."
              progress
              floating
            >
              {settleProgressLabel && (
                <p className="shield-helper shield-helper--meta">{settleProgressLabel}</p>
              )}
            </TransactionStatusToast>
          )}

          {status === "failed" && (
            <TransactionStatusToast
              tone="error"
              phase="failed"
              title="Send failed"
              message="Your shielded balance was not changed. Review the details below and try again."
              floating
            >
              {flowError && <p className="shield-helper shield-helper--error">{flowError}</p>}
              <button
                className="button button-primary"
                type="button"
                onClick={onRetryAfterFailure}
              >
                Retry send
              </button>
            </TransactionStatusToast>
          )}

          {status === "complete" && (
            <TransactionStatusToast
              tone="success"
              phase="complete"
              title="Send complete"
              message={
                lastSentAmount !== null && lastRecipient
                  ? `${formatBalance(lastSentAmount, "USDC")} sent privately to ${lastRecipient}.`
                  : "Your private send was confirmed."
              }
              floating
            >
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Amount sent</span>
                  <strong>{formatBalance(lastSentAmount ?? 0, "USDC")}</strong>
                </div>
                <div className="preview-card">
                  <span>Residual shielded note</span>
                  <strong>{formatBalance(lastChangeAmount ?? 0, "USDC")}</strong>
                </div>
              </div>
              <div className="success-metrics">
                <div className="preview-card">
                  <span>Remaining shielded balance</span>
                  <strong>{formatBalance(shieldAccount?.balance ?? 0, "USDC")}</strong>
                </div>
                <div className="preview-card">
                  <span>Spendable notes after send</span>
                  <strong>{shieldAccount?.spendableShieldNotes.length ?? 0}</strong>
                </div>
              </div>
              {sendNoteSignature && (
                <p className="shield-helper shield-helper--meta">
                  Vanta send note: {`${sendNoteSignature.slice(0, 8)}...${sendNoteSignature.slice(-8)}`}
                </p>
              )}
              {spentMarkerSignature && (
                <p className="shield-helper shield-helper--meta">
                  Spent marker: {`${spentMarkerSignature.slice(0, 8)}...${spentMarkerSignature.slice(-8)}`}
                </p>
              )}
              <div className="status-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setSendReceiptModalOpen(true)}
                  disabled={!sendReceiptModalDetails}
                >
                  View send receipt
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={onSendMore}
                >
                  Send More
                </button>
                <Link className="button button-ghost" to="/app/shield">
                  Back to Shield
                </Link>
              </div>
            </TransactionStatusToast>
          )}

          {shieldStateRefreshing && status === "idle" && (
            <div className="status-panel status-panel--processing">
              <span>Refreshing state</span>
              <p>Loading your latest notes from the active cluster…</p>
            </div>
          )}
        </article>
  );
}
