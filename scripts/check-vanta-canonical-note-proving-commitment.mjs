import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { poseidon10 } from "poseidon-lite";

const repoRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(repoRoot, "src/zk/canonicalNote.ts");
const liveShieldBridgePath = resolve(repoRoot, "src/zk/liveShieldBridge.ts");
const liveSendBridgePath = resolve(repoRoot, "src/zk/liveSendBridge.ts");
const packagePath = resolve(repoRoot, "package.json");
const bn254ScalarField =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const u64Mask = (1n << 64n) - 1n;

async function loadCanonicalNoteModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/canonical-note-proving-commitment-check-"));
  const outputPath = join(tempRoot, "canonicalNote.mjs");

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        sourcePath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        "--target=es2022",
        `--outfile=${outputPath}`,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      module: await import(pathToFileURL(outputPath).href),
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function sha256Bytes(value) {
  return createHash("sha256").update(new TextEncoder().encode(value)).digest();
}

function bytesToBigInt(bytes) {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value;
}

function fieldFromString(domain, value) {
  return bytesToBigInt(sha256Bytes(`${domain}\n${value.trim()}`)) % bn254ScalarField;
}

function fieldPairFromString(domain, value) {
  const digest = sha256Bytes(`${domain}\n${value.trim()}`);
  return {
    hi: bytesToBigInt(digest.subarray(0, 16)),
    lo: bytesToBigInt(digest.subarray(16, 32)),
  };
}

function fieldFromBytes32(value) {
  return BigInt(value) % bn254ScalarField;
}

