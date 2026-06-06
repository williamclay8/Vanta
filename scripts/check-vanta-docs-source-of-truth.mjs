import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

function requireGitAncestor(shortHash, relativePath) {
  const revParse = spawnSync("git", ["rev-parse", "--verify", `${shortHash}^{commit}`], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (revParse.status !== 0) {
    throw new Error(`${relativePath} references unknown reviewed commit ${shortHash}.`);
  }

  const mergeBase = spawnSync("git", ["merge-base", "--is-ancestor", shortHash, "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (mergeBase.status !== 0) {
    throw new Error(`${relativePath} reviewed commit ${shortHash} is not an ancestor of HEAD.`);
  }
}

const laneStatus = readRequired("LANE_STATUS.md");
const zkReview = readRequired("VANTA_ZK_REVIEW.md");
const sourceOfTruth = readRequired("docs/docs-source-of-truth.md");
const limitations = readRequired("SECURITY_LIMITATIONS.md");
const privacyModel = readRequired("docs/privacy-model.md");
const threatModel = readRequired("docs/threat-model.md");
const incidentRunbook = readRequired("docs/incident-response-runbook.md");
const keyCustodyRunbook = readRequired("docs/key-custody-runbook.md");
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
  "Last updated: 2026-05-12",
  "Reviewed local feedback commit:",
  "productionReady",
  "Verifier present",
  "Vault custody model",
  "Claim-controls flags",
  "Standing blockers across all lanes",
]) {
  requirePhrase(laneStatus, phrase, "LANE_STATUS.md");
}
rejectPhrase(laneStatus, "Last updated: 2026-05-10", "LANE_STATUS.md");
const laneStatusCommitMatch = /Reviewed local feedback commit:\s*`([0-9a-f]{7,40})`/u.exec(laneStatus);
if (!laneStatusCommitMatch) {
  throw new Error("LANE_STATUS.md must pin the reviewed local feedback commit.");
}
requireGitAncestor(laneStatusCommitMatch[1], "LANE_STATUS.md");

for (const phrase of [
  "Markdown docs are the canonical source of truth",
  "SECURITY_LIMITATIONS.md",
  "docs/privacy-model.md",
  "docs/privacy-rail-contract.md",
  "docs/threat-model.md",
  "docs/incident-response-runbook.md",
  "docs/key-custody-runbook.md",
  "LANE_STATUS.md",
  "src/docs/docsContent.ts",
  "compliance:ops-publication-check",
  "pay:doc-truth-check",
  "truth:privacy-claim-gate",
]) {
  requirePhrase(sourceOfTruth, phrase, "docs/docs-source-of-truth.md");
}

requirePhrase(limitations, "Last validated against repo-local code: 2026-06-04", "SECURITY_LIMITATIONS.md");
requirePhrase(docsContent, "test checkout", "src/docs/docsContent.ts");
requirePhrase(privacyModel, 'What "shielded state" means today', "docs/privacy-model.md");
for (const phrase of [
  "Last validated against repo-local code: 2026-05-25",
  "Vanta production privacy is not enabled",
  "users, merchants, relayers, operators, counterparties",
  "A remote prover or prover relay must be explicit opt-in.",
  "Browser localStorage records are diagnostics and continuity aids only.",
  "currentDistinctCommitments: 2",
  "minimumDistinctCommitments: 1024",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "ERR_UNSHIELD_RELEASE_NOT_WIRED",
  "operator-keypair public exit",
  "loadKeypairFromEnv(vaultSignerSecretKeyEnvName)",
  "destinationOwner !== requester",
  "program-owned shared tree is not deployed",
  "Recipient discovery is not production deployed.",
  "legacy v1 plaintext memo history",
  "npm run docs:source-of-truth-check",
  "npm run privacy-audit:tracker-check",
  "npm run private-pool-v2:live-anonymity-set-probe-check",
]) {
  requirePhrase(threatModel, phrase, "docs/threat-model.md");
}
for (const [content, path] of [
  [incidentRunbook, "docs/incident-response-runbook.md"],
  [keyCustodyRunbook, "docs/key-custody-runbook.md"],
]) {
  requirePhrase(content, "Status: operator-trusted beta runbook.", path);
  requirePhrase(content, "Launch status unchanged.", path);
  requirePhrase(content, "Claim Gates Stay Locked", path);
  requirePhrase(content, "npm run compliance:ops-publication-check", path);
}
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
  "the local SBF binary must be rebuilt before it can represent the current ABI",
  "blocked until SBF rebuild, redeploy, and reinit",
]) {
  rejectPhrase(zkReview, phrase, "VANTA_ZK_REVIEW.md");
}
requirePhrase(operatorRunbook, "If You Have 10 Minutes", "docs/operator-runbook.md");
requirePhrase(readme, "Vanta is not production-ready until it has", "README.md");
requirePhrase(
  readme,
  "Shield, Claim, Swap-to-shielded, actual-private-spend, and Send local bb artifact-backed proof-result adapter",
  "README.md",
);
requirePhrase(
  readme,
  "actual-private-spend and Send also have dev-only browser/Web Worker proof execution plus worker-side witness generation from typed witness input",
  "README.md",
);
requirePhrase(
  readme,
  "Claim has dev-only Claim browser/Web Worker proof execution plus worker-side witness generation from typed Claim witness input",
  "README.md",
);
requirePhrase(
  readme,
  "Swap-to-shielded now has dev-only Swap-to-shielded browser/Web Worker proof execution plus worker-side witness generation from typed Swap-to-shielded witness input",
  "README.md",
);
requirePhrase(
  readme,
  "opt-in browser-worker proof-result adapter",
  "README.md",
);
requirePhrase(
  readme,
  "C01 local proof-format observation",
  "README.md",
);

if (packageJson.scripts["docs:source-of-truth-check"] !== "node scripts/check-vanta-docs-source-of-truth.mjs") {
  throw new Error("package.json must expose docs:source-of-truth-check.");
}
if (packageJson.scripts["compliance:ops-publication-check"] !== "node scripts/check-vanta-band8-ops-publication.mjs") {
  throw new Error("package.json must expose compliance:ops-publication-check.");
}
if (!packageJson.scripts["docs:verify"]?.includes("npm run docs:source-of-truth-check")) {
  throw new Error("docs:verify must include docs:source-of-truth-check.");
}
if (!packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run docs:source-of-truth-check")) {
  throw new Error("zk:feedback-loop-check must include docs:source-of-truth-check.");
}

console.log("Vanta docs source-of-truth check: PASS");
