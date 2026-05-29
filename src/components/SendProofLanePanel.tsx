import { Link } from "react-router-dom";
import type { SendReceiptModalDetails } from "@/components/SendReceiptModal";
import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreReleaseCandidateState,
  VantaPrivateCoreReleaseHandoffState,
  VantaPrivateCoreReleasePackageState,
  VantaPrivateCoreReleaseWorkflowState,
  VantaPrivateCoreSendState,
} from "@/data/context/PrivacyFlowContext";
import type {
  VantaPrivateCoreOperatorRootRecord,
  VantaPrivateCoreOperatorSendProofRecord,
  VantaPrivateCoreOperatorSendRecord,
} from "@/zk/vantaPrivateCoreOperatorClient";
import type { SendTransitionV0, Bytes32Hex } from "@/zk/vantaPrivateCore";
import { buildVantaPrivateCoreSendProofBoundary } from "@/zk/vantaPrivateCoreSendProof";
import {
  abbreviate,
  DEFAULT_USDC_DECIMALS,
  formatBaseUnits,
  formatOperatorSummaryFreshness,
} from "@/components/send/sendPanelUtils";

export type PrivateCoreSendPreview = {
  boundary: ReturnType<typeof buildVantaPrivateCoreSendProofBoundary>;
  changeAmountBaseUnits: string;
  recipientPublicKey: Bytes32Hex;
  sendAmountBaseUnits: string;
  sourceConsistencyLabel: string;
  sourceVerificationLabel: string;
  transition: SendTransitionV0;
};

export type PrivateCoreSendExecutionState = {
  errorMessage: string | null;
  latestProofAction: string | null;
  latestProofId: string | null;
  latestSendId: string | null;
  proofFieldCount: number | null;
  proofPublicInputCount: number | null;
  status: "idle" | "running" | "verified" | "failed";
};

type SendLedgerGateStatus = {
  basis: string;
  statusLabel: string;
};

type ReleasePackageExportStatus =
  | "idle"
  | "summary-copy"
  | "json-copy"
  | "summary-download"
  | "json-download"
  | "failed";

export type SendProofLanePanelProps = {
  copyReleasePackageExport: (kind: "summary" | "json") => void | Promise<void>;
  downloadReleasePackageExport: (kind: "summary" | "json") => void;
  handlePrivateCoreSendProof: () => void | Promise<void>;
  isBetaMode: boolean;
  isPrivateCoreUsdcSendReady: boolean;
  privateCoreHoldState: VantaPrivateCoreHoldState | null;
  privateCoreOperatorBoundaryPrimaryNote: string | null | undefined;
  privateCoreOperatorBoundaryStatusLabel: string | null | undefined;
  privateCoreOperatorCurrentRootProofLinkStatus: string | null | undefined;
  privateCoreOperatorLatestSend: VantaPrivateCoreOperatorSendRecord | null | undefined;
  privateCoreOperatorLatestSendLinkedProof: VantaPrivateCoreOperatorSendProofRecord | null | undefined;
  privateCoreOperatorLatestSendProof: VantaPrivateCoreOperatorSendProofRecord | null | undefined;
  privateCoreOperatorProofSendLinkStatus: string | null | undefined;
  privateCoreOperatorSendBoundaryPrimaryNote: string | null | undefined;
  privateCoreOperatorSendBoundaryStatusLabel: string | null | undefined;
  privateCoreOperatorSendContinuityPrimaryNote: string | null | undefined;
  privateCoreOperatorSendContinuityStatusLabel: string | null | undefined;
  privateCoreOperatorSendResultingRootPrimaryNote: string | null | undefined;
  privateCoreOperatorSendResultingRootProofLinkStatus: string | null | undefined;
  privateCoreOperatorSendResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null | undefined;
  privateCoreOperatorSendResultingRootStatusLabel: string | null | undefined;
  privateCoreOperatorSummaryUpdatedAt: number | null;
  privateCoreReleaseCandidateState: VantaPrivateCoreReleaseCandidateState | null | undefined;
  privateCoreReleaseHandoffState: VantaPrivateCoreReleaseHandoffState | null | undefined;
  privateCoreReleasePackageState: VantaPrivateCoreReleasePackageState | null | undefined;
  privateCoreReleaseWorkflowState: VantaPrivateCoreReleaseWorkflowState | null | undefined;
  privateCoreSendExecution: PrivateCoreSendExecutionState;
  privateCoreSendPreview: PrivateCoreSendPreview | null;
  privateCoreSendState: VantaPrivateCoreSendState | null | undefined;
  refreshPrivateCoreOperatorSummary: () => unknown;
  releaseHandoffRefreshPending: boolean;
  releasePackageExportStatus: ReleasePackageExportStatus;
  selectedCanonicalSendLedgerNote: { noteId: string } | null | undefined;
  sendLedgerGateStatus: SendLedgerGateStatus;
  sendReceiptModalDetails: SendReceiptModalDetails | null;
  setFlowError: (value: string | null) => void;
  setPrivateCoreSendExecution: (
    value:
      | PrivateCoreSendExecutionState
      | ((previous: PrivateCoreSendExecutionState) => PrivateCoreSendExecutionState),
  ) => void;
  setReleaseHandoffRefreshPending: (value: boolean) => void;
  setSendReceiptModalOpen: (value: boolean) => void;
  setStatus: (
    value: "idle" | "review" | "awaiting_confirmation" | "sending" | "settling" | "complete" | "failed",
  ) => void;
};

