import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPrivateCoreProofStore } from "../operator/private-core-proof-store.mjs";
import { createReleaseRecordStore } from "../operator/release-record-store.mjs";
import {
  VANTA_TRANSACTION_EVIDENCE_VERSION,
  createTransactionEvidencePacket,
  createUnshieldTransactionEvidence,
} from "../src/transactions/vantaTransactionEvidence.ts";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/transaction.evidence.json");
const writeMode = process.argv.includes("--write");
const dryRun = process.argv.includes("--dry-run") || !writeMode;
const printPacket = process.argv.includes("--print-packet");
const checkedAtArg = readFlagValue("--checked-at");
const checkedAt = checkedAtArg ?? new Date().toISOString();
const operatorBaseUrl = resolveOperatorBaseUrl();
const unshieldTransitionSignature =
  readFlagValue("--unshield-transition-signature") ??
  process.env.VANTA_TRANSACTION_EVIDENCE_UNSHIELD_SIGNATURE ??
  null;
const solanaRpcUrl = resolveSolanaRpcUrl();

assert.ok(Date.parse(checkedAt), "--checked-at must be a parseable timestamp when provided.");

const forbiddenFragments = [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "sk_live_",
  "whsec_",
];

function readFlagValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1]?.trim();
  assert.ok(value, `${name} requires a value.`);
  return value;
}

function resolveOperatorBaseUrl() {
  const value = readFlagValue("--operator-base-url") ?? process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  return (value?.trim() || "http://127.0.0.1:8789").replace(/\/+$/u, "");
}

function resolveSolanaRpcUrl() {
  const value =
    readFlagValue("--solana-rpc-url") ??
    process.env.SOLANA_RPC_URL ??
    process.env.VITE_SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com";

  return value.trim();
}

function assertNoForbiddenEvidence(value) {
  const serialized = JSON.stringify(value);
  for (const forbidden of forbiddenFragments) {
    assert.ok(!serialized.includes(forbidden), `Transaction evidence must not contain ${forbidden}.`);
  }
}

function normalizeFlow(flow) {
  return {
    ...flow,
    observedAt: checkedAt,
  };
}

