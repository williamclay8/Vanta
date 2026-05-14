import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const packageJson = JSON.parse(read("package.json"));
const typesSource = read("src/privateVault/privateVaultTypes.ts");
const cryptoSource = read("src/privateVault/privateVaultCrypto.ts");
const storageSource = read("src/privateVault/privateVaultStorage.ts");
const recoverySource = read("src/privateVault/privateVaultRecovery.ts");
const contextSource = read("src/data/context/PrivateVaultContext.tsx");
const appSource = read("src/App.tsx");
const productAppRootSource = read("src/ProductAppRoot.tsx");

assert.match(typesSource, /export type PrivateVaultRecord = \{/u);
assert.match(typesSource, /export type ActiveWalletTopology = \{/u);
assert.match(typesSource, /export type PrivateVaultSessionState = \{/u);
assert.match(cryptoSource, /crypto_unavailable/u);
assert.match(cryptoSource, /encrypt_failed/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_VERSION/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_SCHEME/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_SCHEME_V1/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_SCHEME_V2/u);
assert.match(cryptoSource, /argon2id-aes-gcm-sha256\.v3/u);
assert.match(cryptoSource, /pbkdf2-aes-gcm-sha256\.v2/u);
assert.match(cryptoSource, /pbkdf2-aes-gcm-sha256\.v1/u);
assert.match(cryptoSource, /PRIVATE_VAULT_ARGON2ID_MEMORY_KIB = 65_536/u);
assert.match(cryptoSource, /PRIVATE_VAULT_ARGON2ID_TIME_COST = 3/u);
assert.match(cryptoSource, /PRIVATE_VAULT_ARGON2ID_PARALLELISM = 1/u);
assert.match(cryptoSource, /PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES = 32/u);
assert.match(cryptoSource, /derivePrivateVaultArgon2idKey/u);
assert.match(cryptoSource, /PRIVATE_VAULT_KDF_ITERATIONS = 600_000/u);
assert.match(cryptoSource, /PRIVATE_VAULT_LEGACY_KDF_ITERATIONS = 120_000/u);
assert.match(cryptoSource, /argon2id: privateVaultArgon2idParameters\(\)/u);
assert.match(cryptoSource, /resolvePrivateVaultKdfIterations/u);
assert.match(cryptoSource, /hasValidKdfIterations/u);
assert.doesNotMatch(cryptoSource, /iterations:\s*120_000/u);
assert.match(cryptoSource, /export async function encryptPrivateVaultPayload/u);
assert.match(cryptoSource, /export async function decryptPrivateVaultPayload/u);
assert.match(cryptoSource, /PrivateVaultCryptoError/u);
assert.match(cryptoSource, /parsePrivateVaultPayloadEnvelope/u);
assert.match(storageSource, /export type PrivateVaultStorageSaveResult/u);
assert.match(storageSource, /export type PrivateVaultStorageLoadResult/u);
assert.match(storageSource, /kind: "saved"/u);
assert.match(storageSource, /kind: "success"/u);
assert.match(storageSource, /safeGetPrivateVaultStorage/u);
assert.match(storageSource, /safeParsePrivateVaultRecord/u);
assert.match(storageSource, /isPrivateVaultRecord/u);
assert.match(storageSource, /PRIVATE_VAULT_STORAGE_KEY/u);
assert.match(storageSource, /savePrivateVaultRecord/u);
assert.match(storageSource, /loadPrivateVaultRecord/u);
assert.match(recoverySource, /PRIVATE_VAULT_RECOVERY_FILE_VERSION/u);
assert.match(recoverySource, /export type PrivateVaultRecoveryFile/u);
assert.match(recoverySource, /parsePrivateVaultRecoveryFile/u);
assert.match(recoverySource, /isPrivateVaultRecoveryFile/u);
assert.match(recoverySource, /export function createPrivateVaultRecoveryFile/u);
assert.match(contextSource, /export function PrivateVaultProvider/u);
assert.match(contextSource, /export function usePrivateVaultState/u);
assert.match(contextSource, /enablePrivateMode/u);
assert.match(contextSource, /createPrivateVault/u);
assert.match(contextSource, /downloadPrivateVaultRecoveryFile/u);
assert.match(contextSource, /activeWalletTopology/u);
assert.match(appSource, /<ProductAppRoot/u);
assert.match(productAppRootSource, /<PrivateVaultProvider>/u);
assert.doesNotMatch(storageSource, /window\.localStorage/u);
assert.equal(
  packageJson.scripts["private-mode:contract-check"],
  "node scripts/check-vanta-private-mode-contract.mjs",
  "package.json must expose private-mode:contract-check.",
);
assert.equal(
  packageJson.scripts["private-vault:crypto-check"],
  "node scripts/check-vanta-private-mode-contract.mjs",
  "package.json must expose private-vault:crypto-check.",
);

const privateVaultCryptoModule = await loadPrivateVaultCryptoModule();
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_KDF_ITERATIONS, 600_000);
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_LEGACY_KDF_ITERATIONS, 120_000);
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_ARGON2ID_MEMORY_KIB, 65_536);
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_ARGON2ID_TIME_COST, 3);
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_ARGON2ID_PARALLELISM, 1);
assert.equal(privateVaultCryptoModule.PRIVATE_VAULT_ARGON2ID_DERIVED_KEY_BYTES, 32);
assert.equal(
  privateVaultCryptoModule.PRIVATE_VAULT_PAYLOAD_SCHEME,
  "argon2id-aes-gcm-sha256.v3",
);
assert.equal(
  privateVaultCryptoModule.PRIVATE_VAULT_PAYLOAD_SCHEME_V2,
  "pbkdf2-aes-gcm-sha256.v2",
);

