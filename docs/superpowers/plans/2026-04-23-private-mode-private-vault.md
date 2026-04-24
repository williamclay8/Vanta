# Private Mode Private Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first honest `Private Mode` shell in Vanta: a locally encrypted `Private Vault`, explicit public-wallet/private-vault product framing, and a one-click post-funding prompt that routes advanced users into Shield without weakening wallet safety.

**Architecture:** Keep the existing connected-wallet and safe-send boundary unchanged for all public-chain actions. Add a new private-mode state layer and local encrypted vault storage in focused files under `src/privateVault/`, then thread that state into the wallet menu, dashboard, and Shield/Unshield copy surfaces without pretending the deeper private-core ownership migration is already complete.

**Tech Stack:** React, TypeScript, Vite, Web Crypto, existing wallet context/hooks, existing browser/static verification scripts, existing wallet-signing and private-core verification commands

---

## File Structure

### New files

- `src/privateVault/privateVaultTypes.ts`
  - Product-facing types for vault records, session state, and wallet topology.
- `src/privateVault/privateVaultCrypto.ts`
  - Browser crypto helpers for deriving an encryption key, encrypting payloads, and decrypting them.
- `src/privateVault/privateVaultStorage.ts`
  - Device-local persistence helpers for the encrypted vault payload and metadata.
- `src/privateVault/privateVaultRecovery.ts`
  - Recovery-file serialization helpers for export/import.
- `src/data/context/PrivateVaultContext.tsx`
  - React context that owns private-mode enablement, vault lifecycle, unlock state, and one-click-prompt eligibility.
- `scripts/check-vanta-private-mode-contract.mjs`
  - Static contract checker for copy, topology labels, and required wiring.
- `scripts/check-vanta-private-mode-browser.mjs`
  - Browser-backed verification for the wallet menu, dashboard prompt, and Shield/Unshield framing.

### Existing files to modify

- `src/main.tsx`
  - Wrap app with the new `PrivateVaultProvider`.
- `src/components/AppLayout.tsx`
  - Add Private Mode entry, vault state, recovery reminders, and prompt surfacing in the wallet menu.
- `src/pages/AppDashboardPage.tsx`
  - Add split `Public wallet` / `Private Vault` status and one-click `Move this balance into private state` prompt.
- `src/pages/ShieldPage.tsx`
  - Reframe Shield as `Public wallet -> Private Vault`, gate the CTA off private-vault readiness, and prefill from the prompt.
- `src/pages/UnshieldPage.tsx`
  - Reframe Unshield as `Private Vault -> Public wallet`.
- `src/data/context/WalletContext.tsx`
  - Remove fresh-wallet naming drift from the first-class UX and make room for the new private-vault topology state.
- `src/solana/freshWallet.ts`
  - Reuse only the recovery/export shape where appropriate or keep it separate with clearer naming.
- `src/styles.css`
  - Add styles for private-vault cards, status pills, and prompt surfaces.
- `src/vite-env.d.ts`
  - Add typed env declarations if a private-mode feature flag is introduced.
- `package.json`
  - Add `private-mode` verification commands.
- `scripts/check-vanta-wallet-picker.mjs`
  - Extend static assertions for private-mode copy and wallet-menu states.
- `scripts/check-vanta-fresh-wallet-browser.mjs`
  - Update browser checks to reflect renamed/relocated UX around vault creation and recovery.
- `scripts/check-vanta-wallet-browser-signing-safety.mjs`
  - Keep wallet-signing truths aligned if wallet menu wording changes.
- `docs/superpowers/specs/2026-04-23-private-mode-private-vault-design.md`
  - Update only if the implementation reveals a spec contradiction.

---

### Task 1: Add Private Vault Types, Crypto, and Storage

**Files:**
- Create: `src/privateVault/privateVaultTypes.ts`
- Create: `src/privateVault/privateVaultCrypto.ts`
- Create: `src/privateVault/privateVaultStorage.ts`
- Create: `src/privateVault/privateVaultRecovery.ts`
- Test: `scripts/check-vanta-private-mode-contract.mjs`

