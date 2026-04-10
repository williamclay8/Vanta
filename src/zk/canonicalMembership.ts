import type { CanonicalNoteCommitment } from "./canonicalNote";
import {
  SHIELDED_STATE_ROOT_SCHEME_V1,
  type ShieldedCommitmentEntry,
} from "./shieldedState";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalSwapRecords } from "./liveSwapBridge";
import { listCanonicalUnshieldRecords } from "./liveUnshieldBridge";

export type CanonicalLifecycleMembershipReadiness = "ready" | "partial" | "unavailable" | "legacy";

export const CANONICAL_MEMBERSHIP_PATH_KIND_V1 =
  "vanta-append-only-snapshot-derived-path-v1" as const;
export const CANONICAL_MEMBERSHIP_PARENT_DIGEST_SCHEME_V1 =
  "fnv1a64-provisional-append-only-parent-digest-v1" as const;
export const CANONICAL_MEMBERSHIP_ROOT_RECONCILIATION_SCHEME_V1 =
  "vanta-membership-root-reconciliation-v1" as const;
export const CANONICAL_MEMBERSHIP_FUTURE_ROOT_SEAM_KIND_V1 =
  "vanta-upgrade-candidate-root-seam-v1" as const;
export const CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_KIND_V1 =
  "vanta-candidate-merkle-style-root-v1" as const;
export const CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1 =
  "fnv1a64-candidate-merkle-style-root-v1" as const;

export type CanonicalMembershipPathLevel = {
  level: number;
  direction: "left" | "right";
  nodeStartIndex: number;
  nodeEndIndex: number;
  siblingStartIndex?: number;
  siblingEndIndex?: number;
  siblingLeafIndexes: number[];
  siblingCommitments: string[];
  siblingState: "occupied" | "missing";
  digestScheme: typeof CANONICAL_MEMBERSHIP_PARENT_DIGEST_SCHEME_V1;
  nodeDigest: string;
  siblingDigest: string;
  leftChildDigest: string;
  rightChildDigest: string;
  parentDigest: string;
};

export type CanonicalDerivedMembershipPath = {
  kind: typeof CANONICAL_MEMBERSHIP_PATH_KIND_V1;
  version: 1;
  semantics: "append-only-snapshot-derived";
  digestScheme: typeof CANONICAL_MEMBERSHIP_PARENT_DIGEST_SCHEME_V1;
  leafIndex: number;
  leafCommitment: string;
  root: string;
  leafCount: number;
  depth: number;
  levels: CanonicalMembershipPathLevel[];
  rootLikeDigest: string;
};

export type CanonicalCandidateMerklePathLevel = {
  level: number;
  siblingPosition: "left" | "right";
  siblingDigest: string;
  siblingSource: "occupied" | "derived-placeholder";
  parentDigest: string;
};

export type CanonicalCandidateMerkleMembershipPath = {
  kind: "vanta-candidate-merkle-style-path-v1";
  scheme: typeof CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1;
  leafIndex: number;
  leafCommitment: string;
  leafDigest: string;
  leafCount: number;
  depth: number;
  path: CanonicalCandidateMerklePathLevel[];
  candidateRoot: string;
  snapshotRoot?: string;
  childOrdering: "left-right";
  oddLeafBehavior: "carry-right-with-derived-placeholder";
};

export type CanonicalLifecycleMembershipRecord = {
  lifecycleId?: string;
  lineageId?: string;
  sourceKind?: "shield" | "send" | "swap" | "unshield";
  sourceRecordId?: string;
  nodeRole?: "origin" | "recipient" | "change" | "output" | "exit";
  readiness: CanonicalLifecycleMembershipReadiness;
  commitment?: CanonicalNoteCommitment;
  insertionIndex?: number;
  snapshotRoot?: string;
  snapshotLeafCount?: number;
  rootScheme?: typeof SHIELDED_STATE_ROOT_SCHEME_V1;
  membershipLinkedByLifecycle: boolean;
  derivedPath?: CanonicalDerivedMembershipPath;
  candidateMerklePath?: CanonicalCandidateMerkleMembershipPath;
};

export type CanonicalMembershipFutureRootSeam = {
  kind?: typeof CANONICAL_MEMBERSHIP_FUTURE_ROOT_SEAM_KIND_V1;
  scheme: string;
  value: string;
  sourceSemantics?: "candidate-merkle-style-root";
  snapshotLeafCount?: number;
  snapshotRoot?: string;
};

