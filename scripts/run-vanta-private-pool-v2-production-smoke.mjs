import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";

const services = [
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    healthEndpoint: "/health",
    id: "indexer",
    readinessEndpoint: "/v1/roots/latest?treeId=vanta-production-smoke-tree",
    urlEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    healthEndpoint: "/health",
    id: "prover",
    readinessEndpoint: "/v1/proofs/health",
    urlEnv: "VANTA_PRIVATE_POOL_V2_PROVER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    healthEndpoint: "/health",
    id: "relayer",
    readinessEndpoint: "/v1/claims/quote",
    urlEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    healthEndpoint: "/health",
    id: "verifier",
    readinessEndpoint: "/v1/proofs/accept",
    urlEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    healthEndpoint: "/health",
    id: "operator",
    readinessEndpoint: "/state/private-pool-v2-status",
    urlEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
  },
];

const requiredEnv = services.flatMap((service) => [service.urlEnv, service.authTokenEnv]);
const forbiddenEvidenceFragments = ["Bearer ", "DATABASE_URL=", "privateKey", "seedPhrase", "mnemonic"];

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required production smoke environment variable ${name}.`);
  }
  return value;
}

function readRequiredServiceUrl(name) {
  const value = readRequiredEnv(name);
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an HTTPS Render service URL, not a database URL or secret ref.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must be an HTTP(S) service URL. Check that it is not set to a Postgres DATABASE_URL.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${name} must not include credentials. Use the public Render service URL and put auth in the matching _AUTH_TOKEN env var.`);
  }

  return value.replace(/\/+$/, "");
}

function serviceConfig() {
  return new Map(
    services.map((service) => [
      service.id,
      {
        ...service,
        authToken: readRequiredEnv(service.authTokenEnv),
        url: readRequiredServiceUrl(service.urlEnv),
      },
    ]),
  );
}

