import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PRIVATE_CORE_PROOF_STORE_PATH = "operator/.vanta-private-core-proofs.json";
const DEFAULT_PRIVATE_CORE_SEND_PROOF_STORE_PATH = "operator/.vanta-private-core-send-proofs.json";
const DEFAULT_PRIVATE_CORE_SWAP_PROOF_STORE_PATH = "operator/.vanta-private-core-swap-proofs.json";

export function createPrivateCoreProofStore(options = {}) {
  const filePath = resolve(
    process.cwd(),
    process.env[options.envKey ?? "VANTA_PRIVATE_CORE_PROOF_STORE_PATH"] ??
      options.defaultPath ??
      DEFAULT_PRIVATE_CORE_PROOF_STORE_PATH,
  );
  const state = loadStore(filePath);

  return {
    filePath,
    listProofs() {
      return Object.values(state.proofs).sort((left, right) => right.completedAt - left.completedAt);
    },
    getLatestProof() {
      return this.listProofs()[0] ?? null;
    },
    recordProof(record) {
      state.proofs[record.proofId] = { ...record };
      persistStore(filePath, state);
    },
  };
}

export function createPrivateCoreSendProofStore(options = {}) {
  return createPrivateCoreProofStore({
    defaultPath: DEFAULT_PRIVATE_CORE_SEND_PROOF_STORE_PATH,
    envKey: "VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH",
    ...options,
  });
}

export function createPrivateCoreSwapProofStore(options = {}) {
  return createPrivateCoreProofStore({
    defaultPath: DEFAULT_PRIVATE_CORE_SWAP_PROOF_STORE_PATH,
    envKey: "VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH",
    ...options,
  });
}

function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return {
      proofs: {},
      version: 1,
    };
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      proofs: isRecordMap(parsed.proofs) ? parsed.proofs : {},
      version: parsed.version === 1 ? 1 : 1,
    };
  } catch {
    return {
      proofs: {},
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
