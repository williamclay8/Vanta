import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const ledgerPath = resolve(repoRoot, "VANTA_ZK_REVIEW.findings.json");
const reviewPath = resolve(repoRoot, "VANTA_ZK_REVIEW.md");
const packagePath = resolve(repoRoot, "package.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  console.error(`Vanta ZK review findings ledger: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function git(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function findCommitHash(value) {
  return /\b([0-9a-f]{7,40})\b/u.exec(String(value))?.[1] ?? null;
}

function assertKnownAncestorCommit(value, label) {
  const hash = findCommitHash(value);
  assert(hash, `${label} must include a concrete git commit hash`);

  const revParse = git(["rev-parse", "--verify", `${hash}^{commit}`]);
  assert(revParse.status === 0, `${label} references unknown commit ${hash}`);

  const mergeBase = git(["merge-base", "--is-ancestor", hash, "HEAD"]);
  assert(mergeBase.status === 0, `${label} commit ${hash} is not an ancestor of HEAD`);
}

function assertPinnedCommittedText(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  assert(
    !/\bincluded in (?:the|this|a)\b/iu.test(value),
    `${label} must pin a commit instead of saying "${value}"`,
  );
  assert(
    !/\bcurrent\b.*\b(?:feedback-loop )?(?:patch|commit)\b/iu.test(value),
    `${label} must pin a commit instead of saying "${value}"`,
  );
  assertKnownAncestorCommit(value, label);
}

assert(existsSync(reviewPath), "missing VANTA_ZK_REVIEW.md");
assert(existsSync(ledgerPath), "missing VANTA_ZK_REVIEW.findings.json");

const ledgerSource = readFileSync(ledgerPath, "utf8");
const ledger = readJson(ledgerPath);
const packageJson = readJson(packagePath);
const scripts = packageJson.scripts ?? {};

const expectedIds = [
  "VANTA-ZK-2026-05-09-C01",
  "VANTA-ZK-2026-05-09-C02",
  "VANTA-ZK-2026-05-09-C03",
  "VANTA-ZK-2026-05-09-C04",
  "VANTA-ZK-2026-05-09-C05",
  "VANTA-ZK-2026-05-09-H06",
  "VANTA-ZK-2026-05-09-H07",
  "VANTA-ZK-2026-05-09-H08",
  "VANTA-ZK-2026-05-09-M09",
  "VANTA-ZK-2026-05-09-M10",
  "VANTA-ZK-2026-05-09-M11",
  "VANTA-ZK-2026-05-09-M12",
  "VANTA-ZK-2026-05-09-M13",
];

const allowedStatuses = new Set([
  "open",
  "partial",
  "remediated-local",
  "verified-local",
  "committed",
  "pushed",
  "live-verified",
  "accepted-closed",
  "blocked",
  "stale",
]);
const allowedSeverities = new Set(["critical", "high", "medium"]);
const secretLikePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:seed phrase|mnemonic|private key)\s*[:=]\s*["'][^"']+["']/iu,
  /\b(?:sk|secret|api[_-]?key|token)_(?:live|prod|mainnet)_[A-Za-z0-9]{12,}\b/u,
];

assert(ledger.schemaVersion === 1, "schemaVersion must be 1");
assert(ledger.reviewDocument === "VANTA_ZK_REVIEW.md", "reviewDocument must point at VANTA_ZK_REVIEW.md");
assert(Array.isArray(ledger.allowedStatuses), "allowedStatuses must be present");
assert(Array.isArray(ledger.allowedSeverities), "allowedSeverities must be present");
assert(Array.isArray(ledger.activeFeedbackLoops), "activeFeedbackLoops must be an array");
assert(Array.isArray(ledger.findings), "findings must be an array");
assert(
  !Object.hasOwn(ledger.lumiBaseline ?? {}, "lastKnownCommit"),
  "lumiBaseline must use baselineCommit instead of lastKnownCommit",
);
assertKnownAncestorCommit(ledger.lumiBaseline?.baselineCommit, "lumiBaseline.baselineCommit");
assertPinnedCommittedText(ledger.lumiBaseline?.committed, "lumiBaseline.committed");

