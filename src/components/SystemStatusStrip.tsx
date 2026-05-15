import {
  getLaneTrustStatuses,
  LANE_TRUST_STATUS_LOCKED_LABEL,
} from "@/trust/laneTrustStatus";

type SystemStatusStripProps = {
  showBetaMode: boolean;
};

const laneStatusPreviewMarkers = [
  "Shield: Action: locked. Receipt: gate check",
  "Send: Action: locked. Receipt: gate check",
  "Swap: Action: locked. Receipt: gate check",
  "Unshield: Action: locked. Receipt: gate check",
  "Strategy: Action: locked. Receipt: gate check",
  "Pay: Action: locked. Receipt: gate check",
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
          <span>Action: Test mode. Receipt: beta gates pending.</span>
        ) : (
          <span>Action: Beta status. Receipt: {lockedLaneCount} locks active.</span>
        )}
      </div>

      <details className="system-status-strip__details">
        <summary>
          <span className="system-status-strip__count">
            Action: Beta status. Receipt: {lockedLaneCount} locks active
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