function encodeFieldHex(value) {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

const source = readFileSync(sourcePath, "utf8");
const liveShieldBridgeSource = readFileSync(liveShieldBridgePath, "utf8");
const liveSendBridgeSource = readFileSync(liveSendBridgePath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert(
  source.includes('import { poseidon10 } from "poseidon-lite"'),
  "canonicalNote.ts must derive the proof-facing note commitment with poseidon-lite poseidon10.",
);
assert(
  source.includes("CANONICAL_NOTE_PROVING_COMMITMENT_SCHEME_V1"),
  "canonicalNote.ts must expose a dedicated proof-facing commitment scheme.",
);
assert(
  source.includes("CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1"),
  "canonicalNote.ts must expose the BN254 proving-field encoding.",
);
assert(
  source.includes("deriveCanonicalNoteProvingFields"),
  "canonicalNote.ts must expose witness-field derivation for the proving lane.",
);
assert(
  source.includes("deriveCanonicalNoteProvingCommitment"),
  "canonicalNote.ts must expose deterministic Poseidon proving commitment derivation.",
);
assert(
  source.includes("getCanonicalNoteProvingFieldValueVector"),
  "canonicalNote.ts must expose the exact Poseidon field vector used for the proving commitment.",
);
assert(
  source.includes("provingCommitment: CanonicalNoteProvingCommitment"),
  "canonical note artifacts must persist the proof-facing commitment alongside the display SHA-256 commitment.",
);
assert(
  liveShieldBridgeSource.includes("artifacts = await deriveCanonicalNoteArtifacts"),
  "live shield bridge must record canonical note artifacts from the shared deriver.",
);
assert(
  liveSendBridgeSource.includes('provingCommitment: CanonicalNoteArtifacts["provingCommitment"]') &&
    liveSendBridgeSource.includes("provingCommitment: artifacts.provingCommitment"),
  "live send redaction must preserve proof-facing successor commitments.",
);
assert.equal(
  packageJson.scripts["zk:canonical-note-proving-commitment-check"],
  "node scripts/check-vanta-canonical-note-proving-commitment.mjs",
  "package.json must expose zk:canonical-note-proving-commitment-check.",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"]?.includes(
    "npm run zk:canonical-note-proving-commitment-check",
  ),
  "zk:review-guards-check must include the canonical note proving commitment guard.",
);
assert.ok(
  packageJson.scripts["private-pool-v2:verify"]?.includes("npm run zk:review-guards-check"),
  "private-pool-v2:verify must include the ZK review guard aggregate.",
);
assert.ok(
  packageJson.scripts["private-core:verify"]?.includes("npm run zk:review-guards-check"),
  "private-core:verify must include the ZK review guard aggregate.",
);

const { module: canonicalNote, cleanup } = await loadCanonicalNoteModule();

try {
  const note = canonicalNote.createCanonicalNote({
    assetId: "solana:mint:USDC-MAINNET-FIXTURE",
    amount: (1n << 64n) + 1n,
    ownerPublicKey: "owner-recovery-key-example",
    noteNonce: "0x1111111111111111111111111111111111111111111111111111111111111111",
    noteSecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
    blinding: "0x3333333333333333333333333333333333333333333333333333333333333333",
    derivationTag: "0x4444444444444444444444444444444444444444444444444444444444444444",
    creationHint: {
      sourceKind: "shield",
      sourceAssetHint: "USDC",
      sourceTransitionIdHint: "hint-one",
    },
  });
  const sameProtocolNoteDifferentHint = {
    ...note,
    creationHint: {
      sourceKind: "shield",
      sourceAssetHint: "USDC",
      sourceTransitionIdHint: "hint-two",
    },
  };
  const differentBlindingNote = {
    ...note,
    blinding: "0x5555555555555555555555555555555555555555555555555555555555555555",
  };

  const fields = await canonicalNote.deriveCanonicalNoteProvingFields(note);
  const assetIdFields = fieldPairFromString(
    "vanta:canonical-note:asset-id-field-pair:v1",
    note.assetId,
  );

  assert.equal(fields.encoding, canonicalNote.CANONICAL_NOTE_PROVING_FIELD_ENCODING_V1);
  assert.deepEqual(fields.fieldOrder, [
    "version",
    "assetIdHi",
    "assetIdLo",
    "amountLo",
    "amountHi",
    "ownerPublicKey",
    "noteNonce",
    "noteSecret",
    "blinding",
    "derivationTag",
  ]);
  assert.equal(fields.version, 1n);
  assert.equal(fields.assetIdHi, assetIdFields.hi);
  assert.equal(fields.assetIdLo, assetIdFields.lo);
  assert.equal(fields.amountLo, 1n);
  assert.equal(fields.amountHi, 1n);
  assert.equal(
    fields.ownerPublicKey,
    fieldFromString("vanta:canonical-note:owner-public-key-field:v1", note.ownerPublicKey),
  );
  assert.equal(fields.noteNonce, fieldFromBytes32(note.noteNonce));
  assert.equal(fields.noteSecret, fieldFromBytes32(note.noteSecret));
  assert.equal(fields.blinding, fieldFromBytes32(note.blinding));
  assert.equal(fields.derivationTag, fieldFromBytes32(note.derivationTag));

  const fieldVector = canonicalNote.getCanonicalNoteProvingFieldValueVector(fields);
  const expectedFieldValue = poseidon10(fieldVector);
  const provingCommitment = await canonicalNote.deriveCanonicalNoteProvingCommitment(note);

  assert.equal(
    provingCommitment.scheme,
    "poseidon-bn254-canonical-note-proving-commitment-v1",
  );
  assert.equal(
    provingCommitment.fieldEncoding,
    "vanta.canonical-note.proving-fields.poseidon-bn254.v1",
  );
  assert.equal(provingCommitment.fieldValue, expectedFieldValue.toString(10));
  assert.equal(provingCommitment.value, encodeFieldHex(expectedFieldValue));
  assert.notEqual(
    provingCommitment.value,
    (await canonicalNote.deriveCanonicalNoteCommitment(note)).value,
    "proof-facing Poseidon commitment must be distinct from the legacy display SHA-256 commitment.",
  );
  assert.deepEqual(
    await canonicalNote.deriveCanonicalNoteProvingCommitment(sameProtocolNoteDifferentHint),
    provingCommitment,
    "creationHint must remain recovery metadata and must not affect the proving commitment.",
  );
  assert.notEqual(
    (await canonicalNote.deriveCanonicalNoteProvingCommitment(differentBlindingNote)).value,
    provingCommitment.value,
    "blinding must affect the proving commitment.",
  );

  const artifacts = await canonicalNote.deriveCanonicalNoteArtifacts(
    note,
    {
      ownerPublicKey: note.ownerPublicKey,
      recoverySecret: "owner-recovery-secret-example",
      derivationContext: "proving-commitment-check",
    },
    {
      deriveCommitment: canonicalNote.placeholderCanonicalNoteArtifactDeriver.deriveCommitment,
      deriveNullifierBasis:
        canonicalNote.placeholderCanonicalNoteArtifactDeriver.deriveNullifierBasis,
      async deriveEncryptedPayload() {
        return {
          scheme: "owner-recovery-x25519-xchacha20poly1305-v2",
          encoding: "vanta.canonical-note.payload.encoding.v1",
          payloadVersion: 1,
          recipientPublicKey: note.ownerPublicKey,
          payloadNonce:
            "0x6666666666666666666666666666666666666666666666666666666666666666",
          ciphertext: "ZmFrZS1jaXBoZXJ0ZXh0",
          authTag: "0x7777777777777777777777777777777777777777777777777777777777777777",
        };
      },
    },
  );

  assert.equal(artifacts.commitment.scheme, "sha256-canonical-note-v1");
  assert.deepEqual(artifacts.provingCommitment, provingCommitment);
  assert.throws(
    () =>
      canonicalNote.createCanonicalNote({
        ...note,
        amount: (1n << 128n).toString(10),
      }),
    /u128 max/,
    "canonical notes must reject amounts outside the u128 proof field split.",
  );
} finally {
  cleanup();
}

console.log("canonical note proving commitment check: PASS");
