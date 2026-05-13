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
- validates account headers, registered `acceptedRoot`, root-record provenance, output-index/spend-count consistency, unused nullifier marker, unused output record, and the verifier-key hash account
- returns custom error `14` after preflight and before proof verification, nullifier/output mutation, account creation, or proof-enforced spend acceptance
- must not be used as proof-enforced spend evidence until the actual Groth16 verifier, verifying-key commitment, fresh post-verifier SBF rebuild, redeploy/reinit, and live/audit evidence exist

C01 verifier backend contract:

- the reserved tag `3` target is a Groth16-compatible Solana verifier path with `verifierKeyHash:32` and `groth16Proof:256`
- current local bb.js/UltraHonk artifacts are not on-chain verifier evidence
- `local-acir-bytecode-hash-not-production-vk` is local fixture metadata and must not be accepted as a production verifying key
- a future positive verifier lane must use `production-verifying-key-hash` evidence and replace the fail-closed custom error `14` boundary with reviewed verifier tests

### `6` - proof-verified unshield release preflight (reserved, fail closed)

Reserves the future program-owned vault release ABI. It is intentionally not accepted yet.

Unshield preflight accounts:

1. `pool_state` read-only, program-owned
2. `root_history` read-only, program-owned, bound in `pool_state`
3. `root_record` read-only program-owned PDA derived from `["vanta2root", pool_state, acceptedRoot]`
4. `nullifier_marker` writable PDA derived from `["vanta2nul", pool_state, nullifier]`
5. `vault_authority` read-only, non-signer PDA derived from `["vanta2vault", pool_state, exitAssetId]`

Instruction data is exactly 425 bytes:

```text
[6, nullifier:32, acceptedRoot:32, exitDestination:32, exitAssetId:32, exitAmountLeU64:8, publicInputHash:32, groth16Proof:256]
```

Behavior today:

- checks the reserved payload length and that the public release fields / proof are not all-zero placeholders
- verifies the supplied `root_history` account is initialized and matches the pubkey stored in `pool_state`
- rejects unshield preflights whose `acceptedRoot` has not been registered in `root_history`
- preflights the deterministic root-record PDA
- preflights the deterministic nullifier marker PDA without creating or mutating it
- preflights the deterministic vault-authority PDA without token accounts or SPL Token CPI
- returns custom error `15` after preflight and before mutating accounts
- does not perform token CPIs, PDA-signed release, custody transfer, nullifier consume, or proof verification
- must not be used as program-owned vault or proof-verified release evidence until the actual verifier, token CPI, SBF rebuild, redeploy/reinit, and live/audit evidence exist

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
