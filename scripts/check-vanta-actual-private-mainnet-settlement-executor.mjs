import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const runnerPath = resolve(repoRoot, "scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs");
const packagePath = resolve(repoRoot, "package.json");
const stopConditionPath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json");

const runnerSource = readFileSync(runnerPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const stopConditionEvidence = JSON.parse(readFileSync(stopConditionPath, "utf8"));
const approvalStatus = createVantaMainnetRealFundsApprovalStatus();

const dryRun = spawnSync("node", [runnerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: executorEnv(),
});

assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
assert.equal(dryRun.stderr, "", "Dry-run executor must emit JSON on stdout only.");

const report = JSON.parse(dryRun.stdout);

assert.equal(report.version, "vanta-actual-private-mainnet-settlement-executor-preflight-0.1");
assert.equal(report.mode, "dry-run");
assert.equal(report.movesFunds, false);
assert.equal(report.executeRequested, false);
assert.equal(report.transactionSubmissionImplemented, true);
assert.ok(Date.parse(report.checkedAt), "Dry-run report must include a parseable checkedAt timestamp.");

for (const phase of ["approval", "wallet", "services", "settlementPlan", "evidencePolicy"]) {
  assert.ok(report.phases?.[phase], `Missing executor phase ${phase}.`);
}

assert.equal(report.phases.approval.expectedActionRef, "actual-private/mainnet-settlement-evidence-run-2026-04-28");
assert.equal(report.phases.approval.actionMatchesApproval, true);
assert.equal(report.phases.approval.expectedMaximumFundsAtRisk, "0.025 SOL");
assert.equal(report.phases.approval.capMatchesApproval, true);
assert.equal(report.phases.approval.liveMainnetActionsAllowedNow, approvalStatus.liveMainnetActionsAllowedNow);
assert.equal(
  report.phases.approval.stopCondition.evidenceRef,
  "ops/mainnet/actual-private-mainnet-settlement-stop-condition.evidence.json",
);
assert.equal(report.phases.approval.stopCondition.fundsMoved, false);
if (stopConditionEvidence.approvalWindowRef === approvalStatus.approvalWindowRef) {
  assert.equal(report.phases.approval.stopCondition.appliesToCurrentApproval, true);
  assert.ok(report.finalBlocker.blockers.includes("stop-condition-already-fired-for-approval-window"));
}

assert.equal(report.phases.wallet.status, "ready");
assert.equal(report.phases.wallet.requiredEnv, "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF");
assert.equal(report.phases.wallet.valuePolicy, "reference-or-sanitized-public-key-only");
assert.equal(report.phases.wallet.secretMaterialPrinted, false);
assert.match(report.phases.wallet.sanitizedValue, /_REF$|^[1-9A-HJ-NP-Za-km-z]{4}\.\.\.[1-9A-HJ-NP-Za-km-z]{4}$/);

assert.equal(report.phases.services.status, "ready");
assert.equal(report.phases.services.secretMaterialPrinted, false);
assert.equal(report.phases.services.required.length, 10);
for (const service of report.phases.services.required) {
  assert.ok(service.env.endsWith("_REF"), `${service.env} must be a refs-only env contract.`);
  assert.ok(["ready", "blocked"].includes(service.status));
  assert.ok(["url-ref-or-sanitized-url", "token-ref-only"].includes(service.valuePolicy));
  assert.ok(!service.sanitizedValue?.includes("Bearer "), `${service.env} leaked a bearer token.`);
}

const manifestFallbackRun = spawnSync("node", [runnerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: executorEnv({
    VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF: "",
    VANTA_PRIVATE_POOL_V2_INDEXER_URL_REF: "",
    VANTA_PRIVATE_POOL_V2_RELAYER_URL_REF: "",
    VANTA_PRIVATE_POOL_V2_PROVER_URL_REF: "",
    VANTA_PRIVATE_POOL_V2_VERIFIER_URL_REF: "",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF: "",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF: "",
    VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF: "",
    VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF: "",
    VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF: "",
  }),
});
assert.equal(manifestFallbackRun.status, 0, manifestFallbackRun.stderr || manifestFallbackRun.stdout);
const manifestFallbackReport = JSON.parse(manifestFallbackRun.stdout);
const urlFallbackServices = manifestFallbackReport.phases.services.required.filter(
  (service) => service.valuePolicy === "url-ref-or-sanitized-url",
);
const tokenFallbackServices = manifestFallbackReport.phases.services.required.filter(
  (service) => service.valuePolicy === "token-ref-only",
);
assert.equal(urlFallbackServices.length, 5);
for (const service of urlFallbackServices) {
  assert.equal(service.status, "ready", `${service.env} must resolve from the production services manifest.`);
  assert.equal(service.valueSource, "production-service-manifest");
  assert.equal(service.manifestRef, "ops/mainnet/private-pool-v2-services.manifest.json");
  assert.match(service.sanitizedValue, /^https:\/\/vanta-prod-private-pool-v2-/);
}
assert.equal(tokenFallbackServices.length, 5);
for (const service of tokenFallbackServices) {
  assert.equal(service.status, "ready", `${service.env} must resolve its ref name from the production services manifest.`);
  assert.equal(service.valueSource, "production-service-manifest");
  assert.equal(service.manifestRef, "ops/mainnet/private-pool-v2-services.manifest.json");
  assert.match(service.sanitizedValue, /_AUTH_TOKEN_REF$/);
}

assert.deepEqual(report.phases.settlementPlan.actions, [
  "validate-bounded-approval",
  "validate-wallet-public-key-ref",
  "validate-production-service-refs",
  "build-actual-private-operator-settlement-plan",
  "build-reviewed-actual-private-settlement-plan",
  "request-operator-protocol-settlement-via-relayer-caller-when-execute-ack-is-present",
]);
assert.equal(report.phases.settlementPlan.operatorEndpoint, "/private-pool-v2/protocol-settlements");
assert.equal(report.phases.settlementPlan.maximumFundsAtRiskLamports, 25_000_000);
assert.equal(report.phases.settlementPlan.transactionConstruction, "implemented-reviewed-plan-boundary");
assert.equal(report.phases.settlementPlan.transactionSigning, "not-local-wallet-signing-operator-relayer-submits");
assert.equal(report.phases.settlementPlan.transactionSubmission, "implemented-but-disabled-without-execute-ack");
assert.equal(report.phases.settlementPlan.requiredInputs.length, 14);
for (const input of report.phases.settlementPlan.requiredInputs) {
  assert.equal(input.status, "ready", `${input.env} must be ready in the checked executor fixture.`);
  assert.equal(input.valueSource, "reference");
}
assert.equal(report.phases.evidencePolicy.secretPolicy, "references-only-no-secret-values");
assert.equal(report.phases.evidencePolicy.forbiddenSecretRedaction, "enforced");
assert.ok(Array.isArray(report.finalBlocker.blockers));
if (approvalStatus.liveMainnetActionsAllowedNow) {
  assert.ok(
    !report.finalBlocker.blockers.includes("bounded-approval-window-not-active"),
    "Active approval windows must not be reported as inactive.",
  );
} else {
  assert.ok(report.finalBlocker.blockers.includes("bounded-approval-window-not-active"));
}
assert.ok(report.finalBlocker.blockers.includes("dry-run-mode-never-moves-funds"));
assert.ok(!report.finalBlocker.blockers.includes("transaction-submission-not-implemented-by-design"));
assert.equal(report.finalBlocker.executeAck.accepted, false);

const serialized = JSON.stringify(report);
for (const forbidden of [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
  "sendRawTransaction",
]) {
  assert.ok(!serialized.includes(forbidden), `Dry-run report must not contain ${forbidden}.`);
}

for (const forbiddenSourceTerm of [
  ".sendTransaction(",
  ".sendRawTransaction(",
  "sendAndConfirmTransaction",
  "VersionedTransaction",
  "Keypair.fromSecretKey",
  "bs58.decode",
]) {
  assert.ok(!runnerSource.includes(forbiddenSourceTerm), `Runner must not implement transaction submission: ${forbiddenSourceTerm}`);
}
assert.ok(
  runnerSource.includes("requestVantaActualPrivateSettlementViaRelayer"),
  "Runner must be wired to the reviewed relayer settlement caller.",
);

assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-executor-check"],
  "node scripts/check-vanta-actual-private-mainnet-settlement-executor.mjs",
  "package.json must expose mainnet:actual-private-settlement-executor-check.",
);
assert.equal(
  packageJson.scripts["mainnet:actual-private-settlement-live"],
  "node scripts/run-vanta-actual-private-mainnet-settlement-evidence.mjs --live",
  "mainnet:actual-private-settlement-live must run the executor in live-preflight mode.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run mainnet:actual-private-settlement-executor-check"),
  "mainnet:preflight must include actual-private settlement executor check.",
);

