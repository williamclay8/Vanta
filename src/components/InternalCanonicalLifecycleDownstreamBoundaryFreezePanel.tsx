export function InternalCanonicalLifecycleDownstreamBoundaryFreezePanel({
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze,
  encoderFieldMaterializationNextDownstreamPreEncodingConsumer,
}: {
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze: any;
  encoderFieldMaterializationNextDownstreamPreEncodingConsumer: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.artifactKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.reason ?? "ready for later next downstream pre-encoding consumer planning-boundary consumption"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.summary}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
