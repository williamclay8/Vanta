# vanta_agent_private_stack

**Phase 2 Real Noir Circuit** — T7 AI Agent Private Stack (from 2026-06-11 X research pass).

## Purpose
Implements private stack for AI agents:
- Persistent agent memory (KausaMemory)
- Private GPU compute flag
- Spending limits + human-in-the-loop approval
- Client-side proving hooks

Ties to T7 from Twitter Pass Integration 2026-06-11 (Kausalayer signal).

## Nargo Commands
```bash
cd zk/noir/vanta_agent_private_stack
nargo build
nargo test
```

## Claim Boundary
beta-selective-disclosure-not-production-private-or-regulator-approved.

**X Signals**: Kausalayer (https://x.com/Nik_smoke37/status/2064994056262852754), zkRune agent context.

## Verification Evidence
ls + cat/grep confirmed binding + 5 asserts + test. Local only. Vault synced.