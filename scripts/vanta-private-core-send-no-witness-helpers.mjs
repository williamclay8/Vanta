import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const repoRoot = resolve(import.meta.dirname, "..");

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function printStatus(message) {
  console.log(message);
}

export function makeTempRoot(prefix = "private-core-send-no-witness-") {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  return mkdtempSync(resolve(repoRoot, `.tmp/${prefix}`));
}

export function removeTempRoot(tempRoot) {
  rmSync(tempRoot, { recursive: true, force: true });
}

export function compileSendFixtureModule(tempRoot) {
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");
  mkdirSync(tempTsDir, { recursive: true });

  writeFileSync(
    join(tempTsDir, "vantaPrivateCore.ts"),
    readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
  );
  writeFileSync(
    join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
    readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts"), "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore"',
    ),
  );

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

  const compiledSendPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
  writeFileSync(
    compiledSendPath,
    readFileSync(compiledSendPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    ),
  );

  return pathToFileURL(compiledSendPath).href;
}

export async function buildSendProofArtifact(tempRoot) {
  const fixtureModuleUrl = compileSendFixtureModule(tempRoot);
  const { getVantaPrivateCoreFixedDepthSendFixtureV0 } = await import(fixtureModuleUrl);
  const {
    proveAndVerifyVantaPrivateCoreSend,
    verifyVantaPrivateCoreSendProofArtifact,
  } = await import(pathToFileURL(resolve(repoRoot, "operator/private-core-proof.mjs")).href);

  assert(
    typeof verifyVantaPrivateCoreSendProofArtifact === "function",
    "Send proof artifact verifier is missing.",
  );

  const fixture = getVantaPrivateCoreFixedDepthSendFixtureV0();
  const witnessPackage = fixture.validBoundary.noirWitnessPackage;
  const proofReceipt = await proveAndVerifyVantaPrivateCoreSend({ witnessPackage });

  assert(
    typeof proofReceipt.proofHex === "string" && proofReceipt.proofHex.length > 0,
    "Send proof receipt must expose canonical proofHex for no-witness verification.",
  );

  const proofArtifact = {
    backend: proofReceipt.backend,
    circuit: proofReceipt.circuit,
    circuitPublicInputs: witnessPackage.publicInputs,
    proofHex: proofReceipt.proofHex,
    proofVersion: proofReceipt.proofVersion,
    provingHashLane: proofReceipt.provingHashLane,
    publicInputs: proofReceipt.publicInputs,
  };

  const verifiedReceipt = await verifyVantaPrivateCoreSendProofArtifact({ proofArtifact });

  return {
    fixture,
    proofArtifact,
    proofReceipt,
    verifiedReceipt,
    witnessPackage,
  };
}

