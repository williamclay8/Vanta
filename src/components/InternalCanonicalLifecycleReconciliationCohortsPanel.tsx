function abbreviate(value: string | undefined) {
  if (!value) return "Unavailable";
  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

export function InternalCanonicalLifecycleReconciliationCohortsPanel({
  reconciliationCohorts,
  setLookupLifecycleId,
  setLookupJumpTarget,
}: {
  reconciliationCohorts: any[];
  setLookupLifecycleId: (value: string) => void;
  setLookupJumpTarget: (value: string) => void;
}) {
  return reconciliationCohorts.length === 0 ? (
    <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
      No reconciliation cohorts are currently retained on this client.
    </p>
  ) : (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {reconciliationCohorts.map((cohort, index) => (
        <div key={cohort.key} className="status-panel">
          <span>
            {index + 1}. Snapshot cohort
          </span>
          <div className="review-list" style={{ marginTop: 12 }}>
            <div className="review-row"><span>Snapshot context</span><strong>{`${cohort.snapshotLeafCount ?? 0} leaves · ${abbreviate(cohort.snapshotRoot)}`}</strong></div>
            <div className="review-row"><span>Future-root seam</span><strong>{cohort.futureRootSeamSourceSummary}</strong></div>
            <div className="review-row"><span>Future-root value</span><strong>{abbreviate(cohort.futureRootSeamValue)}</strong></div>
            <div className="review-row"><span>Nodes in cohort</span><strong>{cohort.nodeCount}</strong></div>
            <div className="review-row"><span>Status counts</span><strong>{`match ${cohort.statusCounts.match} · mismatch ${cohort.statusCounts.mismatch} · pending ${cohort.statusCounts.pending} · unavailable ${cohort.statusCounts.unavailable}`}</strong></div>
            <div className="review-row"><span>Agreement counts</span><strong>{`match ${cohort.agreementCounts.match} · root ${cohort.agreementCounts["root-mismatch"]} · path ${cohort.agreementCounts["path-mismatch"]} · scheme ${cohort.agreementCounts["scheme-mismatch"]} · pending ${cohort.agreementCounts.pending} · unavailable ${cohort.agreementCounts.unavailable} · legacy ${cohort.agreementCounts.legacy}`}</strong></div>
            <div className="review-row"><span>Mismatches</span><strong>{cohort.mismatchEntries.length > 0 ? "Select a mismatch below" : "None"}</strong></div>
            {cohort.mismatchEntries.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {cohort.mismatchEntries.map((entry: any) => (
                  <div key={`${cohort.key}:${entry.lifecycleId}`} className="preview-card" style={{ display: "grid", gap: 8 }}>
                    <div className="review-row"><span>{abbreviate(entry.lifecycleId)}</span><strong>{entry.nodeRole ?? entry.sourceKind ?? "node"}</strong></div>
                    <div className="review-row"><span>Status</span><strong>{entry.agreementStatus}</strong></div>
                    <div className="status-actions">
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          setLookupLifecycleId(entry.lifecycleId);
                          setLookupJumpTarget(entry.lifecycleId);
                        }}
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
