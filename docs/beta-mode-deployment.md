# Vanta Beta Mode Deployment

Vanta Beta Mode keeps the website and product flows available without allowing live private-settlement actions while paid production services are suspended.

## Frontend flag

Set the public frontend deployment to:

```bash
VITE_VANTA_DEPLOYMENT_MODE=beta
```

Beta mode is the default when the flag is absent or not set to `production`.

In beta mode:

- the app renders a global `Vanta Beta` banner
- Shield, Send, Swap, Strategy, Unshield, and Pay forms remain visible
- primary live-action buttons are disabled with `Beta mode` copy
- no browser action should submit live wallet, payment, or Private Pool v2 settlement requests

## Render cost-control posture

The production Private Pool v2 service network can be kept configured but suspended when Vanta is not actively running production private settlement.

Production role services:

- `srv-d7jfqru7r5hc73b6oelg` / `vanta-prod-private-pool-v2-indexer`
- `srv-d7jg4arbc2fs73c1449g` / `vanta-prod-private-pool-v2-prover`
- `srv-d7jg9jrbc2fs73c161gg` / `vanta-prod-private-pool-v2-relayer`
- `srv-d7jgf7n7f7vs73ebdu40` / `vanta-prod-private-pool-v2-verifier`
- `srv-d7jgl3d8nd3s73a9efng` / `vanta-prod-private-pool-v2-operator`

Render API suspend endpoint:

```http
POST /v1/services/{serviceId}/suspend
```

Repo helper:

```bash
npm run render:production-services-suspend
RENDER_API_KEY=<render-api-key> npm run render:production-services-suspend -- --apply
```

Dashboard fallback:

1. Open Render Dashboard.
2. Select the five `vanta-prod-private-pool-v2-*` web services.
3. Use the bulk action menu and choose `Suspend`.
4. Leave staging/static frontend and Postgres resources untouched unless deliberately pausing the whole environment.

## Resume checklist

Before switching the frontend to production:

1. Resume all five production role services.
2. Confirm each service returns `/health` successfully.
3. Run the authenticated production smoke:

```bash
npm run mainnet:private-pool-v2-production-smoke-live
```

4. Record fresh smoke evidence in `ops/mainnet/private-pool-v2-production-smoke.evidence.json`.
5. Run:

```bash
npm run mainnet:production-smoke-evidence-check
npm run beta-mode:check
npm run build
```

6. Only then set:

```bash
VITE_VANTA_DEPLOYMENT_MODE=production
```

Production mode still does not make Vanta mainnet-ready by itself. Mainnet requires the remaining approval gates, audit/legal/custody review, backup/restore evidence, and explicit real-funds approval.