- [ ] **Step 1: Write the failing static contract check**

```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const typesSource = read("src/privateVault/privateVaultTypes.ts");
const cryptoSource = read("src/privateVault/privateVaultCrypto.ts");
const storageSource = read("src/privateVault/privateVaultStorage.ts");
const recoverySource = read("src/privateVault/privateVaultRecovery.ts");

assert.match(typesSource, /export type PrivateVaultRecord = \{/u);
assert.match(typesSource, /export type ActiveWalletTopology = \{/u);
assert.match(typesSource, /export type PrivateVaultSessionState = \{/u);
assert.match(cryptoSource, /export async function encryptPrivateVaultPayload/u);
assert.match(cryptoSource, /export async function decryptPrivateVaultPayload/u);
assert.match(storageSource, /PRIVATE_VAULT_STORAGE_KEY/u);
assert.match(storageSource, /savePrivateVaultRecord/u);
assert.match(storageSource, /loadPrivateVaultRecord/u);
assert.match(recoverySource, /export function createPrivateVaultRecoveryFile/u);

console.log("vanta private mode contract check: PASS");
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `node scripts/check-vanta-private-mode-contract.mjs`
Expected: FAIL with `ENOENT`, `Cannot find module`, or missing-file assertions because the new files do not exist yet.

- [ ] **Step 3: Add the minimal type definitions**

```ts
export type PrivateVaultRecord = {
  vaultId: string;
  createdAt: string;
  custody: "browser-generated" | "imported";
  derivationVersion: "v1";
  encryptedPayload: string;
  recoveryFileVersion: "vanta-private-vault-recovery-v1";
  status: "locked" | "unlocked" | "recovery-required";
  capabilityLabels: string[];
};

export type ActiveWalletTopology = {
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

export type PrivateVaultSessionState = {
  privateModeEnabled: boolean;
  vaultReady: boolean;
  vaultRecoveryDownloaded: boolean;
  vaultUnlocked: boolean;
  oneClickPromptEligible: boolean;
};
```

- [ ] **Step 4: Add minimal browser crypto and storage helpers**

```ts
const encoder = new TextEncoder();

export async function encryptPrivateVaultPayload(payload: string, password: string) {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payload));
  return JSON.stringify({
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
  });
}
```

```ts
export const PRIVATE_VAULT_STORAGE_KEY = "vanta.privateVault.v1";

export function savePrivateVaultRecord(record: PrivateVaultRecord) {
  window.localStorage.setItem(PRIVATE_VAULT_STORAGE_KEY, JSON.stringify(record));
}

export function loadPrivateVaultRecord(): PrivateVaultRecord | null {
  const raw = window.localStorage.getItem(PRIVATE_VAULT_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PrivateVaultRecord) : null;
}
```

- [ ] **Step 5: Run the contract check to verify it passes**

Run: `node scripts/check-vanta-private-mode-contract.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/check-vanta-private-mode-contract.mjs src/privateVault/privateVaultTypes.ts src/privateVault/privateVaultCrypto.ts src/privateVault/privateVaultStorage.ts src/privateVault/privateVaultRecovery.ts
git commit -m "feat: add private vault crypto and storage primitives"
```

---

### Task 2: Add PrivateVaultContext and Topology State

**Files:**
- Create: `src/data/context/PrivateVaultContext.tsx`
- Modify: `src/main.tsx`
- Modify: `src/data/context/WalletContext.tsx`
- Test: `scripts/check-vanta-private-mode-contract.mjs`

- [ ] **Step 1: Extend the contract check with context assertions**

```js
const contextSource = read("src/data/context/PrivateVaultContext.tsx");
const mainSource = read("src/main.tsx");

assert.match(contextSource, /export function PrivateVaultProvider/u);
assert.match(contextSource, /export function usePrivateVaultState/u);
assert.match(contextSource, /enablePrivateMode/u);
assert.match(contextSource, /createPrivateVault/u);
assert.match(contextSource, /downloadPrivateVaultRecoveryFile/u);
assert.match(contextSource, /activeWalletTopology/u);
assert.match(mainSource, /<PrivateVaultProvider>/u);
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `node scripts/check-vanta-private-mode-contract.mjs`
Expected: FAIL because `PrivateVaultContext.tsx` and provider wiring do not exist yet.

