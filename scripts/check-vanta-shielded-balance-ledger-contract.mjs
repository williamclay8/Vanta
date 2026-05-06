import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function compact(source) {
  return source.replace(/\s+/g, " ");
}

function hasNearby(source, left, right, maxDistance = 500) {
  for (const leftMatch of source.matchAll(left)) {
    const start = leftMatch.index ?? 0;
    const window = source.slice(start, start + maxDistance);

    if (right.test(window)) {
      return true;
    }
  }

  return false;
}

const appDashboardSource = readRepoFile("src/pages/AppDashboardPage.tsx");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const recoveredNativeSolShieldNotesSource = readRepoFile(
  "src/solana/recoveredNativeSolShieldNotes.ts",
);
const shieldAssetStateSource = readRepoFile("src/solana/useVantaShieldAssetState.ts");
const shieldAssetRegistrySource = readRepoFile("src/solana/useVantaShieldAssetRegistryState.ts");
const shieldStateSource = readRepoFile("src/solana/vantaShieldState.ts");
const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
const packageJson = JSON.parse(readRepoFile("package.json"));

const appDashboardCompact = compact(appDashboardSource);
const shieldPageCompact = compact(shieldPageSource);
const unshieldCompact = compact(unshieldPageSource);
const shieldAssetStateCompact = compact(shieldAssetStateSource);
const recoveredNotesUsePendingLifecycle = /lifecycleStatus:\s*"pending"/.test(
  recoveredNativeSolShieldNotesSource,
);
const shieldAssetStateFiltersSpendableLifecycle =
  /spendableShieldedSolNotes[\s\S]{0,220}lifecycleStatus === "spendable"/.test(
    shieldAssetStateSource,
  );
