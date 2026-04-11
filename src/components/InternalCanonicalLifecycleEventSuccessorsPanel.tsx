function abbreviate(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

export function InternalCanonicalLifecycleEventSuccessorsPanel({
  event,
}: {
  event: any;
}) {
  return (
    <>
      <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
        Retained canonical successor summaries
      </p>
      <div className="review-list">
        {event.successors.map((successor: any) => (
          <div key={`${event.id}:${successor.label}:${successor.commitment ?? successor.liveNoteId ?? "successor"}`}>
            <div className="review-row">
              <span>{successor.label}</span>
              <strong>{successor.amountSummary ?? successor.assetSummary ?? "Successor"}</strong>
            </div>
            <div className="review-row">
              <span>Live note</span>
              <strong>{abbreviate(successor.liveNoteId)}</strong>
            </div>
            <div className="review-row">
              <span>Commitment</span>
              <strong>{abbreviate(successor.commitment)}</strong>
            </div>
            <div className="review-row">
              <span>Insertion</span>
              <strong>
                {successor.insertionIndex !== undefined
                  ? `${successor.insertionIndex} · ${abbreviate(successor.snapshotRoot)}`
                  : "Not inserted"}
              </strong>
            </div>
            <div className="review-row">
              <span>Spend status</span>
              <strong>{successor.spendStatus ?? "legacy"}</strong>
            </div>
            <div className="review-row">
              <span>Spend seam</span>
              <strong>
                {successor.spendCapability === "spendable"
                  ? successor.consumedByKind
                    ? `${successor.consumedByKind} consumed`
                    : successor.nullifierReady
                      ? "nullifier-ready"
                      : "spendable"
                  : successor.spendCapability ?? "legacy"}
              </strong>
            </div>
            <div className="review-row">
              <span>Witness readiness</span>
              <strong>{successor.witnessReadiness ?? "legacy"}</strong>
            </div>
            <div className="review-row">
              <span>Derived path</span>
              <strong>
                {successor.derivedPathKind
                  ? `${successor.derivedPathKind} · depth ${successor.derivedPathDepth ?? 0} · leaf ${successor.derivedPathLeafIndex ?? 0}`
                  : "Not attached"}
              </strong>
            </div>
            <div className="review-row">
              <span>Path semantics</span>
              <strong>{successor.derivedPathSemantics ?? "Unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Path digests</span>
              <strong>
                {successor.derivedPathDigestReady
                  ? `${successor.derivedPathDigestScheme} · ${successor.derivedPathDigestLevelCount ?? 0} levels`
                  : "Not attached"}
              </strong>
            </div>
            <div className="review-row">
              <span>Candidate path</span>
              <strong>
                {successor.candidatePathReady
                  ? `${successor.candidatePathKind} · ${successor.candidatePathScheme} · depth ${successor.candidatePathDepth ?? 0}`
                  : "Not attached"}
              </strong>
            </div>
            <div className="review-row">
              <span>Candidate agreement</span>
              <strong>{successor.candidateAgreementStatus ?? "unavailable"}</strong>
            </div>
            <div className="review-row">
              <span>Witness package</span>
              <strong>{`${successor.witnessPackageReadiness ?? "unavailable"} · ${successor.witnessPackageSummary ?? "Unavailable"}`}</strong>
            </div>
            <div className="review-row">
              <span>Circuit input</span>
              <strong>{`${successor.circuitInputReadiness ?? "unavailable"} · ${successor.circuitInputSummary ?? "Unavailable"}`}</strong>
            </div>
            <div className="review-row"><span>Field groups</span><strong>{successor.circuitInputFieldGroupSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field mapping</span><strong>{successor.fieldMappingPrecheckSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Slot shaping</span><strong>{successor.slotNormalizationSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field candidates</span><strong>{successor.fieldCandidateSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field preimages</span><strong>{successor.fieldValuePreimageSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field lanes</span><strong>{successor.fieldLanePlanSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Lane arity</span><strong>{successor.laneArityPlanSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field schedule</span><strong>{successor.fieldEmissionScheduleSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field manifest</span><strong>{successor.fieldConversionManifestSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field drafts</span><strong>{successor.finiteFieldDraftSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Canonicalized drafts</span><strong>{successor.draftCanonicalizationSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Modulus readiness</span><strong>{successor.modulusReadinessSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Reduction plans</span><strong>{successor.reductionPlanSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field-element drafts</span><strong>{successor.fieldElementDraftSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Field-element assembly</span><strong>{successor.fieldElementAssemblySummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Witness layout</span><strong>{successor.witnessLayoutSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Witness realization</span><strong>{successor.witnessRealizationSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Witness realization recipes</span><strong>{successor.witnessRealizationRecipeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Materialization manifest</span><strong>{successor.witnessMaterializationManifestSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Backend bridge</span><strong>{successor.backendBridgeContractSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Adapter handshake</span><strong>{successor.backendAdapterHandshakeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Adapter bundle</span><strong>{successor.backendAdapterNormalizedSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Frozen adapter payload</span><strong>{successor.adapterPayloadFreezeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder stub</span><strong>{successor.encoderStubSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder work items</span><strong>{successor.encoderWorkItemSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder execution plan</span><strong>{successor.encoderExecutionPlanSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder dispatch</span><strong>{successor.encoderDispatchSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder dispatch ack</span><strong>{successor.encoderDispatchAckSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder dispatch readiness</span><strong>{successor.encoderDispatchReadinessSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder session ticket</span><strong>{successor.encoderSessionTicketSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Encoder preflight</span><strong>{successor.encoderPreflightSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Frozen preflight</span><strong>{successor.encoderPreflightFreezeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Orchestration handoff</span><strong>{successor.encoderOrchestrationHandoffSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Frozen handoff</span><strong>{successor.encoderOrchestrationHandoffFreezeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Runner intake</span><strong>{successor.encoderRunnerIntakeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Frozen intake</span><strong>{successor.encoderRunnerIntakeFreezeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Launch envelope</span><strong>{successor.encoderRunnerLaunchEnvelopeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Frozen launch</span><strong>{successor.encoderRunnerLaunchEnvelopeFreezeSummary ?? "Unavailable"}</strong></div>
            <div className="review-row"><span>Start ticket</span><strong>{successor.encoderRunnerStartTicketSummary ?? "Unavailable"}</strong></div>
            <div className="review-row">
              <span>Root reconciliation</span>
              <strong>{`${successor.rootReconciliationStatus ?? "unavailable"} · ${successor.rootReconciliationScheme ?? "Unavailable"}`}</strong>
            </div>
            <div className="review-row">
              <span>Future root seam</span>
              <strong>
                {successor.futureRootSeamKind
                  ? `${successor.futureRootSeamKind} · ${successor.futureRootSeamScheme ?? "unknown-scheme"} · ${successor.futureRootSeamLeafCount ?? 0} leaves`
                  : "No retained seam source"}
              </strong>
            </div>
            <div className="review-row">
              <span>Root compare</span>
              <strong>
                {successor.currentRootLikeDigest
                  ? `${abbreviate(successor.currentRootLikeDigest)} vs ${abbreviate(successor.futureRootSeamValue)}`
                  : "Not compare-ready"}
              </strong>
            </div>
            <div className="review-row">
              <span>Tree seam</span>
              <strong>
                {successor.candidatePathReady && successor.futureRootSeamScheme
                  ? "candidate path and candidate root aligned"
                  : "candidate tree seam incomplete"}
              </strong>
            </div>
            <div className="review-row">
              <span>Membership linkage</span>
              <strong>{successor.membershipLinkedByLifecycle ? "lifecycle-linked" : "not linked"}</strong>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
