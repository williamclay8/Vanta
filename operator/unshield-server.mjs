import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@solana/client";
import { loadKeypairFromEnv } from "@solana/client/server";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  assertFreshUnshieldIntent,
  parseSignedUnshieldIntent,
  verifySignedUnshieldIntent,
} from "./unshield-auth.mjs";
import {
  assertFreshSolUnshieldIntent,
  parseSignedSolUnshieldIntent,
  verifySignedSolUnshieldIntent,
} from "./sol-unshield-auth.mjs";
import {
  assertFreshSwapIntent,
  parseSignedSwapIntent,
  verifySignedSwapIntent,
} from "./swap-auth.mjs";
import {
  assertFreshMeteoraQuote,
  assertMeteoraExecutionDrift,
  evaluateSwapLaneHealth,
  fetchMeteoraDlmmQuote,
  logSwapLaneHealth,
  validateSwapLaneConfig,
} from "./meteora-dlmm-context.mjs";
import {
  compareTitanAdvisoryQuote,
  logTitanAdvisoryComparison,
  probeTitanGatewayQuote,
  validateTitanGatewayConfig,
} from "./titan-gateway-advisory.mjs";
import {
  assertEligibleSolUnshieldTransition,
  assertEligibleSwapTransition,
  assertEligibleUnshieldTransition,
  fetchConstrainedOnchainUnshieldContext,
} from "./vanta-onchain-state.mjs";
import { createPrivateCoreConsumeStore } from "./private-core-consume-store.mjs";
import {
  createPrivateCoreProofStore,
  createPrivateCoreSendProofStore,
} from "./private-core-proof-store.mjs";
import { createPrivateCoreRootStore } from "./private-core-root-store.mjs";
import { createPrivateCoreSendStore } from "./private-core-send-store.mjs";
import {
  assertVantaPrivateCoreSourceArtifactConsistency,
  deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage,
  normalizeVantaPrivateCoreSendWitnessPackage,
  normalizeVantaPrivateCoreWitnessPackage,
  proveAndVerifyVantaPrivateCoreSend,
  proveAndVerifyVantaPrivateCoreUnshield,
} from "./private-core-proof.mjs";
import { createReleaseRecordStore } from "./release-record-store.mjs";

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.operator");
loadEnvFile(".env.operator.local");

const port = Number(process.env.VANTA_UNSHIELD_OPERATOR_PORT ?? "8789");
const endpoint =
  process.env.SOLANA_RPC_URL ??
  process.env.VITE_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";
const websocketEndpoint =
  process.env.SOLANA_WS_URL ??
  process.env.VITE_SOLANA_WS_URL ??
  endpoint.replace("https://", "wss://").replace("http://", "ws://");
const mintAddress =
  process.env.VANTA_DEVNET_TOKEN_MINT ?? process.env.VITE_VANTA_DEVNET_TOKEN_MINT;
const vaultOwner =
  process.env.VANTA_DEVNET_VAULT_OWNER ?? process.env.VITE_VANTA_DEVNET_VAULT_OWNER;

if (!mintAddress || !vaultOwner) {
  throw new Error(
    "Unshield operator requires VANTA_DEVNET_TOKEN_MINT and VANTA_DEVNET_VAULT_OWNER.",
  );
}

const client = createClient({
  endpoint,
  websocketEndpoint,
  walletConnectors: [],
});
const web3Connection = new Connection(endpoint, "confirmed");
const releaseRecords = createReleaseRecordStore();
const privateCoreConsumeStore = createPrivateCoreConsumeStore();
const privateCoreProofStore = createPrivateCoreProofStore();
const privateCoreSendProofStore = createPrivateCoreSendProofStore();
const privateCoreSendStore = createPrivateCoreSendStore();
const privateCoreReleaseRecords = createReleaseRecordStore({
  defaultPath: "operator/.vanta-private-core-releases.json",
  envKey: "VANTA_PRIVATE_CORE_RELEASE_STORE_PATH",
});
const privateCoreRootStore = createPrivateCoreRootStore();
const swapRecords = createReleaseRecordStore({
  defaultPath: "operator/.vanta-swap-records.json",
  envKey: "VANTA_SWAP_RECORD_STORE_PATH",
});
const solUnshieldRecords = createReleaseRecordStore({
  defaultPath: "operator/.vanta-sol-unshield-records.json",
  envKey: "VANTA_SOL_UNSHIELD_RECORD_STORE_PATH",
});
const processedRequestIds = new Set();
const processedNoteIds = new Set();
const processedTransitionNoteIds = new Set();
const inFlightRequestIds = new Set();
const processedSwapRequestIds = new Set();
const processedSwapNoteIds = new Set();
const processedSwapTransitionNoteIds = new Set();
const inFlightSwapRequestIds = new Set();
const processedSolUnshieldRequestIds = new Set();
const processedSolUnshieldNoteIds = new Set();
const processedSolUnshieldTransitionNoteIds = new Set();
const inFlightSolUnshieldRequestIds = new Set();
const swapLaneConfigValidation = validateSwapLaneConfig();
const titanGatewayConfigValidation = validateTitanGatewayConfig();
const swapTransitionLookupAttempts = Number(
  process.env.VANTA_SWAP_TRANSITION_LOOKUP_ATTEMPTS ?? "12",
);
const swapTransitionLookupDelayMs = Number(
  process.env.VANTA_SWAP_TRANSITION_LOOKUP_DELAY_MS ?? "1000",
);
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const PRIVATE_CORE_SUPPORTED_SEND_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SEND_LANE_KIND = "single-input-single-recipient-optional-change";
const PRIVATE_CORE_SUPPORTED_SEND_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_SEND_LANE_NOTE =
  "Current narrow zk v1 send lane is supported for one input note, one recipient output, and optional change.";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_KIND = "single-note-proof-backed-consume";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_NOTE =
  "Current narrow zk v1 unshield lane is supported for one note consume with proof-backed release recording.";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_KIND = "proof-backed-consume-latest-registered-root";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_NOTE =
  "Current narrow zk v1 release lane is supported for proof-backed consume-authorized release under the latest registered root policy.";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION_NOTE =
  "Current operator-backed proof-backed release lane is accepted as the narrow zk v1 release path for VUSD on solana-devnet.";
const PRIVATE_CORE_SUPPORTED_FLOW_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_FLOW_KIND = "shield-hold-send-unshield-replay-guard";
const PRIVATE_CORE_SUPPORTED_FLOW_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_FLOW_NOTE =
  "Current narrow zk v1 product flow is shield, hold, private send, unshield, and replay guard on the resulting consume path.";
const PRIVATE_CORE_SUPPORTED_ASSET_SYMBOL = "VUSD";
const PRIVATE_CORE_SUPPORTED_ENVIRONMENT = "solana-devnet";
const PRIVATE_CORE_SUPPORTED_RECIPIENT_MODEL = "hashed-reference-to-owner-key";
const PRIVATE_CORE_SUPPORTED_RELEASE_DESTINATION_MODEL = "32-byte-release-destination-field";
const PRIVATE_CORE_SUPPORTED_NOTE_SCHEMA = "note-v0";
const PRIVATE_CORE_SUPPORTED_NOTE_VERSION = 0;
const PRIVATE_CORE_SUPPORTED_ROOT_REGISTRATION_PROVENANCE =
  "shield-input|send-recipient-output|send-change-output";
const PRIVATE_CORE_SUPPORTED_SEND_RESULTING_ROOT_BASIS = "client-declared";
const PRIVATE_CORE_SUPPORTED_SEND_INPUT_ROOT_POLICY =
  "latest-registered-root-with-linked-registration-proof";
const PRIVATE_CORE_SUPPORTED_SEND_OUTPUT_REGISTRATION_POLICY =
  "resulting-root-must-register-as-recipient-or-change-output";
const PRIVATE_CORE_SUPPORTED_PROOF_SYSTEM = "noir-acir-ultrahonk-bbjs";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_CIRCUIT = "vanta_private_core_single_note_unshield";
const PRIVATE_CORE_SUPPORTED_SEND_CIRCUIT = "vanta_private_core_single_note_send";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_MERKLE_DEPTH = 3;
const PRIVATE_CORE_SUPPORTED_SEND_MERKLE_DEPTH = 3;
const PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS = "proof-backed-consume";
const PRIVATE_CORE_RELEASE_ROOT_POLICY = "latest-registered-root";
const PRIVATE_CORE_RELEASE_EXECUTION_MODEL = "operator-recorded-devnet-release";
const PRIVATE_CORE_RELEASE_ATOMICITY_MODEL = "operator-local-atomic-consume-and-release-record";
const PRIVATE_CORE_RELEASE_PERSISTENCE_MODEL = "json-store-v1";
const PRIVATE_CORE_OWNER_AUTH_MODE = "x25519-secret-prechecked-off-circuit";
const PRIVATE_CORE_OWNER_AUTH_DECISION = "accepted-v1-off-circuit-precheck";
const PRIVATE_CORE_OWNER_AUTH_DECISION_NOTE =
  "Current narrow zk v1 explicitly accepts off-circuit prechecked X25519 owner authorization; in-circuit owner auth is deferred.";
