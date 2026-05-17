import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
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
      (path.endsWith(".html") ||
        path.endsWith(".md") ||
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
  /\bready for production\b/iu,
  /\bproduction sign[-\s]?off(?:\s+received)?\b/iu,
  /\bproduction hardened\b/iu,
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
  /\bcredibly private\b/iu,
  /\brobustly private\b/iu,
  /\bdefensibly private\b/iu,
  /\bcompliantly private\b/iu,
  /\bchain sees\b[^\n]*(?:not what|not who|does not see what|does not see who)\b/iu,
  /\bPay anyone without exposing\b/iu,
  /\bexit privately\b/iu,
  /\bWithdraw to any wallet\b/iu,
];

const futureStateOnlyClaims = [
  /\bcredibly private\b/iu,
  /\brobustly private\b/iu,
  /\bdefensibly private\b/iu,
  /\bcompliantly private\b/iu,
  /\bchain sees\b[^\n]*(?:not what|not who|does not see what|does not see who)\b/iu,
  /\bPay anyone without exposing\b/iu,
  /\bexit privately\b/iu,
  /\bWithdraw to any wallet\b/iu,
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
  /\bwithout overclaiming\b/iu,
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
];

const sameLineFutureContextPatterns = [
  /\bafter\b/iu,
  /\bbefore\b/iu,
  /\bend state\b/iu,
  /\bfuture[-\s]?state\b/iu,
  /\bfuture target\b/iu,
  /\bonce\b/iu,
  /\bby week\b/iu,
  /\breplace\b/iu,
  /\bsuggest(?:ed|ion)?\b/iu,
  /\bcurrent copy\b/iu,
  /\bif product copy implies\b/iu,
];

function lineHasDangerousClaim(line) {
  return dangerousClaims.some((pattern) => pattern.test(line));
}

function lineIsSafeContext(line, lines, index) {
  if (futureStateOnlyClaims.some((pattern) => pattern.test(line))) {
    return (
      sameLineFutureContextPatterns.some((pattern) => pattern.test(line)) ||
      /\b(?:not|do not|does not|must not|blocked|avoid|banned|forbidden)\b/iu.test(line)
    );
  }

  if (sameLineFutureContextPatterns.some((pattern) => pattern.test(line))) {
    return true;
  }

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
const metaDescriptionFailures = [];

function htmlMetaDescriptions(source) {
  return [...source.matchAll(/<meta\s+[^>]*name=["']description["'][^>]*>/giu)]
    .map((match) => match[0])
    .map((tag) => tag.match(/\bcontent=["']([^"']*)["']/iu)?.[1] ?? "")
    .filter(Boolean);
}

function metaDescriptionIsSafe(content) {
  return /\b(?:alpha|beta|not audited|production privacy is not enabled|not production-private|not production private|not production-ready|not mainnet-ready)\b/iu.test(
    content,
  );
}

for (const file of trackedFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  if (file.endsWith(".html")) {
    for (const content of htmlMetaDescriptions(source)) {
      if (
        /\bprivacy layer\b/iu.test(content) ||
        /\bprivate\s+(?:send|swap|payment|payments|settlement)\b/iu.test(content)
      ) {
        if (!metaDescriptionIsSafe(content)) {
          metaDescriptionFailures.push(`${file}: ${content}`);
        }
      }
    }
  }

  const lines = source.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    if (!lineHasDangerousClaim(line) || lineIsSafeContext(line, lines, index)) {
      continue;
    }

    failures.push(`${file}:${index + 1}: ${line.trim()}`);
  }
}

if (!privacyClaimsAllowed && (failures.length > 0 || metaDescriptionFailures.length > 0)) {
  console.error("Vanta privacy claim gate: FAIL");
  console.error("Privacy/mainnet production claims are still disabled, but unguarded claim language was found:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  for (const failure of metaDescriptionFailures) {
    console.error(`- meta description overclaim: ${failure}`);
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
      metaDescriptionOverclaimCount: metaDescriptionFailures.length,
      mainnetReady: snapshot.mainnetReady,
      productionReady: snapshot.productionReady,
      privateSettlementPrivacyClaimAllowed: snapshot.privateSettlement?.privacyClaimAllowed === true,
      shieldPrivacyClaimAllowed: shieldReadiness.privacyClaimAllowed === true,
    },
    null,
    2,
  ),
);

// === Extended native SOL TAG6 assertions (fail-closed red-first per task + design/status note) ===
import { readFileSync as gateReadFile } from "node:fs";
import { resolve as gateResolve } from "node:path";
const gateRepoRoot = gateResolve(import.meta.dirname, "..");
function gateRead(p) {
  try { return gateReadFile(gateResolve(gateRepoRoot, p), "utf8"); } catch { return ""; }
}
const gateUnshieldStatus = gateRead("src/readiness/unshieldMainnetProductionStatus.mjs");
const gateUnshieldTrust = gateRead("src/solana/unshieldTrustContract.ts");
const gateDesign = gateRead("/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md") || gateRead("Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md");
const gateStatusNote = gateRead("/Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md") || gateRead("Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-v2-integration-status.md");

assert.ok(
  gateUnshieldStatus.includes("productionCustodyReadyForSol: false") &&
    gateUnshieldStatus.includes("nativeSolProgramOwnedVaultPdaReady: false") &&
    gateUnshieldStatus.includes("native-sol-program-owned-vault-pda-not-deployed"),
  "privacy-claim-gate must assert native SOL TAG6 custody fields remain false (no elevation of claims)."
);
assert.ok(
  gateUnshieldTrust.includes("productionCustodyReadyForSol: false") && gateUnshieldTrust.includes("nativeSolLongTermBoundary"),
  "privacy-claim-gate must confirm unshieldTrustContract preserves native SOL TAG6 fail-closed boundary."
);
assert.ok(
  gateDesign.includes("productionCustodyReadyForSol: false") && gateDesign.includes("program-owned-sol-vault-pda-system-cpi"),
  "privacy-claim-gate must reference design doc strict native SOL TAG6 truth boundary."
);
assert.ok(
  gateStatusNote.includes("productionCustodyReadyForSol: false") && gateStatusNote.includes("TAG6 prep"),
  "privacy-claim-gate must cross-reference status note for TAG6 native SOL assertions (red-first)."
);
console.log("Native SOL TAG6 privacy claim extensions: asserted (fail-closed).");
