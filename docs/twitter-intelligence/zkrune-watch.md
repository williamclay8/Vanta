# zkRune Watch Item - 2026-06-10

Status: client-side proving and agent-authorization watch item.

Source: June 10 2026 X research run. Exact X URLs pending backfill from the original run.

## Why It Matters

zkRune's client-side Groth16 direction and zkAgent Passport framing sharpen a Vanta use case: private agent authorization with spending limits and human-in-the-loop controls.

## Vanta Interpretation

Vanta should make agent policy proofs boring and typed: a public spending limit, policy epoch, human approval commitment, and authorization nullifier, while spend amount and approval secrets stay private witness inputs.

This is local proof-request and circuit evidence only. It is not enterprise readiness, not delegated live wallet authority, and not proof that an agent can spend funds.

## Watch Questions

- copy: client-side Groth16 request/result UX and policy packet shape.
- counter: vague agent autonomy without human approval and scoped limits.
- ignore: enterprise-page marketing until backed by a verifiable packet.
- deep read: browser prover performance, request lifecycle, and proof artifact handling.

## Guards

```bash
npm run client-side-proving-enforced-check
npm run agent-authorization-proof-request-check
```
