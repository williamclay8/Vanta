import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/SwapAdvancedPanel.tsx");
assert.ok(existsSync(componentPath), "Shared SwapAdvancedPanel component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
const swapWorkspaceSource = readRepoFile("src/components/SwapWorkspaceCard.tsx");
const swapSurfaceSource = `${swapPageSource}\n${swapWorkspaceSource}`;
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "import { NotePicker",
  "type NotePickerOption",
  "type SwapAdvancedPanelProps",
  "export function SwapAdvancedPanel",
  "data-vanta-swap-advanced-panel",
  "send-advanced-panel",
  "swap-advanced-panel",
  "Advanced swap settings",
  "Max slippage",
  "Note selection",
  "Venue routing",
  "notePickerOptions",
  "onSelectNote",
  "selectedNoteId",
  "sourceAssetLabel",
]) {
  assert.ok(componentSource.includes(marker), `SwapAdvancedPanel component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "fetchSwapQuote",
  "fetchSolToShieldedRouteQuote",
  "requestOperatorSwap",
  "requestSolToShieldedRouteExecution",
  "signSwapIntent",
  "quoteExpiresAt",
  "quoteClock",
  "setQuote",
  "setStatus",
  "formatExactSwapInputAmount",
  "spendableNotes.find",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `SwapAdvancedPanel must stay presentational and not own Swap execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "import { SwapAdvancedPanel",
  "<SwapAdvancedPanel",
  "handleSelectSwapNote",
  "maxSlippageLabel={formatSwapSlippage(quoteSlippageBps)}",
  "notePickerOptions={swapNotePickerOptions}",
  "onSelectNote={handleSelectSwapNote}",
  "routeTruthLabel={routeTruthLabel}",
  "selectedNoteId={selectedSwapNoteId}",
  "sourceAssetLabel={selectedSourceAsset}",
  "venueLabel={quoteVenueLabel}",
]) {
  assert.ok(swapSurfaceSource.includes(marker), `SwapPage missing SwapAdvancedPanel marker: ${marker}`);
}

assert.ok(
  !swapPageSource.includes('className="send-advanced-panel swap-advanced-panel"'),
  "SwapPage must use the shared SwapAdvancedPanel instead of the inline advanced details block.",
);

assert.ok(
  productBrowserSource.includes("[data-vanta-swap-advanced-panel]"),
  "product UI browser check must inspect the stable SwapAdvancedPanel selector.",
);
assert.ok(
  productBrowserSource.includes("assertSwapAdvancedDisclosure"),
  "product UI browser check must keep the Swap advanced disclosure assertion.",
);

assert.equal(
  packageJson.scripts["swap:advanced-panel-check"],
  "node scripts/check-vanta-swap-advanced-panel.mjs",
  "package.json must expose swap:advanced-panel-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run swap:advanced-panel-check"),
  "truth:privacy-claim-gate must include swap:advanced-panel-check.",
);

console.log("Vanta SwapAdvancedPanel extraction check: PASS");
