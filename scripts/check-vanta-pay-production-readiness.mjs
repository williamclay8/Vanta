import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["pay:production-readiness"],
  "node scripts/print-vanta-pay-production-readiness.mjs",
  "package.json must expose pay:production-readiness.",
);
assert.equal(
  packageJson.scripts["pay:production-readiness-json"],
  "node scripts/print-vanta-pay-production-readiness.mjs --json",
  "package.json must expose pay:production-readiness-json.",
);
assert.equal(
  packageJson.scripts["pay:production-readiness-check"],
  "node scripts/print-vanta-pay-production-readiness.mjs --check-ready",
  "package.json must expose pay:production-readiness-check.",
);
assert.ok(
  packageJson.scripts["pay:verify"].includes("npm run pay:production-readiness-json"),
  "pay:verify must include the non-failing Pay production-readiness status.",
);
assert.ok(
  packageJson.scripts["mainnet:preflight"].includes("npm run pay:production-readiness-contract-check"),
  "mainnet:preflight must include the Pay production-readiness contract check.",
);

const status = JSON.parse(
  execFileSync("npm", ["run", "--silent", "pay:production-readiness-json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(status.version, "vanta-pay-production-readiness-0.1");
assert.equal(status.productionReady, false);
assert.equal(status.mainnetReady, false);
assert.equal(status.strictReadyGateCommand, "npm run pay:production-readiness-check");
assert.equal(status.payStatus.productionReady, false);
assert.equal(status.payStatus.privateSettlement.checkoutProofBoundary, "hidden-economics-request");
assert.equal(
  status.payStatus.privateSettlement.acceptedCheckoutSettlementBoundary,
  "actual-private-spend-protocol-settlement",
);
assert.equal(
  status.payStatus.privateSettlement.checkoutSettlementRoute,
  "actual-private-spend-protocol-settlement",
);
assert.equal(
  status.payStatus.privateSettlement.withdrawalProofBoundary,
  "committed-exit-terms-protocol-settlement",
);
assert.equal(status.payStatus.privateSettlement.rawEconomicTermsInProofRequest, false);
assert.equal(status.payStatus.privateSettlement.rawEconomicTermsInAcceptedCheckoutSettlement, false);
assert.equal(status.payStatus.privateSettlement.rawEconomicTermsInLiveCheckoutSettlement, false);
assert.equal(status.payStatus.privateSettlement.rawEconomicTermsInLiveWithdrawalSettlement, false);
assert.equal(status.payStatus.privateSettlement.hiddenEconomicsProductionPrivacyClaimAllowed, false);
assert.equal(
  status.payStatus.privateSettlement.proofBoundaryVerificationCommand,
  "npm run pay:hidden-economics-request-check",
);
assert.equal(
  status.payStatus.privateSettlement.acceptedCheckoutSettlementVerificationCommand,
  "npm run pay:committed-checkout-acceptance-check",
);
assert.equal(status.payStatus.capabilities.durableStoreConfigured, false);
assert.equal(status.payStatus.capabilities.productionDurableStoreConfigured, false);
assert.equal(status.payStatus.capabilities.privatePoolOperatorConfigured, false);
assert.equal(status.payStatus.capabilities.privatePoolOperatorAuthConfigured, false);
assert.equal(status.payStatus.capabilities.productionLaunchApproved, false);
assert.equal(status.privateSettlement.liveMainnetPrivateSettlementAvailable, false);
assert.equal(status.privateSettlement.productionReady, false);
assert.equal(status.privateSettlement.privacyClaimAllowed, false);
assert.ok(
  status.blockers.includes("pay-durable-store-not-configured"),
  "Pay production readiness must block on missing durable store.",
);
assert.ok(
  status.blockers.includes("pay-private-pool-operator-not-configured"),
  "Pay production readiness must block on missing private-pool operator.",
);
assert.ok(
  status.blockers.includes("pay-production-database-not-configured"),
  "Pay production readiness must block on missing production database.",
);
assert.ok(
  status.blockers.includes("pay-private-pool-operator-auth-not-configured"),
  "Pay production readiness must block on missing private-pool operator auth.",
);
assert.ok(
  status.blockers.includes("pay-production-launch-approval-not-recorded"),
  "Pay production readiness must block on missing Pay production launch approval.",
);
assert.ok(
  status.blockers.includes("private-settlement-not-live-mainnet"),
  "Pay production readiness must block on missing live mainnet private settlement.",
);
assert.ok(
  status.blockers.includes("private-settlement-privacy-claim-not-allowed"),
  "Pay production readiness must block on privacy claim status.",
);
assert.ok(
  status.privateSettlement.boundedRealFundsApprovalWindowActive
    ? !status.blockers.includes("real-funds-approval-window-not-active")
    : status.blockers.includes("real-funds-approval-window-not-active"),
  "Pay production readiness must mirror the current bounded real-funds approval window.",
);
assert.ok(
  status.summary.includes("not production-ready"),
  "Pay production readiness summary must avoid overclaiming.",
);

try {
  execFileSync("npm", ["run", "--silent", "pay:production-readiness-check"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  assert.fail("Strict Pay production-readiness gate must fail while blockers remain.");
} catch (error) {
  assert.notEqual(error.status, 0, "Strict Pay production-readiness gate must exit non-zero.");
  assert.ok(
    String(error.stderr).includes("Vanta Pay production readiness blocked"),
    "Strict Pay production-readiness gate must print the blocker summary.",
  );
}

console.log("Vanta Pay production readiness check: PASS");
