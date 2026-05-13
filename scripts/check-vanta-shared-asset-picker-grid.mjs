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
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
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
  assert.ok(shieldPageSource.includes(marker), `ShieldPage missing AssetPickerGrid marker: ${marker}`);
}

for (const marker of [
  "import { AssetPickerGrid",
  "swapSourceAssetPickerOptions",
  "swapTargetAssetPickerOptions",
  "From shielded asset",
  "To shielded asset",
  "No shielded assets ready",
  "<AssetPickerGrid",
]) {
  assert.ok(swapPageSource.includes(marker), `SwapPage missing AssetPickerGrid marker: ${marker}`);
}

for (const forbidden of [
  'aria-label="From asset"',
  'aria-label="From shielded asset"',
  'aria-label="To shielded asset"',
]) {
  const legacySelectPattern = new RegExp(`<select[\\s\\S]{0,240}${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  assert.ok(!legacySelectPattern.test(shieldPageSource), `ShieldPage must replace legacy select marker ${forbidden}.`);
  assert.ok(!legacySelectPattern.test(swapPageSource), `SwapPage must replace legacy select marker ${forbidden}.`);
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
