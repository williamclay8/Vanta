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
  return 9700 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-consumes`);
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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-http-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSource = readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8");
    const proofBoundarySource = readFileSync(
      resolve(repoRoot, "src/zk/vantaPrivateCoreUnshieldProof.ts"),
      "utf8",
    ).replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore"');

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"), proofBoundarySource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreUnshieldProof.ts"),
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

    const compiledProofBoundaryPath = join(tempJsDir, "vantaPrivateCoreUnshieldProof.js");
    writeFileSync(
      compiledProofBoundaryPath,
      readFileSync(compiledProofBoundaryPath, "utf8").replace(
        /from "\.\/vantaPrivateCore"/g,
        'from "./vantaPrivateCore.js"',
      ),
    );

    const compiledModule = await import(pathToFileURL(compiledProofBoundaryPath).href);
    return compiledModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const fixture = await loadFixture();
const witnessPackage = fixture.validBoundary.noirWitnessPackage;
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-operator-http-server-"));
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

  const initialRootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !initialRootState.ok ||
    initialRootState.parsed?.stateVersion !== 1 ||
    initialRootState.parsed?.currentRoot !== null ||
    !Array.isArray(initialRootState.parsed?.records) ||
    initialRootState.parsed.records.length !== 0
  ) {
    throw new Error(initialRootState.text || "operator root state did not start empty");
  }
  printStatus("operator http empty root state: PASS");

  const initialConsumeState = await requestJson(baseUrl, "/state/private-core-consumes", {
    method: "GET",
  });
  if (
    !initialConsumeState.ok ||
    initialConsumeState.parsed?.stateVersion !== 1 ||
    initialConsumeState.parsed?.latestConsume !== null ||
    !Array.isArray(initialConsumeState.parsed?.records) ||
    initialConsumeState.parsed.records.length !== 0
  ) {
    throw new Error(initialConsumeState.text || "operator consume state did not start empty");
  }
  printStatus("operator http empty consume state: PASS");

  const proofResponse = await requestJson(baseUrl, "/private-core/unshield-proof", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (!proofResponse.ok || proofResponse.parsed?.verified !== true) {
    throw new Error(proofResponse.text || "operator proof endpoint failed");
  }
  printStatus(
    `operator http proof: PASS (${proofResponse.parsed.proofFieldCount} fields / ${proofResponse.parsed.publicInputCount} public inputs)`,
  );

  const statePreflight = await fetch(`${baseUrl}/state/private-core-roots`, {
    headers: {
      "Access-Control-Request-Method": "GET",
      Origin: "http://127.0.0.1:4173",
    },
    method: "OPTIONS",
  });
  if (
    !statePreflight.ok ||
    !statePreflight.headers.get("access-control-allow-methods")?.includes("GET")
  ) {
    throw new Error("operator state preflight did not advertise GET access");
  }
  printStatus("operator http state preflight: PASS");

  for (const tamperCase of [
    {
      expectedMessage: "mismatched amount public inputs",
      label: "amount",
      mutate: () => ({ amount: "1" }),
    },
    {
      expectedMessage: "mismatched release destination public inputs",
      label: "release-destination",
      mutate: () => ({
        releaseDestination:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      }),
    },
    {
      expectedMessage: "mismatched asset public inputs",
      label: "asset",
      mutate: () => ({
        assetId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    },
    {
      expectedMessage: "mismatched note-version public inputs",
      label: "note-version",
      mutate: () => ({ noteVersion: 99 }),
    },
  ]) {
    const tamperedProofResponse = await requestJson(baseUrl, "/private-core/unshield-proof", {
      body: JSON.stringify({
        witnessPackage: {
          ...witnessPackage,
          sourcePublicInputs: {
            ...witnessPackage.sourcePublicInputs,
            ...tamperCase.mutate(),
          },
        },
      }),
      method: "POST",
    });

  if (tamperedProofResponse.ok || !tamperedProofResponse.text.includes(tamperCase.expectedMessage)) {
      throw new Error(
        tamperedProofResponse.text ||
          `operator proof endpoint unexpectedly accepted mismatched ${tamperCase.label} source public input`,
      );
    }
  }
  printStatus("operator http source/public consistency gate: PASS");

  for (const tamperCase of [
    {
      expectedMessage: "mismatched amount public inputs",
      label: "amount",
      mutate: () => ({ amount: "1" }),
    },
    {
      expectedMessage: "mismatched release destination public inputs",
      label: "release-destination",
      mutate: () => ({
        releaseDestination:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      }),
    },
    {
      expectedMessage: "mismatched asset public inputs",
      label: "asset",
      mutate: () => ({
        assetId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    },
    {
      expectedMessage: "mismatched note-version public inputs",
      label: "note-version",
      mutate: () => ({ noteVersion: 99 }),
    },
  ]) {
    const tamperedRegisterRoot = await requestJson(baseUrl, "/private-core/register-root", {
      body: JSON.stringify({
        sourceArtifacts: {
          noteCommitment: fixture.validBoundary.privateWitness.noteCommitment,
        },
        witnessPackage: {
          ...witnessPackage,
          sourcePublicInputs: {
            ...witnessPackage.sourcePublicInputs,
            ...tamperCase.mutate(),
          },
        },
      }),
      method: "POST",
    });

    if (tamperedRegisterRoot.ok || !tamperedRegisterRoot.text.includes(tamperCase.expectedMessage)) {
      throw new Error(
        tamperedRegisterRoot.text ||
          `operator root registration unexpectedly accepted mismatched ${tamperCase.label} source public input`,
      );
    }
    const rootStateAfterTamperedRegistration = await requestJson(baseUrl, "/state/private-core-roots", {
      method: "GET",
    });
    if (
      !rootStateAfterTamperedRegistration.ok ||
      !Array.isArray(rootStateAfterTamperedRegistration.parsed?.records) ||
      rootStateAfterTamperedRegistration.parsed.records.length !== 0
    ) {
      throw new Error(
        JSON.stringify(rootStateAfterTamperedRegistration.parsed) ||
          "tampered root registration mutated operator root state",
      );
    }
  }
  printStatus("operator http root registration consistency gate: PASS");

  const consumeBeforeRoot = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (consumeBeforeRoot.ok || !consumeBeforeRoot.text.includes("not registered as current private-core state")) {
    throw new Error(
      consumeBeforeRoot.text || "operator consume endpoint unexpectedly succeeded before root registration",
    );
  }
  printStatus("operator http root gate: PASS");

  const registerRoot = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: {
        noteCommitment: fixture.validBoundary.privateWitness.noteCommitment,
      },
      witnessPackage,
    }),
    method: "POST",
  });

  if (!registerRoot.ok || registerRoot.parsed?.known !== true) {
    throw new Error(registerRoot.text || "operator root registration failed");
  }
  printStatus("operator http root registration: PASS");

  const rootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !rootState.ok ||
    rootState.parsed?.stateVersion !== 1 ||
    rootState.parsed?.currentRoot !== witnessPackage.sourcePublicInputs.stateRoot ||
    !Array.isArray(rootState.parsed?.records) ||
    !rootState.parsed.records.some((record) => record.root === witnessPackage.sourcePublicInputs.stateRoot)
  ) {
    throw new Error(rootState.text || "operator root state did not contain the registered root");
  }
  printStatus("operator http root state: PASS");

  const staleRoot = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const registerStaleRoot = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: {
        noteCommitment: "stale-root-basis",
      },
      witnessPackage: {
        ...witnessPackage,
        sourcePublicInputs: {
          ...witnessPackage.sourcePublicInputs,
          stateRoot: staleRoot,
        },
      },
    }),
    method: "POST",
  });

  if (!registerStaleRoot.ok || registerStaleRoot.parsed?.known !== true) {
    throw new Error(registerStaleRoot.text || "operator stale-root registration failed");
  }

  const staleConsume = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });

  if (staleConsume.ok || !staleConsume.text.includes("not the latest registered private-core state")) {
    throw new Error(staleConsume.text || "operator stale-root rejection did not trigger");
  }
  printStatus("operator http stale-root gate: PASS");

  const reregisterCurrentRoot = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: {
        noteCommitment: fixture.validBoundary.privateWitness.noteCommitment,
      },
      witnessPackage,
    }),
    method: "POST",
  });

  if (!reregisterCurrentRoot.ok || reregisterCurrentRoot.parsed?.known !== true) {
    throw new Error(reregisterCurrentRoot.text || "operator current-root re-registration failed");
  }

  const currentRootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !currentRootState.ok ||
    currentRootState.parsed?.stateVersion !== 1 ||
    currentRootState.parsed?.currentRoot !== witnessPackage.sourcePublicInputs.stateRoot ||
    !Array.isArray(currentRootState.parsed?.records) ||
    currentRootState.parsed.records[0]?.root !== witnessPackage.sourcePublicInputs.stateRoot
  ) {
    throw new Error(
      JSON.stringify(currentRootState.parsed) ||
        "operator current root did not become the latest registered root",
    );
  }
  printStatus("operator http current-root restore: PASS");

  for (const tamperCase of [
    {
      expectedMessage: "mismatched amount public inputs",
      label: "amount",
      mutate: () => ({ amount: "1" }),
    },
    {
      expectedMessage: "mismatched release destination public inputs",
      label: "release-destination",
      mutate: () => ({
        releaseDestination:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      }),
    },
    {
      expectedMessage: "mismatched asset public inputs",
      label: "asset",
      mutate: () => ({
        assetId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    },
    {
      expectedMessage: "mismatched note-version public inputs",
      label: "note-version",
      mutate: () => ({ noteVersion: 99 }),
    },
  ]) {
    const tamperedConsume = await requestJson(baseUrl, "/private-core/unshield-consume", {
      body: JSON.stringify({
        witnessPackage: {
          ...witnessPackage,
          sourcePublicInputs: {
            ...witnessPackage.sourcePublicInputs,
            ...tamperCase.mutate(),
          },
        },
      }),
      method: "POST",
    });

    if (tamperedConsume.ok || !tamperedConsume.text.includes(tamperCase.expectedMessage)) {
      throw new Error(
        tamperedConsume.text ||
          `operator consume unexpectedly accepted mismatched ${tamperCase.label} source public input`,
      );
    }

    const consumeStateAfterTamperedConsume = await requestJson(baseUrl, "/state/private-core-consumes", {
      method: "GET",
    });
    if (
      !consumeStateAfterTamperedConsume.ok ||
      !Array.isArray(consumeStateAfterTamperedConsume.parsed?.records) ||
      consumeStateAfterTamperedConsume.parsed.records.length !== 0
    ) {
      throw new Error(
        JSON.stringify(consumeStateAfterTamperedConsume.parsed) ||
          "tampered consume mutated operator consume state",
      );
    }
  }
  printStatus("operator http consume consistency gate: PASS");

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });
  if (!consumeResponse.ok || consumeResponse.parsed?.verified !== true) {
    throw new Error(consumeResponse.text || "operator consume endpoint failed after root registration");
  }
  printStatus("operator http consume: PASS");

  const replayResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ witnessPackage }),
    method: "POST",
  });
  if (!replayResponse.text.includes("has already been consumed")) {
    throw new Error(replayResponse.text || "operator replay rejection did not trigger");
  }
  printStatus("operator http replay rejection: PASS");

  const consumeState = await requestJson(baseUrl, "/state/private-core-consumes", { method: "GET" });
  if (
    !consumeState.ok ||
    consumeState.parsed?.stateVersion !== 1 ||
    consumeState.parsed?.latestConsume?.nullifier !== witnessPackage.sourcePublicInputs.nullifier ||
    !Array.isArray(consumeState.parsed?.records) ||
    !consumeState.parsed.records.some(
      (record) => record.nullifier === witnessPackage.sourcePublicInputs.nullifier,
    )
  ) {
    throw new Error(consumeState.text || "operator consume state did not contain the consumed nullifier");
  }
  printStatus("operator http consume state: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const operatorOutput = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  console.error(message);
  if (operatorOutput) {
    console.error(operatorOutput);
  }
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
  rmSync(tempRoot, { recursive: true, force: true });
}
