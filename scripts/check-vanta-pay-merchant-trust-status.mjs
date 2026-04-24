import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";

const result = JSON.parse(
  execFileSync("npm", ["run", "--silent", "pay:merchant-trust-status", "--", "--json"], {
    encoding: "utf8",
  }),
);

assert.equal(result.version, "vanta-pay-merchant-trust-status-0.1");
assert.equal(result.privacyMode, "controlled-privacy");
assert.equal(result.policyMode, "legible-trust");
assert.equal(result.productionReady, false);

console.log("vanta-pay merchant trust status check: PASS");
