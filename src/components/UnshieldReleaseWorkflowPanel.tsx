import type { ComponentProps } from "react";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreReleaseCandidateState,
  VantaPrivateCoreReleaseHandoffState,
  VantaPrivateCoreReleaseWorkflowState,
  VantaPrivateCoreShieldState,
  VantaPrivateCoreUnshieldState,
} from "@/data/context/PrivacyFlowContext";
import type {
  VantaPrivateCoreOperatorConsumeRecord,
  VantaPrivateCoreOperatorReleaseRecord,
  VantaPrivateCoreOperatorRootRecord,
} from "@/zk/vantaPrivateCoreOperatorClient";
import { abbreviate } from "@/components/send/sendPanelUtils";

export type PrivateCoreDemoStep = {
  label: string;
  status: string;
  summary: string;
};

type StatePanelProps = ComponentProps<typeof VantaPrivateCoreStatePanel>;

export type UnshieldReleaseWorkflowPanelProps = {
  latestPrivateCoreOperatorConsume: VantaPrivateCoreOperatorConsumeRecord | null | undefined;
  latestPrivateCoreOperatorRelease: VantaPrivateCoreOperatorReleaseRecord | null | undefined;
  privateCoreActionPending: boolean;
  privateCoreDemoSteps: readonly PrivateCoreDemoStep[];
  privateCoreHoldState: VantaPrivateCoreHoldState | null;
  privateCoreOperatorBoundaryPrimaryNote: string | null | undefined;
  privateCoreOperatorBoundaryStatusLabel: string | null | undefined;
  privateCoreOperatorConsumeError: string | null | undefined;
  privateCoreOperatorConsumes: VantaPrivateCoreOperatorConsumeRecord[];
  privateCoreOperatorReleaseError: string | null | undefined;
  privateCoreOperatorReleases: VantaPrivateCoreOperatorReleaseRecord[];
  privateCoreOperatorRootCurrentnessLabel: string | null | undefined;
  privateCoreOperatorRootError: string | null | undefined;
  privateCoreOperatorRootRegistrationStatus: string | null | undefined;
  privateCoreOperatorRoots: VantaPrivateCoreOperatorRootRecord[];
  privateCoreRecentShield: VantaPrivateCoreShieldState | null | undefined;
  privateCoreReleaseCandidateState: VantaPrivateCoreReleaseCandidateState | null | undefined;
  privateCoreReleaseHandoffState: VantaPrivateCoreReleaseHandoffState | null | undefined;
  privateCoreReleaseWorkflowState: VantaPrivateCoreReleaseWorkflowState | null | undefined;
  privateCoreSendCompleted: boolean;
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null | undefined;
  runPrivateCoreReplayAttempt: () => unknown;
  runPrivateCoreUnshield: () => unknown;
  setPrivateCoreActionPending: (value: boolean) => void;
  statePanelProps: StatePanelProps;
};

