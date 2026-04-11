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

export function InternalCanonicalLifecycleGroupedEventsPanel({
  lineage,
  jumpTarget,
}: {
  lineage: any;
  jumpTarget: { lineageKey: string; eventId?: string } | null;
}) {
  return (
    <>
      <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
        Grouped lifecycle events
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {lineage.events.map((event: any) => (
          <div
            key={event.id}
            className="preview-card"
            style={
              jumpTarget?.lineageKey === lineage.key && jumpTarget?.eventId === event.id
                ? {
                    outline: "2px solid rgba(255,255,255,0.14)",
                    outlineOffset: 2,
                  }
                : undefined
            }
          >
            <div className="review-row">
              <span>{event.title}</span>
              <strong>{formatTimestamp(event.createdAt)}</strong>
            </div>
            <div className="review-row">
              <span>Continuity</span>
              <strong>{event.continuityStatus}</strong>
            </div>
            <div className="review-row">
              <span>Linkage quality</span>
              <strong>{event.predecessorLinkageQuality ?? (event.kind === "shield" ? "origin" : "unresolved")}</strong>
            </div>
            <div className="review-row">
              <span>Consumption</span>
              <strong>
                {event.canonicalConsumptionId
                  ? `${event.canonicalConsumptionKind ?? "consumption"} · ${abbreviate(event.canonicalConsumptionBasis)}`
                  : event.kind === "shield"
                    ? "Creation only"
                    : "Legacy or not yet attached"}
              </strong>
            </div>
            <div className="review-row">
              <span>Predecessor</span>
              <strong>
                {event.predecessorCanonicalCommitment
                  ? abbreviate(event.predecessorCanonicalCommitment)
                  : event.predecessorLiveNoteId
                    ? `${abbreviate(event.predecessorLiveNoteId)} (live)`
                    : "Origin or unresolved"}
              </strong>
            </div>
            <div className="review-row">
              <span>Successors</span>
              <strong>
                {event.successors.length > 0
                  ? event.successors.map((successor: any) => successor.label).join(", ")
                  : "Lifecycle endpoint"}
              </strong>
            </div>
            <div className="review-row">
              <span>Asset summary</span>
              <strong>{event.assetSummary}</strong>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
