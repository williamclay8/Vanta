import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(repoRoot, "SECURITY_LIMITATIONS.md"), "utf8");

const requiredPhrases = [
  "# Vanta Security Limitations",
  "Not mainnet-production ready",
  "Current private-settlement truth",
  "alpha-public-warning",
  "Render does not create privacy",
  "Known limitations",
  "Operator and infrastructure risks",
  "User-facing language rule",
  "Required before mainnet",
  "No audit claim",
  "No custody claim",
  "No anonymity-set claim",
  "Private Pool v2 anonymity-set readiness is now a checked fail-closed operator/readiness surface",
  "Status surfaces report productionReady: false",
  "Browser-exposed operator tokens are not production secrets",
  "Live mainnet submission mode can be enabled in bounded operator windows",
  "real-funds actions still require explicit approval",
  "Never request, store, or handle private keys, seed phrases, or keypair files",
];

for (const phrase of requiredPhrases) {
  if (!source.includes(phrase)) {
    throw new Error(`SECURITY_LIMITATIONS.md is missing required phrase: ${phrase}`);
  }
}

console.log("vanta security limitations: PASS");
