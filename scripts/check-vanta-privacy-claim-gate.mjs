import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";
import { createCurrentVantaShieldPrivacyReadiness } from "../src/readiness/shieldPrivacyReadiness.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((path) => {
    return (
      (path.endsWith(".md") ||
        path.endsWith(".mjs") ||
        path.endsWith(".ts") ||
        path.endsWith(".tsx")) &&
      !path.startsWith("node_modules/") &&
      !path.startsWith("dist/") &&
      !path.startsWith("docs/superpowers/") &&
      !path.startsWith("scripts/")
    );
  });

const snapshot = createVantaMainnetReadinessSnapshot();
const shieldReadiness = createCurrentVantaShieldPrivacyReadiness();

const privacyClaimsAllowed =
  snapshot.productionReady === true &&
  snapshot.mainnetReady === true &&
  snapshot.privateSettlement?.privacyClaimAllowed === true &&
  shieldReadiness.privacyClaimAllowed === true;

const dangerousClaims = [
  /\bfully private\b/iu,
  /\bfully anonymous\b/iu,
  /\banonymous payments?\b/iu,
  /\buntraceable\b/iu,
  /\btrustless(?:\s+(?:privacy|settlement|payments?|protocol|system|network))?\b/iu,
  /\baudited\s+(?:privacy|settlement|payments?|protocol|system|network|private[-\s]?pool)\b/iu,
  /\b(?:production ready|production-ready)\b/iu,
  /\b(?:mainnet ready|mainnet-ready)\b/iu,
  /\bready for mainnet\b/iu,
  /\bproduction-ready private settlement\b/iu,
  /\bmainnet-ready private settlement\b/iu,
  /\bproduction[-\s]?private Send\b/iu,
  /\bmainnet[-\s]?private Send\b/iu,
  /\bfully private Send\b/iu,
  /\breal private Send\b/iu,
  /\blive mainnet private settlement\b/iu,
  /\bmeaningfully private\b/iu,
];

const safeContextPatterns = [
  /\bdo not\b/iu,
  /\bdoes not\b/iu,
  /\bnot\b/iu,
  /\bno\b/iu,
  /\bno broad\b/iu,
  /\bmust not\b/iu,
  /\bcannot claim\b/iu,
  /\bblocked\b/iu,
  /\bstill unavailable\b/iu,
  /\bstill cannot\b/iu,
  /\bis false\b/iu,
  /\bfalse\b/u,
  /\bbannedBroadClaims\b/u,
  /\bbannedPhrases\b/u,
  /\bdangerousClaims\b/u,
  /\bforbidden_claims\b/u,
  /\bforbidden\b/iu,
  /\bavoid\b/iu,
  /\blimitations?\b/iu,
  /\buntil\b/iu,
  /\bbefore\b/iu,
  /\broadmap\b/iu,
  /\bwithout overclaiming\b/iu,
  /\bmove toward\b/iu,
  /\bgoal\b/iu,
  /\breports\b/iu,
  /\brequiredPattern\b/u,
  /\bincludes\(/u,
  /\bregex\b/u,
  /\bassert\b/u,
  /\bavoid\b/iu,
  /\bclaim has been verified\b/iu,
  /\bwithout claiming\b/iu,
  /\bkeep banning\b/iu,
  /\blacks\b/iu,
  /\bbanned\b/iu,
  /\btext_hidden\b/u,
  /\bmissing\b/iu,
  /\bgreen\b/iu,
];

function lineHasDangerousClaim(line) {
  return dangerousClaims.some((pattern) => pattern.test(line));
}

function lineIsSafeContext(line, lines, index) {
  const context = [
    lines[index - 10],
    lines[index - 9],
    lines[index - 8],
    lines[index - 7],
    lines[index - 6],
    lines[index - 5],
    lines[index - 4],
    lines[index - 3],
    lines[index - 2],
    lines[index - 1],
    line,
    lines[index + 1],
    lines[index + 2],
    lines[index + 3],
    lines[index + 4],
    lines[index + 5],
    lines[index + 6],
    lines[index + 7],
    lines[index + 8],
    lines[index + 9],
    lines[index + 10],
  ]
    .filter(Boolean)
    .join("\n");
  return safeContextPatterns.some((pattern) => pattern.test(context));
}

const failures = [];

for (const file of trackedFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  const lines = source.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    if (!lineHasDangerousClaim(line) || lineIsSafeContext(line, lines, index)) {
      continue;
    }

    failures.push(`${file}:${index + 1}: ${line.trim()}`);
  }
}

if (!privacyClaimsAllowed && failures.length > 0) {
  console.error("Vanta privacy claim gate: FAIL");
  console.error("Privacy/mainnet production claims are still disabled, but unguarded claim language was found:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta privacy claim gate: PASS");
console.log(
  JSON.stringify(
    {
      privacyClaimsAllowed,
      scannedFiles: trackedFiles.length,
      unguardedClaimCount: failures.length,
      mainnetReady: snapshot.mainnetReady,
      productionReady: snapshot.productionReady,
      privateSettlementPrivacyClaimAllowed: snapshot.privateSettlement?.privacyClaimAllowed === true,
      shieldPrivacyClaimAllowed: shieldReadiness.privacyClaimAllowed === true,
    },
    null,
    2,
  ),
);