const PRIVATE_CORE_SOURCE_ARTIFACT_TRUTH_BASIS = "source-layer-artifact-bundle";
const PRIVATE_CORE_PROVING_ARTIFACT_TRUTH_BASIS = "verified-proving-public-input-vector";
const PRIVATE_CORE_SOURCE_PROVING_RELATIONSHIP = "explicit-split-no-implicit-equality";
const PRIVATE_CORE_NULLIFIER_KEY_MODE = "note-secret-as-nullifier-key-v0";
const PRIVATE_CORE_NULLIFIER_KEY_DECISION = "accepted-v1-temporary-note-secret-key";
const PRIVATE_CORE_NULLIFIER_KEY_DECISION_NOTE =
  "Current narrow zk v1 explicitly accepts the temporary note-secret nullifier-key basis; a stronger in-circuit key contract is deferred.";
const PRIVATE_CORE_PROVING_HASH_LANE = "poseidon-bn254-proving-lane-v0";

if (!swapLaneConfigValidation.valid) {
  console.warn(
    "[vanta.swap.health.startup]",
    JSON.stringify({
      expectedPair: "VUSD->SOL",
      issues: swapLaneConfigValidation.issues,
      poolAddress: swapLaneConfigValidation.config.poolAddress,
      status: "misconfigured",
    }),
  );
}

