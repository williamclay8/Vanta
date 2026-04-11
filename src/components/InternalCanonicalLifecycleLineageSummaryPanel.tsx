function abbreviate(value: string | undefined) {
  if (!value) return "Unavailable";
  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatBranchQuality(value: "explicit" | "heuristic" | "unresolved") {
  return value;
}

export function InternalCanonicalLifecycleLineageSummaryPanel({ lineage }: { lineage: any }) {
  return (
    <>
      <p>
        {lineage.groupingQuality === "explicit"
          ? "Grouped by explicit retained lifecycle IDs and lineage linkage."
          : lineage.groupingQuality === "mixed"
            ? "Grouped with mixed explicit lifecycle linkage and older canonical-only continuity."
            : lineage.groupingQuality === "resolved"
              ? "Grouped by shared canonical commitments."
              : lineage.groupingQuality === "heuristic"
                ? "Grouped by live-note continuity heuristics because canonical linkage is incomplete."
                : "No reliable lineage anchor is currently available for this segment."}
      </p>
      <div className="review-list">
        <div className="review-row">
          <span>Grouping quality</span>
          <strong>{lineage.groupingQuality}</strong>
        </div>
        <div className="review-row">
          <span>Events in lineage</span>
          <strong>{lineage.events.length}</strong>
        </div>
        <div className="review-row">
          <span>Explicit anchors</span>
          <strong>
            {lineage.explicitAnchors.length > 0
              ? lineage.explicitAnchors.map((anchor: string) => abbreviate(anchor)).join(", ")
              : "None"}
          </strong>
        </div>
        <div className="review-row">
          <span>Canonical anchors</span>
          <strong>
            {lineage.canonicalAnchors.length > 0
              ? lineage.canonicalAnchors.map((anchor: string) => abbreviate(anchor)).join(", ")
              : "None"}
          </strong>
        </div>
        <div className="review-row">
          <span>Heuristic anchors</span>
          <strong>
            {lineage.heuristicAnchors.length > 0
              ? lineage.heuristicAnchors.map((anchor: string) => abbreviate(anchor)).join(", ")
              : "None"}
          </strong>
        </div>
      </div>

      <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
        Lineage detail summary
      </p>
      <div className="review-list">
        <div className="review-row">
          <span>Branching detected</span>
          <strong>{lineage.detailSummary.hasBranching ? "Yes" : "No"}</strong>
        </div>
        <div className="review-row">
          <span>Branch points</span>
          <strong>{lineage.detailSummary.branchPointCount}</strong>
        </div>
        <div className="review-row">
          <span>Branch continuity quality</span>
          <strong>{formatBranchQuality(lineage.detailSummary.branchingQuality)}</strong>
        </div>
      </div>
    </>
  );
}
