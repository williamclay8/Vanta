import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PRIVATE_CORE_ROOT_STORE_PATH = "operator/.vanta-private-core-roots.json";

export function createPrivateCoreRootStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_PRIVATE_CORE_ROOT_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_PRIVATE_CORE_ROOT_STORE_PATH,
  );
  const state = loadStore(filePath);

  return {
    filePath,
    hasRoot(root) {
      return state.roots[root] !== undefined;
    },
    getLatestRoot() {
      return this.listRoots()[0] ?? null;
    },
    listRoots() {
      return Object.values(state.roots).sort((left, right) => right.recordedAt - left.recordedAt);
    },
    recordRoot(record) {
      state.roots[record.root] = {
        ...record,
        recordedAt: nextRecordedAt(state, record.recordedAt),
      };
      persistStore(filePath, state);
    },
  };
}

function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      roots: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      roots: isRecordMap(parsed.roots) ? parsed.roots : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      roots: {},
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

function nextRecordedAt(state, requestedAt) {
  const latestRecordedAt = Object.values(state.roots).reduce(
    (current, record) => Math.max(current, typeof record.recordedAt === "number" ? record.recordedAt : 0),
    0,
  );

  return Math.max(requestedAt ?? 0, latestRecordedAt + 1);
}