export function createTamperedProofHex(proofHex) {
  const last = proofHex.at(-1);
  return `${proofHex.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}

export function assertNoForbiddenSendNoWitnessMaterial(value, label) {
  const forbiddenKeys = new Set([
    "assetId",
    "changeAmount",
    "inputAmount",
    "inputAssetId",
    "inputLeafIndex",
    "inputNote",
    "membershipPath",
    "membership_path",
    "membership_path_direction_bits",
    "ownerPublicKey",
    "ownerSecretKey",
    "privateWitness",
    "recipientOwnerPublicKey",
    "sendAmount",
    "senderSecretKey",
    "sourcePublicInputs",
    "witnessPackage",
  ]);
  const forbiddenFragments = [
    "asset_id",
    "change_amount",
    "input_blinding",
    "input_derivation_tag",
    "input_note_nonce",
    "input_note_secret",
    "membership_path",
    "recipient_blinding",
    "recipient_derivation_tag",
    "recipient_note_nonce",
    "recipient_note_secret",
    "send_amount",
    "sender_secret",
  ];
  const redactedAllowedValues = new Set([null, "redacted", "commitment-only", "not-disclosed"]);

  function visit(node, path = []) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]));
      return;
    }

    for (const [key, entry] of Object.entries(node)) {
      if (forbiddenKeys.has(key) && !redactedAllowedValues.has(entry)) {
        throw new Error(`${label} exposes forbidden Send no-witness key ${[...path, key].join(".")}.`);
      }

      const lowered = key.toLowerCase();
      if (
        forbiddenFragments.some((fragment) => lowered.includes(fragment)) &&
        !redactedAllowedValues.has(entry)
      ) {
        throw new Error(`${label} exposes forbidden Send no-witness field ${[...path, key].join(".")}.`);
      }

      visit(entry, [...path, key]);
    }
  }

  visit(value);
}

export function seedProofArtifactRootStores(args) {
  const root = args.verifiedReceipt.verifiedPublicInputs.provingStateRoot;
  const proofId = `private-core-proof:register-root:${root}:seed`;
  const rootStorePath = join(args.tempRoot, "roots.json");
  const proofStorePath = join(args.tempRoot, "proofs.json");

  writeFileSync(
    rootStorePath,
    `${JSON.stringify(
      {
        roots: {
          [root]: {
            proofId,
            recordedAt: 1,
            registrationBasis: "shield-input",
            root,
            source: "proof-artifact-proving-root-seed",
          },
        },
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    proofStorePath,
    `${JSON.stringify(
      {
        proofs: {
          [proofId]: {
            action: "register-root",
            assetId: null,
            amount: null,
            backend: args.verifiedReceipt.backend,
            circuit: args.verifiedReceipt.circuit,
            completedAt: 1,
            noteVersion: args.verifiedReceipt.verifiedPublicInputs.noteVersion,
            nullifier: args.verifiedReceipt.verifiedPublicInputs.provingInputNullifier,
            proofFieldCount: args.verifiedReceipt.proofFieldCount,
            proofId,
            proofVersion: args.verifiedReceipt.proofVersion,
            provingHashLane: args.verifiedReceipt.provingHashLane,
            publicInputCount: args.verifiedReceipt.publicInputCount,
            releaseDestination: null,
            root,
            verified: true,
          },
        },
        version: 1,
      },
      null,
      2,
    )}\n`,
  );

  return { proofId, proofStorePath, root, rootStorePath };
}

export function startStrictNoWitnessSendOperator(args) {
  const port = args.port ?? 10950 + Math.floor(Math.random() * 120);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
      SOLANA_RPC_URL: "https://solana-rpc.publicnode.com",
      SOLANA_WS_URL: "wss://solana-rpc.publicnode.com",
      VANTA_MAINNET_TOKEN_MINT:
        process.env.VANTA_MAINNET_TOKEN_MINT ??
        "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
      VANTA_MAINNET_VAULT_OWNER:
        process.env.VANTA_MAINNET_VAULT_OWNER ??
        "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
      VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(args.tempRoot, "consumes.json"),
      VANTA_PRIVATE_CORE_OPERATOR_WITNESS_MODE: "strict-no-witness",
      VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(args.tempRoot, "proofs.json"),
      VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(args.tempRoot, "private-core-releases.json"),
      VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(args.tempRoot, "roots.json"),
      VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(args.tempRoot, "send-proofs.json"),
      VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(args.tempRoot, "sends.json"),
      VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(args.tempRoot, "swap-proofs.json"),
      VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(args.tempRoot, "swaps.json"),
      VANTA_RELEASE_RECORD_STORE_PATH: join(args.tempRoot, "releases.json"),
      VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(args.tempRoot, "sol-unshields.json"),
      VANTA_SWAP_RECORD_STORE_PATH: join(args.tempRoot, "swap-records.json"),
      VANTA_UNSHIELD_OPERATOR_PORT: String(port),
      VITE_SOLANA_BROWSER_RPC_URL: "https://solana-rpc.publicnode.com",
      VITE_SOLANA_BROWSER_WS_URL: "wss://solana-rpc.publicnode.com",
      VITE_SOLANA_READ_RPC_FALLBACK_URLS: "",
      VITE_SOLANA_RPC_URL: "https://solana-rpc.publicnode.com",
      VITE_SOLANA_WS_URL: "wss://solana-rpc.publicnode.com",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return { baseUrl, port, server, stderr: () => stderr };
}

export async function stopOperator(server) {
  if (server.exitCode !== null) {
    return;
  }

  await new Promise((resolvePromise) => {
    server.once("close", resolvePromise);
    server.kill("SIGTERM");
    setTimeout(resolvePromise, 1000);
  });
}

export async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/state/private-core-summary`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the operator is listening.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error("strict no-witness Send operator did not become ready in time.");
}

export async function requestJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const text = await response.text();
  let parsedBody = null;
  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = null;
  }

  return {
    body: parsedBody,
    ok: response.ok,
    status: response.status,
    text,
  };
}

export function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}
