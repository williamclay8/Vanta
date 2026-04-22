import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packetPath = resolve(repoRoot, "ops/mainnet/mainnet-approval-gates.template.json");

assert.ok(existsSync(packetPath), "Missing ops/mainnet/mainnet-approval-gates.template.json.");

const packet = JSON.parse(readFileSync(packetPath, "utf8"));

assert.equal(packet.version, "vanta-mainnet-approval-gates-template-0.1");
assert.equal(packet.mainnetReady, false);
assert.equal(packet.productionReady, false);
assert.equal(packet.secretPolicy, "references-only-no-secret-values");
assert.equal(packet.realFundsPolicy, "explicit-human-approval-required");

for (const gateId of [
  "secret-manager-backed-credentials",
  "private-pool-v2-production-smoke",
  "third-party-security-audit",
  "legal-compliance-custody",
  "explicit-mainnet-funds-approval",
]) {
  const gate = packet.gates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing mainnet approval gate ${gateId}.`);
  assert.equal(gate.status, "blocked", `${gateId} must remain blocked.`);
  assert.ok(gate.owner, `${gateId} must declare owner.`);
  assert.ok(gate.evidenceRefs.length > 0, `${gateId} must declare evidence refs.`);
  assert.ok(
    gate.evidenceRefs.every((ref) => String(ref).endsWith("_REF")),
    `${gateId} evidence refs must be ref names only.`,
  );
  assert.ok(gate.forbiddenValues.length > 0, `${gateId} must declare forbidden values.`);
}

const fundsGate = packet.gates.find((candidate) => candidate.id === "explicit-mainnet-funds-approval");
assert.equal(fundsGate.requiresHumanApproval, true);
assert.equal(fundsGate.mainnetTransactionsAllowedBeforeApproval, false);
assert.equal(fundsGate.realFundsAllowedBeforeApproval, false);

const source = JSON.stringify(packet);
for (const forbidden of ["privateKey", "seedPhrase", "mnemonic", "rawSecret", "DATABASE_URL=", "Bearer "]) {
  assert.ok(!source.includes(forbidden), `Approval gates template must not contain ${forbidden}.`);
}

assert.ok(
  packet.requiredVerificationCommands.includes("npm run mainnet:approval-gates-check"),
  "Approval gates template must include its own check command.",
);
assert.ok(
  packet.requiredVerificationCommands.includes("npm run mainnet:approval-gates-evidence-check"),
  "Approval gates template must include evidence check.",
);
assert.ok(
  packet.requiredVerificationCommands.includes("npm run mainnet:external-gates-check"),
  "Approval gates template must include external gates check.",
);
assert.ok(
  packet.requiredVerificationCommands.includes("npm run mainnet:production-smoke-evidence-check"),
  "Approval gates template must include production smoke evidence check.",
);

console.log("Vanta mainnet approval gates template check: PASS");
