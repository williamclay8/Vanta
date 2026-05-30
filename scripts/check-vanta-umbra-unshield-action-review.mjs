import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const reviewSource = readFileSync(resolve(repoRoot, "src/privacy/umbraUnshieldActionReview.ts"), "utf8");
const unshieldPageSource = readFileSync(resolve(repoRoot, "src/pages/UnshieldPage.tsx"), "utf8");
const unshieldExecutionSource = readFileSync(
  resolve(repoRoot, "src/components/unshield/useUnshieldExecution.ts"),
  "utf8",
);
const unshieldWorkspaceSource = readFileSync(resolve(repoRoot, "src/components/UnshieldWorkspaceCard.tsx"), "utf8");
const umbraOperationsSource = readFileSync(resolve(repoRoot, "src/privacy/umbraOperations.ts"), "utf8");
const unshieldSurfaceSource = `${unshieldPageSource}\n${unshieldExecutionSource}\n${unshieldWorkspaceSource}\n${umbraOperationsSource}`;
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

for (const phrase of [
  "createUmbraUnshieldActionApprovalReview",
  "createUmbraWithdrawApprovalSummary",
  "createUmbraOperationApprovalDisplay",
  "UmbraOperationApprovalDisplay",
  "Vanta Umbra unshield approval requires",
]) {
  assert.ok(reviewSource.includes(phrase), `Umbra unshield action review missing phrase: ${phrase}`);
}

for (const phrase of [
  "createUmbraUnshieldActionApprovalReview",
  "pendingUmbraApprovalDisplay",
  "Private rail approval",
  "Wallet approval",
]) {
  assert.ok(unshieldSurfaceSource.includes(phrase), `Unshield page missing Umbra review phrase: ${phrase}`);
}

assert.ok(
  packageSource.includes('"umbra:unshield-action-review-check"'),
  "package.json must expose umbra:unshield-action-review-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:unshield-action-review-check"),
  "mainnet:preflight must include umbra:unshield-action-review-check.",
);

console.log("Vanta Umbra unshield action review check: PASS");
