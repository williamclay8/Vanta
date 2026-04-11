import {
  inspectGenericPhase1EncoderPreflightFreezeForLifecycleNode,
  inspectGenericPhase1EncoderPreflightReportForLifecycleNode,
  inspectGenericPhase1EncoderSessionTicketForLifecycleNode,
} from "@/zk/backendEncoderStub";

export function InternalCanonicalLifecycleSessionPrimerPanel({
  lookupLifecycleId,
}: {
  lookupLifecycleId: string;
}) {
  const encoderSessionTicket = inspectGenericPhase1EncoderSessionTicketForLifecycleNode(
    lookupLifecycleId,
  );
  const encoderPreflight = inspectGenericPhase1EncoderPreflightReportForLifecycleNode(
    lookupLifecycleId,
  );
  const encoderPreflightFreeze = inspectGenericPhase1EncoderPreflightFreezeForLifecycleNode(
    lookupLifecycleId,
  );

  return (
    <>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Ticket kind</span>
              <strong>{`${encoderSessionTicket.ticketKind} · v${encoderSessionTicket.ticketVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Ticket status</span>
              <strong>{encoderSessionTicket.status}</strong>
            </div>
            <div className="review-row">
              <span>Readiness source</span>
              <strong>{encoderSessionTicket.readinessStatus}</strong>
            </div>
            <div className="review-row">
              <span>Accepted dispatches</span>
              <strong>{encoderSessionTicket.acceptedDispatchCount}</strong>
            </div>
            <div className="review-row">
              <span>Ticket summary</span>
              <strong>{encoderSessionTicket.summary}</strong>
            </div>
            <div className="review-row">
              <span>Ticket reason</span>
              <strong>{encoderSessionTicket.reason ?? "session intent issued for later encoder work"}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Preflight kind</span>
              <strong>{`${encoderPreflight.reportKind} · v${encoderPreflight.reportVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Preflight status</span>
              <strong>{encoderPreflight.status}</strong>
            </div>
            <div className="review-row">
              <span>Would proceed</span>
              <strong>{encoderPreflight.wouldProceed ? "yes" : "no"}</strong>
            </div>
            <div className="review-row">
              <span>Dispatch footprint</span>
              <strong>{encoderPreflight.dispatchFootprintSummary}</strong>
            </div>
            <div className="review-row">
              <span>Blocked reasons</span>
              <strong>{encoderPreflight.blockedReasons.join(" · ") || "None"}</strong>
            </div>
            <div className="review-row">
              <span>Preflight summary</span>
              <strong>{encoderPreflight.summary}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Snapshot kind</span>
              <strong>{`${encoderPreflightFreeze.snapshotKind} · v${encoderPreflightFreeze.snapshotVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Frozen status</span>
              <strong>{encoderPreflightFreeze.status}</strong>
            </div>
            <div className="review-row">
              <span>Snapshot summary</span>
              <strong>{encoderPreflightFreeze.summary}</strong>
            </div>
            <div className="review-row">
              <span>Serialized preview</span>
              <strong>
                {encoderPreflightFreeze.serialized.length > 96
                  ? `${encoderPreflightFreeze.serialized.slice(0, 96)}...`
                  : encoderPreflightFreeze.serialized}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