const privateVaultPassword = "correct horse battery staple";
const encrypted = await privateVaultCryptoModule.encryptPrivateVaultPayload(
  "private vault fixture",
  privateVaultPassword,
);
const encryptedEnvelope = JSON.parse(encrypted);
assert.equal(encryptedEnvelope.encryptionScheme, "argon2id-aes-gcm-sha256.v3");
assert.equal(encryptedEnvelope.argon2id?.memoryKiB, 65_536);
assert.equal(encryptedEnvelope.argon2id?.timeCost, 3);
assert.equal(encryptedEnvelope.argon2id?.parallelism, 1);
assert.equal(encryptedEnvelope.argon2id?.derivedKeyBytes, 32);
assert.equal(encryptedEnvelope.argon2id?.version, 19);
assert.equal(encryptedEnvelope.kdfIterations, undefined);
assert.equal(
  await privateVaultCryptoModule.decryptPrivateVaultPayload(encrypted, privateVaultPassword),
  "private vault fixture",
);

const pbkdf2V2Encrypted = await encryptPbkdf2PrivateVaultPayload(
  "pbkdf2 v2 private vault fixture",
  privateVaultPassword,
  {
    encryptionScheme: "pbkdf2-aes-gcm-sha256.v2",
    kdfIterations: 600_000,
  },
);
assert.equal(
  await privateVaultCryptoModule.decryptPrivateVaultPayload(
    pbkdf2V2Encrypted,
    privateVaultPassword,
  ),
  "pbkdf2 v2 private vault fixture",
);

const legacyEncryptedWithoutIterations = await encryptLegacyPrivateVaultPayload(
  "legacy private vault fixture",
  privateVaultPassword,
);
assert.equal(
  await privateVaultCryptoModule.decryptPrivateVaultPayload(
    legacyEncryptedWithoutIterations,
    privateVaultPassword,
  ),
  "legacy private vault fixture",
);

const legacyEncryptedWithIterations = await encryptLegacyPrivateVaultPayload(
  "legacy private vault explicit iteration fixture",
  privateVaultPassword,
  { kdfIterations: 120_000 },
);
assert.equal(
  await privateVaultCryptoModule.decryptPrivateVaultPayload(
    legacyEncryptedWithIterations,
    privateVaultPassword,
  ),
  "legacy private vault explicit iteration fixture",
);

await assert.rejects(
  privateVaultCryptoModule.decryptPrivateVaultPayload(
    JSON.stringify({
      ...encryptedEnvelope,
      kdfIterations: 120_000,
    }),
    privateVaultPassword,
  ),
  /invalid|decrypt/i,
);
await assert.rejects(
  privateVaultCryptoModule.decryptPrivateVaultPayload(
    JSON.stringify({
      ...encryptedEnvelope,
      argon2id: undefined,
    }),
    privateVaultPassword,
  ),
  /invalid|decrypt/i,
);
await assert.rejects(
  privateVaultCryptoModule.decryptPrivateVaultPayload(
    await encryptLegacyPrivateVaultPayload(
      "legacy private vault bad iteration fixture",
      privateVaultPassword,
      { kdfIterations: 600_000 },
    ),
    privateVaultPassword,
  ),
  /invalid|decrypt/i,
);
await assert.rejects(
  privateVaultCryptoModule.decryptPrivateVaultPayload(encrypted, "wrong password"),
  (error) => error?.code === "decrypt_failed",
);

console.log("vanta private mode contract check: PASS");

async function loadPrivateVaultCryptoModule() {
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-vault-crypto-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(join(tempTsDir, "src/privateVault"), { recursive: true });
    writeFileSync(
      join(tempTsDir, "src/privateVault/privateVaultCrypto.ts"),
      cryptoSource,
    );

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "src/privateVault/privateVaultCrypto.ts"),
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

    return await import(
      pathToFileURL(join(tempJsDir, "src/privateVault/privateVaultCrypto.js")).href
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function encryptLegacyPrivateVaultPayload(payload, password, options = {}) {
  return encryptPbkdf2PrivateVaultPayload(payload, password, {
    encryptionScheme: "pbkdf2-aes-gcm-sha256.v1",
    kdfIterations: options.kdfIterations,
  });
}

async function encryptPbkdf2PrivateVaultPayload(payload, password, options = {}) {
  const cryptoApi = globalThis.crypto;
  assert.ok(cryptoApi?.subtle, "WebCrypto must be available for the private vault check.");

  const encoder = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: options.kdfIterations ?? 120_000,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(payload),
  );

  const envelope = {
    envelopeVersion: "vanta.privateVault.payload.v1",
    encryptionScheme: options.encryptionScheme,
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
  };

  if (options.kdfIterations !== undefined) {
    envelope.kdfIterations = options.kdfIterations;
  }

  return JSON.stringify(envelope);
}