const liveWithoutAck = spawnSync("node", [runnerPath, "--live"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: executorEnv({
    VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK: "",
  }),
});
assert.equal(liveWithoutAck.status, 1, "Live mode must fail closed without the explicit ACK.");
assert.equal(liveWithoutAck.stderr, "", "Live mode fail-closed report must stay JSON-only on stdout.");
const liveWithoutAckReport = JSON.parse(liveWithoutAck.stdout);
assert.equal(liveWithoutAckReport.mode, "live-preflight");
assert.equal(liveWithoutAckReport.executeRequested, false);
assert.equal(liveWithoutAckReport.finalBlocker.liveAck.accepted, false);
assert.equal(liveWithoutAckReport.finalBlocker.executeAck.accepted, false);
assert.ok(liveWithoutAckReport.finalBlocker.blockers.includes("missing-live-mainnet-settlement-ack"));
assert.ok(liveWithoutAckReport.finalBlocker.blockers.includes("live-settlement-execute-ack-not-set"));

const executeWithoutSecret = spawnSync("node", [runnerPath, "--live", "--execute"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: executorEnv({
    VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_ACK: "I_UNDERSTAND_THIS_RUN_CAN_MOVE_MAINNET_FUNDS",
    VANTA_ACTUAL_PRIVATE_MAINNET_SETTLEMENT_EXECUTE_ACK:
      "I_UNDERSTAND_THIS_WILL_REQUEST_A_MAINNET_PRIVATE_SETTLEMENT",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN: "",
  }),
});
assert.equal(executeWithoutSecret.status, 1, "Execute mode must fail closed without the raw operator token secret env.");
assert.equal(executeWithoutSecret.stderr, "", "Execute mode fail-closed report must stay JSON-only on stdout.");
const executeWithoutSecretReport = JSON.parse(executeWithoutSecret.stdout);
assert.equal(executeWithoutSecretReport.executeRequested, true);
assert.equal(executeWithoutSecretReport.finalBlocker.executeAck.accepted, true);
assert.ok(executeWithoutSecretReport.finalBlocker.blockers.includes("VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN:not-ready"));
assert.equal(executeWithoutSecretReport.phases.operatorSecret.sanitizedValue, undefined);

