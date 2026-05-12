import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { poseidon1, poseidon2 } from "poseidon-lite";

const repoRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(repoRoot, "src/zk/ownerKeyHierarchy.ts");
const viewingKeySourcePath = resolve(repoRoot, "src/solana/vantaShieldViewingKey.ts");
const liveShieldBridgePath = resolve(repoRoot, "src/zk/liveShieldBridge.ts");
const liveSendBridgePath = resolve(repoRoot, "src/zk/liveSendBridge.ts");
const liveSwapBridgePath = resolve(repoRoot, "src/zk/liveSwapBridge.ts");
const walletMessageIntentPath = resolve(repoRoot, "src/wallet/walletMessageIntentSafety.mjs");
const packagePath = resolve(repoRoot, "package.json");
const bn254ScalarField =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

async function loadOwnerKeyHierarchyModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/owner-key-hierarchy-contract-check-"));
  const outputPath = join(tempRoot, "ownerKeyHierarchy.mjs");

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        sourcePath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        "--target=es2022",
        `--outfile=${outputPath}`,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
      module: await import(pathToFileURL(outputPath).href),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function bytesToBigInt(bytes) {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value;
}

function hexToBytes(value) {
  const normalized = value.replace(/^0x/u, "");
  return Uint8Array.from({ length: normalized.length / 2 }, (_, index) =>
    Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16),
  );
}