export type CanonicalMembershipCandidateMerkleRoot = {
  kind: typeof CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_KIND_V1;
  scheme: typeof CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1;
  value: string;
  leafCount: number;
  depth: number;
  childOrdering: "left-right";
  oddLeafBehavior: "carry-right-with-derived-placeholder";
  snapshotRoot?: string;
};

export type CanonicalMembershipRootReconciliationStatus =
  | "pending"
  | "match"
  | "mismatch"
  | "unavailable";

export type CanonicalMembershipRootReconciliation = {
  scheme: typeof CANONICAL_MEMBERSHIP_ROOT_RECONCILIATION_SCHEME_V1;
  status: CanonicalMembershipRootReconciliationStatus;
  reconciliationReady: boolean;
  currentRootLikeDigest?: string;
  futureRootScheme?: string;
  futureRootValue?: string;
  futureRootSourceKind?: typeof CANONICAL_MEMBERSHIP_FUTURE_ROOT_SEAM_KIND_V1;
  futureRootSnapshotLeafCount?: number;
  futureRootSnapshotRoot?: string;
};

export type CanonicalCandidateTreeAgreementStatus =
  | "match"
  | "root-mismatch"
  | "path-mismatch"
  | "scheme-mismatch"
  | "pending"
  | "unavailable"
  | "legacy";

export type CanonicalCandidateTreeAgreement = {
  status: CanonicalCandidateTreeAgreementStatus;
  agreementReady: boolean;
  candidatePathScheme?: string;
  candidatePathRoot?: string;
  candidateRootScheme?: string;
  candidateRootValue?: string;
  futureRootScheme?: string;
  futureRootValue?: string;
};

type RetainedMembershipEntry = ShieldedCommitmentEntry & {
  sourceKind: "shield" | "send" | "swap";
  sourceRecordId: string;
};

export function listCanonicalLifecycleMembershipRecords(): CanonicalLifecycleMembershipRecord[] {
  const entries = listAppendOnlyMembershipEntries();

  return [
    ...listCanonicalShieldRecords().map((record) => ({
      lifecycleId: record.lifecycleLinkage?.outputLifecycleIds[0],
      lineageId: record.lifecycleLinkage?.lineageId,
      sourceKind: "shield" as const,
      sourceRecordId: record.recordId,
      nodeRole: "origin" as const,
      readiness: "ready" as const,
      commitment: record.artifacts.commitment,
      insertionIndex: record.insertion.index,
      snapshotRoot: record.insertion.root,
      snapshotLeafCount: record.insertion.leafCount,
      rootScheme: SHIELDED_STATE_ROOT_SCHEME_V1,
      membershipLinkedByLifecycle: Boolean(record.lifecycleLinkage?.outputLifecycleIds[0]),
      derivedPath: createDerivedMembershipPath({
        entries,
        commitment: record.artifacts.commitment,
        insertionIndex: record.insertion.index,
        root: record.insertion.root,
        leafCount: record.insertion.leafCount,
      }),
      candidateMerklePath: createCandidateMerkleMembershipPath({
        entries,
        commitment: record.artifacts.commitment,
        insertionIndex: record.insertion.index,
        snapshotRoot: record.insertion.root,
        leafCount: record.insertion.leafCount,
      }),
    })),
    ...listCanonicalSendRecords().flatMap((record) =>
      record.successors.map((successor) => ({
        lifecycleId: successor.lifecycle?.lifecycleId,
        lineageId: successor.lifecycle?.lineageId,
        sourceKind: "send" as const,
        sourceRecordId: record.recordId,
        nodeRole: successor.lifecycle?.branchRole ?? successor.kind,
        readiness:
          successor.lifecycle?.lifecycleId && successor.insertion.root && successor.artifacts.commitment.value
            ? ("ready" as const)
            : successor.lifecycle?.lifecycleId
              ? ("partial" as const)
              : ("legacy" as const),
        commitment: successor.artifacts.commitment,
        insertionIndex: successor.insertion.index,
        snapshotRoot: successor.insertion.root,
        snapshotLeafCount: successor.insertion.leafCount,
        rootScheme: SHIELDED_STATE_ROOT_SCHEME_V1,
        membershipLinkedByLifecycle: Boolean(successor.lifecycle?.lifecycleId),
        derivedPath:
          successor.lifecycle?.lifecycleId && successor.insertion.root && successor.artifacts.commitment.value
            ? createDerivedMembershipPath({
                entries,
                commitment: successor.artifacts.commitment,
                insertionIndex: successor.insertion.index,
                root: successor.insertion.root,
                leafCount: successor.insertion.leafCount,
              })
            : undefined,
        candidateMerklePath:
          successor.lifecycle?.lifecycleId && successor.insertion.root && successor.artifacts.commitment.value
            ? createCandidateMerkleMembershipPath({
                entries,
                commitment: successor.artifacts.commitment,
                insertionIndex: successor.insertion.index,
                snapshotRoot: successor.insertion.root,
                leafCount: successor.insertion.leafCount,
              })
            : undefined,
      })),
    ),
    ...listCanonicalSwapRecords().flatMap((record) =>
      record.outputSuccessor.lifecycle?.lifecycleId
        ? [
            {
              lifecycleId: record.outputSuccessor.lifecycle.lifecycleId,
              lineageId: record.outputSuccessor.lifecycle.lineageId,
              sourceKind: "swap" as const,
              sourceRecordId: record.recordId,
              nodeRole: record.outputSuccessor.lifecycle.branchRole,
              readiness: "ready" as const,
              commitment: record.outputSuccessor.artifacts.commitment,
              insertionIndex: record.outputSuccessor.insertion.index,
              snapshotRoot: record.outputSuccessor.insertion.root,
              snapshotLeafCount: record.outputSuccessor.insertion.leafCount,
              rootScheme: SHIELDED_STATE_ROOT_SCHEME_V1,
              membershipLinkedByLifecycle: true,
              derivedPath: createDerivedMembershipPath({
                entries,
                commitment: record.outputSuccessor.artifacts.commitment,
                insertionIndex: record.outputSuccessor.insertion.index,
                root: record.outputSuccessor.insertion.root,
                leafCount: record.outputSuccessor.insertion.leafCount,
              }),
              candidateMerklePath: createCandidateMerkleMembershipPath({
                entries,
                commitment: record.outputSuccessor.artifacts.commitment,
                insertionIndex: record.outputSuccessor.insertion.index,
                snapshotRoot: record.outputSuccessor.insertion.root,
                leafCount: record.outputSuccessor.insertion.leafCount,
              }),
            },
          ]
        : [],
    ),
    ...listCanonicalUnshieldRecords().flatMap((record) =>
      record.lifecycleLinkage?.endpointLifecycleId
        ? [
            {
              lifecycleId: record.lifecycleLinkage.endpointLifecycleId,
              lineageId: record.lifecycleLinkage.lineageId,
              sourceKind: "unshield" as const,
              sourceRecordId: record.recordId,
              nodeRole: "exit" as const,
              readiness: "unavailable" as const,
              membershipLinkedByLifecycle: true,
            },
          ]
        : [],
    ),
  ];
}