async function fetchLivePrivateCoreOperatorTrace() {
  if (!operatorBaseUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_500);
  try {
    const authToken = resolveOperatorAuthToken();
    const response = await fetch(new URL("/state/private-core-status", operatorBaseUrl), {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    const parsed = await response.json();
    const summary = isObject(parsed?.summary) ? parsed.summary : {};
    const latestProof =
      (isObject(summary.latestReleaseProof) ? summary.latestReleaseProof : null) ??
      (isObject(summary.latestProof) ? summary.latestProof : null);
    const latestRelease = isObject(summary.latestRelease) ? summary.latestRelease : null;

    if (!latestProof && !latestRelease) {
      return null;
    }

    return {
      latestProof,
      latestRelease,
      source: "live-private-core-operator-summary",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveOperatorAuthToken() {
  const envValue =
    process.env.VANTA_PRIVATE_CORE_OPERATOR_AUTH_TOKEN ??
    process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
  return typeof envValue === "string" && envValue.trim() ? envValue.trim() : null;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLatestPrivateCoreOperatorTraceFromStore() {
  const proofStore = createPrivateCoreProofStore();
  const releaseStore = createReleaseRecordStore({
    defaultPath: "operator/.vanta-private-core-releases.json",
    envKey: "VANTA_PRIVATE_CORE_RELEASE_STORE_PATH",
  });

  return {
    latestProof: proofStore.getLatestProof(),
    latestRelease: releaseStore.listRecords()[0] ?? null,
    source: "local-private-core-operator-store",
  };
}

async function readLatestPrivateCoreOperatorTrace() {
  return (await fetchLivePrivateCoreOperatorTrace()) ?? readLatestPrivateCoreOperatorTraceFromStore();
}

async function fetchSignatureConfirmationDetails(signature) {
  if (!signature) {
    return null;
  }

  try {
    const response = await fetch(solanaRpcUrl, {
      body: JSON.stringify({
        id: "vanta-transaction-evidence-signature-status",
        jsonrpc: "2.0",
        method: "getSignatureStatuses",
        params: [[signature], { searchTransactionHistory: true }],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) {
      return {
        confirmationStatus: null,
        confirmations: null,
        err: `rpc-http-${response.status}`,
        signatureStatusSource: "solana-rpc-getSignatureStatuses",
        slot: null,
        status: "rpc-signature-error",
      };
    }

    const payload = await response.json();
    const status = payload?.result?.value?.[0] ?? null;

    if (!status) {
      return {
        confirmationStatus: null,
        confirmations: null,
        err: null,
        signatureStatusSource: "solana-rpc-getSignatureStatuses",
        slot: null,
        status: "not-confirmed",
      };
    }

    const confirmationStatus =
      typeof status.confirmationStatus === "string" ? status.confirmationStatus : null;
    const err = status.err ?? null;

    return {
      confirmationStatus,
      confirmations: typeof status.confirmations === "number" ? status.confirmations : null,
      err,
      signatureStatusSource: "solana-rpc-getSignatureStatuses",
      slot: typeof status.slot === "number" ? status.slot : null,
      status: err
        ? "rpc-signature-error"
        : confirmationStatus === "finalized"
          ? "rpc-signature-finalized"
          : confirmationStatus === "confirmed"
            ? "rpc-signature-confirmed"
            : confirmationStatus === "processed"
              ? "rpc-signature-processed"
              : "not-confirmed",
    };
  } catch (error) {
    return {
      confirmationStatus: null,
      confirmations: null,
      err: error instanceof Error ? error.name : "rpc-error",
      signatureStatusSource: "solana-rpc-getSignatureStatuses",
      slot: null,
      status: "rpc-signature-error",
    };
  }
}

async function buildFlows(currentFlows) {
  const { latestProof, latestRelease, source } = await readLatestPrivateCoreOperatorTrace();
  const transitionSignature =
    unshieldTransitionSignature ??
    currentFlows.find((flow) => flow.flow === "unshield")?.wallet?.signature ??
    null;
  const confirmationDetails = await fetchSignatureConfirmationDetails(transitionSignature);

  return currentFlows.map((flow) => {
    if (flow.flow !== "unshield") {
      return normalizeFlow(flow);
    }

    if (!latestProof && !latestRelease) {
      return normalizeFlow({
        ...flow,
        operatorTrace: {
          source: "artifact-fallback",
          proofId: flow.proof?.proofId ?? null,
          releaseRequestId: flow.operator?.requestId ?? null,
          redactedOperatorReceipt: null,
          transitionSignature,
          confirmationStatus: confirmationDetails?.confirmationStatus ?? flow.wallet?.confirmationStatus ?? null,
          confirmationDetails: {
            confirmations: confirmationDetails?.confirmations ?? null,
            err: confirmationDetails?.err ?? null,
            liveMainnetFundsMoved: false,
            observedAt: checkedAt,
            operatorReachable: false,
            signatureStatusSource: confirmationDetails?.signatureStatusSource ?? "none",
            slot: confirmationDetails?.slot ?? null,
            status: confirmationDetails?.status ?? "not-confirmed",
          },
        },
      });
    }

    const unshieldEvidence = createUnshieldTransactionEvidence({
      latestProof,
      latestRelease,
      confirmationDetails,
      observedAt: checkedAt,
      source,
      transitionSignature,
    });

    return {
      ...unshieldEvidence,
      observedAt: checkedAt,
      reviewNotes: flow.reviewNotes,
    };
  });
}

async function buildEvidencePacket() {
  const current = JSON.parse(readFileSync(evidencePath, "utf8"));
  assert.equal(current.version, VANTA_TRANSACTION_EVIDENCE_VERSION);
  assert.ok(Array.isArray(current.flows), "Current transaction evidence must include flows.");

  const packet = createTransactionEvidencePacket({
    checkedAt,
    evidencePacketId: `tx-evidence-${checkedAt.replace(/[^0-9A-Za-z]+/gu, "-").replace(/-$/u, "")}`,
    flows: await buildFlows(current.flows),
  });

  assertNoForbiddenEvidence(packet);
  return packet;
}

const evidencePacket = await buildEvidencePacket();

if (writeMode) {
  writeFileSync(evidencePath, `${JSON.stringify(evidencePacket, null, 2)}\n`);
}

if (printPacket) {
  console.log(JSON.stringify(evidencePacket, null, 2));
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      checkedAt: evidencePacket.checkedAt,
      dryRun,
      evidencePacketId: evidencePacket.evidencePacketId,
      fileRef: "ops/mainnet/transaction.evidence.json",
      firstAdoptedFlow: evidencePacket.firstAdoptedFlow,
      flowCount: evidencePacket.flows.length,
      mainnetReady: evidencePacket.mainnetReady,
      operatorBaseUrl,
      productionReady: evidencePacket.productionReady,
      solanaRpcUrlRef:
        solanaRpcUrl === process.env.SOLANA_RPC_URL
          ? "SOLANA_RPC_URL"
          : solanaRpcUrl === process.env.VITE_SOLANA_RPC_URL
            ? "VITE_SOLANA_RPC_URL"
            : "https://api.mainnet-beta.solana.com",
      transitionSignatureCaptured: Boolean(unshieldTransitionSignature),
      version: "vanta-transaction-evidence-writer-0.1",
      wroteEvidence: writeMode,
    },
    null,
    2,
  ),
);
