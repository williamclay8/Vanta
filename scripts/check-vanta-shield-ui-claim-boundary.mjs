import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const shieldPage = readRepoFile("src/pages/ShieldPage.tsx");
const dashboardPage = readRepoFile("src/pages/AppDashboardPage.tsx");
const privateCorePanel = readRepoFile("src/components/VantaPrivateCoreStatePanel.tsx");
const privacyFlowContext = readRepoFile("src/data/context/PrivacyFlowContext.tsx");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const phrase of [
  "is now available in shielded state",
  "Adding to private balance",
  "Adding this to your private balance",
  "Private rail approval",
  "The selected asset was shielded successfully.",
]) {
  assert.ok(!shieldPage.includes(phrase), `Shield page still has unqualified claim: ${phrase}`);
}

for (const phrase of [
  "Shielded SOL available",
]) {
  assert.ok(!dashboardPage.includes(phrase), `Dashboard still has unqualified claim: ${phrase}`);
}

for (const phrase of [
  "Private note ready",
  "Private note live",
  "Held privately",
  "Shield from the current UI to mint one Vanta Private Core private note",
]) {
  assert.ok(!privateCorePanel.includes(phrase), `Private Core panel still has unqualified claim: ${phrase}`);
}

for (const phrase of [
  "claimTier",
  "public_vault_deposit",
  "local_shield_state",
  "local_private_core_note",
  "proof_receipt_verified",
]) {
  assert.ok(privacyFlowContext.includes(phrase), `RecentShieldContext missing claim tier phrase: ${phrase}`);
}

for (const phrase of [
  "TransactionStatusToast",
  "<TransactionStatusToast",
  "Shield deposit recorded",
  "Recording local shield-state evidence",
  "Vault transfer approval",
  "Production privacy is not enabled",
]) {
  assert.ok(shieldPage.includes(phrase), `Shield page missing bounded claim phrase: ${phrase}`);
}

assert.ok(
  packageJson.scripts["shield:ui-claim-boundary-check"] ===
    "node scripts/check-vanta-shield-ui-claim-boundary.mjs",
  "package.json must expose shield:ui-claim-boundary-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes("npm run shield:ui-claim-boundary-check"),
  "shield:verify must include shield:ui-claim-boundary-check.",
);

console.log("Vanta Shield UI claim boundary check: PASS");
