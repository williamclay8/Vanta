import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { poseidon2, poseidon3, poseidon4, poseidon5, poseidon6, poseidon8, poseidon11 } from "poseidon-lite";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-pool-v2-hash-alignment-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "protocolAdapter.ts",
  "privatePoolV2Types.ts",
  "privatePoolV2ProofRequests.ts",
  "privatePoolV2ShieldCircuitFixture.ts",
  "privatePoolV2SendCircuitFixture.ts",
  "privatePoolV2SwapToShieldedCircuitFixture.ts",
  "privatePoolV2ClaimCircuitFixture.ts",
  "privatePoolV2ActualPrivateSpendCircuitFixture.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src/privacy", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8").replace(
    /from "\.\/([A-Za-z0-9]+)"/g,
    'from "./$1.js"',
  );
  writeFileSync(filePath, source);
}

function parsePublicInputs(inputs) {
  return inputs.map((input) => {
    const separator = input.indexOf(":");
    assert(separator > 0, `Expected labeled public input, received ${input}.`);
    return [input.slice(0, separator), input.slice(separator + 1)];
  });
}

function toMap(entries) {
  return new Map(entries);
}

function assertOrder(entries, expectedLabels, lane) {
  const labels = entries.map(([label]) => label);
  assert(
    JSON.stringify(labels) === JSON.stringify(expectedLabels),
    `Expected ${lane} public input order ${expectedLabels.join(", ")}, received ${labels.join(", ")}.`,
  );
}

function assertValue(publicInputMap, label, expected, lane) {
  const actual = publicInputMap.get(label);
  assert(
    actual === expected.toString(10),
    `Expected ${lane} ${label} to equal ${expected.toString(10)}, received ${actual}.`,
  );
}

