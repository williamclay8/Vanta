import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

const appSource = readRepoFile("src/App.tsx");
const notFoundSource = readRepoFile("src/pages/NotFoundPage.tsx");
const errorBoundarySource = readRepoFile("src/components/RouteErrorBoundary.tsx");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

assert.equal(
  packageJson.scripts["route:fallback-contract-check"],
  "node scripts/check-vanta-route-fallback-contract.mjs",
  "package.json must expose route:fallback-contract-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run route:fallback-contract-check"),
  "truth:privacy-claim-gate must include the source-only route fallback contract guard.",
);

assert.ok(appSource.includes("RouteErrorBoundary"), "App must wrap routes in RouteErrorBoundary.");
assert.ok(appSource.includes("NotFoundPage"), "App must import the truthful NotFoundPage.");
assert.ok(
  !appSource.includes('<Route path="*" element={<Navigate to="/app/shield" replace />} />'),
  "Unknown global routes must not redirect users into /app/shield.",
);
assert.ok(
  appSource.includes('<Route index element={<Navigate to="/app/shield" replace />} />'),
  "/app index can still intentionally redirect to Shield.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="docs" />} />'),
  "Unknown docs routes must render a truthful docs NotFoundPage.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="app" />} />'),
  "Unknown app routes must render a truthful app NotFoundPage.",
);
assert.ok(
  appSource.includes('<Route path="*" element={<NotFoundPage surface="site" />} />'),
  "Unknown global routes must render a truthful site NotFoundPage.",
);

for (const phrase of [
  "Something went wrong",
  "Nothing moved",
  "production privacy is not enabled",
  "componentDidCatch",
  "useLocation",
  "/docs/security",
  "/docs/trust",
  "/app/shield",
]) {
  assert.ok(errorBoundarySource.includes(phrase), `RouteErrorBoundary must include phrase/ref: ${phrase}`);
}

for (const phrase of [
  "Page not found",
  "Nothing moved",
  "Beta routes are visible, but production privacy is not enabled.",
  "/docs/security",
  "/docs/trust",
  "/app/shield",
]) {
  assert.ok(notFoundSource.includes(phrase), `NotFoundPage must include phrase/ref: ${phrase}`);
}

for (const banned of ["anonymous", "untraceable", "fully private", "production-ready", "mainnet-ready"]) {
  assert.ok(!notFoundSource.toLowerCase().includes(banned), `NotFoundPage must not include ${banned}.`);
  assert.ok(!errorBoundarySource.toLowerCase().includes(banned), `RouteErrorBoundary must not include ${banned}.`);
}

for (const selector of [
  ".route-fallback",
  ".route-fallback__actions",
  ".route-error-boundary",
]) {
  assert.ok(stylesSource.includes(selector), `src/styles.css must include ${selector}.`);
}

console.log("Vanta route fallback contract check: PASS");
