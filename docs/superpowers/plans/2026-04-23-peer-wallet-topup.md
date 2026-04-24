# Peer Wallet Top-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Peer-powered wallet top-up entry point inside the existing Vanta wallet picker that appears only when the user is disconnected or has no usable public balance.

**Architecture:** Keep Peer isolated behind a small integration layer in `src/peer/` and use the existing wallet picker in `src/components/AppLayout.tsx` as the only user-facing surface. Gate the feature behind explicit Vite config and deployment-mode checks so the integration does not contradict Vanta's beta-mode truth surfaces.

**Tech Stack:** React, TypeScript, Vite env configuration, `@zkp2p/sdk`, existing wallet/balance hooks, browser-backed verification

---

## File Structure

### New files

- `src/peer/peerOnrampTypes.ts`
  - Local types for Peer availability, launch params, and completion events.
- `src/peer/peerConfig.ts`
  - Reads Peer feature flags and exposes whether live Peer top-up is allowed in the current deployment mode.
- `src/peer/peerOnramp.ts`
  - Small wrapper around `@zkp2p/sdk` install, connection, launch, and callback wiring.
- `scripts/check-vanta-peer-onramp-contract.mjs`
  - Contract/env check for Peer wiring and package script exposure.

### Files to modify

- `package.json`
  - Add a Peer contract-check command and wire it into broader verification if appropriate.
- `src/vite-env.d.ts`
  - Add typed Vite env declarations for Peer flags.
- `src/components/AppLayout.tsx`
  - Render the contextual funding block and drive the Peer launch flow.
- `src/data/context/WalletContext.tsx`
  - Expose `walletAddress` to `AppLayout` if not already destructured there.
- `scripts/check-vanta-wallet-picker.mjs`
  - Add static UI assertions for the new wallet-picker copy and guardrails.
- `scripts/check-vanta-mobile-browser.mjs`
  - Assert the funding block does not leak into unsupported mobile flow.
- `scripts/check-vanta-fresh-wallet-browser.mjs`
  - Keep fresh-wallet flow compatible with the new contextual funding block.
- `scripts/check-vanta-pay-browser.mjs`
  - Verify the broader app shell still passes with wallet-menu changes if the test touches shared header/menu behavior.

### Dependencies

- Add dependency: `@zkp2p/sdk`

---

### Task 1: Add Peer env and contract wiring

**Files:**
- Modify: `package.json`
- Modify: `src/vite-env.d.ts`
- Create: `scripts/check-vanta-peer-onramp-contract.mjs`

- [ ] **Step 1: Write the failing contract check**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const viteEnv = readFileSync(resolve(repoRoot, "src/vite-env.d.ts"), "utf8");

assert.equal(
  packageJson.scripts["peer:onramp-contract-check"],
  "node scripts/check-vanta-peer-onramp-contract.mjs",
  "package.json must expose peer:onramp-contract-check.",
);

assert.match(
  viteEnv,
  /VITE_VANTA_ENABLE_PEER_ONRAMP\\?: string;/u,
  "vite env declarations must include VITE_VANTA_ENABLE_PEER_ONRAMP.",
);

assert.match(
  viteEnv,
  /VITE_VANTA_ENABLE_LIVE_PEER_FUNDING\\?: string;/u,
  "vite env declarations must include VITE_VANTA_ENABLE_LIVE_PEER_FUNDING.",
);

console.log("vanta peer onramp contract check: PASS");
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `node scripts/check-vanta-peer-onramp-contract.mjs`
Expected: FAIL because the script and env declarations do not exist yet.

- [ ] **Step 3: Add env declarations**

```ts
interface ImportMetaEnv {
  readonly VITE_VANTA_ENABLE_PEER_ONRAMP?: string;
  readonly VITE_VANTA_ENABLE_LIVE_PEER_FUNDING?: string;
}
```

- [ ] **Step 4: Add package script wiring**

```json
{
  "peer:onramp-contract-check": "node scripts/check-vanta-peer-onramp-contract.mjs"
}
```

- [ ] **Step 5: Run the contract check**

Run: `npm run peer:onramp-contract-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json src/vite-env.d.ts scripts/check-vanta-peer-onramp-contract.mjs
git commit -m "chore: add peer onramp contract wiring"
```

### Task 2: Build the Peer integration boundary

**Files:**
- Create: `src/peer/peerOnrampTypes.ts`
- Create: `src/peer/peerConfig.ts`
- Create: `src/peer/peerOnramp.ts`

- [ ] **Step 1: Define the local types**

