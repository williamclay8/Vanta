import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PRIVATE_CORE_SWAP_STORE_PATH = "operator/.vanta-private-core-swaps.json";

export function createPrivateCoreSwapStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_PRIVATE_CORE_SWAP_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_PRIVATE_CORE_SWAP_STORE_PATH,
  );
  const state = loadStore(filePath);

  return {
    filePath,
    getLatestSwap() {
      return this.listSwaps()[0] ?? null;
    },
    listSwaps() {
      return Object.values(state.swaps)
        .map(normalizeSwapRecord)
        .sort((left, right) => right.completedAt - left.completedAt);
    },
    recordSwap(record) {
      state.swaps[record.swapId] = normalizeSwapRecord(record);
      persistStore(filePath, state);
    },
  };
}

function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      swaps: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      swaps: isRecordMap(parsed.swaps) ? parsed.swaps : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      swaps: {},
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

function normalizeSwapRecord(record) {
  return {
    completedAt: typeof record?.completedAt === "number" ? record.completedAt : 0,
    inputAssetId: typeof record?.inputAssetId === "string" ? record.inputAssetId : "",
    inputNullifier: typeof record?.inputNullifier === "string" ? record.inputNullifier : "",
    inputRoot: typeof record?.inputRoot === "string" ? record.inputRoot : "",
    inputAmount: typeof record?.inputAmount === "string" ? record.inputAmount : "0",
    noteVersion: typeof record?.noteVersion === "number" ? record.noteVersion : 0,
    outputAssetId: typeof record?.outputAssetId === "string" ? record.outputAssetId : "",
    outputAmount: typeof record?.outputAmount === "string" ? record.outputAmount : "0",
    outputCommitment: typeof record?.outputCommitment === "string" ? record.outputCommitment : "",
    proofFieldCount: typeof record?.proofFieldCount === "number" ? record.proofFieldCount : 0,
    proofId: typeof record?.proofId === "string" ? record.proofId : "",
    publicInputCount: typeof record?.publicInputCount === "number" ? record.publicInputCount : 0,
    resultingRoot:
      typeof record?.resultingRoot === "string" && record.resultingRoot.length > 0
        ? record.resultingRoot
        : null,
    resultingRootBasis: "client-declared",
    swapId: typeof record?.swapId === "string" ? record.swapId : "",
  };
}