for (const status of ledger.allowedStatuses) {
  assert(allowedStatuses.has(status), `unknown allowed status ${status}`);
}
for (const severity of ledger.allowedSeverities) {
  assert(allowedSeverities.has(severity), `unknown allowed severity ${severity}`);
}
for (const pattern of secretLikePatterns) {
  assert(!pattern.test(ledgerSource), "ledger appears to contain a secret-shaped string");
}

const activeFeedbackLoopIds = new Set();
for (const loop of ledger.activeFeedbackLoops) {
  assert(typeof loop.id === "string", "active feedback loop is missing id");
  assert(
    /^VANTA-ZK-FEEDBACK-\d{4}-\d{2}-\d{2}-[A-Z0-9-]+$/u.test(loop.id),
    `${loop.id} is not a stable Vanta ZK feedback-loop id`,
  );
  assert(!activeFeedbackLoopIds.has(loop.id), `${loop.id} active feedback loop is duplicated`);
  activeFeedbackLoopIds.add(loop.id);
  assert(
    typeof loop.status === "string" && loop.status.includes("feedback-loop"),
    `${loop.id} missing feedback-loop status`,
  );
  assert(Array.isArray(loop.sourceReviewRefs) && loop.sourceReviewRefs.length > 0, `${loop.id} missing sourceReviewRefs`);
  assert(typeof loop.summary === "string" && loop.summary.length > 20, `${loop.id} missing summary`);
  assert(Array.isArray(loop.localVerification) && loop.localVerification.length > 0, `${loop.id} missing localVerification`);
  assert(typeof loop.truthBoundary === "string" && loop.truthBoundary.length > 20, `${loop.id} missing truthBoundary`);

  const lumi = loop.lumiHygiene ?? {};
  for (const key of ["local", "committed", "pushed", "deployedLive"]) {
    assert(typeof lumi[key] === "string" && lumi[key].length > 0, `${loop.id} missing lumiHygiene.${key}`);
  }
  assertPinnedCommittedText(lumi.committed, `${loop.id} lumiHygiene.committed`);

  for (const command of loop.localVerification) {
    if (!command.startsWith("npm run ")) {
      continue;
    }
    const scriptName = command.slice("npm run ".length).split(/\s/u)[0];
    assert(Object.hasOwn(scripts, scriptName), `${loop.id} localVerification references missing package script ${scriptName}`);
  }
}

const sendWitnessLoopId = "VANTA-ZK-FEEDBACK-2026-05-12-SEND-WITNESS-INPUT-PROVER";
assert(activeFeedbackLoopIds.has(sendWitnessLoopId), `${sendWitnessLoopId} active feedback loop is missing`);
const sendWitnessLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === sendWitnessLoopId);
const sendWitnessLoopText = JSON.stringify(sendWitnessLoop);
assert(
  sendWitnessLoop?.localVerification?.includes("npm run private-pool-v2:send-witness-prover-check"),
  `${sendWitnessLoopId} must record the Send witness prover guard`,
);
assert(sendWitnessLoopText.includes("send-public-input-hash"), `${sendWitnessLoopId} must record Send public-input binding`);
assert(sendWitnessLoopText.includes("local-bb-derived-artifact"), `${sendWitnessLoopId} must record the derived artifact backend`);
assert(sendWitnessLoopText.includes("baaff54"), `${sendWitnessLoopId} must pin the implementation commit`);

const rootProvenanceLoopId = "VANTA-ZK-FEEDBACK-2026-05-12-C01-ROOT-PROVENANCE-RECORD";
assert(activeFeedbackLoopIds.has(rootProvenanceLoopId), `${rootProvenanceLoopId} active feedback loop is missing`);
const rootProvenanceLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === rootProvenanceLoopId);
const rootProvenanceLoopText = JSON.stringify(rootProvenanceLoop);
assert(
  rootProvenanceLoop?.localVerification?.includes("npm run private-pool-v2:root-provenance-check"),
  `${rootProvenanceLoopId} must record the root provenance guard`,
);
assert(rootProvenanceLoopText.includes("TAG_REGISTER_PROVENANCED_ROOT = 4"), `${rootProvenanceLoopId} must record tag 4`);
assert(rootProvenanceLoopText.includes("vanta2root"), `${rootProvenanceLoopId} must record the root record PDA seed`);
assert(rootProvenanceLoopText.includes("lineage-bound"), `${rootProvenanceLoopId} must record lineage-bound provenance`);
assert(rootProvenanceLoopText.includes("not proof that the root transition is correct"), `${rootProvenanceLoopId} must preserve the proof boundary`);
assert(rootProvenanceLoopText.includes("c28e922"), `${rootProvenanceLoopId} must pin the implementation commit`);

