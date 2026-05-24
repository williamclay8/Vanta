# Jupiter SOL-to-Shielded Route Adapter

This service backs Vanta's bounded demo route for shielded SOL -> shielded token swaps.

It is intentionally not a production-private claim. It bridges Vanta's shielded-note accounting to public Solana DEX liquidity through Jupiter, then requires a Private Pool v2 committed-economics settlement receipt before the app finalizes the shielded state.

## Service

Run locally:

```bash
npm run swap:jupiter-sol-to-shielded-adapter
```

Endpoints:

- `GET /health`
- `POST /quote`
- `POST /execute`

Frontend env:

```bash
VITE_VANTA_SOL_TO_SHIELDED_SWAP_OPERATOR_URL=https://<adapter-host>
```

## Required Live Env

Quote-only mode is the default. Live execution requires all of:

```bash
VANTA_SOL_TO_SHIELDED_EXECUTION_MODE=live
VANTA_SOLANA_CLUSTER=mainnet-beta
VANTA_SOLANA_RPC_URL=<helius-or-other-mainnet-rpc>
VANTA_SOL_TO_SHIELDED_MAX_INPUT_SOL=1
VANTA_SOL_TO_SHIELDED_SUPPORTED_ASSETS=USDC,PYUSD
VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF=<secret-manager-or-hsm-signer-ref>
VANTA_PRIVATE_POOL_V2_OPERATOR_URL=<private-pool-v2-operator-url>
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-auth-token-if-required>
```

Optional:

```bash
JUPITER_API_KEY=<jupiter-api-key>
VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN=<bearer-token-for-app/backend-callers>
VANTA_SOL_TO_SHIELDED_STATE_PATH=/var/data/vanta-sol-to-shielded-state.json
VANTA_SOL_TO_SHIELDED_SLIPPAGE_BPS=50
```

Do not set `VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN` directly on a browser-called public adapter unless a backend proxy injects the token. The current app calls the adapter from the browser and does not expose adapter bearer secrets client-side.

Raw liquidity keypair envs, `VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON` and `VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH`, are local-only escape hatches for non-production checks. Production mode refuses to boot when either raw keypair env is present; the liquidity wallet must sit behind a wrapped external signer/HSM boundary before this route can be treated as production executable.

`VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF` comes from the governed wallet-infrastructure lane, not from a local keypair file. The expected source is a production secret-manager value that points at the reviewed external signer, normally the scoped Turnkey sign-with handle plus its policy id (`VANTA_TURNKEY_SIGN_WITH_REF` / `VANTA_TURNKEY_POLICY_ID_REF`) or an equivalent HSM signer handle. Store only the reference, never exported key material.

The current adapter exposes and enforces this signer policy boundary, but it does not yet execute Jupiter live swaps through a wrapped external signer. Live production execution remains blocked until a server-only signer adapter consumes `VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF`, signs without exposing private key material, and passes a no-live-call dry run plus review.

## Demo Boundary

- Jupiter provides public-route liquidity.
- The adapter liquidity wallet signs the public swap transaction.
- The adapter enforces a cumulative SOL cap from local state.
- The app only accepts an execution if the adapter returns `sol-to-shielded-v1`, `committed-economics`, and `swap-to-shielded` receipt fields.
- No deploy should describe this as privacy-complete or live private settlement.

## Verification

```bash
npm run swap:jupiter-sol-to-shielded-adapter-check
npm run swap:capability-check
npm run build
```
