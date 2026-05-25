import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const noirFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter((path) => path.startsWith("zk/noir/") && path.endsWith("/src/main.nr"));
const privateCoreHarnessFiles = execFileSync("git", ["ls-files"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (path) =>
      path.startsWith("scripts/check-vanta-private-core-") && path.endsWith(".mjs"),
  );

const forbiddenPatterns = [
  {
    pattern: /assert\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*==\s*\1\s*\)/u,
    message: "self-equality assert does not constrain the witness",
  },
  {
    pattern: /assert\(\s*[A-Za-z_][A-Za-z0-9_]*\s*==\s*sender_secret_key_hi\s*\+\s*sender_secret_key_lo\s*\)/u,
    message: "sender secret liveness must not be a restated witness sum",
  },
  {
    pattern: /sender_secret_key_hi\s*\+\s*sender_secret_key_lo\s*!=\s*0/u,
    message: "sender secret liveness must be a proof-owner key relation, not a nonzero witness sum",
  },
  {
    pattern: /owner_auth_placeholder/u,
    message: "owner auth placeholder must not be reintroduced",
  },
  {
    pattern: /owner_secret_key_hi\s*\+\s*owner_secret_key_lo\s*!=\s*0/u,
    message: "owner secret liveness must be a key relation, not a nonzero witness sum",
  },
  {
    pattern: /assert\(\s*owner_public_key_lo\s*==\s*owner_public_key_lo\s*\)/u,
    message: "owner public key self-equality does not constrain the witness",
  },
  {
    pattern: /input_asset_id_hi\s*\+\s*input_asset_id_lo\s*!=\s*output_asset_id_hi\s*\+\s*output_asset_id_lo/u,
    message: "asset inequality must compare limbs, not additive limb sums",
  },
  {
    pattern: /computed_(?:send|swap)_context_tag\s*==\s*(?:send|swap)_context_tag_hi\s*\+\s*(?:send|swap)_context_tag_lo/u,
    message: "context-tag splits must use zero-high-limb canonical encoding, not additive limb sums",
  },
  {
    pattern: /membership_path_hi\s*\[[^\]]+\]\s*\+\s*membership_path_lo\s*\[[^\]]+\]/u,
    message: "hi/lo membership path addition collapses distinct witnesses",
  },
  {
    pattern: /TODO:\s*replace with Poseidon/iu,
    message: "placeholder hash TODO is still present",
  },
  {
    pattern: /hash_merkle_node\s*\(\s*left:\s*Field\s*,\s*right:\s*Field\s*,\s*is_current_right/u,
    message: "Merkle node hash must not include the direction bit",
  },
  {
    pattern: /hash_3\s*\(\s*\[\s*previous_root\s*,\s*output_commitment\s*,\s*leaf_index\s*\]\s*\)/u,
    message: "successor append root must be path-derived, not a hash_3 shortcut",
  },
  {
    pattern: /send_amount_lo\s*\+\s*change_amount_lo/u,
    message: "Private Core Send input amount must use carry-aware limb reconstruction",
  },
  {
    pattern: /send_amount_hi\s*\+\s*change_amount_hi/u,
    message: "Private Core Send input amount must use carry-aware limb reconstruction",
  },
  {
    pattern: /fn\s+hash_note[^{]*\{[^}]*\bversion\s*\+\s*asset_id/isu,
    message: "note hash must not be additive placeholder arithmetic",
  },
];

const failures = [];
const depth3Open = [];

for (const file of noirFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");

  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(source)) {
      failures.push(`${file}: ${message}`);
    }
  }

  if (source.includes("global MERKLE_DEPTH: u32 = 3;")) {
    depth3Open.push(file);
  }

  if (file.startsWith("zk/noir/vanta_private_core_single_note_")) {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\b(?:send_|change_|input_|output_)?amount_(?:lo|hi)\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: Private Core amount limbs in main ABI must be u64, not raw Field`);
    }
  }

  if (file === "zk/noir/canonical_note_membership/src/main.nr") {
    const mainStart = source.indexOf("pub fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount_(?:lo|hi)\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: canonical note amount limbs in main ABI must be u64, not raw Field`);
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_shield_entry/src/main.nr") {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: shield amount in main ABI must be u128, not raw Field`);
    }
    for (const requiredPhrase of [
      "fn compute_output_commitment",
      "output_blinding: Field",
      "output_derivation_tag: Field",
      "let computed_output_commitment = compute_output_commitment",
      "assert(computed_output_commitment == output_commitment)",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: shield output_commitment must be bound to an output note preimage (${requiredPhrase})`);
      }
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_claim_entry/src/main.nr") {
    const mainStart = source.indexOf("fn main(");
    const mainEnd = mainStart === -1 ? -1 : source.indexOf(") {", mainStart);
    const mainSignature = mainStart === -1 || mainEnd === -1 ? "" : source.slice(mainStart, mainEnd);
    if (/\bamount\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: claim amount in main ABI must be u128, not raw Field`);
    }
    if (/\brelayer_fee\s*:\s*Field\b/u.test(mainSignature)) {
      failures.push(`${file}: claim relayer fee in main ABI must be u128, not raw Field`);
    }
    if (!/\bnet_payout\s*:\s*u128\b/u.test(mainSignature)) {
      failures.push(`${file}: claim net_payout must be a u128 witness input`);
    }
    if (!source.includes("assert(relayer_fee <= amount)")) {
      failures.push(`${file}: claim relayer fee must be constrained to amount`);
    }
    if (!source.includes("assert(amount as Field == net_payout as Field + relayer_fee as Field)")) {
      failures.push(`${file}: claim net_payout must conserve amount after relayer fee`);
    }
    if (
      !/fn\s+bind_claim_public_inputs[\s\S]*net_payout:\s*u128[\s\S]*let\s+claim_terms\s*=\s*bn254::hash_5\s*\(\[[\s\S]*relayer_fee\s+as\s+Field[\s\S]*net_payout\s+as\s+Field/u.test(
        source,
      )
    ) {
      failures.push(`${file}: claim public-input hash must bind relayer_fee and net_payout`);
    }
    for (const requiredPhrase of [
      "fn compute_owner_commitment",
      "fn compute_input_commitment",
      "input_blinding: Field",
      "input_derivation_tag: Field",
      "assert(computed_owner_commitment == owner_commitment)",
      "assert(computed_input_commitment == input_commitment)",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: Claim owner/input commitment must be bound to owner and input preimages (${requiredPhrase})`);
      }
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_send_entry/src/main.nr") {
    if (!/\brelayer_fee\s*:\s*u128\b/u.test(source)) {
      failures.push(`${file}: Send relayer_fee must be a u128 witness input`);
    }
    if (!source.includes("assert(relayer_fee <= input_amount)")) {
      failures.push(`${file}: Send relayer fee must be constrained to input amount`);
    }
    if (!source.includes("recipient_amount as Field + change_amount as Field + relayer_fee as Field")) {
      failures.push(`${file}: Send amount conservation must include relayer_fee`);
    }
    if (
      !/fn\s+compute_send_economics_commitment[\s\S]*relayer_fee:\s*u128[\s\S]*bn254::hash_5\s*\(\[[\s\S]*relayer_fee\s+as\s+Field/u.test(
        source,
      )
    ) {
      failures.push(`${file}: Send economics commitment must bind relayer_fee`);
    }
    if (
      !/fn\s+bind_send_public_inputs[\s\S]*relayer_fee:\s*u128[\s\S]*let\s+economics_terms\s*=\s*bn254::hash_3\s*\(\[[\s\S]*economics_commitment[\s\S]*relayer_fee\s+as\s+Field/u.test(
        source,
      )
    ) {
      failures.push(`${file}: Send public-input hash must bind relayer_fee under the single-hash ABI`);
    }
    if (!/\bvalid_until_slot\s*:\s*Field\b/u.test(source)) {
      failures.push(`${file}: Send valid_until_slot must be a Field witness/public-hash component`);
    }
    if (
      !/fn\s+bind_send_public_inputs[\s\S]*valid_until_slot:\s*Field[\s\S]*let\s+economics_terms\s*=\s*bn254::hash_3\s*\(\[[\s\S]*economics_commitment[\s\S]*relayer_fee\s+as\s+Field[\s\S]*valid_until_slot/u.test(
        source,
      )
    ) {
      failures.push(`${file}: Send public-input hash must bind valid_until_slot with economics freshness terms`);
    }
    for (const requiredPhrase of [
      "fn compute_owner_commitment",
      "fn compute_input_commitment",
      "fn compute_output_commitment",
      "input_blinding: Field",
      "input_derivation_tag: Field",
      "recipient_owner_commitment: Field",
      "recipient_output_blinding: Field",
      "recipient_output_derivation_tag: Field",
      "change_output_blinding: Field",
      "change_output_derivation_tag: Field",
      "assert(computed_owner_commitment == owner_commitment)",
      "assert(computed_input_commitment == input_commitment)",
      "let computed_recipient_output_commitment = compute_output_commitment",
      "let computed_change_output_commitment = compute_output_commitment",
      "assert(computed_recipient_output_commitment == recipient_output_commitment)",
      "assert(computed_change_output_commitment == change_output_commitment)",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: Send owner/input/output commitments must be bound to their note preimages (${requiredPhrase})`);
      }
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_swap_to_shielded_entry/src/main.nr") {
    if (!/\bvalid_until_slot\s*:\s*Field\b/u.test(source)) {
      failures.push(`${file}: Swap-to-shielded valid_until_slot must be a Field witness/public-hash component`);
    }
    if (
      !/fn\s+bind_swap_public_inputs[\s\S]*valid_until_slot:\s*Field[\s\S]*let\s+output_transition\s*=\s*bn254::hash_2\s*\(\[[\s\S]*output_leaf_index[\s\S]*output_root[\s\S]*bn254::hash_12\s*\(\[[\s\S]*output_transition[\s\S]*swap_context_tag[\s\S]*valid_until_slot/u.test(
        source,
      )
    ) {
      failures.push(`${file}: Swap-to-shielded public-input hash must bind valid_until_slot under the single-hash ABI`);
    }
    if (
      !/fn\s+compute_swap_economics_commitment[\s\S]*min_output_amount:\s*u128[\s\S]*slippage_bps:\s*u128[\s\S]*economics_blinding:\s*Field[\s\S]*let\s+asset_terms\s*=\s*bn254::hash_2[\s\S]*let\s+amount_terms\s*=\s*bn254::hash_4[\s\S]*input_amount\s+as\s+Field[\s\S]*output_amount\s+as\s+Field[\s\S]*min_output_amount\s+as\s+Field[\s\S]*slippage_bps\s+as\s+Field[\s\S]*bn254::hash_3\s*\(\[[\s\S]*asset_terms[\s\S]*amount_terms[\s\S]*economics_blinding/u.test(
        source,
      )
    ) {
      failures.push(`${file}: Swap-to-shielded economics commitment must bind input/output assets, output amount, minimum output, slippage, and blinding`);
    }
    if (!source.includes("assert(output_amount >= min_output_amount)")) {
      failures.push(`${file}: Swap-to-shielded circuit must constrain output_amount >= min_output_amount`);
    }
    if (!source.includes("assert(computed_economics_commitment == economics_commitment)")) {
      failures.push(`${file}: Swap-to-shielded circuit must assert the computed economics commitment`);
    }
    for (const requiredPhrase of [
      "fn compute_owner_commitment",
      "fn compute_input_commitment",
      "fn compute_swap_economics_commitment",
      "fn compute_output_commitment",
      "input_asset_id_commitment: Field",
      "input_amount: u128",
      "input_blinding: Field",
      "input_derivation_tag: Field",
      "economics_blinding: Field",
      "output_asset_id_commitment: Field",
      "output_amount: u128",
      "min_output_amount: u128",
      "slippage_bps: u128",
      "output_blinding: Field",
      "output_derivation_tag: Field",
      "assert(computed_owner_commitment == owner_commitment)",
      "assert(computed_input_commitment == input_commitment)",
      "let computed_output_commitment = compute_output_commitment",
      "assert(computed_output_commitment == output_commitment)",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: Swap-to-shielded owner/input/output commitments must be bound to their note preimages (${requiredPhrase})`);
      }
    }
  }

  if (file === "zk/noir/vanta_private_pool_v2_actual_private_spend_entry/src/main.nr") {
    for (const requiredPhrase of [
      "fn compute_input_commitment",
      "input_blinding: Field",
      "input_derivation_tag: Field",
      "assert(computed_input_commitment == input_commitment)",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: actual-private-spend input commitment must be bound to the note preimage (${requiredPhrase})`);
      }
    }
  }

  if (
    file === "zk/noir/vanta_private_core_single_note_send/src/main.nr" ||
    file === "zk/noir/vanta_private_core_single_note_swap/src/main.nr"
  ) {
    for (const requiredPhrase of [
      "fn derive_proving_owner_key",
      "sender_proving_owner_key_hi: Field",
      "sender_proving_owner_key_lo: Field",
      "let computed_sender_proving_owner_key = derive_proving_owner_key",
      "assert(sender_proving_owner_key_hi == 0)",
      "assert(computed_sender_proving_owner_key == sender_proving_owner_key_lo)",
      "derive_nullifier(",
      "sender_proving_owner_key_hi,",
      "sender_proving_owner_key_lo,",
    ]) {
      if (!source.includes(requiredPhrase)) {
        failures.push(`${file}: Private Core Send/Swap must bind sender_secret_key to distinct Poseidon proof-owner fields (${requiredPhrase})`);
      }
    }
  }

  if (file === "zk/noir/vanta_private_core_single_note_unshield/src/main.nr") {
    const nullifierStart = source.indexOf("fn derive_nullifier(");
    const nextFunctionStart =
      nullifierStart === -1 ? -1 : source.indexOf("\nfn ", nullifierStart + 1);
    const nullifierSource =
      nullifierStart === -1
        ? ""
        : source.slice(
            nullifierStart,
            nextFunctionStart === -1 ? source.length : nextFunctionStart,
          );

    if (nullifierSource === "") {
      failures.push(`${file}: Private Core Unshield must define derive_nullifier`);
    } else {
      if (/\bstate_root\b|\bmerkle_leaf\b/u.test(nullifierSource)) {
        failures.push(
          `${file}: Private Core Unshield nullifier preimage must not bind state_root or merkle_leaf`,
        );
      }
      if (!/bn254::hash_6\s*\(/u.test(nullifierSource)) {
        failures.push(
          `${file}: Private Core Unshield nullifier must hash exactly owner key, note secret, and note nonce limbs`,
        );
      }
    }
  }

  const publicInputs = [
    ...source.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*pub\s+Field\b/gu),
  ].map((match) => match[1]);

  for (const inputName of publicInputs) {
    const occurrences = source.match(new RegExp(`\\b${inputName}\\b`, "gu"))?.length ?? 0;
    if (occurrences < 2) {
      failures.push(`${file}: public input ${inputName} appears only in the ABI`);
    }
  }
}

for (const file of privateCoreHarnessFiles) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  if (/circuitMerkleDepth:\s*3\b/u.test(source)) {
    failures.push(`${file}: Private Core harness must not request stale circuitMerkleDepth 3`);
  }
}

if (failures.length > 0) {
  console.error("Vanta circuit soundness lint: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (depth3Open.length > 0) {
  console.error("Vanta circuit soundness lint: FAIL");
  console.error("Active proving lanes must use MERKLE_DEPTH = 20 before depth migration is closed.");
  for (const file of depth3Open) {
    console.error(`- ${file}: still uses MERKLE_DEPTH = 3`);
  }
  process.exit(1);
}

console.log("Vanta circuit soundness lint: PASS");
console.log(
  JSON.stringify(
    {
      checkedNoirFiles: noirFiles.length,
      depth3OpenCount: depth3Open.length,
      depth3Open,
      depth20MigrationStatus: depth3Open.length > 0 ? "open" : "complete",
    },
    null,
    2,
  ),
);
