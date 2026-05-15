# Vanta Private Pool v2 Spend Program

Small native Rust Solana program for recording proof-unverified, operator-submitted Vanta actual-private spend metadata.

This is intentionally minimal:

- no Anchor
- only System Program CPIs to create deterministic nullifier marker and output record PDAs
- no token movement
- no secrets
- no deploy configuration
- no proof verification

It records the public transcript from an operator-accepted off-chain private spend packet: an accepted root, one nullifier marker PDA, one deterministic output record PDA, two output commitments, and a public input hash.
The program now fail-closes writes behind the operator authority captured during init. It also reserves a source-only program-owned root provenance record for future proof paths, but it still does not verify proofs or prove that the accepted root came from a correct program-owned Merkle transition.

## Instructions

Instruction data is byte-packed.

### `0` - init

Initializes the headers of four already-created, program-owned, writable accounts and binds the pool to those exact child accounts:

1. `pool_state`
2. `nullifier_set`
3. `output_queue`
4. `root_history`
5. `operator_authority` signer, read-only

The init instruction is exactly one byte:

```text
[0]
```

Init is one-time for zeroed accounts. Reinitialization is rejected instead of allowing a later signer to replace the operator authority or child account bindings.

Minimum account data sizes:

- `pool_state`: 184 bytes
- `nullifier_set`: `16 + 32 * slot_count` bytes
- `output_queue`: 16-byte output index header
- `root_history`: `16 + 32 * slot_count` bytes

### `2` - register root

Legacy source scaffold that registers an accepted root before the current tag `1` no-verifier spend path can anchor against it.

Register-root accounts:

1. `pool_state` read-only
2. `root_history` writable
3. `operator_authority` signer, read-only; must match the pubkey stored during init

Register-root instruction data is exactly 33 bytes:

```text
[2, acceptedRoot:32]
```

Behavior:

- verifies the root history account is writable and owned by this program
- verifies the stored operator authority signed the registration
- verifies the supplied `root_history` account matches the pubkey stored in `pool_state` during init
- rejects duplicate accepted roots
- rejects writes when the fixed-slot root history account is full

This legacy registration does not create a root provenance record. Future proof-carrying paths should use tag `4` so the reserved verifier/release preflights can require deterministic root-record provenance. Roots already registered through legacy tag `2` cannot be backfilled with tag `4` because duplicate accepted roots are rejected; moving those roots into the provenance lane requires a reviewed migration/reinitialization step.

### `4` - register provenanced root

Registers an accepted root and creates a program-owned root provenance record PDA.

Register-provenanced-root accounts:

1. `pool_state` read-only
2. `root_history` writable
3. `root_record` writable PDA derived from `["vanta2root", pool_state, acceptedRoot]`
4. `operator_authority` writable signer when root-record creation is needed; must match the pubkey stored during init and funds root-record creation when needed
5. `system_program` read-only

Register-provenanced-root instruction data is exactly 110 bytes:

```text
[4, acceptedRoot:32, previousRoot:32, transitionPublicInputHash:32, leafIndexBaseLeU64:8, leafCountLeU32:4, transitionKind:1]
```

Behavior:

- verifies the root history account is writable and owned by this program
- verifies the stored operator authority signed the registration
- verifies the supplied `root_history` account matches the pubkey stored in `pool_state` during init
- verifies the supplied root-record PDA matches `["vanta2root", pool_state, acceptedRoot]`
- verifies `previousRoot` is zero for the first provenanced root and otherwise equals the last accepted root already stored in `root_history`
- creates or verifies a program-owned root provenance record containing `pool_state`, `previousRoot`, `acceptedRoot`, `transitionPublicInputHash`, `leafIndexBase`, `leafCount`, `transitionKind`, and the root sequence
- accepts zero `previousRoot` only as a bootstrap sentinel for the first source-only provenance record, while still rejecting zero `acceptedRoot`, zero `transitionPublicInputHash`, zero `leafCount`, and zero `transitionKind`
- rejects duplicate accepted roots
- rejects writes when the fixed-slot root history account is full