if (!titanGatewayConfigValidation.valid) {
  console.warn(
    "[vanta.swap.titan.startup]",
    JSON.stringify({
      issues: titanGatewayConfigValidation.issues,
      status: "advisory_unavailable",
    }),
  );
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    writeCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health/swap") {
    const health = await evaluateSwapLaneHealth({
      inputMint: mintAddress,
      outputMint: "So11111111111111111111111111111111111111112",
    });
    logSwapLaneHealth(health, "/health/swap");
    writeCorsHeaders(response);
    response.writeHead(
      health.status === "healthy" || health.status === "degraded" ? 200 : 503,
      { "Content-Type": "application/json" },
    );
    response.end(JSON.stringify(health));
    return;
  }

  if (request.method === "GET" && request.url === "/state/sol-unshield-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        consumedNoteIds: solUnshieldRecords.listConsumedNoteIds(),
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-consumes") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreConsumeStore.listConsumes();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestConsume: records[0] ?? null,
        records,
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-summary") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreSummaryState()));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-contract") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreContractState()));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-proofs") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreProofStore.listProofs();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestProof: records[0] ?? null,
        records,
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-send-proofs") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreSendProofStore.listProofs();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestProof: records[0] ?? null,
        records,
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-sends") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreSendStore.listSends();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestSend: records[0] ?? null,
        records,
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-releases") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreReleaseRecords.listRecords();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestRelease: records[0] ?? null,
        records,
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-roots") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const currentRecord = privateCoreRootStore.getLatestRoot();
    const currentRoot = currentRecord?.root ?? null;
    response.end(
      JSON.stringify({
        currentRecord,
        stateVersion: 1,
        currentRoot,
        records: privateCoreRootStore.listRoots(),
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/swap-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        records: swapRecords.listRecords(),
      }),
    );
    return;
  }

  if (request.method === "POST" && request.url === "/swap/quote") {
    try {
      const body = await readJsonBody(request);
      const inputAmount = Number(body.inputAmount);

      if (
        body.inputAsset !== "VUSD" ||
        body.outputAsset !== "SOL" ||
        !Number.isFinite(inputAmount) ||
        inputAmount <= 0
      ) {
        throw new Error("Invalid constrained swap quote request.");
      }
      const quote = await fetchMeteoraDlmmQuote({
        inputAmount: inputAmount.toFixed(6),
        inputMint: mintAddress,
        outputMint: "So11111111111111111111111111111111111111112",
      });
      const titanAdvisory = compareTitanAdvisoryQuote({
        meteoraOutputAmount: quote.outputAmount,
        titan: await probeTitanGatewayQuote({
          inputAmount: inputAmount.toFixed(6),
          inputMint: mintAddress,
          outputMint: "So11111111111111111111111111111111111111112",
          userPublicKey: vaultOwner,
        }),
      });
      logTitanAdvisoryComparison(titanAdvisory, "/swap/quote");

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          inputAmount: quote.inputAmount,
          inputAsset: "VUSD",
          outputAmount: quote.outputAmount,
          outputAsset: "SOL",
          pairLabel: quote.pairLabel,
          quoteExpiresAt: quote.quoteExpiresAt,
          quoteId: quote.quoteId,
          quoteTimestamp: quote.quoteTimestamp,
          venueFamily: quote.venueFamily,
          venueName: quote.venueName,
          venueNetwork: quote.venueNetwork,
          venuePoolAddress: quote.poolAddress,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The swap operator could not prepare a quote.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/unshield-proof") {
    try {
      const body = await readJsonBody(request);
      const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({
        witnessPackage: body.witnessPackage,
      });
      privateCoreProofStore.recordProof(
        summarizePrivateCoreProofRecord({
          action: "proof-only",
          proofReceipt,
          witnessPackage: body.witnessPackage,
        }),
      );

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(proofReceipt));
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core proof operator could not process the witness package.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/send-proof") {
    try {
      const body = await readJsonBody(request);
      const witnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(body?.witnessPackage);
      const proofReceipt = await proveAndVerifyVantaPrivateCoreSend({
        witnessPackage,
      });
      privateCoreSendProofStore.recordProof(
        summarizePrivateCoreSendProofRecord({
          action: "send-proof",
          proofReceipt,
          witnessPackage,
        }),
      );

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(proofReceipt));
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core send proof operator could not process the witness package.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/send-transition") {
    try {
      const body = await readJsonBody(request);
      const witnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(body?.witnessPackage);
      const sourcePublicInputs = witnessPackage.sourcePublicInputs;
      const inputArtifacts = deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage(witnessPackage);

      if (!privateCoreRootStore.hasRoot(sourcePublicInputs.stateRoot)) {
        throw new Error("Private-core send transition input root is not registered.");
      }

      const latestRootRecord = privateCoreRootStore.getLatestRoot();
      if (!latestRootRecord || latestRootRecord.root !== sourcePublicInputs.stateRoot) {
        throw new Error("Private-core send transition input root is not the latest registered root.");
      }

      if (latestRootRecord.assetId !== inputArtifacts.assetId) {
        throw new Error("Private-core send transition asset does not match the registered input root.");
      }

      if (latestRootRecord.amount !== inputArtifacts.amount) {
        throw new Error("Private-core send transition amount basis does not match the registered input root.");
      }

      if (latestRootRecord.noteCommitment !== inputArtifacts.noteCommitment) {
        throw new Error(
          "Private-core send transition source note commitment does not match the registered input root.",
        );
      }

      if (latestRootRecord.merkleLeaf !== inputArtifacts.merkleLeaf) {
        throw new Error(
          "Private-core send transition source Merkle leaf does not match the registered input root.",
        );
      }

      if (latestRootRecord.witnessRoot !== inputArtifacts.witnessRoot) {
        throw new Error(
          "Private-core send transition source witness root does not match the registered input root.",
        );
      }

      const latestRootLinkedProof =
        latestRootRecord.proofId
          ? privateCoreProofStore
              .listProofs()
              .find((record) => record.proofId === latestRootRecord.proofId) ?? null
          : null;
      const latestRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
        linkedProof: latestRootLinkedProof,
        rootRecord: latestRootRecord,
      });

      if (latestRootProofLinkStatus !== "linked") {
        throw new Error(
          latestRootProofLinkStatus === "mismatch"
            ? "Private-core send transition input root does not match its linked registration proof."
            : "Private-core send transition input root registration proof linkage is unavailable.",
        );
      }

      const resultingRoot = normalizePrivateCoreHex32(
        body?.resultingRoot,
        "Private-core send resulting root",
      );
      if (resultingRoot === sourcePublicInputs.stateRoot) {
        throw new Error("Private-core send resulting root must differ from the input root.");
      }
      const proofReceipt = await proveAndVerifyVantaPrivateCoreSend({
        witnessPackage,
      });
      const proofRecord = summarizePrivateCoreSendProofRecord({
        action: "send-proof",
        proofReceipt,
        witnessPackage,
      });
      privateCoreSendProofStore.recordProof(proofRecord);
      const sendRecord = summarizePrivateCoreSendRecord({
        proofRecord,
        proofReceipt,
        resultingRoot,
        witnessPackage,
      });
      privateCoreSendStore.recordSend(sendRecord);

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...proofReceipt,
          completedAt: sendRecord.completedAt,
          inputNullifier: sendRecord.inputNullifier,
          inputRoot: sendRecord.inputRoot,
          recipientCommitment: sendRecord.recipientCommitment,
          resultingRootBasis: sendRecord.resultingRootBasis,
          resultingRoot: sendRecord.resultingRoot,
          changeCommitment: sendRecord.changeCommitment,
          proofId: sendRecord.proofId,
          sendAmount: sendRecord.sendAmount,
          sendId: sendRecord.sendId,
          sendRecorded: true,
          changeAmount: sendRecord.changeAmount,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core send operator could not process the transition request.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/register-root") {
    try {
      const body = await readJsonBody(request);
      const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({
        witnessPackage: body?.witnessPackage,
      });
      const witnessPackage = normalizeVantaPrivateCoreWitnessPackage(body?.witnessPackage);
      const sourcePublicInputs = witnessPackage.sourcePublicInputs;
      const sourceArtifacts = body?.sourceArtifacts;
      const root = sourcePublicInputs?.stateRoot;

      if (typeof root !== "string" || root.length === 0) {
        throw new Error("Private-core root registration request is missing a source root.");
      }

      assertVantaPrivateCoreSourceArtifactConsistency(sourceArtifacts, witnessPackage);
      const latestSend = privateCoreSendStore.getLatestSend();
      const sendRegistrationConsistency = assertPrivateCoreSendResultingRootRegistrationConsistency({
        latestSend,
        root,
        sourceArtifacts,
      });
      const proofRecord = summarizePrivateCoreProofRecord({
        action: "register-root",
        proofReceipt,
        witnessPackage,
      });
      privateCoreProofStore.recordProof(proofRecord);

      privateCoreRootStore.recordRoot({
        root,
        recordedAt: Date.now(),
        noteCommitment: sourceArtifacts.noteCommitment,
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
        amount: typeof sourcePublicInputs?.amount === "string" ? sourcePublicInputs.amount : null,
        assetId: typeof sourcePublicInputs?.assetId === "string" ? sourcePublicInputs.assetId : null,
        registrationBasis: sendRegistrationConsistency.registrationBasis,
        proofId: proofRecord.proofId,
        source: sendRegistrationConsistency.source,
      });

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          known: true,
          root,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core root operator could not process the request.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/unshield-consume") {
    try {
      const body = await readJsonBody(request);
      const proofReceipt = await proveAndVerifyVantaPrivateCoreUnshield({
        witnessPackage: body.witnessPackage,
      });
      const sourcePublicInputs = body?.witnessPackage?.sourcePublicInputs;
      const sourceArtifacts = body?.sourceArtifacts;
      const nullifier = sourcePublicInputs?.nullifier;

      if (typeof nullifier !== "string" || nullifier.length === 0) {
        throw new Error("Private-core consume request is missing a source nullifier.");
      }

      if (
        typeof sourcePublicInputs?.stateRoot !== "string" ||
        sourcePublicInputs.stateRoot.length === 0
      ) {
        throw new Error("Private-core consume request is missing a source root.");
      }

      if (!privateCoreRootStore.hasRoot(sourcePublicInputs.stateRoot)) {
        throw new Error(
          `State root ${sourcePublicInputs.stateRoot} is not registered as current private-core state.`,
        );
      }

      const latestRootRecord = privateCoreRootStore.getLatestRoot();

      if (!latestRootRecord || latestRootRecord.root !== sourcePublicInputs.stateRoot) {
        throw new Error(
          `State root ${sourcePublicInputs.stateRoot} is not the latest registered private-core state.`,
        );
      }

      assertVantaPrivateCoreSourceArtifactConsistency(sourceArtifacts, body?.witnessPackage);
      const proofRecord = summarizePrivateCoreProofRecord({
        action: "consume",
        proofReceipt,
        witnessPackage: body.witnessPackage,
      });
      privateCoreProofStore.recordProof(proofRecord);

      if (latestRootRecord.assetId !== sourcePublicInputs.assetId) {
        throw new Error("Registered private-core root asset metadata does not match this consume request.");
      }

      if (latestRootRecord.amount !== sourcePublicInputs.amount) {
        throw new Error("Registered private-core root amount metadata does not match this consume request.");
      }

      if (latestRootRecord.noteCommitment !== sourceArtifacts.noteCommitment) {
        throw new Error(
          "Registered private-core root note commitment metadata does not match this consume request.",
        );
      }

      if (latestRootRecord.merkleLeaf !== sourceArtifacts.merkleLeaf) {
        throw new Error(
          "Registered private-core root Merkle leaf metadata does not match this consume request.",
        );
      }

      if (latestRootRecord.witnessRoot !== sourceArtifacts.witnessRoot) {
        throw new Error(
          "Registered private-core root witness root metadata does not match this consume request.",
        );
      }

      if (privateCoreConsumeStore.hasNullifier(nullifier)) {
        throw new Error(`Nullifier ${nullifier} has already been consumed.`);
      }

      if (privateCoreReleaseRecords.hasConsumedNoteId(`private-core-nullifier:${nullifier}`)) {
        throw new Error(`Private-core release for nullifier ${nullifier} has already been recorded.`);
      }

      const releaseRequestId = `private-core-release:${nullifier}:${sourcePublicInputs.stateRoot}`;
      const releaseTransitionNoteId =
        `private-core-release:${sourcePublicInputs.stateRoot}:${sourcePublicInputs.releaseDestination}`;

      if (privateCoreReleaseRecords.hasRequestId(releaseRequestId)) {
        throw new Error(`Private-core release request ${releaseRequestId} has already been recorded.`);
      }

      if (privateCoreReleaseRecords.hasTransitionNoteId(releaseTransitionNoteId)) {
        throw new Error(
          `Private-core release transition ${releaseTransitionNoteId} has already been recorded.`,
        );
      }

      const consumeRecord = {
        assetId: sourcePublicInputs.assetId,
        amount: sourcePublicInputs.amount,
        completedAt: Date.now(),
        leafIndex: body?.witnessPackage?.privateWitness?.leaf_index ?? null,
        nullifier,
        proofFieldCount: proofReceipt.proofFieldCount,
        proofId: proofRecord.proofId,
        publicInputCount: proofReceipt.publicInputCount,
        releaseDestination: sourcePublicInputs.releaseDestination,
        root: sourcePublicInputs.stateRoot,
      };

      privateCoreConsumeStore.recordConsume(consumeRecord);
      privateCoreReleaseRecords.recordRelease({
        assetId: sourcePublicInputs.assetId,
        amount: sourcePublicInputs.amount,
        authorizationBasis: PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS,
        completedAt: consumeRecord.completedAt,
        consumedNoteId: `private-core-nullifier:${nullifier}`,
        nullifier,
        proofFieldCount: proofReceipt.proofFieldCount,
        proofId: proofRecord.proofId,
        publicInputCount: proofReceipt.publicInputCount,
        releaseDestination: sourcePublicInputs.releaseDestination,
        rootPolicy: PRIVATE_CORE_RELEASE_ROOT_POLICY,
        releasedAssetId: sourcePublicInputs.assetId,
        releasedAmount: sourcePublicInputs.amount,
        requestId: releaseRequestId,
        root: sourcePublicInputs.stateRoot,
        transitionNoteId: releaseTransitionNoteId,
      });

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...proofReceipt,
          completedAt: consumeRecord.completedAt,
          leafIndex: consumeRecord.leafIndex,
          proofId: proofRecord.proofId,
          authorizationBasis: PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS,
          releaseDestination: sourcePublicInputs.releaseDestination,
          releaseRecorded: true,
          releaseRequestId,
          rootPolicy: PRIVATE_CORE_RELEASE_ROOT_POLICY,
          releaseTransitionNoteId,
          releasedAssetId: sourcePublicInputs.assetId,
          releasedAmount: sourcePublicInputs.amount,
          root: sourcePublicInputs.stateRoot,
          nullifier,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core consume operator could not process the request.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/swap") {
    try {
      const body = await readJsonBody(request);
      const intent = parseSignedSwapIntent(body);
      const parsedInputAmount = Number(intent.inputAmount);
      const parsedOutputAmount = Number(intent.outputAmount);

      if (
        intent.owner !== intent.requester ||
        intent.mintAddress !== mintAddress ||
        intent.vaultOwner !== vaultOwner ||
        intent.inputAsset !== "VUSD" ||
        intent.outputAsset !== "SOL" ||
        !Number.isFinite(parsedInputAmount) ||
        parsedInputAmount <= 0 ||
        !Number.isFinite(parsedOutputAmount) ||
        parsedOutputAmount <= 0
      ) {
        throw new Error("Invalid authenticated swap request.");
      }

      assertFreshSwapIntent(intent);
      assertFreshMeteoraQuote(intent);

      if (!verifySignedSwapIntent(intent)) {
        throw new Error("Wallet signature verification failed for this swap request.");
      }

      const latestVenueQuote = await fetchMeteoraDlmmQuote({
        inputAmount: parsedInputAmount.toFixed(6),
        inputMint: mintAddress,
        outputMint: "So11111111111111111111111111111111111111112",
      });
      const titanAdvisory = compareTitanAdvisoryQuote({
        meteoraOutputAmount: latestVenueQuote.outputAmount,
        titan: await probeTitanGatewayQuote({
          inputAmount: parsedInputAmount.toFixed(6),
          inputMint: mintAddress,
          outputMint: "So11111111111111111111111111111111111111112",
          userPublicKey: vaultOwner,
        }),
      });
      logTitanAdvisoryComparison(titanAdvisory, "/swap");

      if (
        intent.venueName !== latestVenueQuote.venueName ||
        intent.venueFamily !== latestVenueQuote.venueFamily ||
        intent.venueNetwork !== latestVenueQuote.venueNetwork ||
        intent.venuePoolAddress !== latestVenueQuote.poolAddress
      ) {
        throw new Error("Meteora venue context no longer matches the constrained swap lane.");
      }

      assertMeteoraExecutionDrift({
        latestOutputAmount: latestVenueQuote.outputAmount,
        quotedOutputAmount: intent.outputAmount,
      });

      if (inFlightSwapRequestIds.has(intent.requestId)) {
        throw new Error("This swap request has already been submitted.");
      }

      inFlightSwapRequestIds.add(intent.requestId);

      try {
        await waitForEligibleSwapTransition({
          client,
          consumedNoteId: intent.consumedNoteId,
          inputAmount: intent.inputAmount,
          mintAddress,
          outputAmount: intent.outputAmount,
          outputNoteId: intent.outputNoteId,
          owner: intent.owner,
          quoteExpiresAt: intent.quoteExpiresAt,
          quoteId: intent.quoteId,
          quoteTimestamp: intent.quoteTimestamp,
          transitionNoteId: intent.transitionNoteId,
          transitionStateSignature: intent.transitionStateSignature,
          vaultOwner,
          venueFamily: intent.venueFamily,
          venueName: intent.venueName,
          venueNetwork: intent.venueNetwork,
          venuePoolAddress: intent.venuePoolAddress,
        });
      } finally {
        inFlightSwapRequestIds.delete(intent.requestId);
      }

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      swapRecords.recordRelease({
        completedAt: Date.now(),
        consumedNoteId: intent.consumedNoteId,
        inputAmount: intent.inputAmount,
        inputAsset: "VUSD",
        mintAddress,
        outputAmount: intent.outputAmount,
        outputAsset: "SOL",
        outputNoteId: intent.outputNoteId,
        owner: intent.owner,
        quoteExpiresAt: intent.quoteExpiresAt,
        quoteId: intent.quoteId,
        quoteTimestamp: intent.quoteTimestamp,
        requestId: intent.requestId,
        transitionNoteId: intent.transitionNoteId,
        titanAdvisory,
        transitionStateSignature: intent.transitionStateSignature,
        venueFamily: intent.venueFamily,
        venueName: intent.venueName,
        venueNetwork: intent.venueNetwork,
        venuePoolAddress: intent.venuePoolAddress,
        vaultOwner,
      });
      response.end(
        JSON.stringify({
          quoteId: intent.quoteId,
          requestId: intent.requestId,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error ? error.message : "The swap operator could not process the request.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/unshield/sol") {
    try {
      const body = await readJsonBody(request);
      const intent = parseSignedSolUnshieldIntent(body);
      const parsedAmount = Number(intent.amount);

      if (
        intent.owner !== intent.requester ||
        intent.destinationOwner !== intent.requester ||
        intent.asset !== "SOL" ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        throw new Error("Invalid authenticated SOL unshield request.");
      }

      assertFreshSolUnshieldIntent(intent);

      if (!verifySignedSolUnshieldIntent(intent)) {
        throw new Error("Wallet signature verification failed for this SOL unshield request.");
      }

      if (
        processedSolUnshieldRequestIds.has(intent.requestId) ||
        inFlightSolUnshieldRequestIds.has(intent.requestId)
      ) {
        throw new Error("This SOL unshield request has already been submitted.");
      }

      if (
        processedSolUnshieldRequestIds.has(intent.requestId) ||
        solUnshieldRecords.hasRequestId(intent.requestId)
      ) {
        throw new Error("This SOL unshield request has already been finalized.");
      }

      if (
        processedSolUnshieldNoteIds.has(intent.consumedNoteId) ||
        solUnshieldRecords.hasConsumedNoteId(intent.consumedNoteId)
      ) {
        throw new Error("This shielded SOL note has already been returned to Public Wallet.");
      }

      if (
        processedSolUnshieldTransitionNoteIds.has(intent.transitionNoteId) ||
        solUnshieldRecords.hasTransitionNoteId(intent.transitionNoteId)
      ) {
        throw new Error("This SOL unshield transition has already been finalized.");
      }

      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client,
        mintAddress,
        owner: intent.owner,
        vaultOwner,
      });

      assertEligibleSolUnshieldTransition({
        amount: intent.amount,
        assetId: intent.assetId,
        context: onchainContext,
        consumedNoteId: intent.consumedNoteId,
        destinationOwner: intent.destinationOwner,
        owner: intent.owner,
        transitionNoteId: intent.transitionNoteId,
        vaultOwner,
      });

      const keypair = loadWeb3KeypairFromEnv("VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY");
      const signerAddress = keypair.publicKey.toBase58();

      if (signerAddress !== vaultOwner) {
        throw new Error("Configured operator signer does not match the Vanta vault owner.");
      }

      inFlightSolUnshieldRequestIds.add(intent.requestId);

      let signature;

      try {
        signature = await sendAndConfirmTransaction(
          web3Connection,
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              lamports: solAmountToLamports(parsedAmount),
              toPubkey: new PublicKey(intent.destinationOwner),
            }),
          ),
          [keypair],
          {
            commitment: "confirmed",
          },
        );
      } finally {
        inFlightSolUnshieldRequestIds.delete(intent.requestId);
      }

      processedSolUnshieldRequestIds.add(intent.requestId);
      processedSolUnshieldNoteIds.add(intent.consumedNoteId);
      processedSolUnshieldTransitionNoteIds.add(intent.transitionNoteId);
      solUnshieldRecords.recordRelease({
        amount: intent.amount,
        asset: "SOL",
        assetId: intent.assetId,
        completedAt: Date.now(),
        consumedNoteId: intent.consumedNoteId,
        destinationOwner: intent.destinationOwner,
        owner: intent.owner,
        releaseSignature: signature,
        requestId: intent.requestId,
        transitionNoteId: intent.transitionNoteId,
        vaultOwner,
      });

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          consumedNoteId: intent.consumedNoteId,
          requestId: intent.requestId,
          signature,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The SOL unshield operator could not process the request.",
      );
    }
    return;
  }

  if (request.method !== "POST" || request.url !== "/unshield") {
    writeCorsHeaders(response);
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  try {
    const body = await readJsonBody(request);
    const intent = parseSignedUnshieldIntent(body);
    const parsedAmount = Number(intent.amount);

    if (
      intent.owner !== intent.requester ||
      intent.destinationOwner !== intent.requester ||
      intent.mintAddress !== mintAddress ||
      intent.vaultOwner !== vaultOwner ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      throw new Error("Invalid authenticated unshield request.");
    }

    assertFreshUnshieldIntent(intent);

    if (!verifySignedUnshieldIntent(intent)) {
      throw new Error("Wallet signature verification failed for this unshield request.");
    }

    if (processedRequestIds.has(intent.requestId) || inFlightRequestIds.has(intent.requestId)) {
      throw new Error("This unshield request has already been submitted.");
    }

    if (
      processedRequestIds.has(intent.requestId) ||
      releaseRecords.hasRequestId(intent.requestId)
    ) {
      throw new Error("This unshield request has already been finalized.");
    }

    if (
      processedNoteIds.has(intent.noteId) ||
      releaseRecords.hasConsumedNoteId(intent.noteId)
    ) {
      throw new Error("This spendable note has already been returned to Public Wallet.");
    }

    if (
      processedTransitionNoteIds.has(intent.transitionNoteId) ||
      releaseRecords.hasTransitionNoteId(intent.transitionNoteId)
    ) {
      throw new Error("This unshield transition has already been finalized.");
    }

    await waitForEligibleUnshieldTransition({
      amount: intent.amount,
      client,
      destinationOwner: intent.destinationOwner,
      mintAddress,
      noteId: intent.noteId,
      owner: intent.owner,
      transitionNoteId: intent.transitionNoteId,
      transitionStateSignature: intent.transitionStateSignature,
      vaultOwner,
    });

    const keypair = await loadKeypairFromEnv("VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY");
    const signerAddress = keypair.signer.address.toString();

    if (signerAddress !== vaultOwner) {
      throw new Error("Configured operator signer does not match the Vanta vault owner.");
    }

    inFlightRequestIds.add(intent.requestId);

    let signature;

    try {
      signature = await client.helpers
        .splToken({
          mint: mintAddress,
          tokenProgram: "auto",
        })
        .sendTransfer({
          amount: intent.amount,
          authority: keypair.signer,
          destinationOwner: intent.destinationOwner,
          sourceOwner: vaultOwner,
        });
    } finally {
      inFlightRequestIds.delete(intent.requestId);
    }

    processedRequestIds.add(intent.requestId);
    processedNoteIds.add(intent.noteId);
    processedTransitionNoteIds.add(intent.transitionNoteId);
    releaseRecords.recordRelease({
      amount: intent.amount,
      completedAt: Date.now(),
      consumedNoteId: intent.noteId,
      destinationOwner: intent.destinationOwner,
      mintAddress,
      owner: intent.owner,
      releaseSignature: signature.toString(),
      requestId: intent.requestId,
      transitionNoteId: intent.transitionNoteId,
      vaultOwner,
    });

    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        noteId: intent.noteId,
        requestId: intent.requestId,
        signature: signature.toString(),
      }),
    );
  } catch (error) {
    writeCorsHeaders(response);
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(
      error instanceof Error
        ? error.message
        : "The unshield operator could not process the request.",
    );
  }
});

