import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(repoRoot, "SECURITY_LIMITATIONS.md"), "utf8");

const requiredPhrases = [
  "# Vanta Security Limitations",
  "Last validated against repo-local code: 2026-05-13",
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
  "local-bb-fixture-artifact",
  "local-bb-derived-artifact",
  "Shield, Claim, Swap-to-shielded, actual-private-spend, and Send",
  "shield-public-input-hash",
  "claim-public-input-hash",
  "swap-public-input-hash",
  "private-spend-public-input-hash",
  "send-public-input-hash",
  "actual-private-spend and Send",
  "local actual-private-spend witness-input proof path",
  "dev-only Send browser/Web Worker proof-execution path",
  "dev-only actual-private-spend browser/Web Worker proof-execution path",
  "generate a Send witness in the worker from typed witness input using NoirJS",
  "generate an actual-private-spend witness in the worker from typed witness input using NoirJS",
  "return a no-witness actual-private-spend `local-bb-derived-artifact`",
  "not wired into live actual-private-spend execution",
  "not a production browser runtime prover",
  "reserved Private Pool v2 tag `3` proof-carrying spend ABI is source/local rebuilt-SBF fail-closed scaffolding",
  "preflights the root/root-record/nullifier/output/verifier-key account contract and then returns custom error `14` before proof verification, account creation, nullifier/output mutation, or spend acceptance",
  "TAG_REGISTER_PROVENANCED_ROOT = 4",
  "program-owned root provenance record",
  "not proof that the root transition is correct",
  "offchain-remote-proof-artifact-only",
  "solana-c01-groth16-verifier-ready",
  "Solana tag `3` Groth16 verifier-ready evidence",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "reserved source-only `TAG_UNSHIELD = 6` ABI now validates a root/root-record/nullifier/vault-authority preflight and then fails closed before nullifier consume, proof verification, token/system CPI, custody transfer, or fund release",
  "transition-field drift",
  "request-metadata drift",
  "malformed local ACIR metadata",
  "proof-result tampering",
  "Private Pool v2 anonymity-set readiness is now a checked fail-closed operator/readiness surface",
  "Shield privacy readiness is now a checked fail-closed surface at `npm run shield:privacy-readiness-check`",
  "production key-custody evidence",
  "constrains Send economics witnesses to `u128` before Poseidon field encoding",
  "binds recipient/change memo ciphertext body hash fields into the Send public-input hash",
  "Private Pool v2 Swap now has a local proof-request boundary, executable circuit fixture/check, checked committed protocol settlement path, and checked local verifier/indexer atomic mutation",
  "This is not yet production private Swap because quote and route privacy before operator settlement, relayer separation, anonymity-set evidence, audit, production evidence, and live venue privacy remain blocked.",
  "Private Pool v2 Unshield now has a local proof-request boundary, committed-economics protocol/operator acceptance",
  "checked local verifier/indexer atomic exit mutation",
  "rejecting raw destination/asset/amount/owner on that committed path",
  "Private Pool v2 protocol Send/Swap/Unshield can use committed-economics settlement requests and receipts",
  "The `/v1/checkout/sessions/{id}/complete` endpoint is still a local test-harness completion unless it carries explicit typed customer payment evidence",
  "`solana:signature:<base58-signature>`",
  "customer-side wallet payment evidence is not wired for production",
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
