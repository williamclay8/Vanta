import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const managerPath = resolve(repoRoot, "scripts/vanta-wallet-manager.mjs");
const registryPath = `${homedir()}/.config/vanta/wallet-manager.json`;

const check = spawnSync(process.execPath, [managerPath, "check"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(check.status, 0, check.stderr || check.stdout);
assert.match(check.stdout, /Vanta wallet manager check: PASS/u);

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
assert.equal(registry.version, "vanta-wallet-manager-0.1");
assert.equal(registry.secretPolicy, "refs-only-no-private-key-bytes");

const text = JSON.stringify(registry);
assert.ok(!text.includes("[["), "Wallet manager registry must not include nested keypair arrays.");
assert.ok(!/"secretKey"/u.test(text), "Wallet manager registry must not include secretKey.");
assert.ok(!/"privateKey"/u.test(text), "Wallet manager registry must not include privateKey.");
assert.ok(!/"seedPhrase"/u.test(text), "Wallet manager registry must not include seedPhrase.");

const ids = new Set(registry.wallets.map((wallet) => wallet.id));
assert.ok(ids.has("mainnet-spend-program-deployer"));
assert.ok(ids.has("mainnet-spend-program-id"));
assert.ok(ids.has("mainnet-relayer-fee-payer"));
assert.ok(ids.has("mainnet-cli-wallet"));

console.log("Vanta wallet manager contract check: PASS");
