import { strict as assert } from "node:assert";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/transaction.evidence.json");
const packagePath = resolve(repoRoot, "package.json");
const unshieldPagePath = resolve(repoRoot, "src/pages/UnshieldPage.tsx");
const transactionEvidencePath = resolve(repoRoot, "src/transactions/vantaTransactionEvidence.ts");
const writerPath = resolve(repoRoot, "scripts/write-vanta-transaction-evidence.mjs");

assert.ok(existsSync(evidencePath), "Missing ops/mainnet/transaction.evidence.json.");
assert.ok(existsSync(transactionEvidencePath), "Missing src/transactions/vantaTransactionEvidence.ts.");
assert.ok(existsSync(writerPath), "Missing scripts/write-vanta-transaction-evidence.mjs.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const unshieldPage = readFileSync(unshieldPagePath, "utf8");
const transactionEvidenceSource = readFileSync(transactionEvidencePath, "utf8");

assert.equal(evidence.version, "vanta-transaction-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.realFundsMoved, false);
assert.equal(evidence.productionSettlementClaimAllowed, false);
assert.equal(evidence.canonicalCheckRef, "npm run mainnet:transaction-evidence-check");
assert.equal(evidence.packetKind, "point-in-time-transaction-evidence");
assert.equal(evidence.generatedBy, "scripts/write-vanta-transaction-evidence.mjs");
assert.equal(evidence.pointInTime, true);
assert.ok(Date.parse(evidence.checkedAt), "Transaction evidence must include a parseable checkedAt timestamp.");
assert.ok(
  String(evidence.evidencePacketId).startsWith("tx-evidence-"),
  "Transaction evidence must include a point-in-time evidence packet id.",
);
assert.equal(evidence.firstAdoptedFlow, "unshield");
assert.equal(evidence.truthBoundary, "evidence-describes-current-implementation-not-production-settlement");

const flowIds = evidence.flows.map((flow) => flow.flow);
assert.deepEqual(flowIds, ["shield", "send", "swap", "unshield", "pay"]);

const unshield = evidence.flows.find((flow) => flow.flow === "unshield");
assert.ok(unshield, "Transaction evidence must include Unshield as the first adopted flow.");
assert.equal(unshield.scope, "local-operator-harness");
assert.ok(Date.parse(unshield.observedAt), "Unshield transaction evidence must include observedAt.");
assert.equal(unshield.wallet.status, "not-required-for-local-proof-record");
assert.equal(unshield.wallet.signature, null);
assert.equal(unshield.wallet.slot, null);
assert.equal(unshield.proof.status, "verified");
assert.equal(unshield.proof.lane, "poseidon-bn254-proving-lane-v0");
assert.equal(unshield.proof.noteCommitmentBound, true);
assert.equal(unshield.proof.nullifierBound, true);
assert.equal(unshield.proof.rootBound, true);
assert.equal(unshield.operator.status, "pending-or-recorded");
assert.equal(unshield.operator.releaseRecordKind, "proof-backed-release-record");
assert.equal(unshield.operatorTrace.source, "artifact-fallback");
assert.equal(unshield.operatorTrace.proofId, null);
assert.equal(unshield.operatorTrace.releaseRequestId, null);
assert.equal(unshield.operatorTrace.redactedOperatorReceipt, null);
assert.equal(unshield.operatorTrace.transitionSignature, null);
assert.equal(unshield.operatorTrace.confirmationStatus, null);
assert.equal(unshield.settlement.status, "not-live-mainnet-settlement");
assert.equal(unshield.settlement.liveMainnetFundsMoved, false);
assert.ok(
  unshield.reviewNotes.some((note) => note.includes("owner authorization remains off-circuit")),
  "Unshield evidence must preserve owner-auth limitation.",
);

for (const flow of evidence.flows.filter((candidate) => candidate.flow !== "unshield")) {
  assert.ok(
    ["preview", "mainnet-wallet-tx", "local-operator-harness"].includes(flow.scope),
    `${flow.flow} must use a bounded evidence scope.`,
  );
  assert.notEqual(flow.settlement?.status, "live-mainnet-settlement-complete", `${flow.flow} must not overclaim settlement.`);
}

const serialized = JSON.stringify(evidence);
for (const forbidden of [
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
]) {
  assert.ok(!serialized.includes(forbidden), `Transaction evidence must not contain ${forbidden}.`);
}

assert.ok(
  transactionEvidenceSource.includes("VANTA_TRANSACTION_EVIDENCE_VERSION"),
  "Transaction evidence module must export a version constant.",
);
assert.ok(
  transactionEvidenceSource.includes("createUnshieldTransactionEvidence"),
  "Transaction evidence module must expose an Unshield builder.",
);
assert.ok(
  transactionEvidenceSource.includes("createTransactionEvidencePacket"),
  "Transaction evidence module must expose a point-in-time packet builder.",
);
assert.ok(
  unshieldPage.includes("createUnshieldTransactionEvidence"),
  "Unshield page must use the shared transaction evidence builder.",
);
assert.ok(
  unshieldPage.includes("Transaction evidence"),
  "Unshield page must label the transaction evidence surface.",
);
assert.equal(
  packageJson.scripts["mainnet:transaction-evidence-check"],
  "node scripts/check-vanta-transaction-evidence.mjs",
  "package.json must expose mainnet:transaction-evidence-check.",
);
assert.equal(
  packageJson.scripts["mainnet:transaction-evidence-preview"],
  "node scripts/write-vanta-transaction-evidence.mjs --dry-run",
  "package.json must expose mainnet:transaction-evidence-preview.",
);
assert.equal(
  packageJson.scripts["mainnet:transaction-evidence-write"],
  "node scripts/write-vanta-transaction-evidence.mjs --write",
  "package.json must expose mainnet:transaction-evidence-write.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:transaction-evidence-check"),
  "mainnet:preflight must include mainnet:transaction-evidence-check.",
);

const tempRoot = mkdtempSync(resolve(tmpdir(), "vanta-transaction-evidence-check-"));
let mockOperatorServer = null;
let mockRpcServer = null;
try {
  const proofStorePath = resolve(tempRoot, "private-core-proofs.json");
  const releaseStorePath = resolve(tempRoot, "private-core-releases.json");
  writeFileSync(
    proofStorePath,
    `${JSON.stringify(
      {
        proofs: {
          "proof:test-live-operator-capture": {
            action: "consume",
            assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            amount: "42000000",
            backend: "bb.js",
            circuit: "vanta_private_core_single_note_unshield",
            completedAt: 1777050100000,
            noteVersion: 0,
            nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
            proofFieldCount: 500,
            proofId: "proof:test-live-operator-capture",
            proofVersion: 1,
            provingHashLane: "poseidon-bn254-proving-lane-v0",
            publicInputCount: 10,
            releaseDestination:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            root: "0x2222222222222222222222222222222222222222222222222222222222222222",
            verified: true,
          },
        },
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    releaseStorePath,
    `${JSON.stringify(
      {
        consumedNoteIds: {},
        requestIds: {
          "release:test-live-operator-capture": {
            amount: "42000000",
            assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            authorizationBasis: "proof-backed-consume",
            completedAt: 1777050101000,
            consumedNoteId: "note:test-consumed",
            nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
            proofFieldCount: 500,
            proofId: "proof:test-live-operator-capture",
            publicInputCount: 10,
            releaseCandidateId: "candidate:test-live-operator-capture",
            releaseDestination:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            releasedAmount: "42000000",
            releasedAssetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            requestId: "release:test-live-operator-capture",
            root: "0x2222222222222222222222222222222222222222222222222222222222222222",
            rootPolicy: "latest-registered-root",
            transitionNoteId: "note:test-transition",
          },
        },
        transitionNoteIds: {},
        version: 1,
      },
      null,
      2,
    )}\n`,
  );

  mockOperatorServer = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/state/private-core-status") {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        statusVersion: 1,
        statusKind: "long-form-live-status",
        summary: {
          latestProof: {
            action: "consume",
            assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            amount: "42000000",
            backend: "bb.js",
            circuit: "vanta_private_core_single_note_unshield",
            completedAt: 1777050100000,
            noteVersion: 0,
            nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
            proofFieldCount: 500,
            proofId: "proof:test-live-http-capture",
            proofVersion: 1,
            provingHashLane: "poseidon-bn254-proving-lane-v0",
            publicInputCount: 10,
            releaseDestination:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            root: "0x2222222222222222222222222222222222222222222222222222222222222222",
            verified: true,
          },
          latestRelease: {
            amount: "42000000",
            assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            authorizationBasis: "proof-backed-consume",
            completedAt: 1777050101000,
            consumedNoteId: "note:test-consumed",
            nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
            proofFieldCount: 500,
            proofId: "proof:test-live-http-capture",
            publicInputCount: 10,
            releaseCandidateId: "candidate:test-live-http-capture",
            releaseDestination:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            releasedAmount: "42000000",
            releasedAssetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            requestId: "release:test-live-http-capture",
            root: "0x2222222222222222222222222222222222222222222222222222222222222222",
            rootPolicy: "latest-registered-root",
            transitionNoteId: "note:test-transition",
          },
          latestReleaseProof: {
            action: "consume",
            assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            amount: "42000000",
            backend: "bb.js",
            circuit: "vanta_private_core_single_note_unshield",
            completedAt: 1777050100000,
            noteVersion: 0,
            nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
            proofFieldCount: 500,
            proofId: "proof:test-live-http-capture",
            proofVersion: 1,
            provingHashLane: "poseidon-bn254-proving-lane-v0",
            publicInputCount: 10,
            releaseDestination:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            root: "0x2222222222222222222222222222222222222222222222222222222222222222",
            verified: true,
          },
        },
      }),
    );
  });
  await new Promise((resolvePromise) => mockOperatorServer.listen(0, "127.0.0.1", resolvePromise));
  const mockOperatorPort = mockOperatorServer.address().port;
  mockRpcServer = createServer((request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      const parsed = JSON.parse(body);
      assert.equal(parsed.method, "getSignatureStatuses");
      assert.deepEqual(parsed.params?.[0], ["sig:test-transition-confirmed"]);

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: parsed.id,
          result: {
            value: [
              {
                confirmationStatus: "finalized",
                confirmations: null,
                err: null,
                slot: 123456,
              },
            ],
          },
        }),
      );
    });
  });
  await new Promise((resolvePromise) => mockRpcServer.listen(0, "127.0.0.1", resolvePromise));
  const mockRpcPort = mockRpcServer.address().port;

  const { stdout: writerOutput } = await execFileAsync(
    process.execPath,
    [
      writerPath,
      "--dry-run",
      "--checked-at",
      "2026-04-24T14:00:00.000Z",
      "--print-packet",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        SOLANA_RPC_URL: `http://127.0.0.1:${mockRpcPort}`,
        VANTA_PRIVATE_CORE_OPERATOR_BASE_URL: `http://127.0.0.1:${mockOperatorPort}`,
        VANTA_PRIVATE_CORE_PROOF_STORE_PATH: proofStorePath,
        VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: releaseStorePath,
        VANTA_TRANSACTION_EVIDENCE_UNSHIELD_SIGNATURE: "sig:test-transition-confirmed",
      },
    },
  );
  const capturedPacket = JSON.parse(writerOutput);
  const capturedUnshield = capturedPacket.flows.find((flow) => flow.flow === "unshield");
  assert.equal(capturedUnshield.proof.proofId, "proof:test-live-http-capture");
  assert.equal(capturedUnshield.operator.requestId, "release:test-live-http-capture");
  assert.equal(capturedUnshield.operatorTrace.source, "live-private-core-operator-summary");
  assert.equal(capturedUnshield.operatorTrace.proofId, "proof:test-live-http-capture");
  assert.equal(capturedUnshield.operatorTrace.releaseRequestId, "release:test-live-http-capture");
  assert.equal(capturedUnshield.operatorTrace.redactedOperatorReceipt.kind, "redacted-private-core-release-receipt");
  assert.equal(capturedUnshield.operatorTrace.redactedOperatorReceipt.nullifierPrefix, "0x111111111111");
  assert.equal(capturedUnshield.operatorTrace.redactedOperatorReceipt.rootPrefix, "0x222222222222");
  assert.equal(capturedUnshield.operatorTrace.redactedOperatorReceipt.releaseDestinationPrefix, "0xbbbbbbbbbbbb");
  assert.equal(capturedUnshield.operatorTrace.redactedOperatorReceipt.releasedAmount, "42000000");
  assert.equal(capturedUnshield.wallet.status, "signature-recorded");
  assert.equal(capturedUnshield.wallet.signature, "sig:test-transition-confirmed");
  assert.equal(capturedUnshield.wallet.slot, 123456);
  assert.equal(capturedUnshield.wallet.confirmationStatus, "finalized");
  assert.equal(capturedUnshield.operatorTrace.transitionSignature, "sig:test-transition-confirmed");
  assert.equal(capturedUnshield.operatorTrace.confirmationStatus, "finalized");
  assert.equal(capturedUnshield.operatorTrace.confirmationDetails.status, "rpc-signature-finalized");
  assert.equal(capturedUnshield.operatorTrace.confirmationDetails.signatureStatusSource, "solana-rpc-getSignatureStatuses");
  assert.equal(capturedUnshield.operatorTrace.confirmationDetails.slot, 123456);
  assert.equal(capturedUnshield.operatorTrace.confirmationDetails.err, null);
  assert.equal(capturedUnshield.operatorTrace.confirmationDetails.liveMainnetFundsMoved, false);
  assert.ok(
    !JSON.stringify(capturedUnshield.operatorTrace).includes(
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    ),
    "Operator trace must redact full nullifiers.",
  );
} finally {
  if (mockOperatorServer) {
    await new Promise((resolvePromise) => mockOperatorServer.close(resolvePromise));
  }
  if (mockRpcServer) {
    await new Promise((resolvePromise) => mockRpcServer.close(resolvePromise));
  }
  rmSync(tempRoot, { force: true, recursive: true });
}

console.log("Vanta transaction evidence check: PASS");
