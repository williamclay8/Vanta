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
  const reservedInputNullifiers = new Set();

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
    hasInputNullifier(inputNullifier) {
      return this.listSends().some((record) => record.inputNullifier === inputNullifier);
    },
    releaseInputNullifier(inputNullifier) {
      reservedInputNullifiers.delete(inputNullifier);
    },
    reserveInputNullifier(inputNullifier) {
      if (this.hasInputNullifier(inputNullifier) || reservedInputNullifiers.has(inputNullifier)) {
        throw new Error("Private-core send transition input nullifier is already registered.");
      }
      reservedInputNullifiers.add(inputNullifier);
    },
    recordSend(record) {
      const normalizedRecord = normalizeSendRecord(record);
      if (this.hasInputNullifier(normalizedRecord.inputNullifier)) {
        throw new Error("Private-core send transition input nullifier is already registered.");
      }
      state.sends[normalizedRecord.sendId] = normalizedRecord;
      reservedInputNullifiers.delete(normalizedRecord.inputNullifier);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Private-core send store could not be read safely: ${message}`);
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
    assetId: typeof record?.assetId === "string" ? record.assetId : null,
    changeAmount:
      typeof record?.changeAmount === "string"
        ? record.changeAmount
        : record?.changeAmount === null
          ? null
          : "0",
    changeCommitment: typeof record?.changeCommitment === "string" ? record.changeCommitment : null,
    completedAt: typeof record?.completedAt === "number" ? record.completedAt : 0,
    inputNullifier: typeof record?.inputNullifier === "string" ? record.inputNullifier : "",
    inputRoot: typeof record?.inputRoot === "string" ? record.inputRoot : "",
    noteVersion: typeof record?.noteVersion === "number" ? record.noteVersion : 0,
    proofFieldCount: typeof record?.proofFieldCount === "number" ? record.proofFieldCount : 0,
    proofId: typeof record?.proofId === "string" ? record.proofId : "",
    publicInputCount: typeof record?.publicInputCount === "number" ? record.publicInputCount : 0,
    redactionBasis:
      typeof record?.redactionBasis === "string" && record.redactionBasis.length > 0
        ? record.redactionBasis
        : null,
    releaseCandidateId:
      typeof record?.releaseCandidateId === "string" && record.releaseCandidateId.length > 0
        ? record.releaseCandidateId
        : null,
    recipientCommitment: typeof record?.recipientCommitment === "string" ? record.recipientCommitment : "",
    resultingRoot:
      typeof record?.resultingRoot === "string" && record.resultingRoot.length > 0
        ? record.resultingRoot
        : null,
    resultingRootBasis: "proof-linked-input-expected-root",
    sendAmount:
      typeof record?.sendAmount === "string"
        ? record.sendAmount
        : record?.sendAmount === null
          ? null
          : "0",
    sendEconomicTermsHash:
      typeof record?.sendEconomicTermsHash === "string" && record.sendEconomicTermsHash.length > 0
        ? record.sendEconomicTermsHash
        : null,
    sendId: typeof record?.sendId === "string" ? record.sendId : "",
  };
}
