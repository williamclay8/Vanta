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
        <small>{shieldState ? "Private note live" : "Awaiting shield"}</small>
      </div>

      <div className="preview-grid note-state-summary">
        <div className="preview-card preview-card--accent">
          <span>Private note</span>
          <strong>{shieldState ? "Created" : "Not yet"}</strong>
        </div>
        <div className="preview-card">
          <span>Held privately</span>
          <strong>{holdState?.privateNoteRecovered ? "Recovered" : "Unavailable"}</strong>
        </div>
        <div className="preview-card">
          <span>Witness</span>
          <strong>{holdState?.witnessAvailable ? "Ready" : "Missing"}</strong>
        </div>
        <div className="preview-card">
          <span>Consume status</span>
          <strong>
            {unshieldState?.consumeSucceeded
              ? "Consumed once"
              : unshieldState?.replayRejected
                ? "Replay blocked"
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
                  {unshieldState?.consumeSucceeded ? "Consumed" : "Holdable"}
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
              {unshieldState?.sourceNullifier && <span>Source nullifier {abbreviate(unshieldState.sourceNullifier)}</span>}
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
              <span>{unshieldState ? "Proving lane" : "Proving preview lane"}</span>
              <strong>{unshieldState?.provingHashLane ?? holdState?.provingPreviewHashLane ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving root" : "Proving preview root"}</span>
              <strong>{abbreviate(unshieldState?.provingStateRoot ?? holdState?.provingPreviewStateRoot)}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Proving nullifier" : "Proving preview nullifier"}</span>
              <strong>{abbreviate(unshieldState?.provingNullifier ?? holdState?.provingPreviewNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>{unshieldState ? "Consume context" : "Proving preview context"}</span>
              <strong>{abbreviate(unshieldState?.provingConsumeContextTag ?? holdState?.provingPreviewConsumeContextTag)}</strong>
            </div>
            <div className="review-row">
              <span>Source nullifier</span>
              <strong>{abbreviate(unshieldState?.sourceNullifier)}</strong>
            </div>
            <div className="review-row">
              <span>Replay</span>
              <strong>{unshieldState?.replayRejected ? "Rejected" : "Not yet tested"}</strong>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