async function waitForEligibleSwapTransition(args) {
  let lastError = null;

  for (let attempt = 0; attempt < swapTransitionLookupAttempts; attempt += 1) {
    try {
      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client: args.client,
        mintAddress: args.mintAddress,
        owner: args.owner,
        vaultOwner: args.vaultOwner,
      });

      assertEligibleSwapTransition({
        consumedNoteId: args.consumedNoteId,
        context: onchainContext,
        inputAmount: args.inputAmount,
        outputAmount: args.outputAmount,
        outputNoteId: args.outputNoteId,
        owner: args.owner,
        quoteExpiresAt: args.quoteExpiresAt,
        quoteId: args.quoteId,
        quoteTimestamp: args.quoteTimestamp,
        transitionNoteId: args.transitionNoteId,
        venueFamily: args.venueFamily,
        venueName: args.venueName,
        venueNetwork: args.venueNetwork,
        venuePoolAddress: args.venuePoolAddress,
        vaultOwner: args.vaultOwner,
      });

      return;
    } catch (error) {
      lastError = error;

      if (await verifySwapTransitionBySignature(args)) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const canRetry =
        message === "Referenced onchain swap transition was not found." &&
        attempt < swapTransitionLookupAttempts - 1;

      if (!canRetry) {
        throw error;
      }

      await sleep(swapTransitionLookupDelayMs);
    }
  }

  throw lastError ?? new Error("Referenced onchain swap transition was not found.");
}

