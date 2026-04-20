function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta nullifier replay guard requires ${fieldName}.`);
  }

  return value.trim();
}

function replayKey({ context, nullifier }) {
  return `${context}:${nullifier}`;
}

export function createNullifierReplayGuard({
  initialRecords = [],
  now = () => new Date(),
  store = null,
} = {}) {
  return createNullifierReplayGuardWithStorage({
    initialRecords,
    now,
    store,
  });
}

function readStoreRecords(store) {
  const snapshot = store?.load?.();
  return Array.isArray(snapshot?.records) ? snapshot.records : [];
}

function writeStoreRecords(store, records) {
  if (!store?.save) {
    return;
  }

  store.save({
    records,
    stateVersion: 1,
  });
}

function createNullifierReplayGuardWithStorage({ initialRecords = [], now = () => new Date(), store }) {
  const records = new Map();
  const seedRecords = [...readStoreRecords(store), ...initialRecords];

  for (const record of seedRecords) {
    const context = requireText(record.context, "context");
    const nullifier = requireText(record.nullifier, "nullifier");
    const requestId = requireText(record.requestId, "requestId");
    records.set(replayKey({ context, nullifier }), {
      context,
      nullifier,
      recordedAt: record.recordedAt ?? now().toISOString(),
      requestId,
    });
  }

  function persist() {
    writeStoreRecords(store, [...records.values()]);
  }

  return {
    kind: "vanta-nullifier-replay-guard",
    productionReady: false,
    storageMode: store ? "persistent-adapter" : "memory",

    check({ context: rawContext, nullifier: rawNullifier, requestId: rawRequestId }) {
      const context = requireText(rawContext, "context");
      const nullifier = requireText(rawNullifier, "nullifier");
      const requestId = requireText(rawRequestId, "requestId");
      const existing = records.get(replayKey({ context, nullifier }));

      if (existing?.requestId === requestId) {
        return {
          accepted: true,
          idempotent: true,
          mutated: false,
          reason: "idempotent-nullifier-reservation",
          record: existing,
          replay: false,
        };
      }

      if (existing) {
        return {
          accepted: false,
          existing,
          mutated: false,
          reason: "conflicting-nullifier-replay",
          replay: true,
        };
      }

      return {
        accepted: true,
        idempotent: false,
        mutated: false,
        reason: "nullifier-available",
        replay: false,
      };
    },

    reserve({ context: rawContext, nullifier: rawNullifier, requestId: rawRequestId }) {
      const context = requireText(rawContext, "context");
      const nullifier = requireText(rawNullifier, "nullifier");
      const requestId = requireText(rawRequestId, "requestId");
      const key = replayKey({ context, nullifier });
      const existing = records.get(key);

      if (existing?.requestId === requestId) {
        return {
          accepted: true,
          idempotent: true,
          reason: "idempotent-nullifier-reservation",
          record: existing,
          replay: false,
        };
      }

      if (existing) {
        return {
          accepted: false,
          existing,
          reason: "conflicting-nullifier-replay",
          replay: true,
        };
      }

      const record = {
        context,
        nullifier,
        recordedAt: now().toISOString(),
        requestId,
      };
      records.set(key, record);
      persist();

      return {
        accepted: true,
        idempotent: false,
        reason: "nullifier-reserved",
        record,
        replay: false,
      };
    },

    snapshot() {
      return [...records.values()];
    },
  };
}
