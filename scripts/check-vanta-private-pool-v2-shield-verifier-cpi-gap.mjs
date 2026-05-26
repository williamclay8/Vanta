#!/usr/bin/env node
// Vanta Private Pool v2 — Shield verifier CPI gap check.
//
// Background (added 2026-05-25, post-delta-audit observation
// VANTA-PPA-NEW-001):
//
// `process_shield` (TAG_SHIELD = 8) in
// `programs/vanta_private_pool_v2_spend/src/lib.rs` accepts a depositor's
// `shield_public_input_hash` and `output_commitment` but does NOT invoke
// any Shield verifier CPI before the SystemProgram::transfer / spl_token
// transfer_checked that moves funds into the program-owned PDA vault.
//
// Today this is safe-because-dead: there is no production setter for
// `pool_state.verifier_wired`, so the runtime gate at
// `require_pool_verifier_wired(...)` always rejects.
//
// The risk: any future diff that adds a `verifier_wired` setter and flips
// the flag to 1 — without ALSO adding a Shield verifier CPI here — would
// silently permit unverified shields. A depositor's lamports would still
// land in the PDA, but their resulting note would have an unproven
// `output_commitment` that may not be redeemable once the verifier is
// actually wired downstream.
//
// This guard fail-closes against three conditions that together would let
// the gap silently widen:
//
//  1. The defensive marker `VANTA-PPA-NEW-001` is present in
//     `process_shield` (one occurrence per asset branch).
//  2. No live setter for the `verifier_wired` byte exists in the program
//     source (this matches the `runtime-verifier-wired-gate-check`
//     posture).
//  3. No Shield verifier CPI is present yet (the script records the
//     gap-acknowledged state and will need to be updated to
//     `cpi-wired` mode when the verifier is added).
//
// To promote: when the Shield verifier CPI is added to `process_shield`,
// (a) remove the `VANTA-PPA-NEW-001` markers, (b) update this script to
// require the CPI instead, (c) bump status to `PASS-cpi-wired`.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const programPath = resolve(
  repoRoot,
  "programs/vanta_private_pool_v2_spend/src/lib.rs",
);
const programSource = readFileSync(programPath, "utf8");

function fail(message) {
  console.error(`Shield verifier CPI gap check: FAIL — ${message}`);
  process.exit(1);
}

// (1) Marker present in both branches of process_shield.
const markerOccurrences = (
  programSource.match(/VANTA-PPA-NEW-001 \(shield-verifier-cpi-gap\)/g) ?? []
).length;
if (markerOccurrences < 2) {
  fail(
    `expected VANTA-PPA-NEW-001 marker in both SOL and SPL branches of process_shield, found ${markerOccurrences} occurrence(s)`,
  );
}

// (2) No live verifier_wired setter. Anything that writes a non-zero byte
// to POOL_VERIFIER_WIRED_OFFSET outside the existing init (which writes 0)
// or a #[cfg(test)] block would create the conditions for this gap to
// become exploitable.
const forbiddenSetterMarkers = [
  "fn process_set_verifier_wired",
  "TAG_SET_VERIFIER_WIRED",
];
for (const marker of forbiddenSetterMarkers) {
  if (programSource.includes(marker)) {
    fail(
      `program source contains a verifier_wired setter (${marker}); update this guard to require the Shield verifier CPI before allowing the setter to land`,
    );
  }
}

// (3) Shield verifier CPI not yet wired. When the CPI is added the
// markers should be removed and this script should be updated to require
// the CPI instead.
const cpiPresenceMarkers = [
  "shield_verifier_cpi",
  "invoke_shield_verifier_program",
];
for (const marker of cpiPresenceMarkers) {
  if (programSource.includes(marker)) {
    fail(
      `Shield verifier CPI marker '${marker}' found in source — remove the VANTA-PPA-NEW-001 gap markers and update this guard to require the CPI invocation explicitly (status should be PASS-cpi-wired)`,
    );
  }
}

// (4) Verifier_wired gate is still present immediately above the marker.
// Defense-in-depth: if someone deletes the runtime gate, the gap becomes
// reachable today, not just at future-setter time.
const expectedGateMarkers = [
  "require_pool_verifier_wired(&pool_data, ERR_PROOF_VERIFIER_NOT_WIRED)?;",
];
for (const marker of expectedGateMarkers) {
  if (!programSource.includes(marker)) {
    fail(
      `runtime verifier_wired gate '${marker}' missing from process_shield; the gap-acknowledgement posture depends on this gate staying in place`,
    );
  }
}

console.log("Vanta Private Pool v2 Shield verifier CPI gap check: PASS-acknowledging-gap");
console.log(
  "Evidence: process_shield carries VANTA-PPA-NEW-001 markers in both asset branches, no live verifier_wired setter exists, no Shield verifier CPI is wired yet, and the runtime verifier_wired gate is still present. The path is safe-because-dead today; the FIRST diff to add a verifier_wired setter must also wire a Shield verifier CPI here, remove the markers, and update this guard to PASS-cpi-wired mode.",
);
