import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/UnshieldAdvancedPanel.tsx");
assert.ok(existsSync(componentPath), "Shared UnshieldAdvancedPanel component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "import { NotePicker",
  "import type { ReactNode }",
  "type NotePickerOption",
  "type UnshieldAdvancedPanelProps",
  "export function UnshieldAdvancedPanel",
  "aria-label=\"Unshield advanced settings\"",
  "data-vanta-unshield-advanced-panel",
  "send-advanced-panel",
  "unshield-advanced-panel",
  "Advanced unshield settings",
  "Custom note selection",
  "Reference note for receipt",
  "notePickerOptions",
  "noteSelectionLabel",
  "onSelectNote",
  "referenceNoteLabel",
  "selectedNoteId",
]) {
  assert.ok(componentSource.includes(marker), `UnshieldAdvancedPanel component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "requestOperatorUnshield",
  "requestOperatorSolUnshield",
  "signUnshieldIntent",
  "signSolUnshieldIntent",
  "signWalletMessageIntentWithSafety",
  "setRequestedAmountInput",
  "setSelectedUnshieldNoteId",
  "setStatus",
  "setFlowError",
  "currentSpendableUnshieldNotes.find",
  "recordCanonicalUnshieldFromLiveUnshield",
  "copyUnshieldReceipt",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `UnshieldAdvancedPanel must stay presentational and not own Unshield execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "import { UnshieldAdvancedPanel",
  "<UnshieldAdvancedPanel",
  "handleSelectUnshieldNote",
  "notePickerOptions={unshieldNotePickerOptions}",
  "noteSelectionLabel={selectedUnshieldNoteLabel}",
  "onSelectNote={handleSelectUnshieldNote}",
  "referenceNoteLabel={",
  "selectedUnshieldNote ? abbreviate",
  "selectedNoteId={selectedUnshieldNoteId}",
]) {
  assert.ok(unshieldPageSource.includes(marker), `UnshieldPage missing UnshieldAdvancedPanel marker: ${marker}`);
}

assert.ok(
  !unshieldPageSource.includes('className="send-advanced-panel unshield-advanced-panel"'),
  "UnshieldPage must use the shared UnshieldAdvancedPanel instead of the inline advanced details block.",
);

assert.ok(
  productBrowserSource.includes("[data-vanta-unshield-advanced-panel]"),
  "product UI browser check must inspect the stable UnshieldAdvancedPanel selector.",
);
assert.ok(
  productBrowserSource.includes("assertUnshieldAdvancedDisclosure"),
  "product UI browser check must keep the Unshield advanced disclosure assertion.",
);

assert.equal(
  packageJson.scripts["unshield:advanced-panel-check"],
  "node scripts/check-vanta-unshield-advanced-panel.mjs",
  "package.json must expose unshield:advanced-panel-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run unshield:advanced-panel-check"),
  "truth:privacy-claim-gate must include unshield:advanced-panel-check.",
);

console.log("Vanta UnshieldAdvancedPanel extraction check: PASS");
