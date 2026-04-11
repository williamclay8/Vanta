export function InternalCanonicalLifecycleNextDownstreamPlanningPanel({
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer,
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze,
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff,
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze,
  encoderFieldMaterializationNextDownstreamPlanningConsumer,
  encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze,
}: {
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer: any;
  encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze: any;
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff: any;
  encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze: any;
  encoderFieldMaterializationNextDownstreamPlanningConsumer: any;
  encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze: any;
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
            <span>Frozen handoff provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.reason ?? "ready for later next downstream planning-boundary consumption"}</strong>
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
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.reason ?? "ready for later next downstream planning-boundary handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningConsumer.artifactKind} · v${encoderFieldMaterializationNextDownstreamPlanningConsumer.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Frozen handoff provenance</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.reason ?? "ready for later next downstream planning consumption"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