- [ ] **Step 3: Add the context with minimal state and actions**

```tsx
type PrivateVaultContextValue = {
  privateModeEnabled: boolean;
  vaultRecord: PrivateVaultRecord | null;
  activeWalletTopology: ActiveWalletTopology;
  sessionState: PrivateVaultSessionState;
  enablePrivateMode: () => void;
  disablePrivateMode: () => void;
  createPrivateVault: (password: string) => Promise<void>;
  downloadPrivateVaultRecoveryFile: () => void;
};

const PrivateVaultContext = createContext<PrivateVaultContextValue | null>(null);

export function PrivateVaultProvider({ children }: { children: ReactNode }) {
  const { walletAddress, walletConnected } = useWalletState();
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false);
  const [vaultRecord, setVaultRecord] = useState<PrivateVaultRecord | null>(loadPrivateVaultRecord());
  const [vaultRecoveryDownloaded, setVaultRecoveryDownloaded] = useState(false);

  const activeWalletTopology = {
    fundingWallet: { kind: "connected-wallet" as const, address: walletAddress, connected: walletConnected },
    privateVault: vaultRecord ? { vaultId: vaultRecord.vaultId, status: vaultRecord.status } : null,
  };
```

- [ ] **Step 4: Wrap the app in the new provider**

```tsx
root.render(
  <StrictMode>
    <WalletProvider>
      <PrivateVaultProvider>
        <RouterProvider router={router} />
      </PrivateVaultProvider>
    </WalletProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Run the build and contract check**

Run: `npm run build && node scripts/check-vanta-private-mode-contract.mjs`
Expected: TypeScript build succeeds and the contract check prints `PASS`

- [ ] **Step 6: Commit**

```bash
git add src/data/context/PrivateVaultContext.tsx src/main.tsx src/data/context/WalletContext.tsx scripts/check-vanta-private-mode-contract.mjs
git commit -m "feat: add private vault context and wallet topology state"
```

---

### Task 3: Add Private Mode Entry and Recovery UX in the Wallet Menu

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/styles.css`
- Modify: `scripts/check-vanta-wallet-picker.mjs`
- Modify: `scripts/check-vanta-fresh-wallet-browser.mjs`
- Test: `scripts/check-vanta-wallet-picker.mjs`
- Test: `scripts/check-vanta-fresh-wallet-browser.mjs`

- [ ] **Step 1: Add failing static assertions for private-mode wallet-menu copy**

```js
requireIncludes(
  appLayout,
  "Enable Private Mode",
  "Wallet menu must expose the advanced opt-in private-mode entry.",
);
requireIncludes(
  appLayout,
  "Private Vault ready on this device",
  "Wallet menu must acknowledge successful private-vault setup.",
);
requireIncludes(
  appLayout,
  "Download recovery file",
  "Wallet menu must require recovery export from the private vault surface.",
);
```

- [ ] **Step 2: Run the wallet-menu check to verify it fails**

Run: `npm run wallet:picker-check`
Expected: FAIL on the new private-mode copy assertions.

- [ ] **Step 3: Add the private-mode section to the wallet menu**

