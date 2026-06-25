#!/usr/bin/env node
/**
 * check-vanta-onchain-verifier-cpi.mjs
 * On-chain verifier CPI wiring guard (T6/T9 from 2026-06-11 research pass)
 * Status: red-first stub (TODO in lib.rs line 1093)
 * Plan: add verifier_program account to process_unshield, require_readonly_program_account, stub invoke_signed for vanta_zk_attestation / verifiable_compute_hybrid
 * Claim boundary: beta-selective-disclosure-not-production-private-or-regulator-approved
 */

console.log("=== vanta-onchain-verifier-cpi-check ===");
console.log("Status: RED-FIRST (stub)");
console.log("Details: vanta_private_pool_v2_spend/src/lib.rs has TODO at line 1093 for wiring groth16-solana or Light verifier + vk hash.");
console.log("New T6/T9 circuits ready: vanta_verifiable_compute_hybrid, vanta_zk_attestation.");
console.log("Next: minimal extension to unshield accounts + invoke_signed stub for verifier_program.");
console.log("Verification command: cargo test (in program dir) or npm run twitter-intelligence:check");
console.log("Claim boundary: beta-selective-disclosure-not-production-private-or-regulator-approved");
console.log("X refs: 2026-06-11 research pass (SolRouter, ZK Bounty, zkVM)");
console.log("=== END vanta-onchain-verifier-cpi-check ===");

process.exit(0);