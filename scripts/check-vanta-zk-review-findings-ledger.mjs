import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, resolve } from "node:path";

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

function assertNoSecretValues(source, label) {
  for (const pattern of secretValuePatterns) {
    assert(!pattern.test(source), `${label} appears to contain a secret-shaped string`);
  }
  for (const pattern of forbiddenStructuredAssignmentPatterns) {
    assert(!pattern.test(source), `${label} appears to contain a structured secret/report/witness field`);
  }
}

function assertSecretLeakSelfTests() {
  const secretValueSamples = [
    ["Bearer", "abcdefghijklmnopqrstuvwxyz123456"].join(" "),
    ["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("_"),
    ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_"),
    ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
  ];
  for (const sample of secretValueSamples) {
    assert(
      secretValuePatterns.some((pattern) => pattern.test(sample)),
      `secret leak guard self-test missed ${sample}`,
    );
  }
  for (const key of [
    "privateKey",
    "seed_phrase",
    "reportBody",
    "legal_text",
    "signedTransactionBytes",
    "raw_witness",
    "providerCredentials",
  ]) {
    assert(
      forbiddenStructuredSecretKeyPatterns.some((pattern) => pattern.test(key)),
      `structured secret key guard self-test missed ${key}`,
    );
  }
  for (const sample of [
    "report_body: ...",
    "\"signedTransactionBytes\": \"...\"",
    "raw_witness = ...",
  ]) {
    assert(
      forbiddenStructuredAssignmentPatterns.some((pattern) => pattern.test(sample)),
      `structured assignment guard self-test missed ${sample}`,
    );
  }
}

function assertRepoLocalRefOrCommand(ref, label) {
  assert(typeof ref === "string" && ref.length > 0, `${label} must be a non-empty string`);

  if (ref.startsWith("npm run ")) {
    const scriptName = ref.slice("npm run ".length).split(/\s/u)[0];
    assert(Object.hasOwn(scripts, scriptName), `${label} references missing package script ${scriptName}`);
    return;
  }

  assert(!isAbsolute(ref), `${label} must be repo-local, not absolute: ${ref}`);
  assert(!ref.includes("://"), `${label} must be repo-local, not a URL: ${ref}`);
  assert(!ref.startsWith("../"), `${label} must stay inside the repo: ${ref}`);
  assert(!ref.includes("/../"), `${label} must stay inside the repo: ${ref}`);

  const [pathPart] = ref.split("#");
  assert(pathPart.length > 0, `${label} must include a repo path before any anchor: ${ref}`);
  assert(existsSync(resolve(repoRoot, pathPart)), `${label} must point to an existing repo path: ${ref}`);
}

function walkLedger(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkLedger(entry, visitor, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      visitor(key, `${path}.${key}#key`);
      walkLedger(entry, visitor, `${path}.${key}`);
    }
  }
}

assert(existsSync(reviewPath), "missing VANTA_ZK_REVIEW.md");
assert(existsSync(ledgerPath), "missing VANTA_ZK_REVIEW.findings.json");

