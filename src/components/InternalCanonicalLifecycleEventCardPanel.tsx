import { Suspense, lazy } from "react";

function abbreviate(value: string | undefined) {
  if (!value) return "Unavailable";
  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

const InternalCanonicalLifecycleEventSuccessorsPanel = lazy(() =>
  import("@/components/InternalCanonicalLifecycleEventSuccessorsPanel").then((m) => ({
    default: m.InternalCanonicalLifecycleEventSuccessorsPanel,
  })),
);

export function InternalCanonicalLifecycleEventCardPanel({ event, index }: { event: any; index: number }) {
  return (
    <div className="status-panel">
      <span>
        {index + 1}. {event.title}
      </span>
      <p>{event.summary}</p>
      <div className="review-list">
        <div className="review-row"><span>Event kind</span><strong>{event.kind}</strong></div>
        <div className="review-row"><span>Recorded</span><strong>{formatTimestamp(event.createdAt)}</strong></div>
        <div className="review-row"><span>{event.liveReferenceLabel}</span><strong>{abbreviate(event.liveReferenceValue)}</strong></div>
        <div className="review-row"><span>Asset summary</span><strong>{event.assetSummary}</strong></div>
        <div className="review-row">
          <span>Canonical predecessor</span>
          <strong>
            {event.predecessorCanonicalCommitment
              ? abbreviate(event.predecessorCanonicalCommitment)
              : event.kind === "shield"
                ? "Lifecycle origin"
                : "Not yet resolved"}
          </strong>
        </div>
        <div className="review-row"><span>Linkage quality</span><strong>{event.predecessorLinkageQuality ?? (event.kind === "shield" ? "origin" : "unresolved")}</strong></div>
        <div className="review-row">
          <span>Consumption semantics</span>
          <strong>
            {event.canonicalConsumptionId
              ? `${event.canonicalConsumptionKind ?? "consumption"} · nullifier-ready`
              : event.kind === "shield"
                ? "Creation only"
                : "Legacy or not yet attached"}
          </strong>
        </div>
        {event.canonicalConsumptionBasis && <div className="review-row"><span>Consumption basis</span><strong>{abbreviate(event.canonicalConsumptionBasis)}</strong></div>}
        {event.canonicalNullifierStub && <div className="review-row"><span>Nullifier stub</span><strong>{abbreviate(event.canonicalNullifierStub)}</strong></div>}
        <div className="review-row"><span>Predecessor source</span><strong>{event.predecessorCanonicalSource ?? "Origin or unresolved"}</strong></div>
        <div className="review-row"><span>Continuity status</span><strong>{event.continuityStatus}</strong></div>
        {event.transitionSignature && <div className="review-row"><span>Transition signature</span><strong>{abbreviate(event.transitionSignature)}</strong></div>}
        {event.spentMarkerSignature && <div className="review-row"><span>Spent marker</span><strong>{abbreviate(event.spentMarkerSignature)}</strong></div>}
        {event.operatorRequestId && <div className="review-row"><span>Operator request</span><strong>{abbreviate(event.operatorRequestId)}</strong></div>}
        {event.venueSummary && <div className="review-row"><span>Venue</span><strong>{event.venueSummary}</strong></div>}
        {event.exitSummary && <div className="review-row"><span>Exit destination</span><strong>{abbreviate(event.exitSummary)}</strong></div>}
      </div>

      {event.successors.length > 0 && (
        <Suspense fallback={<div className="status-panel" style={{ marginTop: 12 }}>Loading successor diagnostics…</div>}>
          <InternalCanonicalLifecycleEventSuccessorsPanel event={event} />
        </Suspense>
      )}
    </div>
  );
}
