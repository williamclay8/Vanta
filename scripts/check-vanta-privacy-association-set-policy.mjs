import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(
  resolve(repoRoot, "src/privacy/vantaPrivacyPoolsAssociationSetPolicy.ts"),
  "utf8",
);
const zkReview = readFileSync(resolve(repoRoot, "VANTA_ZK_REVIEW.md"), "utf8");

assert.match(source, /associationSetReady: false/);
assert.match(source, /Privacy Pools-style association-set membership proofs are not integrated/);
assert.match(zkReview, /Privacy Pools association sets/);

console.log("Vanta Privacy Pools association-set policy check: PASS");