async function waitForEligibleUnshieldTransition(args) {
  let lastError = null;

  for (let attempt = 0; attempt < swapTransitionLookupAttempts; attempt += 1) {
    try {
      const onchainContext = await fetchConstrainedOnchainUnshieldContext({
        client: args.client,
        mintAddress: args.mintAddress,
        owner: args.owner,
        vaultOwner: args.vaultOwner,
      });

      assertEligibleUnshieldTransition({
        amount: args.amount,
        context: onchainContext,
        destinationOwner: args.destinationOwner,
        mintAddress: args.mintAddress,
        noteId: args.noteId,
        owner: args.owner,
        transitionNoteId: args.transitionNoteId,
        vaultOwner: args.vaultOwner,
      });

      return;
    } catch (error) {
      lastError = error;

      if (await verifyUnshieldTransitionBySignature(args)) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const canRetry =
        message === "Referenced onchain unshield transition was not found." &&
        attempt < swapTransitionLookupAttempts - 1;

      if (!canRetry) {
        throw error;
      }

      await sleep(swapTransitionLookupDelayMs);
    }
  }

  throw lastError ?? new Error("Referenced onchain unshield transition was not found.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyUnshieldTransitionBySignature(args) {
  if (!args.transitionStateSignature) {
    return false;
  }

  try {
    const transaction = await web3Connection.getParsedTransaction(
      args.transitionStateSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );
    const memo = extractMemoFromParsedTransaction(transaction, VANTA_UNSHIELD_MEMO_PREFIX);

    if (!memo) {
      return false;
    }

    const payload = parseUnshieldMemoPayload(memo);

    return Boolean(
      payload &&
        payload.owner === args.owner &&
        payload.vaultOwner === args.vaultOwner &&
        payload.mintAddress === args.mintAddress &&
        payload.consumedNoteId === args.noteId &&
        payload.noteId === args.transitionNoteId &&
        payload.destinationOwner === args.destinationOwner &&
        payload.amount === args.amount,
    );
  } catch {
    return false;
  }
}

async function verifySwapTransitionBySignature(args) {
  if (!args.transitionStateSignature) {
    return false;
  }

  try {
    const transaction = await web3Connection.getParsedTransaction(
      args.transitionStateSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );
    const memo = extractMemoFromParsedTransaction(transaction, VANTA_SWAP_MEMO_PREFIX);

    if (!memo) {
      return false;
    }

    const payload = parseSwapMemoPayload(memo);

    return Boolean(
      payload &&
        payload.owner === args.owner &&
        payload.vaultOwner === args.vaultOwner &&
        payload.mintAddress === args.mintAddress &&
        payload.consumedNoteId === args.consumedNoteId &&
        payload.noteId === args.transitionNoteId &&
        payload.outputNoteId === args.outputNoteId &&
        payload.inputAmount === args.inputAmount &&
        payload.outputAmount === args.outputAmount &&
        payload.quoteId === args.quoteId &&
        payload.quoteTimestamp === args.quoteTimestamp &&
        payload.quoteExpiresAt === args.quoteExpiresAt &&
        payload.venueName === args.venueName &&
        payload.venueFamily === args.venueFamily &&
        payload.venueNetwork === args.venueNetwork &&
        payload.venuePoolAddress === args.venuePoolAddress,
    );
  } catch {
    return false;
  }
}

function extractMemoFromParsedTransaction(transaction, prefix) {
  const instructions = transaction?.transaction?.message?.instructions;

  if (!Array.isArray(instructions)) {
    return null;
  }

  for (const instruction of instructions) {
    const programId =
      typeof instruction?.programId?.toBase58 === "function"
        ? instruction.programId.toBase58()
        : instruction?.programId;

    if (programId !== VANTA_MEMO_PROGRAM_ID) {
      continue;
    }

    if (typeof instruction?.parsed === "string") {
      return instruction.parsed.includes(prefix) ? instruction.parsed : null;
    }

    if (typeof instruction?.parsed?.memo === "string") {
      return instruction.parsed.memo.includes(prefix) ? instruction.parsed.memo : null;
    }
  }

  return null;
}

function parseUnshieldMemoPayload(memo) {
  if (typeof memo !== "string") {
    return null;
  }

  const memoStart = memo.indexOf(VANTA_UNSHIELD_MEMO_PREFIX);

  if (memoStart === -1) {
    return null;
  }

  try {
    const parsed = JSON.parse(memo.slice(memoStart + VANTA_UNSHIELD_MEMO_PREFIX.length));

    return {
      amount: parsed.amount,
      consumedNoteId: parsed.consumedNoteId ?? parsed.consumedShieldStateSignature,
      destinationOwner: parsed.destinationOwner,
      mintAddress: parsed.mintAddress,
      noteId: parsed.noteId,
      owner: parsed.owner,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSwapMemoPayload(memo) {
  if (typeof memo !== "string") {
    return null;
  }

  const memoStart = memo.indexOf(VANTA_SWAP_MEMO_PREFIX);

  if (memoStart === -1) {
    return null;
  }

  try {
    const parsed = JSON.parse(memo.slice(memoStart + VANTA_SWAP_MEMO_PREFIX.length));

    return {
      consumedNoteId: parsed.consumedNoteId ?? parsed.cn,
      inputAmount: parsed.inputAmount ?? parsed.ia,
      mintAddress: parsed.mintAddress ?? parsed.ma,
      noteId: parsed.noteId ?? parsed.ni,
      outputAmount: parsed.outputAmount ?? parsed.oa,
      outputNoteId: parsed.outputNoteId ?? parsed.on,
      owner: parsed.owner ?? parsed.ow,
      quoteExpiresAt: parsed.quoteExpiresAt ?? parsed.qe,
      quoteId: parsed.quoteId ?? parsed.qi,
      quoteTimestamp: parsed.quoteTimestamp ?? parsed.qt,
      vaultOwner: parsed.vaultOwner ?? parsed.vo,
      venueFamily: parsed.venueFamily ?? parsed.vf,
      venueName: parsed.venueName ?? parsed.vn,
      venueNetwork: parsed.venueNetwork ?? parsed.vw,
      venuePoolAddress: parsed.venuePoolAddress ?? parsed.vp,
    };
  } catch {
    return null;
  }
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Vanta operator listening on http://127.0.0.1:${port}`);
  console.log(`Vanta release store: ${releaseRecords.filePath}`);
  console.log(`Vanta private-core proof store: ${privateCoreProofStore.filePath}`);
  console.log(`Vanta private-core send proof store: ${privateCoreSendProofStore.filePath}`);
  console.log(`Vanta private-core send store: ${privateCoreSendStore.filePath}`);
  console.log(`Vanta private-core release store: ${privateCoreReleaseRecords.filePath}`);
  console.log(`Vanta swap store: ${swapRecords.filePath}`);
  console.log(`Vanta SOL unshield store: ${solUnshieldRecords.filePath}`);
});

function writeCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function buildPrivateCoreSummaryState() {
  const contractState = buildPrivateCoreContractState();
  const rootRecords = privateCoreRootStore.listRoots();
  const proofRecords = privateCoreProofStore.listProofs();
  const sendProofRecords = privateCoreSendProofStore.listProofs();
  const sendRecords = privateCoreSendStore.listSends();
  const consumeRecords = privateCoreConsumeStore.listConsumes();
  const releaseRecords = privateCoreReleaseRecords.listRecords();
  const latestProof = proofRecords[0] ?? null;
  const currentRootRecord = rootRecords[0] ?? null;
  const latestSendProof = sendProofRecords[0] ?? null;
  const latestSend = sendRecords[0] ?? null;
  const latestLinkedSendProof =
    latestSend && typeof latestSend.proofId === "string"
      ? sendProofRecords.find((record) => record.proofId === latestSend.proofId) ?? null
      : null;
  const latestConsume = consumeRecords[0] ?? null;
  const latestRelease = releaseRecords[0] ?? null;
  const latestConsumeProof =
    latestConsume && typeof latestConsume.proofId === "string"
      ? proofRecords.find((record) => record.proofId === latestConsume.proofId) ?? null
      : null;
  const latestReleaseProof =
    latestRelease && typeof latestRelease.proofId === "string"
      ? proofRecords.find((record) => record.proofId === latestRelease.proofId) ?? null
      : null;
  const proofConsumeLinkStatus = summarizePrivateCoreProofConsumeLinkStatus({
    linkedProof: latestConsumeProof,
    latestConsume,
  });
  const proofSendLinkStatus = summarizePrivateCoreProofSendLinkStatus({
    linkedProof: latestLinkedSendProof,
    latestSend,
  });
  const proofReleaseLinkStatus = summarizePrivateCoreProofReleaseLinkStatus({
    linkedProof: latestReleaseProof,
    latestRelease,
  });
  const sendResultingRootStatus = summarizePrivateCoreSendResultingRootStatus({
    currentRoot: rootRecords[0]?.root ?? null,
    latestConsume,
    latestRelease,
    latestSend,
    rootRecords,
  });
  const sendResultingRootRecord =
    latestSend?.resultingRoot
      ? rootRecords.find((record) => record.root === latestSend.resultingRoot) ?? null
      : null;
  const sendResultingRootRegistration = summarizePrivateCoreSendResultingRootRegistration({
    latestSend,
    sendResultingRootRecord,
  });
  const currentRootLinkedProof =
    currentRootRecord?.proofId
      ? proofRecords.find((record) => record.proofId === currentRootRecord.proofId) ?? null
      : null;
  const sendResultingRootLinkedProof =
    sendResultingRootRecord?.proofId
      ? proofRecords.find((record) => record.proofId === sendResultingRootRecord.proofId) ?? null
      : null;
  const currentRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
    linkedProof: currentRootLinkedProof,
    rootRecord: currentRootRecord,
  });
  const sendResultingRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
    linkedProof: sendResultingRootLinkedProof,
    rootRecord: sendResultingRootRecord,
  });
  const sendContinuity = summarizePrivateCoreSendContinuityStatus({
    latestSend,
    sendResultingRootProofLinkStatus,
    sendResultingRootRegistrationStatus: sendResultingRootRegistration.status,
    sendResultingRootStatus: sendResultingRootStatus.status,
  });
  const sendBoundaryStatus = summarizePrivateCoreSendBoundaryStatus({
    latestSend,
    proofSendLinkStatus,
    sendContinuityNote: sendContinuity.note,
    sendContinuityStatus: sendContinuity.status,
    sendResultingRootNote: sendResultingRootStatus.note,
    sendResultingRootStatus: sendResultingRootStatus.status,
  });
  const boundaryStatus = summarizePrivateCoreBoundaryStatus({
    currentRoot: currentRootRecord?.root ?? null,
    currentRootProofLinkStatus,
    hasConsume: latestConsume !== null,
    hasRelease: latestRelease !== null,
    proofConsumeLinkStatus,
    proofSendLinkStatus,
    proofReleaseLinkStatus,
    sendResultingRootRegistrationStatus: sendResultingRootRegistration.status,
    sendResultingRootProofLinkStatus,
    sendResultingRootStatus: sendResultingRootStatus.status,
    sendBoundaryStatus: sendBoundaryStatus.status,
  });
  const summaryState = {
    ...contractState,
    boundaryStatus: boundaryStatus.status,
    boundaryNote: boundaryStatus.note,
    sendBoundaryStatus: sendBoundaryStatus.status,
    sendBoundaryNote: sendBoundaryStatus.note,
    currentRootLinkedProof,
    currentRootProofLinkStatus,
    sendResultingRootLinkedProof,
    sendResultingRootRecord,
    sendResultingRootNote: sendResultingRootStatus.note,
    sendResultingRootRegistrationNote: sendResultingRootRegistration.note,
    sendResultingRootRegistrationStatus: sendResultingRootRegistration.status,
    sendResultingRootProofLinkStatus,
    sendResultingRootStatus: sendResultingRootStatus.status,
    sendContinuityNote: sendContinuity.note,
    sendContinuityStatus: sendContinuity.status,
    currentRoot: currentRootRecord?.root ?? null,
    currentRecord: currentRootRecord,
    rootRecords,
    latestProof,
    proofRecords,
    latestSendProof,
    sendProofRecords,
    latestSendLinkedProof: latestLinkedSendProof,
    latestSend,
    sendRecords,
    latestConsume,
    consumeRecords,
    latestConsumeProof,
    latestRelease,
    releaseRecords,
    latestReleaseProof,
    rootRecordCount: rootRecords.length,
    proofRecordCount: proofRecords.length,
    sendProofRecordCount: sendProofRecords.length,
    sendRecordCount: sendRecords.length,
    consumeRecordCount: consumeRecords.length,
    releaseRecordCount: releaseRecords.length,
    proofConsumeLinkStatus,
    proofSendLinkStatus,
    proofReleaseLinkStatus,
  };
  const contractMirrorStatus = summarizePrivateCoreContractMirrorStatus({
    contractState,
    summaryState,
  });

  return {
    ...summaryState,
    contractMirrorStatus: contractMirrorStatus.status,
    contractMirrorNote: contractMirrorStatus.note,
    generatedAt: Date.now(),
  };
}

