// Vanta Shield viewing-key — hybrid X25519 + ML-KEM-768 PQC contract.
//
// This module is **refs-only / design-contract-only**. It does NOT
// implement the hybrid PQC construction. It enumerates the contract
// surface the future implementation must conform to, the forbidden
// persistence fields, and the explicit negative-claim boundary so the
// path cannot be silently promoted to live without an explicit
// reviewer diff.
//
// Tracker: docs/goals/2026-05-14-claude-privacy-audit-tracker/notes/
//          2026-05-25-ppa-pqc-001-hybrid-viewing-key-memo-plan.md
// Threat model: docs/threat-model.md "Post-Quantum Cryptographic Exposure"
// Guard:        npm run pqc:hybrid-viewing-key-contract-check

export const VANTA_SHIELD_VIEWING_KEY_HYBRID_CONTRACT_VERSION =
  "vanta-shield-viewing-key-pqc-hybrid-contract-0.1";

export const KEY_SCHEME_VERSION =
  "vanta-shield-viewing-key-hybrid-x25519-mlkem768-v1";

// Refs-only boundary. The literal strings below are tested by the
// guard at scripts/check-vanta-pqc-hybrid-viewing-key-contract.mjs.
// They MUST remain present until the construction is implemented and
// independently audited.
export const HYBRID_BOUNDARY = Object.freeze({
  description:
    "local refs-only hybrid X25519 + ML-KEM-768 viewing-key memo design contract; not live, not audited, not anonymity-set evidence, and harvest-now-decrypt-later-mitigation-design-contract-only",
  live: false,
  audited: false,
  anonymitySetEvidence: false,
  hndlMitigation: "design-contract-only-no-implementation",
  productionPrivateClaim: false,
});

// Persistence guard: any record that flows through queues, indexer
// snapshots, receipts, evidence packets, or operator logs must not
// carry these fields. The hybrid implementation, when it lands, must
// extend this list rather than shrink it.
export const FORBIDDEN_PERSISTENCE_FIELDS = Object.freeze([
  "aeadKey",
  "decapsulationSecret",
  "ephemeralX25519PrivateKey",
  "hybridSharedSecret",
  "kdfInputKeyMaterial",
  "mlkem768Decapsulation",
  "mlkem768Encapsulation",
  "mlkem768PrivateKey",
  "mlkem768Seed",
  "rawSharedSecret",
  "seedHkdfSalt",
  "ss_classical",
  "ss_pq",
  "viewingKeyX25519PrivateKey",
]);

// Promotion-blocker list. The guard reads these and asserts they all
// remain marked false; flipping any to true requires the matching
// evidence packet plus this module's update in the same diff.
export const PROMOTION_BLOCKERS = Object.freeze([
  "mlkem768-library-acceptance-not-recorded",
  "hybrid-construction-not-implemented",
  "hybrid-construction-not-audited",
  "argon2id-mlkem768-private-key-storage-not-implemented",
  "v3-aead-envelope-not-implemented",
  "fips-203-kat-vectors-not-vendored",
  "view-tag-prefix-derivation-not-bound-to-hybrid-seed",
]);

// Forbidden-field check. Validators in the future live path should
// call this on every record they're about to persist.
export function assertNoForbiddenHybridPersistence(record, contextLabel) {
  if (record === null || record === undefined) {
    return;
  }
  if (typeof record !== "object") {
    return;
  }
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_PERSISTENCE_FIELDS.includes(key)) {
      throw new Error(
        `Vanta Shield viewing-key hybrid contract forbids '${key}' in persisted records (context: ${contextLabel ?? "unspecified"}).`,
      );
    }
  }
}

// Live-wiring detector. Returns true only when ALL promotion blockers
// have been cleared AND HYBRID_BOUNDARY.live has been explicitly
// flipped. Today it returns false.
export function isHybridContractLive() {
  if (HYBRID_BOUNDARY.live !== true) {
    return false;
  }
  if (HYBRID_BOUNDARY.audited !== true) {
    return false;
  }
  if (PROMOTION_BLOCKERS.length !== 0) {
    return false;
  }
  return true;
}

// Public contract surface so callers can introspect the negative-claim
// state without parsing the module source.
export function readHybridContractStatus() {
  return Object.freeze({
    contractVersion: VANTA_SHIELD_VIEWING_KEY_HYBRID_CONTRACT_VERSION,
    keySchemeVersion: KEY_SCHEME_VERSION,
    boundary: HYBRID_BOUNDARY,
    forbiddenPersistenceFields: FORBIDDEN_PERSISTENCE_FIELDS,
    promotionBlockers: PROMOTION_BLOCKERS,
    live: isHybridContractLive(),
  });
}
