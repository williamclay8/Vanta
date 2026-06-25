import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createVantaProgrammaticPrivacyImplementationLadder } from "../src/readiness/programmaticPrivacyImplementationLadder.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

assert.equal(
  packageJson.scripts["programmatic-privacy:implementation-ladder-check"],
  "node scripts/check-vanta-programmatic-privacy-implementation-ladder.mjs",
);

const ladder = createVantaProgrammaticPrivacyImplementationLadder();
assert.equal(ladder.productionPrivateReady, false);
assert.equal(ladder.privacyClaimAllowed, false);
assert.equal(ladder.mainnetReady, false);
assert.equal(ladder.tiers.length, 3);

for (const tier of ladder.tiers) {
  assert.equal(tier.productionReady, false, `tier ${tier.tier} must not be production-ready.`);
}

for (const workstream of ladder.workstreams) {
  const scriptKey = workstream.guardCommand.replace(/^npm run /, "");
  assert.ok(packageJson.scripts[scriptKey], `${workstream.id} guard must exist (${scriptKey}).`);
}

const shieldHandoff = readFileSync(
  resolve(repoRoot, "src/privacy/privatePoolV2SharedCohortShieldHandoff.ts"),
  "utf8",
);
assert.match(shieldHandoff, /productionSharedCohortReady: false/);

console.log("Vanta programmatic privacy implementation ladder check: PASS");
