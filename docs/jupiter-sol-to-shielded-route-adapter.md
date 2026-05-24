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
VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN=<server-to-server-adapter-auth-token>
VANTA_SOL_TO_SHIELDED_MAX_INPUT_SOL=1
VANTA_SOL_TO_SHIELDED_SUPPORTED_ASSETS=USDC,PYUSD
VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF=<secret-manager-or-hsm-signer-ref>
VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY=<liquidity-wallet-public-key>
VANTA_SOL_TO_SHIELDED_LIQUIDITY_PUBLIC_KEY_REF=<liquidity-wallet-public-key-review-ref>
VANTA_SOL_TO_SHIELDED_TURNKEY_REVIEW_PACKET_REF=<reviewed-dry-run-packet-ref>
VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED=true
VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVAL_REF=<live-signing-approval-ref>
VANTA_TURNKEY_ORGANIZATION_ID=<turnkey-organization-id>
VANTA_TURNKEY_ORGANIZATION_ID_REF=<turnkey-organization-review-ref>
VANTA_TURNKEY_API_PUBLIC_KEY=<turnkey-api-public-key>
VANTA_TURNKEY_API_PUBLIC_KEY_REF=<turnkey-api-public-key-review-ref>
VANTA_TURNKEY_API_PRIVATE_KEY=<turnkey-api-private-key>
VANTA_TURNKEY_API_PRIVATE_KEY_REF=<turnkey-api-private-key-secret-ref>
VANTA_TURNKEY_SIGN_WITH=<turnkey-wallet-account-address-or-private-key-id>
VANTA_TURNKEY_POLICY_ID=<turnkey-policy-id>
VANTA_TURNKEY_POLICY_ID_REF=<turnkey-policy-review-ref>
VANTA_PRIVATE_POOL_V2_OPERATOR_URL=<private-pool-v2-operator-url>
VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN=<operator-auth-token-if-required>
```

Optional:

```bash
JUPITER_API_KEY=<jupiter-api-key>
VANTA_SOL_TO_SHIELDED_STATE_PATH=/var/data/vanta-sol-to-shielded-state.json
VANTA_SOL_TO_SHIELDED_SLIPPAGE_BPS=50
```

Do not expose `VANTA_SOL_TO_SHIELDED_ADAPTER_AUTH_TOKEN` to a browser-called public adapter. Live/prod POST routes fail closed without this server-side token; put the adapter behind a backend proxy that injects the token before enabling `live`.

Raw liquidity keypair envs, `VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_JSON` and `VANTA_SOL_TO_SHIELDED_LIQUIDITY_KEYPAIR_PATH`, are local-only escape hatches for non-production checks. Production mode refuses to boot when either raw keypair env is present; the liquidity wallet must sit behind a wrapped external signer/HSM boundary before this route can be treated as production executable.

`VANTA_SOL_TO_SHIELDED_LIQUIDITY_SIGNER_REF` comes from the governed wallet-infrastructure lane, not from a local keypair file. The expected source is a production secret-manager value that points at the reviewed external signer, normally the scoped Turnkey sign-with handle plus its policy id (`VANTA_TURNKEY_SIGN_WITH_REF` / `VANTA_TURNKEY_POLICY_ID_REF`) or an equivalent HSM signer handle. Store only the reference, never exported key material. Runtime Turnkey credentials are server-only Render/Doppler values and must not be printed, logged, committed, or exposed to browser bundles.

The adapter now has a server-only Turnkey signer seam for live Jupiter transactions. It remains fail-closed unless the runtime has a signer ref, liquidity public key, Turnkey org/API/sign-with/policy values, a reviewed dry-run packet ref, and `VANTA_SOL_TO_SHIELDED_TURNKEY_LIVE_SIGNING_APPROVED=true`. Before live approval, this required no-live-call gate must pass:

```bash
npm run swap:turnkey-liquidity-signer-dry-run-check
npm run swap:turnkey-liquidity-live-signer-adapter-check
```

That dry-run gate uses a fixture Jupiter transaction and a mocked Turnkey client. It must make no live Turnkey, Jupiter, Solana RPC, or broadcast calls; reject raw production liquidity keypairs; and emit only a review packet with signer/policy refs, transaction fingerprint, simulation ref, instruction summary, amount, asset, destination, and explicit approval state.

## Demo Boundary

- Jupiter provides public-route liquidity.
- The adapter liquidity wallet signs the public swap transaction.
- The adapter enforces a cumulative SOL cap from local state.
- The app only accepts an execution if the adapter returns `sol-to-shielded-v1`, `committed-economics`, and `swap-to-shielded` receipt fields.
- No deploy should describe this as privacy-complete or live private settlement.

## Verification

```bash
npm run swap:turnkey-liquidity-signer-dry-run-check
npm run swap:turnkey-liquidity-live-signer-adapter-check
npm run swap:jupiter-sol-to-shielded-adapter-check
npm run swap:capability-check
npm run build
```
