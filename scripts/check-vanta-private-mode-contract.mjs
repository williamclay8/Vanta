import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const typesSource = read("src/privateVault/privateVaultTypes.ts");
const cryptoSource = read("src/privateVault/privateVaultCrypto.ts");
const storageSource = read("src/privateVault/privateVaultStorage.ts");
const recoverySource = read("src/privateVault/privateVaultRecovery.ts");

assert.match(typesSource, /export type PrivateVaultRecord = \{/u);
assert.match(typesSource, /export type ActiveWalletTopology = \{/u);
assert.match(typesSource, /export type PrivateVaultSessionState = \{/u);
assert.match(cryptoSource, /crypto_unavailable/u);
assert.match(cryptoSource, /encrypt_failed/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_VERSION/u);
assert.match(cryptoSource, /PRIVATE_VAULT_PAYLOAD_SCHEME/u);
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
assert.doesNotMatch(storageSource, /window\.localStorage/u);

console.log("vanta private mode contract check: PASS");