const c01VerifierReadyLoopId = "VANTA-ZK-FEEDBACK-2026-05-12-C01-VERIFIER-READY-EVIDENCE-GUARD";
assert(activeFeedbackLoopIds.has(c01VerifierReadyLoopId), `${c01VerifierReadyLoopId} active feedback loop is missing`);
const c01VerifierReadyLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === c01VerifierReadyLoopId);
const c01VerifierReadyLoopText = JSON.stringify(c01VerifierReadyLoop);
assert(
  c01VerifierReadyLoop?.localVerification?.includes("npm run zk:c01-production-verifier-backend-candidate-check"),
  `${c01VerifierReadyLoopId} must record the C01 production verifier backend candidate guard`,
);
assert(c01VerifierReadyLoopText.includes("offchain-remote-proof-artifact-only"), `${c01VerifierReadyLoopId} must record the offchain-only evidence marker`);
assert(c01VerifierReadyLoopText.includes("solana-c01-groth16-verifier-ready"), `${c01VerifierReadyLoopId} must record the C01 verifier-ready marker`);
assert(c01VerifierReadyLoopText.includes("b766bad"), `${c01VerifierReadyLoopId} must pin the implementation commit`);

const c01VerifierBackendDecisionLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-BACKEND-DECISION-PACKET";
assert(activeFeedbackLoopIds.has(c01VerifierBackendDecisionLoopId), `${c01VerifierBackendDecisionLoopId} active feedback loop is missing`);
const c01VerifierBackendDecisionLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01VerifierBackendDecisionLoopId,
);
const c01VerifierBackendDecisionLoopText = JSON.stringify(c01VerifierBackendDecisionLoop);
assert(
  c01VerifierBackendDecisionLoop?.localVerification?.includes("npm run zk:c01-verifier-backend-decision-check"),
  `${c01VerifierBackendDecisionLoopId} must record the C01 verifier backend decision guard`,
);
assert(
  c01VerifierBackendDecisionLoopText.includes("docs/zk/c01-production-verifier-backend-decision.md"),
  `${c01VerifierBackendDecisionLoopId} must record the decision packet path`,
);
assert(c01VerifierBackendDecisionLoopText.includes("no production verifier backend is selected yet"), `${c01VerifierBackendDecisionLoopId} must preserve the decision boundary`);
assert(c01VerifierBackendDecisionLoopText.includes("Groth16 tag-3 Solana verifier path"), `${c01VerifierBackendDecisionLoopId} must record the Groth16 option`);
assert(c01VerifierBackendDecisionLoopText.includes("Noir/bb.js/UltraHonk adaptation path"), `${c01VerifierBackendDecisionLoopId} must record the UltraHonk option`);
assert(c01VerifierBackendDecisionLoopText.includes("0e1ca25"), `${c01VerifierBackendDecisionLoopId} must pin the implementation commit`);