export function getCanonicalLifecycleMembership(
  lifecycleId: string | undefined,
): CanonicalLifecycleMembershipRecord {
  if (!lifecycleId) {
    return {
      lifecycleId: undefined,
      readiness: "legacy",
      membershipLinkedByLifecycle: false,
    };
  }

  return (
    listCanonicalLifecycleMembershipRecords().find((record) => record.lifecycleId === lifecycleId) ?? {
      lifecycleId,
      readiness: "legacy",
      membershipLinkedByLifecycle: false,
    }
  );
}

export function getCanonicalLifecycleDerivedMembershipPath(
  lifecycleId: string | undefined,
): CanonicalDerivedMembershipPath | undefined {
  return getCanonicalLifecycleMembership(lifecycleId).derivedPath;
}

export function getCanonicalLifecycleCandidateMerkleMembershipPath(
  lifecycleId: string | undefined,
): CanonicalCandidateMerkleMembershipPath | undefined {
  return getCanonicalLifecycleMembership(lifecycleId).candidateMerklePath;
}

export function hasCanonicalLifecycleDerivedMembershipPath(
  lifecycleId: string | undefined,
): boolean {
  return Boolean(getCanonicalLifecycleMembership(lifecycleId).derivedPath);
}

export function hasCanonicalLifecycleDerivedMembershipPathDigests(
  lifecycleId: string | undefined,
): boolean {
  const derivedPath = getCanonicalLifecycleMembership(lifecycleId).derivedPath;
  return Boolean(
    derivedPath &&
      derivedPath.levels.every((level) => typeof level.parentDigest === "string" && level.parentDigest.length > 0),
  );
}

export function hasCanonicalLifecycleCandidateMerkleMembershipPath(
  lifecycleId: string | undefined,
): boolean {
  return Boolean(getCanonicalLifecycleMembership(lifecycleId).candidateMerklePath);
}

