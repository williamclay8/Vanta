import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_NOTE_VERSION =
  "vanta-actual-private-shared-cohort-deposit-note-0.1";

const SOLANA_TX_REF_PATTERN = /^solana-tx:[1-9A-HJ-NP-Za-km-z]{32,88}$/;
const DEFAULT_ASSET_COHORT = "stablecoin-usdc-v1";
const DEFAULT_POOL_ID = "pool:stablecoin-usdc-v1:100";
const DEFAULT_PRIVATE_NOTE_PATH =
  ".tmp/vanta-actual-private-shared-cohort-note.private.json";

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function requireText(value, fieldName) {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`Shared-cohort deposit note requires ${fieldName}.`);
  }
  return text;
}

function hashHex(...parts) {
  return `0x${createHash("sha256").update(parts.join("\u001f")).digest("hex")}`;
}

function isSolanaTxRef(value) {
  return typeof value === "string" && SOLANA_TX_REF_PATTERN.test(value);
}

function redactedHash(value) {
  if (!value) {
    return null;
  }
  return hashHex("redacted-ref", value).slice(0, 18);
}

function buildNoteSecret({ env, generateSecret }) {
  const supplied = optionalText(env.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_NOTE_SECRET_REF);
  if (supplied) {
    return { generated: false, value: supplied };
  }
  if (!generateSecret) {
    return { generated: false, value: null };
  }
  return { generated: true, value: `note-secret:${randomBytes(32).toString("hex")}` };
}

function buildPrivateNoteArtifact({
  assetCohort,
  commitment,
  depositTxRef,
  leafIndex,
  merkleRoot,
  noteSecret,
  ownerPublicKeyRef,
  poolId,
  treeId,
}) {
  return {
    version: VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_NOTE_VERSION,
    createdAt: new Date().toISOString(),
    warning:
      "PRIVATE LOCAL NOTE MATERIAL. Do not commit, paste, log, or upload this artifact.",
    assetCohort,
    commitment,
    depositTxRef,
    leafIndex,
    merkleRoot,
    noteSecret,
    ownerPublicKeyRef,
    poolId,
    treeId,
  };
}

