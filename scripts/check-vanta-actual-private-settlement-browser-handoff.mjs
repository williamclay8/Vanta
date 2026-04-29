import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
const pageSource = readFileSync(resolve(repoRoot, "src/pages/ActualPrivateSettlementPage.tsx"), "utf8");
const handoffSource = readFileSync(
  resolve(repoRoot, "src/mainnet/actualPrivateSettlementBrowserHandoff.ts"),
  "utf8",
);
const runnerSource = readFileSync(
  resolve(repoRoot, "scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs"),
  "utf8",
);
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.ok(appSource.includes("ActualPrivateSettlementPage"));
assert.ok(appSource.includes('path="actual-private-settlement"'));
assert.ok(handoffSource.includes('"/app/actual-private-settlement"'));
assert.ok(runnerSource.includes('browserHandoffRoute: "/app/actual-private-settlement"'));

for (const required of [
  "source-wallet-safe-send-browser-session",
  "wallet-message-intent-safety-for-private-spend-authorization",
  "relayer-submitted-private-spend",
  "refs-only-evidence-writing",
  "no-private-key-cli",
  "relayer-fee-payer-not-source-wallet",
]) {
  assert.ok(handoffSource.includes(required), `Browser handoff contract missing ${required}.`);
}

for (const required of [
  "data-actual-private-settlement-route",
  "data-live-submission-enabled",
  "liveSubmissionEnabled ? \"Enabled\" : \"Preflight\"",
  "Public deposit only",
  "Relayer submitted",
  "forbidden as fee payer",
]) {
  assert.ok(pageSource.includes(required), `Browser handoff page missing ${required}.`);
}

for (const forbidden of [
  ".sendTransaction(",
  ".sendRawTransaction(",
  "sendAndConfirmTransaction",
  "VersionedTransaction",
  "Keypair.fromSecretKey",
  "bs58.decode",
]) {
  assert.ok(!pageSource.includes(forbidden), `Browser handoff page must not submit transactions: ${forbidden}`);
  assert.ok(!handoffSource.includes(forbidden), `Browser handoff contract must not submit transactions: ${forbidden}`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-browser-handoff-check"],
  "node scripts/check-vanta-actual-private-settlement-browser-handoff.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-browser-handoff-browser-check"],
  "node scripts/check-vanta-actual-private-settlement-browser-handoff-browser.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-browser-handoff-check"),
  "mainnet:preflight must include the browser handoff check.",
);

console.log("Vanta actual-private settlement browser handoff check: PASS");