export function listCanonicalMembershipFutureRootSeams(): CanonicalMembershipFutureRootSeam[] {
  const entries = listAppendOnlyMembershipEntries();
  const memberships = listCanonicalLifecycleMembershipRecords();
  const seamBySnapshot = new Map<string, CanonicalMembershipFutureRootSeam>();

  for (const membership of memberships) {
    if (!membership.derivedPath || membership.snapshotLeafCount === undefined || !membership.snapshotRoot) {
      continue;
    }

    const snapshotEntries = getSnapshotEntries(entries, membership.snapshotLeafCount);

    if (!snapshotEntries) {
      continue;
    }

    const key = `${membership.snapshotLeafCount}:${membership.snapshotRoot}`;

    if (seamBySnapshot.has(key)) {
      continue;
    }

    const candidateMerkleRoot = deriveCandidateMerkleRootFromSnapshot(
      snapshotEntries,
      membership.snapshotRoot,
    );

    seamBySnapshot.set(key, {
      kind: CANONICAL_MEMBERSHIP_FUTURE_ROOT_SEAM_KIND_V1,
      scheme: candidateMerkleRoot.scheme,
      value: candidateMerkleRoot.value,
      sourceSemantics: "candidate-merkle-style-root",
      snapshotLeafCount: membership.snapshotLeafCount,
      snapshotRoot: membership.snapshotRoot,
    });
  }

  return [...seamBySnapshot.values()].sort(
    (left, right) => (left.snapshotLeafCount ?? 0) - (right.snapshotLeafCount ?? 0),
  );
}

export function getCanonicalMembershipFutureRootSeamForLifecycle(
  lifecycleId: string | undefined,
): CanonicalMembershipFutureRootSeam | undefined {
  const membership = getCanonicalLifecycleMembership(lifecycleId);

  if (membership.snapshotLeafCount === undefined || !membership.snapshotRoot) {
    return undefined;
  }

  return listCanonicalMembershipFutureRootSeams().find(
    (seam) =>
      seam.snapshotLeafCount === membership.snapshotLeafCount &&
      seam.snapshotRoot === membership.snapshotRoot,
  );
}

export function getCanonicalMembershipCandidateMerkleRootForLifecycle(
  lifecycleId: string | undefined,
): CanonicalMembershipCandidateMerkleRoot | undefined {
  const membership = getCanonicalLifecycleMembership(lifecycleId);
  const entries = listAppendOnlyMembershipEntries();

  if (membership.snapshotLeafCount === undefined) {
    return undefined;
  }

  const snapshotEntries = getSnapshotEntries(entries, membership.snapshotLeafCount);

  if (!snapshotEntries) {
    return undefined;
  }

  return deriveCandidateMerkleRootFromSnapshot(snapshotEntries, membership.snapshotRoot);
}

export function inspectCanonicalLifecycleMembershipRootReconciliation(
  lifecycleId: string | undefined,
  futureRootSeam?: CanonicalMembershipFutureRootSeam,
): CanonicalMembershipRootReconciliation {
  const membership = getCanonicalLifecycleMembership(lifecycleId);
  const derivedPath = membership.derivedPath;
  const candidateMerklePath = membership.candidateMerklePath;
  const resolvedFutureRootSeam =
    futureRootSeam ?? getCanonicalMembershipFutureRootSeamForLifecycle(lifecycleId);
  const currentComparableRoot = candidateMerklePath?.candidateRoot ?? derivedPath?.rootLikeDigest;

  if (!currentComparableRoot) {
    return {
      scheme: CANONICAL_MEMBERSHIP_ROOT_RECONCILIATION_SCHEME_V1,
      status: "unavailable",
      reconciliationReady: false,
      futureRootScheme: resolvedFutureRootSeam?.scheme,
      futureRootValue: resolvedFutureRootSeam?.value,
      futureRootSourceKind: resolvedFutureRootSeam?.kind,
      futureRootSnapshotLeafCount: resolvedFutureRootSeam?.snapshotLeafCount,
      futureRootSnapshotRoot: resolvedFutureRootSeam?.snapshotRoot,
    };
  }

  if (!resolvedFutureRootSeam?.value) {
    return {
      scheme: CANONICAL_MEMBERSHIP_ROOT_RECONCILIATION_SCHEME_V1,
      status: "pending",
      reconciliationReady: true,
      currentRootLikeDigest: currentComparableRoot,
      futureRootScheme: resolvedFutureRootSeam?.scheme,
      futureRootValue: resolvedFutureRootSeam?.value,
      futureRootSourceKind: resolvedFutureRootSeam?.kind,
      futureRootSnapshotLeafCount: resolvedFutureRootSeam?.snapshotLeafCount,
      futureRootSnapshotRoot: resolvedFutureRootSeam?.snapshotRoot,
    };
  }

  return {
    scheme: CANONICAL_MEMBERSHIP_ROOT_RECONCILIATION_SCHEME_V1,
    status: resolvedFutureRootSeam.value === currentComparableRoot ? "match" : "mismatch",
    reconciliationReady: true,
    currentRootLikeDigest: currentComparableRoot,
    futureRootScheme: resolvedFutureRootSeam.scheme,
    futureRootValue: resolvedFutureRootSeam.value,
    futureRootSourceKind: resolvedFutureRootSeam.kind,
    futureRootSnapshotLeafCount: resolvedFutureRootSeam.snapshotLeafCount,
    futureRootSnapshotRoot: resolvedFutureRootSeam.snapshotRoot,
  };
}

