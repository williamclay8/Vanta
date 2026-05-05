import { strict as assert } from "node:assert";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const checkMode = args.includes("--check");
const actionArg = args.find((arg) => arg.startsWith("--action="));
const action = actionArg?.slice("--action=".length);

const packets = {
  shield: {
    version: "vanta-shield-trust-packet-0.1",
    kind: "shield-trust-packet",
    command: {
      human: "npm run shield:trust-packet",
      json: "npm run shield:trust-packet-json",
      check: "npm run shield:trust-packet-check",
    },
    action: "shield",
    counterparty: "reviewer-or-operator",
    artifact: "Private Pool v2 Shield receipt and shield privacy readiness status",
    claimBoundary: {
      privacyTier: "committed-shield-request-not-production-private",
      proofBacked: false,
      evidenceStatus: "no-current-shield-proof-evidence",
      fullyPrivate: false,
      productionReady: false,
      safeClaim:
        "Shield has a shaped receipt/trust-packet contract, but this packet is not current proof-backed and is not a production-private or audited anonymity claim.",
    },
    visibleFields: [
      "target asset",
      "receipt id",
      "proof receipt intent",
      "economics commitment",
      "settlement commitment",
      "operator readiness status",
    ],
    hiddenFields: [
      "wallet keys",
      "auth tokens",
      "customer private inputs",
      "raw witness material",
    ],
    verificationCommands: [
      "npm run shield:privacy-readiness-check",
      "npm run shield:executability-claims-check",
      "npm run private-pool-v2:shield-proof-request-check",
      "npm run programmatic-privacy:contract-check",
    ],
  },
  send: {
    version: "vanta-send-trust-packet-0.1",
    kind: "send-trust-packet",
    command: {
      human: "npm run send:trust-packet",
      json: "npm run send:trust-packet-json",
      check: "npm run send:trust-packet-check",
    },
    action: "send",
    counterparty: "recipient-or-reviewer",
    artifact:
      "Ledger-gated Send receipt/trust-packet lineage with repo-checked no-witness proof-artifact operator boundary",
    claimBoundary: {
      privacyTier: "ledger-gated-no-witness-proof-artifact-beta-not-production-private",
      proofBacked: false,
      evidenceStatus: "repo-checked-no-witness-send-proof-artifact-no-live-settlement-evidence",
      fullyPrivate: false,
      productionReady: false,
      safeClaim:
        "Send has a canonical ledger gate and a repo-checked no-witness proof-artifact operator boundary, but browser Send execution is blocked until a local proof artifact is available and the lane is not production-private until live shared-pool, relayer, anonymity, replay, redaction, and review gates pass.",
    },
    spendabilityBasis: "canonical-spendable-note-ledger",
    visibleFields: [
      "proof id",
      "input root",
      "nullifier or replay commitment",
      "output commitment",
      "recipient commitment",
      "operator link status",
      "canonical spendable-note ledger basis",
    ],
    operatorVisibleFields: [
      "repo-checked-no-witness-lane: proof artifact",
      "repo-checked-no-witness-lane: public input transcript",
      "repo-checked-no-witness-lane: input root",
      "repo-checked-no-witness-lane: input nullifier",
      "repo-checked-no-witness-lane: recipient/change commitments",
      "non-production local-prover-dev mode remains blocked from production privacy claims",
    ],
    hiddenFields: [
      "raw amount in shareable trust packet",
      "raw destination in shareable trust packet",
      "wallet owner in shareable trust packet",
      "private witness material in shareable trust packet",
      "auth tokens",
    ],
    verificationCommands: [
      "npm run private-core:send-check",
      "npm run private-core:send-proof-artifact-consistency-check",
      "npm run private-core:send-operator-no-witness-check",
      "npm run private-core:send-operator-redaction-check",
      "npm run private-core:send-nullifier-replay-no-witness-check",
      "npm run private-core:send-committed-settlement-check",
      "npm run send:requires-shielded-state-check",
      "npm run send:balance-ledger-check",
      "npm run send:production-privacy-claim-gate",
      "npm run mainnet:send-live-evidence-contract-check",
      "npm run programmatic-privacy:contract-check",
    ],
  },
  unshield: {
    version: "vanta-unshield-trust-packet-0.1",
    kind: "unshield-trust-packet",
    command: {
      human: "npm run unshield:trust-packet",
      json: "npm run unshield:trust-packet-json",
      check: "npm run unshield:trust-packet-check",
    },
    action: "unshield",
    counterparty: "recipient-or-reviewer",
    artifact: "Unshield release receipt and transaction evidence surface",
    claimBoundary: {
      privacyTier: "redacted-release-receipt-not-production-private",
      proofBacked: false,
      evidenceStatus: "no-current-unshield-proof-evidence",
      fullyPrivate: false,
      productionReady: false,
      safeClaim:
        "Unshield has a shaped release-evidence contract, but this packet is not current proof-backed and is not a production-private exit or anonymity claim.",
    },
    visibleFields: [
      "release receipt reference",
      "redacted transaction evidence",
      "nullifier or spent marker status",
      "operator release status",
    ],
    hiddenFields: [
      "private witness material",
      "customer private inputs",
      "auth tokens",
      "wallet keys",
      "full private-core release receipt by default",
    ],
	    verificationCommands: [
	      "npm run unshield:balance-ledger-check",
	      "npm run unshield:public-exit-surface-check",
	      "npm run unshield:sol-operator-endpoint-check",
	      "npm run private-core:unshield-committed-settlement-check",
	      "npm run unshield:safe-send-adoption-check",
	      "npm run programmatic-privacy:contract-check",
    ],
  },
};

