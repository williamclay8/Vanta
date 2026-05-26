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
    honestyNote:
      "Trust packets bind to current operator-shaped commitments; cryptographic verifiability against an audited proof system is part of the readiness work tracked in SECURITY_LIMITATIONS.md.",
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
        "Send has a canonical ledger gate, repo-checked no-witness proof-artifact operator boundary, v2 viewing-key AEAD action memos in the live pages, local dual-AEAD recipient/change memo scaffolding, local Private Pool v2 proof-request/circuit binding for recipient/change memo ciphertext body hashes, local verifier-mirrored discovery handoff coverage, fresh-v2-only production claim scope for Send history, and local legacy-v1 migration tooling, but recipient discovery is still incomplete, legacy v1 history still lacks reviewed migration or segregation evidence, browser Send execution is blocked until a local proof artifact is available, and the lane is not production-private until live shared-pool, relayer, anonymity, replay, redaction, and review gates pass.",
    },
    honestyNote:
      "Trust packets bind to current operator-shaped commitments; cryptographic verifiability against an audited proof system is part of the readiness work tracked in SECURITY_LIMITATIONS.md.",
    sendMemoMode: "v2-viewing-key-aead-dual-scaffold-fresh-v2-production-scope-legacy-v1-parse-compatible",
    publicChainVisibleFields: [
      "new live Send action memos expose only the v2 AEAD memo prefix and opaque ciphertext body",
      "local dual-AEAD scaffold can separately seal recipient and change discovery memos and expose sha256 ciphertext body hashes",
      "legacy historical v1 Send memos remain parse-compatible, can expose recipient/amount/change amount, and are excluded from production privacy claims unless migrated or segregated with reviewed evidence",
      "recipient-side discovery still needs a trustable viewing-key exchange or encrypted outbox/view-tag design before external Send can make production privacy claims",
    ],
    sendDiscoveryHandoff: {
      blockerIds: [
        "send-memo-indexer-body-hash-handoff-not-deployed",
        "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
      ],
      claimBoundary:
        "local encrypted-view-tag index only; not production recipient discovery",
      deployedMemoIndexerHandoff: false,
      freshV2OnlyClaimScoped: true,
      localIndexerEndpoint: "/v1/send-discovery-packets",
      localStatusEndpoint: "/v1/send-discovery/status",
      localViewTagBodyHashHandoff: true,
      localVerifierMirroredDiscoveryHandoff: true,
      productionReady: false,
      version: "vanta-private-pool-v2-send-discovery-packet-0.1",
    },
    legacyHistoryScope: {
      freshV2OnlyClaimScoped: true,
      legacyV1EligibleForProductionPrivacyClaims: false,
      legacyV1ParseCompatible: true,
      localMigrationToolingCovered: true,
      migrated: false,
      productionReady: false,
      reviewedMigrationOrSegregationEvidence: false,
      segregatedWithReviewedEvidence: false,
      scopeBoundary:
        "production Send privacy claims are scoped to fresh v2 AEAD sends unless legacy v1 plaintext history is migrated or segregated with reviewed evidence",
      status: "local-migration-tooling-only-reviewed-evidence-missing",
      version: "vanta-send-history-privacy-scope-0.1",
    },
    proofTranscriptFields: [
      "Private Pool v2 Send proof requests and the local Send circuit bind recipient/change ciphertext body hash fields into the public input hash",
    ],
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
      "npm run actions:memo-encryption-check",
      "npm run actions:legacy-v1-send-memo-migration-check",
      "npm run private-pool-v2:send-proof-request-check",
      "npm run private-pool-v2:send-circuit-check",
      "npm run private-pool-v2:public-input-hash-alignment-check",
      "npm run send:requires-shielded-state-check",
      "npm run send:balance-ledger-check",
      "npm run send:production-privacy-claim-gate",
      "npm run send:discovery-indexer-handoff-check",
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
    currentReleaseModel: "operator-keypair-public-exit",
    claimBoundary: {
      privacyTier: "redacted-release-receipt-not-production-private",
      proofBacked: false,
      evidenceStatus: "no-current-unshield-proof-evidence",
      fullyPrivate: false,
      productionReady: false,
      safeClaim:
        "Unshield currently releases through an operator-keypair public exit. The local TAG_UNSHIELD source ABI preflights root, root-record, verifier-key, nullifier, vault-authority, vault-asset registry, and token-account shape, then fails closed before proof verification, token CPI, custody transfer, or fund release. This is not a production-private exit or custody claim until a program-owned vault + on-chain TAG_UNSHIELD proof-verified release exists.",
    },
    custodyBoundary: {
      productionCustodyReady: false,
      programOwnedVaultReady: false,
      sourceOnlyVaultAuthorityPreflightReady: true,
      sourceOnlyVaultAssetRegistryReady: true,
      sourceOnlyVaultTokenAccountPreflightReady: true,
      sourceOnlyRootPreflightReady: true,
      sourceOnlyVerifierKeyPreflightReady: true,
      onchainUnshieldInstructionReady: false,
      tagUnshieldVaultAssetRegistryReleaseEnabled: false,
      blockerIds: [
        "program-owned-vault-pda-not-deployed",
        "tag-unshield-reserved-fail-closed",
        "tag-unshield-token-cpi-release-not-wired",
      ],
      guardCommand: "npm run private-pool-v2:onchain-unshield-custody-check",
      safeReleaseBoundary:
        "Current release model is operator-keypair public exit; local TAG_UNSHIELD and TAG_REGISTER_VAULT_ASSET are source-only preflight/registry scaffolds and cannot release funds; the vault-asset record keeps releaseEnabled false; production custody requires program-owned vault custody, proof verification, nullifier consume, and on-chain TAG_UNSHIELD token CPI release.",
    },
    honestyNote:
      "Trust packets bind to current operator-shaped commitments; cryptographic verifiability against an audited proof system is part of the readiness work tracked in SECURITY_LIMITATIONS.md.",
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
      "npm run private-pool-v2:onchain-unshield-custody-check",
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

