# DarkDrop Watch Item - 2026-06-10

Status: private-transfer primitive watch item.

Source: June 10 2026 X research run. Exact X URLs pending backfill from the original run.

## Why It Matters

DarkDrop's credit-note / dead-drop design gives Vanta a concrete alternative to a pure shielded-pool mental model:

1. Merkle vault deposit.
2. encrypted claim code sent off-chain.
3. ZK proof creates a credit-note.
4. withdrawal path hides amounts/timing and, per the run, uses direct lamport manipulation rather than a visible Transfer instruction.

The run describes V2 on devnet with SOL + USDC, trusted setup upcoming, and audits pending.

## Vanta Interpretation

The useful Vanta primitive is not "copy DarkDrop." It is a fail-closed credit-note / dead-drop circuit and request packet that binds deposit commitment, claim-code commitment, credit-note commitment, amount bucket, and nullifier.

## Watch Questions

- copy: credit-note commitment shape, nullifier uniqueness, amount-bucket disclosure.
- counter: any claim that direct lamport manipulation is automatically private.
- ignore: devnet contest status until independently verified.
- deep read: trusted setup and audit outcomes before using this as more than local evidence.

## Guard

```bash
npm run credit-note-transfer-primitive-check
```
