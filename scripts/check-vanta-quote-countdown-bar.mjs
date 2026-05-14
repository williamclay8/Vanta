import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/QuoteCountdownBar.tsx");
assert.ok(existsSync(componentPath), "Shared QuoteCountdownBar component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const swapPageSource = readRepoFile("src/pages/SwapPage.tsx");
const stylesSource = readRepoFile("src/styles.css");
const productBrowserSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type QuoteCountdownBarTone",
  "export function QuoteCountdownBar",
  "type QuoteCountdownBarProps",
  "quote-countdown-bar",
  "quote-countdown-bar__fill",
  "progressPercent",
  "aria-label={label}",
  "aria-valuenow={boundedProgressPercent}",
  "aria-valuetext={label}",
  "role=\"progressbar\"",
  "data-quote-countdown-tone",
  "data-vanta-quote-countdown-bar",
]) {
  assert.ok(componentSource.includes(marker), `QuoteCountdownBar component missing marker: ${marker}`);
}

for (const forbidden of [
  "useEffect",
  "useState",
  "fetch",
  "requestOperatorSwap",
  "requestSolToShieldedRouteExecution",
  "signSwapIntent",
  "quoteExpiresAt",
]) {
  assert.ok(
    !componentSource.includes(forbidden),
    `QuoteCountdownBar must stay presentational and not own Swap execution/state marker: ${forbidden}`,
  );
}

for (const marker of [
  "import { QuoteCountdownBar",
  "<QuoteCountdownBar",
  "progressPercent={quoteProgressPercent}",
  "tone={quoteProgressTone}",
  "label={quoteStatusLabel}",
  "Quote refreshes in",
]) {
  assert.ok(swapPageSource.includes(marker), `SwapPage missing QuoteCountdownBar marker: ${marker}`);
}

assert.ok(
  !swapPageSource.includes("className=\"swap-quote-progress\""),
  "SwapPage must use the shared QuoteCountdownBar instead of the inline swap-quote-progress block.",
);

for (const marker of [
  ".quote-countdown-bar",
  ".quote-countdown-bar__fill",
  ".quote-countdown-bar[data-quote-countdown-tone=\"warning\"]",
  ".quote-countdown-bar[data-quote-countdown-tone=\"refreshing\"]",
  "@keyframes quote-countdown-refresh-pulse",
]) {
  assert.ok(stylesSource.includes(marker), `QuoteCountdownBar styles missing ${marker}.`);
}

assert.ok(
  productBrowserSource.includes(".quote-countdown-bar"),
  "product UI browser check must inspect the shared quote countdown bar.",
);
assert.ok(
  productBrowserSource.includes("[data-vanta-quote-countdown-bar]"),
  "product UI browser check must inspect the stable QuoteCountdownBar selector.",
);
assert.ok(
  productBrowserSource.includes("assertSwapQuoteCountdownBar"),
  "product UI browser check must include a Swap QuoteCountdownBar assertion.",
);

assert.equal(
  packageJson.scripts["swap:quote-countdown-check"],
  "node scripts/check-vanta-quote-countdown-bar.mjs",
  "package.json must expose swap:quote-countdown-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run swap:quote-countdown-check"),
  "truth:privacy-claim-gate must include swap:quote-countdown-check.",
);

console.log("Vanta QuoteCountdownBar extraction check: PASS");