const ledgerSource = readFileSync(ledgerPath, "utf8");
const reviewSource = readFileSync(reviewPath, "utf8");
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
const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bBearer\s+[A-Za-z0-9._=-]{20,}\b/u,
  /\b(?:sk|pk|secret|api[_-]?key|token)_(?:live|prod|mainnet)_[A-Za-z0-9]{12,}\b/u,
  /\b(?:gh[pousr]|xox[baprs])[-_][A-Za-z0-9_-]{20,}\b/u,
];
const forbiddenStructuredSecretKeyPatterns = [
  /^(?:private[_-]?key|privateKey)$/iu,
  /^(?:seed[_-]?phrase|seedPhrase)$/iu,
  /^mnemonic$/iu,
  /^(?:secret[_-]?value|secretValue)$/iu,
  /^(?:signed[_-]?transaction(?:[_-]?bytes?)?|signedTransactionBytes)$/iu,
  /^(?:customer[_-]?private[_-]?inputs?|customerPrivateInputs?)$/iu,
  /^(?:report[_-]?bod(?:y|ies)|reportBody)$/iu,
  /^(?:legal[_-]?text|legalText)$/iu,
  /^(?:raw[_-]?witness|rawWitness)$/iu,
  /^(?:provider[_-]?credentials?|providerCredentials?)$/iu,
  /^(?:live[_-]?provider(?:[_-]?credentials?)?|liveProviderCredentials?)$/iu,
  /^(?:under[_-]?nda|underNda)$/iu,
];
const forbiddenStructuredAssignmentPatterns = [
  /["']?(?:private[_-]?key|privateKey)["']?\s*[:=]/iu,
  /["']?(?:seed[_-]?phrase|seedPhrase)["']?\s*[:=]/iu,
  /["']?mnemonic["']?\s*[:=]/iu,
  /["']?(?:signed[_-]?transaction(?:[_-]?bytes?)?|signedTransactionBytes)["']?\s*[:=]/iu,
  /["']?(?:report[_-]?bod(?:y|ies)|reportBody)["']?\s*[:=]/iu,
  /["']?(?:legal[_-]?text|legalText)["']?\s*[:=]/iu,
  /["']?(?:raw[_-]?witness|rawWitness)["']?\s*[:=]/iu,
  /["']?(?:provider[_-]?credentials?|providerCredentials?)["']?\s*[:=]/iu,
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
assertSecretLeakSelfTests();
assertNoSecretValues(ledgerSource, "ledger");
assertNoSecretValues(reviewSource, "review document");
walkLedger(ledger, (value, path) => {
  if (typeof value !== "string" || !path.endsWith("#key")) {
    return;
  }
  for (const pattern of forbiddenStructuredSecretKeyPatterns) {
    assert(!pattern.test(value), `ledger uses forbidden secret/report/witness key at ${path}`);
  }
});

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
  loop.sourceReviewRefs.forEach((ref, index) => {
    assertRepoLocalRefOrCommand(ref, `${loop.id} sourceReviewRefs[${index}]`);
  });
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

const c01VerifierCandidateEvidenceLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-CANDIDATE-EVIDENCE-PACKET";
assert(
  activeFeedbackLoopIds.has(c01VerifierCandidateEvidenceLoopId),
  `${c01VerifierCandidateEvidenceLoopId} active feedback loop is missing`,
);
const c01VerifierCandidateEvidenceLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01VerifierCandidateEvidenceLoopId,
);
const c01VerifierCandidateEvidenceLoopText = JSON.stringify(c01VerifierCandidateEvidenceLoop);
assert(
  c01VerifierCandidateEvidenceLoop?.localVerification?.includes(
    "npm run zk:c01-production-verifier-backend-candidate-check",
  ),
  `${c01VerifierCandidateEvidenceLoopId} must record the C01 verifier candidate evidence guard`,
);
assert(
  c01VerifierCandidateEvidenceLoop?.localVerification?.includes("npm run public:audit-discovery-check"),
  `${c01VerifierCandidateEvidenceLoopId} must record the public audit discovery guard`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes(
    "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  ),
  `${c01VerifierCandidateEvidenceLoopId} must record the evidence packet path`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes("selectedBackend: null"),
  `${c01VerifierCandidateEvidenceLoopId} must preserve no backend selected`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes("offchain-remote-proof-artifact-only"),
  `${c01VerifierCandidateEvidenceLoopId} must preserve offchain-only proof evidence`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes("local-acir-bytecode-hash-not-production-vk"),
  `${c01VerifierCandidateEvidenceLoopId} must preserve local ACIR is not production VK`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes("production verifying-key"),
  `${c01VerifierCandidateEvidenceLoopId} must record the production verifying-key evidence boundary`,
);
assert(
  c01VerifierCandidateEvidenceLoopText.includes("solana-c01-groth16-verifier-ready"),
  `${c01VerifierCandidateEvidenceLoopId} must record the blocked verifier-ready marker`,
);
assert(c01VerifierCandidateEvidenceLoopText.includes("0ed3fab"), `${c01VerifierCandidateEvidenceLoopId} must pin the implementation commit`);

const c01LocalProofFormatLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-LOCAL-PROOF-FORMAT-OBSERVATION";
assert(
  activeFeedbackLoopIds.has(c01LocalProofFormatLoopId),
  `${c01LocalProofFormatLoopId} active feedback loop is missing`,
);
const c01LocalProofFormatLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01LocalProofFormatLoopId,
);
const c01LocalProofFormatLoopText = JSON.stringify(c01LocalProofFormatLoop);
for (const command of [
  "npm run zk:c01-local-proof-format-evidence-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-contract-check",
  "npm run zk:c01-onchain-proof-boundary-check",
  "npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
]) {
  assert(
    c01LocalProofFormatLoop?.localVerification?.includes(command),
    `${c01LocalProofFormatLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json",
  "16000-byte",
  "500-field",
  "private-spend-public-input-hash",
  "local-acir-bytecode-hash-not-production-vk",
  "256 proof bytes",
  "production-verifying-key-hash",
  "not production proof-format acceptance",
  "not tag-3 proof acceptance",
  "28e07f6",
]) {
  assert(
    c01LocalProofFormatLoopText.includes(phrase),
    `${c01LocalProofFormatLoopId} must record ${phrase}`,
  );
}

const c01VerifierKeyRegistryLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-KEY-REGISTRY";
assert(
  activeFeedbackLoopIds.has(c01VerifierKeyRegistryLoopId),
  `${c01VerifierKeyRegistryLoopId} active feedback loop is missing`,
);
const c01VerifierKeyRegistryLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01VerifierKeyRegistryLoopId,
);
const c01VerifierKeyRegistryLoopText = JSON.stringify(c01VerifierKeyRegistryLoop);
for (const command of [
  "cargo test --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml",
  "npm run zk:c01-verifier-key-registry-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-contract-check",
  "npm run zk:c01-onchain-proof-boundary-check",
]) {
  assert(
    c01VerifierKeyRegistryLoop?.localVerification?.includes(command),
    `${c01VerifierKeyRegistryLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "TAG_REGISTER_VERIFIER_KEY = 5",
  "source-only verifier-key registry scaffold",
  "ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json",
  "vanta2vkey",
  "not production verifying-key evidence",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "a2fa2f4",
]) {
  assert(
    c01VerifierKeyRegistryLoopText.includes(phrase),
    `${c01VerifierKeyRegistryLoopId} must record ${phrase}`,
  );
}

const c01CrucibleHarnessLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-CRUCIBLE-HARNESS-HARDENING";
assert(
  activeFeedbackLoopIds.has(c01CrucibleHarnessLoopId),
  `${c01CrucibleHarnessLoopId} active feedback loop is missing`,
);
const c01CrucibleHarnessLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01CrucibleHarnessLoopId,
);
const c01CrucibleHarnessLoopText = JSON.stringify(c01CrucibleHarnessLoop);
for (const command of [
  "cargo check --manifest-path fuzz/vanta_private_pool_v2_spend/Cargo.toml --features invariant_test",
  "npm run private-pool-v2:crucible-check",
  "npm run zk:c01-verifier-key-registry-check",
  "npm run private-pool-v2:root-provenance-check",
  "npm run private-pool-v2:contract-check",
  "npm run private-pool-v2:verify",
]) {
  assert(
    c01CrucibleHarnessLoop?.localVerification?.includes(command),
    `${c01CrucibleHarnessLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "legacy tag 2 root registration",
  "tag 5 verifier-key registration",
  "wrong root-record PDA rejection",
  "duplicate-nullifier Unshield rejection",
  "4e640b1",
  "not proof acceptance",
]) {
  assert(
    c01CrucibleHarnessLoopText.includes(phrase),
    `${c01CrucibleHarnessLoopId} must record ${phrase}`,
  );
}

const c01VerifierBackendOptionsLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-BACKEND-OPTIONS";
assert(
  activeFeedbackLoopIds.has(c01VerifierBackendOptionsLoopId),
  `${c01VerifierBackendOptionsLoopId} active feedback loop is missing`,
);
const c01VerifierBackendOptionsLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01VerifierBackendOptionsLoopId,
);
const c01VerifierBackendOptionsLoopText = JSON.stringify(c01VerifierBackendOptionsLoop);
for (const command of [
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-contract-check",
]) {
  assert(
    c01VerifierBackendOptionsLoop?.localVerification?.includes(command),
    `${c01VerifierBackendOptionsLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json",
  "groth16-tag3-solana-v0",
  "noir-bb-ultrahonk-adaptation",
  "selectedBackend: null",
  "does not select a backend",
  "1153f4e",
]) {
  assert(
    c01VerifierBackendOptionsLoopText.includes(phrase),
    `${c01VerifierBackendOptionsLoopId} must record ${phrase}`,
  );
}

const c01Groth16ProofFormatCandidateLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-GROTH16-PROOF-FORMAT-CANDIDATE";
assert(
  activeFeedbackLoopIds.has(c01Groth16ProofFormatCandidateLoopId),
  `${c01Groth16ProofFormatCandidateLoopId} active feedback loop is missing`,
);
const c01Groth16ProofFormatCandidateLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01Groth16ProofFormatCandidateLoopId,
);
const c01Groth16ProofFormatCandidateLoopText = JSON.stringify(c01Groth16ProofFormatCandidateLoop);
for (const command of [
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run private-pool-v2:verify",
]) {
  assert(
    c01Groth16ProofFormatCandidateLoop?.localVerification?.includes(command),
    `${c01Groth16ProofFormatCandidateLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json",
  "blocked-no-groth16-production-proof-format-artifact",
  "groth16-tag3-solana-v0",
  "solana-c01-tag3-groth16-v0",
  "groth16Proof:256",
  "private-spend-public-input-hash",
  "production-verifying-key-hash",
  "noir-bb / barretenberg-ultrahonk / 16000 bytes / 500 fields",
  "local-acir-bytecode-hash-not-production-vk",
  "not production proof-format evidence",
  "faead7b",
]) {
  assert(
    c01Groth16ProofFormatCandidateLoopText.includes(phrase),
    `${c01Groth16ProofFormatCandidateLoopId} must record ${phrase}`,
  );
}

const c01ProductionVerifyingKeyCandidateLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-PRODUCTION-VERIFYING-KEY-CANDIDATE";
assert(
  activeFeedbackLoopIds.has(c01ProductionVerifyingKeyCandidateLoopId),
  `${c01ProductionVerifyingKeyCandidateLoopId} active feedback loop is missing`,
);
const c01ProductionVerifyingKeyCandidateLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01ProductionVerifyingKeyCandidateLoopId,
);
const c01ProductionVerifyingKeyCandidateLoopText = JSON.stringify(c01ProductionVerifyingKeyCandidateLoop);
for (const command of [
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-verifier-key-registry-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-contract-check",
  "npm run zk:c01-onchain-proof-boundary-check",
  "npm run zk:review-guards-check",
  "git diff --check",
]) {
  assert(
    c01ProductionVerifyingKeyCandidateLoop?.localVerification?.includes(command),
    `${c01ProductionVerifyingKeyCandidateLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json",
  "blocked-no-production-verifying-key-hash-artifact",
  "groth16-tag3-solana-v0",
  "solana-c01-tag3-groth16-v0",
  "groth16Proof:256",
  "private-spend-public-input-hash",
  "production-verifying-key-hash",
  "tag 5 registry metadata remains source-only",
  "local-acir-bytecode-hash-not-production-vk",
  "not production verifying-key evidence",
  "c82b23d",
]) {
  assert(
    c01ProductionVerifyingKeyCandidateLoopText.includes(phrase),
    `${c01ProductionVerifyingKeyCandidateLoopId} must record ${phrase}`,
  );
}

const c01VerifierAdapterTestCandidateLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-C01-VERIFIER-ADAPTER-TEST-CANDIDATE";
assert(
  activeFeedbackLoopIds.has(c01VerifierAdapterTestCandidateLoopId),
  `${c01VerifierAdapterTestCandidateLoopId} active feedback loop is missing`,
);
const c01VerifierAdapterTestCandidateLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === c01VerifierAdapterTestCandidateLoopId,
);
const c01VerifierAdapterTestCandidateLoopText = JSON.stringify(c01VerifierAdapterTestCandidateLoop);
for (const command of [
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-backend-options-check",
  "npm run zk:c01-groth16-proof-format-candidate-check",
  "npm run zk:c01-production-verifying-key-candidate-check",
  "npm run zk:c01-verifier-key-registry-check",
  "npm run zk:c01-verifier-backend-decision-check",
  "npm run zk:c01-verifier-backend-contract-check",
  "npm run zk:c01-onchain-proof-boundary-check",
  "npm run zk:review-findings-ledger-check",
  "npm run zk:review-guards-check",
  "git diff --check",
]) {
  assert(
    c01VerifierAdapterTestCandidateLoop?.localVerification?.includes(command),
    `${c01VerifierAdapterTestCandidateLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "blocked-no-verifier-adapter-acceptance-tests",
  "groth16-tag3-solana-v0",
  "solana-c01-tag3-groth16-v0",
  "groth16Proof:256",
  "private-spend-public-input-hash",
  "production-verifying-key-hash",
  "in-program verifier or dedicated verifier CPI adapter",
  "current artifact refs null",
  "valid-proof mutation",
  "invalid-proof no-mutation",
  "wrong-public-input-hash no-mutation",
  "wrong-verifying-key no-mutation",
  "reserved tag 3",
  "ERR_PROOF_VERIFIER_NOT_WIRED",
  "not verifier-adapter acceptance",
  "c0831fe",
]) {
  assert(
    c01VerifierAdapterTestCandidateLoopText.includes(phrase),
    `${c01VerifierAdapterTestCandidateLoopId} must record ${phrase}`,
  );
}

const copyClaimBoundaryLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-COPY-CLAIM-BOUNDARY";
assert(activeFeedbackLoopIds.has(copyClaimBoundaryLoopId), `${copyClaimBoundaryLoopId} active feedback loop is missing`);
const copyClaimBoundaryLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === copyClaimBoundaryLoopId);
const copyClaimBoundaryLoopText = JSON.stringify(copyClaimBoundaryLoop);
assert(
  copyClaimBoundaryLoop?.localVerification?.includes("npm run truth:privacy-claim-gate"),
  `${copyClaimBoundaryLoopId} must record the privacy claim gate`,
);
assert(
  copyClaimBoundaryLoop?.localVerification?.includes("npm run product-ui:browser-check"),
  `${copyClaimBoundaryLoopId} must record the product UI browser guard`,
);
assert(
  copyClaimBoundaryLoopText.includes("Beta · receipts where available · 6 claim locks active"),
  `${copyClaimBoundaryLoopId} must record the safer status-strip framing`,
);
assert(
  copyClaimBoundaryLoopText.includes("future-state overclaims"),
  `${copyClaimBoundaryLoopId} must record the future-state copy guard`,
);
assert(copyClaimBoundaryLoopText.includes("8ac1586"), `${copyClaimBoundaryLoopId} must pin the implementation commit`);

const copyClarityFollowUpLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-COPY-CLARITY-FOLLOW-UP";
assert(activeFeedbackLoopIds.has(copyClarityFollowUpLoopId), `${copyClarityFollowUpLoopId} active feedback loop is missing`);
const copyClarityFollowUpLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === copyClarityFollowUpLoopId);
const copyClarityFollowUpLoopText = JSON.stringify(copyClarityFollowUpLoop);
assert(
  copyClarityFollowUpLoop?.localVerification?.includes("npm run shield:capability-check"),
  `${copyClarityFollowUpLoopId} must record the Shield capability guard`,
);
assert(
  copyClarityFollowUpLoop?.localVerification?.includes("npm run docs:browser-check"),
  `${copyClarityFollowUpLoopId} must record the docs browser guard`,
);
assert(
  copyClarityFollowUpLoopText.includes("No send-ready balance yet"),
  `${copyClarityFollowUpLoopId} must record the safer Send empty-state copy`,
);
assert(
  copyClarityFollowUpLoopText.includes("configured Shield target first"),
  `${copyClarityFollowUpLoopId} must record the safer Shield unsupported-target copy`,
);
assert(
  copyClarityFollowUpLoopText.includes("vague-product-copy hedges"),
  `${copyClarityFollowUpLoopId} must record the supported-copy hedge boundary`,
);
assert(copyClarityFollowUpLoopText.includes("f3d5135"), `${copyClarityFollowUpLoopId} must pin the implementation commit`);

const payProgressiveDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-PAY-PROGRESSIVE-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(payProgressiveDisclosureLoopId),
  `${payProgressiveDisclosureLoopId} active feedback loop is missing`,
);
const payProgressiveDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === payProgressiveDisclosureLoopId,
);
const payProgressiveDisclosureLoopText = JSON.stringify(payProgressiveDisclosureLoop);
for (const command of [
  "npm run pay-tab:copy-check",
  "npm run pay:doc-truth-check",
  "npm run pay:browser-check",
  "npm run product-ui:browser-check",
  "npm run truth:privacy-claim-gate",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run pay:verify",
  "npm run build",
]) {
  assert(
    payProgressiveDisclosureLoop?.localVerification?.includes(command),
    `${payProgressiveDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "Advanced payment settings",
  "Customer email",
  "Checkout type",
  "hidden before opening",
  "Solana spend account-ref gate",
  "not Pay production readiness",
  "not customer-side ZK Pay proof V8",
  "7175dae",
]) {
  assert(
    payProgressiveDisclosureLoopText.includes(phrase),
    `${payProgressiveDisclosureLoopId} must record ${phrase}`,
  );
}

const strategyProgressiveDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-STRATEGY-PROGRESSIVE-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(strategyProgressiveDisclosureLoopId),
  `${strategyProgressiveDisclosureLoopId} active feedback loop is missing`,
);
const strategyProgressiveDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === strategyProgressiveDisclosureLoopId,
);
const strategyProgressiveDisclosureLoopText = JSON.stringify(strategyProgressiveDisclosureLoop);
for (const command of [
  "npm run strategy:page-state-check",
  "npm run strategy-tab:copy-check",
  "npm run strategy:browser-check",
  "npm run strategy:private-rail-trust-contract-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run strategy:verify",
  "npm run build",
]) {
  assert(
    strategyProgressiveDisclosureLoop?.localVerification?.includes(command),
    `${strategyProgressiveDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "Advanced strategy settings",
  "What are you trying to do?",
  "Preview strategy",
  "Trade size variation",
  "Schedule pattern",
  "Pay from",
  "Settle to",
  "hidden before opening",
  "not Strategy production readiness",
  "not live strategy execution",
  "cc99583",
]) {
  assert(
    strategyProgressiveDisclosureLoopText.includes(phrase),
    `${strategyProgressiveDisclosureLoopId} must record ${phrase}`,
  );
}

const shieldAdvancedDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SHIELD-ADVANCED-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(shieldAdvancedDisclosureLoopId),
  `${shieldAdvancedDisclosureLoopId} active feedback loop is missing`,
);
const shieldAdvancedDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === shieldAdvancedDisclosureLoopId,
);
const shieldAdvancedDisclosureLoopText = JSON.stringify(shieldAdvancedDisclosureLoop);
for (const command of [
  "npm run shield:viewing-key-custody-check",
  "npm run shield:decoy-batcher-check",
  "npm run shield:ui-claim-boundary-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run shield:verify",
  "npm run build",
]) {
  assert(
    shieldAdvancedDisclosureLoop?.localVerification?.includes(command),
    `${shieldAdvancedDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "Advanced shield settings",
  "Viewing key backup",
  "Decoy batch",
  "Custom route",
  "Automatic",
  "Default route",
  "not the full Shield redesign",
  "not /app/settings/recovery",
  "not a decoy toggle",
  "not Shield production privacy",
  "861fd1e",
]) {
  assert(
    shieldAdvancedDisclosureLoopText.includes(phrase),
    `${shieldAdvancedDisclosureLoopId} must record ${phrase}`,
  );
}

const sendProgressiveDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SEND-PROGRESSIVE-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(sendProgressiveDisclosureLoopId),
  `${sendProgressiveDisclosureLoopId} active feedback loop is missing`,
);
const sendProgressiveDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === sendProgressiveDisclosureLoopId,
);
const sendProgressiveDisclosureLoopText = JSON.stringify(sendProgressiveDisclosureLoop);
for (const command of [
  "npm run send:requires-shielded-state-check",
  "npm run send:balance-ledger-check",
  "npm run send:trust-packet-check",
  "npm run send:production-privacy-claim-gate",
  "npm run actions:memo-encryption-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run send:verify",
  "npm run build",
]) {
  assert(
    sendProgressiveDisclosureLoop?.localVerification?.includes(command),
    `${sendProgressiveDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "PrivacySummary",
  "Privacy summary",
  "Advanced send settings",
  "Custom note selection",
  "Encrypted recipient memo",
  "Automatic v2 AEAD packet",
  "Operator sees",
  "proof and settlement status",
  "forbids the stale Operator sees: nothing overclaim",
  "not the full Send rewrite",
  "not live address or .sol validation",
  "not Send production privacy",
  "488f2e7",
]) {
  assert(
    sendProgressiveDisclosureLoopText.includes(phrase),
    `${sendProgressiveDisclosureLoopId} must record ${phrase}`,
  );
}

const swapProgressiveDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SWAP-PROGRESSIVE-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(swapProgressiveDisclosureLoopId),
  `${swapProgressiveDisclosureLoopId} active feedback loop is missing`,
);
const swapProgressiveDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === swapProgressiveDisclosureLoopId,
);
const swapProgressiveDisclosureLoopText = JSON.stringify(swapProgressiveDisclosureLoop);
for (const command of [
  "npm run swap:requires-shielded-state-check",
  "npm run swap:capability-check",
  "npm run swap:committed-settlement-check",
  "npm run swap:trust-packet-check",
  "npm run swap:safe-send-adoption-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run private-core:swap-check",
  "npm run private-core:swap-boundary-check",
  "npm run private-core:swap-live-path-check",
  "npm run build",
]) {
  assert(
    swapProgressiveDisclosureLoop?.localVerification?.includes(command),
    `${swapProgressiveDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "PrivacySummary",
  "Privacy summary",
  "quote countdown progress",
  "Advanced swap settings",
  "Max slippage",
  "exact-note selection",
  "Venue routing",
  "operator-visible route settlement terms",
  "forbids stale operator/venue invisibility",
  "not the full Swap rewrite",
  "not new production-private routing",
  "not Swap production privacy",
  "a0c1664",
]) {
  assert(
    swapProgressiveDisclosureLoopText.includes(phrase),
    `${swapProgressiveDisclosureLoopId} must record ${phrase}`,
  );
}

const unshieldProgressiveDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-UNSHIELD-PROGRESSIVE-DISCLOSURE";
assert(
  activeFeedbackLoopIds.has(unshieldProgressiveDisclosureLoopId),
  `${unshieldProgressiveDisclosureLoopId} active feedback loop is missing`,
);
const unshieldProgressiveDisclosureLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === unshieldProgressiveDisclosureLoopId,
);
const unshieldProgressiveDisclosureLoopText = JSON.stringify(unshieldProgressiveDisclosureLoop);
for (const command of [
  "npm run unshield:public-exit-surface-check",
  "npm run unshield:balance-ledger-check",
  "npm run unshield:safe-send-adoption-check",
  "npm run unshield:sol-operator-endpoint-check",
  "npm run unshield:trust-packet-check",
  "npm run private-core:unshield-committed-settlement-check",
  "npm run private-pool-v2:unshield-proof-request-check",
  "npm run private-pool-v2:onchain-unshield-custody-check",
  "npm run truth:privacy-claim-gate",
  "npm run private-core:check",
  "npm run product-ui:browser-check",
  "npm run build",
]) {
  assert(
    unshieldProgressiveDisclosureLoop?.localVerification?.includes(command),
    `${unshieldProgressiveDisclosureLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "PrivacySummary",
  "Privacy summary",
  "Advanced unshield settings",
  "Custom note selection",
  "Reference note for receipt",
  "Withdraw",
  "exit terms and release status",
  "not the user's full shielded history",
  "not the full Unshield rewrite",
  "not program-owned on-chain release custody",
  "not Unshield production privacy",
  "61f2582",
]) {
  assert(
    unshieldProgressiveDisclosureLoopText.includes(phrase),
    `${unshieldProgressiveDisclosureLoopId} must record ${phrase}`,
  );
}

const sharedNotePickerLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SHARED-NOTE-PICKER";
assert(
  activeFeedbackLoopIds.has(sharedNotePickerLoopId),
  `${sharedNotePickerLoopId} active feedback loop is missing`,
);
const sharedNotePickerLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === sharedNotePickerLoopId,
);
const sharedNotePickerLoopText = JSON.stringify(sharedNotePickerLoop);
for (const command of [
  "red-first npm run notes:shared-picker-check",
  "npm run notes:shared-picker-check",
  "npm run send:requires-shielded-state-check",
  "npm run swap:requires-shielded-state-check",
  "npm run unshield:public-exit-surface-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run build",
  "npm run send:verify",
  "npm run swap:capability-check",
  "npm run swap:committed-settlement-check",
  "npm run private-core:swap-check",
  "npm run unshield:balance-ledger-check",
  "npm run unshield:trust-packet-check",
  "npm run private-core:unshield-committed-settlement-check",
]) {
  assert(
    sharedNotePickerLoop?.localVerification?.includes(command),
    `${sharedNotePickerLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "NotePicker",
  "src/components/NotePicker.tsx",
  "Send",
  "Swap",
  "Unshield",
  "advanced disclosures",
  "Empty Vault",
  "start with Shield",
  "tabular amounts",
  "exact source-note amount",
  "ledger-spendable note",
  "truth:privacy-claim-gate",
  "not the full four-lane redesign",
  "not WalletApprovalSheet",
  "not a new privacy guarantee",
  "fdf2fd8",
]) {
  assert(
    sharedNotePickerLoopText.includes(phrase),
    `${sharedNotePickerLoopId} must record ${phrase}`,
  );
}

const sharedLaneFlowIndicatorLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SHARED-LANE-FLOW-INDICATOR";
assert(
  activeFeedbackLoopIds.has(sharedLaneFlowIndicatorLoopId),
  `${sharedLaneFlowIndicatorLoopId} active feedback loop is missing`,
);
const sharedLaneFlowIndicatorLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === sharedLaneFlowIndicatorLoopId,
);
const sharedLaneFlowIndicatorLoopText = JSON.stringify(sharedLaneFlowIndicatorLoop);
for (const command of [
  "red-first npm run lanes:shared-flow-indicator-check",
  "npm run lanes:shared-flow-indicator-check",
  "npm run shield:viewing-key-custody-check",
  "npm run shield:ui-claim-boundary-check",
  "npm run send:requires-shielded-state-check",
  "npm run swap:requires-shielded-state-check",
  "npm run unshield:public-exit-surface-check",
  "npm run pay:browser-check",
  "npm run strategy:browser-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run build",
]) {
  assert(
    sharedLaneFlowIndicatorLoop?.localVerification?.includes(command),
    `${sharedLaneFlowIndicatorLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "LaneFlowIndicator",
  "src/components/LaneFlowIndicator.tsx",
  "Shield",
  "Send",
  "Swap",
  "Unshield",
  "Pay",
  "Strategy",
  "active-step horizontal sweep",
  "reduced-motion",
  "desktop and narrow mobile widths",
  "truth:privacy-claim-gate",
  "not the full four-lane redesign",
  "not AssetPickerGrid",
  "not WalletApprovalSheet",
  "not TransactionStatusToast",
  "not a new privacy guarantee",
  "9a9ed7f",
]) {
  assert(
    sharedLaneFlowIndicatorLoopText.includes(phrase),
    `${sharedLaneFlowIndicatorLoopId} must record ${phrase}`,
  );
}

const sharedAssetPickerGridLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-SHARED-ASSET-PICKER-GRID";
assert(
  activeFeedbackLoopIds.has(sharedAssetPickerGridLoopId),
  `${sharedAssetPickerGridLoopId} active feedback loop is missing`,
);
const sharedAssetPickerGridLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === sharedAssetPickerGridLoopId,
);
const sharedAssetPickerGridLoopText = JSON.stringify(sharedAssetPickerGridLoop);
for (const command of [
  "red-first npm run assets:picker-grid-check",
  "npm run assets:picker-grid-check",
  "npm run shield:asset-labels-check",
  "npm run shield:capability-check",
  "npm run shield:universal-target-check",
  "npm run shield:ui-claim-boundary-check",
  "npm run swap:requires-shielded-state-check",
  "npm run swap:capability-check",
  "npm run truth:privacy-claim-gate",
  "npm run product-ui:browser-check",
  "npm run build",
  "npm run swap:committed-settlement-check",
  "npm run private-core:swap-check",
  "npm run shield:verify",
]) {
  assert(
    sharedAssetPickerGridLoop?.localVerification?.includes(command),
    `${sharedAssetPickerGridLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "AssetPickerGrid",
  "src/components/AssetPickerGrid.tsx",
  "Shield",
  "Swap",
  "source asset",
  "target asset",
  "disabled states",
  "No shielded assets ready",
  "operator-visible",
  "exact-note",
  "route truth",
  "truth:privacy-claim-gate",
  "not manual Shield target selection",
  "not the full four-lane redesign",
  "not a new privacy guarantee",
  "a5ceae5",
]) {
  assert(
    sharedAssetPickerGridLoopText.includes(phrase),
    `${sharedAssetPickerGridLoopId} must record ${phrase}`,
  );
}

const publicDepthDisclosureLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-PUBLIC-DEPTH-DISCLOSURE";
assert(activeFeedbackLoopIds.has(publicDepthDisclosureLoopId), `${publicDepthDisclosureLoopId} active feedback loop is missing`);
const publicDepthDisclosureLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === publicDepthDisclosureLoopId);
const publicDepthDisclosureLoopText = JSON.stringify(publicDepthDisclosureLoop);
assert(
  publicDepthDisclosureLoop?.localVerification?.includes("npm run private-pool-v2:public-depth-disclosure-check"),
  `${publicDepthDisclosureLoopId} must record the public-depth disclosure guard`,
);
assert(
  publicDepthDisclosureLoop?.localVerification?.includes("npm run landing:browser-check"),
  `${publicDepthDisclosureLoopId} must record the landing browser guard`,
);
assert(
  publicDepthDisclosureLoopText.includes("Anonymity readiness: blocked"),
  `${publicDepthDisclosureLoopId} must record the blocked readiness label`,
);
assert(
  publicDepthDisclosureLoopText.includes("2 distinct commitments"),
  `${publicDepthDisclosureLoopId} must record the current measured commitment count`,
);
assert(
  publicDepthDisclosureLoopText.includes("1,024 minimum"),
  `${publicDepthDisclosureLoopId} must record the current minimum threshold`,
);
assert(
  publicDepthDisclosureLoopText.includes("does not claim live anonymity"),
  `${publicDepthDisclosureLoopId} must preserve the live-anonymity non-claim`,
);
assert(
  publicDepthDisclosureLoopText.includes("not a live depth oracle"),
  `${publicDepthDisclosureLoopId} must preserve the V11 live-oracle boundary`,
);
assert(publicDepthDisclosureLoopText.includes("2a6c7fa"), `${publicDepthDisclosureLoopId} must pin the implementation commit`);

const publicAuditDiscoveryLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-PUBLIC-AUDIT-DISCOVERY";
assert(activeFeedbackLoopIds.has(publicAuditDiscoveryLoopId), `${publicAuditDiscoveryLoopId} active feedback loop is missing`);
const publicAuditDiscoveryLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === publicAuditDiscoveryLoopId);
const publicAuditDiscoveryLoopText = JSON.stringify(publicAuditDiscoveryLoop);
assert(
  publicAuditDiscoveryLoop?.localVerification?.includes("npm run public:audit-discovery-check"),
  `${publicAuditDiscoveryLoopId} must record the public audit discovery guard`,
);
assert(
  publicAuditDiscoveryLoop?.localVerification?.includes("npm run audit:package-check"),
  `${publicAuditDiscoveryLoopId} must record the audit package guard`,
);
assert(
  publicAuditDiscoveryLoopText.includes("/.well-known/vanta-audit.json"),
  `${publicAuditDiscoveryLoopId} must record the public discovery path`,
);
assert(
  publicAuditDiscoveryLoopText.includes("refs-only"),
  `${publicAuditDiscoveryLoopId} must record the refs-only boundary`,
);
assert(
  publicAuditDiscoveryLoopText.includes("auditClaimAllowed: false"),
  `${publicAuditDiscoveryLoopId} must preserve the audit claim false gate`,
);
assert(
  publicAuditDiscoveryLoopText.includes("productionReady: false"),
  `${publicAuditDiscoveryLoopId} must preserve the production readiness false gate`,
);
assert(
  publicAuditDiscoveryLoopText.includes("mainnetReady: false"),
  `${publicAuditDiscoveryLoopId} must preserve the mainnet readiness false gate`,
);
assert(
  publicAuditDiscoveryLoopText.includes("public-anonymity-depth"),
  `${publicAuditDiscoveryLoopId} must record the public depth blocker`,
);
assert(
  publicAuditDiscoveryLoopText.includes("not an audit report"),
  `${publicAuditDiscoveryLoopId} must preserve the no-audit-report truth boundary`,
);
assert(
  publicAuditDiscoveryLoopText.includes("broader secret/report/witness/provider-content markers"),
  `${publicAuditDiscoveryLoopId} must record the broadened leak guard`,
);
assert(
  publicAuditDiscoveryLoopText.includes("refs/status metadata"),
  `${publicAuditDiscoveryLoopId} must record the refs/status-only public JSON boundary`,
);
assert(publicAuditDiscoveryLoopText.includes("146f212"), `${publicAuditDiscoveryLoopId} must pin the discovery implementation commit`);
assert(publicAuditDiscoveryLoopText.includes("9f452a5"), `${publicAuditDiscoveryLoopId} must pin the guard hardening commit`);

const routeFallbackTruthLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-ROUTE-FALLBACK-TRUTH";
assert(activeFeedbackLoopIds.has(routeFallbackTruthLoopId), `${routeFallbackTruthLoopId} active feedback loop is missing`);
const routeFallbackTruthLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === routeFallbackTruthLoopId);
const routeFallbackTruthLoopText = JSON.stringify(routeFallbackTruthLoop);
const routeFallbackVerificationCommands = [
  "npm run route:fallback-contract-check",
  "npm run route:fallback-browser-check",
  "npm run product-ui:browser-check",
  "npm run docs:browser-check",
  "npm run mobile:browser-check",
  "npm run performance:route-code-split-check",
  "npm run truth:privacy-claim-gate",
  "npm run build",
];
for (const command of routeFallbackVerificationCommands) {
  assert(
    routeFallbackTruthLoop?.localVerification?.includes(command),
    `${routeFallbackTruthLoopId} must record ${command}`,
  );
}
assert(
  routeFallbackTruthLoopText.includes("Nothing moved"),
  `${routeFallbackTruthLoopId} must record the no-action route fallback truth`,
);
assert(
  routeFallbackTruthLoopText.includes("production privacy is not enabled"),
  `${routeFallbackTruthLoopId} must record the production-privacy-disabled copy`,
);
assert(
  routeFallbackTruthLoopText.includes("instead of silently redirecting into /app/shield"),
  `${routeFallbackTruthLoopId} must record the stale redirect behavior it replaced`,
);
assert(
  routeFallbackTruthLoopText.includes("not a static-host HTTP 404 guarantee"),
  `${routeFallbackTruthLoopId} must preserve the SPA-route truth boundary`,
);
assert(routeFallbackTruthLoopText.includes("e8c25ce"), `${routeFallbackTruthLoopId} must pin the implementation commit`);

const feedbackGuardHardeningLoopId = "VANTA-ZK-FEEDBACK-2026-05-13-FEEDBACK-GUARD-HARDENING";
assert(activeFeedbackLoopIds.has(feedbackGuardHardeningLoopId), `${feedbackGuardHardeningLoopId} active feedback loop is missing`);
const feedbackGuardHardeningLoop = ledger.activeFeedbackLoops.find((loop) => loop.id === feedbackGuardHardeningLoopId);
const feedbackGuardHardeningLoopText = JSON.stringify(feedbackGuardHardeningLoop);
for (const command of [
  "npm run route:fallback-contract-check",
  "npm run public:audit-discovery-check",
  "npm run audit:package-check",
  "npm run mainnet:secret-exposure-check",
  "npm run truth:privacy-claim-gate",
  "npm run zk:review-findings-ledger-check",
  "npm run zk:feedback-loop-check",
  "npm run build",
]) {
  assert(
    feedbackGuardHardeningLoop?.localVerification?.includes(command),
    `${feedbackGuardHardeningLoopId} must record ${command}`,
  );
}
assert(
  feedbackGuardHardeningLoopText.includes("repo-local refs"),
  `${feedbackGuardHardeningLoopId} must record the repo-local ref guard`,
);
assert(
  feedbackGuardHardeningLoopText.includes("fragment-built self-tests"),
  `${feedbackGuardHardeningLoopId} must record secret-safe self-tests`,
);
assert(
  feedbackGuardHardeningLoopText.includes("ref-like fields schema-wide"),
  `${feedbackGuardHardeningLoopId} must record schema-wide public discovery ref validation`,
);
assert(
  feedbackGuardHardeningLoopText.includes("production browser-runtime proving"),
  `${feedbackGuardHardeningLoopId} must preserve README browser-prover truth`,
);
assert(
  feedbackGuardHardeningLoopText.includes("latest local feedback-loop changes"),
  `${feedbackGuardHardeningLoopId} must preserve public discovery push/live precision`,
);
assert(feedbackGuardHardeningLoopText.includes("17e6539"), `${feedbackGuardHardeningLoopId} must pin the implementation commit`);

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
  finding.evidenceRefs.forEach((ref, index) => {
    assertRepoLocalRefOrCommand(ref, `${finding.id} evidenceRefs[${index}]`);
  });
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
  staleControl.watchFiles.forEach((ref, index) => {
    assertRepoLocalRefOrCommand(ref, `${finding.id} staleControl.watchFiles[${index}]`);
  });
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
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("0ed3fab")),
  "C01 must record the verifier candidate evidence packet commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("28e07f6")),
  "C01 must record the local proof-format observation commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) =>
    commitRef.includes("C01 verifier key registry scaffold")
  ),
  "C01 must record the verifier-key registry scaffold commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) =>
    commitRef.includes("C01 verifier backend options matrix")
  ),
  "C01 must record the verifier backend options matrix commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) =>
    commitRef.includes("C01 Groth16 proof-format candidate packet")
  ),
  "C01 must record the Groth16 proof-format candidate packet commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) =>
    commitRef.includes("C01 production verifying-key candidate packet")
  ),
  "C01 must record the production verifying-key candidate packet commit",
);
assert(c01Text.includes("TAG_UNSHIELD = 6"), "C01 must record the source-only TAG_UNSHIELD preflight truth");
assert(c01Text.includes("TAG_REGISTER_PROVENANCED_ROOT = 4"), "C01 must record the source-only TAG_REGISTER_PROVENANCED_ROOT truth");
assert(c01Text.includes("TAG_REGISTER_VERIFIER_KEY = 5"), "C01 must record the source-only TAG_REGISTER_VERIFIER_KEY truth");
assert(c01Text.includes("vanta2root"), "C01 must record the root-record PDA seed");
assert(c01Text.includes("vanta2vkey"), "C01 must record the verifier-key PDA seed");
assert(c01Text.includes("private-pool-v2:root-provenance-check"), "C01 must record the root provenance guard");
assert(
  c01Text.includes("zk:c01-production-verifier-backend-candidate-check"),
  "C01 must record the production verifier backend candidate guard",
);
assert(
  c01Text.includes("zk:c01-local-proof-format-evidence-check"),
  "C01 must record the local proof-format evidence guard",
);
assert(
  c01Text.includes("zk:c01-verifier-key-registry-check"),
  "C01 must record the verifier-key registry guard",
);
assert(
  c01Text.includes("zk:c01-verifier-backend-options-check"),
  "C01 must record the verifier backend-options guard",
);
assert(
  c01Text.includes("zk:c01-groth16-proof-format-candidate-check"),
  "C01 must record the Groth16 proof-format candidate guard",
);
assert(
  c01Text.includes("zk:c01-production-verifying-key-candidate-check"),
  "C01 must record the production verifying-key candidate guard",
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
  c01Text.includes("ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json"),
  "C01 must record the verifier candidate evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-local-proof-format.evidence.json"),
  "C01 must record the local proof-format evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-verifier-key-registry.evidence.json"),
  "C01 must record the verifier-key registry evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-verifier-backend-options.evidence.json"),
  "C01 must record the verifier backend-options evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-groth16-proof-format-candidate.evidence.json"),
  "C01 must record the Groth16 proof-format candidate evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-production-verifying-key-candidate.evidence.json"),
  "C01 must record the production verifying-key candidate evidence packet path",
);
assert(
  c01Text.includes("ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json"),
  "C01 must record the verifier adapter acceptance-test candidate evidence packet path",
);
assert(c01Text.includes("groth16-tag3-solana-v0"), "C01 must record the Groth16 tag-3 backend option");
assert(c01Text.includes("solana-c01-tag3-groth16-v0"), "C01 must record the Groth16 candidate target");
assert(c01Text.includes("noir-bb-ultrahonk-adaptation"), "C01 must record the UltraHonk adaptation backend option");
assert(c01Text.includes("selectedBackend"), "C01 must record backend selection remains blocked");
assert(
  c01Text.includes("backend-options matrix as backend selection"),
  "C01 must preserve that backend-options matrix is not backend selection",
);
assert(
  c01Text.includes("blocked-no-groth16-production-proof-format-artifact"),
  "C01 must record the blocked Groth16 proof-format candidate status",
);
assert(
  c01Text.includes("blocked-no-production-verifying-key-hash-artifact"),
  "C01 must record the blocked production verifying-key candidate status",
);
assert(
  c01Text.includes("blocked-no-verifier-adapter-acceptance-tests"),
  "C01 must record the blocked verifier adapter acceptance-test candidate status",
);
assert(
  c01Text.includes("blocked verifier adapter acceptance-test candidate"),
  "C01 must record the blocked verifier adapter acceptance-test candidate",
);
assert(
  c01Text.includes("Groth16 proof-format candidate packet is not production proof-format evidence"),
  "C01 must preserve that the Groth16 proof-format candidate is not production proof-format evidence",
);
assert(
  c01Text.includes("blocked production verifying-key candidate packet as production verifying-key evidence"),
  "C01 must preserve that the production verifying-key candidate is not production verifying-key evidence",
);
assert(
  c01Text.includes("blocked verifier adapter acceptance-test packet as verifier adapter acceptance or proof acceptance evidence"),
  "C01 must preserve that the verifier adapter acceptance-test packet is not verifier adapter acceptance or proof acceptance evidence",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("c0831fe")),
  "C01 must record the verifier adapter acceptance-test candidate implementation commit",
);
assert(
  c01.codexRemediation.commits.some((commitRef) => commitRef.includes("4e640b1")),
  "C01 must record the Crucible harness hardening implementation commit",
);
assert(
  c01Text.includes("Crucible harness hardening"),
  "C01 must record the Crucible harness hardening slice",
);
assert(
  c01Text.includes("legacy tag 2 roots failing before proof-verifier"),
  "C01 must record the legacy tag 2 fail-closed harness boundary",
);
assert(
  c01Text.includes("duplicate-nullifier Unshield rejection"),
  "C01 must record duplicate-nullifier Unshield harness coverage",
);
assert(
  c01Text.includes("local-acir-bytecode-hash-not-production-vk"),
  "C01 must preserve local ACIR is not production VK",
);
assert(
  c01Text.includes("offchain-remote-proof-artifact-only"),
  "C01 must record the offchain-only remote proof-artifact evidence marker",
);
assert(c01Text.includes("16000-byte"), "C01 must record the current local proof byte length");
assert(c01Text.includes("500 fields"), "C01 must record the current local proof field count");
assert(
  c01Text.includes("reserved 256-byte Groth16 tag-3"),
  "C01 must record the reserved Groth16 tag-3 mismatch",
);
assert(
  c01Text.includes("not satisfy production proof-format evidence"),
  "C01 must preserve that local proof-format observation does not satisfy production proof-format evidence",
);
assert(
  c01Text.includes("not satisfy production verifying-key evidence"),
  "C01 must preserve that verifier-key registry observation does not satisfy production verifying-key evidence",
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
  h08.verification.commands.includes("npm run private-pool-v2:actual-private-spend-browser-worker-prover-check"),
  "H08 verification commands must include the actual-private-spend browser worker prover guard",
);
assert(
  h08.verification.commands.includes("npm run zk:h08-production-prover-candidate-check"),
  "H08 verification commands must include the production prover candidate guard",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("baaff54")),
  "H08 must record the Send witness proof path commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("7f5c57c")),
  "H08 must record the Send browser worker prover commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("1611ad4")),
  "H08 must record the Send browser worker witness-generation commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("374dc21")),
  "H08 must record the actual-private-spend browser worker prover commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("21dd00d")),
  "H08 must record the actual-private-spend browser docs source-of-truth commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("308a1a8")),
  "H08 must record the local bb fixture lane-completeness commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("84b8593")),
  "H08 must record the local bb fixture edge-check commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("1ca9bfa")),
  "H08 must record the browser-worker proof-result adapter commit",
);
assert(
  h08.codexRemediation.commits.some((commitRef) => commitRef.includes("70fcf4b")),
  "H08 must record the production prover candidate packet commit",
);
assert(h08Text.includes("send-public-input-hash"), "H08 must record Send public-input hash binding");
assert(
  h08Text.includes("private-spend-public-input-hash"),
  "H08 must record actual-private-spend public-input hash binding",
);
assert(h08Text.includes("shield-public-input-hash"), "H08 must record Shield public-input hash binding");
assert(h08Text.includes("claim-public-input-hash"), "H08 must record Claim public-input hash binding");
assert(h08Text.includes("swap-public-input-hash"), "H08 must record Swap-to-shielded public-input hash binding");
assert(
  h08Text.includes("Shield, Claim, Swap-to-shielded, actual-private-spend, and Send local bb fixture"),
  "H08 must record all local bb fixture proof-result adapter lanes",
);
assert(h08Text.includes("local-bb-derived-artifact"), "H08 must record the derived artifact backend");
assert(h08Text.includes("browser/Web Worker proof-execution"), "H08 must record the browser worker proof-execution boundary");
assert(
  h08Text.includes("browser-worker proof-result adapter"),
  "H08 must record the browser-worker proof-result adapter boundary",
);
assert(
  h08Text.includes("local-bb-derived-artifact evidence"),
  "H08 must record the browser-worker adapter derived-artifact-only boundary",
);
assert(
  h08Text.includes("rejects request transcript drift before invoking the worker client"),
  "H08 must record pre-worker request drift rejection",
);
assert(
  h08Text.includes("typed witness input"),
  "H08 must record typed witness-input browser worker boundaries",
);
assert(
  h08Text.includes("worker-side witness generation"),
  "H08 must record the worker-side witness-generation boundary",
);
assert(
  !h08Text.includes("does not generate witnesses in the browser"),
  "H08 must not preserve the stale browser witness-generation limitation",
);
assert(
  h08Text.includes("ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json"),
  "H08 must record the production prover candidate packet path",
);
assert(
  h08Text.includes("blocked-no-production-prover-runtime-evidence"),
  "H08 must record the blocked production prover runtime evidence status",
);
assert(h08Text.includes("selectedProverRuntime: null"), "H08 must record selectedProverRuntime remains null");
assert(
  h08Text.includes("deployed prover health"),
  "H08 must record deployed prover health remains required evidence",
);
assert(h08Text.includes("job-log"), "H08 must record job-log evidence remains required");
assert(
  h08Text.includes("valid proof roundtrip"),
  "H08 must record valid proof roundtrip remains required evidence",
);
assert(
  h08Text.includes("invalid proof rejection"),
  "H08 must record invalid proof rejection remains required evidence",
);
assert(
  h08Text.includes("not production prover runtime selection"),
  "H08 must preserve the production-prover selection boundary",
);

const localBbFixtureLaneLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-H08-LOCAL-BB-FIXTURE-LANE-COMPLETENESS";
assert(
  activeFeedbackLoopIds.has(localBbFixtureLaneLoopId),
  `${localBbFixtureLaneLoopId} active feedback loop is missing`,
);
const localBbFixtureLaneLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === localBbFixtureLaneLoopId,
);
const localBbFixtureLaneLoopText = JSON.stringify(localBbFixtureLaneLoop);
for (const command of [
  "npm run private-pool-v2:local-bb-fixture-prover-check",
  "npm run private-pool-v2:shield-proof-artifact-consistency-check",
  "npm run private-pool-v2:claim-proof-artifact-consistency-check",
  "npm run private-pool-v2:swap-to-shielded-proof-artifact-consistency-check",
  "npm run private-pool-v2:local-prover-check",
  "npm run private-pool-v2:local-verifier-check",
]) {
  assert(
    localBbFixtureLaneLoop?.localVerification?.includes(command),
    `${localBbFixtureLaneLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "shield-public-input-hash",
  "claim-public-input-hash",
  "swap-public-input-hash",
  "local-bb-fixture-artifact",
  "default local prover remains mock",
  "unsupported runtime targets fail closed",
  "Shield registry guard rejects mismatched appended roots",
  "not a production prover",
  "308a1a8",
  "84b8593",
]) {
  assert(
    localBbFixtureLaneLoopText.includes(phrase),
    `${localBbFixtureLaneLoopId} must record ${phrase}`,
  );
}

const browserWorkerAdapterLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-H08-BROWSER-WORKER-PROOF-RESULT-ADAPTER";
assert(
  activeFeedbackLoopIds.has(browserWorkerAdapterLoopId),
  `${browserWorkerAdapterLoopId} active feedback loop is missing`,
);
const browserWorkerAdapterLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === browserWorkerAdapterLoopId,
);
const browserWorkerAdapterLoopText = JSON.stringify(browserWorkerAdapterLoop);
for (const command of [
  "npm run private-pool-v2:browser-worker-proof-result-adapter-check",
  "npm run private-pool-v2:browser-worker-prover-check",
  "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
  "npm run private-pool-v2:proof-backend-boundary-check",
  "npm run private-pool-v2:contract-check",
  "npm run private-pool-v2:local-prover-check",
]) {
  assert(
    browserWorkerAdapterLoop?.localVerification?.includes(command),
    `${browserWorkerAdapterLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "VantaPrivatePoolV2Prover",
  "send-public-input-hash",
  "private-spend-public-input-hash",
  "local-bb-derived-artifact",
  "request transcript drift before invoking the worker client",
  "default local prover on mock",
  "not live Send routing",
  "not routed live actual-private-spend execution",
  "1ca9bfa",
]) {
  assert(
    browserWorkerAdapterLoopText.includes(phrase),
    `${browserWorkerAdapterLoopId} must record ${phrase}`,
  );
}

const h08ProductionProverCandidateLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-H08-PRODUCTION-PROVER-CANDIDATE";
assert(
  activeFeedbackLoopIds.has(h08ProductionProverCandidateLoopId),
  `${h08ProductionProverCandidateLoopId} active feedback loop is missing`,
);
const h08ProductionProverCandidateLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === h08ProductionProverCandidateLoopId,
);
const h08ProductionProverCandidateLoopText = JSON.stringify(h08ProductionProverCandidateLoop);
for (const command of [
  "npm run zk:h08-production-prover-candidate-check",
  "npm run zk:review-findings-ledger-check",
  "npm run zk:review-guards-check",
  "npm run zk:feedback-loop-check",
]) {
  assert(
    h08ProductionProverCandidateLoop?.localVerification?.includes(command),
    `${h08ProductionProverCandidateLoopId} must record ${command}`,
  );
}
for (const phrase of [
  "ops/mainnet/private-pool-v2-h08-production-prover-candidate.evidence.json",
  "blocked-no-production-prover-runtime-evidence",
  "selectedProverRuntime: null",
  "production prover runtime selection",
  "production proof-format",
  "production verifying-key",
  "live route wiring",
  "C01 verifier compatibility",
  "deployed/live evidence",
  "70fcf4b",
]) {
  assert(
    h08ProductionProverCandidateLoopText.includes(phrase),
    `${h08ProductionProverCandidateLoopId} must record ${phrase}`,
  );
}

