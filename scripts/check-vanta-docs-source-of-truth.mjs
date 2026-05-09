import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRequired(relativePath) {
  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing ${relativePath}.`);
  }
  return readFileSync(path, "utf8");
}

function requirePhrase(source, phrase, relativePath) {
  if (!source.includes(phrase)) {
    throw new Error(`${relativePath} is missing required phrase: ${phrase}`);
  }
}

const laneStatus = readRequired("LANE_STATUS.md");
const sourceOfTruth = readRequired("docs/docs-source-of-truth.md");
const limitations = readRequired("SECURITY_LIMITATIONS.md");
const privacyModel = readRequired("docs/privacy-model.md");
const canonicalNote = readRequired("docs/zk/canonical-note-schema.md");
const operatorRunbook = readRequired("docs/operator-runbook.md");
const readme = readRequired("README.md");
const docsContent = readRequired("src/docs/docsContent.ts");
const packageJson = JSON.parse(readRequired("package.json"));

for (const lane of ["Shield", "Send", "Swap", "Unshield", "Strategy", "Pay"]) {
  requirePhrase(laneStatus, `| ${lane} |`, "LANE_STATUS.md");
}

for (const phrase of [
  "Last updated: 2026-05-09",
  "productionReady",
  "Verifier present",
  "Vault custody model",
  "Claim-controls flags",
  "Standing blockers across all lanes",
]) {
  requirePhrase(laneStatus, phrase, "LANE_STATUS.md");
}

for (const phrase of [
  "Markdown docs are the canonical source of truth",
  "SECURITY_LIMITATIONS.md",
  "docs/privacy-model.md",
  "docs/privacy-rail-contract.md",
  "LANE_STATUS.md",
  "src/docs/docsContent.ts",
  "pay:doc-truth-check",
  "truth:privacy-claim-gate",
]) {
  requirePhrase(sourceOfTruth, phrase, "docs/docs-source-of-truth.md");
}

requirePhrase(limitations, "Last validated against repo-local code: 2026-05-09", "SECURITY_LIMITATIONS.md");
requirePhrase(docsContent, "test checkout", "src/docs/docsContent.ts");
requirePhrase(privacyModel, 'What "shielded state" means today', "docs/privacy-model.md");
requirePhrase(canonicalNote, "Transitional Hash Surface Today", "docs/zk/canonical-note-schema.md");
requirePhrase(operatorRunbook, "If You Have 10 Minutes", "docs/operator-runbook.md");
requirePhrase(readme, "Vanta is not production-ready until it has", "README.md");

if (packageJson.scripts["docs:source-of-truth-check"] !== "node scripts/check-vanta-docs-source-of-truth.mjs") {
  throw new Error("package.json must expose docs:source-of-truth-check.");
}
if (!packageJson.scripts["docs:verify"]?.includes("npm run docs:source-of-truth-check")) {
  throw new Error("docs:verify must include docs:source-of-truth-check.");
}

console.log("Vanta docs source-of-truth check: PASS");
