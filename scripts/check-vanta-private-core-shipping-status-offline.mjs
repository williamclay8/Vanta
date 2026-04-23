import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";

const output = execFileSync(
  "node",
  [
    "scripts/print-vanta-private-core-shipping-status.mjs",
    "--json",
    "--base-url",
    "http://127.0.0.1:1",
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

const surface = JSON.parse(output);

assert.equal(surface.operator, "http://127.0.0.1:1");
assert.equal(surface.operatorReachable, false);
assert.equal(surface.decisionStatusRaw, "operator-unreachable");
assert.equal(surface.shippingStatusRaw, "operator-unreachable");
assert.equal(surface.decisionStatus, "Operator unreachable");
assert.equal(surface.shippingStatus, "Operator unreachable");
assert.equal(surface.finishLineStatus, "Operator unreachable");
assert.equal(surface.requiredLanesStatus, "Operator unreachable");
assert.equal(surface.releaseBoundaryStatus, "Operator unreachable");
assert.equal(surface.contractMirrorStatus, "Operator unreachable");
assert.equal(surface.boundaryStatus, "Operator unreachable");
assert.ok(surface.operatorError.includes("fetch failed") || surface.operatorError.includes("bad port"));

console.log("Vanta private-core offline shipping status check: PASS");
