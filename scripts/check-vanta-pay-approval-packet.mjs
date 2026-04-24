import { strict as assert } from "node:assert";

import { buildVantaPayApprovalPacket } from "../src/pay/vantaPayApprovalPacket.ts";

const packet = buildVantaPayApprovalPacket();

assert.equal(packet.version, "vanta-pay-approval-packet-0.1");
assert.deepEqual(packet.phaseOrder, ["preview", "approve", "execute", "settle"]);
assert.equal(packet.policyMode, "legible-trust");
assert.equal(packet.simulationRequired, true);
assert.equal(packet.walletApprovalRequired, true);

console.log("Vanta Pay approval packet check: PASS");
