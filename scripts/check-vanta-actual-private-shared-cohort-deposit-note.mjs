import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const sourcePath = resolve(repoRoot, "src/mainnet/actualPrivateSharedCohortDepositNote.mjs");
const printPath = resolve(repoRoot, "scripts/print-vanta-actual-private-shared-cohort-deposit-note.mjs");
const source = readFileSync(sourcePath, "utf8");

const statusRun = spawnSync("node", [printPath], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_PRIVATE_POOL_V2_INDEXER_URL: "",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: "",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF: "",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_NOTE_SECRET_REF: "",
  },
});

assert.equal(statusRun.status, 0, statusRun.stderr || statusRun.stdout);
const status = JSON.parse(statusRun.stdout);

assert.equal(status.version, "vanta-actual-private-shared-cohort-deposit-note-0.1");
assert.equal(status.mode, "status");
assert.equal(status.readyToRecord, false);
assert.equal(status.recorded, false);
assert.equal(status.safety.movesFunds, false);
assert.equal(status.safety.signsTransactions, false);
assert.equal(status.safety.submitsSolanaTransactions, false);
assert.equal(status.safety.mutatesProductionIndexer, false);
assert.equal(status.safety.printsAuthToken, false);
assert.equal(status.safety.printsNoteSecret, false);
assert.equal(status.safety.printsPrivateKeys, false);
assert.ok(status.blockers.includes("missing-solana-shared-cohort-deposit-tx-ref"));
assert.ok(status.blockers.includes("missing-owner-public-key-ref"));
assert.ok(status.blockers.includes("missing-note-secret-ref-or-generate-secret-mode"));

const readyRun = spawnSync("node", [printPath, "--generate-secret"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF:
      "5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF:
      "solana-tx:3gPUq9uapuP4HaP9J6b82KwuTupy5MZGqmsAkv2syF1YWVg4PLzF4tQiR1RdFUbjPvs4CKpTFn5vY9xpuZzdzA9o",
    VANTA_PRIVATE_POOL_V2_INDEXER_URL: "",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: "",
  },
});

assert.equal(readyRun.status, 0, readyRun.stderr || readyRun.stdout);
const ready = JSON.parse(readyRun.stdout);
assert.equal(ready.readyToRecord, true);
assert.equal(ready.recorded, false);
assert.equal(ready.publicInputs.commitmentPresent, true);
assert.match(ready.publicInputs.commitmentRef, /^commitment:0x[0-9a-f]{64}$/);
assert.equal(ready.privateNote.noteSecretPresent, true);
assert.equal(ready.privateNote.privateNotePathWritten, false);
assert.ok(!readyRun.stdout.includes("note-secret:"), "Status output must not print note secrets.");

const recordWithoutAckRun = spawnSync("node", [printPath, "--record", "--generate-secret"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF:
      "5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF:
      "solana-tx:3gPUq9uapuP4HaP9J6b82KwuTupy5MZGqmsAkv2syF1YWVg4PLzF4tQiR1RdFUbjPvs4CKpTFn5vY9xpuZzdzA9o",
    VANTA_PRIVATE_POOL_V2_INDEXER_URL: "https://indexer.example.invalid",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN: "redacted-test-token",
    VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_RECORD_ACK: "",
  },
});
assert.equal(recordWithoutAckRun.status, 0, recordWithoutAckRun.stderr || recordWithoutAckRun.stdout);
const recordWithoutAck = JSON.parse(recordWithoutAckRun.stdout);
assert.equal(recordWithoutAck.recorded, false);
assert.ok(recordWithoutAck.blockers.includes("missing-production-indexer-record-ack"));
assert.equal(recordWithoutAck.safety.mutatesProductionIndexer, true);

for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "signedTransaction",
  "sendRawTransaction",
  "note-secret:",
  "redacted-test-token",
]) {
  assert.ok(!statusRun.stdout.includes(forbidden), `Status output must not contain ${forbidden}.`);
  assert.ok(!readyRun.stdout.includes(forbidden), `Ready output must not contain ${forbidden}.`);
  assert.ok(!recordWithoutAckRun.stdout.includes(forbidden), `Record output must not contain ${forbidden}.`);
}

for (const forbiddenSourceTerm of [
  "sendRawTransaction",
  "sendAndConfirmTransaction",
  "Keypair.fromSecretKey",
  "secretKey",
  "mnemonic",
]) {
  assert.ok(!source.includes(forbiddenSourceTerm), `Source must not contain ${forbiddenSourceTerm}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-shared-cohort-deposit-note"],
  "node scripts/print-vanta-actual-private-shared-cohort-deposit-note.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-shared-cohort-deposit-note-check"],
  "node scripts/check-vanta-actual-private-shared-cohort-deposit-note.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes(
    "npm run mainnet:actual-private-shared-cohort-deposit-note-check",
  ),
  "mainnet:preflight must include shared-cohort deposit note check.",
);

console.log("Vanta actual-private shared-cohort deposit note check: PASS");