function buildPrivateCoreContractState() {
  return {
    stateVersion: 1,
    contractVersion: 6,
    summaryVersion: 25,
    supportedSendLaneVersion: PRIVATE_CORE_SUPPORTED_SEND_LANE_VERSION,
    supportedSendLaneKind: PRIVATE_CORE_SUPPORTED_SEND_LANE_KIND,
    supportedSendLaneStatus: PRIVATE_CORE_SUPPORTED_SEND_LANE_STATUS,
    supportedSendLaneNote: PRIVATE_CORE_SUPPORTED_SEND_LANE_NOTE,
    supportedUnshieldLaneVersion: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_VERSION,
    supportedUnshieldLaneKind: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_KIND,
    supportedUnshieldLaneStatus: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_STATUS,
    supportedUnshieldLaneNote: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_NOTE,
    supportedReleaseLaneVersion: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_VERSION,
    supportedReleaseLaneKind: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_KIND,
    supportedReleaseLaneStatus: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_STATUS,
    supportedReleaseLaneNote: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_NOTE,
    supportedReleaseV1Decision: PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION,
    supportedReleaseV1DecisionNote: PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION_NOTE,
    supportedFlowVersion: PRIVATE_CORE_SUPPORTED_FLOW_VERSION,
    supportedFlowKind: PRIVATE_CORE_SUPPORTED_FLOW_KIND,
    supportedFlowStatus: PRIVATE_CORE_SUPPORTED_FLOW_STATUS,
    supportedFlowNote: PRIVATE_CORE_SUPPORTED_FLOW_NOTE,
    supportedAssetSymbol: PRIVATE_CORE_SUPPORTED_ASSET_SYMBOL,
    supportedEnvironment: PRIVATE_CORE_SUPPORTED_ENVIRONMENT,
    supportedNoteSchema: PRIVATE_CORE_SUPPORTED_NOTE_SCHEMA,
    supportedNoteVersion: PRIVATE_CORE_SUPPORTED_NOTE_VERSION,
    supportedRootRegistrationProvenance:
      PRIVATE_CORE_SUPPORTED_ROOT_REGISTRATION_PROVENANCE,
    supportedSendResultingRootBasis: PRIVATE_CORE_SUPPORTED_SEND_RESULTING_ROOT_BASIS,
    supportedSendInputRootPolicy: PRIVATE_CORE_SUPPORTED_SEND_INPUT_ROOT_POLICY,
    supportedSendOutputRegistrationPolicy:
      PRIVATE_CORE_SUPPORTED_SEND_OUTPUT_REGISTRATION_POLICY,
    supportedRecipientModel: PRIVATE_CORE_SUPPORTED_RECIPIENT_MODEL,
    supportedReleaseDestinationModel: PRIVATE_CORE_SUPPORTED_RELEASE_DESTINATION_MODEL,
    supportedProofSystem: PRIVATE_CORE_SUPPORTED_PROOF_SYSTEM,
    supportedUnshieldCircuit: PRIVATE_CORE_SUPPORTED_UNSHIELD_CIRCUIT,
    supportedSendCircuit: PRIVATE_CORE_SUPPORTED_SEND_CIRCUIT,
    supportedUnshieldMerkleDepth: PRIVATE_CORE_SUPPORTED_UNSHIELD_MERKLE_DEPTH,
    supportedSendMerkleDepth: PRIVATE_CORE_SUPPORTED_SEND_MERKLE_DEPTH,
    supportedReleaseAuthorizationBasis: PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS,
    supportedReleaseRootPolicy: PRIVATE_CORE_RELEASE_ROOT_POLICY,
    supportedReleaseExecutionModel: PRIVATE_CORE_RELEASE_EXECUTION_MODEL,
    supportedReleaseAtomicityModel: PRIVATE_CORE_RELEASE_ATOMICITY_MODEL,
    supportedReleasePersistenceModel: PRIVATE_CORE_RELEASE_PERSISTENCE_MODEL,
    ownerAuthorizationMode: PRIVATE_CORE_OWNER_AUTH_MODE,
    ownerAuthorizationDecision: PRIVATE_CORE_OWNER_AUTH_DECISION,
    ownerAuthorizationDecisionNote: PRIVATE_CORE_OWNER_AUTH_DECISION_NOTE,
    sourceArtifactTruthBasis: PRIVATE_CORE_SOURCE_ARTIFACT_TRUTH_BASIS,
    provingArtifactTruthBasis: PRIVATE_CORE_PROVING_ARTIFACT_TRUTH_BASIS,
    sourceProvingRelationship: PRIVATE_CORE_SOURCE_PROVING_RELATIONSHIP,
    nullifierKeyMode: PRIVATE_CORE_NULLIFIER_KEY_MODE,
    nullifierKeyDecision: PRIVATE_CORE_NULLIFIER_KEY_DECISION,
    nullifierKeyDecisionNote: PRIVATE_CORE_NULLIFIER_KEY_DECISION_NOTE,
    provingHashLane: PRIVATE_CORE_PROVING_HASH_LANE,
  };
}