```tsx
const {
  enablePrivateMode,
  privateModeEnabled,
  sessionState,
  vaultRecord,
  downloadPrivateVaultRecoveryFile,
} = usePrivateVaultState();

<div className="wallet-picker__section">
  <span className="wallet-picker__section-label">Private Mode</span>
  {!privateModeEnabled ? (
    <div className="wallet-picker__fresh">
      <div>
        <span>Enable Private Mode</span>
        <small>Keep your connected wallet public while Vanta uses a Private Vault for private activity.</small>
      </div>
      <button type="button" onClick={enablePrivateMode}>Enable</button>
    </div>
  ) : (
    <div className="wallet-picker__fresh-result" role="status">
      <span>Private Vault ready on this device</span>
      <small>{sessionState.vaultRecoveryDownloaded ? "Recovery file downloaded" : "Download recovery file before first private-state move."}</small>
      <button type="button" onClick={downloadPrivateVaultRecoveryFile}>Download recovery file</button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Add browser assertions for the new wallet-menu state**

```js
{ kind: "text_visible", text: "Enable Private Mode" },
{ kind: "text_visible", text: "Private Vault" },
{ kind: "text_visible", text: "Download recovery file" },
```

- [ ] **Step 5: Run the narrow checks**

Run: `npm run wallet:picker-check && npm run wallet:fresh-wallet-browser-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/AppLayout.tsx src/styles.css scripts/check-vanta-wallet-picker.mjs scripts/check-vanta-fresh-wallet-browser.mjs
git commit -m "feat: add private mode entry to wallet menu"
```

---

### Task 4: Add Dashboard Split View and One-Click Post-Funding Prompt

**Files:**
- Modify: `src/pages/AppDashboardPage.tsx`
- Modify: `src/styles.css`
- Create: `scripts/check-vanta-private-mode-browser.mjs`
- Modify: `package.json`
- Test: `scripts/check-vanta-private-mode-browser.mjs`

- [ ] **Step 1: Write the failing browser verification**

```js
assertScenario("dashboard private mode prompt", [
  { kind: "text_visible", text: "Public wallet" },
  { kind: "text_visible", text: "Private Vault" },
  { kind: "text_visible", text: "Move this balance into private state" },
]);
```

- [ ] **Step 2: Run the browser verification to verify it fails**

Run: `node scripts/check-vanta-private-mode-browser.mjs`
Expected: FAIL because the dashboard does not yet render the split status or prompt.

- [ ] **Step 3: Add split wallet/vault cards and the one-click prompt**

```tsx
const { activeWalletTopology, privateModeEnabled, sessionState } = usePrivateVaultState();
const showPrivatePrompt =
  privateModeEnabled &&
  sessionState.vaultUnlocked &&
  walletConnected &&
  shieldedBalance === 0 &&
  account?.balance === 0 &&
  activeWalletTopology.privateVault !== null;

<div className="dashboard-topology-card">
  <article>
    <span>Public wallet</span>
    <strong>{walletConnected ? "Connected" : "Not connected"}</strong>
  </article>
  <article>
    <span>Private Vault</span>
    <strong>{sessionState.vaultReady ? "Ready on this device" : "Not set up"}</strong>
  </article>
</div>

{showPrivatePrompt ? (
  <div className="dashboard-private-prompt">
    <h3>Move this balance into private state</h3>
    <p>Your connected wallet stays public. Your Private Vault holds your private activity inside Vanta.</p>
    <Link className="button button-primary" to="/app/shield?intent=private-mode">Move into private state</Link>
  </div>
) : null}
```

- [ ] **Step 4: Add the npm script for the new browser check**

```json
"private-mode:browser-check": "node scripts/check-vanta-private-mode-browser.mjs"
```

- [ ] **Step 5: Run build and the new browser check**

Run: `npm run build && npm run private-mode:browser-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/AppDashboardPage.tsx src/styles.css scripts/check-vanta-private-mode-browser.mjs package.json package-lock.json
git commit -m "feat: add dashboard private mode prompt"
```

---

### Task 5: Reframe Shield and Unshield Around Public Wallet and Private Vault

**Files:**
- Modify: `src/pages/ShieldPage.tsx`
- Modify: `src/pages/UnshieldPage.tsx`
- Modify: `scripts/check-vanta-private-mode-browser.mjs`
- Modify: `scripts/check-vanta-wallet-browser-signing-safety.mjs`
- Test: `scripts/check-vanta-private-mode-browser.mjs`
- Test: `scripts/check-vanta-wallet-browser-signing-safety.mjs`

- [ ] **Step 1: Extend the browser verification with the new framing**

```js
assertScenario("shield private vault framing", [
  { kind: "text_visible", text: "From: Public wallet" },
  { kind: "text_visible", text: "To: Private Vault" },
  { kind: "text_visible", text: "Move into private state" },
]);