function urlFor(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function requestJson(service, path, { body, method = "GET", token = service.authToken } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(urlFor(service.url, path), {
    body,
    headers,
    method,
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
    ok: response.ok,
    parsed,
    status: response.status,
    statusText: response.statusText,
    text,
  };
}

function assertOk(result, message) {
  assert.ok(result.ok, `${message} HTTP ${result.status}: ${result.text || result.statusText}`);
  assert.ok(result.parsed, `${message} should return JSON.`);
  return result.parsed;
}

function assertExpectedRole(payload, service) {
  const expectedRole = service.id === "operator" ? undefined : service.id;
  if (!expectedRole) {
    return;
  }

  assert.equal(
    payload.role,
    expectedRole,
    `${service.urlEnv} points at role ${payload.role ?? "unknown"}, expected ${expectedRole}. Check the ${service.id} service URL/token mapping.`,
  );
}

function summarizeServiceResult({ health, readiness, service }) {
  return {
    health: {
      ok: health.parsed?.ok === true,
      status: health.status,
    },
    id: service.id,
    readiness: {
      ok: readiness.parsed?.ok === true,
      productionReady: readiness.parsed?.productionReady ?? false,
      status: readiness.status,
    },
    urlRef: service.urlEnv,
  };
}

function buildShieldRequest(runId) {
  return {
    amountBaseUnits: "1000000",
    assetId: "USDC",
    intent: "shield",
    publicInputs: [
      "vanta-private-pool-v2-production-smoke:version",
      `run-id:${runId}`,
      "tree-id:vanta-production-smoke-tree",
      "target-asset:USDC",
      "leaf-index:0",
      `output-root:production-smoke-root:${runId}`,
      `output-commitment:field:production-smoke-output-commitment:${runId}`,
    ],
  };
}

function buildClaimRequest(runId, quote) {
  return {
    amountBaseUnits: "1000000",
    assetId: "USDC",
    intent: "claim",
    publicInputs: [
      "vanta-private-pool-v2-production-smoke:version",
      `run-id:${runId}`,
      "asset-id:USDC",
      `nullifier:production-smoke-nullifier:${runId}`,
      "source-root:production-smoke-root",
      "destination:production-smoke-destination",
      `quote-id:${quote.relayerId}`,
    ],
  };
}

async function proveAndAccept({ prover, request, verifier }) {
  const proofResponse = await requestJson(prover, "/v1/proofs", {
    body: JSON.stringify({ request }),
    method: "POST",
  });
  const proof = assertOk(proofResponse, `${prover.id} proof creation`);

  const verificationResponse = await requestJson(prover, "/v1/proofs/verify", {
    body: JSON.stringify({ proof, request }),
    method: "POST",
  });
  const verification = assertOk(verificationResponse, `${prover.id} proof verification`);
  assert.equal(verification.accepted, true, `${prover.id} should verify its proof before verifier acceptance.`);

  const receiptResponse = await requestJson(verifier, "/v1/proofs/accept", {
    body: JSON.stringify({ proof, request }),
    method: "POST",
  });
  const receipt = assertOk(receiptResponse, `${verifier.id} proof acceptance`);
  assert.equal(receipt.intent, request.intent, `Verifier receipt should record ${request.intent} intent.`);

  return { proof, receipt };
}

async function run() {
  const configs = serviceConfig();
  const runId = `prod-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const evidence = {
    checkedAt: new Date().toISOString(),
    mainnetReady: false,
    productionReady: false,
    realFundsAllowed: false,
    runId,
    services: [],
    smokeTargets: [],
    version: "vanta-private-pool-v2-production-smoke-evidence-0.1",
  };

  for (const service of configs.values()) {
    const health = await requestJson(service, service.healthEndpoint, { token: null });
    const healthPayload = assertOk(health, `${service.id} public health`);
    assertExpectedRole(healthPayload, service);

    const readiness = await requestJson(service, service.readinessEndpoint);
    const readinessPayload = assertOk(readiness, `${service.id} authenticated readiness`);
    assertExpectedRole(readinessPayload, service);
    assert.equal(readinessPayload.productionReady, false, `${service.id} must remain productionReady false.`);

    evidence.services.push(summarizeServiceResult({ health, readiness, service }));
  }
  evidence.smokeTargets.push({ id: "service-health", status: "pass" });
  evidence.smokeTargets.push({ id: "remote-runtime-readiness", status: "pass" });

  const prover = configs.get("prover");
  const relayer = configs.get("relayer");
  const verifier = configs.get("verifier");
  const operator = configs.get("operator");

  const shieldRequest = buildShieldRequest(runId);
  const shieldRoundtrip = await proveAndAccept({ prover, request: shieldRequest, verifier });
  evidence.smokeTargets.push({
    id: "proof-roundtrip-simulation",
    proofCommitmentPrefix: shieldRoundtrip.proof.publicInputCommitment.slice(0, 18),
    receiptIdPrefix: shieldRoundtrip.receipt.receiptId.slice(0, 18),
    status: "pass",
  });

  const quoteResponse = await requestJson(relayer, "/v1/claims/quote", {
    body: JSON.stringify({
      amountBaseUnits: "1000000",
      assetId: "USDC",
      destinationAddress: `production-smoke-destination:${runId}`,
    }),
    method: "POST",
  });
  const quote = assertOk(quoteResponse, "relayer claim quote");
  assert.ok(
    String(quote.relayerId ?? "").startsWith("vanta-service-relayer:"),
    "Relayer should return a deterministic service relayer id.",
  );

  const claimRequest = buildClaimRequest(runId, quote);
  const claimRoundtrip = await proveAndAccept({ prover, request: claimRequest, verifier });

  const replayResponse = await requestJson(verifier, "/v1/proofs/accept", {
    body: JSON.stringify({ proof: claimRoundtrip.proof, request: claimRequest }),
    method: "POST",
  });
  assert.equal(replayResponse.ok, false, "Duplicate claim proof must be rejected by verifier replay storage.");
  assert.ok(
    replayResponse.text.includes("already been accepted"),
    "Duplicate claim proof rejection should name already-accepted replay protection.",
  );
  evidence.smokeTargets.push({
    id: "nullifier-replay-simulation",
    receiptIdPrefix: claimRoundtrip.receipt.receiptId.slice(0, 18),
    replayStatus: replayResponse.status,
    status: "pass",
  });

  const submittedClaimResponse = await requestJson(relayer, "/v1/claims/submit", {
    body: JSON.stringify({
      quote,
      serializedTransaction: `serialized-production-smoke-claim:${runId}`,
    }),
    method: "POST",
  });
  const submittedClaim = assertOk(submittedClaimResponse, "relayer claim submission");
  evidence.smokeTargets.push({
    id: "relayer-claim-submit-simulation",
    signaturePrefix: String(submittedClaim.signature ?? "").slice(0, 18),
    status: "pass",
  });

  const operatorStatusResponse = await requestJson(operator, "/state/private-pool-v2-status");
  const operatorStatus = assertOk(operatorStatusResponse, "operator remote runtime status");
  assert.equal(operatorStatus.runtime?.mode, "remote-services", "Operator must run in remote-services mode.");
  assert.equal(
    operatorStatus.storage?.durableStoreConfigured,
    true,
    "Operator production smoke requires durable storage.",
  );

  const paySettlementResponse = await requestJson(operator, "/private-pool-v2/pay-settlements", {
    body: JSON.stringify({
      kind: "checkout",
      session: {
        amount: "12.50",
        clientToken: `vtok_production_smoke_${runId}`,
        currency: "USDC",
        id: `vcs_production_smoke_${runId}`,
        merchantId: "mrc_production_smoke",
      },
    }),
    method: "POST",
  });
  const paySettlement = assertOk(paySettlementResponse, "operator Pay settlement smoke");
  assert.ok(
    paySettlement.privateRailReceipt?.proofReceiptId?.startsWith("ppv2_"),
    "Operator Pay settlement should return a Private Pool v2 proof receipt.",
  );
  evidence.smokeTargets.push({
    id: "operator-pay-settlement-simulation",
    proofReceiptIdPrefix: paySettlement.privateRailReceipt.proofReceiptId.slice(0, 18),
    status: "pass",
  });

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  for (const forbidden of forbiddenEvidenceFragments) {
    assert.ok(!serializedEvidence.includes(forbidden), `Production smoke evidence must not include ${forbidden}.`);
  }
  for (const envName of requiredEnv) {
    const rawValue = process.env[envName]?.trim();
    assert.ok(!rawValue || !serializedEvidence.includes(rawValue), `Production smoke evidence leaked ${envName}.`);
  }

  console.log(serializedEvidence);
  console.error("Vanta Private Pool v2 production smoke: PASS");
}

run().catch((error) => {
  console.error(`Vanta Private Pool v2 production smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});
