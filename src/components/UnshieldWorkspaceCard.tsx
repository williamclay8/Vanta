import { Link } from "react-router-dom";
import { PrivacySummary } from "@/components/PrivacySummary";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { UnshieldAdvancedPanel } from "@/components/UnshieldAdvancedPanel";
import {
  UnshieldReceiptModal,
  type UnshieldReceiptModalDetails,
} from "@/components/UnshieldReceiptModal";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import { formatEditableAmount } from "@/components/shield/shieldPanelUtils";
import {
  abbreviate,
  formatAvailableLaneOptionLabel,
  formatUnshieldAmount,
  getSolscanTransactionUrl,
  UNSHIELD_PRIVACY_SUMMARY_ITEMS,
  type UnshieldLane,
} from "@/components/unshield/unshieldPanelUtils";
import type { NotePickerOption } from "@/components/NotePicker";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";
import type { LiveUnshieldDiagnosticsSummary } from "@/zk/liveUnshieldBridge";

type PreparedWalletApproval = Record<string, unknown>;

export type UnshieldWorkspaceStatus =
  | "idle"
  | "review"
  | "awaiting_confirmation"
  | "transition_ready"
  | "splitting_note"
  | "split_finalization_ready"
  | "recording_transition"
  | "finalizing_split"
  | "operator_ready"
  | "authorizing_operator"
  | "release_ready"
  | "finalizing_state"
  | "complete"
  | "failed";

type LaneOption = {
  amount: number;
  lane: UnshieldLane;
};

type SafeSendTransactionPreview = {
  signature: string | null;
  status: string;
};

type UnshieldCompletion = {
  amount: number;
  asset: UnshieldLane;
};

type UnshieldTransactionEvidence = {
  operator: { status: string };
  proof: { status: string };
  settlement: { status: string };
  wallet: { status: string };
};

type PrivateCoreReleaseLabelState = {
  artifactIdentityLabel?: string | null;
  artifactStatusLabel?: string | null;
  checkStatusLabel?: string | null;
  contractIdentityLabel?: string | null;
  decisionIdentityLabel?: string | null;
  gatePrimaryNote?: string | null;
  gateStatusLabel?: string | null;
  handoffPrimaryNote?: string | null;
  handoffStatusLabel?: string | null;
  lifecycleStatusLabel?: string | null;
  lineageSummaryLabel?: string | null;
  nextActionLabel?: string | null;
  packageIdentityLabel?: string | null;
  packagePrimaryNote?: string | null;
  packageStatusLabel?: string | null;
  prepareStatusLabel?: string | null;
  shipPrimaryNote?: string | null;
  shipStatusLabel?: string | null;
  snapshotIdentityLabel?: string | null;
  summaryGeneratedLabel?: string | null;
};

