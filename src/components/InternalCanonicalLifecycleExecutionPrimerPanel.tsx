import {
  inspectGenericPhase1EncoderDispatchAckForLifecycleNode,
  inspectGenericPhase1EncoderDispatchContractForLifecycleNode,
  inspectGenericPhase1EncoderDispatchReadinessForLifecycleNode,
  inspectGenericPhase1EncoderExecutionPlanForLifecycleNode,
  inspectGenericPhase1EncoderStubForLifecycleNode,
  inspectGenericPhase1EncoderWorkItemsForLifecycleNode,
} from "@/zk/backendEncoderStub";

export function InternalCanonicalLifecycleExecutionPrimerPanel({
  lookupLifecycleId,
}: {
  lookupLifecycleId: string;
}) {
  const encoderStubResult = inspectGenericPhase1EncoderStubForLifecycleNode(lookupLifecycleId);
  const encoderWorkItems = inspectGenericPhase1EncoderWorkItemsForLifecycleNode(lookupLifecycleId);
  const encoderExecutionPlan =
    inspectGenericPhase1EncoderExecutionPlanForLifecycleNode(lookupLifecycleId);
  const encoderDispatch =
    inspectGenericPhase1EncoderDispatchContractForLifecycleNode(lookupLifecycleId);
  const encoderDispatchAck =
    inspectGenericPhase1EncoderDispatchAckForLifecycleNode(lookupLifecycleId);
  const encoderDispatchReadiness =
    inspectGenericPhase1EncoderDispatchReadinessForLifecycleNode(lookupLifecycleId);

  return (
    <>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Encoder label</span>
              <strong>{encoderStubResult.encoderLabel}</strong>
            </div>
            <div className="review-row">
              <span>Encoder status</span>
              <strong>{encoderStubResult.status}</strong>
            </div>
            <div className="review-row">
              <span>Would consume</span>
              <strong>{encoderStubResult.wouldConsumeRowCount}</strong>
            </div>
            <div className="review-row">
              <span>Encoder reason</span>
              <strong>{encoderStubResult.reason ?? "not-yet-encoded stub accepted payload"}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Work-item count</span>
              <strong>{encoderWorkItems.workItemCount}</strong>
            </div>
            <div className="review-row">
              <span>Blocked items</span>
              <strong>{encoderWorkItems.blockedItemCount}</strong>
            </div>
            <div className="review-row">
              <span>Work-item kinds</span>
              <strong>{encoderWorkItems.summary}</strong>
            </div>
            <div className="review-row">
              <span>Work-item preview</span>
              <strong>
                {encoderWorkItems.workItems
                  .slice(0, 5)
                  .map((item) => `${item.workItemIndex}:${item.slotLabel}:${item.kind}`)
                  .join(" · ") || "None"}
              </strong>
            </div>
            <div className="review-row">
              <span>Blocked preview</span>
              <strong>
                {encoderWorkItems.blockedItems
                  .slice(0, 3)
                  .map((item) => `${item.slotLabel}:${item.blockedReason ?? item.kind}`)
                  .join(" · ") || "None"}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Batch count</span>
              <strong>{encoderExecutionPlan.batchCount}</strong>
            </div>
            <div className="review-row">
              <span>Blocked batches</span>
              <strong>{encoderExecutionPlan.blockedBatchCount}</strong>
            </div>
            <div className="review-row">
              <span>Batch kinds</span>
              <strong>{encoderExecutionPlan.summary}</strong>
            </div>
            <div className="review-row">
              <span>Batch preview</span>
              <strong>
                {encoderExecutionPlan.batches
                  .slice(0, 5)
                  .map((batch) => `${batch.batchIndex}:${batch.sectionName}:${batch.kind}`)
                  .join(" · ") || "None"}
              </strong>
            </div>
            <div className="review-row">
              <span>Blocked batch preview</span>
              <strong>
                {encoderExecutionPlan.blockedBatches
                  .slice(0, 3)
                  .map((batch) => `${batch.sectionName}:${batch.blockedReason ?? batch.kind}`)
                  .join(" · ") || "None"}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <div className="status-panel">
          <div className="review-list">
            <div className="review-row">
              <span>Dispatch count</span>
              <strong>{encoderDispatch.requestCount}</strong>
            </div>
            <div className="review-row">
              <span>Blocked requests</span>
              <strong>{encoderDispatch.blockedRequestCount}</strong>
            </div>
            <div className="review-row">
              <span>Dispatch summary</span>
              <strong>{encoderDispatch.summary}</strong>
            </div>
            <div className="review-row">
              <span>Ack summary</span>
              <strong>{encoderDispatchAck.summary}</strong>
            </div>
            <div className="review-row">
              <span>Readiness status</span>
              <strong>{encoderDispatchReadiness.status}</strong>
            </div>
            <div className="review-row">
              <span>Ready to encode</span>
              <strong>{encoderDispatchReadiness.readyToEncode ? "yes" : "no"}</strong>
            </div>
            <div className="review-row">
              <span>Readiness counts</span>
              <strong>
                {`${encoderDispatchReadiness.acceptedCount} accepted · ${encoderDispatchReadiness.blockedCount} blocked · ${encoderDispatchReadiness.unsupportedCount} unsupported`}
              </strong>
            </div>
            <div className="review-row">
              <span>Readiness reason</span>
              <strong>{encoderDispatchReadiness.reason ?? "ready for later encoder gating"}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
