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
  createPrivateCoreSwapProofStore,
} from "./private-core-proof-store.mjs";
import { createPrivateCoreRootStore } from "./private-core-root-store.mjs";
import { createPrivateCoreSendStore } from "./private-core-send-store.mjs";
import { createPrivateCoreSwapStore } from "./private-core-swap-store.mjs";
import {
  assertVantaPrivateCoreSourceArtifactConsistency,
  deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage,
  deriveVantaPrivateCoreSwapInputArtifactsFromWitnessPackage,
  normalizeVantaPrivateCoreSendWitnessPackage,
  normalizeVantaPrivateCoreSwapWitnessPackage,
  normalizeVantaPrivateCoreWitnessPackage,
  proveAndVerifyVantaPrivateCoreSend,
  proveAndVerifyVantaPrivateCoreSwap,
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
const privateCoreSwapProofStore = createPrivateCoreSwapProofStore();
const privateCoreSendStore = createPrivateCoreSendStore();
const privateCoreSwapStore = createPrivateCoreSwapStore();
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
const PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION_NOTE =
  "Current operator-backed private send lane is accepted as the narrow zk v1 send path for VUSD on solana-devnet.";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_KIND = "single-note-proof-backed-consume";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_NOTE =
  "Current narrow zk v1 unshield lane is supported for one note consume with proof-backed release recording.";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION_NOTE =
  "Current operator-backed proof-backed unshield lane is accepted as the narrow zk v1 unshield path for VUSD on solana-devnet.";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_KIND = "proof-backed-consume-latest-registered-root";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_NOTE =
  "Current narrow zk v1 release lane is supported for proof-backed consume-authorized release under the latest registered root policy.";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION_NOTE =
  "Current operator-backed proof-backed release lane is accepted as the narrow zk v1 release path for VUSD on solana-devnet.";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_KIND = "single-input-vusd-to-shielded-sol";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_NOTE =
  "Current constrained swap lane supports one VUSD input note into one shielded SOL output through an operator-backed Meteora-aware quote and execution path.";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION_NOTE =
  "Current constrained operator-backed VUSD to shielded SOL swap lane is accepted as the narrow zk v1 swap path on solana-devnet.";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE =
  "adjacent-supported-not-required-for-finish-line";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE_NOTE =
  "Current constrained swap lane is supported operator-backed infrastructure in the repo, but it is not required for the minimum zk v1 finish line.";
const PRIVATE_CORE_SUPPORTED_SWAP_VENUE = "meteora-dlmm-devnet";
const PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_MODEL = "shielded-sol-output-note";
const PRIVATE_CORE_SUPPORTED_SWAP_RESULTING_ROOT_BASIS = "client-declared";
const PRIVATE_CORE_SUPPORTED_SWAP_INPUT_ROOT_POLICY =
  "latest-registered-root-with-linked-registration-proof";
const PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_REGISTRATION_POLICY =
  "resulting-root-must-register-as-swap-output";
const PRIVATE_CORE_SUPPORTED_FLOW_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_FLOW_KIND = "shield-hold-send-unshield-replay-guard";
const PRIVATE_CORE_SUPPORTED_FLOW_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_FLOW_NOTE =
  "Current narrow zk v1 product flow is shield, hold, private send, unshield, and replay guard on the resulting consume path.";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_KIND =
  "narrow-private-core-zk-v1-shipping";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_NOTE =
  "Canonical operator ship/no-ship decision surface for the frozen narrow private-core zk v1 lane.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_KIND = "contract-status-shipping-bundle";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_NOTE =
  "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_ENDPOINT = "/state/private-core-snapshot";
const PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_DECISION =
  "accepted-narrow-private-core-v1-scope";
const PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_NOTE =
  "Current zk v1 finish line is the narrow private-core lane frozen in this repo, not the broader long-term privacy product surface.";
const PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES = "send|unshield|release";
const PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES_NOTE =
  "Minimum zk v1 finish line requires the narrow private-core send, unshield, and release lanes; constrained swap remains adjacent supported infrastructure.";
const PRIVATE_CORE_SUPPORTED_ASSET_SYMBOL = "VUSD";
const PRIVATE_CORE_SUPPORTED_ENVIRONMENT = "solana-devnet";
const PRIVATE_CORE_SUPPORTED_RECIPIENT_MODEL = "hashed-reference-to-owner-key";
const PRIVATE_CORE_SUPPORTED_RELEASE_DESTINATION_MODEL = "32-byte-release-destination-field";
const PRIVATE_CORE_SUPPORTED_NOTE_SCHEMA = "note-v0";
const PRIVATE_CORE_SUPPORTED_NOTE_VERSION = 0;
const PRIVATE_CORE_SUPPORTED_ROOT_REGISTRATION_PROVENANCE =
  "shield-input|send-recipient-output|send-change-output|swap-output";
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

  if (request.method === "GET" && request.url === "/state/private-core-shipping-decision") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreShippingDecisionState()));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-snapshot") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreOperatorSnapshotState(request)));
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

  if (request.method === "GET" && request.url === "/state/private-core-swap-proofs") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreSwapProofStore.listProofs();
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

  if (request.method === "GET" && request.url === "/state/private-core-swaps") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    const records = privateCoreSwapStore.listSwaps();
    response.end(
      JSON.stringify({
        stateVersion: 1,
        latestSwap: records[0] ?? null,
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

  if (request.method === "POST" && request.url === "/private-core/swap-proof") {
    try {
      const body = await readJsonBody(request);
      const witnessPackage = normalizeVantaPrivateCoreSwapWitnessPackage(body?.witnessPackage);
      const proofReceipt = await proveAndVerifyVantaPrivateCoreSwap({
        witnessPackage,
      });
      privateCoreSwapProofStore.recordProof(
        summarizePrivateCoreSwapProofRecord({
          action: "swap-proof",
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
          : "The private-core swap proof operator could not process the witness package.",
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/private-core/swap-transition") {
    try {
      const body = await readJsonBody(request);
      const witnessPackage = normalizeVantaPrivateCoreSwapWitnessPackage(body?.witnessPackage);
      const sourcePublicInputs = witnessPackage.sourcePublicInputs;
      const inputArtifacts = deriveVantaPrivateCoreSwapInputArtifactsFromWitnessPackage(witnessPackage);

      if (!privateCoreRootStore.hasRoot(sourcePublicInputs.stateRoot)) {
        throw new Error("Private-core swap transition input root is not registered.");
      }

      const latestRootRecord = privateCoreRootStore.getLatestRoot();
      if (!latestRootRecord || latestRootRecord.root !== sourcePublicInputs.stateRoot) {
        throw new Error("Private-core swap transition input root is not the latest registered root.");
      }

      if (latestRootRecord.assetId !== inputArtifacts.assetId) {
        throw new Error("Private-core swap transition asset does not match the registered input root.");
      }

      if (latestRootRecord.amount !== inputArtifacts.amount) {
        throw new Error("Private-core swap transition amount basis does not match the registered input root.");
      }

      if (latestRootRecord.noteCommitment !== inputArtifacts.noteCommitment) {
        throw new Error(
          "Private-core swap transition source note commitment does not match the registered input root.",
        );
      }

      if (latestRootRecord.merkleLeaf !== inputArtifacts.merkleLeaf) {
        throw new Error(
          "Private-core swap transition source Merkle leaf does not match the registered input root.",
        );
      }

      if (latestRootRecord.witnessRoot !== inputArtifacts.witnessRoot) {
        throw new Error(
          "Private-core swap transition source witness root does not match the registered input root.",
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
            ? "Private-core swap transition input root does not match its linked registration proof."
            : "Private-core swap transition input root registration proof linkage is unavailable.",
        );
      }

      const resultingRoot = normalizePrivateCoreHex32(
        body?.resultingRoot,
        "Private-core swap resulting root",
      );
      if (resultingRoot === sourcePublicInputs.stateRoot) {
        throw new Error("Private-core swap resulting root must differ from the input root.");
      }

      const proofReceipt = await proveAndVerifyVantaPrivateCoreSwap({
        witnessPackage,
      });
      const proofRecord = summarizePrivateCoreSwapProofRecord({
        action: "swap-proof",
        proofReceipt,
        witnessPackage,
      });
      privateCoreSwapProofStore.recordProof(proofRecord);
      const swapRecord = summarizePrivateCoreSwapRecord({
        executionQuoteReference: body?.executionQuoteReference,
        executionVenueLabel: body?.executionVenueLabel,
        proofRecord,
        proofReceipt,
        resultingRoot,
        witnessPackage,
      });
      privateCoreSwapStore.recordSwap(swapRecord);

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...proofReceipt,
          completedAt: swapRecord.completedAt,
          executionQuoteReference: swapRecord.executionQuoteReference,
          executionVenueLabel: swapRecord.executionVenueLabel,
          inputNullifier: swapRecord.inputNullifier,
          inputRoot: swapRecord.inputRoot,
          inputAssetId: swapRecord.inputAssetId,
          inputAmount: swapRecord.inputAmount,
          outputAssetId: swapRecord.outputAssetId,
          outputAmount: swapRecord.outputAmount,
          outputCommitment: swapRecord.outputCommitment,
          proofId: swapRecord.proofId,
          resultingRootBasis: swapRecord.resultingRootBasis,
          resultingRoot: swapRecord.resultingRoot,
          swapId: swapRecord.swapId,
          swapRecorded: true,
        }),
      );
    } catch (error) {
      writeCorsHeaders(response);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : "The private-core swap operator could not process the transition request.",
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
      const latestSwap = privateCoreSwapStore.getLatestSwap();
      const rootRegistrationConsistency = assertPrivateCoreDownstreamRootRegistrationConsistency({
        latestSend,
        latestSwap,
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
        registrationBasis: rootRegistrationConsistency.registrationBasis,
        proofId: proofRecord.proofId,
        source: rootRegistrationConsistency.source,
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
  console.log(`Vanta private-core swap proof store: ${privateCoreSwapProofStore.filePath}`);
  console.log(`Vanta private-core send store: ${privateCoreSendStore.filePath}`);
  console.log(`Vanta private-core swap store: ${privateCoreSwapStore.filePath}`);
  console.log(`Vanta private-core release store: ${privateCoreReleaseRecords.filePath}`);
  console.log(`Vanta swap store: ${swapRecords.filePath}`);
  console.log(`Vanta SOL unshield store: ${solUnshieldRecords.filePath}`);
});

function writeCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function resolveRequestBaseUrl(request) {
  const hostHeader = request.headers.host;
  if (typeof hostHeader === "string" && hostHeader.length > 0) {
    return `http://${hostHeader}`;
  }

  return "http://127.0.0.1:8789";
}

function buildPrivateCoreSummaryState() {
  const contractState = buildPrivateCoreContractState();
  const rootRecords = privateCoreRootStore.listRoots();
  const proofRecords = privateCoreProofStore.listProofs();
  const sendProofRecords = privateCoreSendProofStore.listProofs();
  const swapProofRecords = privateCoreSwapProofStore.listProofs();
  const sendRecords = privateCoreSendStore.listSends();
  const swapRecords = privateCoreSwapStore.listSwaps();
  const consumeRecords = privateCoreConsumeStore.listConsumes();
  const releaseRecords = privateCoreReleaseRecords.listRecords();
  const latestProof = proofRecords[0] ?? null;
  const currentRootRecord = rootRecords[0] ?? null;
  const latestSendProof = sendProofRecords[0] ?? null;
  const latestSwapProof = swapProofRecords[0] ?? null;
  const latestSend = sendRecords[0] ?? null;
  const latestSwap = swapRecords[0] ?? null;
  const latestLinkedSendProof =
    latestSend && typeof latestSend.proofId === "string"
      ? sendProofRecords.find((record) => record.proofId === latestSend.proofId) ?? null
      : null;
  const latestLinkedSwapProof =
    latestSwap && typeof latestSwap.proofId === "string"
      ? swapProofRecords.find((record) => record.proofId === latestSwap.proofId) ?? null
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
  const proofSwapLinkStatus = summarizePrivateCoreProofSwapLinkStatus({
    linkedProof: latestLinkedSwapProof,
    latestSwap,
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
  const swapResultingRootStatus = summarizePrivateCoreSwapResultingRootStatus({
    currentRoot: rootRecords[0]?.root ?? null,
    latestConsume,
    latestRelease,
    latestSwap,
    rootRecords,
  });
  const sendResultingRootRecord =
    latestSend?.resultingRoot
      ? rootRecords.find((record) => record.root === latestSend.resultingRoot) ?? null
      : null;
  const swapResultingRootRecord =
    latestSwap?.resultingRoot
      ? rootRecords.find((record) => record.root === latestSwap.resultingRoot) ?? null
      : null;
  const sendResultingRootRegistration = summarizePrivateCoreSendResultingRootRegistration({
    latestSend,
    sendResultingRootRecord,
  });
  const swapResultingRootRegistration = summarizePrivateCoreSwapResultingRootRegistration({
    latestSwap,
    swapResultingRootRecord,
  });
  const currentRootLinkedProof =
    currentRootRecord?.proofId
      ? proofRecords.find((record) => record.proofId === currentRootRecord.proofId) ?? null
      : null;
  const sendResultingRootLinkedProof =
    sendResultingRootRecord?.proofId
      ? proofRecords.find((record) => record.proofId === sendResultingRootRecord.proofId) ?? null
      : null;
  const swapResultingRootLinkedProof =
    swapResultingRootRecord?.proofId
      ? proofRecords.find((record) => record.proofId === swapResultingRootRecord.proofId) ?? null
      : null;
  const currentRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
    linkedProof: currentRootLinkedProof,
    rootRecord: currentRootRecord,
  });
  const sendResultingRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
    linkedProof: sendResultingRootLinkedProof,
    rootRecord: sendResultingRootRecord,
  });
  const swapResultingRootProofLinkStatus = summarizePrivateCoreRootProofLinkStatus({
    linkedProof: swapResultingRootLinkedProof,
    rootRecord: swapResultingRootRecord,
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
  const swapContinuity = summarizePrivateCoreSwapContinuityStatus({
    latestSwap,
    swapResultingRootProofLinkStatus,
    swapResultingRootRegistrationStatus: swapResultingRootRegistration.status,
    swapResultingRootStatus: swapResultingRootStatus.status,
  });
  const swapBoundaryStatus = summarizePrivateCoreSwapBoundaryStatus({
    latestSwap,
    proofSwapLinkStatus,
    swapContinuityNote: swapContinuity.note,
    swapContinuityStatus: swapContinuity.status,
    swapResultingRootNote: swapResultingRootStatus.note,
    swapResultingRootStatus: swapResultingRootStatus.status,
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
    swapBoundaryStatus: swapBoundaryStatus.status,
    swapBoundaryNote: swapBoundaryStatus.note,
    currentRootLinkedProof,
    currentRootProofLinkStatus,
    sendResultingRootLinkedProof,
    swapResultingRootLinkedProof,
    sendResultingRootRecord,
    swapResultingRootRecord,
    sendResultingRootNote: sendResultingRootStatus.note,
    swapResultingRootNote: swapResultingRootStatus.note,
    sendResultingRootRegistrationNote: sendResultingRootRegistration.note,
    swapResultingRootRegistrationNote: swapResultingRootRegistration.note,
    sendResultingRootRegistrationStatus: sendResultingRootRegistration.status,
    swapResultingRootRegistrationStatus: swapResultingRootRegistration.status,
    sendResultingRootProofLinkStatus,
    swapResultingRootProofLinkStatus,
    sendResultingRootStatus: sendResultingRootStatus.status,
    swapResultingRootStatus: swapResultingRootStatus.status,
    sendContinuityNote: sendContinuity.note,
    sendContinuityStatus: sendContinuity.status,
    swapContinuityNote: swapContinuity.note,
    swapContinuityStatus: swapContinuity.status,
    currentRoot: currentRootRecord?.root ?? null,
    currentRecord: currentRootRecord,
    rootRecords,
    latestProof,
    proofRecords,
    latestSendProof,
    sendProofRecords,
    latestSwapProof,
    swapProofRecords,
    latestSendLinkedProof: latestLinkedSendProof,
    latestSwapLinkedProof: latestLinkedSwapProof,
    latestSend,
    sendRecords,
    latestSwap,
    swapRecords,
    latestConsume,
    consumeRecords,
    latestConsumeProof,
    latestRelease,
    releaseRecords,
    latestReleaseProof,
    rootRecordCount: rootRecords.length,
    proofRecordCount: proofRecords.length,
    sendProofRecordCount: sendProofRecords.length,
    swapProofRecordCount: swapProofRecords.length,
    sendRecordCount: sendRecords.length,
    swapRecordCount: swapRecords.length,
    consumeRecordCount: consumeRecords.length,
    releaseRecordCount: releaseRecords.length,
    proofConsumeLinkStatus,
    proofSendLinkStatus,
    proofSwapLinkStatus,
    proofReleaseLinkStatus,
  };
  const contractMirrorStatus = summarizePrivateCoreContractMirrorStatus({
    contractState,
    summaryState,
  });
  const releaseBoundaryStatus = summarizePrivateCoreReleaseBoundaryStatus({
    boundaryNote: boundaryStatus.note,
    boundaryStatus: boundaryStatus.status,
    contractMirrorNote: contractMirrorStatus.note,
    contractMirrorStatus: contractMirrorStatus.status,
    latestConsume,
    latestRelease,
    latestReleaseProof,
    proofReleaseLinkStatus,
  });
  const zkV1FinishLineStatus = summarizePrivateCoreZkV1FinishLineStatus({
    boundaryNote: boundaryStatus.note,
    boundaryStatus: boundaryStatus.status,
    contractMirrorNote: contractMirrorStatus.note,
    contractMirrorStatus: contractMirrorStatus.status,
    supportedReleaseV1Decision: contractState.supportedReleaseV1Decision,
    supportedSendV1Decision: contractState.supportedSendV1Decision,
    supportedSwapV1Role: contractState.supportedSwapV1Role,
    supportedUnshieldV1Decision: contractState.supportedUnshieldV1Decision,
    supportedZkV1RequiredLanes: contractState.supportedZkV1RequiredLanes,
    supportedZkV1ScopeDecision: contractState.supportedZkV1ScopeDecision,
  });
  const requiredLanesStatus = summarizePrivateCoreRequiredLanesStatus({
    releaseBoundaryNote: releaseBoundaryStatus.note,
    releaseBoundaryStatus: releaseBoundaryStatus.status,
    sendBoundaryNote: sendBoundaryStatus.note,
    sendBoundaryStatus: sendBoundaryStatus.status,
    zkV1FinishLineNote: zkV1FinishLineStatus.note,
    zkV1FinishLineStatus: zkV1FinishLineStatus.status,
  });
  const zkV1ShippingStatus = summarizePrivateCoreZkV1ShippingStatus({
    boundaryNote: boundaryStatus.note,
    boundaryStatus: boundaryStatus.status,
    contractMirrorNote: contractMirrorStatus.note,
    contractMirrorStatus: contractMirrorStatus.status,
    releaseBoundaryNote: releaseBoundaryStatus.note,
    releaseBoundaryStatus: releaseBoundaryStatus.status,
    requiredLanesNote: requiredLanesStatus.note,
    requiredLanesStatus: requiredLanesStatus.status,
  });

  return {
    ...summaryState,
    contractMirrorStatus: contractMirrorStatus.status,
    contractMirrorNote: contractMirrorStatus.note,
    requiredLanesStatus: requiredLanesStatus.status,
    requiredLanesNote: requiredLanesStatus.note,
    releaseBoundaryStatus: releaseBoundaryStatus.status,
    releaseBoundaryNote: releaseBoundaryStatus.note,
    zkV1ShippingStatus: zkV1ShippingStatus.status,
    zkV1ShippingNote: zkV1ShippingStatus.note,
    zkV1FinishLineStatus: zkV1FinishLineStatus.status,
    zkV1FinishLineNote: zkV1FinishLineStatus.note,
    generatedAt: Date.now(),
  };
}

function buildPrivateCoreShippingDecisionState() {
  const summaryState = buildPrivateCoreSummaryState();
  const decisionStatus =
    summaryState.zkV1ShippingStatus === "ready-narrow-v1" ? "ready-to-ship" : "blocked";

  return {
    stateVersion: 1,
    decisionVersion: 1,
    decisionKind: "narrow-private-core-zk-v1-shipping",
    decisionStatus,
    decisionNote: summaryState.zkV1ShippingNote,
    contractVersion: summaryState.contractVersion,
    summaryVersion: summaryState.summaryVersion,
    generatedAt: summaryState.generatedAt,
    shippingStatus: summaryState.zkV1ShippingStatus,
    shippingNote: summaryState.zkV1ShippingNote,
    finishLineStatus: summaryState.zkV1FinishLineStatus,
    finishLineNote: summaryState.zkV1FinishLineNote,
    requiredLanesStatus: summaryState.requiredLanesStatus,
    requiredLanesNote: summaryState.requiredLanesNote,
    releaseBoundaryStatus: summaryState.releaseBoundaryStatus,
    releaseBoundaryNote: summaryState.releaseBoundaryNote,
    contractMirrorStatus: summaryState.contractMirrorStatus,
    contractMirrorNote: summaryState.contractMirrorNote,
    boundaryStatus: summaryState.boundaryStatus,
    boundaryNote: summaryState.boundaryNote,
  };
}

function humanizePrivateCoreDecisionStatus(value) {
  switch (value) {
    case "ready-to-ship":
      return "Ready to ship";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}

function humanizePrivateCoreShippingStatus(value) {
  switch (value) {
    case "ready-narrow-v1":
      return "Ready narrow v1";
    case "required-lanes-mismatch":
      return "Required lanes mismatch";
    case "release-boundary-mismatch":
      return "Release-boundary mismatch";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unknown";
  }
}

function humanizePrivateCoreRequiredLanesStatus(value) {
  switch (value) {
    case "coherent-required-lanes":
      return "Coherent required lanes";
    case "send-lane-mismatch":
      return "Send lane mismatch";
    case "release-lane-mismatch":
      return "Release lane mismatch";
    case "finish-line-mismatch":
      return "Finish-line mismatch";
    default:
      return "Unknown";
  }
}

function humanizePrivateCoreFinishLineStatus(value) {
  switch (value) {
    case "coherent-minimum-v1-lane":
      return "Coherent minimum v1 lane";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unknown";
  }
}

function humanizePrivateCoreReleaseBoundaryStatus(value) {
  switch (value) {
    case "release-recorded":
      return "Release recorded";
    case "consume-without-release":
      return "Consume without release";
    case "proof-unlinked":
      return "Proof unlinked";
    case "authorization-mismatch":
      return "Authorization mismatch";
    case "root-policy-mismatch":
      return "Root-policy mismatch";
    case "contract-mismatch":
      return "Contract mismatch";
    case "boundary-mismatch":
      return "Boundary mismatch";
    default:
      return "Unavailable";
  }
}

function humanizePrivateCoreContractMirrorStatus(value) {
  switch (value) {
    case "mirrors-contract":
      return "Summary mirrors frozen contract";
    case "contract-mismatch":
      return "Contract mismatch";
    default:
      return "Unknown";
  }
}

function humanizePrivateCoreBoundaryStatus(value) {
  switch (value) {
    case "coherent":
      return "Operator boundary coherent";
    case "awaiting-current-root":
      return "Awaiting current root";
    case "root-registration-unlinked":
      return "Root registration unlinked";
    case "send-root-registration-unlinked":
      return "Send root registration unlinked";
    case "send-root-output-mismatch":
      return "Send root output mismatch";
    case "proof-send-unlinked":
      return "Proof/send unlinked";
    case "proof-consume-unlinked":
      return "Proof/consume unlinked";
    case "proof-release-unlinked":
      return "Proof/release unlinked";
    default:
      return "Unknown";
  }
}

function buildPrivateCoreOperatorSnapshotState(request) {
  const operator = resolveRequestBaseUrl(request);
  const contract = buildPrivateCoreContractState();
  const summary = buildPrivateCoreSummaryState();
  const shippingDecision = buildPrivateCoreShippingDecisionState();

  return {
    operator,
    snapshotVersion: 1,
    snapshotKind: "contract-status-shipping-bundle",
    contract: {
      operator,
      ...contract,
    },
    status: {
      operator,
      summary,
      shippingDecision,
    },
    shipping: {
      operator,
      summaryStateVersion: shippingDecision.stateVersion,
      decisionVersion: shippingDecision.decisionVersion,
      decisionKind: shippingDecision.decisionKind,
      decisionStatusRaw: shippingDecision.decisionStatus,
      decisionStatus: humanizePrivateCoreDecisionStatus(shippingDecision.decisionStatus),
      decisionNote: shippingDecision.decisionNote,
      mirroredContractVersion: shippingDecision.contractVersion,
      summaryVersion: shippingDecision.summaryVersion,
      summaryGenerated: shippingDecision.generatedAt,
      shippingStatusRaw: shippingDecision.shippingStatus,
      shippingStatus: humanizePrivateCoreShippingStatus(shippingDecision.shippingStatus),
      shippingNote: shippingDecision.shippingNote,
      finishLineStatusRaw: shippingDecision.finishLineStatus,
      finishLineStatus: humanizePrivateCoreFinishLineStatus(shippingDecision.finishLineStatus),
      finishLineNote: shippingDecision.finishLineNote,
      requiredLanesStatusRaw: shippingDecision.requiredLanesStatus,
      requiredLanesStatus: humanizePrivateCoreRequiredLanesStatus(
        shippingDecision.requiredLanesStatus,
      ),
      requiredLanesNote: shippingDecision.requiredLanesNote,
      releaseBoundaryStatusRaw: shippingDecision.releaseBoundaryStatus,
      releaseBoundaryStatus: humanizePrivateCoreReleaseBoundaryStatus(
        shippingDecision.releaseBoundaryStatus,
      ),
      releaseBoundaryNote: shippingDecision.releaseBoundaryNote,
      contractMirrorStatusRaw: shippingDecision.contractMirrorStatus,
      contractMirrorStatus: humanizePrivateCoreContractMirrorStatus(
        shippingDecision.contractMirrorStatus,
      ),
      contractMirrorNote: shippingDecision.contractMirrorNote,
      boundaryStatusRaw: shippingDecision.boundaryStatus,
      boundaryStatus: humanizePrivateCoreBoundaryStatus(shippingDecision.boundaryStatus),
      boundaryNote: shippingDecision.boundaryNote,
    },
  };
}

function buildPrivateCoreContractState() {
  return {
    stateVersion: 1,
    contractVersion: 17,
    summaryVersion: 41,
    supportedSendLaneVersion: PRIVATE_CORE_SUPPORTED_SEND_LANE_VERSION,
    supportedSendLaneKind: PRIVATE_CORE_SUPPORTED_SEND_LANE_KIND,
    supportedSendLaneStatus: PRIVATE_CORE_SUPPORTED_SEND_LANE_STATUS,
    supportedSendLaneNote: PRIVATE_CORE_SUPPORTED_SEND_LANE_NOTE,
    supportedSendV1Decision: PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION,
    supportedSendV1DecisionNote: PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION_NOTE,
    supportedUnshieldLaneVersion: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_VERSION,
    supportedUnshieldLaneKind: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_KIND,
    supportedUnshieldLaneStatus: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_STATUS,
    supportedUnshieldLaneNote: PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_NOTE,
    supportedUnshieldV1Decision: PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION,
    supportedUnshieldV1DecisionNote: PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION_NOTE,
    supportedReleaseLaneVersion: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_VERSION,
    supportedReleaseLaneKind: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_KIND,
    supportedReleaseLaneStatus: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_STATUS,
    supportedReleaseLaneNote: PRIVATE_CORE_SUPPORTED_RELEASE_LANE_NOTE,
    supportedReleaseV1Decision: PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION,
    supportedReleaseV1DecisionNote: PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION_NOTE,
    supportedSwapLaneVersion: PRIVATE_CORE_SUPPORTED_SWAP_LANE_VERSION,
    supportedSwapLaneKind: PRIVATE_CORE_SUPPORTED_SWAP_LANE_KIND,
    supportedSwapLaneStatus: PRIVATE_CORE_SUPPORTED_SWAP_LANE_STATUS,
    supportedSwapLaneNote: PRIVATE_CORE_SUPPORTED_SWAP_LANE_NOTE,
    supportedSwapV1Decision: PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION,
    supportedSwapV1DecisionNote: PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION_NOTE,
    supportedSwapV1Role: PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE,
    supportedSwapV1RoleNote: PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE_NOTE,
    supportedSwapVenue: PRIVATE_CORE_SUPPORTED_SWAP_VENUE,
    supportedSwapOutputModel: PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_MODEL,
    supportedFlowVersion: PRIVATE_CORE_SUPPORTED_FLOW_VERSION,
    supportedFlowKind: PRIVATE_CORE_SUPPORTED_FLOW_KIND,
    supportedFlowStatus: PRIVATE_CORE_SUPPORTED_FLOW_STATUS,
    supportedFlowNote: PRIVATE_CORE_SUPPORTED_FLOW_NOTE,
    supportedShippingDecisionVersion: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_VERSION,
    supportedShippingDecisionKind: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_KIND,
    supportedShippingDecisionNote: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_NOTE,
    supportedOperatorSnapshotVersion: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_VERSION,
    supportedOperatorSnapshotKind: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_KIND,
    supportedOperatorSnapshotNote: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_NOTE,
    supportedOperatorSnapshotTransport: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_TRANSPORT,
    supportedOperatorSnapshotEndpoint: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_ENDPOINT,
    supportedZkV1ScopeDecision: PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_DECISION,
    supportedZkV1ScopeNote: PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_NOTE,
    supportedZkV1RequiredLanes: PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES,
    supportedZkV1RequiredLanesNote: PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES_NOTE,
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
    supportedSwapResultingRootBasis: PRIVATE_CORE_SUPPORTED_SWAP_RESULTING_ROOT_BASIS,
    supportedSwapInputRootPolicy: PRIVATE_CORE_SUPPORTED_SWAP_INPUT_ROOT_POLICY,
    supportedSwapOutputRegistrationPolicy:
      PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_REGISTRATION_POLICY,
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
    "supportedSendV1Decision",
    "supportedSendV1DecisionNote",
    "supportedUnshieldLaneVersion",
    "supportedUnshieldLaneKind",
    "supportedUnshieldLaneStatus",
    "supportedUnshieldLaneNote",
    "supportedUnshieldV1Decision",
    "supportedUnshieldV1DecisionNote",
    "supportedReleaseLaneVersion",
    "supportedReleaseLaneKind",
    "supportedReleaseLaneStatus",
    "supportedReleaseLaneNote",
    "supportedReleaseV1Decision",
    "supportedReleaseV1DecisionNote",
    "supportedSwapLaneVersion",
    "supportedSwapLaneKind",
    "supportedSwapLaneStatus",
    "supportedSwapLaneNote",
    "supportedSwapV1Decision",
    "supportedSwapV1DecisionNote",
    "supportedSwapV1Role",
    "supportedSwapV1RoleNote",
    "supportedSwapVenue",
    "supportedSwapOutputModel",
    "supportedFlowVersion",
    "supportedFlowKind",
    "supportedFlowStatus",
    "supportedFlowNote",
    "supportedShippingDecisionVersion",
    "supportedShippingDecisionKind",
    "supportedShippingDecisionNote",
    "supportedOperatorSnapshotVersion",
    "supportedOperatorSnapshotKind",
    "supportedOperatorSnapshotNote",
    "supportedOperatorSnapshotTransport",
    "supportedOperatorSnapshotEndpoint",
    "supportedZkV1ScopeDecision",
    "supportedZkV1ScopeNote",
    "supportedZkV1RequiredLanes",
    "supportedZkV1RequiredLanesNote",
    "supportedAssetSymbol",
    "supportedEnvironment",
    "supportedNoteSchema",
    "supportedNoteVersion",
    "supportedRootRegistrationProvenance",
    "supportedSendResultingRootBasis",
    "supportedSendInputRootPolicy",
    "supportedSendOutputRegistrationPolicy",
    "supportedSwapResultingRootBasis",
    "supportedSwapInputRootPolicy",
    "supportedSwapOutputRegistrationPolicy",
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

function summarizePrivateCoreZkV1FinishLineStatus(args) {
  if (args.supportedZkV1ScopeDecision !== "accepted-narrow-private-core-v1-scope") {
    return {
      status: "scope-mismatch",
      note: "zk v1 scope decision does not match the frozen narrow private-core finish line.",
    };
  }

  if (args.supportedZkV1RequiredLanes !== "send|unshield|release") {
    return {
      status: "required-lanes-mismatch",
      note: "Required zk v1 lane set does not match the frozen send/unshield/release contract.",
    };
  }

  if (
    args.supportedSendV1Decision !== "accepted-narrow-v1-path" ||
    args.supportedUnshieldV1Decision !== "accepted-narrow-v1-path" ||
    args.supportedReleaseV1Decision !== "accepted-narrow-v1-path"
  ) {
    return {
      status: "required-lane-decision-mismatch",
      note: "One or more required zk v1 lanes are not marked as accepted narrow v1 paths.",
    };
  }

  if (args.supportedSwapV1Role !== "adjacent-supported-not-required-for-finish-line") {
    return {
      status: "swap-role-mismatch",
      note: "Constrained swap role no longer matches the frozen adjacent-support contract.",
    };
  }

  if (args.contractMirrorStatus !== "mirrors-contract") {
    return {
      status: "contract-mismatch",
      note: args.contractMirrorNote,
    };
  }

  if (args.boundaryStatus !== "coherent") {
    return {
      status: "boundary-mismatch",
      note: args.boundaryNote,
    };
  }

  return {
    status: "coherent-minimum-v1-lane",
    note: "Frozen minimum zk v1 send/unshield/release lane is coherent at the operator boundary.",
  };
}

function summarizePrivateCoreReleaseBoundaryStatus(args) {
  if (args.contractMirrorStatus !== "mirrors-contract") {
    return {
      status: "contract-mismatch",
      note: args.contractMirrorNote,
    };
  }

  if (args.boundaryStatus !== "coherent") {
    return {
      status: "boundary-mismatch",
      note: args.boundaryNote,
    };
  }

  if (!args.latestConsume && !args.latestRelease) {
    return {
      status: "unavailable",
      note: "No proof-backed private-core release has been recorded yet.",
    };
  }

  if (args.latestConsume && !args.latestRelease) {
    return {
      status: "consume-without-release",
      note: "A private-core consume exists without a corresponding release record.",
    };
  }

  if (!args.latestRelease) {
    return {
      status: "unavailable",
      note: "No proof-backed private-core release has been recorded yet.",
    };
  }

  if (args.proofReleaseLinkStatus !== "linked" || !args.latestReleaseProof) {
    return {
      status: "proof-unlinked",
      note:
        args.proofReleaseLinkStatus === "mismatch"
          ? "Latest private-core release record does not match its linked proof."
          : "Latest private-core release does not have a linked proof record yet.",
    };
  }

  if (args.latestRelease.authorizationBasis !== PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS) {
    return {
      status: "authorization-mismatch",
      note: "Latest private-core release authorization basis does not match the frozen proof-backed consume contract.",
    };
  }

  if (args.latestRelease.rootPolicy !== PRIVATE_CORE_RELEASE_ROOT_POLICY) {
    return {
      status: "root-policy-mismatch",
      note: "Latest private-core release root policy does not match the frozen latest-registered-root contract.",
    };
  }

  return {
    status: "release-recorded",
    note: "Latest private-core release is recorded, proof-linked, and consistent with the frozen release contract.",
  };
}

function summarizePrivateCoreRequiredLanesStatus(args) {
  if (args.zkV1FinishLineStatus !== "coherent-minimum-v1-lane") {
    return {
      status: "finish-line-mismatch",
      note: args.zkV1FinishLineNote,
    };
  }

  const sendHealthyStatuses = new Set([
    "coherent-current-root",
    "coherent-registered-stale",
    "downstream-consumed",
    "downstream-released",
  ]);
  if (!sendHealthyStatuses.has(args.sendBoundaryStatus)) {
    return {
      status: "send-lane-mismatch",
      note: args.sendBoundaryNote,
    };
  }

  if (args.releaseBoundaryStatus !== "release-recorded") {
    return {
      status: "release-lane-mismatch",
      note: args.releaseBoundaryNote,
    };
  }

  return {
    status: "coherent-required-lanes",
    note: "Minimum zk v1 required lanes are coherent: send boundary is healthy, release boundary is recorded, and the finish line remains coherent.",
  };
}

function summarizePrivateCoreZkV1ShippingStatus(args) {
  if (args.contractMirrorStatus !== "mirrors-contract") {
    return {
      status: "contract-mismatch",
      note: args.contractMirrorNote,
    };
  }

  if (args.boundaryStatus !== "coherent") {
    return {
      status: "boundary-mismatch",
      note: args.boundaryNote,
    };
  }

  if (args.releaseBoundaryStatus !== "release-recorded") {
    return {
      status: "release-boundary-mismatch",
      note: args.releaseBoundaryNote,
    };
  }

  if (args.requiredLanesStatus !== "coherent-required-lanes") {
    return {
      status: "required-lanes-mismatch",
      note: args.requiredLanesNote,
    };
  }

  return {
    status: "ready-narrow-v1",
    note: "Minimum zk v1 required lanes are coherent and the operator boundary remains contract-coherent enough to ship the frozen narrow lane.",
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

function summarizePrivateCoreSwapResultingRootStatus(args) {
  if (!args.latestSwap) {
    return {
      status: "unavailable",
      note: "No private swap transition has been recorded yet.",
    };
  }

  if (!args.latestSwap.resultingRoot) {
    return {
      status: "missing",
      note: "Latest private swap transition did not persist a resulting root.",
    };
  }

  if (args.latestRelease?.root === args.latestSwap.resultingRoot) {
    return {
      status: "downstream-released",
      note: "Latest private swap resulting root has already been released downstream.",
    };
  }

  if (args.latestConsume?.root === args.latestSwap.resultingRoot) {
    return {
      status: "downstream-consumed",
      note: "Latest private swap resulting root has already been consumed downstream.",
    };
  }

  if (args.currentRoot === args.latestSwap.resultingRoot) {
    return {
      status: "current-root",
      note: "Latest private swap resulting root is the current registered operator root.",
    };
  }

  if (args.rootRecords.some((record) => record.root === args.latestSwap.resultingRoot)) {
    return {
      status: "registered-stale",
      note: "Latest private swap resulting root is registered but not current anymore.",
    };
  }

  return {
    status: "unregistered",
    note: "Latest private swap resulting root has not been registered with the operator yet.",
  };
}

function summarizePrivateCoreSwapResultingRootRegistration(args) {
  if (!args.latestSwap || !args.latestSwap.resultingRoot || !args.swapResultingRootRecord) {
    return {
      status: "unavailable",
      note: "No registered swap resulting root is available for output-continuity checks yet.",
    };
  }

  if (args.swapResultingRootRecord.noteCommitment === args.latestSwap.outputCommitment) {
    return {
      status: "linked-output",
      note: "Registered swap resulting root matches the latest swap output commitment.",
    };
  }

  return {
    status: "mismatch",
    note: "Registered swap resulting root does not match the output commitment from the latest swap.",
  };
}

function summarizePrivateCoreSwapContinuityStatus(args) {
  if (!args.latestSwap) {
    return {
      status: "unavailable",
      note: "No private swap transition is available for continuity checks yet.",
    };
  }

  if (!args.latestSwap.resultingRoot) {
    return {
      status: "missing-resulting-root",
      note: "Latest private swap transition did not persist a resulting root for downstream continuity.",
    };
  }

  if (args.swapResultingRootRegistrationStatus === "mismatch") {
    return {
      status: "output-mismatch",
      note: "Registered swap resulting root does not match the output commitment from the latest swap.",
    };
  }

  if (args.swapResultingRootProofLinkStatus === "mismatch") {
    return {
      status: "registration-proof-unlinked",
      note: "Registered swap resulting root does not match its linked registration proof.",
    };
  }

  if (args.swapResultingRootProofLinkStatus === "unavailable") {
    if (args.swapResultingRootStatus === "unregistered") {
      return {
        status: "awaiting-registration",
        note: "Latest swap resulting root still needs operator registration before downstream continuity is established.",
      };
    }

    return {
      status: "registration-proof-unlinked",
      note: "Registered swap resulting root is missing a linked registration proof.",
    };
  }

  if (args.swapResultingRootStatus === "current-root") {
    return {
      status: "ready-current-root",
      note: "Latest swap resulting root is registered, linked, and current for downstream send or unshield use.",
    };
  }

  if (args.swapResultingRootStatus === "registered-stale") {
    return {
      status: "ready-registered-stale",
      note: "Latest swap resulting root is registered and linked, but no longer the current operator root.",
    };
  }

  if (args.swapResultingRootStatus === "downstream-consumed") {
    return {
      status: "downstream-consumed",
      note: "Latest swap resulting root has already been consumed downstream.",
    };
  }

  if (args.swapResultingRootStatus === "downstream-released") {
    return {
      status: "downstream-released",
      note: "Latest swap resulting root has already been released downstream.",
    };
  }

  return {
    status: "awaiting-registration",
    note: "Latest swap resulting root is not yet ready for downstream continuity checks.",
  };
}

function summarizePrivateCoreSwapBoundaryStatus(args) {
  if (!args.latestSwap) {
    return {
      status: "unavailable",
      note: "No private swap transition is available for boundary checks yet.",
    };
  }

  if (args.proofSwapLinkStatus === "mismatch") {
    return {
      status: "proof-swap-unlinked",
      note: "Latest swap transition does not match its linked swap proof.",
    };
  }

  if (args.proofSwapLinkStatus === "unavailable") {
    return {
      status: "proof-swap-unlinked",
      note: "Latest swap transition is missing a linked swap proof.",
    };
  }

  switch (args.swapContinuityStatus) {
    case "missing-resulting-root":
      return {
        status: "missing-resulting-root",
        note: args.swapContinuityNote,
      };
    case "output-mismatch":
      return {
        status: "output-mismatch",
        note: args.swapContinuityNote,
      };
    case "registration-proof-unlinked":
      return {
        status: "registration-proof-unlinked",
        note: args.swapContinuityNote,
      };
    case "awaiting-registration":
      return {
        status: "awaiting-registration",
        note: args.swapContinuityNote,
      };
    case "ready-current-root":
      return {
        status: "coherent-current-root",
        note: args.swapContinuityNote,
      };
    case "ready-registered-stale":
      return {
        status: "coherent-registered-stale",
        note: args.swapContinuityNote,
      };
    case "downstream-consumed":
      return {
        status: "downstream-consumed",
        note: args.swapContinuityNote,
      };
    case "downstream-released":
      return {
        status: "downstream-released",
        note: args.swapContinuityNote,
      };
    case "unavailable":
    default:
      if (args.swapResultingRootStatus === "missing") {
        return {
          status: "missing-resulting-root",
          note: args.swapResultingRootNote,
        };
      }

      return {
        status: "unavailable",
        note: args.swapContinuityNote ?? "Private swap boundary state is not available yet.",
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

function assertPrivateCoreDownstreamRootRegistrationConsistency(args) {
  if (args.latestSend?.resultingRoot === args.root) {
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

  if (args.latestSwap?.resultingRoot === args.root) {
    if (args.sourceArtifacts.noteCommitment === args.latestSwap.outputCommitment) {
      return {
        registrationBasis: "swap-output",
        source: "app-private-core-swap-output-flow",
      };
    }

    throw new Error(
      "Private-core swap resulting root registration does not match the output commitment from the latest swap.",
    );
  }

  if (!args.latestSend || args.latestSend.resultingRoot !== args.root) {
    return {
      registrationBasis: "shield-input",
      source: "app-private-core-shield-flow",
    };
  }

  return {
    registrationBasis: "shield-input",
    source: "app-private-core-shield-flow",
  };
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

function summarizePrivateCoreProofSwapLinkStatus(args) {
  if (!args.linkedProof || !args.latestSwap) {
    return "unavailable";
  }

  if (
    args.linkedProof.proofId === args.latestSwap.proofId &&
    args.linkedProof.root === args.latestSwap.inputRoot &&
    args.linkedProof.nullifier === args.latestSwap.inputNullifier
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

function summarizePrivateCoreSwapProofRecord(args) {
  const witnessPackage = normalizeVantaPrivateCoreSwapWitnessPackage(args.witnessPackage);
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;
  const completedAt = Date.now();

  return {
    action: args.action,
    assetId: sourcePublicInputs.inputAssetId,
    amount: sourcePublicInputs.inputAmount,
    backend: args.proofReceipt.backend,
    circuit: args.proofReceipt.circuit,
    completedAt,
    noteVersion: sourcePublicInputs.inputNoteVersion,
    nullifier: sourcePublicInputs.inputNullifier,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: [
      "private-core-swap-proof",
      args.action,
      sourcePublicInputs.inputNullifier,
      sourcePublicInputs.stateRoot,
      String(completedAt),
    ].join(":"),
    proofVersion: args.proofReceipt.proofVersion,
    provingHashLane: args.proofReceipt.provingHashLane,
    publicInputCount: args.proofReceipt.publicInputCount,
    releaseDestination: sourcePublicInputs.outputCommitment,
    root: sourcePublicInputs.stateRoot,
    verified: args.proofReceipt.verified === true,
  };
}

function summarizePrivateCoreSwapRecord(args) {
  const sourcePublicInputs = args.witnessPackage.sourcePublicInputs;
  const completedAt = Date.now();

  return {
    completedAt,
    executionQuoteReference:
      typeof args.executionQuoteReference === "string" && args.executionQuoteReference.length > 0
        ? args.executionQuoteReference
        : null,
    executionVenueLabel:
      typeof args.executionVenueLabel === "string" && args.executionVenueLabel.length > 0
        ? args.executionVenueLabel
        : null,
    inputAssetId: sourcePublicInputs.inputAssetId,
    inputNullifier: sourcePublicInputs.inputNullifier,
    inputRoot: sourcePublicInputs.stateRoot,
    inputAmount: sourcePublicInputs.inputAmount,
    noteVersion: sourcePublicInputs.inputNoteVersion,
    outputAssetId: sourcePublicInputs.outputAssetId,
    outputAmount: sourcePublicInputs.outputAmount,
    outputCommitment: sourcePublicInputs.outputCommitment,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: args.proofRecord.proofId,
    publicInputCount: args.proofReceipt.publicInputCount,
    resultingRootBasis: "client-declared",
    resultingRoot: typeof args.resultingRoot === "string" ? args.resultingRoot : null,
    swapId: [
      "private-core-swap",
      sourcePublicInputs.inputNullifier,
      sourcePublicInputs.stateRoot,
      String(completedAt),
    ].join(":"),
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
