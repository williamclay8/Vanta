import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const helperSource = readFileSync("src/solana/userVaultOwner.ts", "utf8");
const shieldConfigSource = readFileSync("src/solana/shieldConfig.ts", "utf8");
const viteEnvSource = readFileSync("src/vite-env.d.ts", "utf8");

assert.match(
  helperSource,
  /PublicKey\.findProgramAddressSync/,
  "User vault owner derivation must use a Solana PDA, not ad hoc hashing.",
);
assert.match(
  helperSource,
  /liveDepositEnabled: false/,
  "Derived PDA user vaults must stay blocked for live deposits until a vault init/release program exists.",
);
assert.match(
  helperSource,
  /VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID/,
  "User vault derivation must be gated by an explicit program id env var.",
);
assert.match(
  helperSource,
  /productionCustodyReady: false/,
  "User vault owner resolution must keep production custody false until a program-owned vault path is deployed.",
);
assert.match(
  helperSource,
  /program-owned-vault-pda-not-deployed/,
  "Configured wallet vault owners must expose the program-owned vault blocker.",
);
assert.match(
  shieldConfigSource,
  /configuredVaultDerivationProgramId/,
  "Shield config must recognize the explicit user vault derivation program id.",
);
assert.doesNotMatch(
  shieldConfigSource,
  /MAINNET_SHIELD_VAULT_OWNER_FALLBACK|7yUfwUmZMYLg95xJGR762z4WpqfR6hBRqt9mcgNArtdi/,
  "Shield config must not silently fall back to a hard-coded regular-wallet vault owner.",
);
assert.match(
  shieldConfigSource,
  /program-vault-init-release-not-deployed/,
  "Shield config must block derived PDA vaults until the vault init/release program exists.",
);
assert.match(
  viteEnvSource,
  /VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID/,
  "Vite env typing must include the user vault derivation program id.",
);

console.log("Vanta user vault owner contract: PASS");
