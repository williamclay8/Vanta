import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const helperPath = resolve(repoRoot, "src/zk/ownerContextRecordSourceImport.ts");
const ownerKeyHierarchyPath = resolve(repoRoot, "src/zk/ownerKeyHierarchy.ts");
const shieldPagePath = resolve(repoRoot, "src/pages/ShieldPage.tsx");
const packagePath = resolve(repoRoot, "package.json");

function ownerEvidenceHash(domain, value) {
  return `sha256:${createHash("sha256")
    .update(`vanta-owner-context-recovery-evidence:${domain}:${value ?? "unset"}`)
    .digest("hex")}`;
}

function read(path) {
  return readFileSync(path, "utf8");
}

async function loadImportProofModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/owner-context-record-source-import-"));
  const outputPath = join(tempRoot, "ownerContextRecordSourceImport.mjs");

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        helperPath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        "--target=es2022",
        `--outfile=${outputPath}`,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
      module: await import(pathToFileURL(outputPath).href),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

async function loadOwnerKeyHierarchyModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/owner-key-hierarchy-"));
  const outputPath = join(tempRoot, "ownerKeyHierarchy.mjs");

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        ownerKeyHierarchyPath,
        "--bundle",
        "--platform=node",
        "--format=esm",
        "--target=es2022",
        `--outfile=${outputPath}`,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return {
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
      module: await import(pathToFileURL(outputPath).href),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

assert.ok(
  existsSync(helperPath),
  "src/zk/ownerContextRecordSourceImport.ts must define the owner-context record source import proof helper.",
);

const helperSource = read(helperPath);
const shieldPageSource = read(shieldPagePath);
const packageJson = JSON.parse(read(packagePath));

for (const marker of [
  "vanta-owner-context-record-source-import-0.1",
  "wallet-derived-import-source-verified",
  "wallet-derived-record-source-mismatch",
  "legacy-record-source-local-only",
  "raw-owner-material-rejected",
  "createOwnerContextRecordSourceImportPacket",
  "verifyOwnerContextRecordSourceImport",
  "parseOwnerContextRecordSourceImportPacketText",
  "summarizeOwnerContextRecordSourceImportPacket",
  "noteSecret",
  "blinding",
  "encryptedPayload",
]) {
  assert.ok(helperSource.includes(marker), `owner-context record import helper missing marker: ${marker}`);
}

assert.ok(
  shieldPageSource.includes("Record source import proof") &&
    shieldPageSource.includes("second device") &&
    shieldPageSource.includes("legacy local-only"),
  "Shield balance recovery panel must explain the record source import proof and second-device boundary.",
);
for (const marker of [
  "createOwnerContextRecordSourceImportPacket",
  "verifyOwnerContextRecordSourceImport",
  "parseOwnerContextRecordSourceImportPacketText",
  "summarizeOwnerContextRecordSourceImportPacket",
  "listCanonicalShieldRecords",
  "listCanonicalSendRecords",
  "listCanonicalSwapRecords",
  "Export record source",
  "Verify record source",
  "Record source packet",
  "Paste a record source packet",
  "wallet-derived import verified",
  "raw owner material rejected",
]) {
  assert.ok(
    shieldPageSource.includes(marker),
    `Shield balance recovery panel must expose product-facing record source import/export UX marker: ${marker}`,
  );
}

assert.equal(
  packageJson.scripts["zk:owner-context-record-source-import-check"],
  "node scripts/check-vanta-owner-context-record-source-import.mjs",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run zk:owner-context-record-source-import-check",
  ),
  "zk:review-guards-check must include owner-context record source import proof.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes(
    "npm run zk:owner-context-record-source-import-check",
  ),
  "shield:verify must include the owner-context record source import UX guard.",
);

const { module: importProof, cleanup } = await loadImportProofModule();
const { module: ownerKeys, cleanup: cleanupOwnerKeys } = await loadOwnerKeyHierarchyModule();

