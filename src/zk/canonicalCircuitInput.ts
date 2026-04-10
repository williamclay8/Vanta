import {
  assembleCanonicalLifecycleWitnessPackage,
  type CanonicalLifecycleWitnessPackage,
  type CanonicalLifecycleWitnessPackageReadiness,
} from "./canonicalWitnessPackage";

export const CANONICAL_CIRCUIT_INPUT_KIND_V1 = "vanta-canonical-circuit-input-v1";
export const CANONICAL_CIRCUIT_INPUT_ENCODING_SCHEME_V1 =
  "vanta-deterministic-zk-input-preimage-v1";

export type CanonicalCircuitInputEncodingReadiness =
  CanonicalLifecycleWitnessPackageReadiness;

export type CanonicalCircuitInputScalar =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[];

export type CanonicalCircuitInputEntry = {
  key: string;
  valueKind: "string" | "number" | "boolean" | "string[]" | "number[]";
  present: boolean;
  value: CanonicalCircuitInputScalar;
};

export type CanonicalCircuitInputSection = {
  name:
    | "identity"
    | "spend"
    | "consumption"
    | "membership"
    | "future-root-seam"
    | "candidate-path"
    | "candidate-agreement";
  entries: CanonicalCircuitInputEntry[];
};

export type CanonicalCircuitInputSectionReadiness =
  | "ready"
  | "partial"
  | "legacy"
  | "unavailable";

export type CanonicalCircuitInputFieldGroupReadiness = {
  sectionName: CanonicalCircuitInputSection["name"];
  readiness: CanonicalCircuitInputSectionReadiness;
  missingItems: string[];
  summary: string;
};

export type CanonicalCircuitInputFieldShapeBucket =
  | "scalar"
  | "digest"
  | "path-vector"
  | "mixed"
  | "blocked";

export type CanonicalCircuitInputFieldMappingPrecheckEntry = {
  sectionName: CanonicalCircuitInputSection["name"];
  readiness: CanonicalCircuitInputSectionReadiness;
  bucket: CanonicalCircuitInputFieldShapeBucket;
  fieldSlotCount: number;
  blocked: boolean;
  summary: string;
};

export type CanonicalCircuitInputNormalizedSlot = {
  sectionName: CanonicalCircuitInputSection["name"];
  bucket: Exclude<CanonicalCircuitInputFieldShapeBucket, "blocked">;
  slotIndex: number;
  slotKind: "scalar" | "digest" | "path-vector" | "mixed";
  slotLabel: string;
  sourceKey: string;
  valueKind: CanonicalCircuitInputEntry["valueKind"];
  valueSummary: string;
};

export type CanonicalCircuitInputSlotNormalizationEntry = {
  sectionName: CanonicalCircuitInputSection["name"];
  bucket: CanonicalCircuitInputFieldShapeBucket;
  readiness: CanonicalCircuitInputSectionReadiness;
  normalized: boolean;
  slotCount: number;
  blockedReason?: string;
  slots: CanonicalCircuitInputNormalizedSlot[];
};

export type CanonicalCircuitInputFieldCandidateFamily =
  | "text-scalar"
  | "integer-scalar"
  | "digest-hex"
  | "path-node-digest"
  | "boolean-flag"
  | "enum-scalar"
  | "blocked";

export type CanonicalCircuitInputFieldCandidateEntry = {
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  sourceKey: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  blocked: boolean;
  summary: string;
};

export type CanonicalCircuitInputFieldValuePreimage = {
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  kind: "vanta-canonical-field-value-preimage-v1";
  version: 1;
  present: boolean;
  payloadKind?:
    | "utf8-text"
    | "integer-decimal"
    | "hex-digest"
    | "path-node-digest"
    | "boolean-token"
    | "enum-token";
  payloadSummary: string;
  payload: readonly string[];
  blockedReason?: string;
};

export type CanonicalCircuitInputFieldLaneShape =
  | "single-field"
  | "packed-bytes"
  | "digest-limb-sequence"
  | "path-vector-lane"
  | "boolean-lane"
  | "enum-lane"
  | "blocked";

export type CanonicalCircuitInputFieldLanePlanEntry = {
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  laneShape: CanonicalCircuitInputFieldLaneShape;
  planned: boolean;
  laneCount: number;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputLaneArityKind =
  | "single"
  | "multi-limb"
  | "packed-bytes"
  | "vector-expansion"
  | "blocked";

export type CanonicalCircuitInputLaneArityPlanEntry = {
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  laneShape: CanonicalCircuitInputFieldLaneShape;
  arityKind: CanonicalCircuitInputLaneArityKind;
  planned: boolean;
  expectedFieldCount: number;
  limbCount?: number;
  byteChunkCount?: number;
  vectorElementCount?: number;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputFieldEmissionScheduleEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  laneShape: CanonicalCircuitInputFieldLaneShape;
  arityKind: CanonicalCircuitInputLaneArityKind;
  laneEmissionIndex: number;
  emittedFieldRole: "single" | "limb" | "byte-pack" | "vector-element";
  emittedFieldLabel: string;
};

export type CanonicalCircuitInputFieldConversionRecipeKind =
  | "as-integer"
  | "as-boolean-flag"
  | "as-enum-token"
  | "as-packed-bytes"
  | "as-digest-limb"
  | "as-path-node-digest"
  | "blocked";

export type CanonicalCircuitInputFieldConversionManifestRow = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  laneShape: CanonicalCircuitInputFieldLaneShape;
  arityKind: CanonicalCircuitInputLaneArityKind;
  laneEmissionIndex: number;
  emittedFieldRole: CanonicalCircuitInputFieldEmissionScheduleEntry["emittedFieldRole"];
  emittedFieldLabel: string;
  preimageKind: CanonicalCircuitInputFieldValuePreimage["kind"];
  preimageVersion: CanonicalCircuitInputFieldValuePreimage["version"];
  preimagePayloadKind?: NonNullable<CanonicalCircuitInputFieldValuePreimage["payloadKind"]>;
  preimagePayloadSummary: string;
  conversionRecipe: CanonicalCircuitInputFieldConversionRecipeKind;
  resolved: boolean;
  blockedReason?: string;
};

export type CanonicalCircuitInputFiniteFieldDraftFamily =
  | "decimal-scalar-candidate"
  | "boolean-candidate"
  | "enum-token-candidate"
  | "byte-pack-candidate"
  | "digest-limb-candidate"
  | "path-node-candidate"
  | "blocked";

export type CanonicalCircuitInputFiniteFieldDraftEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  family: CanonicalCircuitInputFieldCandidateFamily;
  conversionRecipe: CanonicalCircuitInputFieldConversionRecipeKind;
  draftFamily: CanonicalCircuitInputFiniteFieldDraftFamily;
  draftKind: "vanta-backend-neutral-field-draft-v1";
  version: 1;
  resolved: boolean;
  payloadSummary: string;
  payload: readonly string[];
  blockedReason?: string;
};

export type CanonicalCircuitInputDraftCanonicalizationFamily =
  | "canonical-decimal-token"
  | "canonical-boolean-token"
  | "canonical-enum-token"
  | "canonical-byte-chunks"
  | "canonical-digest-limbs"
  | "canonical-path-node-limbs"
  | "blocked";

export type CanonicalCircuitInputDraftCanonicalizationEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  draftFamily: CanonicalCircuitInputFiniteFieldDraftFamily;
  canonicalizationFamily: CanonicalCircuitInputDraftCanonicalizationFamily;
  kind: "vanta-backend-neutral-draft-canonicalization-v1";
  version: 1;
  canonicalized: boolean;
  payloadSummary: string;
  payload: readonly string[];
  blockedReason?: string;
};

export type CanonicalCircuitInputModulusReadinessStatus =
  | "direct"
  | "needs-splitting"
  | "backend-width-dependent"
  | "blocked";

export type CanonicalCircuitInputModulusReadinessEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  canonicalizationFamily: CanonicalCircuitInputDraftCanonicalizationFamily;
  readiness: CanonicalCircuitInputModulusReadinessStatus;
  kind: "vanta-backend-neutral-modulus-readiness-v1";
  version: 1;
  ready: boolean;
  needsChunkSplitting: boolean;
  backendWidthDependent: boolean;
  payloadCount: number;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputReductionAction =
  | "direct-reduce"
  | "split-then-reduce"
  | "resolve-width-then-reduce"
  | "blocked";

export type CanonicalCircuitInputReductionPlanEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  canonicalizationFamily: CanonicalCircuitInputDraftCanonicalizationFamily;
  modulusReadiness: CanonicalCircuitInputModulusReadinessStatus;
  action: CanonicalCircuitInputReductionAction;
  kind: "vanta-backend-neutral-reduction-plan-v1";
  version: 1;
  planned: boolean;
  needsChunkSplitting: boolean;
  backendWidthDependent: boolean;
  expectedSplitUnits?: number;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputFieldElementDraftKind =
  | "direct-token-candidate"
  | "split-chunk-candidate"
  | "width-resolve-placeholder"
  | "blocked";

export type CanonicalCircuitInputFieldElementDraftEntry = {
  emissionIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  reductionAction: CanonicalCircuitInputReductionAction;
  draftKind: CanonicalCircuitInputFieldElementDraftKind;
  candidateIndex: number;
  kind: "vanta-backend-neutral-field-element-draft-v1";
  version: 1;
  present: boolean;
  directReducible: boolean;
  splitDerived: boolean;
  widthDependent: boolean;
  payloadSummary: string;
  payload: readonly string[];
  blockedReason?: string;
};

export type CanonicalCircuitInputFieldElementAssemblyKind =
  | "scalar-lane"
  | "digest-vector"
  | "path-vector"
  | "split-chunk-lane"
  | "width-placeholder-lane"
  | "blocked";