const actualPrivateSpendBrowserLoopId =
  "VANTA-ZK-FEEDBACK-2026-05-13-ACTUAL-PRIVATE-SPEND-BROWSER-WORKER-PROVER";
assert(
  activeFeedbackLoopIds.has(actualPrivateSpendBrowserLoopId),
  `${actualPrivateSpendBrowserLoopId} active feedback loop is missing`,
);
const actualPrivateSpendBrowserLoop = ledger.activeFeedbackLoops.find(
  (loop) => loop.id === actualPrivateSpendBrowserLoopId,
);
const actualPrivateSpendBrowserLoopText = JSON.stringify(actualPrivateSpendBrowserLoop);
for (const command of [
  "npm run private-pool-v2:actual-private-spend-browser-worker-prover-check",
  "npm run private-pool-v2:browser-worker-prover-check",
  "npm run private-pool-v2:proof-backend-boundary-check",
  "npm run private-pool-v2:local-prover-check",
  "npm run private-pool-v2:actual-private-spend-proof-artifact-consistency-check",
  "npm run private-pool-v2:actual-private-spend-operator-no-witness-check",
  "npm run docs:source-of-truth-check",
]) {
  assert(
    actualPrivateSpendBrowserLoop?.localVerification?.includes(command),
    `${actualPrivateSpendBrowserLoopId} must record ${command}`,
  );
}
assert(
  actualPrivateSpendBrowserLoopText.includes("private-spend-public-input-hash"),
  `${actualPrivateSpendBrowserLoopId} must record actual-private-spend public-input binding`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("local-bb-derived-artifact"),
  `${actualPrivateSpendBrowserLoopId} must record the derived artifact backend`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("typed actual-private-spend witness input"),
  `${actualPrivateSpendBrowserLoopId} must record the typed actual-private-spend witness-input boundary`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("worker-side witness generation"),
  `${actualPrivateSpendBrowserLoopId} must record worker-side witness generation`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("postMessage"),
  `${actualPrivateSpendBrowserLoopId} must record postMessage cleanup coverage`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("not routed live actual-private-spend execution"),
  `${actualPrivateSpendBrowserLoopId} must preserve the live-routing boundary`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("374dc21"),
  `${actualPrivateSpendBrowserLoopId} must pin the implementation commit`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("21dd00d"),
  `${actualPrivateSpendBrowserLoopId} must pin the docs source-of-truth follow-up commit`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("SECURITY_LIMITATIONS.md") &&
    actualPrivateSpendBrowserLoopText.includes("README.md"),
  `${actualPrivateSpendBrowserLoopId} must pin the docs source-of-truth refs`,
);
assert(
  actualPrivateSpendBrowserLoopText.includes("not-live") ||
    actualPrivateSpendBrowserLoopText.includes("not routed live actual-private-spend execution"),
  `${actualPrivateSpendBrowserLoopId} must preserve the not-live boundary`,
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
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run zk:review-findings-ledger-check"),
  "zk:feedback-loop-check must include zk:review-findings-ledger-check",
);
assert(
  scripts["zk:feedback-loop-check"]?.includes("npm run public:audit-discovery-check"),
  "zk:feedback-loop-check must include public:audit-discovery-check",
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