This is provenance metadata only. It is not proof that the root transition is correct, not a program-owned Merkle tree, and not on-chain verifier evidence.

### `5` - register verifier key

Creates or idempotently verifies the source-only verifier-key registry PDA required by reserved tag `3` preflight.

Register-verifier-key accounts:

1. `pool_state` read-only, program-owned
2. `verifier_key` writable PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`
3. `operator_authority` writable signer when verifier-key record creation is needed; must match the pubkey stored during init and funds verifier-key record creation when needed
4. `system_program` read-only

Register-verifier-key instruction data is exactly 33 bytes:

```text
[5, verifierKeyHash:32]
```

Behavior:

- verifies the stored operator authority signed the registration
- rejects zero verifier-key hashes
- verifies the supplied verifier-key PDA matches `["vanta2vkey", pool_state, verifierKeyHash]`
- creates or verifies a program-owned verifier-key record containing `pool_state` and `verifierKeyHash`
- permits idempotent replay when the existing verifier-key record already matches the same pool and hash

This is a source-only verifier-key registry scaffold. It is not backend selection, not production verifying-key evidence, not a verifier adapter, not tag `3` proof acceptance, and not on-chain proof verification. Guard: `npm run zk:c01-verifier-key-registry-check`.

### `1` - spend

Spend accounts:

1. `pool_state` writable
2. `nullifier_set` read-only header account
3. `output_queue` writable
4. `root_history` read-only
5. `nullifier_marker` writable PDA derived from `["vanta2nul", pool_state, nullifier]`
6. `output_record` writable PDA derived from `["vanta2out", pool_state, publicInputHash]`
7. `operator_authority` signer, writable; must match the pubkey stored during init and funds marker/output-record creation
8. `system_program` read-only

Spend instruction data is exactly 161 bytes:

```text
[1, nullifier:32, output0:32, output1:32, acceptedRoot:32, publicInputHash:32]
```

Behavior:

- verifies pool and output accounts are writable and owned by this program
- verifies the nullifier header and root history accounts are read-only and owned by this program
- verifies the stored operator authority signed the spend
- verifies the supplied `nullifier_set`, `output_queue`, and `root_history` match the pubkeys stored in `pool_state` during init
- verifies account headers were initialized
- rejects spends whose accepted root has not been registered in `root_history`
- preflights the deterministic nullifier marker and output record PDAs before creating either account
- creates or verifies the deterministic nullifier marker PDA and rejects duplicate nullifiers
- creates the deterministic output record PDA and records the output index, `pool_state`, `output0`, `output1`, and `publicInputHash`
- increments the output index header count
- increments the pool spend count
- records the latest public input hash in `pool_state`

### `3` - proof-carrying spend (reserved, fail closed)

Reserves the future proof-carrying verifier ABI. It is intentionally not accepted yet.

Instruction data is exactly 449 bytes:

```text
[3, nullifier:32, output0:32, output1:32, acceptedRoot:32, publicInputHash:32, verifierKeyHash:32, groth16Proof:256]
```

Behavior today:

- checks the reserved payload length and rejects all-zero public transcript / verifier placeholders
- requires eight preflight accounts:
  1. `pool_state` (read-only, program-owned)
  2. `nullifier_set` (read-only, program-owned, bound in `pool_state`)
  3. `output_queue` (read-only, program-owned, bound in `pool_state`)
  4. `root_history` (read-only, program-owned, bound in `pool_state`)
  5. `root_record` (read-only program-owned PDA derived from `["vanta2root", pool_state, acceptedRoot]`)
  6. `nullifier_marker` (writable PDA derived from `["vanta2nul", pool_state, nullifier]`)
  7. `output_record` (writable PDA derived from `["vanta2out", pool_state, publicInputHash]`)
  8. `verifier_key` (read-only program-owned PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`)
