#!/usr/bin/env node
// Vanta PQC hybrid viewing-key memo contract check.
//
// Background: PPA-PQC-001 (see
// docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/
// 2026-05-25-ppa-pqc-001-hybrid-viewing-key-memo-plan.md).
//
// The hybrid X25519 + ML-KEM-768 KEM construction is not implemented
// yet. This guard asserts the design-contract module is in place,
// keeps its negative-claim boundary intact, and fail-closes if anyone
// tries to silently promote the path to live without (a) producing the
// required reviewer evidence packets, (b) extending the live AEAD
// envelope, and (c) updating this guard's expectations.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(
  repoRoot,
  "src/privacy/vantaShieldViewingKeyPqcHybridContract.mjs",
);
const trackerNotePath = resolve(
  repoRoot,
  "docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/2026-05-25-ppa-pqc-001-hybrid-viewing-key-memo-plan.md",
);
const threatModelPath = resolve(repoRoot, "docs/threat-model.md");
const liveViewingKeyPath = resolve(
  repoRoot,
  "src/solana/vantaShieldViewingKey.ts",
);

function fail(message) {
  console.error(`PQC hybrid viewing-key contract check: FAIL — ${message}`);
  process.exit(1);
}

if (!existsSync(contractPath)) {
  fail(`design-contract module missing at ${contractPath}`);
}
if (!existsSync(trackerNotePath)) {
  fail(`tracker note missing at ${trackerNotePath}`);
}
if (!existsSync(threatModelPath)) {
  fail(`threat model missing at ${threatModelPath}`);
}

const contractSource = readFileSync(contractPath, "utf8");
const threatModelSource = readFileSync(threatModelPath, "utf8");

// (1) Required exports are present.
const requiredExports = [
  "VANTA_SHIELD_VIEWING_KEY_HYBRID_CONTRACT_VERSION",
  "KEY_SCHEME_VERSION",
  "HYBRID_BOUNDARY",
  "FORBIDDEN_PERSISTENCE_FIELDS",
  "PROMOTION_BLOCKERS",
  "assertNoForbiddenHybridPersistence",
  "isHybridContractLive",
  "readHybridContractStatus",
];
for (const name of requiredExports) {
  assert.ok(
    new RegExp(`export (?:const|function) ${name}\\b`).test(contractSource),
    `contract module is missing export ${name}`,
  );
}

// (2) Key scheme version is the pinned hybrid label.
assert.ok(
  contractSource.includes(
    '"vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1"',
  ),
  "contract module must pin KEY_SCHEME_VERSION to vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1",
);

// (3) Negative-claim boundary literals are present. These are the
// strings that auditors and reviewers can grep for to confirm the
// path is not claimed live.
const requiredBoundaryStrings = [
  "not live",
  "not audited",
  "not anonymity-set evidence",
  "harvest-now-decrypt-later-mitigation-design-contract-only",
  "design-contract-only-no-implementation",
];
for (const literal of requiredBoundaryStrings) {
  if (!contractSource.includes(literal)) {
    fail(
      `contract module must preserve boundary literal '${literal}' so reviewers can grep for the negative-claim posture`,
    );
  }
}

// (4) HYBRID_BOUNDARY.live and .audited must still be false.
assert.ok(
  /live:\s*false/.test(contractSource),
  "HYBRID_BOUNDARY.live must remain false until the hybrid construction is implemented and audited",
);
assert.ok(
  /audited:\s*false/.test(contractSource),
  "HYBRID_BOUNDARY.audited must remain false until independent review acceptance is recorded",
);

// (5) Forbidden persistence field allowlist must not shrink. Any
// future implementation MUST add to this list, not remove from it.
const requiredForbidden = [
  "aeadKey",
  "decapsulationSecret",
  "ephemeralX25519PrivateKey",
  "hybridSharedSecret",
  "mlkem768Decapsulation",
  "mlkem768Encapsulation",
  "mlkem768PrivateKey",
  "rawSharedSecret",
  "viewingKeyX25519PrivateKey",
];
for (const key of requiredForbidden) {
  if (!contractSource.includes(`"${key}"`)) {
    fail(
      `FORBIDDEN_PERSISTENCE_FIELDS must include '${key}' to prevent leakage of PQC-sensitive material`,
    );
  }
}

// (6) Promotion blockers must not be silently emptied.
const requiredBlockers = [
  "mlkem768-library-acceptance-not-recorded",
  "hybrid-construction-not-implemented",
  "hybrid-construction-not-audited",
];
for (const blocker of requiredBlockers) {
  if (!contractSource.includes(`"${blocker}"`)) {
    fail(
      `PROMOTION_BLOCKERS must include '${blocker}' until the matching reviewer evidence is recorded`,
    );
  }
}

// (7) No live wiring. The contract is design-only; if the live
// viewing-key path imports the contract OR references the hybrid
// key-scheme version, this guard must be updated to assert the live
// envelope shape instead.
if (existsSync(liveViewingKeyPath)) {
  const liveSource = readFileSync(liveViewingKeyPath, "utf8");
  if (
    liveSource.includes("vantaShieldViewingKeyPqcHybridContract") ||
    liveSource.includes(
      "vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1",
    )
  ) {
    fail(
      `live viewing-key path src/solana/vantaShieldViewingKey.ts now references the hybrid contract — update this guard to PASS-implementation-not-yet-audited mode and add the v3 AEAD envelope checks (per the tracker's promotion criteria)`,
    );
  }
}

// (8) Threat model carries the PQC exposure section and references
// this tracker.
const requiredThreatModelMarkers = [
  "## Post-Quantum Cryptographic Exposure",
  "PPA-PQC-001",
  "harvest-now-decrypt-later",
  "X25519 viewing-key memo encryption",
  "ML-KEM-768",
];
for (const marker of requiredThreatModelMarkers) {
  if (!threatModelSource.includes(marker)) {
    fail(
      `docs/threat-model.md is missing the PPA-PQC-001 marker '${marker}'`,
    );
  }
}

console.log("Vanta PQC hybrid viewing-key contract check: PASS-design-contract-only");
console.log(
  "Evidence: src/privacy/vantaShieldViewingKeyPqcHybridContract.mjs carries the required exports, the KEY_SCHEME_VERSION pin, the negative-claim boundary literals (not-live, not-audited, harvest-now-decrypt-later-mitigation-design-contract-only), the forbidden-persistence allowlist, and all promotion blockers. The live src/solana/vantaShieldViewingKey.ts does NOT yet import the contract or reference the hybrid key-scheme version. docs/threat-model.md carries the matching Post-Quantum Cryptographic Exposure section. Promotion to PASS-implementation-not-yet-audited requires the work enumerated in the tracker note's 'Promotion criteria' section.",
);