if (!packets[action]) {
  throw new Error("Protocol trust packet requires --action=shield, --action=send, or --action=unshield.");
}

const packet = {
  ...packets[action],
  generatedAt: new Date().toISOString(),
  operatorStatusSurface: "npm run programmatic-privacy:contract-json",
  remainingBlockers: [
    "live shared-cohort settlement evidence",
    "audited shared anonymity set",
    "independent relayer separation review",
    "active exact-scope real-funds approval when moving funds",
    "external audit/custody/limitations review",
  ],
};

if (checkMode) {
  assert.equal(packet.action, action);
  assert.equal(packet.claimBoundary.proofBacked, false);
  assert.ok(
    packet.claimBoundary.evidenceStatus.startsWith("no-current-") ||
      packet.claimBoundary.evidenceStatus.includes("no-live-settlement-evidence"),
  );
  assert.equal(packet.claimBoundary.fullyPrivate, false);
  assert.equal(packet.claimBoundary.productionReady, false);
  assert.ok(packet.claimBoundary.safeClaim.includes("not"));
  assert.ok(packet.verificationCommands.includes("npm run programmatic-privacy:contract-check"));
  assert.ok(packet.remainingBlockers.includes("audited shared anonymity set"));

  if (packet.action === "send") {
    assert.equal(packet.spendabilityBasis, "canonical-spendable-note-ledger");
    assert.ok(packet.verificationCommands.includes("npm run send:balance-ledger-check"));
    assert.ok(
      packet.verificationCommands.includes("npm run private-core:send-operator-no-witness-check"),
      "Send packet must name the no-witness Send guard.",
    );
    assert.ok(
      packet.operatorVisibleFields?.some((field) =>
        field.includes("repo-checked-no-witness-lane"),
      ),
      "Send packet must name the repo-checked no-witness operator boundary.",
    );
    assert.ok(
      packet.operatorVisibleFields?.some((field) =>
        field.includes("non-production local-prover-dev mode"),
      ),
      "Send packet must preserve the local-prover-dev non-production limitation.",
    );
  }

  const serialized = JSON.stringify(packet);
  for (const forbidden of [
    "wallet private key",
    "seed phrase",
    "client token",
    "signed transaction",
    "Bearer ",
    "DATABASE_URL=",
    "postgres://",
    "customer email",
    "fully private",
    " is production-private",
  ]) {
    assert.ok(!serialized.includes(forbidden), `Trust packet must not leak or overclaim: ${forbidden}`);
  }
}

if (jsonMode || checkMode) {
  console.log(JSON.stringify(packet, null, 2));
} else {
  console.log(`Vanta ${packet.action} trust packet`);
  console.log(`- claimBoundary: ${packet.claimBoundary.privacyTier}`);
  console.log(`- fullyPrivate: ${String(packet.claimBoundary.fullyPrivate)}`);
  console.log(`- productionReady: ${String(packet.claimBoundary.productionReady)}`);
  console.log(`- artifact: ${packet.artifact}`);
  console.log(`- verifies with: ${packet.verificationCommands.join(", ")}`);
  console.log(`- remaining blockers: ${packet.remainingBlockers.join(", ")}`);
}
