# Turnkey Integration

Vanta has the Turnkey SDKs installed as a governed integration surface:

- `@turnkey/sdk-server` for server-side stamped Turnkey API calls.
- `@turnkey/solana` for future controlled Solana signing workflows.

This is not a live wallet integration yet. It does not enable production custody, production privacy, live mainnet-private settlement, autonomous root credentials, or real-funds signing.

## Required Workflow

Use the global skill before Turnkey work:

- `/Users/clay/.agents/skills/turnkey-agent-skills/SKILL.md`
- `/Users/clay/.agents/skills/turnkey-agent-skills/references/vanta-turnkey-workflows.md`

For Vanta code integration, current official Turnkey docs and SDK references remain the source of truth. The public skill bundle is an operational guide, not an implementation spec.

## Fail-Closed Rules

- Root credentials are human-admin only and must not be given to autonomous agents.
- Turnkey private keys, API private keys, mnemonics, wallet exports, and signed payloads must not be printed, logged, committed, or stored in the vault.
- Wallet deletion/export stays dashboard-only.
- Policy mutation, activity approval, signing, broadcasting, and real-funds movement require explicit approval for the exact action.
- Browser/client Turnkey bundle use remains blocked until a product/design gate proves the UX and secret boundary.
- Vanta language must stay beta-safe: no production, custody-ready, audited, anonymous, fully private, or mainnet-private claim elevation.

## Checks

Canonical local check:

```sh
npm run turnkey:integration-contract-check
```

This check is inherited by:

```sh
npm run wallet:signing-safety-check
npm run mainnet:secret-handling-check
```

The next safe implementation step is a server-only Turnkey adapter behind explicit secret-reference gating and a no-live-call dry run.
