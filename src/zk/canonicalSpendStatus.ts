import type { CanonicalLifecycleConsumptionRecord } from "./canonicalConsumption";
import { listCanonicalShieldRecords } from "./liveShieldBridge";
import { listCanonicalSendRecords } from "./liveSendBridge";
import { listCanonicalSwapRecords } from "./liveSwapBridge";
import { listCanonicalUnshieldRecords } from "./liveUnshieldBridge";

export type CanonicalLifecycleSpendStatus = "unspent" | "consumed" | "terminal" | "legacy";

export type CanonicalLifecycleSpendStatusRecord = {
  lifecycleId?: string;
  lineageId?: string;
  spendStatus: CanonicalLifecycleSpendStatus;
  spendCapability: "spendable" | "terminal" | "legacy";
  nodeRole?: "origin" | "recipient" | "change" | "output" | "exit";
  sourceKind?: "shield" | "send" | "swap" | "unshield";
  sourceRecordId?: string;
  consumptionId?: string;
  consumptionKind?: CanonicalLifecycleConsumptionRecord["consumptionKind"];
  nullifierReady: boolean;
};

export function listCanonicalLifecycleSpendStatusRecords(): CanonicalLifecycleSpendStatusRecord[] {
  const nodes = collectExplicitLifecycleNodes();
  const consumptionByLifecycleId = buildConsumptionIndex();

  return nodes.map((node) => {
    const consumption = node.lifecycleId ? consumptionByLifecycleId.get(node.lifecycleId) : undefined;

    if (!node.lifecycleId) {
      return {
        lifecycleId: undefined,
        lineageId: node.lineageId,
        spendStatus: "legacy",
        spendCapability: "legacy",
        nodeRole: node.nodeRole,
        sourceKind: node.sourceKind,
        sourceRecordId: node.sourceRecordId,
        nullifierReady: false,
      };
    }

    if (node.nodeRole === "exit") {
      return {
        lifecycleId: node.lifecycleId,
        lineageId: node.lineageId,
        spendStatus: "terminal",
        spendCapability: "terminal",
        nodeRole: node.nodeRole,
        sourceKind: node.sourceKind,
        sourceRecordId: node.sourceRecordId,
        nullifierReady: false,
      };
    }

    if (consumption) {
      return {
        lifecycleId: node.lifecycleId,
        lineageId: node.lineageId,
        spendStatus: "consumed",
        spendCapability: "spendable",
        nodeRole: node.nodeRole,
        sourceKind: node.sourceKind,
        sourceRecordId: node.sourceRecordId,
        consumptionId: consumption.consumptionId,
        consumptionKind: consumption.consumptionKind,
        nullifierReady: true,
      };
    }

    return {
      lifecycleId: node.lifecycleId,
      lineageId: node.lineageId,
      spendStatus: "unspent",
      spendCapability: "spendable",
      nodeRole: node.nodeRole,
      sourceKind: node.sourceKind,
      sourceRecordId: node.sourceRecordId,
      nullifierReady: node.nullifierReady,
    };
  });
}

export function getCanonicalLifecycleSpendStatus(
  lifecycleId: string | undefined,
): CanonicalLifecycleSpendStatusRecord {
  if (!lifecycleId) {
    return {
      lifecycleId: undefined,
      spendStatus: "legacy",
      spendCapability: "legacy",
      nullifierReady: false,
    };
  }

  return (
    listCanonicalLifecycleSpendStatusRecords().find((record) => record.lifecycleId === lifecycleId) ?? {
      lifecycleId,
      spendStatus: "legacy",
      spendCapability: "legacy",
      nullifierReady: false,
    }
  );
}

export function findCanonicalConsumptionForLifecycleNode(
  lifecycleId: string | undefined,
): CanonicalLifecycleConsumptionRecord | undefined {
  if (!lifecycleId) {
    return undefined;
  }

  return buildConsumptionIndex().get(lifecycleId);
}

function buildConsumptionIndex() {
  const entries = [
    ...listCanonicalSendRecords().map((record) => record.consumption),
    ...listCanonicalSwapRecords().map((record) => record.consumption),
    ...listCanonicalUnshieldRecords().map((record) => record.consumption),
  ].filter((value): value is CanonicalLifecycleConsumptionRecord => value !== undefined);

  return new Map(entries.map((entry) => [entry.consumedLifecycleId, entry]));
}

function collectExplicitLifecycleNodes() {
  return [
    ...listCanonicalShieldRecords().flatMap((record) =>
      record.lifecycleLinkage?.outputLifecycleIds[0]
        ? [
            {
              lifecycleId: record.lifecycleLinkage.outputLifecycleIds[0],
              lineageId: record.lifecycleLinkage.lineageId,
              nodeRole: "origin" as const,
              sourceKind: "shield" as const,
              sourceRecordId: record.recordId,
              nullifierReady: true,
            },
          ]
        : [],
    ),
    ...listCanonicalSendRecords().flatMap((record) =>
      record.successors.map((successor) => ({
        lifecycleId: successor.lifecycle?.lifecycleId,
        lineageId: successor.lifecycle?.lineageId,
        nodeRole: successor.lifecycle?.branchRole ?? successor.kind,
        sourceKind: "send" as const,
        sourceRecordId: record.recordId,
        nullifierReady: true,
      })),
    ),
    ...listCanonicalSwapRecords().flatMap((record) =>
      record.outputSuccessor.lifecycle?.lifecycleId
        ? [
            {
              lifecycleId: record.outputSuccessor.lifecycle.lifecycleId,
              lineageId: record.outputSuccessor.lifecycle.lineageId,
              nodeRole: record.outputSuccessor.lifecycle.branchRole,
              sourceKind: "swap" as const,
              sourceRecordId: record.recordId,
              nullifierReady: true,
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
              nodeRole: "exit" as const,
              sourceKind: "unshield" as const,
              sourceRecordId: record.recordId,
              nullifierReady: false,
            },
          ]
        : [],
    ),
  ];
}
