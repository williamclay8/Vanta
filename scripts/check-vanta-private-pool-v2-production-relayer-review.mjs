import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-production-relayer-review.evidence.json");
const manifestPath = resolve(repoRoot, "ops/mainnet/private-pool-v2-services.manifest.json");
const secretManifestPath = resolve(repoRoot, "ops/mainnet/secret-references.manifest.json");
const secretManagerTemplatePath = resolve(repoRoot, "ops/mainnet/production-secret-manager.template.json");
const packagePath = resolve(repoRoot, "package.json");

assert.ok(existsSync(evidencePath), "Missing production relayer review evidence packet.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const secretManifest = JSON.parse(readFileSync(secretManifestPath, "utf8"));
const secretManagerTemplate = JSON.parse(readFileSync(secretManagerTemplatePath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const requiredRelayerEnv = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_DATABASE_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET",
  "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMISSION_MODE",
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON",
  "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMIT_ACK",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
];
const requiredOperatorEnv = ["VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION"];
const requiredChecklistIds = [
  "relayer-live-submission-mode",
  "relayer-rpc-and-submit-ack",
  "relayer-fee-payer-key-custody",
  "relayer-fee-payer-funded",
  "operator-transaction-byte-gate",
  "actual-private-spend-program-configured",
  "production-deploy-reviewed",
  "production-log-redaction-reviewed",
  "independent-reviewer-accepted",
];
const requiredSecretRefs = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET_REF",
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON_REF",
];
const refPatterns = {
  configurationReviewRef: /^review:relayer-live-config-[A-Za-z0-9._:-]+$/,
  fundingReviewRef: /^solana-tx:[1-9A-HJ-NP-Za-km-z]{64,88}$/,
  custodyReviewRef: /^custody:relayer-fee-payer-[A-Za-z0-9._:-]+$/,
  spendProgramConfigRef: /^solana-program-config:[A-Za-z0-9._:-]+$/,
  deployReviewRef: /^render-deploy:[A-Za-z0-9._:-]+$/,
  logRedactionReviewRef: /^review:relayer-log-redaction-[A-Za-z0-9._:-]+$/,
  independentReviewerRef: /^reviewer:[A-Za-z0-9._:-]+$/,
};
const mainnetSpendProgramConfig = {
  network: "mainnet-beta",
  programId: "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm",
  programDeployRef:
    "solana-tx:34syPdrcrwjUvFLiDRzPA597MxNqB8CassbJYu77DN4ECm1u5gLjL2uwhz5bcnHKbeZH4A819kjofCGBvpkP764p",
  programLoaderRef: "solana-program-loader:BPFLoaderUpgradeab1e11111111111111111111111",
  poolState: "5qjyK5B5ZMAgLmXxrpAGqFHvEHTCP4MUwRmzvA4MPEuQ",
  nullifierSet: "x5xWJZNN8rjZPdAYgG8EJuTZYYvYDQyhVXEgKB6i23k",
  outputQueue: "CsnYLMnnMso1KT6PE7csi51ZtFHSPQr1xTePA8rKUzrZ",
  createAccountsRef:
    "solana-tx:368JyAHH4aAuvFiSuhGhoejuwPvyTDwMtHdrzLgRhqVnbQNrbaCjCHxjsR8Ty7PcoR4kb9xjR7Q674NKZ9BABdGo",
  initRef:
    "solana-tx:3zfqv9jKCwWJ2vtwFaViBq2GuaTP6HqjbUqfW8PGYjraumdSvvtVFHiYG1uyLTDDvpLgtwwN4d4XmTjd7D2RQEGU",
  spendEvidenceRef:
    "solana-tx:56QhWoCQ6KjD9SVBJ9KdZphVMp49qYSiwEDTprZsoyo5WFTXoLRMrxNTabB9dELhL5WrFWbSZDDzNd4URr3u5fZL",
  replaySimulationRef: "solana-simulation:duplicate-nullifier-custom-1-2026-04-29",
  reviewRef: "solana-program-config:mainnet-beta-private-pool-v2-spend-2026-04-29",
};
const checklistReviewRefs = {
  "relayer-live-submission-mode": "configurationReviewRef",
  "relayer-rpc-and-submit-ack": "configurationReviewRef",
  "operator-transaction-byte-gate": "configurationReviewRef",
  "relayer-fee-payer-funded": "fundingReviewRef",
  "relayer-fee-payer-key-custody": "custodyReviewRef",
  "actual-private-spend-program-configured": "spendProgramConfigRef",
  "production-deploy-reviewed": "deployReviewRef",
  "production-log-redaction-reviewed": "logRedactionReviewRef",
  "independent-reviewer-accepted": "independentReviewerRef",
};

assert.equal(evidence.version, "vanta-private-pool-v2-production-relayer-review-evidence-0.1");
assert.equal(evidence.mainnetReady, false);
assert.equal(evidence.productionReady, false);
assert.equal(evidence.privacyClaimAllowed, false);
assert.equal(evidence.productionRelayerReviewReady, false);
assert.equal(evidence.secretPolicy, "references-only-no-secret-values");
assert.ok(
  ["blocked-awaiting-external-review", "reviewed-production-relayer-boundary"].includes(evidence.reviewStatus),
);
assert.ok(
  evidence.reviewScope.includes("production actual-private spend program and account configuration"),
  "Production relayer review scope must include actual-private spend program/account configuration.",
);

assert.deepEqual(evidence.requiredProductionEnv.relayer, requiredRelayerEnv);
assert.deepEqual(evidence.requiredProductionEnv.operator, requiredOperatorEnv);

const relayer = manifest.services.find((service) => service.id === "relayer");
const operator = manifest.services.find((service) => service.id === "operator");
assert.ok(relayer, "Missing relayer service in production services manifest.");
assert.ok(operator, "Missing operator service in production services manifest.");
assert.equal(relayer.deployedService?.serviceName, "vanta-prod-private-pool-v2-relayer");
assert.equal(operator.deployedService?.serviceName, "vanta-prod-private-pool-v2-operator");

const relayerEnvNames = new Set((relayer.env ?? []).map((entry) => entry.name));
const operatorEnvNames = new Set((operator.env ?? []).map((entry) => entry.name));
for (const envName of requiredRelayerEnv) {
  assert.ok(relayerEnvNames.has(envName), `Relayer manifest must declare ${envName}.`);
}
for (const envName of requiredOperatorEnv) {
  assert.ok(operatorEnvNames.has(envName), `Operator manifest must declare ${envName}.`);
}
assert.ok(
  (relayer.env ?? []).every((entry) => !("value" in entry)),
  "Relayer manifest must not store env values.",
);
assert.ok(
  (operator.env ?? []).every((entry) => !("value" in entry)),
  "Operator manifest must not store env values.",
);

if (evidence.productionRelayerReviewReady) {
  assert.equal(evidence.reviewStatus, "reviewed-production-relayer-boundary");
  assert.deepEqual(evidence.productionBlockers, []);
} else {
  assert.equal(evidence.reviewStatus, "blocked-awaiting-external-review");
}
assert.equal(evidence.observedExternalBlockers?.[0]?.id, "doppler-production-relayer-live-env-missing");
assert.equal(evidence.observedExternalBlockers?.[0]?.secretMaterialPrinted, false);
assert.deepEqual(evidence.observedExternalBlockers?.[0]?.missingSecretNames, [
  "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMISSION_MODE",
  "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_SOLANA_SUBMIT_ACK",
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_PAYER_KEYPAIR_JSON",
  "VANTA_PRIVATE_POOL_V2_REQUIRE_RELAYER_SERIALIZED_TRANSACTION",
]);
if (evidence.observedExternalBlockers?.[0]?.status === "resolved") {
  assert.match(
    evidence.observedExternalBlockers[0].resolvedAtRef,
    refPatterns.configurationReviewRef,
    "Resolved Doppler env blocker must point at the redacted live config review ref.",
  );
}

assert.deepEqual(
  evidence.spendProgramConfig,
  {
    ...mainnetSpendProgramConfig,
    truthBoundary:
      "Mainnet spend-program deploy/init/spend evidence is recorded as public refs only. This does not create an independent reviewer acceptance, audit claim, anonymity-set claim, or production privacy claim.",
  },
  "Production relayer review must pin the reviewed mainnet spend program/accounts and deploy/init/spend refs.",
);
assert.equal(
  evidence.currentReviewRefs.spendProgramConfigRef,
  mainnetSpendProgramConfig.reviewRef,
  "spendProgramConfigRef must point at the pinned mainnet spend program config review ref.",
);
for (const ref of [
  mainnetSpendProgramConfig.programDeployRef,
  mainnetSpendProgramConfig.createAccountsRef,
  mainnetSpendProgramConfig.initRef,
  mainnetSpendProgramConfig.spendEvidenceRef,
]) {
  assert.ok(evidence.currentEvidenceRefs.includes(ref), `Missing spend program evidence ref ${ref}.`);
}

for (const id of requiredChecklistIds) {
  const item = evidence.reviewChecklist.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing checklist item ${id}.`);
  const reviewRefKey = checklistReviewRefs[id];
  const reviewRef = evidence.currentReviewRefs[reviewRefKey];
  if (evidence.productionRelayerReviewReady) {
    assert.equal(item.status, "pass", `Checklist item ${id} must pass when review is ready.`);
    assert.ok(item.currentEvidenceRef, `Checklist item ${id} must include a review ref when ready.`);
  } else {
    assert.ok(["blocked", "pass"].includes(item.status), `Checklist item ${id} must be blocked or pass.`);
    if (item.status === "pass") {
      assert.ok(reviewRef, `Checklist item ${id} cannot pass without ${reviewRefKey}.`);
      assert.equal(item.currentEvidenceRef, reviewRef, `Checklist item ${id} must point at ${reviewRefKey}.`);
    } else {
      assert.equal(item.currentEvidenceRef, null, `Blocked checklist item ${id} must not use placeholder refs.`);
    }
  }
}

for (const [key, pattern] of Object.entries(refPatterns)) {
  assert.ok(evidence.requiredRefShapes[key], `Missing required ref shape for ${key}.`);
  if (evidence.currentReviewRefs[key]) {
    assert.match(evidence.currentReviewRefs[key], pattern, `Current review ref ${key} has an invalid shape.`);
  }
  if (evidence.productionRelayerReviewReady) {
    assert.ok(evidence.currentReviewRefs[key], `Current review ref ${key} must be filled when ready.`);
  }
}
assert.equal(evidence.requiredRefShapes.fundingReviewRef, "solana-tx:<relayer-fee-payer-funding-signature>");

const secretRefs = new Set((secretManifest.secrets ?? secretManifest.requiredSecrets ?? []).map((entry) => entry.ref));
const secretManagerRefs = new Set((secretManagerTemplate.secretMappings ?? []).map((entry) => entry.ref));
for (const ref of requiredSecretRefs) {
  assert.ok(secretRefs.has(ref), `Secret references manifest must include ${ref}.`);
  assert.ok(secretManagerRefs.has(ref), `Production secret manager template must include ${ref}.`);
}

const blockerByRef = {
  configurationReviewRef: [
    "Production relayer live Solana submission env review is not recorded.",
    "Doppler production config is missing the relayer live-submission and operator transaction-byte gate secret names.",
    "Production operator reviewed-transaction-byte gate review is not recorded.",
  ],
  fundingReviewRef: ["Relayer fee-payer funding transaction is not recorded."],
  custodyReviewRef: ["Relayer fee-payer custody/rotation/revocation review is not recorded."],
  spendProgramConfigRef: ["No reviewed mainnet actual-private spend program/account config is recorded."],
  deployReviewRef: ["Production relayer/operator deploy review is not recorded."],
  logRedactionReviewRef: ["Production relayer/operator log redaction review is not recorded."],
  independentReviewerRef: ["No independent reviewer has accepted the production relayer boundary."],
};
for (const [refKey, blockers] of Object.entries(blockerByRef)) {
  for (const blocker of blockers) {
    if (evidence.currentReviewRefs[refKey]) {
      assert.ok(!evidence.productionBlockers.includes(blocker), `Resolved blocker must be removed: ${blocker}`);
    } else {
      assert.ok(evidence.productionBlockers.includes(blocker), `Missing production relayer blocker: ${blocker}`);
    }
  }
}

const serialized = JSON.stringify(evidence);
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
]) {
  assert.ok(!serialized.includes(forbidden), `Production relayer review evidence must not contain ${forbidden}.`);
}

assert.equal(
  packageJson.scripts["private-pool-v2:production-relayer-review-check"],
  "node scripts/check-vanta-private-pool-v2-production-relayer-review.mjs",
);
assert.equal(
  packageJson.scripts["private-pool-v2:production-relayer-review-preview"],
  "node scripts/write-vanta-private-pool-v2-production-relayer-review.mjs --dry-run",
);
assert.equal(
  packageJson.scripts["private-pool-v2:production-relayer-review-write"],
  "node scripts/write-vanta-private-pool-v2-production-relayer-review.mjs --write",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:production-relayer-review-check"),
  "mainnet:preflight must include the production relayer review check.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run private-pool-v2:solana-spend-transaction-check"),
  "mainnet:preflight must include the Solana spend transaction byte printer check.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"].includes("npm run private-pool-v2:solana-spend-transaction-check"),
  "private-pool-v2:verify must include the Solana spend transaction byte printer check.",
);

console.log("Vanta Private Pool v2 production relayer review check: PASS");
