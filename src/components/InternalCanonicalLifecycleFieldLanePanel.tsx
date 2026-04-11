export function InternalCanonicalLifecycleFieldLanePanel({
  encoderRowFieldEmissionStart,
  encoderRowFieldEmissionStartFreeze,
  encoderFieldLaneExecutionAdmission,
  encoderFieldLaneExecutionAdmissionFreeze,
  encoderFieldLaneExecutionStart,
  encoderFieldLaneExecutionStartFreeze,
}: {
  encoderRowFieldEmissionStart: any;
  encoderRowFieldEmissionStartFreeze: any;
  encoderFieldLaneExecutionAdmission: any;
  encoderFieldLaneExecutionAdmissionFreeze: any;
  encoderFieldLaneExecutionStart: any;
  encoderFieldLaneExecutionStartFreeze: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Start kind</span>
            <strong>{`${encoderRowFieldEmissionStart.startKind} · v${encoderRowFieldEmissionStart.startVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Start status</span>
            <strong>{encoderRowFieldEmissionStart.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderRowFieldEmissionStart.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Emission provenance</span>
            <strong>{`${encoderRowFieldEmissionStart.rowFieldEmissionSnapshotKind} · ${encoderRowFieldEmissionStart.rowFieldEmissionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderRowFieldEmissionStart.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderRowFieldEmissionStart.reason ?? "ready for later row-field emission start"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderRowFieldEmissionStart.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderRowFieldEmissionStartFreeze.snapshotKind} · v${encoderRowFieldEmissionStartFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderRowFieldEmissionStartFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderRowFieldEmissionStartFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderRowFieldEmissionStartFreeze.serialized.length > 96
                ? `${encoderRowFieldEmissionStartFreeze.serialized.slice(0, 96)}...`
                : encoderRowFieldEmissionStartFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Admission kind</span>
            <strong>{`${encoderFieldLaneExecutionAdmission.admissionKind} · v${encoderFieldLaneExecutionAdmission.admissionVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Admission status</span>
            <strong>{encoderFieldLaneExecutionAdmission.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldLaneExecutionAdmission.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Field provenance</span>
            <strong>{`${encoderFieldLaneExecutionAdmission.rowFieldEmissionSnapshotKind} · ${encoderFieldLaneExecutionAdmission.rowFieldEmissionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldLaneExecutionAdmission.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldLaneExecutionAdmission.reason ?? "ready for later field-lane execution"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldLaneExecutionAdmission.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldLaneExecutionAdmissionFreeze.snapshotKind} · v${encoderFieldLaneExecutionAdmissionFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldLaneExecutionAdmissionFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldLaneExecutionAdmissionFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldLaneExecutionAdmissionFreeze.serialized.length > 96
                ? `${encoderFieldLaneExecutionAdmissionFreeze.serialized.slice(0, 96)}...`
                : encoderFieldLaneExecutionAdmissionFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Start kind</span>
            <strong>{`${encoderFieldLaneExecutionStart.startKind} · v${encoderFieldLaneExecutionStart.startVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Start status</span>
            <strong>{encoderFieldLaneExecutionStart.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldLaneExecutionStart.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Lane provenance</span>
            <strong>{`${encoderFieldLaneExecutionStart.fieldLaneSnapshotKind} · ${encoderFieldLaneExecutionStart.fieldLaneStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldLaneExecutionStart.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldLaneExecutionStart.reason ?? "ready for later field-lane execution start"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldLaneExecutionStart.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldLaneExecutionStartFreeze.snapshotKind} · v${encoderFieldLaneExecutionStartFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldLaneExecutionStartFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldLaneExecutionStartFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldLaneExecutionStartFreeze.serialized.length > 96
                ? `${encoderFieldLaneExecutionStartFreeze.serialized.slice(0, 96)}...`
                : encoderFieldLaneExecutionStartFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
