# vanta_agent_spending_limit

zkRune-inspired agent authorization circuit for Vanta Phase 2.

The circuit proves an agent action stays under a public spending limit, belongs to a public policy epoch, and carries a human approval commitment while keeping spend amount, approval secret, and agent secret private.

## Verification

```bash
npm run zk:agent-spending-limit-circuit-check
npm run agent-authorization-proof-request-check
```

## Claim Boundary

This is not live delegated wallet authority, not enterprise readiness, not autonomous spending approval, not production proof generation, and not mainnet settlement.
