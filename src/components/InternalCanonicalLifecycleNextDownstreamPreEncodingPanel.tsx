export function InternalCanonicalLifecycleNextDownstreamPreEncodingPanel({
  encoderFieldMaterializationNextDownstreamPreEncodingConsumer,
  encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze,
  encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff,
  encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze,
}: {
  encoderFieldMaterializationNextDownstreamPreEncodingConsumer: any;
  encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze: any;
  encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff: any;
  encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze: any;
}) {
  return (
    <>
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
            <span>Frozen handoff provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningBoundaryHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.reason ?? "ready for later next downstream pre-encoding consumption"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Handoff kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.handoffVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Handoff status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Frozen artifact provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationNextDownstreamPreEncodingConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.reason ?? "ready for later next downstream pre-encoding planning-consumer handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
