import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-remote-services-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = ["protocolAdapter.ts", "privatePoolV2Types.ts", "privatePoolV2RemoteServices.ts"];

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

function makeResponse(body, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

async function assertRejects(fn, pattern, label) {
  let rejected = null;
  try {
    await fn();
  } catch (error) {
    rejected = error;
  }

  assert.ok(rejected, `${label} should reject.`);
  assert.match(String(rejected?.message ?? rejected), pattern, `${label} rejected with unexpected error.`);
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const {
    createVantaPrivatePoolV2RemoteIndexer,
    createVantaPrivatePoolV2RemoteProver,
    createVantaPrivatePoolV2RemoteRelayer,
    createVantaPrivatePoolV2RemoteRuntime,
    createVantaPrivatePoolV2RemoteVerifierRegistry,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2RemoteServices.js")).href);

  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ body: init.body ? JSON.parse(String(init.body)) : null, method: init.method ?? "GET", url: String(url) });
    const path = new URL(String(url)).pathname;

    if (path === "/v1/roots/latest") {
      return makeResponse({ root: "field:remote-root" });
    }
    if (path === "/v1/commitments/field%3Acommitment/proof") {
      return makeResponse({
        leaf: {
          assetId: "USDC",
          commitment: "field:commitment",
          leafIndex: 7,
          merkleRoot: "field:remote-root",
          treeId: "tree:usdc",
        },
        path: ["field:sibling"],
        pathIndices: [0],
        root: "field:remote-root",
      });
    }
    if (path === "/v1/nullifiers/field%3Anullifier") {
      return makeResponse({ nullifier: "field:nullifier", spentAtSlot: "123" });
    }
    if (path === "/v1/commitments") {
      return makeResponse({
        commitments: [
          {
            assetId: "USDC",
            commitment: "field:commitment",
            leafIndex: 7,
            merkleRoot: "field:remote-root",
            treeId: "tree:usdc",
          },
        ],
      });
    }
    if (path === "/v1/proofs" && init.method === "POST") {
      return makeResponse({
        proofBytes: [1, 2, 3],
        proofSystem: "noir-bb",
        publicInputCommitment: "field:pic",
        verifyingKeyId: "vk:remote",
      });
    }
    if (path === "/v1/proofs/verify") {
      return makeResponse({ accepted: true });
    }
    if (path === "/v1/proofs/health") {
      return makeResponse({ blockers: [], ready: true, warnings: [] });
    }
    if (path === "/v1/claims/quote") {
      return makeResponse({
        estimatedFeeBaseUnits: "5000",
        expiresAtSlot: "999",
        relayerId: "relayer:remote",
      });
    }
    if (path === "/v1/claims/submit") {
      return makeResponse({ relayerId: "relayer:remote", signature: "sig:remote" });
    }
    if (path === "/v1/proofs/accept") {
      return makeResponse({
        assetId: "USDC",
        intent: "claim",
        publicInputCommitment: "field:pic",
        receiptId: "receipt:remote",
        recordedAtSlot: "1000",
        replayKey: "claim:field:nullifier",
      });
    }

    return makeResponse({ error: `unexpected path ${path}` }, false);
  };

  const authToken = "test-token";
  const indexer = createVantaPrivatePoolV2RemoteIndexer({ authToken, baseUrl: "https://indexer.example", fetchImpl });
  const prover = createVantaPrivatePoolV2RemoteProver({ authToken, baseUrl: "https://prover.example", fetchImpl });
  const relayer = createVantaPrivatePoolV2RemoteRelayer({ authToken, baseUrl: "https://relayer.example", fetchImpl });
  const verifierRegistry = createVantaPrivatePoolV2RemoteVerifierRegistry({
    authToken,
    baseUrl: "https://verifier.example",
    fetchImpl,
  });

  assert.equal(await indexer.getCurrentRoot("tree:usdc"), "field:remote-root");
  assert.equal((await indexer.getMerkleProof("field:commitment")).leaf.leafIndex, 7);
  assert.equal((await indexer.getNullifier("field:nullifier"))?.spentAtSlot, 123n);
  assert.equal((await indexer.listCommitments({ treeId: "tree:usdc" })).length, 1);

  const request = {
    amountBaseUnits: 1000n,
    assetId: "USDC",
    intent: "claim",
    publicInputs: ["nullifier:field:nullifier"],
  };
  const proof = await prover.prove(request);
  assert.equal(proof.proofSystem, "noir-bb");
  assert.equal(proof.proofBackend, "remote-service");
  assert.equal(await prover.verify({ proof, request }), true);
  assert.equal(prover.readiness().ready, false, "Remote readiness starts unknown before health is fetched.");

  const quote = await relayer.quoteClaim({
    amountBaseUnits: 1000n,
    assetId: "USDC",
    destinationAddress: "recipient",
  });
  assert.equal(quote.estimatedFeeBaseUnits, 5000n);
  assert.equal((await relayer.submitClaim({ quote, serializedTransaction: "tx" })).signature, "sig:remote");

  const receipt = await verifierRegistry.acceptProof({ proof, request });
  assert.equal(receipt.recordedAtSlot, 1000n);
  assert.equal(receipt.proofBackend, "remote-service");
  assert.equal(receipt.proofSystem, "noir-bb");

  await assertRejects(
    () =>
      createVantaPrivatePoolV2RemoteProver({
        authToken,
        baseUrl: "https://prover.example",
        fetchImpl: async () =>
          makeResponse({
            proofBytes: [1, 2, 3],
            proofSystem: "mock",
            publicInputCommitment: "field:mock",
            verifyingKeyId: "vk:mock",
          }),
      }).prove(request),
    /production proof system/u,
    "remote prover mock proofSystem response",
  );
  await assertRejects(
    () =>
      createVantaPrivatePoolV2RemoteProver({
        authToken,
        baseUrl: "https://prover.example",
        fetchImpl: async () =>
          makeResponse({
            proofBackend: "local-mock",
            proofBytes: [1, 2, 3],
            proofSystem: "noir-bb",
            publicInputCommitment: "field:local-backend",
            verifyingKeyId: "vk:local-backend",
          }),
      }).prove(request),
    /proofBackend=remote-service/u,
    "remote prover local proofBackend response",
  );
  await assertRejects(
    () =>
      prover.prove({
        ...request,
        witnessPackage: { noteSecret: "secret" },
      }),
    /witness material field witnessPackage/u,
    "remote prover witness sidecar request",
  );
  await assertRejects(
    () =>
      prover.verify({
        proof: {
          ...proof,
          proofBackend: "local-mock",
        },
        request,
      }),
    /proofBackend=remote-service/u,
    "remote proof verification local proofBackend request",
  );
  await assertRejects(
    () =>
      verifierRegistry.acceptProof({
        proof: {
          ...proof,
          proofBackend: "local-bb-fixture-artifact",
        },
        request,
      }),
    /proofBackend=remote-service/u,
    "remote verifier local proofBackend request",
  );
  await assertRejects(
    () =>
      createVantaPrivatePoolV2RemoteVerifierRegistry({
        authToken,
        baseUrl: "https://verifier.example",
        fetchImpl: async () =>
          makeResponse({
            assetId: "USDC",
            intent: "claim",
            proofSystem: "mock",
            publicInputCommitment: "field:pic",
            receiptId: "receipt:remote",
            recordedAtSlot: "1000",
            replayKey: "claim:field:nullifier",
          }),
      }).acceptProof({ proof, request }),
    /production proof system/u,
    "remote verifier mock proofSystem response",
  );
  await assertRejects(
    () =>
      createVantaPrivatePoolV2RemoteVerifierRegistry({
        authToken,
        baseUrl: "https://verifier.example",
        fetchImpl: async () =>
          makeResponse({
            assetId: "USDC",
            intent: "claim",
            proofBackend: "local-mock",
            proofSystem: "noir-bb",
            publicInputCommitment: "field:pic",
            receiptId: "receipt:remote",
            recordedAtSlot: "1000",
            replayKey: "claim:field:nullifier",
          }),
      }).acceptProof({ proof, request }),
    /proofBackend=remote-service/u,
    "remote verifier local proofBackend response",
  );

  const runtime = createVantaPrivatePoolV2RemoteRuntime({
    assets: [],
    indexer,
    network: "mainnet",
    prover,
    relayer,
    verifierRegistry,
  });
  assert.equal(runtime.readiness().ready, true);
  assert.equal(runtime.infrastructure.includes("indexer"), true);
  assert.equal(runtime.infrastructure.includes("relayer"), true);
  assert.equal(runtime.infrastructure.includes("web-zk-prover"), true);
  assert.ok(calls.every((call) => call.url.startsWith("https://")), "Remote services must use HTTPS URLs.");
  assert.ok(calls.every((call) => !JSON.stringify(call).includes("seed phrase")), "Calls must not include seed phrases.");

  console.log("Vanta Private Pool v2 remote services check: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