export function SendProofLanePanel({
  copyReleasePackageExport,
  downloadReleasePackageExport,
  handlePrivateCoreSendProof,
  isBetaMode,
  isPrivateCoreUsdcSendReady,
  privateCoreHoldState,
  privateCoreOperatorBoundaryPrimaryNote,
  privateCoreOperatorBoundaryStatusLabel,
  privateCoreOperatorCurrentRootProofLinkStatus,
  privateCoreOperatorLatestSend,
  privateCoreOperatorLatestSendLinkedProof,
  privateCoreOperatorLatestSendProof,
  privateCoreOperatorProofSendLinkStatus,
  privateCoreOperatorSendBoundaryPrimaryNote,
  privateCoreOperatorSendBoundaryStatusLabel,
  privateCoreOperatorSendContinuityPrimaryNote,
  privateCoreOperatorSendContinuityStatusLabel,
  privateCoreOperatorSendResultingRootPrimaryNote,
  privateCoreOperatorSendResultingRootProofLinkStatus,
  privateCoreOperatorSendResultingRootRecord,
  privateCoreOperatorSendResultingRootStatusLabel,
  privateCoreOperatorSummaryUpdatedAt,
  privateCoreReleaseCandidateState,
  privateCoreReleaseHandoffState,
  privateCoreReleasePackageState,
  privateCoreReleaseWorkflowState,
  privateCoreSendExecution,
  privateCoreSendPreview,
  privateCoreSendState,
  refreshPrivateCoreOperatorSummary,
  releaseHandoffRefreshPending,
  releasePackageExportStatus,
  selectedCanonicalSendLedgerNote,
  sendLedgerGateStatus,
  sendReceiptModalDetails,
  setFlowError,
  setPrivateCoreSendExecution,
  setReleaseHandoffRefreshPending,
  setSendReceiptModalOpen,
  setStatus,
}: SendProofLanePanelProps) {
  return (
          <article className="send-card" data-vanta-send-proof-panel>
          <div className="shield-card__header">
            <div>
              <span>Private-core send</span>
              <h3>Proof lane</h3>
            </div>
            <small>Ready when a private note is held</small>
          </div>

          <div className="review-list">
            <div className="review-row">
              <span>Ledger basis</span>
              <strong>{sendLedgerGateStatus.basis}</strong>
            </div>
            <div className="review-row">
              <span>Ledger note</span>
              <strong>{abbreviate(selectedCanonicalSendLedgerNote?.noteId) ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Ledger gate</span>
              <strong>{sendLedgerGateStatus.statusLabel}</strong>
            </div>
            <div className="review-row">
              <span>Held private note</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Requested send</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
                  : "Not ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Projected change</span>
              <strong>
                {privateCoreSendPreview
                  ? `${formatBaseUnits(BigInt(privateCoreSendPreview.changeAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
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
              <span>Residual private-core output</span>
              <strong>
                {privateCoreHoldState
                  ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
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
            Private send lane is in guarded beta. It uses zero-knowledge proofs and requires operator
            verification.
          </p>

          <div className="status-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void handlePrivateCoreSendProof();
              }}
              disabled={
                isBetaMode ||
                !isPrivateCoreUsdcSendReady ||
                privateCoreSendExecution.status === "running"
              }
            >
              {isBetaMode ? "Beta mode" : "Verify private-core send proof"}
            </button>
          </div>

          {privateCoreSendExecution.status === "running" && (
            <div className="status-panel status-panel--processing">
              <span>Verifying send proof</span>
              <p>Submitting witness package to the operator…</p>
              <div className="status-bar">
                <div className="status-bar__fill" />
              </div>
            </div>
          )}

          {privateCoreSendExecution.status === "failed" && (
            <div className="status-panel status-panel--failed">
              <span>Send proof failed</span>
              <p>Operator rejected the witness package.</p>
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
                The operator verified and recorded the send transition. Recipient delivery or
                recovery remains separate. The remaining balance can stay held or move to
                Unshield.
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
                  <span>Recipient output amount</span>
                  <strong>
                    {privateCoreSendPreview
                      ? `${formatBaseUnits(BigInt(privateCoreSendPreview.sendAmountBaseUnits), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual private-core output</span>
                  <strong>
                    {privateCoreHoldState
                      ? `${formatBaseUnits(privateCoreHoldState.heldNote.note.amount, DEFAULT_USDC_DECIMALS)} USDC`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Send boundary</span>
                  <strong>{privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
                  <span>Downstream continuity</span>
                  <strong>{privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
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
                Send boundary: {privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary note: {privateCoreOperatorSendBoundaryPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Downstream continuity: {privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Continuity note: {privateCoreOperatorSendContinuityPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Exact candidate:{" "}
                {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Candidate note:{" "}
                {privateCoreReleaseCandidateState?.lifecyclePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow prepare:{" "}
                {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow check: {privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow ship: {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow note: {privateCoreReleaseWorkflowState?.shipPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff: {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff note: {privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Next handoff action: {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package identity: {privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Release package:{" "}
                {privateCoreReleasePackageState?.packageStatusLabel ??
                  privateCoreReleaseHandoffState?.packageStatusLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package note:{" "}
                {privateCoreReleasePackageState?.packagePrimaryNote ??
                  privateCoreReleaseHandoffState?.packagePrimaryNote ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package gate: {privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Gate note: {privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Artifact identity:{" "}
                {privateCoreReleasePackageState?.artifactIdentityLabel ??
                  privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Decision identity:{" "}
                {privateCoreReleasePackageState?.decisionIdentityLabel ??
                  privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Contract identity: {privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Snapshot identity: {privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Summary generated: {privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package lineage: {privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}
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
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setSendReceiptModalOpen(true)}
                  disabled={!sendReceiptModalDetails}
                >
                  View send receipt
                </button>
                <Link
                  className="button button-primary"
                  to={privateCoreReleaseHandoffState?.nextActionHref ?? "/app/unshield"}
                >
                  {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unshield Residual Note"}
                </Link>
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
              <span>Latest private-core send</span>
              <p>
                The latest private-core send handoff is still available from shared state, so this
                flow can resume after refresh. Recipient delivery and recovery remain separate from
                this operator proof state; the sender residual state stays visible for the next hold
                or unshield step.
              </p>
              <div className="success-metrics">
                <div className="preview-card preview-card--accent">
                  <span>Recipient output</span>
                  <strong>
                    {privateCoreSendState.recipientAmount
                      ? `${formatBaseUnits(BigInt(privateCoreSendState.recipientAmount), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Amount hidden"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Residual note</span>
                  <strong>
                    {privateCoreSendState.changeAmount
                      ? `${formatBaseUnits(BigInt(privateCoreSendState.changeAmount), DEFAULT_USDC_DECIMALS)} USDC`
                      : "Amount hidden"}
                  </strong>
                </div>
                <div className="preview-card">
                  <span>Observation mode</span>
                  <strong>{privateCoreSendState.observationMode}</strong>
                </div>
                <div className="preview-card">
                  <span>Send boundary</span>
                  <strong>{privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
                  <span>Downstream continuity</span>
                  <strong>{privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}</strong>
                </div>
                <div className="preview-card">
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
                Send boundary: {privateCoreOperatorSendBoundaryStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send boundary note: {privateCoreOperatorSendBoundaryPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Downstream continuity: {privateCoreOperatorSendContinuityStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Continuity note: {privateCoreOperatorSendContinuityPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Exact candidate:{" "}
                {privateCoreReleaseCandidateState?.lifecycleStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Candidate note:{" "}
                {privateCoreReleaseCandidateState?.lifecyclePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow prepare:{" "}
                {privateCoreReleaseWorkflowState?.prepareStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow check: {privateCoreReleaseWorkflowState?.checkStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow ship: {privateCoreReleaseWorkflowState?.shipStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Workflow note: {privateCoreReleaseWorkflowState?.checkPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff: {privateCoreReleaseHandoffState?.handoffStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Handoff note: {privateCoreReleaseHandoffState?.handoffPrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Next handoff action: {privateCoreReleaseHandoffState?.nextActionLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package identity: {privateCoreReleasePackageState?.packageIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Release package:{" "}
                {privateCoreReleasePackageState?.packageStatusLabel ??
                  privateCoreReleaseHandoffState?.packageStatusLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package note:{" "}
                {privateCoreReleasePackageState?.packagePrimaryNote ??
                  privateCoreReleaseHandoffState?.packagePrimaryNote ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package gate: {privateCoreReleasePackageState?.gateStatusLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Gate note: {privateCoreReleasePackageState?.gatePrimaryNote ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Artifact identity:{" "}
                {privateCoreReleasePackageState?.artifactIdentityLabel ??
                  privateCoreReleaseHandoffState?.artifactIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Decision identity:{" "}
                {privateCoreReleasePackageState?.decisionIdentityLabel ??
                  privateCoreReleaseHandoffState?.decisionIdentityLabel ??
                  "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Contract identity: {privateCoreReleasePackageState?.contractIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Snapshot identity: {privateCoreReleasePackageState?.snapshotIdentityLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Summary generated: {privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Package lineage: {privateCoreReleasePackageState?.lineageSummaryLabel ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Send root record: {abbreviate(privateCoreOperatorSendResultingRootRecord?.root) ?? "Unavailable"}
              </p>
              <p className="shield-helper shield-helper--meta">
                Residual state: {privateCoreSendState.residualStateStatus}
              </p>
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
  );
}
