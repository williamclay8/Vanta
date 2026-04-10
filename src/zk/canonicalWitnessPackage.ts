import {
  type CanonicalCandidateMerkleMembershipPath,
  getCanonicalLifecycleCandidateMerkleMembershipPath,
  getCanonicalLifecycleMembership,
  inspectCanonicalLifecycleCandidateTreeAgreement,
  inspectCanonicalLifecycleMembershipRootReconciliation,
} from "./canonicalMembership";
import {
  findCanonicalConsumptionForLifecycleNode,
  getCanonicalLifecycleSpendStatus,
} from "./canonicalSpendStatus";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalSwapRecords } from "./liveSwapBridge";
import { listCanonicalUnshieldRecords } from "./liveUnshieldBridge";

export type CanonicalLifecycleWitnessPackageReadiness =
  | "ready"
  | "partial"
  | "legacy"
  | "unavailable";

export type CanonicalLifecycleWitnessPackage = {
  kind: "vanta-canonical-lifecycle-witness-package-v1";
  version: 1;
  readiness: CanonicalLifecycleWitnessPackageReadiness;
  lifecycleId?: string;
  lineageId?: string;
  sourceKind?: "shield" | "send" | "swap" | "unshield";
  sourceRecordId?: string;
  predecessorLifecycleId?: string;
  spendStatus: ReturnType<typeof getCanonicalLifecycleSpendStatus>["spendStatus"];
  spendCapability: ReturnType<typeof getCanonicalLifecycleSpendStatus>["spendCapability"];
  nullifierReady: boolean;
  canonicalConsumption?: {
    consumptionId: string;
    consumptionKind: "send" | "swap" | "unshield";
    recordLifecycleId: string;
    consumptionBasis: string;
    nullifierStub: string;
    consumedNullifierBasis: string;
    producedLifecycleIds: string[];
    exitLifecycleId?: string;
  };
  membership: {
    readiness: ReturnType<typeof getCanonicalLifecycleMembership>["readiness"];
    commitment?: string;
    insertionIndex?: number;
    snapshotRoot?: string;
    snapshotLeafCount?: number;
  };
  futureRootSeam?: {
    scheme?: string;
    value?: string;
    snapshotRoot?: string;
    snapshotLeafCount?: number;
  };
  candidateMerklePath?: CanonicalCandidateMerkleMembershipPath;
  candidateAgreementStatus: ReturnType<typeof inspectCanonicalLifecycleCandidateTreeAgreement>["status"];
  candidateAgreementReady: boolean;
  missingComponents: string[];
};

export type CanonicalLifecycleWitnessPackageInspection = {
  package: CanonicalLifecycleWitnessPackage;
  hasLifecycleIdentity: boolean;
  hasLineageIdentity: boolean;
  hasPredecessorLinkage: boolean;
  hasCanonicalConsumption: boolean;
  hasConsumptionBasis: boolean;
  hasNullifierStub: boolean;
  hasCommitment: boolean;
  hasInsertionIndex: boolean;
  hasSnapshotContext: boolean;
  hasFutureRootSeam: boolean;
  hasCandidateMerklePath: boolean;
  candidatePathDepth?: number;
  candidatePathLevelCount?: number;
  missingComponentsSummary: string;
};

