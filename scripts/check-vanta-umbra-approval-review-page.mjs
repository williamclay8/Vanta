import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
const pageSource = readFileSync(resolve(repoRoot, "src/pages/PrivacyReviewPage.tsx"), "utf8");
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");
const stylesSource = readFileSync(resolve(repoRoot, "src/styles.css"), "utf8");

for (const phrase of [
  "PrivacyReviewPage",
  "/app/privacy-review",
  "getVantaUmbraBenchmarkSnapshot",
  "operationApprovalSamples",
  "Approval samples",
  "Review only",
  "does not enable signing",
  "privacy-review-card",
]) {
  assert.ok(
    `${appSource}\n${pageSource}\n${stylesSource}`.includes(phrase),
    `Umbra approval review page missing phrase: ${phrase}`,
  );
}

assert.ok(
  packageSource.includes('"umbra:approval-review-page-check"'),
  "package.json must expose umbra:approval-review-page-check.",
);
assert.ok(
  packageSource.includes("npm run umbra:approval-review-page-check"),
  "mainnet:preflight must include umbra:approval-review-page-check.",
);

console.log("Vanta Umbra approval review page check: PASS");
