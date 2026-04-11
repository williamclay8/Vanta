import { useEffect, useRef, useState } from "react";
import {
  inspectCanonicalLifecycleNode,
  listCanonicalLifecycleInspectionEvents,
  listCanonicalLifecycleLineages,
  listCanonicalLifecycleNodeIds,
  listCanonicalLifecycleReconciliationCohorts,
} from "@/zk/liveLifecycleInspection";
import { inspectCanonicalLifecycleWitnessPackage } from "@/zk/canonicalWitnessPackage";
import {
  inspectGenericPhase1EncoderDispatchAckForLifecycleNode,
  inspectGenericPhase1EncoderDispatchReadinessForLifecycleNode,
  inspectGenericPhase1EncoderOrchestrationHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderOrchestrationHandoffForLifecycleNode,
  inspectGenericPhase1EncoderRunnerIntakeFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerIntakeForLifecycleNode,
  inspectGenericPhase1EncoderEncodingAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderEncodingAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderFieldEncodingStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldEncodingStartForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldRowMaterializationStartForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionStartForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputReadinessForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode,
  inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputPackageForLifecycleNode,
  inspectGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldMaterializationLaunchStartForLifecycleNode,
  inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderFieldLaneExecutionStartForLifecycleNode,
  inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRowFieldEmissionAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRowFieldEmissionStartForLifecycleNode,
  inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRowLaneMaterializationStartForLifecycleNode,
  inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRowMaterializationAdmissionForLifecycleNode,
  inspectGenericPhase1EncoderRunnerExecutionEntryPlanForLifecycleNode,
  inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerExecutionSessionForLifecycleNode,
  inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerExecutionInputForLifecycleNode,
  inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerLaunchEnvelopeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerStartTicketFreezeForLifecycleNode,
  inspectGenericPhase1EncoderRunnerStartTicketForLifecycleNode,
  inspectGenericPhase1EncoderPreflightFreezeForLifecycleNode,
  inspectGenericPhase1EncoderPreflightReportForLifecycleNode,
  inspectGenericPhase1EncoderSessionTicketForLifecycleNode,
  inspectGenericPhase1EncoderDispatchContractForLifecycleNode,
  inspectGenericPhase1EncoderExecutionPlanForLifecycleNode,
  inspectGenericPhase1EncoderStubForLifecycleNode,
  inspectGenericPhase1EncoderWorkItemsForLifecycleNode,
} from "@/zk/backendEncoderStub";
import {
  inspectCanonicalLifecycleCircuitInputEncoding,
  inspectCanonicalLifecycleCircuitInputFieldCandidates,
  inspectCanonicalLifecycleCircuitInputFieldConversionManifest,
  inspectCanonicalLifecycleCircuitInputFieldEmissionSchedule,
  inspectCanonicalLifecycleCircuitInputFieldGroupReadiness,
  inspectCanonicalLifecycleCircuitInputLaneArityPlans,
  inspectCanonicalLifecycleCircuitInputFieldLanePlans,
  inspectCanonicalLifecycleCircuitInputFieldMappingPrecheck,
  inspectCanonicalLifecycleCircuitInputFieldValuePreimages,
  inspectCanonicalLifecycleDraftCanonicalizations,
  inspectCanonicalLifecycleFiniteFieldInputDrafts,
  inspectCanonicalLifecycleFieldElementDrafts,
  inspectCanonicalLifecycleFieldElementAssemblies,
  inspectCanonicalLifecycleWitnessLayoutManifest,
  inspectCanonicalLifecycleWitnessRealizationPrecheck,
  inspectCanonicalLifecycleWitnessRealizationRecipes,
  inspectCanonicalLifecycleWitnessMaterializationManifest,
  inspectCanonicalLifecycleBackendBridgeContract,
  inspectCanonicalLifecycleBackendAdapterHandshake,
  inspectCanonicalLifecycleBackendAdapterNormalizedBundle,
  inspectCanonicalLifecycleAdapterPayloadFreeze,
  inspectCanonicalLifecycleModulusReadiness,
  inspectCanonicalLifecycleReductionPlans,
  inspectCanonicalLifecycleCircuitInputSlotNormalization,
} from "@/zk/canonicalCircuitInput";