const rawToken = ["Bearer", "abcdefghijklmnopqrstuvwxyz0123456789"].join(" ");
const redactionRun = spawnSync("node", [runnerPath, "--dry-run"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: executorEnv({
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF: rawToken,
  }),
});
assert.equal(redactionRun.status, 0, redactionRun.stderr || redactionRun.stdout);
assert.ok(!redactionRun.stdout.includes(rawToken), "Raw bearer token must not be echoed.");
const redactionReport = JSON.parse(redactionRun.stdout);
const redactedOperatorToken = redactionReport.phases.services.required.find(
  (service) => service.env === "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF",
);
assert.equal(redactedOperatorToken.status, "blocked");
assert.equal(redactedOperatorToken.sanitizedValue, "FORBIDDEN_RAW_VALUE_REDACTED");
assert.equal(redactedOperatorToken.blocker, "forbidden-secret-like-value-redacted");

console.log("Vanta actual-private mainnet settlement executor contract check: PASS");

function executorEnv(overrides = {}) {
  return {
    ...process.env,
    VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF: "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF",
    VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF: "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT_REF",
    VANTA_ACTUAL_PRIVATE_ASSET_COHORT_REF: "VANTA_ACTUAL_PRIVATE_ASSET_COHORT_REF",
    VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_NULLIFIER_REF: "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF",
    VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_POOL_ID_REF: "VANTA_ACTUAL_PRIVATE_POOL_ID_REF",
    VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH_REF: "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH_REF",
    VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF: "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF",
    VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT_REF",
    VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF: "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID_REF",
    VANTA_PRIVATE_POOL_V2_OPERATOR_URL_REF: "https://operator.example.invalid/vanta-private-pool-v2",
    VANTA_PRIVATE_POOL_V2_INDEXER_URL_REF: "https://indexer.example.invalid/vanta-private-pool-v2",
    VANTA_PRIVATE_POOL_V2_RELAYER_URL_REF: "https://relayer.example.invalid/vanta-private-pool-v2",
    VANTA_PRIVATE_POOL_V2_PROVER_URL_REF: "https://prover.example.invalid/vanta-private-pool-v2",
    VANTA_PRIVATE_POOL_V2_VERIFIER_URL_REF: "https://verifier.example.invalid/vanta-private-pool-v2",
    VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN_REF",
    VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN_REF",
    VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN_REF",
    VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN_REF",
    VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN_REF",
    ...overrides,
  };
}