export function UnshieldReleaseWorkflowPanel({
  latestPrivateCoreOperatorConsume,
  latestPrivateCoreOperatorRelease,
  privateCoreActionPending,
  privateCoreDemoSteps,
  privateCoreHoldState,
  privateCoreOperatorBoundaryPrimaryNote,
  privateCoreOperatorBoundaryStatusLabel,
  privateCoreOperatorConsumeError,
  privateCoreOperatorConsumes,
  privateCoreOperatorReleaseError,
  privateCoreOperatorReleases,
  privateCoreOperatorRootCurrentnessLabel,
  privateCoreOperatorRootError,
  privateCoreOperatorRootRegistrationStatus,
  privateCoreOperatorRoots,
  privateCoreRecentShield,
  privateCoreReleaseCandidateState,
  privateCoreReleaseHandoffState,
  privateCoreReleaseWorkflowState,
  privateCoreSendCompleted,
  privateCoreUnshieldState,
  runPrivateCoreReplayAttempt,
  runPrivateCoreUnshield,
  setPrivateCoreActionPending,
  statePanelProps,
}: UnshieldReleaseWorkflowPanelProps) {
  return (
      <article className="send-card" style={{ marginBottom: 24 }}>
        <div className="shield-card__header">
        <div>
          <span>Private release</span>
          <h3>Unshield lane</h3>
        </div>
          <small>
            {privateCoreRecentShield
              ? privateCoreOperatorBoundaryStatusLabel ?? "Ready for consume"
              : "Shield first"}
          </small>
        </div>

        <p className="shield-review-note">
          Recover the held private note, generate the release proof, and move value back to the
          public balance once.
        </p>

        <div className="review-list" style={{ marginBottom: 16 }}>
          {privateCoreDemoSteps.map((step, index) => (
            <div className="review-row" key={step.label}>
              <span>{`${index + 1}. ${step.label}`}</span>
              <strong>
                {step.status === "done" ? `Done · ${step.summary}` : step.summary}
              </strong>
            </div>
          ))}
          <div className="review-row">
            <span>5. Exact release candidate</span>
            <strong>
              {privateCoreReleaseCandidateState
                ? `${privateCoreReleaseCandidateState.lifecycleStatusLabel} · ${privateCoreReleaseCandidateState.lifecyclePrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting exact candidate summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>6. Operator boundary</span>
            <strong>
              {privateCoreOperatorBoundaryStatusLabel
                ? `${privateCoreOperatorBoundaryStatusLabel} · ${privateCoreOperatorBoundaryPrimaryNote ?? "No note"}`
                : "Awaiting operator summary"}
            </strong>
          </div>
          <div className="review-row">
            <span>7. Release workflow</span>
            <strong>
              {privateCoreReleaseWorkflowState
                ? `${privateCoreReleaseWorkflowState.shipStatusLabel} · ${privateCoreReleaseWorkflowState.shipPrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release workflow summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>8. Release handoff</span>
            <strong>
              {privateCoreReleaseHandoffState
                ? `${privateCoreReleaseHandoffState.handoffStatusLabel} · ${privateCoreReleaseHandoffState.handoffPrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release handoff summary"
                  : "Available after primary private send"}
            </strong>
          </div>
          <div className="review-row">
            <span>9. Release package</span>
            <strong>
              {privateCoreReleaseHandoffState
                ? `${privateCoreReleaseHandoffState.packageStatusLabel} · ${privateCoreReleaseHandoffState.packagePrimaryNote}`
                : privateCoreSendCompleted
                  ? "Awaiting release package summary"
                  : "Available after primary private send"}
            </strong>
          </div>
        </div>

        <VantaPrivateCoreStatePanel {...statePanelProps} />

        <div className="status-actions" style={{ marginTop: 16 }}>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setPrivateCoreActionPending(true);
              void Promise.resolve(runPrivateCoreUnshield()).finally(() => {
                setPrivateCoreActionPending(false);
              });
            }}
            disabled={
              privateCoreActionPending ||
              !privateCoreHoldState ||
              privateCoreUnshieldState?.consumeSucceeded === true
            }
          >
            {privateCoreActionPending ? "Generating proof..." : "Unshield private note"}
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              setPrivateCoreActionPending(true);
              void Promise.resolve(runPrivateCoreReplayAttempt()).finally(() => {
                setPrivateCoreActionPending(false);
              });
            }}
            disabled={
              privateCoreActionPending ||
              !privateCoreHoldState ||
              !privateCoreUnshieldState?.consumeSucceeded
            }
          >
            Attempt replay rejection
          </button>
        </div>

        {privateCoreUnshieldState && (
          <div
            className={
              privateCoreUnshieldState.consumeSucceeded
                ? "status-panel status-panel--success"
                : privateCoreUnshieldState.replayRejected
                  ? "status-panel status-panel--failed"
                  : "status-panel status-panel--warning"
            }
          >
            <span>
              {privateCoreUnshieldState.consumeSucceeded
                ? "Private note consumed"
                : privateCoreUnshieldState.replayRejected
                  ? "Replay rejected"
                  : "Unshield status"}
            </span>
            <p>
              {privateCoreUnshieldState.consumeSucceeded
                ? "Private note consumed; proof-backed operator release record recorded."
                : privateCoreUnshieldState.replayRejected
                  ? privateCoreUnshieldState.errorMessage ?? "Replay was rejected."
                  : privateCoreUnshieldState.errorMessage ?? "Waiting for the next action."}
            </p>
            <div className="review-list" style={{ marginTop: 12 }}>
              <div className="review-row">
                <span>Private funds</span>
                <strong>
                  {privateCoreUnshieldState.consumeSucceeded
                    ? "Exited once"
                    : privateCoreUnshieldState.replayRejected
                      ? "Second consume blocked"
                      : "Awaiting successful consume"}
                </strong>
              </div>
              <div className="review-row">
                <span>Replay protection</span>
                <strong>
                  {privateCoreUnshieldState.replayRejected
                    ? "Working"
                    : privateCoreUnshieldState.consumeSucceeded
                      ? "Ready to demonstrate"
                      : "Not yet exercised"}
                </strong>
              </div>
            </div>
            <details className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
              <summary>Internal proof diagnostics</summary>
              <div className="review-list" style={{ marginTop: 12 }}>
              <div className="review-row">
                <span>Source nullifier</span>
                <strong>{privateCoreUnshieldState.sourceNullifier ? abbreviate(privateCoreUnshieldState.sourceNullifier) : "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Source witness root</span>
                <strong>
                  {privateCoreHoldState?.sourceWitnessRoot
                    ? abbreviate(privateCoreHoldState.sourceWitnessRoot)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proof envelope</span>
                <strong>
                  {privateCoreUnshieldState.proofEnvelope
                    ? `${privateCoreUnshieldState.proofEnvelope.statement} · leaf ${privateCoreUnshieldState.proofEnvelope.publicInputs.leafIndex}`
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proving lane</span>
                <strong>{privateCoreUnshieldState.provingHashLane ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Proving root</span>
                <strong>
                  {privateCoreUnshieldState.provingStateRoot
                    ? abbreviate(privateCoreUnshieldState.provingStateRoot)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proving nullifier</span>
                <strong>
                  {privateCoreUnshieldState.provingNullifier
                    ? abbreviate(privateCoreUnshieldState.provingNullifier)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Consume context</span>
                <strong>
                  {privateCoreUnshieldState.provingConsumeContextTag
                    ? abbreviate(privateCoreUnshieldState.provingConsumeContextTag)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Proof execution</span>
                <strong>{privateCoreUnshieldState.proofExecutionStatus ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Proof shape</span>
                <strong>
                  {privateCoreUnshieldState.proofFieldCount && privateCoreUnshieldState.proofPublicInputCount
                    ? `${privateCoreUnshieldState.proofFieldCount} fields · ${privateCoreUnshieldState.proofPublicInputCount} public inputs`
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator consume records</span>
                <strong>
                  {privateCoreOperatorConsumeError
                    ? "Unavailable"
                    : privateCoreOperatorConsumes.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Latest operator nullifier</span>
                <strong>
                  {privateCoreOperatorConsumeError
                    ? privateCoreOperatorConsumeError
                    : latestPrivateCoreOperatorConsume?.nullifier
                      ? abbreviate(latestPrivateCoreOperatorConsume.nullifier)
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator release records</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? "Unavailable"
                    : privateCoreOperatorReleases.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Latest operator release</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.nullifier
                      ? abbreviate(latestPrivateCoreOperatorRelease.nullifier)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Immediate release request</span>
                <strong>
                  {privateCoreUnshieldState.operatorReleaseRequestId
                    ? abbreviate(privateCoreUnshieldState.operatorReleaseRequestId)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Immediate transition note</span>
                <strong>
                  {privateCoreUnshieldState.operatorReleaseTransitionNoteId
                    ? abbreviate(privateCoreUnshieldState.operatorReleaseTransitionNoteId)
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator release destination</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.releaseDestination
                      ? abbreviate(latestPrivateCoreOperatorRelease.releaseDestination)
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator released value</span>
                <strong>
                  {privateCoreOperatorReleaseError
                    ? privateCoreOperatorReleaseError
                    : latestPrivateCoreOperatorRelease?.releasedAmount &&
                        latestPrivateCoreOperatorRelease?.releasedAssetId
                      ? `${latestPrivateCoreOperatorRelease.releasedAmount} / ${abbreviate(latestPrivateCoreOperatorRelease.releasedAssetId)}`
                      : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Operator root registration</span>
                <strong>{privateCoreOperatorRootRegistrationStatus ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Operator root currentness</span>
                <strong>{privateCoreOperatorRootCurrentnessLabel ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Operator root records</span>
                <strong>
                  {privateCoreOperatorRootError
                    ? "Unavailable"
                    : privateCoreOperatorRoots.length.toString()}
                </strong>
              </div>
              <div className="review-row">
                <span>Consume status</span>
                <strong>
                  {privateCoreUnshieldState.consumeSucceeded
                    ? "Succeeded"
                    : privateCoreUnshieldState.replayRejected
                      ? "Replay blocked"
                      : "Failed"}
                </strong>
              </div>
            </div>
            </details>
          </div>
        )}
      </article>
  );
}
