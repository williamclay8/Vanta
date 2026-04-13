import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PRIVATE_CORE_SEND_STORE_PATH = "operator/.vanta-private-core-sends.json";

export function createPrivateCoreSendStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_PRIVATE_CORE_SEND_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_PRIVATE_CORE_SEND_STORE_PATH,
  );
  const state = loadStore(filePath);

  return {
    filePath,
    getLatestSend() {
      return this.listSends()[0] ?? null;
    },
    listSends() {
      return Object.values(state.sends).sort((left, right) => right.completedAt - left.completedAt);
    },
    recordSend(record) {
      state.sends[record.sendId] = { ...record };
      persistStore(filePath, state);
    },
  };
}

function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      sends: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      sends: isRecordMap(parsed.sends) ? parsed.sends : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      sends: {},
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
