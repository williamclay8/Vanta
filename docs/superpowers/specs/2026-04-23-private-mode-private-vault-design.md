# Private Mode Private Vault Design

**Date:** 2026-04-23

## Goal

Add an optional advanced-user `Private Mode` to Vanta that keeps the connected wallet as the public funding and approval wallet while introducing a separate locally encrypted `Private Vault` that owns the user's private state inside Vanta.

The product goal is to make the private flow feel much friendlier without lying about current protocol readiness. After a user funds their connected wallet, Vanta should be able to offer one clear next step:

- `Move this balance into private state`

## Product constraints

- `Private Mode` must be optional and explicitly advanced-user-facing. It must not silently change the default wallet behavior for every user.
- The connected wallet must remain the only public-chain signer for funding, approval, fees, and public exit until deeper ownership hardening lands.
- The first version must preserve current beta-mode truth and must not imply production readiness, custody safety, or audited private-state durability.
- Private vault secrets must never leave the browser. Vanta must not store raw vault secrets on its servers.
- The existing wallet safety boundary must remain intact. Public transactions must continue to flow through the current simulation and summary gate.
- Product language should prefer `Public wallet`, `Private Vault`, `Move into private state`, and `Return to public wallet` over protocol-heavy wording.

## Non-goals

- Making `Private Mode` the default for all users
- Replacing the connected wallet with the generated private vault
- Claiming that the current fresh Solana wallet already is the private-core owner
- Claiming full private-core support across every asset or flow
- Treating the first version as mainnet-ready, audited, or custody-safe
- Moving raw vault secrets to backend storage, synced cloud state, or operator services

## Current repo truth

### Public wallet truth

- The connected wallet from `WalletContext` is the only live runtime signer for Shield and Unshield today.
- Public asset discovery, wallet approval, and live send flows all use the connected wallet address and wallet session.
- The wallet safety boundary already requires simulation and summary before send and should be preserved unchanged.

### Fresh wallet truth

- The current `fresh wallet` feature is a browser-generated Solana keypair plus downloadable recovery file.
- It is currently an exportable helper flow and is not used as the active private-state owner.
- The current copy explicitly tells the user to import it into Phantom or Solflare to sign later.

### Private-core truth

- The current private-core owner is a separate in-memory keypair and is not derived from the connected wallet or the fresh wallet.
- The private-core lane is still narrow and explicitly not production-ready.
- Current private-core ownership and live shield-state ownership are not yet unified behind a single user-facing vault model.

## Product design

### Primary product model

Vanta should present two clearly labeled authorities:

- `Public wallet`
  - the connected browser wallet
  - used for funding, wallet approval, fees, and public exit
- `Private Vault`
  - a locally encrypted private-state holder created when the user opts into `Private Mode`
  - used to own the user's private state while they are inside Vanta

The app should not make the user guess which authority is doing what. Every relevant screen should visibly label whether the current action uses the public wallet or the private vault.

### Private Mode entry

`Private Mode` should be accessible from the wallet menu and the app dashboard, not hidden behind a technical settings screen.

When an advanced user enables it, Vanta should:

1. create a new local private vault
2. encrypt it locally on the device
3. show a success state such as `Private Vault ready on this device`
4. require the user to download a recovery file before first meaningful use

### One-click post-funding prompt

After the user has a usable public balance, Vanta should show a single primary prompt:

- CTA: `Move this balance into private state`
- Supporting line: `Your connected wallet stays public. Your Private Vault holds your private activity inside Vanta.`

This prompt should be offered only when:

- `Private Mode` is enabled
- a private vault exists and is unlocked locally
- the connected wallet has a usable public balance
- the relevant shield flow is actually supported for the selected asset and environment

### Shield framing

The first version should reframe Shield as a guided move from one explicit state to another:

- `From: Public wallet`
- `To: Private Vault`

The primary action should read:

- `Move into private state`

The page can still keep deeper route, simulation, and reviewer details, but they should sit below the primary user-facing explanation instead of dominating it.

### Dashboard framing

The dashboard should become the friendly control center for private-mode users. It should show:

- public wallet connection state
- private vault readiness state
- public balance summary
- private balance summary
- one primary next step

Examples of next steps:

- `Move into private state`
- `Send privately`
- `Swap privately`
- `Return to public wallet`

### Unshield framing

Unshield should be presented as a simple return path:

- `Return to public wallet`
- `Destination wallet`
- `Amount returning`

Detailed operator, proof, and release-package information can remain available for reviewers and advanced users behind an expandable details section, but the primary page should read like a normal product action.

## Technical design

### Recommended architecture

The clean design is to make `Private Vault` a first-class identity that sits beside the connected wallet, not inside it.

Recommended top-level model:

- `PublicFundingWallet`
  - connected browser wallet
  - source of public balances
  - signer for public-chain actions
- `PrivateVault`
  - locally encrypted user-controlled vault
  - owner of private Vanta state
- `ActiveWalletTopology`
  - typed app-level structure that tells the UI and flows which public wallet is active and which private vault is selected

The connected wallet continues to sign entry and exit actions through the existing wallet boundary. The private vault becomes the owner of private-state records and private-core ownership material.

### Key-separation rule

The first version must not collapse the public wallet and private vault into one cryptographic identity.

The vault should use domain-separated material, even if the user experiences it as one concept:

- public wallet signing authority for public-chain approval
- private-state ownership material for note ownership and private-core control
- recovery/export material for device restore

This matters because the current fresh wallet and current private-core owner do not live in the same key domain today.

### Private vault persistence

The private vault should be persisted locally in encrypted form.

