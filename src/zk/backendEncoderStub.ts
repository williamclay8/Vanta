import {
  inspectCanonicalLifecycleAdapterPayloadFreeze,
  inspectCanonicalLifecycleWitnessMaterializationManifest,
  type CanonicalCircuitInputAdapterPayloadFreeze,
  type CanonicalCircuitInputWitnessMaterializationManifestRow,
} from "./canonicalCircuitInput";

export type BackendSpecificEncoderStubResultStatus =
  | "not-yet-encoded"
  | "unsupported-adapter"
  | "unsupported-version"
  | "unsupported-payload-kind";

export type BackendSpecificEncoderStubResult = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  accepted: boolean;
  status: BackendSpecificEncoderStubResultStatus;
  wouldConsumeRowCount: number;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderWorkItemKind =
  | "direct-encode-item"
  | "split-encode-item"
  | "width-resolve-encode-item"
  | "blocked";

export type BackendSpecificEncoderWorkItem = {
  workItemIndex: number;
  materializationIndex: number;
  witnessIndex: number;
  action: string;
  familyHint: string;
  sectionName: string;
  slotLabel: string;
  kind: BackendSpecificEncoderWorkItemKind;
  actionable: boolean;
  summary: string;
  blockedReason?: string;
};

export type BackendSpecificEncoderWorkItemManifest = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  accepted: boolean;
  workItems: BackendSpecificEncoderWorkItem[];
  blockedItems: BackendSpecificEncoderWorkItem[];
  workItemCount: number;
  blockedItemCount: number;
  summary: string;
};

export type BackendSpecificEncoderExecutionBatchKind =
  | "direct-encode-batch"
  | "split-encode-batch"
  | "width-resolve-batch"
  | "blocked";

export type BackendSpecificEncoderExecutionBatch = {
  batchIndex: number;
  kind: BackendSpecificEncoderExecutionBatchKind;
  actionable: boolean;
  memberWorkItems: BackendSpecificEncoderWorkItem[];
  firstWorkItemIndex: number;
  lastWorkItemIndex: number;
  sectionName: string;
  summary: string;
  blockedReason?: string;
};

export type BackendSpecificEncoderExecutionPlan = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  accepted: boolean;
  batches: BackendSpecificEncoderExecutionBatch[];
  blockedBatches: BackendSpecificEncoderExecutionBatch[];
  batchCount: number;
  blockedBatchCount: number;
  summary: string;
};

export type BackendSpecificEncoderDispatchRequestKind =
  | "direct-encode-dispatch"
  | "split-encode-dispatch"
  | "width-resolve-dispatch"
  | "blocked";

export type BackendSpecificEncoderDispatchRequest = {
  requestKind: "vanta-backend-encoder-dispatch-request-v1";
  requestVersion: 1;
  requestIndex: number;
  kind: BackendSpecificEncoderDispatchRequestKind;
  sourceBatchIndex: number;
  sourceBatchKind: BackendSpecificEncoderExecutionBatchKind;
  firstWorkItemIndex: number;
  lastWorkItemIndex: number;
  sectionName: string;
  actionable: boolean;
  summary: string;
  blockedReason?: string;
};

export type BackendSpecificEncoderDispatchContract = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  accepted: boolean;
  requests: BackendSpecificEncoderDispatchRequest[];
  blockedRequests: BackendSpecificEncoderDispatchRequest[];
  requestCount: number;
  blockedRequestCount: number;
  summary: string;
};

export type BackendSpecificEncoderDispatchAckStatus =
  | "accepted"
  | "blocked"
  | "unsupported-request-kind"
  | "unsupported-request-version"
  | "not-yet-encoded";

export type BackendSpecificEncoderDispatchAckEntry = {
  requestIndex: number;
  requestKind: BackendSpecificEncoderDispatchRequest["requestKind"];
  requestVersion: BackendSpecificEncoderDispatchRequest["requestVersion"];
  dispatchKind: BackendSpecificEncoderDispatchRequestKind;
  sourceBatchIndex: number;
  accepted: boolean;
  status: BackendSpecificEncoderDispatchAckStatus;
  summary: string;
  reason?: string;
};

export type BackendSpecificEncoderDispatchAckContract = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  entries: BackendSpecificEncoderDispatchAckEntry[];
  acceptedCount: number;
  blockedCount: number;
  unsupportedCount: number;
  summary: string;
};

export type BackendSpecificEncoderDispatchReadinessStatus =
  | "ready"
  | "blocked"
  | "unsupported"
  | "empty";