try {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

	  const {
	    computeVantaPrivatePoolV2UnshieldPublicInputHash,
	    createVantaPrivatePoolV2UnshieldProofRequest,
	  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ProofRequests.js")).href);
	  const {
	    computeVantaPrivatePoolV2ShieldPublicInputHash,
	    createVantaPrivatePoolV2ShieldCircuitFixture,
	  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ShieldCircuitFixture.js")).href);
  const {
    computeVantaPrivatePoolV2ClaimPublicInputHash,
    createVantaPrivatePoolV2ClaimCircuitFixture,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2ClaimCircuitFixture.js")).href);
  const {
    computeVantaPrivatePoolV2SendPublicInputHash,
    createVantaPrivatePoolV2SendCircuitFixture,
  } = await import(pathToFileURL(join(tempJsDir, "privatePoolV2SendCircuitFixture.js")).href);
  const {
    computeVantaPrivatePoolV2SwapToShieldedPublicInputHash,
    createVantaPrivatePoolV2SwapToShieldedCircuitFixture,
  } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2SwapToShieldedCircuitFixture.js")).href
  );
  const {
    computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash,
    createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture,
  } = await import(
    pathToFileURL(join(tempJsDir, "privatePoolV2ActualPrivateSpendCircuitFixture.js")).href
  );

  const shield = createVantaPrivatePoolV2ShieldCircuitFixture();
  const shieldEntries = parsePublicInputs(shield.proofRequest.publicInputs);
  const shieldMap = toMap(shieldEntries);
  const shieldWitness = shield.witness;

  assertOrder(
    shieldEntries,
    [
      "vanta-private-pool-v2-shield-proof-request-0.1",
      "economics-commitment",
      "owner-commitment",
      "route-commitment",
      "tree-id",
      "leaf-index",
      "output-commitment",
      "previous-root",
      "output-root",
    ],
    "shield",
  );
  assertValue(shieldMap, "economics-commitment", shieldWitness.economics_commitment, "shield");
  assertValue(shieldMap, "owner-commitment", shieldWitness.owner_commitment, "shield");
  assertValue(shieldMap, "route-commitment", shieldWitness.route_commitment, "shield");
  assertValue(shieldMap, "tree-id", shieldWitness.tree_id, "shield");
  assertValue(shieldMap, "leaf-index", shieldWitness.leaf_index, "shield");
  assertValue(shieldMap, "output-commitment", shieldWitness.output_commitment, "shield");
  assertValue(shieldMap, "previous-root", shieldWitness.previous_root, "shield");
  assertValue(shieldMap, "output-root", shieldWitness.output_root, "shield");

  const rootTransition = poseidon2([shieldWitness.previous_root, shieldWitness.output_root]);
  assert(rootTransition > 0n, "Expected shield root transition to be derived.");
  assert(
    poseidon5([
      shieldWitness.source_mint,
      shieldWitness.target_mint,
      shieldWitness.target_asset_id,
      shieldWitness.amount,
      shieldWitness.economics_blinding,
    ]) === shieldWitness.economics_commitment,
    "Expected shield economics commitment to bind private raw economics and blinding.",
  );
  assert(
    poseidon8([
      shieldWitness.request_version,
      shieldWitness.economics_commitment,
      shieldWitness.owner_commitment,
      shieldWitness.route_commitment,
      shieldWitness.tree_id,
      shieldWitness.leaf_index,
      shieldWitness.output_commitment,
      rootTransition,
    ]) === shield.shieldPublicInputHash,
    "Expected shield public-input hash to bind economics commitment instead of raw terms.",
  );
  for (const rawShieldLabel of ["source-mint", "target-mint", "target-asset", "amount"]) {
    assert(!shieldMap.has(rawShieldLabel), `Shield public inputs must not expose ${rawShieldLabel}.`);
  }
  assert(
    computeVantaPrivatePoolV2ShieldPublicInputHash(shieldWitness) ===
      shield.shieldPublicInputHash,
    "Expected shield fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(shield.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`shield-public-input-hash:${shield.shieldPublicInputHash.toString(10)}`]),
    "Expected shield proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 shield public-input hash alignment: PASS");

  const claim = createVantaPrivatePoolV2ClaimCircuitFixture();
  const claimEntries = parsePublicInputs(claim.proofRequest.publicInputs);
  const claimMap = toMap(claimEntries);
  const claimWitness = claim.witness;

  assertOrder(
    claimEntries,
    [
      "vanta-private-pool-v2-claim-proof-request-0.1",
      "asset",
      "amount",
      "owner-commitment",
      "tree-id",
      "leaf-index",
      "input-commitment",
      "input-root",
      "nullifier",
      "destination",
      "relayer",
      "relayer-fee",
      "quote-expires-at-slot",
    ],
    "claim",
  );
  assertValue(claimMap, "asset", claimWitness.asset_id, "claim");
  assertValue(claimMap, "amount", claimWitness.amount, "claim");
  assertValue(claimMap, "owner-commitment", claimWitness.owner_commitment, "claim");
  assertValue(claimMap, "tree-id", claimWitness.tree_id, "claim");
  assertValue(claimMap, "leaf-index", claimWitness.leaf_index, "claim");
  assertValue(claimMap, "input-commitment", claimWitness.input_commitment, "claim");
  assertValue(claimMap, "input-root", claimWitness.input_root, "claim");
  assertValue(claimMap, "nullifier", claimWitness.nullifier, "claim");
  assertValue(claimMap, "destination", claimWitness.destination, "claim");
  assertValue(claimMap, "relayer", claimWitness.relayer_id, "claim");
  assertValue(claimMap, "relayer-fee", claimWitness.relayer_fee, "claim");
  assertValue(claimMap, "quote-expires-at-slot", claimWitness.quote_expires_at_slot, "claim");

  const inputMembership = poseidon3([
    claimWitness.tree_id,
    claimWitness.leaf_index,
    claimWitness.input_root,
  ]);
  const claimTerms = poseidon4([
    claimWitness.destination,
    claimWitness.relayer_id,
    claimWitness.relayer_fee,
    claimWitness.quote_expires_at_slot,
  ]);
  assert(inputMembership > 0n, "Expected claim input membership to be derived.");
  assert(claimTerms > 0n, "Expected claim terms hash to be derived.");
  assert(
    computeVantaPrivatePoolV2ClaimPublicInputHash(claimWitness) === claim.claimPublicInputHash,
    "Expected claim fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(claim.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`claim-public-input-hash:${claim.claimPublicInputHash.toString(10)}`]),
    "Expected claim proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 claim public-input hash alignment: PASS");

  const send = createVantaPrivatePoolV2SendCircuitFixture();
  const sendEntries = parsePublicInputs(send.proofRequest.publicInputs);
  const sendMap = toMap(sendEntries);
  const sendWitness = send.witness;

  assertOrder(
    sendEntries,
    [
      "vanta-private-pool-v2-send-proof-request-0.1",
      "input-root",
      "input-commitment",
      "nullifier",
      "recipient-output-commitment",
      "recipient-leaf-index",
      "recipient-output-root",
      "change-output-commitment",
      "change-leaf-index",
      "change-output-root",
      "asset-id-commitment",
      "economics-commitment",
      "owner-commitment",
      "send-context-tag",
    ],
    "send",
  );
  assertValue(sendMap, "input-root", sendWitness.input_root, "send");
  assertValue(sendMap, "input-commitment", sendWitness.input_commitment, "send");
  assertValue(sendMap, "nullifier", sendWitness.nullifier, "send");
  assertValue(sendMap, "recipient-output-commitment", sendWitness.recipient_output_commitment, "send");
  assertValue(sendMap, "recipient-leaf-index", sendWitness.recipient_leaf_index, "send");
  assertValue(sendMap, "recipient-output-root", sendWitness.recipient_output_root, "send");
  assertValue(sendMap, "change-output-commitment", sendWitness.change_output_commitment, "send");
  assertValue(sendMap, "change-leaf-index", sendWitness.change_leaf_index, "send");
  assertValue(sendMap, "change-output-root", sendWitness.change_output_root, "send");
  assertValue(sendMap, "asset-id-commitment", sendWitness.asset_id_commitment, "send");
  assertValue(sendMap, "economics-commitment", sendWitness.economics_commitment, "send");
  assertValue(sendMap, "owner-commitment", sendWitness.owner_commitment, "send");
  assertValue(sendMap, "send-context-tag", sendWitness.send_context_tag, "send");

  const sendOutputTransition = poseidon4([
    sendWitness.recipient_leaf_index,
    sendWitness.recipient_output_root,
    sendWitness.change_leaf_index,
    sendWitness.change_output_root,
  ]);
  assert(sendOutputTransition > 0n, "Expected send output transition to be derived.");
  assert(
    computeVantaPrivatePoolV2SendPublicInputHash(sendWitness) === send.sendPublicInputHash,
    "Expected send fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(send.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`send-public-input-hash:${send.sendPublicInputHash.toString(10)}`]),
    "Expected send proof request to expose only the computed hash on the circuit-public lane.",
  );
	  console.log("private pool v2 send public-input hash alignment: PASS");

	  const unshieldArgs = {
	    economicsCommitment: "501",
	    exitTermsCommitment: "502",
	    inputCommitment: "503",
	    inputRoot: "504",
	    nullifierOrReplayCommitment: "505",
	    ownerCommitment: "506",
	    routeCommitment: "507",
	    settlementCommitment: "508",
	    unshieldContextTag: "509",
	  };
	  const unshield = {
	    proofRequest: createVantaPrivatePoolV2UnshieldProofRequest(unshieldArgs),
	    unshieldPublicInputHash: computeVantaPrivatePoolV2UnshieldPublicInputHash(unshieldArgs),
	  };
	  const unshieldEntries = parsePublicInputs(unshield.proofRequest.publicInputs);
	  const unshieldMap = toMap(unshieldEntries);

	  assertOrder(
	    unshieldEntries,
	    [
	      "vanta-private-pool-v2-unshield-proof-request-0.1",
	      "input-root",
	      "input-commitment",
	      "nullifier-or-replay-commitment",
	      "settlement-commitment",
	      "route-commitment",
	      "exit-terms-commitment",
	      "economics-commitment",
	      "owner-commitment",
	      "unshield-context-tag",
	    ],
	    "unshield",
	  );
	  for (const [label, value] of [
	    ["input-root", unshieldArgs.inputRoot],
	    ["input-commitment", unshieldArgs.inputCommitment],
	    ["nullifier-or-replay-commitment", unshieldArgs.nullifierOrReplayCommitment],
	    ["settlement-commitment", unshieldArgs.settlementCommitment],
	    ["route-commitment", unshieldArgs.routeCommitment],
	    ["exit-terms-commitment", unshieldArgs.exitTermsCommitment],
	    ["economics-commitment", unshieldArgs.economicsCommitment],
	    ["owner-commitment", unshieldArgs.ownerCommitment],
	    ["unshield-context-tag", unshieldArgs.unshieldContextTag],
	  ]) {
	    assertValue(unshieldMap, label, value, "unshield");
	  }
	  assert(
	    JSON.stringify(unshield.proofRequest.circuitPublicInputs) ===
	      JSON.stringify([`unshield-public-input-hash:${unshield.unshieldPublicInputHash}`]),
	    "Expected unshield proof request to expose only the computed hash on the circuit-public lane.",
	  );
	  console.log("private pool v2 unshield public-input hash alignment: PASS");

	  const swap = createVantaPrivatePoolV2SwapToShieldedCircuitFixture();
  const swapEntries = parsePublicInputs(swap.proofRequest.publicInputs);
  const swapMap = toMap(swapEntries);
  const swapWitness = swap.witness;

  assertOrder(
    swapEntries,
    [
      "vanta-private-pool-v2-swap-to-shielded-proof-request-0.1",
      "input-root",
      "input-commitment",
      "nullifier-or-replay-commitment",
      "settlement-commitment",
      "route-commitment",
      "economics-commitment",
      "output-commitment",
      "output-leaf-index",
      "output-root",
      "owner-commitment",
      "swap-context-tag",
    ],
    "swap-to-shielded",
  );
  assertValue(swapMap, "input-root", swapWitness.input_root, "swap-to-shielded");
  assertValue(swapMap, "input-commitment", swapWitness.input_commitment, "swap-to-shielded");
  assertValue(
    swapMap,
    "nullifier-or-replay-commitment",
    swapWitness.nullifier_or_replay_commitment,
    "swap-to-shielded",
  );
  assertValue(
    swapMap,
    "settlement-commitment",
    swapWitness.settlement_commitment,
    "swap-to-shielded",
  );
  assertValue(swapMap, "route-commitment", swapWitness.route_commitment, "swap-to-shielded");
  assertValue(
    swapMap,
    "economics-commitment",
    swapWitness.economics_commitment,
    "swap-to-shielded",
  );
  assertValue(swapMap, "output-commitment", swapWitness.output_commitment, "swap-to-shielded");
  assertValue(swapMap, "output-leaf-index", swapWitness.output_leaf_index, "swap-to-shielded");
  assertValue(swapMap, "output-root", swapWitness.output_root, "swap-to-shielded");
  assertValue(swapMap, "owner-commitment", swapWitness.owner_commitment, "swap-to-shielded");
  assertValue(swapMap, "swap-context-tag", swapWitness.swap_context_tag, "swap-to-shielded");

  const swapOutputRoot = poseidon3([
    swapWitness.input_root,
    swapWitness.output_commitment,
    swapWitness.output_leaf_index,
  ]);
  assert(swapOutputRoot === swapWitness.output_root, "Expected swap output root to be derived.");
  assert(
    computeVantaPrivatePoolV2SwapToShieldedPublicInputHash(swapWitness) ===
      swap.swapPublicInputHash,
    "Expected swap-to-shielded fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(swap.proofRequest.circuitPublicInputs) ===
      JSON.stringify([`swap-public-input-hash:${swap.swapPublicInputHash.toString(10)}`]),
    "Expected swap-to-shielded proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 swap-to-shielded public-input hash alignment: PASS");

  const actualPrivateSpend = createVantaPrivatePoolV2ActualPrivateSpendCircuitFixture();
  const actualPrivateSpendEntries = parsePublicInputs(actualPrivateSpend.proofRequest.publicInputs);
  const actualPrivateSpendMap = toMap(actualPrivateSpendEntries);
  const actualPrivateSpendWitness = actualPrivateSpend.witness;

  assertOrder(
    actualPrivateSpendEntries,
    [
      "vanta-private-pool-v2-actual-private-spend-proof-request-0.1",
      "pool-id",
      "asset-cohort",
      "accepted-root",
      "nullifier",
      "output-commitment-0",
      "output-commitment-1",
      "context-hash",
      "private-spend-public-input-hash",
    ],
    "actual-private-spend",
  );
  assertValue(actualPrivateSpendMap, "pool-id", actualPrivateSpendWitness.pool_id, "actual-private-spend");
  assertValue(
    actualPrivateSpendMap,
    "asset-cohort",
    actualPrivateSpendWitness.asset_cohort,
    "actual-private-spend",
  );
  assertValue(
    actualPrivateSpendMap,
    "accepted-root",
    actualPrivateSpendWitness.accepted_root,
    "actual-private-spend",
  );
  assertValue(actualPrivateSpendMap, "nullifier", actualPrivateSpendWitness.nullifier, "actual-private-spend");
  assertValue(
    actualPrivateSpendMap,
    "output-commitment-0",
    actualPrivateSpendWitness.output_commitment_0,
    "actual-private-spend",
  );
  assertValue(
    actualPrivateSpendMap,
    "output-commitment-1",
    actualPrivateSpendWitness.output_commitment_1,
    "actual-private-spend",
  );
  assertValue(
    actualPrivateSpendMap,
    "context-hash",
    actualPrivateSpendWitness.context_hash,
    "actual-private-spend",
  );
  assertValue(
    actualPrivateSpendMap,
    "private-spend-public-input-hash",
    actualPrivateSpend.privateSpendPublicInputHash,
    "actual-private-spend",
  );

  const actualPrivateSpendOutputHash = poseidon2([
    actualPrivateSpendWitness.output_commitment_0,
    actualPrivateSpendWitness.output_commitment_1,
  ]);
  const actualPrivateSpendMembershipBinding = poseidon6([
    actualPrivateSpendWitness.accepted_root,
    actualPrivateSpendWitness.input_commitment,
    actualPrivateSpendWitness.leaf_index,
    actualPrivateSpendWitness.membership_path_direction_bits[0],
    actualPrivateSpendWitness.membership_path_direction_bits[1],
    actualPrivateSpendWitness.membership_path_direction_bits[2],
  ]);
  const actualPrivateSpendPreimage = poseidon11([
    actualPrivateSpendWitness.request_version,
    actualPrivateSpendWitness.pool_id,
    actualPrivateSpendWitness.asset_cohort,
    actualPrivateSpendMembershipBinding,
    actualPrivateSpendWitness.nullifier,
    actualPrivateSpendOutputHash,
    actualPrivateSpendWitness.context_hash,
    actualPrivateSpendWitness.output_commitment_0,
    actualPrivateSpendWitness.output_commitment_1,
    actualPrivateSpendWitness.accepted_root,
    actualPrivateSpendWitness.leaf_index,
  ]);
  assert(
    actualPrivateSpendPreimage === actualPrivateSpend.privateSpendPublicInputHash,
    "Expected actual-private spend public input hash to be derivable from the Noir preimage.",
  );
  assert(
    computeVantaPrivatePoolV2ActualPrivateSpendPublicInputHash(actualPrivateSpendWitness) ===
      actualPrivateSpend.privateSpendPublicInputHash,
    "Expected actual-private spend fixture hash to match Noir public hash preimage.",
  );
  assert(
    JSON.stringify(actualPrivateSpend.proofRequest.circuitPublicInputs) ===
      JSON.stringify([
        `private-spend-public-input-hash:${actualPrivateSpend.privateSpendPublicInputHash.toString(10)}`,
      ]),
    "Expected actual-private spend proof request to expose only the computed hash on the circuit-public lane.",
  );
  console.log("private pool v2 actual-private spend public-input hash alignment: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
