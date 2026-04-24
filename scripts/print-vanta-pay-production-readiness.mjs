import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");
const checkReady = process.argv.includes("--check-ready");

function readJsonCommand(args) {
  return JSON.parse(
    execFileSync("npm", ["run", "--silent", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
    }),
  );
}

function buildStatus() {
  const payStatus = readJsonCommand(["pay:status-json"]);
  const privateSettlement = readJsonCommand(["mainnet:private-settlement-status", "--", "--json"]);

  const blockers = [
    ...(payStatus.capabilities?.durableStoreConfigured ? [] : ["pay-durable-store-not-configured"]),
    ...(payStatus.capabilities?.productionDurableStoreConfigured
      ? []
      : ["pay-production-database-not-configured"]),
    ...(payStatus.capabilities?.privatePoolOperatorConfigured
      ? []
      : ["pay-private-pool-operator-not-configured"]),
    ...(payStatus.capabilities?.privatePoolOperatorAuthConfigured
      ? []
      : ["pay-private-pool-operator-auth-not-configured"]),
    ...(payStatus.capabilities?.productionLaunchApproved
      ? []
      : ["pay-production-launch-approval-not-recorded"]),
    ...(privateSettlement.liveMainnetPrivateSettlementAvailable
      ? []
      : ["private-settlement-not-live-mainnet"]),
    ...(privateSettlement.privacyClaimAllowed
      ? []
      : ["private-settlement-privacy-claim-not-allowed"]),
    ...(privateSettlement.boundedRealFundsApprovalWindowActive
      ? []
      : ["real-funds-approval-window-not-active"]),
    ...(privateSettlement.auditedSharedAnonymitySetAvailable
      ? []
      : ["audited-shared-anonymity-set-not-recorded"]),
    ...(payStatus.productionReady ? [] : ["pay-status-production-ready-false"]),
  ];

  const productionReady = blockers.length === 0;

  return {
    version: "vanta-pay-production-readiness-0.1",
    kind: "Vanta Pay production readiness",
    checkedAt: new Date().toISOString(),
    mainnetReady: productionReady,
    productionReady,
    strictReadyGateCommand: "npm run pay:production-readiness-check",
    payStatus,
    privateSettlement,
    blockers,
    summary: productionReady
      ? "Vanta Pay has the required production payment-network gates recorded."
      : `Vanta Pay is not production-ready: ${blockers.join(", ")}.`,
    safety:
      "This status is references-only. It must not print auth tokens, database URLs, wallet keys, signed transaction material, customer private inputs, bearer values, or credential-bearing URLs.",
  };
}

const status = buildStatus();

if (checkReady) {
  assert.equal(status.version, "vanta-pay-production-readiness-0.1");
  if (!status.productionReady) {
    console.error(`Vanta Pay production readiness blocked: ${status.blockers.join(", ")}`);
    process.exit(1);
  }
}

if (jsonMode) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Vanta Pay production readiness");
  console.log(`- productionReady: ${String(status.productionReady)}`);
  console.log(`- mainnetReady: ${String(status.mainnetReady)}`);
  console.log(`- durableStoreConfigured: ${String(status.payStatus.capabilities.durableStoreConfigured)}`);
  console.log(
    `- productionDurableStoreConfigured: ${String(status.payStatus.capabilities.productionDurableStoreConfigured)}`,
  );
  console.log(
    `- privatePoolOperatorConfigured: ${String(status.payStatus.capabilities.privatePoolOperatorConfigured)}`,
  );
  console.log(
    `- privatePoolOperatorAuthConfigured: ${String(status.payStatus.capabilities.privatePoolOperatorAuthConfigured)}`,
  );
  console.log(`- productionLaunchApproved: ${String(status.payStatus.capabilities.productionLaunchApproved)}`);
  console.log(
    `- liveMainnetPrivateSettlementAvailable: ${String(status.privateSettlement.liveMainnetPrivateSettlementAvailable)}`,
  );
  console.log(`- privacyClaimAllowed: ${String(status.privateSettlement.privacyClaimAllowed)}`);
  console.log(
    `- boundedRealFundsApprovalWindowActive: ${String(status.privateSettlement.boundedRealFundsApprovalWindowActive)}`,
  );
  console.log(`- blockers: ${status.blockers.join(", ") || "none"}`);
  console.log(`- strict ready gate: ${status.strictReadyGateCommand}`);
}