```ts
export type PeerOnrampAvailability =
  | "disabled"
  | "beta_blocked"
  | "unsupported_surface"
  | "needs_wallet"
  | "available";

export type PeerOnrampLaunchState =
  | "idle"
  | "install_required"
  | "connection_required"
  | "launching"
  | "opened"
  | "fulfilled"
  | "error";

export type PeerOnrampLaunchParams = {
  recipientAddress: string;
};

export type PeerOnrampFulfillment = {
  intentHash: `0x${string}`;
  bridgeStatus: "not_required" | "pending";
  trackingUrl: string | null;
};
```

- [ ] **Step 2: Add feature-flag and deployment gating**

```ts
import { isBetaMode } from "@/config/deploymentMode";

function readFlag(value: string | undefined) {
  return value?.trim() === "true";
}

export function getPeerOnrampConfig() {
  const enabled = readFlag(import.meta.env.VITE_VANTA_ENABLE_PEER_ONRAMP);
  const liveFundingEnabled = readFlag(import.meta.env.VITE_VANTA_ENABLE_LIVE_PEER_FUNDING);

  return {
    enabled,
    liveFundingEnabled,
    launchAllowed: enabled && (!isBetaMode || liveFundingEnabled),
  };
}
```

- [ ] **Step 3: Add the SDK wrapper**

```ts
import { peerExtensionSdk } from "@zkp2p/sdk";
import type {
  PeerOnrampFulfillment,
  PeerOnrampLaunchParams,
} from "./peerOnrampTypes";

export function isPeerDesktopSurface() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

export async function launchPeerOnramp(
  params: PeerOnrampLaunchParams,
  onFulfilled: (result: PeerOnrampFulfillment) => void,
) {
  const state = await peerExtensionSdk.getState();

  if (state === "needs_install") {
    peerExtensionSdk.openInstallPage();
    return "install_required" as const;
  }

  if (state === "needs_connection") {
    const approved = await peerExtensionSdk.requestConnection();
    if (!approved) {
      return "connection_required" as const;
    }
  }

  const unsubscribe = peerExtensionSdk.onIntentFulfilled((result) => {
    onFulfilled({
      bridgeStatus: result.bridge.status,
      intentHash: result.intentHash,
      trackingUrl: result.bridge.trackingUrl ?? null,
    });
    unsubscribe();
  });

  peerExtensionSdk.onramp({
    referrer: "Vanta",
    recipientAddress: params.recipientAddress,
    toToken: "792703809:11111111111111111111111111111111",
  });

  return "opened" as const;
}
```

- [ ] **Step 4: Run build to verify the new boundary compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/peer/peerOnrampTypes.ts src/peer/peerConfig.ts src/peer/peerOnramp.ts package.json
git commit -m "feat: add peer onramp integration boundary"
```

### Task 3: Gate the wallet picker on usable balance

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/data/context/WalletContext.tsx`
- Read: `src/solana/useWalletPublicAssets.ts`

- [ ] **Step 1: Add the failing wallet-picker assertions**

```js
assert.match(
  source,
  /No wallet funds detected/u,
  "Wallet picker must include the contextual Peer funding copy.",
);

assert.match(
  source,
  /Top up with Peer/u,
  "Wallet picker must include the Peer top-up CTA.",
);
```

- [ ] **Step 2: Run the wallet-picker check to verify it fails**

Run: `npm run wallet:picker-check`
Expected: FAIL because the Peer block is not rendered yet.

- [ ] **Step 3: Wire usable-balance detection into `AppLayout`**

```ts
const { walletAddress, solBalance } = useWalletState();
const { assets: walletPublicAssets, loading: walletAssetsLoading } = useWalletPublicAssets({
  solBalance,
  walletAddress,
});

const hasUsableBalance =
  (typeof solBalance === "number" && solBalance > 0) || walletPublicAssets.length > 0;
```

- [ ] **Step 4: Add the display rule**

```ts
const peerConfig = getPeerOnrampConfig();
const showPeerFundingBlock =
  peerConfig.launchAllowed &&
  isPeerDesktopSurface() &&
  !walletAssetsLoading &&
  (!walletConnected || !hasUsableBalance);
```

- [ ] **Step 5: Render the contextual funding block**

```tsx
{showPeerFundingBlock ? (
  <div className="wallet-picker__peer-funding" role="status">
    <div>
      <span>No wallet funds detected</span>
      <small>Connect, create a fresh wallet, or top up with Peer on desktop.</small>
    </div>
    <button type="button" onClick={handlePeerTopUp}>
      Top up with Peer
    </button>
  </div>
) : null}
```

- [ ] **Step 6: Run static verification**

Run:
- `npm run wallet:picker-check`
- `npm run build`

Expected:
- wallet picker check passes
- build passes

- [ ] **Step 7: Commit**