export function assembleCanonicalLifecycleWitnessPackage(
  lifecycleId: string | undefined,
): CanonicalLifecycleWitnessPackage {
  const normalizedLifecycleId = lifecycleId?.trim();

  if (!normalizedLifecycleId) {
    return {
      kind: "vanta-canonical-lifecycle-witness-package-v1",
      version: 1,
      readiness: "unavailable",
      lifecycleId: normalizedLifecycleId,
      spendStatus: "legacy",
      spendCapability: "legacy",
      nullifierReady: false,
      membership: {
        readiness: "legacy",
      },
      candidateAgreementStatus: "unavailable",
      candidateAgreementReady: false,
      missingComponents: ["lifecycle-id"],
    };
  }

  const nodeContext = resolveLifecycleNodeContext(normalizedLifecycleId);
  const spendStatus = getCanonicalLifecycleSpendStatus(normalizedLifecycleId);
  const consumption = findCanonicalConsumptionForLifecycleNode(normalizedLifecycleId);
  const membership = getCanonicalLifecycleMembership(normalizedLifecycleId);
  const candidateMerklePath = getCanonicalLifecycleCandidateMerkleMembershipPath(normalizedLifecycleId);
  const candidateAgreement = inspectCanonicalLifecycleCandidateTreeAgreement(normalizedLifecycleId);
  const rootReconciliation = inspectCanonicalLifecycleMembershipRootReconciliation(normalizedLifecycleId);

  const missingComponents: string[] = [];

  if (!nodeContext) {
    missingComponents.push("node-context");
  }

  if (!membership.commitment?.value) {
    missingComponents.push("commitment");
  }

  if (membership.insertionIndex === undefined) {
    missingComponents.push("insertion-index");
  }

  if (!candidateMerklePath) {
    missingComponents.push("candidate-merkle-path");
  }

  if (!rootReconciliation.futureRootValue) {
    missingComponents.push("future-root-seam");
  }

  if (candidateAgreement.status !== "match") {
    missingComponents.push(`candidate-agreement:${candidateAgreement.status}`);
  }

  const readiness = determineWitnessPackageReadiness({
    lifecycleId: normalizedLifecycleId,
    nodeFound: Boolean(nodeContext),
    spendStatus: spendStatus.spendStatus,
    membershipReadiness: membership.readiness,
    candidateAgreementStatus: candidateAgreement.status,
    hasCandidateMerklePath: Boolean(candidateMerklePath),
    hasFutureRootSeam: Boolean(rootReconciliation.futureRootValue),
  });

  return {
    kind: "vanta-canonical-lifecycle-witness-package-v1",
    version: 1,
    readiness,
    lifecycleId: normalizedLifecycleId,
    lineageId: nodeContext?.lineageId ?? spendStatus.lineageId ?? membership.lineageId,
    sourceKind: nodeContext?.sourceKind,
    sourceRecordId: nodeContext?.sourceRecordId,
    predecessorLifecycleId: nodeContext?.predecessorLifecycleId,
    spendStatus: spendStatus.spendStatus,
    spendCapability: spendStatus.spendCapability,
    nullifierReady: spendStatus.nullifierReady,
    canonicalConsumption: consumption
      ? {
          consumptionId: consumption.consumptionId,
          consumptionKind: consumption.consumptionKind,
          recordLifecycleId: consumption.recordLifecycleId,
          consumptionBasis: consumption.consumptionBasis.value,
          nullifierStub: consumption.nullifierStub.value,
          consumedNullifierBasis: consumption.consumedNullifierBasis.value,
          producedLifecycleIds: consumption.producedLifecycleIds,
          exitLifecycleId: consumption.exitLifecycleId,
        }
      : undefined,
    membership: {
      readiness: membership.readiness,
      commitment: membership.commitment?.value,
      insertionIndex: membership.insertionIndex,
      snapshotRoot: membership.snapshotRoot,
      snapshotLeafCount: membership.snapshotLeafCount,
    },
    futureRootSeam: {
      scheme: rootReconciliation.futureRootScheme,
      value: rootReconciliation.futureRootValue,
      snapshotRoot: rootReconciliation.futureRootSnapshotRoot,
      snapshotLeafCount: rootReconciliation.futureRootSnapshotLeafCount,
    },
    candidateMerklePath,
    candidateAgreementStatus: candidateAgreement.status,
    candidateAgreementReady: candidateAgreement.agreementReady,
    missingComponents,
  };
}

export function getCanonicalLifecycleWitnessPackageReadiness(
  lifecycleId: string | undefined,
): CanonicalLifecycleWitnessPackageReadiness {
  return assembleCanonicalLifecycleWitnessPackage(lifecycleId).readiness;
}

