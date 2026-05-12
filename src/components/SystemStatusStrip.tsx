import {
  getLaneTrustStatuses,
  LANE_TRUST_STATUS_LOCKED_LABEL,
} from "@/trust/laneTrustStatus";

type SystemStatusStripProps = {
  showBetaMode: boolean;
};

const laneStatusPreviewMarkers = [
  "Shield: Claim locked",
  "Send: Claim locked",
  "Swap: Claim locked",
  "Unshield: Claim locked",
  "Strategy: Claim locked",
  "Pay: Claim locked",
] as const;

export function SystemStatusStrip({ showBetaMode }: SystemStatusStripProps) {
  const laneStatuses = getLaneTrustStatuses();
  const visibleSummary = laneStatuses
    .map((status) => `${status.label}: ${status.statusLabel}`)
    .join(" · ");
  const lockedLaneCount = laneStatuses.filter((status) => status.claimLocked).length;

  return (
    <section
      className="beta-mode-banner system-status-strip"
      aria-label="Vanta lane trust status"
      data-status-preview={laneStatusPreviewMarkers.join(" | ")}
      role="status"
    >
      <div className="system-status-strip__topline">
        <strong>Trust status</strong>
        {showBetaMode ? (
          <span>No funds move in test mode. Live private settlement stays blocked until evidence, approval, audit, replay, and operator-surface gates clear.</span>
        ) : (
          <span>Production privacy claims remain gated by the lane trust contracts.</span>
        )}
      </div>

      <details className="system-status-strip__details">
        <summary>
          <span className="system-status-strip__count">
            {lockedLaneCount}/{laneStatuses.length} lane claims locked
          </span>
          <span className="system-status-strip__summary">
            {visibleSummary}
          </span>
        </summary>

        <ul className="system-status-strip__lanes">
          {laneStatuses.map((status) => (
            <li key={status.id}>
              <span className="system-status-strip__lane-name">
                {status.label}: {status.statusLabel}
              </span>
              <small>{status.currentTruth}</small>
              <code>{status.verificationSurfaces[0]}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
