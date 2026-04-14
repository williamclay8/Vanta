import { liveShieldAsset } from "@/solana/shieldConfig";
import type { VantaPrivateCoreOperatorSourceArtifactBundleV0 } from "@/zk/vantaPrivateCore";
import type { VantaPrivateCoreNoirSendWitnessPackageV0 } from "@/zk/vantaPrivateCoreSendProof";
import type { VantaPrivateCoreNoirUnshieldWitnessPackageV0 } from "@/zk/vantaPrivateCoreUnshieldProof";

export type VantaPrivateCoreProofOperatorResponse = {
  backend: string;
  circuit: string;
  proofVersion: number;
  provingHashLane: string;
  proofByteLength: number;
  proofFieldCount: number;
  publicInputCount: number;
  publicInputs: string[];
  verified: boolean;
};

export type VantaPrivateCoreSendOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  changeAmount: string;
  changeCommitment: string | null;
  completedAt: number;
  inputNullifier: string;
  inputRoot: string;
  proofId: string;
  recipientCommitment: string;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  sendAmount: string;
  sendId: string;
  sendRecorded: boolean;
};

export type VantaPrivateCoreConsumeOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  authorizationBasis: "proof-backed-consume";
  completedAt: number;
  leafIndex: string | null;
  releaseDestination: string;
  proofId: string;
  releaseRecorded: boolean;
  releaseRequestId: string;
  rootPolicy: "latest-registered-root";
  releaseTransitionNoteId: string;
  releasedAssetId: string;
  releasedAmount: string;
  root: string;
  nullifier: string;
};

export type VantaPrivateCoreOperatorConsumeRecord = {
  assetId: string;
  amount: string;
  completedAt: number;
  leafIndex: string | null;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
};

export type VantaPrivateCoreOperatorConsumeStateResponse = {
  stateVersion: number;
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  records: VantaPrivateCoreOperatorConsumeRecord[];
};

export type VantaPrivateCoreOperatorProofRecord = {
  action: "consume" | "proof-only" | "register-root";
  assetId: string;
  amount: string;
  backend: string;
  circuit: string;
  completedAt: number;
  noteVersion: number;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  proofVersion: number;
  provingHashLane: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
  verified: boolean;
};

export type VantaPrivateCoreOperatorProofStateResponse = {
  stateVersion: number;
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  records: VantaPrivateCoreOperatorProofRecord[];
};

export type VantaPrivateCoreOperatorSendProofRecord = {
  action: "send-proof";
  assetId: string;
  amount: string;
  backend: string;
  circuit: string;
  completedAt: number;
  noteVersion: number;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  proofVersion: number;
  provingHashLane: string;
  publicInputCount: number;
  releaseDestination: string;
  root: string;
  verified: boolean;
};

export type VantaPrivateCoreOperatorSendProofStateResponse = {
  stateVersion: number;
  latestProof: VantaPrivateCoreOperatorSendProofRecord | null;
  records: VantaPrivateCoreOperatorSendProofRecord[];
};

export type VantaPrivateCoreOperatorSendRecord = {
  assetId: string;
  changeAmount: string;
  changeCommitment: string | null;
  completedAt: number;
  inputNullifier: string;
  inputRoot: string;
  noteVersion: number;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  recipientCommitment: string;
  resultingRootBasis: "client-declared";
  resultingRoot: string | null;
  sendAmount: string;
  sendId: string;
};

export type VantaPrivateCoreOperatorSendStateResponse = {
  stateVersion: number;
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  records: VantaPrivateCoreOperatorSendRecord[];
};

export type VantaPrivateCoreOperatorReleaseRecord = {
  assetId: string;
  amount: string;
  authorizationBasis: "proof-backed-consume";
  completedAt: number;
  consumedNoteId: string;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseDestination: string;
  rootPolicy: "latest-registered-root";
  releasedAssetId: string;
  releasedAmount: string;
  requestId: string;
  root: string;
  transitionNoteId: string;
};

export type VantaPrivateCoreOperatorReleaseStateResponse = {
  stateVersion: number;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  records: VantaPrivateCoreOperatorReleaseRecord[];
};

export type VantaPrivateCoreOperatorRootRecord = {
  amount: string | null;
  assetId: string | null;
  artifactBundleStatus: "complete" | "legacy-incomplete";
  artifactBundleVersion: number | null;
  merkleLeaf: string | null;
  noteCommitment: string | null;
  proofId: string | null;
  registrationBasis: "shield-input" | "send-recipient-output" | "send-change-output";
  recordedAt: number;
  root: string;
  source: string;
  witnessRoot: string | null;
};

export type VantaPrivateCoreOperatorRootStateResponse = {
  currentRecord: VantaPrivateCoreOperatorRootRecord | null;
  stateVersion: number;
  currentRoot: string | null;
  records: VantaPrivateCoreOperatorRootRecord[];
};

export type VantaPrivateCoreOperatorRootRegistrationResponse = {
  known: boolean;
  root: string;
};

