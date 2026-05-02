# Vanta Vault

Canonical Vanta second brain:

- `/Users/clay/Desktop/Vanta Vault`

This vault is intentionally external to the `Vanta` app repository so it can remain Vanta's persistent second brain independent of any single codebase.

## Rules

- Treat `/Users/clay/Desktop/Vanta Vault` as the canonical local Vanta memory and wiki.
- Do not recreate the canonical vault inside this repo.
- If project notes are needed from app work, sync or file them into the external vault.
- The app repo may contain pointers to the vault, but not the vault as an embedded project-owned directory.

## Render workspace default

For any Vanta session that touches Render, deployments, service logs, Render databases, environment variables, or live deployment status, choose Render workspace `William's workspace` first.

- Render workspace id: `tea-d7j37af7f7vs739ii8rg`
- Do not continue Render provider work while the selected workspace is empty or different.
- This selects the provider context only. It is not deployment approval, billing approval, secret access approval, or permission to mutate production-like state outside the normal Vanta blockers.
- The tracked guard is `npm run mainnet:render-workspace-check`.
