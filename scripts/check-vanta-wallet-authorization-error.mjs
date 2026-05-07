import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import {
  VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE,
  isVantaWalletAuthorizationError,
  toVantaWalletAuthorizationRecoveryMessage,
} from "../src/wallet/walletAuthorizationError.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
const clientSource = readFileSync(resolve(repoRoot, "src/solana/client.ts"), "utf8");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");

const providerUnauthorizedError = {
  code: 4100,
  message: "The requested method and/or account has not been authorized by the user.",
};
const nestedProviderUnauthorizedError = new Error("Wallet request failed", {
  cause: providerUnauthorizedError,
});

assert.equal(isVantaWalletAuthorizationError(providerUnauthorizedError), true);
assert.equal(isVantaWalletAuthorizationError(nestedProviderUnauthorizedError), true);
assert.equal(isVantaWalletAuthorizationError(new Error("insufficient funds")), false);
assert.equal(
  toVantaWalletAuthorizationRecoveryMessage(providerUnauthorizedError),
  VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE,
);
assert.ok(
  VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE.includes("Disconnect and reconnect"),
  "Wallet authorization recovery copy must tell the user how to recover.",
);
assert.ok(
  VANTA_WALLET_AUTHORIZATION_RECOVERY_MESSAGE.includes("Solana account"),
  "Wallet authorization recovery copy must keep the failure scoped to the Solana account.",
);

assert.ok(
  shieldSource.includes("toVantaWalletAuthorizationRecoveryMessage"),
  "Shield must normalize wallet authorization failures before surfacing provider text.",
);
assert.ok(
  clientSource.includes("walletSupportsVantaSolanaSigning"),
  "Wallet discovery must keep a Solana signing capability filter.",
);
assert.ok(
  clientSource.includes("watchVantaWalletStandardConnectors"),
  "The live wallet watcher must share the same Solana signing capability filter.",
);
assert.ok(
  appSource.includes("watchVantaWalletStandardConnectors"),
  "The app root must use Vanta's filtered Solana wallet watcher.",
);

console.log("Vanta wallet authorization error check: PASS");
