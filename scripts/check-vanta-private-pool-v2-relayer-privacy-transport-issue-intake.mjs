import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence } from "../src/privacy/privatePoolV2RelayerPrivacyTransport.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const dispatchPath = resolve(
  repoRoot,
  "ops/mainnet/private-pool-v2-relayer-privacy-transport-review-dispatch.evidence.json",
);
const packagePath = resolve(repoRoot, "package.json");

const requireReturned = process.argv.includes("--require-returned");
const dispatch = JSON.parse(readFileSync(dispatchPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const issueNumber = dispatch.githubReviewIssue?.number;
const repoOwner = dispatch.repository?.owner;
const repoName = dispatch.repository?.name;
const repo = `${repoOwner}/${repoName}`;
const closurePacket = JSON.parse(
  readFileSync(
    resolve(repoRoot, "ops/mainnet/private-pool-v2-relayer-privacy-transport-closure.evidence.json"),
    "utf8",
  ),
);

function printResult(result, exitCode = 0) {
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = exitCode;
}

function assertNoSecretMaterial(value, path = "issue") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    for (const forbidden of [
      /postgres(?:ql)?:\/\//iu,
      /DATABASE_URL=/u,
      /Bearer\s+/u,
      /\brnd_[A-Za-z0-9_]+/u,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
      /\b(?:onion|token|wallet|user)[_-]?(?:private|secret|preimage)\b/iu,
    ]) {
      assert.ok(!forbidden.test(value), `${path} includes forbidden secret-bearing material.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterial(entry, `${path}.${index}`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assertNoSecretMaterial(nested, `${path}.${key}`);
    }
  }
}

function readIssue() {
  assert.ok(Number.isInteger(issueNumber), "Dispatch packet must record a GitHub issue number.");
  assert.ok(repoOwner && repoName, "Dispatch packet must record a GitHub repo owner/name.");
  const raw = execFileSync(
    "gh",
    [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      repo,
      "--json",
      "body,comments,labels,number,state,title,url",
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(raw);
}

function extractFencedJsonBlocks(markdown, sourceLabel) {
  const candidates = [];
  const fencePattern = /```[^\n]*\n([\s\S]*?)```/gu;
  let match;
  while ((match = fencePattern.exec(markdown ?? ""))) {
    const candidate = match[1].trim();
    if (!candidate.startsWith("{")) continue;
    candidates.push({ sourceLabel, source: candidate });
  }
  return candidates;
}

function validateCandidate(candidate) {
  assertNoSecretMaterial(candidate.source, candidate.sourceLabel);
  const parsed = JSON.parse(candidate.source);
  assertNoSecretMaterial(parsed, candidate.sourceLabel);
  const accepted = normalizeVantaPrivatePoolV2RelayerPrivacyTransportEvidence(parsed);
  assert.equal(accepted.productionReady, false);
  assert.equal(accepted.privacyClaimAllowed, false);
  return accepted;
}

function main() {
  assert.equal(
    packageJson.scripts["relayer:privacy-transport-issue-intake-check"],
    "node scripts/check-vanta-private-pool-v2-relayer-privacy-transport-issue-intake.mjs",
  );
  assert.equal(dispatch.status, "sent-awaiting-external-reviewer-response");
  assert.equal(dispatch.providerMutationAllowed, false);
  assert.equal(dispatch.reviewerAccepted, false);

  const issue = readIssue();
  assert.equal(issue.number, issueNumber);
  assert.equal(issue.url, dispatch.githubReviewIssue.url);
  assert.equal(issue.state, "OPEN");
  assert.equal(issue.title, dispatch.githubReviewIssue.title);

  const labels = new Set((issue.labels ?? []).map((label) => label.name));
  for (const label of ["external-review", "privacy-transport", "blocked-by-reviewer", "help wanted"]) {
    assert.ok(labels.has(label), `Issue #${issueNumber} missing label ${label}.`);
  }

  assertNoSecretMaterial(issue.body, "issue.body");
  for (const comment of issue.comments ?? []) {
    assertNoSecretMaterial(comment.body, `issue.comment.${comment.id ?? "unknown"}`);
  }

  const candidates = [
    ...extractFencedJsonBlocks(issue.body, "issue.body"),
    ...(issue.comments ?? []).flatMap((comment, index) =>
      extractFencedJsonBlocks(comment.body, `issue.comment.${index + 1}`),
    ),
  ];

  const accepted = [];
  const parseFailures = [];
  for (const candidate of candidates) {
    try {
      accepted.push({ sourceLabel: candidate.sourceLabel, evidence: validateCandidate(candidate) });
    } catch (error) {
      parseFailures.push({ sourceLabel: candidate.sourceLabel, message: error.message });
    }
  }

  const result = {
    acceptedReturnedEvidence: accepted.length === 1,
    activeMode: accepted[0]?.evidence.activeMode ?? null,
    candidateJsonBlockCount: candidates.length,
    githubIssueUrl: issue.url,
    nextOperatorAction:
      "Wait for exactly one refs-only reviewer JSON packet on issue #8, then rerun relayer:privacy-transport-closure-check before any Render env mutation.",
    ok: true,
    parseFailureCount: parseFailures.length,
    providerMutationAllowed: false,
    remainingBlockers: closurePacket.remainingBlockers,
    requireReadyCommand: "npm run relayer:privacy-transport-issue-intake-check -- --require-returned",
    returnedEvidenceValidationCommand:
      "VANTA_PRIVATE_POOL_V2_RELAYER_PRIVACY_TRANSPORT_EVIDENCE_PATH=<reviewed-privacy-transport-json> npm run relayer:privacy-transport-closure-check",
    reviewerAccepted: accepted.length === 1,
    status:
      accepted.length === 1
        ? "returned-refs-only-json-valid-claim-blocked"
        : "awaiting-returned-refs-only-json",
  };

  if (parseFailures.length > 0) {
    printResult(
      {
        ...result,
        ok: false,
        parseFailures,
        status: "returned-json-invalid-or-not-refs-only",
      },
      1,
    );
    return;
  }

  if (accepted.length > 1) {
    printResult(
      {
        ...result,
        ok: false,
        status: "multiple-returned-refs-only-json-packets",
      },
      1,
    );
    return;
  }

  if (requireReturned && accepted.length !== 1) {
    printResult(
      {
        ...result,
        ok: false,
        status: "returned-refs-only-json-required",
      },
      1,
    );
    return;
  }

  printResult(result);
}

try {
  main();
} catch (error) {
  printResult(
    {
      acceptedReturnedEvidence: false,
      error: error.message,
      ok: false,
      providerMutationAllowed: false,
      reviewerAccepted: false,
      status: "issue-intake-check-failed",
    },
    1,
  );
}