export type VantaPrivateCoreOperatorSummaryStateResponse = {
  boundaryNote: string;
  boundaryStatus:
    | "coherent"
    | "awaiting-current-root"
    | "root-registration-unlinked"
    | "send-root-registration-unlinked"
    | "send-root-output-mismatch"
    | "proof-send-unlinked"
    | "proof-consume-unlinked"
    | "proof-release-unlinked";
  currentRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  currentRootProofLinkStatus: "linked" | "mismatch" | "unavailable";
  sendResultingRootNote: string;
  sendResultingRootLinkedProof: VantaPrivateCoreOperatorProofRecord | null;
  sendResultingRootRecord: VantaPrivateCoreOperatorRootRecord | null;
  sendResultingRootRegistrationNote: string;
  sendResultingRootRegistrationStatus:
    | "unavailable"
    | "linked-recipient-output"
    | "linked-change-output"
    | "mismatch";
  sendResultingRootProofLinkStatus: "linked" | "mismatch" | "unavailable";
  sendResultingRootStatus:
    | "unavailable"
    | "missing"
    | "current-root"
    | "registered-stale"
    | "downstream-consumed"
    | "downstream-released"
    | "unregistered";
  supportedSendLaneKind: "single-input-single-recipient-optional-change";
  supportedSendLaneNote: string;
  supportedSendLaneStatus: "supported";
  supportedSendLaneVersion: number;
  supportedUnshieldLaneKind: "single-note-proof-backed-consume";
  supportedUnshieldLaneNote: string;
  supportedUnshieldLaneStatus: "supported";
  supportedUnshieldLaneVersion: number;
  supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root";
  supportedReleaseLaneNote: string;
  supportedReleaseLaneStatus: "supported";
  supportedReleaseLaneVersion: number;
  supportedFlowKind: "shield-hold-send-unshield-replay-guard";
  supportedFlowNote: string;
  supportedFlowStatus: "supported";
  supportedFlowVersion: number;
  supportedAssetSymbol: "VUSD";
  supportedEnvironment: "solana-devnet";
  supportedNoteSchema: "note-v0";
  supportedNoteVersion: number;
  supportedRootRegistrationProvenance: "shield-input|send-recipient-output|send-change-output";
  supportedSendResultingRootBasis: "client-declared";
  supportedRecipientModel: "hashed-reference-to-owner-key";
  supportedReleaseDestinationModel: "32-byte-release-destination-field";
  supportedProofSystem: "noir-acir-ultrahonk-bbjs";
  supportedUnshieldCircuit: "vanta_private_core_single_note_unshield";
  supportedSendCircuit: "vanta_private_core_single_note_send";
  supportedUnshieldMerkleDepth: number;
  supportedSendMerkleDepth: number;
  supportedReleaseAuthorizationBasis: "proof-backed-consume";
  supportedReleaseRootPolicy: "latest-registered-root";
  ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit";
  nullifierKeyMode: "note-secret-as-nullifier-key-v0";
  provingHashLane: "poseidon-bn254-proving-lane-v0";
  generatedAt: number;
  stateVersion: number;
  summaryVersion: number;
  currentRoot: string | null;
  currentRecord: VantaPrivateCoreOperatorRootRecord | null;
  rootRecords: VantaPrivateCoreOperatorRootRecord[];
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  proofRecords: VantaPrivateCoreOperatorProofRecord[];
  latestSendProof: VantaPrivateCoreOperatorSendProofRecord | null;
  sendProofRecords: VantaPrivateCoreOperatorSendProofRecord[];
  latestSendLinkedProof: VantaPrivateCoreOperatorSendProofRecord | null;
  latestSend: VantaPrivateCoreOperatorSendRecord | null;
  sendRecords: VantaPrivateCoreOperatorSendRecord[];
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  consumeRecords: VantaPrivateCoreOperatorConsumeRecord[];
  latestConsumeProof: VantaPrivateCoreOperatorProofRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  releaseRecords: VantaPrivateCoreOperatorReleaseRecord[];
  latestReleaseProof: VantaPrivateCoreOperatorProofRecord | null;
  rootRecordCount: number;
  proofRecordCount: number;
  sendProofRecordCount: number;
  sendRecordCount: number;
  consumeRecordCount: number;
  releaseRecordCount: number;
  proofSendLinkStatus: "linked" | "mismatch" | "unavailable";
  proofConsumeLinkStatus: "linked" | "mismatch" | "unavailable";
  proofReleaseLinkStatus: "linked" | "mismatch" | "unavailable";
};