export type UnshieldWorkspaceCardProps = {
  approvePreparedUnshieldTransition: () => void | Promise<void>;
  authorizePendingOperatorRelease: () => void | Promise<void>;
  availableLaneOptions: readonly LaneOption[];
  completionEvidenceLabel: string;
  copyReleasePackageExport: (kind: "summary" | "json") => void | Promise<void>;
  copyUnshieldReceipt: () => void | Promise<void>;
  currentUnshieldTransactionEvidence: UnshieldTransactionEvidence;
  currentUnshieldZkDiagnostics: LiveUnshieldDiagnosticsSummary | null;
  downloadReleasePackageExport: (kind: "summary" | "json") => void;
  exitConsequenceDestination: string;
  exitConsequenceDisplay: string;
  finalizationProgressLabel: string | null;
  finalizePendingSplitState: () => void | Promise<void>;
  finalizePendingUnshieldState: () => void | Promise<void>;
  flowError: string | null;
  handleSelectUnshieldNote: (noteId: string | null) => void;
  handleUnshield: () => void | Promise<void>;
  isBetaMode: boolean;
  isReady: boolean;
  lastCompletion: UnshieldCompletion | null;
  lastSpentMarkerSignature: string | null;
  lastTransitionSignature: string | null;
  notePickerOptions: NotePickerOption[];
  noteSelectionLabel: string;
  onMaxRequestedAmount: () => void;
  onRequestedAmountChange: (value: string) => void;
  onSelectLane: (lane: UnshieldLane) => void;
  onSetUnshieldReceiptModalOpen: (open: boolean) => void;
  operatorReleaseDisabledReason: string | null;
  operatorReleaseSignature: string | null;
  pendingFinalizationApproval: PreparedWalletApproval | null;
  pendingSplitFinalizationApproval: PreparedWalletApproval | null;
  pendingTransitionApproval: PreparedWalletApproval | null;
  pendingUmbraApprovalDisplay: UmbraOperationApprovalDisplay | null;
  privateCoreReleaseCandidateState: PrivateCoreReleaseLabelState | null;
  privateCoreReleaseHandoffState: PrivateCoreReleaseLabelState | null;
  privateCoreReleasePackageState: PrivateCoreReleaseLabelState | null;
  privateCoreReleaseWorkflowState: PrivateCoreReleaseLabelState | null;
  refreshPrivateCoreOperatorSummary: () => unknown;
  referenceNoteLabel: string;
  releaseHandoffRefreshPending: boolean;
  releasePackageExportStatus:
    | "idle"
    | "summary-copy"
    | "json-copy"
    | "summary-download"
    | "json-download"
    | "failed";
  requestedAmountInput: string;
  requiresExactSplit: boolean;
  selectedDisplayAmount: number;
  selectedFullAmount: number;
  selectedLane: UnshieldLane;
  selectedLaneDecimals: number;
  selectedSolNote: VantaShieldedSolNote | null;
  selectedSolPendingAmount: number;
  selectedUnshieldNoteId: string | null;
  setReleaseHandoffRefreshPending: (value: boolean) => void;
  splitSpentMarkerTransaction: SafeSendTransactionPreview;
  spentMarkerTransaction: SafeSendTransactionPreview;
  status: UnshieldWorkspaceStatus;
  transitionProgressLabel: string | null;
  transitionTransaction: SafeSendTransactionPreview;
  unshieldBridgeError: string | null;
  unshieldPrimaryActionLabel: string;
  unshieldReceiptCopyStatus: "idle" | "copied" | "failed";
  unshieldReceiptModalDetails: UnshieldReceiptModalDetails | null;
  unshieldReceiptModalOpen: boolean;
  validationMessage: string;
  walletAddress: string | null;
  walletAddressShort: string | null;
};

