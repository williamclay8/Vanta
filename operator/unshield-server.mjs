import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@solana/client";
import { Connection, PublicKey } from "@solana/web3.js";
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
  assertEligibleSwapTransition,
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
  assertVantaPrivateCoreSourceArtifactShapeConsistency,
  deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage,
  deriveVantaPrivateCoreSwapInputArtifactsFromWitnessPackage,
  normalizeVantaPrivateCoreUnshieldProofArtifact,
  normalizeVantaPrivateCoreSendProofArtifact,
  normalizeVantaPrivateCoreSendWitnessPackage,
  normalizeVantaPrivateCoreSwapWitnessPackage,
  normalizeVantaPrivateCoreWitnessPackage,
  proveAndVerifyVantaPrivateCoreSend,
  proveAndVerifyVantaPrivateCoreSwap,
  proveAndVerifyVantaPrivateCoreUnshield,
  verifyVantaPrivateCoreSendProofArtifact,
  verifyVantaPrivateCoreUnshieldProofArtifact,
} from "./private-core-proof.mjs";
import { createReleaseRecordStore } from "./release-record-store.mjs";

function installOperatorLogSecretRedaction() {
  const streams = [process.stderr, process.stdout];

  for (const stream of streams) {
    const originalWrite = stream.write.bind(stream);
    stream.write = (chunk, encoding, callback) => {
      if (typeof chunk === "string") {
        return originalWrite(redactSecretBearingUrls(chunk), encoding, callback);
      }

      if (Buffer.isBuffer(chunk)) {
        return originalWrite(
          Buffer.from(redactSecretBearingUrls(chunk.toString("utf8")), "utf8"),
          encoding,
          callback,
        );
      }

      return originalWrite(chunk, encoding, callback);
    };
  }
}

