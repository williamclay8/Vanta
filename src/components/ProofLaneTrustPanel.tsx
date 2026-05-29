import { getLaneTrustStatuses } from "@/trust/laneTrustStatus";

const laneStatusPreviewMarkers = [
  "Shield: Claim locked",
  "Send: Claim locked",
  "Swap: Claim locked",
  "Unshield: Claim locked",
  "Strategy: Claim locked",
  "Pay: Claim locked",
] as const;

export function ProofLaneTrustPanel() {
  const laneStatuses = getLaneTrustStatuses();
  const visibleSummary = laneStatuses
    .map((status) => `${status.label}: ${status.claimLocked ? "Claim locked" : status.statusLabel}`)
    .join(" · ");
  const lockedLaneCount = laneStatuses.filter((status) => status.claimLocked).length;

  return (
    <section
      className="proof-lane-trust system-status-strip"
      aria-label="Vanta lane trust status"
      data-status-preview={laneStatusPreviewMarkers.join(" | ")}
    >
      <div className="proof-lane-trust__header">
        <span className="eyebrow">Trust status</span>
        <h3>Lane claim locks and verification surfaces</h3>
        <p>
          Beta · receipts where available · {lockedLaneCount} claim locks active. Production
          privacy claims stay locked until the matching gates pass.
        </p>
      </div>

      <p className="proof-lane-trust__summary">{visibleSummary}</p>

      <ul className="system-status-strip__lanes proof-lane-trust__lanes">
        {laneStatuses.map((status) => (
          <li key={status.id}>
            <span className="system-status-strip__lane-name">
              {status.label}: {status.claimLocked ? "Claim locked" : status.statusLabel}
            </span>
            <small>{status.currentTruth}</small>
            <code>{status.verificationSurfaces[0]}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
