import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const trackedFiles = spawnSync("git", ["ls-files", "-z"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(trackedFiles.status, 0, "git ls-files must succeed for secret exposure scanning.");

const files = trackedFiles.stdout.split("\0").filter(Boolean);

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

for (const file of files) {
  if (skippedFiles.has(file)) {
    continue;
  }

  let text;
  try {
    text = readFileSync(resolve(repoRoot, file), "utf8");
  } catch {
    continue;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isAllowedPlaceholder(line)) {
      return;
    }

    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          file,
          line: index + 1,
          pattern: pattern.id,
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error("Vanta secret exposure check: FAIL");
  console.error("Raw-looking secret material was found in tracked repo files.");
  console.error("No secret values are printed by this check; inspect the file/line references locally.");
  console.error(JSON.stringify({ findings }, null, 2));
  process.exit(1);
}

console.log("Vanta secret exposure check: PASS");
console.log("Tracked repo files contain no raw-looking API keys, bearer tokens, database URLs, or private key blocks.");
