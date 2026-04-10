export type CanonicalLifecycleLinkResolution =
  | "explicit"
  | "canonical"
  | "live-note"
  | "unresolved";

export type CanonicalLifecycleLinkReference = {
  lifecycleId?: string;
  lineageId?: string;
  resolution: CanonicalLifecycleLinkResolution;
};

export type CanonicalLifecycleOutputLinkage = {
  lifecycleId: string;
  lineageId: string;
  predecessorLifecycleId?: string;
  branchRole: "origin" | "recipient" | "change" | "output" | "exit";
};

export type CanonicalLifecycleRecordLinkage = {
  recordLifecycleId: string;
  lineageId: string;
  predecessorLifecycleId?: string;
  outputLifecycleIds: string[];
  endpointLifecycleId?: string;
};

export function createCanonicalLifecycleRecordId(
  kind: "shield" | "send" | "swap" | "unshield",
  recordId: string,
) {
  return `canonical-lifecycle:record:${kind}:${recordId}`;
}

export function createCanonicalLifecycleNodeId(
  kind: "shield" | "send" | "swap" | "unshield",
  recordId: string,
  branchRole: CanonicalLifecycleOutputLinkage["branchRole"],
) {
  return `canonical-lifecycle:node:${kind}:${recordId}:${branchRole}`;
}

export function createCanonicalLineageId(seedLifecycleId: string) {
  return `canonical-lineage:${seedLifecycleId}`;
}
