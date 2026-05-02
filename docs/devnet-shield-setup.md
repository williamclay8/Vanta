# Devnet Shield Setup

This repo now supports one real Shield path for one controlled devnet test token.

The supported asset is surfaced in the app as `USDC` and is backed by:
- one configured SPL mint
- one configured Vanta vault owner address

## Required environment variables

Create a local `.env` file from `.env.example` and set:

```bash
VITE_VANTA_DEVNET_TOKEN_MINT=...
VITE_VANTA_DEVNET_VAULT_OWNER=...
VITE_VANTA_UNSHIELD_OPERATOR_URL=http://127.0.0.1:8789/unshield
VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL=http://127.0.0.1:8789/unshield/sol

VANTA_DEVNET_TOKEN_MINT=...
VANTA_DEVNET_VAULT_OWNER=...
VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY=[...]
```

Optional:

```bash
VITE_VANTA_DEVNET_TOKEN_NAME=Vanta Devnet Test Dollar
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_WS_URL=wss://api.devnet.solana.com
VANTA_UNSHIELD_OPERATOR_PORT=8789
```

## Suggested SPL CLI setup

Point Solana CLI at devnet:

```bash
solana config set --url devnet
```

Create a controlled mint:

```bash
spl-token create-token
```

Create the connected wallet's token account:

```bash
spl-token create-account <TOKEN_MINT>
```

Mint test balance into the wallet:

```bash
spl-token mint <TOKEN_MINT> 1000
```

Choose a vault owner address for Vanta's first constrained Shield flow. This can be:
- a dedicated devnet wallet address
- a treasury-style devnet address used only for the first shield milestone

The app's real Shield action transfers the supported token from the connected wallet to the configured vault owner on devnet.

For the first constrained Unshield hardening milestone, the frontend no longer carries the vault signer. Instead, a tiny local operator service holds the devnet signer and performs the real return transfer back to Public Wallet.

The current operator path is now minimally authenticated:
- the connected wallet signs an explicit Unshield intent message
- the operator verifies that wallet signature before moving USDC
- the same operator exposes `POST /unshield/sol` for the constrained SOL release lane
- requests carry a timestamped `requestId`
- the operator rejects expired and already-seen requests in-memory during local runs
- the operator confirms the referenced onchain Unshield transition and consumed note are consistent before release
- completed releases are persisted locally so duplicate protection survives operator restarts

Start the operator locally:

```bash
npm run operator:unshield
```

The operator expects:
- `VANTA_DEVNET_TOKEN_MINT`
- `VANTA_DEVNET_VAULT_OWNER`
- `VANTA_DEVNET_VAULT_SIGNER_SECRET_KEY`

The browser expects:
- `VITE_VANTA_UNSHIELD_OPERATOR_URL` for SPL token Unshield
- `VITE_VANTA_SOL_UNSHIELD_OPERATOR_URL` for SOL Unshield

The SOL endpoint can be checked without moving funds:

```bash
npm run unshield:sol-operator-endpoint-check
```

That self-hosted check verifies `/health/sol-unshield`, rejects malformed SOL release requests, and confirms the SOL record-state endpoint shape. Live SOL release remains a real devnet transfer and should only be attempted with the intended funded devnet vault signer.

The downstream mainnet-production status surfaces are intentionally blocked until the live evidence gates are satisfied, but they should stay wired into readiness and preflight:

```bash
npm run mainnet:send-production-status
npm run mainnet:send-production-check
npm run mainnet:swap-production-status
npm run mainnet:swap-production-check
npm run mainnet:unshield-production-status
npm run mainnet:unshield-production-check
```

These are truth surfaces, not launch approvals. They preserve local lane coverage, no-funds operator coverage, live-settlement evidence gaps, bounded-approval state, and privacy-claim blockers for Send, Swap, and Unshield.

By default the operator stores completed release records at:

```text
operator/.vanta-unshield-releases.json
```

Delete that file only if you intentionally want to reset the local operator's remembered release history.

The same local operator now also serves the narrow Vanta Private Core verifier lane used by the fixed-depth single-note unshield proof boundary. That means the current operator process is responsible for:
- authenticated devnet unshield for the live `USDC` / `SOL` path
- private-core proof verification
- private-core root registration
- private-core consume / replay enforcement
- private-core proof, consume, release, and root summary state

## Recommended local operator preflight

Before a live demo or local verification pass, use:

```bash
npm run private-core:demo-preflight
```

That runs the current full private-core verification stack and then prints the live operator contract snapshot plus the live operator summary snapshot.

If you want the commands separately:

```bash
npm run private-core:verify
npm run private-core:operator-contract
npm run private-core:operator-status
```

