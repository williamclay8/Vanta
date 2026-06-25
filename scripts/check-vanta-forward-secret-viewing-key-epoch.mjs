import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(
  resolve(repoRoot, "src/solana/vantaForwardSecretViewingKeyEpoch.ts"),
  "utf8",
);

assert.match(source, /productionReady: false/);
assert.match(source, /resolveVantaForwardSecretViewingKeyEpoch/);

const policyMatch = source.match(/getVantaForwardSecretViewingKeyEpochPolicy\(\)[\s\S]*?return \{([\s\S]*?)\};/);
assert.ok(policyMatch, "forward-secret viewing-key epoch policy must exist.");
assert.match(policyMatch[1], /selectiveTransparencyReady: false/);

console.log("Vanta forward-secret viewing-key epoch check: PASS");