- validates account headers, registered `acceptedRoot`, root-record provenance, output-index/spend-count consistency, full output-counter rejection with custom error `3`, unused nullifier marker, unused output record, and the verifier-key hash account
- the verifier-key hash account can now be created or idempotently verified by tag `5`, but that registry record is source-only metadata and not production verifying-key evidence
- returns custom error `14` after preflight and before proof verification, nullifier/output mutation, account creation, or proof-enforced spend acceptance
- must not be used as proof-enforced spend evidence until the actual Groth16 verifier, verifying-key commitment, fresh post-verifier SBF rebuild, redeploy/reinit, and live/audit evidence exist

C01 verifier backend contract:

- the reserved tag `3` target is a Groth16-compatible Solana verifier path with `verifierKeyHash:32` and `groth16Proof:256`
- tag `5` registers the source-only verifier-key PDA scaffold for that target, but does not satisfy production verifying-key evidence
- current local bb.js/UltraHonk artifacts are not on-chain verifier evidence
- current remote proof-artifact receipts are only `offchain-remote-proof-artifact-only` verifier-handoff evidence with `onChainVerifierTarget: "none"`
- a future `solana-c01-groth16-verifier-ready` receipt must be a tag `3` candidate with proofSystem: `groth16`, `proofBackend: "remote-service"`, circuit `vanta_private_pool_v2_actual_private_spend_entry`, `private-spend-public-input-hash`, `groth16Proof:256`, and `production-verifying-key-hash` evidence
- `local-acir-bytecode-hash-not-production-vk` is local fixture metadata and must not be accepted as a production verifying key
- a future positive verifier lane must use `production-verifying-key-hash` evidence and replace the fail-closed custom error `14` boundary with reviewed verifier tests
- guard: `npm run zk:c01-production-verifier-backend-candidate-check`

### `6` (TAG_UNSHIELD) - proof-verified unshield release preflight (TAG6 native SOL wired in test helper via system CPI; SPL path still reserved/not-wired. Per design doc §11 + VANTA_ZK_REVIEW U2.1 + 2026-05-14 status note)

TAG6 + native SOL support implemented in the test helper (system_instruction::transfer CPI from program-owned vault PDA for VAULT_ASSET_KIND_SOL=2 + sentinel asset_id). Full production program (when deployed) will use dedicated ["vanta2solvault", pool_state, sentinel] PDA for lamports holding, generalized accounts (system_program), and UnshieldEvent emission. No operator keypair ever signs the funds transfer. Relayer submits user-constructed tx only. Sentinel bypasses zero preflights. Test helper demonstrates the exact private custody path; SPL token release remains not-wired in this scope.

Unshield preflight accounts:

1. `pool_state` read-only, program-owned
2. `root_history` read-only, program-owned, bound in `pool_state`
3. `root_record` read-only program-owned PDA derived from `["vanta2root", pool_state, acceptedRoot]`
4. `nullifier_marker` writable PDA derived from `["vanta2nul", pool_state, nullifier]`
5. `vault_authority` read-only, non-signer PDA derived from `["vanta2vault", pool_state, exitAssetId]`
6. `vault_asset` read-only program-owned PDA derived from `["vanta2asset", pool_state, exitAssetId]`
7. `vault_token_account` writable SPL token account matching the registered mint and vault authority
8. `destination_token_account` writable SPL token account matching the registered mint and `exitDestination` owner
9. `mint` read-only SPL mint account owned by the registered token program
10. `token_program` read-only token program account matching the registered vault asset
11. `verifier_key` read-only program-owned PDA derived from `["vanta2vkey", pool_state, verifierKeyHash]`

Instruction data is exactly 457 bytes:

```text
[6, nullifier:32, acceptedRoot:32, exitDestination:32, exitAssetId:32, exitAmountLeU64:8, publicInputHash:32, verifierKeyHash:32, groth16Proof:256]
```

Behavior today:

- checks the reserved payload length and that the public release fields / proof are not all-zero placeholders
- verifies the supplied `root_history` account is initialized and matches the pubkey stored in `pool_state`
- rejects unshield preflights whose `acceptedRoot` has not been registered in `root_history`
- preflights the deterministic root-record PDA
- preflights the deterministic verifier-key PDA and source-only verifier-key registry record
- preflights the deterministic nullifier marker PDA without creating or mutating it
- preflights the deterministic vault-authority PDA
- preflights the deterministic vault-asset registry PDA
- preflights SPL mint/token-account ownership and mint shape without invoking the token program
- The registry record stores `releaseEnabled = 0`; tag `6` requires that disabled value today
- returns custom error `15` after root/root-record/verifier-key/nullifier/vault-asset/token-account preflight and before mutating accounts
- does not perform token CPIs, PDA-signed release, custody transfer, nullifier consume, or proof verification
- must not be used as program-owned vault or proof-verified release evidence until the actual verifier, token CPI, SBF rebuild, redeploy/reinit, and live/audit evidence exist

### `7` - register Unshield vault asset (source-only, release disabled)

Registers the source-level asset custody registry record used by reserved tag `6` preflight. It is intentionally not a release enablement instruction.

Register-vault-asset accounts:

1. `pool_state` read-only, program-owned
2. `vault_asset` writable PDA derived from `["vanta2asset", pool_state, exitAssetId]`
3. `vault_authority` read-only, non-signer PDA derived from `["vanta2vault", pool_state, exitAssetId]`
4. `operator_authority` writable signer when the vault-asset record is created; must match the pubkey stored during init
5. `system_program` read-only

Register-vault-asset instruction data is exactly 130 bytes:

```text
[7, exitAssetId:32, mint:32, vaultTokenAccount:32, tokenProgram:32, assetKind:1]
```

Behavior today:

- rejects zero `exitAssetId`, `mint`, `vaultTokenAccount`, or `tokenProgram`
- rejects token-program ids that are not the canonical SPL Token program
- accepts only the SPL asset-kind marker used by the current source scaffold
- verifies the supplied vault-authority PDA matches `["vanta2vault", pool_state, exitAssetId]`
- creates or verifies a program-owned vault-asset registry record at `["vanta2asset", pool_state, exitAssetId]`
- records `pool_state`, `exitAssetId`, `mint`, `vault_authority`, `vaultTokenAccount`, `tokenProgram`, `assetKind`, and `releaseEnabled = 0`
- remains source-level custody-registry metadata only; tag `6` still fails closed with custom error `15` before proof verification, nullifier consume, token/system CPI, custody transfer, fund release, or account mutation

## Build

If the Solana SBF toolchain is installed:

```bash
cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml
```

If the Solana installer active release exists but is not on the shell `PATH`, prefix it for manual rebuilds:

```bash
PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH" cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml
```

Native Rust check:

```bash
cargo check --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml
```

## Error Codes

- `1`: duplicate nullifier
- `2`: reserved legacy nullifier set full code
- `3`: output index count exhausted
- `4`: invalid or uninitialized account header
- `5`: pool and output counts disagree
- `6`: signer is not the initialized operator authority
- `7`: account is already initialized
- `8`: supplied nullifier/output/root-history account does not match the initialized pool binding
- `9`: root history account is full
- `10`: duplicate accepted root
- `11`: spend references an unregistered accepted root
- `12`: supplied nullifier marker PDA does not match the expected nullifier marker
- `13`: supplied output record PDA does not match the expected output record
- `14`: proof-carrying spend ABI is reserved and the verifier is not wired
- `15`: proof-verified unshield release ABI is reserved and release custody is not wired
- `16`: supplied Unshield vault authority PDA does not match the expected pool/asset vault authority
- `17`: supplied spend-with-proof verifier-key PDA or account content does not match the expected pool/key hash
- `18`: supplied root record PDA or account content does not match the expected pool/root provenance record
- `19`: supplied Unshield vault-asset PDA or account content does not match the expected pool/asset registry record
- `20`: supplied Unshield vault token account does not match the registered mint/vault authority
- `21`: supplied Unshield destination token account does not match the registered mint/exit destination
- `22`: supplied Unshield token program or mint account does not match the expected token-account ownership boundary