function summarizePrivateCoreContractMirrorStatus(args) {
  const mirroredFields = [
    "summaryVersion",
    "supportedSendLaneVersion",
    "supportedSendLaneKind",
    "supportedSendLaneStatus",
    "supportedSendLaneNote",
    "supportedUnshieldLaneVersion",
    "supportedUnshieldLaneKind",
    "supportedUnshieldLaneStatus",
    "supportedUnshieldLaneNote",
    "supportedReleaseLaneVersion",
    "supportedReleaseLaneKind",
    "supportedReleaseLaneStatus",
    "supportedReleaseLaneNote",
    "supportedReleaseV1Decision",
    "supportedReleaseV1DecisionNote",
    "supportedFlowVersion",
    "supportedFlowKind",
    "supportedFlowStatus",
    "supportedFlowNote",
    "supportedAssetSymbol",
    "supportedEnvironment",
    "supportedNoteSchema",
    "supportedNoteVersion",
    "supportedRootRegistrationProvenance",
    "supportedSendResultingRootBasis",
    "supportedSendInputRootPolicy",
    "supportedSendOutputRegistrationPolicy",
    "supportedRecipientModel",
    "supportedReleaseDestinationModel",
    "supportedProofSystem",
    "supportedUnshieldCircuit",
    "supportedSendCircuit",
    "supportedUnshieldMerkleDepth",
    "supportedSendMerkleDepth",
    "supportedReleaseAuthorizationBasis",
    "supportedReleaseRootPolicy",
    "supportedReleaseExecutionModel",
    "supportedReleaseAtomicityModel",
    "supportedReleasePersistenceModel",
    "ownerAuthorizationMode",
    "ownerAuthorizationDecision",
    "ownerAuthorizationDecisionNote",
    "sourceArtifactTruthBasis",
    "provingArtifactTruthBasis",
    "sourceProvingRelationship",
    "nullifierKeyMode",
    "nullifierKeyDecision",
    "nullifierKeyDecisionNote",
    "provingHashLane",
  ];
  const mismatchedFields = mirroredFields.filter(
    (field) => args.summaryState[field] !== args.contractState[field],
  );

  if (mismatchedFields.length > 0) {
    return {
      note: `Operator summary drifted from the frozen contract on ${mismatchedFields.join(", ")}.`,
      status: "contract-mismatch",
    };
  }

  return {
    note: "Operator summary mirrors the frozen private-core contract across all supported static fields.",
    status: "mirrors-contract",
  };
}

function summarizePrivateCoreSendResultingRootStatus(args) {
  if (!args.latestSend) {
    return {
      status: "unavailable",
      note: "No private send transition has been recorded yet.",
    };
  }

  if (!args.latestSend.resultingRoot) {
    return {
      status: "missing",
      note: "Latest private send transition did not persist a resulting root.",
    };
  }

  if (args.latestRelease?.root === args.latestSend.resultingRoot) {
    return {
      status: "downstream-released",
      note: "Latest private send resulting root has already been released downstream.",
    };
  }

  if (args.latestConsume?.root === args.latestSend.resultingRoot) {
    return {
      status: "downstream-consumed",
      note: "Latest private send resulting root has already been consumed downstream.",
    };
  }

  if (args.currentRoot === args.latestSend.resultingRoot) {
    return {
      status: "current-root",
      note: "Latest private send resulting root is the current registered operator root.",
    };
  }

  if (args.rootRecords.some((record) => record.root === args.latestSend.resultingRoot)) {
    return {
      status: "registered-stale",
      note: "Latest private send resulting root is registered but not current anymore.",
    };
  }

  return {
    status: "unregistered",
    note: "Latest private send resulting root has not been registered with the operator yet.",
  };
}

function summarizePrivateCoreSendResultingRootRegistration(args) {
  if (!args.latestSend || !args.latestSend.resultingRoot || !args.sendResultingRootRecord) {
    return {
      status: "unavailable",
      note: "No registered send resulting root is available for output-continuity checks yet.",
    };
  }

  if (args.sendResultingRootRecord.noteCommitment === args.latestSend.recipientCommitment) {
    return {
      status: "linked-recipient-output",
      note: "Registered send resulting root matches the latest send recipient output commitment.",
    };
  }

  if (
    args.latestSend.changeCommitment &&
    args.sendResultingRootRecord.noteCommitment === args.latestSend.changeCommitment
  ) {
    return {
      status: "linked-change-output",
      note: "Registered send resulting root matches the latest send change output commitment.",
    };
  }

  return {
    status: "mismatch",
    note: "Registered send resulting root does not match either output commitment from the latest send.",
  };
}

function summarizePrivateCoreSendContinuityStatus(args) {
  if (!args.latestSend) {
    return {
      status: "unavailable",
      note: "No private send transition is available for continuity checks yet.",
    };
  }

  if (!args.latestSend.resultingRoot) {
    return {
      status: "missing-resulting-root",
      note: "Latest private send transition did not persist a resulting root for downstream continuity.",
    };
  }

  if (args.sendResultingRootRegistrationStatus === "mismatch") {
    return {
      status: "output-mismatch",
      note: "Registered send resulting root does not match the recipient or change output commitment from the latest send.",
    };
  }

  if (args.sendResultingRootProofLinkStatus === "mismatch") {
    return {
      status: "registration-proof-unlinked",
      note: "Registered send resulting root does not match its linked registration proof.",
    };
  }

  if (args.sendResultingRootProofLinkStatus === "unavailable") {
    if (args.sendResultingRootStatus === "unregistered") {
      return {
        status: "awaiting-registration",
        note: "Latest send resulting root still needs operator registration before downstream continuity is established.",
      };
    }

    return {
      status: "registration-proof-unlinked",
      note: "Registered send resulting root is missing a linked registration proof.",
    };
  }

  if (args.sendResultingRootStatus === "current-root") {
    return {
      status: "ready-current-root",
      note: "Latest send resulting root is registered, linked, and current for downstream send or unshield use.",
    };
  }

  if (args.sendResultingRootStatus === "registered-stale") {
    return {
      status: "ready-registered-stale",
      note: "Latest send resulting root is registered and linked, but no longer the current operator root.",
    };
  }

  if (args.sendResultingRootStatus === "downstream-consumed") {
    return {
      status: "downstream-consumed",
      note: "Latest send resulting root has already been consumed downstream.",
    };
  }

  if (args.sendResultingRootStatus === "downstream-released") {
    return {
      status: "downstream-released",
      note: "Latest send resulting root has already been released downstream.",
    };
  }

  return {
    status: "awaiting-registration",
    note: "Latest send resulting root is not yet ready for downstream continuity checks.",
  };
}

function summarizePrivateCoreSendBoundaryStatus(args) {
  if (!args.latestSend) {
    return {
      status: "unavailable",
      note: "No private send transition is available for boundary checks yet.",
    };
  }

  if (args.proofSendLinkStatus === "mismatch") {
    return {
      status: "proof-send-unlinked",
      note: "Latest send transition does not match its linked send proof.",
    };
  }

  if (args.proofSendLinkStatus === "unavailable") {
    return {
      status: "proof-send-unlinked",
      note: "Latest send transition is missing a linked send proof.",
    };
  }

  switch (args.sendContinuityStatus) {
    case "missing-resulting-root":
      return {
        status: "missing-resulting-root",
        note: args.sendContinuityNote,
      };
    case "output-mismatch":
      return {
        status: "output-mismatch",
        note: args.sendContinuityNote,
      };
    case "registration-proof-unlinked":
      return {
        status: "registration-proof-unlinked",
        note: args.sendContinuityNote,
      };
    case "awaiting-registration":
      return {
        status: "awaiting-registration",
        note: args.sendContinuityNote,
      };
    case "ready-current-root":
      return {
        status: "coherent-current-root",
        note: args.sendContinuityNote,
      };
    case "ready-registered-stale":
      return {
        status: "coherent-registered-stale",
        note: args.sendContinuityNote,
      };
    case "downstream-consumed":
      return {
        status: "downstream-consumed",
        note: args.sendContinuityNote,
      };
    case "downstream-released":
      return {
        status: "downstream-released",
        note: args.sendContinuityNote,
      };
    case "unavailable":
    default:
      if (args.sendResultingRootStatus === "missing") {
        return {
          status: "missing-resulting-root",
          note: args.sendResultingRootNote,
        };
      }

      return {
        status: "unavailable",
        note: args.sendContinuityNote ?? "Private send boundary state is not available yet.",
      };
  }
}

