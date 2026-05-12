import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const policyPath = resolve(repoRoot, "src/zk/ownerContextLegacyQuarantinePolicy.ts");
const importPath = resolve(repoRoot, "src/zk/ownerContextRecordSourceImport.ts");
const shieldPagePath = resolve(repoRoot, "src/pages/ShieldPage.tsx");
const packagePath = resolve(repoRoot, "package.json");

function read(path) {
  return readFileSync(path, "utf8");
}

function ownerEvidenceHash(domain, value) {
  return `sha256:${createHash("sha256")
    .update(`vanta-owner-context-recovery-evidence:${domain}:${value ?? "unset"}`)
    .digest("hex")}`;
}

async function loadModule(entryPath, prefix) {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, `.tmp/${prefix}-`));
  const outputPath = join(tempRoot, `${prefix}.mjs`);

  try {
    execFileSync(
      resolve(repoRoot, "node_modules/.bin/esbuild"),
      [
        entryPath,
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
  existsSync(policyPath),
  "src/zk/ownerContextLegacyQuarantinePolicy.ts must define the legacy quarantine policy.",
);

const policySource = read(policyPath);
const importSource = read(importPath);
const shieldPageSource = read(shieldPagePath);
const packageJson = JSON.parse(read(packagePath));

for (const marker of [
  "vanta-owner-context-legacy-quarantine-policy-0.1",
  "legacy-random-quarantined-local-only",
  "redacted-legacy-unmigratable",
  "missing-evidence-quarantined",
  "automaticMigrationAllowed: false",
  "crossDeviceRecoveryAllowedNow: false",
  "productionRecoveryReady: false",
  "recordSourceImportCanPromote",
  "localOnlyQuarantine",
]) {
  assert.ok(policySource.includes(marker), `legacy quarantine policy missing marker: ${marker}`);
}

for (const marker of [
  "legacyQuarantineStatus",
  "automaticMigrationAllowed",
  "crossDeviceRecoveryAllowedNow",
  "recordSourceImportCanPromote",
  "localOnlyQuarantine",
  "productionRecoveryReady",
  "quarantineTruth",
]) {
  assert.ok(importSource.includes(marker), `record source import must carry policy marker: ${marker}`);
}

for (const marker of [
  "Legacy quarantine policy",
  "automatic migration off",
  "Old random-seeded browser-local records stay quarantined local-only",
  "does not promote legacy records",
]) {
  assert.ok(
    shieldPageSource.includes(marker),
    `Shield recovery UI must expose the legacy quarantine marker: ${marker}`,
  );
}

assert.equal(
  packageJson.scripts["zk:owner-context-legacy-quarantine-policy-check"],
  "node scripts/check-vanta-owner-context-legacy-quarantine-policy.mjs",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run zk:owner-context-legacy-quarantine-policy-check",
  ),
  "zk:review-guards-check must include owner-context legacy quarantine policy.",
);
assert.ok(
  packageJson.scripts["shield:verify"].includes(
    "npm run zk:owner-context-legacy-quarantine-policy-check",
  ),
  "shield:verify must include owner-context legacy quarantine policy.",
);

const { module: policy, cleanup } = await loadModule(
  policyPath,
  "owner-context-legacy-quarantine-policy",
);
const { module: recordImport, cleanup: cleanupImport } = await loadModule(
  importPath,
  "owner-context-record-source-import-policy",
);

try {
  const walletContext = {
    derivationContext:
      "owner-key-hierarchy:vanta-shield-owner-key-hierarchy-0.1:vanta:mainnet-beta:VantaWallet111111111111111111111111111111111",
    ownerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
    recoverySecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
  };
  const walletDecision = policy.createOwnerContextLegacyQuarantinePolicy({
    ownerContext: walletContext,
  });
  assert.equal(walletDecision.status, "wallet-derived-record-source-required");
  assert.equal(walletDecision.recordSourceImportCanPromote, true);
  assert.equal(walletDecision.localOnlyQuarantine, false);
  assert.equal(walletDecision.automaticMigrationAllowed, false);
  assert.equal(walletDecision.crossDeviceRecoveryAllowedNow, false);
  assert.equal(walletDecision.productionRecoveryReady, false);

  const legacyDecision = policy.createOwnerContextLegacyQuarantinePolicy({
    ownerContext: {
      ownerPublicKey: walletContext.ownerPublicKey,
      recoverySecret: walletContext.recoverySecret,
    },
  });
  assert.equal(legacyDecision.status, "legacy-random-quarantined-local-only");
  assert.equal(legacyDecision.recordSourceImportCanPromote, false);
  assert.equal(legacyDecision.localOnlyQuarantine, true);

  const redactedDecision = policy.createOwnerContextLegacyQuarantinePolicy({
    redactedOwnerContext: {
      ownerPublicKey: walletContext.ownerPublicKey,
      recoverySecretReferenceHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  assert.equal(redactedDecision.status, "redacted-legacy-unmigratable");
  assert.equal(redactedDecision.localOnlyQuarantine, true);

  const missingDecision = policy.createOwnerContextLegacyQuarantinePolicy({});
  assert.equal(missingDecision.status, "missing-evidence-quarantined");
  assert.equal(missingDecision.localOnlyQuarantine, true);

  assert.deepEqual(
    policy.createOwnerContextLegacyQuarantineSummary([
      { ownerContext: walletContext },
      { ownerContext: { ownerPublicKey: walletContext.ownerPublicKey, recoverySecret: walletContext.recoverySecret } },
      { redactedOwnerContext: { ownerPublicKey: walletContext.ownerPublicKey } },
      {},
    ]),
    {
      version: "vanta-owner-context-legacy-quarantine-policy-0.1",
      recordCount: 4,
      walletDerivedRecordSourceRequiredCount: 1,
      legacyRandomQuarantinedCount: 1,
      redactedLegacyUnmigratableCount: 1,
      missingEvidenceQuarantinedCount: 1,
      automaticMigrationAllowed: false,
      productionRecoveryReady: false,
      truth:
        "Legacy or missing owner-context records remain quarantined local-only; export/import can verify wallet-derived records but does not migrate old random-seeded records.",
    },
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
  const legacyEvidence = {
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
      "This record was created without wallet-derived hierarchy evidence and remains quarantined as legacy local-only.",
  };

  const packet = recordImport.createOwnerContextRecordSourceImportPacket({
    createdAt: 1_778_580_000_000,
    records: [
      {
        recordId: "wallet-derived-record",
        source: "live_shield_v1",
        ownerContextEvidence: walletEvidence,
      },
      {
        recordId: "legacy-record",
        source: "live_shield_v1",
        ownerContextEvidence: legacyEvidence,
      },
    ],
  });
  assert.equal(packet.entries[0].legacyQuarantineStatus, "wallet-derived-record-source-required");
  assert.equal(packet.entries[0].recordSourceImportCanPromote, true);
  assert.equal(packet.entries[0].automaticMigrationAllowed, false);
  assert.equal(packet.entries[1].legacyQuarantineStatus, "legacy-random-quarantined-local-only");
  assert.equal(packet.entries[1].recordSourceImportCanPromote, false);
  assert.equal(packet.entries[1].localOnlyQuarantine, true);

  const summary = recordImport.summarizeOwnerContextRecordSourceImportPacket(packet);
  assert.equal(summary.walletDerivedRecordSourceRequiredCount, 1);
  assert.equal(summary.quarantinedLocalOnlyCount, 1);
  assert.equal(summary.automaticMigrationAllowed, false);
  assert.equal(summary.productionRecoveryReady, false);
  assert.match(summary.legacyQuarantineTruth, /does not migrate old random-seeded records/u);

  for (const tamperedEntry of [
    { ...packet.entries[1], recordSourceImportCanPromote: true },
    { ...packet.entries[1], localOnlyQuarantine: false },
    { ...packet.entries[1], automaticMigrationAllowed: true },
    { ...packet.entries[1], crossDeviceRecoveryAllowedNow: true },
    { ...packet.entries[1], productionRecoveryReady: true },
    {
      ...packet.entries[1],
      legacyQuarantineStatus: "wallet-derived-record-source-required",
    },
  ]) {
    assert.equal(
      recordImport.parseOwnerContextRecordSourceImportPacketText(
        JSON.stringify({
          ...packet,
          entries: [tamperedEntry],
        }),
      ),
      null,
      "tampered legacy promotion policy must fail closed.",
    );
  }
} finally {
  cleanup();
  cleanupImport();
}

console.log("Vanta owner-context legacy quarantine policy check: PASS");
