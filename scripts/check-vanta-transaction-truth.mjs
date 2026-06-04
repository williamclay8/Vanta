import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const homePage = readRepoFile("src/pages/HomePage.tsx");
const readme = readRepoFile("README.md");
const auditPackage = readRepoFile("docs/audit-package.md");
const securityLimitations = readRepoFile("SECURITY_LIMITATIONS.md");
const payPage = readRepoFile("src/pages/PayPage.tsx");
const unshieldPage = [
  readRepoFile("src/pages/UnshieldPage.tsx"),
  readRepoFile("src/components/UnshieldWorkspaceCard.tsx"),
  readRepoFile("src/components/UnshieldReceiptModal.tsx"),
].join("\n");
const snapshot = createVantaMainnetReadinessSnapshot();

const bannedBroadClaims = [
  "Private by default",
  "All the actions private users need",
  "fully private",
  "production-ready private settlement",
  "mainnet-ready private settlement",
  "live mainnet private settlement",
];

for (const claim of bannedBroadClaims) {
  assert.ok(!homePage.includes(claim), `Home page must not overclaim transaction privacy: ${claim}`);
}

assert.ok(
  homePage.includes("Shield first. Simple on the surface."),
  "Home page must frame privacy as shield-first, not default privacy.",
);
assert.ok(
  homePage.includes("Send from shielded state"),
  "Home page send action must name shielded state instead of broad private-send claims.",
);
assert.ok(
  homePage.includes("Swap from shielded state"),
  "Home page swap action must name shielded state instead of broad private-swap claims.",
);
assert.equal(snapshot.mainnetReady, false);
assert.equal(snapshot.productionReady, false);
assert.equal(snapshot.privateSettlement.liveMainnetPrivateSettlementAvailable, false);
assert.equal(snapshot.privateSettlement.privacyClaimAllowed, false);
assert.equal(snapshot.privateSettlement.settlementReadiness, "no-real-funds-production-smoke-only");
assert.equal(snapshot.walletSigning.requiresSimulationBeforeSignature, true);
assert.equal(snapshot.walletSigning.requiresTransactionSummaryBeforeSignature, true);
assert.equal(snapshot.walletSigning.requiresExplicitHumanApproval, true);
assert.ok(
  securityLimitations.includes("Live mainnet submission mode can be enabled in bounded operator windows"),
  "Security limitations must match the current bounded live-submission posture.",
);
assert.ok(
  securityLimitations.includes("real-funds actions still require explicit approval"),
  "Security limitations must keep real-funds approval gating visible.",
);
assert.ok(
  readme.includes("Transaction Evidence v0.1"),
  "README must define Transaction Evidence v0.1 for reviewers.",
);
assert.ok(
  auditPackage.includes("npm run truth:transaction-check"),
  "Audit package must include the transaction truth command.",
);
assert.ok(
  auditPackage.includes("npm run mainnet:transaction-evidence-check"),
  "Audit package must include the transaction evidence command.",
);
assert.ok(
  securityLimitations.includes("does not prove mainnet finality, production settlement, or privacy guarantees"),
  "Security limitations must bound Transaction Evidence v0.1.",
);
assert.ok(
  payPage.includes("Transaction evidence"),
  "Pay page must expose a transaction evidence trust-packet row.",
);
assert.ok(
  unshieldPage.includes("Transaction evidence"),
  "Unshield page must expose transaction evidence in the completion review.",
);
assert.ok(
  !securityLimitations.includes("Live mainnet submission remains disabled."),
  "Security limitations must not contradict the current live-submission status surface.",
);

console.log("Vanta transaction truth check: PASS");
