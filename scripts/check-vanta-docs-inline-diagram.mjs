import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

const docsHomeSource = readFileSync(path.join(repoRoot, "src/pages/DocsHomePage.tsx"), "utf8");
const stylesSource = readFileSync(path.join(repoRoot, "src/styles.css"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

for (const requiredSnippet of [
  "DocsHomeFlowDiagram",
  "data-docs-flow-diagram",
  'data-docs-flow-node="start-public"',
  'data-docs-flow-node="shield-into-vanta"',
  'data-docs-flow-node="create-receipt"',
  'data-docs-flow-node="counterparty-verify"',
  'data-docs-flow-arrow="start-to-shield"',
  'data-docs-flow-arrow="shield-to-receipt"',
  'data-docs-flow-arrow="receipt-to-verify"',
  "Public chain",
  "Vanta shield",
  "Trust packet",
  "Counterparty review",
  "Illustrative docs flow only; not production-private proof.",
]) {
  assert.ok(
    docsHomeSource.includes(requiredSnippet),
    `Docs home source must include inline flow diagram snippet: ${requiredSnippet}`,
  );
}

for (const forbiddenSnippet of [
  "anonymous settlement",
  "untraceable",
  "fully private",
  "live private settlement",
  "is production-private proof",
  "live depth oracle",
  "TVL",
  "user-count",
]) {
  assert.ok(
    !docsHomeSource.includes(forbiddenSnippet),
    `Docs inline diagram must not introduce unsupported claim: ${forbiddenSnippet}`,
  );
}

for (const requiredSnippet of [
  ".docs-home__flow-diagram",
  ".docs-home__flow-svg",
  ".docs-home__flow-node",
  ".docs-home__flow-arrow",
  ".docs-home__flow-path",
  "#docs-flow-arrowhead path",
  "overflow-x: auto",
  "min-width: 760px",
]) {
  assert.ok(
    stylesSource.includes(requiredSnippet),
    `Docs CSS must include inline flow diagram style snippet: ${requiredSnippet}`,
  );
}

assert.equal(
  packageJson.scripts["docs:inline-diagram-check"],
  "node scripts/check-vanta-docs-inline-diagram.mjs",
  "package.json must expose docs:inline-diagram-check.",
);
assert.ok(
  packageJson.scripts["docs:verify"]?.includes("npm run docs:inline-diagram-check"),
  "docs:verify must include docs:inline-diagram-check.",
);
assert.ok(
  packageJson.scripts["zk:feedback-loop-check"]?.includes("npm run docs:inline-diagram-check"),
  "zk:feedback-loop-check must include docs:inline-diagram-check.",
);

console.log("vanta docs inline diagram check: PASS");
