# Vanta Private Pool v2 Spend Program

Small native Rust Solana program for anchoring Vanta actual-private spend evidence.

This is intentionally minimal:

- no Anchor
- no CPIs
- no token movement
- no secrets
- no deploy configuration
- no proof verification

It records the public evidence produced by an already-verified private spend lane: one nullifier, two output commitments, and a public input hash.
The program now fail-closes writes behind the operator authority captured during init; it still does not verify proofs.

## Instructions

Instruction data is byte-packed.

### `0` - init

Initializes the headers of three already-created, program-owned, writable accounts and binds the pool to those exact child accounts:

1. `pool_state`
2. `nullifier_set`
3. `output_queue`
4. `operator_authority` signer, read-only

The init instruction is exactly one byte:

```text
[0]
```

Init is one-time for zeroed accounts. Reinitialization is rejected instead of allowing a later signer to replace the operator authority or child account bindings.

Minimum account data sizes:

- `pool_state`: 152 bytes
- `nullifier_set`: `16 + 32 * slot_count` bytes
- `output_queue`: `16 + 96 * slot_count` bytes

### `1` - spend

Spend accounts:

1. `pool_state` writable
2. `nullifier_set` writable
3. `output_queue` writable
4. `operator_authority` signer, read-only; must match the pubkey stored during init

Spend instruction data is exactly 129 bytes:

```text
[1, nullifier:32, output0:32, output1:32, publicInputHash:32]
```

Behavior:

- verifies all three accounts are writable and owned by this program
- verifies the stored operator authority signed the spend
- verifies the supplied `nullifier_set` and `output_queue` match the pubkeys stored in `pool_state` during init
- verifies account headers were initialized
- scans initialized nullifier slots and rejects duplicate nullifiers
- appends the nullifier to the nullifier set
- appends `output0`, `output1`, and `publicInputHash` as a fixed output record
- increments the pool spend count
- records the latest public input hash in `pool_state`

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
- `2`: nullifier set full
- `3`: output queue full
- `4`: invalid or uninitialized account header
- `5`: pool, nullifier, and output counts disagree
- `6`: signer is not the initialized operator authority
- `7`: account is already initialized
- `8`: supplied nullifier/output account does not match the initialized pool binding
