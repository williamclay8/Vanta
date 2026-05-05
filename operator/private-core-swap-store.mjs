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
  const reservedInputCommitments = new Set();
  const reservedInputNullifiers = new Set();

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
    hasInputCommitment(inputCommitment) {
      return this.listSwaps().some((record) => record.inputCommitment === inputCommitment);
    },
    hasInputNullifier(inputNullifier) {
      return this.listSwaps().some((record) => record.inputNullifier === inputNullifier);
    },
    releaseInputNullifier(inputNullifier, inputCommitment = null) {
      reservedInputNullifiers.delete(inputNullifier);
      if (inputCommitment) {
        reservedInputCommitments.delete(inputCommitment);
      }
    },
    reserveInputNullifier(inputNullifier, inputCommitment = null) {
      if (
        this.hasInputNullifier(inputNullifier) ||
        reservedInputNullifiers.has(inputNullifier) ||
        (inputCommitment &&
          (this.hasInputCommitment(inputCommitment) ||
            reservedInputCommitments.has(inputCommitment)))
      ) {
        throw new Error("Duplicate private-core swap input nullifier is already registered.");
      }
      reservedInputNullifiers.add(inputNullifier);
      if (inputCommitment) {
        reservedInputCommitments.add(inputCommitment);
      }
    },
    recordSwap(record) {
      const normalizedRecord = normalizeSwapRecord(record);
      if (
        this.hasInputNullifier(normalizedRecord.inputNullifier) ||
        this.hasInputCommitment(normalizedRecord.inputCommitment)
      ) {
        throw new Error("Duplicate private-core swap input nullifier is already registered.");
      }
      state.swaps[normalizedRecord.swapId] = normalizedRecord;
      reservedInputNullifiers.delete(normalizedRecord.inputNullifier);
      reservedInputCommitments.delete(normalizedRecord.inputCommitment);
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
    executionQuoteReference:
      typeof record?.executionQuoteReference === "string" && record.executionQuoteReference.length > 0
        ? record.executionQuoteReference
        : null,
    executionVenueLabel:
      typeof record?.executionVenueLabel === "string" && record.executionVenueLabel.length > 0
        ? record.executionVenueLabel
        : null,
    inputCommitment: typeof record?.inputCommitment === "string" ? record.inputCommitment : "",
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
