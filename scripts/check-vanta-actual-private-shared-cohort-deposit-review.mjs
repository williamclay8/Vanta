import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packagePath = resolve(repoRoot, "package.json");
const scriptPath = resolve(repoRoot, "scripts/print-vanta-actual-private-shared-cohort-deposit-review.mjs");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const source = readFileSync(scriptPath, "utf8");

const run = spawnSync("node", [scriptPath], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(run.stdout);

assert.equal(report.version, "vanta-actual-private-shared-cohort-deposit-review-0.1");
assert.equal(report.activePrivacyRailId, "vanta-private-pool-v2");
assert.equal(report.mainnetReady, false);
assert.equal(report.productionReady, false);
assert.equal(report.privacyClaimAllowed, false);
assert.equal(report.movesFunds, false);
assert.equal(report.submitsTransaction, false);
assert.equal(report.mutatesProduction, false);
assert.equal(report.requiredRefShape, "solana-tx:<shared-cohort-deposit-mainnet-signature>");
assert.equal(report.sharedCohortDepositTxRef, "review:shared-cohort-deposit-ref-not-yet-solscan-final-reviewed-2055-2220");
assert.equal(report.currentState, "placeholder-review-ref");
assert.equal(report.promotionSatisfied, false);
assert.deepEqual(report.blockedBy, ["shared-cohort-deposit-transaction"]);
assert.equal(report.settlementCurrentStatus, "mainnet-spend-program-evidence-observed-reviewed-blocked");
assert.equal(report.settlementReviewStatus, "reviewed-blocked");
assert.equal(report.publicMainnetRefs.network, "mainnet-beta");
assert.equal(report.publicMainnetRefs.programId, "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm");
assert.equal(report.publicMainnetRefs.outputQueue, "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ");
assert.match(report.publicMainnetRefs.spendEvidenceTxRef, /^solana-tx:[1-9A-HJ-NP-Za-km-z]{32,88}$/);
assert.ok(
  report.requiredChecksAfterRealDeposit.includes("deposit transaction appends into the named shared cohort/output queue"),
  "Shared-cohort review must require append/output queue review.",
);
assert.ok(
  report.nextAction.includes("fresh bounded approval window"),
  "Shared-cohort review must preserve real-funds approval boundary.",
);
assert.ok(report.safety.includes("No auth token values"), "Shared-cohort review must state the no-secret policy.");

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
  "raw customer private inputs:",
]) {
  assert.ok(!run.stdout.includes(forbidden), `Shared-cohort review output must not contain ${forbidden}.`);
}

for (const forbiddenSourceTerm of ["sendRawTransaction", "sendAndConfirmTransaction", "Keypair.fromSecretKey"]) {
  assert.ok(!source.includes(forbiddenSourceTerm), `Shared-cohort review source must not contain ${forbiddenSourceTerm}.`);
}

for (const requiredSourceTerm of [
  "shared-cohort-deposit-transaction",
  "solana-tx:<shared-cohort-deposit-mainnet-signature>",
  "movesFunds: false",
  "submitsTransaction: false",
  "mutatesProduction: false",
  "fresh bounded approval",
]) {
  assert.ok(source.includes(requiredSourceTerm), `Shared-cohort review source must include ${requiredSourceTerm}.`);
}

assert.equal(
  packageJson.scripts["mainnet:actual-private-shared-cohort-deposit-review"],
  "node scripts/print-vanta-actual-private-shared-cohort-deposit-review.mjs",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-shared-cohort-deposit-review-check"],
  "node scripts/check-vanta-actual-private-shared-cohort-deposit-review.mjs",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes(
    "npm run mainnet:actual-private-shared-cohort-deposit-review-check",
  ),
  "mainnet:preflight must include actual-private shared-cohort deposit review check.",
);

console.log("Vanta actual-private shared-cohort deposit review check: PASS");