export type BackendSpecificEncoderDispatchReadiness = {
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  status: BackendSpecificEncoderDispatchReadinessStatus;
  readyToEncode: boolean;
  acceptedCount: number;
  blockedCount: number;
  unsupportedCount: number;
  contributingStatuses: BackendSpecificEncoderDispatchAckStatus[];
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderSessionTicketStatus =
  | "issued"
  | "not-issued"
  | "blocked";

export type BackendSpecificEncoderSessionTicket = {
  ticketKind: "vanta-backend-encoder-session-ticket-v1";
  ticketVersion: 1;
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  status: BackendSpecificEncoderSessionTicketStatus;
  issued: boolean;
  readinessStatus: BackendSpecificEncoderDispatchReadinessStatus;
  acceptedDispatchCount: number;
  blockedDispatchCount: number;
  unsupportedDispatchCount: number;
  summary: string;
  reason?: string;
};

export type BackendSpecificEncoderPreflightStatus =
  | "would-proceed"
  | "blocked"
  | "not-issued";

export type BackendSpecificEncoderPreflightReport = {
  reportKind: "vanta-backend-encoder-preflight-report-v1";
  reportVersion: 1;
  encoderId: string;
  encoderLabel: string;
  payloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  payloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  adapterId: string;
  ticketKind: BackendSpecificEncoderSessionTicket["ticketKind"];
  ticketVersion: BackendSpecificEncoderSessionTicket["ticketVersion"];
  ticketStatus: BackendSpecificEncoderSessionTicketStatus;
  readinessStatus: BackendSpecificEncoderDispatchReadinessStatus;
  status: BackendSpecificEncoderPreflightStatus;
  wouldProceed: boolean;
  acceptedDispatchCount: number;
  blockedDispatchCount: number;
  unsupportedDispatchCount: number;
  dispatchFootprintSummary: string;
  blockedReasons: string[];
  summary: string;
};

export type BackendSpecificEncoderPreflightFreeze = {
  snapshotKind: "vanta-backend-encoder-preflight-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderPreflightStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderOrchestrationHandoffStatus =
  | "handoff-ready"
  | "handoff-blocked"
  | "handoff-not-issued";

export type BackendSpecificEncoderOrchestrationHandoff = {
  handoffKind: "vanta-backend-encoder-orchestration-handoff-v1";
  handoffVersion: 1;
  encoderId: string;
  encoderLabel: string;
  preflightSnapshotKind: BackendSpecificEncoderPreflightFreeze["snapshotKind"];
  preflightSnapshotVersion: BackendSpecificEncoderPreflightFreeze["snapshotVersion"];
  preflightStatus: BackendSpecificEncoderPreflightStatus;
  status: BackendSpecificEncoderOrchestrationHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderOrchestrationHandoffFreeze = {
  snapshotKind: "vanta-backend-encoder-orchestration-handoff-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderOrchestrationHandoffStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerIntakeStatus =
  | "intake-ready"
  | "intake-blocked"
  | "intake-not-issued";

export type BackendSpecificEncoderRunnerIntake = {
  intakeKind: "vanta-backend-encoder-runner-intake-v1";
  intakeVersion: 1;
  encoderId: string;
  encoderLabel: string;
  handoffSnapshotKind: BackendSpecificEncoderOrchestrationHandoffFreeze["snapshotKind"];
  handoffSnapshotVersion: BackendSpecificEncoderOrchestrationHandoffFreeze["snapshotVersion"];
  handoffStatus: BackendSpecificEncoderOrchestrationHandoffStatus;
  status: BackendSpecificEncoderRunnerIntakeStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerIntakeFreeze = {
  snapshotKind: "vanta-backend-encoder-runner-intake-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerIntakeStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerLaunchEnvelopeStatus =
  | "launch-ready"
  | "launch-blocked"
  | "launch-not-issued";

export type BackendSpecificEncoderRunnerLaunchEnvelope = {
  envelopeKind: "vanta-backend-encoder-runner-launch-envelope-v1";
  envelopeVersion: 1;
  encoderId: string;
  encoderLabel: string;
  intakeSnapshotKind: BackendSpecificEncoderRunnerIntakeFreeze["snapshotKind"];
  intakeSnapshotVersion: BackendSpecificEncoderRunnerIntakeFreeze["snapshotVersion"];
  intakeStatus: BackendSpecificEncoderRunnerIntakeStatus;
  status: BackendSpecificEncoderRunnerLaunchEnvelopeStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerLaunchEnvelopeFreeze = {
  snapshotKind: "vanta-backend-encoder-runner-launch-envelope-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerLaunchEnvelopeStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerStartTicketStatus =
  | "start-ready"
  | "start-blocked"
  | "start-not-issued";

export type BackendSpecificEncoderRunnerStartTicket = {
  ticketKind: "vanta-backend-encoder-runner-start-ticket-v1";
  ticketVersion: 1;
  encoderId: string;
  encoderLabel: string;
  launchSnapshotKind: BackendSpecificEncoderRunnerLaunchEnvelopeFreeze["snapshotKind"];
  launchSnapshotVersion: BackendSpecificEncoderRunnerLaunchEnvelopeFreeze["snapshotVersion"];
  launchStatus: BackendSpecificEncoderRunnerLaunchEnvelopeStatus;
  status: BackendSpecificEncoderRunnerStartTicketStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerStartTicketFreeze = {
  snapshotKind: "vanta-backend-encoder-runner-start-ticket-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerStartTicketStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerStartTicketFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  ticketKind: BackendSpecificEncoderRunnerStartTicket["ticketKind"];
  ticketVersion: BackendSpecificEncoderRunnerStartTicket["ticketVersion"];
  status: BackendSpecificEncoderRunnerStartTicket["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionInputStatus =
  | "execution-input-ready"
  | "execution-input-blocked"
  | "execution-input-not-issued";

export type BackendSpecificEncoderRunnerExecutionInput = {
  inputKind: "vanta-backend-encoder-runner-execution-input-v1";
  inputVersion: 1;
  encoderId: string;
  encoderLabel: string;
  startSnapshotKind: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotKind"];
  startSnapshotVersion: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotVersion"];
  startStatus: BackendSpecificEncoderRunnerStartTicketStatus;
  status: BackendSpecificEncoderRunnerExecutionInputStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionInputMetadata = {
  inputKind: BackendSpecificEncoderRunnerExecutionInput["inputKind"];
  inputVersion: BackendSpecificEncoderRunnerExecutionInput["inputVersion"];
  encoderId: string;
  encoderLabel: string;
  startSnapshotKind: BackendSpecificEncoderRunnerExecutionInput["startSnapshotKind"];
  startSnapshotVersion: BackendSpecificEncoderRunnerExecutionInput["startSnapshotVersion"];
  status: BackendSpecificEncoderRunnerExecutionInput["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionEntryPlanStatus =
  | "plan-ready"
  | "plan-blocked"
  | "plan-not-issued";

export type BackendSpecificEncoderRunnerExecutionEntryPlan = {
  planKind: "vanta-backend-encoder-runner-execution-entry-plan-v1";
  planVersion: 1;
  encoderId: string;
  encoderLabel: string;
  inputKind: BackendSpecificEncoderRunnerExecutionInput["inputKind"];
  inputVersion: BackendSpecificEncoderRunnerExecutionInput["inputVersion"];
  startSnapshotKind: BackendSpecificEncoderRunnerExecutionInput["startSnapshotKind"];
  startSnapshotVersion: BackendSpecificEncoderRunnerExecutionInput["startSnapshotVersion"];
  inputStatus: BackendSpecificEncoderRunnerExecutionInputStatus;
  status: BackendSpecificEncoderRunnerExecutionEntryPlanStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionEntryPlanMetadata = {
  planKind: BackendSpecificEncoderRunnerExecutionEntryPlan["planKind"];
  planVersion: BackendSpecificEncoderRunnerExecutionEntryPlan["planVersion"];
  encoderId: string;
  encoderLabel: string;
  inputKind: BackendSpecificEncoderRunnerExecutionEntryPlan["inputKind"];
  inputVersion: BackendSpecificEncoderRunnerExecutionEntryPlan["inputVersion"];
  status: BackendSpecificEncoderRunnerExecutionEntryPlan["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionEntryPlanFreeze = {
  snapshotKind: "vanta-backend-encoder-runner-execution-entry-plan-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerExecutionEntryPlanStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionEntryPlanFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  planKind: BackendSpecificEncoderRunnerExecutionEntryPlan["planKind"];
  planVersion: BackendSpecificEncoderRunnerExecutionEntryPlan["planVersion"];
  status: BackendSpecificEncoderRunnerExecutionEntryPlan["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionSessionStatus =
  | "session-ready"
  | "session-blocked"
  | "session-not-issued";

export type BackendSpecificEncoderRunnerExecutionSession = {
  sessionKind: "vanta-backend-encoder-runner-execution-session-v1";
  sessionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  entrySnapshotKind: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotKind"];
  entrySnapshotVersion: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotVersion"];
  planStatus: BackendSpecificEncoderRunnerExecutionEntryPlanStatus;
  status: BackendSpecificEncoderRunnerExecutionSessionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionSessionMetadata = {
  sessionKind: BackendSpecificEncoderRunnerExecutionSession["sessionKind"];
  sessionVersion: BackendSpecificEncoderRunnerExecutionSession["sessionVersion"];
  encoderId: string;
  encoderLabel: string;
  entrySnapshotKind: BackendSpecificEncoderRunnerExecutionSession["entrySnapshotKind"];
  entrySnapshotVersion: BackendSpecificEncoderRunnerExecutionSession["entrySnapshotVersion"];
  status: BackendSpecificEncoderRunnerExecutionSession["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionSessionFreeze = {
  snapshotKind: "vanta-backend-encoder-runner-execution-session-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerExecutionSessionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRunnerExecutionSessionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  sessionKind: BackendSpecificEncoderRunnerExecutionSession["sessionKind"];
  sessionVersion: BackendSpecificEncoderRunnerExecutionSession["sessionVersion"];
  status: BackendSpecificEncoderRunnerExecutionSession["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderEncodingAdmissionStatus =
  | "admission-ready"
  | "admission-blocked"
  | "admission-not-issued";

export type BackendSpecificEncoderEncodingAdmission = {
  admissionKind: "vanta-backend-encoder-encoding-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  sessionSnapshotKind: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotKind"];
  sessionSnapshotVersion: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotVersion"];
  sessionStatus: BackendSpecificEncoderRunnerExecutionSessionStatus;
  status: BackendSpecificEncoderEncodingAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderEncodingAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderEncodingAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderEncodingAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  sessionSnapshotKind: BackendSpecificEncoderEncodingAdmission["sessionSnapshotKind"];
  sessionSnapshotVersion: BackendSpecificEncoderEncodingAdmission["sessionSnapshotVersion"];
  status: BackendSpecificEncoderEncodingAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderEncodingAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-encoding-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderEncodingAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderEncodingAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderEncodingAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderEncodingAdmission["admissionVersion"];
  status: BackendSpecificEncoderEncodingAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldEncodingStartStatus =
  | "field-encoding-start-ready"
  | "field-encoding-start-blocked"
  | "field-encoding-start-not-issued";

export type BackendSpecificEncoderFieldEncodingStart = {
  startKind: "vanta-backend-encoder-field-encoding-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  admissionSnapshotKind: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotKind"];
  admissionSnapshotVersion: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotVersion"];
  admissionStatus: BackendSpecificEncoderEncodingAdmissionStatus;
  status: BackendSpecificEncoderFieldEncodingStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldEncodingStartMetadata = {
  startKind: BackendSpecificEncoderFieldEncodingStart["startKind"];
  startVersion: BackendSpecificEncoderFieldEncodingStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionSnapshotKind: BackendSpecificEncoderFieldEncodingStart["admissionSnapshotKind"];
  admissionSnapshotVersion: BackendSpecificEncoderFieldEncodingStart["admissionSnapshotVersion"];
  status: BackendSpecificEncoderFieldEncodingStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldEncodingStartFreeze = {
  snapshotKind: "vanta-backend-encoder-field-encoding-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldEncodingStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldEncodingStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderFieldEncodingStart["startKind"];
  startVersion: BackendSpecificEncoderFieldEncodingStart["startVersion"];
  status: BackendSpecificEncoderFieldEncodingStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationAdmissionStatus =
  | "field-materialization-admission-ready"
  | "field-materialization-admission-blocked"
  | "field-materialization-admission-not-issued";

export type BackendSpecificEncoderFieldMaterializationAdmission = {
  admissionKind: "vanta-backend-encoder-field-materialization-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldEntrySnapshotKind: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotKind"];
  fieldEntrySnapshotVersion: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotVersion"];
  fieldEntryStatus: BackendSpecificEncoderFieldEncodingStartStatus;
  status: BackendSpecificEncoderFieldMaterializationAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderFieldMaterializationAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderFieldMaterializationAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldEntrySnapshotKind: BackendSpecificEncoderFieldMaterializationAdmission["fieldEntrySnapshotKind"];
  fieldEntrySnapshotVersion: BackendSpecificEncoderFieldMaterializationAdmission["fieldEntrySnapshotVersion"];
  status: BackendSpecificEncoderFieldMaterializationAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderFieldMaterializationAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderFieldMaterializationAdmission["admissionVersion"];
  status: BackendSpecificEncoderFieldMaterializationAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldRowMaterializationStartStatus =
  | "field-row-materialization-start-ready"
  | "field-row-materialization-start-blocked"
  | "field-row-materialization-start-not-issued";

export type BackendSpecificEncoderFieldRowMaterializationStart = {
  startKind: "vanta-backend-encoder-field-row-materialization-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationSnapshotKind:
    BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotKind"];
  fieldMaterializationSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotVersion"];
  fieldMaterializationStatus: BackendSpecificEncoderFieldMaterializationAdmissionStatus;
  status: BackendSpecificEncoderFieldRowMaterializationStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldRowMaterializationStartMetadata = {
  startKind: BackendSpecificEncoderFieldRowMaterializationStart["startKind"];
  startVersion: BackendSpecificEncoderFieldRowMaterializationStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationSnapshotKind:
    BackendSpecificEncoderFieldRowMaterializationStart["fieldMaterializationSnapshotKind"];
  fieldMaterializationSnapshotVersion:
    BackendSpecificEncoderFieldRowMaterializationStart["fieldMaterializationSnapshotVersion"];
  status: BackendSpecificEncoderFieldRowMaterializationStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldRowMaterializationStartFreeze = {
  snapshotKind: "vanta-backend-encoder-field-row-materialization-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldRowMaterializationStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldRowMaterializationStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderFieldRowMaterializationStart["startKind"];
  startVersion: BackendSpecificEncoderFieldRowMaterializationStart["startVersion"];
  status: BackendSpecificEncoderFieldRowMaterializationStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRowMaterializationAdmissionStatus =
  | "row-materialization-admission-ready"
  | "row-materialization-admission-blocked"
  | "row-materialization-admission-not-issued";

export type BackendSpecificEncoderRowMaterializationAdmission = {
  admissionKind: "vanta-backend-encoder-row-materialization-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldRowEntrySnapshotKind:
    BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotKind"];
  fieldRowEntrySnapshotVersion:
    BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotVersion"];
  fieldRowEntryStatus: BackendSpecificEncoderFieldRowMaterializationStartStatus;
  status: BackendSpecificEncoderRowMaterializationAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRowMaterializationAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderRowMaterializationAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderRowMaterializationAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldRowEntrySnapshotKind:
    BackendSpecificEncoderRowMaterializationAdmission["fieldRowEntrySnapshotKind"];
  fieldRowEntrySnapshotVersion:
    BackendSpecificEncoderRowMaterializationAdmission["fieldRowEntrySnapshotVersion"];
  status: BackendSpecificEncoderRowMaterializationAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRowMaterializationAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-row-materialization-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowMaterializationAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRowMaterializationAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderRowMaterializationAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderRowMaterializationAdmission["admissionVersion"];
  status: BackendSpecificEncoderRowMaterializationAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRowLaneMaterializationStartStatus =
  | "row-lane-materialization-start-ready"
  | "row-lane-materialization-start-blocked"
  | "row-lane-materialization-start-not-issued";

export type BackendSpecificEncoderRowLaneMaterializationStart = {
  startKind: "vanta-backend-encoder-row-lane-materialization-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  rowMaterializationSnapshotKind:
    BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotKind"];
  rowMaterializationSnapshotVersion:
    BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotVersion"];
  rowMaterializationStatus: BackendSpecificEncoderRowMaterializationAdmissionStatus;
  status: BackendSpecificEncoderRowLaneMaterializationStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRowLaneMaterializationStartMetadata = {
  startKind: BackendSpecificEncoderRowLaneMaterializationStart["startKind"];
  startVersion: BackendSpecificEncoderRowLaneMaterializationStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  rowMaterializationSnapshotKind:
    BackendSpecificEncoderRowLaneMaterializationStart["rowMaterializationSnapshotKind"];
  rowMaterializationSnapshotVersion:
    BackendSpecificEncoderRowLaneMaterializationStart["rowMaterializationSnapshotVersion"];
  status: BackendSpecificEncoderRowLaneMaterializationStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRowLaneMaterializationStartFreeze = {
  snapshotKind: "vanta-backend-encoder-row-lane-materialization-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowLaneMaterializationStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRowLaneMaterializationStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderRowLaneMaterializationStart["startKind"];
  startVersion: BackendSpecificEncoderRowLaneMaterializationStart["startVersion"];
  status: BackendSpecificEncoderRowLaneMaterializationStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionAdmissionStatus =
  | "row-field-emission-admission-ready"
  | "row-field-emission-admission-blocked"
  | "row-field-emission-admission-not-issued";

export type BackendSpecificEncoderRowFieldEmissionAdmission = {
  admissionKind: "vanta-backend-encoder-row-field-emission-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  rowLaneEntrySnapshotKind:
    BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotKind"];
  rowLaneEntrySnapshotVersion:
    BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotVersion"];
  rowLaneEntryStatus: BackendSpecificEncoderRowLaneMaterializationStartStatus;
  status: BackendSpecificEncoderRowFieldEmissionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderRowFieldEmissionAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderRowFieldEmissionAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  rowLaneEntrySnapshotKind:
    BackendSpecificEncoderRowFieldEmissionAdmission["rowLaneEntrySnapshotKind"];
  rowLaneEntrySnapshotVersion:
    BackendSpecificEncoderRowFieldEmissionAdmission["rowLaneEntrySnapshotVersion"];
  status: BackendSpecificEncoderRowFieldEmissionAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-row-field-emission-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowFieldEmissionAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderRowFieldEmissionAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderRowFieldEmissionAdmission["admissionVersion"];
  status: BackendSpecificEncoderRowFieldEmissionAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionStartStatus =
  | "row-field-emission-start-ready"
  | "row-field-emission-start-blocked"
  | "row-field-emission-start-not-issued";

export type BackendSpecificEncoderRowFieldEmissionStart = {
  startKind: "vanta-backend-encoder-row-field-emission-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  rowFieldEmissionSnapshotKind:
    BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotKind"];
  rowFieldEmissionSnapshotVersion:
    BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotVersion"];
  rowFieldEmissionStatus: BackendSpecificEncoderRowFieldEmissionAdmissionStatus;
  status: BackendSpecificEncoderRowFieldEmissionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionStartMetadata = {
  startKind: BackendSpecificEncoderRowFieldEmissionStart["startKind"];
  startVersion: BackendSpecificEncoderRowFieldEmissionStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  rowFieldEmissionSnapshotKind:
    BackendSpecificEncoderRowFieldEmissionStart["rowFieldEmissionSnapshotKind"];
  rowFieldEmissionSnapshotVersion:
    BackendSpecificEncoderRowFieldEmissionStart["rowFieldEmissionSnapshotVersion"];
  status: BackendSpecificEncoderRowFieldEmissionStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionStartFreeze = {
  snapshotKind: "vanta-backend-encoder-row-field-emission-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowFieldEmissionStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderRowFieldEmissionStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderRowFieldEmissionStart["startKind"];
  startVersion: BackendSpecificEncoderRowFieldEmissionStart["startVersion"];
  status: BackendSpecificEncoderRowFieldEmissionStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionAdmissionStatus =
  | "field-lane-execution-admission-ready"
  | "field-lane-execution-admission-blocked"
  | "field-lane-execution-admission-not-issued";

export type BackendSpecificEncoderFieldLaneExecutionAdmission = {
  admissionKind: "vanta-backend-encoder-field-lane-execution-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  rowFieldEmissionSnapshotKind:
    BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotKind"];
  rowFieldEmissionSnapshotVersion:
    BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotVersion"];
  rowFieldEmissionStatus: BackendSpecificEncoderRowFieldEmissionStartStatus;
  status: BackendSpecificEncoderFieldLaneExecutionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderFieldLaneExecutionAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderFieldLaneExecutionAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  rowFieldEmissionSnapshotKind:
    BackendSpecificEncoderFieldLaneExecutionAdmission["rowFieldEmissionSnapshotKind"];
  rowFieldEmissionSnapshotVersion:
    BackendSpecificEncoderFieldLaneExecutionAdmission["rowFieldEmissionSnapshotVersion"];
  status: BackendSpecificEncoderFieldLaneExecutionAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-field-lane-execution-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldLaneExecutionAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderFieldLaneExecutionAdmission["admissionKind"];
  admissionVersion: BackendSpecificEncoderFieldLaneExecutionAdmission["admissionVersion"];
  status: BackendSpecificEncoderFieldLaneExecutionAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionStartStatus =
  | "field-lane-execution-start-ready"
  | "field-lane-execution-start-blocked"
  | "field-lane-execution-start-not-issued";

export type BackendSpecificEncoderFieldLaneExecutionStart = {
  startKind: "vanta-backend-encoder-field-lane-execution-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldLaneSnapshotKind:
    BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotKind"];
  fieldLaneSnapshotVersion:
    BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotVersion"];
  fieldLaneStatus: BackendSpecificEncoderFieldLaneExecutionAdmissionStatus;
  status: BackendSpecificEncoderFieldLaneExecutionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionStartMetadata = {
  startKind: BackendSpecificEncoderFieldLaneExecutionStart["startKind"];
  startVersion: BackendSpecificEncoderFieldLaneExecutionStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldLaneSnapshotKind:
    BackendSpecificEncoderFieldLaneExecutionStart["fieldLaneSnapshotKind"];
  fieldLaneSnapshotVersion:
    BackendSpecificEncoderFieldLaneExecutionStart["fieldLaneSnapshotVersion"];
  status: BackendSpecificEncoderFieldLaneExecutionStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionStartFreeze = {
  snapshotKind: "vanta-backend-encoder-field-lane-execution-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldLaneExecutionStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldLaneExecutionStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderFieldLaneExecutionStart["startKind"];
  startVersion: BackendSpecificEncoderFieldLaneExecutionStart["startVersion"];
  status: BackendSpecificEncoderFieldLaneExecutionStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchAdmissionStatus =
  | "field-materialization-launch-admission-ready"
  | "field-materialization-launch-admission-blocked"
  | "field-materialization-launch-admission-not-issued";

export type BackendSpecificEncoderFieldMaterializationLaunchAdmission = {
  admissionKind: "vanta-backend-encoder-field-materialization-launch-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldLaneExecutionSnapshotKind:
    BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotKind"];
  fieldLaneExecutionSnapshotVersion:
    BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotVersion"];
  fieldLaneExecutionStatus: BackendSpecificEncoderFieldLaneExecutionStartStatus;
  status: BackendSpecificEncoderFieldMaterializationLaunchAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderFieldMaterializationLaunchAdmission["admissionKind"];
  admissionVersion:
    BackendSpecificEncoderFieldMaterializationLaunchAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldLaneExecutionSnapshotKind:
    BackendSpecificEncoderFieldMaterializationLaunchAdmission["fieldLaneExecutionSnapshotKind"];
  fieldLaneExecutionSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchAdmission["fieldLaneExecutionSnapshotVersion"];
  status: BackendSpecificEncoderFieldMaterializationLaunchAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-launch-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationLaunchAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderFieldMaterializationLaunchAdmission["admissionKind"];
  admissionVersion:
    BackendSpecificEncoderFieldMaterializationLaunchAdmission["admissionVersion"];
  status: BackendSpecificEncoderFieldMaterializationLaunchAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchStartStatus =
  | "field-materialization-launch-start-ready"
  | "field-materialization-launch-start-blocked"
  | "field-materialization-launch-start-not-issued";

export type BackendSpecificEncoderFieldMaterializationLaunchStart = {
  startKind: "vanta-backend-encoder-field-materialization-launch-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationLaunchSnapshotKind:
    BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotKind"];
  fieldMaterializationLaunchSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotVersion"];
  fieldMaterializationLaunchStatus:
    BackendSpecificEncoderFieldMaterializationLaunchAdmissionStatus;
  status: BackendSpecificEncoderFieldMaterializationLaunchStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchStartMetadata = {
  startKind: BackendSpecificEncoderFieldMaterializationLaunchStart["startKind"];
  startVersion: BackendSpecificEncoderFieldMaterializationLaunchStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationLaunchSnapshotKind:
    BackendSpecificEncoderFieldMaterializationLaunchStart["fieldMaterializationLaunchSnapshotKind"];
  fieldMaterializationLaunchSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchStart["fieldMaterializationLaunchSnapshotVersion"];
  status: BackendSpecificEncoderFieldMaterializationLaunchStart["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchStartFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-launch-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationLaunchStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationLaunchStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderFieldMaterializationLaunchStart["startKind"];
  startVersion: BackendSpecificEncoderFieldMaterializationLaunchStart["startVersion"];
  status: BackendSpecificEncoderFieldMaterializationLaunchStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionAdmissionStatus =
  | "field-materialization-execution-admission-ready"
  | "field-materialization-execution-admission-blocked"
  | "field-materialization-execution-admission-not-issued";

export type BackendSpecificEncoderFieldMaterializationExecutionAdmission = {
  admissionKind: "vanta-backend-encoder-field-materialization-execution-admission-v1";
  admissionVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationLaunchSnapshotKind:
    BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotKind"];
  fieldMaterializationLaunchSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotVersion"];
  fieldMaterializationLaunchStatus:
    BackendSpecificEncoderFieldMaterializationLaunchStartStatus;
  status: BackendSpecificEncoderFieldMaterializationExecutionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionAdmissionMetadata = {
  admissionKind: BackendSpecificEncoderFieldMaterializationExecutionAdmission["admissionKind"];
  admissionVersion:
    BackendSpecificEncoderFieldMaterializationExecutionAdmission["admissionVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationLaunchSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionAdmission["fieldMaterializationLaunchSnapshotKind"];
  fieldMaterializationLaunchSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionAdmission["fieldMaterializationLaunchSnapshotVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionAdmission["status"];
  proceedable: boolean;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-execution-admission-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionAdmissionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  admissionKind: BackendSpecificEncoderFieldMaterializationExecutionAdmission["admissionKind"];
  admissionVersion:
    BackendSpecificEncoderFieldMaterializationExecutionAdmission["admissionVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionAdmission["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionStartStatus =
  | "field-materialization-execution-start-ready"
  | "field-materialization-execution-start-blocked"
  | "field-materialization-execution-start-not-issued";

export type BackendSpecificEncoderFieldMaterializationExecutionStart = {
  startKind: "vanta-backend-encoder-field-materialization-execution-start-v1";
  startVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotKind"];
  fieldMaterializationExecutionSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotVersion"];
  fieldMaterializationExecutionStatus:
    BackendSpecificEncoderFieldMaterializationExecutionAdmissionStatus;
  status: BackendSpecificEncoderFieldMaterializationExecutionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionStartMetadata = {
  startKind: BackendSpecificEncoderFieldMaterializationExecutionStart["startKind"];
  startVersion: BackendSpecificEncoderFieldMaterializationExecutionStart["startVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionStart["fieldMaterializationExecutionSnapshotKind"];
  fieldMaterializationExecutionSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionStart["fieldMaterializationExecutionSnapshotVersion"];
  fieldMaterializationExecutionStatus:
    BackendSpecificEncoderFieldMaterializationExecutionStart["fieldMaterializationExecutionStatus"];
  status: BackendSpecificEncoderFieldMaterializationExecutionStart["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionStartFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-execution-start-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionStartStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionStartFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  startKind: BackendSpecificEncoderFieldMaterializationExecutionStart["startKind"];
  startVersion: BackendSpecificEncoderFieldMaterializationExecutionStart["startVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionStart["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus =
  | "field-materialization-work-envelope-ready"
  | "field-materialization-work-envelope-blocked"
  | "field-materialization-work-envelope-not-issued";

export type BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope = {
  envelopeKind: "vanta-backend-encoder-field-materialization-work-envelope-v1";
  envelopeVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionStartSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotKind"];
  fieldMaterializationExecutionStartSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotVersion"];
  fieldMaterializationExecutionStartStatus:
    BackendSpecificEncoderFieldMaterializationExecutionStartStatus;
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeMetadata = {
  envelopeKind:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["envelopeKind"];
  envelopeVersion:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["envelopeVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionStartSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["fieldMaterializationExecutionStartSnapshotKind"];
  fieldMaterializationExecutionStartSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["fieldMaterializationExecutionStartSnapshotVersion"];
  fieldMaterializationExecutionStartStatus:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["fieldMaterializationExecutionStartStatus"];
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-execution-work-envelope-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadata = {
  snapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  envelopeKind:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["envelopeKind"];
  envelopeVersion:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["envelopeVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanStatus =
  | "field-materialization-execution-plan-ready"
  | "field-materialization-execution-plan-blocked"
  | "field-materialization-execution-plan-not-issued";

export type BackendSpecificEncoderFieldMaterializationExecutionPlan = {
  planKind: "vanta-backend-encoder-field-materialization-execution-plan-v1";
  planVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionWorkEnvelopeSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotKind"];
  fieldMaterializationExecutionWorkEnvelopeSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotVersion"];
  fieldMaterializationExecutionWorkEnvelopeStatus:
    BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanMetadata = {
  planKind: BackendSpecificEncoderFieldMaterializationExecutionPlan["planKind"];
  planVersion: BackendSpecificEncoderFieldMaterializationExecutionPlan["planVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionWorkEnvelopeSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlan["fieldMaterializationExecutionWorkEnvelopeSnapshotKind"];
  fieldMaterializationExecutionWorkEnvelopeSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlan["fieldMaterializationExecutionWorkEnvelopeSnapshotVersion"];
  fieldMaterializationExecutionWorkEnvelopeStatus:
    BackendSpecificEncoderFieldMaterializationExecutionPlan["fieldMaterializationExecutionWorkEnvelopeStatus"];
  status: BackendSpecificEncoderFieldMaterializationExecutionPlan["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-execution-plan-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  planKind: BackendSpecificEncoderFieldMaterializationExecutionPlan["planKind"];
  planVersion: BackendSpecificEncoderFieldMaterializationExecutionPlan["planVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionPlan["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus =
  | "field-materialization-plan-handoff-ready"
  | "field-materialization-plan-handoff-blocked"
  | "field-materialization-plan-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff = {
  handoffKind: "vanta-backend-encoder-field-materialization-plan-handoff-v1";
  handoffVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionPlanSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotKind"];
  fieldMaterializationExecutionPlanSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotVersion"];
  fieldMaterializationExecutionPlanStatus:
    BackendSpecificEncoderFieldMaterializationExecutionPlanStatus;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffMetadata = {
  handoffKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["handoffKind"];
  handoffVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["handoffVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionPlanSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["fieldMaterializationExecutionPlanSnapshotKind"];
  fieldMaterializationExecutionPlanSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["fieldMaterializationExecutionPlanSnapshotVersion"];
  fieldMaterializationExecutionPlanStatus:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["fieldMaterializationExecutionPlanStatus"];
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-execution-plan-handoff-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreezeMetadata = {
  snapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  handoffKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["handoffKind"];
  handoffVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["handoffVersion"];
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus =
  | "field-materialization-planning-consumer-ready"
  | "field-materialization-planning-consumer-blocked"
  | "field-materialization-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationPlanningConsumer = {
  artifactKind: "vanta-backend-encoder-field-materialization-planning-consumer-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionPlanHandoffSnapshotKind:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotKind"];
  fieldMaterializationExecutionPlanHandoffSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotVersion"];
  fieldMaterializationExecutionPlanHandoffStatus:
    BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerMetadata = {
  artifactKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["artifactKind"];
  artifactVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationExecutionPlanHandoffSnapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["fieldMaterializationExecutionPlanHandoffSnapshotKind"];
  fieldMaterializationExecutionPlanHandoffSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["fieldMaterializationExecutionPlanHandoffSnapshotVersion"];
  fieldMaterializationExecutionPlanHandoffStatus:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["fieldMaterializationExecutionPlanHandoffStatus"];
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumer["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-planning-consumer-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerFreezeMetadata = {
  snapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["artifactKind"];
  artifactVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumer["artifactVersion"];
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumer["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus =
  | "field-materialization-planning-consumer-handoff-ready"
  | "field-materialization-planning-consumer-handoff-blocked"
  | "field-materialization-planning-consumer-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff = {
  handoffKind: "vanta-backend-encoder-field-materialization-planning-consumer-handoff-v1";
  handoffVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationPlanningConsumerSnapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotKind"];
  fieldMaterializationPlanningConsumerSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotVersion"];
  fieldMaterializationPlanningConsumerStatus:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffMetadata = {
  handoffKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["handoffKind"];
  handoffVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["handoffVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationPlanningConsumerSnapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["fieldMaterializationPlanningConsumerSnapshotKind"];
  fieldMaterializationPlanningConsumerSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["fieldMaterializationPlanningConsumerSnapshotVersion"];
  fieldMaterializationPlanningConsumerStatus:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["fieldMaterializationPlanningConsumerStatus"];
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-planning-consumer-handoff-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadata = {
  snapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  handoffKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["handoffKind"];
  handoffVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["handoffVersion"];
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus =
  | "field-materialization-downstream-consumer-ready"
  | "field-materialization-downstream-consumer-blocked"
  | "field-materialization-downstream-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamConsumer = {
  artifactKind: "vanta-backend-encoder-field-materialization-downstream-consumer-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationPlanningConsumerHandoffSnapshotKind:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotKind"];
  fieldMaterializationPlanningConsumerHandoffSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotVersion"];
  fieldMaterializationPlanningConsumerHandoffStatus:
    BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus;
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamConsumerMetadata = {
  artifactKind:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["artifactKind"];
  artifactVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationPlanningConsumerHandoffSnapshotKind:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["fieldMaterializationPlanningConsumerHandoffSnapshotKind"];
  fieldMaterializationPlanningConsumerHandoffSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["fieldMaterializationPlanningConsumerHandoffSnapshotVersion"];
  fieldMaterializationPlanningConsumerHandoffStatus:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["fieldMaterializationPlanningConsumerHandoffStatus"];
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumer["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-downstream-consumer-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreezeMetadata = {
  snapshotKind:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotKind"];
  snapshotVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["artifactKind"];
  artifactVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumer["artifactVersion"];
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumer["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus =
  | "field-materialization-downstream-boundary-handoff-ready"
  | "field-materialization-downstream-boundary-handoff-blocked"
  | "field-materialization-downstream-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff = {
  handoffKind: "vanta-backend-encoder-field-materialization-downstream-boundary-handoff-v1";
  handoffVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationDownstreamConsumerSnapshotKind:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotKind"];
  fieldMaterializationDownstreamConsumerSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotVersion"];
  fieldMaterializationDownstreamConsumerStatus:
    BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus;
  status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffMetadata = {
  handoffKind:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["handoffKind"];
  handoffVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["handoffVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationDownstreamConsumerSnapshotKind:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["fieldMaterializationDownstreamConsumerSnapshotKind"];
  fieldMaterializationDownstreamConsumerSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["fieldMaterializationDownstreamConsumerSnapshotVersion"];
  fieldMaterializationDownstreamConsumerStatus:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["fieldMaterializationDownstreamConsumerStatus"];
  status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["status"];
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze = {
  snapshotKind: "vanta-backend-encoder-field-materialization-downstream-boundary-handoff-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["handoffVersion"];
    status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus =
  | "field-materialization-downstream-planning-consumer-ready"
  | "field-materialization-downstream-planning-consumer-blocked"
  | "field-materialization-downstream-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer = {
  artifactKind: "vanta-backend-encoder-field-materialization-downstream-planning-consumer-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationDownstreamBoundaryHandoffSnapshotKind:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotKind"];
  fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotVersion"];
  fieldMaterializationDownstreamBoundaryHandoffStatus:
    BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["fieldMaterializationDownstreamBoundaryHandoffSnapshotKind"];
    fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion"];
    fieldMaterializationDownstreamBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["fieldMaterializationDownstreamBoundaryHandoffStatus"];
    status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-planning-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["artifactVersion"];
    status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus =
  | "field-materialization-downstream-planning-boundary-handoff-ready"
  | "field-materialization-downstream-planning-boundary-handoff-blocked"
  | "field-materialization-downstream-planning-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-downstream-planning-boundary-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotKind"];
    fieldMaterializationDownstreamPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["fieldMaterializationDownstreamPlanningConsumerSnapshotKind"];
    fieldMaterializationDownstreamPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["fieldMaterializationDownstreamPlanningConsumerSnapshotVersion"];
    fieldMaterializationDownstreamPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["fieldMaterializationDownstreamPlanningConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-planning-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus =
  | "field-materialization-downstream-pre-encoding-consumer-ready"
  | "field-materialization-downstream-pre-encoding-consumer-blocked"
  | "field-materialization-downstream-pre-encoding-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPlanningBoundaryHandoffStatus"];
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["artifactVersion"];
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus =
  | "field-materialization-downstream-pre-encoding-boundary-handoff-ready"
  | "field-materialization-downstream-pre-encoding-boundary-handoff-blocked"
  | "field-materialization-downstream-pre-encoding-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-boundary-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["fieldMaterializationDownstreamPreEncodingConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerStatus =
  | "field-materialization-downstream-pre-encoding-planning-consumer-ready"
  | "field-materialization-downstream-pre-encoding-planning-consumer-blocked"
  | "field-materialization-downstream-pre-encoding-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus =
  | "field-materialization-downstream-pre-encoding-planning-boundary-handoff-ready"
  | "field-materialization-downstream-pre-encoding-planning-boundary-handoff-blocked"
  | "field-materialization-downstream-pre-encoding-planning-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-handoff-v2";
    handoffVersion: 2;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus =
  | "field-materialization-downstream-pre-encoding-consumer-artifact-ready"
  | "field-materialization-downstream-pre-encoding-consumer-artifact-blocked"
  | "field-materialization-downstream-pre-encoding-consumer-artifact-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-artifact-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-artifact-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus =
  | "field-materialization-downstream-pre-encoding-planning-consumer-handoff-ready"
  | "field-materialization-downstream-pre-encoding-planning-consumer-handoff-blocked"
  | "field-materialization-downstream-pre-encoding-planning-consumer-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus =
  | "field-materialization-downstream-pre-encoding-planning-boundary-consumer-ready"
  | "field-materialization-downstream-pre-encoding-planning-boundary-consumer-blocked"
  | "field-materialization-downstream-pre-encoding-planning-boundary-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus =
  | "field-materialization-next-downstream-pre-encoding-consumer-ready"
  | "field-materialization-next-downstream-pre-encoding-consumer-blocked"
  | "field-materialization-next-downstream-pre-encoding-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus =
  | "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-ready"
  | "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-blocked"
  | "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotKind"];
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextDownstreamPreEncodingConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind"];
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion"];
    fieldMaterializationNextDownstreamPreEncodingConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["fieldMaterializationNextDownstreamPreEncodingConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus =
  | "field-materialization-next-downstream-planning-boundary-consumer-ready"
  | "field-materialization-next-downstream-planning-boundary-consumer-blocked"
  | "field-materialization-next-downstream-planning-boundary-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind"];
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion"];
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus =
  | "field-materialization-next-downstream-planning-boundary-handoff-ready"
  | "field-materialization-next-downstream-planning-boundary-handoff-blocked"
  | "field-materialization-next-downstream-planning-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotKind"];
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextDownstreamPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind"];
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion"];
    fieldMaterializationNextDownstreamPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["fieldMaterializationNextDownstreamPlanningConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus =
  | "field-materialization-next-downstream-planning-consumer-ready"
  | "field-materialization-next-downstream-planning-consumer-blocked"
  | "field-materialization-next-downstream-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-downstream-planning-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus =
  | "field-materialization-next-resolved-planning-consumer-ready"
  | "field-materialization-next-resolved-planning-consumer-blocked"
  | "field-materialization-next-resolved-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus =
  | "field-materialization-next-resolved-planning-boundary-handoff-ready"
  | "field-materialization-next-resolved-planning-boundary-handoff-blocked"
  | "field-materialization-next-resolved-planning-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["fieldMaterializationNextResolvedPlanningConsumerSnapshotKind"];
    fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["fieldMaterializationNextResolvedPlanningConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus =
  | "field-materialization-next-resolved-planning-boundary-consumer-ready"
  | "field-materialization-next-resolved-planning-boundary-consumer-blocked"
  | "field-materialization-next-resolved-planning-boundary-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind"];
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus =
  | "field-materialization-next-resolved-planning-consumer-handoff-ready"
  | "field-materialization-next-resolved-planning-consumer-handoff-blocked"
  | "field-materialization-next-resolved-planning-consumer-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind"];
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus =
  | "field-materialization-next-resolved-consumer-ready"
  | "field-materialization-next-resolved-consumer-blocked"
  | "field-materialization-next-resolved-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind"];
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedPlanningConsumerHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["fieldMaterializationNextResolvedPlanningConsumerHandoffStatus"];
    status: BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus =
  | "field-materialization-next-resolved-handoff-ready"
  | "field-materialization-next-resolved-handoff-blocked"
  | "field-materialization-next-resolved-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedHandoffMetadata =
  {
    handoffKind: BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["fieldMaterializationNextResolvedConsumerSnapshotKind"];
    fieldMaterializationNextResolvedConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["fieldMaterializationNextResolvedConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["fieldMaterializationNextResolvedConsumerStatus"];
    status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind: BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoff["handoffVersion"];
    status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus =
  | "field-materialization-next-resolved-boundary-consumer-ready"
  | "field-materialization-next-resolved-boundary-consumer-blocked"
  | "field-materialization-next-resolved-boundary-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["fieldMaterializationNextResolvedHandoffSnapshotKind"];
    fieldMaterializationNextResolvedHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["fieldMaterializationNextResolvedHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["fieldMaterializationNextResolvedHandoffStatus"];
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus =
  | "field-materialization-next-resolved-boundary-handoff-ready"
  | "field-materialization-next-resolved-boundary-handoff-blocked"
  | "field-materialization-next-resolved-boundary-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["fieldMaterializationNextResolvedBoundaryConsumerStatus"];
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus =
  | "field-materialization-next-resolved-boundary-planning-consumer-ready"
  | "field-materialization-next-resolved-boundary-planning-consumer-blocked"
  | "field-materialization-next-resolved-boundary-planning-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["fieldMaterializationNextResolvedBoundaryHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus =
  | "field-materialization-next-resolved-boundary-planning-handoff-ready"
  | "field-materialization-next-resolved-boundary-planning-handoff-blocked"
  | "field-materialization-next-resolved-boundary-planning-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus =
  | "field-materialization-next-resolved-boundary-resolution-consumer-ready"
  | "field-materialization-next-resolved-boundary-resolution-consumer-blocked"
  | "field-materialization-next-resolved-boundary-resolution-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus =
  | "field-materialization-next-resolved-boundary-resolution-handoff-ready"
  | "field-materialization-next-resolved-boundary-resolution-handoff-blocked"
  | "field-materialization-next-resolved-boundary-resolution-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus =
  | "field-materialization-next-resolved-boundary-dispatch-consumer-ready"
  | "field-materialization-next-resolved-boundary-dispatch-consumer-blocked"
  | "field-materialization-next-resolved-boundary-dispatch-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus =
  | "field-materialization-next-resolved-boundary-dispatch-handoff-ready"
  | "field-materialization-next-resolved-boundary-dispatch-handoff-blocked"
  | "field-materialization-next-resolved-boundary-dispatch-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus =
  | "field-materialization-next-resolved-boundary-final-consumer-ready"
  | "field-materialization-next-resolved-boundary-final-consumer-blocked"
  | "field-materialization-next-resolved-boundary-final-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus =
  | "field-materialization-next-resolved-boundary-final-handoff-ready"
  | "field-materialization-next-resolved-boundary-final-handoff-blocked"
  | "field-materialization-next-resolved-boundary-final-handoff-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff =
  {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-handoff-v1";
    handoffVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryFinalConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadata =
  {
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["handoffVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryFinalConsumerStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["fieldMaterializationNextResolvedBoundaryFinalConsumerStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-handoff-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    handoffKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["handoffKind"];
    handoffVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff["handoffVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };


export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus =
  | "field-materialization-next-resolved-boundary-closure-consumer-ready"
  | "field-materialization-next-resolved-boundary-closure-consumer-blocked"
  | "field-materialization-next-resolved-boundary-closure-consumer-not-issued";

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer =
  {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-closure-consumer-v1";
    artifactVersion: 1;
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotKind"];
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotVersion"];
    fieldMaterializationNextResolvedBoundaryFinalHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus;
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadata =
  {
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["artifactVersion"];
    encoderId: string;
    encoderLabel: string;
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind"];
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion"];
    fieldMaterializationNextResolvedBoundaryFinalHandoffStatus:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["fieldMaterializationNextResolvedBoundaryFinalHandoffStatus"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["status"];
    proceedable: boolean;
    dispatchFootprintSummary: string;
    reason?: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze =
  {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-closure-consumer-freeze-v1";
    snapshotVersion: 1;
    encoderId: string;
    encoderLabel: string;
    status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus;
    serialized: string;
    summary: string;
  };

export type BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadata =
  {
    snapshotKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotKind"];
    snapshotVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotVersion"];
    encoderId: string;
    encoderLabel: string;
    artifactKind:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["artifactKind"];
    artifactVersion:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer["artifactVersion"];
    status:
      BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["status"];
    proceedable: boolean;
    frozen: true;
    stable: true;
    summary: string;
  };

export type BackendSpecificEncoderProvingInputReadinessStatus =
  | "proving-input-ready"
  | "proving-input-blocked"
  | "proving-input-not-issued";

export type BackendSpecificEncoderProvingInputReadiness = {
  artifactKind: "vanta-backend-encoder-proving-input-readiness-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind:
    BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotKind"];
  fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion:
    BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotVersion"];
  fieldMaterializationNextResolvedBoundaryClosureConsumerStatus:
    BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus;
  witnessMaterializationManifestKind:
    CanonicalCircuitInputWitnessMaterializationManifestRow["kind"] | "vanta-backend-neutral-witness-materialization-manifest-v1";
  witnessMaterializationManifestVersion: 1;
  witnessMaterializationRowCount: number;
  actionableWitnessMaterializationRowCount: number;
  blockedWitnessMaterializationRowCount: number;
  status: BackendSpecificEncoderProvingInputReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  witnessMaterializationSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputReadinessMetadata = {
  artifactKind: BackendSpecificEncoderProvingInputReadiness["artifactKind"];
  artifactVersion: BackendSpecificEncoderProvingInputReadiness["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind:
    BackendSpecificEncoderProvingInputReadiness["fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind"];
  fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion:
    BackendSpecificEncoderProvingInputReadiness["fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion"];
  fieldMaterializationNextResolvedBoundaryClosureConsumerStatus:
    BackendSpecificEncoderProvingInputReadiness["fieldMaterializationNextResolvedBoundaryClosureConsumerStatus"];
  witnessMaterializationManifestKind:
    BackendSpecificEncoderProvingInputReadiness["witnessMaterializationManifestKind"];
  witnessMaterializationManifestVersion:
    BackendSpecificEncoderProvingInputReadiness["witnessMaterializationManifestVersion"];
  witnessMaterializationRowCount: number;
  actionableWitnessMaterializationRowCount: number;
  blockedWitnessMaterializationRowCount: number;
  status: BackendSpecificEncoderProvingInputReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  witnessMaterializationSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputReadinessFreeze = {
  snapshotKind: "vanta-backend-encoder-proving-input-readiness-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProvingInputReadinessStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputReadinessFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderProvingInputReadinessFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProvingInputReadinessFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderProvingInputReadiness["artifactKind"];
  artifactVersion: BackendSpecificEncoderProvingInputReadiness["artifactVersion"];
  status: BackendSpecificEncoderProvingInputReadinessFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemHandoffReadinessStatus =
  | "constraint-system-handoff-ready"
  | "constraint-system-handoff-blocked"
  | "constraint-system-handoff-not-issued";

export type BackendSpecificEncoderConstraintSystemHandoffReadiness = {
  artifactKind: "vanta-backend-encoder-constraint-system-handoff-readiness-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  provingInputReadinessSnapshotKind:
    BackendSpecificEncoderProvingInputReadinessFreeze["snapshotKind"];
  provingInputReadinessSnapshotVersion:
    BackendSpecificEncoderProvingInputReadinessFreeze["snapshotVersion"];
  provingInputReadinessStatus: BackendSpecificEncoderProvingInputReadinessStatus;
  adapterPayloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  adapterPayloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  normalizedAcceptedRowCount: number;
  normalizedExcludedRowCount: number;
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  handoffFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemHandoffReadinessMetadata = {
  artifactKind: BackendSpecificEncoderConstraintSystemHandoffReadiness["artifactKind"];
  artifactVersion: BackendSpecificEncoderConstraintSystemHandoffReadiness["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  provingInputReadinessSnapshotKind:
    BackendSpecificEncoderConstraintSystemHandoffReadiness["provingInputReadinessSnapshotKind"];
  provingInputReadinessSnapshotVersion:
    BackendSpecificEncoderConstraintSystemHandoffReadiness["provingInputReadinessSnapshotVersion"];
  provingInputReadinessStatus:
    BackendSpecificEncoderConstraintSystemHandoffReadiness["provingInputReadinessStatus"];
  adapterPayloadKind: BackendSpecificEncoderConstraintSystemHandoffReadiness["adapterPayloadKind"];
  adapterPayloadVersion:
    BackendSpecificEncoderConstraintSystemHandoffReadiness["adapterPayloadVersion"];
  normalizedAcceptedRowCount: number;
  normalizedExcludedRowCount: number;
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  handoffFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze = {
  snapshotKind: "vanta-backend-encoder-constraint-system-handoff-readiness-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemHandoffReadinessFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderConstraintSystemHandoffReadiness["artifactKind"];
  artifactVersion: BackendSpecificEncoderConstraintSystemHandoffReadiness["artifactVersion"];
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemPackageStatus =
  | "constraint-system-package-ready"
  | "constraint-system-package-blocked"
  | "constraint-system-package-not-issued";

export type BackendSpecificEncoderConstraintSystemPackage = {
  artifactKind: "vanta-backend-encoder-constraint-system-package-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  constraintSystemHandoffReadinessSnapshotKind:
    BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotKind"];
  constraintSystemHandoffReadinessSnapshotVersion:
    BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotVersion"];
  constraintSystemHandoffReadinessStatus:
    BackendSpecificEncoderConstraintSystemHandoffReadinessStatus;
  adapterPayloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  adapterPayloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  lifecycleId?: string;
  normalizedAcceptedRowCount: number;
  constraintRowCount: number;
  excludedRowCount: number;
  status: BackendSpecificEncoderConstraintSystemPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemPackageMetadata = {
  artifactKind: BackendSpecificEncoderConstraintSystemPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderConstraintSystemPackage["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  constraintSystemHandoffReadinessSnapshotKind:
    BackendSpecificEncoderConstraintSystemPackage["constraintSystemHandoffReadinessSnapshotKind"];
  constraintSystemHandoffReadinessSnapshotVersion:
    BackendSpecificEncoderConstraintSystemPackage["constraintSystemHandoffReadinessSnapshotVersion"];
  constraintSystemHandoffReadinessStatus:
    BackendSpecificEncoderConstraintSystemPackage["constraintSystemHandoffReadinessStatus"];
  adapterPayloadKind: BackendSpecificEncoderConstraintSystemPackage["adapterPayloadKind"];
  adapterPayloadVersion: BackendSpecificEncoderConstraintSystemPackage["adapterPayloadVersion"];
  lifecycleId?: string;
  normalizedAcceptedRowCount: number;
  constraintRowCount: number;
  excludedRowCount: number;
  status: BackendSpecificEncoderConstraintSystemPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemPackageFreeze = {
  snapshotKind: "vanta-backend-encoder-constraint-system-package-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderConstraintSystemPackageStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderConstraintSystemPackageFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderConstraintSystemPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderConstraintSystemPackage["artifactVersion"];
  status: BackendSpecificEncoderConstraintSystemPackageFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderProvingInputPackageStatus =
  | "proving-input-package-ready"
  | "proving-input-package-blocked"
  | "proving-input-package-not-issued";

export type BackendSpecificEncoderProvingInputPackage = {
  artifactKind: "vanta-backend-encoder-proving-input-package-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  constraintSystemPackageSnapshotKind:
    BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotKind"];
  constraintSystemPackageSnapshotVersion:
    BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotVersion"];
  constraintSystemPackageStatus:
    BackendSpecificEncoderConstraintSystemPackageStatus;
  adapterPayloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  adapterPayloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  lifecycleId?: string;
  normalizedAcceptedRowCount: number;
  packagedRowCount: number;
  excludedRowCount: number;
  status: BackendSpecificEncoderProvingInputPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputPackageMetadata = {
  artifactKind: BackendSpecificEncoderProvingInputPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderProvingInputPackage["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  constraintSystemPackageSnapshotKind:
    BackendSpecificEncoderProvingInputPackage["constraintSystemPackageSnapshotKind"];
  constraintSystemPackageSnapshotVersion:
    BackendSpecificEncoderProvingInputPackage["constraintSystemPackageSnapshotVersion"];
  constraintSystemPackageStatus:
    BackendSpecificEncoderProvingInputPackage["constraintSystemPackageStatus"];
  adapterPayloadKind: BackendSpecificEncoderProvingInputPackage["adapterPayloadKind"];
  adapterPayloadVersion: BackendSpecificEncoderProvingInputPackage["adapterPayloadVersion"];
  lifecycleId?: string;
  normalizedAcceptedRowCount: number;
  packagedRowCount: number;
  excludedRowCount: number;
  status: BackendSpecificEncoderProvingInputPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputPackageFreeze = {
  snapshotKind: "vanta-backend-encoder-proving-input-package-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProvingInputPackageStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderProvingInputPackageFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderProvingInputPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProvingInputPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderProvingInputPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderProvingInputPackage["artifactVersion"];
  status: BackendSpecificEncoderProvingInputPackageFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderBackendWitnessPackageStatus =
  | "backend-witness-package-ready"
  | "backend-witness-package-blocked"
  | "backend-witness-package-not-issued";

export type BackendSpecificEncoderBackendWitnessPackage = {
  artifactKind: "vanta-backend-encoder-backend-witness-package-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  provingInputPackageSnapshotKind:
    BackendSpecificEncoderProvingInputPackageFreeze["snapshotKind"];
  provingInputPackageSnapshotVersion:
    BackendSpecificEncoderProvingInputPackageFreeze["snapshotVersion"];
  provingInputPackageStatus: BackendSpecificEncoderProvingInputPackageStatus;
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderBackendWitnessPackageStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  witnessFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderBackendWitnessPackageMetadata = {
  artifactKind: BackendSpecificEncoderBackendWitnessPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderBackendWitnessPackage["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  provingInputPackageSnapshotKind:
    BackendSpecificEncoderBackendWitnessPackage["provingInputPackageSnapshotKind"];
  provingInputPackageSnapshotVersion:
    BackendSpecificEncoderBackendWitnessPackage["provingInputPackageSnapshotVersion"];
  provingInputPackageStatus:
    BackendSpecificEncoderBackendWitnessPackage["provingInputPackageStatus"];
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderBackendWitnessPackageStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  witnessFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderBackendWitnessPackageFreeze = {
  snapshotKind: "vanta-backend-encoder-backend-witness-package-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderBackendWitnessPackageStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderBackendWitnessPackageFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderBackendWitnessPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderBackendWitnessPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderBackendWitnessPackage["artifactKind"];
  artifactVersion: BackendSpecificEncoderBackendWitnessPackage["artifactVersion"];
  status: BackendSpecificEncoderBackendWitnessPackageFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderBackendProvingSessionStatus =
  | "backend-proving-session-ready"
  | "backend-proving-session-blocked"
  | "backend-proving-session-not-issued";

export type BackendSpecificEncoderBackendProvingSession = {
  artifactKind: "vanta-backend-encoder-backend-proving-session-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  provingInputPackageSnapshotKind:
    BackendSpecificEncoderProvingInputPackageFreeze["snapshotKind"];
  provingInputPackageSnapshotVersion:
    BackendSpecificEncoderProvingInputPackageFreeze["snapshotVersion"];
  provingInputPackageStatus: BackendSpecificEncoderProvingInputPackageStatus;
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderBackendProvingSessionStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  sessionFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderBackendProvingSessionMetadata = {
  artifactKind: BackendSpecificEncoderBackendProvingSession["artifactKind"];
  artifactVersion: BackendSpecificEncoderBackendProvingSession["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  provingInputPackageSnapshotKind:
    BackendSpecificEncoderBackendProvingSession["provingInputPackageSnapshotKind"];
  provingInputPackageSnapshotVersion:
    BackendSpecificEncoderBackendProvingSession["provingInputPackageSnapshotVersion"];
  provingInputPackageStatus:
    BackendSpecificEncoderBackendProvingSession["provingInputPackageStatus"];
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderBackendProvingSessionStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  sessionFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderBackendProvingSessionFreeze = {
  snapshotKind: "vanta-backend-encoder-backend-proving-session-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderBackendProvingSessionStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderBackendProvingSessionFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderBackendProvingSessionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderBackendProvingSessionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderBackendProvingSession["artifactKind"];
  artifactVersion: BackendSpecificEncoderBackendProvingSession["artifactVersion"];
  status: BackendSpecificEncoderBackendProvingSessionFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderProofReceiptStatus =
  | "proof-receipt-ready"
  | "proof-receipt-blocked"
  | "proof-receipt-not-issued";

export type BackendSpecificEncoderProofReceipt = {
  artifactKind: "vanta-backend-encoder-proof-receipt-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  backendProvingSessionSnapshotKind:
    BackendSpecificEncoderBackendProvingSessionFreeze["snapshotKind"];
  backendProvingSessionSnapshotVersion:
    BackendSpecificEncoderBackendProvingSessionFreeze["snapshotVersion"];
  backendProvingSessionStatus: BackendSpecificEncoderBackendProvingSessionStatus;
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderProofReceiptStatus;
  proceedable: boolean;
  sessionFootprintSummary: string;
  receiptFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProofReceiptMetadata = {
  artifactKind: BackendSpecificEncoderProofReceipt["artifactKind"];
  artifactVersion: BackendSpecificEncoderProofReceipt["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  backendProvingSessionSnapshotKind:
    BackendSpecificEncoderProofReceipt["backendProvingSessionSnapshotKind"];
  backendProvingSessionSnapshotVersion:
    BackendSpecificEncoderProofReceipt["backendProvingSessionSnapshotVersion"];
  backendProvingSessionStatus:
    BackendSpecificEncoderProofReceipt["backendProvingSessionStatus"];
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderProofReceiptStatus;
  proceedable: boolean;
  sessionFootprintSummary: string;
  receiptFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProofReceiptFreeze = {
  snapshotKind: "vanta-backend-encoder-proof-receipt-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProofReceiptStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderProofReceiptFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderProofReceiptFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProofReceiptFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderProofReceipt["artifactKind"];
  artifactVersion: BackendSpecificEncoderProofReceipt["artifactVersion"];
  status: BackendSpecificEncoderProofReceiptFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderProofVerificationReceiptStatus =
  | "proof-verification-receipt-ready"
  | "proof-verification-receipt-blocked"
  | "proof-verification-receipt-not-issued";

export type BackendSpecificEncoderProofVerificationReceipt = {
  artifactKind: "vanta-backend-encoder-proof-verification-receipt-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  proofReceiptSnapshotKind: BackendSpecificEncoderProofReceiptFreeze["snapshotKind"];
  proofReceiptSnapshotVersion: BackendSpecificEncoderProofReceiptFreeze["snapshotVersion"];
  proofReceiptStatus: BackendSpecificEncoderProofReceiptStatus;
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderProofVerificationReceiptStatus;
  proceedable: boolean;
  receiptFootprintSummary: string;
  verificationFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProofVerificationReceiptMetadata = {
  artifactKind: BackendSpecificEncoderProofVerificationReceipt["artifactKind"];
  artifactVersion: BackendSpecificEncoderProofVerificationReceipt["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  proofReceiptSnapshotKind:
    BackendSpecificEncoderProofVerificationReceipt["proofReceiptSnapshotKind"];
  proofReceiptSnapshotVersion:
    BackendSpecificEncoderProofVerificationReceipt["proofReceiptSnapshotVersion"];
  proofReceiptStatus:
    BackendSpecificEncoderProofVerificationReceipt["proofReceiptStatus"];
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderProofVerificationReceiptStatus;
  proceedable: boolean;
  receiptFootprintSummary: string;
  verificationFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderProofVerificationReceiptFreeze = {
  snapshotKind: "vanta-backend-encoder-proof-verification-receipt-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProofVerificationReceiptStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderProofVerificationReceiptFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderProofVerificationReceipt["artifactKind"];
  artifactVersion: BackendSpecificEncoderProofVerificationReceipt["artifactVersion"];
  status: BackendSpecificEncoderProofVerificationReceiptFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderVerificationAttestationStatus =
  | "verification-attestation-ready"
  | "verification-attestation-blocked"
  | "verification-attestation-not-issued";

export type BackendSpecificEncoderVerificationAttestation = {
  artifactKind: "vanta-backend-encoder-verification-attestation-v1";
  artifactVersion: 1;
  encoderId: string;
  encoderLabel: string;
  proofVerificationReceiptSnapshotKind:
    BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotKind"];
  proofVerificationReceiptSnapshotVersion:
    BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotVersion"];
  proofVerificationReceiptStatus: BackendSpecificEncoderProofVerificationReceiptStatus;
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderVerificationAttestationStatus;
  proceedable: boolean;
  verificationFootprintSummary: string;
  attestationFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderVerificationAttestationMetadata = {
  artifactKind: BackendSpecificEncoderVerificationAttestation["artifactKind"];
  artifactVersion: BackendSpecificEncoderVerificationAttestation["artifactVersion"];
  encoderId: string;
  encoderLabel: string;
  proofVerificationReceiptSnapshotKind:
    BackendSpecificEncoderVerificationAttestation["proofVerificationReceiptSnapshotKind"];
  proofVerificationReceiptSnapshotVersion:
    BackendSpecificEncoderVerificationAttestation["proofVerificationReceiptSnapshotVersion"];
  proofVerificationReceiptStatus:
    BackendSpecificEncoderVerificationAttestation["proofVerificationReceiptStatus"];
  lifecycleId?: string;
  packagedRowCount: number;
  status: BackendSpecificEncoderVerificationAttestationStatus;
  proceedable: boolean;
  verificationFootprintSummary: string;
  attestationFootprintSummary: string;
  reason?: string;
  summary: string;
};

export type BackendSpecificEncoderVerificationAttestationFreeze = {
  snapshotKind: "vanta-backend-encoder-verification-attestation-freeze-v1";
  snapshotVersion: 1;
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderVerificationAttestationStatus;
  serialized: string;
  summary: string;
};

export type BackendSpecificEncoderVerificationAttestationFreezeMetadata = {
  snapshotKind: BackendSpecificEncoderVerificationAttestationFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderVerificationAttestationFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  artifactKind: BackendSpecificEncoderVerificationAttestation["artifactKind"];
  artifactVersion: BackendSpecificEncoderVerificationAttestation["artifactVersion"];
  status: BackendSpecificEncoderVerificationAttestationFreeze["status"];
  proceedable: boolean;
  frozen: true;
  stable: true;
  summary: string;
};

export type BackendSpecificEncoderStub = {
  encoderId: string;
  label: string;
  supportedAdapterId: string;
  supportedPayloadKind: CanonicalCircuitInputAdapterPayloadFreeze["kind"];
  supportedPayloadVersion: CanonicalCircuitInputAdapterPayloadFreeze["version"];
  consumeFrozenPayload(
    payload: CanonicalCircuitInputAdapterPayloadFreeze,
  ): BackendSpecificEncoderStubResult;
};

export const GENERIC_PHASE1_BACKEND_ENCODER_STUB: BackendSpecificEncoderStub = {
  encoderId: "generic-phase1-backend-encoder-stub",
  label: "Generic Phase 1 Encoder Stub",
  supportedAdapterId: "generic-phase1-backend-adapter",
  supportedPayloadKind: "vanta-adapter-payload-snapshot-v1",
  supportedPayloadVersion: 1,
  consumeFrozenPayload(payload) {
    if (payload.kind !== this.supportedPayloadKind) {
      return {
        encoderId: this.encoderId,
        encoderLabel: this.label,
        payloadKind: payload.kind,
        payloadVersion: payload.version,
        adapterId: payload.adapterId,
        accepted: false,
        status: "unsupported-payload-kind",
        wouldConsumeRowCount: 0,
        reason: `expected ${this.supportedPayloadKind}`,
        summary: "frozen payload kind is unsupported by encoder stub",
      };
    }

    if (payload.version !== this.supportedPayloadVersion) {
      return {
        encoderId: this.encoderId,
        encoderLabel: this.label,
        payloadKind: payload.kind,
        payloadVersion: payload.version,
        adapterId: payload.adapterId,
        accepted: false,
        status: "unsupported-version",
        wouldConsumeRowCount: 0,
        reason: `expected version ${this.supportedPayloadVersion}`,
        summary: "frozen payload version is unsupported by encoder stub",
      };
    }

    if (payload.adapterId !== this.supportedAdapterId) {
      return {
        encoderId: this.encoderId,
        encoderLabel: this.label,
        payloadKind: payload.kind,
        payloadVersion: payload.version,
        adapterId: payload.adapterId,
        accepted: false,
        status: "unsupported-adapter",
        wouldConsumeRowCount: 0,
        reason: `expected adapter ${this.supportedAdapterId}`,
        summary: "frozen payload adapter id is unsupported by encoder stub",
      };
    }

    const wouldConsumeRowCount = getFrozenNormalizedRowCount(payload);

    return {
      encoderId: this.encoderId,
      encoderLabel: this.label,
      payloadKind: payload.kind,
      payloadVersion: payload.version,
      adapterId: payload.adapterId,
      accepted: true,
      status: "not-yet-encoded",
      wouldConsumeRowCount,
      summary: `encoder stub accepted frozen payload and would consume ${wouldConsumeRowCount} row${wouldConsumeRowCount === 1 ? "" : "s"}`,
    };
  },
};

export function inspectGenericPhase1EncoderStubForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderStubResult {
  return GENERIC_PHASE1_BACKEND_ENCODER_STUB.consumeFrozenPayload(payload);
}

export function inspectGenericPhase1EncoderStubForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderStubResult {
  return inspectGenericPhase1EncoderStubForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderWorkItemsForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderWorkItemManifest {
  const stubResult = inspectGenericPhase1EncoderStubForFrozenPayload(payload);
  const normalizedRows = readFrozenNormalizedRows(payload);
  const workItems = normalizedRows.map((row, index) => {
    const kind = getEncoderWorkItemKind(row.action);
    const blockedReason =
      kind === "blocked"
        ? row.action === "blocked"
          ? "frozen adapter row remained blocked before encoder work-item projection"
          : `encoder stub does not project ${row.action} into an actionable work item`
        : undefined;

    return {
      workItemIndex: index,
      materializationIndex: row.materializationIndex,
      witnessIndex: row.witnessIndex,
      action: row.action,
      familyHint: row.familyHint,
      sectionName: row.sectionName,
      slotLabel: row.slotLabel,
      kind,
      actionable: kind !== "blocked",
      summary:
        kind === "blocked"
          ? `blocked work item for ${row.slotLabel} (${row.action})`
          : `${kind} for ${row.slotLabel} (${row.familyHint})`,
      blockedReason,
    } satisfies BackendSpecificEncoderWorkItem;
  });

  const acceptedWorkItems = stubResult.accepted
    ? workItems.filter((item) => item.actionable)
    : [];
  const blockedItems = stubResult.accepted
    ? workItems.filter((item) => !item.actionable)
    : [
        {
          workItemIndex: 0,
          materializationIndex: -1,
          witnessIndex: -1,
          action: "blocked",
          familyHint: "blocked",
          sectionName: "encoder-boundary",
          slotLabel: "encoder-boundary",
          kind: "blocked",
          actionable: false,
          summary: "encoder stub rejected frozen payload before work-item projection",
          blockedReason: stubResult.reason ?? stubResult.status,
        } satisfies BackendSpecificEncoderWorkItem,
      ];

  return {
    encoderId: stubResult.encoderId,
    encoderLabel: stubResult.encoderLabel,
    payloadKind: stubResult.payloadKind,
    payloadVersion: stubResult.payloadVersion,
    adapterId: stubResult.adapterId,
    accepted: stubResult.accepted,
    workItems: acceptedWorkItems,
    blockedItems,
    workItemCount: acceptedWorkItems.length,
    blockedItemCount: blockedItems.length,
    summary: createEncoderWorkItemManifestSummary(acceptedWorkItems, blockedItems),
  };
}

export function inspectGenericPhase1EncoderWorkItemsForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderWorkItemManifest {
  return inspectGenericPhase1EncoderWorkItemsForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderExecutionPlanForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderExecutionPlan {
  const workItemManifest = inspectGenericPhase1EncoderWorkItemsForFrozenPayload(payload);
  const batches = buildEncoderExecutionBatches(workItemManifest.workItems);
  const blockedBatches = buildBlockedExecutionBatches(workItemManifest.blockedItems, batches.length);

  return {
    encoderId: workItemManifest.encoderId,
    encoderLabel: workItemManifest.encoderLabel,
    payloadKind: workItemManifest.payloadKind,
    payloadVersion: workItemManifest.payloadVersion,
    adapterId: workItemManifest.adapterId,
    accepted: workItemManifest.accepted,
    batches,
    blockedBatches,
    batchCount: batches.length,
    blockedBatchCount: blockedBatches.length,
    summary: createEncoderExecutionPlanSummary(batches, blockedBatches),
  };
}

export function inspectGenericPhase1EncoderExecutionPlanForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderExecutionPlan {
  return inspectGenericPhase1EncoderExecutionPlanForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderDispatchContractForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderDispatchContract {
  const executionPlan = inspectGenericPhase1EncoderExecutionPlanForFrozenPayload(payload);
  const requests = executionPlan.batches.map((batch) => ({
    requestKind: "vanta-backend-encoder-dispatch-request-v1",
    requestVersion: 1,
    requestIndex: batch.batchIndex,
    kind: getEncoderDispatchRequestKind(batch.kind),
    sourceBatchIndex: batch.batchIndex,
    sourceBatchKind: batch.kind,
    firstWorkItemIndex: batch.firstWorkItemIndex,
    lastWorkItemIndex: batch.lastWorkItemIndex,
    sectionName: batch.sectionName,
    actionable: batch.actionable,
    summary: `dispatch ${batch.kind} from batch ${batch.batchIndex}`,
  } satisfies BackendSpecificEncoderDispatchRequest));

  const blockedRequests = executionPlan.blockedBatches.map((batch) => ({
    requestKind: "vanta-backend-encoder-dispatch-request-v1",
    requestVersion: 1,
    requestIndex: batch.batchIndex,
    kind: "blocked",
    sourceBatchIndex: batch.batchIndex,
    sourceBatchKind: batch.kind,
    firstWorkItemIndex: batch.firstWorkItemIndex,
    lastWorkItemIndex: batch.lastWorkItemIndex,
    sectionName: batch.sectionName,
    actionable: false,
    summary: `blocked dispatch from batch ${batch.batchIndex}`,
    blockedReason: batch.blockedReason ?? batch.summary,
  } satisfies BackendSpecificEncoderDispatchRequest));

  return {
    encoderId: executionPlan.encoderId,
    encoderLabel: executionPlan.encoderLabel,
    payloadKind: executionPlan.payloadKind,
    payloadVersion: executionPlan.payloadVersion,
    adapterId: executionPlan.adapterId,
    accepted: executionPlan.accepted,
    requests,
    blockedRequests,
    requestCount: requests.length,
    blockedRequestCount: blockedRequests.length,
    summary: createEncoderDispatchContractSummary(requests, blockedRequests),
  };
}

export function inspectGenericPhase1EncoderDispatchContractForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderDispatchContract {
  return inspectGenericPhase1EncoderDispatchContractForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderDispatchAckForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderDispatchAckContract {
  const dispatchContract = inspectGenericPhase1EncoderDispatchContractForFrozenPayload(payload);
  const entries = [...dispatchContract.requests, ...dispatchContract.blockedRequests]
    .sort((left, right) => left.requestIndex - right.requestIndex)
    .map((request) => acknowledgeDispatchRequest(request));

  const acceptedCount = entries.filter(
    (entry) => entry.status === "accepted" || entry.status === "not-yet-encoded",
  ).length;
  const blockedCount = entries.filter((entry) => entry.status === "blocked").length;
  const unsupportedCount = entries.filter(
    (entry) =>
      entry.status === "unsupported-request-kind" ||
      entry.status === "unsupported-request-version",
  ).length;

  return {
    encoderId: dispatchContract.encoderId,
    encoderLabel: dispatchContract.encoderLabel,
    payloadKind: dispatchContract.payloadKind,
    payloadVersion: dispatchContract.payloadVersion,
    adapterId: dispatchContract.adapterId,
    entries,
    acceptedCount,
    blockedCount,
    unsupportedCount,
    summary: createEncoderDispatchAckSummary(entries),
  };
}

export function inspectGenericPhase1EncoderDispatchAckForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderDispatchAckContract {
  return inspectGenericPhase1EncoderDispatchAckForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderDispatchReadinessForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderDispatchReadiness {
  const ack = inspectGenericPhase1EncoderDispatchAckForFrozenPayload(payload);
  const contributingStatuses = [...new Set(ack.entries.map((entry) => entry.status))];

  if (ack.entries.length === 0) {
    return {
      encoderId: ack.encoderId,
      encoderLabel: ack.encoderLabel,
      payloadKind: ack.payloadKind,
      payloadVersion: ack.payloadVersion,
      adapterId: ack.adapterId,
      status: "empty",
      readyToEncode: false,
      acceptedCount: ack.acceptedCount,
      blockedCount: ack.blockedCount,
      unsupportedCount: ack.unsupportedCount,
      contributingStatuses,
      reason: "no dispatch acknowledgements available",
      summary: "empty · no dispatch acknowledgements",
    };
  }

  if (ack.unsupportedCount > 0) {
    return {
      encoderId: ack.encoderId,
      encoderLabel: ack.encoderLabel,
      payloadKind: ack.payloadKind,
      payloadVersion: ack.payloadVersion,
      adapterId: ack.adapterId,
      status: "unsupported",
      readyToEncode: false,
      acceptedCount: ack.acceptedCount,
      blockedCount: ack.blockedCount,
      unsupportedCount: ack.unsupportedCount,
      contributingStatuses,
      reason: "unsupported dispatch acknowledgements prevent encoding readiness",
      summary: `unsupported · accepted:${ack.acceptedCount} · blocked:${ack.blockedCount} · unsupported:${ack.unsupportedCount}`,
    };
  }

  if (ack.blockedCount > 0) {
    return {
      encoderId: ack.encoderId,
      encoderLabel: ack.encoderLabel,
      payloadKind: ack.payloadKind,
      payloadVersion: ack.payloadVersion,
      adapterId: ack.adapterId,
      status: "blocked",
      readyToEncode: false,
      acceptedCount: ack.acceptedCount,
      blockedCount: ack.blockedCount,
      unsupportedCount: ack.unsupportedCount,
      contributingStatuses,
      reason: "blocked dispatch acknowledgements prevent encoding readiness",
      summary: `blocked · accepted:${ack.acceptedCount} · blocked:${ack.blockedCount}`,
    };
  }

  return {
    encoderId: ack.encoderId,
    encoderLabel: ack.encoderLabel,
    payloadKind: ack.payloadKind,
    payloadVersion: ack.payloadVersion,
    adapterId: ack.adapterId,
    status: "ready",
    readyToEncode: true,
    acceptedCount: ack.acceptedCount,
    blockedCount: ack.blockedCount,
    unsupportedCount: ack.unsupportedCount,
    contributingStatuses,
    summary: `ready · accepted:${ack.acceptedCount}`,
  };
}

export function inspectGenericPhase1EncoderDispatchReadinessForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderDispatchReadiness {
  return inspectGenericPhase1EncoderDispatchReadinessForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderSessionTicketForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderSessionTicket {
  const readiness = inspectGenericPhase1EncoderDispatchReadinessForFrozenPayload(payload);

  if (readiness.status === "ready") {
    return {
      ticketKind: "vanta-backend-encoder-session-ticket-v1",
      ticketVersion: 1,
      encoderId: readiness.encoderId,
      encoderLabel: readiness.encoderLabel,
      payloadKind: readiness.payloadKind,
      payloadVersion: readiness.payloadVersion,
      adapterId: readiness.adapterId,
      status: "issued",
      issued: true,
      readinessStatus: readiness.status,
      acceptedDispatchCount: readiness.acceptedCount,
      blockedDispatchCount: readiness.blockedCount,
      unsupportedDispatchCount: readiness.unsupportedCount,
      summary: `issued · accepted dispatches:${readiness.acceptedCount}`,
    };
  }

  const status: BackendSpecificEncoderSessionTicketStatus =
    readiness.status === "blocked" ? "blocked" : "not-issued";

  return {
    ticketKind: "vanta-backend-encoder-session-ticket-v1",
    ticketVersion: 1,
    encoderId: readiness.encoderId,
    encoderLabel: readiness.encoderLabel,
    payloadKind: readiness.payloadKind,
    payloadVersion: readiness.payloadVersion,
    adapterId: readiness.adapterId,
    status,
    issued: false,
    readinessStatus: readiness.status,
    acceptedDispatchCount: readiness.acceptedCount,
    blockedDispatchCount: readiness.blockedCount,
    unsupportedDispatchCount: readiness.unsupportedCount,
    summary: `${status} · readiness:${readiness.status} · accepted dispatches:${readiness.acceptedCount}`,
    reason: readiness.reason ?? "dispatch readiness did not permit ticket issuance",
  };
}

export function inspectGenericPhase1EncoderSessionTicketForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderSessionTicket {
  return inspectGenericPhase1EncoderSessionTicketForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderPreflightReportForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderPreflightReport {
  const sessionTicket = inspectGenericPhase1EncoderSessionTicketForFrozenPayload(payload);
  const readiness = inspectGenericPhase1EncoderDispatchReadinessForFrozenPayload(payload);
  const dispatchAck = inspectGenericPhase1EncoderDispatchAckForFrozenPayload(payload);

  const blockedReasons = dispatchAck.entries
    .filter((entry) => entry.status !== "accepted" && entry.status !== "not-yet-encoded")
    .map((entry) => entry.reason ?? entry.summary);

  const status: BackendSpecificEncoderPreflightStatus =
    sessionTicket.status === "issued"
      ? "would-proceed"
      : sessionTicket.status === "blocked"
        ? "blocked"
        : "not-issued";

  const dispatchFootprintSummary = `accepted:${sessionTicket.acceptedDispatchCount} · blocked:${sessionTicket.blockedDispatchCount} · unsupported:${sessionTicket.unsupportedDispatchCount}`;

  return {
    reportKind: "vanta-backend-encoder-preflight-report-v1",
    reportVersion: 1,
    encoderId: sessionTicket.encoderId,
    encoderLabel: sessionTicket.encoderLabel,
    payloadKind: sessionTicket.payloadKind,
    payloadVersion: sessionTicket.payloadVersion,
    adapterId: sessionTicket.adapterId,
    ticketKind: sessionTicket.ticketKind,
    ticketVersion: sessionTicket.ticketVersion,
    ticketStatus: sessionTicket.status,
    readinessStatus: readiness.status,
    status,
    wouldProceed: sessionTicket.issued,
    acceptedDispatchCount: sessionTicket.acceptedDispatchCount,
    blockedDispatchCount: sessionTicket.blockedDispatchCount,
    unsupportedDispatchCount: sessionTicket.unsupportedDispatchCount,
    dispatchFootprintSummary,
    blockedReasons,
    summary:
      status === "would-proceed"
        ? `would-proceed · ${dispatchFootprintSummary}`
        : `${status} · ${dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderPreflightReportForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderPreflightReport {
  return inspectGenericPhase1EncoderPreflightReportForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderPreflightFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderPreflightFreeze {
  const report = inspectGenericPhase1EncoderPreflightReportForFrozenPayload(payload);
  const blockedReasons = [...report.blockedReasons].sort((left, right) =>
    left.localeCompare(right),
  );
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-preflight-freeze-v1"],
    ["snapshotVersion", 1],
    ["encoderId", report.encoderId],
    ["encoderLabel", report.encoderLabel],
    ["payloadKind", report.payloadKind],
    ["payloadVersion", report.payloadVersion],
    ["adapterId", report.adapterId],
    ["ticketKind", report.ticketKind],
    ["ticketVersion", report.ticketVersion],
    ["ticketStatus", report.ticketStatus],
    ["readinessStatus", report.readinessStatus],
    ["status", report.status],
    ["wouldProceed", report.wouldProceed],
    ["acceptedDispatchCount", report.acceptedDispatchCount],
    ["blockedDispatchCount", report.blockedDispatchCount],
    ["unsupportedDispatchCount", report.unsupportedDispatchCount],
    ["dispatchFootprintSummary", report.dispatchFootprintSummary],
    ["blockedReasons", blockedReasons],
    ["summary", report.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-preflight-freeze-v1",
    snapshotVersion: 1,
    encoderId: report.encoderId,
    encoderLabel: report.encoderLabel,
    status: report.status,
    serialized: JSON.stringify(tuples),
    summary: `${report.status} · frozen preflight snapshot`,
  };
}

export function inspectGenericPhase1EncoderPreflightFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderPreflightFreeze {
  return inspectGenericPhase1EncoderPreflightFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderOrchestrationHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderOrchestrationHandoff {
  const freeze = inspectGenericPhase1EncoderPreflightFreezeForFrozenPayload(payload);
  const report = inspectGenericPhase1EncoderPreflightReportForFrozenPayload(payload);
  const status: BackendSpecificEncoderOrchestrationHandoffStatus =
    report.status === "would-proceed"
      ? "handoff-ready"
      : report.status === "blocked"
        ? "handoff-blocked"
        : "handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-orchestration-handoff-v1",
    handoffVersion: 1,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    preflightSnapshotKind: freeze.snapshotKind,
    preflightSnapshotVersion: freeze.snapshotVersion,
    preflightStatus: report.status,
    status,
    proceedable: report.wouldProceed,
    dispatchFootprintSummary: report.dispatchFootprintSummary,
    reason: report.blockedReasons[0],
    summary: `${status} · ${report.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderOrchestrationHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderOrchestrationHandoff {
  return inspectGenericPhase1EncoderOrchestrationHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderOrchestrationHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderOrchestrationHandoffFreeze {
  const handoff = inspectGenericPhase1EncoderOrchestrationHandoffForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-orchestration-handoff-freeze-v1"],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    ["preflightSnapshotKind", handoff.preflightSnapshotKind],
    ["preflightSnapshotVersion", handoff.preflightSnapshotVersion],
    ["preflightStatus", handoff.preflightStatus],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-orchestration-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen orchestration handoff`,
  };
}

export function inspectGenericPhase1EncoderOrchestrationHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderOrchestrationHandoffFreeze {
  return inspectGenericPhase1EncoderOrchestrationHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerIntakeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerIntake {
  const handoffFreeze = inspectGenericPhase1EncoderOrchestrationHandoffFreezeForFrozenPayload(
    payload,
  );
  const handoff = inspectGenericPhase1EncoderOrchestrationHandoffForFrozenPayload(payload);
  const status: BackendSpecificEncoderRunnerIntakeStatus =
    handoff.status === "handoff-ready"
      ? "intake-ready"
      : handoff.status === "handoff-blocked"
        ? "intake-blocked"
        : "intake-not-issued";

  return {
    intakeKind: "vanta-backend-encoder-runner-intake-v1",
    intakeVersion: 1,
    encoderId: handoffFreeze.encoderId,
    encoderLabel: handoffFreeze.encoderLabel,
    handoffSnapshotKind: handoffFreeze.snapshotKind,
    handoffSnapshotVersion: handoffFreeze.snapshotVersion,
    handoffStatus: handoff.status,
    status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: `${status} · ${handoff.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerIntakeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerIntake {
  return inspectGenericPhase1EncoderRunnerIntakeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerIntakeFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerIntakeFreeze {
  const intake = inspectGenericPhase1EncoderRunnerIntakeForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-runner-intake-freeze-v1"],
    ["snapshotVersion", 1],
    ["intakeKind", intake.intakeKind],
    ["intakeVersion", intake.intakeVersion],
    ["encoderId", intake.encoderId],
    ["encoderLabel", intake.encoderLabel],
    ["handoffSnapshotKind", intake.handoffSnapshotKind],
    ["handoffSnapshotVersion", intake.handoffSnapshotVersion],
    ["handoffStatus", intake.handoffStatus],
    ["status", intake.status],
    ["proceedable", intake.proceedable],
    ["dispatchFootprintSummary", intake.dispatchFootprintSummary],
    ["reason", intake.reason ?? null],
    ["summary", intake.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-runner-intake-freeze-v1",
    snapshotVersion: 1,
    encoderId: intake.encoderId,
    encoderLabel: intake.encoderLabel,
    status: intake.status,
    serialized: JSON.stringify(tuples),
    summary: `${intake.status} · frozen runner intake`,
  };
}

export function inspectGenericPhase1EncoderRunnerIntakeFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerIntakeFreeze {
  return inspectGenericPhase1EncoderRunnerIntakeFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerLaunchEnvelopeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerLaunchEnvelope {
  const intakeFreeze = inspectGenericPhase1EncoderRunnerIntakeFreezeForFrozenPayload(payload);
  const intake = inspectGenericPhase1EncoderRunnerIntakeForFrozenPayload(payload);
  const status: BackendSpecificEncoderRunnerLaunchEnvelopeStatus =
    intake.status === "intake-ready"
      ? "launch-ready"
      : intake.status === "intake-blocked"
        ? "launch-blocked"
        : "launch-not-issued";

  return {
    envelopeKind: "vanta-backend-encoder-runner-launch-envelope-v1",
    envelopeVersion: 1,
    encoderId: intakeFreeze.encoderId,
    encoderLabel: intakeFreeze.encoderLabel,
    intakeSnapshotKind: intakeFreeze.snapshotKind,
    intakeSnapshotVersion: intakeFreeze.snapshotVersion,
    intakeStatus: intake.status,
    status,
    proceedable: intake.proceedable,
    dispatchFootprintSummary: intake.dispatchFootprintSummary,
    reason: intake.reason,
    summary: `${status} · ${intake.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerLaunchEnvelopeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerLaunchEnvelope {
  return inspectGenericPhase1EncoderRunnerLaunchEnvelopeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerLaunchEnvelopeFreeze {
  const envelope = inspectGenericPhase1EncoderRunnerLaunchEnvelopeForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-runner-launch-envelope-freeze-v1"],
    ["snapshotVersion", 1],
    ["envelopeKind", envelope.envelopeKind],
    ["envelopeVersion", envelope.envelopeVersion],
    ["encoderId", envelope.encoderId],
    ["encoderLabel", envelope.encoderLabel],
    ["intakeSnapshotKind", envelope.intakeSnapshotKind],
    ["intakeSnapshotVersion", envelope.intakeSnapshotVersion],
    ["intakeStatus", envelope.intakeStatus],
    ["status", envelope.status],
    ["proceedable", envelope.proceedable],
    ["dispatchFootprintSummary", envelope.dispatchFootprintSummary],
    ["reason", envelope.reason ?? null],
    ["summary", envelope.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-runner-launch-envelope-freeze-v1",
    snapshotVersion: 1,
    encoderId: envelope.encoderId,
    encoderLabel: envelope.encoderLabel,
    status: envelope.status,
    serialized: JSON.stringify(tuples),
    summary: `${envelope.status} · frozen runner launch envelope`,
  };
}

export function inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerLaunchEnvelopeFreeze {
  return inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerStartTicketForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerStartTicket {
  const launchFreeze = inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForFrozenPayload(payload);
  const launchEnvelope = inspectGenericPhase1EncoderRunnerLaunchEnvelopeForFrozenPayload(payload);
  const status: BackendSpecificEncoderRunnerStartTicketStatus =
    launchEnvelope.status === "launch-ready"
      ? "start-ready"
      : launchEnvelope.status === "launch-blocked"
        ? "start-blocked"
        : "start-not-issued";

  return {
    ticketKind: "vanta-backend-encoder-runner-start-ticket-v1",
    ticketVersion: 1,
    encoderId: launchFreeze.encoderId,
    encoderLabel: launchFreeze.encoderLabel,
    launchSnapshotKind: launchFreeze.snapshotKind,
    launchSnapshotVersion: launchFreeze.snapshotVersion,
    launchStatus: launchEnvelope.status,
    status,
    proceedable: launchEnvelope.proceedable,
    dispatchFootprintSummary: launchEnvelope.dispatchFootprintSummary,
    reason: launchEnvelope.reason,
    summary: `${status} · ${launchEnvelope.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerStartTicketForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerStartTicket {
  return inspectGenericPhase1EncoderRunnerStartTicketForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerStartTicketFreeze {
  const ticket = inspectGenericPhase1EncoderRunnerStartTicketForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-runner-start-ticket-freeze-v1"],
    ["snapshotVersion", 1],
    ["ticketKind", ticket.ticketKind],
    ["ticketVersion", ticket.ticketVersion],
    ["encoderId", ticket.encoderId],
    ["encoderLabel", ticket.encoderLabel],
    ["launchSnapshotKind", ticket.launchSnapshotKind],
    ["launchSnapshotVersion", ticket.launchSnapshotVersion],
    ["launchStatus", ticket.launchStatus],
    ["status", ticket.status],
    ["proceedable", ticket.proceedable],
    ["dispatchFootprintSummary", ticket.dispatchFootprintSummary],
    ["reason", ticket.reason ?? null],
    ["summary", ticket.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-runner-start-ticket-freeze-v1",
    snapshotVersion: 1,
    encoderId: ticket.encoderId,
    encoderLabel: ticket.encoderLabel,
    status: ticket.status,
    serialized: JSON.stringify(tuples),
    summary: `${ticket.status} · frozen execution-start snapshot`,
  };
}

export function inspectGenericPhase1EncoderRunnerStartTicketFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerStartTicketFreeze {
  return inspectGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerStartTicketFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerStartTicketFreezeMetadata {
  const ticket = inspectGenericPhase1EncoderRunnerStartTicketForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(payload);

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    ticketKind: ticket.ticketKind,
    ticketVersion: ticket.ticketVersion,
    status: freeze.status,
    proceedable: ticket.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${ticket.status}`,
  };
}

export function inspectGenericPhase1EncoderRunnerStartTicketFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerStartTicketFreezeMetadata {
  return inspectGenericPhase1EncoderRunnerStartTicketFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerStartTicketFreezeMetadataForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderRunnerStartTicketFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionInput {
  const freeze = inspectGenericPhase1EncoderRunnerStartTicketFreezeForFrozenPayload(payload);
  const snapshot = readRunnerStartTicketFreezeSnapshot(freeze);
  const status =
    snapshot.status === "start-ready"
      ? "execution-input-ready"
      : snapshot.status === "start-blocked"
        ? "execution-input-blocked"
        : "execution-input-not-issued";

  return {
    inputKind: "vanta-backend-encoder-runner-execution-input-v1",
    inputVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    startSnapshotKind: snapshot.snapshotKind,
    startSnapshotVersion: snapshot.snapshotVersion,
    startStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionInputForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionInput {
  return inspectGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionInputMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionInputMetadata {
  const input = inspectGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(payload);

  return {
    inputKind: input.inputKind,
    inputVersion: input.inputVersion,
    encoderId: input.encoderId,
    encoderLabel: input.encoderLabel,
    startSnapshotKind: input.startSnapshotKind,
    startSnapshotVersion: input.startSnapshotVersion,
    status: input.status,
    proceedable: input.proceedable,
    summary: input.summary,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionInputMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionInputMetadata {
  return inspectGenericPhase1EncoderRunnerExecutionInputMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderRunnerExecutionInputForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionEntryPlan {
  const input = inspectGenericPhase1EncoderRunnerExecutionInputForFrozenPayload(payload);
  const status =
    input.status === "execution-input-ready"
      ? "plan-ready"
      : input.status === "execution-input-blocked"
        ? "plan-blocked"
        : "plan-not-issued";

  return {
    planKind: "vanta-backend-encoder-runner-execution-entry-plan-v1",
    planVersion: 1,
    encoderId: input.encoderId,
    encoderLabel: input.encoderLabel,
    inputKind: input.inputKind,
    inputVersion: input.inputVersion,
    startSnapshotKind: input.startSnapshotKind,
    startSnapshotVersion: input.startSnapshotVersion,
    inputStatus: input.status,
    status,
    proceedable: input.proceedable,
    dispatchFootprintSummary: input.dispatchFootprintSummary,
    reason: input.reason,
    summary: `${status} · ${input.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionEntryPlan {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionEntryPlanMetadata {
  const plan = inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(payload);

  return {
    planKind: plan.planKind,
    planVersion: plan.planVersion,
    encoderId: plan.encoderId,
    encoderLabel: plan.encoderLabel,
    inputKind: plan.inputKind,
    inputVersion: plan.inputVersion,
    status: plan.status,
    proceedable: plan.proceedable,
    summary: plan.summary,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionEntryPlanMetadata {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderRunnerExecutionEntryPlanForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionEntryPlanFreeze {
  const plan = inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-runner-execution-entry-plan-freeze-v1"],
    ["snapshotVersion", 1],
    ["planKind", plan.planKind],
    ["planVersion", plan.planVersion],
    ["encoderId", plan.encoderId],
    ["encoderLabel", plan.encoderLabel],
    ["inputKind", plan.inputKind],
    ["inputVersion", plan.inputVersion],
    ["startSnapshotKind", plan.startSnapshotKind],
    ["startSnapshotVersion", plan.startSnapshotVersion],
    ["inputStatus", plan.inputStatus],
    ["status", plan.status],
    ["proceedable", plan.proceedable],
    ["dispatchFootprintSummary", plan.dispatchFootprintSummary],
    ["reason", plan.reason ?? null],
    ["summary", plan.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-runner-execution-entry-plan-freeze-v1",
    snapshotVersion: 1,
    encoderId: plan.encoderId,
    encoderLabel: plan.encoderLabel,
    status: plan.status,
    serialized: JSON.stringify(tuples),
    summary: `${plan.status} · frozen execution-entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionEntryPlanFreeze {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionEntryPlanFreezeMetadata {
  const plan = inspectGenericPhase1EncoderRunnerExecutionEntryPlanForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(payload);

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    planKind: plan.planKind,
    planVersion: plan.planVersion,
    status: freeze.status,
    proceedable: plan.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${plan.status}`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionEntryPlanFreezeMetadata {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionSession {
  const freeze = inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForFrozenPayload(payload);
  const snapshot = readRunnerExecutionEntryPlanFreezeSnapshot(freeze);
  const status =
    snapshot.status === "plan-ready"
      ? "session-ready"
      : snapshot.status === "plan-blocked"
        ? "session-blocked"
        : "session-not-issued";

  return {
    sessionKind: "vanta-backend-encoder-runner-execution-session-v1",
    sessionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    entrySnapshotKind: snapshot.snapshotKind,
    entrySnapshotVersion: snapshot.snapshotVersion,
    planStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionSession {
  return inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionSessionMetadata {
  const session = inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(payload);

  return {
    sessionKind: session.sessionKind,
    sessionVersion: session.sessionVersion,
    encoderId: session.encoderId,
    encoderLabel: session.encoderLabel,
    entrySnapshotKind: session.entrySnapshotKind,
    entrySnapshotVersion: session.entrySnapshotVersion,
    status: session.status,
    proceedable: session.proceedable,
    summary: session.summary,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionSessionMetadata {
  return inspectGenericPhase1EncoderRunnerExecutionSessionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderRunnerExecutionSessionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionSessionFreeze {
  const session = inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-runner-execution-session-freeze-v1"],
    ["snapshotVersion", 1],
    ["sessionKind", session.sessionKind],
    ["sessionVersion", session.sessionVersion],
    ["encoderId", session.encoderId],
    ["encoderLabel", session.encoderLabel],
    ["entrySnapshotKind", session.entrySnapshotKind],
    ["entrySnapshotVersion", session.entrySnapshotVersion],
    ["planStatus", session.planStatus],
    ["status", session.status],
    ["proceedable", session.proceedable],
    ["dispatchFootprintSummary", session.dispatchFootprintSummary],
    ["reason", session.reason ?? null],
    ["summary", session.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-runner-execution-session-freeze-v1",
    snapshotVersion: 1,
    encoderId: session.encoderId,
    encoderLabel: session.encoderLabel,
    status: session.status,
    serialized: JSON.stringify(tuples),
    summary: `${session.status} · frozen execution-admission snapshot`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionSessionFreeze {
  return inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRunnerExecutionSessionFreezeMetadata {
  const session = inspectGenericPhase1EncoderRunnerExecutionSessionForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(payload);

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    sessionKind: session.sessionKind,
    sessionVersion: session.sessionVersion,
    status: freeze.status,
    proceedable: session.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${session.status}`,
  };
}

export function inspectGenericPhase1EncoderRunnerExecutionSessionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRunnerExecutionSessionFreezeMetadata {
  return inspectGenericPhase1EncoderRunnerExecutionSessionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRunnerExecutionSessionFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderRunnerExecutionSessionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderEncodingAdmission {
  const freeze = inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForFrozenPayload(payload);
  const snapshot = readRunnerExecutionSessionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "session-ready"
      ? "admission-ready"
      : snapshot.status === "session-blocked"
        ? "admission-blocked"
        : "admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-encoding-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    sessionSnapshotKind: snapshot.snapshotKind,
    sessionSnapshotVersion: snapshot.snapshotVersion,
    sessionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderEncodingAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderEncodingAdmission {
  return inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderEncodingAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderEncodingAdmissionMetadata {
  const admission = inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(payload);

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    sessionSnapshotKind: admission.sessionSnapshotKind,
    sessionSnapshotVersion: admission.sessionSnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderEncodingAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderEncodingAdmissionMetadata {
  return inspectGenericPhase1EncoderEncodingAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderEncodingAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderEncodingAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderEncodingAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderEncodingAdmissionFreeze {
  const admission = inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-encoding-admission-freeze-v1"],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["sessionSnapshotKind", admission.sessionSnapshotKind],
    ["sessionSnapshotVersion", admission.sessionSnapshotVersion],
    ["sessionStatus", admission.sessionStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-encoding-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen encoding-gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderEncodingAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderEncodingAdmissionFreeze {
  return inspectGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderEncodingAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderEncodingAdmissionFreezeMetadata {
  const admission = inspectGenericPhase1EncoderEncodingAdmissionForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(payload);

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: freeze.status,
    proceedable: admission.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderEncodingAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderEncodingAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderEncodingAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderEncodingAdmissionFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderEncodingAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldEncodingStart {
  const freeze = inspectGenericPhase1EncoderEncodingAdmissionFreezeForFrozenPayload(payload);
  const snapshot = readEncodingAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "admission-ready"
      ? "field-encoding-start-ready"
      : snapshot.status === "admission-blocked"
        ? "field-encoding-start-blocked"
        : "field-encoding-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-field-encoding-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    admissionSnapshotKind: snapshot.snapshotKind,
    admissionSnapshotVersion: snapshot.snapshotVersion,
    admissionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldEncodingStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldEncodingStart {
  return inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldEncodingStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldEncodingStartMetadata {
  const start = inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(payload);

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    admissionSnapshotKind: start.admissionSnapshotKind,
    admissionSnapshotVersion: start.admissionSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderFieldEncodingStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldEncodingStartMetadata {
  return inspectGenericPhase1EncoderFieldEncodingStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldEncodingStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderFieldEncodingStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldEncodingStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldEncodingStartFreeze {
  const start = inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-field-encoding-start-freeze-v1"],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    ["admissionSnapshotKind", start.admissionSnapshotKind],
    ["admissionSnapshotVersion", start.admissionSnapshotVersion],
    ["admissionStatus", start.admissionStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-encoding-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen field-entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldEncodingStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldEncodingStartFreeze {
  return inspectGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldEncodingStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldEncodingStartFreezeMetadata {
  const start = inspectGenericPhase1EncoderFieldEncodingStartForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(payload);

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: freeze.status,
    proceedable: start.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldEncodingStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldEncodingStartFreezeMetadata {
  return inspectGenericPhase1EncoderFieldEncodingStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldEncodingStartFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderFieldEncodingStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationAdmission {
  const freeze = inspectGenericPhase1EncoderFieldEncodingStartFreezeForFrozenPayload(payload);
  const snapshot = readFieldEncodingStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-encoding-start-ready"
      ? "field-materialization-admission-ready"
      : snapshot.status === "field-encoding-start-blocked"
        ? "field-materialization-admission-blocked"
        : "field-materialization-admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-field-materialization-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldEntrySnapshotKind: snapshot.snapshotKind,
    fieldEntrySnapshotVersion: snapshot.snapshotVersion,
    fieldEntryStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationAdmission {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationAdmissionMetadata {
  const admission = inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
    payload,
  );

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    fieldEntrySnapshotKind: admission.fieldEntrySnapshotKind,
    fieldEntrySnapshotVersion: admission.fieldEntrySnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationAdmissionMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationAdmissionFreeze {
  const admission = inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
    payload,
  );
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-field-materialization-admission-freeze-v1"],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["fieldEntrySnapshotKind", admission.fieldEntrySnapshotKind],
    ["fieldEntrySnapshotVersion", admission.fieldEntrySnapshotVersion],
    ["fieldEntryStatus", admission.fieldEntryStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen field-materialization gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationAdmissionFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationAdmissionFreezeMetadata {
  const admission = inspectGenericPhase1EncoderFieldMaterializationAdmissionForFrozenPayload(
    payload,
  );
  const freeze = inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(
    payload,
  );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: freeze.status,
    proceedable: admission.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldRowMaterializationStart {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForFrozenPayload(payload);
  const snapshot = readFieldMaterializationAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-admission-ready"
      ? "field-row-materialization-start-ready"
      : snapshot.status === "field-materialization-admission-blocked"
        ? "field-row-materialization-start-blocked"
        : "field-row-materialization-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-field-row-materialization-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldRowMaterializationStart {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldRowMaterializationStartMetadata {
  const start = inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(payload);

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    fieldMaterializationSnapshotKind: start.fieldMaterializationSnapshotKind,
    fieldMaterializationSnapshotVersion: start.fieldMaterializationSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldRowMaterializationStartMetadata {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderFieldRowMaterializationStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldRowMaterializationStartFreeze {
  const start = inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-field-row-materialization-start-freeze-v1"],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    ["fieldMaterializationSnapshotKind", start.fieldMaterializationSnapshotKind],
    ["fieldMaterializationSnapshotVersion", start.fieldMaterializationSnapshotVersion],
    ["fieldMaterializationStatus", start.fieldMaterializationStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-row-materialization-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen field-row entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldRowMaterializationStartFreeze {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldRowMaterializationStartFreezeMetadata {
  const start = inspectGenericPhase1EncoderFieldRowMaterializationStartForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(
    payload,
  );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: freeze.status,
    proceedable: start.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldRowMaterializationStartFreezeMetadata {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldRowMaterializationStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowMaterializationAdmission {
  const freeze =
    inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForFrozenPayload(payload);
  const snapshot = readFieldRowMaterializationStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-row-materialization-start-ready"
      ? "row-materialization-admission-ready"
      : snapshot.status === "field-row-materialization-start-blocked"
        ? "row-materialization-admission-blocked"
        : "row-materialization-admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-row-materialization-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldRowEntrySnapshotKind: snapshot.snapshotKind,
    fieldRowEntrySnapshotVersion: snapshot.snapshotVersion,
    fieldRowEntryStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowMaterializationAdmission {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowMaterializationAdmissionMetadata {
  const admission =
    inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(payload);

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    fieldRowEntrySnapshotKind: admission.fieldRowEntrySnapshotKind,
    fieldRowEntrySnapshotVersion: admission.fieldRowEntrySnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowMaterializationAdmissionMetadata {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderRowMaterializationAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowMaterializationAdmissionFreeze {
  const admission =
    inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-row-materialization-admission-freeze-v1"],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["fieldRowEntrySnapshotKind", admission.fieldRowEntrySnapshotKind],
    ["fieldRowEntrySnapshotVersion", admission.fieldRowEntrySnapshotVersion],
    ["fieldRowEntryStatus", admission.fieldRowEntryStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-row-materialization-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen row-materialization gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowMaterializationAdmissionFreeze {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowMaterializationAdmissionFreezeMetadata {
  const admission =
    inspectGenericPhase1EncoderRowMaterializationAdmissionForFrozenPayload(payload);
  const freeze =
    inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: freeze.status,
    proceedable: admission.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowMaterializationAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowMaterializationAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowLaneMaterializationStart {
  const freeze =
    inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForFrozenPayload(payload);
  const snapshot = readRowMaterializationAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "row-materialization-admission-ready"
      ? "row-lane-materialization-start-ready"
      : snapshot.status === "row-materialization-admission-blocked"
        ? "row-lane-materialization-start-blocked"
        : "row-lane-materialization-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-row-lane-materialization-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    rowMaterializationSnapshotKind: snapshot.snapshotKind,
    rowMaterializationSnapshotVersion: snapshot.snapshotVersion,
    rowMaterializationStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowLaneMaterializationStart {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowLaneMaterializationStartMetadata {
  const start = inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    payload,
  );

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    rowMaterializationSnapshotKind: start.rowMaterializationSnapshotKind,
    rowMaterializationSnapshotVersion: start.rowMaterializationSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowLaneMaterializationStartMetadata {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowLaneMaterializationStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowLaneMaterializationStartFreeze {
  const start = inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    payload,
  );
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-row-lane-materialization-start-freeze-v1"],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    ["rowMaterializationSnapshotKind", start.rowMaterializationSnapshotKind],
    ["rowMaterializationSnapshotVersion", start.rowMaterializationSnapshotVersion],
    ["rowMaterializationStatus", start.rowMaterializationStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-row-lane-materialization-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen row-lane entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowLaneMaterializationStartFreeze {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowLaneMaterializationStartFreezeMetadata {
  const start = inspectGenericPhase1EncoderRowLaneMaterializationStartForFrozenPayload(
    payload,
  );
  const freeze =
    inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: freeze.status,
    proceedable: start.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowLaneMaterializationStartFreezeMetadata {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowLaneMaterializationStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionAdmission {
  const freeze =
    inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForFrozenPayload(payload);
  const snapshot = readRowLaneMaterializationStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "row-lane-materialization-start-ready"
      ? "row-field-emission-admission-ready"
      : snapshot.status === "row-lane-materialization-start-blocked"
        ? "row-field-emission-admission-blocked"
        : "row-field-emission-admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-row-field-emission-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    rowLaneEntrySnapshotKind: snapshot.snapshotKind,
    rowLaneEntrySnapshotVersion: snapshot.snapshotVersion,
    rowLaneEntryStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionAdmission {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionAdmissionMetadata {
  const admission =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(payload);

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    rowLaneEntrySnapshotKind: admission.rowLaneEntrySnapshotKind,
    rowLaneEntrySnapshotVersion: admission.rowLaneEntrySnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionAdmissionMetadata {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowFieldEmissionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionAdmissionFreeze {
  const admission =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-row-field-emission-admission-freeze-v1"],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["rowLaneEntrySnapshotKind", admission.rowLaneEntrySnapshotKind],
    ["rowLaneEntrySnapshotVersion", admission.rowLaneEntrySnapshotVersion],
    ["rowLaneEntryStatus", admission.rowLaneEntryStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-row-field-emission-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen row-field emission gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionAdmissionFreeze {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionAdmissionFreezeMetadata {
  const admission =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionForFrozenPayload(payload);
  const freeze =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: freeze.status,
    proceedable: admission.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionStart {
  const freeze =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForFrozenPayload(payload);
  const snapshot = readRowFieldEmissionAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "row-field-emission-admission-ready"
      ? "row-field-emission-start-ready"
      : snapshot.status === "row-field-emission-admission-blocked"
        ? "row-field-emission-start-blocked"
        : "row-field-emission-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-row-field-emission-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    rowFieldEmissionSnapshotKind: snapshot.snapshotKind,
    rowFieldEmissionSnapshotVersion: snapshot.snapshotVersion,
    rowFieldEmissionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionStart {
  return inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionStartMetadata {
  const start = inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    payload,
  );

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    rowFieldEmissionSnapshotKind: start.rowFieldEmissionSnapshotKind,
    rowFieldEmissionSnapshotVersion: start.rowFieldEmissionSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionStartMetadata {
  return inspectGenericPhase1EncoderRowFieldEmissionStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowFieldEmissionStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionStartFreeze {
  const start = inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    payload,
  );
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-row-field-emission-start-freeze-v1"],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    ["rowFieldEmissionSnapshotKind", start.rowFieldEmissionSnapshotKind],
    ["rowFieldEmissionSnapshotVersion", start.rowFieldEmissionSnapshotVersion],
    ["rowFieldEmissionStatus", start.rowFieldEmissionStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-row-field-emission-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen row-field emission entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionStartFreeze {
  return inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderRowFieldEmissionStartFreezeMetadata {
  const start = inspectGenericPhase1EncoderRowFieldEmissionStartForFrozenPayload(
    payload,
  );
  const freeze =
    inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: freeze.status,
    proceedable: start.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderRowFieldEmissionStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderRowFieldEmissionStartFreezeMetadata {
  return inspectGenericPhase1EncoderRowFieldEmissionStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderRowFieldEmissionStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderRowFieldEmissionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionAdmission {
  const freeze =
    inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForFrozenPayload(payload);
  const snapshot = readRowFieldEmissionStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "row-field-emission-start-ready"
      ? "field-lane-execution-admission-ready"
      : snapshot.status === "row-field-emission-start-blocked"
        ? "field-lane-execution-admission-blocked"
        : "field-lane-execution-admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-field-lane-execution-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    rowFieldEmissionSnapshotKind: snapshot.snapshotKind,
    rowFieldEmissionSnapshotVersion: snapshot.snapshotVersion,
    rowFieldEmissionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionAdmission {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionAdmissionMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(payload);

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    rowFieldEmissionSnapshotKind: admission.rowFieldEmissionSnapshotKind,
    rowFieldEmissionSnapshotVersion: admission.rowFieldEmissionSnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionAdmissionMetadata {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze {
  const admission =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-field-lane-execution-admission-freeze-v1"],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["rowFieldEmissionSnapshotKind", admission.rowFieldEmissionSnapshotKind],
    ["rowFieldEmissionSnapshotVersion", admission.rowFieldEmissionSnapshotVersion],
    ["rowFieldEmissionStatus", admission.rowFieldEmissionStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-lane-execution-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen field-lane execution gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionAdmissionFreezeMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForFrozenPayload(payload);
  const freeze =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: freeze.status,
    proceedable: admission.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionStart {
  const freeze =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForFrozenPayload(payload);
  const snapshot = readFieldLaneExecutionAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-lane-execution-admission-ready"
      ? "field-lane-execution-start-ready"
      : snapshot.status === "field-lane-execution-admission-blocked"
        ? "field-lane-execution-start-blocked"
        : "field-lane-execution-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-field-lane-execution-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldLaneSnapshotKind: snapshot.snapshotKind,
    fieldLaneSnapshotVersion: snapshot.snapshotVersion,
    fieldLaneStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionStart {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionStartMetadata {
  const start = inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    payload,
  );

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    fieldLaneSnapshotKind: start.fieldLaneSnapshotKind,
    fieldLaneSnapshotVersion: start.fieldLaneSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionStartMetadata {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionStartFreeze {
  const start = inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    payload,
  );
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-field-lane-execution-start-freeze-v1"],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    ["fieldLaneSnapshotKind", start.fieldLaneSnapshotKind],
    ["fieldLaneSnapshotVersion", start.fieldLaneSnapshotVersion],
    ["fieldLaneStatus", start.fieldLaneStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-lane-execution-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen field-lane execution entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionStartFreeze {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldLaneExecutionStartFreezeMetadata {
  const start = inspectGenericPhase1EncoderFieldLaneExecutionStartForFrozenPayload(
    payload,
  );
  const freeze =
    inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(
      payload,
    );

  return {
    snapshotKind: freeze.snapshotKind,
    snapshotVersion: freeze.snapshotVersion,
    encoderId: freeze.encoderId,
    encoderLabel: freeze.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: freeze.status,
    proceedable: start.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldLaneExecutionStartFreezeMetadata {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldLaneExecutionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchAdmission {
  const freeze =
    inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForFrozenPayload(payload);
  const snapshot = readFieldLaneExecutionStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-lane-execution-start-ready"
      ? "field-materialization-launch-admission-ready"
      : snapshot.status === "field-lane-execution-start-blocked"
        ? "field-materialization-launch-admission-blocked"
        : "field-materialization-launch-admission-not-issued";

  return {
    admissionKind: "vanta-backend-encoder-field-materialization-launch-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldLaneExecutionSnapshotKind: snapshot.snapshotKind,
    fieldLaneExecutionSnapshotVersion: snapshot.snapshotVersion,
    fieldLaneExecutionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchAdmission {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
      payload,
    );

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    fieldLaneExecutionSnapshotKind: admission.fieldLaneExecutionSnapshotKind,
    fieldLaneExecutionSnapshotVersion: admission.fieldLaneExecutionSnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-launch-admission-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    ["fieldLaneExecutionSnapshotKind", admission.fieldLaneExecutionSnapshotKind],
    ["fieldLaneExecutionSnapshotVersion", admission.fieldLaneExecutionSnapshotVersion],
    ["fieldLaneExecutionStatus", admission.fieldLaneExecutionStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-launch-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen field-materialization launch gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreezeMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationLaunchAdmissionFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchStart {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationLaunchAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-launch-admission-ready"
      ? "field-materialization-launch-start-ready"
      : snapshot.status === "field-materialization-launch-admission-blocked"
        ? "field-materialization-launch-start-blocked"
        : "field-materialization-launch-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-field-materialization-launch-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationLaunchSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationLaunchSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationLaunchStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchStart {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchStartMetadata {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
      payload,
    );

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    fieldMaterializationLaunchSnapshotKind:
      start.fieldMaterializationLaunchSnapshotKind,
    fieldMaterializationLaunchSnapshotVersion:
      start.fieldMaterializationLaunchSnapshotVersion,
    status: start.status,
    proceedable: start.proceedable,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchStartMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchStartFreeze {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-launch-start-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    [
      "fieldMaterializationLaunchSnapshotKind",
      start.fieldMaterializationLaunchSnapshotKind,
    ],
    [
      "fieldMaterializationLaunchSnapshotVersion",
      start.fieldMaterializationLaunchSnapshotVersion,
    ],
    ["fieldMaterializationLaunchStatus", start.fieldMaterializationLaunchStatus],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-launch-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen field-materialization launch entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchStartFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationLaunchStartFreezeMetadata {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationLaunchStartFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationLaunchStartFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionAdmission {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationLaunchStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-launch-start-ready"
      ? "field-materialization-execution-admission-ready"
      : snapshot.status === "field-materialization-launch-start-blocked"
        ? "field-materialization-execution-admission-blocked"
        : "field-materialization-execution-admission-not-issued";

  return {
    admissionKind:
      "vanta-backend-encoder-field-materialization-execution-admission-v1",
    admissionVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationLaunchSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationLaunchSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationLaunchStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: `${status} · ${snapshot.dispatchFootprintSummary}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionAdmission {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
      payload,
    );

  return {
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    fieldMaterializationLaunchSnapshotKind:
      admission.fieldMaterializationLaunchSnapshotKind,
    fieldMaterializationLaunchSnapshotVersion:
      admission.fieldMaterializationLaunchSnapshotVersion,
    status: admission.status,
    proceedable: admission.proceedable,
    summary: admission.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-execution-admission-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["admissionKind", admission.admissionKind],
    ["admissionVersion", admission.admissionVersion],
    ["encoderId", admission.encoderId],
    ["encoderLabel", admission.encoderLabel],
    [
      "fieldMaterializationLaunchSnapshotKind",
      admission.fieldMaterializationLaunchSnapshotKind,
    ],
    [
      "fieldMaterializationLaunchSnapshotVersion",
      admission.fieldMaterializationLaunchSnapshotVersion,
    ],
    ["fieldMaterializationLaunchStatus", admission.fieldMaterializationLaunchStatus],
    ["status", admission.status],
    ["proceedable", admission.proceedable],
    ["dispatchFootprintSummary", admission.dispatchFootprintSummary],
    ["reason", admission.reason ?? null],
    ["summary", admission.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-execution-admission-freeze-v1",
    snapshotVersion: 1,
    encoderId: admission.encoderId,
    encoderLabel: admission.encoderLabel,
    status: admission.status,
    serialized: JSON.stringify(tuples),
    summary: `${admission.status} · frozen field-materialization execution gate snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreezeMetadata {
  const admission =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionAdmissionFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    admissionKind: admission.admissionKind,
    admissionVersion: admission.admissionVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${admission.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionStart {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionAdmissionFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-execution-admission-ready"
      ? "field-materialization-execution-start-ready"
      : snapshot.status === "field-materialization-execution-admission-blocked"
        ? "field-materialization-execution-start-blocked"
        : "field-materialization-execution-start-not-issued";

  return {
    startKind: "vanta-backend-encoder-field-materialization-execution-start-v1",
    startVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationExecutionSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationExecutionSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationExecutionStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationExecutionStart(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionStart {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionStartMetadata {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
      payload,
    );

  return {
    startKind: start.startKind,
    startVersion: start.startVersion,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    fieldMaterializationExecutionSnapshotKind:
      start.fieldMaterializationExecutionSnapshotKind,
    fieldMaterializationExecutionSnapshotVersion:
      start.fieldMaterializationExecutionSnapshotVersion,
    fieldMaterializationExecutionStatus:
      start.fieldMaterializationExecutionStatus,
    status: start.status,
    proceedable: start.proceedable,
    dispatchFootprintSummary: start.dispatchFootprintSummary,
    reason: start.reason,
    summary: start.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionStartMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionStartForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionStartFreeze {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-execution-start-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["startKind", start.startKind],
    ["startVersion", start.startVersion],
    ["encoderId", start.encoderId],
    ["encoderLabel", start.encoderLabel],
    [
      "fieldMaterializationExecutionSnapshotKind",
      start.fieldMaterializationExecutionSnapshotKind,
    ],
    [
      "fieldMaterializationExecutionSnapshotVersion",
      start.fieldMaterializationExecutionSnapshotVersion,
    ],
    [
      "fieldMaterializationExecutionStatus",
      start.fieldMaterializationExecutionStatus,
    ],
    ["status", start.status],
    ["proceedable", start.proceedable],
    ["dispatchFootprintSummary", start.dispatchFootprintSummary],
    ["reason", start.reason ?? null],
    ["summary", start.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-execution-start-freeze-v1",
    snapshotVersion: 1,
    encoderId: start.encoderId,
    encoderLabel: start.encoderLabel,
    status: start.status,
    serialized: JSON.stringify(tuples),
    summary: `${start.status} · frozen field-materialization execution entry snapshot`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionStartFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionStartFreezeMetadata {
  const start =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionStartFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    startKind: start.startKind,
    startVersion: start.startVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${start.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionStartFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionStartFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-execution-start-ready"
      ? "field-materialization-work-envelope-ready"
      : snapshot.status === "field-materialization-execution-start-blocked"
        ? "field-materialization-work-envelope-blocked"
        : "field-materialization-work-envelope-not-issued";

  return {
    envelopeKind: "vanta-backend-encoder-field-materialization-work-envelope-v1",
    envelopeVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationExecutionStartSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationExecutionStartSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationExecutionStartStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationExecutionWorkEnvelope(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelope {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeMetadata {
  const envelope =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
      payload,
    );

  return {
    envelopeKind: envelope.envelopeKind,
    envelopeVersion: envelope.envelopeVersion,
    encoderId: envelope.encoderId,
    encoderLabel: envelope.encoderLabel,
    fieldMaterializationExecutionStartSnapshotKind:
      envelope.fieldMaterializationExecutionStartSnapshotKind,
    fieldMaterializationExecutionStartSnapshotVersion:
      envelope.fieldMaterializationExecutionStartSnapshotVersion,
    fieldMaterializationExecutionStartStatus:
      envelope.fieldMaterializationExecutionStartStatus,
    status: envelope.status,
    proceedable: envelope.proceedable,
    dispatchFootprintSummary: envelope.dispatchFootprintSummary,
    reason: envelope.reason,
    summary: envelope.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze {
  const envelope =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-execution-work-envelope-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["envelopeKind", envelope.envelopeKind],
    ["envelopeVersion", envelope.envelopeVersion],
    ["encoderId", envelope.encoderId],
    ["encoderLabel", envelope.encoderLabel],
    [
      "fieldMaterializationExecutionStartSnapshotKind",
      envelope.fieldMaterializationExecutionStartSnapshotKind,
    ],
    [
      "fieldMaterializationExecutionStartSnapshotVersion",
      envelope.fieldMaterializationExecutionStartSnapshotVersion,
    ],
    [
      "fieldMaterializationExecutionStartStatus",
      envelope.fieldMaterializationExecutionStartStatus,
    ],
    ["status", envelope.status],
    ["proceedable", envelope.proceedable],
    ["dispatchFootprintSummary", envelope.dispatchFootprintSummary],
    ["reason", envelope.reason ?? null],
    ["summary", envelope.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-execution-work-envelope-freeze-v1",
    snapshotVersion: 1,
    encoderId: envelope.encoderId,
    encoderLabel: envelope.encoderLabel,
    status: envelope.status,
    serialized: JSON.stringify(tuples),
    summary: `${envelope.status} · frozen field-materialization execution work envelope`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadata {
  const envelope =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    envelopeKind: envelope.envelopeKind,
    envelopeVersion: envelope.envelopeVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${envelope.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlan {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-work-envelope-ready"
      ? "field-materialization-execution-plan-ready"
      : snapshot.status === "field-materialization-work-envelope-blocked"
        ? "field-materialization-execution-plan-blocked"
        : "field-materialization-execution-plan-not-issued";

  return {
    planKind: "vanta-backend-encoder-field-materialization-execution-plan-v1",
    planVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationExecutionWorkEnvelopeSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationExecutionWorkEnvelopeSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationExecutionWorkEnvelopeStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationExecutionPlan(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlan {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanMetadata {
  const plan =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
      payload,
    );

  return {
    planKind: plan.planKind,
    planVersion: plan.planVersion,
    encoderId: plan.encoderId,
    encoderLabel: plan.encoderLabel,
    fieldMaterializationExecutionWorkEnvelopeSnapshotKind:
      plan.fieldMaterializationExecutionWorkEnvelopeSnapshotKind,
    fieldMaterializationExecutionWorkEnvelopeSnapshotVersion:
      plan.fieldMaterializationExecutionWorkEnvelopeSnapshotVersion,
    fieldMaterializationExecutionWorkEnvelopeStatus:
      plan.fieldMaterializationExecutionWorkEnvelopeStatus,
    status: plan.status,
    proceedable: plan.proceedable,
    dispatchFootprintSummary: plan.dispatchFootprintSummary,
    reason: plan.reason,
    summary: plan.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze {
  const plan = inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
    payload,
  );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-execution-plan-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["planKind", plan.planKind],
    ["planVersion", plan.planVersion],
    ["encoderId", plan.encoderId],
    ["encoderLabel", plan.encoderLabel],
    [
      "fieldMaterializationExecutionWorkEnvelopeSnapshotKind",
      plan.fieldMaterializationExecutionWorkEnvelopeSnapshotKind,
    ],
    [
      "fieldMaterializationExecutionWorkEnvelopeSnapshotVersion",
      plan.fieldMaterializationExecutionWorkEnvelopeSnapshotVersion,
    ],
    [
      "fieldMaterializationExecutionWorkEnvelopeStatus",
      plan.fieldMaterializationExecutionWorkEnvelopeStatus,
    ],
    ["status", plan.status],
    ["proceedable", plan.proceedable],
    ["dispatchFootprintSummary", plan.dispatchFootprintSummary],
    ["reason", plan.reason ?? null],
    ["summary", plan.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-execution-plan-freeze-v1",
    snapshotVersion: 1,
    encoderId: plan.encoderId,
    encoderLabel: plan.encoderLabel,
    status: plan.status,
    serialized: JSON.stringify(tuples),
    summary: `${plan.status} · frozen field-materialization execution plan`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanFreezeMetadata {
  const plan = inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForFrozenPayload(
    payload,
  );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionPlanFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    planKind: plan.planKind,
    planVersion: plan.planVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${plan.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionPlanFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-execution-plan-ready"
      ? "field-materialization-plan-handoff-ready"
      : snapshot.status === "field-materialization-execution-plan-blocked"
        ? "field-materialization-plan-handoff-blocked"
        : "field-materialization-plan-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-plan-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationExecutionPlanSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationExecutionPlanSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationExecutionPlanStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationExecutionPlanHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationExecutionPlanSnapshotKind:
      handoff.fieldMaterializationExecutionPlanSnapshotKind,
    fieldMaterializationExecutionPlanSnapshotVersion:
      handoff.fieldMaterializationExecutionPlanSnapshotVersion,
    fieldMaterializationExecutionPlanStatus:
      handoff.fieldMaterializationExecutionPlanStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-execution-plan-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationExecutionPlanSnapshotKind",
      handoff.fieldMaterializationExecutionPlanSnapshotKind,
    ],
    [
      "fieldMaterializationExecutionPlanSnapshotVersion",
      handoff.fieldMaterializationExecutionPlanSnapshotVersion,
    ],
    [
      "fieldMaterializationExecutionPlanStatus",
      handoff.fieldMaterializationExecutionPlanStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-execution-plan-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization execution planning handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionPlanHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationExecutionPlanHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-plan-handoff-ready"
      ? "field-materialization-planning-consumer-ready"
      : snapshot.status === "field-materialization-plan-handoff-blocked"
        ? "field-materialization-planning-consumer-blocked"
        : "field-materialization-planning-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationExecutionPlanHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationExecutionPlanHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationExecutionPlanHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationPlanningConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationExecutionPlanHandoffSnapshotKind:
      artifact.fieldMaterializationExecutionPlanHandoffSnapshotKind,
    fieldMaterializationExecutionPlanHandoffSnapshotVersion:
      artifact.fieldMaterializationExecutionPlanHandoffSnapshotVersion,
    fieldMaterializationExecutionPlanHandoffStatus:
      artifact.fieldMaterializationExecutionPlanHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationExecutionPlanHandoffSnapshotKind",
      artifact.fieldMaterializationExecutionPlanHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationExecutionPlanHandoffSnapshotVersion",
      artifact.fieldMaterializationExecutionPlanHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationExecutionPlanHandoffStatus",
      artifact.fieldMaterializationExecutionPlanHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization planning consumer`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationPlanningConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationPlanningConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-planning-consumer-ready"
      ? "field-materialization-planning-consumer-handoff-ready"
      : snapshot.status === "field-materialization-planning-consumer-blocked"
        ? "field-materialization-planning-consumer-handoff-blocked"
        : "field-materialization-planning-consumer-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-planning-consumer-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationPlanningConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationPlanningConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationPlanningConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationPlanningConsumerHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationPlanningConsumerSnapshotKind:
      handoff.fieldMaterializationPlanningConsumerSnapshotKind,
    fieldMaterializationPlanningConsumerSnapshotVersion:
      handoff.fieldMaterializationPlanningConsumerSnapshotVersion,
    fieldMaterializationPlanningConsumerStatus:
      handoff.fieldMaterializationPlanningConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-planning-consumer-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationPlanningConsumerSnapshotKind",
      handoff.fieldMaterializationPlanningConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationPlanningConsumerSnapshotVersion",
      handoff.fieldMaterializationPlanningConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationPlanningConsumerStatus",
      handoff.fieldMaterializationPlanningConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-planning-consumer-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization planning-consumer handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationPlanningConsumerHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationPlanningConsumerHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-planning-consumer-handoff-ready"
      ? "field-materialization-downstream-consumer-ready"
      : snapshot.status === "field-materialization-planning-consumer-handoff-blocked"
        ? "field-materialization-downstream-consumer-blocked"
        : "field-materialization-downstream-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-downstream-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationPlanningConsumerHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationPlanningConsumerHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationPlanningConsumerHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationPlanningConsumerHandoffSnapshotKind:
      artifact.fieldMaterializationPlanningConsumerHandoffSnapshotKind,
    fieldMaterializationPlanningConsumerHandoffSnapshotVersion:
      artifact.fieldMaterializationPlanningConsumerHandoffSnapshotVersion,
    fieldMaterializationPlanningConsumerHandoffStatus:
      artifact.fieldMaterializationPlanningConsumerHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationPlanningConsumerHandoffSnapshotKind",
      artifact.fieldMaterializationPlanningConsumerHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationPlanningConsumerHandoffSnapshotVersion",
      artifact.fieldMaterializationPlanningConsumerHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationPlanningConsumerHandoffStatus",
      artifact.fieldMaterializationPlanningConsumerHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream consumer`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationDownstreamConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationDownstreamConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-downstream-consumer-ready"
      ? "field-materialization-downstream-boundary-handoff-ready"
      : snapshot.status === "field-materialization-downstream-consumer-blocked"
        ? "field-materialization-downstream-boundary-handoff-blocked"
        : "field-materialization-downstream-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-downstream-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationDownstreamConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationDownstreamConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamBoundaryHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationDownstreamConsumerSnapshotKind:
      handoff.fieldMaterializationDownstreamConsumerSnapshotKind,
    fieldMaterializationDownstreamConsumerSnapshotVersion:
      handoff.fieldMaterializationDownstreamConsumerSnapshotVersion,
    fieldMaterializationDownstreamConsumerStatus:
      handoff.fieldMaterializationDownstreamConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationDownstreamConsumerSnapshotKind",
      handoff.fieldMaterializationDownstreamConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamConsumerSnapshotVersion",
      handoff.fieldMaterializationDownstreamConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamConsumerStatus",
      handoff.fieldMaterializationDownstreamConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization downstream-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-downstream-boundary-handoff-ready"
      ? "field-materialization-downstream-planning-consumer-ready"
      : snapshot.status === "field-materialization-downstream-boundary-handoff-blocked"
        ? "field-materialization-downstream-planning-consumer-blocked"
        : "field-materialization-downstream-planning-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-downstream-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamBoundaryHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamBoundaryHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPlanningConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamBoundaryHandoffSnapshotKind,
    fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion,
    fieldMaterializationDownstreamBoundaryHandoffStatus:
      artifact.fieldMaterializationDownstreamBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamBoundaryHandoffStatus",
      artifact.fieldMaterializationDownstreamBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream planning consumer`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-downstream-planning-consumer-ready"
      ? "field-materialization-downstream-planning-boundary-handoff-ready"
      : snapshot.status ===
            "field-materialization-downstream-planning-consumer-blocked"
        ? "field-materialization-downstream-planning-boundary-handoff-blocked"
        : "field-materialization-downstream-planning-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-downstream-planning-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPlanningConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPlanningConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPlanningConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPlanningBoundaryHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationDownstreamPlanningConsumerSnapshotKind:
      handoff.fieldMaterializationDownstreamPlanningConsumerSnapshotKind,
    fieldMaterializationDownstreamPlanningConsumerSnapshotVersion:
      handoff.fieldMaterializationDownstreamPlanningConsumerSnapshotVersion,
    fieldMaterializationDownstreamPlanningConsumerStatus:
      handoff.fieldMaterializationDownstreamPlanningConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-planning-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationDownstreamPlanningConsumerSnapshotKind",
      handoff.fieldMaterializationDownstreamPlanningConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPlanningConsumerSnapshotVersion",
      handoff.fieldMaterializationDownstreamPlanningConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPlanningConsumerStatus",
      handoff.fieldMaterializationDownstreamPlanningConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-planning-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization downstream-planning-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-planning-boundary-handoff-ready"
      ? "field-materialization-downstream-pre-encoding-consumer-ready"
      : snapshot.status ===
            "field-materialization-downstream-planning-boundary-handoff-blocked"
        ? "field-materialization-downstream-pre-encoding-consumer-blocked"
        : "field-materialization-downstream-pre-encoding-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPlanningBoundaryHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationDownstreamPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationDownstreamPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream pre-encoding consumer`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-downstream-pre-encoding-consumer-ready"
      ? "field-materialization-downstream-pre-encoding-boundary-handoff-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-consumer-blocked"
        ? "field-materialization-downstream-pre-encoding-boundary-handoff-blocked"
        : "field-materialization-downstream-pre-encoding-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingBoundaryHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind,
    fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingConsumerStatus:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerStatus",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization downstream-pre-encoding-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-boundary-handoff-ready"
      ? "field-materialization-downstream-pre-encoding-planning-consumer-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-boundary-handoff-blocked"
        ? "field-materialization-downstream-pre-encoding-planning-consumer-blocked"
        : "field-materialization-downstream-pre-encoding-planning-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingPlanningConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus:
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus",
      artifact.fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream pre-encoding planning consumer`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-planning-boundary-consumer-ready"
      ? "field-materialization-downstream-pre-encoding-planning-boundary-handoff-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-planning-boundary-consumer-blocked"
        ? "field-materialization-downstream-pre-encoding-planning-boundary-handoff-blocked"
        : "field-materialization-downstream-pre-encoding-planning-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-handoff-v2",
    handoffVersion: 2,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind:
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion:
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus:
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind",
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion",
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus",
      handoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization downstream pre-encoding planning-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-planning-boundary-handoff-ready"
      ? "field-materialization-next-downstream-pre-encoding-consumer-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-planning-boundary-handoff-blocked"
        ? "field-materialization-next-downstream-pre-encoding-consumer-blocked"
        : "field-materialization-next-downstream-pre-encoding-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextDownstreamPreEncodingConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next downstream pre-encoding consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status ===
    "field-materialization-next-downstream-pre-encoding-consumer-ready"
      ? "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-ready"
      : snapshot.status ===
            "field-materialization-next-downstream-pre-encoding-consumer-blocked"
        ? "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-blocked"
        : "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextDownstreamPreEncodingConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary:
      summarizeFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff(
        status,
        snapshot,
      ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind:
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind,
    fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion:
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion,
    fieldMaterializationNextDownstreamPreEncodingConsumerStatus:
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind",
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion",
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextDownstreamPreEncodingConsumerStatus",
      handoff.fieldMaterializationNextDownstreamPreEncodingConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next downstream pre-encoding planning-consumer handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-ready"
      ? "field-materialization-next-downstream-planning-boundary-consumer-ready"
      : snapshot.status ===
            "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff-blocked"
        ? "field-materialization-next-downstream-planning-boundary-consumer-blocked"
        : "field-materialization-next-downstream-planning-boundary-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextDownstreamPlanningBoundaryConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion,
    fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus:
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind",
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion",
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus",
      artifact.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next downstream planning-boundary consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-downstream-planning-consumer-ready"
      ? "field-materialization-next-downstream-planning-boundary-handoff-ready"
      : snapshot.status ===
            "field-materialization-next-downstream-planning-consumer-blocked"
        ? "field-materialization-next-downstream-planning-boundary-handoff-blocked"
        : "field-materialization-next-downstream-planning-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextDownstreamPlanningConsumerStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextDownstreamPlanningBoundaryHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind:
      handoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind,
    fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion:
      handoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion,
    fieldMaterializationNextDownstreamPlanningConsumerStatus:
      handoff.fieldMaterializationNextDownstreamPlanningConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind",
      handoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion",
      handoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningConsumerStatus",
      handoff.fieldMaterializationNextDownstreamPlanningConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next downstream planning-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-downstream-planning-boundary-handoff-ready"
      ? "field-materialization-next-downstream-planning-consumer-ready"
      : snapshot.status ===
            "field-materialization-next-downstream-planning-boundary-handoff-blocked"
        ? "field-materialization-next-downstream-planning-consumer-blocked"
        : "field-materialization-next-downstream-planning-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextDownstreamPlanningConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-downstream-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-downstream-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next downstream planning consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-downstream-planning-boundary-handoff-ready"
      ? "field-materialization-next-resolved-planning-consumer-ready"
      : snapshot.status ===
            "field-materialization-next-downstream-planning-boundary-handoff-blocked"
        ? "field-materialization-next-resolved-planning-consumer-blocked"
        : "field-materialization-next-resolved-planning-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedPlanningConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved planning consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-resolved-planning-consumer-ready"
      ? "field-materialization-next-resolved-planning-boundary-handoff-ready"
      : snapshot.status ===
            "field-materialization-next-resolved-planning-consumer-blocked"
        ? "field-materialization-next-resolved-planning-boundary-handoff-blocked"
        : "field-materialization-next-resolved-planning-boundary-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedPlanningConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextResolvedPlanningConsumerStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedPlanningBoundaryHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedPlanningConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedPlanningConsumerSnapshotKind,
    fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion,
    fieldMaterializationNextResolvedPlanningConsumerStatus:
      handoff.fieldMaterializationNextResolvedPlanningConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedPlanningConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedPlanningConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedPlanningConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedPlanningConsumerStatus",
      handoff.fieldMaterializationNextResolvedPlanningConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved planning-boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-resolved-planning-boundary-handoff-ready"
      ? "field-materialization-next-resolved-planning-boundary-consumer-ready"
      : snapshot.status ===
            "field-materialization-next-resolved-planning-boundary-handoff-blocked"
        ? "field-materialization-next-resolved-planning-boundary-consumer-blocked"
        : "field-materialization-next-resolved-planning-boundary-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedPlanningBoundaryConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-boundary-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved planning-boundary consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-resolved-planning-boundary-consumer-ready"
      ? "field-materialization-next-resolved-planning-consumer-handoff-ready"
      : snapshot.status ===
            "field-materialization-next-resolved-planning-boundary-consumer-blocked"
        ? "field-materialization-next-resolved-planning-consumer-handoff-blocked"
        : "field-materialization-next-resolved-planning-consumer-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedPlanningConsumerHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion,
    fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus:
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus",
      handoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-planning-consumer-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved planning consumer handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-next-resolved-planning-consumer-handoff-ready"
      ? "field-materialization-next-resolved-consumer-ready"
      : snapshot.status ===
            "field-materialization-next-resolved-planning-consumer-handoff-blocked"
        ? "field-materialization-next-resolved-consumer-blocked"
        : "field-materialization-next-resolved-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-next-resolved-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationNextResolvedPlanningConsumerHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind,
    fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion,
    fieldMaterializationNextResolvedPlanningConsumerHandoffStatus:
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind",
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion",
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedPlanningConsumerHandoffStatus",
      artifact.fieldMaterializationNextResolvedPlanningConsumerHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedConsumerFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status === "field-materialization-next-resolved-consumer-ready"
      ? "field-materialization-next-resolved-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-consumer-blocked"
        ? "field-materialization-next-resolved-handoff-blocked"
        : "field-materialization-next-resolved-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedConsumerSnapshotKind,
    fieldMaterializationNextResolvedConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedConsumerSnapshotVersion,
    fieldMaterializationNextResolvedConsumerStatus:
      handoff.fieldMaterializationNextResolvedConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedConsumerStatus",
      handoff.fieldMaterializationNextResolvedConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForFrozenPayload(payload);
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-handoff-ready"
      ? "field-materialization-next-resolved-boundary-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-consumer-blocked"
        : "field-materialization-next-resolved-boundary-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedHandoffSnapshotKind,
    fieldMaterializationNextResolvedHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedHandoffSnapshotVersion,
    fieldMaterializationNextResolvedHandoffStatus:
      artifact.fieldMaterializationNextResolvedHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedHandoffStatus", artifact.fieldMaterializationNextResolvedHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-consumer-ready"
      ? "field-materialization-next-resolved-boundary-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-consumer-blocked"
        ? "field-materialization-next-resolved-boundary-handoff-blocked"
        : "field-materialization-next-resolved-boundary-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryConsumerStatus:
      handoff.fieldMaterializationNextResolvedBoundaryConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedBoundaryConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryConsumerStatus",
      handoff.fieldMaterializationNextResolvedBoundaryConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved boundary handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-handoff-ready"
      ? "field-materialization-next-resolved-boundary-planning-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-planning-consumer-blocked"
        : "field-materialization-next-resolved-boundary-planning-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryPlanningConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind,
    fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryHandoffStatus:
      artifact.fieldMaterializationNextResolvedBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedBoundaryHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedBoundaryHandoffStatus", artifact.fieldMaterializationNextResolvedBoundaryHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary planning consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-planning-consumer-ready"
      ? "field-materialization-next-resolved-boundary-planning-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-planning-consumer-blocked"
        ? "field-materialization-next-resolved-boundary-planning-handoff-blocked"
        : "field-materialization-next-resolved-boundary-planning-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryPlanningHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus:
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus",
      handoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-planning-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved boundary planning handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-planning-handoff-ready"
      ? "field-materialization-next-resolved-boundary-resolution-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-planning-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-resolution-consumer-blocked"
        : "field-materialization-next-resolved-boundary-resolution-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryResolutionConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus:
      artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus", artifact.fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary resolution consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-resolution-consumer-ready"
      ? "field-materialization-next-resolved-boundary-resolution-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-resolution-consumer-blocked"
        ? "field-materialization-next-resolved-boundary-resolution-handoff-blocked"
        : "field-materialization-next-resolved-boundary-resolution-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryResolutionHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus:
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus",
      handoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-resolution-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved boundary resolution handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-resolution-handoff-ready"
      ? "field-materialization-next-resolved-boundary-dispatch-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-resolution-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-dispatch-consumer-blocked"
        : "field-materialization-next-resolved-boundary-dispatch-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryDispatchConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus:
      artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus", artifact.fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary dispatch consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-dispatch-consumer-ready"
      ? "field-materialization-next-resolved-boundary-dispatch-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-dispatch-consumer-blocked"
        ? "field-materialization-next-resolved-boundary-dispatch-handoff-blocked"
        : "field-materialization-next-resolved-boundary-dispatch-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryDispatchHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus:
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus",
      handoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-dispatch-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved boundary dispatch handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-dispatch-handoff-ready"
      ? "field-materialization-next-resolved-boundary-final-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-dispatch-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-final-consumer-blocked"
        : "field-materialization-next-resolved-boundary-final-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryFinalConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus:
      artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus", artifact.fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary final consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-final-consumer-ready"
      ? "field-materialization-next-resolved-boundary-final-handoff-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-final-consumer-blocked"
        ? "field-materialization-next-resolved-boundary-final-handoff-blocked"
        : "field-materialization-next-resolved-boundary-final-handoff-not-issued";

  return {
    handoffKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryFinalConsumerStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryFinalHandoff(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind:
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion:
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryFinalConsumerStatus:
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind",
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion",
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryFinalConsumerStatus",
      handoff.fieldMaterializationNextResolvedBoundaryFinalConsumerStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-final-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization next resolved boundary final handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot(freeze);
  const status =
    snapshot.status === "field-materialization-next-resolved-boundary-final-handoff-ready"
      ? "field-materialization-next-resolved-boundary-closure-consumer-ready"
      : snapshot.status === "field-materialization-next-resolved-boundary-final-handoff-blocked"
        ? "field-materialization-next-resolved-boundary-closure-consumer-blocked"
        : "field-materialization-next-resolved-boundary-closure-consumer-not-issued";

  return {
    artifactKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-closure-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind: snapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion: snapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryFinalHandoffStatus: snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationNextResolvedBoundaryClosureConsumer(status, snapshot),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind,
    fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryFinalHandoffStatus:
      artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-next-resolved-boundary-closure-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind", artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind],
    ["fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion", artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotVersion],
    ["fieldMaterializationNextResolvedBoundaryFinalHandoffStatus", artifact.fieldMaterializationNextResolvedBoundaryFinalHandoffStatus],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-field-materialization-next-resolved-boundary-closure-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization next resolved boundary closure consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot = readFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputReadiness {
  const closureFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForFrozenPayload(
      payload,
    );
  const closureSnapshot = readFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot(
    closureFreeze,
  );
  const witnessMaterializationManifest = inspectCanonicalLifecycleWitnessMaterializationManifest(
    payload.lifecycleId,
  );
  const witnessMaterializationRowCount = witnessMaterializationManifest.length;
  const actionableWitnessMaterializationRowCount = witnessMaterializationManifest.filter(
    (entry) => entry.actionable,
  ).length;
  const blockedWitnessMaterializationRowCount = witnessMaterializationManifest.filter(
    (entry) => !entry.actionable,
  ).length;
  const proceedable =
    closureSnapshot.proceedable &&
    witnessMaterializationRowCount > 0 &&
    blockedWitnessMaterializationRowCount === 0;
  const status = proceedable
    ? "proving-input-ready"
    : closureSnapshot.status ===
          "field-materialization-next-resolved-boundary-closure-consumer-not-issued" ||
        witnessMaterializationRowCount === 0
      ? "proving-input-not-issued"
      : "proving-input-blocked";
  const witnessMaterializationSummary = summarizeWitnessMaterializationManifestRows(
    witnessMaterializationManifest,
  );
  const reason = proceedable
    ? undefined
    : closureSnapshot.status ===
          "field-materialization-next-resolved-boundary-closure-consumer-not-issued"
      ? closureSnapshot.reason ?? "next resolved boundary closure consumer has not issued a proving input"
      : witnessMaterializationRowCount === 0
        ? "witness materialization manifest is empty"
        : blockedWitnessMaterializationRowCount > 0
          ? `${blockedWitnessMaterializationRowCount} witness materialization rows remain blocked`
          : closureSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-proving-input-readiness-v1",
    artifactVersion: 1,
    encoderId: closureSnapshot.encoderId,
    encoderLabel: closureSnapshot.encoderLabel,
    fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind:
      closureSnapshot.snapshotKind,
    fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion:
      closureSnapshot.snapshotVersion,
    fieldMaterializationNextResolvedBoundaryClosureConsumerStatus: closureSnapshot.status,
    witnessMaterializationManifestKind:
      witnessMaterializationManifest[0]?.kind ??
      "vanta-backend-neutral-witness-materialization-manifest-v1",
    witnessMaterializationManifestVersion: witnessMaterializationManifest[0]?.version ?? 1,
    witnessMaterializationRowCount,
    actionableWitnessMaterializationRowCount,
    blockedWitnessMaterializationRowCount,
    status,
    proceedable,
    dispatchFootprintSummary: closureSnapshot.dispatchFootprintSummary,
    witnessMaterializationSummary,
    reason,
    summary: summarizeProvingInputReadiness(status, closureSnapshot, witnessMaterializationSummary, reason),
  };
}

export function inspectGenericPhase1EncoderProvingInputReadinessForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputReadiness {
  return inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputReadinessMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputReadinessMetadata {
  const artifact = inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind:
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind,
    fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion:
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion,
    fieldMaterializationNextResolvedBoundaryClosureConsumerStatus:
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerStatus,
    witnessMaterializationManifestKind: artifact.witnessMaterializationManifestKind,
    witnessMaterializationManifestVersion: artifact.witnessMaterializationManifestVersion,
    witnessMaterializationRowCount: artifact.witnessMaterializationRowCount,
    actionableWitnessMaterializationRowCount: artifact.actionableWitnessMaterializationRowCount,
    blockedWitnessMaterializationRowCount: artifact.blockedWitnessMaterializationRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    witnessMaterializationSummary: artifact.witnessMaterializationSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderProvingInputReadinessMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputReadinessMetadata {
  return inspectGenericPhase1EncoderProvingInputReadinessMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProvingInputReadinessForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderProvingInputReadinessForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProvingInputReadinessForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputReadinessFreeze {
  const artifact = inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-proving-input-readiness-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind",
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion",
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotVersion,
    ],
    [
      "fieldMaterializationNextResolvedBoundaryClosureConsumerStatus",
      artifact.fieldMaterializationNextResolvedBoundaryClosureConsumerStatus,
    ],
    ["witnessMaterializationManifestKind", artifact.witnessMaterializationManifestKind],
    ["witnessMaterializationManifestVersion", artifact.witnessMaterializationManifestVersion],
    ["witnessMaterializationRowCount", artifact.witnessMaterializationRowCount],
    [
      "actionableWitnessMaterializationRowCount",
      artifact.actionableWitnessMaterializationRowCount,
    ],
    [
      "blockedWitnessMaterializationRowCount",
      artifact.blockedWitnessMaterializationRowCount,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["witnessMaterializationSummary", artifact.witnessMaterializationSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-proving-input-readiness-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen proving-input readiness artifact`,
  };
}

export function inspectGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputReadinessFreeze {
  return inspectGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputReadinessFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputReadinessFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderProvingInputReadinessForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(payload);
  const snapshot = readProvingInputReadinessFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderProvingInputReadinessFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputReadinessFreezeMetadata {
  return inspectGenericPhase1EncoderProvingInputReadinessFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProvingInputReadinessFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemHandoffReadiness {
  const provingInputFreeze = inspectGenericPhase1EncoderProvingInputReadinessFreezeForFrozenPayload(
    payload,
  );
  const provingInputSnapshot = readProvingInputReadinessFreezeSnapshot(provingInputFreeze);
  const proceedable =
    provingInputSnapshot.proceedable &&
    payload.acceptedRowCount > 0 &&
    payload.excludedRowCount === 0;
  const status = proceedable
    ? "constraint-system-handoff-ready"
    : provingInputSnapshot.status === "proving-input-not-issued" || payload.acceptedRowCount === 0
      ? "constraint-system-handoff-not-issued"
      : "constraint-system-handoff-blocked";
  const handoffFootprintSummary = `accepted:${payload.acceptedRowCount} · excluded:${payload.excludedRowCount}`;
  const reason = proceedable
    ? undefined
    : provingInputSnapshot.status === "proving-input-not-issued"
      ? provingInputSnapshot.reason ?? "proving input has not been issued for constraint-system handoff"
      : payload.acceptedRowCount === 0
        ? "adapter payload has no accepted normalized rows"
        : payload.excludedRowCount > 0
          ? `${payload.excludedRowCount} normalized rows remain excluded from constraint handoff`
          : provingInputSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-constraint-system-handoff-readiness-v1",
    artifactVersion: 1,
    encoderId: provingInputSnapshot.encoderId,
    encoderLabel: provingInputSnapshot.encoderLabel,
    provingInputReadinessSnapshotKind: provingInputSnapshot.snapshotKind,
    provingInputReadinessSnapshotVersion: provingInputSnapshot.snapshotVersion,
    provingInputReadinessStatus: provingInputSnapshot.status,
    adapterPayloadKind: payload.kind,
    adapterPayloadVersion: payload.version,
    normalizedAcceptedRowCount: payload.acceptedRowCount,
    normalizedExcludedRowCount: payload.excludedRowCount,
    status,
    proceedable,
    dispatchFootprintSummary: provingInputSnapshot.dispatchFootprintSummary,
    handoffFootprintSummary,
    reason,
    summary: summarizeConstraintSystemHandoffReadiness(
      status,
      provingInputSnapshot,
      handoffFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemHandoffReadiness {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemHandoffReadinessMetadata {
  const artifact = inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    provingInputReadinessSnapshotKind: artifact.provingInputReadinessSnapshotKind,
    provingInputReadinessSnapshotVersion: artifact.provingInputReadinessSnapshotVersion,
    provingInputReadinessStatus: artifact.provingInputReadinessStatus,
    adapterPayloadKind: artifact.adapterPayloadKind,
    adapterPayloadVersion: artifact.adapterPayloadVersion,
    normalizedAcceptedRowCount: artifact.normalizedAcceptedRowCount,
    normalizedExcludedRowCount: artifact.normalizedExcludedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    handoffFootprintSummary: artifact.handoffFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemHandoffReadinessMetadata {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze {
  const artifact = inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-constraint-system-handoff-readiness-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["provingInputReadinessSnapshotKind", artifact.provingInputReadinessSnapshotKind],
    ["provingInputReadinessSnapshotVersion", artifact.provingInputReadinessSnapshotVersion],
    ["provingInputReadinessStatus", artifact.provingInputReadinessStatus],
    ["adapterPayloadKind", artifact.adapterPayloadKind],
    ["adapterPayloadVersion", artifact.adapterPayloadVersion],
    ["normalizedAcceptedRowCount", artifact.normalizedAcceptedRowCount],
    ["normalizedExcludedRowCount", artifact.normalizedExcludedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["handoffFootprintSummary", artifact.handoffFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-constraint-system-handoff-readiness-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen constraint-system handoff readiness artifact`,
  };
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemHandoffReadinessFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(payload);
  const snapshot = readConstraintSystemHandoffReadinessFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemHandoffReadinessFreezeMetadata {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}


export function inspectGenericPhase1EncoderConstraintSystemPackageForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemPackage {
  const handoffFreeze = inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForFrozenPayload(
    payload,
  );
  const handoffSnapshot = readConstraintSystemHandoffReadinessFreezeSnapshot(handoffFreeze);
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = handoffSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "constraint-system-package-ready"
    : handoffSnapshot.status === "constraint-system-handoff-not-issued" || normalizedRows.length === 0
      ? "constraint-system-package-not-issued"
      : "constraint-system-package-blocked";
  const packageFootprintSummary = `constraint-rows:${normalizedRows.length} · excluded:${payload.excludedRowCount}`;
  const reason = proceedable
    ? undefined
    : handoffSnapshot.status === "constraint-system-handoff-not-issued"
      ? handoffSnapshot.reason ?? "constraint-system handoff has not issued a constraint-system package"
      : normalizedRows.length === 0
        ? "no normalized rows available for constraint-system packaging"
        : handoffSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-constraint-system-package-v1",
    artifactVersion: 1,
    encoderId: handoffSnapshot.encoderId,
    encoderLabel: handoffSnapshot.encoderLabel,
    constraintSystemHandoffReadinessSnapshotKind: handoffSnapshot.snapshotKind,
    constraintSystemHandoffReadinessSnapshotVersion: handoffSnapshot.snapshotVersion,
    constraintSystemHandoffReadinessStatus: handoffSnapshot.status,
    adapterPayloadKind: payload.kind,
    adapterPayloadVersion: payload.version,
    lifecycleId: payload.lifecycleId,
    normalizedAcceptedRowCount: payload.acceptedRowCount,
    constraintRowCount: normalizedRows.length,
    excludedRowCount: payload.excludedRowCount,
    status,
    proceedable,
    dispatchFootprintSummary: handoffSnapshot.dispatchFootprintSummary,
    packageFootprintSummary,
    reason,
    summary: summarizeConstraintSystemPackage(status, handoffSnapshot.dispatchFootprintSummary, packageFootprintSummary, reason),
  };
}

export function inspectGenericPhase1EncoderConstraintSystemPackageForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemPackage {
  return inspectGenericPhase1EncoderConstraintSystemPackageForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderConstraintSystemPackageFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderConstraintSystemPackageFreeze {
  const artifact = inspectGenericPhase1EncoderConstraintSystemPackageForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-constraint-system-package-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["constraintSystemHandoffReadinessSnapshotKind", artifact.constraintSystemHandoffReadinessSnapshotKind],
    ["constraintSystemHandoffReadinessSnapshotVersion", artifact.constraintSystemHandoffReadinessSnapshotVersion],
    ["constraintSystemHandoffReadinessStatus", artifact.constraintSystemHandoffReadinessStatus],
    ["adapterPayloadKind", artifact.adapterPayloadKind],
    ["adapterPayloadVersion", artifact.adapterPayloadVersion],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["normalizedAcceptedRowCount", artifact.normalizedAcceptedRowCount],
    ["constraintRowCount", artifact.constraintRowCount],
    ["excludedRowCount", artifact.excludedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["packageFootprintSummary", artifact.packageFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-constraint-system-package-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen constraint-system package artifact`,
  };
}

export function inspectGenericPhase1EncoderConstraintSystemPackageFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderConstraintSystemPackageFreeze {
  return inspectGenericPhase1EncoderConstraintSystemPackageFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

type ParsedConstraintSystemPackageFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderConstraintSystemPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderConstraintSystemPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
};

function readConstraintSystemPackageFreezeSnapshot(
  freeze: BackendSpecificEncoderConstraintSystemPackageFreeze,
): ParsedConstraintSystemPackageFreezeSnapshot {
  const tuples = JSON.parse(freeze.serialized) as [string, unknown][];
  const map = new Map(tuples);
  const get = (key: string) => map.get(key);
  return {
    snapshotKind: String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedConstraintSystemPackageFreezeSnapshot["snapshotKind"],
    snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedConstraintSystemPackageFreezeSnapshot["snapshotVersion"],
    encoderId: String(get("encoderId") ?? freeze.encoderId),
    encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
    status: String(get("status") ?? freeze.status) as ParsedConstraintSystemPackageFreezeSnapshot["status"],
    proceedable: Boolean(get("proceedable")),
    dispatchFootprintSummary: String(get("dispatchFootprintSummary") ?? "dispatch unavailable"),
    packageFootprintSummary: String(get("packageFootprintSummary") ?? "package unavailable"),
    reason: get("reason") == null ? undefined : String(get("reason")),
  };
}

function summarizeConstraintSystemPackage(
  status: BackendSpecificEncoderConstraintSystemPackageStatus,
  dispatchFootprintSummary: string,
  packageFootprintSummary: string,
  reason?: string,
) {
  return reason
    ? `${status} · ${dispatchFootprintSummary} · ${packageFootprintSummary} · ${reason}`
    : `${status} · ${dispatchFootprintSummary} · ${packageFootprintSummary}`;
}

export function inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputPackage {
  const constraintSystemPackageFreeze = inspectGenericPhase1EncoderConstraintSystemPackageFreezeForFrozenPayload(
    payload,
  );
  const constraintSystemPackageSnapshot = readConstraintSystemPackageFreezeSnapshot(
    constraintSystemPackageFreeze,
  );
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = constraintSystemPackageSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "proving-input-package-ready"
    : constraintSystemPackageSnapshot.status === "constraint-system-package-not-issued" || normalizedRows.length === 0
      ? "proving-input-package-not-issued"
      : "proving-input-package-blocked";
  const packageFootprintSummary = `packaged:${normalizedRows.length} · excluded:${payload.excludedRowCount}`;
  const reason = proceedable
    ? undefined
    : constraintSystemPackageSnapshot.status === "constraint-system-package-not-issued"
      ? constraintSystemPackageSnapshot.reason ?? "constraint-system package has not issued a proving-input package"
      : normalizedRows.length === 0
        ? "no normalized rows available for proving-input packaging"
        : constraintSystemPackageSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-proving-input-package-v1",
    artifactVersion: 1,
    encoderId: constraintSystemPackageSnapshot.encoderId,
    encoderLabel: constraintSystemPackageSnapshot.encoderLabel,
    constraintSystemPackageSnapshotKind: constraintSystemPackageSnapshot.snapshotKind,
    constraintSystemPackageSnapshotVersion: constraintSystemPackageSnapshot.snapshotVersion,
    constraintSystemPackageStatus: constraintSystemPackageSnapshot.status,
    adapterPayloadKind: payload.kind,
    adapterPayloadVersion: payload.version,
    lifecycleId: payload.lifecycleId,
    normalizedAcceptedRowCount: payload.acceptedRowCount,
    packagedRowCount: normalizedRows.length,
    excludedRowCount: payload.excludedRowCount,
    status,
    proceedable,
    dispatchFootprintSummary: constraintSystemPackageSnapshot.dispatchFootprintSummary,
    packageFootprintSummary,
    reason,
    summary: summarizeProvingInputPackage(status, constraintSystemPackageSnapshot, packageFootprintSummary, reason),
  };
}

export function inspectGenericPhase1EncoderProvingInputPackageForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputPackage {
  return inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputPackageMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputPackageMetadata {
  const artifact = inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    constraintSystemPackageSnapshotKind:
      artifact.constraintSystemPackageSnapshotKind,
    constraintSystemPackageSnapshotVersion:
      artifact.constraintSystemPackageSnapshotVersion,
    constraintSystemPackageStatus: artifact.constraintSystemPackageStatus,
    adapterPayloadKind: artifact.adapterPayloadKind,
    adapterPayloadVersion: artifact.adapterPayloadVersion,
    lifecycleId: artifact.lifecycleId,
    normalizedAcceptedRowCount: artifact.normalizedAcceptedRowCount,
    packagedRowCount: artifact.packagedRowCount,
    excludedRowCount: artifact.excludedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    packageFootprintSummary: artifact.packageFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderProvingInputPackageMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputPackageMetadata {
  return inspectGenericPhase1EncoderProvingInputPackageMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProvingInputPackageForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderProvingInputPackageForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProvingInputPackageForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputPackageFreeze {
  const artifact = inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-proving-input-package-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "constraintSystemPackageSnapshotKind",
      artifact.constraintSystemPackageSnapshotKind,
    ],
    [
      "constraintSystemPackageSnapshotVersion",
      artifact.constraintSystemPackageSnapshotVersion,
    ],
    [
      "constraintSystemPackageStatus",
      artifact.constraintSystemPackageStatus,
    ],
    ["adapterPayloadKind", artifact.adapterPayloadKind],
    ["adapterPayloadVersion", artifact.adapterPayloadVersion],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["normalizedAcceptedRowCount", artifact.normalizedAcceptedRowCount],
    ["packagedRowCount", artifact.packagedRowCount],
    ["excludedRowCount", artifact.excludedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["packageFootprintSummary", artifact.packageFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-proving-input-package-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen proving-input package artifact`,
  };
}

export function inspectGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputPackageFreeze {
  return inspectGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProvingInputPackageFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProvingInputPackageFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderProvingInputPackageForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(payload);
  const snapshot = readProvingInputPackageFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderProvingInputPackageFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProvingInputPackageFreezeMetadata {
  return inspectGenericPhase1EncoderProvingInputPackageFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProvingInputPackageFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendWitnessPackage {
  const provingInputPackageFreeze = inspectGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
    payload,
  );
  const provingInputPackageSnapshot = readProvingInputPackageFreezeSnapshot(
    provingInputPackageFreeze,
  );
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = provingInputPackageSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "backend-witness-package-ready"
    : provingInputPackageSnapshot.status === "proving-input-package-not-issued" || normalizedRows.length === 0
      ? "backend-witness-package-not-issued"
      : "backend-witness-package-blocked";
  const witnessFootprintSummary = `witness-rows:${normalizedRows.length}`;
  const reason = proceedable
    ? undefined
    : provingInputPackageSnapshot.status === "proving-input-package-not-issued"
      ? provingInputPackageSnapshot.reason ?? "proving-input package has not issued a backend witness package"
      : normalizedRows.length === 0
        ? "no packaged rows available for backend witness package"
        : provingInputPackageSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-backend-witness-package-v1",
    artifactVersion: 1,
    encoderId: provingInputPackageSnapshot.encoderId,
    encoderLabel: provingInputPackageSnapshot.encoderLabel,
    provingInputPackageSnapshotKind: provingInputPackageSnapshot.snapshotKind,
    provingInputPackageSnapshotVersion: provingInputPackageSnapshot.snapshotVersion,
    provingInputPackageStatus: provingInputPackageSnapshot.status,
    lifecycleId: payload.lifecycleId,
    packagedRowCount: normalizedRows.length,
    status,
    proceedable,
    packageFootprintSummary: provingInputPackageSnapshot.packageFootprintSummary,
    witnessFootprintSummary,
    reason,
    summary: summarizeBackendWitnessPackage(
      status,
      provingInputPackageSnapshot,
      witnessFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderBackendWitnessPackageForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendWitnessPackage {
  return inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendWitnessPackageMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendWitnessPackageMetadata {
  const artifact = inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    provingInputPackageSnapshotKind: artifact.provingInputPackageSnapshotKind,
    provingInputPackageSnapshotVersion: artifact.provingInputPackageSnapshotVersion,
    provingInputPackageStatus: artifact.provingInputPackageStatus,
    lifecycleId: artifact.lifecycleId,
    packagedRowCount: artifact.packagedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    packageFootprintSummary: artifact.packageFootprintSummary,
    witnessFootprintSummary: artifact.witnessFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderBackendWitnessPackageMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendWitnessPackageMetadata {
  return inspectGenericPhase1EncoderBackendWitnessPackageMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendWitnessPackageFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendWitnessPackageFreeze {
  const artifact = inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-backend-witness-package-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["provingInputPackageSnapshotKind", artifact.provingInputPackageSnapshotKind],
    ["provingInputPackageSnapshotVersion", artifact.provingInputPackageSnapshotVersion],
    ["provingInputPackageStatus", artifact.provingInputPackageStatus],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["packagedRowCount", artifact.packagedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["packageFootprintSummary", artifact.packageFootprintSummary],
    ["witnessFootprintSummary", artifact.witnessFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-backend-witness-package-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen backend witness package artifact`,
  };
}

export function inspectGenericPhase1EncoderBackendWitnessPackageFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendWitnessPackageFreeze {
  return inspectGenericPhase1EncoderBackendWitnessPackageFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendWitnessPackageFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendWitnessPackageFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderBackendWitnessPackageFreezeForFrozenPayload(payload);
  const snapshot = readBackendWitnessPackageFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderBackendWitnessPackageFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendWitnessPackageFreezeMetadata {
  return inspectGenericPhase1EncoderBackendWitnessPackageFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderBackendWitnessPackageForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderBackendWitnessPackageForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderBackendWitnessPackageFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderBackendWitnessPackageFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderBackendWitnessPackageFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderBackendWitnessPackageFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendProvingSession {
  const provingInputPackageFreeze = inspectGenericPhase1EncoderProvingInputPackageFreezeForFrozenPayload(
    payload,
  );
  const provingInputPackageSnapshot = readProvingInputPackageFreezeSnapshot(
    provingInputPackageFreeze,
  );
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = provingInputPackageSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "backend-proving-session-ready"
    : provingInputPackageSnapshot.status === "proving-input-package-not-issued" ||
        normalizedRows.length === 0
      ? "backend-proving-session-not-issued"
      : "backend-proving-session-blocked";
  const sessionFootprintSummary = `session-rows:${normalizedRows.length}`;
  const reason = proceedable
    ? undefined
    : provingInputPackageSnapshot.status === "proving-input-package-not-issued"
      ? provingInputPackageSnapshot.reason ??
        "proving-input package has not issued a backend proving session"
      : normalizedRows.length === 0
        ? "no packaged rows available for backend proving session"
        : provingInputPackageSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-backend-proving-session-v1",
    artifactVersion: 1,
    encoderId: provingInputPackageSnapshot.encoderId,
    encoderLabel: provingInputPackageSnapshot.encoderLabel,
    provingInputPackageSnapshotKind: provingInputPackageSnapshot.snapshotKind,
    provingInputPackageSnapshotVersion: provingInputPackageSnapshot.snapshotVersion,
    provingInputPackageStatus: provingInputPackageSnapshot.status,
    lifecycleId: payload.lifecycleId,
    packagedRowCount: normalizedRows.length,
    status,
    proceedable,
    packageFootprintSummary: provingInputPackageSnapshot.packageFootprintSummary,
    sessionFootprintSummary,
    reason,
    summary: summarizeBackendProvingSession(
      status,
      provingInputPackageSnapshot,
      sessionFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderBackendProvingSessionForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendProvingSession {
  return inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendProvingSessionMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendProvingSessionMetadata {
  const artifact = inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    provingInputPackageSnapshotKind: artifact.provingInputPackageSnapshotKind,
    provingInputPackageSnapshotVersion: artifact.provingInputPackageSnapshotVersion,
    provingInputPackageStatus: artifact.provingInputPackageStatus,
    lifecycleId: artifact.lifecycleId,
    packagedRowCount: artifact.packagedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    packageFootprintSummary: artifact.packageFootprintSummary,
    sessionFootprintSummary: artifact.sessionFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderBackendProvingSessionMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendProvingSessionMetadata {
  return inspectGenericPhase1EncoderBackendProvingSessionMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderBackendProvingSessionForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderBackendProvingSessionForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderBackendProvingSessionForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendProvingSessionFreeze {
  const artifact = inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-backend-proving-session-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["provingInputPackageSnapshotKind", artifact.provingInputPackageSnapshotKind],
    ["provingInputPackageSnapshotVersion", artifact.provingInputPackageSnapshotVersion],
    ["provingInputPackageStatus", artifact.provingInputPackageStatus],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["packagedRowCount", artifact.packagedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["packageFootprintSummary", artifact.packageFootprintSummary],
    ["sessionFootprintSummary", artifact.sessionFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-backend-proving-session-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen backend proving session artifact`,
  };
}

export function inspectGenericPhase1EncoderBackendProvingSessionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendProvingSessionFreeze {
  return inspectGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderBackendProvingSessionFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderBackendProvingSessionFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderBackendProvingSessionForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(payload);
  const snapshot = readBackendProvingSessionFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderBackendProvingSessionFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderBackendProvingSessionFreezeMetadata {
  return inspectGenericPhase1EncoderBackendProvingSessionFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderBackendProvingSessionFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderBackendProvingSessionFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofReceiptForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofReceipt {
  const backendProvingSessionFreeze = inspectGenericPhase1EncoderBackendProvingSessionFreezeForFrozenPayload(
    payload,
  );
  const backendProvingSessionSnapshot = readBackendProvingSessionFreezeSnapshot(
    backendProvingSessionFreeze,
  );
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable =
    backendProvingSessionSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "proof-receipt-ready"
    : backendProvingSessionSnapshot.status === "backend-proving-session-not-issued" ||
        normalizedRows.length === 0
      ? "proof-receipt-not-issued"
      : "proof-receipt-blocked";
  const receiptFootprintSummary = `receipt-rows:${normalizedRows.length}`;
  const reason = proceedable
    ? undefined
    : backendProvingSessionSnapshot.status === "backend-proving-session-not-issued"
      ? backendProvingSessionSnapshot.reason ??
        "backend proving session has not issued a proof receipt"
      : normalizedRows.length === 0
        ? "no backend session rows available for proof receipt"
        : backendProvingSessionSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-proof-receipt-v1",
    artifactVersion: 1,
    encoderId: backendProvingSessionSnapshot.encoderId,
    encoderLabel: backendProvingSessionSnapshot.encoderLabel,
    backendProvingSessionSnapshotKind: backendProvingSessionSnapshot.snapshotKind,
    backendProvingSessionSnapshotVersion:
      backendProvingSessionSnapshot.snapshotVersion,
    backendProvingSessionStatus: backendProvingSessionSnapshot.status,
    lifecycleId: payload.lifecycleId,
    packagedRowCount: normalizedRows.length,
    status,
    proceedable,
    sessionFootprintSummary: backendProvingSessionSnapshot.sessionFootprintSummary,
    receiptFootprintSummary,
    reason,
    summary: summarizeProofReceipt(
      status,
      backendProvingSessionSnapshot,
      receiptFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderProofReceiptForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofReceipt {
  return inspectGenericPhase1EncoderProofReceiptForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofReceiptMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofReceiptMetadata {
  const artifact = inspectGenericPhase1EncoderProofReceiptForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    backendProvingSessionSnapshotKind: artifact.backendProvingSessionSnapshotKind,
    backendProvingSessionSnapshotVersion:
      artifact.backendProvingSessionSnapshotVersion,
    backendProvingSessionStatus: artifact.backendProvingSessionStatus,
    lifecycleId: artifact.lifecycleId,
    packagedRowCount: artifact.packagedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    sessionFootprintSummary: artifact.sessionFootprintSummary,
    receiptFootprintSummary: artifact.receiptFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderProofReceiptMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofReceiptMetadata {
  return inspectGenericPhase1EncoderProofReceiptMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProofReceiptForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProofReceiptForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderProofReceiptForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProofReceiptForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofReceiptFreeze {
  const artifact = inspectGenericPhase1EncoderProofReceiptForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-proof-receipt-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["backendProvingSessionSnapshotKind", artifact.backendProvingSessionSnapshotKind],
    ["backendProvingSessionSnapshotVersion", artifact.backendProvingSessionSnapshotVersion],
    ["backendProvingSessionStatus", artifact.backendProvingSessionStatus],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["packagedRowCount", artifact.packagedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["sessionFootprintSummary", artifact.sessionFootprintSummary],
    ["receiptFootprintSummary", artifact.receiptFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-proof-receipt-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen proof receipt artifact`,
  };
}

export function inspectGenericPhase1EncoderProofReceiptFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofReceiptFreeze {
  return inspectGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofReceiptFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofReceiptFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderProofReceiptForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(payload);
  const snapshot = readProofReceiptFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderProofReceiptFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofReceiptFreezeMetadata {
  return inspectGenericPhase1EncoderProofReceiptFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProofReceiptFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderProofReceiptFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofVerificationReceipt {
  const proofReceiptFreeze = inspectGenericPhase1EncoderProofReceiptFreezeForFrozenPayload(payload);
  const proofReceiptSnapshot = readProofReceiptFreezeSnapshot(proofReceiptFreeze);
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = proofReceiptSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "proof-verification-receipt-ready"
    : proofReceiptSnapshot.status === "proof-receipt-not-issued" || normalizedRows.length === 0
      ? "proof-verification-receipt-not-issued"
      : "proof-verification-receipt-blocked";
  const verificationFootprintSummary = `verification-rows:${normalizedRows.length}`;
  const reason = proceedable
    ? undefined
    : proofReceiptSnapshot.status === "proof-receipt-not-issued"
      ? proofReceiptSnapshot.reason ??
        "proof receipt has not issued a verification receipt"
      : normalizedRows.length === 0
        ? "no proof receipt rows available for verification receipt"
        : proofReceiptSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-proof-verification-receipt-v1",
    artifactVersion: 1,
    encoderId: proofReceiptSnapshot.encoderId,
    encoderLabel: proofReceiptSnapshot.encoderLabel,
    proofReceiptSnapshotKind: proofReceiptSnapshot.snapshotKind,
    proofReceiptSnapshotVersion: proofReceiptSnapshot.snapshotVersion,
    proofReceiptStatus: proofReceiptSnapshot.status,
    lifecycleId: payload.lifecycleId,
    packagedRowCount: normalizedRows.length,
    status,
    proceedable,
    receiptFootprintSummary: proofReceiptSnapshot.receiptFootprintSummary,
    verificationFootprintSummary,
    reason,
    summary: summarizeProofVerificationReceipt(
      status,
      proofReceiptSnapshot,
      verificationFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderProofVerificationReceiptForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofVerificationReceipt {
  return inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofVerificationReceiptMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofVerificationReceiptMetadata {
  const artifact = inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    proofReceiptSnapshotKind: artifact.proofReceiptSnapshotKind,
    proofReceiptSnapshotVersion: artifact.proofReceiptSnapshotVersion,
    proofReceiptStatus: artifact.proofReceiptStatus,
    lifecycleId: artifact.lifecycleId,
    packagedRowCount: artifact.packagedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    receiptFootprintSummary: artifact.receiptFootprintSummary,
    verificationFootprintSummary: artifact.verificationFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderProofVerificationReceiptMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofVerificationReceiptMetadata {
  return inspectGenericPhase1EncoderProofVerificationReceiptMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderProofVerificationReceiptForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofVerificationReceiptFreeze {
  const artifact = inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-proof-verification-receipt-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["proofReceiptSnapshotKind", artifact.proofReceiptSnapshotKind],
    ["proofReceiptSnapshotVersion", artifact.proofReceiptSnapshotVersion],
    ["proofReceiptStatus", artifact.proofReceiptStatus],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["packagedRowCount", artifact.packagedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["receiptFootprintSummary", artifact.receiptFootprintSummary],
    ["verificationFootprintSummary", artifact.verificationFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-proof-verification-receipt-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen proof verification receipt artifact`,
  };
}

export function inspectGenericPhase1EncoderProofVerificationReceiptFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofVerificationReceiptFreeze {
  return inspectGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderProofVerificationReceiptFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderProofVerificationReceiptFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderProofVerificationReceiptForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(payload);
  const snapshot = readProofVerificationReceiptFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderProofVerificationReceiptFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderProofVerificationReceiptFreezeMetadata {
  return inspectGenericPhase1EncoderProofVerificationReceiptFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderProofVerificationReceiptFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderProofVerificationReceiptFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderVerificationAttestation {
  const verificationReceiptFreeze =
    inspectGenericPhase1EncoderProofVerificationReceiptFreezeForFrozenPayload(payload);
  const verificationReceiptSnapshot = readProofVerificationReceiptFreezeSnapshot(
    verificationReceiptFreeze,
  );
  const normalizedRows = readFrozenNormalizedRows(payload);
  const proceedable = verificationReceiptSnapshot.proceedable && normalizedRows.length > 0;
  const status = proceedable
    ? "verification-attestation-ready"
    : verificationReceiptSnapshot.status === "proof-verification-receipt-not-issued" ||
        normalizedRows.length === 0
      ? "verification-attestation-not-issued"
      : "verification-attestation-blocked";
  const attestationFootprintSummary = `attestation-rows:${normalizedRows.length}`;
  const reason = proceedable
    ? undefined
    : verificationReceiptSnapshot.status === "proof-verification-receipt-not-issued"
      ? verificationReceiptSnapshot.reason ??
        "proof verification receipt has not issued a verification attestation"
      : normalizedRows.length === 0
        ? "no verification receipt rows available for attestation"
        : verificationReceiptSnapshot.reason;

  return {
    artifactKind: "vanta-backend-encoder-verification-attestation-v1",
    artifactVersion: 1,
    encoderId: verificationReceiptSnapshot.encoderId,
    encoderLabel: verificationReceiptSnapshot.encoderLabel,
    proofVerificationReceiptSnapshotKind: verificationReceiptSnapshot.snapshotKind,
    proofVerificationReceiptSnapshotVersion: verificationReceiptSnapshot.snapshotVersion,
    proofVerificationReceiptStatus: verificationReceiptSnapshot.status,
    lifecycleId: payload.lifecycleId,
    packagedRowCount: normalizedRows.length,
    status,
    proceedable,
    verificationFootprintSummary: verificationReceiptSnapshot.verificationFootprintSummary,
    attestationFootprintSummary,
    reason,
    summary: summarizeVerificationAttestation(
      status,
      verificationReceiptSnapshot,
      attestationFootprintSummary,
      reason,
    ),
  };
}

export function inspectGenericPhase1EncoderVerificationAttestationForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderVerificationAttestation {
  return inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderVerificationAttestationMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderVerificationAttestationMetadata {
  const artifact = inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(payload);

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    proofVerificationReceiptSnapshotKind: artifact.proofVerificationReceiptSnapshotKind,
    proofVerificationReceiptSnapshotVersion:
      artifact.proofVerificationReceiptSnapshotVersion,
    proofVerificationReceiptStatus: artifact.proofVerificationReceiptStatus,
    lifecycleId: artifact.lifecycleId,
    packagedRowCount: artifact.packagedRowCount,
    status: artifact.status,
    proceedable: artifact.proceedable,
    verificationFootprintSummary: artifact.verificationFootprintSummary,
    attestationFootprintSummary: artifact.attestationFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderVerificationAttestationMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderVerificationAttestationMetadata {
  return inspectGenericPhase1EncoderVerificationAttestationMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderVerificationAttestationForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(payload).summary;
}

export function summarizeGenericPhase1EncoderVerificationAttestationForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderVerificationAttestationForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderVerificationAttestationFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderVerificationAttestationFreeze {
  const artifact = inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(payload);
  const tuples = [
    ["snapshotKind", "vanta-backend-encoder-verification-attestation-freeze-v1"],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    ["proofVerificationReceiptSnapshotKind", artifact.proofVerificationReceiptSnapshotKind],
    ["proofVerificationReceiptSnapshotVersion", artifact.proofVerificationReceiptSnapshotVersion],
    ["proofVerificationReceiptStatus", artifact.proofVerificationReceiptStatus],
    ["lifecycleId", artifact.lifecycleId ?? null],
    ["packagedRowCount", artifact.packagedRowCount],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["verificationFootprintSummary", artifact.verificationFootprintSummary],
    ["attestationFootprintSummary", artifact.attestationFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind: "vanta-backend-encoder-verification-attestation-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen verification attestation artifact`,
  };
}

export function inspectGenericPhase1EncoderVerificationAttestationFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderVerificationAttestationFreeze {
  return inspectGenericPhase1EncoderVerificationAttestationFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderVerificationAttestationFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderVerificationAttestationFreezeMetadata {
  const artifact = inspectGenericPhase1EncoderVerificationAttestationForFrozenPayload(payload);
  const freeze = inspectGenericPhase1EncoderVerificationAttestationFreezeForFrozenPayload(payload);
  const snapshot = readVerificationAttestationFreezeSnapshot(freeze);

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderVerificationAttestationFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderVerificationAttestationFreezeMetadata {
  return inspectGenericPhase1EncoderVerificationAttestationFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderVerificationAttestationFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderVerificationAttestationFreezeMetadataForFrozenPayload(payload)
    .summary;
}

export function summarizeGenericPhase1EncoderVerificationAttestationFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderVerificationAttestationFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-planning-boundary-handoff-ready"
      ? "field-materialization-downstream-pre-encoding-consumer-artifact-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-planning-boundary-handoff-blocked"
        ? "field-materialization-downstream-pre-encoding-consumer-artifact-blocked"
        : "field-materialization-downstream-pre-encoding-consumer-artifact-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-artifact-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingConsumerArtifact(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifact {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-artifact-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-consumer-artifact-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream pre-encoding consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-consumer-artifact-ready"
      ? "field-materialization-downstream-pre-encoding-planning-consumer-handoff-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-consumer-artifact-blocked"
        ? "field-materialization-downstream-pre-encoding-planning-consumer-handoff-blocked"
        : "field-materialization-downstream-pre-encoding-planning-consumer-handoff-not-issued";

  return {
    handoffKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-handoff-v1",
    handoffVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );

  return {
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus:
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus,
    status: handoff.status,
    proceedable: handoff.proceedable,
    dispatchFootprintSummary: handoff.dispatchFootprintSummary,
    reason: handoff.reason,
    summary: handoff.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-handoff-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["handoffKind", handoff.handoffKind],
    ["handoffVersion", handoff.handoffVersion],
    ["encoderId", handoff.encoderId],
    ["encoderLabel", handoff.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus",
      handoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus,
    ],
    ["status", handoff.status],
    ["proceedable", handoff.proceedable],
    ["dispatchFootprintSummary", handoff.dispatchFootprintSummary],
    ["reason", handoff.reason ?? null],
    ["summary", handoff.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-consumer-handoff-freeze-v1",
    snapshotVersion: 1,
    encoderId: handoff.encoderId,
    encoderLabel: handoff.encoderLabel,
    status: handoff.status,
    serialized: JSON.stringify(tuples),
    summary: `${handoff.status} · frozen field-materialization downstream pre-encoding planning-consumer handoff`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata {
  const handoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    handoffKind: handoff.handoffKind,
    handoffVersion: handoff.handoffVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${handoff.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer {
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
      freeze,
    );
  const status =
    snapshot.status ===
    "field-materialization-downstream-pre-encoding-planning-consumer-handoff-ready"
      ? "field-materialization-downstream-pre-encoding-planning-boundary-consumer-ready"
      : snapshot.status ===
            "field-materialization-downstream-pre-encoding-planning-consumer-handoff-blocked"
        ? "field-materialization-downstream-pre-encoding-planning-boundary-consumer-blocked"
        : "field-materialization-downstream-pre-encoding-planning-boundary-consumer-not-issued";

  return {
    artifactKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-consumer-v1",
    artifactVersion: 1,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      snapshot.snapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      snapshot.snapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus:
      snapshot.status,
    status,
    proceedable: snapshot.proceedable,
    dispatchFootprintSummary: snapshot.dispatchFootprintSummary,
    reason: snapshot.reason,
    summary: summarizeFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer(
      status,
      snapshot,
    ),
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );

  return {
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion,
    fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus:
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus,
    status: artifact.status,
    proceedable: artifact.proceedable,
    dispatchFootprintSummary: artifact.dispatchFootprintSummary,
    reason: artifact.reason,
    summary: artifact.summary,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const tuples = [
    [
      "snapshotKind",
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-consumer-freeze-v1",
    ],
    ["snapshotVersion", 1],
    ["artifactKind", artifact.artifactKind],
    ["artifactVersion", artifact.artifactVersion],
    ["encoderId", artifact.encoderId],
    ["encoderLabel", artifact.encoderLabel],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotVersion,
    ],
    [
      "fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus",
      artifact.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus,
    ],
    ["status", artifact.status],
    ["proceedable", artifact.proceedable],
    ["dispatchFootprintSummary", artifact.dispatchFootprintSummary],
    ["reason", artifact.reason ?? null],
    ["summary", artifact.summary],
  ] as const;

  return {
    snapshotKind:
      "vanta-backend-encoder-field-materialization-downstream-pre-encoding-planning-boundary-consumer-freeze-v1",
    snapshotVersion: 1,
    encoderId: artifact.encoderId,
    encoderLabel: artifact.encoderLabel,
    status: artifact.status,
    serialized: JSON.stringify(tuples),
    summary: `${artifact.status} · frozen field-materialization downstream pre-encoding planning-boundary consumer artifact`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadata {
  const artifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForFrozenPayload(
      payload,
    );
  const freeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
      payload,
    );
  const snapshot =
    readFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot(
      freeze,
    );

  return {
    snapshotKind: snapshot.snapshotKind,
    snapshotVersion: snapshot.snapshotVersion,
    encoderId: snapshot.encoderId,
    encoderLabel: snapshot.encoderLabel,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    status: snapshot.status,
    proceedable: snapshot.proceedable,
    frozen: true,
    stable: true,
    summary: `${freeze.summary} · stable:${artifact.status}`,
  };
}

export function inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadataForLifecycleNode(
  lifecycleId: string | undefined,
): BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadata {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): string {
  return inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeMetadataForFrozenPayload(
    payload,
  ).summary;
}

export function summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForLifecycleNode(
  lifecycleId: string | undefined,
): string {
  return summarizeGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForFrozenPayload(
    inspectCanonicalLifecycleAdapterPayloadFreeze(lifecycleId),
  );
}


function getFrozenNormalizedRowCount(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): number {
  return readFrozenNormalizedRows(payload).length || payload.acceptedRowCount;
}

type FrozenNormalizedRow = {
  materializationIndex: number;
  witnessIndex: number;
  action: string;
  familyHint: string;
  sectionName: string;
  slotLabel: string;
  actionable: boolean;
  payloadHint: string;
  summary: string;
};

type ParsedRunnerStartTicketFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerStartTicketFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerStartTicketStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRunnerExecutionEntryPlanFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerExecutionEntryPlanStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRunnerExecutionSessionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRunnerExecutionSessionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRunnerExecutionSessionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedEncodingAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderEncodingAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderEncodingAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldEncodingStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldEncodingStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldEncodingStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldRowMaterializationStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldRowMaterializationStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldRowMaterializationStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRowMaterializationAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowMaterializationAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowMaterializationAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRowLaneMaterializationStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowLaneMaterializationStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowLaneMaterializationStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRowFieldEmissionAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowFieldEmissionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowFieldEmissionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedRowFieldEmissionStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderRowFieldEmissionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderRowFieldEmissionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldLaneExecutionAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldLaneExecutionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldLaneExecutionStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldLaneExecutionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldLaneExecutionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationLaunchAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationLaunchAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationLaunchStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationLaunchStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationLaunchStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionAdmissionStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationExecutionStartFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationExecutionStartFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionStartStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationExecutionPlanFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};


type ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

type ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  reason?: string;
};

function readFrozenNormalizedRows(
  payload: CanonicalCircuitInputAdapterPayloadFreeze,
): FrozenNormalizedRow[] {
  try {
    const tuples = JSON.parse(payload.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      return [];
    }

    const normalizedRowsTuple = tuples.find(
      (entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry[0] === "normalizedRows",
    );

    if (!normalizedRowsTuple || !Array.isArray(normalizedRowsTuple[1])) {
      return [];
    }

    return normalizedRowsTuple[1]
      .filter((entry): entry is unknown[] => Array.isArray(entry) && entry.length >= 9)
      .map((entry) => ({
        materializationIndex: Number(entry[0] ?? 0),
        witnessIndex: Number(entry[1] ?? 0),
        action: String(entry[2] ?? "blocked"),
        familyHint: String(entry[3] ?? "unknown"),
        sectionName: String(entry[4] ?? "unknown-section"),
        slotLabel: String(entry[5] ?? "unknown-slot"),
        actionable: Boolean(entry[6]),
        payloadHint: String(entry[7] ?? ""),
        summary: String(entry[8] ?? "frozen normalized row"),
      }));
  } catch {
    return [];
  }
}

function readRunnerStartTicketFreezeSnapshot(
  freeze: BackendSpecificEncoderRunnerStartTicketFreeze,
): ParsedRunnerStartTicketFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRunnerStartTicketFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRunnerStartTicketFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRunnerStartTicketFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0"),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "runner start freeze snapshot could not be parsed for execution-input projection",
    };
  }
}

function readRunnerExecutionEntryPlanFreezeSnapshot(
  freeze: BackendSpecificEncoderRunnerExecutionEntryPlanFreeze,
): ParsedRunnerExecutionEntryPlanFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized execution-entry snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRunnerExecutionEntryPlanFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRunnerExecutionEntryPlanFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRunnerExecutionEntryPlanFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "execution-entry freeze snapshot could not be parsed for execution-session projection",
    };
  }
}

function readRunnerExecutionSessionFreezeSnapshot(
  freeze: BackendSpecificEncoderRunnerExecutionSessionFreeze,
): ParsedRunnerExecutionSessionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized execution-session snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRunnerExecutionSessionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRunnerExecutionSessionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRunnerExecutionSessionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "execution-session freeze snapshot could not be parsed for encoding-admission projection",
    };
  }
}

function readEncodingAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderEncodingAdmissionFreeze,
): ParsedEncodingAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized encoding-admission snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedEncodingAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedEncodingAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedEncodingAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "encoding-admission freeze snapshot could not be parsed for field-encoding start projection",
    };
  }
}

function readFieldEncodingStartFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldEncodingStartFreeze,
): ParsedFieldEncodingStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized field-encoding-start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldEncodingStartFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldEncodingStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldEncodingStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-encoding-start freeze snapshot could not be parsed for field-materialization admission projection",
    };
  }
}

function readFieldMaterializationAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationAdmissionFreeze,
): ParsedFieldMaterializationAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized field-materialization-admission snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-admission freeze snapshot could not be parsed for field-row materialization start projection",
    };
  }
}

function readFieldRowMaterializationStartFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldRowMaterializationStartFreeze,
): ParsedFieldRowMaterializationStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized field-row-materialization-start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldRowMaterializationStartFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldRowMaterializationStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldRowMaterializationStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-row-materialization-start freeze snapshot could not be parsed for row-materialization admission projection",
    };
  }
}

function readRowMaterializationAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderRowMaterializationAdmissionFreeze,
): ParsedRowMaterializationAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized row-materialization-admission snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRowMaterializationAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRowMaterializationAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRowMaterializationAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "row-materialization-admission freeze snapshot could not be parsed for row-lane materialization start projection",
    };
  }
}

function readRowLaneMaterializationStartFreezeSnapshot(
  freeze: BackendSpecificEncoderRowLaneMaterializationStartFreeze,
): ParsedRowLaneMaterializationStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized row-lane-materialization-start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRowLaneMaterializationStartFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRowLaneMaterializationStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRowLaneMaterializationStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "row-lane-materialization-start freeze snapshot could not be parsed for row-field emission admission projection",
    };
  }
}

function readRowFieldEmissionAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderRowFieldEmissionAdmissionFreeze,
): ParsedRowFieldEmissionAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized row-field-emission-admission snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRowFieldEmissionAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRowFieldEmissionAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRowFieldEmissionAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "row-field-emission-admission freeze snapshot could not be parsed for row-field emission start projection",
    };
  }
}

function readRowFieldEmissionStartFreezeSnapshot(
  freeze: BackendSpecificEncoderRowFieldEmissionStartFreeze,
): ParsedRowFieldEmissionStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized row-field-emission-start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedRowFieldEmissionStartFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedRowFieldEmissionStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedRowFieldEmissionStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "row-field-emission-start freeze snapshot could not be parsed for field-lane execution admission projection",
    };
  }
}

function readFieldLaneExecutionAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldLaneExecutionAdmissionFreeze,
): ParsedFieldLaneExecutionAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized field-lane-execution-admission snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldLaneExecutionAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldLaneExecutionAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldLaneExecutionAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-lane-execution-admission freeze snapshot could not be parsed for field-lane execution start projection",
    };
  }
}

function readFieldLaneExecutionStartFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldLaneExecutionStartFreeze,
): ParsedFieldLaneExecutionStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized field-lane-execution-start snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldLaneExecutionStartFreezeSnapshot["snapshotKind"],
      snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldLaneExecutionStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldLaneExecutionStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-lane-execution-start freeze snapshot could not be parsed for field-materialization launch admission projection",
    };
  }
}

function readFieldMaterializationLaunchAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationLaunchAdmissionFreeze,
): ParsedFieldMaterializationLaunchAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-launch-admission snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationLaunchAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationLaunchAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationLaunchAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-launch-admission freeze snapshot could not be parsed for later launch projection",
    };
  }
}

function readFieldMaterializationLaunchStartFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationLaunchStartFreeze,
): ParsedFieldMaterializationLaunchStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-launch-start snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationLaunchStartFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationLaunchStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationLaunchStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-launch-start freeze snapshot could not be parsed for later launch projection",
    };
  }
}

function readFieldMaterializationExecutionAdmissionFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationExecutionAdmissionFreeze,
): ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-execution-admission snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-execution-admission freeze snapshot could not be parsed for later execution projection",
    };
  }
}

function readFieldMaterializationExecutionStartFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationExecutionStartFreeze,
): ParsedFieldMaterializationExecutionStartFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-execution-start snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationExecutionStartFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationExecutionStartFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationExecutionStartFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-execution-start freeze snapshot could not be parsed for downstream materialization",
    };
  }
}

function readFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeFreeze,
): ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-execution-work-envelope snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-execution-work-envelope freeze snapshot could not be parsed for downstream planning",
    };
  }
}

function readFieldMaterializationExecutionPlanFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationExecutionPlanFreeze,
): ParsedFieldMaterializationExecutionPlanFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-execution-plan snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationExecutionPlanFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationExecutionPlanFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationExecutionPlanFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-execution-plan freeze snapshot could not be parsed for downstream planning consumers",
    };
  }
}

function readFieldMaterializationExecutionPlanHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffFreeze,
): ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-execution-plan-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-execution-plan-handoff freeze snapshot could not be parsed for downstream planning consumers",
    };
  }
}

function readFieldMaterializationPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationPlanningConsumerFreeze,
): ParsedFieldMaterializationPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-planning-consumer freeze snapshot could not be parsed for downstream planning consumers",
    };
  }
}

function readFieldMaterializationPlanningConsumerHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffFreeze,
): ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-planning-consumer-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-planning-consumer-handoff freeze snapshot could not be parsed for downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamConsumerFreeze,
): ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-consumer freeze snapshot could not be parsed for downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffFreeze,
): ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-boundary-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerFreeze,
): ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-planning-consumer freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze,
): ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-planning-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-planning-boundary-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-consumer freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-boundary-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-planning-consumer freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-planning-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-planning-boundary-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze,
): ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-downstream-pre-encoding-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-downstream-pre-encoding-consumer freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze,
): ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-downstream-pre-encoding-planning-consumer-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-downstream-pre-encoding-planning-consumer-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze,
): ParsedFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-downstream-planning-boundary-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-downstream-planning-boundary-consumer freeze snapshot could not be parsed for later downstream planning handoffs",
    };
  }
}

function readFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze,
): ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-downstream-planning-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-downstream-planning-boundary-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerFreeze,
): ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-downstream-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-downstream-planning-consumer freeze snapshot could not be parsed for later downstream planning handoffs",
    };
  }
}

function readFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerFreeze,
): ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-next-resolved-planning-consumer freeze snapshot could not be parsed for later downstream planning handoffs",
    };
  }
}


function readFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze,
): ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-planning-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved planning-boundary handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze,
): ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-planning-boundary-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved planning-boundary consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze,
): ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-planning-consumer-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved planning consumer handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerFreeze,
): ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffFreeze,
): ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-planning-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary planning consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-planning-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary planning handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-resolution-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary resolution consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-resolution-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary resolution handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-dispatch-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary dispatch consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-dispatch-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary dispatch handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-final-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary final consumer freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-final-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary final handoff freeze",
    };
  }
}

function readFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze,
): ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-next-resolved-boundary-closure-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason: "failed to parse field-materialization next resolved boundary closure consumer freeze",
    };
  }
}

type ParsedVerificationAttestationFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderVerificationAttestationFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderVerificationAttestationFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderVerificationAttestationStatus;
  proceedable: boolean;
  verificationFootprintSummary: string;
  attestationFootprintSummary: string;
  reason?: string;
};

function readVerificationAttestationFreezeSnapshot(
  freeze: BackendSpecificEncoderVerificationAttestationFreeze,
): ParsedVerificationAttestationFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;
    if (!Array.isArray(tuples)) {
      throw new Error("serialized verification-attestation snapshot was not a tuple array");
    }
    const get = (key: string) =>
      tuples.find((entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key)?.[1];
    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedVerificationAttestationFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedVerificationAttestationFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedVerificationAttestationFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      verificationFootprintSummary: String(get("verificationFootprintSummary") ?? "verification-rows:0"),
      attestationFootprintSummary: String(get("attestationFootprintSummary") ?? "attestation-rows:0"),
      reason:
        get("reason") === null || get("reason") === undefined ? undefined : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      verificationFootprintSummary: "verification-rows:0",
      attestationFootprintSummary: "attestation-rows:0",
      reason: "failed to parse verification attestation freeze",
    };
  }
}

type ParsedProofVerificationReceiptFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProofVerificationReceiptFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProofVerificationReceiptStatus;
  proceedable: boolean;
  receiptFootprintSummary: string;
  verificationFootprintSummary: string;
  reason?: string;
};

function readProofVerificationReceiptFreezeSnapshot(
  freeze: BackendSpecificEncoderProofVerificationReceiptFreeze,
): ParsedProofVerificationReceiptFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;
    if (!Array.isArray(tuples)) {
      throw new Error("serialized proof-verification-receipt snapshot was not a tuple array");
    }
    const get = (key: string) =>
      tuples.find((entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key)?.[1];
    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedProofVerificationReceiptFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedProofVerificationReceiptFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedProofVerificationReceiptFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      receiptFootprintSummary: String(get("receiptFootprintSummary") ?? "receipt-rows:0"),
      verificationFootprintSummary: String(get("verificationFootprintSummary") ?? "verification-rows:0"),
      reason:
        get("reason") === null || get("reason") === undefined ? undefined : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      receiptFootprintSummary: "receipt-rows:0",
      verificationFootprintSummary: "verification-rows:0",
      reason: "failed to parse proof verification receipt freeze",
    };
  }
}

type ParsedProofReceiptFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderProofReceiptFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProofReceiptFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProofReceiptStatus;
  proceedable: boolean;
  sessionFootprintSummary: string;
  receiptFootprintSummary: string;
  reason?: string;
};

function readProofReceiptFreezeSnapshot(
  freeze: BackendSpecificEncoderProofReceiptFreeze,
): ParsedProofReceiptFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized proof-receipt snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedProofReceiptFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedProofReceiptFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedProofReceiptFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      sessionFootprintSummary: String(get("sessionFootprintSummary") ?? "session-rows:0"),
      receiptFootprintSummary: String(get("receiptFootprintSummary") ?? "receipt-rows:0"),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      sessionFootprintSummary: "session-rows:0",
      receiptFootprintSummary: "receipt-rows:0",
      reason: "failed to parse proof receipt freeze",
    };
  }
}

type ParsedBackendWitnessPackageFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderBackendWitnessPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderBackendWitnessPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderBackendWitnessPackageStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  witnessFootprintSummary: string;
  reason?: string;
};

function readBackendWitnessPackageFreezeSnapshot(
  freeze: BackendSpecificEncoderBackendWitnessPackageFreeze,
): ParsedBackendWitnessPackageFreezeSnapshot {
  const tuples = JSON.parse(freeze.serialized) as [string, unknown][];
  const map = new Map(tuples);
  const get = (key: string) => map.get(key);
  return {
    snapshotKind: String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedBackendWitnessPackageFreezeSnapshot["snapshotKind"],
    snapshotVersion: Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedBackendWitnessPackageFreezeSnapshot["snapshotVersion"],
    encoderId: String(get("encoderId") ?? freeze.encoderId),
    encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
    status: String(get("status") ?? freeze.status) as ParsedBackendWitnessPackageFreezeSnapshot["status"],
    proceedable: Boolean(get("proceedable")),
    packageFootprintSummary: String(get("packageFootprintSummary") ?? "package unavailable"),
    witnessFootprintSummary: String(get("witnessFootprintSummary") ?? "witness unavailable"),
    reason: get("reason") == null ? undefined : String(get("reason")),
  };
}

type ParsedBackendProvingSessionFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderBackendProvingSessionFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderBackendProvingSessionFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderBackendProvingSessionStatus;
  proceedable: boolean;
  packageFootprintSummary: string;
  sessionFootprintSummary: string;
  reason?: string;
};

function readBackendProvingSessionFreezeSnapshot(
  freeze: BackendSpecificEncoderBackendProvingSessionFreeze,
): ParsedBackendProvingSessionFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized backend-proving-session snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedBackendProvingSessionFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedBackendProvingSessionFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedBackendProvingSessionFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      packageFootprintSummary: String(
        get("packageFootprintSummary") ?? "packaged:0 · excluded:0",
      ),
      sessionFootprintSummary: String(get("sessionFootprintSummary") ?? "session-rows:0"),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      packageFootprintSummary: "packaged:0 · excluded:0",
      sessionFootprintSummary: "session-rows:0",
      reason: "failed to parse backend proving session freeze",
    };
  }
}

type ParsedProvingInputPackageFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderProvingInputPackageFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProvingInputPackageFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProvingInputPackageStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  packageFootprintSummary: string;
  reason?: string;
};

function readProvingInputPackageFreezeSnapshot(
  freeze: BackendSpecificEncoderProvingInputPackageFreeze,
): ParsedProvingInputPackageFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized proving-input-package snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedProvingInputPackageFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedProvingInputPackageFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedProvingInputPackageFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      packageFootprintSummary: String(
        get("packageFootprintSummary") ?? "packaged:0 · excluded:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      packageFootprintSummary: "packaged:0 · excluded:0",
      reason: "failed to parse proving-input package freeze",
    };
  }
}

type ParsedConstraintSystemHandoffReadinessFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  handoffFootprintSummary: string;
  reason?: string;
};

function readConstraintSystemHandoffReadinessFreezeSnapshot(
  freeze: BackendSpecificEncoderConstraintSystemHandoffReadinessFreeze,
): ParsedConstraintSystemHandoffReadinessFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized constraint-system-handoff-readiness snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedConstraintSystemHandoffReadinessFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedConstraintSystemHandoffReadinessFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedConstraintSystemHandoffReadinessFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      handoffFootprintSummary: String(
        get("handoffFootprintSummary") ?? "accepted:0 · excluded:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      handoffFootprintSummary: "accepted:0 · excluded:0",
      reason: "failed to parse constraint-system handoff readiness freeze",
    };
  }
}

type ParsedProvingInputReadinessFreezeSnapshot = {
  snapshotKind: BackendSpecificEncoderProvingInputReadinessFreeze["snapshotKind"];
  snapshotVersion: BackendSpecificEncoderProvingInputReadinessFreeze["snapshotVersion"];
  encoderId: string;
  encoderLabel: string;
  status: BackendSpecificEncoderProvingInputReadinessStatus;
  proceedable: boolean;
  dispatchFootprintSummary: string;
  witnessMaterializationSummary: string;
  reason?: string;
};

function readProvingInputReadinessFreezeSnapshot(
  freeze: BackendSpecificEncoderProvingInputReadinessFreeze,
): ParsedProvingInputReadinessFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error("serialized proving-input-readiness snapshot was not a tuple array");
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedProvingInputReadinessFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedProvingInputReadinessFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedProvingInputReadinessFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      witnessMaterializationSummary: String(
        get("witnessMaterializationSummary") ?? "witness rows:0 · actionable:0 · blocked:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      witnessMaterializationSummary: "witness rows:0 · actionable:0 · blocked:0",
      reason: "failed to parse proving-input readiness freeze",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-consumer-artifact snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-consumer-artifact freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-planning-consumer-handoff snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-planning-consumer-handoff freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function readFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot(
  freeze: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze,
): ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot {
  try {
    const tuples = JSON.parse(freeze.serialized) as unknown;

    if (!Array.isArray(tuples)) {
      throw new Error(
        "serialized field-materialization-downstream-pre-encoding-planning-boundary-consumer snapshot was not a tuple array",
      );
    }

    const get = (key: string) =>
      tuples.find(
        (entry): entry is [string, unknown] => Array.isArray(entry) && entry[0] === key,
      )?.[1];

    return {
      snapshotKind:
        String(get("snapshotKind") ?? freeze.snapshotKind) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot["snapshotKind"],
      snapshotVersion:
        Number(get("snapshotVersion") ?? freeze.snapshotVersion) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot["snapshotVersion"],
      encoderId: String(get("encoderId") ?? freeze.encoderId),
      encoderLabel: String(get("encoderLabel") ?? freeze.encoderLabel),
      status:
        String(get("status") ?? freeze.status) as ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot["status"],
      proceedable: Boolean(get("proceedable")),
      dispatchFootprintSummary: String(
        get("dispatchFootprintSummary") ?? "accepted:0 · blocked:0 · unsupported:0",
      ),
      reason:
        get("reason") === null || get("reason") === undefined
          ? undefined
          : String(get("reason")),
    };
  } catch {
    return {
      snapshotKind: freeze.snapshotKind,
      snapshotVersion: freeze.snapshotVersion,
      encoderId: freeze.encoderId,
      encoderLabel: freeze.encoderLabel,
      status: freeze.status,
      proceedable: false,
      dispatchFootprintSummary: "accepted:0 · blocked:0 · unsupported:0",
      reason:
        "field-materialization-downstream-pre-encoding-planning-boundary-consumer freeze snapshot could not be parsed for later downstream planning consumers",
    };
  }
}

function summarizeFieldMaterializationExecutionStart(
  status: BackendSpecificEncoderFieldMaterializationExecutionStartStatus,
  snapshot: ParsedFieldMaterializationExecutionAdmissionFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationExecutionWorkEnvelope(
  status: BackendSpecificEncoderFieldMaterializationExecutionWorkEnvelopeStatus,
  snapshot: ParsedFieldMaterializationExecutionStartFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationExecutionPlan(
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanStatus,
  snapshot: ParsedFieldMaterializationExecutionWorkEnvelopeFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationExecutionPlanHandoff(
  status: BackendSpecificEncoderFieldMaterializationExecutionPlanHandoffStatus,
  snapshot: ParsedFieldMaterializationExecutionPlanFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationExecutionPlanHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationPlanningConsumerHandoff(
  status: BackendSpecificEncoderFieldMaterializationPlanningConsumerHandoffStatus,
  snapshot: ParsedFieldMaterializationPlanningConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamConsumer(
  status: BackendSpecificEncoderFieldMaterializationDownstreamConsumerStatus,
  snapshot: ParsedFieldMaterializationPlanningConsumerHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationDownstreamBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationDownstreamConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationDownstreamBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPlanningBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPlanningBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationDownstreamPlanningConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingConsumer(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerStatus,
  snapshot: ParsedFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextDownstreamPreEncodingConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingConsumerStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus,
  snapshot: ParsedFieldMaterializationNextDownstreamPreEncodingConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextDownstreamPlanningBoundaryConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerStatus,
  snapshot: ParsedFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextDownstreamPlanningBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationNextDownstreamPlanningConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextDownstreamPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextDownstreamPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationNextResolvedPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedPlanningBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedPlanningConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedPlanningBoundaryConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedPlanningConsumerHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedPlanningConsumerHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryPlanningConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryPlanningHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryResolutionConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryResolutionHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryDispatchConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryDispatchHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryFinalConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryFinalHandoff(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryFinalHandoffStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}


function summarizeFieldMaterializationNextResolvedBoundaryClosureConsumer(
  status: BackendSpecificEncoderFieldMaterializationNextResolvedBoundaryClosureConsumerStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeVerificationAttestation(
  status: BackendSpecificEncoderVerificationAttestationStatus,
  snapshot: ParsedProofVerificationReceiptFreezeSnapshot,
  attestationFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.verificationFootprintSummary, attestationFootprintSummary];
  if (reason) {
    parts.push(reason);
  }
  return parts.join(" · ");
}

function summarizeProofVerificationReceipt(
  status: BackendSpecificEncoderProofVerificationReceiptStatus,
  snapshot: ParsedProofReceiptFreezeSnapshot,
  verificationFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.receiptFootprintSummary, verificationFootprintSummary];
  if (reason) {
    parts.push(reason);
  }
  return parts.join(" · ");
}

function summarizeProofReceipt(
  status: BackendSpecificEncoderProofReceiptStatus,
  snapshot: ParsedBackendProvingSessionFreezeSnapshot,
  receiptFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.sessionFootprintSummary, receiptFootprintSummary];

  if (reason) {
    parts.push(reason);
  }

  return parts.join(" · ");
}

function summarizeBackendProvingSession(
  status: BackendSpecificEncoderBackendProvingSessionStatus,
  snapshot: ParsedProvingInputPackageFreezeSnapshot,
  sessionFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.packageFootprintSummary, sessionFootprintSummary];

  if (reason) {
    parts.push(reason);
  }

  return parts.join(" · ");
}

function summarizeBackendWitnessPackage(
  status: BackendSpecificEncoderBackendWitnessPackageStatus,
  snapshot: ParsedProvingInputPackageFreezeSnapshot,
  witnessFootprintSummary: string,
  reason?: string,
) {
  return reason
    ? `${status} · ${snapshot.packageFootprintSummary} · ${witnessFootprintSummary} · ${reason}`
    : `${status} · ${snapshot.packageFootprintSummary} · ${witnessFootprintSummary}`;
}

function summarizeProvingInputPackage(
  status: BackendSpecificEncoderProvingInputPackageStatus,
  snapshot: ParsedConstraintSystemPackageFreezeSnapshot,
  packageFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.dispatchFootprintSummary, packageFootprintSummary];

  if (reason) {
    parts.push(reason);
  }

  return parts.join(" · ");
}

function summarizeConstraintSystemHandoffReadiness(
  status: BackendSpecificEncoderConstraintSystemHandoffReadinessStatus,
  snapshot: ParsedProvingInputReadinessFreezeSnapshot,
  handoffFootprintSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.dispatchFootprintSummary, handoffFootprintSummary];

  if (reason) {
    parts.push(reason);
  }

  return parts.join(" · ");
}

function summarizeWitnessMaterializationManifestRows(
  rows: CanonicalCircuitInputWitnessMaterializationManifestRow[],
): string {
  const actionable = rows.filter((entry) => entry.actionable).length;
  const blocked = rows.length - actionable;
  return `witness rows:${rows.length} · actionable:${actionable} · blocked:${blocked}`;
}

function summarizeProvingInputReadiness(
  status: BackendSpecificEncoderProvingInputReadinessStatus,
  snapshot: ParsedFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeSnapshot,
  witnessMaterializationSummary: string,
  reason?: string,
): string {
  const parts = [status, `from ${snapshot.status}`, snapshot.dispatchFootprintSummary, witnessMaterializationSummary];

  if (reason) {
    parts.push(reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingConsumerArtifact(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function summarizeFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer(
  status: BackendSpecificEncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus,
  snapshot: ParsedFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeSnapshot,
): string {
  const parts = [
    status,
    `from ${snapshot.status}`,
    snapshot.dispatchFootprintSummary,
  ];

  if (snapshot.reason) {
    parts.push(snapshot.reason);
  }

  return parts.join(" · ");
}

function getEncoderWorkItemKind(action: string): BackendSpecificEncoderWorkItemKind {
  if (action === "direct-field-materialize") {
    return "direct-encode-item";
  }

  if (action === "split-materialize") {
    return "split-encode-item";
  }

  if (action === "width-resolve-materialize") {
    return "width-resolve-encode-item";
  }

  return "blocked";
}

function createEncoderWorkItemManifestSummary(
  workItems: BackendSpecificEncoderWorkItem[],
  blockedItems: BackendSpecificEncoderWorkItem[],
): string {
  if (workItems.length === 0 && blockedItems.length === 0) {
    return "no encoder work items";
  }

  const counts = new Map<BackendSpecificEncoderWorkItemKind, number>();

  for (const item of workItems) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }

  if (blockedItems.length > 0) {
    counts.set("blocked", (counts.get("blocked") ?? 0) + blockedItems.length);
  }

  return [...counts.entries()]
    .map(([kind, count]) => `${kind}:${count}`)
    .join(" · ");
}

function buildEncoderExecutionBatches(
  workItems: BackendSpecificEncoderWorkItem[],
): BackendSpecificEncoderExecutionBatch[] {
  const batches: BackendSpecificEncoderExecutionBatch[] = [];
  let current:
    | {
        kind: BackendSpecificEncoderExecutionBatchKind;
        sectionName: string;
        memberWorkItems: BackendSpecificEncoderWorkItem[];
      }
    | undefined;

  const pushCurrent = () => {
    if (!current || current.memberWorkItems.length === 0) {
      return;
    }

    const first = current.memberWorkItems[0];
    const last = current.memberWorkItems[current.memberWorkItems.length - 1];

    batches.push({
      batchIndex: batches.length,
      kind: current.kind,
      actionable: true,
      memberWorkItems: current.memberWorkItems,
      firstWorkItemIndex: first.workItemIndex,
      lastWorkItemIndex: last.workItemIndex,
      sectionName: current.sectionName,
      summary: `${current.kind} · ${current.memberWorkItems.length} item${current.memberWorkItems.length === 1 ? "" : "s"} · ${current.sectionName}`,
    });
  };

  for (const item of workItems) {
    const batchKind = getEncoderExecutionBatchKind(item.kind);

    if (
      current &&
      current.kind === batchKind &&
      current.sectionName === item.sectionName
    ) {
      current.memberWorkItems.push(item);
      continue;
    }

    pushCurrent();
    current = {
      kind: batchKind,
      sectionName: item.sectionName,
      memberWorkItems: [item],
    };
  }

  pushCurrent();
  return batches;
}

function buildBlockedExecutionBatches(
  blockedItems: BackendSpecificEncoderWorkItem[],
  startingIndex: number,
): BackendSpecificEncoderExecutionBatch[] {
  return blockedItems.map((item, index) => ({
    batchIndex: startingIndex + index,
    kind: "blocked",
    actionable: false,
    memberWorkItems: [item],
    firstWorkItemIndex: item.workItemIndex,
    lastWorkItemIndex: item.workItemIndex,
    sectionName: item.sectionName,
    summary: `blocked batch · ${item.slotLabel}`,
    blockedReason: item.blockedReason ?? item.summary,
  }));
}

function getEncoderExecutionBatchKind(
  kind: BackendSpecificEncoderWorkItemKind,
): BackendSpecificEncoderExecutionBatchKind {
  if (kind === "direct-encode-item") {
    return "direct-encode-batch";
  }

  if (kind === "split-encode-item") {
    return "split-encode-batch";
  }

  if (kind === "width-resolve-encode-item") {
    return "width-resolve-batch";
  }

  return "blocked";
}

function createEncoderExecutionPlanSummary(
  batches: BackendSpecificEncoderExecutionBatch[],
  blockedBatches: BackendSpecificEncoderExecutionBatch[],
): string {
  if (batches.length === 0 && blockedBatches.length === 0) {
    return "no encoder execution plan";
  }

  const counts = new Map<BackendSpecificEncoderExecutionBatchKind, number>();

  for (const batch of batches) {
    counts.set(batch.kind, (counts.get(batch.kind) ?? 0) + 1);
  }

  if (blockedBatches.length > 0) {
    counts.set("blocked", (counts.get("blocked") ?? 0) + blockedBatches.length);
  }

  return [...counts.entries()]
    .map(([kind, count]) => `${kind}:${count}`)
    .join(" · ");
}

function getEncoderDispatchRequestKind(
  kind: BackendSpecificEncoderExecutionBatchKind,
): BackendSpecificEncoderDispatchRequestKind {
  if (kind === "direct-encode-batch") {
    return "direct-encode-dispatch";
  }

  if (kind === "split-encode-batch") {
    return "split-encode-dispatch";
  }

  if (kind === "width-resolve-batch") {
    return "width-resolve-dispatch";
  }

  return "blocked";
}

function createEncoderDispatchContractSummary(
  requests: BackendSpecificEncoderDispatchRequest[],
  blockedRequests: BackendSpecificEncoderDispatchRequest[],
): string {
  if (requests.length === 0 && blockedRequests.length === 0) {
    return "no encoder dispatch contract";
  }

  const counts = new Map<BackendSpecificEncoderDispatchRequestKind, number>();

  for (const request of requests) {
    counts.set(request.kind, (counts.get(request.kind) ?? 0) + 1);
  }

  if (blockedRequests.length > 0) {
    counts.set("blocked", (counts.get("blocked") ?? 0) + blockedRequests.length);
  }

  return [...counts.entries()]
    .map(([kind, count]) => `${kind}:${count}`)
    .join(" · ");
}

function acknowledgeDispatchRequest(
  request: BackendSpecificEncoderDispatchRequest,
): BackendSpecificEncoderDispatchAckEntry {
  if (request.requestVersion !== 1) {
    return {
      requestIndex: request.requestIndex,
      requestKind: request.requestKind,
      requestVersion: request.requestVersion,
      dispatchKind: request.kind,
      sourceBatchIndex: request.sourceBatchIndex,
      accepted: false,
      status: "unsupported-request-version",
      summary: `dispatch request ${request.requestIndex} uses unsupported version`,
      reason: "expected request version 1",
    };
  }

  if (request.requestKind !== "vanta-backend-encoder-dispatch-request-v1") {
    return {
      requestIndex: request.requestIndex,
      requestKind: request.requestKind,
      requestVersion: request.requestVersion,
      dispatchKind: request.kind,
      sourceBatchIndex: request.sourceBatchIndex,
      accepted: false,
      status: "unsupported-request-kind",
      summary: `dispatch request ${request.requestIndex} uses unsupported kind`,
      reason: "expected vanta-backend-encoder-dispatch-request-v1",
    };
  }

  if (!request.actionable || request.kind === "blocked") {
    return {
      requestIndex: request.requestIndex,
      requestKind: request.requestKind,
      requestVersion: request.requestVersion,
      dispatchKind: request.kind,
      sourceBatchIndex: request.sourceBatchIndex,
      accepted: false,
      status: "blocked",
      summary: `dispatch request ${request.requestIndex} is blocked`,
      reason: request.blockedReason ?? "dispatch request is not actionable",
    };
  }

  return {
    requestIndex: request.requestIndex,
    requestKind: request.requestKind,
    requestVersion: request.requestVersion,
    dispatchKind: request.kind,
    sourceBatchIndex: request.sourceBatchIndex,
    accepted: true,
    status: "not-yet-encoded",
    summary: `dispatch request ${request.requestIndex} accepted by backend stub`,
    reason: "accepted by stub but not yet encoded",
  };
}

function createEncoderDispatchAckSummary(
  entries: BackendSpecificEncoderDispatchAckEntry[],
): string {
  if (entries.length === 0) {
    return "no encoder dispatch acknowledgements";
  }

  const counts = new Map<BackendSpecificEncoderDispatchAckStatus, number>();

  for (const entry of entries) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => `${status}:${count}`)
    .join(" · ");
}