export function isCanonicalLifecycleMembershipRootReconciliationReady(
  lifecycleId: string | undefined,
): boolean {
  return inspectCanonicalLifecycleMembershipRootReconciliation(lifecycleId).reconciliationReady;
}

export function inspectCanonicalLifecycleCandidateTreeAgreement(
  lifecycleId: string | undefined,
): CanonicalCandidateTreeAgreement {
  const membership = getCanonicalLifecycleMembership(lifecycleId);
  const candidatePath = membership.candidateMerklePath;
  const candidateRoot = getCanonicalMembershipCandidateMerkleRootForLifecycle(lifecycleId);
  const futureRootSeam = getCanonicalMembershipFutureRootSeamForLifecycle(lifecycleId);

  if (membership.readiness === "legacy") {
    return {
      status: "legacy",
      agreementReady: false,
    };
  }

  if (!candidatePath || !candidateRoot) {
    return {
      status: "unavailable",
      agreementReady: false,
      candidatePathScheme: candidatePath?.scheme,
      candidatePathRoot: candidatePath?.candidateRoot,
      candidateRootScheme: candidateRoot?.scheme,
      candidateRootValue: candidateRoot?.value,
      futureRootScheme: futureRootSeam?.scheme,
      futureRootValue: futureRootSeam?.value,
    };
  }

  if (
    candidatePath.scheme !== candidateRoot.scheme ||
    (futureRootSeam?.scheme && futureRootSeam.scheme !== candidateRoot.scheme)
  ) {
    return {
      status: "scheme-mismatch",
      agreementReady: true,
      candidatePathScheme: candidatePath.scheme,
      candidatePathRoot: candidatePath.candidateRoot,
      candidateRootScheme: candidateRoot.scheme,
      candidateRootValue: candidateRoot.value,
      futureRootScheme: futureRootSeam?.scheme,
      futureRootValue: futureRootSeam?.value,
    };
  }

  if (candidatePath.candidateRoot !== candidateRoot.value) {
    return {
      status: "path-mismatch",
      agreementReady: true,
      candidatePathScheme: candidatePath.scheme,
      candidatePathRoot: candidatePath.candidateRoot,
      candidateRootScheme: candidateRoot.scheme,
      candidateRootValue: candidateRoot.value,
      futureRootScheme: futureRootSeam?.scheme,
      futureRootValue: futureRootSeam?.value,
    };
  }

  if (!futureRootSeam?.value) {
    return {
      status: "pending",
      agreementReady: true,
      candidatePathScheme: candidatePath.scheme,
      candidatePathRoot: candidatePath.candidateRoot,
      candidateRootScheme: candidateRoot.scheme,
      candidateRootValue: candidateRoot.value,
      futureRootScheme: futureRootSeam?.scheme,
      futureRootValue: futureRootSeam?.value,
    };
  }

  if (futureRootSeam.value !== candidateRoot.value) {
    return {
      status: "root-mismatch",
      agreementReady: true,
      candidatePathScheme: candidatePath.scheme,
      candidatePathRoot: candidatePath.candidateRoot,
      candidateRootScheme: candidateRoot.scheme,
      candidateRootValue: candidateRoot.value,
      futureRootScheme: futureRootSeam.scheme,
      futureRootValue: futureRootSeam.value,
    };
  }

  return {
    status: "match",
    agreementReady: true,
    candidatePathScheme: candidatePath.scheme,
    candidatePathRoot: candidatePath.candidateRoot,
    candidateRootScheme: candidateRoot.scheme,
    candidateRootValue: candidateRoot.value,
    futureRootScheme: futureRootSeam.scheme,
    futureRootValue: futureRootSeam.value,
  };
}

export function isCanonicalLifecycleCandidateTreeAgreementReady(
  lifecycleId: string | undefined,
): boolean {
  return inspectCanonicalLifecycleCandidateTreeAgreement(lifecycleId).agreementReady;
}

