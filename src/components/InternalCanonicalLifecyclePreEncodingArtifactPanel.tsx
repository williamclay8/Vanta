export function InternalCanonicalLifecyclePreEncodingArtifactPanel({
  encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact,
  encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze,
  encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff,
}: {
  encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact: any;
  encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze: any;
  encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.artifactKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.reason ?? "ready for later downstream pre-encoding consumer artifact"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Handoff kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.handoffVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Handoff status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Artifact provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.reason ?? "ready for later downstream pre-encoding planning-consumer handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.summary}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