async function requestJson(url, { body, token } = {}) {
  const response = await fetch(url, {
    ...(body ? { body: JSON.stringify(body), method: "POST" } : { method: "GET" }),
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    const message = parsed?.error ?? text ?? `HTTP ${response.status}`;
    throw new Error(`Private Pool v2 indexer request failed (${response.status}): ${message}`);
  }
  return parsed;
}

export async function createVantaActualPrivateSharedCohortDepositNotePacket({
  env = process.env,
  generateSecret = false,
  record = false,
  writePrivateNote = false,
} = {}) {
  const checkedAt = new Date().toISOString();
  const depositTxRef = optionalText(env.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF);
  const ownerPublicKeyRef = optionalText(env.VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF);
  const assetCohort = optionalText(env.VANTA_ACTUAL_PRIVATE_ASSET_COHORT) ?? DEFAULT_ASSET_COHORT;
  const poolId = optionalText(env.VANTA_ACTUAL_PRIVATE_POOL_ID) ?? DEFAULT_POOL_ID;
  const treeId = poolId;
  const indexerUrl = optionalText(env.VANTA_PRIVATE_POOL_V2_INDEXER_URL);
  const indexerToken = optionalText(env.VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN);
  const noteSecret = buildNoteSecret({ env, generateSecret });
  const recordAckPresent =
    env.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_RECORD_ACK ===
    "I_UNDERSTAND_THIS_MUTATES_PRODUCTION_INDEXER";

  const blockers = [
    ...(isSolanaTxRef(depositTxRef) ? [] : ["missing-solana-shared-cohort-deposit-tx-ref"]),
    ...(ownerPublicKeyRef ? [] : ["missing-owner-public-key-ref"]),
    ...(noteSecret.value ? [] : ["missing-note-secret-ref-or-generate-secret-mode"]),
    ...(record && !indexerUrl ? ["missing-indexer-url"] : []),
    ...(record && !indexerToken ? ["missing-indexer-auth-token"] : []),
    ...(record && !recordAckPresent ? ["missing-production-indexer-record-ack"] : []),
  ];

  const commitment =
    blockers.includes("missing-solana-shared-cohort-deposit-tx-ref") ||
    blockers.includes("missing-owner-public-key-ref") ||
    blockers.includes("missing-note-secret-ref-or-generate-secret-mode")
      ? null
      : hashHex(
          VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_NOTE_VERSION,
          "commitment",
          assetCohort,
          poolId,
          depositTxRef,
          ownerPublicKeyRef,
          noteSecret.value,
        );

  let currentRoot = null;
  let commitmentCountBefore = null;
  let recordedCommitment = null;
  let privateNotePath = null;

  const canReadIndexer = indexerUrl && indexerToken && (!record || recordAckPresent);

  if (canReadIndexer) {
    const baseUrl = indexerUrl.replace(/\/+$/, "");
    const [rootPayload, commitmentsPayload] = await Promise.all([
      requestJson(`${baseUrl}/v1/roots/latest`, { token: indexerToken }),
      requestJson(`${baseUrl}/v1/commitments`, { token: indexerToken }),
    ]);
    currentRoot = rootPayload?.root ?? null;
    commitmentCountBefore = Array.isArray(commitmentsPayload?.commitments)
      ? commitmentsPayload.commitments.length
      : null;
  }

  if (record && blockers.length === 0) {
    const baseUrl = indexerUrl.replace(/\/+$/, "");
    const payload = await requestJson(`${baseUrl}/v1/commitments`, {
      body: {
        assetId: assetCohort,
        commitment,
        treeId,
      },
      token: indexerToken,
    });
    recordedCommitment = payload?.commitment ?? null;
  }

  if ((record || writePrivateNote) && commitment && noteSecret.value && recordedCommitment) {
    privateNotePath = resolve(
      process.cwd(),
      optionalText(env.VANTA_ACTUAL_PRIVATE_SHARED_COHORT_PRIVATE_NOTE_PATH) ??
        DEFAULT_PRIVATE_NOTE_PATH,
    );
    mkdirSync(dirname(privateNotePath), { recursive: true });
    writeFileSync(
      privateNotePath,
      `${JSON.stringify(
        buildPrivateNoteArtifact({
          assetCohort,
          commitment,
          depositTxRef,
          leafIndex: recordedCommitment.leafIndex,
          merkleRoot: recordedCommitment.merkleRoot,
          noteSecret: noteSecret.value,
          ownerPublicKeyRef,
          poolId,
          treeId,
        }),
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
  }

  return {
    version: VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_NOTE_VERSION,
    checkedAt,
    mode: record ? "record" : writePrivateNote ? "write-private-note" : "status",
    readyToRecord: Boolean(commitment && blockers.length === 0),
    recorded: Boolean(recordedCommitment),
    blockers,
    publicInputs: {
      assetCohort,
      commitmentPresent: Boolean(commitment),
      commitmentRef: commitment ? `commitment:${commitment}` : null,
      depositTxRef,
      ownerPublicKeyRefPresent: Boolean(ownerPublicKeyRef),
      ownerPublicKeyRefHash: redactedHash(ownerPublicKeyRef),
      poolId,
      treeId,
    },
    indexerStatus: {
      authenticated: Boolean(indexerUrl && indexerToken),
      commitmentCountBefore,
      currentRoot,
      recordEndpoint: indexerUrl ? "/v1/commitments" : null,
    },
    recordedCommitment: recordedCommitment
      ? {
          assetId: recordedCommitment.assetId,
          commitment: recordedCommitment.commitment,
          leafIndex: recordedCommitment.leafIndex,
          merkleRoot: recordedCommitment.merkleRoot,
          treeId: recordedCommitment.treeId,
        }
      : null,
    privateNote: {
      noteSecretGenerated: noteSecret.generated,
      noteSecretPresent: Boolean(noteSecret.value),
      privateNotePathWritten: Boolean(privateNotePath),
      privateNotePath: privateNotePath ? ".tmp/vanta-actual-private-shared-cohort-note.private.json" : null,
    },
    safety: {
      movesFunds: false,
      signsTransactions: false,
      submitsSolanaTransactions: false,
      mutatesProductionIndexer: record,
      printsAuthToken: false,
      printsNoteSecret: false,
      printsPrivateKeys: false,
      printsSignedTransactions: false,
    },
    nextAction:
      blockers.length > 0
        ? "Provide a real solana-tx shared-cohort deposit ref, public owner ref, and note secret/generation mode before recording."
        : record
          ? "Use the recorded commitment/root/leaf with the private note artifact to build the actual-private settlement plan."
          : "Run in --record mode with the production-indexer ACK only after the Solana deposit ref is real and reviewed.",
  };
}
