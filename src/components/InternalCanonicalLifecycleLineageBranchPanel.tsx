function abbreviate(value: string | undefined) {
  if (!value) return "Unavailable";
  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatBranchQuality(value: "explicit" | "heuristic" | "unresolved") {
  return value;
}

function formatChainResolutionState(value: "resolved" | "partial" | "unresolved") {
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

export function InternalCanonicalLifecycleLineageBranchPanel({ branch }: { branch: any }) {
  return (
    <>
      <div className="review-row"><span>Field manifest</span><strong>{branch.fieldConversionManifestSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Field drafts</span><strong>{branch.finiteFieldDraftSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Canonicalized drafts</span><strong>{branch.draftCanonicalizationSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Modulus readiness</span><strong>{branch.modulusReadinessSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Reduction plans</span><strong>{branch.reductionPlanSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Field-element drafts</span><strong>{branch.fieldElementDraftSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Field-element assembly</span><strong>{branch.fieldElementAssemblySummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Witness layout</span><strong>{branch.witnessLayoutSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Witness realization</span><strong>{branch.witnessRealizationSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Witness realization recipes</span><strong>{branch.witnessRealizationRecipeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Materialization manifest</span><strong>{branch.witnessMaterializationManifestSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Backend bridge</span><strong>{branch.backendBridgeContractSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Adapter handshake</span><strong>{branch.backendAdapterHandshakeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Adapter bundle</span><strong>{branch.backendAdapterNormalizedSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Frozen adapter payload</span><strong>{branch.adapterPayloadFreezeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder stub</span><strong>{branch.encoderStubSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder work items</span><strong>{branch.encoderWorkItemSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder execution plan</span><strong>{branch.encoderExecutionPlanSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder dispatch</span><strong>{branch.encoderDispatchSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder dispatch ack</span><strong>{branch.encoderDispatchAckSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder dispatch readiness</span><strong>{branch.encoderDispatchReadinessSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder session ticket</span><strong>{branch.encoderSessionTicketSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Encoder preflight</span><strong>{branch.encoderPreflightSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Frozen preflight</span><strong>{branch.encoderPreflightFreezeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Orchestration handoff</span><strong>{branch.encoderOrchestrationHandoffSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Frozen handoff</span><strong>{branch.encoderOrchestrationHandoffFreezeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Runner intake</span><strong>{branch.encoderRunnerIntakeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Frozen intake</span><strong>{branch.encoderRunnerIntakeFreezeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Launch envelope</span><strong>{branch.encoderRunnerLaunchEnvelopeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Frozen launch</span><strong>{branch.encoderRunnerLaunchEnvelopeFreezeSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Start ticket</span><strong>{branch.encoderRunnerStartTicketSummary ?? "Unavailable"}</strong></div>
      <div className="review-row"><span>Root reconciliation</span><strong>{`${branch.rootReconciliationStatus ?? "unavailable"} · ${branch.rootReconciliationScheme ?? "Unavailable"}`}</strong></div>
      <div className="review-row"><span>Future root seam</span><strong>{branch.futureRootSeamKind ? `${branch.futureRootSeamKind} · ${branch.futureRootSeamScheme ?? "unknown-scheme"} · ${branch.futureRootSeamLeafCount ?? 0} leaves` : "No retained seam source"}</strong></div>
      <div className="review-row"><span>Root compare</span><strong>{branch.currentRootLikeDigest ? `${abbreviate(branch.currentRootLikeDigest)} vs ${abbreviate(branch.futureRootSeamValue)}` : "Not compare-ready"}</strong></div>
      <div className="review-row"><span>Tree seam</span><strong>{branch.candidatePathReady && branch.futureRootSeamScheme ? "candidate path and candidate root aligned" : "candidate tree seam incomplete"}</strong></div>
      <div className="review-row"><span>Membership linkage</span><strong>{branch.membershipLinkedByLifecycle ? "lifecycle-linked" : "not linked"}</strong></div>
      <div className="review-row"><span>Continuity quality</span><strong>{formatBranchQuality(branch.continuityQuality)}</strong></div>
      <p className="shield-helper shield-helper--meta" style={{ marginTop: 8 }}>Branch-chain condensation</p>
      <div className="review-list">
        <div className="review-row"><span>Path span</span><strong>{branch.chainSummary.pathSpanLabel}</strong></div>
        <div className="review-row"><span>Origin</span><strong>{branch.chainSummary.originSummary}</strong></div>
        <div className="review-row"><span>First descendant</span><strong>{branch.chainSummary.firstResolvedDescendant ? `${branch.chainSummary.firstResolvedDescendant.eventTitle} · ${formatTimestamp(branch.chainSummary.firstResolvedDescendant.createdAt)}` : "No resolved descendant"}</strong></div>
        <div className="review-row"><span>Latest descendant</span><strong>{branch.chainSummary.latestResolvedDescendant ? `${branch.chainSummary.latestResolvedDescendant.eventTitle} · ${formatTimestamp(branch.chainSummary.latestResolvedDescendant.createdAt)}` : "No resolved descendant"}</strong></div>
        <div className="review-row"><span>Chain quality</span><strong>{formatBranchQuality(branch.chainSummary.continuityQuality)}</strong></div>
        <div className="review-row"><span>Chain state</span><strong>{formatChainResolutionState(branch.chainSummary.resolutionState)}</strong></div>
        <div className="review-row"><span>Chain read</span><strong>{branch.chainSummary.resolutionSummary}</strong></div>
      </div>
      {branch.chainSummary.firstResolvedDescendant ? (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <div className="preview-card">
            <div className="review-row"><span>First descendant detail</span><strong>{branch.chainSummary.firstResolvedDescendant.eventKind}</strong></div>
            <div className="review-row"><span>Asset summary</span><strong>{branch.chainSummary.firstResolvedDescendant.eventAssetSummary}</strong></div>
            <div className="review-row"><span>Matched via</span><strong>{branch.chainSummary.firstResolvedDescendant.matchedBy}</strong></div>
            <div className="review-row"><span>Continuity</span><strong>{branch.chainSummary.firstResolvedDescendant.continuityStatus}</strong></div>
          </div>
          {branch.chainSummary.latestResolvedDescendant && branch.chainSummary.latestResolvedDescendant.eventId !== branch.chainSummary.firstResolvedDescendant.eventId ? (
            <div className="preview-card">
              <div className="review-row"><span>Latest descendant detail</span><strong>{branch.chainSummary.latestResolvedDescendant.eventKind}</strong></div>
              <div className="review-row"><span>Asset summary</span><strong>{branch.chainSummary.latestResolvedDescendant.eventAssetSummary}</strong></div>
              <div className="review-row"><span>Matched via</span><strong>{branch.chainSummary.latestResolvedDescendant.matchedBy}</strong></div>
              <div className="review-row"><span>Continuity</span><strong>{branch.chainSummary.latestResolvedDescendant.continuityStatus}</strong></div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="review-row"><span>Continuity read</span><strong>{branch.continuitySummary}</strong></div>
      <div className="review-row"><span>Owner hint</span><strong>{abbreviate(branch.ownerPublicKey)}</strong></div>
      {branch.downstreamEvents.length > 0 ? (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {branch.downstreamEvents.map((downstreamEvent: any) => (
            <div key={`${branch.successorLabel}:${downstreamEvent.eventId}:${downstreamEvent.matchedBy}`} className="preview-card">
              <div className="review-row"><span>{downstreamEvent.eventTitle}</span><strong>{formatTimestamp(downstreamEvent.createdAt)}</strong></div>
              <div className="review-row"><span>Matched as</span><strong>{downstreamEvent.matchedBy}</strong></div>
              <div className="review-row"><span>Continuity quality</span><strong>{formatBranchQuality(downstreamEvent.continuityQuality)}</strong></div>
              <div className="review-row"><span>Matched anchor</span><strong>{abbreviate(downstreamEvent.matchedAnchor)}</strong></div>
            </div>
          ))}
        </div>
      ) : (
        <p className="shield-helper shield-helper--meta" style={{ marginTop: 8 }}>
          No later swap or unshield continuation is currently resolved from this successor.
        </p>
      )}
    </>
  );
}
