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
  shieldConfigSource,
  /configuredVaultDerivationProgramId/,
  "Shield config must recognize the explicit user vault derivation program id.",
);
assert.match(
  viteEnvSource,
  /VITE_VANTA_VAULT_DERIVATION_PROGRAM_ID/,
  "Vite env typing must include the user vault derivation program id.",
);

console.log("Vanta user vault owner contract: PASS");