function summarizePrivateCoreBoundaryStatus(args) {
  if (!args.currentRoot) {
    return {
      status: "awaiting-current-root",
      note: "No current root is registered yet.",
    };
  }

  if (args.currentRootProofLinkStatus !== "linked") {
    return {
      status: "root-registration-unlinked",
      note:
        args.currentRootProofLinkStatus === "mismatch"
          ? "Current root record does not match its linked registration proof."
          : "Current root registration proof linkage is unavailable.",
    };
  }

  if (
    args.sendBoundaryStatus === "proof-send-unlinked" ||
    args.sendBoundaryStatus === "output-mismatch" ||
    args.sendBoundaryStatus === "registration-proof-unlinked"
  ) {
    return {
      status:
        args.sendBoundaryStatus === "proof-send-unlinked"
          ? "proof-send-unlinked"
          : args.sendBoundaryStatus === "output-mismatch"
            ? "send-root-output-mismatch"
            : "send-root-registration-unlinked",
      note:
        args.sendBoundaryStatus === "proof-send-unlinked"
          ? "Latest send record does not match its linked proof."
          : args.sendBoundaryStatus === "output-mismatch"
            ? "Registered send resulting root does not match either output commitment from the latest send."
            : "Send resulting root registration proof linkage is unavailable.",
    };
  }

  const sendResultingRootShouldBeLinked =
    args.sendResultingRootStatus === "current-root" ||
    args.sendResultingRootStatus === "registered-stale" ||
    args.sendResultingRootStatus === "downstream-consumed" ||
    args.sendResultingRootStatus === "downstream-released";

  if (sendResultingRootShouldBeLinked && args.sendResultingRootProofLinkStatus !== "linked") {
    return {
      status: "send-root-registration-unlinked",
      note:
        args.sendResultingRootProofLinkStatus === "mismatch"
          ? "Send resulting root record does not match its linked registration proof."
          : "Send resulting root registration proof linkage is unavailable.",
    };
  }

  if (
    sendResultingRootShouldBeLinked &&
    args.sendResultingRootRegistrationStatus !== "linked-recipient-output" &&
    args.sendResultingRootRegistrationStatus !== "linked-change-output"
  ) {
    return {
      status: "send-root-output-mismatch",
      note: "Registered send resulting root does not match either output commitment from the latest send.",
    };
  }

  if (args.proofSendLinkStatus !== "linked" && args.proofSendLinkStatus !== "unavailable") {
    return {
      status: "proof-send-unlinked",
      note: "Latest send record does not match its linked proof.",
    };
  }

  if (args.hasConsume && args.proofConsumeLinkStatus !== "linked") {
    return {
      status: "proof-consume-unlinked",
      note:
        args.proofConsumeLinkStatus === "mismatch"
          ? "Latest consume record does not match its linked proof."
          : "Latest consume proof linkage is unavailable.",
    };
  }

  if (args.hasRelease && args.proofReleaseLinkStatus !== "linked") {
    return {
      status: "proof-release-unlinked",
      note:
        args.proofReleaseLinkStatus === "mismatch"
          ? "Latest release record does not match its linked proof."
          : "Latest release proof linkage is unavailable.",
    };
  }

  return {
    status: "coherent",
    note: "Current root, consume, release, and linked proofs agree.",
  };
}

function summarizePrivateCoreRootProofLinkStatus(args) {
  if (!args.rootRecord || !args.rootRecord.proofId || !args.linkedProof) {
    return "unavailable";
  }

  if (
    args.linkedProof.action === "register-root" &&
    args.linkedProof.proofId === args.rootRecord.proofId &&
    args.linkedProof.root === args.rootRecord.root
  ) {
    return "linked";
  }

  return "mismatch";
}

function assertPrivateCoreSendResultingRootRegistrationConsistency(args) {
  if (!args.latestSend || args.latestSend.resultingRoot !== args.root) {
    return {
      registrationBasis: "shield-input",
      source: "app-private-core-shield-flow",
    };
  }

  if (args.sourceArtifacts.noteCommitment === args.latestSend.recipientCommitment) {
    return {
      registrationBasis: "send-recipient-output",
      source: "app-private-core-send-recipient-flow",
    };
  }

  if (
    args.latestSend.changeCommitment &&
    args.sourceArtifacts.noteCommitment === args.latestSend.changeCommitment
  ) {
    return {
      registrationBasis: "send-change-output",
      source: "app-private-core-send-change-flow",
    };
  }

  throw new Error(
    "Private-core send resulting root registration does not match either output commitment from the latest send.",
  );
}

function summarizePrivateCoreProofSendLinkStatus(args) {
  if (!args.linkedProof || !args.latestSend) {
    return "unavailable";
  }

  if (
    args.linkedProof.proofId === args.latestSend.proofId &&
    args.linkedProof.root === args.latestSend.inputRoot &&
    args.linkedProof.nullifier === args.latestSend.inputNullifier
  ) {
    return "linked";
  }

  return "mismatch";
}

function summarizePrivateCoreProofConsumeLinkStatus(args) {
  if (!args.linkedProof || !args.latestConsume) {
    return "unavailable";
  }

  if (
    args.linkedProof.proofId === args.latestConsume.proofId &&
    args.linkedProof.root === args.latestConsume.root &&
    args.linkedProof.nullifier === args.latestConsume.nullifier
  ) {
    return "linked";
  }

  return "mismatch";
}

function summarizePrivateCoreProofReleaseLinkStatus(args) {
  if (!args.linkedProof || !args.latestRelease) {
    return "unavailable";
  }

  if (
    args.linkedProof.proofId === args.latestRelease.proofId &&
    args.linkedProof.root === args.latestRelease.root &&
    args.linkedProof.nullifier === args.latestRelease.nullifier
  ) {
    return "linked";
  }

  return "mismatch";
}

function summarizePrivateCoreProofRecord(args) {
  const witnessPackage = normalizeVantaPrivateCoreWitnessPackage(args.witnessPackage);
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const completedAt = Date.now();

  return {
    action: args.action,
    assetId: sourcePublicInputs.assetId,
    amount: sourcePublicInputs.amount,
    backend: args.proofReceipt.backend,
    circuit: args.proofReceipt.circuit,
    completedAt,
    noteVersion: sourcePublicInputs.noteVersion,
    nullifier: sourcePublicInputs.nullifier,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: [
      "private-core-proof",
      args.action,
      sourcePublicInputs.nullifier,
      sourcePublicInputs.stateRoot,
      String(completedAt),
    ].join(":"),
    proofVersion: args.proofReceipt.proofVersion,
    provingHashLane: args.proofReceipt.provingHashLane,
    publicInputCount: args.proofReceipt.publicInputCount,
    releaseDestination: sourcePublicInputs.releaseDestination,
    root: sourcePublicInputs.stateRoot,
    verified: args.proofReceipt.verified === true,
  };
}

function summarizePrivateCoreSendProofRecord(args) {
  const witnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(args.witnessPackage);
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const completedAt = Date.now();

  return {
    action: args.action,
    assetId: sourcePublicInputs.assetId,
    amount: sourcePublicInputs.sendAmount,
    backend: args.proofReceipt.backend,
    circuit: args.proofReceipt.circuit,
    completedAt,
    noteVersion: sourcePublicInputs.noteVersion,
    nullifier: sourcePublicInputs.inputNullifier,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: [
      "private-core-send-proof",
      args.action,
      sourcePublicInputs.inputNullifier,
      sourcePublicInputs.stateRoot,
      String(completedAt),
    ].join(":"),
    proofVersion: args.proofReceipt.proofVersion,
    provingHashLane: args.proofReceipt.provingHashLane,
    publicInputCount: args.proofReceipt.publicInputCount,
    releaseDestination: sourcePublicInputs.recipientCommitment,
    root: sourcePublicInputs.stateRoot,
    verified: args.proofReceipt.verified === true,
  };
}

function summarizePrivateCoreSendRecord(args) {
  const sourcePublicInputs = args.witnessPackage.sourcePublicInputs;
  const completedAt = Date.now();

  return {
    assetId: sourcePublicInputs.assetId,
    changeAmount: sourcePublicInputs.changeAmount,
    changeCommitment: sourcePublicInputs.changeCommitment,
    completedAt,
    inputNullifier: sourcePublicInputs.inputNullifier,
    inputRoot: sourcePublicInputs.stateRoot,
    noteVersion: sourcePublicInputs.noteVersion,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: args.proofRecord.proofId,
    publicInputCount: args.proofReceipt.publicInputCount,
    recipientCommitment: sourcePublicInputs.recipientCommitment,
    resultingRootBasis: "client-declared",
    resultingRoot: typeof args.resultingRoot === "string" ? args.resultingRoot : null,
    sendAmount: sourcePublicInputs.sendAmount,
    sendId: [
      "private-core-send",
      sourcePublicInputs.inputNullifier,
      sourcePublicInputs.stateRoot,
      String(completedAt),
    ].join(":"),
  };
}

function normalizePrivateCoreHex32(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} is missing.`);
  }

  const normalized = value.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(`${label} must be a canonical 32-byte hex value.`);
  }

  return normalized;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = stripQuotes(value);
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function solAmountToLamports(amount) {
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);

  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    throw new Error("Invalid SOL amount for constrained release.");
  }

  return lamports;
}

function loadWeb3KeypairFromEnv(envKey) {
  const raw = process.env[envKey];

  if (!raw) {
    throw new Error(`${envKey} is required for SOL unshield release.`);
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${envKey} must be a JSON array of secret key bytes.`);
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}