export type CanonicalCircuitInputFieldElementAssemblyEntry = {
  assemblyIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  laneIndex: number;
  memberDraftRows: Array<{
    emissionIndex: number;
    candidateIndex: number;
    draftKind: CanonicalCircuitInputFieldElementDraftKind;
    reductionAction: CanonicalCircuitInputReductionAction;
  }>;
  memberCount: number;
  assembled: boolean;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputWitnessLayoutEntry = {
  witnessIndex: number;
  assemblyIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  laneIndex: number;
  memberIndex: number;
  memberDraftRow: {
    emissionIndex: number;
    candidateIndex: number;
    draftKind: CanonicalCircuitInputFieldElementDraftKind;
    reductionAction: CanonicalCircuitInputReductionAction;
  };
  laidOut: boolean;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputWitnessRealizationStatus =
  | "realizable"
  | "split-dependent"
  | "width-dependent"
  | "placeholder"
  | "blocked";

export type CanonicalCircuitInputWitnessRealizationPrecheckEntry = {
  witnessIndex: number;
  assemblyIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  draftKind: CanonicalCircuitInputFieldElementDraftKind;
  reductionAction: CanonicalCircuitInputReductionAction;
  status: CanonicalCircuitInputWitnessRealizationStatus;
  kind: "vanta-backend-neutral-witness-realization-precheck-v1";
  version: 1;
  ready: boolean;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputWitnessRealizationRecipeAction =
  | "direct-field-materialize"
  | "split-materialize"
  | "width-resolve-materialize"
  | "placeholder-materialize"
  | "blocked";

export type CanonicalCircuitInputWitnessRealizationRecipeEntry = {
  witnessIndex: number;
  assemblyIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  status: CanonicalCircuitInputWitnessRealizationStatus;
  action: CanonicalCircuitInputWitnessRealizationRecipeAction;
  kind: "vanta-backend-neutral-witness-realization-recipe-v1";
  version: 1;
  actionable: boolean;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputWitnessMaterializationManifestRow = {
  materializationIndex: number;
  witnessIndex: number;
  assemblyIndex: number;
  sectionName: CanonicalCircuitInputSection["name"];
  slotIndex: number;
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  action: CanonicalCircuitInputWitnessRealizationRecipeAction;
  kind: "vanta-backend-neutral-witness-materialization-manifest-v1";
  version: 1;
  actionable: boolean;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputBackendBridgeContractRow = {
  materializationIndex: number;
  witnessIndex: number;
  action: CanonicalCircuitInputWitnessRealizationRecipeAction;
  sectionName: CanonicalCircuitInputSection["name"];
  slotLabel: string;
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind;
  actionable: boolean;
  contractKind: "vanta-backend-bridge-contract-row-v1";
  contractVersion: 1;
  familyHint: string;
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputBackendAdapterDeclaration = {
  adapterId: string;
  label: string;
  supportedContractKind: CanonicalCircuitInputBackendBridgeContractRow["contractKind"];
  supportedContractVersion: CanonicalCircuitInputBackendBridgeContractRow["contractVersion"];
  supportedActions: CanonicalCircuitInputBackendBridgeContractRow["action"][];
  supportedFamilyHints: string[];
};

export type CanonicalCircuitInputBackendAdapterHandshakeRow = {
  materializationIndex: number;
  witnessIndex: number;
  action: CanonicalCircuitInputBackendBridgeContractRow["action"];
  familyHint: CanonicalCircuitInputBackendBridgeContractRow["familyHint"];
  actionable: boolean;
  status:
    | "accepted"
    | "blocked"
    | "unsupported-contract"
    | "unsupported-action"
    | "unsupported-family";
  summary: string;
  blockedReason?: string;
};

export type CanonicalCircuitInputBackendAdapterHandshakeResult = {
  adapterId: string;
  adapterLabel: string;
  contractKind: CanonicalCircuitInputBackendBridgeContractRow["contractKind"];
  contractVersion: CanonicalCircuitInputBackendBridgeContractRow["contractVersion"];
  contractSupported: boolean;
  accepted: boolean;
  acceptedRowCount: number;
  blockedRowCount: number;
  unsupportedActionKinds: string[];
  unsupportedFamilyHints: string[];
  rowResults: CanonicalCircuitInputBackendAdapterHandshakeRow[];
  summary: string;
};

export type CanonicalCircuitInputBackendAdapterNormalizedRow = {
  materializationIndex: number;
  witnessIndex: number;
  action: CanonicalCircuitInputBackendBridgeContractRow["action"];
  familyHint: CanonicalCircuitInputBackendBridgeContractRow["familyHint"];
  sectionName: CanonicalCircuitInputSection["name"];
  slotLabel: string;
  actionable: true;
  payloadHint: string;
  summary: string;
};

export type CanonicalCircuitInputBackendAdapterNormalizedBundle = {
  adapterId: string;
  adapterLabel: string;
  contractKind: CanonicalCircuitInputBackendBridgeContractRow["contractKind"];
  contractVersion: CanonicalCircuitInputBackendBridgeContractRow["contractVersion"];
  normalizedRows: CanonicalCircuitInputBackendAdapterNormalizedRow[];
  excludedRows: CanonicalCircuitInputBackendAdapterHandshakeRow[];
  acceptedRowCount: number;
  excludedRowCount: number;
  summary: string;
};

export type CanonicalCircuitInputAdapterPayloadFreeze = {
  kind: "vanta-adapter-payload-snapshot-v1";
  version: 1;
  adapterId: string;
  adapterLabel: string;
  acceptedRowCount: number;
  excludedRowCount: number;
  serialized: string;
  summary: string;
};

export const GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION: CanonicalCircuitInputBackendAdapterDeclaration = {
  adapterId: "generic-phase1-backend-adapter",
  label: "Generic Phase 1 Adapter",
  supportedContractKind: "vanta-backend-bridge-contract-row-v1",
  supportedContractVersion: 1,
  supportedActions: [
    "direct-field-materialize",
    "split-materialize",
    "width-resolve-materialize",
  ],
  supportedFamilyHints: ["scalar-lane", "vector", "split-lane", "width-placeholder"],
};

export type CanonicalLifecycleCircuitInput = {
  kind: typeof CANONICAL_CIRCUIT_INPUT_KIND_V1;
  version: 1;
  encodingScheme: typeof CANONICAL_CIRCUIT_INPUT_ENCODING_SCHEME_V1;
  readiness: CanonicalCircuitInputEncodingReadiness;
  sourceWitnessPackageKind: CanonicalLifecycleWitnessPackage["kind"];
  sourceWitnessPackageVersion: CanonicalLifecycleWitnessPackage["version"];
  lifecycleId?: string;
  fieldOrder: readonly string[];
  sections: CanonicalCircuitInputSection[];
  fieldGroupReadiness: CanonicalCircuitInputFieldGroupReadiness[];
  fieldMappingPrecheck: CanonicalCircuitInputFieldMappingPrecheckEntry[];
  slotNormalization: CanonicalCircuitInputSlotNormalizationEntry[];
  fieldCandidates: CanonicalCircuitInputFieldCandidateEntry[];
  fieldValuePreimages: CanonicalCircuitInputFieldValuePreimage[];
  fieldLanePlans: CanonicalCircuitInputFieldLanePlanEntry[];
  laneArityPlans: CanonicalCircuitInputLaneArityPlanEntry[];
  fieldEmissionSchedule: CanonicalCircuitInputFieldEmissionScheduleEntry[];
  fieldConversionManifest: CanonicalCircuitInputFieldConversionManifestRow[];
  finiteFieldInputDrafts: CanonicalCircuitInputFiniteFieldDraftEntry[];
  draftCanonicalizations: CanonicalCircuitInputDraftCanonicalizationEntry[];
  modulusReadiness: CanonicalCircuitInputModulusReadinessEntry[];
  reductionPlans: CanonicalCircuitInputReductionPlanEntry[];
  fieldElementDrafts: CanonicalCircuitInputFieldElementDraftEntry[];
  fieldElementAssemblies: CanonicalCircuitInputFieldElementAssemblyEntry[];
  witnessLayoutManifest: CanonicalCircuitInputWitnessLayoutEntry[];
  witnessRealizationPrecheck: CanonicalCircuitInputWitnessRealizationPrecheckEntry[];
  witnessRealizationRecipes: CanonicalCircuitInputWitnessRealizationRecipeEntry[];
  witnessMaterializationManifest: CanonicalCircuitInputWitnessMaterializationManifestRow[];
  backendBridgeContract: CanonicalCircuitInputBackendBridgeContractRow[];
  backendAdapterHandshake: CanonicalCircuitInputBackendAdapterHandshakeResult;
  backendAdapterNormalizedBundle: CanonicalCircuitInputBackendAdapterNormalizedBundle;
  adapterPayloadFreeze: CanonicalCircuitInputAdapterPayloadFreeze;
  missingComponents: string[];
  serialized: string;
};

export type CanonicalLifecycleCircuitInputInspection = {
  encoding: CanonicalLifecycleCircuitInput;
  sectionCount: number;
  readySectionCount: number;
  blockingSections: CanonicalCircuitInputFieldGroupReadiness[];
  precheckReadyCount: number;
  precheckBlockedSections: CanonicalCircuitInputFieldMappingPrecheckEntry[];
  normalizedSectionCount: number;
  totalNormalizedSlotCount: number;
  blockedSlotSections: CanonicalCircuitInputSlotNormalizationEntry[];
  fieldCandidateCount: number;
  blockedFieldCandidates: CanonicalCircuitInputFieldCandidateEntry[];
  fieldValuePreimageCount: number;
  blockedFieldValuePreimages: CanonicalCircuitInputFieldValuePreimage[];
  fieldLanePlanCount: number;
  blockedFieldLanePlans: CanonicalCircuitInputFieldLanePlanEntry[];
  laneArityPlanCount: number;
  blockedLaneArityPlans: CanonicalCircuitInputLaneArityPlanEntry[];
  totalExpectedFieldCount: number;
  emittedFieldCount: number;
  manifestRowCount: number;
  blockedManifestRows: CanonicalCircuitInputFieldConversionManifestRow[];
  finiteFieldDraftCount: number;
  blockedFiniteFieldDrafts: CanonicalCircuitInputFiniteFieldDraftEntry[];
  canonicalizedDraftCount: number;
  blockedDraftCanonicalizations: CanonicalCircuitInputDraftCanonicalizationEntry[];
  directModulusReadyCount: number;
  blockedModulusReadiness: CanonicalCircuitInputModulusReadinessEntry[];
  widthDependentModulusReadiness: CanonicalCircuitInputModulusReadinessEntry[];
  reductionPlanCount: number;
  blockedReductionPlans: CanonicalCircuitInputReductionPlanEntry[];
  widthDependentReductionPlans: CanonicalCircuitInputReductionPlanEntry[];
  fieldElementDraftCount: number;
  blockedFieldElementDrafts: CanonicalCircuitInputFieldElementDraftEntry[];
  fieldElementAssemblyCount: number;
  blockedFieldElementAssemblies: CanonicalCircuitInputFieldElementAssemblyEntry[];
  witnessLayoutCount: number;
  blockedWitnessLayouts: CanonicalCircuitInputWitnessLayoutEntry[];
  realizableWitnessCount: number;
  splitDependentWitnesses: CanonicalCircuitInputWitnessRealizationPrecheckEntry[];
  widthDependentWitnesses: CanonicalCircuitInputWitnessRealizationPrecheckEntry[];
  blockedWitnessRealizationPrecheck: CanonicalCircuitInputWitnessRealizationPrecheckEntry[];
  witnessRealizationRecipeCount: number;
  blockedWitnessRealizationRecipes: CanonicalCircuitInputWitnessRealizationRecipeEntry[];
  witnessMaterializationRowCount: number;
  blockedWitnessMaterializationRows: CanonicalCircuitInputWitnessMaterializationManifestRow[];
  backendBridgeContractCount: number;
  blockedBackendBridgeContractRows: CanonicalCircuitInputBackendBridgeContractRow[];
  backendAdapterAcceptedRowCount: number;
  blockedBackendAdapterRows: CanonicalCircuitInputBackendAdapterHandshakeRow[];
  unsupportedBackendAdapterRows: CanonicalCircuitInputBackendAdapterHandshakeRow[];
  backendAdapterNormalizedRowCount: number;
  backendAdapterExcludedRowCount: number;
  adapterPayloadFrozen: boolean;
  candidatePathLevelCount: number;
  serializedLength: number;
  summary: string;
};

export function encodeCanonicalLifecycleCircuitInput(
  lifecycleId: string | undefined,
): CanonicalLifecycleCircuitInput {
  const witnessPackage = assembleCanonicalLifecycleWitnessPackage(lifecycleId);
  const sections = createCircuitInputSections(witnessPackage);

  const encoding: CanonicalLifecycleCircuitInput = {
    kind: CANONICAL_CIRCUIT_INPUT_KIND_V1,
    version: 1,
    encodingScheme: CANONICAL_CIRCUIT_INPUT_ENCODING_SCHEME_V1,
    readiness: witnessPackage.readiness,
    sourceWitnessPackageKind: witnessPackage.kind,
    sourceWitnessPackageVersion: witnessPackage.version,
    lifecycleId: witnessPackage.lifecycleId,
    fieldOrder: sections.map((section) => section.name),
    sections,
    fieldGroupReadiness: evaluateCircuitInputFieldGroupReadiness(witnessPackage, sections),
    fieldMappingPrecheck: [],
    slotNormalization: [],
    fieldCandidates: [],
    fieldValuePreimages: [],
    fieldLanePlans: [],
    laneArityPlans: [],
    fieldEmissionSchedule: [],
    fieldConversionManifest: [],
    finiteFieldInputDrafts: [],
    draftCanonicalizations: [],
    modulusReadiness: [],
    reductionPlans: [],
    fieldElementDrafts: [],
    fieldElementAssemblies: [],
    witnessLayoutManifest: [],
    witnessRealizationPrecheck: [],
    witnessRealizationRecipes: [],
    witnessMaterializationManifest: [],
    backendBridgeContract: [],
    backendAdapterHandshake: {
      adapterId: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.adapterId,
      adapterLabel: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.label,
      contractKind: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.supportedContractKind,
      contractVersion: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.supportedContractVersion,
      contractSupported: true,
      accepted: true,
      acceptedRowCount: 0,
      blockedRowCount: 0,
      unsupportedActionKinds: [],
      unsupportedFamilyHints: [],
      rowResults: [],
      summary: "no bridge contract rows to validate",
    },
    backendAdapterNormalizedBundle: {
      adapterId: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.adapterId,
      adapterLabel: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.label,
      contractKind: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.supportedContractKind,
      contractVersion: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.supportedContractVersion,
      normalizedRows: [],
      excludedRows: [],
      acceptedRowCount: 0,
      excludedRowCount: 0,
      summary: "no adapter-normalized rows",
    },
    adapterPayloadFreeze: {
      kind: "vanta-adapter-payload-snapshot-v1",
      version: 1,
      adapterId: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.adapterId,
      adapterLabel: GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION.label,
      acceptedRowCount: 0,
      excludedRowCount: 0,
      serialized: "[]",
      summary: "no frozen adapter payload",
    },
    missingComponents: [...witnessPackage.missingComponents],
    serialized: "",
  };

  const fieldMappingPrecheck = evaluateCircuitInputFieldMappingPrecheck(encoding);
  const slotNormalization = evaluateCircuitInputSlotNormalization({
    sections: encoding.sections,
    fieldMappingPrecheck,
  });
  const fieldCandidates = evaluateCircuitInputFieldCandidates(slotNormalization);
  const fieldValuePreimages = evaluateCircuitInputFieldValuePreimages(fieldCandidates);
  const fieldLanePlans = evaluateCircuitInputFieldLanePlans(fieldValuePreimages);
  const laneArityPlans = evaluateCircuitInputLaneArityPlans(fieldLanePlans);
  const fieldEmissionSchedule = evaluateCircuitInputFieldEmissionSchedule(laneArityPlans);
  const fieldConversionManifest = evaluateCircuitInputFieldConversionManifest({
    fieldEmissionSchedule,
    fieldValuePreimages,
  });
  const finiteFieldInputDrafts = evaluateFiniteFieldInputDrafts(fieldConversionManifest);
  const draftCanonicalizations = evaluateDraftCanonicalizations(finiteFieldInputDrafts);
  const modulusReadiness = evaluateModulusReadiness(draftCanonicalizations);
  const reductionPlans = evaluateReductionPlans(modulusReadiness);
  const fieldElementDrafts = evaluateFieldElementDrafts(reductionPlans);
  const fieldElementAssemblies = evaluateFieldElementAssemblies(fieldElementDrafts);
  const witnessLayoutManifest = evaluateWitnessLayoutManifest(fieldElementAssemblies);
  const witnessRealizationPrecheck = evaluateWitnessRealizationPrecheck(witnessLayoutManifest);
  const witnessRealizationRecipes = evaluateWitnessRealizationRecipes(
    witnessRealizationPrecheck,
  );
  const witnessMaterializationManifest = evaluateWitnessMaterializationManifest(
    witnessRealizationRecipes,
  );
  const backendBridgeContract = evaluateBackendBridgeContract(witnessMaterializationManifest);
  const backendAdapterHandshake = evaluateBackendAdapterHandshake(
    backendBridgeContract,
    GENERIC_PHASE1_BACKEND_ADAPTER_DECLARATION,
  );
  const backendAdapterNormalizedBundle = evaluateBackendAdapterNormalizedBundle(
    backendBridgeContract,
    backendAdapterHandshake,
  );
  const adapterPayloadFreeze = freezeBackendAdapterNormalizedBundle(
    backendAdapterNormalizedBundle,
  );

  return {
    ...encoding,
    fieldMappingPrecheck,
    slotNormalization,
    fieldCandidates,
    fieldValuePreimages,
    fieldLanePlans,
    laneArityPlans,
    fieldEmissionSchedule,
    fieldConversionManifest,
    finiteFieldInputDrafts,
    draftCanonicalizations,
    modulusReadiness,
    reductionPlans,
    fieldElementDrafts,
    fieldElementAssemblies,
    witnessLayoutManifest,
    witnessRealizationPrecheck,
    witnessRealizationRecipes,
    witnessMaterializationManifest,
    backendBridgeContract,
    backendAdapterHandshake,
    backendAdapterNormalizedBundle,
    adapterPayloadFreeze,
    serialized: serializeCanonicalCircuitInput({
      ...encoding,
      fieldMappingPrecheck,
      slotNormalization,
      fieldCandidates,
      fieldValuePreimages,
      fieldLanePlans,
      laneArityPlans,
      fieldEmissionSchedule,
      fieldConversionManifest,
      finiteFieldInputDrafts,
      draftCanonicalizations,
      modulusReadiness,
      reductionPlans,
      fieldElementDrafts,
      fieldElementAssemblies,
      witnessLayoutManifest,
      witnessRealizationPrecheck,
      witnessRealizationRecipes,
      witnessMaterializationManifest,
      backendBridgeContract,
      backendAdapterHandshake,
      backendAdapterNormalizedBundle,
      adapterPayloadFreeze,
    }),
  };
}

export function getCanonicalLifecycleCircuitInputEncodingReadiness(
  lifecycleId: string | undefined,
): CanonicalCircuitInputEncodingReadiness {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).readiness;
}

export function inspectCanonicalLifecycleCircuitInputEncoding(
  lifecycleId: string | undefined,
): CanonicalLifecycleCircuitInputInspection {
  const encoding = encodeCanonicalLifecycleCircuitInput(lifecycleId);
  const candidatePathSection = encoding.sections.find((section) => section.name === "candidate-path");
  const candidatePathLevelCountEntry = candidatePathSection?.entries.find(
    (entry) => entry.key === "pathLevelCount",
  );
  const candidatePathLevelCount =
    candidatePathLevelCountEntry?.valueKind === "number" &&
    typeof candidatePathLevelCountEntry.value === "number"
      ? candidatePathLevelCountEntry.value
      : 0;

  return {
    encoding,
    sectionCount: encoding.sections.length,
    readySectionCount: encoding.fieldGroupReadiness.filter((group) => group.readiness === "ready").length,
    blockingSections: encoding.fieldGroupReadiness.filter((group) => group.readiness !== "ready"),
    precheckReadyCount: encoding.fieldMappingPrecheck.filter((entry) => !entry.blocked).length,
    precheckBlockedSections: encoding.fieldMappingPrecheck.filter((entry) => entry.blocked),
    normalizedSectionCount: encoding.slotNormalization.filter((entry) => entry.normalized).length,
    totalNormalizedSlotCount: encoding.slotNormalization.reduce(
      (sum, entry) => sum + entry.slotCount,
      0,
    ),
    blockedSlotSections: encoding.slotNormalization.filter((entry) => !entry.normalized),
    fieldCandidateCount: encoding.fieldCandidates.filter((entry) => !entry.blocked).length,
    blockedFieldCandidates: encoding.fieldCandidates.filter((entry) => entry.blocked),
    fieldValuePreimageCount: encoding.fieldValuePreimages.filter((entry) => entry.present).length,
    blockedFieldValuePreimages: encoding.fieldValuePreimages.filter((entry) => !entry.present),
    fieldLanePlanCount: encoding.fieldLanePlans.filter((entry) => entry.planned).length,
    blockedFieldLanePlans: encoding.fieldLanePlans.filter((entry) => !entry.planned),
    laneArityPlanCount: encoding.laneArityPlans.filter((entry) => entry.planned).length,
    blockedLaneArityPlans: encoding.laneArityPlans.filter((entry) => !entry.planned),
    totalExpectedFieldCount: encoding.laneArityPlans.reduce(
      (sum, entry) => sum + entry.expectedFieldCount,
      0,
    ),
    emittedFieldCount: encoding.fieldEmissionSchedule.length,
    manifestRowCount: encoding.fieldConversionManifest.filter((entry) => entry.resolved).length,
    blockedManifestRows: encoding.fieldConversionManifest.filter((entry) => !entry.resolved),
    finiteFieldDraftCount: encoding.finiteFieldInputDrafts.filter((entry) => entry.resolved).length,
    blockedFiniteFieldDrafts: encoding.finiteFieldInputDrafts.filter((entry) => !entry.resolved),
    canonicalizedDraftCount: encoding.draftCanonicalizations.filter((entry) => entry.canonicalized).length,
    blockedDraftCanonicalizations: encoding.draftCanonicalizations.filter(
      (entry) => !entry.canonicalized,
    ),
    directModulusReadyCount: encoding.modulusReadiness.filter((entry) => entry.readiness === "direct").length,
    blockedModulusReadiness: encoding.modulusReadiness.filter((entry) => entry.readiness === "blocked"),
    widthDependentModulusReadiness: encoding.modulusReadiness.filter(
      (entry) => entry.readiness === "backend-width-dependent",
    ),
    reductionPlanCount: encoding.reductionPlans.filter((entry) => entry.planned).length,
    blockedReductionPlans: encoding.reductionPlans.filter((entry) => !entry.planned),
    widthDependentReductionPlans: encoding.reductionPlans.filter(
      (entry) => entry.backendWidthDependent,
    ),
    fieldElementDraftCount: encoding.fieldElementDrafts.filter((entry) => entry.present).length,
    blockedFieldElementDrafts: encoding.fieldElementDrafts.filter((entry) => !entry.present),
    fieldElementAssemblyCount: encoding.fieldElementAssemblies.filter((entry) => entry.assembled).length,
    blockedFieldElementAssemblies: encoding.fieldElementAssemblies.filter((entry) => !entry.assembled),
    witnessLayoutCount: encoding.witnessLayoutManifest.filter((entry) => entry.laidOut).length,
    blockedWitnessLayouts: encoding.witnessLayoutManifest.filter((entry) => !entry.laidOut),
    realizableWitnessCount: encoding.witnessRealizationPrecheck.filter((entry) => entry.status === "realizable").length,
    splitDependentWitnesses: encoding.witnessRealizationPrecheck.filter(
      (entry) => entry.status === "split-dependent",
    ),
    widthDependentWitnesses: encoding.witnessRealizationPrecheck.filter(
      (entry) => entry.status === "width-dependent",
    ),
    blockedWitnessRealizationPrecheck: encoding.witnessRealizationPrecheck.filter(
      (entry) => entry.status === "blocked",
    ),
    witnessRealizationRecipeCount: encoding.witnessRealizationRecipes.filter(
      (entry) => entry.actionable,
    ).length,
    blockedWitnessRealizationRecipes: encoding.witnessRealizationRecipes.filter(
      (entry) => !entry.actionable,
    ),
    witnessMaterializationRowCount: encoding.witnessMaterializationManifest.filter(
      (entry) => entry.actionable,
    ).length,
    blockedWitnessMaterializationRows: encoding.witnessMaterializationManifest.filter(
      (entry) => !entry.actionable,
    ),
    backendBridgeContractCount: encoding.backendBridgeContract.filter((entry) => entry.actionable).length,
    blockedBackendBridgeContractRows: encoding.backendBridgeContract.filter(
      (entry) => !entry.actionable,
    ),
    backendAdapterAcceptedRowCount: encoding.backendAdapterHandshake.acceptedRowCount,
    blockedBackendAdapterRows: encoding.backendAdapterHandshake.rowResults.filter(
      (entry) => entry.status === "blocked",
    ),
    unsupportedBackendAdapterRows: encoding.backendAdapterHandshake.rowResults.filter(
      (entry) =>
        entry.status === "unsupported-action" ||
        entry.status === "unsupported-family" ||
        entry.status === "unsupported-contract",
    ),
    backendAdapterNormalizedRowCount: encoding.backendAdapterNormalizedBundle.acceptedRowCount,
    backendAdapterExcludedRowCount: encoding.backendAdapterNormalizedBundle.excludedRowCount,
    adapterPayloadFrozen: encoding.adapterPayloadFreeze.serialized.length > 0,
    candidatePathLevelCount,
    serializedLength: encoding.serialized.length,
    summary: createCircuitInputSummary(encoding),
  };
}

export function inspectCanonicalLifecycleCircuitInputFieldGroupReadiness(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldGroupReadiness[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldGroupReadiness;
}

export function inspectCanonicalCircuitInputFieldGroupReadiness(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldGroupReadiness[] {
  return encoding.fieldGroupReadiness;
}

export function inspectCanonicalLifecycleCircuitInputFieldMappingPrecheck(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldMappingPrecheckEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldMappingPrecheck;
}

export function inspectCanonicalCircuitInputFieldMappingPrecheck(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldMappingPrecheckEntry[] {
  return encoding.fieldMappingPrecheck;
}

export function inspectCanonicalLifecycleCircuitInputSlotNormalization(
  lifecycleId: string | undefined,
): CanonicalCircuitInputSlotNormalizationEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).slotNormalization;
}

export function inspectCanonicalCircuitInputSlotNormalization(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputSlotNormalizationEntry[] {
  return encoding.slotNormalization;
}

export function inspectCanonicalLifecycleCircuitInputFieldCandidates(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldCandidateEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldCandidates;
}

export function inspectCanonicalCircuitInputFieldCandidates(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldCandidateEntry[] {
  return encoding.fieldCandidates;
}

export function inspectCanonicalLifecycleCircuitInputFieldValuePreimages(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldValuePreimage[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldValuePreimages;
}

export function inspectCanonicalCircuitInputFieldValuePreimages(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldValuePreimage[] {
  return encoding.fieldValuePreimages;
}

export function inspectCanonicalLifecycleCircuitInputFieldLanePlans(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldLanePlanEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldLanePlans;
}

export function inspectCanonicalCircuitInputFieldLanePlans(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldLanePlanEntry[] {
  return encoding.fieldLanePlans;
}

export function inspectCanonicalLifecycleCircuitInputLaneArityPlans(
  lifecycleId: string | undefined,
): CanonicalCircuitInputLaneArityPlanEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).laneArityPlans;
}

export function inspectCanonicalCircuitInputLaneArityPlans(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputLaneArityPlanEntry[] {
  return encoding.laneArityPlans;
}

export function inspectCanonicalLifecycleCircuitInputFieldEmissionSchedule(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldEmissionScheduleEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldEmissionSchedule;
}

export function inspectCanonicalCircuitInputFieldEmissionSchedule(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldEmissionScheduleEntry[] {
  return encoding.fieldEmissionSchedule;
}

export function inspectCanonicalLifecycleCircuitInputFieldConversionManifest(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldConversionManifestRow[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldConversionManifest;
}

export function inspectCanonicalCircuitInputFieldConversionManifest(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldConversionManifestRow[] {
  return encoding.fieldConversionManifest;
}

export function inspectCanonicalLifecycleFiniteFieldInputDrafts(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFiniteFieldDraftEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).finiteFieldInputDrafts;
}

export function inspectCanonicalFiniteFieldInputDrafts(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFiniteFieldDraftEntry[] {
  return encoding.finiteFieldInputDrafts;
}

export function inspectCanonicalLifecycleDraftCanonicalizations(
  lifecycleId: string | undefined,
): CanonicalCircuitInputDraftCanonicalizationEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).draftCanonicalizations;
}

export function inspectCanonicalDraftCanonicalizations(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputDraftCanonicalizationEntry[] {
  return encoding.draftCanonicalizations;
}

export function inspectCanonicalLifecycleModulusReadiness(
  lifecycleId: string | undefined,
): CanonicalCircuitInputModulusReadinessEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).modulusReadiness;
}

export function inspectCanonicalModulusReadiness(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputModulusReadinessEntry[] {
  return encoding.modulusReadiness;
}

export function inspectCanonicalLifecycleReductionPlans(
  lifecycleId: string | undefined,
): CanonicalCircuitInputReductionPlanEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).reductionPlans;
}

export function inspectCanonicalReductionPlans(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputReductionPlanEntry[] {
  return encoding.reductionPlans;
}

export function inspectCanonicalLifecycleFieldElementDrafts(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldElementDraftEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldElementDrafts;
}

export function inspectCanonicalFieldElementDrafts(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldElementDraftEntry[] {
  return encoding.fieldElementDrafts;
}

export function inspectCanonicalLifecycleFieldElementAssemblies(
  lifecycleId: string | undefined,
): CanonicalCircuitInputFieldElementAssemblyEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).fieldElementAssemblies;
}

export function inspectCanonicalFieldElementAssemblies(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputFieldElementAssemblyEntry[] {
  return encoding.fieldElementAssemblies;
}

export function inspectCanonicalLifecycleWitnessLayoutManifest(
  lifecycleId: string | undefined,
): CanonicalCircuitInputWitnessLayoutEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).witnessLayoutManifest;
}

export function inspectCanonicalWitnessLayoutManifest(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputWitnessLayoutEntry[] {
  return encoding.witnessLayoutManifest;
}

export function inspectCanonicalLifecycleWitnessRealizationPrecheck(
  lifecycleId: string | undefined,
): CanonicalCircuitInputWitnessRealizationPrecheckEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).witnessRealizationPrecheck;
}

export function inspectCanonicalWitnessRealizationPrecheck(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputWitnessRealizationPrecheckEntry[] {
  return encoding.witnessRealizationPrecheck;
}

export function inspectCanonicalLifecycleWitnessRealizationRecipes(
  lifecycleId: string | undefined,
): CanonicalCircuitInputWitnessRealizationRecipeEntry[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).witnessRealizationRecipes;
}

export function inspectCanonicalWitnessRealizationRecipes(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputWitnessRealizationRecipeEntry[] {
  return encoding.witnessRealizationRecipes;
}

export function inspectCanonicalLifecycleWitnessMaterializationManifest(
  lifecycleId: string | undefined,
): CanonicalCircuitInputWitnessMaterializationManifestRow[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).witnessMaterializationManifest;
}

export function inspectCanonicalWitnessMaterializationManifest(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputWitnessMaterializationManifestRow[] {
  return encoding.witnessMaterializationManifest;
}

export function inspectCanonicalLifecycleBackendBridgeContract(
  lifecycleId: string | undefined,
): CanonicalCircuitInputBackendBridgeContractRow[] {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).backendBridgeContract;
}

export function inspectCanonicalBackendBridgeContract(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputBackendBridgeContractRow[] {
  return encoding.backendBridgeContract;
}

export function inspectCanonicalLifecycleBackendAdapterHandshake(
  lifecycleId: string | undefined,
): CanonicalCircuitInputBackendAdapterHandshakeResult {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).backendAdapterHandshake;
}

export function inspectCanonicalBackendAdapterHandshake(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputBackendAdapterHandshakeResult {
  return encoding.backendAdapterHandshake;
}

export function inspectCanonicalLifecycleBackendAdapterNormalizedBundle(
  lifecycleId: string | undefined,
): CanonicalCircuitInputBackendAdapterNormalizedBundle {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).backendAdapterNormalizedBundle;
}

export function inspectCanonicalBackendAdapterNormalizedBundle(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputBackendAdapterNormalizedBundle {
  return encoding.backendAdapterNormalizedBundle;
}

export function inspectCanonicalLifecycleAdapterPayloadFreeze(
  lifecycleId: string | undefined,
): CanonicalCircuitInputAdapterPayloadFreeze {
  return encodeCanonicalLifecycleCircuitInput(lifecycleId).adapterPayloadFreeze;
}

export function inspectCanonicalAdapterPayloadFreeze(
  encoding: CanonicalLifecycleCircuitInput,
): CanonicalCircuitInputAdapterPayloadFreeze {
  return encoding.adapterPayloadFreeze;
}

function createCircuitInputSections(
  witnessPackage: CanonicalLifecycleWitnessPackage,
): CanonicalCircuitInputSection[] {
  const candidatePath = witnessPackage.candidateMerklePath;

  return [
    {
      name: "identity",
      entries: [
        createStringEntry("lifecycleId", witnessPackage.lifecycleId),
        createStringEntry("lineageId", witnessPackage.lineageId),
        createStringEntry("sourceKind", witnessPackage.sourceKind),
        createStringEntry("sourceRecordId", witnessPackage.sourceRecordId),
        createStringEntry("predecessorLifecycleId", witnessPackage.predecessorLifecycleId),
      ],
    },
    {
      name: "spend",
      entries: [
        createStringEntry("spendStatus", witnessPackage.spendStatus),
        createStringEntry("spendCapability", witnessPackage.spendCapability),
        createBooleanEntry("nullifierReady", witnessPackage.nullifierReady),
      ],
    },
    {
      name: "consumption",
      entries: [
        createStringEntry("consumptionId", witnessPackage.canonicalConsumption?.consumptionId),
        createStringEntry("consumptionKind", witnessPackage.canonicalConsumption?.consumptionKind),
        createStringEntry(
          "consumptionRecordLifecycleId",
          witnessPackage.canonicalConsumption?.recordLifecycleId,
        ),
        createStringEntry(
          "consumptionBasis",
          witnessPackage.canonicalConsumption?.consumptionBasis,
        ),
        createStringEntry("nullifierStub", witnessPackage.canonicalConsumption?.nullifierStub),
        createStringEntry(
          "consumedNullifierBasis",
          witnessPackage.canonicalConsumption?.consumedNullifierBasis,
        ),
        createStringArrayEntry(
          "producedLifecycleIds",
          witnessPackage.canonicalConsumption?.producedLifecycleIds ?? [],
          Boolean(witnessPackage.canonicalConsumption),
        ),
        createStringEntry("exitLifecycleId", witnessPackage.canonicalConsumption?.exitLifecycleId),
      ],
    },
    {
      name: "membership",
      entries: [
        createStringEntry("membershipReadiness", witnessPackage.membership.readiness),
        createStringEntry("commitment", witnessPackage.membership.commitment),
        createNumberEntry("insertionIndex", witnessPackage.membership.insertionIndex),
        createStringEntry("snapshotRoot", witnessPackage.membership.snapshotRoot),
        createNumberEntry("snapshotLeafCount", witnessPackage.membership.snapshotLeafCount),
      ],
    },
    {
      name: "future-root-seam",
      entries: [
        createStringEntry("futureRootScheme", witnessPackage.futureRootSeam?.scheme),
        createStringEntry("futureRootValue", witnessPackage.futureRootSeam?.value),
        createStringEntry("futureRootSnapshotRoot", witnessPackage.futureRootSeam?.snapshotRoot),
        createNumberEntry(
          "futureRootSnapshotLeafCount",
          witnessPackage.futureRootSeam?.snapshotLeafCount,
        ),
      ],
    },
    {
      name: "candidate-path",
      entries: [
        createStringEntry("candidatePathKind", candidatePath?.kind),
        createStringEntry("candidatePathScheme", candidatePath?.scheme),
        createNumberEntry("leafIndex", candidatePath?.leafIndex),
        createStringEntry("leafCommitment", candidatePath?.leafCommitment),
        createStringEntry("leafDigest", candidatePath?.leafDigest),
        createNumberEntry("leafCount", candidatePath?.leafCount),
        createNumberEntry("depth", candidatePath?.depth),
        createStringEntry("candidateRoot", candidatePath?.candidateRoot),
        createStringEntry("snapshotRoot", candidatePath?.snapshotRoot),
        createStringEntry("childOrdering", candidatePath?.childOrdering),
        createStringEntry("oddLeafBehavior", candidatePath?.oddLeafBehavior),
        createNumberEntry("pathLevelCount", candidatePath?.path.length),
        createStringArrayEntry(
          "pathLevelTuples",
          candidatePath?.path.map(
            (level) =>
              [
                level.level,
                level.siblingPosition,
                level.siblingDigest,
                level.siblingSource,
                level.parentDigest,
              ].join(":"),
          ) ?? [],
          Boolean(candidatePath),
        ),
      ],
    },
    {
      name: "candidate-agreement",
      entries: [
        createStringEntry("candidateAgreementStatus", witnessPackage.candidateAgreementStatus),
        createBooleanEntry("candidateAgreementReady", witnessPackage.candidateAgreementReady),
      ],
    },
  ];
}

function createCircuitInputSummary(encoding: CanonicalLifecycleCircuitInput): string {
  if (encoding.readiness === "ready") {
    return `${encoding.sections.length} ordered sections encoded · ${encoding.fieldEmissionSchedule.length} scheduled fields`;
  }

  if (encoding.readiness === "legacy") {
    return "legacy witness package cannot encode as candidate circuit input";
  }

  if (encoding.readiness === "unavailable") {
    return "witness package substrate unavailable for encoding";
  }

  const blockingSections = encoding.fieldGroupReadiness
    .filter((group) => group.readiness !== "ready")
    .map((group) => group.sectionName);

  return blockingSections.length > 0
    ? `blocking groups: ${blockingSections.join(", ")}`
    : createFieldMappingPrecheckSummary(encoding);
}

function serializeCanonicalCircuitInput(encoding: CanonicalLifecycleCircuitInput): string {
  const tuples = [
    ["kind", encoding.kind],
    ["version", encoding.version],
    ["encodingScheme", encoding.encodingScheme],
    ["readiness", encoding.readiness],
    ["sourceWitnessPackageKind", encoding.sourceWitnessPackageKind],
    ["sourceWitnessPackageVersion", encoding.sourceWitnessPackageVersion],
    ["lifecycleId", encoding.lifecycleId ?? ""],
    ["fieldOrder", [...encoding.fieldOrder]],
    [
      "sections",
      encoding.sections.map((section) => [
        section.name,
        section.entries.map((entry) => [
          entry.key,
          entry.valueKind,
          entry.present,
          normalizeScalarForSerialization(entry.value),
        ]),
      ]),
    ],
    [
      "fieldGroupReadiness",
      encoding.fieldGroupReadiness.map((group) => [
        group.sectionName,
        group.readiness,
        [...group.missingItems],
        group.summary,
      ]),
    ],
    [
      "fieldMappingPrecheck",
      encoding.fieldMappingPrecheck.map((entry) => [
        entry.sectionName,
        entry.readiness,
        entry.bucket,
        entry.fieldSlotCount,
        entry.blocked,
        entry.summary,
      ]),
    ],
    [
      "slotNormalization",
      encoding.slotNormalization.map((entry) => [
        entry.sectionName,
        entry.bucket,
        entry.readiness,
        entry.normalized,
        entry.slotCount,
        entry.blockedReason ?? "",
        entry.slots.map((slot) => [
          slot.sectionName,
          slot.bucket,
          slot.slotIndex,
          slot.slotKind,
          slot.slotLabel,
          slot.sourceKey,
          slot.valueKind,
          slot.valueSummary,
        ]),
      ]),
    ],
    [
      "fieldCandidates",
      encoding.fieldCandidates.map((entry) => [
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.sourceKey,
        entry.family,
        entry.blocked,
        entry.summary,
      ]),
    ],
    [
      "fieldValuePreimages",
      encoding.fieldValuePreimages.map((entry) => [
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.kind,
        entry.version,
        entry.present,
        entry.payloadKind ?? "",
        entry.payloadSummary,
        [...entry.payload],
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "fieldLanePlans",
      encoding.fieldLanePlans.map((entry) => [
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.laneShape,
        entry.planned,
        entry.laneCount,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "laneArityPlans",
      encoding.laneArityPlans.map((entry) => [
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.laneShape,
        entry.arityKind,
        entry.planned,
        entry.expectedFieldCount,
        entry.limbCount ?? 0,
        entry.byteChunkCount ?? 0,
        entry.vectorElementCount ?? 0,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "fieldEmissionSchedule",
      encoding.fieldEmissionSchedule.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.laneShape,
        entry.arityKind,
        entry.laneEmissionIndex,
        entry.emittedFieldRole,
        entry.emittedFieldLabel,
      ]),
    ],
    [
      "fieldConversionManifest",
      encoding.fieldConversionManifest.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.laneShape,
        entry.arityKind,
        entry.laneEmissionIndex,
        entry.emittedFieldRole,
        entry.emittedFieldLabel,
        entry.preimageKind,
        entry.preimageVersion,
        entry.preimagePayloadKind ?? "",
        entry.preimagePayloadSummary,
        entry.conversionRecipe,
        entry.resolved,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "finiteFieldInputDrafts",
      encoding.finiteFieldInputDrafts.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.family,
        entry.conversionRecipe,
        entry.draftFamily,
        entry.draftKind,
        entry.version,
        entry.resolved,
        entry.payloadSummary,
        [...entry.payload],
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "draftCanonicalizations",
      encoding.draftCanonicalizations.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.draftFamily,
        entry.canonicalizationFamily,
        entry.kind,
        entry.version,
        entry.canonicalized,
        entry.payloadSummary,
        [...entry.payload],
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "modulusReadiness",
      encoding.modulusReadiness.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.canonicalizationFamily,
        entry.readiness,
        entry.kind,
        entry.version,
        entry.ready,
        entry.needsChunkSplitting,
        entry.backendWidthDependent,
        entry.payloadCount,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "reductionPlans",
      encoding.reductionPlans.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.canonicalizationFamily,
        entry.modulusReadiness,
        entry.action,
        entry.kind,
        entry.version,
        entry.planned,
        entry.needsChunkSplitting,
        entry.backendWidthDependent,
        entry.expectedSplitUnits ?? 0,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "fieldElementDrafts",
      encoding.fieldElementDrafts.map((entry) => [
        entry.emissionIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.reductionAction,
        entry.draftKind,
        entry.candidateIndex,
        entry.kind,
        entry.version,
        entry.present,
        entry.directReducible,
        entry.splitDerived,
        entry.widthDependent,
        entry.payloadSummary,
        [...entry.payload],
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "fieldElementAssemblies",
      encoding.fieldElementAssemblies.map((entry) => [
        entry.assemblyIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.assemblyKind,
        entry.laneIndex,
        entry.memberDraftRows.map((member) => [
          member.emissionIndex,
          member.candidateIndex,
          member.draftKind,
          member.reductionAction,
        ]),
        entry.memberCount,
        entry.assembled,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "witnessLayoutManifest",
      encoding.witnessLayoutManifest.map((entry) => [
        entry.witnessIndex,
        entry.assemblyIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.assemblyKind,
        entry.laneIndex,
        entry.memberIndex,
        [
          entry.memberDraftRow.emissionIndex,
          entry.memberDraftRow.candidateIndex,
          entry.memberDraftRow.draftKind,
          entry.memberDraftRow.reductionAction,
        ],
        entry.laidOut,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "witnessRealizationPrecheck",
      encoding.witnessRealizationPrecheck.map((entry) => [
        entry.witnessIndex,
        entry.assemblyIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.assemblyKind,
        entry.draftKind,
        entry.reductionAction,
        entry.status,
        entry.kind,
        entry.version,
        entry.ready,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "witnessRealizationRecipes",
      encoding.witnessRealizationRecipes.map((entry) => [
        entry.witnessIndex,
        entry.assemblyIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.assemblyKind,
        entry.status,
        entry.action,
        entry.kind,
        entry.version,
        entry.actionable,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "witnessMaterializationManifest",
      encoding.witnessMaterializationManifest.map((entry) => [
        entry.materializationIndex,
        entry.witnessIndex,
        entry.assemblyIndex,
        entry.sectionName,
        entry.slotIndex,
        entry.slotLabel,
        entry.assemblyKind,
        entry.action,
        entry.kind,
        entry.version,
        entry.actionable,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "backendBridgeContract",
      encoding.backendBridgeContract.map((entry) => [
        entry.materializationIndex,
        entry.witnessIndex,
        entry.action,
        entry.sectionName,
        entry.slotLabel,
        entry.assemblyKind,
        entry.actionable,
        entry.contractKind,
        entry.contractVersion,
        entry.familyHint,
        entry.summary,
        entry.blockedReason ?? "",
      ]),
    ],
    [
      "backendAdapterHandshake",
      [
        encoding.backendAdapterHandshake.adapterId,
        encoding.backendAdapterHandshake.adapterLabel,
        encoding.backendAdapterHandshake.contractKind,
        encoding.backendAdapterHandshake.contractVersion,
        encoding.backendAdapterHandshake.contractSupported,
        encoding.backendAdapterHandshake.accepted,
        encoding.backendAdapterHandshake.acceptedRowCount,
        encoding.backendAdapterHandshake.blockedRowCount,
        [...encoding.backendAdapterHandshake.unsupportedActionKinds],
        [...encoding.backendAdapterHandshake.unsupportedFamilyHints],
        encoding.backendAdapterHandshake.rowResults.map((entry) => [
          entry.materializationIndex,
          entry.witnessIndex,
          entry.action,
          entry.familyHint,
          entry.actionable,
          entry.status,
          entry.summary,
          entry.blockedReason ?? "",
        ]),
        encoding.backendAdapterHandshake.summary,
      ],
    ],
    [
      "backendAdapterNormalizedBundle",
      [
        encoding.backendAdapterNormalizedBundle.adapterId,
        encoding.backendAdapterNormalizedBundle.adapterLabel,
        encoding.backendAdapterNormalizedBundle.contractKind,
        encoding.backendAdapterNormalizedBundle.contractVersion,
        encoding.backendAdapterNormalizedBundle.normalizedRows.map((entry) => [
          entry.materializationIndex,
          entry.witnessIndex,
          entry.action,
          entry.familyHint,
          entry.sectionName,
          entry.slotLabel,
          entry.actionable,
          entry.payloadHint,
          entry.summary,
        ]),
        encoding.backendAdapterNormalizedBundle.excludedRows.map((entry) => [
          entry.materializationIndex,
          entry.witnessIndex,
          entry.action,
          entry.familyHint,
          entry.actionable,
          entry.status,
          entry.summary,
          entry.blockedReason ?? "",
        ]),
        encoding.backendAdapterNormalizedBundle.acceptedRowCount,
        encoding.backendAdapterNormalizedBundle.excludedRowCount,
        encoding.backendAdapterNormalizedBundle.summary,
      ],
    ],
    [
      "adapterPayloadFreeze",
      [
        encoding.adapterPayloadFreeze.kind,
        encoding.adapterPayloadFreeze.version,
        encoding.adapterPayloadFreeze.adapterId,
        encoding.adapterPayloadFreeze.adapterLabel,
        encoding.adapterPayloadFreeze.acceptedRowCount,
        encoding.adapterPayloadFreeze.excludedRowCount,
        encoding.adapterPayloadFreeze.serialized,
        encoding.adapterPayloadFreeze.summary,
      ],
    ],
    ["missingComponents", [...encoding.missingComponents]],
  ] as const;

  return JSON.stringify(tuples);
}

function normalizeScalarForSerialization(value: CanonicalCircuitInputScalar): CanonicalCircuitInputScalar {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
}

function createStringEntry(key: string, value: string | undefined): CanonicalCircuitInputEntry {
  return {
    key,
    valueKind: "string",
    present: Boolean(value),
    value: value ?? "",
  };
}

function createNumberEntry(key: string, value: number | undefined): CanonicalCircuitInputEntry {
  return {
    key,
    valueKind: "number",
    present: value !== undefined,
    value: value ?? 0,
  };
}

function createBooleanEntry(key: string, value: boolean): CanonicalCircuitInputEntry {
  return {
    key,
    valueKind: "boolean",
    present: true,
    value,
  };
}

function createStringArrayEntry(
  key: string,
  value: readonly string[],
  present: boolean,
): CanonicalCircuitInputEntry {
  return {
    key,
    valueKind: "string[]",
    present,
    value: [...value],
  };
}

function evaluateCircuitInputFieldGroupReadiness(
  witnessPackage: CanonicalLifecycleWitnessPackage,
  sections: CanonicalCircuitInputSection[],
): CanonicalCircuitInputFieldGroupReadiness[] {
  const sectionMap = new Map(sections.map((section) => [section.name, section]));

  return [
    createFieldGroupReadiness(
      "identity",
      witnessPackage.readiness,
      sectionMap.get("identity"),
      ["lifecycleId", "lineageId", "sourceKind", "sourceRecordId"],
    ),
    createFieldGroupReadiness(
      "spend",
      witnessPackage.readiness,
      sectionMap.get("spend"),
      ["spendStatus", "spendCapability", "nullifierReady"],
    ),
    createFieldGroupReadiness(
      "consumption",
      witnessPackage.readiness,
      sectionMap.get("consumption"),
      witnessPackage.canonicalConsumption
        ? ["consumptionId", "consumptionKind", "consumptionRecordLifecycleId", "consumptionBasis", "nullifierStub", "consumedNullifierBasis", "producedLifecycleIds"]
        : [],
    ),
    createFieldGroupReadiness(
      "membership",
      witnessPackage.readiness,
      sectionMap.get("membership"),
      ["membershipReadiness", "commitment", "insertionIndex", "snapshotRoot", "snapshotLeafCount"],
    ),
    createFieldGroupReadiness(
      "future-root-seam",
      witnessPackage.readiness,
      sectionMap.get("future-root-seam"),
      ["futureRootScheme", "futureRootValue", "futureRootSnapshotRoot", "futureRootSnapshotLeafCount"],
    ),
    createFieldGroupReadiness(
      "candidate-path",
      witnessPackage.readiness,
      sectionMap.get("candidate-path"),
      ["candidatePathKind", "candidatePathScheme", "leafIndex", "leafCommitment", "leafDigest", "leafCount", "depth", "candidateRoot", "childOrdering", "oddLeafBehavior", "pathLevelCount", "pathLevelTuples"],
    ),
    createFieldGroupReadiness(
      "candidate-agreement",
      witnessPackage.readiness,
      sectionMap.get("candidate-agreement"),
      ["candidateAgreementStatus", "candidateAgreementReady"],
    ),
  ];
}

function createFieldGroupReadiness(
  sectionName: CanonicalCircuitInputSection["name"],
  overallReadiness: CanonicalLifecycleWitnessPackageReadiness,
  section: CanonicalCircuitInputSection | undefined,
  requiredKeys: string[],
): CanonicalCircuitInputFieldGroupReadiness {
  if (overallReadiness === "legacy") {
    return {
      sectionName,
      readiness: "legacy",
      missingItems: requiredKeys,
      summary: "legacy witness substrate",
    };
  }

  if (overallReadiness === "unavailable" || !section) {
    return {
      sectionName,
      readiness: "unavailable",
      missingItems: requiredKeys,
      summary: "section substrate unavailable",
    };
  }

  if (requiredKeys.length === 0) {
    return {
      sectionName,
      readiness: "ready",
      missingItems: [],
      summary: "no retained inputs required",
    };
  }

  const missingItems = requiredKeys.filter((key) => {
    const entry = section.entries.find((candidate) => candidate.key === key);
    return !entry?.present;
  });

  if (missingItems.length === 0) {
    return {
      sectionName,
      readiness: "ready",
      missingItems,
      summary: "section encodable",
    };
  }

  if (missingItems.length === requiredKeys.length) {
    return {
      sectionName,
      readiness: "unavailable",
      missingItems,
      summary: `missing ${missingItems.join(", ")}`,
    };
  }

  return {
    sectionName,
    readiness: "partial",
    missingItems,
    summary: `missing ${missingItems.join(", ")}`,
  };
}

function evaluateCircuitInputFieldMappingPrecheck(
  encoding: Pick<
    CanonicalLifecycleCircuitInput,
    "sections" | "fieldGroupReadiness"
  >,
): CanonicalCircuitInputFieldMappingPrecheckEntry[] {
  return encoding.fieldGroupReadiness.map((group) => {
    const section = encoding.sections.find((candidate) => candidate.name === group.sectionName);
    const fieldSlotCount = section?.entries.length ?? 0;

    if (group.readiness !== "ready") {
      return {
        sectionName: group.sectionName,
        readiness: group.readiness,
        bucket: "blocked",
        fieldSlotCount,
        blocked: true,
        summary: `blocked by ${group.readiness} readiness`,
      };
    }

    const bucket = classifyFieldShapeBucket(group.sectionName);

    return {
      sectionName: group.sectionName,
      readiness: group.readiness,
      bucket,
      fieldSlotCount,
      blocked: false,
      summary: `${bucket} bucket across ${fieldSlotCount} field slots`,
    };
  });
}

function classifyFieldShapeBucket(
  sectionName: CanonicalCircuitInputSection["name"],
): Exclude<CanonicalCircuitInputFieldShapeBucket, "blocked"> {
  switch (sectionName) {
    case "identity":
    case "spend":
      return "scalar";
    case "membership":
    case "future-root-seam":
    case "candidate-agreement":
      return "digest";
    case "candidate-path":
      return "path-vector";
    case "consumption":
      return "mixed";
  }
}

function createFieldMappingPrecheckSummary(encoding: CanonicalLifecycleCircuitInput): string {
  const readyEntries = encoding.fieldMappingPrecheck.filter((entry) => !entry.blocked);
  const blockedEntries = encoding.fieldMappingPrecheck.filter((entry) => entry.blocked);

  if (blockedEntries.length === 0) {
    return readyEntries.map((entry) => `${entry.sectionName}:${entry.bucket}`).join(" · ");
  }

  return blockedEntries.map((entry) => `${entry.sectionName}:${entry.readiness}`).join(" · ");
}

function evaluateCircuitInputSlotNormalization(
  encoding: Pick<CanonicalLifecycleCircuitInput, "sections" | "fieldMappingPrecheck">,
): CanonicalCircuitInputSlotNormalizationEntry[] {
  return encoding.fieldMappingPrecheck.map((precheck) => {
    const section = encoding.sections.find((candidate) => candidate.name === precheck.sectionName);

    if (precheck.blocked || !section || precheck.bucket === "blocked") {
      return {
        sectionName: precheck.sectionName,
        bucket: precheck.bucket,
        readiness: precheck.readiness,
        normalized: false,
        slotCount: 0,
        blockedReason: precheck.summary,
        slots: [],
      };
    }

    if (precheck.bucket === "mixed") {
      return {
        sectionName: precheck.sectionName,
        bucket: precheck.bucket,
        readiness: precheck.readiness,
        normalized: false,
        slotCount: 0,
        blockedReason: "mixed bucket remains backend-neutral but not slot-ready",
        slots: [],
      };
    }

    const slots = normalizeSectionSlots(section, precheck.bucket);

    return {
      sectionName: precheck.sectionName,
      bucket: precheck.bucket,
      readiness: precheck.readiness,
      normalized: true,
      slotCount: slots.length,
      slots,
    };
  });
}

function evaluateCircuitInputFieldCandidates(
  slotNormalization: CanonicalCircuitInputSlotNormalizationEntry[],
): CanonicalCircuitInputFieldCandidateEntry[] {
  const candidates: CanonicalCircuitInputFieldCandidateEntry[] = [];

  for (const entry of slotNormalization) {
    if (!entry.normalized) {
      candidates.push(
        {
          sectionName: entry.sectionName,
          slotIndex: -1,
          slotLabel: `${entry.sectionName}:blocked`,
          sourceKey: entry.sectionName,
          family: "blocked",
          blocked: true,
          summary: entry.blockedReason ?? "slot normalization blocked",
        },
      );
      continue;
    }

    for (const slot of entry.slots) {
      const family = classifyFieldCandidateFamily(slot);

      candidates.push({
        sectionName: slot.sectionName,
        slotIndex: slot.slotIndex,
        slotLabel: slot.slotLabel,
        sourceKey: slot.sourceKey,
        family,
        blocked: false,
        summary: `${family} from ${slot.bucket}/${slot.slotKind}`,
      });
    }
  }

  return candidates;
}

function classifyFieldCandidateFamily(
  slot: CanonicalCircuitInputNormalizedSlot,
): Exclude<CanonicalCircuitInputFieldCandidateFamily, "blocked"> {
  if (slot.valueKind === "boolean") {
    return "boolean-flag";
  }

  if (slot.valueKind === "number") {
    return "integer-scalar";
  }

  if (
    slot.sourceKey === "spendStatus" ||
    slot.sourceKey === "spendCapability" ||
    slot.sourceKey === "membershipReadiness" ||
    slot.sourceKey === "candidateAgreementStatus" ||
    slot.sourceKey === "sourceKind" ||
    slot.sourceKey === "childOrdering" ||
    slot.sourceKey === "oddLeafBehavior"
  ) {
    return "enum-scalar";
  }

  if (slot.bucket === "path-vector") {
    return "path-node-digest";
  }

  if (
    slot.bucket === "digest" ||
    slot.sourceKey.includes("Root") ||
    slot.sourceKey.includes("commitment") ||
    slot.sourceKey.includes("Digest") ||
    slot.sourceKey.includes("nullifier") ||
    slot.sourceKey.includes("Basis")
  ) {
    return "digest-hex";
  }

  return "text-scalar";
}

function evaluateCircuitInputFieldValuePreimages(
  fieldCandidates: CanonicalCircuitInputFieldCandidateEntry[],
): CanonicalCircuitInputFieldValuePreimage[] {
  return fieldCandidates.map((candidate) => {
    if (candidate.blocked || candidate.family === "blocked") {
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: false,
        payloadSummary: "blocked field candidate",
        payload: [],
        blockedReason: candidate.summary,
      };
    }

    return createFieldValuePreimage(candidate);
  });
}

function createFieldValuePreimage(
  candidate: CanonicalCircuitInputFieldCandidateEntry,
): CanonicalCircuitInputFieldValuePreimage {
  switch (candidate.family) {
    case "text-scalar":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "utf8-text",
        payloadSummary: `utf8 text preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey],
      };
    case "integer-scalar":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "integer-decimal",
        payloadSummary: `decimal integer preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey],
      };
    case "digest-hex":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "hex-digest",
        payloadSummary: `hex digest preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey],
      };
    case "path-node-digest":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "path-node-digest",
        payloadSummary: `path-node digest preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey, String(candidate.slotIndex)],
      };
    case "boolean-flag":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "boolean-token",
        payloadSummary: `boolean token preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey],
      };
    case "enum-scalar":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: true,
        payloadKind: "enum-token",
        payloadSummary: `enum token preimage for ${candidate.slotLabel}`,
        payload: [candidate.slotLabel, candidate.sourceKey],
      };
    case "blocked":
      return {
        sectionName: candidate.sectionName,
        slotIndex: candidate.slotIndex,
        slotLabel: candidate.slotLabel,
        family: candidate.family,
        kind: "vanta-canonical-field-value-preimage-v1",
        version: 1,
        present: false,
        payloadSummary: "blocked field candidate",
        payload: [],
        blockedReason: candidate.summary,
      };
  }
}

function evaluateCircuitInputFieldLanePlans(
  fieldValuePreimages: CanonicalCircuitInputFieldValuePreimage[],
): CanonicalCircuitInputFieldLanePlanEntry[] {
  return fieldValuePreimages.map((preimage) => {
    if (!preimage.present || !preimage.payloadKind) {
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "blocked",
        planned: false,
        laneCount: 0,
        summary: "preimage not present for lane planning",
        blockedReason: preimage.blockedReason ?? preimage.payloadSummary,
      };
    }

    return createFieldLanePlan(preimage);
  });
}

function createFieldLanePlan(
  preimage: CanonicalCircuitInputFieldValuePreimage,
): CanonicalCircuitInputFieldLanePlanEntry {
  switch (preimage.payloadKind) {
    case "utf8-text":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "packed-bytes",
        planned: true,
        laneCount: 1,
        summary: `packed-bytes lane for ${preimage.slotLabel}`,
      };
    case "integer-decimal":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "single-field",
        planned: true,
        laneCount: 1,
        summary: `single-field lane for ${preimage.slotLabel}`,
      };
    case "hex-digest":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "digest-limb-sequence",
        planned: true,
        laneCount: 1,
        summary: `digest-limb-sequence lane for ${preimage.slotLabel}`,
      };
    case "path-node-digest":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "path-vector-lane",
        planned: true,
        laneCount: 1,
        summary: `path-vector lane for ${preimage.slotLabel}`,
      };
    case "boolean-token":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "boolean-lane",
        planned: true,
        laneCount: 1,
        summary: `boolean lane for ${preimage.slotLabel}`,
      };
    case "enum-token":
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "enum-lane",
        planned: true,
        laneCount: 1,
        summary: `enum lane for ${preimage.slotLabel}`,
      };
    default:
      return {
        sectionName: preimage.sectionName,
        slotIndex: preimage.slotIndex,
        slotLabel: preimage.slotLabel,
        family: preimage.family,
        laneShape: "blocked",
        planned: false,
        laneCount: 0,
        summary: "preimage payload kind not lane-plannable",
        blockedReason: preimage.payloadSummary,
      };
  }
}

function evaluateCircuitInputLaneArityPlans(
  fieldLanePlans: CanonicalCircuitInputFieldLanePlanEntry[],
): CanonicalCircuitInputLaneArityPlanEntry[] {
  return fieldLanePlans.map((plan) => {
    if (!plan.planned || plan.laneShape === "blocked") {
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "blocked",
        planned: false,
        expectedFieldCount: 0,
        summary: "lane not planned for arity expansion",
        blockedReason: plan.blockedReason ?? plan.summary,
      };
    }

    return createLaneArityPlan(plan);
  });
}

function createLaneArityPlan(
  plan: CanonicalCircuitInputFieldLanePlanEntry,
): CanonicalCircuitInputLaneArityPlanEntry {
  switch (plan.laneShape) {
    case "single-field":
    case "boolean-lane":
    case "enum-lane":
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "single",
        planned: true,
        expectedFieldCount: 1,
        summary: `single output field planned for ${plan.slotLabel}`,
      };
    case "digest-limb-sequence":
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "multi-limb",
        planned: true,
        expectedFieldCount: 4,
        limbCount: 4,
        summary: `multi-limb digest expansion planned for ${plan.slotLabel}`,
      };
    case "packed-bytes":
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "packed-bytes",
        planned: true,
        expectedFieldCount: 1,
        byteChunkCount: 1,
        summary: `packed-bytes expansion planned for ${plan.slotLabel}`,
      };
    case "path-vector-lane":
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "vector-expansion",
        planned: true,
        expectedFieldCount: 1,
        vectorElementCount: 1,
        summary: `vector expansion planned for ${plan.slotLabel}`,
      };
    case "blocked":
      return {
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: "blocked",
        planned: false,
        expectedFieldCount: 0,
        summary: "lane not planned for arity expansion",
        blockedReason: plan.blockedReason ?? plan.summary,
      };
  }
}

function evaluateCircuitInputFieldEmissionSchedule(
  laneArityPlans: CanonicalCircuitInputLaneArityPlanEntry[],
): CanonicalCircuitInputFieldEmissionScheduleEntry[] {
  const schedule: CanonicalCircuitInputFieldEmissionScheduleEntry[] = [];
  let emissionIndex = 0;

  for (const plan of laneArityPlans) {
    if (!plan.planned || plan.expectedFieldCount <= 0) {
      continue;
    }

    for (let laneEmissionIndex = 0; laneEmissionIndex < plan.expectedFieldCount; laneEmissionIndex += 1) {
      const emittedFieldRole = getEmissionFieldRole(plan.arityKind);

      schedule.push({
        emissionIndex: emissionIndex++,
        sectionName: plan.sectionName,
        slotIndex: plan.slotIndex,
        slotLabel: plan.slotLabel,
        family: plan.family,
        laneShape: plan.laneShape,
        arityKind: plan.arityKind,
        laneEmissionIndex,
        emittedFieldRole,
        emittedFieldLabel: `${plan.slotLabel}:${emittedFieldRole}:${laneEmissionIndex}`,
      });
    }
  }

  return schedule;
}

function evaluateCircuitInputFieldConversionManifest(
  encoding: Pick<
    CanonicalLifecycleCircuitInput,
    "fieldEmissionSchedule" | "fieldValuePreimages"
  >,
): CanonicalCircuitInputFieldConversionManifestRow[] {
  const preimageBySlot = new Map(
    encoding.fieldValuePreimages.map((entry) => [getFieldConversionSlotKey(entry), entry] as const),
  );

  return encoding.fieldEmissionSchedule.map((entry) => {
    const preimage = preimageBySlot.get(getFieldConversionSlotKey(entry));

    if (!preimage || !preimage.present || !preimage.payloadKind) {
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        family: entry.family,
        laneShape: entry.laneShape,
        arityKind: entry.arityKind,
        laneEmissionIndex: entry.laneEmissionIndex,
        emittedFieldRole: entry.emittedFieldRole,
        emittedFieldLabel: entry.emittedFieldLabel,
        preimageKind: "vanta-canonical-field-value-preimage-v1",
        preimageVersion: 1,
        preimagePayloadSummary: "preimage unavailable for scheduled emission",
        conversionRecipe: "blocked",
        resolved: false,
        blockedReason: preimage?.blockedReason ?? preimage?.payloadSummary ?? "scheduled emission missing canonical preimage",
      };
    }

    return {
      emissionIndex: entry.emissionIndex,
      sectionName: entry.sectionName,
      slotIndex: entry.slotIndex,
      slotLabel: entry.slotLabel,
      family: entry.family,
      laneShape: entry.laneShape,
      arityKind: entry.arityKind,
      laneEmissionIndex: entry.laneEmissionIndex,
      emittedFieldRole: entry.emittedFieldRole,
      emittedFieldLabel: entry.emittedFieldLabel,
      preimageKind: preimage.kind,
      preimageVersion: preimage.version,
      preimagePayloadKind: preimage.payloadKind,
      preimagePayloadSummary: preimage.payloadSummary,
      conversionRecipe: getFieldConversionRecipe(preimage.payloadKind),
      resolved: true,
    };
  });
}

function getFieldConversionSlotKey(
  entry:
    | Pick<CanonicalCircuitInputFieldValuePreimage, "sectionName" | "slotIndex" | "slotLabel">
    | Pick<CanonicalCircuitInputFieldEmissionScheduleEntry, "sectionName" | "slotIndex" | "slotLabel">,
): string {
  return `${entry.sectionName}:${entry.slotIndex}:${entry.slotLabel}`;
}

function getFieldConversionRecipe(
  payloadKind: NonNullable<CanonicalCircuitInputFieldValuePreimage["payloadKind"]>,
): Exclude<CanonicalCircuitInputFieldConversionRecipeKind, "blocked"> {
  switch (payloadKind) {
    case "integer-decimal":
      return "as-integer";
    case "boolean-token":
      return "as-boolean-flag";
    case "enum-token":
      return "as-enum-token";
    case "utf8-text":
      return "as-packed-bytes";
    case "hex-digest":
      return "as-digest-limb";
    case "path-node-digest":
      return "as-path-node-digest";
  }
}

function evaluateFiniteFieldInputDrafts(
  fieldConversionManifest: CanonicalCircuitInputFieldConversionManifestRow[],
): CanonicalCircuitInputFiniteFieldDraftEntry[] {
  return fieldConversionManifest.map((row) => {
    if (!row.resolved || row.conversionRecipe === "blocked" || !row.preimagePayloadKind) {
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "blocked",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: false,
        payloadSummary: "field draft unavailable",
        payload: [],
        blockedReason: row.blockedReason ?? "conversion manifest row unresolved",
      };
    }

    return createFiniteFieldInputDraft(row);
  });
}

function createFiniteFieldInputDraft(
  row: CanonicalCircuitInputFieldConversionManifestRow,
): CanonicalCircuitInputFiniteFieldDraftEntry {
  const basePayload = [
    row.slotLabel,
    row.emittedFieldLabel,
    row.preimagePayloadSummary,
    String(row.laneEmissionIndex),
  ];

  switch (row.conversionRecipe) {
    case "as-integer":
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "decimal-scalar-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `decimal scalar candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "decimal-scalar"],
      };
    case "as-boolean-flag":
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "boolean-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `boolean candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "boolean-flag"],
      };
    case "as-enum-token":
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "enum-token-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `enum token candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "enum-token"],
      };
    case "as-packed-bytes":
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "byte-pack-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `byte-pack candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "byte-pack"],
      };
    case "as-digest-limb":
      if (!row.preimagePayloadKind) {
        return {
          emissionIndex: row.emissionIndex,
          sectionName: row.sectionName,
          slotIndex: row.slotIndex,
          slotLabel: row.slotLabel,
          family: row.family,
          conversionRecipe: row.conversionRecipe,
          draftFamily: "blocked",
          draftKind: "vanta-backend-neutral-field-draft-v1",
          version: 1,
          resolved: false,
          payloadSummary: "field draft unavailable",
          payload: [],
          blockedReason: "digest-limb recipe missing preimage payload kind",
        };
      }
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "digest-limb-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `digest limb candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "digest-limb", row.preimagePayloadKind],
      };
    case "as-path-node-digest":
      if (!row.preimagePayloadKind) {
        return {
          emissionIndex: row.emissionIndex,
          sectionName: row.sectionName,
          slotIndex: row.slotIndex,
          slotLabel: row.slotLabel,
          family: row.family,
          conversionRecipe: row.conversionRecipe,
          draftFamily: "blocked",
          draftKind: "vanta-backend-neutral-field-draft-v1",
          version: 1,
          resolved: false,
          payloadSummary: "field draft unavailable",
          payload: [],
          blockedReason: "path-node recipe missing preimage payload kind",
        };
      }
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "path-node-candidate",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: true,
        payloadSummary: `path node candidate for ${row.emittedFieldLabel}`,
        payload: [...basePayload, "path-node", row.preimagePayloadKind],
      };
    case "blocked":
      return {
        emissionIndex: row.emissionIndex,
        sectionName: row.sectionName,
        slotIndex: row.slotIndex,
        slotLabel: row.slotLabel,
        family: row.family,
        conversionRecipe: row.conversionRecipe,
        draftFamily: "blocked",
        draftKind: "vanta-backend-neutral-field-draft-v1",
        version: 1,
        resolved: false,
        payloadSummary: "field draft unavailable",
        payload: [],
        blockedReason: row.blockedReason ?? "conversion manifest row blocked",
      };
  }
}

function evaluateDraftCanonicalizations(
  finiteFieldInputDrafts: CanonicalCircuitInputFiniteFieldDraftEntry[],
): CanonicalCircuitInputDraftCanonicalizationEntry[] {
  return finiteFieldInputDrafts.map((entry) => {
    if (!entry.resolved || entry.draftFamily === "blocked") {
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "blocked",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: false,
        payloadSummary: "canonicalized draft unavailable",
        payload: [],
        blockedReason: entry.blockedReason ?? "finite-field draft unresolved",
      };
    }

    return createDraftCanonicalization(entry);
  });
}

function createDraftCanonicalization(
  entry: CanonicalCircuitInputFiniteFieldDraftEntry,
): CanonicalCircuitInputDraftCanonicalizationEntry {
  const basePayload = [entry.slotLabel, String(entry.emissionIndex), entry.payloadSummary];

  switch (entry.draftFamily) {
    case "decimal-scalar-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-decimal-token",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical decimal token for ${entry.slotLabel}`,
        payload: [...basePayload, "decimal-token", normalizeDraftPayload(entry.payload)],
      };
    case "boolean-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-boolean-token",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical boolean token for ${entry.slotLabel}`,
        payload: [...basePayload, "boolean-token", normalizeDraftPayload(entry.payload)],
      };
    case "enum-token-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-enum-token",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical enum token for ${entry.slotLabel}`,
        payload: [...basePayload, "enum-token", normalizeDraftPayload(entry.payload)],
      };
    case "byte-pack-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-byte-chunks",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical byte chunks for ${entry.slotLabel}`,
        payload: normalizeByteChunks(entry),
      };
    case "digest-limb-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-digest-limbs",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical digest limbs for ${entry.slotLabel}`,
        payload: normalizeDigestLikeLimbs(entry, "digest"),
      };
    case "path-node-candidate":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "canonical-path-node-limbs",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: true,
        payloadSummary: `canonical path-node limbs for ${entry.slotLabel}`,
        payload: normalizeDigestLikeLimbs(entry, "path-node"),
      };
    case "blocked":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        draftFamily: entry.draftFamily,
        canonicalizationFamily: "blocked",
        kind: "vanta-backend-neutral-draft-canonicalization-v1",
        version: 1,
        canonicalized: false,
        payloadSummary: "canonicalized draft unavailable",
        payload: [],
        blockedReason: entry.blockedReason ?? "finite-field draft blocked",
      };
  }
}

function normalizeDraftPayload(payload: readonly string[]): string {
  return payload.join("|").trim().toLowerCase();
}

function normalizeByteChunks(entry: CanonicalCircuitInputFiniteFieldDraftEntry): readonly string[] {
  return [
    entry.slotLabel,
    "chunk-0",
    normalizeDraftPayload(entry.payload),
  ];
}

function normalizeDigestLikeLimbs(
  entry: CanonicalCircuitInputFiniteFieldDraftEntry,
  family: "digest" | "path-node",
): readonly string[] {
  const normalized = normalizeDraftPayload(entry.payload);

  return [0, 1, 2, 3].map((limbIndex) => `${family}-limb-${limbIndex}:${normalized}:${limbIndex}`);
}

function evaluateModulusReadiness(
  draftCanonicalizations: CanonicalCircuitInputDraftCanonicalizationEntry[],
): CanonicalCircuitInputModulusReadinessEntry[] {
  return draftCanonicalizations.map((entry) => {
    if (!entry.canonicalized || entry.canonicalizationFamily === "blocked") {
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        canonicalizationFamily: entry.canonicalizationFamily,
        readiness: "blocked",
        kind: "vanta-backend-neutral-modulus-readiness-v1",
        version: 1,
        ready: false,
        needsChunkSplitting: false,
        backendWidthDependent: false,
        payloadCount: entry.payload.length,
        summary: "canonicalized value unavailable for modulus readiness",
        blockedReason: entry.blockedReason ?? "draft canonicalization unavailable",
      };
    }

    return createModulusReadinessEntry(entry);
  });
}

function createModulusReadinessEntry(
  entry: CanonicalCircuitInputDraftCanonicalizationEntry,
): CanonicalCircuitInputModulusReadinessEntry {
  switch (entry.canonicalizationFamily) {
    case "canonical-boolean-token":
    case "canonical-enum-token":
    case "canonical-digest-limbs":
    case "canonical-path-node-limbs":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        canonicalizationFamily: entry.canonicalizationFamily,
        readiness: "direct",
        kind: "vanta-backend-neutral-modulus-readiness-v1",
        version: 1,
        ready: true,
        needsChunkSplitting: false,
        backendWidthDependent: false,
        payloadCount: entry.payload.length,
        summary: "canonicalized value is directly reducible in generic limb/token form",
      };
    case "canonical-byte-chunks":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        canonicalizationFamily: entry.canonicalizationFamily,
        readiness: "needs-splitting",
        kind: "vanta-backend-neutral-modulus-readiness-v1",
        version: 1,
        ready: false,
        needsChunkSplitting: true,
        backendWidthDependent: false,
        payloadCount: entry.payload.length,
        summary: "canonical byte chunks need splitting or chunk-lane expansion before reduction",
      };
    case "canonical-decimal-token":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        canonicalizationFamily: entry.canonicalizationFamily,
        readiness: "backend-width-dependent",
        kind: "vanta-backend-neutral-modulus-readiness-v1",
        version: 1,
        ready: false,
        needsChunkSplitting: false,
        backendWidthDependent: true,
        payloadCount: entry.payload.length,
        summary: "canonical decimal token depends on backend-specific width decisions",
      };
    case "blocked":
      return {
        emissionIndex: entry.emissionIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        canonicalizationFamily: entry.canonicalizationFamily,
        readiness: "blocked",
        kind: "vanta-backend-neutral-modulus-readiness-v1",
        version: 1,
        ready: false,
        needsChunkSplitting: false,
        backendWidthDependent: false,
        payloadCount: entry.payload.length,
        summary: "canonicalized value unavailable for modulus readiness",
        blockedReason: entry.blockedReason ?? "draft canonicalization blocked",
      };
  }
}

function evaluateReductionPlans(
  modulusReadiness: CanonicalCircuitInputModulusReadinessEntry[],
): CanonicalCircuitInputReductionPlanEntry[] {
  return modulusReadiness.map((entry) => {
    switch (entry.readiness) {
      case "direct":
        return {
          emissionIndex: entry.emissionIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          canonicalizationFamily: entry.canonicalizationFamily,
          modulusReadiness: entry.readiness,
          action: "direct-reduce",
          kind: "vanta-backend-neutral-reduction-plan-v1",
          version: 1,
          planned: true,
          needsChunkSplitting: false,
          backendWidthDependent: false,
          summary: "value can follow direct token/limb reduction planning",
        };
      case "needs-splitting":
        return {
          emissionIndex: entry.emissionIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          canonicalizationFamily: entry.canonicalizationFamily,
          modulusReadiness: entry.readiness,
          action: "split-then-reduce",
          kind: "vanta-backend-neutral-reduction-plan-v1",
          version: 1,
          planned: true,
          needsChunkSplitting: true,
          backendWidthDependent: false,
          expectedSplitUnits: Math.max(1, entry.payloadCount),
          summary: "value needs chunk or lane splitting before reduction",
        };
      case "backend-width-dependent":
        return {
          emissionIndex: entry.emissionIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          canonicalizationFamily: entry.canonicalizationFamily,
          modulusReadiness: entry.readiness,
          action: "resolve-width-then-reduce",
          kind: "vanta-backend-neutral-reduction-plan-v1",
          version: 1,
          planned: true,
          needsChunkSplitting: false,
          backendWidthDependent: true,
          summary: "value needs backend width resolution before reduction",
        };
      case "blocked":
        return {
          emissionIndex: entry.emissionIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          canonicalizationFamily: entry.canonicalizationFamily,
          modulusReadiness: entry.readiness,
          action: "blocked",
          kind: "vanta-backend-neutral-reduction-plan-v1",
          version: 1,
          planned: false,
          needsChunkSplitting: false,
          backendWidthDependent: false,
          summary: "reduction planning unavailable",
          blockedReason: entry.blockedReason ?? entry.summary,
        };
    }
  });
}

function evaluateFieldElementDrafts(
  reductionPlans: CanonicalCircuitInputReductionPlanEntry[],
): CanonicalCircuitInputFieldElementDraftEntry[] {
  return reductionPlans.flatMap((entry) => {
    switch (entry.action) {
      case "direct-reduce":
        return [
          createFieldElementDraft(entry, {
            draftKind: "direct-token-candidate",
            candidateIndex: 0,
            directReducible: true,
            splitDerived: false,
            widthDependent: false,
            payloadSummary: `direct field-element candidate for ${entry.slotLabel}`,
            payload: [entry.slotLabel, "direct-token", entry.canonicalizationFamily],
          }),
        ];
      case "split-then-reduce": {
        const splitUnits = entry.expectedSplitUnits ?? 1;

        return Array.from({ length: splitUnits }, (_, candidateIndex) =>
          createFieldElementDraft(entry, {
            draftKind: "split-chunk-candidate",
            candidateIndex,
            directReducible: false,
            splitDerived: true,
            widthDependent: false,
            payloadSummary: `split chunk candidate ${candidateIndex} for ${entry.slotLabel}`,
            payload: [entry.slotLabel, `split-chunk-${candidateIndex}`, entry.canonicalizationFamily],
          }),
        );
      }
      case "resolve-width-then-reduce":
        return [
          createFieldElementDraft(entry, {
            draftKind: "width-resolve-placeholder",
            candidateIndex: 0,
            directReducible: false,
            splitDerived: false,
            widthDependent: true,
            payloadSummary: `width-resolve placeholder for ${entry.slotLabel}`,
            payload: [entry.slotLabel, "width-resolve", entry.canonicalizationFamily],
          }),
        ];
      case "blocked":
        return [
          {
            emissionIndex: entry.emissionIndex,
            sectionName: entry.sectionName,
            slotIndex: entry.slotIndex,
            slotLabel: entry.slotLabel,
            reductionAction: entry.action,
            draftKind: "blocked",
            candidateIndex: 0,
            kind: "vanta-backend-neutral-field-element-draft-v1",
            version: 1,
            present: false,
            directReducible: false,
            splitDerived: false,
            widthDependent: false,
            payloadSummary: "field-element draft unavailable",
            payload: [],
            blockedReason: entry.blockedReason ?? entry.summary,
          },
        ];
    }
  });
}

function createFieldElementDraft(
  entry: CanonicalCircuitInputReductionPlanEntry,
  config: Pick<
    CanonicalCircuitInputFieldElementDraftEntry,
    | "draftKind"
    | "candidateIndex"
    | "directReducible"
    | "splitDerived"
    | "widthDependent"
    | "payloadSummary"
    | "payload"
  >,
): CanonicalCircuitInputFieldElementDraftEntry {
  return {
    emissionIndex: entry.emissionIndex,
    sectionName: entry.sectionName,
    slotIndex: entry.slotIndex,
    slotLabel: entry.slotLabel,
    reductionAction: entry.action,
    draftKind: config.draftKind,
    candidateIndex: config.candidateIndex,
    kind: "vanta-backend-neutral-field-element-draft-v1",
    version: 1,
    present: true,
    directReducible: config.directReducible,
    splitDerived: config.splitDerived,
    widthDependent: config.widthDependent,
    payloadSummary: config.payloadSummary,
    payload: config.payload,
  };
}

function evaluateFieldElementAssemblies(
  fieldElementDrafts: CanonicalCircuitInputFieldElementDraftEntry[],
): CanonicalCircuitInputFieldElementAssemblyEntry[] {
  const groups = new Map<string, CanonicalCircuitInputFieldElementDraftEntry[]>();

  for (const entry of fieldElementDrafts) {
    const key = `${entry.sectionName}:${entry.slotIndex}:${entry.slotLabel}:${entry.reductionAction}:${entry.draftKind}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups.values()].map((group, assemblyIndex) => {
    const first = group[0];

    if (!first || group.some((entry) => !entry.present || entry.draftKind === "blocked")) {
      return {
        assemblyIndex,
        sectionName: first?.sectionName ?? "identity",
        slotIndex: first?.slotIndex ?? -1,
        slotLabel: first?.slotLabel ?? "blocked",
        assemblyKind: "blocked",
        laneIndex: assemblyIndex,
        memberDraftRows: group.map((entry) => ({
          emissionIndex: entry.emissionIndex,
          candidateIndex: entry.candidateIndex,
          draftKind: entry.draftKind,
          reductionAction: entry.reductionAction,
        })),
        memberCount: group.length,
        assembled: false,
        summary: "field-element drafts unavailable for assembly",
        blockedReason: group.find((entry) => entry.blockedReason)?.blockedReason ?? "blocked field-element draft row",
      };
    }

    const assemblyKind = classifyFieldElementAssemblyKind(first);

    return {
      assemblyIndex,
      sectionName: first.sectionName,
      slotIndex: first.slotIndex,
      slotLabel: first.slotLabel,
      assemblyKind,
      laneIndex: assemblyIndex,
      memberDraftRows: group.map((entry) => ({
        emissionIndex: entry.emissionIndex,
        candidateIndex: entry.candidateIndex,
        draftKind: entry.draftKind,
        reductionAction: entry.reductionAction,
      })),
      memberCount: group.length,
      assembled: true,
      summary: `${assemblyKind} assembled from ${group.length} draft row${group.length === 1 ? "" : "s"}`,
    };
  });
}

function classifyFieldElementAssemblyKind(
  entry: CanonicalCircuitInputFieldElementDraftEntry,
): Exclude<CanonicalCircuitInputFieldElementAssemblyKind, "blocked"> {
  if (entry.draftKind === "split-chunk-candidate") {
    return "split-chunk-lane";
  }

  if (entry.draftKind === "width-resolve-placeholder") {
    return "width-placeholder-lane";
  }

  if (entry.sectionName === "candidate-path") {
    return "path-vector";
  }

  if (entry.sectionName === "membership" || entry.sectionName === "future-root-seam") {
    return "digest-vector";
  }

  return "scalar-lane";
}

function evaluateWitnessLayoutManifest(
  fieldElementAssemblies: CanonicalCircuitInputFieldElementAssemblyEntry[],
): CanonicalCircuitInputWitnessLayoutEntry[] {
  const sortedAssemblies = [...fieldElementAssemblies].sort((left, right) => {
    return (
      left.sectionName.localeCompare(right.sectionName) ||
      left.slotIndex - right.slotIndex ||
      left.laneIndex - right.laneIndex ||
      left.assemblyKind.localeCompare(right.assemblyKind) ||
      left.assemblyIndex - right.assemblyIndex
    );
  });

  const manifest: CanonicalCircuitInputWitnessLayoutEntry[] = [];
  let witnessIndex = 0;

  for (const assembly of sortedAssemblies) {
    const members = [...assembly.memberDraftRows].sort((left, right) => {
      return (
        left.emissionIndex - right.emissionIndex ||
        left.candidateIndex - right.candidateIndex ||
        left.draftKind.localeCompare(right.draftKind)
      );
    });

    if (!assembly.assembled) {
      manifest.push({
        witnessIndex: witnessIndex++,
        assemblyIndex: assembly.assemblyIndex,
        sectionName: assembly.sectionName,
        slotIndex: assembly.slotIndex,
        slotLabel: assembly.slotLabel,
        assemblyKind: assembly.assemblyKind,
        laneIndex: assembly.laneIndex,
        memberIndex: 0,
        memberDraftRow: members[0] ?? {
          emissionIndex: -1,
          candidateIndex: -1,
          draftKind: "blocked",
          reductionAction: "blocked",
        },
        laidOut: false,
        summary: "blocked assembly not laid out into witness positions",
        blockedReason: assembly.blockedReason ?? assembly.summary,
      });
      continue;
    }

    for (const [memberIndex, memberDraftRow] of members.entries()) {
      manifest.push({
        witnessIndex: witnessIndex++,
        assemblyIndex: assembly.assemblyIndex,
        sectionName: assembly.sectionName,
        slotIndex: assembly.slotIndex,
        slotLabel: assembly.slotLabel,
        assemblyKind: assembly.assemblyKind,
        laneIndex: assembly.laneIndex,
        memberIndex,
        memberDraftRow,
        laidOut: true,
        summary: `${assembly.assemblyKind} witness position ${memberIndex} from ${assembly.slotLabel}`,
      });
    }
  }

  return manifest;
}

function evaluateWitnessRealizationPrecheck(
  witnessLayoutManifest: CanonicalCircuitInputWitnessLayoutEntry[],
): CanonicalCircuitInputWitnessRealizationPrecheckEntry[] {
  return witnessLayoutManifest.map((entry) => {
    if (!entry.laidOut) {
      return {
        witnessIndex: entry.witnessIndex,
        assemblyIndex: entry.assemblyIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        assemblyKind: entry.assemblyKind,
        draftKind: entry.memberDraftRow.draftKind,
        reductionAction: entry.memberDraftRow.reductionAction,
        status: "blocked",
        kind: "vanta-backend-neutral-witness-realization-precheck-v1",
        version: 1,
        ready: false,
        summary: "witness position is blocked before realization",
        blockedReason: entry.blockedReason ?? entry.summary,
      };
    }

    return createWitnessRealizationPrecheckEntry(entry);
  });
}

function createWitnessRealizationPrecheckEntry(
  entry: CanonicalCircuitInputWitnessLayoutEntry,
): CanonicalCircuitInputWitnessRealizationPrecheckEntry {
  switch (entry.memberDraftRow.draftKind) {
    case "direct-token-candidate":
      return {
        witnessIndex: entry.witnessIndex,
        assemblyIndex: entry.assemblyIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        assemblyKind: entry.assemblyKind,
        draftKind: entry.memberDraftRow.draftKind,
        reductionAction: entry.memberDraftRow.reductionAction,
        status: "realizable",
        kind: "vanta-backend-neutral-witness-realization-precheck-v1",
        version: 1,
        ready: true,
        summary: "witness position is concretely realizable from direct token draft",
      };
    case "split-chunk-candidate":
      return {
        witnessIndex: entry.witnessIndex,
        assemblyIndex: entry.assemblyIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        assemblyKind: entry.assemblyKind,
        draftKind: entry.memberDraftRow.draftKind,
        reductionAction: entry.memberDraftRow.reductionAction,
        status: "split-dependent",
        kind: "vanta-backend-neutral-witness-realization-precheck-v1",
        version: 1,
        ready: false,
        summary: "witness position still depends on split-derived reduction",
      };
    case "width-resolve-placeholder":
      return {
        witnessIndex: entry.witnessIndex,
        assemblyIndex: entry.assemblyIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        assemblyKind: entry.assemblyKind,
        draftKind: entry.memberDraftRow.draftKind,
        reductionAction: entry.memberDraftRow.reductionAction,
        status: "width-dependent",
        kind: "vanta-backend-neutral-witness-realization-precheck-v1",
        version: 1,
        ready: false,
        summary: "witness position still depends on backend width resolution",
      };
    case "blocked":
      return {
        witnessIndex: entry.witnessIndex,
        assemblyIndex: entry.assemblyIndex,
        sectionName: entry.sectionName,
        slotIndex: entry.slotIndex,
        slotLabel: entry.slotLabel,
        assemblyKind: entry.assemblyKind,
        draftKind: entry.memberDraftRow.draftKind,
        reductionAction: entry.memberDraftRow.reductionAction,
        status: "blocked",
        kind: "vanta-backend-neutral-witness-realization-precheck-v1",
        version: 1,
        ready: false,
        summary: "witness position is blocked before realization",
        blockedReason: entry.blockedReason ?? entry.summary,
      };
  }
}

function evaluateWitnessRealizationRecipes(
  witnessRealizationPrecheck: CanonicalCircuitInputWitnessRealizationPrecheckEntry[],
): CanonicalCircuitInputWitnessRealizationRecipeEntry[] {
  return witnessRealizationPrecheck.map((entry) => {
    switch (entry.status) {
      case "realizable":
        return {
          witnessIndex: entry.witnessIndex,
          assemblyIndex: entry.assemblyIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          assemblyKind: entry.assemblyKind,
          status: entry.status,
          action: "direct-field-materialize",
          kind: "vanta-backend-neutral-witness-realization-recipe-v1",
          version: 1,
          actionable: true,
          summary: "direct field materialization is the next backend-neutral action",
        };
      case "split-dependent":
        return {
          witnessIndex: entry.witnessIndex,
          assemblyIndex: entry.assemblyIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          assemblyKind: entry.assemblyKind,
          status: entry.status,
          action: "split-materialize",
          kind: "vanta-backend-neutral-witness-realization-recipe-v1",
          version: 1,
          actionable: true,
          summary: "split-aware materialization is required before field encoding",
        };
      case "width-dependent":
        return {
          witnessIndex: entry.witnessIndex,
          assemblyIndex: entry.assemblyIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          assemblyKind: entry.assemblyKind,
          status: entry.status,
          action: "width-resolve-materialize",
          kind: "vanta-backend-neutral-witness-realization-recipe-v1",
          version: 1,
          actionable: true,
          summary: "backend width must be resolved before field materialization",
        };
      case "placeholder":
        return {
          witnessIndex: entry.witnessIndex,
          assemblyIndex: entry.assemblyIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          assemblyKind: entry.assemblyKind,
          status: entry.status,
          action: "placeholder-materialize",
          kind: "vanta-backend-neutral-witness-realization-recipe-v1",
          version: 1,
          actionable: true,
          summary: "placeholder materialization remains pending further substrate",
        };
      case "blocked":
        return {
          witnessIndex: entry.witnessIndex,
          assemblyIndex: entry.assemblyIndex,
          sectionName: entry.sectionName,
          slotIndex: entry.slotIndex,
          slotLabel: entry.slotLabel,
          assemblyKind: entry.assemblyKind,
          status: entry.status,
          action: "blocked",
          kind: "vanta-backend-neutral-witness-realization-recipe-v1",
          version: 1,
          actionable: false,
          summary: "witness materialization is blocked",
          blockedReason: entry.blockedReason ?? entry.summary,
        };
    }
  });
}

function evaluateWitnessMaterializationManifest(
  witnessRealizationRecipes: CanonicalCircuitInputWitnessRealizationRecipeEntry[],
): CanonicalCircuitInputWitnessMaterializationManifestRow[] {
  const orderedRecipes = [...witnessRealizationRecipes].sort((left, right) => {
    return (
      left.witnessIndex - right.witnessIndex ||
      left.assemblyIndex - right.assemblyIndex ||
      left.sectionName.localeCompare(right.sectionName) ||
      left.slotIndex - right.slotIndex ||
      left.action.localeCompare(right.action)
    );
  });

  return orderedRecipes.map((entry, materializationIndex) => ({
    materializationIndex,
    witnessIndex: entry.witnessIndex,
    assemblyIndex: entry.assemblyIndex,
    sectionName: entry.sectionName,
    slotIndex: entry.slotIndex,
    slotLabel: entry.slotLabel,
    assemblyKind: entry.assemblyKind,
    action: entry.action,
    kind: "vanta-backend-neutral-witness-materialization-manifest-v1",
    version: 1,
    actionable: entry.actionable,
    summary: entry.actionable
      ? `${entry.action} planned for witness position ${entry.witnessIndex}`
      : "witness materialization remains blocked",
    blockedReason: entry.actionable ? undefined : entry.blockedReason ?? entry.summary,
  }));
}

function evaluateBackendBridgeContract(
  witnessMaterializationManifest: CanonicalCircuitInputWitnessMaterializationManifestRow[],
): CanonicalCircuitInputBackendBridgeContractRow[] {
  return witnessMaterializationManifest.map((entry) => ({
    materializationIndex: entry.materializationIndex,
    witnessIndex: entry.witnessIndex,
    action: entry.action,
    sectionName: entry.sectionName,
    slotLabel: entry.slotLabel,
    assemblyKind: entry.assemblyKind,
    actionable: entry.actionable,
    contractKind: "vanta-backend-bridge-contract-row-v1",
    contractVersion: 1,
    familyHint: getBackendBridgeFamilyHint(entry.assemblyKind, entry.action),
    summary: entry.actionable
      ? `${entry.action} contract row for ${entry.slotLabel}`
      : "blocked contract row retained for encoder visibility",
    blockedReason: entry.actionable ? undefined : entry.blockedReason ?? entry.summary,
  }));
}

function getBackendBridgeFamilyHint(
  assemblyKind: CanonicalCircuitInputFieldElementAssemblyKind,
  action: CanonicalCircuitInputWitnessRealizationRecipeAction,
): string {
  if (action === "blocked") {
    return "blocked";
  }

  if (assemblyKind === "digest-vector" || assemblyKind === "path-vector") {
    return "vector";
  }

  if (assemblyKind === "split-chunk-lane") {
    return "split-lane";
  }

  if (assemblyKind === "width-placeholder-lane") {
    return "width-placeholder";
  }

  return "scalar-lane";
}

function evaluateBackendAdapterHandshake(
  backendBridgeContract: CanonicalCircuitInputBackendBridgeContractRow[],
  adapter: CanonicalCircuitInputBackendAdapterDeclaration,
): CanonicalCircuitInputBackendAdapterHandshakeResult {
  const contractKind = backendBridgeContract[0]?.contractKind ?? adapter.supportedContractKind;
  const contractVersion = backendBridgeContract[0]?.contractVersion ?? adapter.supportedContractVersion;
  const contractSupported =
    contractKind === adapter.supportedContractKind &&
    contractVersion === adapter.supportedContractVersion;

  const rowResults = backendBridgeContract.map((entry) => {
    if (!entry.actionable) {
      return {
        materializationIndex: entry.materializationIndex,
        witnessIndex: entry.witnessIndex,
        action: entry.action,
        familyHint: entry.familyHint,
        actionable: entry.actionable,
        status: "blocked" as const,
        summary: "blocked contract row is not consumable by the adapter",
        blockedReason: entry.blockedReason ?? entry.summary,
      };
    }

    if (!contractSupported) {
      return {
        materializationIndex: entry.materializationIndex,
        witnessIndex: entry.witnessIndex,
        action: entry.action,
        familyHint: entry.familyHint,
        actionable: entry.actionable,
        status: "unsupported-contract" as const,
        summary: "contract kind or version is unsupported by the adapter",
      };
    }

    if (!adapter.supportedActions.includes(entry.action)) {
      return {
        materializationIndex: entry.materializationIndex,
        witnessIndex: entry.witnessIndex,
        action: entry.action,
        familyHint: entry.familyHint,
        actionable: entry.actionable,
        status: "unsupported-action" as const,
        summary: "contract action is unsupported by the adapter",
      };
    }

    if (!adapter.supportedFamilyHints.includes(entry.familyHint)) {
      return {
        materializationIndex: entry.materializationIndex,
        witnessIndex: entry.witnessIndex,
        action: entry.action,
        familyHint: entry.familyHint,
        actionable: entry.actionable,
        status: "unsupported-family" as const,
        summary: "contract family hint is unsupported by the adapter",
      };
    }

    return {
      materializationIndex: entry.materializationIndex,
      witnessIndex: entry.witnessIndex,
      action: entry.action,
      familyHint: entry.familyHint,
      actionable: entry.actionable,
      status: "accepted" as const,
      summary: "contract row is accepted by the adapter",
    };
  });

  const unsupportedActionKinds = [
    ...new Set(
      rowResults
        .filter((entry) => entry.status === "unsupported-action")
        .map((entry) => entry.action),
    ),
  ];
  const unsupportedFamilyHints = [
    ...new Set(
      rowResults
        .filter((entry) => entry.status === "unsupported-family")
        .map((entry) => entry.familyHint),
    ),
  ];
  const acceptedRowCount = rowResults.filter((entry) => entry.status === "accepted").length;
  const blockedRowCount = rowResults.filter((entry) => entry.status === "blocked").length;
  const accepted =
    contractSupported &&
    rowResults.every((entry) => entry.status === "accepted" || entry.status === "blocked");

  return {
    adapterId: adapter.adapterId,
    adapterLabel: adapter.label,
    contractKind,
    contractVersion,
    contractSupported,
    accepted,
    acceptedRowCount,
    blockedRowCount,
    unsupportedActionKinds,
    unsupportedFamilyHints,
    rowResults,
    summary: contractSupported
      ? `accepted:${acceptedRowCount} · blocked:${blockedRowCount} · unsupported-actions:${unsupportedActionKinds.length} · unsupported-families:${unsupportedFamilyHints.length}`
      : "contract kind/version unsupported by adapter",
  };
}

function evaluateBackendAdapterNormalizedBundle(
  backendBridgeContract: CanonicalCircuitInputBackendBridgeContractRow[],
  handshake: CanonicalCircuitInputBackendAdapterHandshakeResult,
): CanonicalCircuitInputBackendAdapterNormalizedBundle {
  const contractByIndex = new Map(
    backendBridgeContract.map((entry) => [entry.materializationIndex, entry] as const),
  );
  const normalizedRows = handshake.rowResults
    .filter((entry) => entry.status === "accepted")
    .map((entry) => {
      const contractRow = contractByIndex.get(entry.materializationIndex);

      return {
        materializationIndex: entry.materializationIndex,
        witnessIndex: entry.witnessIndex,
        action: entry.action,
        familyHint: entry.familyHint,
        sectionName: contractRow?.sectionName ?? "identity",
        slotLabel: contractRow?.slotLabel ?? "unknown-slot",
        actionable: true as const,
        payloadHint: `${entry.familyHint}:${entry.action}`,
        summary: `adapter-ready ${entry.action} row for ${contractRow?.slotLabel ?? "unknown-slot"}`,
      };
    });
  const excludedRows = handshake.rowResults.filter((entry) => entry.status !== "accepted");

  return {
    adapterId: handshake.adapterId,
    adapterLabel: handshake.adapterLabel,
    contractKind: handshake.contractKind,
    contractVersion: handshake.contractVersion,
    normalizedRows,
    excludedRows,
    acceptedRowCount: normalizedRows.length,
    excludedRowCount: excludedRows.length,
    summary: `normalized:${normalizedRows.length} · excluded:${excludedRows.length}`,
  };
}

function freezeBackendAdapterNormalizedBundle(
  bundle: CanonicalCircuitInputBackendAdapterNormalizedBundle,
): CanonicalCircuitInputAdapterPayloadFreeze {
  const normalizedRows = [...bundle.normalizedRows].sort((left, right) => {
    return (
      left.materializationIndex - right.materializationIndex ||
      left.witnessIndex - right.witnessIndex ||
      left.action.localeCompare(right.action) ||
      left.familyHint.localeCompare(right.familyHint)
    );
  });

  const tuples = [
    ["kind", "vanta-adapter-payload-snapshot-v1"],
    ["version", 1],
    ["adapterId", bundle.adapterId],
    ["adapterLabel", bundle.adapterLabel],
    ["contractKind", bundle.contractKind],
    ["contractVersion", bundle.contractVersion],
    [
      "normalizedRows",
      normalizedRows.map((entry) => [
        entry.materializationIndex,
        entry.witnessIndex,
        entry.action,
        entry.familyHint,
        entry.sectionName,
        entry.slotLabel,
        entry.actionable,
        entry.payloadHint,
        entry.summary,
      ]),
    ],
    ["acceptedRowCount", bundle.acceptedRowCount],
    ["excludedRowCount", bundle.excludedRowCount],
  ] as const;

  return {
    kind: "vanta-adapter-payload-snapshot-v1",
    version: 1,
    adapterId: bundle.adapterId,
    adapterLabel: bundle.adapterLabel,
    acceptedRowCount: bundle.acceptedRowCount,
    excludedRowCount: bundle.excludedRowCount,
    serialized: JSON.stringify(tuples),
    summary: `frozen:${bundle.acceptedRowCount} accepted · ${bundle.excludedRowCount} excluded`,
  };
}

function getEmissionFieldRole(
  arityKind: CanonicalCircuitInputLaneArityKind,
): CanonicalCircuitInputFieldEmissionScheduleEntry["emittedFieldRole"] {
  switch (arityKind) {
    case "multi-limb":
      return "limb";
    case "packed-bytes":
      return "byte-pack";
    case "vector-expansion":
      return "vector-element";
    case "single":
    case "blocked":
      return "single";
  }
}

function normalizeSectionSlots(
  section: CanonicalCircuitInputSection,
  bucket: Exclude<CanonicalCircuitInputFieldShapeBucket, "blocked" | "mixed">,
): CanonicalCircuitInputNormalizedSlot[] {
  if (bucket === "path-vector") {
    let nextSlotIndex = 0;

    return section.entries.flatMap((entry) => {
      if (entry.valueKind === "string[]" && Array.isArray(entry.value)) {
        return entry.value.map((value, valueIndex) => ({
          sectionName: section.name,
          bucket,
          slotIndex: nextSlotIndex++,
          slotKind: "path-vector" as const,
          slotLabel: `${entry.key}[${valueIndex}]`,
          sourceKey: entry.key,
          valueKind: "string",
          valueSummary: summarizeSlotValue(value),
        }));
      }

      return [
        {
          sectionName: section.name,
          bucket,
          slotIndex: nextSlotIndex++,
          slotKind: "path-vector" as const,
          slotLabel: entry.key,
          sourceKey: entry.key,
          valueKind: entry.valueKind,
          valueSummary: summarizeSlotValue(entry.value),
        },
      ];
    });
  }

  return section.entries.map((entry, index) => ({
    sectionName: section.name,
    bucket,
    slotIndex: index,
    slotKind: bucket,
    slotLabel: entry.key,
    sourceKey: entry.key,
    valueKind: entry.valueKind,
    valueSummary: summarizeSlotValue(entry.value),
  }));
}

function summarizeSlotValue(value: CanonicalCircuitInputScalar): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length} items` : "empty";
  }

  return summarizeSlotScalar(value);
}

function summarizeSlotScalar(value: CanonicalCircuitInputScalar): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length} items` : "empty";
  }

  if (typeof value === "string") {
    return value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value || "empty";
  }

  return String(value);
}