const ids = new Set();
for (const finding of ledger.findings) {
  assert(typeof finding.id === "string", "finding is missing id");
  assert(/^VANTA-ZK-2026-05-09-[CHM]\d{2}$/u.test(finding.id), `${finding.id} is not a stable VANTA ZK finding id`);
  assert(!ids.has(finding.id), `${finding.id} is duplicated`);
  ids.add(finding.id);

  assert(Number.isInteger(finding.sourceFindingNumber), `${finding.id} missing numeric sourceFindingNumber`);
  assert(typeof finding.title === "string" && finding.title.length > 10, `${finding.id} missing useful title`);
  assert(allowedSeverities.has(finding.severity), `${finding.id} has invalid severity ${finding.severity}`);
  assert(allowedStatuses.has(finding.status), `${finding.id} has invalid status ${finding.status}`);
  assert(typeof finding.claimAtRisk === "string" && finding.claimAtRisk.length > 20, `${finding.id} missing claimAtRisk`);
  assert(typeof finding.failureMode === "string" && finding.failureMode.length > 20, `${finding.id} missing failureMode`);
  assert(Array.isArray(finding.evidenceRefs) && finding.evidenceRefs.length > 0, `${finding.id} missing evidenceRefs`);
  assert(Array.isArray(finding.requiredFix) && finding.requiredFix.length > 0, `${finding.id} missing requiredFix`);
  assert(typeof finding.truthBoundary === "string" && finding.truthBoundary.length > 20, `${finding.id} missing truthBoundary`);

  const verification = finding.verification ?? {};
  assert(Array.isArray(verification.commands) && verification.commands.length > 0, `${finding.id} missing verification.commands`);
  assert(typeof verification.localResult === "string" && verification.localResult.length > 10, `${finding.id} missing verification.localResult`);
  assert(typeof verification.proves === "string" && verification.proves.length > 10, `${finding.id} missing verification.proves`);
  assert(typeof verification.doesNotProve === "string" && verification.doesNotProve.length > 10, `${finding.id} missing verification.doesNotProve`);

  const remediation = finding.codexRemediation ?? {};
  assert(Array.isArray(remediation.commits) && remediation.commits.length > 0, `${finding.id} missing codexRemediation.commits`);
  for (const [index, commitRef] of remediation.commits.entries()) {
    assertPinnedCommittedText(commitRef, `${finding.id} codexRemediation.commits[${index}]`);
  }
  assert(typeof remediation.summary === "string" && remediation.summary.length > 20, `${finding.id} missing codexRemediation.summary`);
  assert(Array.isArray(remediation.residualRisk), `${finding.id} missing codexRemediation.residualRisk`);

  const lumi = finding.lumiHygiene ?? {};
  for (const key of ["local", "committed", "pushed", "deployedLive"]) {
    assert(typeof lumi[key] === "string" && lumi[key].length > 0, `${finding.id} missing lumiHygiene.${key}`);
  }
  assertPinnedCommittedText(lumi.committed, `${finding.id} lumiHygiene.committed`);

  const staleControl = finding.staleControl ?? {};
  assert(Array.isArray(staleControl.watchFiles) && staleControl.watchFiles.length > 0, `${finding.id} missing staleControl.watchFiles`);
  assert(Array.isArray(staleControl.watchCommands) && staleControl.watchCommands.length > 0, `${finding.id} missing staleControl.watchCommands`);

  for (const command of [...verification.commands, ...staleControl.watchCommands]) {
    const match = /^npm run ([A-Za-z0-9:_-]+)$/u.exec(command);
    assert(match, `${finding.id} command must be written as "npm run <script>": ${command}`);
    assert(Object.hasOwn(scripts, match[1]), `${finding.id} references missing package script ${match[1]}`);
  }

  for (const ref of finding.evidenceRefs) {
    if (ref.startsWith("npm run ")) {
      const scriptName = ref.slice("npm run ".length);
      assert(Object.hasOwn(scripts, scriptName), `${finding.id} evidence references missing package script ${scriptName}`);
    }
  }

  if (["live-verified", "accepted-closed"].includes(finding.status)) {
    const liveEvidence = `${finding.truthBoundary} ${finding.lumiHygiene.deployedLive} ${finding.verification.localResult}`;
    assert(!/not-live-verified|local/i.test(liveEvidence), `${finding.id} cannot claim ${finding.status} with local or not-live evidence`);
  }
}

for (const expectedId of expectedIds) {
  assert(ids.has(expectedId), `missing expected original review finding ${expectedId}`);
}

const findingById = new Map(ledger.findings.map((finding) => [finding.id, finding]));
const c01 = findingById.get("VANTA-ZK-2026-05-09-C01");
const h08 = findingById.get("VANTA-ZK-2026-05-09-H08");
const c01Text = JSON.stringify(c01);
const h08Text = JSON.stringify(h08);

