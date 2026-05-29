import type { AssetPickerGridOption } from "@/components/AssetPickerGrid";
import { LaneProgressiveSection } from "@/components/LaneProgressiveSection";
import { QuoteCountdownBar, type QuoteCountdownBarTone } from "@/components/QuoteCountdownBar";
import { PrivacySummary } from "@/components/PrivacySummary";
import { SwapAdvancedPanel } from "@/components/SwapAdvancedPanel";
import { SwapRecentSwapsSection, type SwapRecentSwapSummary } from "@/components/SwapRecentSwapsSection";
import { SwapReceiptModal, type SwapReceiptModalDetails } from "@/components/SwapReceiptModal";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import {
  formatQuoteTimestamp,
  formatShortSwapId,
  SWAP_PRIVACY_SUMMARY_ITEMS,
} from "@/components/swap/swapPanelUtils";
import type { NotePickerOption } from "@/components/NotePicker";
import { formatAssetAmount, type ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";
import type { SwapQuote } from "@/solana/swapOperatorClient";
import type { SolToShieldedRouteQuote } from "@/solana/solToShieldedRouteAdapter";

type ActiveSwapQuote = SwapQuote | SolToShieldedRouteQuote;

export type SwapWorkspaceStatus =
  | "idle"
  | "quoting"
  | "awaiting_confirmation"
  | "recording_transition"
  | "authorizing_operator"
  | "finalizing_state"
  | "complete"
  | "failed";

type SwapReceiptSummaryPreview = SwapRecentSwapSummary;

type SwapSpendableNotePreview = {
  amount: number;
  noteId: string;
};

export type SwapWorkspaceCardProps = {
  amount: string;
  exactSpendableNote: SwapSpendableNotePreview | null;
  expectedOutputAmount: number;
  flowError: string | null;
  formatSummaryKey: (summary: SwapReceiptSummaryPreview) => string;
  handleSelectSwapNote: (noteId: string | null) => void;
  handleSwap: () => void | Promise<void>;
  isBetaMode: boolean;
  isReady: boolean;
  lastSwapSummary: SwapReceiptSummaryPreview | null;
  maxAvailableAmount: number;
  maxSlippageLabel: string;
  maxSwappableNote: SwapSpendableNotePreview | null;
  notePickerOptions: NotePickerOption[];
  onAmountChange: (value: string) => void;
  onMaxAmount: () => void;
  onOpenReceipt: (summaryKey: string) => void;
  onSelectSourceAsset: (asset: ShieldedSwapAssetKey) => void;
  onSelectTargetAsset: (asset: ShieldedSwapAssetKey) => void;
  onSetSwapReceiptModalOpen: (open: boolean) => void;
  parsedAmount: number;
  quote: ActiveSwapQuote | null;
  quoteProgressPercent: number;
  quoteProgressTone: QuoteCountdownBarTone;
  quoteStatusLabel: string;
  quoteVenueLabel: string;
  recentSwapSummaries: readonly SwapReceiptSummaryPreview[];
  routeLabel: string;
  routeTruthLabel: string;
  selectedNoteId: string | null;
  selectedSourceAsset: ShieldedSwapAssetKey;
  selectedSwapNoteLabel: string;
  selectedTargetAsset: ShieldedSwapAssetKey;
  status: SwapWorkspaceStatus;
  swapBridgeError: string | null;
  swapPrimaryActionLabel: string;
  swapReceiptDetails: SwapReceiptModalDetails | null;
  swapReceiptModalOpen: boolean;
  swapSourceAssetPickerOptions: AssetPickerGridOption[];
  swapTargetAssetPickerOptions: AssetPickerGridOption[];
  validationMessage: string;
};

export function SwapWorkspaceCard({
  amount,
  exactSpendableNote,
  expectedOutputAmount,
  flowError,
  formatSummaryKey,
  handleSelectSwapNote,
  handleSwap,
  isBetaMode,
  isReady,
  lastSwapSummary,
  maxAvailableAmount,
  maxSlippageLabel,
  maxSwappableNote,
  notePickerOptions,
  onAmountChange,
  onMaxAmount,
  onOpenReceipt,
  onSelectSourceAsset,
  onSelectTargetAsset,
  onSetSwapReceiptModalOpen,
  parsedAmount,
  quote,
  quoteProgressPercent,
  quoteProgressTone,
  quoteStatusLabel,
  quoteVenueLabel,
  recentSwapSummaries,
  routeLabel,
  routeTruthLabel,
  selectedNoteId,
  selectedSourceAsset,
  selectedSwapNoteLabel,
  selectedTargetAsset,
  status,
  swapBridgeError,
  swapPrimaryActionLabel,
  swapReceiptDetails,
  swapReceiptModalOpen,
  swapSourceAssetPickerOptions,
  swapTargetAssetPickerOptions,
  validationMessage,
}: SwapWorkspaceCardProps) {
  return (
    <article className="send-card send-card--workspace">
      <div className="shield-card__header">
        <div>
          <span>Choose trade</span>
        </div>
      </div>

      <div className="shield-form swap-widget">
        <div className={`swap-module${isBetaMode ? " swap-preview-shell" : ""}`}>
          <QuoteCountdownBar
            label={quoteStatusLabel}
            progressPercent={quoteProgressPercent}
            tone={quoteProgressTone}
          />

          <div className="swap-route-card" aria-label="Swap route">
            <div className="swap-route-card__row">
              <div className="swap-choice-group" role="group" aria-label="From shielded asset">
                <span>From (shielded)</span>
                <select
                  className="swap-asset-select"
                  value={selectedSourceAsset}
                  onChange={(event) => {
                    onSelectSourceAsset(event.target.value as ShieldedSwapAssetKey);
                  }}
                >
                  {swapSourceAssetPickerOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.symbol} — {opt.label} (Balance: {opt.balanceLabel ?? "0"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="swap-choice-group swap-amount-group" role="group" aria-label="Amount to swap">
                <span>Amount</span>
                <div className="swap-amount-controls">
                  <input
                    id="swap-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => {
                      onAmountChange(event.target.value);
                    }}
                    placeholder="0.00"
                  />
                  <button
                    className="button button-ghost swap-max-btn"
                    type="button"
                    disabled={maxAvailableAmount <= 0}
                    onClick={() => {
                      onMaxAmount();
                    }}
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            <div className="swap-route-card__connector" aria-hidden="true">
              to
            </div>

            <div className="swap-route-card__row">
              <div className="swap-choice-group" role="group" aria-label="To shielded asset">
                <span>To</span>
                <select
                  className="swap-asset-select"
                  value={selectedTargetAsset}
                  onChange={(event) => {
                    onSelectTargetAsset(event.target.value as ShieldedSwapAssetKey);
                  }}
                >
                  {swapTargetAssetPickerOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                      {opt.symbol} — {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="swap-choice-group swap-quote-group" role="group" aria-label="Expected output">
                <span>You receive</span>
                <div className="swap-quote-value">
                  <strong>
                    {status === "quoting"
                      ? "Getting best quote..."
                      : formatAssetAmount(expectedOutputAmount, selectedTargetAsset)}
                  </strong>
                  <span>{`Shielded ${selectedTargetAsset}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="swap-route-summary">
            <strong>{`${selectedSourceAsset} -> ${selectedTargetAsset} via ${quoteVenueLabel}`}</strong>
            <span>{quoteStatusLabel}</span>
          </div>

          <details className="swap-truth-drawer">
            <summary>Route details</summary>
            <p className="shield-helper shield-helper--meta">{routeLabel}</p>
            <p className="shield-helper shield-helper--meta">{routeTruthLabel}</p>
          </details>
          <p className="shield-helper swap-validation">{validationMessage}</p>

          <details className="swap-truth-drawer">
            <summary>Privacy summary</summary>
            <PrivacySummary
              items={SWAP_PRIVACY_SUMMARY_ITEMS}
              note="Swap production privacy is locked until route adapters, verifier-backed settlement, audit, and operator gates pass."
            />
          </details>

          <SwapAdvancedPanel
            maxSlippageLabel={maxSlippageLabel}
            notePickerOptions={notePickerOptions}
            noteSelectionLabel={selectedSwapNoteLabel}
            onSelectNote={handleSelectSwapNote}
            routeTruthLabel={routeTruthLabel}
            selectedNoteId={selectedNoteId}
            sourceAssetLabel={selectedSourceAsset}
            venueLabel={quoteVenueLabel}
          />

          <div className="shield-form__actions shield-form__actions--primary">
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void handleSwap();
              }}
              disabled={
                isBetaMode ||
                !isReady ||
                status === "recording_transition" ||
                status === "authorizing_operator" ||
                status === "finalizing_state"
              }
            >
              {swapPrimaryActionLabel}
            </button>
          </div>

          <LaneProgressiveSection summary="Recent swaps (browser-local)" variant="history">
            <SwapRecentSwapsSection
              formatQuoteTimestamp={formatQuoteTimestamp}
              formatShortSwapId={formatShortSwapId}
              formatSummaryKey={formatSummaryKey}
              onOpenReceipt={onOpenReceipt}
              summaries={recentSwapSummaries}
            />
          </LaneProgressiveSection>
        </div>

        {(status === "awaiting_confirmation" ||
          status === "recording_transition" ||
          status === "authorizing_operator" ||
          status === "finalizing_state" ||
          status === "complete" ||
          status === "failed") && (
          <TransactionStatusToast
            tone={
              status === "complete"
                ? "success"
                : status === "failed"
                  ? "error"
                  : status === "awaiting_confirmation"
                    ? "pending"
                    : "processing"
            }
            phase={
              status === "complete"
                ? "complete"
                : status === "failed"
                  ? "failed"
                  : status === "awaiting_confirmation"
                    ? "pending"
                    : "confirmed"
            }
            title={
              status === "awaiting_confirmation"
                ? "Awaiting wallet confirmation"
                : status === "recording_transition"
                  ? "Recording swap transition"
                  : status === "authorizing_operator"
                    ? "Authorizing swap"
                    : status === "finalizing_state"
                      ? "Finalizing beta route evidence"
                      : status === "complete"
                        ? "Swap recorded"
                        : "Swap failed"
            }
            message={
              status === "complete" && lastSwapSummary
                ? `Recorded ${formatAssetAmount(lastSwapSummary.inputAmount, lastSwapSummary.inputAsset)} into ${formatAssetAmount(lastSwapSummary.outputAmount, lastSwapSummary.outputAsset)} with committed receipt checks.`
                : status === "complete"
                  ? `Recorded ${formatAssetAmount(parsedAmount, selectedSourceAsset)} into shielded ${selectedTargetAsset} (beta route).`
                : status === "failed"
                  ? flowError ?? "The swap could not be completed."
                  : status === "authorizing_operator"
                    ? "Authorizing the swap on the selected route."
                  : status === "finalizing_state"
                      ? `Registering spent-marker and committed receipt evidence for shielded ${selectedTargetAsset}.`
                      : "Approve the swap in your wallet to continue."
            }
            progress={status !== "complete" && status !== "failed"}
            floating
          >
            {quote &&
              status !== "failed" &&
              status !== "complete" && (
              <p className="shield-helper shield-helper--meta">
                Quote from {quote.venueName} {quote.venueFamily} ·{" "}
                {formatQuoteTimestamp(quote.quoteTimestamp)}
              </p>
            )}
            {status === "awaiting_confirmation" && (
              <WalletApprovalSheet
                heading="Swap wallet approval"
                walletPrompt="Wallet approval"
                signingMode="Transaction approval"
                rows={[
                  {
                    label: "Action",
                    value: "Authorize swap on constrained route",
                  },
                  {
                    label: "From",
                    value: formatAssetAmount(parsedAmount, selectedSourceAsset),
                  },
                  {
                    label: "To",
                    value: formatAssetAmount(expectedOutputAmount, selectedTargetAsset),
                  },
                  { label: "Venue", value: quoteVenueLabel },
                  {
                    label: "Input note",
                    value: exactSpendableNote
                      ? formatShortSwapId(exactSpendableNote.noteId)
                      : "Exact-note match required",
                  },
                ]}
                note="Approve only if the wallet shows the same route, asset, amount, and destination."
                truthBoundary="Local review. Swap is in beta with constrained routes; production privacy is not enabled."
              />
            )}
            {swapBridgeError && status === "complete" && (
              <p className="shield-helper shield-helper--meta">{swapBridgeError}</p>
            )}
            {status === "complete" && lastSwapSummary && (
              <button
                className="button button-ghost"
                type="button"
                onClick={() => onSetSwapReceiptModalOpen(true)}
              >
                View swap receipt
              </button>
            )}
            {status === "complete" && !lastSwapSummary && (
              <p className="shield-helper shield-helper--meta">
                Swap receipt unavailable until a completed swap exists.
              </p>
            )}
          </TransactionStatusToast>
        )}
        {swapReceiptDetails && (
          <SwapReceiptModal
            details={swapReceiptDetails}
            open={swapReceiptModalOpen}
            onClose={() => onSetSwapReceiptModalOpen(false)}
          />
        )}
      </div>
    </article>
  );
}