Minimum requirements:

- encrypted at rest in the browser
- not stored in plaintext local storage
- unlockable during later sessions on the same device
- exportable to a recovery file
- deletable locally by the user

The first version may remain device-local and recovery-file-based. It does not need multi-device sync.

### Ownership migration direction

The long-term direction should be:

- the connected wallet remains the funding and approval wallet
- the private vault becomes the selected private-state owner
- shielded state and private-core state converge around the selected vault identity instead of the connected wallet address

The first version does not need to fully complete that migration everywhere, but its types and UI should point in that direction instead of deepening the current split-brain model.

## Typed boundaries

### PrivateVaultRecord

```ts
type PrivateVaultRecord = {
  vaultId: string;
  createdAt: string;
  custody: "browser-generated" | "imported";
  derivationVersion: "v1";
  encryptedPayload: string;
  recoveryFileVersion: string;
  status: "locked" | "unlocked" | "recovery-required";
  capabilityLabels: string[];
};
```

### ActiveWalletTopology

```ts
type ActiveWalletTopology = {
  fundingWallet: {
    kind: "connected-wallet";
    address: string | null;
    connected: boolean;
  };
  privateVault: {
    vaultId: string;
    status: "locked" | "unlocked" | "missing";
  } | null;
};
```

### ShieldIntoPrivateStateRequest

```ts
type ShieldIntoPrivateStateRequest = {
  sourceWalletAddress: string;
  sourceAssetId: string;
  amountDisplay: string;
  targetPrivateVaultId: string;
  routeKind: "direct" | "public-route";
};
```

### PrivateVaultSessionState

```ts
type PrivateVaultSessionState = {
  privateModeEnabled: boolean;
  vaultReady: boolean;
  vaultRecoveryDownloaded: boolean;
  vaultUnlocked: boolean;
  oneClickPromptEligible: boolean;
};
```

These types are intentionally product-facing. The first version should avoid leaking deep protocol types directly into top-level UI state.

## UX copy contract

Preferred primary labels:

- `Public wallet`
- `Private Vault`
- `Enable Private Mode`
- `Private Vault ready on this device`
- `Download recovery file`
- `Move this balance into private state`
- `Move into private state`
- `Return to public wallet`

Avoid as primary copy:

- `private-core owner`
- `operator release`
- `proof lane`
- `wallet topology`
- `nullifier`
- `handoff package`

Those details can still exist in reviewer surfaces and advanced panels.

## Error handling

- No connected wallet: keep the user in normal wallet setup and do not offer private-state movement yet.
- Private Mode disabled: hide private-vault prompts and keep normal app behavior.
- Private vault missing or locked: show a compact `Unlock Private Vault` or `Set up Private Vault` step instead of a broken shield CTA.
- Recovery file not yet downloaded: warn clearly before first significant move into private state.
- Unsupported asset or lane: suppress the one-click prompt or label it honestly as unavailable.
- Beta-mode limitation: preserve existing truth surfaces and never imply that private settlement is production-ready.
- Local vault persistence failure: fail closed, keep the connected wallet unchanged, and do not imply the vault is durable.

## Verification

Minimum implementation verification should include:

- `npm run build`
- wallet-menu/browser verification for:
  - enabling `Private Mode`
  - creating a private vault
  - showing recovery-file requirement
  - showing the one-click post-funding prompt only when eligible
- shield/unshield browser verification for:
  - `Public wallet -> Private Vault` framing
  - `Private Vault -> Public wallet` framing
- a lightweight contract check for:
  - private-mode copy
  - vault-state labels
  - one-click prompt gating
- current wallet-signing safety checks must continue to pass

If the implementation touches the private-core ownership boundary more deeply, escalate verification to the stronger canonical private-core commands.

## Risks and limitations

- The biggest product risk is wallet-role confusion. Users may conflate the public wallet and private vault unless the UI labels stay explicit everywhere.
- Local encryption improves usability but does not remove recovery risk. If the user loses the device state and ignores recovery export, they may lose access to local private-state continuity.
- Current live shield-state ownership and current private-core ownership are not yet unified. A sloppy implementation could deepen ownership drift instead of reducing it.
- The current private-core lane remains limited and not production-ready. The product must not overclaim what assets and flows truly work end to end.
- The first version should not imply that Vanta is providing custodial safety, cloud backup, or audited secure enclave protection.

## Phased rollout

### Phase 1: Product shell and honest private-mode flow

Ship:

- optional `Private Mode`
- local encrypted `Private Vault`
- required recovery export step
- one-click prompt after funding
- shield/unshield reframing around `Public wallet` and `Private Vault`
- dashboard split view for public and private balances

Do not ship:

- default-on private mode
- custody-safe language
- full asset-parity claims

### Phase 2: Ownership hardening

Add:

- stronger binding between the connected wallet and selected private vault
- more explicit destination binding for public exit
- deeper convergence between live shielded-state ownership and vault ownership
- better restore and unlock flows across sessions

### Phase 3: Production-candidate hardening

Only after broader protocol hardening:

- stronger private-core ownership guarantees
- audited or stronger proof/authorization boundaries
- durable operator/indexer/service support
- truthful production-readiness documentation

## Recommendation

Ship `Private Mode` first as an optional advanced-user flow built around a separate locally encrypted `Private Vault`, not as a public-wallet replacement.

This is the friendliest design that still matches the current repo truth:

- the connected wallet keeps doing public-wallet things
- the private vault owns private-state things
- the user gets a clean one-click move into private state after funding
- Vanta improves usability immediately without making dishonest readiness claims
