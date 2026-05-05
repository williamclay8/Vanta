import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonMode = process.argv.includes("--json");

const requiredFiles = [
  {
    path: "src/privacy/privatePoolV2Types.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_CONTRACT_VERSION",
      "VantaPrivatePoolV2Asset",
      "VantaPrivatePoolV2Indexer",
      "VantaPrivatePoolV2Relayer",
      "VantaPrivatePoolV2Prover",
      "VantaPrivatePoolV2VerifierRegistry",
      "VantaPrivatePoolV2Protocol",
    ],
  },
	  {
	    path: "src/privacy/privatePoolV2CapabilityProfile.ts",
	    exports: [
	      "getVantaPrivatePoolV2CapabilityProfile",
	      "createVantaPrivatePoolV2PrivacyAdapter",
	    ],
	  },
  {
    path: "src/privacy/privatePoolV2Benchmark.ts",
    exports: ["getVantaPrivatePoolV2BenchmarkSnapshot"],
  },
  {
    path: "src/privacy/privatePoolV2MockRuntime.ts",
    exports: ["createVantaPrivatePoolV2MockRuntime"],
  },
  {
    path: "src/privacy/privatePoolV2RemoteServices.ts",
    exports: [
      "createVantaPrivatePoolV2RemoteIndexer",
      "createVantaPrivatePoolV2RemoteProver",
      "createVantaPrivatePoolV2RemoteRelayer",
      "createVantaPrivatePoolV2RemoteRuntime",
      "createVantaPrivatePoolV2RemoteVerifierRegistry",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalIndexer.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_INDEXER_SCHEME",
      "createVantaPrivatePoolV2LocalIndexer",
      "VantaPrivatePoolV2LocalIndexer",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalRelayer.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_RELAYER_SCHEME",
      "createVantaPrivatePoolV2LocalRelayer",
      "VantaPrivatePoolV2LocalRelayer",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalProver.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_PROVER_SCHEME",
      "createVantaPrivatePoolV2LocalProver",
      "VantaPrivatePoolV2LocalProver",
    ],
  },
  {
    path: "src/privacy/privatePoolV2LocalVerifierRegistry.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_LOCAL_VERIFIER_REGISTRY_SCHEME",
      "createVantaPrivatePoolV2LocalVerifierRegistry",
      "VantaPrivatePoolV2LocalVerifierRegistry",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ProofRequests.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SHIELD_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_CLAIM_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_SEND_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_PROOF_REQUEST_VERSION",
      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_ASSET_ID",
      "VANTA_PRIVATE_POOL_V2_HIDDEN_ECONOMICS_AMOUNT_BASE_UNITS",
      "createVantaPrivatePoolV2ShieldProofRequest",
      "createVantaPrivatePoolV2ClaimProofRequest",
      "createVantaPrivatePoolV2HiddenEconomicsProofRequest",
      "createVantaPrivatePoolV2SendProofRequest",
      "createVantaPrivatePoolV2SwapToShieldedProofRequest",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ShieldCapabilityAdapter.ts",
    exports: [
      "PrivatePoolV2ShieldCapabilityProofRequestArgs",
      "createPrivatePoolV2ShieldProofRequestFromCapability",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SettlementPolicy.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY_VERSION",
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY",
      "VantaPrivatePoolV2SettlementPolicy",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ClaimCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_CLAIM_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2ClaimCircuitFixture",
      "computeVantaPrivatePoolV2ClaimNullifier",
      "computeVantaPrivatePoolV2ClaimPublicInputHash",
      "serializeVantaPrivatePoolV2ClaimCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SendCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SEND_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2SendCircuitFixture",
      "computeVantaPrivatePoolV2SendAppendRoot",
      "computeVantaPrivatePoolV2SendNullifier",
      "computeVantaPrivatePoolV2SendPublicInputHash",
      "serializeVantaPrivatePoolV2SendCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2SwapToShieldedCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_SWAP_TO_SHIELDED_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2SwapToShieldedCircuitFixture",
      "computeVantaPrivatePoolV2SwapToShieldedAppendRoot",
      "computeVantaPrivatePoolV2SwapToShieldedNullifierOrReplayCommitment",
      "computeVantaPrivatePoolV2SwapToShieldedPublicInputHash",
      "serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ActualPrivateSpendCircuitFixture.ts",
    exports: [
      "VANTA_PRIVATE_POOL_V2_ACTUAL_PRIVATE_SPEND_CIRCUIT_FIXTURE_VERSION",
      "createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture",
      "computeVantaPrivatePoolV2ActualPrivateSpendNullifier",
      "computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash",
      "computeVantaPrivatePoolV2ActualPrivateSpendRoot",
      "serializeVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureToToml",
    ],
  },
];