```bash
git add src/components/AppLayout.tsx src/data/context/WalletContext.tsx
git commit -m "feat: add contextual peer wallet top-up block"
```

### Task 4: Handle launch, install, connection, and callback states

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Read: `src/peer/peerOnramp.ts`

- [ ] **Step 1: Add local UI state for Peer launch**

```ts
const [peerLaunchState, setPeerLaunchState] = useState<PeerOnrampLaunchState>("idle");
const [peerLaunchMessage, setPeerLaunchMessage] = useState<string | null>(null);
```

- [ ] **Step 2: Implement the launch handler**

```ts
const handlePeerTopUp = async () => {
  if (!walletAddress) {
    setPeerLaunchState("error");
    setPeerLaunchMessage("Connect or create a wallet before starting Peer top-up.");
    return;
  }

  setPeerLaunchState("launching");
  setPeerLaunchMessage(null);

  try {
    const result = await launchPeerOnramp({ recipientAddress: walletAddress }, (fulfilled) => {
      setPeerLaunchState("fulfilled");
      setPeerLaunchMessage(
        fulfilled.bridgeStatus === "pending"
          ? "Peer funding submitted. Bridge delivery is still pending."
          : "Peer funding fulfilled for this wallet.",
      );
    });

    if (result === "install_required") {
      setPeerLaunchState("install_required");
      setPeerLaunchMessage("Install the Peer extension to continue on desktop.");
      return;
    }

    if (result === "connection_required") {
      setPeerLaunchState("connection_required");
      setPeerLaunchMessage("Approve the Peer connection request to continue.");
      return;
    }

    setPeerLaunchState(result);
  } catch (error) {
    setPeerLaunchState("error");
    setPeerLaunchMessage(error instanceof Error ? error.message : "Peer top-up could not be opened.");
  }
};
```

- [ ] **Step 3: Render compact launch feedback**

```tsx
{peerLaunchMessage ? (
  <div className="wallet-picker__peer-status" role="status">
    <span>Peer top-up</span>
    <small>{peerLaunchMessage}</small>
  </div>
) : null}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat: handle peer top-up wallet states"
```

### Task 5: Add browser-backed verification

**Files:**
- Modify: `scripts/check-vanta-mobile-browser.mjs`
- Modify: `scripts/check-vanta-wallet-picker.mjs`
- Modify: `scripts/check-vanta-fresh-wallet-browser.mjs`
- Modify: `scripts/check-vanta-pay-browser.mjs`

- [ ] **Step 1: Extend the wallet-picker browser/static checks**

```js
assert.match(source, /No wallet funds detected/u);
assert.match(source, /Top up with Peer/u);
```

```js
{ kind: "text_visible", text: "No wallet funds detected" },
{ kind: "text_visible", text: "Top up with Peer" },
```

- [ ] **Step 2: Add mobile negative assertions**

```js
{ kind: "text_hidden", text: "Top up with Peer" },
{ kind: "text_hidden", text: "No wallet funds detected" },
```

- [ ] **Step 3: Add beta-mode expectation**

```js
{ kind: "text_hidden", text: "Top up with Peer" }
```

Use beta env in the browser command so the test proves the feature does not contradict the current banner truth by default.

- [ ] **Step 4: Run verification**

Run:
- `npm run peer:onramp-contract-check`
- `npm run wallet:picker-check`
- `npm run mobile:browser-check`
- `npm run wallet:fresh-wallet-browser-check`
- `npm run pay:browser-check`
- `npm run build`

Expected:
- all checks pass
- mobile and beta flows do not expose a broken or dishonest Peer launch path

- [ ] **Step 5: Commit**

```bash
git add scripts/check-vanta-mobile-browser.mjs scripts/check-vanta-wallet-picker.mjs scripts/check-vanta-fresh-wallet-browser.mjs scripts/check-vanta-pay-browser.mjs
git commit -m "test: verify peer wallet top-up gating"
```

### Task 6: Final regression pass

**Files:**
- No new files

- [ ] **Step 1: Run the final regression set**

Run:
- `npm run peer:onramp-contract-check`
- `npm run wallet:picker-check`
- `npm run pay:browser-check`
- `npm run build`

Expected:
- all commands pass

- [ ] **Step 2: Commit the finished slice**

```bash
git add src/components/AppLayout.tsx src/peer src/vite-env.d.ts package.json scripts/check-vanta-peer-onramp-contract.mjs scripts/check-vanta-wallet-picker.mjs scripts/check-vanta-mobile-browser.mjs scripts/check-vanta-fresh-wallet-browser.mjs scripts/check-vanta-pay-browser.mjs
git commit -m "feat: add peer wallet top-up entry point"
```
