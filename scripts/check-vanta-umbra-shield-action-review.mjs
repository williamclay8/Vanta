import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const reviewSource = readFileSync(resolve(repoRoot, "src/privacy/umbraShieldActionReview.ts"), "utf8");
const shieldSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
const shieldWorkspaceSource = readFileSync(
  resolve(repoRoot, "src/components/ShieldWorkspaceCard.tsx"),
  "utf8",
);
const walletApprovalSheetSource = readFileSync(
  resolve(repoRoot, "src/components/WalletApprovalSheet.tsx"),
  "utf8",
);
const shieldSurfaceSource = `${shieldSource}\n${shieldWorkspaceSource}\n${walletApprovalSheetSource}`;
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "createUmbraShieldActionApprovalReview",
  "createUmbraDepositApprovalSummary",
  "createUmbraOperationApprovalDisplay",
  "UmbraOperationApprovalDisplay",
  "Vanta Umbra shield approval requires",
]) {
  assert.ok(reviewSource.includes(phrase), `Umbra shield action review missing phrase: ${phrase}`);
}

for (const phrase of [
  "createUmbraShieldActionApprovalReview",
  "pendingUmbraApprovalDisplay",
  "Vault transfer approval",
  "Wallet approval",
]) {
  assert.ok(shieldSurfaceSource.includes(phrase), `Shield page missing Umbra review phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:shield-action-review-check"'),
  "package.json must expose umbra:shield-action-review-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:shield-action-review-check"),
  "mainnet:preflight must include umbra:shield-action-review-check.",
);

console.log("Vanta Umbra shield action review check: PASS");
