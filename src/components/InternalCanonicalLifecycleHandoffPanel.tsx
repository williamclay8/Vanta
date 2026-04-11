import {
  inspectGenericPhase1EncoderOrchestrationHandoffForLifecycleNode,
  inspectGenericPhase1EncoderOrchestrationHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerIntakeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerIntakeFreezeForLifecycleNode,
} from "@/zk/backendEncoderStub";

export function InternalCanonicalLifecycleHandoffPanel({
  lookupLifecycleId,
}: {
  lookupLifecycleId: string;
}) {
  const encoderOrchestrationHandoff =
    inspectGenericPhase1EncoderOrchestrationHandoffForLifecycleNode(lookupLifecycleId);
  const encoderOrchestrationHandoffFreeze =
    inspectGenericPhase1EncoderOrchestrationHandoffFreezeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerIntake = inspectGenericPhase1EncoderRunnerIntakeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerIntakeFreeze =
    inspectGenericPhase1EncoderRunnerIntakeFreezeForLifecycleNode(lookupLifecycleId);

  return (
    <>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Handoff kind</span>
              <strong>{`${encoderOrchestrationHandoff.handoffKind} · v${encoderOrchestrationHandoff.handoffVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Handoff status</span>
              <strong>{encoderOrchestrationHandoff.status}</strong>
            </div>
            <div className="review-row">
              <span>Proceedable</span>
              <strong>{encoderOrchestrationHandoff.proceedable ? "yes" : "no"}</strong>
            </div>
            <div className="review-row">
              <span>Preflight provenance</span>
              <strong>{`${encoderOrchestrationHandoff.preflightSnapshotKind} · ${encoderOrchestrationHandoff.preflightStatus}`}</strong>
            </div>
            <div className="review-row">
              <span>Footprint</span>
              <strong>{encoderOrchestrationHandoff.dispatchFootprintSummary}</strong>
            </div>
            <div className="review-row">
              <span>Handoff reason</span>
              <strong>{encoderOrchestrationHandoff.reason ?? "ready for later runner-facing handoff"}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Frozen kind</span>
              <strong>{`${encoderOrchestrationHandoffFreeze.snapshotKind} · v${encoderOrchestrationHandoffFreeze.snapshotVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Frozen status</span>
              <strong>{encoderOrchestrationHandoffFreeze.status}</strong>
            </div>
            <div className="review-row">
              <span>Frozen summary</span>
              <strong>{encoderOrchestrationHandoffFreeze.summary}</strong>
            </div>
            <div className="review-row">
              <span>Serialized preview</span>
              <strong>
                {encoderOrchestrationHandoffFreeze.serialized.length > 96
                  ? `${encoderOrchestrationHandoffFreeze.serialized.slice(0, 96)}...`
                  : encoderOrchestrationHandoffFreeze.serialized}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Intake kind</span>
              <strong>{`${encoderRunnerIntake.intakeKind} · v${encoderRunnerIntake.intakeVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Intake status</span>
              <strong>{encoderRunnerIntake.status}</strong>
            </div>
            <div className="review-row">
              <span>Proceedable</span>
              <strong>{encoderRunnerIntake.proceedable ? "yes" : "no"}</strong>
            </div>
            <div className="review-row">
              <span>Handoff provenance</span>
              <strong>{`${encoderRunnerIntake.handoffSnapshotKind} · ${encoderRunnerIntake.handoffStatus}`}</strong>
            </div>
            <div className="review-row">
              <span>Footprint</span>
              <strong>{encoderRunnerIntake.dispatchFootprintSummary}</strong>
            </div>
            <div className="review-row">
              <span>Intake reason</span>
              <strong>{encoderRunnerIntake.reason ?? "ready for later runner intake"}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Frozen kind</span>
              <strong>{`${encoderRunnerIntakeFreeze.snapshotKind} · v${encoderRunnerIntakeFreeze.snapshotVersion}`}</strong>
            </div>
            <div className="review-row">
              <span>Frozen status</span>
              <strong>{encoderRunnerIntakeFreeze.status}</strong>
            </div>
            <div className="review-row">
              <span>Frozen summary</span>
              <strong>{encoderRunnerIntakeFreeze.summary}</strong>
            </div>
            <div className="review-row">
              <span>Serialized preview</span>
              <strong>
                {encoderRunnerIntakeFreeze.serialized.length > 96
                  ? `${encoderRunnerIntakeFreeze.serialized.slice(0, 96)}...`
                  : encoderRunnerIntakeFreeze.serialized}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
