import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/NotePicker.tsx");
assert.ok(existsSync(componentPath), "Shared NotePicker component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const sendPageSource = readRepoFile("src/pages/SendPage.tsx");
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
const swapAdvancedPanelSource = readRepoFile("src/components/SwapAdvancedPanel.tsx");
const unshieldPageSource = readRepoFile("src/pages/UnshieldPage.tsx");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type NotePickerOption",
  "export function NotePicker",
  "className=\"note-picker\"",
  "note-picker__select",
  "note-picker__cards",
  "Empty Vault",
  "start with Shield",
  "selectedNoteId",
  "onSelectNote",
  "aria-label={ariaLabel}",
]) {
  assert.ok(componentSource.includes(marker), `NotePicker component missing marker: ${marker}`);
}

for (const [pageName, pageSource, requiredPhrases] of [
  [
    "SendPage",
    sendPageSource,
    [
      "import { NotePicker",
      "<NotePicker",
      "Custom note selection",
      "No send-ready notes",
      "Automatic best note",
      "Plaintext memo contents stay out of the operator packet.",
    ],
  ],
  [
    "SwapAdvancedPanel",
    swapAdvancedPanelSource,
    [
      "import { NotePicker",
      "<NotePicker",
      "Note selection",
      "No spendable shielded",
      "Automatic exact-note match",
      "Swap execution still requires an exact shielded source note.",
    ],
  ],
  [
    "UnshieldPage",
    unshieldPageSource,
    [
      "import { NotePicker",
      "<NotePicker",
      "Custom note selection",
      "No ledger-spendable notes",
      "Automatic best note",
      "Receipt references stay bounded to the selected exit note and public release record.",
    ],
  ],
]) {
  for (const phrase of requiredPhrases) {
    assert.ok(pageSource.includes(phrase), `${pageName} missing shared NotePicker marker: ${phrase}`);
  }
}

for (const marker of [
  "import { SwapAdvancedPanel",
  "<SwapAdvancedPanel",
]) {
  assert.ok(swapPageSource.includes(marker), `SwapPage missing SwapAdvancedPanel NotePicker adoption marker: ${marker}`);
}

for (const [pageName, pageSource, panelClass] of [
  ["SendPage", sendPageSource, "send-advanced-panel"],
  ["SwapAdvancedPanel", swapAdvancedPanelSource, "swap-advanced-panel"],
  ["UnshieldPage", unshieldPageSource, "unshield-advanced-panel"],
]) {
  const panelIndex = pageSource.indexOf(panelClass);
  const notePickerIndex = pageSource.indexOf("<NotePicker", panelIndex);
  assert.ok(
    panelIndex >= 0 && notePickerIndex > panelIndex,
    `${pageName} must keep NotePicker inside the advanced disclosure.`,
  );
}

for (const marker of [
  ".note-picker",
  ".note-picker__select",
  ".note-picker__cards",
  ".note-picker__card",
  ".note-picker__empty",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(marker), `Shared NotePicker styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["notes:shared-picker-check"],
  "node scripts/check-vanta-shared-note-picker.mjs",
  "package.json must expose notes:shared-picker-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run notes:shared-picker-check"),
  "truth:privacy-claim-gate must include notes:shared-picker-check.",
);

console.log("Vanta shared NotePicker check: PASS");
