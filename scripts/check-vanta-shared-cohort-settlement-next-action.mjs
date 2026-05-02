import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["mainnet:shared-cohort-next-action"],
  "node scripts/print-vanta-shared-cohort-settlement-next-action.mjs",
  "package.json must expose mainnet:shared-cohort-next-action.",
);
assert.equal(
  packageJson.scripts["mainnet:shared-cohort-next-action-check"],
  "node scripts/check-vanta-shared-cohort-settlement-next-action.mjs",
  "package.json must expose mainnet:shared-cohort-next-action-check.",
);

const report = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:shared-cohort-next-action"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(report.version, "vanta-shared-cohort-settlement-next-action-0.1");
assert.equal(report.currentState.productionReady, false);
assert.equal(report.currentState.privacyClaimAllowed, false);
assert.equal(report.currentState.sharedCohortDepositReady, false);
assert.equal(
  report.purpose.includes("does not approve funds, submit transactions, or write evidence"),
  true,
  "Shared cohort next-action helper must be non-mutating.",
);

const steps = new Map(report.requiredOperatorSequence.map((step) => [step.step, step]));
assert.equal(steps.get(1).command, "npm run mainnet:real-funds-approval-preview");
assert.equal(steps.get(1).writeCommand, "npm run mainnet:real-funds-approval-write");
assert.ok(steps.get(1).requiredRefs.includes("VANTA_MAINNET_APPROVAL_LAUNCH_WINDOW_REF"));
assert.equal(steps.get(2).command, "npm run mainnet:preflight");
assert.equal(steps.get(2).liveCommand, "npm run mainnet:actual-private-settlement-live -- --execute");
assert.ok(
  steps
    .get(2)
    .requiredAcks.includes(
      "VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK=I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS",
    ),
);
assert.ok(
  steps
    .get(3)
    .requiredRefs.includes(
      "VANTA_ACTUAL_PRIVATE_SHARED_COHORT_DEPOSIT_TX_REF=solana-tx:<shared-cohort-deposit-mainnet-signature>",
    ),
);
assert.ok(steps.get(4).commands.includes("npm run mainnet:actual-private-settlement-lineage-check"));
assert.ok(Array.isArray(report.hardBlockerRefs), "Shared cohort next-action report must include hard blocker refs.");
assert.ok(
  report.hardBlockerRefs.some((blocker) => blocker.id === "shared-cohort-deposit-transaction"),
  "Shared cohort next-action report must surface the shared-cohort-deposit-transaction blocker.",
);
assert.ok(report.forbiddenUntilComplete.includes("production-private claim"));
assert.ok(report.safety.includes("No private keys"));
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:shared-cohort-next-action-check"),
  "mainnet:preflight must include shared-cohort next-action check.",
);

const serialized = JSON.stringify(report);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "signedTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Shared cohort next-action report must not leak ${forbidden}.`);
}

console.log("Vanta shared cohort settlement next-action check: PASS");