const shieldAssetStateExcludesLocalRecovery =
  /lifecycleStatus === "spendable"[\s\S]{0,220}!\s*note\.stateSignature\.startsWith\(["'`]local-sol-recovery:/.test(
    shieldAssetStateSource,
  ) ||
  /!\s*note\.stateSignature\.startsWith\(["'`]local-sol-recovery:[\s\S]{0,220}lifecycleStatus === "spendable"/.test(
    shieldAssetStateSource,
  );

const failures = [];

if (/\brecentShield\b/.test(appDashboardSource)) {
  failures.push(
    "AppDashboardPage must not read recentShield when presenting SOL shielded balance; current/spendable SOL must come from ledger state.",
  );
}

if (/recentShieldedSolBalance/.test(appDashboardSource)) {
  failures.push(
    "AppDashboardPage must not keep a recentShieldedSolBalance local balance path.",
  );
}

if (/const shieldedSolBalance = Math\.max\(/.test(appDashboardCompact)) {
  failures.push(
    "AppDashboardPage must not inflate shieldedSolBalance with Math.max; it must display ledger-derived SOL balance.",
  );
}

if (
  hasNearby(
    appDashboardSource,
    /Math\s*\.\s*max\s*\(/g,
    /(recentShield|recentShieldedSolBalance|positionSummary\s*\.\s*shieldedSolBalance|shieldedSolBalance)/,
  )
) {
  failures.push(
    "AppDashboardPage must not use Math.max near SOL shielded-balance state.",
  );
}

for (const marker of [
  "createRecentShieldedSolNote",
  "native-sol-recent-shield",
  "recentShieldedSolNote",
]) {
  if (unshieldPageSource.includes(marker)) {
    failures.push(
      `UnshieldPage must not synthesize spendable SOL notes from recentShield marker: ${marker}.`,
    );
  }
}

if (/recentShieldedSolBalance/.test(unshieldPageSource)) {
  failures.push(
    "UnshieldPage must not derive SOL lane balance from recentShield.resultingShieldedBalance.",
  );
}

if (/const selectedSolAggregateAmount = Math\.max\(/.test(unshieldCompact)) {
  failures.push(
    "UnshieldPage must not compute selectedSolAggregateAmount with Math.max over local/recent shield state.",
  );
}

if (/selectedSolAggregateAmount\s*=[^;]*recentShield/s.test(unshieldPageSource)) {
  failures.push(
    "UnshieldPage selectedSolAggregateAmount must not depend on recentShield.",
  );
}

for (const marker of [
  "stateSignature: `local-sol-recovery:",
  'sourceSwapNoteId: "native-sol-recovery"',
  'lifecycleStatus: "pending"',
]) {
  if (!recoveredNativeSolShieldNotesSource.includes(marker)) {
    failures.push(
      `Recovered native SOL notes must keep a pending/local recovery marker: ${marker}.`,
    );
  }
}

if (!recoveredNotesUsePendingLifecycle && !shieldAssetStateSource.includes("local-sol-recovery:")) {
  failures.push(
    "Recovered native SOL notes must either use lifecycleStatus=pending or useVantaShieldAssetState must recognize local-sol-recovery notes when building spendableShieldedSolNotes.",
  );
}

if (!recoveredNotesUsePendingLifecycle && !shieldAssetStateExcludesLocalRecovery) {
  failures.push(
    "useVantaShieldAssetState must filter pending/local recovery notes out of spendableShieldedSolNotes before summing spendable SOL.",
  );
}

if (
  !recoveredNotesUsePendingLifecycle &&
  /const spendableShieldedSolNotes = shieldedSolNotes\.filter\(\s*\(note\) => note\.lifecycleStatus === "spendable",?\s*\)/.test(
    shieldAssetStateCompact,
  )
) {
  failures.push(
    "useVantaShieldAssetState must not treat every lifecycleStatus=spendable SOL note as spendable when local recovery markers are present.",
  );
}

if (recoveredNotesUsePendingLifecycle && !shieldAssetStateFiltersSpendableLifecycle) {
  failures.push(
    "useVantaShieldAssetState must keep lifecycleStatus=pending recovered SOL notes out of spendableShieldedSolNotes.",
  );
}

if (
  /loadRecentShieldTokenNotes|createRecentShieldTokenAccountShell|mergeRecentShieldTokenAccount|spendableShieldNotes = \[\.\.\.nextNotes/.test(
    shieldAssetRegistrySource,
  )
) {
  failures.push(
    "useVantaShieldAssetRegistryState must not merge browser-local recent token records into spendable token notes.",
  );
}

for (const marker of [
  "SHIELD_STATE_HYDRATION_RETRY_DELAYS_MS",
  "shieldStateHydrationTimeoutsRef",
  "clearShieldStateHydrationRetries",
  "queueShieldStateHydrationRetries",
]) {
  if (!shieldPageSource.includes(marker)) {
    failures.push(
      `ShieldPage must retry ledger hydration after a receipt-backed Shield completes: ${marker}.`,
    );
  }
}

if (
  !hasNearby(
    shieldPageSource,
    /const receiptVerified = !protocolSettlementWarning/g,
    /queueShieldStateHydrationRetries\(\s*activeStateSignature/,
    1_000,
  ) &&
  !hasNearby(
    shieldPageSource,
    /queueShieldStateHydrationRetries\(\s*activeStateSignature/g,
    /const receiptVerified = !protocolSettlementWarning/,
    1_000,
  )
) {
  failures.push(
    "ShieldPage must queue ledger hydration retries from the proof-receipt completion path.",
  );
}

for (const marker of [
  "queueShieldStateHydrationRetries(",
  "signatureHint: activeStateSignature",
]) {
  if (!shieldPageSource.includes(marker)) {
    failures.push(
      `ShieldPage must hydrate ledger state from the just-confirmed Shield signature: ${marker}.`,
    );
  }
}

for (const marker of [
  "type VantaShieldAssetStateRefreshOptions",
  "signatureHint?: string | null",
  "signatureHints:",
]) {
  if (!shieldAssetStateSource.includes(marker)) {
    failures.push(
      `useVantaShieldAssetState must pass a direct Shield signature hint into ledger recovery: ${marker}.`,
    );
  }
}

for (const marker of [
  "signatureHints?: readonly string[]",
  "...(args.signatureHints ?? [])",
  "err: null",
]) {
  if (!shieldStateSource.includes(marker)) {
    failures.push(
      `fetchVantaShieldAccountState must include direct signature hints before broad history indexing: ${marker}.`,
    );
  }
}

if (
  /queueShieldStateHydrationRetries\([^)]*(recentShield|resultingShieldedBalance)/.test(
    shieldPageCompact,
  )
) {
  failures.push(
    "ShieldPage hydration retries must refresh canonical ledger state, not pass optimistic recentShield balances into the ledger.",
  );
}

if (
  hasNearby(
    sendPageSource,
    /recentShield\s*\.\s*resultingShieldedBalance/g,
    /Current shielded balance/,
  ) ||
  hasNearby(
    sendPageSource,
    /Current shielded balance/g,
    /recentShield\s*\.\s*resultingShieldedBalance/,
  )
) {
  failures.push(
    "SendPage must not label recentShield.resultingShieldedBalance as Current shielded balance.",
  );
}

if (
  packageJson.scripts["shield:balance-ledger-check"] !==
  "node scripts/check-vanta-shielded-balance-ledger-contract.mjs"
) {
  failures.push("package.json must expose shield:balance-ledger-check.");
}

if (!packageJson.scripts["shield:verify"]?.includes("npm run shield:balance-ledger-check")) {
  failures.push("shield:verify must include shield:balance-ledger-check.");
}

if (failures.length > 0) {
  console.error("Vanta shielded balance ledger contract check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Vanta shielded balance ledger contract check: PASS");
}
