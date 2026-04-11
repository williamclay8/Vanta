export function InternalCanonicalLifecycleDownstreamPanel({
  encoderFieldMaterializationPlanningConsumerHandoffFreeze,
  encoderFieldMaterializationDownstreamConsumer,
  encoderFieldMaterializationDownstreamConsumerFreeze,
  encoderFieldMaterializationDownstreamBoundaryHandoff,
  encoderFieldMaterializationDownstreamBoundaryHandoffFreeze,
  encoderFieldMaterializationDownstreamPlanningConsumer,
  encoderFieldMaterializationDownstreamPlanningConsumerFreeze,
}: {
  encoderFieldMaterializationPlanningConsumerHandoffFreeze: any;
  encoderFieldMaterializationDownstreamConsumer: any;
  encoderFieldMaterializationDownstreamConsumerFreeze: any;
  encoderFieldMaterializationDownstreamBoundaryHandoff: any;
  encoderFieldMaterializationDownstreamBoundaryHandoffFreeze: any;
  encoderFieldMaterializationDownstreamPlanningConsumer: any;
  encoderFieldMaterializationDownstreamPlanningConsumerFreeze: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationPlanningConsumerHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationPlanningConsumerHandoffFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationPlanningConsumerHandoffFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationPlanningConsumerHandoffFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationPlanningConsumerHandoffFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationPlanningConsumerHandoffFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationPlanningConsumerHandoffFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamConsumer.artifactKind} · v${encoderFieldMaterializationDownstreamConsumer.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationDownstreamConsumer.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamConsumer.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamConsumer.fieldMaterializationPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamConsumer.fieldMaterializationPlanningConsumerHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamConsumer.reason ?? "ready for later downstream planning consumption"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamConsumer.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Handoff kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamBoundaryHandoff.handoffVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Handoff status</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Consumer provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamBoundaryHandoff.fieldMaterializationDownstreamConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamBoundaryHandoff.fieldMaterializationDownstreamConsumerStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.reason ?? "ready for later downstream boundary handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Artifact kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPlanningConsumer.artifactKind} · v${encoderFieldMaterializationDownstreamPlanningConsumer.artifactVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Artifact status</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Handoff provenance</span>
            <strong>{`${encoderFieldMaterializationDownstreamPlanningConsumer.fieldMaterializationDownstreamBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPlanningConsumer.fieldMaterializationDownstreamBoundaryHandoffStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.reason ?? "ready for later downstream planning consumption"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationDownstreamPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPlanningConsumerFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumerFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationDownstreamPlanningConsumerFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
