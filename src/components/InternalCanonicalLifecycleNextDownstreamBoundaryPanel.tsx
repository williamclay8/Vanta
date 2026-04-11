export function InternalCanonicalLifecycleNextDownstreamBoundaryPanel({
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer,
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze,
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff,
}: {
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer: any;
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze: any;
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.artifactKind} · v${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.reason ?? "ready for next downstream planning-boundary consumer"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Handoff kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.handoffVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Handoff status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Frozen artifact provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningBoundaryConsumerSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.reason ?? "ready for next downstream planning-boundary handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.summary}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
