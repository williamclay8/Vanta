import { resolve } from "node:path";
import { createJsonSnapshotStore } from "../src/storage/vantaJsonSnapshotStore.mjs";

const stateVersion = 2;

function normalizeCommitment(commitment) {
  return {
    assetId: String(commitment.assetId),
    commitment: String(commitment.commitment),
    leafIndex: Number(commitment.leafIndex),
    merkleRoot: String(commitment.merkleRoot),
    treeId: String(commitment.treeId),
  };
}

function normalizeReceipt(receipt) {
  return {
    assetId: String(receipt.assetId),
    intent: String(receipt.intent),
    publicInputCommitment: String(receipt.publicInputCommitment),
    receiptId: String(receipt.receiptId),
    recordedAtSlot: BigInt(receipt.recordedAtSlot ?? 0),
    replayKey: String(receipt.replayKey),
  };
}

function serializeReceipt(receipt) {
  return {
    ...receipt,
    recordedAtSlot: receipt.recordedAtSlot.toString(),
  };
}

function nullifiersFromReceipts(receipts) {
  return receipts
    .filter((receipt) => receipt.replayKey.startsWith("claim:"))
    .map((receipt) => ({
      nullifier: receipt.replayKey.slice("claim:".length),
      spentAtSlot: receipt.recordedAtSlot,
    }));
}

function serializeNullifier(record) {
  return {
    nullifier: String(record.nullifier),
    spentAtSlot:
      record.spentAtSlot === null || record.spentAtSlot === undefined
        ? null
        : BigInt(record.spentAtSlot).toString(),
  };
}

function normalizeJsonValue(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)]),
    );
  }

  return value;
}

function normalizeNullifier(record) {
  return {
    nullifier: String(record.nullifier),
    spentAtSlot:
      record.spentAtSlot === null || record.spentAtSlot === undefined
        ? null
        : BigInt(record.spentAtSlot),
  };
}

export function createPrivatePoolV2ReceiptStore({
  path = process.env.VANTA_PRIVATE_POOL_V2_STORE_PATH ??
    resolve(import.meta.dirname, ".vanta-private-pool-v2-receipts.json"),
} = {}) {
  const storePath = resolve(path);
  const snapshotStore = createJsonSnapshotStore({
    allowInProduction: process.env.NODE_ENV === "production",
    path: storePath,
    stateVersion,
  });

  return {
    path: storePath,

    load() {
      const parsed = snapshotStore.load();
      if (!parsed) {
        return {
          commitments: [],
          nullifiers: [],
          paySettlements: [],
          protocolSettlements: [],
          receipts: [],
          settlementPolicy: null,
          stateVersion,
        };
      }

      const commitments = (parsed.commitments ?? []).map(normalizeCommitment);
      const receipts = (parsed.receipts ?? []).map(normalizeReceipt);
      const nullifiers =
        parsed.nullifiers?.map(normalizeNullifier) ?? nullifiersFromReceipts(receipts);

      return {
        commitments,
        nullifiers,
        paySettlements: normalizeJsonValue(parsed.paySettlements ?? []),
        protocolSettlements: normalizeJsonValue(parsed.protocolSettlements ?? []),
        receipts,
        settlementPolicy: normalizeJsonValue(parsed.settlementPolicy ?? null),
        stateVersion: Number(parsed.stateVersion ?? stateVersion),
      };
    },

    save({ commitments, nullifiers, paySettlements, protocolSettlements, receipts, settlementPolicy }) {
      const payload = {
        commitments: (commitments ?? []).map(normalizeCommitment),
        nullifiers: (nullifiers ?? nullifiersFromReceipts(receipts ?? [])).map(
          serializeNullifier,
        ),
        paySettlements: normalizeJsonValue(paySettlements ?? []),
        protocolSettlements: normalizeJsonValue(protocolSettlements ?? []),
        receipts: (receipts ?? []).map((receipt) => serializeReceipt(normalizeReceipt(receipt))),
        settlementPolicy: normalizeJsonValue(settlementPolicy ?? null),
        stateVersion,
      };
      snapshotStore.save(payload);
    },
  };
}
