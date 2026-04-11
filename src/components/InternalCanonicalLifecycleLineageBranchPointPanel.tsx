import React, { Suspense } from "react";

function abbreviate(value: string | undefined) {
  if (!value) return "Unavailable";
  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatBranchQuality(value: "explicit" | "heuristic" | "unresolved") {
  return value;
}

function formatSuccessorKind(value: "recipient" | "change" | "retained" | "output" | undefined) {
  if (!value) return "branch";
  return value;
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

const InternalCanonicalLifecycleLineageBranchPanel = React.lazy(() =>
  import("@/components/InternalCanonicalLifecycleLineageBranchPanel").then((m) => ({
    default: m.InternalCanonicalLifecycleLineageBranchPanel,
  })),
);

export function InternalCanonicalLifecycleLineageBranchPointPanel({ branchPoint }: { branchPoint: any }) {
  return (
    <div className="preview-card" style={{ display: "grid", gap: 12 }}>
      <div className="review-row">
        <span>{branchPoint.sourceEventTitle}</span>
        <strong>{formatTimestamp(branchPoint.createdAt)}</strong>
      </div>
      <div className="review-row">
        <span>Branch quality</span>
        <strong>{formatBranchQuality(branchPoint.branchQuality)}</strong>
      </div>
      <div className="review-row">
        <span>Consumed predecessor</span>
        <strong>
          {branchPoint.predecessorCanonicalCommitment
            ? abbreviate(branchPoint.predecessorCanonicalCommitment)
            : branchPoint.predecessorLiveNoteId
              ? `${abbreviate(branchPoint.predecessorLiveNoteId)} (live)`
              : "Origin or unresolved"}
        </strong>
      </div>
      <div className="review-row">
        <span>Successor paths</span>
        <strong>{branchPoint.branchCount}</strong>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {branchPoint.branches.map((branch: any) => (
          <div
            key={`${branchPoint.sourceEventId}:${branch.successorKind ?? branch.successorLabel}:${branch.commitment ?? branch.liveNoteId ?? "branch"}`}
            className="status-panel"
            style={{ padding: 12 }}
          >
            <div className="review-row">
              <span>{branch.successorLabel}</span>
              <strong>{formatSuccessorKind(branch.successorKind)}</strong>
            </div>
            <div className="review-row">
              <span>Summary</span>
              <strong>{branch.amountSummary ?? branch.assetSummary ?? "Successor"}</strong>
            </div>
            <div className="review-row">
              <span>Live note</span>
              <strong>{abbreviate(branch.liveNoteId)}</strong>
            </div>
            <div className="review-row">
              <span>Commitment</span>
              <strong>{abbreviate(branch.commitment)}</strong>
            </div>
            <div className="review-row">
              <span>Insertion</span>
              <strong>
                {branch.insertionIndex !== undefined
                  ? `${branch.insertionIndex} · ${abbreviate(branch.snapshotRoot)}`
                  : "Not inserted"}
              </strong>
            </div>
            <div className="review-row">
              <span>Spend status</span>
              <strong>{branch.spendStatus ?? "legacy"}</strong>
            </div>
            <div className="review-row">
              <span>Consumption link</span>
              <strong>
                {branch.consumedByKind
                  ? `${branch.consumedByKind} · ${abbreviate(branch.consumedByConsumptionId)}`
                  : branch.nullifierReady
                    ? "nullifier-ready and not yet consumed"
                    : "Legacy or terminal"}
              </strong>
            </div>
            <div className="review-row">
              <span>Witness readiness</span>
              <strong>{branch.witnessReadiness ?? "legacy"}</strong>
            </div>
            <div className="review-row">
              <span>Derived path</span>
              <strong>
                {branch.derivedPathKind
                  ? `${branch.derivedPathKind} · depth ${branch.derivedPathDepth ?? 0} · leaf ${branch.derivedPathLeafIndex ?? 0}`
                  : "Not attached"}
              </strong>
            </div>
            <div className="review-row">
              <span>Path semantics</span>
              <strong>{branch.derivedPathSemantics ?? "Unavailable"}</strong>
            </div>
            <Suspense fallback={<div className="status-panel">Loading lineage branch diagnostics…</div>}>
              <InternalCanonicalLifecycleLineageBranchPanel branch={branch} />
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
}