function redactSecretBearingUrls(value) {
  return value.replace(/https?:\/\/[^\s'"<>)}\]]+/g, (candidate) => {
    try {
      const url = new URL(candidate);
      let redacted = false;

      for (const key of [...url.searchParams.keys()]) {
        if (isSensitiveUrlParam(key)) {
          url.searchParams.set(key, "redacted");
          redacted = true;
        }
      }

      return redacted ? url.toString() : candidate;
    } catch {
      return candidate.replace(
        /([?&][^=\s&]*(?:api[-_]?key|access[-_]?token|token|secret|signature|sig)[^=]*=)[^&\s'"]+/gi,
        "$1redacted",
      );
    }
  });
}

function isSensitiveUrlParam(key) {
  return /(?:api[-_]?key|access[-_]?token|token|secret|signature|sig)/i.test(key);
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.operator");
loadEnvFile(".env.operator.local");

installOperatorLogSecretRedaction();

const port = Number(process.env.VANTA_UNSHIELD_OPERATOR_PORT ?? "8789");
const MAX_JSON_BODY_BYTES = parsePositiveIntegerEnv(
  "VANTA_UNSHIELD_OPERATOR_MAX_JSON_BODY_BYTES",
  1048576,
);
const endpoint =
  process.env.SOLANA_RPC_URL ??
  process.env.VITE_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";
const websocketEndpoint =
  process.env.SOLANA_WS_URL ??
  process.env.VITE_SOLANA_WS_URL ??
  endpoint.replace("https://", "wss://").replace("http://", "ws://");
const configuredCluster =
  process.env.VANTA_SOLANA_CLUSTER ??
  process.env.SOLANA_CLUSTER ??
  process.env.VITE_SOLANA_CLUSTER ??
  (process.env.NODE_ENV === "production" ? "mainnet-beta" : "mainnet");
const isMainnetCluster = configuredCluster === "mainnet-beta";
const MAINNET_RECOGNIZED_MINTS = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  EURC: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  JupUSD: "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
  KMNO: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
  PYUSD: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
  USD1: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDS: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  USX: "6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
};
const mintAddress =
  clusterEnv("TOKEN_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDC : undefined);
const usdcMintAddress =
  clusterEnv("USDC_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDC : undefined);
const usdtMintAddress =
  clusterEnv("USDT_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDT : undefined);
const eurcMintAddress =
  clusterEnv("EURC_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.EURC : undefined);
const usdsMintAddress =
  clusterEnv("USDS_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USDS : undefined);
const usxMintAddress =
  clusterEnv("USX_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USX : undefined);
const usd1MintAddress =
  clusterEnv("USD1_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.USD1 : undefined);
const jupusdMintAddress =
  clusterEnv("JUPUSD_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JupUSD : undefined);
const jtoMintAddress =
  clusterEnv("JTO_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JTO : undefined);
const bonkMintAddress =
  clusterEnv("BONK_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.BONK : undefined);
const jupMintAddress =
  clusterEnv("JUP_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.JUP : undefined);
const pyusdMintAddress =
  clusterEnv("PYUSD_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.PYUSD : undefined);
const wifMintAddress =
  clusterEnv("WIF_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.WIF : undefined);
const kmnoMintAddress =
  clusterEnv("KMNO_MINT") ?? (isMainnetCluster ? MAINNET_RECOGNIZED_MINTS.KMNO : undefined);
const vaultOwner =
  clusterEnv("VAULT_OWNER") ??
  nonEmptyEnv("VANTA_VAULT_OWNER") ??
  nonEmptyEnv("VITE_VANTA_VAULT_OWNER");

if (!mintAddress) {
  throw new Error(
    `Unshield operator requires ${isMainnetCluster ? "VANTA_MAINNET" : "VANTA_MAINNET"}_TOKEN_MINT.`,
  );
}

const supportedTokenMintAddresses = new Set(
  [
    mintAddress,
    usdcMintAddress,
    usdtMintAddress,
    eurcMintAddress,
    usdsMintAddress,
    usxMintAddress,
    usd1MintAddress,
    jupusdMintAddress,
    jtoMintAddress,
    bonkMintAddress,
    jupMintAddress,
    pyusdMintAddress,
    wifMintAddress,
    kmnoMintAddress,
  ].filter(
    (value) => typeof value === "string" && value.length > 0,
  ),
);

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
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const VANTA_UNSHIELD_CONSUMED_NOTE_REFERENCE_HASH_DOMAIN =
  "vanta-unshield-consumed-note-reference-v1";
const PRIVATE_CORE_CONTRACT_VERSION = 23;
const PRIVATE_CORE_SUMMARY_VERSION = 47;
const PRIVATE_CORE_SUPPORTED_SEND_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SEND_LANE_KIND = "single-input-single-recipient-optional-change";
const PRIVATE_CORE_SUPPORTED_SEND_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_SEND_LANE_NOTE =
  "Current narrow zk v1 send lane is supported for one input note, one recipient output, and optional change.";
const PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_SEND_V1_DECISION_NOTE =
  "Current operator-backed private send lane is accepted as the narrow zk v1 send path for USDC on solana-mainnet.";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_KIND = "single-note-proof-backed-consume";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_LANE_NOTE =
  "Current narrow zk v1 unshield lane is supported for one note consume with proof-backed release recording.";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_V1_DECISION_NOTE =
  "Current operator-backed proof-backed unshield lane is accepted as the narrow zk v1 unshield path for USDC on solana-mainnet.";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_KIND = "proof-backed-consume-latest-registered-root";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_RELEASE_LANE_NOTE =
  "Current narrow zk v1 release lane is supported for proof-backed consume-authorized release under the latest registered root policy.";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_RELEASE_V1_DECISION_NOTE =
  "Current operator-backed proof-backed release lane is accepted as the narrow zk v1 release path for USDC on solana-mainnet.";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_KIND =
  "single-input-usdc-to-allowlisted-shielded-output";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_STATUS = "supported";
const PRIVATE_CORE_SUPPORTED_SWAP_LANE_NOTE =
  "Current constrained swap lane supports one USDC input note into one allowlisted shielded output note through operator-backed execution, including Meteora-aware shielded SOL and direct shielded token output lanes.";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION = "accepted-narrow-v1-path";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_DECISION_NOTE =
  "Current constrained operator-backed USDC swap lane is accepted as the narrow zk v1 swap path on solana-mainnet for shielded SOL and allowlisted shielded token outputs.";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE =
  "adjacent-supported-not-required-for-finish-line";
const PRIVATE_CORE_SUPPORTED_SWAP_V1_ROLE_NOTE =
  "Current constrained swap lane is supported operator-backed infrastructure in the repo, but it is not required for the minimum zk v1 finish line.";
const PRIVATE_CORE_SUPPORTED_SWAP_VENUE =
  "meteora-dlmm-mainnet-and-operator-token-output";
const PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_MODEL = "allowlisted-shielded-output-note";
const PRIVATE_CORE_SUPPORTED_SWAP_RESULTING_ROOT_BASIS = "client-declared";
const PRIVATE_CORE_SUPPORTED_SWAP_INPUT_ROOT_POLICY =
  "latest-registered-root-with-linked-registration-proof";
const PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_REGISTRATION_POLICY =
  "resulting-root-must-register-as-swap-output";
const PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY = "vanta_private_core_single_note";
const PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_STATUS = "active-v0-legacy";
const PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_NEW_ARCHITECTURE_STATUS =
  "deprecated-for-new-architecture";
const PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_NOTE =
  "Private Core single-note Send, Swap, and Unshield remain active v0 compatibility lanes for current flows, but new production architecture should migrate through the Private Pool v2 entry family or an explicitly reviewed replacement.";
const PRIVATE_CORE_SUPPORTED_LEGACY_CIRCUITS = [
  "vanta_private_core_single_note_send",
  "vanta_private_core_single_note_swap",
  "vanta_private_core_single_note_unshield",
];
const PRIVATE_CORE_SUPPORTED_REPLACEMENT_FAMILY = "vanta_private_pool_v2_entry";
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
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_KIND =
  "ready-gated-narrow-private-core-zk-v1-shipping";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_NOTE =
  "Compact shipping decision surface can act as a strict ready gate for the frozen narrow lane.";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_ENDPOINT =
  "/state/private-core-shipping-decision-check";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_ENDPOINT =
  "/state/private-core-shipping-decision";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_KIND = "contract-status-shipping-bundle";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_NOTE =
  "Canonical bundled machine-readable operator artifact containing the frozen contract, live status summary, and canonical shipping decision surfaces together.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_KIND =
  "ready-gated-contract-status-shipping-bundle";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_NOTE =
  "Bundled operator snapshot surface can act as a strict ready gate for the frozen narrow lane.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_ENDPOINT = "/state/private-core-snapshot-check";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_ENDPOINT = "/state/private-core-snapshot";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_KIND = "long-form-live-status";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_NOTE =
  "Canonical long-form live operator-status surface composed from the bundled snapshot plus the dedicated shipping artifact.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_KIND = "ready-gated-long-form-live-status";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_NOTE =
  "Long-form operator-status surface can act as a strict ready gate for the frozen narrow lane.";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_ENDPOINT = "/state/private-core-status-check";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_ENDPOINT = "/state/private-core-status";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_KIND =
  "shipping-decision-checked-snapshot-bundle";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_NOTE =
  "Canonical release-grade machine-readable operator artifact containing the shipping decision plus the bundled contract, live status summary, and canonical shipping surfaces together.";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_KIND =
  "ready-gated-shipping-decision-checked-snapshot-bundle";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_NOTE =
  "Release-grade shipping artifact surface can act as a strict ready gate for the frozen narrow lane.";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_ENDPOINT =
  "/state/private-core-shipping-artifact-check";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_ENDPOINT = "/state/private-core-shipping-artifact";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_KIND =
  "exact-run-send-consume-release-candidate";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_NOTE =
  "Canonical exact-run machine-readable operator artifact binding one narrow private-core release candidate to send, consume, release, and bundled snapshot lineage.";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_SCOPE =
  "primary-send-unshield-only";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_SCOPE_NOTE =
  "Exact-run release-candidate lineage is canonical only for the primary private send to downstream unshield path; downstream send-change and send-chain release variants remain valid release paths but are outside this exact candidate contract.";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_VERSION = 1;
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_KIND =
  "ready-gated-exact-run-send-consume-release-candidate";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_NOTE =
  "Exact-run release-candidate surface can act as a strict ready gate for the frozen narrow lane.";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_ENDPOINT =
  "/state/private-core-release-candidate-check";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_TRANSPORT = "dedicated-endpoint";
const PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_ENDPOINT =
  "/state/private-core-release-candidate";
const PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_DECISION =
  "accepted-narrow-private-core-v1-scope";
const PRIVATE_CORE_SUPPORTED_ZK_V1_SCOPE_NOTE =
  "Current zk v1 finish line is the narrow private-core lane frozen in this repo, not the broader long-term privacy product surface.";
const PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES = "send|unshield|release";
const PRIVATE_CORE_SUPPORTED_ZK_V1_REQUIRED_LANES_NOTE =
  "Minimum zk v1 finish line requires the narrow private-core send, unshield, and release lanes; constrained swap remains adjacent supported infrastructure.";
const PRIVATE_CORE_SUPPORTED_ASSET_SYMBOL = "USDC";
const PRIVATE_CORE_SUPPORTED_ENVIRONMENT = "solana-mainnet";
const PRIVATE_CORE_SUPPORTED_RECIPIENT_MODEL = "hashed-reference-to-owner-key";
const PRIVATE_CORE_SUPPORTED_RELEASE_DESTINATION_MODEL = "32-byte-release-destination-field";
const PRIVATE_CORE_SUPPORTED_NOTE_SCHEMA = "note-v0";
const PRIVATE_CORE_SUPPORTED_NOTE_VERSION = 0;
const PRIVATE_CORE_SUPPORTED_ROOT_REGISTRATION_PROVENANCE =
  "shield-input|send-recipient-output|send-change-output|swap-output";
const PRIVATE_CORE_SUPPORTED_SEND_RESULTING_ROOT_BASIS = "proof-linked-input-expected-root";
const PRIVATE_CORE_SUPPORTED_SEND_RESULTING_ROOT_BASIS_NOTE =
  "The Send resulting root is an operator-accepted expected post-send root tied to a proof-linked latest input root; v1 does not claim the root is a circuit-public input or fully operator-derived from complete tree state, and downstream continuity requires recipient/change output-root registration.";
const PRIVATE_CORE_SUPPORTED_SEND_INPUT_ROOT_POLICY =
  "latest-registered-root-with-linked-registration-proof";
const PRIVATE_CORE_SUPPORTED_SEND_OUTPUT_REGISTRATION_POLICY =
  "resulting-root-must-register-as-recipient-or-change-output";
const PRIVATE_CORE_SUPPORTED_PROOF_SYSTEM = "noir-acir-ultrahonk-bbjs";
const PRIVATE_CORE_OPERATOR_WITNESS_MODE =
  process.env.VANTA_PRIVATE_CORE_OPERATOR_WITNESS_MODE ??
  (process.env.NODE_ENV === "production" ? "strict-no-witness" : "local-prover-dev");
const PRIVATE_CORE_OPERATOR_WITNESS_MATERIAL_POLICY =
  PRIVATE_CORE_OPERATOR_WITNESS_MODE === "strict-no-witness"
    ? "reject-private-witness-material"
    : "local-prover-dev-accepts-private-witness-material";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_CIRCUIT = "vanta_private_core_single_note_unshield";
const PRIVATE_CORE_SUPPORTED_SEND_CIRCUIT = "vanta_private_core_single_note_send";
const PRIVATE_CORE_SUPPORTED_UNSHIELD_MERKLE_DEPTH = 20;
const PRIVATE_CORE_SUPPORTED_SEND_MERKLE_DEPTH = 20;
const PRIVATE_CORE_RELEASE_AUTHORIZATION_BASIS = "proof-backed-consume";
const PRIVATE_CORE_RELEASE_ROOT_POLICY = "latest-registered-root";
const PRIVATE_CORE_RELEASE_EXECUTION_MODEL = "operator-recorded-mainnet-release";
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
      expectedPair: "USDC->SOL",
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

export async function handleUnshieldOperatorRequest(request, response) {
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

  if (request.method === "GET" && request.url === "/health/sol-unshield") {
    const health = evaluateSolUnshieldLaneHealth();
    writeCorsHeaders(response);
    response.writeHead(health.ready ? 200 : 503, { "Content-Type": "application/json" });
    response.end(JSON.stringify(health));
    return;
  }

  if (request.method === "GET" && request.url === "/state/sol-unshield-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        stateVersion: 1,
        consumedNoteReferenceHashes: solUnshieldRecords
          .listConsumedNoteIds()
          .map(createUnshieldConsumedNoteReferenceHash),
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/state/unshield-records") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        stateVersion: 1,
        consumedNoteReferenceHashes: releaseRecords
          .listConsumedNoteIds()
          .map(createUnshieldConsumedNoteReferenceHash),
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

  if (
    request.method === "GET" &&
    request.url === "/state/private-core-shipping-decision-check"
  ) {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreShippingDecisionCheckState()));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-status") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreOperatorStatusState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-status-check") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreOperatorStatusCheckState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-snapshot") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreOperatorSnapshotState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-snapshot-check") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreOperatorSnapshotCheckState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-shipping-artifact") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreShippingArtifactState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-release-candidate") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreReleaseCandidateState(request)));
    return;
  }

  if (request.method === "GET" && request.url === "/state/private-core-release-package") {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreReleasePackageState(request)));
    return;
  }

  if (
    request.method === "GET" &&
    request.url === "/state/private-core-release-candidate-check"
  ) {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreReleaseCandidateCheckState(request)));
    return;
  }

  if (
    request.method === "GET" &&
    request.url === "/state/private-core-release-package-check"
  ) {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreReleasePackageCheckState(request)));
    return;
  }

  if (
    request.method === "GET" &&
    request.url === "/state/private-core-shipping-artifact-check"
  ) {
    writeCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(buildPrivateCoreShippingArtifactCheckState(request)));
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
        body.inputAsset !== "USDC" ||
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
          inputAsset: "USDC",
          minOutputAmount: quote.minOutputAmount,
          outputAmount: quote.outputAmount,
          outputAsset: "SOL",
          pairLabel: quote.pairLabel,
          quoteExpiresAt: quote.quoteExpiresAt,
          quoteId: quote.quoteId,
          quoteTimestamp: quote.quoteTimestamp,
          slippageBps: quote.slippageBps,
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
      assertPrivateCoreWitnessMaterialPolicy(body);
      const proofReceipt = await resolvePrivateCoreUnshieldProofReceipt(body);
      privateCoreProofStore.recordProof(
        body?.proofArtifact
          ? summarizePrivateCoreProofRecordFromVerifiedPublicInputs({
              action: "proof-only",
              proofReceipt,
            })
          : summarizePrivateCoreProofRecordFromSourcePublicInputs({
              action: "proof-only",
              proofReceipt,
              sourcePublicInputs: getPrivateCoreUnshieldSourcePublicInputs(body),
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
      assertPrivateCoreWitnessMaterialPolicy(body, { lane: "send" });
      const proofReceipt = await resolvePrivateCoreSendProofReceipt(body);
      privateCoreSendProofStore.recordProof(
        body?.proofArtifact
          ? summarizePrivateCoreSendProofRecordFromVerifiedPublicInputs({
              action: "send-proof",
              proofReceipt,
            })
          : summarizePrivateCoreSendProofRecord({
              action: "send-proof",
              proofReceipt,
              witnessPackage: normalizeVantaPrivateCoreSendWitnessPackage(body?.witnessPackage),
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

      privateCoreSwapStore.reserveInputNullifier(
        sourcePublicInputs.inputNullifier,
        inputArtifacts.noteCommitment,
      );
      let swapRecorded = false;
      let proofReceipt;
      let proofRecord;
      let swapRecord;
      try {
        proofReceipt = await proveAndVerifyVantaPrivateCoreSwap({
          witnessPackage,
        });
        proofRecord = summarizePrivateCoreSwapProofRecord({
          action: "swap-proof",
          proofReceipt,
          witnessPackage,
        });
        privateCoreSwapProofStore.recordProof(proofRecord);
        swapRecord = summarizePrivateCoreSwapRecord({
          executionQuoteReference: body?.executionQuoteReference,
          executionVenueLabel: body?.executionVenueLabel,
          inputCommitment: inputArtifacts.noteCommitment,
          proofRecord,
          proofReceipt,
          resultingRoot,
          witnessPackage,
        });
        privateCoreSwapStore.recordSwap(swapRecord);
        swapRecorded = true;
      } finally {
        if (!swapRecorded) {
          privateCoreSwapStore.releaseInputNullifier(
            sourcePublicInputs.inputNullifier,
            inputArtifacts.noteCommitment,
          );
        }
      }

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
      assertPrivateCoreWitnessMaterialPolicy(body, { lane: "send" });
      const releaseCandidateId = normalizePrivateCoreReleaseCandidateId(body?.releaseCandidateId);
      const proofReceipt = await resolvePrivateCoreSendProofReceipt(body);
      const sendProofTerms = getPrivateCoreSendProofTerms(body, proofReceipt);

      if (!privateCoreRootStore.hasRoot(sendProofTerms.inputRoot)) {
        throw new Error("Private-core send transition input root is not registered.");
      }

      const latestRootRecord = privateCoreRootStore.getLatestRoot();
      if (!latestRootRecord || latestRootRecord.root !== sendProofTerms.inputRoot) {
        throw new Error("Private-core send transition input root is not the latest registered root.");
      }

      if (sendProofTerms.mode === "witness-package") {
        if (latestRootRecord.assetId !== sendProofTerms.inputArtifacts.assetId) {
          throw new Error("Private-core send transition asset does not match the registered input root.");
        }

        if (latestRootRecord.amount !== sendProofTerms.inputArtifacts.amount) {
          throw new Error("Private-core send transition amount basis does not match the registered input root.");
        }

        if (latestRootRecord.noteCommitment !== sendProofTerms.inputArtifacts.noteCommitment) {
          throw new Error(
            "Private-core send transition source note commitment does not match the registered input root.",
          );
        }

        if (latestRootRecord.merkleLeaf !== sendProofTerms.inputArtifacts.merkleLeaf) {
          throw new Error(
            "Private-core send transition source Merkle leaf does not match the registered input root.",
          );
        }

        if (latestRootRecord.witnessRoot !== sendProofTerms.inputArtifacts.witnessRoot) {
          throw new Error(
            "Private-core send transition source witness root does not match the registered input root.",
          );
        }
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
      if (resultingRoot === sendProofTerms.inputRoot) {
        throw new Error("Private-core send resulting root must differ from the input root.");
      }
      privateCoreSendStore.reserveInputNullifier(sendProofTerms.inputNullifier);
      let sendRecorded = false;
      let proofRecord;
      let sendRecord;
      try {
        proofRecord =
          sendProofTerms.mode === "proof-artifact"
            ? summarizePrivateCoreSendProofRecordFromVerifiedPublicInputs({
                action: "send-proof",
                proofReceipt,
              })
            : summarizePrivateCoreSendProofRecord({
                action: "send-proof",
                proofReceipt,
                witnessPackage: sendProofTerms.witnessPackage,
              });
        privateCoreSendProofStore.recordProof(proofRecord);
        sendRecord =
          sendProofTerms.mode === "proof-artifact"
            ? summarizePrivateCoreSendRecordFromVerifiedPublicInputs({
                proofRecord,
                proofReceipt,
                releaseCandidateId,
                resultingRoot,
              })
            : summarizePrivateCoreSendRecord({
                proofRecord,
                proofReceipt,
                releaseCandidateId,
                resultingRoot,
                witnessPackage: sendProofTerms.witnessPackage,
              });
        privateCoreSendStore.recordSend(sendRecord);
        sendRecorded = true;
      } finally {
        if (!sendRecorded) {
          privateCoreSendStore.releaseInputNullifier(sendProofTerms.inputNullifier);
        }
      }

      writeCorsHeaders(response);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...proofReceipt,
          completedAt: sendRecord.completedAt,
          inputNullifier: sendRecord.inputNullifier,
          inputRoot: sendRecord.inputRoot,
          releaseCandidateId: sendRecord.releaseCandidateId,
          recipientCommitment: sendRecord.recipientCommitment,
          resultingRootBasis: sendRecord.resultingRootBasis,
          resultingRoot: sendRecord.resultingRoot,
          changeCommitment: sendRecord.changeCommitment,
          proofId: sendRecord.proofId,
          redactionBasis: sendRecord.redactionBasis ?? null,
          sendAmount: sendRecord.sendAmount ?? null,
          sendId: sendRecord.sendId,
          sendRecorded: true,
          changeAmount: sendRecord.changeAmount ?? null,
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
      assertPrivateCoreWitnessMaterialPolicy(body);
      const proofReceipt = await resolvePrivateCoreUnshieldProofReceipt(body);
      const sourcePublicInputs = getPrivateCoreUnshieldSourcePublicInputs(body);
      const sourceArtifacts = body?.sourceArtifacts;
      const root = sourcePublicInputs?.stateRoot;

      if (body?.proofArtifact) {
        throw new Error(
          "Private-core no-witness root registration requires a validated source/proving lineage artifact; v0.1 fails closed for proof-artifact root registration.",
        );
      }

      if (typeof root !== "string" || root.length === 0) {
        throw new Error("Private-core root registration request is missing a source root.");
      }

      assertPrivateCoreUnshieldSourceArtifactConsistency({ body, sourceArtifacts, sourcePublicInputs });
      const latestSend = privateCoreSendStore.getLatestSend();
      const latestSwap = privateCoreSwapStore.getLatestSwap();
      const rootRegistrationConsistency = assertPrivateCoreDownstreamRootRegistrationConsistency({
        latestSend,
        latestSwap,
        root,
        sourceArtifacts,
      });
      const proofRecord = summarizePrivateCoreProofRecordFromSourcePublicInputs({
        action: "register-root",
        proofReceipt,
        sourcePublicInputs,
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
      assertPrivateCoreWitnessMaterialPolicy(body);
      const proofReceipt = await resolvePrivateCoreUnshieldProofReceipt(body);
      const releaseCandidateId = normalizePrivateCoreReleaseCandidateId(body?.releaseCandidateId);
      const sourcePublicInputs = getPrivateCoreUnshieldSourcePublicInputs(body);
      const sourceArtifacts = body?.sourceArtifacts;
      const nullifier = sourcePublicInputs?.nullifier;

      if (body?.proofArtifact) {
        throw new Error(
          "Private-core no-witness consume requires a validated owner authorization artifact; v0.1 does not implement that validator and fails closed for proof-artifact consumes.",
        );
      }

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

      assertPrivateCoreUnshieldSourceArtifactConsistency({ body, sourceArtifacts, sourcePublicInputs });
      const proofRecord = summarizePrivateCoreProofRecordFromSourcePublicInputs({
        action: "consume",
        proofReceipt,
        sourcePublicInputs,
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
        releaseCandidateId,
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
        releaseCandidateId,
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
          releaseCandidateId,
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
      const parsedMinOutputAmount = Number(intent.minOutputAmount);
      const parsedOutputAmount = Number(intent.outputAmount);

      if (
        intent.owner !== intent.requester ||
        intent.mintAddress !== mintAddress ||
        intent.vaultOwner !== vaultOwner ||
        intent.inputAsset !== "USDC" ||
        intent.outputAsset !== "SOL" ||
        !Number.isFinite(parsedInputAmount) ||
        parsedInputAmount <= 0 ||
        !Number.isFinite(parsedMinOutputAmount) ||
        parsedMinOutputAmount <= 0 ||
        !Number.isFinite(parsedOutputAmount) ||
        parsedOutputAmount <= 0 ||
        parsedOutputAmount < parsedMinOutputAmount
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
        intent.slippageBps !== latestVenueQuote.slippageBps ||
        intent.venueName !== latestVenueQuote.venueName ||
        intent.venueFamily !== latestVenueQuote.venueFamily ||
        intent.venueNetwork !== latestVenueQuote.venueNetwork ||
        intent.venuePoolAddress !== latestVenueQuote.poolAddress
      ) {
        throw new Error("Meteora venue context no longer matches the constrained swap lane.");
      }

      if (Number(latestVenueQuote.outputAmount) < parsedMinOutputAmount) {
        throw new Error("Meteora quote output is below the wallet-authorized minimum output amount.");
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
          minOutputAmount: intent.minOutputAmount,
          mintAddress,
          outputAmount: intent.outputAmount,
          outputNoteId: intent.outputNoteId,
          owner: intent.owner,
          quoteExpiresAt: intent.quoteExpiresAt,
          quoteId: intent.quoteId,
          quoteTimestamp: intent.quoteTimestamp,
          slippageBps: intent.slippageBps,
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
        inputAsset: "USDC",
        mintAddress,
        minOutputAmount: intent.minOutputAmount,
        outputAmount: intent.outputAmount,
        outputAsset: "SOL",
        outputNoteId: intent.outputNoteId,
        owner: intent.owner,
        quoteExpiresAt: intent.quoteExpiresAt,
        quoteId: intent.quoteId,
        quoteTimestamp: intent.quoteTimestamp,
        requestId: intent.requestId,
        slippageBps: intent.slippageBps,
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

      const releaseReceipt = buildTagUnshieldProgramReleaseReceipt({
        asset: "SOL",
        consumedNoteId: intent.consumedNoteId,
        intent,
        programTxSignature: null,
        transitionNoteId: intent.transitionNoteId,
      });

      writeCorsHeaders(response);
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          blocked: true,
          consumedNoteId: intent.consumedNoteId,
          reason:
            "TAG_UNSHIELD program relay is fail-closed until on-chain proof/root/nullifier verification is wired.",
          releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
          releaseReceipt,
          requestId: intent.requestId,
          signature: null,
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
      !supportedTokenMintAddresses.has(intent.mintAddress) ||
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

    const releaseReceipt = buildTagUnshieldProgramReleaseReceipt({
      asset: "SPL",
      consumedNoteId: intent.noteId,
      intent,
      programTxSignature: null,
      transitionNoteId: intent.transitionNoteId,
    });

    writeCorsHeaders(response);
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        blocked: true,
        consumedNoteId: intent.noteId,
        reason:
          "TAG_UNSHIELD program relay is fail-closed until on-chain proof/root/nullifier verification is wired.",
        releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
        releaseReceipt,
        noteId: intent.noteId,
        requestId: intent.requestId,
        signature: null,
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
}

function buildTagUnshieldProgramReleaseReceipt(args) {
  const proofStatus = "program-tag-unshield-relay-fail-closed";
  const intentHash = hashReleaseIntent(args.intent);
  const programTxSignature = args.programTxSignature;

  return {
    kind: "vanta-unshield-program-release-receipt-v1",
    requestId: args.intent.requestId,
    consumedNoteId: args.consumedNoteId,
    transitionNoteId: args.transitionNoteId,
    asset: args.asset,
    programInstructionTag: "TAG_UNSHIELD",
    programTxSignature,
    releaseSignature: programTxSignature,
    releaseIntentHash: intentHash,
    releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
    proofStatus,
    replayStatus: "not-consumed-no-program-tx",
    spendabilityBasis: "pending-onchain-root-proof-nullifier-verification",
  };
}

function hashReleaseIntent(intent) {
  const publicIntent = {
    amount: intent.amount,
    asset: intent.asset ?? "token",
    assetId: intent.assetId ?? intent.mintAddress,
    consumedNoteId: intent.consumedNoteId ?? intent.noteId,
    destinationOwner: intent.destinationOwner,
    issuedAt: intent.issuedAt,
    owner: intent.owner,
    requestId: intent.requestId,
    requester: intent.requester,
    transitionNoteId: intent.transitionNoteId,
    vaultOwner: intent.vaultOwner,
    version: intent.version,
  };

  return `sha256:${createHash("sha256")
    .update(JSON.stringify(publicIntent))
    .digest("hex")}`;
}

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
        minOutputAmount: args.minOutputAmount,
        outputAmount: args.outputAmount,
        outputNoteId: args.outputNoteId,
        owner: args.owner,
        quoteExpiresAt: args.quoteExpiresAt,
        quoteId: args.quoteId,
        quoteTimestamp: args.quoteTimestamp,
        slippageBps: args.slippageBps,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        payload.minOutputAmount === args.minOutputAmount &&
        payload.outputAmount === args.outputAmount &&
        payload.quoteId === args.quoteId &&
        payload.quoteTimestamp === args.quoteTimestamp &&
        payload.quoteExpiresAt === args.quoteExpiresAt &&
        payload.slippageBps === args.slippageBps &&
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
      minOutputAmount: parsed.minOutputAmount ?? parsed.mo,
      mintAddress: parsed.mintAddress ?? parsed.ma,
      noteId: parsed.noteId ?? parsed.ni,
      outputAmount: parsed.outputAmount ?? parsed.oa,
      outputNoteId: parsed.outputNoteId ?? parsed.on,
      owner: parsed.owner ?? parsed.ow,
      quoteExpiresAt: parsed.quoteExpiresAt ?? parsed.qe,
      quoteId: parsed.quoteId ?? parsed.qi,
      quoteTimestamp: parsed.quoteTimestamp ?? parsed.qt,
      slippageBps: parsed.slippageBps ?? parsed.sb,
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

if (isDirectRun()) {
  const server = createServer(handleUnshieldOperatorRequest);

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
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

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
  const ownerAuthorizationRuntimeStatus = summarizePrivateCoreOwnerAuthorizationRuntimeStatus();
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
    ownerAuthorizationRuntimeStatus: ownerAuthorizationRuntimeStatus.status,
    ownerAuthorizationRuntimeNote: ownerAuthorizationRuntimeStatus.note,
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
    ownerAuthorizationRuntimeNote: ownerAuthorizationRuntimeStatus.note,
    ownerAuthorizationRuntimeStatus: ownerAuthorizationRuntimeStatus.status,
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
    ownerAuthorizationRuntimeStatus: summaryState.ownerAuthorizationRuntimeStatus,
    ownerAuthorizationRuntimeNote: summaryState.ownerAuthorizationRuntimeNote,
  };
}

function buildPrivateCoreShippingDecisionCheckState() {
  const decision = buildPrivateCoreShippingDecisionState();

  return {
    checkVersion: 1,
    checkKind: "ready-gated-narrow-private-core-zk-v1-shipping",
    decisionVersion: decision.decisionVersion,
    decisionKind: decision.decisionKind,
    decisionStatus: decision.decisionStatus,
    decisionNote: decision.decisionNote,
    decision,
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
    case "owner-authorization-runtime-blocked":
      return "Owner authorization blocked";
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

function buildPrivateCoreOperatorSnapshotCheckState(request) {
  const snapshot = buildPrivateCoreOperatorSnapshotState(request);
  const shippingDecision = snapshot.status.shippingDecision;

  return {
    operator: snapshot.operator,
    checkVersion: 1,
    checkKind: "ready-gated-contract-status-shipping-bundle",
    decisionVersion: shippingDecision.decisionVersion,
    decisionKind: shippingDecision.decisionKind,
    decisionStatus: shippingDecision.decisionStatus,
    decisionNote: shippingDecision.decisionNote,
    snapshot,
  };
}

function buildPrivateCoreOperatorStatusState(request) {
  const snapshot = buildPrivateCoreOperatorSnapshotState(request);
  const shippingArtifact = buildPrivateCoreShippingArtifactState(request);

  return {
    operator: snapshot.operator,
    statusVersion: 1,
    statusKind: "long-form-live-status",
    snapshotVersion: snapshot.snapshotVersion,
    snapshotKind: snapshot.snapshotKind,
    shippingArtifactVersion: shippingArtifact.artifactVersion,
    shippingArtifactKind: shippingArtifact.artifactKind,
    summary: snapshot.status.summary,
    shippingDecision: snapshot.status.shippingDecision,
  };
}

function buildPrivateCoreOperatorStatusCheckState(request) {
  const status = buildPrivateCoreOperatorStatusState(request);
  const shippingDecision = status.shippingDecision;

  return {
    operator: status.operator,
    checkVersion: 1,
    checkKind: "ready-gated-long-form-live-status",
    decisionVersion: shippingDecision.decisionVersion,
    decisionKind: shippingDecision.decisionKind,
    decisionStatus: shippingDecision.decisionStatus,
    decisionNote: shippingDecision.decisionNote,
    status,
  };
}

function buildPrivateCoreShippingArtifactState(request) {
  const snapshot = buildPrivateCoreOperatorSnapshotState(request);
  const shippingDecision = snapshot.status.shippingDecision;
  const summary = snapshot.status.summary;
  const releaseCandidateLineage = summarizePrivateCoreReleaseCandidateLineage({
    latestConsume: summary.latestConsume,
    latestRelease: summary.latestRelease,
    latestSend: summary.latestSend,
    shippingDecisionStatus: shippingDecision.decisionStatus,
  });

  return {
    operator: snapshot.operator,
    artifactVersion: 1,
    artifactKind: "shipping-decision-checked-snapshot-bundle",
    decisionVersion: shippingDecision.decisionVersion,
    decisionKind: shippingDecision.decisionKind,
    decisionStatus: shippingDecision.decisionStatus,
    decisionNote: shippingDecision.decisionNote,
    snapshotVersion: snapshot.snapshotVersion,
    snapshotKind: snapshot.snapshotKind,
    contractVersion: shippingDecision.contractVersion,
    summaryVersion: shippingDecision.summaryVersion,
    currentRoot: summary.currentRoot ?? null,
    currentRootRegistrationBasis: summary.currentRecord?.registrationBasis ?? null,
    currentRootProofId: summary.currentRecord?.proofId ?? null,
    latestProofId: summary.latestProof?.proofId ?? null,
    latestProofAction: summary.latestProof?.action ?? null,
    latestSendProofId: summary.latestSendProof?.proofId ?? null,
    latestSendLinkedProofId: summary.latestSendLinkedProof?.proofId ?? null,
    latestSendId: summary.latestSend?.sendId ?? null,
    latestSendRecordProofId: summary.latestSend?.proofId ?? null,
    latestSendResultingRoot: summary.latestSend?.resultingRoot ?? null,
    latestConsumeRecordProofId: summary.latestConsume?.proofId ?? null,
    latestConsumeLinkedProofId: summary.latestConsumeProof?.proofId ?? null,
    latestConsumeRoot: summary.latestConsume?.root ?? null,
    latestReleaseRecordProofId: summary.latestRelease?.proofId ?? null,
    latestReleaseLinkedProofId: summary.latestReleaseProof?.proofId ?? null,
    latestReleaseRequestId: summary.latestRelease?.requestId ?? null,
    latestReleaseRoot: summary.latestRelease?.root ?? null,
    latestReleaseDestination: summary.latestRelease?.releaseDestination ?? null,
    latestReleasedAssetId: summary.latestRelease?.releasedAssetId ?? null,
    latestReleasedAmount: summary.latestRelease?.releasedAmount ?? null,
    releaseCandidateId: releaseCandidateLineage.releaseCandidateId,
    releaseCandidateLineageStatus: releaseCandidateLineage.status,
    releaseCandidateLineageNote: releaseCandidateLineage.note,
    snapshot,
  };
}

function buildPrivateCoreShippingArtifactCheckState(request) {
  const artifact = buildPrivateCoreShippingArtifactState(request);

  return {
    operator: artifact.operator,
    checkVersion: 1,
    checkKind: "ready-gated-shipping-decision-checked-snapshot-bundle",
    decisionVersion: artifact.decisionVersion,
    decisionKind: artifact.decisionKind,
    decisionStatus: artifact.decisionStatus,
    decisionNote: artifact.decisionNote,
    artifact,
  };
}

function buildPrivateCoreReleaseCandidateState(request) {
  const artifact = buildPrivateCoreShippingArtifactState(request);

  return {
    operator: artifact.operator,
    candidateVersion: 1,
    candidateKind: "private-core-send-consume-release-candidate",
    decisionVersion: artifact.decisionVersion,
    decisionKind: artifact.decisionKind,
    decisionStatus: artifact.decisionStatus,
    decisionNote: artifact.decisionNote,
    contractVersion: artifact.contractVersion,
    summaryVersion: artifact.summaryVersion,
    artifactVersion: artifact.artifactVersion,
    artifactKind: artifact.artifactKind,
    releaseCandidateId: artifact.releaseCandidateId,
    lineageStatus: artifact.releaseCandidateLineageStatus,
    lineageNote: artifact.releaseCandidateLineageNote,
    sendId: artifact.latestSendId,
    sendProofId: artifact.latestSendProofId,
    sendLinkedProofId: artifact.latestSendLinkedProofId,
    sendRecordProofId: artifact.latestSendRecordProofId,
    sendResultingRoot: artifact.latestSendResultingRoot,
    consumeRecordProofId: artifact.latestConsumeRecordProofId,
    consumeLinkedProofId: artifact.latestConsumeLinkedProofId,
    consumeRoot: artifact.latestConsumeRoot,
    releaseRecordProofId: artifact.latestReleaseRecordProofId,
    releaseLinkedProofId: artifact.latestReleaseLinkedProofId,
    releaseRequestId: artifact.latestReleaseRequestId,
    releaseRoot: artifact.latestReleaseRoot,
    releaseDestination: artifact.latestReleaseDestination,
    releasedAssetId: artifact.latestReleasedAssetId,
    releasedAmount: artifact.latestReleasedAmount,
    snapshotVersion: artifact.snapshotVersion,
    snapshotKind: artifact.snapshotKind,
  };
}

function buildPrivateCoreReleaseCandidateCheckState(request) {
  const candidate = buildPrivateCoreReleaseCandidateState(request);
  const decisionStatus =
    candidate.decisionStatus === "ready-to-ship" && candidate.lineageStatus === "ready"
      ? "ready"
      : "blocked";
  const decisionNote =
    decisionStatus === "ready"
      ? "Exact private-core release candidate is ready for the frozen narrow zk v1 lane."
      : candidate.lineageStatus !== "ready"
        ? candidate.lineageNote
        : candidate.decisionNote;

  return {
    operator: candidate.operator,
    checkVersion: 1,
    checkKind: "ready-gated-private-core-release-candidate",
    decisionStatus,
    decisionNote,
    candidate,
  };
}

function buildPrivateCoreReleasePackageState(request) {
  const artifact = buildPrivateCoreShippingArtifactState(request);
  const candidate = buildPrivateCoreReleaseCandidateState(request);
  const packageStatus =
    artifact.decisionStatus === "ready-to-ship" && candidate.lineageStatus === "ready"
      ? "ready"
      : "blocked";
  const packageNote =
    packageStatus === "ready"
      ? "Primary exact private-core release package is ready for review and handoff."
      : candidate.lineageStatus !== "ready"
        ? candidate.lineageNote
        : artifact.decisionNote;

  return {
    operator: artifact.operator,
    packageVersion: 1,
    packageKind: "downloadable-exact-run-release-package",
    packageStatus,
    packageNote,
    decisionVersion: artifact.decisionVersion,
    decisionKind: artifact.decisionKind,
    decisionStatus: artifact.decisionStatus,
    decisionNote: artifact.decisionNote,
    artifactVersion: artifact.artifactVersion,
    artifactKind: artifact.artifactKind,
    candidateVersion: candidate.candidateVersion,
    candidateKind: candidate.candidateKind,
    releaseCandidateId: candidate.releaseCandidateId,
    releaseCandidateLineageStatus: candidate.lineageStatus,
    releaseCandidateLineageNote: candidate.lineageNote,
    contractVersion: artifact.contractVersion,
    summaryVersion: artifact.summaryVersion,
    snapshotVersion: artifact.snapshotVersion,
    snapshotKind: artifact.snapshotKind,
    summaryGenerated: artifact.snapshot?.shipping?.summaryGenerated ?? null,
    currentRoot: artifact.currentRoot,
    currentRootRegistrationBasis: artifact.currentRootRegistrationBasis,
    currentRootProofId: artifact.currentRootProofId,
    latestProofId: artifact.latestProofId,
    latestProofAction: artifact.latestProofAction,
    latestSendProofId: artifact.latestSendProofId,
    latestSendLinkedProofId: artifact.latestSendLinkedProofId,
    latestSendId: artifact.latestSendId,
    latestSendRecordProofId: artifact.latestSendRecordProofId,
    latestSendResultingRoot: artifact.latestSendResultingRoot,
    latestConsumeRecordProofId: artifact.latestConsumeRecordProofId,
    latestConsumeLinkedProofId: artifact.latestConsumeLinkedProofId,
    latestConsumeRoot: artifact.latestConsumeRoot,
    latestReleaseRecordProofId: artifact.latestReleaseRecordProofId,
    latestReleaseLinkedProofId: artifact.latestReleaseLinkedProofId,
    latestReleaseRequestId: artifact.latestReleaseRequestId,
    latestReleaseRoot: artifact.latestReleaseRoot,
    latestReleaseDestination: artifact.latestReleaseDestination,
    latestReleasedAssetId: artifact.latestReleasedAssetId,
    latestReleasedAmount: artifact.latestReleasedAmount,
    shippingArtifact: artifact,
    releaseCandidate: candidate,
  };
}

function buildPrivateCoreReleasePackageCheckState(request) {
  const releasePackage = buildPrivateCoreReleasePackageState(request);

  return {
    operator: releasePackage.operator,
    checkVersion: 1,
    checkKind: "ready-gated-downloadable-exact-run-release-package",
    decisionStatus: releasePackage.packageStatus,
    decisionNote: releasePackage.packageNote,
    releasePackage,
  };
}

function buildPrivateCoreContractState() {
  return {
    stateVersion: 1,
    contractVersion: PRIVATE_CORE_CONTRACT_VERSION,
    summaryVersion: PRIVATE_CORE_SUMMARY_VERSION,
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
    supportedShippingDecisionGateVersion: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_VERSION,
    supportedShippingDecisionGateKind: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_KIND,
    supportedShippingDecisionGateNote: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_NOTE,
    supportedShippingDecisionGateTransport:
      PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_TRANSPORT,
    supportedShippingDecisionGateEndpoint:
      PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_GATE_ENDPOINT,
    supportedShippingDecisionTransport: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_TRANSPORT,
    supportedShippingDecisionEndpoint: PRIVATE_CORE_SUPPORTED_SHIPPING_DECISION_ENDPOINT,
    supportedOperatorStatusVersion: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_VERSION,
    supportedOperatorStatusKind: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_KIND,
    supportedOperatorStatusNote: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_NOTE,
    supportedOperatorStatusGateVersion: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_VERSION,
    supportedOperatorStatusGateKind: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_KIND,
    supportedOperatorStatusGateNote: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_NOTE,
    supportedOperatorStatusGateTransport: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_TRANSPORT,
    supportedOperatorStatusGateEndpoint: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_GATE_ENDPOINT,
    supportedOperatorStatusTransport: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_TRANSPORT,
    supportedOperatorStatusEndpoint: PRIVATE_CORE_SUPPORTED_OPERATOR_STATUS_ENDPOINT,
    supportedOperatorSnapshotVersion: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_VERSION,
    supportedOperatorSnapshotKind: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_KIND,
    supportedOperatorSnapshotNote: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_NOTE,
    supportedOperatorSnapshotGateVersion: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_VERSION,
    supportedOperatorSnapshotGateKind: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_KIND,
    supportedOperatorSnapshotGateNote: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_NOTE,
    supportedOperatorSnapshotGateTransport:
      PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_TRANSPORT,
    supportedOperatorSnapshotGateEndpoint: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_GATE_ENDPOINT,
    supportedOperatorSnapshotTransport: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_TRANSPORT,
    supportedOperatorSnapshotEndpoint: PRIVATE_CORE_SUPPORTED_OPERATOR_SNAPSHOT_ENDPOINT,
    supportedShippingArtifactVersion: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_VERSION,
    supportedShippingArtifactKind: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_KIND,
    supportedShippingArtifactNote: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_NOTE,
    supportedShippingArtifactGateVersion: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_VERSION,
    supportedShippingArtifactGateKind: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_KIND,
    supportedShippingArtifactGateNote: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_NOTE,
    supportedShippingArtifactGateTransport:
      PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_TRANSPORT,
    supportedShippingArtifactGateEndpoint:
      PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_GATE_ENDPOINT,
    supportedShippingArtifactTransport: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_TRANSPORT,
    supportedShippingArtifactEndpoint: PRIVATE_CORE_SUPPORTED_SHIPPING_ARTIFACT_ENDPOINT,
    supportedReleaseCandidateVersion: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_VERSION,
    supportedReleaseCandidateKind: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_KIND,
    supportedReleaseCandidateNote: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_NOTE,
    supportedReleaseCandidateScope: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_SCOPE,
    supportedReleaseCandidateScopeNote: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_SCOPE_NOTE,
    supportedReleaseCandidateGateVersion: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_VERSION,
    supportedReleaseCandidateGateKind: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_KIND,
    supportedReleaseCandidateGateNote: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_NOTE,
    supportedReleaseCandidateGateTransport:
      PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_TRANSPORT,
    supportedReleaseCandidateGateEndpoint:
      PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_GATE_ENDPOINT,
    supportedReleaseCandidateTransport: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_TRANSPORT,
    supportedReleaseCandidateEndpoint: PRIVATE_CORE_SUPPORTED_RELEASE_CANDIDATE_ENDPOINT,
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
    supportedSendResultingRootBasisNote:
      PRIVATE_CORE_SUPPORTED_SEND_RESULTING_ROOT_BASIS_NOTE,
    supportedSendInputRootPolicy: PRIVATE_CORE_SUPPORTED_SEND_INPUT_ROOT_POLICY,
    supportedSendOutputRegistrationPolicy:
      PRIVATE_CORE_SUPPORTED_SEND_OUTPUT_REGISTRATION_POLICY,
    supportedSwapResultingRootBasis: PRIVATE_CORE_SUPPORTED_SWAP_RESULTING_ROOT_BASIS,
    supportedSwapInputRootPolicy: PRIVATE_CORE_SUPPORTED_SWAP_INPUT_ROOT_POLICY,
    supportedSwapOutputRegistrationPolicy:
      PRIVATE_CORE_SUPPORTED_SWAP_OUTPUT_REGISTRATION_POLICY,
    supportedPrivateCoreCircuitFamily: PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY,
    supportedPrivateCoreCircuitFamilyStatus: PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_STATUS,
    supportedPrivateCoreCircuitFamilyNewArchitectureStatus:
      PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_NEW_ARCHITECTURE_STATUS,
    supportedPrivateCoreCircuitFamilyNote: PRIVATE_CORE_SUPPORTED_CIRCUIT_FAMILY_NOTE,
    supportedPrivateCoreLegacyCircuits: PRIVATE_CORE_SUPPORTED_LEGACY_CIRCUITS,
    supportedPrivateCoreReplacementFamily: PRIVATE_CORE_SUPPORTED_REPLACEMENT_FAMILY,
    supportedRecipientModel: PRIVATE_CORE_SUPPORTED_RECIPIENT_MODEL,
    supportedReleaseDestinationModel: PRIVATE_CORE_SUPPORTED_RELEASE_DESTINATION_MODEL,
    supportedProofSystem: PRIVATE_CORE_SUPPORTED_PROOF_SYSTEM,
    operatorWitnessMode: PRIVATE_CORE_OPERATOR_WITNESS_MODE,
    operatorWitnessMaterialPolicy: PRIVATE_CORE_OPERATOR_WITNESS_MATERIAL_POLICY,
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
    "supportedShippingDecisionGateVersion",
    "supportedShippingDecisionGateKind",
    "supportedShippingDecisionGateNote",
    "supportedShippingDecisionGateTransport",
    "supportedShippingDecisionGateEndpoint",
    "supportedShippingDecisionTransport",
    "supportedShippingDecisionEndpoint",
    "supportedOperatorStatusVersion",
    "supportedOperatorStatusKind",
    "supportedOperatorStatusNote",
    "supportedOperatorStatusGateVersion",
    "supportedOperatorStatusGateKind",
    "supportedOperatorStatusGateNote",
    "supportedOperatorStatusTransport",
    "supportedOperatorStatusEndpoint",
    "supportedOperatorSnapshotVersion",
    "supportedOperatorSnapshotKind",
    "supportedOperatorSnapshotNote",
    "supportedOperatorSnapshotGateVersion",
    "supportedOperatorSnapshotGateKind",
    "supportedOperatorSnapshotGateNote",
    "supportedOperatorSnapshotGateTransport",
    "supportedOperatorSnapshotGateEndpoint",
    "supportedOperatorSnapshotTransport",
    "supportedOperatorSnapshotEndpoint",
    "supportedShippingArtifactVersion",
    "supportedShippingArtifactKind",
    "supportedShippingArtifactNote",
    "supportedShippingArtifactGateVersion",
    "supportedShippingArtifactGateKind",
    "supportedShippingArtifactGateNote",
    "supportedShippingArtifactGateTransport",
    "supportedShippingArtifactGateEndpoint",
    "supportedShippingArtifactTransport",
    "supportedShippingArtifactEndpoint",
    "supportedReleaseCandidateVersion",
    "supportedReleaseCandidateKind",
    "supportedReleaseCandidateNote",
    "supportedReleaseCandidateGateVersion",
    "supportedReleaseCandidateGateKind",
    "supportedReleaseCandidateGateNote",
    "supportedReleaseCandidateGateTransport",
    "supportedReleaseCandidateGateEndpoint",
    "supportedReleaseCandidateTransport",
    "supportedReleaseCandidateEndpoint",
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
    "supportedSendResultingRootBasisNote",
    "supportedSendInputRootPolicy",
    "supportedSendOutputRegistrationPolicy",
    "supportedSwapResultingRootBasis",
    "supportedSwapInputRootPolicy",
    "supportedSwapOutputRegistrationPolicy",
    "supportedPrivateCoreCircuitFamily",
    "supportedPrivateCoreCircuitFamilyStatus",
    "supportedPrivateCoreCircuitFamilyNewArchitectureStatus",
    "supportedPrivateCoreCircuitFamilyNote",
    "supportedPrivateCoreLegacyCircuits",
    "supportedPrivateCoreReplacementFamily",
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
    (field) => !contractMirrorValuesEqual(args.summaryState[field], args.contractState[field]),
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

function contractMirrorValuesEqual(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return left === right;
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

  if (args.ownerAuthorizationRuntimeStatus === "strict-no-witness-consume-blocked") {
    return {
      status: "owner-authorization-runtime-blocked",
      note: args.ownerAuthorizationRuntimeNote,
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

function summarizePrivateCoreOwnerAuthorizationRuntimeStatus() {
  if (PRIVATE_CORE_OPERATOR_WITNESS_MODE === "strict-no-witness") {
    return {
      status: "strict-no-witness-consume-blocked",
      note:
        "Strict no-witness mode rejects private witness material, and v0.1 does not yet implement a validated owner authorization artifact for proof-artifact consumes.",
    };
  }

  return {
    status: "local-prover-dev-witness-precheck",
    note:
      "Local prover development mode prechecks the owner secret off-circuit from witness material; this is not a production no-witness consume path.",
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
  return summarizePrivateCoreProofRecordFromSourcePublicInputs({
    action: args.action,
    proofReceipt: args.proofReceipt,
    sourcePublicInputs: witnessPackage.sourcePublicInputs,
  });
}

function summarizePrivateCoreProofRecordFromSourcePublicInputs(args) {
  const sourcePublicInputs = args.sourcePublicInputs;
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

function summarizePrivateCoreProofRecordFromVerifiedPublicInputs(args) {
  const verifiedPublicInputs = args.proofReceipt.verifiedPublicInputs;
  const completedAt = Date.now();

  return {
    action: args.action,
    assetId: null,
    amount: null,
    backend: args.proofReceipt.backend,
    circuit: args.proofReceipt.circuit,
    completedAt,
    noteVersion: verifiedPublicInputs.noteVersion,
    nullifier: verifiedPublicInputs.provingNullifier,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: [
      "private-core-proof",
      args.action,
      verifiedPublicInputs.provingNullifier,
      verifiedPublicInputs.provingStateRoot,
      String(completedAt),
    ].join(":"),
    proofVersion: args.proofReceipt.proofVersion,
    provingHashLane: args.proofReceipt.provingHashLane,
    publicInputCount: args.proofReceipt.publicInputCount,
    releaseDestination: null,
    root: verifiedPublicInputs.provingStateRoot,
    verified: args.proofReceipt.verified === true,
  };
}

function createUnshieldConsumedNoteReferenceHash(noteId) {
  return `sha256:${createHash("sha256")
    .update(`${VANTA_UNSHIELD_CONSUMED_NOTE_REFERENCE_HASH_DOMAIN}:${noteId}`)
    .digest("hex")}`;
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

function summarizePrivateCoreSendProofRecordFromVerifiedPublicInputs(args) {
  const verifiedPublicInputs = args.proofReceipt.verifiedPublicInputs;
  const completedAt = Date.now();

  return {
    action: args.action,
    assetId: null,
    amount: null,
    backend: args.proofReceipt.backend,
    circuit: args.proofReceipt.circuit,
    completedAt,
    noteVersion: verifiedPublicInputs.noteVersion,
    nullifier: verifiedPublicInputs.provingInputNullifier,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: [
      "private-core-send-proof",
      args.action,
      verifiedPublicInputs.provingInputNullifier,
      verifiedPublicInputs.provingStateRoot,
      String(completedAt),
    ].join(":"),
    proofVersion: args.proofReceipt.proofVersion,
    provingHashLane: args.proofReceipt.provingHashLane,
    publicInputCount: args.proofReceipt.publicInputCount,
    recipientCommitment: verifiedPublicInputs.provingRecipientCommitment,
    redactionBasis: "proof-artifact-public-inputs-only",
    releaseDestination: verifiedPublicInputs.provingRecipientCommitment,
    root: verifiedPublicInputs.provingStateRoot,
    sendEconomicTermsHash: verifiedPublicInputs.sendEconomicTermsHash,
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
    inputCommitment: typeof args.inputCommitment === "string" ? args.inputCommitment : "",
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
    releaseCandidateId:
      typeof args.releaseCandidateId === "string" && args.releaseCandidateId.length > 0
        ? args.releaseCandidateId
        : null,
    recipientCommitment: sourcePublicInputs.recipientCommitment,
    resultingRootBasis: "proof-linked-input-expected-root",
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

function summarizePrivateCoreSendRecordFromVerifiedPublicInputs(args) {
  const verifiedPublicInputs = args.proofReceipt.verifiedPublicInputs;
  const completedAt = Date.now();

  return {
    assetId: null,
    changeAmount: null,
    changeCommitment: normalizeZeroHexAsNull(verifiedPublicInputs.provingChangeCommitment),
    completedAt,
    inputNullifier: verifiedPublicInputs.provingInputNullifier,
    inputRoot: verifiedPublicInputs.provingStateRoot,
    noteVersion: verifiedPublicInputs.noteVersion,
    proofFieldCount: args.proofReceipt.proofFieldCount,
    proofId: args.proofRecord.proofId,
    publicInputCount: args.proofReceipt.publicInputCount,
    redactionBasis: "proof-artifact-public-inputs-only",
    releaseCandidateId:
      typeof args.releaseCandidateId === "string" && args.releaseCandidateId.length > 0
        ? args.releaseCandidateId
        : null,
    recipientCommitment: verifiedPublicInputs.provingRecipientCommitment,
    resultingRootBasis: "proof-linked-input-expected-root",
    resultingRoot: typeof args.resultingRoot === "string" ? args.resultingRoot : null,
    sendAmount: null,
    sendEconomicTermsHash: verifiedPublicInputs.sendEconomicTermsHash,
    sendId: [
      "private-core-send",
      verifiedPublicInputs.provingInputNullifier,
      verifiedPublicInputs.provingStateRoot,
      String(completedAt),
    ].join(":"),
  };
}

function summarizePrivateCoreReleaseCandidateLineage(args) {
  const releaseCandidateId =
    args.latestRelease?.releaseCandidateId ??
    args.latestConsume?.releaseCandidateId ??
    args.latestSend?.releaseCandidateId ??
    null;

  if (!releaseCandidateId) {
    return {
      note: "No private send release candidate is bound to the latest operator release path.",
      releaseCandidateId: null,
      status: "unavailable",
    };
  }

  if (args.latestSend?.releaseCandidateId !== releaseCandidateId) {
    return {
      note: "Latest operator send state does not match the release candidate bound to this release path.",
      releaseCandidateId,
      status: "send-mismatch",
    };
  }

  if (args.latestConsume?.releaseCandidateId !== releaseCandidateId) {
    return {
      note: "Latest operator consume state does not match the release candidate bound to this release path.",
      releaseCandidateId,
      status: "consume-mismatch",
    };
  }

  if (args.latestRelease?.releaseCandidateId !== releaseCandidateId) {
    return {
      note: "Latest operator release state does not match the release candidate bound to this release path.",
      releaseCandidateId,
      status: "release-mismatch",
    };
  }

  if (args.shippingDecisionStatus === "ready-to-ship") {
    return {
      note: "Exact narrow private-core release candidate is coherent across send, consume, release, and shipping decision state.",
      releaseCandidateId,
      status: "ready",
    };
  }

  return {
    note: "Exact narrow private-core release candidate is coherent, but the shipping decision is still blocked on the current operator state.",
    releaseCandidateId,
    status: "blocked",
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

function normalizePrivateCoreReleaseCandidateId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Private-core release candidate id must be a string when provided.");
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 256) {
    throw new Error("Private-core release candidate id is too long.");
  }

  return normalized;
}

function parsePositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }

  return parsed;
}

function clusterEnv(suffix) {
  const envName = clusterEnvName(suffix);
  const value = envName ? process.env[envName]?.trim() : undefined;

  return value ? value : undefined;
}

function nonEmptyEnv(envName) {
  const value = process.env[envName]?.trim();

  return value ? value : undefined;
}

function clusterEnvName(suffix) {
  const clusterPrefix = isMainnetCluster ? "MAINNET" : "MAINNET";
  const candidates = [
    `VANTA_${clusterPrefix}_${suffix}`,
    `VITE_VANTA_${clusterPrefix}_${suffix}`,
    `VANTA_MAINNET_${suffix}`,
    `VITE_VANTA_MAINNET_${suffix}`,
  ];

  return candidates.find((key) => process.env[key] !== undefined && process.env[key] !== "") ?? candidates[0];
}

async function readJsonBody(request) {
  const contentType = request.headers["content-type"];
  if (contentType && !String(contentType).toLowerCase().includes("application/json")) {
    throw new Error("Expected application/json request body.");
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.byteLength;
    if (size > MAX_JSON_BODY_BYTES) {
      throw new Error("JSON request body is too large.");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

function assertPrivateCoreWitnessMaterialPolicy(body, options = {}) {
  if (PRIVATE_CORE_OPERATOR_WITNESS_MODE !== "strict-no-witness") {
    return;
  }

  if (!body || typeof body !== "object") {
    return;
  }

  if (Object.hasOwn(body, "witnessPackage")) {
    throw new Error(
      "Private-core strict no-witness operator mode rejects any witnessPackage material.",
    );
  }

  if (Object.hasOwn(body, "privateWitness") || Object.hasOwn(body, "noirWitnessPackage")) {
    throw new Error(
      "Private-core strict no-witness operator mode rejects raw private witness sidecars.",
    );
  }

  if (Object.hasOwn(body, "sourcePublicInputs")) {
    throw new Error(
      "Private-core strict no-witness operator mode rejects top-level sourcePublicInputs sidecars.",
    );
  }

  if (options.lane === "send" && Object.hasOwn(body, "sourceArtifacts")) {
    throw new Error(
      "Private-core strict no-witness Send mode rejects sourceArtifacts sidecars.",
    );
  }
}

async function resolvePrivateCoreUnshieldProofReceipt(body) {
  if (body?.proofArtifact) {
    return verifyVantaPrivateCoreUnshieldProofArtifact({
      proofArtifact: body.proofArtifact,
    });
  }

  return proveAndVerifyVantaPrivateCoreUnshield({
    witnessPackage: body?.witnessPackage,
  });
}

async function resolvePrivateCoreSendProofReceipt(body) {
  if (body?.proofArtifact) {
    return verifyVantaPrivateCoreSendProofArtifact({
      proofArtifact: body.proofArtifact,
    });
  }

  return proveAndVerifyVantaPrivateCoreSend({
    witnessPackage: body?.witnessPackage,
  });
}

function getPrivateCoreUnshieldSourcePublicInputs(body) {
  if (body?.proofArtifact) {
    return normalizeVantaPrivateCoreUnshieldProofArtifact(body.proofArtifact).sourcePublicInputs;
  }

  return normalizeVantaPrivateCoreWitnessPackage(body?.witnessPackage).sourcePublicInputs;
}

function getPrivateCoreSendProofTerms(body, proofReceipt) {
  if (body?.proofArtifact) {
    normalizeVantaPrivateCoreSendProofArtifact(body.proofArtifact);
    const verifiedPublicInputs = proofReceipt.verifiedPublicInputs;
    return {
      changeCommitment: normalizeZeroHexAsNull(verifiedPublicInputs.provingChangeCommitment),
      inputNullifier: verifiedPublicInputs.provingInputNullifier,
      inputRoot: verifiedPublicInputs.provingStateRoot,
      mode: "proof-artifact",
      noteVersion: verifiedPublicInputs.noteVersion,
      recipientCommitment: verifiedPublicInputs.provingRecipientCommitment,
      sendEconomicTermsHash: verifiedPublicInputs.sendEconomicTermsHash,
    };
  }

  const witnessPackage = normalizeVantaPrivateCoreSendWitnessPackage(body?.witnessPackage);
  const sourcePublicInputs = witnessPackage.sourcePublicInputs;

  return {
    changeCommitment: sourcePublicInputs.changeCommitment,
    inputArtifacts: deriveVantaPrivateCoreSendInputArtifactsFromWitnessPackage(witnessPackage),
    inputNullifier: sourcePublicInputs.inputNullifier,
    inputRoot: sourcePublicInputs.stateRoot,
    mode: "witness-package",
    noteVersion: sourcePublicInputs.noteVersion,
    recipientCommitment: sourcePublicInputs.recipientCommitment,
    sourcePublicInputs,
    witnessPackage,
  };
}

function assertPrivateCoreUnshieldSourceArtifactConsistency(args) {
  if (args.body?.proofArtifact) {
    const proofArtifact = normalizeVantaPrivateCoreUnshieldProofArtifact(args.body.proofArtifact);
    assertVantaPrivateCoreSourceArtifactShapeConsistency(
      args.sourceArtifacts,
      args.sourcePublicInputs,
      proofArtifact,
    );
    return;
  }

  assertVantaPrivateCoreSourceArtifactConsistency(args.sourceArtifacts, args.body?.witnessPackage);
}

function normalizeZeroHexAsNull(value) {
  const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";
  return value === zero ? null : value;
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

function evaluateSolUnshieldLaneHealth() {
  const checks = [];

  checks.push({ check: "rpc-endpoint", ready: Boolean(endpoint) });
  checks.push({ check: "token-mint", ready: Boolean(mintAddress) });
  checks.push({ check: "vault-owner", ready: Boolean(vaultOwner) });
  checks.push({
    check: "tag-unshield-program-relay",
    ready: false,
  });

  const ready = checks.every((check) => check.ready);

  return {
    checks,
    endpoint: "/unshield/sol",
    kind: "vanta-sol-unshield-operator-health",
    note:
      "SOL unshield operator endpoint is reachable, but direct keypair release is removed and TAG_UNSHIELD relay remains fail-closed until verifier/root/nullifier wiring is real.",
    ready,
    releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
    signerAddress: null,
    status: ready ? "ready" : "blocked",
    version: "vanta-sol-unshield-operator-health-0.2",
  };
}