function listAppendOnlyMembershipEntries(): RetainedMembershipEntry[] {
  const entriesByIndex = new Map<number, RetainedMembershipEntry>();

  for (const record of listCanonicalShieldRecords()) {
    entriesByIndex.set(record.insertion.index, {
      index: record.insertion.index,
      commitment: record.artifacts.commitment,
      sourceKind: "shield",
      sourceRecordId: record.recordId,
    });
  }

  for (const record of listCanonicalSendRecords()) {
    for (const successor of record.successors) {
      entriesByIndex.set(successor.insertion.index, {
        index: successor.insertion.index,
        commitment: successor.artifacts.commitment,
        sourceKind: "send",
        sourceRecordId: record.recordId,
      });
    }
  }

  for (const record of listCanonicalSwapRecords()) {
    entriesByIndex.set(record.outputSuccessor.insertion.index, {
      index: record.outputSuccessor.insertion.index,
      commitment: record.outputSuccessor.artifacts.commitment,
      sourceKind: "swap",
      sourceRecordId: record.recordId,
    });
  }

  return [...entriesByIndex.values()].sort((left, right) => left.index - right.index);
}

function createDerivedMembershipPath(args: {
  entries: RetainedMembershipEntry[];
  commitment: CanonicalNoteCommitment;
  insertionIndex: number;
  root: string;
  leafCount: number;
}): CanonicalDerivedMembershipPath | undefined {
  const snapshotEntries = getSnapshotEntries(args.entries, args.leafCount);

  if (!snapshotEntries) {
    return undefined;
  }

  const leafEntry = snapshotEntries.find((entry) => entry.index === args.insertionIndex);

  if (!leafEntry || leafEntry.commitment.value !== args.commitment.value) {
    return undefined;
  }

  const levels = derivePathLevels(snapshotEntries, args.insertionIndex, args.leafCount);

  return finalizeDerivedMembershipPath({
    kind: CANONICAL_MEMBERSHIP_PATH_KIND_V1,
    version: 1,
    semantics: "append-only-snapshot-derived",
    digestScheme: CANONICAL_MEMBERSHIP_PARENT_DIGEST_SCHEME_V1,
    leafIndex: args.insertionIndex,
    leafCommitment: args.commitment.value,
    root: args.root,
    leafCount: args.leafCount,
    depth: derivePathDepth(args.leafCount),
    levels,
    rootLikeDigest: "",
  });
}

function createCandidateMerkleMembershipPath(args: {
  entries: RetainedMembershipEntry[];
  commitment: CanonicalNoteCommitment;
  insertionIndex: number;
  snapshotRoot?: string;
  leafCount: number;
}): CanonicalCandidateMerkleMembershipPath | undefined {
  const snapshotEntries = getSnapshotEntries(args.entries, args.leafCount);

  if (!snapshotEntries) {
    return undefined;
  }

  const leafEntry = snapshotEntries.find((entry) => entry.index === args.insertionIndex);

  if (!leafEntry || leafEntry.commitment.value !== args.commitment.value) {
    return undefined;
  }

  let currentLevel = snapshotEntries.map((entry) =>
    deriveProvisionalDigest([
      "vanta",
      "membership",
      "candidate-merkle-root",
      "leaf",
      String(entry.index),
      entry.commitment.value,
    ]),
  );
  let currentIndex = args.insertionIndex;
  let level = 0;
  const path: CanonicalCandidateMerklePathLevel[] = [];

  while (currentLevel.length > 1) {
    const isLeftNode = currentIndex % 2 === 0;
    const siblingIndex = isLeftNode ? currentIndex + 1 : currentIndex - 1;
    const siblingDigest =
      currentLevel[siblingIndex] ??
      deriveProvisionalDigest([
        "vanta",
        "membership",
        "candidate-merkle-root",
        "pad-right",
        String(level),
        String(currentIndex - (currentIndex % 2)),
        currentLevel[currentIndex]!,
      ]);
    const siblingSource = currentLevel[siblingIndex] ? "occupied" : "derived-placeholder";
    const leftDigest = isLeftNode ? currentLevel[currentIndex]! : siblingDigest;
    const rightDigest = isLeftNode ? siblingDigest : currentLevel[currentIndex]!;
    const parentDigest = deriveProvisionalDigest([
      "vanta",
      "membership",
      "candidate-merkle-root",
      "parent",
      String(level + 1),
      String(Math.floor(currentIndex / 2)),
      leftDigest,
      rightDigest,
    ]);

    path.push({
      level,
      siblingPosition: isLeftNode ? "right" : "left",
      siblingDigest,
      siblingSource,
      parentDigest,
    });

    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index]!;
      const right =
        currentLevel[index + 1] ??
        deriveProvisionalDigest([
          "vanta",
          "membership",
          "candidate-merkle-root",
          "pad-right",
          String(level),
          String(index),
          left,
        ]);

      nextLevel.push(
        deriveProvisionalDigest([
          "vanta",
          "membership",
          "candidate-merkle-root",
          "parent",
          String(level + 1),
          String(index / 2),
          left,
          right,
        ]),
      );
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
    level += 1;
  }

  return {
    kind: "vanta-candidate-merkle-style-path-v1",
    scheme: CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1,
    leafIndex: args.insertionIndex,
    leafCommitment: args.commitment.value,
    leafDigest: deriveProvisionalDigest([
      "vanta",
      "membership",
      "candidate-merkle-root",
      "leaf",
      String(args.insertionIndex),
      args.commitment.value,
    ]),
    leafCount: args.leafCount,
    depth: derivePathDepth(args.leafCount),
    path,
    candidateRoot: currentLevel[0]!,
    snapshotRoot: args.snapshotRoot,
    childOrdering: "left-right",
    oddLeafBehavior: "carry-right-with-derived-placeholder",
  };
}

