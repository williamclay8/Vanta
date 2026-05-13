import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const swapPageSource = readFileSync(resolve(repoRoot, "src/pages/SwapPage.tsx"), "utf8");
const shieldStateSource = readFileSync(resolve(repoRoot, "src/solana/vantaShieldState.ts"), "utf8");
const operatorShieldStateSource = readFileSync(resolve(repoRoot, "operator/vanta-onchain-state.mjs"), "utf8");
const capabilitySource = readFileSync(
  resolve(repoRoot, "src/solana/shieldedSwapCapability.ts"),
  "utf8",
);
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const forbiddenMarkers = [
  "PendingImplicitShieldSwap",
  "PendingPublicRoute",
  "pendingImplicitShieldSwap",
  "pendingPublicRoute",
  "publicRouteTransaction",
  "publicRouteWait",
  "implicitShieldStateTransaction",
  "implicit shield",
  "startImplicitShield",
  "buildPublicToUsdcSwapInstructions",
  "fetchPublicToUsdcQuote",
  "useWalletPublicAssets",
  "recordCanonicalShieldFromLiveShield",
  "createShieldMemoInstruction",
  "recentShield",
  "Vanta will shield",
  "automatically",
  "Routing public swap",
  "Operator sees: nothing",
  "Venue sees: nothing",
  "fully private swap",
  "anonymous swap",
  "untraceable swap",
];

const requiredMarkers = [
  "From shielded asset",
  "Shield the exact",
  "PrivacySummary",
  "SWAP_PRIVACY_SUMMARY_ITEMS",
  "Chain sees",
  "Venue sees",
  "operator-visible route settlement terms",
  "You see",
  "swapPrimaryActionLabel",
  "swap-quote-progress",
  "Quote refreshes in",
  "Advanced swap settings",
  "Max slippage",
  "Note selection",
  "Venue routing",
  "selectedSourceAsset",
  "sourcePairCapability",
  "exactSpendableNote",
  "selectedSwapNoteId",
  "freshQuote.quoteExpiresAt <= Date.now()",
  "The latest live quote expired, so the swap path is blocked until a fresh quote is available.",
  "!isReady ||",
];

const failures = [];

for (const marker of forbiddenMarkers) {
  if (swapPageSource.includes(marker)) {
    failures.push(`Swap page must not contain auto-shield/public-route marker: ${marker}`);
  }
}

for (const marker of requiredMarkers) {
  if (!swapPageSource.includes(marker)) {
    failures.push(`Swap page missing shield-first marker: ${marker}`);
  }
}

for (const marker of [
  "pendingSwapByConsumedNoteId",
  "pendingSolSwapByConsumedNoteId",
  "!pendingSwapByConsumedNoteId.has(note.noteId)",
  "!pendingSolSwapByConsumedNoteId.has(note.noteId)",
]) {
  if (!shieldStateSource.includes(marker)) {
    failures.push(`Swap ledger must exclude pending swap source notes from spendable state: ${marker}`);
  }
}

if (!/pendingSolSwapTransition[\s\S]{0,260}lifecycleStatus[\s\S]{0,260}"pending"/.test(shieldStateSource)) {
  failures.push("Shielded SOL swap sources must become lifecycleStatus=pending before spent-marker finality.");
}

for (const marker of [
  "pendingSwapByConsumedNoteId",
  "pendingSolSwapByConsumedNoteId",
  "marker.transitionKind !== \"sol_unshield\" && marker.transitionKind !== \"swap\"",
  "transition.inputAsset !== \"SOL\"",
  "!pendingSwapByConsumedNoteId.has(note.noteId)",
  "!pendingSolSwapByConsumedNoteId.has(note.noteId)",
]) {
  if (!operatorShieldStateSource.includes(marker)) {
    failures.push(`Operator swap resolver must exclude pending swap source notes from spendable state: ${marker}`);
  }
}

if (!/createSolUnshieldNoteId\(\{[\s\S]{0,120}asset: "SOL"/.test(operatorShieldStateSource)) {
  failures.push("Operator SOL-unshield fallback ids must keep asset=SOL, not swap output asset.");
}

if (!/candidateSwapNotes\.filter\([\s\S]{0,220}note\.inputAsset === "SOL"[\s\S]{0,220}note\.consumedNoteId === args\.consumedNoteId/.test(operatorShieldStateSource)) {
  failures.push("Operator SOL unshield eligibility must reject competing SOL-input swap transitions.");
}

if (!packageSource.includes('"swap:requires-shielded-state-check"')) {
  failures.push("package.json must expose swap:requires-shielded-state-check.");
}

if (!capabilitySource.includes("Shielded USDC")) {
  failures.push("Swap capability boundary must expose Shielded USDC.");
}

if (failures.length > 0) {
  console.error("Vanta swap shield-first check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta swap shield-first check: PASS");
