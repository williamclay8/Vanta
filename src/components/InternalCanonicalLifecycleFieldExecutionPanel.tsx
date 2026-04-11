export function InternalCanonicalLifecycleFieldExecutionPanel({
  encoderFieldMaterializationExecutionStart,
  encoderFieldMaterializationExecutionStartFreeze,
  encoderFieldMaterializationExecutionWorkEnvelope,
  encoderFieldMaterializationExecutionWorkEnvelopeFreeze,
  encoderFieldMaterializationExecutionPlan,
  encoderFieldMaterializationExecutionPlanFreeze,
}: {
  encoderFieldMaterializationExecutionStart: any;
  encoderFieldMaterializationExecutionStartFreeze: any;
  encoderFieldMaterializationExecutionWorkEnvelope: any;
  encoderFieldMaterializationExecutionWorkEnvelopeFreeze: any;
  encoderFieldMaterializationExecutionPlan: any;
  encoderFieldMaterializationExecutionPlanFreeze: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Start kind</span>
            <strong>{`${encoderFieldMaterializationExecutionStart.startKind} · v${encoderFieldMaterializationExecutionStart.startVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Start status</span>
            <strong>{encoderFieldMaterializationExecutionStart.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationExecutionStart.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Execution provenance</span>
            <strong>{`${encoderFieldMaterializationExecutionStart.fieldMaterializationExecutionSnapshotKind} · ${encoderFieldMaterializationExecutionStart.fieldMaterializationExecutionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationExecutionStart.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationExecutionStart.reason ?? "ready for later field-materialization execution"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationExecutionStart.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationExecutionStartFreeze.snapshotKind} · v${encoderFieldMaterializationExecutionStartFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationExecutionStartFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationExecutionStartFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationExecutionStartFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationExecutionStartFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationExecutionStartFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Envelope kind</span>
            <strong>{`${encoderFieldMaterializationExecutionWorkEnvelope.envelopeKind} · v${encoderFieldMaterializationExecutionWorkEnvelope.envelopeVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Envelope status</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelope.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelope.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Start provenance</span>
            <strong>{`${encoderFieldMaterializationExecutionWorkEnvelope.fieldMaterializationExecutionStartSnapshotKind} · ${encoderFieldMaterializationExecutionWorkEnvelope.fieldMaterializationExecutionStartStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelope.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelope.reason ?? "ready for later field-materialization execution"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelope.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationExecutionWorkEnvelopeFreeze.snapshotKind} · v${encoderFieldMaterializationExecutionWorkEnvelopeFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelopeFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationExecutionWorkEnvelopeFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationExecutionWorkEnvelopeFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationExecutionWorkEnvelopeFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationExecutionWorkEnvelopeFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Plan kind</span>
            <strong>{`${encoderFieldMaterializationExecutionPlan.planKind} · v${encoderFieldMaterializationExecutionPlan.planVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Plan status</span>
            <strong>{encoderFieldMaterializationExecutionPlan.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldMaterializationExecutionPlan.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Envelope provenance</span>
            <strong>{`${encoderFieldMaterializationExecutionPlan.fieldMaterializationExecutionWorkEnvelopeSnapshotKind} · ${encoderFieldMaterializationExecutionPlan.fieldMaterializationExecutionWorkEnvelopeStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldMaterializationExecutionPlan.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldMaterializationExecutionPlan.reason ?? "ready for later field-materialization planning"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldMaterializationExecutionPlan.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldMaterializationExecutionPlanFreeze.snapshotKind} · v${encoderFieldMaterializationExecutionPlanFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldMaterializationExecutionPlanFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldMaterializationExecutionPlanFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldMaterializationExecutionPlanFreeze.serialized.length > 96
                ? `${encoderFieldMaterializationExecutionPlanFreeze.serialized.slice(0, 96)}...`
                : encoderFieldMaterializationExecutionPlanFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