The operator-contract command now prints the static narrow zk-v1 support contract:
- contract version / summary compatibility
- supported send, unshield, release, and swap lanes
- supported product flow
- supported asset and environment
- supported note schema and version
- supported root-registration provenance, send resulting-root basis, send input-root policy, and send output-registration policy
- supported constrained swap venue and swap output model
- supported recipient and release-destination models
- supported proof system
- supported unshield/send circuit ids and fixed Merkle depths
- supported release authorization / root policy
- supported release execution / atomicity / persistence
- explicit source-artifact truth / proving-truth / source-vs-proving relationship
- owner-auth mode
- nullifier-key mode
- proving hash lane

The operator-status command now prints:
- current root
- supported send-lane version and identity
- supported unshield-lane version and identity
- supported swap-lane version and identity
- supported swap-v1 decision
- latest proof
- latest swap proof
- latest send proof
- latest send linked proof
- latest swap execution venue
- latest swap quote reference
- latest send resulting-root basis
- send continuity status
- send boundary status
- latest send resulting root
- send resulting root status
- send resulting root registration status
- send resulting root registration basis
- send resulting root record
- current root proof link
- send resulting root proof link
- latest consume
- latest release
- release authorization and root policy
- supported release lane version / kind / status
- supported product flow version / kind / status
- supported asset and environment
- supported note schema and note version
- supported root-registration provenance, send resulting-root basis, send input-root policy, and send output-registration policy
- supported recipient and release-destination models
- supported proof system and current unshield/send circuit ids plus fixed Merkle depth
- supported release authorization basis
- supported release root policy
- supported release execution model
- supported release atomicity model
- supported release persistence model
- proof/send link status
- proof/consume link status
- proof/release link status
- contract mirror status
- contract mirror note
- operator boundary status
- operator boundary note
- operator summary generation time

## What the private-core verification stack proves today

```bash
npm run private-core:check
npm run private-core:prove
npm run private-core:contract-smoke
npm run private-core:http-smoke
npm run private-core:restart-check
npm run private-core:verify
```

These commands currently prove:
- the fixed-depth Noir circuit still accepts the valid witness
- the malformed Merkle-path witness still fails
- the dedicated operator-contract endpoint stays coherent and typed
- source-layer send transitions still consume the input note and recover the change note coherently
- residual change notes from private send still hold and unshield coherently
- recipient notes from private send still recover and spend coherently
- received private notes can still chain into a second private send coherently
- one operator-backed private send still proves, applies, recovers for the recipient, and preserves sender privacy
- one operator-backed private send now requires the current input root to stay linked to its registration proof
- one operator-backed private send now rejects missing, malformed, or non-transitioning resulting roots before proof execution
- one operator-backed private send can now flow into operator-backed recipient unshield coherently
- one operator-backed private send can now also flow into operator-backed sender-change unshield coherently
- two operator-backed private send transitions can now flow into operator-backed recipient unshield coherently
- two operator-backed private send transitions can now verify in sequence on evolving private state
- two operator-backed private send transitions now persist coherently across operator restart
- one operator-backed private send to recipient unshield now persists coherently across operator restart
- one operator-backed private send to sender-change unshield now persists coherently across operator restart
- two operator-backed private send transitions to recipient unshield now persist coherently across operator restart
- a real local proof can still be generated and verified
- the constrained swap lane can now also be proved locally and verified over the operator HTTP seam
- the constrained swap lane now also has a proof-backed swap-transition HTTP seam with explicit registered-root gating and persisted swap state
- the constrained swap lane can now also hand off into proof-backed root registration, operator-backed recipient unshield, linked release state, and replay rejection
- the constrained swap lane now also proves summary-backed swap proof and swap-transition persistence across operator restart
- the constrained swap to recipient-unshield handoff now also persists coherently across operator restart
- the operator HTTP surface is still coherent
- operator proof, consume, release, and root state survive restart
- replay is still rejected after restart
- the operator summary snapshot remains coherent across app, CLI, and regression surfaces

## What is real in this milestone

- wallet connection
- supported token balance detection
- wallet-signed SPL token transfer into the configured Vanta vault owner
- confirmed shield receipt reflected in app state
- constrained real Unshield back to Public Wallet through a local operator-backed devnet path
- operator-backed Vanta Private Core proof / consume / replay-rejection lane with summary-driven verifier state

## What remains intentionally narrow

- shielded state is represented in-app from confirmed devnet deposit receipts
- this is the first real Shield milestone, not the final Vanta protocol architecture
- Private Send remains the next real protocol milestone
- the current Vanta Private Core lane is still the first narrow single-note unshield boundary, not the full final zk protocol
