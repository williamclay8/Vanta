export function InternalCanonicalLifecycleRunnerExecutionPanel({
  encoderRunnerStartTicketFreeze,
  encoderRunnerExecutionInput,
  encoderRunnerExecutionEntryPlan,
  encoderRunnerExecutionEntryPlanFreeze,
  encoderRunnerExecutionSession,
  encoderRunnerExecutionSessionFreeze,
  encoderEncodingAdmission,
  encoderEncodingAdmissionFreeze,
  encoderFieldEncodingStart,
  encoderFieldEncodingStartFreeze,
}: {
  encoderRunnerStartTicketFreeze: any;
  encoderRunnerExecutionInput: any;
  encoderRunnerExecutionEntryPlan: any;
  encoderRunnerExecutionEntryPlanFreeze: any;
  encoderRunnerExecutionSession: any;
  encoderRunnerExecutionSessionFreeze: any;
  encoderEncodingAdmission: any;
  encoderEncodingAdmissionFreeze: any;
  encoderFieldEncodingStart: any;
  encoderFieldEncodingStartFreeze: any;
}) {
  return (
    <>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderRunnerStartTicketFreeze.snapshotKind} · v${encoderRunnerStartTicketFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderRunnerStartTicketFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderRunnerStartTicketFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderRunnerStartTicketFreeze.serialized.length > 96
                ? `${encoderRunnerStartTicketFreeze.serialized.slice(0, 96)}...`
                : encoderRunnerStartTicketFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Input kind</span>
            <strong>{`${encoderRunnerExecutionInput.inputKind} · v${encoderRunnerExecutionInput.inputVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Input status</span>
            <strong>{encoderRunnerExecutionInput.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderRunnerExecutionInput.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Frozen provenance</span>
            <strong>{`${encoderRunnerExecutionInput.startSnapshotKind} · ${encoderRunnerExecutionInput.startStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderRunnerExecutionInput.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderRunnerExecutionInput.reason ?? "ready for later execution entry"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderRunnerExecutionInput.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Plan kind</span>
            <strong>{`${encoderRunnerExecutionEntryPlan.planKind} · v${encoderRunnerExecutionEntryPlan.planVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Plan status</span>
            <strong>{encoderRunnerExecutionEntryPlan.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderRunnerExecutionEntryPlan.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Input provenance</span>
            <strong>{`${encoderRunnerExecutionEntryPlan.inputKind} · ${encoderRunnerExecutionEntryPlan.inputStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen start</span>
            <strong>{`${encoderRunnerExecutionEntryPlan.startSnapshotKind} · v${encoderRunnerExecutionEntryPlan.startSnapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderRunnerExecutionEntryPlan.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderRunnerExecutionEntryPlan.reason ?? "ready for later execution planning handoff"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderRunnerExecutionEntryPlan.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderRunnerExecutionEntryPlanFreeze.snapshotKind} · v${encoderRunnerExecutionEntryPlanFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderRunnerExecutionEntryPlanFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderRunnerExecutionEntryPlanFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderRunnerExecutionEntryPlanFreeze.serialized.length > 96
                ? `${encoderRunnerExecutionEntryPlanFreeze.serialized.slice(0, 96)}...`
                : encoderRunnerExecutionEntryPlanFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Session kind</span>
            <strong>{`${encoderRunnerExecutionSession.sessionKind} · v${encoderRunnerExecutionSession.sessionVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Session status</span>
            <strong>{encoderRunnerExecutionSession.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderRunnerExecutionSession.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Entry provenance</span>
            <strong>{`${encoderRunnerExecutionSession.entrySnapshotKind} · ${encoderRunnerExecutionSession.planStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderRunnerExecutionSession.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderRunnerExecutionSession.reason ?? "ready for later execution admission"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderRunnerExecutionSession.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderRunnerExecutionSessionFreeze.snapshotKind} · v${encoderRunnerExecutionSessionFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderRunnerExecutionSessionFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderRunnerExecutionSessionFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderRunnerExecutionSessionFreeze.serialized.length > 96
                ? `${encoderRunnerExecutionSessionFreeze.serialized.slice(0, 96)}...`
                : encoderRunnerExecutionSessionFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Admission kind</span>
            <strong>{`${encoderEncodingAdmission.admissionKind} · v${encoderEncodingAdmission.admissionVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Admission status</span>
            <strong>{encoderEncodingAdmission.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderEncodingAdmission.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Session provenance</span>
            <strong>{`${encoderEncodingAdmission.sessionSnapshotKind} · ${encoderEncodingAdmission.sessionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderEncodingAdmission.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderEncodingAdmission.reason ?? "ready for later field-encoding admission"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderEncodingAdmission.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderEncodingAdmissionFreeze.snapshotKind} · v${encoderEncodingAdmissionFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderEncodingAdmissionFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderEncodingAdmissionFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderEncodingAdmissionFreeze.serialized.length > 96
                ? `${encoderEncodingAdmissionFreeze.serialized.slice(0, 96)}...`
                : encoderEncodingAdmissionFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Start kind</span>
            <strong>{`${encoderFieldEncodingStart.startKind} · v${encoderFieldEncodingStart.startVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Start status</span>
            <strong>{encoderFieldEncodingStart.status}</strong>
          </div>
          <div className="review-row">
            <span>Proceedable</span>
            <strong>{encoderFieldEncodingStart.proceedable ? "yes" : "no"}</strong>
          </div>
          <div className="review-row">
            <span>Admission provenance</span>
            <strong>{`${encoderFieldEncodingStart.admissionSnapshotKind} · ${encoderFieldEncodingStart.admissionStatus}`}</strong>
          </div>
          <div className="review-row">
            <span>Footprint</span>
            <strong>{encoderFieldEncodingStart.dispatchFootprintSummary}</strong>
          </div>
          <div className="review-row">
            <span>Reason</span>
            <strong>{encoderFieldEncodingStart.reason ?? "ready for later field-encoding execution"}</strong>
          </div>
          <div className="review-row">
            <span>Summary</span>
            <strong>{encoderFieldEncodingStart.summary}</strong>
          </div>
        </div>
      </div>
      <div className="status-panel">
        <div className="review-list">
          <div className="review-row">
            <span>Frozen kind</span>
            <strong>{`${encoderFieldEncodingStartFreeze.snapshotKind} · v${encoderFieldEncodingStartFreeze.snapshotVersion}`}</strong>
          </div>
          <div className="review-row">
            <span>Frozen status</span>
            <strong>{encoderFieldEncodingStartFreeze.status}</strong>
          </div>
          <div className="review-row">
            <span>Frozen summary</span>
            <strong>{encoderFieldEncodingStartFreeze.summary}</strong>
          </div>
          <div className="review-row">
            <span>Serialized preview</span>
            <strong>
              {encoderFieldEncodingStartFreeze.serialized.length > 96
                ? `${encoderFieldEncodingStartFreeze.serialized.slice(0, 96)}...`
                : encoderFieldEncodingStartFreeze.serialized}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
