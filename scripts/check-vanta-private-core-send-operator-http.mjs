import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

function randomPort() {
  return 9900 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-summary`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until server is listening.
    }

    await sleep(250);
  }

  throw new Error("operator server did not become ready in time");
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
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

  return {
    ok: response.ok,
    parsed,
    status: response.status,
    text,
  };
}

async function loadFixture() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-http-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const sendProofSource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSendProof.ts"), sendProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
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

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    writeFileSync(
      compiledPath,
      readFileSync(compiledPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const compiledModule = await import(pathToFileURL(compiledPath).href);
    return compiledModule.getVantaPrivateCoreFixedDepthSendFixtureV0();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const fixture = await loadFixture();
const witnessPackage = fixture.validBoundary.noirWitnessPackage;
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-operator-http-server-"));
const port = randomPort();
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn("node", ["operator/unshield-server.mjs"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
    VANTA_DEVNET_TOKEN_MINT:
      process.env.VANTA_DEVNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_DEVNET_VAULT_OWNER:
      process.env.VANTA_DEVNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
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

try {
  await waitForHealth(baseUrl);

  const initialProofState = await requestJson(baseUrl, "/state/private-core-proofs", {
    method: "GET",
  });
  if (
    !initialProofState.ok ||
    initialProofState.parsed?.stateVersion !== 1 ||
    initialProofState.parsed?.latestProof !== null ||
    !Array.isArray(initialProofState.parsed?.records) ||
    initialProofState.parsed.records.length !== 0
  ) {
    throw new Error(initialProofState.text || "operator proof state did not start empty");
  }
  printStatus("operator send http empty proof state: PASS");

  const initialSendProofState = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  if (
    !initialSendProofState.ok ||
    initialSendProofState.parsed?.stateVersion !== 1 ||
    initialSendProofState.parsed?.latestProof !== null ||
    !Array.isArray(initialSendProofState.parsed?.records) ||
    initialSendProofState.parsed.records.length !== 0
  ) {
    throw new Error(initialSendProofState.text || "operator send proof state did not start empty");
  }
  printStatus("operator send http empty send-proof state: PASS");

  const proofResponse = await requestJson(baseUrl, "/private-core/send-proof", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (
    !proofResponse.ok ||
    proofResponse.parsed?.verified !== true ||
    proofResponse.parsed?.circuit !== "vanta_private_core_single_note_send" ||
    proofResponse.parsed?.publicInputCount !== 13
  ) {
    throw new Error(proofResponse.text || "operator send proof endpoint failed");
  }
  printStatus(
    `operator send http proof: PASS (${proofResponse.parsed.proofFieldCount} fields / ${proofResponse.parsed.publicInputCount} public inputs)`,
  );

  const sendProofState = await requestJson(baseUrl, "/state/private-core-send-proofs", {
    method: "GET",
  });
  if (
    !sendProofState.ok ||
    sendProofState.parsed?.stateVersion !== 1 ||
    !sendProofState.parsed?.latestProof ||
    sendProofState.parsed.latestProof?.action !== "send-proof" ||
    sendProofState.parsed.latestProof?.circuit !== "vanta_private_core_single_note_send" ||
    !Array.isArray(sendProofState.parsed?.records) ||
    sendProofState.parsed.records.length !== 1
  ) {
    throw new Error(sendProofState.text || "send proof endpoint did not persist send-proof state");
  }
  printStatus("operator send http send-proof state: PASS");

  const summaryState = await requestJson(baseUrl, "/state/private-core-summary", { method: "GET" });
  if (
    !summaryState.ok ||
    summaryState.parsed?.stateVersion !== 1 ||
    summaryState.parsed?.summaryVersion !== 1 ||
    summaryState.parsed?.latestSendProof?.action !== "send-proof" ||
    summaryState.parsed?.latestSendProof?.circuit !== "vanta_private_core_single_note_send" ||
    summaryState.parsed?.sendProofRecordCount !== 1
  ) {
    throw new Error(summaryState.text || "operator summary did not reflect send-proof state");
  }
  printStatus("operator send http summary send-proof state: PASS");

  const proofState = await requestJson(baseUrl, "/state/private-core-proofs", { method: "GET" });
  if (
    !proofState.ok ||
    proofState.parsed?.stateVersion !== 1 ||
    proofState.parsed?.latestProof !== null ||
    !Array.isArray(proofState.parsed?.records) ||
    proofState.parsed.records.length !== 0
  ) {
    throw new Error(proofState.text || "send proof endpoint unexpectedly mutated shared proof state");
  }
  printStatus("operator send http proof state isolation: PASS");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => server.once("exit", resolvePromise));
  rmSync(tempRoot, { recursive: true, force: true });
}
