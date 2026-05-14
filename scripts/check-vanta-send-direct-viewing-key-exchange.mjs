import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const viewingKeySourcePath = resolve(repoRoot, "src/solana/vantaShieldViewingKey.ts");
const exchangeSourcePath = resolve(repoRoot, "src/solana/vantaRecipientViewingKeyExchange.ts");
const recipientFieldPath = resolve(repoRoot, "src/components/RecipientField.tsx");
const sendPagePath = resolve(repoRoot, "src/pages/SendPage.tsx");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(existsSync(viewingKeySourcePath), "Viewing-key crypto helper must exist.");
assert.ok(existsSync(exchangeSourcePath), "Direct viewing-key exchange registry helper must exist.");

const viewingKeySource = readFileSync(viewingKeySourcePath, "utf8");
const exchangeSource = readFileSync(exchangeSourcePath, "utf8");
const recipientFieldSource = readFileSync(recipientFieldPath, "utf8");
const sendPageSource = readFileSync(sendPagePath, "utf8");

for (const marker of [
  "VANTA_SHIELD_RECIPIENT_VIEWING_KEY_EXCHANGE_VERSION",
  "vanta-shield-recipient-viewing-key-exchange-0.1",
  "createVantaShieldRecipientViewingKeyExchangePacket",
  "importVantaShieldRecipientViewingKeyExchangePacket",
  "direct-viewing-key-exchange-local-only-not-production-recipient-discovery",
  "productionReady: false",
]) {
  assert.ok(viewingKeySource.includes(marker), `Viewing-key exchange source missing ${marker}.`);
}

for (const forbidden of ["seedPhrase", "walletPrivateKey", "privateInputs", "witness"]) {
  assert.ok(
    viewingKeySource.includes(forbidden),
    `Viewing-key exchange source must reject forbidden field ${forbidden}.`,
  );
}

for (const marker of [
  "VANTA_RECIPIENT_VIEWING_KEY_EXCHANGE_STORAGE_KEY",
  "vanta.recipient-viewing-key-exchange.v1",
  "upsertVantaRecipientViewingKeyExchangePacket",
  "findVantaRecipientViewingKeyExchangePacket",
  "listVantaRecipientViewingKeyExchangePackets",
  "direct-key beta",
  "productionReady === false",
]) {
  assert.ok(exchangeSource.includes(marker), `Direct viewing-key exchange registry missing ${marker}.`);
}

for (const marker of [
  "direct-key beta",
  "not deployed recipient discovery",
]) {
  assert.ok(recipientFieldSource.includes(marker), `RecipientField copy missing ${marker}.`);
}

