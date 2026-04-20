# Vanta Doppler Staging Setup

This guide is for wiring Doppler to Vanta staging without putting secret values in git or chat.

## Safety rule

Do not paste Doppler tokens, Render database URLs, webhook secrets, bearer tokens, private keys, seed phrases, or wallet keypair files into chat or commits.

## What to create in Doppler

Create a Doppler project:

```text
vanta
```

Use the staging config first:

```text
stg
```

Do not wire `prd` for mainnet yet.

## Required staging secrets

Add these names to Doppler `vanta` / `stg`:

```text
VANTA_PAY_SECRET_KEY
VANTA_PAY_WEBHOOK_SECRET
VANTA_PAY_DATABASE_URL
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_DATABASE_URL
```

The two operator auth token values should match:

```text
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
```

That shared token is how Pay authenticates to Private Pool v2.

## If you cannot find the operator token

You do not need to recover the old value.

Create a fresh strong random token in Doppler and put the same value in both:

```text
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
```

Then sync/redeploy both Render services together.

Expected result:

- Private Pool v2 accepts authenticated operator requests with the new token.
- Pay forwards the same token when it calls Private Pool v2.
- Unauthenticated Private Pool v2 status stays `401`.

## Render service mapping

Pay Render service needs:

```text
VANTA_PAY_SECRET_KEY
VANTA_PAY_WEBHOOK_SECRET
VANTA_PAY_DATABASE_URL
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL
VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
```

Private Pool v2 Render service needs:

```text
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN
VANTA_PRIVATE_POOL_V2_DATABASE_URL
```

## Verification

After Doppler syncs to Render and both services redeploy:

```bash
curl -fsS -i https://vanta-0wwi.onrender.com/health
curl -fsS -i https://vanta-staging-private-pool-v2.onrender.com/health
curl -fsS -i -H 'Authorization: Bearer <pay-secret-key>' https://vanta-0wwi.onrender.com/v1/status
```

Do not paste `<pay-secret-key>` into chat.

The Pay status should include:

```text
privatePoolOperatorConfigured: true
durableStoreConfigured: true
storage.kind: postgres-jsonb-snapshot-store
```

## Mainnet status

Doppler staging setup does not make Vanta mainnet-ready.

`mainnetReady` and `productionReady` remain `false` until production infrastructure, audit, legal/compliance/custody review, monitoring, and explicit mainnet-funds approval gates are complete.