export async function requestVantaPrivateCoreOperatorProof(args: {
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreProofOperatorResponse> {
  const response = await fetch(getPrivateCoreProofOperatorUrl(), {
    body: JSON.stringify({
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core proof operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreProofOperatorResponse>;

  if (!parsed.verified) {
    throw new Error("The private-core proof operator did not verify the proof successfully.");
  }

  if (
    typeof parsed.proofFieldCount !== "number" ||
    typeof parsed.publicInputCount !== "number" ||
    typeof parsed.proofByteLength !== "number" ||
    typeof parsed.provingHashLane !== "string"
  ) {
    throw new Error("The private-core proof operator returned an invalid proof summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_unshield",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane,
    proofByteLength: parsed.proofByteLength,
    proofFieldCount: parsed.proofFieldCount,
    publicInputCount: parsed.publicInputCount,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSendProof(args: {
  witnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
}): Promise<VantaPrivateCoreProofOperatorResponse> {
  const response = await fetch(getPrivateCoreSendProofOperatorUrl(), {
    body: JSON.stringify({
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send proof operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreProofOperatorResponse>;

  if (!parsed.verified) {
    throw new Error("The private-core send proof operator did not verify the proof successfully.");
  }

  if (
    typeof parsed.proofFieldCount !== "number" ||
    typeof parsed.publicInputCount !== "number" ||
    typeof parsed.proofByteLength !== "number" ||
    typeof parsed.provingHashLane !== "string"
  ) {
    throw new Error("The private-core send proof operator returned an invalid proof summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_send",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane,
    proofByteLength: parsed.proofByteLength,
    proofFieldCount: parsed.proofFieldCount,
    publicInputCount: parsed.publicInputCount,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorSendTransition(args: {
  witnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
  resultingRoot: string;
}): Promise<VantaPrivateCoreSendOperatorResponse> {
  const response = await fetch(getPrivateCoreSendTransitionOperatorUrl(), {
    body: JSON.stringify({
      resultingRoot: args.resultingRoot,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send operator rejected the transition request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreSendOperatorResponse>;

  if (
    !parsed.verified ||
    parsed.sendRecorded !== true ||
    typeof parsed.completedAt !== "number" ||
    typeof parsed.inputNullifier !== "string" ||
    typeof parsed.inputRoot !== "string" ||
    typeof parsed.proofId !== "string" ||
    typeof parsed.recipientCommitment !== "string" ||
    parsed.resultingRootBasis !== "client-declared" ||
    typeof parsed.sendAmount !== "string" ||
    typeof parsed.sendId !== "string"
  ) {
    throw new Error("The private-core send operator returned an invalid transition summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    changeAmount: parsed.changeAmount ?? "0",
    changeCommitment: parsed.changeCommitment ?? null,
    circuit: parsed.circuit ?? "vanta_private_core_single_note_send",
    completedAt: parsed.completedAt,
    inputNullifier: parsed.inputNullifier,
    inputRoot: parsed.inputRoot,
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane ?? "poseidon-bn254-proving-lane-v0",
    proofByteLength: parsed.proofByteLength ?? 0,
    proofFieldCount: parsed.proofFieldCount ?? 0,
    proofId: parsed.proofId,
    publicInputCount: parsed.publicInputCount ?? 0,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    recipientCommitment: parsed.recipientCommitment,
    resultingRootBasis: parsed.resultingRootBasis === "client-declared" ? "client-declared" : "client-declared",
    resultingRoot: typeof parsed.resultingRoot === "string" ? parsed.resultingRoot : null,
    sendAmount: parsed.sendAmount,
    sendId: parsed.sendId,
    sendRecorded: true,
    verified: true,
  };
}

export async function requestVantaPrivateCoreOperatorConsume(args: {
  sourceArtifacts: VantaPrivateCoreOperatorSourceArtifactBundleV0;
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreConsumeOperatorResponse> {
  const response = await fetch(getPrivateCoreConsumeOperatorUrl(), {
    body: JSON.stringify({
      sourceArtifacts: args.sourceArtifacts,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core consume operator rejected the request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreConsumeOperatorResponse>;

  if (
    !parsed.verified ||
    typeof parsed.completedAt !== "number" ||
    (parsed.leafIndex !== null && typeof parsed.leafIndex !== "string") ||
    parsed.authorizationBasis !== "proof-backed-consume" ||
    typeof parsed.releaseDestination !== "string" ||
    typeof parsed.proofId !== "string" ||
    parsed.releaseRecorded !== true ||
    typeof parsed.releaseRequestId !== "string" ||
    parsed.rootPolicy !== "latest-registered-root" ||
    typeof parsed.releaseTransitionNoteId !== "string" ||
    typeof parsed.releasedAssetId !== "string" ||
    typeof parsed.releasedAmount !== "string" ||
    typeof parsed.root !== "string" ||
    typeof parsed.nullifier !== "string"
  ) {
    throw new Error("The private-core consume operator returned an invalid consume summary.");
  }

  return {
    backend: parsed.backend ?? "barretenberg-ultrahonk",
    circuit: parsed.circuit ?? "vanta_private_core_single_note_unshield",
    proofVersion: parsed.proofVersion ?? 0,
    provingHashLane: parsed.provingHashLane ?? "poseidon-bn254-proving-lane-v0",
    proofByteLength: parsed.proofByteLength ?? 0,
    proofFieldCount: parsed.proofFieldCount ?? 0,
    publicInputCount: parsed.publicInputCount ?? 0,
    publicInputs: Array.isArray(parsed.publicInputs)
      ? parsed.publicInputs.filter((value): value is string => typeof value === "string")
      : [],
    verified: true,
    authorizationBasis: "proof-backed-consume",
    completedAt: parsed.completedAt,
    leafIndex: parsed.leafIndex ?? null,
    proofId: parsed.proofId,
    releaseDestination: parsed.releaseDestination,
    releaseRecorded: true,
    releaseRequestId: parsed.releaseRequestId,
    rootPolicy: "latest-registered-root",
    releaseTransitionNoteId: parsed.releaseTransitionNoteId,
    releasedAssetId: parsed.releasedAssetId,
    releasedAmount: parsed.releasedAmount,
    root: parsed.root,
    nullifier: parsed.nullifier,
  };
}

export async function registerVantaPrivateCoreOperatorRoot(args: {
  sourceArtifacts: VantaPrivateCoreOperatorSourceArtifactBundleV0;
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
}): Promise<VantaPrivateCoreOperatorRootRegistrationResponse> {
  const response = await fetch(getPrivateCoreRootRegistrationUrl(), {
    body: JSON.stringify({
      sourceArtifacts: args.sourceArtifacts,
      witnessPackage: args.witnessPackage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core root operator rejected the registration request.");
  }

  const parsed = (await response.json()) as Partial<VantaPrivateCoreOperatorRootRegistrationResponse>;

  if (parsed.known !== true || typeof parsed.root !== "string") {
    throw new Error("The private-core root operator returned an invalid root registration summary.");
  }

  return {
    known: true,
    root: parsed.root,
  };
}

function getPrivateCoreProofOperatorUrl() {
  return new URL("/private-core/unshield-proof", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendProofOperatorUrl() {
  return new URL("/private-core/send-proof", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendTransitionOperatorUrl() {
  return new URL("/private-core/send-transition", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreConsumeOperatorUrl() {
  return new URL("/private-core/unshield-consume", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreRootRegistrationUrl() {
  return new URL("/private-core/register-root", liveShieldAsset.unshieldOperatorUrl).toString();
}

export async function fetchVantaPrivateCoreOperatorConsumes(): Promise<
  VantaPrivateCoreOperatorConsumeStateResponse
> {
  const response = await fetch(getPrivateCoreConsumeStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core consume operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestConsume?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestConsume !== null &&
      parsed.latestConsume !== undefined &&
      !isConsumeRecord(parsed.latestConsume)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core consume operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestConsume: isConsumeRecord(parsed.latestConsume) ? parsed.latestConsume : null,
    records: parsed.records.filter(isConsumeRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorProofs(): Promise<
  VantaPrivateCoreOperatorProofStateResponse
> {
  const response = await fetch(getPrivateCoreProofStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core proof operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestProof?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core proof operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestProof: isProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    records: parsed.records.filter(isProofRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSendProofs(): Promise<
  VantaPrivateCoreOperatorSendProofStateResponse
> {
  const response = await fetch(getPrivateCoreSendProofStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send proof operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestProof?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isSendProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core send proof operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestProof: isSendProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    records: parsed.records.filter(isSendProofRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSends(): Promise<
  VantaPrivateCoreOperatorSendStateResponse
> {
  const response = await fetch(getPrivateCoreSendStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core send operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestSend?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestSend !== null &&
      parsed.latestSend !== undefined &&
      !isSendRecord(parsed.latestSend)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core send operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestSend: isSendRecord(parsed.latestSend) ? parsed.latestSend : null,
    records: parsed.records.filter(isSendRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorRoots(): Promise<VantaPrivateCoreOperatorRootStateResponse> {
  const response = await fetch(getPrivateCoreRootStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core root operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    currentRecord?: unknown;
    currentRoot?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.currentRecord !== null &&
      parsed.currentRecord !== undefined &&
      !isRootRecord(parsed.currentRecord)) ||
    (parsed.currentRoot !== null &&
      parsed.currentRoot !== undefined &&
      typeof parsed.currentRoot !== "string") ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core root operator state endpoint returned invalid data.");
  }

  return {
    currentRecord: isRootRecord(parsed.currentRecord) ? parsed.currentRecord : null,
    stateVersion: 1,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    records: parsed.records.filter(isRootRecord),
  };
}

function getPrivateCoreConsumeStateUrl() {
  return new URL("/state/private-core-consumes", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreProofStateUrl() {
  return new URL("/state/private-core-proofs", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendProofStateUrl() {
  return new URL("/state/private-core-send-proofs", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSendStateUrl() {
  return new URL("/state/private-core-sends", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreReleaseStateUrl() {
  return new URL("/state/private-core-releases", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreRootStateUrl() {
  return new URL("/state/private-core-roots", liveShieldAsset.unshieldOperatorUrl).toString();
}

function getPrivateCoreSummaryStateUrl() {
  return new URL("/state/private-core-summary", liveShieldAsset.unshieldOperatorUrl).toString();
}

export async function fetchVantaPrivateCoreOperatorReleases(): Promise<
  VantaPrivateCoreOperatorReleaseStateResponse
> {
  const response = await fetch(getPrivateCoreReleaseStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core release operator state endpoint failed.");
  }

  const parsed = (await response.json()) as {
    latestRelease?: unknown;
    records?: unknown;
    stateVersion?: unknown;
  };
  if (
    parsed.stateVersion !== 1 ||
    (parsed.latestRelease !== null &&
      parsed.latestRelease !== undefined &&
      !isReleaseRecord(parsed.latestRelease)) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error("The private-core release operator state endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    latestRelease: isReleaseRecord(parsed.latestRelease) ? parsed.latestRelease : null,
    records: parsed.records.filter(isReleaseRecord),
  };
}

export async function fetchVantaPrivateCoreOperatorSummary(): Promise<
  VantaPrivateCoreOperatorSummaryStateResponse
> {
  const response = await fetch(getPrivateCoreSummaryStateUrl(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "The private-core operator summary endpoint failed.");
  }

  const parsed = (await response.json()) as {
    stateVersion?: unknown;
    summaryVersion?: unknown;
    boundaryStatus?: unknown;
    boundaryNote?: unknown;
    currentRootLinkedProof?: unknown;
    currentRootProofLinkStatus?: unknown;
    sendResultingRootLinkedProof?: unknown;
    sendResultingRootRecord?: unknown;
    sendResultingRootStatus?: unknown;
    sendResultingRootNote?: unknown;
    sendResultingRootRegistrationStatus?: unknown;
    sendResultingRootRegistrationNote?: unknown;
    sendResultingRootProofLinkStatus?: unknown;
    supportedSendLaneKind?: unknown;
    supportedSendLaneNote?: unknown;
    supportedSendLaneStatus?: unknown;
    supportedSendLaneVersion?: unknown;
    supportedUnshieldLaneKind?: unknown;
    supportedUnshieldLaneNote?: unknown;
    supportedUnshieldLaneStatus?: unknown;
    supportedUnshieldLaneVersion?: unknown;
    supportedReleaseLaneKind?: unknown;
    supportedReleaseLaneNote?: unknown;
    supportedReleaseLaneStatus?: unknown;
    supportedReleaseLaneVersion?: unknown;
    supportedFlowKind?: unknown;
    supportedFlowNote?: unknown;
    supportedFlowStatus?: unknown;
    supportedFlowVersion?: unknown;
    supportedAssetSymbol?: unknown;
    supportedEnvironment?: unknown;
    supportedNoteSchema?: unknown;
    supportedNoteVersion?: unknown;
    supportedRootRegistrationProvenance?: unknown;
    supportedSendResultingRootBasis?: unknown;
    supportedRecipientModel?: unknown;
    supportedReleaseDestinationModel?: unknown;
    supportedProofSystem?: unknown;
    supportedUnshieldCircuit?: unknown;
    supportedSendCircuit?: unknown;
    supportedUnshieldMerkleDepth?: unknown;
    supportedSendMerkleDepth?: unknown;
    supportedReleaseAuthorizationBasis?: unknown;
    supportedReleaseRootPolicy?: unknown;
    ownerAuthorizationMode?: unknown;
    nullifierKeyMode?: unknown;
    provingHashLane?: unknown;
    generatedAt?: unknown;
    currentRoot?: unknown;
    currentRecord?: unknown;
    rootRecords?: unknown;
    latestProof?: unknown;
    proofRecords?: unknown;
    latestSendProof?: unknown;
    sendProofRecords?: unknown;
    latestSendLinkedProof?: unknown;
    latestSend?: unknown;
    sendRecords?: unknown;
    latestConsume?: unknown;
    consumeRecords?: unknown;
    latestConsumeProof?: unknown;
    latestRelease?: unknown;
    releaseRecords?: unknown;
    latestReleaseProof?: unknown;
    rootRecordCount?: unknown;
    proofRecordCount?: unknown;
    sendProofRecordCount?: unknown;
    sendRecordCount?: unknown;
    consumeRecordCount?: unknown;
    releaseRecordCount?: unknown;
    proofSendLinkStatus?: unknown;
    proofConsumeLinkStatus?: unknown;
    proofReleaseLinkStatus?: unknown;
  };

  if (
    parsed.stateVersion !== 1 ||
    parsed.summaryVersion !== 16 ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    typeof parsed.boundaryNote !== "string" ||
    (parsed.currentRootLinkedProof !== null &&
      parsed.currentRootLinkedProof !== undefined &&
      !isProofRecord(parsed.currentRootLinkedProof)) ||
    !isLinkStatus(parsed.currentRootProofLinkStatus) ||
    (parsed.sendResultingRootLinkedProof !== null &&
      parsed.sendResultingRootLinkedProof !== undefined &&
      !isProofRecord(parsed.sendResultingRootLinkedProof)) ||
    (parsed.sendResultingRootRecord !== null &&
      parsed.sendResultingRootRecord !== undefined &&
      !isRootRecord(parsed.sendResultingRootRecord)) ||
    !isSendResultingRootStatus(parsed.sendResultingRootStatus) ||
    typeof parsed.sendResultingRootNote !== "string" ||
    !isSendResultingRootRegistrationStatus(parsed.sendResultingRootRegistrationStatus) ||
    typeof parsed.sendResultingRootRegistrationNote !== "string" ||
    !isLinkStatus(parsed.sendResultingRootProofLinkStatus) ||
    parsed.supportedSendLaneVersion !== 1 ||
    parsed.supportedSendLaneKind !== "single-input-single-recipient-optional-change" ||
    parsed.supportedSendLaneStatus !== "supported" ||
    typeof parsed.supportedSendLaneNote !== "string" ||
    parsed.supportedUnshieldLaneVersion !== 1 ||
    parsed.supportedUnshieldLaneKind !== "single-note-proof-backed-consume" ||
    parsed.supportedUnshieldLaneStatus !== "supported" ||
    typeof parsed.supportedUnshieldLaneNote !== "string" ||
    parsed.supportedReleaseLaneVersion !== 1 ||
    parsed.supportedReleaseLaneKind !== "proof-backed-consume-latest-registered-root" ||
    parsed.supportedReleaseLaneStatus !== "supported" ||
    typeof parsed.supportedReleaseLaneNote !== "string" ||
    parsed.supportedFlowVersion !== 1 ||
    parsed.supportedFlowKind !== "shield-hold-send-unshield-replay-guard" ||
    parsed.supportedFlowStatus !== "supported" ||
    typeof parsed.supportedFlowNote !== "string" ||
    parsed.supportedAssetSymbol !== "VUSD" ||
    parsed.supportedEnvironment !== "solana-devnet" ||
    parsed.supportedNoteSchema !== "note-v0" ||
    parsed.supportedNoteVersion !== 0 ||
    parsed.supportedRootRegistrationProvenance !==
      "shield-input|send-recipient-output|send-change-output" ||
    parsed.supportedSendResultingRootBasis !== "client-declared" ||
    parsed.supportedRecipientModel !== "hashed-reference-to-owner-key" ||
    parsed.supportedReleaseDestinationModel !== "32-byte-release-destination-field" ||
    parsed.supportedProofSystem !== "noir-acir-ultrahonk-bbjs" ||
    parsed.supportedUnshieldCircuit !== "vanta_private_core_single_note_unshield" ||
    parsed.supportedSendCircuit !== "vanta_private_core_single_note_send" ||
    parsed.supportedUnshieldMerkleDepth !== 3 ||
    parsed.supportedSendMerkleDepth !== 3 ||
    parsed.supportedReleaseAuthorizationBasis !== "proof-backed-consume" ||
    parsed.supportedReleaseRootPolicy !== "latest-registered-root" ||
    parsed.ownerAuthorizationMode !== "x25519-secret-prechecked-off-circuit" ||
    parsed.nullifierKeyMode !== "note-secret-as-nullifier-key-v0" ||
    parsed.provingHashLane !== "poseidon-bn254-proving-lane-v0" ||
    typeof parsed.generatedAt !== "number" ||
    (parsed.currentRoot !== null &&
      parsed.currentRoot !== undefined &&
      typeof parsed.currentRoot !== "string") ||
    (parsed.currentRecord !== null &&
      parsed.currentRecord !== undefined &&
      !isRootRecord(parsed.currentRecord)) ||
    !Array.isArray(parsed.rootRecords) ||
    (parsed.latestProof !== null &&
      parsed.latestProof !== undefined &&
      !isProofRecord(parsed.latestProof)) ||
    !Array.isArray(parsed.proofRecords) ||
    (parsed.latestSendProof !== null &&
      parsed.latestSendProof !== undefined &&
      !isSendProofRecord(parsed.latestSendProof)) ||
    !Array.isArray(parsed.sendProofRecords) ||
    (parsed.latestSendLinkedProof !== null &&
      parsed.latestSendLinkedProof !== undefined &&
      !isSendProofRecord(parsed.latestSendLinkedProof)) ||
    (parsed.latestSend !== null &&
      parsed.latestSend !== undefined &&
      !isSendRecord(parsed.latestSend)) ||
    !Array.isArray(parsed.sendRecords) ||
    (parsed.latestConsume !== null &&
      parsed.latestConsume !== undefined &&
      !isConsumeRecord(parsed.latestConsume)) ||
    !Array.isArray(parsed.consumeRecords) ||
    (parsed.latestConsumeProof !== null &&
      parsed.latestConsumeProof !== undefined &&
      !isProofRecord(parsed.latestConsumeProof)) ||
    (parsed.latestRelease !== null &&
      parsed.latestRelease !== undefined &&
      !isReleaseRecord(parsed.latestRelease)) ||
    !Array.isArray(parsed.releaseRecords) ||
    (parsed.latestReleaseProof !== null &&
      parsed.latestReleaseProof !== undefined &&
      !isProofRecord(parsed.latestReleaseProof)) ||
    typeof parsed.rootRecordCount !== "number" ||
    typeof parsed.proofRecordCount !== "number" ||
    typeof parsed.sendProofRecordCount !== "number" ||
    typeof parsed.sendRecordCount !== "number" ||
    typeof parsed.consumeRecordCount !== "number" ||
    typeof parsed.releaseRecordCount !== "number" ||
    !isLinkStatus(parsed.proofSendLinkStatus) ||
    !isLinkStatus(parsed.proofConsumeLinkStatus) ||
    !isLinkStatus(parsed.proofReleaseLinkStatus)
  ) {
    throw new Error("The private-core operator summary endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    summaryVersion: 16,
    boundaryStatus: parsed.boundaryStatus,
    boundaryNote: parsed.boundaryNote,
    supportedSendLaneVersion: 1,
    supportedSendLaneKind: "single-input-single-recipient-optional-change",
    supportedSendLaneStatus: "supported",
    supportedSendLaneNote: parsed.supportedSendLaneNote,
    supportedUnshieldLaneVersion: 1,
    supportedUnshieldLaneKind: "single-note-proof-backed-consume",
    supportedUnshieldLaneStatus: "supported",
    supportedUnshieldLaneNote: parsed.supportedUnshieldLaneNote,
    supportedReleaseLaneVersion: 1,
    supportedReleaseLaneKind: "proof-backed-consume-latest-registered-root",
    supportedReleaseLaneStatus: "supported",
    supportedReleaseLaneNote: parsed.supportedReleaseLaneNote,
    supportedFlowVersion: 1,
    supportedFlowKind: "shield-hold-send-unshield-replay-guard",
    supportedFlowStatus: "supported",
    supportedFlowNote: parsed.supportedFlowNote,
    supportedAssetSymbol: "VUSD",
    supportedEnvironment: "solana-devnet",
    supportedNoteSchema: "note-v0",
    supportedNoteVersion: 0,
    supportedRootRegistrationProvenance:
      "shield-input|send-recipient-output|send-change-output",
    supportedSendResultingRootBasis: "client-declared",
    supportedRecipientModel: "hashed-reference-to-owner-key",
    supportedReleaseDestinationModel: "32-byte-release-destination-field",
    supportedProofSystem: "noir-acir-ultrahonk-bbjs",
    supportedUnshieldCircuit: "vanta_private_core_single_note_unshield",
    supportedSendCircuit: "vanta_private_core_single_note_send",
    supportedUnshieldMerkleDepth: 3,
    supportedSendMerkleDepth: 3,
    supportedReleaseAuthorizationBasis: "proof-backed-consume",
    supportedReleaseRootPolicy: "latest-registered-root",
    ownerAuthorizationMode: "x25519-secret-prechecked-off-circuit",
    nullifierKeyMode: "note-secret-as-nullifier-key-v0",
    provingHashLane: "poseidon-bn254-proving-lane-v0",
    currentRootLinkedProof: isProofRecord(parsed.currentRootLinkedProof)
      ? parsed.currentRootLinkedProof
      : null,
    currentRootProofLinkStatus: parsed.currentRootProofLinkStatus,
    sendResultingRootLinkedProof: isProofRecord(parsed.sendResultingRootLinkedProof)
      ? parsed.sendResultingRootLinkedProof
      : null,
    sendResultingRootRecord: isRootRecord(parsed.sendResultingRootRecord)
      ? parsed.sendResultingRootRecord
      : null,
    sendResultingRootStatus: parsed.sendResultingRootStatus,
    sendResultingRootNote: parsed.sendResultingRootNote,
    sendResultingRootRegistrationStatus: parsed.sendResultingRootRegistrationStatus,
    sendResultingRootRegistrationNote: parsed.sendResultingRootRegistrationNote,
    sendResultingRootProofLinkStatus: parsed.sendResultingRootProofLinkStatus,
    generatedAt: parsed.generatedAt,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    currentRecord: isRootRecord(parsed.currentRecord) ? parsed.currentRecord : null,
    rootRecords: parsed.rootRecords.filter(isRootRecord),
    latestProof: isProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    proofRecords: parsed.proofRecords.filter(isProofRecord),
    latestSendProof: isSendProofRecord(parsed.latestSendProof) ? parsed.latestSendProof : null,
    sendProofRecords: parsed.sendProofRecords.filter(isSendProofRecord),
    latestSendLinkedProof: isSendProofRecord(parsed.latestSendLinkedProof)
      ? parsed.latestSendLinkedProof
      : null,
    latestSend: isSendRecord(parsed.latestSend) ? parsed.latestSend : null,
    sendRecords: parsed.sendRecords.filter(isSendRecord),
    latestConsume: isConsumeRecord(parsed.latestConsume) ? parsed.latestConsume : null,
    consumeRecords: parsed.consumeRecords.filter(isConsumeRecord),
    latestConsumeProof: isProofRecord(parsed.latestConsumeProof) ? parsed.latestConsumeProof : null,
    latestRelease: isReleaseRecord(parsed.latestRelease) ? parsed.latestRelease : null,
    releaseRecords: parsed.releaseRecords.filter(isReleaseRecord),
    latestReleaseProof: isProofRecord(parsed.latestReleaseProof) ? parsed.latestReleaseProof : null,
    rootRecordCount: parsed.rootRecordCount,
    proofRecordCount: parsed.proofRecordCount,
    sendProofRecordCount: parsed.sendProofRecordCount,
    sendRecordCount: parsed.sendRecordCount,
    consumeRecordCount: parsed.consumeRecordCount,
    releaseRecordCount: parsed.releaseRecordCount,
    proofSendLinkStatus: parsed.proofSendLinkStatus,
    proofConsumeLinkStatus: parsed.proofConsumeLinkStatus,
    proofReleaseLinkStatus: parsed.proofReleaseLinkStatus,
  };
}

function isConsumeRecord(value: unknown): value is VantaPrivateCoreOperatorConsumeRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorConsumeRecord).root === "string"
  );
}

function isProofRecord(value: unknown): value is VantaPrivateCoreOperatorProofRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (((value as VantaPrivateCoreOperatorProofRecord).action === "consume" ||
      (value as VantaPrivateCoreOperatorProofRecord).action === "proof-only" ||
      (value as VantaPrivateCoreOperatorProofRecord).action === "register-root")) &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).backend === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).circuit === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).proofVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).provingHashLane === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorProofRecord).verified === "boolean"
  );
}

function isRootRecord(value: unknown): value is VantaPrivateCoreOperatorRootRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    ((value as VantaPrivateCoreOperatorRootRecord).artifactBundleStatus === "complete" ||
      (value as VantaPrivateCoreOperatorRootRecord).artifactBundleStatus === "legacy-incomplete") &&
    (((value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === null ||
      (value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === undefined) ||
      typeof (value as VantaPrivateCoreOperatorRootRecord).artifactBundleVersion === "number") &&
    (((value as VantaPrivateCoreOperatorRootRecord).proofId === null ||
      (value as VantaPrivateCoreOperatorRootRecord).proofId === undefined) ||
      typeof (value as VantaPrivateCoreOperatorRootRecord).proofId === "string") &&
    ((value as VantaPrivateCoreOperatorRootRecord).registrationBasis === "shield-input" ||
      (value as VantaPrivateCoreOperatorRootRecord).registrationBasis ===
        "send-recipient-output" ||
      (value as VantaPrivateCoreOperatorRootRecord).registrationBasis === "send-change-output") &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).recordedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).source === "string"
  );
}

function isSendProofRecord(value: unknown): value is VantaPrivateCoreOperatorSendProofRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as VantaPrivateCoreOperatorSendProofRecord).action === "send-proof" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).backend === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).circuit === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).proofVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).provingHashLane === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).releaseDestination === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendProofRecord).verified === "boolean"
  );
}

function isSendRecord(value: unknown): value is VantaPrivateCoreOperatorSendRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).changeAmount === "string" &&
    (((value as VantaPrivateCoreOperatorSendRecord).changeCommitment === null ||
      (value as VantaPrivateCoreOperatorSendRecord).changeCommitment === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSendRecord).changeCommitment === "string") &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).inputNullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).inputRoot === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).noteVersion === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).recipientCommitment === "string" &&
    (value as VantaPrivateCoreOperatorSendRecord).resultingRootBasis === "client-declared" &&
    (((value as VantaPrivateCoreOperatorSendRecord).resultingRoot === null ||
      (value as VantaPrivateCoreOperatorSendRecord).resultingRoot === undefined) ||
      typeof (value as VantaPrivateCoreOperatorSendRecord).resultingRoot === "string") &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).sendAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorSendRecord).sendId === "string"
  );
}

function isReleaseRecord(value: unknown): value is VantaPrivateCoreOperatorReleaseRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).amount === "string" &&
    (value as VantaPrivateCoreOperatorReleaseRecord).authorizationBasis === "proof-backed-consume" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).consumedNoteId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releaseDestination === "string" &&
    (value as VantaPrivateCoreOperatorReleaseRecord).rootPolicy === "latest-registered-root" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releasedAssetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releasedAmount === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).requestId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).transitionNoteId === "string"
  );
}

function isLinkStatus(value: unknown): value is "linked" | "mismatch" | "unavailable" {
  return value === "linked" || value === "mismatch" || value === "unavailable";
}

function isBoundaryStatus(
  value: unknown,
): value is
  | "coherent"
  | "awaiting-current-root"
  | "root-registration-unlinked"
  | "send-root-registration-unlinked"
  | "send-root-output-mismatch"
  | "proof-send-unlinked"
  | "proof-consume-unlinked"
  | "proof-release-unlinked" {
  return (
    value === "coherent" ||
    value === "awaiting-current-root" ||
    value === "root-registration-unlinked" ||
    value === "send-root-registration-unlinked" ||
    value === "send-root-output-mismatch" ||
    value === "proof-send-unlinked" ||
    value === "proof-consume-unlinked" ||
    value === "proof-release-unlinked"
  );
}

function isSendResultingRootStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendResultingRootStatus"] {
  return (
    value === "unavailable" ||
    value === "missing" ||
    value === "current-root" ||
    value === "registered-stale" ||
    value === "downstream-consumed" ||
    value === "downstream-released" ||
    value === "unregistered"
  );
}

function isSendResultingRootRegistrationStatus(
  value: unknown,
): value is VantaPrivateCoreOperatorSummaryStateResponse["sendResultingRootRegistrationStatus"] {
  return (
    value === "unavailable" ||
    value === "linked-recipient-output" ||
    value === "linked-change-output" ||
    value === "mismatch"
  );
}