const requiredTextFiles = [
  {
    path: "src/privacy/privatePoolV2SettlementPolicy.ts",
    markers: ["productionDurableStoreRequired"],
  },
  {
    path: "src/privacy/privatePoolV2CapabilityProfile.ts",
    markers: [
      "currentVerifiedPrivacyFlags",
      "targetPrivacyFlags",
      "privacyClaimAllowed: false",
      "productionPrivateReady: false",
      "requiredBlockingEvidence",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_shield_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_shield_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr",
    markers: [
      "bind_shield_public_inputs",
      "compute_append_root",
      "assert(computed_output_root == output_root)",
      "assert(computed_public_input_hash == shield_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_claim_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_claim_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr",
    markers: [
      "bind_claim_public_inputs",
      "compute_nullifier",
      "assert(computed_nullifier == nullifier)",
      "assert(computed_public_input_hash == claim_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_send_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_send_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr",
    markers: [
      "bind_send_public_inputs",
      "compute_nullifier",
      "compute_append_root",
      "assert(computed_nullifier == nullifier)",
      "assert(computed_recipient_output_root == recipient_output_root)",
      "assert(computed_change_output_root == change_output_root)",
      "assert(computed_public_input_hash == send_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_swap_to_shielded_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr",
    markers: [
      "bind_swap_public_inputs",
      "compute_nullifier",
      "compute_append_root",
      "assert(computed_nullifier_or_replay_commitment == nullifier_or_replay_commitment)",
      "assert(computed_output_root == output_root)",
      "assert(computed_public_input_hash == swap_public_input_hash)",
    ],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/Nargo.toml",
    markers: ["vanta_private_pool_v2_actual_private_spend_entry", "poseidon"],
  },
  {
    path: "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr",
    markers: [
      "bind_private_spend_public_inputs",
      "compute_root",
      "compute_nullifier",
      "assert(computed_root == accepted_root)",
      "assert(computed_nullifier == nullifier)",
      "assert(computed_public_input_hash == private_spend_public_input_hash)",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-circuit.mjs",
    markers: ["invalid-binding", "invalid-root", "fixture restore: PASS"],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-claim-circuit.mjs",
    markers: ["invalid-binding", "invalid-nullifier", "fixture restore: PASS"],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-send-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-nullifier",
      "invalid-output-root",
      "fixture restore: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-swap-to-shielded-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-nullifier",
      "invalid-output-root",
      "fixture restore: PASS",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-send-fixture.mjs",
    markers: [
      "privatePoolV2SendCircuitFixture.ts",
      "createVantaPrivatePoolV2SendCircuitFixture",
      "serializeVantaPrivatePoolV2SendCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-claim-fixture.mjs",
    markers: [
      "privatePoolV2ClaimCircuitFixture.ts",
      "createVantaPrivatePoolV2ClaimCircuitFixture",
      "serializeVantaPrivatePoolV2ClaimCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-swap-to-shielded-fixture.mjs",
    markers: [
      "privatePoolV2SwapToShieldedCircuitFixture.ts",
      "createVantaPrivatePoolV2SwapToShieldedCircuitFixture",
      "serializeVantaPrivatePoolV2SwapToShieldedCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/write-vanta-private-pool-v2-actual-private-spend-fixture.mjs",
    markers: [
      "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
      "createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture",
      "serializeVantaPrivatePoolV2ActualPrivateSpendCircuitFixtureToToml",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-local-runtime.mjs",
    markers: [
      "local indexer append: PASS",
      "local verifier shield commitment append: PASS",
      "local verifier shield receipt: PASS",
      "local verifier claim receipt: PASS",
      "local verifier nullifier replay rejection: PASS",
      "local verifier private-send nullifier and output append: PASS",
      "local verifier private-send atomic rejection: PASS",
      "local indexer nullifier replay rejection: PASS",
      "local claim proof verify: PASS",
      "local prover tamper rejection: PASS",
      "local relayer replay rejection: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-remote-services.mjs",
    markers: [
      "Vanta Private Pool v2 remote services check: PASS",
      "createVantaPrivatePoolV2RemoteRuntime",
      "https://indexer.example",
    ],
  },
  {
    path: "operator/private-pool-v2-service-network.mjs",
    markers: [
      "applyPrivateSendTransition",
      "/v1/private-sends",
      "isStatefulPrivateSendRequest",
      "private-send:${nullifier}",
      "recipientOutputCommitment",
      "changeOutputCommitment",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-service-network.mjs",
    markers: [
      "private-pool-v2 service-network private-send transition: PASS",
      "private-send:field:service-network-send-nullifier",
      "Expected rejected private-send transition not to append partial remote outputs.",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-proof-request.mjs",
    markers: [
      "shield proof request public inputs: PASS",
      "shield proof request positive amount guard: PASS",
      "shield proof request owner guard: PASS",
      "claim proof request public inputs: PASS",
      "claim proof request nullifier guard: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-swap-to-shielded-proof-request.mjs",
    markers: [
      "private-pool-v2 swap proof request public inputs: PASS",
      "private-pool-v2 swap proof request input-root guard: PASS",
      "private-pool-v2 swap proof request output guard: PASS",
      "swap-public-input-hash:field:swap-public-input-hash",
    ],
  },
  {
    path: "src/privacy/privatePoolV2ShieldCapabilityAdapter.ts",
    markers: [
      "capability.sourceAsset.mintAddress",
      "capability.targetShieldAsset.assetKey",
      "capability.targetShieldAsset.mintAddress",
      "createCapabilityRouteCommitment",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-shield-capability-adapter.mjs",
    markers: [
      "private-pool-v2 shield capability direct proof request: PASS",
      "private-pool-v2 shield capability routed proof request: PASS",
      "private-pool-v2 shield capability unsupported guard: PASS",
    ],
  },
  {
    path: "scripts/prove-vanta-private-pool-v2-circuit.mjs",
    markers: [
      "barretenberg-ultrahonk",
      "swap-to-shielded",
      "actual-private-spend",
      "vanta_private_pool_v2_swap_to_shielded_entry",
      "vanta_private_pool_v2_actual_private_spend_entry",
      "proof generation: PASS",
      "proof verification: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-actual-private-spend-circuit.mjs",
    markers: [
      "invalid-binding",
      "invalid-membership-root",
      "invalid-nullifier",
      "fixture restore: PASS",
    ],
  },
	  {
	    path: "scripts/print-vanta-private-pool-v2-status.mjs",
	    markers: [
	      "Private Pool V2 status",
	      "currentVerifiedPrivacyFlags",
	      "targetPrivacyFlags",
	      "privacyClaimAllowed",
	      "productionPrivateReady",
	      "requiredBlockingEvidence",
	      "nullifierReplayGuard",
      "productionGate",
      "productionBlockers",
      "protocolActionProofModes",
      "receiptCount",
      "settlementPolicy",
      "verifierRegistry",
      "private-pool-v2:swap-to-shielded-circuit-check",
      "private-pool-v2:swap-to-shielded-prove",
      "private-pool-v2:verify",
    ],
	  },
  {
    path: "operator/private-pool-v2-server.mjs",
    markers: [
      "VANTA_PRIVATE_POOL_V2_STORE_PATH",
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VANTA_PRIVATE_POOL_V2_RUNTIME_MODE",
      "remote-services",
      "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
      "VANTA_PRIVATE_POOL_V2_PROVER_URL",
      "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
      "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
      "settlementPolicy",
      "VANTA_PRIVATE_POOL_V2_SETTLEMENT_POLICY",
      "shieldRouteEvidence",
      "privatePoolV2SettlementPolicy.ts",
      "protocolActionProofModes",
      "productionReady",
      "durableStoreConfigured",
      "/state/private-pool-v2-status",
      "/state/private-pool-v2-receipts",
      "/private-pool-v2/proofs",
    ],
  },
  {
    path: "operator/private-pool-v2-store.mjs",
    markers: [
      "createPrivatePoolV2ReceiptStore",
      "load",
      "save",
      "snapshotStore",
      "stateVersion",
    ],
  },
  {
    path: ".env.example",
    markers: [
      "VANTA_PRIVATE_POOL_V2_OPERATOR_PORT",
      "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
      "VANTA_PRIVATE_POOL_V2_STORE_PATH",
      "VANTA_PRIVATE_POOL_V2_DATABASE_URL",
      "VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
      "VITE_VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-operator-http.mjs",
    markers: [
      "private-pool-v2 http status: PASS",
      "private-pool-v2 production database guard: PASS",
      "Expected operator status to be explicit about production readiness.",
      "Expected operator status to expose configured durable storage.",
      "Expected production durable-store settlement policy.",
      "private-pool-v2 http shield proof: PASS",
      "private-pool-v2 http claim replay rejection: PASS",
    ],
  },
  {
    path: "scripts/check-vanta-private-pool-v2-operator-restart.mjs",
    markers: [
      "private-pool-v2 restart committed transitions accepted: PASS",
      "private-pool-v2 restart receipts restored: PASS",
      "private-pool-v2 restart claim replay rejection: PASS",
      "private-pool-v2 restart protocol settlement replay guard backfill: PASS",
      "private-pool-v2 restart committed transition replay rejection: PASS",
    ],
  },
];

const requiredPackageScripts = [
  "private-pool-v2:contract-check",
  "private-pool-v2:benchmark-json",
  "private-pool-v2:local-indexer-check",
  "private-pool-v2:local-relayer-check",
  "private-pool-v2:local-prover-check",
  "private-pool-v2:local-verifier-check",
  "private-pool-v2:shield-proof-request-check",
  "private-pool-v2:send-proof-request-check",
  "private-pool-v2:swap-to-shielded-proof-request-check",
  "private-pool-v2:hidden-economics-request-check",
  "private-pool-v2:shield-capability-adapter-check",
  "private-pool-v2:shield-circuit-check",
  "private-pool-v2:send-circuit-check",
  "private-pool-v2:swap-to-shielded-circuit-check",
  "private-pool-v2:actual-private-spend-circuit-check",
  "private-pool-v2:local-runtime-check",
  "private-pool-v2:claim-proof-request-check",
  "private-pool-v2:verify",
  "private-pool-v2:claim-circuit-check",
  "private-pool-v2:shield-prove",
  "private-pool-v2:send-prove",
  "private-pool-v2:swap-to-shielded-prove",
  "private-pool-v2:actual-private-spend-prove",
  "private-pool-v2:claim-prove",
  "private-pool-v2:status",
  "private-pool-v2:status-json",
  "private-pool-v2:operator",
  "private-pool-v2:http-smoke",
  "private-pool-v2:restart-check",
  "private-pool-v2:service-network-check",
  "private-pool-v2:role-storage-check",
  "private-pool-v2:protocol-client-check",
  "private-pool-v2:postgres-store-check",
];

const failures = [];

for (const file of requiredFiles) {
  const absolutePath = resolve(repoRoot, file.path);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");

  for (const exportName of file.exports) {
    const exportPattern = new RegExp(
      `export\\s+(?:class|const|type|interface|function)\\s+${exportName}\\b`,
    );

    if (!exportPattern.test(source)) {
      failures.push(`Missing export ${exportName} in ${file.path}`);
    }
  }
}

for (const file of requiredTextFiles) {
  const absolutePath = resolve(repoRoot, file.path);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");

  for (const marker of file.markers) {
    if (!source.includes(marker)) {
      failures.push(`Missing marker ${marker} in ${file.path}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

for (const scriptName of requiredPackageScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    failures.push(`Missing package script ${scriptName}`);
  }
}

if (failures.length > 0) {
  const result = {
    benchmark: "vanta-private-pool-v2-contract-check",
    failures,
    ok: false,
    requiredFiles,
    requiredTextFiles,
    requiredPackageScripts,
  };

  if (jsonMode) {
    console.error(JSON.stringify(result, null, 2));
  } else {
    console.error("Private Pool V2 contract check: FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  process.exit(1);
}

const result = {
  benchmark: "vanta-private-pool-v2-contract-check",
  contractVersion: "vanta-private-pool-v2-contract-0.1",
  files: [...requiredFiles.map((file) => file.path), ...requiredTextFiles.map((file) => file.path)],
  ok: true,
  packageScripts: requiredPackageScripts,
  summary:
    "Private Pool V2 has the benchmark contract, capability profile, and snapshot surface needed to build the Vanta-owned Option B lane.",
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Private Pool V2 contract check: PASS");
  for (const file of [...requiredFiles, ...requiredTextFiles]) {
    console.log(`- ${file.path}`);
  }
}
