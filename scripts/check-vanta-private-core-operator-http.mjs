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
const sourceArtifacts = fixture.validSourceArtifacts;
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

  const initialRootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !initialRootState.ok ||
    initialRootState.parsed?.stateVersion !== 1 ||
    initialRootState.parsed?.currentRecord !== null ||
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

  const initialReleaseState = await requestJson(baseUrl, "/state/private-core-releases", {
    method: "GET",
  });
  if (
    !initialReleaseState.ok ||
    initialReleaseState.parsed?.stateVersion !== 1 ||
    initialReleaseState.parsed?.latestRelease !== null ||
    !Array.isArray(initialReleaseState.parsed?.records) ||
    initialReleaseState.parsed.records.length !== 0
  ) {
    throw new Error(initialReleaseState.text || "operator release state did not start empty");
  }
  printStatus("operator http empty release state: PASS");

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
  for (const statePath of [
    "/state/private-core-consumes",
    "/state/private-core-releases",
  ]) {
    const stateEndpointPreflight = await fetch(`${baseUrl}${statePath}`, {
      headers: {
        "Access-Control-Request-Method": "GET",
        Origin: "http://127.0.0.1:4173",
      },
      method: "OPTIONS",
    });
    if (
      !stateEndpointPreflight.ok ||
      !stateEndpointPreflight.headers.get("access-control-allow-methods")?.includes("GET")
    ) {
      throw new Error(`operator state preflight did not advertise GET access for ${statePath}`);
    }
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
        sourceArtifacts,
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

  const tamperedRegisterRootSourceArtifacts = await requestJson(baseUrl, "/private-core/register-root", {
    body: JSON.stringify({
      sourceArtifacts: {
        noteCommitment: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
      witnessPackage,
    }),
    method: "POST",
  });

  if (
    tamperedRegisterRootSourceArtifacts.ok ||
    !tamperedRegisterRootSourceArtifacts.text.includes("mismatched note commitment")
  ) {
    throw new Error(
      tamperedRegisterRootSourceArtifacts.text ||
        "operator root registration unexpectedly accepted a mismatched note commitment",
    );
  }

  for (const missingFieldCase of [
    {
      expectedMessage: "missing a note commitment",
      sourceArtifacts: {
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a Merkle leaf",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a witness root",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        merkleLeaf: sourceArtifacts.merkleLeaf,
      },
    },
  ]) {
    const missingRegisterRootArtifacts = await requestJson(baseUrl, "/private-core/register-root", {
      body: JSON.stringify({
        sourceArtifacts: missingFieldCase.sourceArtifacts,
        witnessPackage,
      }),
      method: "POST",
    });

    if (
      missingRegisterRootArtifacts.ok ||
      !missingRegisterRootArtifacts.text.includes(missingFieldCase.expectedMessage)
    ) {
      throw new Error(
        missingRegisterRootArtifacts.text ||
          `operator root registration unexpectedly accepted ${missingFieldCase.expectedMessage}`,
      );
    }
  }

  for (const tamperCase of [
    {
      expectedMessage: "mismatched Merkle leaf",
      sourceArtifacts: {
        ...sourceArtifacts,
        merkleLeaf: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    },
    {
      expectedMessage: "mismatched witness root",
      sourceArtifacts: {
        ...sourceArtifacts,
        witnessRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
    },
  ]) {
    const tamperedRegisterRootArtifacts = await requestJson(baseUrl, "/private-core/register-root", {
      body: JSON.stringify({
        sourceArtifacts: tamperCase.sourceArtifacts,
        witnessPackage,
      }),
      method: "POST",
    });

    if (
      tamperedRegisterRootArtifacts.ok ||
      !tamperedRegisterRootArtifacts.text.includes(tamperCase.expectedMessage)
    ) {
      throw new Error(
        tamperedRegisterRootArtifacts.text ||
          `operator root registration unexpectedly accepted ${tamperCase.expectedMessage}`,
      );
    }
  }
  printStatus("operator http root registration consistency gate: PASS");

  const consumeBeforeRoot = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
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
      sourceArtifacts,
      witnessPackage,
    }),
    method: "POST",
  });

  if (!registerRoot.ok || registerRoot.parsed?.known !== true) {
    throw new Error(registerRoot.text || "operator root registration failed");
  }
  printStatus("operator http root registration: PASS");
  const registeredRoot = registerRoot.parsed.root;

  const rootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !rootState.ok ||
    rootState.parsed?.stateVersion !== 1 ||
    !rootState.parsed?.currentRecord ||
    rootState.parsed.currentRecord.root !== registeredRoot ||
    rootState.parsed.currentRecord.artifactBundleStatus !== "complete" ||
    rootState.parsed.currentRecord.artifactBundleVersion !== 1 ||
    rootState.parsed?.currentRoot !== registeredRoot ||
    !Array.isArray(rootState.parsed?.records) ||
    !rootState.parsed.records.some(
      (record) =>
        record.artifactBundleStatus === "complete" &&
        record.artifactBundleVersion === 1 &&
        record.root === registeredRoot &&
        record.noteCommitment === sourceArtifacts.noteCommitment &&
        record.merkleLeaf === sourceArtifacts.merkleLeaf &&
        record.witnessRoot === sourceArtifacts.witnessRoot,
    )
  ) {
    throw new Error(rootState.text || "operator root state did not contain the registered root");
  }
  printStatus("operator http root state: PASS");

  const currentRootState = await requestJson(baseUrl, "/state/private-core-roots", { method: "GET" });
  if (
    !currentRootState.ok ||
    currentRootState.parsed?.stateVersion !== 1 ||
    !currentRootState.parsed?.currentRecord ||
    currentRootState.parsed.currentRecord.root !== registeredRoot ||
    currentRootState.parsed?.currentRoot !== registeredRoot ||
    !Array.isArray(currentRootState.parsed?.records) ||
    currentRootState.parsed.records[0]?.root !== registeredRoot
  ) {
    throw new Error(
      JSON.stringify(currentRootState.parsed) ||
        "operator current root did not remain the latest registered root",
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
        sourceArtifacts,
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

  const tamperedConsumeSourceArtifacts = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({
      sourceArtifacts: {
        noteCommitment: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
      witnessPackage,
    }),
    method: "POST",
  });

  if (
    tamperedConsumeSourceArtifacts.ok ||
    !tamperedConsumeSourceArtifacts.text.includes("mismatched note commitment")
  ) {
    throw new Error(
      tamperedConsumeSourceArtifacts.text ||
        "operator consume unexpectedly accepted a mismatched note commitment",
    );
  }

  for (const missingFieldCase of [
    {
      expectedMessage: "missing a note commitment",
      sourceArtifacts: {
        merkleLeaf: sourceArtifacts.merkleLeaf,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a Merkle leaf",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        witnessRoot: sourceArtifacts.witnessRoot,
      },
    },
    {
      expectedMessage: "missing a witness root",
      sourceArtifacts: {
        noteCommitment: sourceArtifacts.noteCommitment,
        merkleLeaf: sourceArtifacts.merkleLeaf,
      },
    },
  ]) {
    const missingConsumeArtifacts = await requestJson(baseUrl, "/private-core/unshield-consume", {
      body: JSON.stringify({
        sourceArtifacts: missingFieldCase.sourceArtifacts,
        witnessPackage,
      }),
      method: "POST",
    });

    if (
      missingConsumeArtifacts.ok ||
      !missingConsumeArtifacts.text.includes(missingFieldCase.expectedMessage)
    ) {
      throw new Error(
        missingConsumeArtifacts.text ||
          `operator consume unexpectedly accepted ${missingFieldCase.expectedMessage}`,
      );
    }
  }

  for (const tamperCase of [
    {
      expectedMessage: "mismatched Merkle leaf",
      sourceArtifacts: {
        ...sourceArtifacts,
        merkleLeaf: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    },
    {
      expectedMessage: "mismatched witness root",
      sourceArtifacts: {
        ...sourceArtifacts,
        witnessRoot: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
    },
  ]) {
    const tamperedConsumeArtifacts = await requestJson(baseUrl, "/private-core/unshield-consume", {
      body: JSON.stringify({
        sourceArtifacts: tamperCase.sourceArtifacts,
        witnessPackage,
      }),
      method: "POST",
    });

    if (
      tamperedConsumeArtifacts.ok ||
      !tamperedConsumeArtifacts.text.includes(tamperCase.expectedMessage)
    ) {
      throw new Error(
        tamperedConsumeArtifacts.text ||
          `operator consume unexpectedly accepted ${tamperCase.expectedMessage}`,
      );
    }
  }
  printStatus("operator http consume consistency gate: PASS");

  const consumeResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
    method: "POST",
  });
  const expectedReleaseRequestId = `private-core-release:${witnessPackage.sourcePublicInputs.nullifier}:${witnessPackage.sourcePublicInputs.stateRoot}`;
  const expectedReleaseTransitionId =
    `private-core-release:${witnessPackage.sourcePublicInputs.stateRoot}:${witnessPackage.sourcePublicInputs.releaseDestination}`;
  if (
    !consumeResponse.ok ||
    consumeResponse.parsed?.verified !== true ||
    consumeResponse.parsed?.releaseRecorded !== true ||
    consumeResponse.parsed?.nullifier !== witnessPackage.sourcePublicInputs.nullifier ||
    consumeResponse.parsed?.root !== witnessPackage.sourcePublicInputs.stateRoot ||
    consumeResponse.parsed?.releaseDestination !== witnessPackage.sourcePublicInputs.releaseDestination ||
    consumeResponse.parsed?.releasedAssetId !== witnessPackage.sourcePublicInputs.assetId ||
    consumeResponse.parsed?.releasedAmount !== witnessPackage.sourcePublicInputs.amount ||
    consumeResponse.parsed?.releaseRequestId !== expectedReleaseRequestId ||
    consumeResponse.parsed?.releaseTransitionNoteId !== expectedReleaseTransitionId ||
    typeof consumeResponse.parsed?.completedAt !== "number"
  ) {
    throw new Error(consumeResponse.text || "operator consume endpoint failed after root registration");
  }
  printStatus("operator http consume: PASS");

  const replayResponse = await requestJson(baseUrl, "/private-core/unshield-consume", {
    body: JSON.stringify({ sourceArtifacts, witnessPackage }),
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
    typeof consumeState.parsed?.latestConsume?.completedAt !== "number" ||
    consumeState.parsed?.latestConsume?.assetId !== witnessPackage.sourcePublicInputs.assetId ||
    consumeState.parsed?.latestConsume?.amount !== witnessPackage.sourcePublicInputs.amount ||
    consumeState.parsed?.latestConsume?.leafIndex !== witnessPackage.privateWitness.leaf_index ||
    consumeState.parsed?.latestConsume?.nullifier !== witnessPackage.sourcePublicInputs.nullifier ||
    consumeState.parsed?.latestConsume?.proofFieldCount !== consumeResponse.parsed.proofFieldCount ||
    consumeState.parsed?.latestConsume?.publicInputCount !== consumeResponse.parsed.publicInputCount ||
    consumeState.parsed?.latestConsume?.releaseDestination !==
      witnessPackage.sourcePublicInputs.releaseDestination ||
    consumeState.parsed?.latestConsume?.root !== witnessPackage.sourcePublicInputs.stateRoot ||
    consumeState.parsed?.latestConsume?.completedAt !== consumeResponse.parsed.completedAt ||
    !Array.isArray(consumeState.parsed?.records) ||
    consumeState.parsed.records.length !== 1
  ) {
    throw new Error(consumeState.text || "operator consume state did not contain the consumed nullifier");
  }
  printStatus("operator http consume state: PASS");

  const releaseState = await requestJson(baseUrl, "/state/private-core-releases", { method: "GET" });
  if (
    !releaseState.ok ||
    releaseState.parsed?.stateVersion !== 1 ||
    !releaseState.parsed?.latestRelease ||
    typeof releaseState.parsed.latestRelease.completedAt !== "number" ||
    releaseState.parsed.latestRelease.completedAt !== consumeResponse.parsed.completedAt ||
    releaseState.parsed.latestRelease.consumedNoteId !==
      `private-core-nullifier:${witnessPackage.sourcePublicInputs.nullifier}` ||
    releaseState.parsed.latestRelease.nullifier !== witnessPackage.sourcePublicInputs.nullifier ||
    releaseState.parsed.latestRelease.proofFieldCount !== consumeResponse.parsed.proofFieldCount ||
    releaseState.parsed.latestRelease.publicInputCount !== consumeResponse.parsed.publicInputCount ||
    releaseState.parsed.latestRelease.root !== witnessPackage.sourcePublicInputs.stateRoot ||
    releaseState.parsed.latestRelease.releaseDestination !==
      witnessPackage.sourcePublicInputs.releaseDestination ||
    releaseState.parsed.latestRelease.releasedAssetId !== witnessPackage.sourcePublicInputs.assetId ||
    releaseState.parsed.latestRelease.releasedAmount !== witnessPackage.sourcePublicInputs.amount ||
    releaseState.parsed.latestRelease.requestId !== expectedReleaseRequestId ||
    releaseState.parsed.latestRelease.transitionNoteId !== expectedReleaseTransitionId ||
    !Array.isArray(releaseState.parsed?.records) ||
    releaseState.parsed.records.length !== 1
  ) {
    throw new Error(releaseState.text || "operator release state did not reflect the first consume");
  }
  printStatus("operator http release state: PASS");

  const replayReleaseState = await requestJson(baseUrl, "/state/private-core-releases", { method: "GET" });
  if (
    !replayReleaseState.ok ||
    replayReleaseState.parsed?.stateVersion !== 1 ||
    !Array.isArray(replayReleaseState.parsed?.records) ||
    replayReleaseState.parsed.records.length !== 1
  ) {
    throw new Error(
      replayReleaseState.text || "operator release state changed after replay rejection",
    );
  }
  printStatus("operator http release replay basis: PASS");
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