function getSnapshotEntries(
  entries: RetainedMembershipEntry[],
  leafCount: number,
): RetainedMembershipEntry[] | undefined {
  if (!Number.isInteger(leafCount) || leafCount <= 0) {
    return undefined;
  }

  const snapshotEntries = entries.filter((entry) => entry.index < leafCount);

  if (snapshotEntries.length !== leafCount) {
    return undefined;
  }

  for (let index = 0; index < snapshotEntries.length; index += 1) {
    if (snapshotEntries[index]?.index !== index) {
      return undefined;
    }
  }

  return snapshotEntries;
}

function derivePathLevels(
  snapshotEntries: RetainedMembershipEntry[],
  leafIndex: number,
  leafCount: number,
): CanonicalMembershipPathLevel[] {
  const depth = derivePathDepth(leafCount);
  let currentNodeDigest = deriveLeafDigest(snapshotEntries[leafIndex]?.commitment.value ?? "", leafIndex);

  return Array.from({ length: depth }, (_, level) => {
    const width = 2 ** level;
    const nodeStartIndex = Math.floor(leafIndex / width) * width;
    const nodeEndIndex = Math.min(nodeStartIndex + width - 1, leafCount - 1);
    const isLeftNode = Math.floor(leafIndex / width) % 2 === 0;
    const siblingStartIndex = isLeftNode ? nodeEndIndex + 1 : nodeStartIndex - width;
    const siblingEndIndex = isLeftNode
      ? Math.min(siblingStartIndex + width - 1, leafCount - 1)
      : nodeStartIndex - 1;
    const hasSiblingRange =
      siblingStartIndex >= 0 &&
      siblingStartIndex < leafCount &&
      siblingEndIndex >= siblingStartIndex;
    const siblingLeafIndexes = hasSiblingRange
      ? range(siblingStartIndex, siblingEndIndex)
      : [];
    const siblingCommitments = siblingLeafIndexes
      .map((index) => snapshotEntries[index]?.commitment.value)
      .filter((value): value is string => typeof value === "string");
    const siblingDigest = hasSiblingRange
      ? deriveRangeDigest(snapshotEntries, siblingStartIndex, siblingEndIndex, level)
      : deriveMissingRangeDigest(level, siblingStartIndex, siblingEndIndex);
    const leftChildDigest = isLeftNode ? currentNodeDigest : siblingDigest;
    const rightChildDigest = isLeftNode ? siblingDigest : currentNodeDigest;
    const parentDigest = deriveParentDigest(
      level + 1,
      hasSiblingRange ? Math.min(nodeStartIndex, siblingStartIndex) : nodeStartIndex,
      Math.max(nodeEndIndex, hasSiblingRange ? siblingEndIndex : nodeEndIndex),
      leftChildDigest,
      rightChildDigest,
    );

    const pathLevel = {
      level,
      direction: isLeftNode ? "left" : "right",
      nodeStartIndex,
      nodeEndIndex,
      siblingStartIndex: hasSiblingRange ? siblingStartIndex : undefined,
      siblingEndIndex: hasSiblingRange ? siblingEndIndex : undefined,
      siblingLeafIndexes,
      siblingCommitments,
      siblingState:
        siblingLeafIndexes.length > 0 && siblingCommitments.length === siblingLeafIndexes.length
          ? "occupied"
          : "missing",
      digestScheme: CANONICAL_MEMBERSHIP_PARENT_DIGEST_SCHEME_V1,
      nodeDigest: currentNodeDigest,
      siblingDigest,
      leftChildDigest,
      rightChildDigest,
      parentDigest,
    } satisfies CanonicalMembershipPathLevel;

    currentNodeDigest = parentDigest;
    return pathLevel;
  });
}