assertScenario("unshield private vault framing", [
  { kind: "text_visible", text: "Return to public wallet" },
  { kind: "text_visible", text: "Destination wallet" },
]);
```

- [ ] **Step 2: Run the browser verification to verify it fails**

Run: `npm run private-mode:browser-check`
Expected: FAIL because Shield and Unshield still use the old product wording.

- [ ] **Step 3: Reframe Shield around the new authorities**

```tsx
<div className="shield-topology-summary" role="status">
  <span>From: Public wallet</span>
  <small>{walletAddressShort ?? "Connected wallet required"}</small>
  <span>To: Private Vault</span>
  <small>{sessionState.vaultReady ? "Ready on this device" : "Set up Private Vault first"}</small>
</div>

<button disabled={!sessionState.vaultUnlocked || !isAmountValid} type="submit">
  Move into private state
</button>
```

- [ ] **Step 4: Reframe Unshield around return-to-public-wallet language**

```tsx
<div className="unshield-topology-summary" role="status">
  <span>Return to public wallet</span>
  <small>Destination wallet: {walletAddressShort ?? "Connect wallet"}</small>
</div>
```

- [ ] **Step 5: Run the narrow checks**

Run: `npm run private-mode:browser-check && npm run wallet:browser-signing-safety-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/ShieldPage.tsx src/pages/UnshieldPage.tsx scripts/check-vanta-private-mode-browser.mjs scripts/check-vanta-wallet-browser-signing-safety.mjs
git commit -m "feat: reframe shield and unshield for private mode"
```

---

### Task 6: Add Final Contract Checks and Full Verification

**Files:**
- Modify: `scripts/check-vanta-private-mode-contract.mjs`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-04-23-private-mode-private-vault-design.md` if and only if implementation truth diverged

- [ ] **Step 1: Add the final script wiring check**

```js
const packageJson = JSON.parse(read("package.json"));

assert.equal(
  packageJson.scripts["private-mode:browser-check"],
  "node scripts/check-vanta-private-mode-browser.mjs",
);
assert.equal(
  packageJson.scripts["private-mode:contract-check"],
  "node scripts/check-vanta-private-mode-contract.mjs",
);
```

- [ ] **Step 2: Run the contract check to verify it fails**

Run: `node scripts/check-vanta-private-mode-contract.mjs`
Expected: FAIL until the new npm script wiring exists.

- [ ] **Step 3: Add final package.json script wiring**

```json
"private-mode:contract-check": "node scripts/check-vanta-private-mode-contract.mjs",
"private-mode:browser-check": "node scripts/check-vanta-private-mode-browser.mjs"
```

- [ ] **Step 4: Run the full honest verification bundle**

Run: `npm run build && npm run private-mode:contract-check && npm run private-mode:browser-check && npm run wallet:picker-check && npm run wallet:fresh-wallet-check && npm run wallet:fresh-wallet-browser-check && npm run wallet:browser-signing-safety-check`
Expected: PASS

- [ ] **Step 5: Escalate to the stronger private-core command if ownership wiring moved**

Run: `npm run private-core:check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/check-vanta-private-mode-contract.mjs docs/superpowers/specs/2026-04-23-private-mode-private-vault-design.md
git commit -m "chore: verify private mode private vault flow"
```

---

## Self-Review

### Spec coverage

- Optional advanced-user `Private Mode`: covered by Tasks 2 and 3.
- Local encrypted `Private Vault`: covered by Tasks 1 and 2.
- Required recovery export/download: covered by Tasks 1 and 3.
- One-click post-funding prompt: covered by Task 4.
- Shield/Unshield reframing around `Public wallet` and `Private Vault`: covered by Task 5.
- Honest verification and preserved wallet-signing safety: covered by Task 6.

No uncovered spec sections remain for the intended first-phase implementation.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain in the task steps.
- Every task has exact files, commands, and concrete code snippets.

### Type consistency

- `PrivateVaultRecord`, `ActiveWalletTopology`, and `PrivateVaultSessionState` are introduced in Task 1 and reused with the same names later.
- `private-mode:contract-check` and `private-mode:browser-check` are introduced once and reused consistently.
