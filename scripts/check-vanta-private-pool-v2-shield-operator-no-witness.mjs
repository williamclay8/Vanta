import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-shield-no-witness-"));
const shieldArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_shield_entry/target/vanta_private_pool_v2_shield_entry.proof.json",
);
const claimArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_claim_entry/target/vanta_private_pool_v2_claim_entry.proof.json",
);
const sendArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_send_entry/target/vanta_private_pool_v2_send_entry.proof.json",
);
const swapToShieldedArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/target/vanta_private_pool_v2_swap_to_shielded_entry.proof.json",
);
const actualPrivateSpendArtifactPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/target/vanta_private_pool_v2_actual_private_spend_entry.proof.json",
);
const port = 13480 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const productionBaseUrl = `http://127.0.0.1:${port + 1_000}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(" ")} failed.`);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestJson(path, options = {}, targetBaseUrl = baseUrl) {
  const response = await fetch(`${targetBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, parsed, status: response.status, text };
}

async function waitForHealth(server, targetBaseUrl = baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Private Pool V2 operator exited before health check.");
    }

    try {
      const response = await requestJson("/health", {}, targetBaseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await sleep(250);
  }

  throw new Error("Private Pool V2 operator did not become healthy.");
}

async function expectReject(label, body, expectedMessageFragment, targetBaseUrl = baseUrl) {
  const response = await requestJson(
    "/private-pool-v2/proof-artifacts/verify",
    {
      body: JSON.stringify(body),
      method: "POST",
    },
    targetBaseUrl,
  );
  assert(!response.ok, `${label} unexpectedly succeeded.`);
  assert(
    String(response.parsed?.error ?? response.text).includes(expectedMessageFragment),
    `${label} rejected with unexpected message: ${response.text}`,
  );
  console.log(`${label}: PASS`);
}

function startOperator(targetPort, storeName, extraEnv = {}) {
  const server = spawn("node", ["operator/private-pool-v2-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
      VANTA_PRIVATE_POOL_V2_OPERATOR_PORT: String(targetPort),
      VANTA_PRIVATE_POOL_V2_STORE_PATH: join(tempRoot, storeName),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let stdout = "";
  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  return { server, stderr: () => stderr, stdout: () => stdout };
}

async function stopOperator(server) {
  if (server.exitCode === null) {
    await new Promise((resolvePromise) => {
      server.once("close", resolvePromise);
      server.kill("SIGTERM");
    });
  }
}

async function readReceiptCounts(targetBaseUrl = baseUrl) {
  const response = await requestJson("/state/private-pool-v2-receipts", {}, targetBaseUrl);
  assert(response.ok, response.text || "Expected Private Pool v2 receipts state endpoint.");
  return {
    paySettlementCount: response.parsed?.paySettlementCount,
    protocolSettlementCount: response.parsed?.protocolSettlementCount,
    receiptCount: response.parsed?.receiptCount,
    shadowCommitmentCount: response.parsed?.shadowCommitmentCount,
  };
}

function assertReceiptCountsEqual(before, after) {
  assert(
    JSON.stringify(before) === JSON.stringify(after),
    `Shield proof artifact verification must stay read-only; receipt counts changed from ${JSON.stringify(
      before,
    )} to ${JSON.stringify(after)}.`,
  );
}

run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "shield"]);
run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "claim"]);
run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "send"]);
run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "swap-to-shielded"]);
run("node", ["scripts/prove-vanta-private-pool-v2-circuit.mjs", "actual-private-spend"]);
const proofArtifact = JSON.parse(readFileSync(shieldArtifactPath, "utf8"));
const claimProofArtifact = JSON.parse(readFileSync(claimArtifactPath, "utf8"));
const sendProofArtifact = JSON.parse(readFileSync(sendArtifactPath, "utf8"));
const swapToShieldedProofArtifact = JSON.parse(readFileSync(swapToShieldedArtifactPath, "utf8"));
const actualPrivateSpendProofArtifact = JSON.parse(
  readFileSync(actualPrivateSpendArtifactPath, "utf8"),
);
const expectedPublicInputs = {
  shieldPublicInputHash: proofArtifact.publicInputs[0],
};

const operator = startOperator(port, "private-pool-v2-shield-no-witness.json");

try {
  await waitForHealth(operator.server);
  const beforeCounts = await readReceiptCounts();

  const accepted = await requestJson("/private-pool-v2/proof-artifacts/verify", {
    body: JSON.stringify({ expectedPublicInputs, proofArtifact }),
    method: "POST",
  });
  assert(accepted.ok, accepted.text || "Expected proof artifact verification to succeed.");
  assert(accepted.parsed?.verifiedReceipt?.verified === true, "Expected verified receipt.");
  assert(
    accepted.parsed?.verifiedReceipt?.verifiedPublicInputs?.shieldPublicInputHash ===
      proofArtifact.publicInputs[0],
    "Expected verified receipt to decode Shield public input hash.",
  );
  assert(
    accepted.parsed?.kind === "Private Pool V2 Shield proof artifact verification",
    "Expected operator to name the Shield proof artifact route.",
  );
  console.log("private-pool-v2 operator Shield proof artifact no-witness acceptance: PASS");

  const afterCounts = await readReceiptCounts();
  assertReceiptCountsEqual(beforeCounts, afterCounts);
  console.log("private-pool-v2 operator Shield proof artifact read-only receipt state: PASS");

  await expectReject(
    "private-pool-v2 operator Shield missing expected public input rejection",
    { proofArtifact },
    "expectedPublicInputs.shieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mismatched expected public input rejection",
    {
      expectedPublicInputs: {
        shieldPublicInputHash: (BigInt(proofArtifact.publicInputs[0]) + 1n).toString(10),
      },
      proofArtifact,
    },
    "shieldPublicInputHash mismatch",
  );
  await expectReject(
    "private-pool-v2 operator Shield cannot satisfy Send expected input",
    {
      expectedPublicInputs: { sendPublicInputHash: proofArtifact.publicInputs[0] },
      proofArtifact,
    },
    "sendPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield cannot satisfy Claim expected input",
    {
      expectedPublicInputs: { claimPublicInputHash: proofArtifact.publicInputs[0] },
      proofArtifact,
    },
    "claimPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield cannot satisfy Swap-to-shielded expected input",
    {
      expectedPublicInputs: { swapPublicInputHash: proofArtifact.publicInputs[0] },
      proofArtifact,
    },
    "swapPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield cannot satisfy actual-private expected input",
    {
      expectedPublicInputs: { privateSpendPublicInputHash: proofArtifact.publicInputs[0] },
      proofArtifact,
    },
    "privateSpendPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed Shield and Send expected input rejection",
    {
      expectedPublicInputs: {
        ...expectedPublicInputs,
        sendPublicInputHash: proofArtifact.publicInputs[0],
      },
      proofArtifact,
    },
    "sendPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed Shield and Claim expected input rejection",
    {
      expectedPublicInputs: {
        ...expectedPublicInputs,
        claimPublicInputHash: proofArtifact.publicInputs[0],
      },
      proofArtifact,
    },
    "claimPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed Shield and Swap-to-shielded expected input rejection",
    {
      expectedPublicInputs: {
        ...expectedPublicInputs,
        swapPublicInputHash: proofArtifact.publicInputs[0],
      },
      proofArtifact,
    },
    "swapPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed Shield and actual-private expected input rejection",
    {
      expectedPublicInputs: {
        ...expectedPublicInputs,
        privateSpendPublicInputHash: proofArtifact.publicInputs[0],
      },
      proofArtifact,
    },
    "privateSpendPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield unknown expected public input rejection",
    {
      expectedPublicInputs: {
        ...expectedPublicInputs,
        unshieldPublicInputHash: proofArtifact.publicInputs[0],
      },
      proofArtifact,
    },
    "unexpected expectedPublicInputs.unshieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed witness alias rejection",
    { expectedPublicInputs, proofArtifact, witness: { outputCommitment: "123" } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed witnessPackage rejection",
    { expectedPublicInputs, proofArtifact, witnessPackage: { privateWitness: true } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed privateWitness rejection",
    { expectedPublicInputs, privateWitness: { outputCommitment: "123" }, proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed privateInputs alias rejection",
    { expectedPublicInputs, privateInputs: { outputCommitment: "123" }, proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed private_inputs alias rejection",
    { expectedPublicInputs, private_inputs: { outputCommitment: "123" }, proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed noteSecret alias rejection",
    { expectedPublicInputs, noteSecret: "do-not-accept", proofArtifact },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed sourcePublicInputs rejection",
    { expectedPublicInputs, proofArtifact, sourcePublicInputs: { shield_public_input_hash: "1" } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield mixed sourceArtifacts rejection",
    { expectedPublicInputs, proofArtifact, sourceArtifacts: { proverToml: "do-not-accept" } },
    "strict no-witness",
  );
  await expectReject(
    "private-pool-v2 operator Shield nested privateInputs rejection",
    {
      expectedPublicInputs,
      proofArtifact: { ...proofArtifact, privateInputs: { outputCommitment: "123" } },
    },
    "forbidden no-witness field",
  );
  await expectReject(
    "private-pool-v2 operator Shield nested witness alias rejection",
    {
      expectedPublicInputs,
      proofArtifact: { ...proofArtifact, witness: { outputCommitment: "123" } },
    },
    "forbidden no-witness field",
  );
  await expectReject(
    "private-pool-v2 operator Claim artifact cannot satisfy Shield expected input",
    { expectedPublicInputs, proofArtifact: claimProofArtifact },
    "shieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Send artifact cannot satisfy Shield expected input",
    { expectedPublicInputs, proofArtifact: sendProofArtifact },
    "shieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator Swap-to-shielded artifact cannot satisfy Shield expected input",
    { expectedPublicInputs, proofArtifact: swapToShieldedProofArtifact },
    "shieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator actual-private artifact cannot satisfy Shield expected input",
    { expectedPublicInputs, proofArtifact: actualPrivateSpendProofArtifact },
    "shieldPublicInputHash",
  );
  await expectReject(
    "private-pool-v2 operator relabelled Send artifact rejected for Shield",
    {
      expectedPublicInputs,
      proofArtifact: {
        ...sendProofArtifact,
        circuit: "vanta_private_pool_v2_shield_entry",
        publicInputLabels: ["shield-public-input-hash"],
      },
    },
    "verifyingKeyId",
  );
} catch (error) {
  if (operator.stdout()) {
    console.error(operator.stdout());
  }
  if (operator.stderr()) {
    console.error(operator.stderr());
  }
  throw error;
} finally {
  await stopOperator(operator.server);
}

const productionOperator = startOperator(port + 1_000, "private-pool-v2-shield-production.json", {
  VANTA_PRIVATE_POOL_V2_REQUIRE_PRODUCTION_PROOF_SYSTEM: "true",
});

try {
  await waitForHealth(productionOperator.server, productionBaseUrl);
  await expectReject(
    "private-pool-v2 operator Shield production local artifact rejection",
    { expectedPublicInputs, proofArtifact },
    "remote proof artifact verification",
    productionBaseUrl,
  );
} finally {
  await stopOperator(productionOperator.server);
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Private Pool v2 Shield operator no-witness check: PASS");