if (packet.action === "send") {
  packet.remainingBlockers = [
    ...packet.remainingBlockers,
    "send-memo-indexer-body-hash-handoff-not-deployed",
    "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
  ];
}

if (packet.action === "unshield") {
  packet.remainingBlockers = [
    ...packet.remainingBlockers,
    "program-owned-vault-pda-not-deployed",
    "tag-unshield-reserved-fail-closed",
    "tag-unshield-token-cpi-release-not-wired",
  ];
}

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
  assert.ok(packet.honestyNote?.includes("current operator-shaped commitments"));

  if (packet.action === "send") {
    assert.equal(packet.spendabilityBasis, "canonical-spendable-note-ledger");
    assert.equal(
      packet.sendMemoMode,
      "v2-viewing-key-aead-dual-scaffold-fresh-v2-production-scope-legacy-v1-parse-compatible",
    );
    assert.ok(
      packet.publicChainVisibleFields?.some((field) => field.includes("opaque ciphertext")),
      "Send packet must disclose that new action memos are opaque AEAD ciphertext.",
    );
    assert.ok(
      packet.publicChainVisibleFields?.some((field) => field.includes("dual-AEAD scaffold")),
      "Send packet must disclose the local dual-AEAD memo scaffold without upgrading it to production discovery.",
    );
    assert.ok(
      !packet.publicChainVisibleFields?.some((field) => field.includes("proof requests")),
      "Send packet must keep local proof transcript binding out of public-chain visible fields.",
    );
    assert.ok(
      packet.proofTranscriptFields?.some((field) =>
        field.includes("public input hash") && field.includes("ciphertext body hash fields"),
      ),
      "Send packet must disclose the local proof-request/circuit ciphertext body hash binding.",
    );
    assert.equal(packet.sendDiscoveryHandoff?.productionReady, false);
    assert.equal(packet.sendDiscoveryHandoff?.localViewTagBodyHashHandoff, true);
    assert.equal(packet.sendDiscoveryHandoff?.localVerifierMirroredDiscoveryHandoff, true);
    assert.equal(packet.sendDiscoveryHandoff?.deployedMemoIndexerHandoff, false);
    assert.ok(
      packet.claimBoundary?.safeClaim.includes("local verifier-mirrored discovery handoff coverage"),
      "Send packet safe claim must mention local verifier-mirrored discovery handoff coverage.",
    );
    assert.ok(
      packet.claimBoundary?.safeClaim.includes("local legacy-v1 migration tooling"),
      "Send packet safe claim must mention local legacy-v1 migration tooling.",
    );
    assert.ok(
      packet.sendDiscoveryHandoff?.blockerIds?.includes(
        "send-memo-indexer-body-hash-handoff-not-deployed",
      ),
      "Send packet must expose the memo/indexer handoff blocker id.",
    );
    assert.ok(
      packet.sendDiscoveryHandoff?.blockerIds?.includes(
        "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
      ),
      "Send packet must expose the reviewed legacy v1 migration/segregation evidence blocker id.",
    );
    assert.ok(
      !packet.sendDiscoveryHandoff?.blockerIds?.includes(
        "legacy-v1-send-history-migration-not-scoped",
      ),
      "Send packet must not keep the legacy v1 blocker once fresh-v2-only claim scope is recorded.",
    );
    assert.ok(
      packet.remainingBlockers.includes("send-memo-indexer-body-hash-handoff-not-deployed") &&
        packet.remainingBlockers.includes(
          "legacy-v1-send-history-reviewed-migration-or-segregation-evidence-missing",
        ) &&
        !packet.remainingBlockers.includes("legacy-v1-send-history-migration-not-scoped"),
      "Send packet remainingBlockers must include deployed discovery and reviewed legacy-v1 evidence blocker ids.",
    );
    assert.equal(packet.legacyHistoryScope?.freshV2OnlyClaimScoped, true);
    assert.equal(packet.legacyHistoryScope?.legacyV1EligibleForProductionPrivacyClaims, false);
    assert.equal(packet.legacyHistoryScope?.localMigrationToolingCovered, true);
    assert.equal(packet.legacyHistoryScope?.migrated, false);
    assert.equal(packet.legacyHistoryScope?.reviewedMigrationOrSegregationEvidence, false);
    assert.ok(packet.verificationCommands.includes("npm run actions:memo-encryption-check"));
    assert.ok(
      packet.verificationCommands.includes("npm run actions:legacy-v1-send-memo-migration-check"),
      "Send packet must name the legacy v1 Send migration guard.",
    );
    assert.ok(packet.verificationCommands.includes("npm run send:discovery-indexer-handoff-check"));
    assert.ok(
      packet.verificationCommands.includes("npm run private-pool-v2:send-circuit-check"),
    );
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

  if (packet.action === "unshield") {
    assert.equal(packet.currentReleaseModel, "operator-keypair-public-exit");
    assert.equal(packet.custodyBoundary?.productionCustodyReady, false);
    assert.equal(packet.custodyBoundary?.programOwnedVaultReady, false);
    assert.equal(packet.custodyBoundary?.sourceOnlyVaultAuthorityPreflightReady, true);
    assert.equal(packet.custodyBoundary?.sourceOnlyVaultAssetRegistryReady, true);
    assert.equal(packet.custodyBoundary?.sourceOnlyVaultTokenAccountPreflightReady, true);
    assert.equal(packet.custodyBoundary?.sourceOnlyRootPreflightReady, true);
    assert.equal(packet.custodyBoundary?.sourceOnlyVerifierKeyPreflightReady, true);
    assert.equal(packet.custodyBoundary?.onchainUnshieldInstructionReady, false);
    assert.equal(packet.custodyBoundary?.tagUnshieldVaultAssetRegistryReleaseEnabled, false);
    assert.equal(
      packet.custodyBoundary?.guardCommand,
      "npm run private-pool-v2:onchain-unshield-custody-check",
    );
    for (const blocker of [
      "program-owned-vault-pda-not-deployed",
      "tag-unshield-reserved-fail-closed",
      "tag-unshield-token-cpi-release-not-wired",
    ]) {
      assert.ok(
        packet.custodyBoundary?.blockerIds?.includes(blocker),
        `Unshield packet custody boundary missing blocker id: ${blocker}`,
      );
      assert.ok(
        packet.remainingBlockers.includes(blocker),
        `Unshield packet remainingBlockers missing custody blocker id: ${blocker}`,
      );
    }
    assert.ok(
      packet.claimBoundary.safeClaim.includes("operator-keypair public exit"),
      "Unshield packet must name the current operator-keypair public-exit release model.",
    );
    assert.ok(
      packet.claimBoundary.safeClaim.includes(
        "preflights root, root-record, verifier-key, nullifier, vault-authority, vault-asset registry, and token-account shape",
      ),
      "Unshield packet must name the source-only TAG_UNSHIELD preflight boundary.",
    );
    assert.ok(
      packet.claimBoundary.safeClaim.includes("fails closed before proof verification, token CPI, custody transfer, or fund release"),
      "Unshield packet must name the fail-closed release boundary.",
    );
    assert.ok(
      packet.claimBoundary.safeClaim.includes(
        "program-owned vault + on-chain TAG_UNSHIELD proof-verified release",
      ),
      "Unshield packet must name the future custody/proof release gate.",
    );
    assert.ok(
      packet.verificationCommands.includes(
        "npm run private-pool-v2:onchain-unshield-custody-check",
      ),
      "Unshield packet must include the on-chain custody guard command.",
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
  if (packet.currentReleaseModel) {
    console.log(`- currentReleaseModel: ${packet.currentReleaseModel}`);
  }
  console.log(`- artifact: ${packet.artifact}`);
  console.log(`- verifies with: ${packet.verificationCommands.join(", ")}`);
  console.log(`- remaining blockers: ${packet.remainingBlockers.join(", ")}`);
}
