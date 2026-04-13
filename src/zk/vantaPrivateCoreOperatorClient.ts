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

export type VantaPrivateCoreConsumeOperatorResponse = VantaPrivateCoreProofOperatorResponse & {
  completedAt: number;
  leafIndex: string | null;
  releaseDestination: string;
  proofId: string;
  releaseRecorded: boolean;
  releaseRequestId: string;
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

export type VantaPrivateCoreOperatorReleaseRecord = {
  assetId: string;
  amount: string;
  completedAt: number;
  consumedNoteId: string;
  nullifier: string;
  proofFieldCount: number;
  proofId: string;
  publicInputCount: number;
  releaseDestination: string;
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
    | "proof-consume-unlinked"
    | "proof-release-unlinked";
  generatedAt: number;
  stateVersion: number;
  summaryVersion: number;
  currentRoot: string | null;
  currentRecord: VantaPrivateCoreOperatorRootRecord | null;
  rootRecords: VantaPrivateCoreOperatorRootRecord[];
  latestProof: VantaPrivateCoreOperatorProofRecord | null;
  proofRecords: VantaPrivateCoreOperatorProofRecord[];
  latestConsume: VantaPrivateCoreOperatorConsumeRecord | null;
  consumeRecords: VantaPrivateCoreOperatorConsumeRecord[];
  latestConsumeProof: VantaPrivateCoreOperatorProofRecord | null;
  latestRelease: VantaPrivateCoreOperatorReleaseRecord | null;
  releaseRecords: VantaPrivateCoreOperatorReleaseRecord[];
  latestReleaseProof: VantaPrivateCoreOperatorProofRecord | null;
  rootRecordCount: number;
  proofRecordCount: number;
  consumeRecordCount: number;
  releaseRecordCount: number;
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
    typeof parsed.releaseDestination !== "string" ||
    typeof parsed.proofId !== "string" ||
    parsed.releaseRecorded !== true ||
    typeof parsed.releaseRequestId !== "string" ||
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
    completedAt: parsed.completedAt,
    leafIndex: parsed.leafIndex ?? null,
    proofId: parsed.proofId,
    releaseDestination: parsed.releaseDestination,
    releaseRecorded: true,
    releaseRequestId: parsed.releaseRequestId,
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
    generatedAt?: unknown;
    currentRoot?: unknown;
    currentRecord?: unknown;
    rootRecords?: unknown;
    latestProof?: unknown;
    proofRecords?: unknown;
    latestConsume?: unknown;
    consumeRecords?: unknown;
    latestConsumeProof?: unknown;
    latestRelease?: unknown;
    releaseRecords?: unknown;
    latestReleaseProof?: unknown;
    rootRecordCount?: unknown;
    proofRecordCount?: unknown;
    consumeRecordCount?: unknown;
    releaseRecordCount?: unknown;
    proofConsumeLinkStatus?: unknown;
    proofReleaseLinkStatus?: unknown;
  };

  if (
    parsed.stateVersion !== 1 ||
    parsed.summaryVersion !== 1 ||
    !isBoundaryStatus(parsed.boundaryStatus) ||
    typeof parsed.boundaryNote !== "string" ||
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
    typeof parsed.consumeRecordCount !== "number" ||
    typeof parsed.releaseRecordCount !== "number" ||
    !isLinkStatus(parsed.proofConsumeLinkStatus) ||
    !isLinkStatus(parsed.proofReleaseLinkStatus)
  ) {
    throw new Error("The private-core operator summary endpoint returned invalid data.");
  }

  return {
    stateVersion: 1,
    summaryVersion: 1,
    boundaryStatus: parsed.boundaryStatus,
    boundaryNote: parsed.boundaryNote,
    generatedAt: parsed.generatedAt,
    currentRoot: typeof parsed.currentRoot === "string" ? parsed.currentRoot : null,
    currentRecord: isRootRecord(parsed.currentRecord) ? parsed.currentRecord : null,
    rootRecords: parsed.rootRecords.filter(isRootRecord),
    latestProof: isProofRecord(parsed.latestProof) ? parsed.latestProof : null,
    proofRecords: parsed.proofRecords.filter(isProofRecord),
    latestConsume: isConsumeRecord(parsed.latestConsume) ? parsed.latestConsume : null,
    consumeRecords: parsed.consumeRecords.filter(isConsumeRecord),
    latestConsumeProof: isProofRecord(parsed.latestConsumeProof) ? parsed.latestConsumeProof : null,
    latestRelease: isReleaseRecord(parsed.latestRelease) ? parsed.latestRelease : null,
    releaseRecords: parsed.releaseRecords.filter(isReleaseRecord),
    latestReleaseProof: isProofRecord(parsed.latestReleaseProof) ? parsed.latestReleaseProof : null,
    rootRecordCount: parsed.rootRecordCount,
    proofRecordCount: parsed.proofRecordCount,
    consumeRecordCount: parsed.consumeRecordCount,
    releaseRecordCount: parsed.releaseRecordCount,
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
    typeof (value as VantaPrivateCoreOperatorRootRecord).recordedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).root === "string" &&
    typeof (value as VantaPrivateCoreOperatorRootRecord).source === "string"
  );
}

function isReleaseRecord(value: unknown): value is VantaPrivateCoreOperatorReleaseRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).assetId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).amount === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).completedAt === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).consumedNoteId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).nullifier === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofFieldCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).proofId === "string" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).publicInputCount === "number" &&
    typeof (value as VantaPrivateCoreOperatorReleaseRecord).releaseDestination === "string" &&
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
): value is "coherent" | "awaiting-current-root" | "proof-consume-unlinked" | "proof-release-unlinked" {
  return (
    value === "coherent" ||
    value === "awaiting-current-root" ||
    value === "proof-consume-unlinked" ||
    value === "proof-release-unlinked"
  );
}
