import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_RELEASE_STORE_PATH = "operator/.vanta-unshield-releases.json";

export function createReleaseRecordStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_UNSHIELD_RELEASE_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_RELEASE_STORE_PATH,
  );
  const state = loadReleaseStore(filePath);

  return {
    filePath,
    hasRequestId(requestId) {
      return state.requestIds[requestId] !== undefined;
    },
    hasConsumedNoteId(noteId) {
      return state.consumedNoteIds[noteId] !== undefined;
    },
    hasTransitionNoteId(transitionNoteId) {
      return state.transitionNoteIds[transitionNoteId] !== undefined;
    },
    listConsumedNoteIds() {
      return Object.keys(state.consumedNoteIds);
    },
    listRecords() {
      return Object.values(state.requestIds).sort((left, right) => {
        const leftCompletedAt =
          typeof left?.completedAt === "number" ? left.completedAt : 0;
        const rightCompletedAt =
          typeof right?.completedAt === "number" ? right.completedAt : 0;

        return rightCompletedAt - leftCompletedAt;
      });
    },
    recordRelease(record) {
      const storedRecord = { ...record };

      state.requestIds[record.requestId] = storedRecord;
      state.consumedNoteIds[record.consumedNoteId] = storedRecord;
      state.transitionNoteIds[record.transitionNoteId] = storedRecord;
      persistReleaseStore(filePath, state);
    },
  };
}

function loadReleaseStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      consumedNoteIds: {},
      requestIds: {},
      transitionNoteIds: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      consumedNoteIds: isRecordMap(parsed.consumedNoteIds) ? parsed.consumedNoteIds : {},
      requestIds: isRecordMap(parsed.requestIds) ? parsed.requestIds : {},
      transitionNoteIds: isRecordMap(parsed.transitionNoteIds) ? parsed.transitionNoteIds : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      consumedNoteIds: {},
      requestIds: {},
      transitionNoteIds: {},
      version: 1,
    };
  }
}

function persistReleaseStore(filePath, state) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.tmp`;
  writeFileSync(tempFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempFilePath, filePath);
}

function isRecordMap(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
