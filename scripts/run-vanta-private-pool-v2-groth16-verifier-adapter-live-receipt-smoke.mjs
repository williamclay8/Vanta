import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ed25519 } from "@noble/curves/ed25519.js";
import { Keypair } from "@solana/web3.js";

import {
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256,
} from "../src/privacy/privatePoolV2Groth16VerifierAdapter.mjs";
import { formatSolUnshieldIntentMessage } from "../operator/sol-unshield-auth.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const productionServicesManifestPath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-services.manifest.json",
);
const adapterEvidencePath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json",
);
const manifestPath = resolve(
  repoRoot,
  GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
  "manifest.json",
);
const liveSmokeEvidencePath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json",
);

const writeEvidence = process.argv.includes("--write-evidence");
const NATIVE_SOL_ASSET_ID_HEX =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const forbiddenEvidenceFragments = ["Bearer ", "privateKey", "seedPhrase", "mnemonic", "secretKey"];

function fail(message) {
  console.error(
    `Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke: FAIL - ${message}`,
  );
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function productionOperatorUrl() {
  const manifest = readJson(productionServicesManifestPath);
  const operator = manifest.services?.find((service) => service.id === "operator");
  const url = operator?.deployedService?.url?.trim();
  assert(typeof url === "string" && url.length > 0, "Missing production operator URL in services manifest.");
  return url.replace(/\/+$/, "");
}

function resolveOperatorUrl() {
  const override = process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim();
  const url = override || productionOperatorUrl();
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    fail("Operator URL must be a valid HTTP(S) URL.");
  }

  assert(["http:", "https:"].includes(parsed.protocol), "Operator URL must use HTTP(S).");
  assert(!parsed.username && !parsed.password, "Operator URL must not include credentials.");
  return url.replace(/\/+$/, "");
}

function expectedReceiptTruth() {
  const adapterEvidence = readJson(adapterEvidencePath);
  const manifest = readJson(manifestPath);

  assert(
    adapterEvidence.version === "vanta-private-pool-v2-groth16-verifier-adapter-artifact-evidence-0.1",
    "Groth16 adapter evidence version mismatch.",
  );
  assert(
    adapterEvidence.artifactRoot === GROTH16_VERIFIER_ADAPTER_DEFAULT_ARTIFACT_ROOT,
    "Groth16 adapter evidence artifactRoot mismatch.",
  );
  assert(
    adapterEvidence.expectedArtifactSha256.publicWitness ===
      GROTH16_VERIFIER_ADAPTER_H6_PROBE_REFERENCE_SHA256.publicWitness,
    "Groth16 adapter evidence public witness sha256 mismatch.",
  );

  return {
    artifactRoot: adapterEvidence.artifactRoot,
    gnarkProofSha256: adapterEvidence.expectedArtifactSha256.proof,
    gnarkProofSource: "groth16-verifier-adapter-artifact",
    gnarkPublicWitnessSha256: adapterEvidence.expectedArtifactSha256.publicWitness,
    groth16VerifierAdapterStatus: manifest.status,
    programRelayBindingSource: "groth16-verifier-adapter-artifact",
    releaseModel: "program-tag-unshield-pda-cpi-fail-closed",
  };
}

function buildSignedSolUnshieldBody() {
  const keypair = Keypair.generate();
  const owner = keypair.publicKey.toBase58();
  const requestId = `groth16-live-receipt-smoke-${randomUUID()}`;
  const consumedNoteId = `note-${randomUUID()}`;
  const transitionNoteId = `direct:${consumedNoteId}`;

  const payload = {
    amount: "1",
    asset: "SOL",
    assetId: NATIVE_SOL_ASSET_ID_HEX,
    consumedNoteId,
    destinationOwner: owner,
    issuedAt: Date.now(),
    owner,
    requestId,
    requester: owner,
    transitionNoteId,
    vaultOwner: owner,
    version: "v1",
  };

  const message = new TextEncoder().encode(formatSolUnshieldIntentMessage(payload));
  const signatureBytes = ed25519.sign(message, keypair.secretKey.slice(0, 32));

  return {
    body: {
      ...payload,
      signature: Buffer.from(signatureBytes).toString("base64"),
    },
    requestId,
  };
}