assert(c01, "missing C01 finding");
assert(h08, "missing H08 finding");
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("71e8932")),
  "C01 must record the Unshield vault preflight commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("c28e922")),
  "C01 must record the root provenance implementation commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("b766bad")),
  "C01 must record the verifier-ready evidence guard commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("0e1ca25")),
  "C01 must record the verifier backend decision packet commit",
);
assert(c01Text.includes("TAG_UNSHIELD = 6"), "C01 must record the source-only TAG_UNSHIELD preflight truth");
assert(c01Text.includes("TAG_REGISTER_PROVENANCED_ROOT = 4"), "C01 must record the source-only TAG_REGISTER_PROVENANCED_ROOT truth");
assert(c01Text.includes("vanta2root"), "C01 must record the root-record PDA seed");
assert(c01Text.includes("private-pool-v2:root-provenance-check"), "C01 must record the root provenance guard");
assert(
  c01Text.includes("zk:c01-production-verifier-backend-candidate-check"),
  "C01 must record the production verifier backend candidate guard",
);
assert(
  c01Text.includes("zk:c01-verifier-backend-decision-check"),
  "C01 must record the verifier backend decision guard",
);
assert(
  c01Text.includes("docs/zk/c01-production-verifier-backend-decision.md"),
  "C01 must record the verifier backend decision packet",
);
assert(
  c01Text.includes("offchain-remote-proof-artifact-only"),
  "C01 must record the offchain-only remote proof-artifact evidence marker",
);
assert(
  c01Text.includes("solana-c01-groth16-verifier-ready"),
  "C01 must record the Solana C01 verifier-ready evidence marker",
);
assert(c01Text.includes("not proof that the root transition is correct"), "C01 must preserve the root transition proof boundary");
assert(c01Text.includes("legacy tag 2 roots"), "C01 must record the legacy-root no-backfill boundary");
assert(
  h08.verification.commands.includes("npm run private-pool-v2:send-witness-prover-check"),
  "H08 verification commands must include the Send witness prover guard",
);
assert(
  h08.verification.commands.includes("npm run private-pool-v2:browser-worker-prover-check"),
  "H08 verification commands must include the Send browser worker prover guard",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("baaff54")),
  "H08 must record the Send witness proof path commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("7f5c57c")),
  "H08 must record the Send browser worker prover commit",
);
assert(h08Text.includes("send-public-input-hash"), "H08 must record Send public-input hash binding");
assert(h08Text.includes("local-bb-derived-artifact"), "H08 must record the derived artifact backend");
assert(h08Text.includes("browser/Web Worker proof-execution"), "H08 must record the browser worker proof-execution boundary");
assert(
  h08Text.includes("does not generate witnesses in the browser"),
  "H08 must preserve the browser witness-generation limitation",
);

const severityCounts = ledger.findings.reduce((counts, finding) => {
  counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  return counts;
}, {});
assert(severityCounts.critical === 5, "ledger must represent five critical findings");
assert(severityCounts.high === 3, "ledger must represent three high findings");
assert(severityCounts.medium === 5, "ledger must represent five medium findings");

assert(
  scripts["zk:review-findings-ledger-check"] === "node scripts/check-vanta-zk-review-findings-ledger.mjs",
  "package.json must expose zk:review-findings-ledger-check",
);
assert(
  scripts["zk:review-guards-check"]?.includes("npm run zk:review-findings-ledger-check"),
  "zk:review-guards-check must include zk:review-findings-ledger-check",
);

console.log("Vanta ZK review findings ledger: PASS");
console.log(
  JSON.stringify(
    {
      findings: ledger.findings.length,
      severityCounts,
      statuses: [...new Set(ledger.findings.map((finding) => finding.status))].sort(),
      liveVerifiedCount: ledger.findings.filter((finding) => finding.status === "live-verified").length,
      acceptedClosedCount: ledger.findings.filter((finding) => finding.status === "accepted-closed").length,
    },
    null,
    2,
  ),
);
