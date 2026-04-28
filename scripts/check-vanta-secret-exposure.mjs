import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
const options = {
  includeStaged: false,
  includeUntracked: false,
};

for (const arg of args) {
  if (arg === "--help" || arg === "-h") {
    console.log(`Usage: node scripts/check-vanta-secret-exposure.mjs [options]

Scans repo files for raw-looking secret material without printing matching values.

Options:
  --include-staged      Also scan staged index blobs.
  --include-untracked   Also scan untracked, non-ignored working-tree files.
  --all                 Scan tracked files plus staged and untracked files.
  -h, --help            Show this help.`);
    process.exit(0);
  }

  if (arg === "--include-staged") {
    options.includeStaged = true;
    continue;
  }

  if (arg === "--include-untracked") {
    options.includeUntracked = true;
    continue;
  }

  if (arg === "--all") {
    options.includeStaged = true;
    options.includeUntracked = true;
    continue;
  }

  console.error(`Vanta secret exposure check: unknown option '${arg}'.`);
  console.error("Run with --help for supported flags.");
  process.exit(2);
}

function git(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function requireGit(args, description) {
  const result = git(args);
  assert.equal(result.status, 0, `${description} must succeed for secret exposure scanning.`);
  return result.stdout;
}

function splitNul(text) {
  return text.split("\0").filter(Boolean);
}

const skippedFiles = new Set([
  "scripts/check-vanta-secret-exposure.mjs",
  "package-lock.json",
]);

const forbiddenPatterns = [
  {
    id: "render-api-key",
    regex: /\brnd_[A-Za-z0-9]{20,}\b/,
  },
  {
    id: "raw-postgres-url-with-password",
    regex: /\bpostgres(?:ql)?:\/\/[^:\s"'<>]+:[^@\s"'<>]+@[^)\]\s"'<>]+/i,
  },
  {
    id: "bearer-token-value",
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b/i,
  },
  {
    id: "raw-secret-assignment",
    regex: /\b[A-Z0-9_]*(?:API_KEY|AUTH_TOKEN|WEBHOOK_SECRET|SECRET|JWT)\s*=\s*["']?[A-Za-z0-9._~+/=-]{32,}["']?\b/,
  },
  {
    id: "stripe-secret-key",
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  },
  {
    id: "stripe-webhook-secret",
    regex: /\bwhsec_[A-Za-z0-9]{16,}\b/,
  },
  {
    id: "github-token",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  },
  {
    id: "private-key-block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
];

function isAllowedPlaceholder(line) {
  return (
    line.includes("<secret-manager-value>") ||
    line.includes("<operator-token") ||
    line.includes("<restored-db-url-from-provider>") ||
    line.includes("<local-json-snapshot-path>") ||
    line.includes("vanta-private-pool-v2-service-network-test-token") ||
    line.includes("vanta-private-pool-v2-client-test-token") ||
    line.includes("vanta-private-pool-v2-live-token") ||
    line.includes("vanta-private-pool-v2-test-token")
  );
}

const findings = [];
const scannedCounts = {
  tracked: 0,
  staged: 0,
  untracked: 0,
};

function shouldScanFile(file) {
  return !skippedFiles.has(file);
}

function scanText({ source, file, text }) {
  if (!shouldScanFile(file)) {
    return false;
  }

  scannedCounts[source] += 1;
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (isAllowedPlaceholder(line)) {
      return;
    }

    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          source,
          file,
          line: index + 1,
          pattern: pattern.id,
        });
      }
    }
  });

  return true;
}

function scanWorkingTreeFile({ source, file }) {
  if (!shouldScanFile(file)) {
    return;
  }

  let text;
  try {
    text = readFileSync(resolve(repoRoot, file), "utf8");
  } catch {
    return;
  }

  scanText({ source, file, text });
}

const trackedFiles = splitNul(requireGit(["ls-files", "-z"], "git ls-files"));

for (const file of trackedFiles) {
  scanWorkingTreeFile({ source: "tracked", file });
}

if (options.includeStaged) {
  const stagedFiles = splitNul(
    requireGit(
      ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"],
      "git diff --cached",
    ),
  );

  for (const file of stagedFiles) {
    if (!shouldScanFile(file)) {
      continue;
    }

    const stagedBlob = git(["show", `:${file}`]);
    if (stagedBlob.status !== 0) {
      continue;
    }

    scanText({ source: "staged", file, text: stagedBlob.stdout });
  }
}

if (options.includeUntracked) {
  const untrackedFiles = splitNul(
    requireGit(
      ["ls-files", "--others", "--exclude-standard", "-z"],
      "git ls-files --others --exclude-standard",
    ),
  );

  for (const file of untrackedFiles) {
    scanWorkingTreeFile({ source: "untracked", file });
  }
}

if (findings.length > 0) {
  console.error("Vanta secret exposure check: FAIL");
  console.error("Raw-looking secret material was found in scanned repo files.");
  console.error("No secret values are printed by this check; inspect the file/line references locally.");
  console.error(JSON.stringify({ scannedCounts, findings }, null, 2));
  process.exit(1);
}

console.log("Vanta secret exposure check: PASS");
console.log("Scanned repo files contain no raw-looking API keys, bearer tokens, database URLs, or private key blocks.");
console.log(JSON.stringify({ scannedCounts }, null, 2));
