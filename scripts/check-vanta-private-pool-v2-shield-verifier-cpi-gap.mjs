#!/usr/bin/env node
// Vanta Private Pool v2 — Shield verifier CPI gap check.
//
// Background (added 2026-05-25, post-delta-audit observation
// VANTA-PPA-NEW-001):
//
// Historically, `process_shield` (TAG_SHIELD = 8) accepted a depositor's
// `shield_public_input_hash` and `output_commitment` but did not invoke any
// Shield verifier CPI before the SystemProgram::transfer / spl_token
// transfer_checked that moves funds into the program-owned PDA vault.
//
// Today this is safe-because-dead: there is no production setter for
// `pool_state.verifier_wired`, so the runtime gate at
// `require_pool_verifier_wired(...)` always rejects.
//
// The risk was that any future diff adding a `verifier_wired` setter and
// flipping the flag to 1, without also adding a Shield verifier CPI here,
// would silently permit unverified shields. This guard now prevents that
// regression while the path remains blocked on accepted production verifier
// evidence.
//
// This guard now requires the promoted fail-closed CPI-wired posture:
//
//  1. The defensive marker `VANTA-PPA-NEW-001` is gone.
//  2. A Shield verifier CPI adapter is present in `process_shield`.
//  3. No live setter for the `verifier_wired` byte exists in the program
//     source (this matches the `runtime-verifier-wired-gate-check`
//     posture).
//  4. The runtime verifier_wired gate is still present, so the path remains
//     unreachable until the accepted production evidence chain exists.

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

// (1) Gap marker must be removed once the CPI is wired.
const markerOccurrences = (
  programSource.match(/VANTA-PPA-NEW-001 \(shield-verifier-cpi-gap\)/g) ?? []
).length;
if (markerOccurrences !== 0) {
  fail(
    `expected VANTA-PPA-NEW-001 markers to be removed after Shield verifier CPI wiring, found ${markerOccurrences} occurrence(s)`,
  );
}

// (2) Shield verifier CPI must be wired before vault transfer.
const requiredCpiMarkers = [
  "verify_shield_with_proof_adapter(&verified, verifier_program)?;",
  "fn shield_verifier_cpi_instruction(",
  "fn require_shield_public_witness_binding(",
];
for (const marker of requiredCpiMarkers) {
  if (!programSource.includes(marker)) {
    fail(`missing Shield verifier CPI marker: ${marker}`);
  }
}

// (3) No live verifier_wired setter. Anything that writes a non-zero byte
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

// (4) Verifier_wired gate is still present immediately above the marker.
// Defense-in-depth: if someone deletes the runtime gate, this path becomes
// reachable before C01 evidence closure.
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

console.log("Vanta Private Pool v2 Shield verifier CPI gap check: PASS-cpi-wired");
console.log(
  "Evidence: process_shield now requires a Shield verifier CPI adapter before vault transfer, VANTA-PPA-NEW-001 markers are removed, no live verifier_wired setter exists, and the runtime verifier_wired gate remains present. Production claims still require accepted C01 artifact, adapter, SBF/live lineage, and audit evidence.",
);
