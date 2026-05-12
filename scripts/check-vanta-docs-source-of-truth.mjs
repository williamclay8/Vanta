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

function rejectPhrase(source, phrase, relativePath) {
  if (source.includes(phrase)) {
    throw new Error(`${relativePath} still contains stale phrase: ${phrase}`);
  }
}

const laneStatus = readRequired("LANE_STATUS.md");
const zkReview = readRequired("VANTA_ZK_REVIEW.md");
const sourceOfTruth = readRequired("docs/docs-source-of-truth.md");
const limitations = readRequired("SECURITY_LIMITATIONS.md");
const privacyModel = readRequired("docs/privacy-model.md");
const canonicalNote = readRequired("docs/zk/canonical-note-schema.md");
const zkAssumptions = readRequired("docs/zk/vanta-zk-v1-assumptions.md");
const zkRemainingWork = readRequired("docs/zk/vanta-zk-v1-remaining-work.md");
const sendProofBoundary = readRequired("docs/zk/vanta-private-core-send-proof-boundary.md");
const swapProofBoundary = readRequired("docs/zk/vanta-private-core-swap-proof-boundary.md");
const unshieldProofBoundary = readRequired("docs/zk/vanta-private-core-unshield-proof-boundary.md");
const supportedSendLane = readRequired("docs/zk/vanta-zk-v1-supported-send-lane.md");
const supportedUnshieldLane = readRequired("docs/zk/vanta-zk-v1-supported-unshield-lane.md");
const operatorRunbook = readRequired("docs/operator-runbook.md");
const readme = readRequired("README.md");
const docsContent = readRequired("src/docs/docsContent.ts");
const packageJson = JSON.parse(readRequired("package.json"));

for (const lane of ["Shield", "Send", "Swap", "Unshield", "Strategy", "Pay"]) {
  requirePhrase(laneStatus, `| ${lane} |`, "LANE_STATUS.md");
}

for (const phrase of [
  "Last updated: 2026-05-10",
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

requirePhrase(limitations, "Last validated against repo-local code: 2026-05-12", "SECURITY_LIMITATIONS.md");
requirePhrase(docsContent, "test checkout", "src/docs/docsContent.ts");
requirePhrase(privacyModel, 'What "shielded state" means today', "docs/privacy-model.md");
requirePhrase(canonicalNote, "Transitional Hash Surface Today", "docs/zk/canonical-note-schema.md");
for (const [content, path] of [
  [zkAssumptions, "docs/zk/vanta-zk-v1-assumptions.md"],
  [zkRemainingWork, "docs/zk/vanta-zk-v1-remaining-work.md"],
  [sendProofBoundary, "docs/zk/vanta-private-core-send-proof-boundary.md"],
  [swapProofBoundary, "docs/zk/vanta-private-core-swap-proof-boundary.md"],
  [unshieldProofBoundary, "docs/zk/vanta-private-core-unshield-proof-boundary.md"],
  [supportedSendLane, "docs/zk/vanta-zk-v1-supported-send-lane.md"],
  [supportedUnshieldLane, "docs/zk/vanta-zk-v1-supported-unshield-lane.md"],
]) {
  requirePhrase(content, "active-v0 legacy", path);
  requirePhrase(content, "Private Pool v2 entry", path);
}
for (const phrase of [
  "having two send circuits is dead weight",
  "vanta_private_core_single_note_send/src/main.nr` (delete; consolidate",
  "vanta_private_core_single_note_swap/src/main.nr` (delete; consolidated",
  "Replace both `vanta_private_pool_v2_swap_to_shielded_entry` and `vanta_private_core_single_note_swap` with a single",
]) {
  rejectPhrase(zkReview, phrase, "VANTA_ZK_REVIEW.md");
}
requirePhrase(operatorRunbook, "If You Have 10 Minutes", "docs/operator-runbook.md");
requirePhrase(readme, "Vanta is not production-ready until it has", "README.md");

if (packageJson.scripts["docs:source-of-truth-check"] !== "node scripts/check-vanta-docs-source-of-truth.mjs") {
  throw new Error("package.json must expose docs:source-of-truth-check.");
}
if (!packageJson.scripts["docs:verify"]?.includes("npm run docs:source-of-truth-check")) {
  throw new Error("docs:verify must include docs:source-of-truth-check.");
}

console.log("Vanta docs source-of-truth check: PASS");
