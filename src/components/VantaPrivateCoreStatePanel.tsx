import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreSendState,
  VantaPrivateCoreShieldState,
  VantaPrivateCoreUnshieldState,
} from "@/data/context/PrivacyFlowContext";
import type {
  VantaPrivateCoreOperatorConsumeRecord,
  VantaPrivateCoreOperatorProofRecord,
  VantaPrivateCoreOperatorReleaseRecord,
  VantaPrivateCoreOperatorRootRecord,
  VantaPrivateCoreOperatorSendRecord,
  VantaPrivateCoreOperatorSendProofRecord,
} from "@/zk/vantaPrivateCoreOperatorClient";

type VantaPrivateCoreStatePanelProps = {
  holdState: VantaPrivateCoreHoldState | null;
  sendState?: VantaPrivateCoreSendState | null;
  operatorCurrentRoot?: string | null;
  operatorConsumeError?: string | null;
  operatorConsumes?: VantaPrivateCoreOperatorConsumeRecord[];
  operatorLatestConsume?: VantaPrivateCoreOperatorConsumeRecord | null;
  operatorLatestConsumeProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestRelease?: VantaPrivateCoreOperatorReleaseRecord | null;
  operatorLatestReleaseProof?: VantaPrivateCoreOperatorProofRecord | null;
  operatorLatestRoot?: VantaPrivateCoreOperatorRootRecord | null;
  operatorLatestSend?: VantaPrivateCoreOperatorSendRecord | null;
  operatorLatestSendLinkedProof?: VantaPrivateCoreOperatorSendProofRecord | null;
  operatorLatestSendProof?: VantaPrivateCoreOperatorSendProofRecord | null;
  operatorBoundaryPrimaryNote?: string | null;
  operatorBoundaryStatusLabel?: string | null;
  operatorProofConsumeLinkStatus?: string | null;
  operatorProofError?: string | null;
  operatorProofs?: VantaPrivateCoreOperatorProofRecord[];
  operatorProofSendLinkStatus?: string | null;
  operatorProofReleaseLinkStatus?: string | null;
  operatorReleaseError?: string | null;
  operatorReleases?: VantaPrivateCoreOperatorReleaseRecord[];
  operatorRootCurrentnessLabel?: string | null;
  operatorRootError?: string | null;
  operatorRootRegistrationStatus?: string | null;
  operatorRoots?: VantaPrivateCoreOperatorRootRecord[];
  operatorSendError?: string | null;
  operatorSends?: VantaPrivateCoreOperatorSendRecord[];
  operatorSendProofError?: string | null;
  operatorSendProofs?: VantaPrivateCoreOperatorSendProofRecord[];
  operatorSummaryUpdatedAt?: number | null;
  shieldState: VantaPrivateCoreShieldState | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
  compact?: boolean;
  title?: string;
};

