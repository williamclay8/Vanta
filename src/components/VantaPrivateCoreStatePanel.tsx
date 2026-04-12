import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreShieldState,
  VantaPrivateCoreUnshieldState,
} from "@/data/context/PrivacyFlowContext";

type VantaPrivateCoreStatePanelProps = {
  holdState: VantaPrivateCoreHoldState | null;
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

export function VantaPrivateCoreStatePanel({
  holdState,
  shieldState,
  unshieldState,
  compact = false,
  title = "Vanta Private Core private state",
}: VantaPrivateCoreStatePanelProps) {
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