async function postSignedSolUnshield(operatorUrl, body) {
  const response = await fetch(`${operatorUrl}/unshield/sol`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const text = await response.text();
  let parsed = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  return {
    parsed,
    status: response.status,
    text,
  };
}

function assertLiveReceipt({ expected, operatorUrl, parsed, requestId, status }) {
  assert(status === 503, `Expected fail-closed 503, got HTTP ${status}.`);
  assert(parsed && typeof parsed === "object", "Live unshield response must be JSON.");
  assert(parsed.blocked === true, "Live unshield response must remain blocked.");
  assert(parsed.releaseModel === expected.releaseModel, "Live releaseModel mismatch.");
  assert(
    parsed.programRelayBindingSource === expected.programRelayBindingSource,
    `Live programRelayBindingSource mismatch: ${parsed.programRelayBindingSource ?? "null"}`,
  );

  const receipt = parsed.releaseReceipt;
  assert(receipt && typeof receipt === "object", "Live response must include releaseReceipt.");
  assert(
    receipt.groth16VerifierAdapterStatus === expected.groth16VerifierAdapterStatus,
    `Live groth16VerifierAdapterStatus mismatch: ${receipt.groth16VerifierAdapterStatus ?? "null"}`,
  );
  assert(
    receipt.groth16VerifierAdapterArtifactRoot === expected.artifactRoot,
    `Live groth16VerifierAdapterArtifactRoot mismatch: ${receipt.groth16VerifierAdapterArtifactRoot ?? "null"}`,
  );
  assert(
    receipt.gnarkProofSource === expected.gnarkProofSource,
    `Live gnarkProofSource mismatch: ${receipt.gnarkProofSource ?? "null"}`,
  );
  assert(
    receipt.gnarkProofSha256 === expected.gnarkProofSha256,
    `Live gnarkProofSha256 mismatch: ${receipt.gnarkProofSha256 ?? "null"}`,
  );
  assert(
    receipt.gnarkPublicWitnessSha256 === expected.gnarkPublicWitnessSha256,
    `Live gnarkPublicWitnessSha256 mismatch: ${receipt.gnarkPublicWitnessSha256 ?? "null"}`,
  );
  assert(receipt.gnarkUsesScaffoldProof === false, "Live gnarkUsesScaffoldProof must be false.");
  assert(
    parsed.requestId === requestId,
    "Live response requestId must echo the signed intent requestId.",
  );
}

async function run() {
  const operatorUrl = resolveOperatorUrl();
  const expected = expectedReceiptTruth();
  const { body, requestId } = buildSignedSolUnshieldBody();

  const health = await fetch(`${operatorUrl}/health`);
  assert(health.ok, `Operator health check failed with HTTP ${health.status}.`);

  const result = await postSignedSolUnshield(operatorUrl, body);
  assertLiveReceipt({
    expected,
    operatorUrl,
    parsed: result.parsed,
    requestId,
    status: result.status,
  });

  const evidence = {
    checkedAt: new Date().toISOString(),
    endpoint: "/unshield/sol",
    expectedReceiptFields: {
      gnarkProofSha256: expected.gnarkProofSha256,
      gnarkProofSource: expected.gnarkProofSource,
      gnarkPublicWitnessSha256: expected.gnarkPublicWitnessSha256,
      groth16VerifierAdapterArtifactRoot: expected.artifactRoot,
      groth16VerifierAdapterStatus: expected.groth16VerifierAdapterStatus,
      gnarkUsesScaffoldProof: false,
      programRelayBindingSource: expected.programRelayBindingSource,
      releaseModel: expected.releaseModel,
    },
    httpStatus: result.status,
    operatorUrlHost: new URL(operatorUrl).host,
    operatorUrlRef: process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_URL?.trim()
      ? "VANTA_PRIVATE_POOL_V2_OPERATOR_URL"
      : "ops/mainnet/private-pool-v2-services.manifest.json#operator",
    productionReady: false,
    purpose:
      "Live fail-closed /unshield/sol receipt smoke proving deployed operator surfaces Groth16 adapter relay truth instead of scaffold gnark bytes.",
    requestIdPrefix: requestId.slice(0, 32),
    secretPolicy: "hashes-and-status-only-no-wallet-signatures-or-auth-tokens",
    status: "live-fail-closed-receipt-smoke-pass-not-production",
    truthBoundary:
      "This smoke only proves deployed blocked unshield receipts expose in-repo local-unsafe Groth16 adapter relay bindings. It is not production verifier-adapter acceptance, SBF/live lineage, audit closure, or fund release.",
    version: "vanta-private-pool-v2-groth16-verifier-adapter-live-receipt-smoke-evidence-0.1",
  };

  const serializedEvidence = `${JSON.stringify(evidence, null, 2)}\n`;
  for (const forbidden of forbiddenEvidenceFragments) {
    assert(!serializedEvidence.includes(forbidden), `Live smoke evidence leaked ${forbidden}.`);
  }

  console.log(serializedEvidence);
  if (writeEvidence) {
    writeFileSync(liveSmokeEvidencePath, serializedEvidence);
    console.error(
      "Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke evidence: WROTE ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json",
    );
  }
  console.error("Vanta Private Pool v2 Groth16 verifier adapter live receipt smoke: PASS");
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
