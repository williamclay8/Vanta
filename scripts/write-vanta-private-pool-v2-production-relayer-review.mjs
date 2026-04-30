import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-production-relayer-review.evidence.json");
const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--write");
const writeMode = process.argv.includes("--write");

const refSpecs = [
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_CONFIGURATION_REVIEW_REF",
    key: "configurationReviewRef",
    pattern: /^review:relayer-live-config-[A-Za-z0-9._:-]+$/,
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_FUNDING_REVIEW_REF",
    key: "fundingReviewRef",
    pattern: /^solana-tx:[1-9A-HJ-NP-Za-km-z]{64,88}$/,
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_CUSTODY_REVIEW_REF",
    key: "custodyReviewRef",
    pattern: /^custody:relayer-fee-payer-[A-Za-z0-9._:-]+$/,
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_DEPLOY_REVIEW_REF",
    key: "deployReviewRef",
    pattern: /^render-deploy:[A-Za-z0-9._:-]+$/,
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_LOG_REDACTION_REVIEW_REF",
    key: "logRedactionReviewRef",
    pattern: /^review:relayer-log-redaction-[A-Za-z0-9._:-]+$/,
  },
  {
    env: "VANTA_PRIVATE_POOL_V2_RELAYER_INDEPENDENT_REVIEWER_REF",
    key: "independentReviewerRef",
    pattern: /^reviewer:[A-Za-z0-9._:-]+$/,
  },
];

const checklistByRef = {
  configurationReviewRef: ["relayer-live-submission-mode", "relayer-rpc-and-submit-ack", "operator-transaction-byte-gate"],
  fundingReviewRef: ["relayer-fee-payer-funded"],
  custodyReviewRef: ["relayer-fee-payer-key-custody"],
  deployReviewRef: ["production-deploy-reviewed"],
  logRedactionReviewRef: ["production-log-redaction-reviewed"],
  independentReviewerRef: ["independent-reviewer-accepted"],
};

const forbiddenFragments = [
  "Bearer ",
  "DATABASE_URL=",
  "postgres://",
  "postgresql://",
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "rawSecret",
  "signedTransaction",
  "feePayerKeypair",
];

function readRequiredRef(spec) {
  const value = process.env[spec.env]?.trim();
  assert.ok(value, `Missing ${spec.env}.`);
  for (const forbidden of forbiddenFragments) {
    assert.ok(!value.includes(forbidden), `${spec.env} must not contain ${forbidden}.`);
  }
  assert.ok(spec.pattern.test(value), `${spec.env} does not match required ref shape.`);
  return value;
}

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const nextRefs = Object.fromEntries(refSpecs.map((spec) => [spec.key, readRequiredRef(spec)]));
const completedChecklistIds = new Set(Object.values(checklistByRef).flat());
const nextEvidence = {
  ...evidence,
  reviewStatus: "reviewed-production-relayer-boundary",
  productionRelayerReviewReady: true,
  currentReviewRefs: nextRefs,
  reviewChecklist: evidence.reviewChecklist.map((item) => ({
    ...item,
    currentEvidenceRef:
      Object.entries(checklistByRef).find(([, ids]) => ids.includes(item.id))?.[0]
        ? nextRefs[Object.entries(checklistByRef).find(([, ids]) => ids.includes(item.id))[0]]
        : item.currentEvidenceRef,
    status: completedChecklistIds.has(item.id) ? "pass" : item.status,
  })),
  productionBlockers: [],
};

const serialized = JSON.stringify(nextEvidence, null, 2);
for (const forbidden of forbiddenFragments) {
  assert.ok(!serialized.includes(forbidden), `Production relayer review evidence leaked ${forbidden}.`);
}

console.log(serialized);
if (writeMode && !dryRun) {
  writeFileSync(evidencePath, `${serialized}\n`);
}
