import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PRIVATE_CORE_CONSUME_STORE_PATH = "operator/.vanta-private-core-consumes.json";

export function createPrivateCoreConsumeStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_PRIVATE_CORE_CONSUME_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_PRIVATE_CORE_CONSUME_STORE_PATH,
  );
  const state = loadStore(filePath);

  return {
    filePath,
    hasNullifier(nullifier) {
      return state.nullifiers[nullifier] !== undefined;
    },
    listConsumes() {
      return Object.values(state.nullifiers).sort((left, right) => right.completedAt - left.completedAt);
    },
    recordConsume(record) {
      state.nullifiers[record.nullifier] = { ...record };
      persistStore(filePath, state);
    },
  };
}

function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      nullifiers: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      nullifiers: isRecordMap(parsed.nullifiers) ? parsed.nullifiers : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      nullifiers: {},
      version: 1,
    };
  }
}

function persistStore(filePath, state) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.tmp`;
  writeFileSync(tempFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempFilePath, filePath);
}

function isRecordMap(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