for (const marker of [
  "findVantaRecipientViewingKeyExchangePacket",
  "matchedRecipientViewingKeyExchange",
  "recipientViewingPublicKey",
  "direct viewing-key exchange",
]) {
  assert.ok(sendPageSource.includes(marker), `SendPage direct-key exchange marker missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["send:direct-viewing-key-exchange-check"],
  "node scripts/check-vanta-send-direct-viewing-key-exchange.mjs",
  "package.json must expose send:direct-viewing-key-exchange-check.",
);
assert.ok(
  packageJson.scripts["send:verify"]?.includes("npm run send:direct-viewing-key-exchange-check"),
  "send:verify must include send:direct-viewing-key-exchange-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run send:direct-viewing-key-exchange-check",
  ),
  "truth:privacy-claim-gate must include send:direct-viewing-key-exchange-check.",
);

const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-direct-viewing-key-exchange-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "solana/vantaShieldViewingKey.ts",
  "solana/vantaRecipientViewingKeyExchange.ts",
];

function copySource(relativePath) {
  const sourcePath = resolve(repoRoot, "src", relativePath);
  const targetPath = join(tempTsDir, relativePath);
  mkdirSync(join(targetPath, ".."), { recursive: true });
  const source = readFileSync(sourcePath, "utf8").replace(
    /from "@\/solana\/vantaShieldViewingKey"/g,
    'from "./vantaShieldViewingKey"',
  );
  writeFileSync(targetPath, source);
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "@\/([^"]+?)(?:\.js)?"/g, (_match, target) => {
      const absoluteTarget = join(tempJsDir, `${target}.js`);
      const fromDir = join(tempJsDir, relativePath, "..");
      const relPath = relative(fromDir, absoluteTarget);
      const rel = relPath.startsWith(".") ? relPath : `./${relPath}`;
      return `from "${rel}"`;
    })
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"');
  writeFileSync(filePath, source);
}

class MemoryStorage {
  store = new Map();

  getItem(key) {
    return this.store.get(key) ?? null;
  }

  removeItem(key) {
    this.store.delete(key);
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }
}

async function expectRejection(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.ok(
      message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", received "${message}".`,
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}".`);
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
      "--rootDir",
      tempTsDir,
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const viewingKeyModule = await import(
    pathToFileURL(join(tempJsDir, "solana/vantaShieldViewingKey.js")).href
  );
  const registryModule = await import(
    pathToFileURL(join(tempJsDir, "solana/vantaRecipientViewingKeyExchange.js")).href
  );

  const recipientViewingKey = viewingKeyModule.createVantaShieldViewingKeypair();
  const walletAddress = "11111111111111111111111111111111";
  const packet = viewingKeyModule.createVantaShieldRecipientViewingKeyExchangePacket({
    createdAt: 1_768_761_000_000,
    label: "Merchant desk",
    recipientWalletAddress: walletAddress,
    viewingPublicKey: recipientViewingKey.publicKey,
  });
  const packetAgain = viewingKeyModule.createVantaShieldRecipientViewingKeyExchangePacket({
    createdAt: 1_768_761_000_000,
    label: "Merchant desk",
    recipientWalletAddress: walletAddress,
    viewingPublicKey: recipientViewingKey.publicKey,
  });

  assert.equal(packet.productionReady, false);
  assert.equal(packet.scope, "direct-known-counterparty");
  assert.equal(
    packet.claimBoundary,
    "direct-viewing-key-exchange-local-only-not-production-recipient-discovery",
  );
  assert.equal(packet.fingerprint, packetAgain.fingerprint);
  assert.match(packet.fingerprint, /^rvk:[0-9a-f]{16}$/u);
  assert.equal(packet.recipientWalletAddress, walletAddress);
  assert.equal(packet.viewingPublicKey, recipientViewingKey.publicKey);
  assert.deepEqual(packet.forbiddenPlaintextFields.includes("seedPhrase"), true);

  await expectRejection(
    () =>
      viewingKeyModule.createVantaShieldRecipientViewingKeyExchangePacket({
        createdAt: 1,
        recipientWalletAddress: walletAddress,
        secretKey: recipientViewingKey.secretKey,
        viewingPublicKey: recipientViewingKey.publicKey,
      }),
    "forbidden field secretKey",
  );
  await expectRejection(
    () =>
      viewingKeyModule.createVantaShieldRecipientViewingKeyExchangePacket({
        createdAt: 1,
        recipientWalletAddress: walletAddress,
        viewingPublicKey: recipientViewingKey.publicKey,
        witness: "raw witness",
      }),
    "forbidden field witness",
  );
  await expectRejection(
    () =>
      viewingKeyModule.createVantaShieldRecipientViewingKeyExchangePacket({
        createdAt: 1,
        recipientWalletAddress: walletAddress,
        viewingPublicKey: recipientViewingKey.secretKey.slice(0, 62),
      }),
    "viewing public key",
  );

  const storage = new MemoryStorage();
  assert.deepEqual(registryModule.listVantaRecipientViewingKeyExchangePackets(storage), []);
  registryModule.upsertVantaRecipientViewingKeyExchangePacket(packet, storage);
  const imported = registryModule.findVantaRecipientViewingKeyExchangePacket(
    walletAddress,
    storage,
  );
  assert.equal(imported?.fingerprint, packet.fingerprint);
  assert.equal(imported?.productionReady, false);
  assert.equal(
    registryModule.findVantaRecipientViewingKeyExchangePacket(
      "22222222222222222222222222222222",
      storage,
    ),
    null,
  );
  registryModule.upsertVantaRecipientViewingKeyExchangePacket(
    { ...packet, label: "Updated label" },
    storage,
  );
  assert.equal(registryModule.listVantaRecipientViewingKeyExchangePackets(storage).length, 1);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Vanta Send direct viewing-key exchange check: PASS");