function finalizeDerivedMembershipPath(
  path: CanonicalDerivedMembershipPath,
): CanonicalDerivedMembershipPath {
  const levels = path.levels;
  return {
    ...path,
    rootLikeDigest: levels[levels.length - 1]?.parentDigest ?? deriveLeafDigest(path.leafCommitment, path.leafIndex),
  };
}

function deriveCandidateMerkleRootFromSnapshot(
  snapshotEntries: RetainedMembershipEntry[],
  snapshotRoot?: string,
): CanonicalMembershipCandidateMerkleRoot {
  if (snapshotEntries.length === 0) {
    return {
      kind: CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_KIND_V1,
      scheme: CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1,
      value: deriveProvisionalDigest([
        "vanta",
        "membership",
        "candidate-merkle-root",
        "empty",
      ]),
      leafCount: 0,
      depth: 0,
      childOrdering: "left-right",
      oddLeafBehavior: "carry-right-with-derived-placeholder",
      snapshotRoot,
    };
  }

  let currentLevel = snapshotEntries.map((entry) =>
    deriveProvisionalDigest([
      "vanta",
      "membership",
      "candidate-merkle-root",
      "leaf",
      String(entry.index),
      entry.commitment.value,
    ]),
  );
  let level = 0;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index]!;
      const right =
        currentLevel[index + 1] ??
        deriveProvisionalDigest([
          "vanta",
          "membership",
          "candidate-merkle-root",
          "pad-right",
          String(level),
          String(index),
          left,
        ]);

      nextLevel.push(
        deriveProvisionalDigest([
          "vanta",
          "membership",
          "candidate-merkle-root",
          "parent",
          String(level + 1),
          String(index / 2),
          left,
          right,
        ]),
      );
    }

    currentLevel = nextLevel;
    level += 1;
  }

  return {
    kind: CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_KIND_V1,
    scheme: CANONICAL_MEMBERSHIP_CANDIDATE_MERKLE_ROOT_SCHEME_V1,
    value: currentLevel[0]!,
    leafCount: snapshotEntries.length,
    depth: derivePathDepth(snapshotEntries.length),
    childOrdering: "left-right",
    oddLeafBehavior: "carry-right-with-derived-placeholder",
    snapshotRoot,
  };
}

function derivePathDepth(leafCount: number) {
  if (!Number.isInteger(leafCount) || leafCount <= 1) {
    return 0;
  }

  return Math.ceil(Math.log2(leafCount));
}

function deriveLeafDigest(commitment: string, leafIndex: number) {
  return deriveProvisionalDigest([
    "vanta",
    "membership",
    "provisional",
    "leaf",
    String(leafIndex),
    commitment,
  ]);
}

function deriveRangeDigest(
  snapshotEntries: RetainedMembershipEntry[],
  startIndex: number,
  endIndex: number,
  level: number,
) {
  if (startIndex > endIndex || startIndex < 0) {
    return deriveMissingRangeDigest(level, startIndex, endIndex);
  }

  const commitments = range(startIndex, endIndex)
    .map((index) => snapshotEntries[index]?.commitment.value ?? `missing:${index}`);

  return deriveProvisionalDigest([
    "vanta",
    "membership",
    "provisional",
    "range",
    String(level),
    String(startIndex),
    String(endIndex),
    ...commitments,
  ]);
}

function deriveMissingRangeDigest(level: number, startIndex: number, endIndex: number) {
  return deriveProvisionalDigest([
    "vanta",
    "membership",
    "provisional",
    "missing-range",
    String(level),
    String(startIndex),
    String(endIndex),
  ]);
}

function deriveParentDigest(
  level: number,
  startIndex: number,
  endIndex: number | undefined,
  leftChildDigest: string,
  rightChildDigest: string,
) {
  return deriveProvisionalDigest([
    "vanta",
    "membership",
    "provisional",
    "parent",
    String(level),
    String(startIndex),
    String(endIndex ?? startIndex),
    leftChildDigest,
    rightChildDigest,
  ]);
}

function deriveProvisionalDigest(parts: string[]) {
  let hash = 0xcbf29ce484222325n;
  const material = parts.join("|");

  for (const char of material) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return `0x${hash.toString(16).padStart(16, "0")}`;
}

function range(start: number, end: number): number[] {
  const values: number[] = [];

  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }

  return values;
}