function abbreviate(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatAmount(baseUnits: string) {
  const raw = baseUnits.padStart(7, "0");
  const whole = raw.slice(0, -6);
  const fraction = raw.slice(-6).replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} VUSD`;
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

function summarizeOperatorImmediateReleaseAlignment(args: {
  latestOperatorRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
}) {
  if (!args.unshieldState?.operatorReleaseRecorded) {
    return args.unshieldState?.replayRejected ? "Replay rejected before new release" : "Unavailable";
  }

  if (!args.latestOperatorRelease) {
    return "Awaiting operator release state";
  }

  if (
    args.unshieldState.operatorReleaseRequestId === args.latestOperatorRelease.requestId &&
    args.unshieldState.operatorReleaseTransitionNoteId === args.latestOperatorRelease.transitionNoteId &&
    args.unshieldState.sourceNullifier === args.latestOperatorRelease.nullifier
  ) {
    return "Immediate release matches operator state";
  }

  return "Immediate release mismatch";
}

function summarizeOperatorImmediateProofAlignment(args: {
  latestOperatorProof: VantaPrivateCoreOperatorProofRecord | null;
  unshieldState: VantaPrivateCoreUnshieldState | null;
}) {
  if (!args.unshieldState?.proofExecutionStatus) {
    return "Unavailable";
  }

  if (!args.latestOperatorProof) {
    return "Awaiting operator proof state";
  }

  if (
    (!args.unshieldState.operatorProofId ||
      args.latestOperatorProof.proofId === args.unshieldState.operatorProofId) &&
    args.latestOperatorProof.nullifier === args.unshieldState.sourceNullifier &&
    args.latestOperatorProof.root === args.unshieldState.sourceProofRoot &&
    args.latestOperatorProof.proofFieldCount === args.unshieldState.proofFieldCount &&
    args.latestOperatorProof.publicInputCount === args.unshieldState.proofPublicInputCount
  ) {
    return "Immediate proof matches operator state";
  }

  return "Immediate proof mismatch";
}

export function VantaPrivateCoreStatePanel({
  holdState,
  sendState = null,
  operatorCurrentRoot = null,
  operatorConsumeError = null,
  operatorConsumes = [],
  operatorLatestConsume = null,
  operatorLatestConsumeProof = null,
  operatorLatestProof = null,
  operatorLatestRelease = null,
  operatorLatestReleaseProof = null,
  operatorLatestRoot = null,
  operatorLatestSend = null,
  operatorLatestSendLinkedProof = null,
  operatorLatestSendProof = null,
  operatorBoundaryPrimaryNote = null,
  operatorBoundaryStatusLabel = null,
  operatorProofConsumeLinkStatus = null,
  operatorProofError = null,
  operatorProofs = [],
  operatorProofSendLinkStatus = null,
  operatorProofReleaseLinkStatus = null,
  operatorReleaseError = null,
  operatorReleases = [],
  operatorRootCurrentnessLabel = null,
  operatorRootError = null,
  operatorRootRegistrationStatus = null,
  operatorRoots = [],
  operatorSendError = null,
  operatorSends = [],
  operatorSendProofError = null,
  operatorSendProofs = [],
  operatorSummaryUpdatedAt = null,
  shieldState,
  unshieldState,
  compact = false,
  title = "Vanta Private Core private state",
}: VantaPrivateCoreStatePanelProps) {
  const latestOperatorConsume = operatorLatestConsume ?? operatorConsumes[0] ?? null;
  const latestOperatorProof = operatorLatestProof ?? operatorProofs[0] ?? null;
  const latestOperatorRelease = operatorLatestRelease ?? operatorReleases[0] ?? null;
  const latestOperatorRoot = operatorLatestRoot ?? operatorRoots[0] ?? null;
  const latestOperatorSend = operatorLatestSend ?? operatorSends[0] ?? null;
  const latestOperatorSendLinkedProof =
    operatorLatestSendLinkedProof ??
    (latestOperatorSend?.proofId
      ? operatorSendProofs.find((record) => record.proofId === latestOperatorSend.proofId) ?? null
      : null);
  const latestOperatorSendProof = operatorLatestSendProof ?? operatorSendProofs[0] ?? null;
  const immediateProofAlignmentLabel = summarizeOperatorImmediateProofAlignment({
    latestOperatorProof,
    unshieldState,
  });
  const immediateReleaseAlignmentLabel = summarizeOperatorImmediateReleaseAlignment({
    latestOperatorRelease,
    unshieldState,
  });

  return (
    <div className="note-state-panel vanta-private-core-state-panel">
      <div className="shield-card__header">
        <div>
          <span>Vanta Private Core v0.1</span>
          <h3>{title}</h3>
        </div>
        <small>
          {unshieldState?.replayRejected
            ? "Replay rejected"
            : unshieldState?.consumeSucceeded
              ? "Private note consumed"
              : holdState?.privateNoteRecovered
                ? "Private note ready"
                : shieldState
                  ? "Private note live"
                : "Awaiting shield"}
        </small>
      </div>

      <div className="preview-grid note-state-summary">
        <div className="preview-card preview-card--accent">
          <span>Private note</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Consumed"
              : shieldState
                ? "Created"
                : "Not yet"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Held privately</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Consumed"
              : holdState?.privateNoteRecovered
                ? "Recovered"
                : "Unavailable"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Witness</span>
          <strong>
            {unshieldState?.replayRejected || unshieldState?.consumeSucceeded
              ? "Used"
              : holdState?.witnessAvailable
                ? "Ready"
                : "Missing"}
          </strong>
        </div>
        <div className="preview-card">
          <span>Consume status</span>
          <strong>
            {unshieldState?.consumeSucceeded
              ? "Consumed once"
              : unshieldState?.replayRejected
                ? "Replay rejected"
                : holdState?.privateNoteRecovered
                  ? "Ready to consume"
                  : "Not yet consumed"}
          </strong>
        </div>
      </div>

      {sendState ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(sendState.recipientAmount)}</strong>
                <span>{abbreviate(sendState.recipientCommitment)}</span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip note-state-chip--spendable">
                  {sendState.recipientRecoveryStatus}
                </span>
                <span className="note-state-chip">{sendState.residualStateStatus}</span>
              </div>
            </div>
            <div className="review-grid">
              <div className="review-row">
                <span>Recipient payload</span>
                <strong>
                  {sendState.recipientPayloadCommitment
                    ? abbreviate(sendState.recipientPayloadCommitment)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Change amount</span>
                <strong>{formatAmount(sendState.changeAmount)}</strong>
              </div>
              <div className="review-row">
                <span>Resulting root</span>
                <strong>
                  {sendState.resultingRoot
                    ? abbreviate(sendState.resultingRoot)
                    : "Unavailable from operator summary"}
                </strong>
              </div>
              <div className="review-row">
                <span>Observation mode</span>
                <strong>{sendState.observationMode}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {shieldState ? (
        <div className="note-state-list">
          <div className="note-state-row">
            <div className="note-state-row__header">
              <div>
                <strong>{formatAmount(shieldState.amount)}</strong>
                <span>{abbreviate(shieldState.sourceNoteCommitment)}</span>
              </div>
              <div className="note-state-chips">
                <span className="note-state-chip note-state-chip--spendable">
                  {unshieldState?.replayRejected
                    ? "Replay blocked"
                    : unshieldState?.consumeSucceeded
                    ? "Consumed"
                    : holdState?.privateNoteRecovered
                      ? "Ready"
                      : "Holdable"}
                </span>
                <span className="note-state-chip note-state-chip--change">
                  Note v{shieldState.noteVersion}
                </span>
              </div>
            </div>

            <div className="note-state-row__meta">
              <span>{shieldState.noteType} note</span>
              <span>Source root {abbreviate(holdState?.sourceWitnessRoot ?? shieldState.sourceMerkleRoot)}</span>
              <span>Source payload {abbreviate(shieldState.sourcePayloadCommitment)}</span>
              {(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier) && (
                <span>
                  Source nullifier {abbreviate(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="shield-review-note">
          Shield from the current UI to mint one Vanta Private Core private note, recover it privately,
          and then consume it once through the replay-safe demo lane.
        </p>
      )}

      {!compact && shieldState && (
        <details className="shield-helper shield-helper--meta">
          <summary>Internal Vanta Private Core diagnostics</summary>
          <div className="review-list" style={{ marginTop: 12 }}>
            <div className="review-row">
              <span>Source note commitment</span>
              <strong>{abbreviate(shieldState.sourceNoteCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Source witness root</span>
              <strong>{abbreviate(holdState?.sourceWitnessRoot ?? shieldState.sourceMerkleRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Source payload commitment</span>
              <strong>{abbreviate(shieldState.sourcePayloadCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Witness status</span>
              <strong>{holdState?.witnessAvailable ? "Ready" : "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Observation mode</span>
              <strong>{unshieldState?.proofObservationMode ?? holdState?.proofObservationMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator summary refresh</span>
              <strong>{formatOperatorSummaryFreshness(operatorSummaryUpdatedAt)}</strong>
            </div>
            <div className="review-row">
              <span>Operator boundary status</span>
              <strong>{operatorBoundaryStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator boundary note</span>
              <strong>{operatorBoundaryPrimaryNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Circuit readiness</span>
              <strong>{unshieldState?.circuitReadinessLabel ?? holdState?.circuitReadinessLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof blockers</span>
              <strong>{String(unshieldState?.proofBlockerCount ?? holdState?.proofBlockerCount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Primary blocker</span>
              <strong>{unshieldState?.primaryProofBlocker ?? holdState?.primaryProofBlocker ?? "None"}</strong>
            </div>
            <div className="review-row">
              <span>Compatibility notes</span>
              <strong>{String(unshieldState?.compatibilityNoteCount ?? holdState?.compatibilityNoteCount ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Primary assumption</span>
              <strong>{unshieldState?.primaryCompatibilityNote ?? holdState?.primaryCompatibilityNote ?? "None"}</strong>
            </div>
            <div className="review-row">
              <span>Proof boundary kind</span>
              <strong>{unshieldState?.proofBoundaryKind ?? holdState?.proofBoundaryKind ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof boundary version</span>
              <strong>{String(unshieldState?.proofBoundaryVersion ?? holdState?.proofBoundaryVersion ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Proof circuit</span>
              <strong>{unshieldState?.proofCircuit ?? holdState?.proofCircuit ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof backend</span>
              <strong>{unshieldState?.proofBackend ?? holdState?.proofBackend ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof execution mode</span>
              <strong>{unshieldState?.proofExecutionMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof execution status</span>
              <strong>{unshieldState?.proofExecutionStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proof shape</span>
              <strong>
                {unshieldState?.proofFieldCount && unshieldState?.proofPublicInputCount
                  ? `${unshieldState.proofFieldCount} fields · ${unshieldState.proofPublicInputCount} public inputs`
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator consume records</span>
              <strong>
                {operatorConsumeError
                  ? "Unavailable"
                  : operatorConsumes.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator nullifier</span>
              <strong>
                {operatorConsumeError
                  ? operatorConsumeError
                  : latestOperatorConsume?.nullifier
                    ? abbreviate(latestOperatorConsume.nullifier)
                      : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest consume proof</span>
              <strong>
                {operatorConsumeError
                  ? operatorConsumeError
                  : latestOperatorConsume?.proofId
                    ? abbreviate(latestOperatorConsume.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked consume proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestConsumeProof?.proofId
                    ? abbreviate(operatorLatestConsumeProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator proof records</span>
              <strong>
                {operatorProofError
                  ? "Unavailable"
                  : operatorProofs.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestProof?.proofId
                    ? abbreviate(operatorLatestProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate proof id</span>
              <strong>
                {unshieldState?.operatorProofId
                  ? abbreviate(unshieldState.operatorProofId)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest proof action</span>
              <strong>{operatorProofError ? operatorProofError : operatorLatestProof?.action ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator send proof records</span>
              <strong>
                {operatorSendProofError
                  ? "Unavailable"
                  : operatorSendProofs.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator send records</span>
              <strong>
                {operatorSendError
                  ? "Unavailable"
                  : operatorSends.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.sendId
                    ? abbreviate(latestOperatorSend.sendId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send proof link</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.proofId
                    ? abbreviate(latestOperatorSend.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked send proof</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendLinkedProof?.proofId
                    ? abbreviate(latestOperatorSendLinkedProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send amount</span>
              <strong>
                {operatorSendError
                  ? operatorSendError
                  : latestOperatorSend?.sendAmount
                    ? `${latestOperatorSend.sendAmount} / ${latestOperatorSend.changeAmount}`
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator send proof</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.proofId
                    ? abbreviate(latestOperatorSendProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest send proof action</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.action ?? "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Proof/send link</span>
              <strong>{operatorProofSendLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Latest send proof root</span>
              <strong>
                {operatorSendProofError
                  ? operatorSendProofError
                  : latestOperatorSendProof?.root
                    ? abbreviate(latestOperatorSendProof.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest proof root</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestProof?.root
                    ? abbreviate(operatorLatestProof.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate proof alignment</span>
              <strong>{immediateProofAlignmentLabel}</strong>
            </div>
            <div className="review-row">
              <span>Proof/consume link</span>
              <strong>{operatorProofConsumeLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator release records</span>
              <strong>
                {operatorReleaseError
                  ? "Unavailable"
                  : operatorReleases.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator release</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.nullifier
                    ? abbreviate(latestOperatorRelease.nullifier)
                  : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator release recorded</span>
              <strong>
                {unshieldState?.operatorReleaseRecorded === true
                  ? "Recorded during consume"
                  : unshieldState?.operatorReleaseRecorded === false
                    ? "Not recorded"
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest release proof</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.proofId
                    ? abbreviate(latestOperatorRelease.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Linked release proof</span>
              <strong>
                {operatorProofError
                  ? operatorProofError
                  : operatorLatestReleaseProof?.proofId
                    ? abbreviate(operatorLatestReleaseProof.proofId)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Immediate release request</span>
              <strong>{abbreviate(unshieldState?.operatorReleaseRequestId)}</strong>
            </div>
            <div className="review-row">
              <span>Immediate transition note</span>
              <strong>{abbreviate(unshieldState?.operatorReleaseTransitionNoteId)}</strong>
            </div>
            <div className="review-row">
              <span>Immediate release alignment</span>
              <strong>{immediateReleaseAlignmentLabel}</strong>
            </div>
            <div className="review-row">
              <span>Proof/release link</span>
              <strong>{operatorProofReleaseLinkStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator release destination</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.releaseDestination
                    ? abbreviate(latestOperatorRelease.releaseDestination)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator released value</span>
              <strong>
                {operatorReleaseError
                  ? operatorReleaseError
                  : latestOperatorRelease?.releasedAmount && latestOperatorRelease?.releasedAssetId
                    ? `${latestOperatorRelease.releasedAmount} / ${abbreviate(latestOperatorRelease.releasedAssetId)}`
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator root registration</span>
              <strong>{operatorRootRegistrationStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator root currentness</span>
              <strong>{operatorRootCurrentnessLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Operator root records</span>
              <strong>
                {operatorRootError
                  ? "Unavailable"
                  : operatorRoots.length.toString()}
              </strong>
            </div>
            <div className="review-row">
              <span>Latest operator root</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : latestOperatorRoot?.root
                    ? abbreviate(latestOperatorRoot.root)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator current root</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : operatorCurrentRoot
                    ? abbreviate(operatorCurrentRoot)
                    : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Operator artifact bundle</span>
              <strong>
                {operatorRootError
                  ? operatorRootError
                  : latestOperatorRoot?.artifactBundleStatus === "complete"
                    ? `Complete v${String(latestOperatorRoot.artifactBundleVersion ?? 1)}`
                    : latestOperatorRoot?.artifactBundleStatus === "legacy-incomplete"
                      ? "Legacy incomplete"
                      : "Unavailable"}
              </strong>
            </div>
            <div className="review-row">
              <span>Merkle depth</span>
              <strong>{String(unshieldState?.proofMerkleDepth ?? holdState?.proofMerkleDepth ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Owner auth mode</span>
              <strong>{unshieldState?.ownerAuthorizationMode ?? holdState?.ownerAuthorizationMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Nullifier key mode</span>
              <strong>{unshieldState?.nullifierKeyMode ?? holdState?.nullifierKeyMode ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Release destination</span>
              <strong>{abbreviate(unshieldState?.proofReleaseDestination ?? holdState?.proofReleaseDestination)}</strong>
            </div>
            <div className="review-row">
              <span>Public asset</span>
              <strong>{abbreviate(unshieldState?.proofAssetId ?? holdState?.proofAssetId)}</strong>
            </div>
            <div className="review-row">
              <span>Public amount</span>
              <strong>{unshieldState?.proofAmount ?? holdState?.proofAmount ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Public note version</span>
              <strong>{String(unshieldState?.proofNoteVersion ?? holdState?.proofNoteVersion ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Witness note type</span>
              <strong>{unshieldState?.proofNoteType ?? holdState?.proofNoteType ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Witness leaf index</span>
              <strong>{String(unshieldState?.proofLeafIndex ?? holdState?.proofLeafIndex ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Witness path depth</span>
              <strong>{String(unshieldState?.proofPathDepth ?? holdState?.proofPathDepth ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof statement</span>
              <strong>{unshieldState?.sourceProofStatement ?? holdState?.sourceProofPreviewStatement ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof verifier</span>
              <strong>{unshieldState?.sourceProofVerifier ?? holdState?.sourceProofPreviewVerifier ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof commitment</span>
              <strong>{abbreviate(unshieldState?.sourceProofCommitment ?? holdState?.sourceProofPreviewCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof root</span>
              <strong>{abbreviate(unshieldState?.sourceProofRoot ?? holdState?.sourceProofPreviewRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof asset</span>
              <strong>{abbreviate(unshieldState?.sourceProofAssetId ?? holdState?.sourceProofPreviewAssetId)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof amount</span>
              <strong>{unshieldState?.sourceProofAmount ?? holdState?.sourceProofPreviewAmount ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof leaf index</span>
              <strong>{String(unshieldState?.sourceProofLeafIndex ?? holdState?.sourceProofPreviewLeafIndex ?? 0)}</strong>
            </div>
            <div className="review-row">
              <span>Source proof status</span>
              <strong>{unshieldState?.sourceProofStatusLabel ?? holdState?.sourceProofPreviewStatusLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof consistency</span>
              <strong>{unshieldState?.sourceProofConsistencyLabel ?? holdState?.sourceProofPreviewConsistencyLabel ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof commitment binding</span>
              <strong>{unshieldState?.sourceProofCommitmentStatus ?? holdState?.sourceProofPreviewCommitmentStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof root binding</span>
              <strong>{unshieldState?.sourceProofRootStatus ?? holdState?.sourceProofPreviewRootStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source proof nullifier binding</span>
              <strong>{unshieldState?.sourceProofNullifierStatus ?? holdState?.sourceProofPreviewNullifierStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source layer status</span>
              <strong>{unshieldState?.sourceLayerStatus ?? holdState?.previewSourceLayerStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Proving boundary status</span>
              <strong>{unshieldState?.provingBoundaryStatus ?? holdState?.previewProvingBoundaryStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Handoff status</span>
              <strong>{unshieldState?.handoffStatus ?? holdState?.previewHandoffStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Primary handoff note</span>
              <strong>{unshieldState?.primaryHandoffNote ?? holdState?.previewPrimaryHandoffNote ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving lane" : "Proving preview lane"}</span>
              <strong>{unshieldState?.provingHashLane ?? holdState?.provingPreviewHashLane ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving note commitment" : "Proving preview commitment"}</span>
              <strong>{abbreviate(unshieldState?.provingNoteCommitment ?? holdState?.provingPreviewNoteCommitment)}</strong>
            </div>
            <div className="review-row">
              <span>Commitment comparison</span>
              <strong>{unshieldState?.noteCommitmentComparisonStatus ?? holdState?.noteCommitmentComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving leaf" : "Proving preview leaf"}</span>
              <strong>{abbreviate(unshieldState?.provingMerkleLeaf ?? holdState?.provingPreviewMerkleLeaf)}</strong>
            </div>
            <div className="review-row">
              <span>Leaf comparison</span>
              <strong>{unshieldState?.merkleLeafComparisonStatus ?? holdState?.merkleLeafComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving root" : "Proving preview root"}</span>
              <strong>{abbreviate(unshieldState?.provingStateRoot ?? holdState?.provingPreviewStateRoot)}</strong>
            </div>
            <div className="review-row">
              <span>Root comparison</span>
              <strong>{unshieldState?.stateRootComparisonStatus ?? holdState?.stateRootComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving nullifier" : "Proving preview nullifier"}</span>
              <strong>{abbreviate(unshieldState?.provingNullifier ?? holdState?.provingPreviewNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>Nullifier comparison</span>
              <strong>{unshieldState?.nullifierComparisonStatus ?? holdState?.nullifierComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Consume context" : "Proving preview context"}</span>
              <strong>{abbreviate(unshieldState?.provingConsumeContextTag ?? holdState?.provingPreviewConsumeContextTag)}</strong>
            </div>
            <div className="review-row">
              <span>Consume context comparison</span>
              <strong>{unshieldState?.consumeContextComparisonStatus ?? holdState?.consumeContextComparisonStatus ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Source nullifier</span>
              <strong>{abbreviate(unshieldState?.sourceNullifier ?? holdState?.sourceProofPreviewNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>Replay</span>
              <strong>
                {unshieldState?.replayRejected
                  ? "Rejected"
                  : holdState?.replayPreviewStatus ?? "Not yet tested"}
              </strong>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
