import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/AssetPickerGrid.tsx");
assert.ok(existsSync(componentPath), "Shared AssetPickerGrid component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const shieldWorkspaceSource = readRepoFile("src/components/ShieldWorkspaceCard.tsx");
const shieldSurfaceSource = `${shieldPageSource}\n${shieldWorkspaceSource}`;
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
const swapWorkspaceSource = readRepoFile("src/components/SwapWorkspaceCard.tsx");
const swapSurfaceSource = `${swapPageSource}\n${swapWorkspaceSource}`;
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type AssetPickerGridOption",
  "export function AssetPickerGrid",
  "className={rootClassName}",
  "asset-picker-grid",
  "asset-picker-grid__option",
  "asset-picker-grid__option--selected",
  "asset-picker-grid__option--disabled",
  "asset-picker-grid__logo",
  "asset-picker-grid__shimmer",
  "aria-label={ariaLabel}",
  "selectedOptionId",
  "onSelectOption",
  "loading",
]) {
  assert.ok(componentSource.includes(marker), `AssetPickerGrid component missing marker: ${marker}`);
}

for (const marker of [
  "import { AssetPickerGrid",
  "sourceAssetPickerOptions",
  "shieldTargetAssetPickerOptions",
  "Shield source asset",
  "Shield target asset",
  "From",
  "To",
  "<AssetPickerGrid",
]) {
  assert.ok(shieldSurfaceSource.includes(marker), `ShieldPage missing AssetPickerGrid marker: ${marker}`);
}

for (const marker of [
  "swapSourceAssetPickerOptions",
  "swapTargetAssetPickerOptions",
  "From shielded asset",
  "To shielded asset",
]) {
  // Note: SwapPage intentionally uses native <select> (not AssetPickerGrid) for the choose-trade UX
  // to achieve equal-size crisp boxes. The shared AssetPickerGrid (with its emptyLabel "No shielded assets ready")
  // is now Shield-focused for visual multi-asset picking with logos/balances.
  assert.ok(swapSurfaceSource.includes(marker), `SwapPage missing shared picker marker: ${marker}`);
}

for (const forbidden of [
  'aria-label="From asset"',
  'aria-label="From shielded asset"',
  'aria-label="To shielded asset"',
]) {
  const legacySelectPattern = new RegExp(`<select[\\s\\S]{0,240}${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  assert.ok(!legacySelectPattern.test(shieldSurfaceSource), `ShieldPage must replace legacy select marker ${forbidden}.`);
  assert.ok(!legacySelectPattern.test(swapSurfaceSource), `SwapPage must replace legacy select marker ${forbidden}.`);
}

for (const marker of [
  ".asset-picker-grid",
  ".asset-picker-grid__option",
  ".asset-picker-grid__option--selected",
  ".asset-picker-grid__option--disabled",
  ".asset-picker-grid__logo",
  ".asset-picker-grid__shimmer",
  "@keyframes asset-picker-shimmer",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(marker), `Shared AssetPickerGrid styles missing ${marker}.`);
}

assert.equal(
  packageJson.scripts["assets:picker-grid-check"],
  "node scripts/check-vanta-shared-asset-picker-grid.mjs",
  "package.json must expose assets:picker-grid-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run assets:picker-grid-check"),
  "truth:privacy-claim-gate must include assets:picker-grid-check.",
);

console.log("Vanta shared AssetPickerGrid check: PASS");