function abbreviate(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function formatBranchQuality(value: "explicit" | "heuristic" | "unresolved") {
  if (value === "explicit") {
    return "explicit";
  }

  if (value === "heuristic") {
    return "heuristic";
  }

  return "unresolved";
}

function formatSuccessorKind(value: "recipient" | "change" | "retained" | "output" | undefined) {
  if (!value) {
    return "branch";
  }

  return value;
}

function formatChainResolutionState(value: "resolved" | "partial" | "unresolved") {
  return value;
}

export function InternalCanonicalLifecyclePanel() {
  const events = listCanonicalLifecycleInspectionEvents();
  const lineages = listCanonicalLifecycleLineages();
  const lifecycleNodeIds = listCanonicalLifecycleNodeIds();
  const reconciliationCohorts = listCanonicalLifecycleReconciliationCohorts();
  const [mode, setMode] = useState<"chronological" | "lineage">("chronological");
  const [lookupLifecycleId, setLookupLifecycleId] = useState("");
  const [jumpTarget, setJumpTarget] = useState<{ lineageKey: string; eventId?: string } | null>(null);
  const [lookupJumpTarget, setLookupJumpTarget] = useState<string | null>(null);
  const lifecycleNodeLookup = inspectCanonicalLifecycleNode(lookupLifecycleId);
  const witnessPackageInspection = inspectCanonicalLifecycleWitnessPackage(lookupLifecycleId);
  const circuitInputInspection = inspectCanonicalLifecycleCircuitInputEncoding(lookupLifecycleId);
  const circuitInputFieldGroups = inspectCanonicalLifecycleCircuitInputFieldGroupReadiness(
    lookupLifecycleId,
  );
  const fieldMappingPrecheck = inspectCanonicalLifecycleCircuitInputFieldMappingPrecheck(
    lookupLifecycleId,
  );
  const slotNormalization = inspectCanonicalLifecycleCircuitInputSlotNormalization(lookupLifecycleId);
  const fieldCandidates = inspectCanonicalLifecycleCircuitInputFieldCandidates(lookupLifecycleId);
  const fieldValuePreimages = inspectCanonicalLifecycleCircuitInputFieldValuePreimages(
    lookupLifecycleId,
  );
  const fieldLanePlans = inspectCanonicalLifecycleCircuitInputFieldLanePlans(lookupLifecycleId);
  const laneArityPlans = inspectCanonicalLifecycleCircuitInputLaneArityPlans(lookupLifecycleId);
  const fieldEmissionSchedule = inspectCanonicalLifecycleCircuitInputFieldEmissionSchedule(
    lookupLifecycleId,
  );
  const fieldConversionManifest = inspectCanonicalLifecycleCircuitInputFieldConversionManifest(
    lookupLifecycleId,
  );
  const finiteFieldInputDrafts = inspectCanonicalLifecycleFiniteFieldInputDrafts(lookupLifecycleId);
  const draftCanonicalizations = inspectCanonicalLifecycleDraftCanonicalizations(lookupLifecycleId);
  const modulusReadiness = inspectCanonicalLifecycleModulusReadiness(lookupLifecycleId);
  const reductionPlans = inspectCanonicalLifecycleReductionPlans(lookupLifecycleId);
  const fieldElementDrafts = inspectCanonicalLifecycleFieldElementDrafts(lookupLifecycleId);
  const fieldElementAssemblies = inspectCanonicalLifecycleFieldElementAssemblies(lookupLifecycleId);
  const witnessLayoutManifest = inspectCanonicalLifecycleWitnessLayoutManifest(lookupLifecycleId);
  const witnessRealizationPrecheck = inspectCanonicalLifecycleWitnessRealizationPrecheck(
    lookupLifecycleId,
  );
  const witnessRealizationRecipes = inspectCanonicalLifecycleWitnessRealizationRecipes(
    lookupLifecycleId,
  );
  const witnessMaterializationManifest = inspectCanonicalLifecycleWitnessMaterializationManifest(
    lookupLifecycleId,
  );
  const backendBridgeContract = inspectCanonicalLifecycleBackendBridgeContract(lookupLifecycleId);
  const backendAdapterHandshake = inspectCanonicalLifecycleBackendAdapterHandshake(
    lookupLifecycleId,
  );
  const backendAdapterNormalizedBundle =
    inspectCanonicalLifecycleBackendAdapterNormalizedBundle(lookupLifecycleId);
  const adapterPayloadFreeze = inspectCanonicalLifecycleAdapterPayloadFreeze(lookupLifecycleId);
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
  const encoderSessionTicket =
    inspectGenericPhase1EncoderSessionTicketForLifecycleNode(lookupLifecycleId);
  const encoderPreflight =
    inspectGenericPhase1EncoderPreflightReportForLifecycleNode(lookupLifecycleId);
  const encoderPreflightFreeze =
    inspectGenericPhase1EncoderPreflightFreezeForLifecycleNode(lookupLifecycleId);
  const encoderOrchestrationHandoff =
    inspectGenericPhase1EncoderOrchestrationHandoffForLifecycleNode(lookupLifecycleId);
  const encoderOrchestrationHandoffFreeze =
    inspectGenericPhase1EncoderOrchestrationHandoffFreezeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerIntake =
    inspectGenericPhase1EncoderRunnerIntakeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerIntakeFreeze =
    inspectGenericPhase1EncoderRunnerIntakeFreezeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerLaunchEnvelope =
    inspectGenericPhase1EncoderRunnerLaunchEnvelopeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerLaunchEnvelopeFreeze =
    inspectGenericPhase1EncoderRunnerLaunchEnvelopeFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRunnerStartTicket =
    inspectGenericPhase1EncoderRunnerStartTicketForLifecycleNode(lookupLifecycleId);
  const encoderRunnerStartTicketFreeze =
    inspectGenericPhase1EncoderRunnerStartTicketFreezeForLifecycleNode(lookupLifecycleId);
  const encoderRunnerExecutionInput =
    inspectGenericPhase1EncoderRunnerExecutionInputForLifecycleNode(lookupLifecycleId);
  const encoderRunnerExecutionEntryPlan =
    inspectGenericPhase1EncoderRunnerExecutionEntryPlanForLifecycleNode(lookupLifecycleId);
  const encoderRunnerExecutionEntryPlanFreeze =
    inspectGenericPhase1EncoderRunnerExecutionEntryPlanFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRunnerExecutionSession =
    inspectGenericPhase1EncoderRunnerExecutionSessionForLifecycleNode(lookupLifecycleId);
  const encoderRunnerExecutionSessionFreeze =
    inspectGenericPhase1EncoderRunnerExecutionSessionFreezeForLifecycleNode(lookupLifecycleId);
  const encoderEncodingAdmission =
    inspectGenericPhase1EncoderEncodingAdmissionForLifecycleNode(lookupLifecycleId);
  const encoderEncodingAdmissionFreeze =
    inspectGenericPhase1EncoderEncodingAdmissionFreezeForLifecycleNode(lookupLifecycleId);
  const encoderFieldEncodingStart =
    inspectGenericPhase1EncoderFieldEncodingStartForLifecycleNode(lookupLifecycleId);
  const encoderFieldEncodingStartFreeze =
    inspectGenericPhase1EncoderFieldEncodingStartFreezeForLifecycleNode(lookupLifecycleId);
  const encoderFieldMaterializationAdmission =
    inspectGenericPhase1EncoderFieldMaterializationAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationAdmissionFreeze =
    inspectGenericPhase1EncoderFieldMaterializationAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldRowMaterializationStart =
    inspectGenericPhase1EncoderFieldRowMaterializationStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldRowMaterializationStartFreeze =
    inspectGenericPhase1EncoderFieldRowMaterializationStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowMaterializationAdmission =
    inspectGenericPhase1EncoderRowMaterializationAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowMaterializationAdmissionFreeze =
    inspectGenericPhase1EncoderRowMaterializationAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowLaneMaterializationStart =
    inspectGenericPhase1EncoderRowLaneMaterializationStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowLaneMaterializationStartFreeze =
    inspectGenericPhase1EncoderRowLaneMaterializationStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowFieldEmissionAdmission =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowFieldEmissionAdmissionFreeze =
    inspectGenericPhase1EncoderRowFieldEmissionAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowFieldEmissionStart =
    inspectGenericPhase1EncoderRowFieldEmissionStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderRowFieldEmissionStartFreeze =
    inspectGenericPhase1EncoderRowFieldEmissionStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldLaneExecutionAdmission =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldLaneExecutionAdmissionFreeze =
    inspectGenericPhase1EncoderFieldLaneExecutionAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldLaneExecutionStart =
    inspectGenericPhase1EncoderFieldLaneExecutionStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldLaneExecutionStartFreeze =
    inspectGenericPhase1EncoderFieldLaneExecutionStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationLaunchAdmission =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationLaunchAdmissionFreeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationLaunchStart =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationLaunchStartFreeze =
    inspectGenericPhase1EncoderFieldMaterializationLaunchStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionAdmission =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionAdmissionFreeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionAdmissionFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionStart =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionStartFreeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionStartFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionWorkEnvelope =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionWorkEnvelopeFreeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionWorkEnvelopeFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionPlan =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionPlanFreeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionPlanHandoff =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationExecutionPlanHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationExecutionPlanHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationPlanningConsumerHandoff =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationPlanningConsumerHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationPlanningConsumerHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamConsumer =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPlanningBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingConsumer =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPreEncodingConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextDownstreamPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningConsumerHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryFinalConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryFinalHandoff =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryClosureConsumer =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze =
    inspectGenericPhase1EncoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreezeForLifecycleNode(
      lookupLifecycleId,
    );
  const encoderProvingInputReadiness =
    inspectGenericPhase1EncoderProvingInputReadinessForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputReadinessFreeze =
    inspectGenericPhase1EncoderProvingInputReadinessFreezeForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemHandoffReadiness =
    inspectGenericPhase1EncoderConstraintSystemHandoffReadinessForLifecycleNode(lookupLifecycleId);
  const encoderConstraintSystemHandoffReadinessFreeze =
    inspectGenericPhase1EncoderConstraintSystemHandoffReadinessFreezeForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputPackage =
    inspectGenericPhase1EncoderProvingInputPackageForLifecycleNode(lookupLifecycleId);
  const encoderProvingInputPackageFreeze =
    inspectGenericPhase1EncoderProvingInputPackageFreezeForLifecycleNode(lookupLifecycleId);
  const lineageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lookupPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!jumpTarget || mode !== "lineage") {
      return;
    }

    const targetElement = lineageRefs.current[jumpTarget.lineageKey];

    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const timeoutId = window.setTimeout(() => {
      setJumpTarget(null);
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [jumpTarget, mode]);

  useEffect(() => {
    if (!lookupJumpTarget || lookupLifecycleId.trim() !== lookupJumpTarget) {
      return;
    }

    const targetElement = lookupPanelRef.current;

    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const timeoutId = window.setTimeout(() => {
      setLookupJumpTarget(null);
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lookupJumpTarget, lookupLifecycleId]);

  return (
    <article className="dashboard-card">
      <details>
        <summary>Internal canonical lifecycle inspection</summary>
        <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
          Internal/debug only. This merges retained bridge summaries across Shield, Send,
          Swap, and Unshield into one ordered canonical note-history storyline.
        </p>
        <div className="status-actions" style={{ marginTop: 12 }}>
          <button
            className={mode === "chronological" ? "button button-primary" : "button button-ghost"}
            type="button"
            onClick={() => {
              setMode("chronological");
            }}
          >
            Chronological stream
          </button>
          <button
            className={mode === "lineage" ? "button button-primary" : "button button-ghost"}
            type="button"
            onClick={() => {
              setMode("lineage");
            }}
          >
            Lineage grouping
          </button>
        </div>

        <div
          ref={lookupPanelRef}
          className="status-panel"
          style={{
            marginTop: 12,
            ...(lookupJumpTarget
              ? {
                  outline: "2px solid rgba(255,255,255,0.2)",
                  outlineOffset: 2,
                  background: "rgba(255,255,255,0.03)",
                }
              : {}),
          }}
        >
          <span>Lifecycle node lookup</span>
          <p className="shield-helper shield-helper--meta">
            Internal/debug only. Inspect one retained lifecycle node directly by explicit lifecycle ID.
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <input
              list="canonical-lifecycle-node-ids"
              placeholder="canonical-lifecycle:node:..."
              value={lookupLifecycleId}
              onChange={(event) => {
                setLookupLifecycleId(event.target.value);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
              }}
            />
            <datalist id="canonical-lifecycle-node-ids">
              {lifecycleNodeIds.map((lifecycleId) => (
                <option key={lifecycleId} value={lifecycleId} />
              ))}
            </datalist>
          </div>

          {lookupLifecycleId.trim().length > 0 && lifecycleNodeLookup.found ? (
            <div className="review-list" style={{ marginTop: 12 }}>
              <div className="review-row">
                <span>Lifecycle ID</span>
                <strong>{lifecycleNodeLookup.lifecycleId ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Lookup status</span>
                <strong>{lifecycleNodeLookup.status}</strong>
              </div>
              <div className="review-row">
                <span>Lineage ID</span>
                <strong>{abbreviate(lifecycleNodeLookup.lineageId)}</strong>
              </div>
              <div className="review-row">
                <span>Node role</span>
                <strong>{lifecycleNodeLookup.nodeRole ?? "Unknown"}</strong>
              </div>
              <div className="review-row">
                <span>Source context</span>
                <strong>{lifecycleNodeLookup.sourceEventTitle ?? lifecycleNodeLookup.sourceKind ?? "Unknown"}</strong>
              </div>
              <div className="review-row">
                <span>Asset summary</span>
                <strong>{lifecycleNodeLookup.amountSummary ?? lifecycleNodeLookup.assetSummary ?? "Unknown"}</strong>
              </div>
              <div className="review-row">
                <span>Spend status</span>
                <strong>{lifecycleNodeLookup.spendStatus}</strong>
              </div>
              <div className="review-row">
                <span>Nullifier-ready</span>
                <strong>{lifecycleNodeLookup.nullifierReady ? "Yes" : "No"}</strong>
              </div>
              <div className="review-row">
                <span>Witness readiness</span>
                <strong>{lifecycleNodeLookup.witnessReadiness}</strong>
              </div>
              <div className="review-row">
                <span>Derived path</span>
                <strong>
                  {lifecycleNodeLookup.derivedPathReady
                    ? `${lifecycleNodeLookup.derivedPathKind} · depth ${lifecycleNodeLookup.derivedPathDepth ?? 0} · leaf ${lifecycleNodeLookup.derivedPathLeafIndex ?? 0}`
                    : "Not attached"}
                </strong>
              </div>
              <div className="review-row">
                <span>Path semantics</span>
                <strong>{lifecycleNodeLookup.derivedPathSemantics ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Path digests</span>
                <strong>
                  {lifecycleNodeLookup.derivedPathDigestReady
                    ? `${lifecycleNodeLookup.derivedPathDigestScheme} · ${lifecycleNodeLookup.derivedPathDigestLevelCount ?? 0} levels`
                    : "Not attached"}
                </strong>
              </div>
              <div className="review-row">
                <span>Candidate path</span>
                <strong>
                  {lifecycleNodeLookup.candidatePathReady
                    ? `${lifecycleNodeLookup.candidatePathKind} · ${lifecycleNodeLookup.candidatePathScheme} · depth ${lifecycleNodeLookup.candidatePathDepth ?? 0}`
                    : "Not attached"}
                </strong>
              </div>
              <div className="review-row">
                <span>Candidate agreement</span>
                <strong>{lifecycleNodeLookup.candidateAgreementStatus}</strong>
              </div>
              <div className="review-row">
                <span>Witness package</span>
                <strong>
                  {`${lifecycleNodeLookup.witnessPackageReadiness} · ${lifecycleNodeLookup.witnessPackageSummary ?? "Unavailable"}`}
                </strong>
              </div>
              <div className="review-row">
                <span>Circuit input</span>
                <strong>
                  {`${lifecycleNodeLookup.circuitInputReadiness} · ${lifecycleNodeLookup.circuitInputSummary ?? "Unavailable"}`}
                </strong>
              </div>
              <div className="review-row">
                <span>Field groups</span>
                <strong>{lifecycleNodeLookup.circuitInputFieldGroupSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field mapping</span>
                <strong>{lifecycleNodeLookup.fieldMappingPrecheckSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Slot shaping</span>
                <strong>{lifecycleNodeLookup.slotNormalizationSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field candidates</span>
                <strong>{lifecycleNodeLookup.fieldCandidateSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field preimages</span>
                <strong>{lifecycleNodeLookup.fieldValuePreimageSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field lanes</span>
                <strong>{lifecycleNodeLookup.fieldLanePlanSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Lane arity</span>
                <strong>{lifecycleNodeLookup.laneArityPlanSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field schedule</span>
                <strong>{lifecycleNodeLookup.fieldEmissionScheduleSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field manifest</span>
                <strong>{lifecycleNodeLookup.fieldConversionManifestSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field drafts</span>
                <strong>{lifecycleNodeLookup.finiteFieldDraftSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Canonicalized drafts</span>
                <strong>{lifecycleNodeLookup.draftCanonicalizationSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Modulus readiness</span>
                <strong>{lifecycleNodeLookup.modulusReadinessSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Reduction plans</span>
                <strong>{lifecycleNodeLookup.reductionPlanSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field-element drafts</span>
                <strong>{lifecycleNodeLookup.fieldElementDraftSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Field-element assembly</span>
                <strong>{lifecycleNodeLookup.fieldElementAssemblySummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Witness layout</span>
                <strong>{lifecycleNodeLookup.witnessLayoutSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Witness realization</span>
                <strong>{lifecycleNodeLookup.witnessRealizationSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Witness realization recipes</span>
                <strong>{lifecycleNodeLookup.witnessRealizationRecipeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Materialization manifest</span>
                <strong>{lifecycleNodeLookup.witnessMaterializationManifestSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Backend bridge</span>
                <strong>{lifecycleNodeLookup.backendBridgeContractSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Adapter handshake</span>
                <strong>{lifecycleNodeLookup.backendAdapterHandshakeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Adapter bundle</span>
                <strong>{lifecycleNodeLookup.backendAdapterNormalizedSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Frozen adapter payload</span>
                <strong>{lifecycleNodeLookup.adapterPayloadFreezeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder stub</span>
                <strong>{lifecycleNodeLookup.encoderStubSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder work items</span>
                <strong>{lifecycleNodeLookup.encoderWorkItemSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder execution plan</span>
                <strong>{lifecycleNodeLookup.encoderExecutionPlanSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder dispatch</span>
                <strong>{lifecycleNodeLookup.encoderDispatchSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder dispatch ack</span>
                <strong>{lifecycleNodeLookup.encoderDispatchAckSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder dispatch readiness</span>
                <strong>{lifecycleNodeLookup.encoderDispatchReadinessSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder session ticket</span>
                <strong>{lifecycleNodeLookup.encoderSessionTicketSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Encoder preflight</span>
                <strong>{lifecycleNodeLookup.encoderPreflightSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Frozen preflight</span>
                <strong>{lifecycleNodeLookup.encoderPreflightFreezeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Orchestration handoff</span>
                <strong>{lifecycleNodeLookup.encoderOrchestrationHandoffSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Frozen handoff</span>
                <strong>{lifecycleNodeLookup.encoderOrchestrationHandoffFreezeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Runner intake</span>
                <strong>{lifecycleNodeLookup.encoderRunnerIntakeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Frozen intake</span>
                <strong>{lifecycleNodeLookup.encoderRunnerIntakeFreezeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Launch envelope</span>
                <strong>{lifecycleNodeLookup.encoderRunnerLaunchEnvelopeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Frozen launch</span>
                <strong>{lifecycleNodeLookup.encoderRunnerLaunchEnvelopeFreezeSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Start ticket</span>
                <strong>{lifecycleNodeLookup.encoderRunnerStartTicketSummary ?? "Unavailable"}</strong>
              </div>
              <div className="review-row">
                <span>Root reconciliation</span>
                <strong>
                  {`${lifecycleNodeLookup.rootReconciliationStatus} · ${lifecycleNodeLookup.rootReconciliationScheme ?? "Unavailable"}`}
                </strong>
              </div>
              <div className="review-row">
                <span>Future root seam</span>
                <strong>
                  {lifecycleNodeLookup.futureRootSeamKind
                    ? `${lifecycleNodeLookup.futureRootSeamKind} · ${lifecycleNodeLookup.futureRootSeamScheme ?? "unknown-scheme"} · ${lifecycleNodeLookup.futureRootSeamLeafCount ?? 0} leaves`
                    : "No retained seam source"}
                </strong>
              </div>
              <div className="review-row">
                <span>Root compare</span>
                <strong>
                  {lifecycleNodeLookup.currentRootLikeDigest
                    ? `${abbreviate(lifecycleNodeLookup.currentRootLikeDigest)} vs ${abbreviate(lifecycleNodeLookup.futureRootSeamValue)}`
                    : "Not compare-ready"}
                </strong>
              </div>
              <div className="review-row">
                <span>Tree seam</span>
                <strong>
                  {lifecycleNodeLookup.candidatePathReady && lifecycleNodeLookup.futureRootSeamScheme
                    ? "candidate path and candidate root aligned"
                    : "candidate tree seam incomplete"}
                </strong>
              </div>
              <div className="review-row">
                <span>Membership linkage</span>
                <strong>{lifecycleNodeLookup.membershipLinkedByLifecycle ? "lifecycle-linked" : "not linked"}</strong>
              </div>
              <div className="review-row">
                <span>Commitment</span>
                <strong>{abbreviate(lifecycleNodeLookup.commitment)}</strong>
              </div>
              <div className="review-row">
                <span>Insertion</span>
                <strong>
                  {lifecycleNodeLookup.insertionIndex !== undefined
                    ? `${lifecycleNodeLookup.insertionIndex} · ${abbreviate(lifecycleNodeLookup.snapshotRoot)}`
                    : "Unavailable"}
                </strong>
              </div>
              <div className="review-row">
                <span>Predecessor lifecycle</span>
                <strong>{abbreviate(lifecycleNodeLookup.predecessorLifecycleId)}</strong>
              </div>
              <div className="review-row">
                <span>Successor lifecycles</span>
                <strong>
                  {lifecycleNodeLookup.successorLifecycleIds.length > 0
                    ? lifecycleNodeLookup.successorLifecycleIds.map((value) => abbreviate(value)).join(", ")
                    : "None"}
                </strong>
              </div>
              <div className="review-row">
                <span>Consumption</span>
                <strong>
                  {lifecycleNodeLookup.canonicalConsumptionId
                    ? `${lifecycleNodeLookup.canonicalConsumptionKind ?? "consumption"} · ${abbreviate(lifecycleNodeLookup.canonicalConsumptionId)}`
                    : "No canonical consumption attached"}
                </strong>
              </div>
              <div className="review-row">
                <span>Consumption basis</span>
                <strong>{abbreviate(lifecycleNodeLookup.canonicalConsumptionBasis)}</strong>
              </div>
              <div className="review-row">
                <span>Nullifier stub</span>
                <strong>{abbreviate(lifecycleNodeLookup.canonicalNullifierStub)}</strong>
              </div>
              <div className="review-row">
                <span>Consumption record lifecycle</span>
                <strong>{abbreviate(lifecycleNodeLookup.consumptionRecordLifecycleId)}</strong>
              </div>
              <div className="review-row">
                <span>Lineage grouping</span>
                <strong>
                  {lifecycleNodeLookup.lineageLabel
                    ? `${lifecycleNodeLookup.groupingQuality ?? "unknown"} · ${lifecycleNodeLookup.lineageLabel}`
                    : "Not currently grouped"}
                </strong>
              </div>
            </div>
          ) : null}

          {lookupLifecycleId.trim().length > 0 && lifecycleNodeLookup.found ? (
            <details style={{ marginTop: 12 }}>
              <summary>Witness package detail</summary>
              <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
                Internal/debug only. Shows the current assembled package seam for this lifecycle
                node before circuit-input encoding starts.
              </p>
              <div className="review-list" style={{ marginTop: 12 }}>
                <div className="review-row">
                  <span>Package kind</span>
                  <strong>{`${witnessPackageInspection.package.kind} · v${witnessPackageInspection.package.version}`}</strong>
                </div>
                <div className="review-row">
                  <span>Readiness</span>
                  <strong>{witnessPackageInspection.package.readiness}</strong>
                </div>
                <div className="review-row">
                  <span>Lifecycle identity</span>
                  <strong>
                    {witnessPackageInspection.hasLifecycleIdentity
                      ? abbreviate(witnessPackageInspection.package.lifecycleId)
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Lineage identity</span>
                  <strong>
                    {witnessPackageInspection.hasLineageIdentity
                      ? abbreviate(witnessPackageInspection.package.lineageId)
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Source context</span>
                  <strong>
                    {witnessPackageInspection.package.sourceKind
                      ? `${witnessPackageInspection.package.sourceKind} · ${abbreviate(witnessPackageInspection.package.sourceRecordId)}`
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Predecessor linkage</span>
                  <strong>
                    {witnessPackageInspection.hasPredecessorLinkage
                      ? abbreviate(witnessPackageInspection.package.predecessorLifecycleId)
                      : "None or not retained"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Spend context</span>
                  <strong>
                    {`${witnessPackageInspection.package.spendStatus} · ${witnessPackageInspection.package.spendCapability} · nullifier ${witnessPackageInspection.package.nullifierReady ? "ready" : "not-ready"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Canonical consumption</span>
                  <strong>
                    {witnessPackageInspection.hasCanonicalConsumption
                      ? `${witnessPackageInspection.package.canonicalConsumption?.consumptionKind ?? "consumption"} · ${abbreviate(witnessPackageInspection.package.canonicalConsumption?.consumptionId)}`
                      : "Not attached"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Consumption linkage</span>
                  <strong>
                    {witnessPackageInspection.hasCanonicalConsumption
                      ? `${abbreviate(witnessPackageInspection.package.canonicalConsumption?.recordLifecycleId)} · outputs ${witnessPackageInspection.package.canonicalConsumption?.producedLifecycleIds.length ?? 0}`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Consumption basis</span>
                  <strong>
                    {witnessPackageInspection.hasConsumptionBasis
                      ? abbreviate(witnessPackageInspection.package.canonicalConsumption?.consumptionBasis)
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Nullifier stub</span>
                  <strong>
                    {witnessPackageInspection.hasNullifierStub
                      ? abbreviate(witnessPackageInspection.package.canonicalConsumption?.nullifierStub)
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Membership context</span>
                  <strong>
                    {`${witnessPackageInspection.package.membership.readiness} · commitment ${witnessPackageInspection.hasCommitment ? "present" : "missing"} · insertion ${witnessPackageInspection.hasInsertionIndex ? "present" : "missing"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Commitment</span>
                  <strong>{abbreviate(witnessPackageInspection.package.membership.commitment)}</strong>
                </div>
                <div className="review-row">
                  <span>Insertion and snapshot</span>
                  <strong>
                    {witnessPackageInspection.hasSnapshotContext
                      ? `${witnessPackageInspection.package.membership.insertionIndex ?? 0} · ${witnessPackageInspection.package.membership.snapshotLeafCount ?? 0} leaves · ${abbreviate(witnessPackageInspection.package.membership.snapshotRoot)}`
                      : "Snapshot context incomplete"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Future-root seam</span>
                  <strong>
                    {witnessPackageInspection.hasFutureRootSeam
                      ? `${witnessPackageInspection.package.futureRootSeam?.scheme ?? "unknown-scheme"} · ${abbreviate(witnessPackageInspection.package.futureRootSeam?.value)}`
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Candidate path</span>
                  <strong>
                    {witnessPackageInspection.hasCandidateMerklePath
                      ? `${witnessPackageInspection.package.candidateMerklePath?.kind ?? "candidate-path"} · ${witnessPackageInspection.package.candidateMerklePath?.scheme ?? "unknown-scheme"} · depth ${witnessPackageInspection.candidatePathDepth ?? 0} · ${witnessPackageInspection.candidatePathLevelCount ?? 0} levels`
                      : "Missing"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Candidate root</span>
                  <strong>
                    {witnessPackageInspection.hasCandidateMerklePath
                      ? abbreviate(witnessPackageInspection.package.candidateMerklePath?.candidateRoot)
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Candidate agreement</span>
                  <strong>
                    {`${witnessPackageInspection.package.candidateAgreementStatus} · ${witnessPackageInspection.package.candidateAgreementReady ? "compare-ready" : "not compare-ready"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Missing components</span>
                  <strong>{witnessPackageInspection.missingComponentsSummary}</strong>
                </div>
                <div className="review-row">
                  <span>Circuit encoding</span>
                  <strong>
                    {`${circuitInputInspection.encoding.readiness} · ${circuitInputInspection.encoding.kind} · ${circuitInputInspection.summary}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoding scheme</span>
                  <strong>
                    {`${circuitInputInspection.encoding.encodingScheme} · ${circuitInputInspection.sectionCount} sections`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoded path detail</span>
                  <strong>
                    {`${circuitInputInspection.candidatePathLevelCount} levels · ${circuitInputInspection.serializedLength} chars`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-group readiness</span>
                  <strong>
                    {`${circuitInputInspection.readySectionCount}/${circuitInputInspection.sectionCount} groups ready`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-group blockers</span>
                  <strong>
                    {circuitInputInspection.blockingSections.length > 0
                      ? circuitInputInspection.blockingSections
                          .map((group) => `${group.sectionName}:${group.readiness}`)
                          .join(" · ")
                      : "None"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-mapping precheck</span>
                  <strong>
                    {`${circuitInputInspection.precheckReadyCount}/${circuitInputInspection.sectionCount} sections classified`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Precheck blockers</span>
                  <strong>
                    {circuitInputInspection.precheckBlockedSections.length > 0
                      ? circuitInputInspection.precheckBlockedSections
                          .map((entry) => `${entry.sectionName}:${entry.readiness}`)
                          .join(" · ")
                      : "None"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Slot normalization</span>
                  <strong>
                    {`${circuitInputInspection.normalizedSectionCount}/${circuitInputInspection.sectionCount} sections · ${circuitInputInspection.totalNormalizedSlotCount} slots`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Slot blockers</span>
                  <strong>
                    {circuitInputInspection.blockedSlotSections.length > 0
                      ? circuitInputInspection.blockedSlotSections
                          .map((entry) => `${entry.sectionName}:${entry.bucket}`)
                          .join(" · ")
                      : "None"}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-candidate tagging</span>
                  <strong>
                    {`${circuitInputInspection.fieldCandidateCount} tagged · ${circuitInputInspection.blockedFieldCandidates.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-value preimages</span>
                  <strong>
                    {`${circuitInputInspection.fieldValuePreimageCount} present · ${circuitInputInspection.blockedFieldValuePreimages.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-lane planning</span>
                  <strong>
                    {`${circuitInputInspection.fieldLanePlanCount} planned · ${circuitInputInspection.blockedFieldLanePlans.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Lane arity / packing</span>
                  <strong>
                    {`${circuitInputInspection.laneArityPlanCount} planned · ${circuitInputInspection.totalExpectedFieldCount} expected fields`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-emission schedule</span>
                  <strong>
                    {`${circuitInputInspection.emittedFieldCount} emitted positions · ${circuitInputInspection.blockedLaneArityPlans.length} unemitted lanes`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field conversion manifest</span>
                  <strong>
                    {`${circuitInputInspection.manifestRowCount} resolved rows · ${circuitInputInspection.blockedManifestRows.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Finite-field input drafts</span>
                  <strong>
                    {`${circuitInputInspection.finiteFieldDraftCount} resolved · ${circuitInputInspection.blockedFiniteFieldDrafts.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Draft canonicalization</span>
                  <strong>
                    {`${circuitInputInspection.canonicalizedDraftCount} canonicalized · ${circuitInputInspection.blockedDraftCanonicalizations.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Modulus readiness</span>
                  <strong>
                    {`${circuitInputInspection.directModulusReadyCount} direct · ${circuitInputInspection.widthDependentModulusReadiness.length} width-dependent · ${circuitInputInspection.blockedModulusReadiness.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Reduction plans</span>
                  <strong>
                    {`${circuitInputInspection.reductionPlanCount} planned · ${circuitInputInspection.widthDependentReductionPlans.length} width-resolve · ${circuitInputInspection.blockedReductionPlans.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-element drafts</span>
                  <strong>
                    {`${circuitInputInspection.fieldElementDraftCount} present · ${circuitInputInspection.blockedFieldElementDrafts.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Field-element assembly</span>
                  <strong>
                    {`${circuitInputInspection.fieldElementAssemblyCount} assembled · ${circuitInputInspection.blockedFieldElementAssemblies.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Witness layout</span>
                  <strong>
                    {`${circuitInputInspection.witnessLayoutCount} positions · ${circuitInputInspection.blockedWitnessLayouts.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Witness realization</span>
                  <strong>
                    {`${circuitInputInspection.realizableWitnessCount} realizable · ${circuitInputInspection.splitDependentWitnesses.length} split-dependent · ${circuitInputInspection.widthDependentWitnesses.length} width-dependent · ${circuitInputInspection.blockedWitnessRealizationPrecheck.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Witness realization recipes</span>
                  <strong>
                    {`${circuitInputInspection.witnessRealizationRecipeCount} actionable · ${circuitInputInspection.blockedWitnessRealizationRecipes.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Materialization manifest</span>
                  <strong>
                    {`${circuitInputInspection.witnessMaterializationRowCount} rows · ${circuitInputInspection.blockedWitnessMaterializationRows.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Backend bridge</span>
                  <strong>
                    {`${circuitInputInspection.backendBridgeContractCount} actionable · ${circuitInputInspection.blockedBackendBridgeContractRows.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Adapter handshake</span>
                  <strong>
                    {`${circuitInputInspection.backendAdapterAcceptedRowCount} accepted · ${circuitInputInspection.unsupportedBackendAdapterRows.length} unsupported · ${circuitInputInspection.blockedBackendAdapterRows.length} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Adapter bundle</span>
                  <strong>
                    {`${circuitInputInspection.backendAdapterNormalizedRowCount} normalized · ${circuitInputInspection.backendAdapterExcludedRowCount} excluded`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Frozen adapter payload</span>
                  <strong>
                    {`${adapterPayloadFreeze.kind} · v${adapterPayloadFreeze.version} · ${adapterPayloadFreeze.acceptedRowCount} accepted`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder stub</span>
                  <strong>
                    {`${encoderStubResult.status} · would consume ${encoderStubResult.wouldConsumeRowCount} row${encoderStubResult.wouldConsumeRowCount === 1 ? "" : "s"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder work items</span>
                  <strong>
                    {`${encoderWorkItems.workItemCount} projected · ${encoderWorkItems.blockedItemCount} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder execution plan</span>
                  <strong>
                    {`${encoderExecutionPlan.batchCount} batches · ${encoderExecutionPlan.blockedBatchCount} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder dispatch</span>
                  <strong>
                    {`${encoderDispatch.requestCount} requests · ${encoderDispatch.blockedRequestCount} blocked`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder dispatch ack</span>
                  <strong>
                    {`${encoderDispatchAck.acceptedCount} accepted · ${encoderDispatchAck.blockedCount} blocked · ${encoderDispatchAck.unsupportedCount} unsupported`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder dispatch readiness</span>
                  <strong>
                    {`${encoderDispatchReadiness.status} · ${encoderDispatchReadiness.readyToEncode ? "ready-to-encode" : "not-ready"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder session ticket</span>
                  <strong>
                    {`${encoderSessionTicket.status} · ${encoderSessionTicket.issued ? "issued" : "not-issued"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Encoder preflight</span>
                  <strong>
                    {`${encoderPreflight.status} · ${encoderPreflight.wouldProceed ? "would-proceed" : "would-not-proceed"}`}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Frozen preflight</span>
                  <strong>{`${encoderPreflightFreeze.snapshotKind} · v${encoderPreflightFreeze.snapshotVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Orchestration handoff</span>
                  <strong>{`${encoderOrchestrationHandoff.handoffKind} · v${encoderOrchestrationHandoff.handoffVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Frozen handoff</span>
                  <strong>{`${encoderOrchestrationHandoffFreeze.snapshotKind} · v${encoderOrchestrationHandoffFreeze.snapshotVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Runner intake</span>
                  <strong>{`${encoderRunnerIntake.intakeKind} · v${encoderRunnerIntake.intakeVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Frozen intake</span>
                  <strong>{`${encoderRunnerIntakeFreeze.snapshotKind} · v${encoderRunnerIntakeFreeze.snapshotVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Launch envelope</span>
                  <strong>{`${encoderRunnerLaunchEnvelope.envelopeKind} · v${encoderRunnerLaunchEnvelope.envelopeVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Frozen launch</span>
                  <strong>{`${encoderRunnerLaunchEnvelopeFreeze.snapshotKind} · v${encoderRunnerLaunchEnvelopeFreeze.snapshotVersion}`}</strong>
                </div>
                <div className="review-row">
                  <span>Start ticket</span>
                  <strong>{`${encoderRunnerStartTicket.ticketKind} · v${encoderRunnerStartTicket.ticketVersion}`}</strong>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {circuitInputFieldGroups.map((group) => (
                    <div key={group.sectionName} className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>{group.sectionName}</span>
                          <strong>{group.readiness}</strong>
                        </div>
                        <div className="review-row">
                          <span>Section summary</span>
                          <strong>{group.summary}</strong>
                        </div>
                        <div className="review-row">
                          <span>Missing items</span>
                          <strong>
                            {group.missingItems.length > 0
                              ? group.missingItems.join(", ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldMappingPrecheck.map((entry) => (
                    <div key={`precheck:${entry.sectionName}`} className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>{entry.sectionName}</span>
                          <strong>{entry.bucket}</strong>
                        </div>
                        <div className="review-row">
                          <span>Precheck status</span>
                          <strong>{entry.blocked ? entry.readiness : "classified"}</strong>
                        </div>
                        <div className="review-row">
                          <span>Field slots</span>
                          <strong>{entry.fieldSlotCount}</strong>
                        </div>
                        <div className="review-row">
                          <span>Precheck summary</span>
                          <strong>{entry.summary}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {slotNormalization.map((entry) => (
                    <div key={`slots:${entry.sectionName}`} className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>{entry.sectionName}</span>
                          <strong>{entry.normalized ? `${entry.slotCount} slots` : entry.bucket}</strong>
                        </div>
                        <div className="review-row">
                          <span>Slot status</span>
                          <strong>{entry.normalized ? "normalized" : entry.blockedReason ?? "blocked"}</strong>
                        </div>
                        <div className="review-row">
                          <span>Slot preview</span>
                          <strong>
                            {entry.slots.length > 0
                              ? entry.slots
                                  .slice(0, 3)
                                  .map((slot) => `${slot.slotIndex}:${slot.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldCandidates.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Family counts</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldCandidates) {
                                counts.set(entry.family, (counts.get(entry.family) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([family, count]) => `${family}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Family preview</span>
                          <strong>
                            {fieldCandidates
                              .slice(0, 5)
                              .map((entry) => `${entry.slotLabel}:${entry.family}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked candidates</span>
                          <strong>
                            {circuitInputInspection.blockedFieldCandidates.length > 0
                              ? circuitInputInspection.blockedFieldCandidates
                                  .map((entry) => entry.sectionName)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldValuePreimages.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Preimage kinds</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldValuePreimages) {
                                const key = entry.payloadKind ?? "blocked";
                                counts.set(key, (counts.get(key) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([kind, count]) => `${kind}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Preimage preview</span>
                          <strong>
                            {fieldValuePreimages
                              .slice(0, 5)
                              .map((entry) => `${entry.slotLabel}:${entry.payloadKind ?? "blocked"}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked preimages</span>
                          <strong>
                            {circuitInputInspection.blockedFieldValuePreimages.length > 0
                              ? circuitInputInspection.blockedFieldValuePreimages
                                  .map((entry) => entry.sectionName)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldLanePlans.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Lane shapes</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldLanePlans) {
                                counts.set(entry.laneShape, (counts.get(entry.laneShape) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([shape, count]) => `${shape}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Lane preview</span>
                          <strong>
                            {fieldLanePlans
                              .slice(0, 5)
                              .map((entry) => `${entry.slotLabel}:${entry.laneShape}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked lanes</span>
                          <strong>
                            {circuitInputInspection.blockedFieldLanePlans.length > 0
                              ? circuitInputInspection.blockedFieldLanePlans
                                  .map((entry) => entry.sectionName)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {laneArityPlans.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Arity kinds</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of laneArityPlans) {
                                counts.set(entry.arityKind, (counts.get(entry.arityKind) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([kind, count]) => `${kind}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Expected fields</span>
                          <strong>
                            {laneArityPlans.reduce((sum, entry) => sum + entry.expectedFieldCount, 0)}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Arity preview</span>
                          <strong>
                            {laneArityPlans
                              .slice(0, 5)
                              .map((entry) => `${entry.slotLabel}:${entry.arityKind}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked arity plans</span>
                          <strong>
                            {circuitInputInspection.blockedLaneArityPlans.length > 0
                              ? circuitInputInspection.blockedLaneArityPlans
                                  .map((entry) => entry.sectionName)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldEmissionSchedule.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Emissions by section</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldEmissionSchedule) {
                                counts.set(entry.sectionName, (counts.get(entry.sectionName) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([sectionName, count]) => `${sectionName}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Emission preview</span>
                          <strong>
                            {fieldEmissionSchedule
                              .slice(0, 5)
                              .map((entry) => `${entry.emissionIndex}:${entry.emittedFieldLabel}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Unemitted lanes</span>
                          <strong>
                            {circuitInputInspection.blockedLaneArityPlans.length > 0
                              ? circuitInputInspection.blockedLaneArityPlans
                                  .map((entry) => entry.sectionName)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldConversionManifest.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Recipe counts</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldConversionManifest) {
                                counts.set(
                                  entry.conversionRecipe,
                                  (counts.get(entry.conversionRecipe) ?? 0) + 1,
                                );
                              }

                              return [...counts.entries()]
                                .map(([recipe, count]) => `${recipe}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Manifest preview</span>
                          <strong>
                            {fieldConversionManifest
                              .slice(0, 5)
                              .map(
                                (entry) =>
                                  `${entry.emissionIndex}:${entry.emittedFieldLabel}:${entry.conversionRecipe}`,
                              )
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked manifest rows</span>
                          <strong>
                            {circuitInputInspection.blockedManifestRows.length > 0
                              ? circuitInputInspection.blockedManifestRows
                                  .map((entry) => `${entry.sectionName}:${entry.emittedFieldLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {finiteFieldInputDrafts.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Draft families</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of finiteFieldInputDrafts) {
                                counts.set(entry.draftFamily, (counts.get(entry.draftFamily) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([family, count]) => `${family}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Draft preview</span>
                          <strong>
                            {finiteFieldInputDrafts
                              .slice(0, 5)
                              .map((entry) => `${entry.emissionIndex}:${entry.slotLabel}:${entry.draftFamily}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked drafts</span>
                          <strong>
                            {circuitInputInspection.blockedFiniteFieldDrafts.length > 0
                              ? circuitInputInspection.blockedFiniteFieldDrafts
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {draftCanonicalizations.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Canonical families</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of draftCanonicalizations) {
                                counts.set(
                                  entry.canonicalizationFamily,
                                  (counts.get(entry.canonicalizationFamily) ?? 0) + 1,
                                );
                              }

                              return [...counts.entries()]
                                .map(([family, count]) => `${family}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Canonical preview</span>
                          <strong>
                            {draftCanonicalizations
                              .slice(0, 5)
                              .map(
                                (entry) =>
                                  `${entry.emissionIndex}:${entry.slotLabel}:${entry.canonicalizationFamily}`,
                              )
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked canonicalizations</span>
                          <strong>
                            {circuitInputInspection.blockedDraftCanonicalizations.length > 0
                              ? circuitInputInspection.blockedDraftCanonicalizations
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {modulusReadiness.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Readiness counts</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of modulusReadiness) {
                                counts.set(entry.readiness, (counts.get(entry.readiness) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([readiness, count]) => `${readiness}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Readiness preview</span>
                          <strong>
                            {modulusReadiness
                              .slice(0, 5)
                              .map((entry) => `${entry.emissionIndex}:${entry.slotLabel}:${entry.readiness}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Width-dependent values</span>
                          <strong>
                            {circuitInputInspection.widthDependentModulusReadiness.length > 0
                              ? circuitInputInspection.widthDependentModulusReadiness
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked readiness</span>
                          <strong>
                            {circuitInputInspection.blockedModulusReadiness.length > 0
                              ? circuitInputInspection.blockedModulusReadiness
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {reductionPlans.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Reduction actions</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of reductionPlans) {
                                counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([action, count]) => `${action}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Reduction preview</span>
                          <strong>
                            {reductionPlans
                              .slice(0, 5)
                              .map((entry) => `${entry.emissionIndex}:${entry.slotLabel}:${entry.action}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Width-resolve values</span>
                          <strong>
                            {circuitInputInspection.widthDependentReductionPlans.length > 0
                              ? circuitInputInspection.widthDependentReductionPlans
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked reduction plans</span>
                          <strong>
                            {circuitInputInspection.blockedReductionPlans.length > 0
                              ? circuitInputInspection.blockedReductionPlans
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldElementDrafts.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Draft kinds</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldElementDrafts) {
                                counts.set(entry.draftKind, (counts.get(entry.draftKind) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([kind, count]) => `${kind}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Field-element preview</span>
                          <strong>
                            {fieldElementDrafts
                              .slice(0, 5)
                              .map((entry) => `${entry.emissionIndex}:${entry.slotLabel}:${entry.draftKind}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked field-element drafts</span>
                          <strong>
                            {circuitInputInspection.blockedFieldElementDrafts.length > 0
                              ? circuitInputInspection.blockedFieldElementDrafts
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {fieldElementAssemblies.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Assembly kinds</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of fieldElementAssemblies) {
                                counts.set(entry.assemblyKind, (counts.get(entry.assemblyKind) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([kind, count]) => `${kind}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Assembly preview</span>
                          <strong>
                            {fieldElementAssemblies
                              .slice(0, 5)
                              .map((entry) => `${entry.assemblyIndex}:${entry.slotLabel}:${entry.assemblyKind}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked assemblies</span>
                          <strong>
                            {circuitInputInspection.blockedFieldElementAssemblies.length > 0
                              ? circuitInputInspection.blockedFieldElementAssemblies
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {witnessLayoutManifest.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Layout kinds</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of witnessLayoutManifest) {
                                counts.set(entry.assemblyKind, (counts.get(entry.assemblyKind) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([kind, count]) => `${kind}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Layout preview</span>
                          <strong>
                            {witnessLayoutManifest
                              .slice(0, 5)
                              .map((entry) => `${entry.witnessIndex}:${entry.slotLabel}:${entry.assemblyKind}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked layouts</span>
                          <strong>
                            {circuitInputInspection.blockedWitnessLayouts.length > 0
                              ? circuitInputInspection.blockedWitnessLayouts
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {witnessRealizationPrecheck.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Realization counts</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of witnessRealizationPrecheck) {
                                counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([status, count]) => `${status}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Realization preview</span>
                          <strong>
                            {witnessRealizationPrecheck
                              .slice(0, 5)
                              .map((entry) => `${entry.witnessIndex}:${entry.slotLabel}:${entry.status}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Split-dependent positions</span>
                          <strong>
                            {circuitInputInspection.splitDependentWitnesses.length > 0
                              ? circuitInputInspection.splitDependentWitnesses
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Width-dependent positions</span>
                          <strong>
                            {circuitInputInspection.widthDependentWitnesses.length > 0
                              ? circuitInputInspection.widthDependentWitnesses
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked positions</span>
                          <strong>
                            {circuitInputInspection.blockedWitnessRealizationPrecheck.length > 0
                              ? circuitInputInspection.blockedWitnessRealizationPrecheck
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {witnessRealizationRecipes.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Recipe counts</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of witnessRealizationRecipes) {
                                counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([action, count]) => `${action}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Recipe preview</span>
                          <strong>
                            {witnessRealizationRecipes
                              .slice(0, 5)
                              .map((entry) => `${entry.witnessIndex}:${entry.slotLabel}:${entry.action}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked recipes</span>
                          <strong>
                            {circuitInputInspection.blockedWitnessRealizationRecipes.length > 0
                              ? circuitInputInspection.blockedWitnessRealizationRecipes
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {witnessMaterializationManifest.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Manifest actions</span>
                          <strong>
                            {(() => {
                              const counts = new Map<string, number>();

                              for (const entry of witnessMaterializationManifest) {
                                counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
                              }

                              return [...counts.entries()]
                                .map(([action, count]) => `${action}:${count}`)
                                .join(" · ");
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Manifest preview</span>
                          <strong>
                            {witnessMaterializationManifest
                              .slice(0, 5)
                              .map(
                                (entry) =>
                                  `${entry.materializationIndex}:${entry.slotLabel}:${entry.action}`,
                              )
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked manifest rows</span>
                          <strong>
                            {circuitInputInspection.blockedWitnessMaterializationRows.length > 0
                              ? circuitInputInspection.blockedWitnessMaterializationRows
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {backendBridgeContract.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Contract counts</span>
                          <strong>
                            {(() => {
                              const actionable = backendBridgeContract.filter((entry) => entry.actionable).length;
                              const blocked = backendBridgeContract.length - actionable;
                              return `actionable:${actionable} · blocked:${blocked}`;
                            })()}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Contract preview</span>
                          <strong>
                            {backendBridgeContract
                              .slice(0, 5)
                              .map(
                                (entry) =>
                                  `${entry.materializationIndex}:${entry.slotLabel}:${entry.action}`,
                              )
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Blocked contract rows</span>
                          <strong>
                            {circuitInputInspection.blockedBackendBridgeContractRows.length > 0
                              ? circuitInputInspection.blockedBackendBridgeContractRows
                                  .map((entry) => `${entry.sectionName}:${entry.slotLabel}`)
                                  .join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {backendAdapterHandshake.rowResults.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Handshake status</span>
                          <strong>{backendAdapterHandshake.accepted ? "accepted" : "unsupported"}</strong>
                        </div>
                        <div className="review-row">
                          <span>Adapter</span>
                          <strong>{backendAdapterHandshake.adapterLabel}</strong>
                        </div>
                        <div className="review-row">
                          <span>Capability preview</span>
                          <strong>
                            {backendAdapterHandshake.rowResults
                              .slice(0, 5)
                              .map((entry) => `${entry.witnessIndex}:${entry.action}:${entry.status}`)
                              .join(" · ")}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Unsupported actions</span>
                          <strong>
                            {backendAdapterHandshake.unsupportedActionKinds.length > 0
                              ? backendAdapterHandshake.unsupportedActionKinds.join(" · ")
                              : "None"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Unsupported families</span>
                          <strong>
                            {backendAdapterHandshake.unsupportedFamilyHints.length > 0
                              ? backendAdapterHandshake.unsupportedFamilyHints.join(" · ")
                              : "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {backendAdapterNormalizedBundle.normalizedRows.length > 0 ||
                  backendAdapterNormalizedBundle.excludedRows.length > 0 ? (
                    <div className="status-panel">
                      <div className="review-list">
                        <div className="review-row">
                          <span>Adapter profile</span>
                          <strong>{backendAdapterNormalizedBundle.adapterLabel}</strong>
                        </div>
                        <div className="review-row">
                          <span>Normalized rows</span>
                          <strong>{backendAdapterNormalizedBundle.acceptedRowCount}</strong>
                        </div>
                        <div className="review-row">
                          <span>Excluded rows</span>
                          <strong>{backendAdapterNormalizedBundle.excludedRowCount}</strong>
                        </div>
                        <div className="review-row">
                          <span>Bundle preview</span>
                          <strong>
                            {backendAdapterNormalizedBundle.normalizedRows
                              .slice(0, 5)
                              .map(
                                (entry) =>
                                  `${entry.materializationIndex}:${entry.slotLabel}:${entry.action}`,
                              )
                              .join(" · ") || "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Payload kind</span>
                        <strong>{`${adapterPayloadFreeze.kind} · v${adapterPayloadFreeze.version}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Accepted / excluded</span>
                        <strong>
                          {`${adapterPayloadFreeze.acceptedRowCount} accepted · ${adapterPayloadFreeze.excludedRowCount} excluded`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Payload preview</span>
                        <strong>
                          {adapterPayloadFreeze.serialized.length > 96
                            ? `${adapterPayloadFreeze.serialized.slice(0, 96)}...`
                            : adapterPayloadFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedPlanningConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumer.reason ??
                            "ready for later next resolved planning consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedPlanningConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.fieldMaterializationNextResolvedPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.fieldMaterializationNextResolvedPlanningConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.reason ??
                            "ready for next resolved planning boundary handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedPlanningBoundaryHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.fieldMaterializationNextResolvedPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.fieldMaterializationNextResolvedPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.reason ??
                            "ready for next resolved planning-boundary consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedPlanningBoundaryConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Consumer handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.fieldMaterializationNextResolvedPlanningBoundaryConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.reason ??
                            "ready for next resolved planning consumer handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen consumer handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedPlanningConsumerHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Next resolved consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Next resolved consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedConsumer.fieldMaterializationNextResolvedPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedConsumer.fieldMaterializationNextResolvedPlanningConsumerHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedConsumer.reason ??
                            "ready for next resolved consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen next resolved consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen next resolved consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen next resolved consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Next resolved handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Next resolved handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedHandoff.fieldMaterializationNextResolvedConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedHandoff.fieldMaterializationNextResolvedConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedHandoff.reason ??
                            "ready for next resolved handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen next resolved handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen next resolved handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen next resolved handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Next resolved boundary consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryConsumer.fieldMaterializationNextResolvedHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryConsumer.fieldMaterializationNextResolvedHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryConsumer.reason ??
                            "ready for next resolved boundary consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedBoundaryHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryHandoff.fieldMaterializationNextResolvedBoundaryConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryHandoff.fieldMaterializationNextResolvedBoundaryConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryHandoff.reason ??
                            "ready for next resolved boundary handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary planning consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary planning consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.fieldMaterializationNextResolvedBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.fieldMaterializationNextResolvedBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.reason ??
                            "ready for next resolved boundary planning consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary planning consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary planning consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary planning consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryPlanningConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary planning handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary planning handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.fieldMaterializationNextResolvedBoundaryPlanningConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.reason ??
                            "ready for next resolved boundary planning handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary planning handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary planning handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary planning handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryPlanningHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary resolution consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary resolution consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.fieldMaterializationNextResolvedBoundaryPlanningHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.fieldMaterializationNextResolvedBoundaryPlanningHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.reason ??
                            "ready for next resolved boundary resolution consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary resolution consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary resolution consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary resolution consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryResolutionConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary resolution handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary resolution handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.fieldMaterializationNextResolvedBoundaryResolutionConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.reason ??
                            "ready for next resolved boundary resolution handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary resolution handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary resolution handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary resolution handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryResolutionHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary dispatch consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary dispatch consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.fieldMaterializationNextResolvedBoundaryResolutionHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.fieldMaterializationNextResolvedBoundaryResolutionHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.reason ??
                            "ready for next resolved boundary dispatch consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary dispatch consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary dispatch consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary dispatch consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryDispatchConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary dispatch handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary dispatch handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.fieldMaterializationNextResolvedBoundaryDispatchConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.reason ??
                            "ready for next resolved boundary dispatch handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary dispatch handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary dispatch handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary dispatch handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryDispatchHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary final consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary final consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.fieldMaterializationNextResolvedBoundaryDispatchHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.fieldMaterializationNextResolvedBoundaryDispatchHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.reason ??
                            "ready for next resolved boundary final consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary final consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary final consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary final consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryFinalConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary final handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.handoffKind} · v${encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary final handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.fieldMaterializationNextResolvedBoundaryFinalConsumerSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.fieldMaterializationNextResolvedBoundaryFinalConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.reason ??
                            "ready for next resolved boundary final handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary final handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary final handoff status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary final handoff summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryFinalHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Boundary closure consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.artifactKind} · v${encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Boundary closure consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.fieldMaterializationNextResolvedBoundaryFinalHandoffSnapshotKind} · ${encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.fieldMaterializationNextResolvedBoundaryFinalHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.reason ??
                            "ready for next resolved boundary closure consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryClosureConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen boundary closure consumer kind</span>
                        <strong>{`${encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary closure consumer status</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen boundary closure consumer summary</span>
                        <strong>{encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextResolvedBoundaryClosureConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Proving input readiness kind</span>
                        <strong>{`${encoderProvingInputReadiness.artifactKind} · v${encoderProvingInputReadiness.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proving input readiness status</span>
                        <strong>{encoderProvingInputReadiness.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderProvingInputReadiness.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Witness materialization</span>
                        <strong>{encoderProvingInputReadiness.witnessMaterializationSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Closure provenance</span>
                        <strong>{`${encoderProvingInputReadiness.fieldMaterializationNextResolvedBoundaryClosureConsumerSnapshotKind} · ${encoderProvingInputReadiness.fieldMaterializationNextResolvedBoundaryClosureConsumerStatus}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderProvingInputReadiness.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen proving input readiness kind</span>
                        <strong>{`${encoderProvingInputReadinessFreeze.snapshotKind} · v${encoderProvingInputReadinessFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen proving input readiness status</span>
                        <strong>{encoderProvingInputReadinessFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen proving input readiness summary</span>
                        <strong>{encoderProvingInputReadinessFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderProvingInputReadinessFreeze.serialized.length > 96
                            ? `${encoderProvingInputReadinessFreeze.serialized.slice(0, 96)}...`
                            : encoderProvingInputReadinessFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Constraint-system handoff readiness kind</span>
                        <strong>{`${encoderConstraintSystemHandoffReadiness.artifactKind} · v${encoderConstraintSystemHandoffReadiness.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Constraint-system handoff status</span>
                        <strong>{encoderConstraintSystemHandoffReadiness.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderConstraintSystemHandoffReadiness.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff footprint</span>
                        <strong>{encoderConstraintSystemHandoffReadiness.handoffFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proving readiness provenance</span>
                        <strong>{`${encoderConstraintSystemHandoffReadiness.provingInputReadinessSnapshotKind} · ${encoderConstraintSystemHandoffReadiness.provingInputReadinessStatus}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderConstraintSystemHandoffReadiness.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen constraint-system handoff kind</span>
                        <strong>{`${encoderConstraintSystemHandoffReadinessFreeze.snapshotKind} · v${encoderConstraintSystemHandoffReadinessFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen constraint-system handoff status</span>
                        <strong>{encoderConstraintSystemHandoffReadinessFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen constraint-system handoff summary</span>
                        <strong>{encoderConstraintSystemHandoffReadinessFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderConstraintSystemHandoffReadinessFreeze.serialized.length > 96
                            ? `${encoderConstraintSystemHandoffReadinessFreeze.serialized.slice(0, 96)}...`
                            : encoderConstraintSystemHandoffReadinessFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Proving-input package kind</span>
                        <strong>{`${encoderProvingInputPackage.artifactKind} · v${encoderProvingInputPackage.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proving-input package status</span>
                        <strong>{encoderProvingInputPackage.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderProvingInputPackage.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Package footprint</span>
                        <strong>{encoderProvingInputPackage.packageFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Constraint handoff provenance</span>
                        <strong>{`${encoderProvingInputPackage.constraintSystemHandoffReadinessSnapshotKind} · ${encoderProvingInputPackage.constraintSystemHandoffReadinessStatus}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderProvingInputPackage.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen proving-input package kind</span>
                        <strong>{`${encoderProvingInputPackageFreeze.snapshotKind} · v${encoderProvingInputPackageFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen proving-input package status</span>
                        <strong>{encoderProvingInputPackageFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen proving-input package summary</span>
                        <strong>{encoderProvingInputPackageFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderProvingInputPackageFreeze.serialized.length > 96
                            ? `${encoderProvingInputPackageFreeze.serialized.slice(0, 96)}...`
                            : encoderProvingInputPackageFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
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
                            .map(
                              (item) =>
                                `${item.workItemIndex}:${item.slotLabel}:${item.kind}`,
                            )
                            .join(" · ") || "None"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Blocked preview</span>
                        <strong>
                          {encoderWorkItems.blockedItems
                            .slice(0, 3)
                            .map(
                              (item) =>
                                `${item.slotLabel}:${item.blockedReason ?? item.kind}`,
                            )
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
                            .map(
                              (batch) =>
                                `${batch.batchIndex}:${batch.sectionName}:${batch.kind}`,
                            )
                            .join(" · ") || "None"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Blocked batch preview</span>
                        <strong>
                          {encoderExecutionPlan.blockedBatches
                            .slice(0, 3)
                            .map(
                              (batch) =>
                                `${batch.sectionName}:${batch.blockedReason ?? batch.kind}`,
                            )
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
                        <span>Dispatch kinds</span>
                        <strong>{encoderDispatch.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Dispatch preview</span>
                        <strong>
                          {encoderDispatch.requests
                            .slice(0, 5)
                            .map(
                              (request) =>
                                `${request.requestIndex}:${request.sectionName}:${request.kind}`,
                            )
                            .join(" · ") || "None"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Blocked dispatch preview</span>
                        <strong>
                          {encoderDispatch.blockedRequests
                            .slice(0, 3)
                            .map(
                              (request) =>
                                `${request.sectionName}:${request.blockedReason ?? request.kind}`,
                            )
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
                        <span>Ack counts</span>
                        <strong>
                          {`${encoderDispatchAck.acceptedCount} accepted · ${encoderDispatchAck.blockedCount} blocked · ${encoderDispatchAck.unsupportedCount} unsupported`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Ack summary</span>
                        <strong>{encoderDispatchAck.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Ack preview</span>
                        <strong>
                          {encoderDispatchAck.entries
                            .slice(0, 5)
                            .map(
                              (entry) =>
                                `${entry.requestIndex}:${entry.dispatchKind}:${entry.status}`,
                            )
                            .join(" · ") || "None"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Ack reasons</span>
                        <strong>
                          {encoderDispatchAck.entries
                            .filter((entry) => entry.reason)
                            .slice(0, 3)
                            .map(
                              (entry) =>
                                `${entry.requestIndex}:${entry.reason}`,
                            )
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
                        <span>Readiness summary</span>
                        <strong>{encoderDispatchReadiness.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Contributing statuses</span>
                        <strong>
                          {encoderDispatchReadiness.contributingStatuses.join(" · ") || "None"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Readiness reason</span>
                        <strong>{encoderDispatchReadiness.reason ?? "ready for later encoder gating"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Ticket kind</span>
                        <strong>{`${encoderSessionTicket.ticketKind} · v${encoderSessionTicket.ticketVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Ticket status</span>
                        <strong>{encoderSessionTicket.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Readiness source</span>
                        <strong>{encoderSessionTicket.readinessStatus}</strong>
                      </div>
                      <div className="review-row">
                        <span>Accepted dispatches</span>
                        <strong>{encoderSessionTicket.acceptedDispatchCount}</strong>
                      </div>
                      <div className="review-row">
                        <span>Ticket summary</span>
                        <strong>{encoderSessionTicket.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Ticket reason</span>
                        <strong>{encoderSessionTicket.reason ?? "session intent issued for later encoder work"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Preflight kind</span>
                        <strong>{`${encoderPreflight.reportKind} · v${encoderPreflight.reportVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Preflight status</span>
                        <strong>{encoderPreflight.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Would proceed</span>
                        <strong>{encoderPreflight.wouldProceed ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Dispatch footprint</span>
                        <strong>{encoderPreflight.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Blocked reasons</span>
                        <strong>{encoderPreflight.blockedReasons.join(" · ") || "None"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Preflight summary</span>
                        <strong>{encoderPreflight.summary}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Snapshot kind</span>
                        <strong>{`${encoderPreflightFreeze.snapshotKind} · v${encoderPreflightFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderPreflightFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Snapshot summary</span>
                        <strong>{encoderPreflightFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderPreflightFreeze.serialized.length > 96
                            ? `${encoderPreflightFreeze.serialized.slice(0, 96)}...`
                            : encoderPreflightFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
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
                        <strong>
                          {`${encoderOrchestrationHandoff.preflightSnapshotKind} · ${encoderOrchestrationHandoff.preflightStatus}`}
                        </strong>
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
                        <strong>
                          {`${encoderRunnerIntake.handoffSnapshotKind} · ${encoderRunnerIntake.handoffStatus}`}
                        </strong>
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
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Envelope kind</span>
                        <strong>{`${encoderRunnerLaunchEnvelope.envelopeKind} · v${encoderRunnerLaunchEnvelope.envelopeVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Launch status</span>
                        <strong>{encoderRunnerLaunchEnvelope.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderRunnerLaunchEnvelope.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Intake provenance</span>
                        <strong>
                          {`${encoderRunnerLaunchEnvelope.intakeSnapshotKind} · ${encoderRunnerLaunchEnvelope.intakeStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRunnerLaunchEnvelope.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Launch reason</span>
                        <strong>{encoderRunnerLaunchEnvelope.reason ?? "ready for later runner launch"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderRunnerLaunchEnvelopeFreeze.snapshotKind} · v${encoderRunnerLaunchEnvelopeFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderRunnerLaunchEnvelopeFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderRunnerLaunchEnvelopeFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderRunnerLaunchEnvelopeFreeze.serialized.length > 96
                            ? `${encoderRunnerLaunchEnvelopeFreeze.serialized.slice(0, 96)}...`
                            : encoderRunnerLaunchEnvelopeFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Ticket kind</span>
                        <strong>{`${encoderRunnerStartTicket.ticketKind} · v${encoderRunnerStartTicket.ticketVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start status</span>
                        <strong>{encoderRunnerStartTicket.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderRunnerStartTicket.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Launch provenance</span>
                        <strong>
                          {`${encoderRunnerStartTicket.launchSnapshotKind} · ${encoderRunnerStartTicket.launchStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRunnerStartTicket.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start reason</span>
                        <strong>{encoderRunnerStartTicket.reason ?? "ready for later execution start"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start summary</span>
                        <strong>{encoderRunnerStartTicket.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerStartTicketFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Execution input</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerExecutionInputSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Entry plan</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerExecutionEntryPlanSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen plan</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerExecutionEntryPlanFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Execution session</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerExecutionSessionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen session</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRunnerExecutionSessionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Encoding admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderEncodingAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderEncodingAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-encoding start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldEncodingStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldEncodingStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-materialization</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen materialization</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-row start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldRowMaterializationStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen row start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldRowMaterializationStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Row admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowMaterializationAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen row admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowMaterializationAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Row-lane start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowLaneMaterializationStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen row-lane start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowLaneMaterializationStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Row-field admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowFieldEmissionAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen row-field admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowFieldEmissionAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Row-field start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowFieldEmissionStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen row-field start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderRowFieldEmissionStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-lane admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldLaneExecutionAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field-lane admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldLaneExecutionAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-lane start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldLaneExecutionStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field-lane start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldLaneExecutionStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field-materialization launch</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationLaunchAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field launch</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationLaunchAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field launch start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationLaunchStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field launch start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationLaunchStartFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field execution admission</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationExecutionAdmissionSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen field execution</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationExecutionAdmissionFreezeSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Field execution start</span>
                        <strong>
                          {lifecycleNodeLookup.encoderFieldMaterializationExecutionStartSummary ??
                            "Unavailable"}
                        </strong>
                      </div>
                    </div>
                  </div>
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
                        <strong>
                          {`${encoderRunnerExecutionInput.startSnapshotKind} · ${encoderRunnerExecutionInput.startStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRunnerExecutionInput.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRunnerExecutionInput.reason ??
                            "ready for later execution entry"}
                        </strong>
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
                        <strong>
                          {`${encoderRunnerExecutionEntryPlan.inputKind} · ${encoderRunnerExecutionEntryPlan.inputStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen start</span>
                        <strong>
                          {`${encoderRunnerExecutionEntryPlan.startSnapshotKind} · v${encoderRunnerExecutionEntryPlan.startSnapshotVersion}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRunnerExecutionEntryPlan.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRunnerExecutionEntryPlan.reason ??
                            "ready for later execution planning handoff"}
                        </strong>
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
                        <strong>
                          {`${encoderRunnerExecutionSession.entrySnapshotKind} · ${encoderRunnerExecutionSession.planStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRunnerExecutionSession.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRunnerExecutionSession.reason ??
                            "ready for later execution admission"}
                        </strong>
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
                        <strong>
                          {`${encoderEncodingAdmission.sessionSnapshotKind} · ${encoderEncodingAdmission.sessionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderEncodingAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderEncodingAdmission.reason ??
                            "ready for later field-encoding admission"}
                        </strong>
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
                        <strong>
                          {`${encoderFieldEncodingStart.admissionSnapshotKind} · ${encoderFieldEncodingStart.admissionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldEncodingStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldEncodingStart.reason ??
                            "ready for later field-encoding execution"}
                        </strong>
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
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Admission kind</span>
                        <strong>{`${encoderFieldMaterializationAdmission.admissionKind} · v${encoderFieldMaterializationAdmission.admissionVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Admission status</span>
                        <strong>{encoderFieldMaterializationAdmission.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderFieldMaterializationAdmission.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Field-entry provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationAdmission.fieldEntrySnapshotKind} · ${encoderFieldMaterializationAdmission.fieldEntryStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationAdmission.reason ??
                            "ready for later field-materialization admission"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationAdmission.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationAdmissionFreeze.snapshotKind} · v${encoderFieldMaterializationAdmissionFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationAdmissionFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationAdmissionFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationAdmissionFreeze.serialized.length > 96
                            ? `${encoderFieldMaterializationAdmissionFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationAdmissionFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Start kind</span>
                        <strong>{`${encoderFieldRowMaterializationStart.startKind} · v${encoderFieldRowMaterializationStart.startVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start status</span>
                        <strong>{encoderFieldRowMaterializationStart.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderFieldRowMaterializationStart.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Materialization provenance</span>
                        <strong>
                          {`${encoderFieldRowMaterializationStart.fieldMaterializationSnapshotKind} · ${encoderFieldRowMaterializationStart.fieldMaterializationStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldRowMaterializationStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldRowMaterializationStart.reason ??
                            "ready for later field-row materialization"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldRowMaterializationStart.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldRowMaterializationStartFreeze.snapshotKind} · v${encoderFieldRowMaterializationStartFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldRowMaterializationStartFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldRowMaterializationStartFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldRowMaterializationStartFreeze.serialized.length > 96
                            ? `${encoderFieldRowMaterializationStartFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldRowMaterializationStartFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Admission kind</span>
                        <strong>{`${encoderRowMaterializationAdmission.admissionKind} · v${encoderRowMaterializationAdmission.admissionVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Admission status</span>
                        <strong>{encoderRowMaterializationAdmission.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderRowMaterializationAdmission.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Row-entry provenance</span>
                        <strong>
                          {`${encoderRowMaterializationAdmission.fieldRowEntrySnapshotKind} · ${encoderRowMaterializationAdmission.fieldRowEntryStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRowMaterializationAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRowMaterializationAdmission.reason ??
                            "ready for later row materialization"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderRowMaterializationAdmission.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderRowMaterializationAdmissionFreeze.snapshotKind} · v${encoderRowMaterializationAdmissionFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderRowMaterializationAdmissionFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderRowMaterializationAdmissionFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderRowMaterializationAdmissionFreeze.serialized.length > 96
                            ? `${encoderRowMaterializationAdmissionFreeze.serialized.slice(0, 96)}...`
                            : encoderRowMaterializationAdmissionFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Start kind</span>
                        <strong>{`${encoderRowLaneMaterializationStart.startKind} · v${encoderRowLaneMaterializationStart.startVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start status</span>
                        <strong>{encoderRowLaneMaterializationStart.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderRowLaneMaterializationStart.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Row provenance</span>
                        <strong>
                          {`${encoderRowLaneMaterializationStart.rowMaterializationSnapshotKind} · ${encoderRowLaneMaterializationStart.rowMaterializationStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRowLaneMaterializationStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRowLaneMaterializationStart.reason ??
                            "ready for later row-lane materialization"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderRowLaneMaterializationStart.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderRowLaneMaterializationStartFreeze.snapshotKind} · v${encoderRowLaneMaterializationStartFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderRowLaneMaterializationStartFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderRowLaneMaterializationStartFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderRowLaneMaterializationStartFreeze.serialized.length > 96
                            ? `${encoderRowLaneMaterializationStartFreeze.serialized.slice(0, 96)}...`
                            : encoderRowLaneMaterializationStartFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Admission kind</span>
                        <strong>{`${encoderRowFieldEmissionAdmission.admissionKind} · v${encoderRowFieldEmissionAdmission.admissionVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Admission status</span>
                        <strong>{encoderRowFieldEmissionAdmission.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderRowFieldEmissionAdmission.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Row-lane provenance</span>
                        <strong>
                          {`${encoderRowFieldEmissionAdmission.rowLaneEntrySnapshotKind} · ${encoderRowFieldEmissionAdmission.rowLaneEntryStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRowFieldEmissionAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRowFieldEmissionAdmission.reason ??
                            "ready for later row-field emission"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderRowFieldEmissionAdmission.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderRowFieldEmissionAdmissionFreeze.snapshotKind} · v${encoderRowFieldEmissionAdmissionFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderRowFieldEmissionAdmissionFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderRowFieldEmissionAdmissionFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderRowFieldEmissionAdmissionFreeze.serialized.length > 96
                            ? `${encoderRowFieldEmissionAdmissionFreeze.serialized.slice(0, 96)}...`
                            : encoderRowFieldEmissionAdmissionFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
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
                        <strong>
                          {`${encoderRowFieldEmissionStart.rowFieldEmissionSnapshotKind} · ${encoderRowFieldEmissionStart.rowFieldEmissionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderRowFieldEmissionStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderRowFieldEmissionStart.reason ??
                            "ready for later row-field emission start"}
                        </strong>
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
                        <strong>
                          {`${encoderFieldLaneExecutionAdmission.rowFieldEmissionSnapshotKind} · ${encoderFieldLaneExecutionAdmission.rowFieldEmissionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldLaneExecutionAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldLaneExecutionAdmission.reason ??
                            "ready for later field-lane execution"}
                        </strong>
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
                        <strong>
                          {`${encoderFieldLaneExecutionStart.fieldLaneSnapshotKind} · ${encoderFieldLaneExecutionStart.fieldLaneStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldLaneExecutionStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldLaneExecutionStart.reason ??
                            "ready for later field-lane execution start"}
                        </strong>
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
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Admission kind</span>
                        <strong>{`${encoderFieldMaterializationLaunchAdmission.admissionKind} · v${encoderFieldMaterializationLaunchAdmission.admissionVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Admission status</span>
                        <strong>{encoderFieldMaterializationLaunchAdmission.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderFieldMaterializationLaunchAdmission.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Lane provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationLaunchAdmission.fieldLaneExecutionSnapshotKind} · ${encoderFieldMaterializationLaunchAdmission.fieldLaneExecutionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationLaunchAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationLaunchAdmission.reason ??
                            "ready for later field-materialization launch"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationLaunchAdmission.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationLaunchAdmissionFreeze.snapshotKind} · v${encoderFieldMaterializationLaunchAdmissionFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationLaunchAdmissionFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationLaunchAdmissionFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationLaunchAdmissionFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationLaunchAdmissionFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationLaunchAdmissionFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Start kind</span>
                        <strong>{`${encoderFieldMaterializationLaunchStart.startKind} · v${encoderFieldMaterializationLaunchStart.startVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Start status</span>
                        <strong>{encoderFieldMaterializationLaunchStart.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderFieldMaterializationLaunchStart.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Launch provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationLaunchStart.fieldMaterializationLaunchSnapshotKind} · ${encoderFieldMaterializationLaunchStart.fieldMaterializationLaunchStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationLaunchStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationLaunchStart.reason ??
                            "ready for later field-materialization launch handling"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationLaunchStart.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationLaunchStartFreeze.snapshotKind} · v${encoderFieldMaterializationLaunchStartFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationLaunchStartFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationLaunchStartFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationLaunchStartFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationLaunchStartFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationLaunchStartFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Admission kind</span>
                        <strong>{`${encoderFieldMaterializationExecutionAdmission.admissionKind} · v${encoderFieldMaterializationExecutionAdmission.admissionVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Admission status</span>
                        <strong>{encoderFieldMaterializationExecutionAdmission.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>{encoderFieldMaterializationExecutionAdmission.proceedable ? "yes" : "no"}</strong>
                      </div>
                      <div className="review-row">
                        <span>Launch provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationExecutionAdmission.fieldMaterializationLaunchSnapshotKind} · ${encoderFieldMaterializationExecutionAdmission.fieldMaterializationLaunchStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationExecutionAdmission.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationExecutionAdmission.reason ??
                            "ready for later field-materialization execution"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationExecutionAdmission.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationExecutionAdmissionFreeze.snapshotKind} · v${encoderFieldMaterializationExecutionAdmissionFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationExecutionAdmissionFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationExecutionAdmissionFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationExecutionAdmissionFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationExecutionAdmissionFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationExecutionAdmissionFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
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
                        <strong>
                          {`${encoderFieldMaterializationExecutionStart.fieldMaterializationExecutionSnapshotKind} · ${encoderFieldMaterializationExecutionStart.fieldMaterializationExecutionStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationExecutionStart.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationExecutionStart.reason ??
                            "ready for later field-materialization execution"}
                        </strong>
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
                        <strong>
                          {encoderFieldMaterializationExecutionWorkEnvelope.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Start provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationExecutionWorkEnvelope.fieldMaterializationExecutionStartSnapshotKind} · ${encoderFieldMaterializationExecutionWorkEnvelope.fieldMaterializationExecutionStartStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationExecutionWorkEnvelope.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationExecutionWorkEnvelope.reason ??
                            "ready for later field-materialization execution"}
                        </strong>
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
                          {encoderFieldMaterializationExecutionWorkEnvelopeFreeze.serialized.length >
                          96
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
                        <strong>
                          {`${encoderFieldMaterializationExecutionPlan.fieldMaterializationExecutionWorkEnvelopeSnapshotKind} · ${encoderFieldMaterializationExecutionPlan.fieldMaterializationExecutionWorkEnvelopeStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationExecutionPlan.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationExecutionPlan.reason ??
                            "ready for later field-materialization planning"}
                        </strong>
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
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationExecutionPlanHandoff.handoffKind} · v${encoderFieldMaterializationExecutionPlanHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationExecutionPlanHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationExecutionPlanHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Plan provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationExecutionPlanHandoff.fieldMaterializationExecutionPlanSnapshotKind} · ${encoderFieldMaterializationExecutionPlanHandoff.fieldMaterializationExecutionPlanStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationExecutionPlanHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationExecutionPlanHandoff.reason ??
                            "ready for later execution planning handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationExecutionPlanHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationExecutionPlanHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationExecutionPlanHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationExecutionPlanHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationExecutionPlanHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationExecutionPlanHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationExecutionPlanHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationExecutionPlanHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationPlanningConsumer.artifactKind} · v${encoderFieldMaterializationPlanningConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationPlanningConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationPlanningConsumer.fieldMaterializationExecutionPlanHandoffSnapshotKind} · ${encoderFieldMaterializationPlanningConsumer.fieldMaterializationExecutionPlanHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationPlanningConsumer.reason ??
                            "ready for later downstream planning consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationPlanningConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationPlanningConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationPlanningConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationPlanningConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationPlanningConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationPlanningConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationPlanningConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationPlanningConsumerHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationPlanningConsumerHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationPlanningConsumerHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationPlanningConsumerHandoff.fieldMaterializationPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationPlanningConsumerHandoff.fieldMaterializationPlanningConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationPlanningConsumerHandoff.reason ??
                            "ready for later downstream planning handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationPlanningConsumerHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
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
                          {encoderFieldMaterializationPlanningConsumerHandoffFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationDownstreamConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamConsumer.fieldMaterializationPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamConsumer.fieldMaterializationPlanningConsumerHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamConsumer.reason ??
                            "ready for later downstream planning consumption"}
                        </strong>
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
                          {encoderFieldMaterializationDownstreamConsumerFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationDownstreamBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamBoundaryHandoff.fieldMaterializationDownstreamConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamBoundaryHandoff.fieldMaterializationDownstreamConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamBoundaryHandoff.reason ??
                            "ready for later downstream boundary handoff"}
                        </strong>
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
                          {encoderFieldMaterializationDownstreamBoundaryHandoffFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationDownstreamPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPlanningConsumer.fieldMaterializationDownstreamBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPlanningConsumer.fieldMaterializationDownstreamBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPlanningConsumer.reason ??
                            "ready for later downstream planning consumption"}
                        </strong>
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
                          {encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPlanningConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.fieldMaterializationDownstreamPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.fieldMaterializationDownstreamPlanningConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.reason ??
                            "ready for later downstream planning-boundary handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningBoundaryHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPlanningBoundaryHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumer.artifactKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumer.reason ??
                            "ready for later downstream pre-encoding consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.fieldMaterializationDownstreamPreEncodingConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.fieldMaterializationDownstreamPreEncodingConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.reason ??
                            "ready for later downstream pre-encoding boundary handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingBoundaryHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.artifactKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.fieldMaterializationDownstreamPreEncodingBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.fieldMaterializationDownstreamPreEncodingBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.reason ??
                            "ready for later downstream pre-encoding planning consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
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
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Consumer provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.fieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoff.reason ??
                            "ready for later downstream pre-encoding planning-boundary handoff"}
                        </strong>
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
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.artifactKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.reason ??
                            "ready for later downstream pre-encoding consumer artifact consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifact.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingConsumerArtifactFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationDownstreamPreEncodingConsumerArtifactStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.reason ??
                            "ready for later downstream pre-encoding planning-consumer handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.artifactKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.fieldMaterializationDownstreamPreEncodingPlanningConsumerHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.reason ??
                            "ready for later downstream pre-encoding planning-boundary consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationDownstreamPreEncodingPlanningBoundaryConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Artifact kind</span>
                        <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.artifactKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.artifactVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Artifact status</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPreEncodingConsumer.fieldMaterializationDownstreamPreEncodingPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingConsumer.reason ??
                            "ready for later next downstream pre-encoding consumer planning-boundary consumption"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumer.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextDownstreamPreEncodingConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Handoff kind</span>
                        <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.handoffKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.handoffVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Handoff status</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Proceedable</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen artifact provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationNextDownstreamPreEncodingConsumerSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.fieldMaterializationNextDownstreamPreEncodingConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.reason ??
                            "ready for later next downstream pre-encoding planning-consumer handoff"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Summary</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoff.summary}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="status-panel">
                    <div className="review-list">
                      <div className="review-row">
                        <span>Frozen kind</span>
                        <strong>{`${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotKind} · v${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.snapshotVersion}`}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen status</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.status}</strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen summary</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.summary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Serialized preview</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
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
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.fieldMaterializationNextDownstreamPreEncodingPlanningConsumerHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumer.reason ??
                            "ready for later next downstream planning-boundary consumption"}
                        </strong>
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
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryConsumerFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen artifact provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningConsumerSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.fieldMaterializationNextDownstreamPlanningConsumerStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoff.reason ??
                            "ready for later next downstream planning-boundary handoff"}
                        </strong>
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
                          {encoderFieldMaterializationNextDownstreamPlanningBoundaryHandoffFreeze.serialized.length >
                          96
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
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningConsumer.proceedable
                            ? "yes"
                            : "no"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Frozen handoff provenance</span>
                        <strong>
                          {`${encoderFieldMaterializationNextDownstreamPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffSnapshotKind} · ${encoderFieldMaterializationNextDownstreamPlanningConsumer.fieldMaterializationNextDownstreamPlanningBoundaryHandoffStatus}`}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Footprint</span>
                        <strong>{encoderFieldMaterializationNextDownstreamPlanningConsumer.dispatchFootprintSummary}</strong>
                      </div>
                      <div className="review-row">
                        <span>Reason</span>
                        <strong>
                          {encoderFieldMaterializationNextDownstreamPlanningConsumer.reason ??
                            "ready for later next downstream planning consumption"}
                        </strong>
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
                          {encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized.length >
                          96
                            ? `${encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized.slice(0, 96)}...`
                            : encoderFieldMaterializationNextDownstreamPlanningConsumerFreeze.serialized}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          ) : null}

          {lookupLifecycleId.trim().length > 0 && lifecycleNodeLookup.found && lifecycleNodeLookup.lineageKey ? (
            <div className="status-actions" style={{ marginTop: 12 }}>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setMode("lineage");
                  setJumpTarget({
                    lineageKey: lifecycleNodeLookup.lineageKey!,
                    eventId: lifecycleNodeLookup.sourceEventId,
                  });
                }}
              >
                Jump to lineage
              </button>
            </div>
          ) : null}

          {lookupLifecycleId.trim().length > 0 && !lifecycleNodeLookup.found ? (
            <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
              {lifecycleNodeLookup.status === "legacy"
                ? "This lifecycle ID is not currently retained as an explicit node in the mixed-history store, so it remains legacy/unmigrated."
                : "No retained explicit lifecycle node currently matches this ID. Mixed-history or missing data may still lack explicit node retention."}
            </p>
          ) : null}
        </div>

        <details style={{ marginTop: 12 }}>
          <summary>Reconciliation cohorts</summary>
          <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
            Internal/debug only. Groups retained lifecycle nodes by shared snapshot context and future-root seam source.
          </p>
          {reconciliationCohorts.length === 0 ? (
            <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
              No reconciliation cohorts are currently retained on this client.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {reconciliationCohorts.map((cohort, index) => (
                <div key={cohort.key} className="status-panel">
                  <span>
                    {index + 1}. Snapshot cohort
                  </span>
                  <div className="review-list" style={{ marginTop: 12 }}>
                    <div className="review-row">
                      <span>Snapshot context</span>
                      <strong>{`${cohort.snapshotLeafCount ?? 0} leaves · ${abbreviate(cohort.snapshotRoot)}`}</strong>
                    </div>
                    <div className="review-row">
                      <span>Future-root seam</span>
                      <strong>{cohort.futureRootSeamSourceSummary}</strong>
                    </div>
                    <div className="review-row">
                      <span>Future-root value</span>
                      <strong>{abbreviate(cohort.futureRootSeamValue)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Nodes in cohort</span>
                      <strong>{cohort.nodeCount}</strong>
                    </div>
                    <div className="review-row">
                      <span>Status counts</span>
                      <strong>
                        {`match ${cohort.statusCounts.match} · mismatch ${cohort.statusCounts.mismatch} · pending ${cohort.statusCounts.pending} · unavailable ${cohort.statusCounts.unavailable}`}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Agreement counts</span>
                      <strong>
                        {`match ${cohort.agreementCounts.match} · root ${cohort.agreementCounts["root-mismatch"]} · path ${cohort.agreementCounts["path-mismatch"]} · scheme ${cohort.agreementCounts["scheme-mismatch"]} · pending ${cohort.agreementCounts.pending} · unavailable ${cohort.agreementCounts.unavailable} · legacy ${cohort.agreementCounts.legacy}`}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Mismatches</span>
                      <strong>
                        {cohort.mismatchEntries.length > 0 ? "Select a mismatch below" : "None"}
                      </strong>
                    </div>
                    {cohort.mismatchEntries.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {cohort.mismatchEntries.map((entry) => (
                          <div
                            key={`${cohort.key}:${entry.lifecycleId}`}
                            className="preview-card"
                            style={{ display: "grid", gap: 8 }}
                          >
                            <div className="review-row">
                              <span>{abbreviate(entry.lifecycleId)}</span>
                              <strong>{entry.nodeRole ?? entry.sourceKind ?? "node"}</strong>
                            </div>
                            <div className="review-row">
                              <span>Status</span>
                              <strong>{entry.agreementStatus}</strong>
                            </div>
                            <div className="status-actions">
                              <button
                                className="button button-ghost"
                                type="button"
                                onClick={() => {
                                  setLookupLifecycleId(entry.lifecycleId);
                                  setLookupJumpTarget(entry.lifecycleId);
                                }}
                              >
                                Inspect
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        {mode === "chronological" && events.length === 0 ? (
          <p className="shield-helper shield-helper--meta">
            No retained canonical lifecycle events are available yet on this client.
          </p>
        ) : null}

        {mode === "chronological" ? (
          <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
            {events.map((event, index) => (
              <div key={event.id} className="status-panel">
                <span>
                  {index + 1}. {event.title}
                </span>
                <p>{event.summary}</p>
                <div className="review-list">
                  <div className="review-row">
                    <span>Event kind</span>
                    <strong>{event.kind}</strong>
                  </div>
                  <div className="review-row">
                    <span>Recorded</span>
                    <strong>{formatTimestamp(event.createdAt)}</strong>
                  </div>
                  <div className="review-row">
                    <span>{event.liveReferenceLabel}</span>
                    <strong>{abbreviate(event.liveReferenceValue)}</strong>
                  </div>
                  <div className="review-row">
                    <span>Asset summary</span>
                    <strong>{event.assetSummary}</strong>
                  </div>
                  <div className="review-row">
                    <span>Canonical predecessor</span>
                    <strong>
                      {event.predecessorCanonicalCommitment
                        ? abbreviate(event.predecessorCanonicalCommitment)
                        : event.kind === "shield"
                          ? "Lifecycle origin"
                          : "Not yet resolved"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Linkage quality</span>
                    <strong>{event.predecessorLinkageQuality ?? (event.kind === "shield" ? "origin" : "unresolved")}</strong>
                  </div>
                  <div className="review-row">
                    <span>Consumption semantics</span>
                    <strong>
                      {event.canonicalConsumptionId
                        ? `${event.canonicalConsumptionKind ?? "consumption"} · nullifier-ready`
                        : event.kind === "shield"
                          ? "Creation only"
                          : "Legacy or not yet attached"}
                    </strong>
                  </div>
                  {event.canonicalConsumptionBasis && (
                    <div className="review-row">
                      <span>Consumption basis</span>
                      <strong>{abbreviate(event.canonicalConsumptionBasis)}</strong>
                    </div>
                  )}
                  {event.canonicalNullifierStub && (
                    <div className="review-row">
                      <span>Nullifier stub</span>
                      <strong>{abbreviate(event.canonicalNullifierStub)}</strong>
                    </div>
                  )}
                  <div className="review-row">
                    <span>Predecessor source</span>
                    <strong>{event.predecessorCanonicalSource ?? "Origin or unresolved"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Continuity status</span>
                    <strong>{event.continuityStatus}</strong>
                  </div>
                  {event.transitionSignature && (
                    <div className="review-row">
                      <span>Transition signature</span>
                      <strong>{abbreviate(event.transitionSignature)}</strong>
                    </div>
                  )}
                  {event.spentMarkerSignature && (
                    <div className="review-row">
                      <span>Spent marker</span>
                      <strong>{abbreviate(event.spentMarkerSignature)}</strong>
                    </div>
                  )}
                  {event.operatorRequestId && (
                    <div className="review-row">
                      <span>Operator request</span>
                      <strong>{abbreviate(event.operatorRequestId)}</strong>
                    </div>
                  )}
                  {event.venueSummary && (
                    <div className="review-row">
                      <span>Venue</span>
                      <strong>{event.venueSummary}</strong>
                    </div>
                  )}
                  {event.exitSummary && (
                    <div className="review-row">
                      <span>Exit destination</span>
                      <strong>{abbreviate(event.exitSummary)}</strong>
                    </div>
                  )}
                </div>

                {event.successors.length > 0 && (
                  <>
                    <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
                      Retained canonical successor summaries
                    </p>
                    <div className="review-list">
                      {event.successors.map((successor) => (
                        <div key={`${event.id}:${successor.label}:${successor.commitment ?? successor.liveNoteId ?? "successor"}`}>
                          <div className="review-row">
                            <span>{successor.label}</span>
                            <strong>{successor.amountSummary ?? successor.assetSummary ?? "Successor"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Live note</span>
                            <strong>{abbreviate(successor.liveNoteId)}</strong>
                          </div>
                          <div className="review-row">
                            <span>Commitment</span>
                            <strong>{abbreviate(successor.commitment)}</strong>
                          </div>
                          <div className="review-row">
                            <span>Insertion</span>
                            <strong>
                              {successor.insertionIndex !== undefined
                                ? `${successor.insertionIndex} · ${abbreviate(successor.snapshotRoot)}`
                                : "Not inserted"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Spend status</span>
                            <strong>{successor.spendStatus ?? "legacy"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Spend seam</span>
                            <strong>
                              {successor.spendCapability === "spendable"
                                ? successor.consumedByKind
                                  ? `${successor.consumedByKind} consumed`
                                  : successor.nullifierReady
                                    ? "nullifier-ready"
                                    : "spendable"
                                : successor.spendCapability ?? "legacy"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Witness readiness</span>
                            <strong>{successor.witnessReadiness ?? "legacy"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Derived path</span>
                            <strong>
                              {successor.derivedPathKind
                                ? `${successor.derivedPathKind} · depth ${successor.derivedPathDepth ?? 0} · leaf ${successor.derivedPathLeafIndex ?? 0}`
                                : "Not attached"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Path semantics</span>
                            <strong>{successor.derivedPathSemantics ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Path digests</span>
                            <strong>
                              {successor.derivedPathDigestReady
                                ? `${successor.derivedPathDigestScheme} · ${successor.derivedPathDigestLevelCount ?? 0} levels`
                                : "Not attached"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Candidate path</span>
                            <strong>
                              {successor.candidatePathReady
                                ? `${successor.candidatePathKind} · ${successor.candidatePathScheme} · depth ${successor.candidatePathDepth ?? 0}`
                                : "Not attached"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Candidate agreement</span>
                            <strong>{successor.candidateAgreementStatus ?? "unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Witness package</span>
                            <strong>
                              {`${successor.witnessPackageReadiness ?? "unavailable"} · ${successor.witnessPackageSummary ?? "Unavailable"}`}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Circuit input</span>
                            <strong>
                              {`${successor.circuitInputReadiness ?? "unavailable"} · ${successor.circuitInputSummary ?? "Unavailable"}`}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Field groups</span>
                            <strong>{successor.circuitInputFieldGroupSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field mapping</span>
                            <strong>{successor.fieldMappingPrecheckSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Slot shaping</span>
                            <strong>{successor.slotNormalizationSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field candidates</span>
                            <strong>{successor.fieldCandidateSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field preimages</span>
                            <strong>{successor.fieldValuePreimageSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field lanes</span>
                            <strong>{successor.fieldLanePlanSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Lane arity</span>
                            <strong>{successor.laneArityPlanSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field schedule</span>
                            <strong>{successor.fieldEmissionScheduleSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field manifest</span>
                            <strong>{successor.fieldConversionManifestSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field drafts</span>
                            <strong>{successor.finiteFieldDraftSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Canonicalized drafts</span>
                            <strong>{successor.draftCanonicalizationSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Modulus readiness</span>
                            <strong>{successor.modulusReadinessSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Reduction plans</span>
                            <strong>{successor.reductionPlanSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field-element drafts</span>
                            <strong>{successor.fieldElementDraftSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Field-element assembly</span>
                            <strong>{successor.fieldElementAssemblySummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Witness layout</span>
                            <strong>{successor.witnessLayoutSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Witness realization</span>
                            <strong>{successor.witnessRealizationSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Witness realization recipes</span>
                            <strong>{successor.witnessRealizationRecipeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Materialization manifest</span>
                            <strong>{successor.witnessMaterializationManifestSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Backend bridge</span>
                            <strong>{successor.backendBridgeContractSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Adapter handshake</span>
                            <strong>{successor.backendAdapterHandshakeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Adapter bundle</span>
                            <strong>{successor.backendAdapterNormalizedSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Frozen adapter payload</span>
                            <strong>{successor.adapterPayloadFreezeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder stub</span>
                            <strong>{successor.encoderStubSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder work items</span>
                            <strong>{successor.encoderWorkItemSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder execution plan</span>
                            <strong>{successor.encoderExecutionPlanSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder dispatch</span>
                            <strong>{successor.encoderDispatchSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder dispatch ack</span>
                            <strong>{successor.encoderDispatchAckSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder dispatch readiness</span>
                            <strong>{successor.encoderDispatchReadinessSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder session ticket</span>
                            <strong>{successor.encoderSessionTicketSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Encoder preflight</span>
                            <strong>{successor.encoderPreflightSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Frozen preflight</span>
                            <strong>{successor.encoderPreflightFreezeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Orchestration handoff</span>
                            <strong>{successor.encoderOrchestrationHandoffSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Frozen handoff</span>
                            <strong>{successor.encoderOrchestrationHandoffFreezeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Runner intake</span>
                            <strong>{successor.encoderRunnerIntakeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Frozen intake</span>
                            <strong>{successor.encoderRunnerIntakeFreezeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Launch envelope</span>
                            <strong>{successor.encoderRunnerLaunchEnvelopeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Frozen launch</span>
                            <strong>{successor.encoderRunnerLaunchEnvelopeFreezeSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Start ticket</span>
                            <strong>{successor.encoderRunnerStartTicketSummary ?? "Unavailable"}</strong>
                          </div>
                          <div className="review-row">
                            <span>Root reconciliation</span>
                            <strong>
                              {`${successor.rootReconciliationStatus ?? "unavailable"} · ${successor.rootReconciliationScheme ?? "Unavailable"}`}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Future root seam</span>
                            <strong>
                              {successor.futureRootSeamKind
                                ? `${successor.futureRootSeamKind} · ${successor.futureRootSeamScheme ?? "unknown-scheme"} · ${successor.futureRootSeamLeafCount ?? 0} leaves`
                                : "No retained seam source"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Root compare</span>
                            <strong>
                              {successor.currentRootLikeDigest
                                ? `${abbreviate(successor.currentRootLikeDigest)} vs ${abbreviate(successor.futureRootSeamValue)}`
                                : "Not compare-ready"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Tree seam</span>
                            <strong>
                              {successor.candidatePathReady && successor.futureRootSeamScheme
                                ? "candidate path and candidate root aligned"
                                : "candidate tree seam incomplete"}
                            </strong>
                          </div>
                          <div className="review-row">
                            <span>Membership linkage</span>
                            <strong>{successor.membershipLinkedByLifecycle ? "lifecycle-linked" : "not linked"}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : lineages.length === 0 ? (
          <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
            No retained lineage groups are available yet on this client.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
            {lineages.map((lineage, index) => (
              <div
                key={lineage.key}
                className="status-panel"
                ref={(element) => {
                  lineageRefs.current[lineage.key] = element;
                }}
                style={
                  jumpTarget?.lineageKey === lineage.key
                    ? {
                        outline: "2px solid rgba(255,255,255,0.2)",
                        outlineOffset: 2,
                        background: "rgba(255,255,255,0.03)",
                      }
                    : undefined
                }
              >
                <span>
                  {index + 1}. {lineage.label}
                </span>
                <p>
                  {lineage.groupingQuality === "explicit"
                    ? "Grouped by explicit retained lifecycle IDs and lineage linkage."
                    : lineage.groupingQuality === "mixed"
                      ? "Grouped with mixed explicit lifecycle linkage and older canonical-only continuity."
                      : lineage.groupingQuality === "resolved"
                        ? "Grouped by shared canonical commitments."
                        : lineage.groupingQuality === "heuristic"
                          ? "Grouped by live-note continuity heuristics because canonical linkage is incomplete."
                          : "No reliable lineage anchor is currently available for this segment."}
                </p>
                <div className="review-list">
                  <div className="review-row">
                    <span>Grouping quality</span>
                    <strong>{lineage.groupingQuality}</strong>
                  </div>
                  <div className="review-row">
                    <span>Events in lineage</span>
                    <strong>{lineage.events.length}</strong>
                  </div>
                  <div className="review-row">
                    <span>Explicit anchors</span>
                    <strong>
                      {lineage.explicitAnchors.length > 0
                        ? lineage.explicitAnchors.map((anchor) => abbreviate(anchor)).join(", ")
                        : "None"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Canonical anchors</span>
                    <strong>
                      {lineage.canonicalAnchors.length > 0
                        ? lineage.canonicalAnchors.map((anchor) => abbreviate(anchor)).join(", ")
                        : "None"}
                    </strong>
                  </div>
                  <div className="review-row">
                    <span>Heuristic anchors</span>
                    <strong>
                      {lineage.heuristicAnchors.length > 0
                        ? lineage.heuristicAnchors.map((anchor) => abbreviate(anchor)).join(", ")
                        : "None"}
                    </strong>
                  </div>
                </div>

                <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
                  Lineage detail summary
                </p>
                <div className="review-list">
                  <div className="review-row">
                    <span>Branching detected</span>
                    <strong>{lineage.detailSummary.hasBranching ? "Yes" : "No"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Branch points</span>
                    <strong>{lineage.detailSummary.branchPointCount}</strong>
                  </div>
                  <div className="review-row">
                    <span>Branch continuity quality</span>
                    <strong>{formatBranchQuality(lineage.detailSummary.branchingQuality)}</strong>
                  </div>
                </div>

                {lineage.detailSummary.hasBranching ? (
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    {lineage.detailSummary.branchPoints.map((branchPoint) => (
                      <div
                        key={branchPoint.sourceEventId}
                        className="preview-card"
                        style={{ display: "grid", gap: 12 }}
                      >
                        <div className="review-row">
                          <span>{branchPoint.sourceEventTitle}</span>
                          <strong>{formatTimestamp(branchPoint.createdAt)}</strong>
                        </div>
                        <div className="review-row">
                          <span>Branch quality</span>
                          <strong>{formatBranchQuality(branchPoint.branchQuality)}</strong>
                        </div>
                        <div className="review-row">
                          <span>Consumed predecessor</span>
                          <strong>
                            {branchPoint.predecessorCanonicalCommitment
                              ? abbreviate(branchPoint.predecessorCanonicalCommitment)
                              : branchPoint.predecessorLiveNoteId
                                ? `${abbreviate(branchPoint.predecessorLiveNoteId)} (live)`
                                : "Origin or unresolved"}
                          </strong>
                        </div>
                        <div className="review-row">
                          <span>Successor paths</span>
                          <strong>{branchPoint.branchCount}</strong>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          {branchPoint.branches.map((branch) => (
                            <div
                              key={`${branchPoint.sourceEventId}:${branch.successorKind ?? branch.successorLabel}:${branch.commitment ?? branch.liveNoteId ?? "branch"}`}
                              className="status-panel"
                              style={{ padding: 12 }}
                            >
                              <div className="review-row">
                                <span>{branch.successorLabel}</span>
                                <strong>{formatSuccessorKind(branch.successorKind)}</strong>
                              </div>
                              <div className="review-row">
                                <span>Summary</span>
                                <strong>{branch.amountSummary ?? branch.assetSummary ?? "Successor"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Live note</span>
                                <strong>{abbreviate(branch.liveNoteId)}</strong>
                              </div>
                              <div className="review-row">
                                <span>Commitment</span>
                                <strong>{abbreviate(branch.commitment)}</strong>
                              </div>
                              <div className="review-row">
                                <span>Insertion</span>
                                <strong>
                                  {branch.insertionIndex !== undefined
                                    ? `${branch.insertionIndex} · ${abbreviate(branch.snapshotRoot)}`
                                    : "Not inserted"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Spend status</span>
                                <strong>{branch.spendStatus ?? "legacy"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Consumption link</span>
                                <strong>
                                  {branch.consumedByKind
                                    ? `${branch.consumedByKind} · ${abbreviate(branch.consumedByConsumptionId)}`
                                    : branch.nullifierReady
                                      ? "nullifier-ready and not yet consumed"
                                      : "Legacy or terminal"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Witness readiness</span>
                                <strong>{branch.witnessReadiness ?? "legacy"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Derived path</span>
                                <strong>
                                  {branch.derivedPathKind
                                    ? `${branch.derivedPathKind} · depth ${branch.derivedPathDepth ?? 0} · leaf ${branch.derivedPathLeafIndex ?? 0}`
                                    : "Not attached"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Path semantics</span>
                                <strong>{branch.derivedPathSemantics ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Path digests</span>
                                <strong>
                                  {branch.derivedPathDigestReady
                                    ? `${branch.derivedPathDigestScheme} · ${branch.derivedPathDigestLevelCount ?? 0} levels`
                                    : "Not attached"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Candidate path</span>
                                <strong>
                                  {branch.candidatePathReady
                                    ? `${branch.candidatePathKind} · ${branch.candidatePathScheme} · depth ${branch.candidatePathDepth ?? 0}`
                                    : "Not attached"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Candidate agreement</span>
                                <strong>{branch.candidateAgreementStatus ?? "unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Witness package</span>
                                <strong>
                                  {`${branch.witnessPackageReadiness ?? "unavailable"} · ${branch.witnessPackageSummary ?? "Unavailable"}`}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Circuit input</span>
                                <strong>
                                  {`${branch.circuitInputReadiness ?? "unavailable"} · ${branch.circuitInputSummary ?? "Unavailable"}`}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Field groups</span>
                                <strong>{branch.circuitInputFieldGroupSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field mapping</span>
                                <strong>{branch.fieldMappingPrecheckSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Slot shaping</span>
                                <strong>{branch.slotNormalizationSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field candidates</span>
                                <strong>{branch.fieldCandidateSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field preimages</span>
                                <strong>{branch.fieldValuePreimageSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field lanes</span>
                                <strong>{branch.fieldLanePlanSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Lane arity</span>
                                <strong>{branch.laneArityPlanSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field schedule</span>
                                <strong>{branch.fieldEmissionScheduleSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field manifest</span>
                                <strong>{branch.fieldConversionManifestSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field drafts</span>
                                <strong>{branch.finiteFieldDraftSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Canonicalized drafts</span>
                                <strong>{branch.draftCanonicalizationSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Modulus readiness</span>
                                <strong>{branch.modulusReadinessSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Reduction plans</span>
                                <strong>{branch.reductionPlanSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field-element drafts</span>
                                <strong>{branch.fieldElementDraftSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Field-element assembly</span>
                                <strong>{branch.fieldElementAssemblySummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Witness layout</span>
                                <strong>{branch.witnessLayoutSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Witness realization</span>
                                <strong>{branch.witnessRealizationSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Witness realization recipes</span>
                                <strong>{branch.witnessRealizationRecipeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Materialization manifest</span>
                                <strong>{branch.witnessMaterializationManifestSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Backend bridge</span>
                                <strong>{branch.backendBridgeContractSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Adapter handshake</span>
                                <strong>{branch.backendAdapterHandshakeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Adapter bundle</span>
                                <strong>{branch.backendAdapterNormalizedSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Frozen adapter payload</span>
                                <strong>{branch.adapterPayloadFreezeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder stub</span>
                                <strong>{branch.encoderStubSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder work items</span>
                                <strong>{branch.encoderWorkItemSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder execution plan</span>
                                <strong>{branch.encoderExecutionPlanSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder dispatch</span>
                                <strong>{branch.encoderDispatchSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder dispatch ack</span>
                                <strong>{branch.encoderDispatchAckSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder dispatch readiness</span>
                                <strong>{branch.encoderDispatchReadinessSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder session ticket</span>
                                <strong>{branch.encoderSessionTicketSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Encoder preflight</span>
                                <strong>{branch.encoderPreflightSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Frozen preflight</span>
                                <strong>{branch.encoderPreflightFreezeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Orchestration handoff</span>
                                <strong>{branch.encoderOrchestrationHandoffSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Frozen handoff</span>
                                <strong>{branch.encoderOrchestrationHandoffFreezeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Runner intake</span>
                                <strong>{branch.encoderRunnerIntakeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Frozen intake</span>
                                <strong>{branch.encoderRunnerIntakeFreezeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Launch envelope</span>
                                <strong>{branch.encoderRunnerLaunchEnvelopeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Frozen launch</span>
                                <strong>{branch.encoderRunnerLaunchEnvelopeFreezeSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Start ticket</span>
                                <strong>{branch.encoderRunnerStartTicketSummary ?? "Unavailable"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Root reconciliation</span>
                                <strong>
                                  {`${branch.rootReconciliationStatus ?? "unavailable"} · ${branch.rootReconciliationScheme ?? "Unavailable"}`}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Future root seam</span>
                                <strong>
                                  {branch.futureRootSeamKind
                                    ? `${branch.futureRootSeamKind} · ${branch.futureRootSeamScheme ?? "unknown-scheme"} · ${branch.futureRootSeamLeafCount ?? 0} leaves`
                                    : "No retained seam source"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Root compare</span>
                                <strong>
                                  {branch.currentRootLikeDigest
                                    ? `${abbreviate(branch.currentRootLikeDigest)} vs ${abbreviate(branch.futureRootSeamValue)}`
                                    : "Not compare-ready"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Tree seam</span>
                                <strong>
                                  {branch.candidatePathReady && branch.futureRootSeamScheme
                                    ? "candidate path and candidate root aligned"
                                    : "candidate tree seam incomplete"}
                                </strong>
                              </div>
                              <div className="review-row">
                                <span>Membership linkage</span>
                                <strong>{branch.membershipLinkedByLifecycle ? "lifecycle-linked" : "not linked"}</strong>
                              </div>
                              <div className="review-row">
                                <span>Continuity quality</span>
                                <strong>{formatBranchQuality(branch.continuityQuality)}</strong>
                              </div>
                              <p className="shield-helper shield-helper--meta" style={{ marginTop: 8 }}>
                                Branch-chain condensation
                              </p>
                              <div className="review-list">
                                <div className="review-row">
                                  <span>Path span</span>
                                  <strong>{branch.chainSummary.pathSpanLabel}</strong>
                                </div>
                                <div className="review-row">
                                  <span>Origin</span>
                                  <strong>{branch.chainSummary.originSummary}</strong>
                                </div>
                                <div className="review-row">
                                  <span>First descendant</span>
                                  <strong>
                                    {branch.chainSummary.firstResolvedDescendant
                                      ? `${branch.chainSummary.firstResolvedDescendant.eventTitle} · ${formatTimestamp(branch.chainSummary.firstResolvedDescendant.createdAt)}`
                                      : "No resolved descendant"}
                                  </strong>
                                </div>
                                <div className="review-row">
                                  <span>Latest descendant</span>
                                  <strong>
                                    {branch.chainSummary.latestResolvedDescendant
                                      ? `${branch.chainSummary.latestResolvedDescendant.eventTitle} · ${formatTimestamp(branch.chainSummary.latestResolvedDescendant.createdAt)}`
                                      : "No resolved descendant"}
                                  </strong>
                                </div>
                                <div className="review-row">
                                  <span>Chain quality</span>
                                  <strong>{formatBranchQuality(branch.chainSummary.continuityQuality)}</strong>
                                </div>
                                <div className="review-row">
                                  <span>Chain state</span>
                                  <strong>{formatChainResolutionState(branch.chainSummary.resolutionState)}</strong>
                                </div>
                                <div className="review-row">
                                  <span>Chain read</span>
                                  <strong>{branch.chainSummary.resolutionSummary}</strong>
                                </div>
                              </div>

                              {branch.chainSummary.firstResolvedDescendant ? (
                                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                  <div className="preview-card">
                                    <div className="review-row">
                                      <span>First descendant detail</span>
                                      <strong>{branch.chainSummary.firstResolvedDescendant.eventKind}</strong>
                                    </div>
                                    <div className="review-row">
                                      <span>Asset summary</span>
                                      <strong>{branch.chainSummary.firstResolvedDescendant.eventAssetSummary}</strong>
                                    </div>
                                    <div className="review-row">
                                      <span>Matched via</span>
                                      <strong>{branch.chainSummary.firstResolvedDescendant.matchedBy}</strong>
                                    </div>
                                    <div className="review-row">
                                      <span>Continuity</span>
                                      <strong>{branch.chainSummary.firstResolvedDescendant.continuityStatus}</strong>
                                    </div>
                                  </div>
                                  {branch.chainSummary.latestResolvedDescendant &&
                                  branch.chainSummary.latestResolvedDescendant.eventId !==
                                    branch.chainSummary.firstResolvedDescendant.eventId ? (
                                    <div className="preview-card">
                                      <div className="review-row">
                                        <span>Latest descendant detail</span>
                                        <strong>{branch.chainSummary.latestResolvedDescendant.eventKind}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Asset summary</span>
                                        <strong>{branch.chainSummary.latestResolvedDescendant.eventAssetSummary}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Matched via</span>
                                        <strong>{branch.chainSummary.latestResolvedDescendant.matchedBy}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Continuity</span>
                                        <strong>{branch.chainSummary.latestResolvedDescendant.continuityStatus}</strong>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className="review-row">
                                <span>Continuity read</span>
                                <strong>{branch.continuitySummary}</strong>
                              </div>
                              <div className="review-row">
                                <span>Owner hint</span>
                                <strong>{abbreviate(branch.ownerPublicKey)}</strong>
                              </div>

                              {branch.downstreamEvents.length > 0 ? (
                                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                  {branch.downstreamEvents.map((downstreamEvent) => (
                                    <div
                                      key={`${branchPoint.sourceEventId}:${branch.successorLabel}:${downstreamEvent.eventId}:${downstreamEvent.matchedBy}`}
                                      className="preview-card"
                                    >
                                      <div className="review-row">
                                        <span>{downstreamEvent.eventTitle}</span>
                                        <strong>{formatTimestamp(downstreamEvent.createdAt)}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Matched as</span>
                                        <strong>{downstreamEvent.matchedBy}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Continuity quality</span>
                                        <strong>{formatBranchQuality(downstreamEvent.continuityQuality)}</strong>
                                      </div>
                                      <div className="review-row">
                                        <span>Matched anchor</span>
                                        <strong>{abbreviate(downstreamEvent.matchedAnchor)}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="shield-helper shield-helper--meta" style={{ marginTop: 8 }}>
                                  No later swap or unshield continuation is currently resolved from this successor.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
                    No multi-successor branch point is currently retained inside this lineage.
                  </p>
                )}

                <p className="shield-helper shield-helper--meta" style={{ marginTop: 12 }}>
                  Grouped lifecycle events
                </p>
                <div style={{ display: "grid", gap: 12 }}>
                  {lineage.events.map((event) => (
                    <div
                      key={event.id}
                      className="preview-card"
                      style={
                        jumpTarget?.lineageKey === lineage.key && jumpTarget.eventId === event.id
                          ? {
                              outline: "2px solid rgba(255,255,255,0.14)",
                              outlineOffset: 2,
                            }
                          : undefined
                      }
                    >
                      <div className="review-row">
                        <span>{event.title}</span>
                        <strong>{formatTimestamp(event.createdAt)}</strong>
                      </div>
                      <div className="review-row">
                        <span>Continuity</span>
                        <strong>{event.continuityStatus}</strong>
                      </div>
                      <div className="review-row">
                        <span>Linkage quality</span>
                        <strong>{event.predecessorLinkageQuality ?? (event.kind === "shield" ? "origin" : "unresolved")}</strong>
                      </div>
                      <div className="review-row">
                        <span>Consumption</span>
                        <strong>
                          {event.canonicalConsumptionId
                            ? `${event.canonicalConsumptionKind ?? "consumption"} · ${abbreviate(event.canonicalConsumptionBasis)}`
                            : event.kind === "shield"
                              ? "Creation only"
                              : "Legacy or not yet attached"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Predecessor</span>
                        <strong>
                          {event.predecessorCanonicalCommitment
                            ? abbreviate(event.predecessorCanonicalCommitment)
                            : event.predecessorLiveNoteId
                              ? `${abbreviate(event.predecessorLiveNoteId)} (live)`
                              : "Origin or unresolved"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Successors</span>
                        <strong>
                          {event.successors.length > 0
                            ? event.successors
                                .map((successor) => successor.label)
                                .join(", ")
                            : "Lifecycle endpoint"}
                        </strong>
                      </div>
                      <div className="review-row">
                        <span>Asset summary</span>
                        <strong>{event.assetSummary}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </details>
    </article>
  );
}
