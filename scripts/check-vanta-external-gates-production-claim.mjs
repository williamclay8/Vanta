import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVantaMainnetReadinessSnapshot } from "../src/readiness/mainnetReadiness.mjs";
import { createCurrentVantaShieldPrivacyReadiness } from "../src/readiness/shieldPrivacyReadiness.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function readJson(path) {
  const absolute = resolve(repoRoot, path);
  assert.ok(existsSync(absolute), `Missing ${path}.`);
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function assertRefsOnly(value, path = "packet") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertRefsOnly(entry, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    assert.ok(
      !["value", "rawSecret", "privateKey", "seedPhrase", "keypair", "mnemonic", "signedTransaction"].includes(key),
      `${path}.${key} must not contain raw secret material.`,
    );
    assertRefsOnly(entry, `${path}.${key}`);
  }
}

const externalGates = readJson("ops/mainnet/external-gates.packet.json");
const approvalGates = readJson("ops/mainnet/mainnet-approval-gates.evidence.json");
const auditPacket = readJson("ops/mainnet/audit-review.packet.template.json");
const legalPacket = readJson("ops/mainnet/legal-compliance-custody.packet.template.json");
const keyCustodyPacket = readJson("ops/mainnet/production-key-custody.template.json");
const snapshot = createVantaMainnetReadinessSnapshot();
const shieldReadiness = createCurrentVantaShieldPrivacyReadiness();

for (const packet of [externalGates, approvalGates, auditPacket, legalPacket, keyCustodyPacket]) {
  assert.equal(packet.mainnetReady, false, "Production claim packets must not claim mainnet readiness.");
  assert.equal(packet.productionReady, false, "Production claim packets must not claim production readiness.");
  assertRefsOnly(packet);
}

const gateStatusById = new Map(approvalGates.gates.map((gate) => [gate.id, gate.status]));
const skippedGateIds = new Set((approvalGates.operatorSkippedControls ?? []).map((entry) => entry.id));
const requiredSkippedGateIds = [
  "secret-manager-audit-rotation-evidence-skipped",
  "third-party-security-audit-skipped",
  "legal-compliance-custody-skipped",
];

for (const gateId of requiredSkippedGateIds) {
  assert.ok(skippedGateIds.has(gateId), `Missing skipped-control truth for ${gateId}.`);
}

assert.equal(gateStatusById.get("third-party-security-audit"), "operator-skipped-control");
assert.equal(gateStatusById.get("legal-compliance-custody"), "operator-skipped-control");
assert.equal(gateStatusById.get("secret-manager-backed-credentials"), "operator-skipped-control");
assert.equal(auditPacket.auditClaimAllowed, false);
assert.equal(legalPacket.legalComplianceCustodyClaimAllowed, false);
assert.equal(keyCustodyPacket.productionKeyCustodyReady, false);
assert.equal(snapshot.mainnetReady, false);
assert.equal(snapshot.productionReady, false);
assert.equal(snapshot.privateSettlement?.privacyClaimAllowed, false);
assert.equal(shieldReadiness.privacyClaimAllowed, false);
assert.equal(shieldReadiness.strictReady, false);

const productionClaimAllowed =
  snapshot.mainnetReady === true &&
  snapshot.productionReady === true &&
  snapshot.privateSettlement?.privacyClaimAllowed === true &&
  shieldReadiness.privacyClaimAllowed === true &&
  auditPacket.auditClaimAllowed === true &&
  legalPacket.legalComplianceCustodyClaimAllowed === true &&
  keyCustodyPacket.productionKeyCustodyReady === true;

assert.equal(productionClaimAllowed, false, "Production claim must remain blocked until all external gates are real.");

const blockedBy = [
  "third-party-security-audit",
  "legal-compliance-custody",
  "secret-manager-audit-rotation",
  "production-key-custody",
  "production-anonymity-set",
  "relayer-separation",
  "live-mainnet-settlement",
  "active-bounded-real-funds-approval-window",
];

console.log("Vanta external gates production claim check: PASS");
console.log(
  JSON.stringify(
    {
      productionClaimAllowed,
      mainnetReady: snapshot.mainnetReady,
      productionReady: snapshot.productionReady,
      privateSettlementPrivacyClaimAllowed: snapshot.privateSettlement?.privacyClaimAllowed === true,
      shieldPrivacyClaimAllowed: shieldReadiness.privacyClaimAllowed === true,
      blockedBy,
    },
    null,
    2,
  ),
);