try {
  const masterSeed = "0x1212121212121212121212121212121212121212121212121212121212121212";
  const hierarchyContext = {
    appDomain: "vanta",
    cluster: "mainnet-beta",
    walletAddress: "VantaWallet111111111111111111111111111111111",
  };
  const walletContext = ownerKeys.createWalletDerivedCanonicalNoteOwnerContext({
    context: hierarchyContext,
    masterSeed,
  });
  const secondDeviceWalletContext = ownerKeys.createWalletDerivedCanonicalNoteOwnerContext({
    context: hierarchyContext,
    masterSeed,
  });
  const otherWalletContext = {
    ...walletContext,
    ownerPublicKey: "0x3333333333333333333333333333333333333333333333333333333333333333",
  };
  assert.deepEqual(
    secondDeviceWalletContext,
    walletContext,
    "same wallet-derived seed/context must recreate the same owner context on a second device.",
  );
  const walletEvidence = {
    version: "vanta-owner-context-recovery-evidence-0.1",
    recoveryClass: "wallet-derived-cross-device-candidate",
    evidenceSource: "owner-key-hierarchy-v0.1",
    ownerPublicKey: walletContext.ownerPublicKey,
    hierarchyVersion: "vanta-shield-owner-key-hierarchy-0.1",
    derivationContextReferenceHash: ownerEvidenceHash(
      "owner-derivation-context",
      walletContext.derivationContext,
    ),
    recoverySecretReferenceHash: ownerEvidenceHash(
      "owner-recovery-secret",
      walletContext.recoverySecret,
    ),
    crossDeviceCandidate: true,
    rawRecoveryMaterialStored: false,
    importRequiredForCrossDevice: true,
    truth:
      "This record was created with wallet-derived owner context evidence; recovery on another device still requires a record source or import path.",
  };

  const packet = importProof.createOwnerContextRecordSourceImportPacket({
    createdAt: 1_778_580_000_000,
    records: [
      {
        recordId: "shield-record-1",
        source: "live_shield_v1",
        ownerContextEvidence: walletEvidence,
        canonicalNote: { ownerPublicKey: walletContext.ownerPublicKey },
      },
    ],
  });

  assert.equal(packet.version, "vanta-owner-context-record-source-import-0.1");
  assert.equal(packet.rawRecoveryMaterialStored, false);
  assert.equal(packet.ownerPublicKey, walletContext.ownerPublicKey);
  assert.equal(packet.entries.length, 1);
  assert.match(packet.entries[0].recordReferenceHash, /^sha256:[0-9a-f]{64}$/u);
  assert.ok(!JSON.stringify(packet).includes(walletContext.recoverySecret));
  assert.ok(!JSON.stringify(packet).includes(walletContext.derivationContext));

  const parsedPacket = importProof.parseOwnerContextRecordSourceImportPacketText(
    JSON.stringify(packet),
  );
  assert.deepEqual(parsedPacket, packet);
  assert.deepEqual(importProof.summarizeOwnerContextRecordSourceImportPacket(packet), {
    version: "vanta-owner-context-record-source-import-0.1",
    createdAt: 1_778_580_000_000,
    recordCount: 1,
    walletDerivedCandidateCount: 1,
    legacyLocalOnlyCount: 0,
    missingEvidenceCount: 0,
    rawRecoveryMaterialStored: false,
    truth:
      "This import packet carries non-secret owner-context evidence and record references only; it is a record source, not a recovery-secret backup.",
  });

  const proof = importProof.verifyOwnerContextRecordSourceImport({
    ownerContext: secondDeviceWalletContext,
    packet,
  });
  assert.equal(proof.status, "wallet-derived-import-source-verified");
  assert.equal(proof.matchedRecordCount, 1);
  assert.equal(proof.walletDerivedCandidateCount, 1);
  assert.equal(proof.rawRecoveryMaterialStored, false);
  assert.ok(
    proof.truth.includes("same wallet-derived owner context") &&
      proof.truth.includes("imported record source"),
  );

  const mismatchProof = importProof.verifyOwnerContextRecordSourceImport({
    ownerContext: otherWalletContext,
    packet,
  });
  assert.equal(mismatchProof.status, "wallet-derived-record-source-mismatch");
  assert.equal(mismatchProof.matchedRecordCount, 0);

  const legacyPacket = importProof.createOwnerContextRecordSourceImportPacket({
    createdAt: 1_778_580_000_000,
    records: [
      {
        recordId: "legacy-shield-record-1",
        source: "live_shield_v1",
        ownerContextEvidence: {
          version: "vanta-owner-context-recovery-evidence-0.1",
          recoveryClass: "legacy-random-local-only",
          evidenceSource: "legacy-random-local-record",
          ownerPublicKey: walletContext.ownerPublicKey,
          recoverySecretReferenceHash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          crossDeviceCandidate: false,
          rawRecoveryMaterialStored: false,
          importRequiredForCrossDevice: true,
          truth:
            "This record was created without wallet-derived hierarchy evidence and remains legacy local-only unless separately backed up.",
        },
      },
    ],
  });
  assert.equal(legacyPacket.entries[0].ownerRecoveryClass, "legacy-random-local-only");
  assert.equal(
    importProof.verifyOwnerContextRecordSourceImport({
      ownerContext: walletContext,
      packet: legacyPacket,
    }).status,
    "legacy-record-source-local-only",
  );

  assert.equal(
    importProof.verifyOwnerContextRecordSourceImport({
      ownerContext: walletContext,
      packet: importProof.createOwnerContextRecordSourceImportPacket({
        createdAt: 1_778_580_000_000,
        records: [],
      }),
    }).status,
    "missing-record-source",
  );

  assert.throws(
    () =>
      importProof.createOwnerContextRecordSourceImportPacket({
        records: [
          {
            recordId: "tainted-record",
            source: "live_shield_v1",
            ownerContext: walletContext,
            ownerContextEvidence: walletEvidence,
          },
        ],
      }),
    /raw owner recovery material/u,
    "Record source import packets must reject raw ownerContext material instead of exporting it.",
  );

  for (const rawKey of ["noteSecret", "blinding", "encryptedPayload"]) {
    assert.throws(
      () =>
        importProof.createOwnerContextRecordSourceImportPacket({
          records: [
            {
              recordId: `tainted-${rawKey}`,
              source: "live_shield_v1",
              ownerContextEvidence: walletEvidence,
              canonicalNote: {
                ownerPublicKey: walletContext.ownerPublicKey,
                [rawKey]: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              },
            },
          ],
        }),
      /raw owner recovery material/u,
      `Record source import packets must reject ${rawKey} material instead of exporting it.`,
    );
  }

  assert.equal(
    importProof.verifyOwnerContextRecordSourceImport({
      ownerContext: walletContext,
      packet: {
        ...packet,
        rawRecoveryMaterialStored: true,
      },
    }).status,
    "raw-owner-material-rejected",
  );

  assert.equal(
    importProof.verifyOwnerContextRecordSourceImport({
      ownerContext: walletContext,
      packet: {
        ...packet,
        entries: [
          {
            ...packet.entries[0],
            ownerRecoveryClass: "wallet-derived-but-unreviewed",
          },
        ],
      },
    }).status,
    "raw-owner-material-rejected",
    "Malformed packet entries must fail closed through the import verifier.",
  );
} finally {
  cleanup();
  cleanupOwnerKeys();
}

console.log("Vanta owner-context record source import check: PASS");
