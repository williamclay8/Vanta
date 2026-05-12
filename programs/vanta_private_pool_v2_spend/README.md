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
The program now fail-closes writes behind the operator authority captured during init; it still does not verify proofs or prove that the accepted root came from a program-owned Merkle tree.

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

Registers an accepted root before spends can anchor against it.

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

- checks only the reserved payload length and that `verifierKeyHash` / `groth16Proof` are not all-zero placeholders
- returns custom error `14` before reading or mutating any accounts
- must not be used as proof-enforced spend evidence until the actual Groth16 verifier, verifying-key commitment, SBF rebuild, redeploy/reinit, and live/audit evidence exist

## Build

If the Solana SBF toolchain is installed:

```bash
cargo-build-sbf --manifest-path programs/vanta_private_pool_v2_spend/Cargo.toml
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
