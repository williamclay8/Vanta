export function InternalCanonicalLifecyclePreEncodingTriagePanel({
  encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze,
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff,
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze,
}: {
  encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze: any;
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff: any;
  encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Handoff kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.handoffVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Handoff status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Consumer provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.reason ?? "ready for later downstream pre-encoding planning-boundary handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