function fieldToHex(value) {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function hashField(value) {
  return bytesToBigInt(createHash("sha256").update(value).digest()) % bn254ScalarField;
}

function assertHex32(value, label, withPrefix = true) {
  const pattern = withPrefix ? /^0x[0-9a-f]{64}$/u : /^[0-9a-f]{64}$/u;
  assert.match(value, pattern, `${label} must be a 32-byte lowercase hex string.`);
}

const source = readFileSync(sourcePath, "utf8");
const viewingKeySource = readFileSync(viewingKeySourcePath, "utf8");
const liveShieldBridgeSource = readFileSync(liveShieldBridgePath, "utf8");
const liveSendBridgeSource = readFileSync(liveSendBridgePath, "utf8");
const liveSwapBridgeSource = readFileSync(liveSwapBridgePath, "utf8");
const walletMessageIntentSource = readFileSync(walletMessageIntentPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert.ok(
  source.includes("deriveVantaShieldOwnerKeyHierarchyFromMasterSeed"),
  "ownerKeyHierarchy.ts must expose the deterministic derivation contract.",
);
assert.ok(
  source.includes("createWalletDerivedCanonicalNoteOwnerContext"),
  "ownerKeyHierarchy.ts must expose a CanonicalNoteOwnerContext adapter.",
);
assert.ok(
  source.includes("VANTA_SHIELD_MASTER_SEED_WALLET_MESSAGE"),
  "ownerKeyHierarchy.ts must define the future wallet-message seed domain without using it at runtime.",
);
assert.ok(
  source.includes("poseidon1([spendingSecretField])") &&
    source.includes("poseidon2([spendingPublicKeyField, viewingPublicKeyField])"),
  "owner key hierarchy must derive Poseidon spending and owner public-key fields.",
);
assert.ok(
  source.includes("deriveVantaShieldViewingKeypairFromSecretKey"),
  "owner key hierarchy must reuse the Shield viewing-key keypair contract.",
);
assert.ok(
  viewingKeySource.includes("deriveVantaShieldViewingKeypairFromSecretKey"),
  "vantaShieldViewingKey.ts must expose deterministic keypair derivation from a secret key.",
);
assert.ok(
  liveShieldBridgeSource.includes("ownerContext: CanonicalNoteOwnerContext") &&
    liveSendBridgeSource.includes("ownerContext: CanonicalNoteOwnerContext") &&
    liveSwapBridgeSource.includes("ownerContext: CanonicalNoteOwnerContext"),
  "Live Shield/Send/Swap bridge records must require an explicit wallet-derived owner context.",
);
for (const [label, bridgeSource] of [
  ["Shield", liveShieldBridgeSource],
  ["Send", liveSendBridgeSource],
  ["Swap", liveSwapBridgeSource],
]) {
  assert.ok(
    !bridgeSource.includes("randomHex32()") && !bridgeSource.includes("function randomHex32"),
    `Live ${label} bridge records must not mint unrecoverable random owner recovery secrets.`,
  );
}
assert.ok(
  readRepoFile("src/solana/useVantaShieldOwnerContext.ts").includes(
    "deriveShieldMasterSeedWithSafety",
  ),
  "Live owner-context adoption must use the Shield key-derivation safety envelope.",
);
for (const marker of [
  "redactLiveShieldRecordForPersistence",
  "redactedOwnerContext",
  "recoverySecretReferenceHash",
  "redactLiveShieldOwnerContextForPersistence",
]) {
  assert.ok(
    liveShieldBridgeSource.includes(marker),
    `Live Shield persistence must redact wallet-derived owner recovery material before browser storage: ${marker}`,
  );
}
assert.ok(
  !liveShieldBridgeSource.includes("const nextRecords = [...listCanonicalShieldRecords(), record]"),
  "Live Shield persistence must not persist the raw in-memory record with ownerContext.recoverySecret.",
);
assert.ok(
  !walletMessageIntentSource.includes('"shield-master-seed"') &&
    !walletMessageIntentSource.includes('"shield-owner-key-hierarchy"'),
  "Existing short-lived wallet action intents must not accept Shield master-seed derivation.",
);
assert.equal(
  packageJson.scripts["zk:owner-key-hierarchy-contract-check"],
  "node scripts/check-vanta-owner-key-hierarchy-contract.mjs",
  "package.json must expose zk:owner-key-hierarchy-contract-check.",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"]?.includes(
    "npm run zk:owner-key-hierarchy-contract-check",
  ),
  "zk:review-guards-check must include the owner key hierarchy contract check.",
);

const { module: ownerKeyHierarchy, cleanup } = await loadOwnerKeyHierarchyModule();
const walletMessageIntent = await import(pathToFileURL(walletMessageIntentPath).href);

try {
  const masterSeed = `0x${"11".repeat(32)}`;
  const context = {
    appDomain: "vanta",
    cluster: "mainnet-beta",
    walletAddress: "VantaWallet111111111111111111111111111111111",
  };
  const hierarchy =
    ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
      context,
      masterSeed,
    });
  const repeated =
    ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
      context,
      masterSeed,
    });
  const otherWallet =
    ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
      context: {
        ...context,
        walletAddress: "VantaWallet222222222222222222222222222222222",
      },
      masterSeed,
    });
  const otherCluster =
    ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
      context: { ...context, cluster: "devnet" },
      masterSeed,
    });

  assert.deepEqual(hierarchy, repeated, "owner hierarchy derivation must be deterministic.");
  assert.notEqual(
    hierarchy.ownerPublicKey,
    otherWallet.ownerPublicKey,
    "owner public key must be wallet-address scoped.",
  );
  assert.notEqual(
    hierarchy.ownerPublicKey,
    otherCluster.ownerPublicKey,
    "owner public key must be cluster scoped.",
  );

  assert.equal(
    hierarchy.version,
    "vanta-shield-owner-key-hierarchy-0.1",
    "owner hierarchy version must be explicit.",
  );
  assert.deepEqual(hierarchy.context, {
    ...context,
    hierarchyVersion: "vanta-shield-owner-key-hierarchy-0.1",
  });
  assertHex32(hierarchy.recoverySecret, "recoverySecret");
  assertHex32(hierarchy.spendingSecret, "spendingSecret");
  assertHex32(hierarchy.spendingPublicKey, "spendingPublicKey");
  assertHex32(hierarchy.ownerPublicKey, "ownerPublicKey");
  assertHex32(hierarchy.viewingSecretKey, "viewingSecretKey", false);
  assertHex32(hierarchy.viewingPublicKey, "viewingPublicKey", false);
  assert.equal(hierarchy.viewingKeypair.secretKey, hierarchy.viewingSecretKey);
  assert.equal(hierarchy.viewingKeypair.publicKey, hierarchy.viewingPublicKey);

  const spendingSecretField = bytesToBigInt(hexToBytes(hierarchy.spendingSecret)) % bn254ScalarField;
  const spendingPublicKeyField = poseidon1([spendingSecretField]);
  const viewingPublicKeyField = bytesToBigInt(hexToBytes(hierarchy.viewingPublicKey)) % bn254ScalarField;
  const ownerPublicKeyField = poseidon2([spendingPublicKeyField, viewingPublicKeyField]);
  assert.equal(hierarchy.spendingSecretField, spendingSecretField.toString(10));
  assert.equal(hierarchy.spendingPublicKeyField, spendingPublicKeyField.toString(10));
  assert.equal(hierarchy.spendingPublicKey, fieldToHex(spendingPublicKeyField));
  assert.equal(hierarchy.viewingPublicKeyField, viewingPublicKeyField.toString(10));
  assert.equal(hierarchy.ownerPublicKeyField, ownerPublicKeyField.toString(10));
  assert.equal(hierarchy.ownerPublicKey, fieldToHex(ownerPublicKeyField));
  assert.notEqual(
    hierarchy.ownerPublicKeyField,
    hashField(context.walletAddress).toString(10),
    "owner public key field must not be the raw wallet-address hash.",
  );

  const ownerContext = ownerKeyHierarchy.createWalletDerivedCanonicalNoteOwnerContext({
    context,
    masterSeed,
  });
  assert.deepEqual(ownerContext, {
    derivationContext: hierarchy.derivationContext,
    ownerPublicKey: hierarchy.ownerPublicKey,
    recoverySecret: hierarchy.recoverySecret,
  });
  assert.match(
    ownerContext.derivationContext,
    /^owner-key-hierarchy:vanta-shield-owner-key-hierarchy-0\.1:vanta:mainnet-beta:VantaWallet/u,
    "owner context must preserve the hierarchy derivation scope.",
  );

  assert.throws(
    () =>
      ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
        context,
        masterSeed: "0x1234",
      }),
    /32-byte hex master seed/u,
    "short master seeds must fail closed.",
  );
  assert.throws(
    () =>
      ownerKeyHierarchy.deriveVantaShieldOwnerKeyHierarchyFromMasterSeed({
        context: { ...context, walletAddress: " " },
        masterSeed,
      }),
    /walletAddress/u,
    "blank wallet addresses must fail closed.",
  );
  assert.throws(
    () =>
      walletMessageIntent.createWalletMessageIntentSafetySummary({
        amount: "0",
        asset: "owner-key-hierarchy",
        connectedWalletAddress: context.walletAddress,
        expiresAt: Date.now() + 300_000,
        humanApprovedSummary: true,
        intentKind: "shield-master-seed",
        issuedAt: Date.now(),
        message: ownerKeyHierarchy.VANTA_SHIELD_MASTER_SEED_WALLET_MESSAGE,
        owner: context.walletAddress,
        recipient: "local-owner-key-hierarchy",
        requestId: "seed-derivation-fixture",
        requester: context.walletAddress,
      }),
    /unsupported intentKind/u,
    "current action-intent safety must not accept Shield master-seed derivation.",
  );
} finally {
  cleanup();
}

console.log("Vanta owner key hierarchy contract: PASS");
