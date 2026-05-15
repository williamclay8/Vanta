import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/SwapReceiptModal.tsx");
assert.ok(existsSync(componentPath), "Shared SwapReceiptModal component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type SwapReceiptModalDetails",
  "export function SwapReceiptModal",
  "type SwapReceiptModalProps",
  "data-vanta-swap-receipt-modal",
  "swap-receipt-modal",
  "role=\"dialog\"",
  "aria-modal=\"true\"",
  "Swap receipt",
  "Trust packet • route settlement",
  "onClose",
  "details",
  "Operator request",
  "Output note",
  "Transition note",
  "Venue pool",
  "routeTruthLabel",
]) {
  assert.ok(componentSource.includes(marker), `SwapReceiptModal component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "fetchSwapQuote",
  "fetchSolToShieldedRouteQuote",
  "requestOperatorSwap",
  "requestSolToShieldedRouteExecution",
  "signSwapIntent",
  "setQuote",
  "setStatus",
  "persistCanonicalSwapRecord",
  "recordCanonicalSwapFromLiveSwap",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `SwapReceiptModal must stay presentational and not own Swap execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "import { SwapReceiptModal",
  "<SwapReceiptModal",
  "swapReceiptModalOpen",
  "setSwapReceiptModalOpen",
  "open={swapReceiptModalOpen}",
  "onClose={() => setSwapReceiptModalOpen(false)}",
  "setSwapReceiptModalOpen(true)",
  "lastSwapSummary.inputAsset",
  "lastSwapSummary.outputAsset",
  'status === "complete" && lastSwapSummary',
  "listCanonicalSwapRecords",
  "recentSwapSummaries",
  "buildRecentSwapReceiptSummaries",
  "data-vanta-swap-recent-browser-local",
  "data-vanta-swap-recent-list",
  "data-vanta-swap-recent-card",
  "data-vanta-swap-recent-empty",
  "Recent swaps",
  "Browser-local history",
  "Stored in this browser",
  "Open receipt",
  "View swap receipt",
  "Swap receipt unavailable until a completed swap exists.",
]) {
  assert.ok(swapPageSource.includes(marker), `SwapPage missing SwapReceiptModal marker: ${marker}`);
}

for (const marker of [
  ".swap-receipt-modal",
  ".swap-receipt-modal__overlay",
  ".swap-receipt-modal__dialog",
  ".swap-receipt-modal__grid",
  ".swap-receipt-modal__close",
  "overflow-wrap: anywhere",
]) {
  assert.ok(stylesSource.includes(marker), `SwapReceiptModal styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["swap:receipt-modal-check"],
  "node scripts/check-vanta-swap-receipt-modal.mjs",
  "package.json must expose swap:receipt-modal-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run swap:receipt-modal-check"),
  "truth:privacy-claim-gate must include swap:receipt-modal-check.",
);

console.log("Vanta SwapReceiptModal extraction check: PASS");