export function UnshieldWorkspaceCard(props: UnshieldWorkspaceCardProps) {
  const {
    approvePreparedUnshieldTransition,
    authorizePendingOperatorRelease,
    availableLaneOptions,
    completionEvidenceLabel,
    copyReleasePackageExport,
    copyUnshieldReceipt,
    currentUnshieldTransactionEvidence,
    currentUnshieldZkDiagnostics,
    downloadReleasePackageExport,
    exitConsequenceDestination,
    exitConsequenceDisplay,
    finalizationProgressLabel,
    finalizePendingSplitState,
    finalizePendingUnshieldState,
    flowError,
    handleSelectUnshieldNote,
    handleUnshield,
    isBetaMode,
    isReady,
    lastCompletion,
    lastSpentMarkerSignature,
    lastTransitionSignature,
    notePickerOptions,
    noteSelectionLabel,
    onMaxRequestedAmount,
    onRequestedAmountChange,
    onSelectLane,
    onSetUnshieldReceiptModalOpen,
    operatorReleaseDisabledReason,
    operatorReleaseSignature,
    pendingFinalizationApproval,
    pendingSplitFinalizationApproval,
    pendingTransitionApproval,
    pendingUmbraApprovalDisplay,
    privateCoreReleaseCandidateState,
    privateCoreReleaseHandoffState,
    privateCoreReleasePackageState,
    privateCoreReleaseWorkflowState,
    referenceNoteLabel,
    refreshPrivateCoreOperatorSummary,
    releaseHandoffRefreshPending,
    releasePackageExportStatus,
    requestedAmountInput,
    requiresExactSplit,
    selectedDisplayAmount,
    selectedFullAmount,
    selectedLane,
    selectedLaneDecimals,
    selectedSolNote,
    selectedSolPendingAmount,
    selectedUnshieldNoteId,
    setReleaseHandoffRefreshPending,
    splitSpentMarkerTransaction,
    spentMarkerTransaction,
    status,
    transitionProgressLabel,
    transitionTransaction,
    unshieldBridgeError,
    unshieldPrimaryActionLabel,
    unshieldReceiptCopyStatus,
    unshieldReceiptModalDetails,
    unshieldReceiptModalOpen,
    validationMessage,
    walletAddress,
    walletAddressShort,
  } = props;

  return (
    <article className="send-card send-card--workspace">
      <div className="shield-card__header unshield-ticket__header">
        <div>
          <span>Unshield</span>
          <h3>Send {selectedLane} to your wallet</h3>
        </div>
        <small>
          {`${formatUnshieldAmount(selectedFullAmount, selectedLane)} selected note`}
        </small>
      </div>

      <section
        className="unshield-exit-preview"
        aria-describedby="unshield-exit-preview-copy"
        aria-labelledby="unshield-exit-preview-title"
      >
        <div className="unshield-exit-preview__copy">
          <span id="unshield-exit-preview-title">You'll receive</span>
          <strong>{exitConsequenceDisplay}</strong>
          <small id="unshield-exit-preview-copy">
            {walletAddressShort
              ? `after public exit to ${exitConsequenceDestination}`
              : "connect wallet for destination"}
          </small>
        </div>
        <div
          className="unshield-exit-recipe"
          role="img"
          aria-label="Selected shielded amount exits to your connected public wallet"
        >
          <span
            className="unshield-exit-recipe__node unshield-exit-recipe__node--shielded"
            aria-hidden="true"
          >
            Shielded note
          </span>
          <span className="unshield-exit-recipe__path" aria-hidden="true">
            <span />
          </span>
          <span
            className="unshield-exit-recipe__node unshield-exit-recipe__node--wallet"
            aria-hidden="true"
          >
            Own wallet
          </span>
        </div>
      </section>

      <div className="shield-form swap-widget unshield-ticket">
        <div className="swap-module unshield-ticket__module">
          <div className="swap-module__field unshield-ticket__field unshield-ticket__field--from">
            <div className="swap-module__label-row">
              <span>Shielded asset</span>
              <div
                aria-label="Ledger spendable shielded balances"
                className="send-balance-line shield-helper shield-helper--meta"
              >
                {`Spendable note: ${formatUnshieldAmount(selectedFullAmount, selectedLane)}`}
              </div>
            </div>
            <div className="send-asset-field">
              <select
                aria-label="Unshield asset"
                value={selectedLane}
                onChange={(event) => onSelectLane(event.target.value as UnshieldLane)}
              >
                {availableLaneOptions.map((option) => (
                  <option key={option.lane} value={option.lane}>
                    {formatAvailableLaneOptionLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="swap-module__field unshield-ticket__field unshield-ticket__field--to">
            <div className="swap-module__label-row">
              <span>Destination</span>
            </div>
            <div
              aria-label="Unshield destination wallet"
              className="unshield-fixed-field unshield-destination-card"
              title={walletAddress ?? undefined}
            >
              <span className="unshield-destination-card__eyebrow">Own wallet</span>
              <div className="unshield-destination-card__row">
                <strong>{walletAddressShort ?? "Connect wallet"}</strong>
                <span className="unshield-destination-card__pill">Own wallet</span>
              </div>
              <small className="unshield-destination-card-copy">
                Public exit returns to your own wallet, the connected requester/depositor wallet.
              </small>
            </div>
            <label className="unshield-destination-toggle" aria-disabled="true">
              <input type="checkbox" disabled aria-disabled="true" />
              <span className="unshield-destination-toggle__body unshield-destination-toggle-copy">
                <strong>Send to a different wallet</strong>
                <small>Coming soon - needs unshield-to-fresh-wallet support</small>
              </span>
            </label>
          </div>

          <div className="swap-module__field unshield-ticket__field unshield-ticket__field--amount">
            <div className="swap-module__label-row">
              <span>Amount</span>
            </div>
            {selectedLane === "USDC" ? (
              <div className="amount-field">
                <input
                  aria-label="Unshield amount"
                  inputMode="decimal"
                  type="text"
                  value={requestedAmountInput}
                  onChange={(event) => onRequestedAmountChange(event.target.value)}
                  placeholder="0.00"
                />
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={selectedFullAmount <= 0}
                  onClick={onMaxRequestedAmount}
                >
                  Max
                </button>
              </div>
            ) : (
              <div className="unshield-fixed-field unshield-fixed-field--amount">
                <strong>{formatEditableAmount(selectedDisplayAmount, selectedLaneDecimals)}</strong>
                <small>
                  {selectedLane === "SOL" && !selectedSolNote && selectedSolPendingAmount > 0
                    ? "Local SOL evidence pending ledger sync"
                    : `${selectedLane} fixed note exit`}
                </small>
              </div>
            )}
          </div>



          <p className="shield-helper unshield-validation">{validationMessage}</p>
          <div className="unshield-ticket__action unshield-ticket__action--primary">
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void handleUnshield();
              }}
              disabled={
                isBetaMode ||
                !isReady ||
                status === "splitting_note" ||
                status === "recording_transition" ||
                status === "finalizing_split" ||
                status === "transition_ready" ||
                status === "operator_ready" ||
                status === "authorizing_operator" ||
                status === "release_ready" ||
                status === "finalizing_state"
              }
            >
              {unshieldPrimaryActionLabel}
            </button>
          </div>
        </div>
      </div>

          <details className="unshield-truth-drawer">
            <summary>Privacy summary</summary>
            <PrivacySummary
              items={UNSHIELD_PRIVACY_SUMMARY_ITEMS}
              note="Beta. Operator can see funds until program-owned release ships."
            />
          </details>

          <UnshieldAdvancedPanel
            notePickerOptions={notePickerOptions}
            noteSelectionLabel={noteSelectionLabel}
            onSelectNote={handleSelectUnshieldNote}
            referenceNoteLabel={referenceNoteLabel}
            selectedNoteId={selectedUnshieldNoteId}
          />

      {status === "awaiting_confirmation" && (
        <TransactionStatusToast
          tone="pending"
          phase="pending"
          title="Preparing wallet approval"
          message={
            requiresExactSplit
              ? "Approve the private split so Vanta can isolate the exact USDC amount first."
              : "Vanta is preparing and simulating the constrained unshield transition."
          }
          progress
          floating
        >
          {pendingUmbraApprovalDisplay && (
            <WalletApprovalSheet
              heading="Private rail approval"
              walletPrompt={pendingUmbraApprovalDisplay.walletPrompt}
              signingMode={pendingUmbraApprovalDisplay.signingMode}
              rows={pendingUmbraApprovalDisplay.rows}
              maxRows={4}
              note="Approve only if the wallet shows the same asset, amount, cluster, and destination."
              truthBoundary="Local review. Does not prove production privacy or mainnet readiness."
            />
          )}
        </TransactionStatusToast>
      )}

      {status === "transition_ready" && (
        <div className="status-panel">
          <span>Ready for transition approval</span>
          <p>Approve the prepared Unshield transition in your wallet to continue.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void approvePreparedUnshieldTransition();
            }}
            disabled={
              !pendingTransitionApproval ||
              transitionTransaction.status === "loading" ||
              Boolean(transitionTransaction.signature)
            }
          >
            Approve transition in wallet
          </button>
        </div>
      )}

      {status === "splitting_note" && (
        <TransactionStatusToast
          tone="processing"
          phase="confirmed"
          title="Preparing exact amount"
          message="Preparing the exact amount to move out."
          progress
          floating
        />
      )}

      {status === "recording_transition" && (
        <TransactionStatusToast
          tone="processing"
          phase="confirmed"
          title="Recording unshield transition"
          message="Moving the selected shielded funds toward public release."
          progress
          floating
        >
          {transitionProgressLabel && (
            <p className="shield-helper shield-helper--meta">{transitionProgressLabel}</p>
          )}
        </TransactionStatusToast>
      )}

      {status === "finalizing_split" && (
        <TransactionStatusToast
          tone="processing"
          phase="confirmed"
          title="Finalizing split state"
          message="Recording the hidden split spent marker before the exact note is unshielded."
          progress
          floating
        />
      )}

      {status === "split_finalization_ready" && (
        <div className="status-panel">
          <span>Ready to finalize split</span>
          <p>Approve the prepared split spent marker after the first wallet request has closed.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void finalizePendingSplitState();
            }}
            disabled={
              !pendingSplitFinalizationApproval ||
              splitSpentMarkerTransaction.status === "loading" ||
              Boolean(splitSpentMarkerTransaction.signature)
            }
          >
            Finalize split in wallet
          </button>
        </div>
      )}

      {status === "operator_ready" && (
        <div className="status-panel">
          <span>Ready for operator release</span>
          <p>Release the selected note through the configured operator. This Unshield step does not open Phantom.</p>
          {operatorReleaseDisabledReason && (
            <p className="status-panel__warning">{operatorReleaseDisabledReason}</p>
          )}
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void authorizePendingOperatorRelease();
            }}
            disabled={Boolean(operatorReleaseDisabledReason)}
          >
            Release through operator
          </button>
        </div>
      )}

      {status === "authorizing_operator" && (
        <TransactionStatusToast
          tone="processing"
          phase="confirmed"
          title="Authorizing public release"
          message={`Requesting the constrained public release for this ${selectedLane} exit.`}
          progress
          floating
        />
      )}

      {status === "release_ready" && (
        <div className="status-panel">
          <span>Ready to finalize</span>
          <p>Approve one final wallet request to record the spent marker and refresh Vanta state.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void finalizePendingUnshieldState();
            }}
            disabled={
              !pendingFinalizationApproval ||
              spentMarkerTransaction.status === "loading" ||
              Boolean(spentMarkerTransaction.signature)
            }
          >
            Finalize in wallet
          </button>
        </div>
      )}

      {status === "finalizing_state" && (
        <TransactionStatusToast
          tone="processing"
          phase="confirmed"
          title="Finalizing shielded state"
          message="Recording the spent marker and refreshing Vanta state."
          progress
          floating
        >
          {finalizationProgressLabel && (
            <p className="shield-helper shield-helper--meta">{finalizationProgressLabel}</p>
          )}
        </TransactionStatusToast>
      )}

      {status === "failed" && (
        <TransactionStatusToast
          tone="error"
          phase="failed"
          title="Funds were not moved"
          message={flowError ?? "The exit did not complete. Try again."}
          floating
        />
      )}

      {status === "complete" && lastCompletion && (
        <TransactionStatusToast
	              tone="success"
	              phase="complete"
	              title={`Done — sent ${formatUnshieldAmount(lastCompletion.amount, lastCompletion.asset)} ${lastCompletion.asset} to ${walletAddressShort ?? "wallet"}`}
	              message="Beta: public operator release reported. Verify the public exit transaction before treating funds as moved."
	              floating
	            >
          <div className="preview-grid unshield-evidence-grid">
            <div className="preview-card preview-card--accent">
              <span>Transaction evidence</span>
              <strong>{completionEvidenceLabel}</strong>
              <small>public exit transition recorded</small>
            </div>
            <div className="preview-card unshield-success-signature-card">
              <span>Operator release</span>
              <strong>
                {operatorReleaseSignature
                  ? abbreviate(operatorReleaseSignature)
                  : "Operator release is still pending"}
              </strong>
              {operatorReleaseSignature && (
                <span className="unshield-success-pulse" aria-hidden="true" />
              )}
            </div>
          </div>
          <p className="shield-helper">Settlement: {currentUnshieldTransactionEvidence.settlement.status}</p>
          <p className="shield-helper">Exit visibility: public on-chain exit</p>
          <div className="status-actions unshield-success-actions">
            <Link className="button button-primary" to="/app/shield">
              Shield more
            </Link>
            <button
              className="button button-ghost"
              type="button"
              aria-label="Vanta Unshield receipt details"
              onClick={() => {
                    onSetUnshieldReceiptModalOpen(true);
              }}
            >
              View receipt details
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => {
                void copyUnshieldReceipt();
              }}
            >
              {unshieldReceiptCopyStatus === "copied"
                ? "Receipt copied"
                : unshieldReceiptCopyStatus === "failed"
                  ? "Receipt copy unavailable"
                  : "Share receipt"}
            </button>
            {operatorReleaseSignature && (
              <a
                className="button button-ghost"
                href={getSolscanTransactionUrl(operatorReleaseSignature)}
                target="_blank"
                rel="noreferrer"
              >
                View on Solscan
              </a>
            )}
          </div>
          {unshieldReceiptModalDetails && (
            <UnshieldReceiptModal
              details={unshieldReceiptModalDetails}
              open={unshieldReceiptModalOpen}
              onClose={() => onSetUnshieldReceiptModalOpen(false)}
            >
              <details className="unshield-completion-details">
                <summary>Developer details</summary>
                <div className="preview-grid">
                  <div className="preview-card preview-card--accent">
                    <span>Exact candidate</span>
                    <strong>
                      {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
                    </strong>
                  </div>
                  <div className="preview-card">
                    <span>Release workflow</span>
                    <strong>
                      {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
                    </strong>
                  </div>
                  <div className="preview-card">
                    <span>Release handoff</span>
                    <strong>
                      {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
                    </strong>
                  </div>
                  <div className="preview-card">
                    <span>Release package</span>
                    <strong>
                      {privateCoreReleasePackageState?.packageStatusLabel ??
                        privateCoreReleaseHandoffState?.packageStatusLabel ??
                        "Unavailable"}
                    </strong>
                  </div>
                </div>
                <div className="review-list">
                  <div className="review-row">
                    <span>Workflow prepare</span>
                    <strong>
                      {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Workflow check</span>
                    <strong>{privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Workflow ship</span>
                    <strong>{privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Shipping artifact</span>
                    <strong>
                      {privateCoreReleaseWorkflowState?.artifactStatusLabel ?? "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Workflow note</span>
                    <strong>{privateCoreReleaseWorkflowState?.shipPrimaryNote ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Handoff</span>
                    <strong>{privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Next handoff action</span>
                    <strong>{privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Handoff note</span>
                    <strong>{privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Package identity</span>
                    <strong>{privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Release package</span>
                    <strong>
                      {privateCoreReleasePackageState?.packageStatusLabel ??
                        privateCoreReleaseHandoffState?.packageStatusLabel ??
                        "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Package note</span>
                    <strong>
                      {privateCoreReleasePackageState?.packagePrimaryNote ??
                        privateCoreReleaseHandoffState?.packagePrimaryNote ??
                        "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Package gate</span>
                    <strong>{privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Package gate note</span>
                    <strong>{privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Artifact identity</span>
                    <strong>
                      {privateCoreReleasePackageState?.artifactIdentityLabel ??
                        privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                        "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Decision identity</span>
                    <strong>
                      {privateCoreReleasePackageState?.decisionIdentityLabel ??
                        privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                        "Unavailable"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Contract identity</span>
                    <strong>{privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Snapshot identity</span>
                    <strong>{privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Summary generated</span>
                    <strong>{privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Package lineage</span>
                    <strong>{privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}</strong>
                  </div>
                </div>
                <div className="status-actions" style={{ marginTop: 16 }}>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      setReleaseHandoffRefreshPending(true);
                      void Promise.resolve(refreshPrivateCoreOperatorSummary()).finally(() => {
                        setReleaseHandoffRefreshPending(false);
                      });
                    }}
                    disabled={releaseHandoffRefreshPending}
                  >
                    {releaseHandoffRefreshPending ? "Refreshing handoff" : "Refresh release handoff"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      void copyReleasePackageExport("summary");
                    }}
                    disabled={!privateCoreReleasePackageState}
                  >
                    {releasePackageExportStatus === "summary-copy"
                      ? "Copied operator package summary"
                      : "Copy operator package summary"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      void copyReleasePackageExport("json");
                    }}
                    disabled={!privateCoreReleasePackageState}
                  >
                    {releasePackageExportStatus === "json-copy"
                      ? "Copied operator package JSON"
                      : "Copy operator package JSON"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      downloadReleasePackageExport("summary");
                    }}
                    disabled={!privateCoreReleasePackageState}
                  >
                    {releasePackageExportStatus === "summary-download"
                      ? "Downloaded package summary"
                      : "Download package summary"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      downloadReleasePackageExport("json");
                    }}
                    disabled={!privateCoreReleasePackageState}
                  >
                    {releasePackageExportStatus === "json-download"
                      ? "Downloaded package JSON"
                      : "Download package JSON"}
                  </button>
                </div>
                {lastTransitionSignature && (
                  <p className="shield-helper shield-helper--meta">
                    Unshield transition: {abbreviate(lastTransitionSignature)}
                  </p>
                )}
                {lastSpentMarkerSignature && (
                  <p className="shield-helper shield-helper--meta">
                    Spent marker: {abbreviate(lastSpentMarkerSignature)}
                  </p>
                )}
              </details>
              <details className="preview-card" style={{ marginTop: 16 }}>
                <summary>Diagnostics</summary>
                <p className="shield-helper shield-helper--meta">
                  Internal/debug only. This shows the retained canonical consumption trace for
                  the latest live unshield bridge record.
                </p>
                {unshieldBridgeError && (
                  <p className="shield-helper shield-helper--meta" style={{ color: "#b42318" }}>
                    Canonical bridge retention issue: {unshieldBridgeError}
                  </p>
                )}
                {currentUnshieldZkDiagnostics ? (
                  <div className="review-list" style={{ marginTop: 12 }}>
                    <div className="review-row">
                      <span>Lane</span>
                      <strong>{currentUnshieldZkDiagnostics.asset}</strong>
                    </div>
                    <div className="review-row">
                      <span>Consumed note ref</span>
                      <strong>{abbreviate(currentUnshieldZkDiagnostics.consumedReferenceHash)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Canonical consumed ref</span>
                      <strong>
                        {currentUnshieldZkDiagnostics.consumedCanonicalCommitment
                          ? abbreviate(currentUnshieldZkDiagnostics.consumedCanonicalCommitment)
                          : "Not yet resolvable"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Canonical source</span>
                      <strong>{currentUnshieldZkDiagnostics.consumedCanonicalRecordSource ?? "Unresolved"}</strong>
                    </div>
                    <div className="review-row">
                      <span>Exit amount</span>
                      <strong>{currentUnshieldZkDiagnostics.amountDisplay}</strong>
                    </div>
                    <div className="review-row">
                      <span>Destination owner</span>
                      <strong>{abbreviate(currentUnshieldZkDiagnostics.destinationOwner) ?? "Unavailable"}</strong>
                    </div>
                    <div className="review-row">
                      <span>Transition signature</span>
                      <strong>{abbreviate(currentUnshieldZkDiagnostics.transitionSignature)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Operator request</span>
                      <strong>
                        {currentUnshieldZkDiagnostics.operatorRequestId
                          ? abbreviate(currentUnshieldZkDiagnostics.operatorRequestId)
                          : "Unavailable"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Operator release</span>
                      <strong>
                        {currentUnshieldZkDiagnostics.operatorReleaseSignature
                          ? abbreviate(currentUnshieldZkDiagnostics.operatorReleaseSignature)
                          : "Unavailable"}
                      </strong>
                    </div>
                    {currentUnshieldZkDiagnostics.spentMarkerSignature && (
                      <div className="review-row">
                        <span>Spent marker</span>
                        <strong>{abbreviate(currentUnshieldZkDiagnostics.spentMarkerSignature)}</strong>
                      </div>
                    )}
                    {currentUnshieldZkDiagnostics.sourceSwapNoteReferenceHash && (
                      <div className="review-row">
                        <span>Source swap ref</span>
                        <strong>{abbreviate(currentUnshieldZkDiagnostics.sourceSwapNoteReferenceHash)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="shield-helper shield-helper--meta">
                    No retained canonical unshield diagnostics are available yet for this client.
                  </p>
                )}
              </details>
            </UnshieldReceiptModal>
          )}
        </TransactionStatusToast>
      )}
    </article>
  );
}
