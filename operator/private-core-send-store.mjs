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
      return Object.values(state.sends)
        .map(normalizeSendRecord)
        .sort((left, right) => right.completedAt - left.completedAt);
    },
    recordSend(record) {
      state.sends[record.sendId] = normalizeSendRecord(record);
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

function normalizeSendRecord(record) {
  return {
    assetId: typeof record?.assetId === "string" ? record.assetId : "",
    changeAmount: typeof record?.changeAmount === "string" ? record.changeAmount : "0",
    changeCommitment: typeof record?.changeCommitment === "string" ? record.changeCommitment : null,
    completedAt: typeof record?.completedAt === "number" ? record.completedAt : 0,
    inputNullifier: typeof record?.inputNullifier === "string" ? record.inputNullifier : "",
    inputRoot: typeof record?.inputRoot === "string" ? record.inputRoot : "",
    noteVersion: typeof record?.noteVersion === "number" ? record.noteVersion : 0,
    proofFieldCount: typeof record?.proofFieldCount === "number" ? record.proofFieldCount : 0,
    proofId: typeof record?.proofId === "string" ? record.proofId : "",
    publicInputCount: typeof record?.publicInputCount === "number" ? record.publicInputCount : 0,
    releaseCandidateId:
      typeof record?.releaseCandidateId === "string" && record.releaseCandidateId.length > 0
        ? record.releaseCandidateId
        : null,
    recipientCommitment: typeof record?.recipientCommitment === "string" ? record.recipientCommitment : "",
    resultingRoot:
      typeof record?.resultingRoot === "string" && record.resultingRoot.length > 0
        ? record.resultingRoot
        : null,
    resultingRootBasis: "proof-public-expected-root",
    sendAmount: typeof record?.sendAmount === "string" ? record.sendAmount : "0",
    sendId: typeof record?.sendId === "string" ? record.sendId : "",
  };
}