export function inspectCanonicalLifecycleWitnessPackage(
  lifecycleId: string | undefined,
): CanonicalLifecycleWitnessPackageInspection {
  const witnessPackage = assembleCanonicalLifecycleWitnessPackage(lifecycleId);

  return {
    package: witnessPackage,
    hasLifecycleIdentity: Boolean(witnessPackage.lifecycleId),
    hasLineageIdentity: Boolean(witnessPackage.lineageId),
    hasPredecessorLinkage: Boolean(witnessPackage.predecessorLifecycleId),
    hasCanonicalConsumption: Boolean(witnessPackage.canonicalConsumption),
    hasConsumptionBasis: Boolean(witnessPackage.canonicalConsumption?.consumptionBasis),
    hasNullifierStub: Boolean(witnessPackage.canonicalConsumption?.nullifierStub),
    hasCommitment: Boolean(witnessPackage.membership.commitment),
    hasInsertionIndex: witnessPackage.membership.insertionIndex !== undefined,
    hasSnapshotContext: Boolean(
      witnessPackage.membership.snapshotRoot &&
        witnessPackage.membership.snapshotLeafCount !== undefined,
    ),
    hasFutureRootSeam: Boolean(witnessPackage.futureRootSeam?.value),
    hasCandidateMerklePath: Boolean(witnessPackage.candidateMerklePath),
    candidatePathDepth: witnessPackage.candidateMerklePath?.depth,
    candidatePathLevelCount: witnessPackage.candidateMerklePath?.path.length,
    missingComponentsSummary:
      witnessPackage.missingComponents.length > 0
        ? witnessPackage.missingComponents.join(" · ")
        : "No missing components",
  };
}

function determineWitnessPackageReadiness(args: {
  lifecycleId?: string;
  nodeFound: boolean;
  spendStatus: ReturnType<typeof getCanonicalLifecycleSpendStatus>["spendStatus"];
  membershipReadiness: ReturnType<typeof getCanonicalLifecycleMembership>["readiness"];
  candidateAgreementStatus: ReturnType<typeof inspectCanonicalLifecycleCandidateTreeAgreement>["status"];
  hasCandidateMerklePath: boolean;
  hasFutureRootSeam: boolean;
}): CanonicalLifecycleWitnessPackageReadiness {
  if (!args.lifecycleId || !args.nodeFound) {
    return args.spendStatus === "legacy" && args.membershipReadiness === "legacy"
      ? "legacy"
      : "unavailable";
  }

  if (args.spendStatus === "legacy" && args.membershipReadiness === "legacy") {
    return "legacy";
  }

  if (
    args.membershipReadiness === "ready" &&
    args.hasCandidateMerklePath &&
    args.hasFutureRootSeam &&
    args.candidateAgreementStatus === "match"
  ) {
    return "ready";
  }

  return "partial";
}

function resolveLifecycleNodeContext(lifecycleId: string) {
  for (const record of listCanonicalShieldRecords()) {
    if (record.lifecycleLinkage?.outputLifecycleIds[0] === lifecycleId) {
      return {
        lifecycleId,
        lineageId: record.lifecycleLinkage.lineageId,
        sourceKind: "shield" as const,
        sourceRecordId: record.recordId,
      };
    }
  }

  for (const record of listCanonicalSendRecords()) {
    for (const successor of record.successors) {
      if (successor.lifecycle?.lifecycleId === lifecycleId) {
        return {
          lifecycleId,
          lineageId: successor.lifecycle.lineageId,
          predecessorLifecycleId: successor.lifecycle.predecessorLifecycleId,
          sourceKind: "send" as const,
          sourceRecordId: record.recordId,
        };
      }
    }
  }

  for (const record of listCanonicalSwapRecords()) {
    if (record.outputSuccessor.lifecycle?.lifecycleId === lifecycleId) {
      return {
        lifecycleId,
        lineageId: record.outputSuccessor.lifecycle.lineageId,
        predecessorLifecycleId: record.outputSuccessor.lifecycle.predecessorLifecycleId,
        sourceKind: "swap" as const,
        sourceRecordId: record.recordId,
      };
    }
  }

  for (const record of listCanonicalUnshieldRecords()) {
    if (record.lifecycleLinkage?.endpointLifecycleId === lifecycleId) {
      return {
        lifecycleId,
        lineageId: record.lifecycleLinkage.lineageId,
        predecessorLifecycleId: record.lifecycleLinkage.predecessorLifecycleId,
        sourceKind: "unshield" as const,
        sourceRecordId: record.recordId,
      };
    }
  }

  return undefined;
}
