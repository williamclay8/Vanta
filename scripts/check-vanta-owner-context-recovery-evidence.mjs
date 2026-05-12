import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const helperPath = resolve(repoRoot, "src/zk/ownerContextRecoveryEvidence.ts");
const liveShieldBridgePath = resolve(repoRoot, "src/zk/liveShieldBridge.ts");
const liveSendBridgePath = resolve(repoRoot, "src/zk/liveSendBridge.ts");
const liveSwapBridgePath = resolve(repoRoot, "src/zk/liveSwapBridge.ts");
const liveLifecycleInspectionPath = resolve(repoRoot, "src/zk/liveLifecycleInspection.ts");
const lineagePanelPath = resolve(
  repoRoot,
  "src/components/InternalCanonicalLifecycleLineageBranchPanel.tsx",
);
const shieldPagePath = resolve(repoRoot, "src/pages/ShieldPage.tsx");
const packagePath = resolve(repoRoot, "package.json");

function read(path) {
  return readFileSync(path, "utf8");
}

async function loadEvidenceModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/owner-context-recovery-evidence-"));
  const outputPath = join(tempRoot, "ownerContextRecoveryEvidence.mjs");

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

assert.ok(
  existsSync(helperPath),
  "src/zk/ownerContextRecoveryEvidence.ts must define the shared evidence classifier.",
);

const helperSource = read(helperPath);
const liveShieldBridgeSource = read(liveShieldBridgePath);
const liveSendBridgeSource = read(liveSendBridgePath);
const liveSwapBridgeSource = read(liveSwapBridgePath);
const liveLifecycleInspectionSource = read(liveLifecycleInspectionPath);
const lineagePanelSource = read(lineagePanelPath);
const shieldPageSource = read(shieldPagePath);
const packageJson = JSON.parse(read(packagePath));

for (const marker of [
  "wallet-derived-cross-device-candidate",
  "legacy-random-local-only",
  "redacted-legacy-unmigratable",
  "missing-owner-context-evidence",
  "createOwnerContextRecoveryEvidence",
  "rawRecoveryMaterialStored: false",
]) {
  assert.ok(helperSource.includes(marker), `owner context evidence helper missing marker: ${marker}`);
}

for (const [label, source] of [
  ["Live Shield", liveShieldBridgeSource],
  ["Live Send", liveSendBridgeSource],
  ["Live Swap", liveSwapBridgeSource],
]) {
  assert.ok(source.includes("ownerContextEvidence"), `${label} must persist ownerContextEvidence.`);
  assert.ok(
    source.includes("ownerRecoveryClass"),
    `${label} diagnostics must expose the non-secret owner recovery class.`,
  );
}

assert.ok(
  liveLifecycleInspectionSource.includes("ownerRecoveryClass") &&
    liveLifecycleInspectionSource.includes("ownerRecoveryEvidenceSource") &&
    liveLifecycleInspectionSource.includes("ownerRecoveryCrossDeviceCandidate"),
  "Canonical lifecycle inspection must propagate owner recovery evidence into successor and branch summaries.",
);
assert.ok(
  lineagePanelSource.includes("Owner recovery evidence") &&
    !lineagePanelSource.includes(">Owner hint<"),
  "Lifecycle branch panel must show owner recovery evidence instead of a bare owner hint.",
);
assert.ok(
  shieldPageSource.includes("Owner recovery evidence") &&
    shieldPageSource.includes("legacy local-only"),
  "Shield balance recovery panel must explain owner recovery evidence and legacy local-only records.",
);

assert.equal(
  packageJson.scripts["zk:owner-context-recovery-evidence-check"],
  "node scripts/check-vanta-owner-context-recovery-evidence.mjs",
);
assert.ok(
  packageJson.scripts["zk:review-guards-check"].includes(
    "npm run zk:owner-context-recovery-evidence-check",
  ),
  "zk:review-guards-check must include owner-context recovery evidence.",
);

const { module: evidence, cleanup } = await loadEvidenceModule();

try {
  const walletContext = {
    derivationContext:
      "owner-key-hierarchy:vanta-shield-owner-key-hierarchy-0.1:vanta:mainnet-beta:VantaWallet111111111111111111111111111111111",
    ownerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
    recoverySecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
  };
  const walletEvidence = evidence.createOwnerContextRecoveryEvidence({
    ownerContext: walletContext,
  });
  assert.equal(walletEvidence.recoveryClass, "wallet-derived-cross-device-candidate");
  assert.equal(walletEvidence.evidenceSource, "owner-key-hierarchy-v0.1");
  assert.equal(walletEvidence.crossDeviceCandidate, true);
  assert.equal(walletEvidence.importRequiredForCrossDevice, true);
  assert.equal(walletEvidence.rawRecoveryMaterialStored, false);
  assert.equal(walletEvidence.hierarchyVersion, "vanta-shield-owner-key-hierarchy-0.1");
  assert.match(walletEvidence.derivationContextReferenceHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(walletEvidence.recoverySecretReferenceHash, /^sha256:[0-9a-f]{64}$/u);
  assert.ok(!JSON.stringify(walletEvidence).includes(walletContext.recoverySecret));
  assert.ok(!JSON.stringify(walletEvidence).includes(walletContext.derivationContext));
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...walletEvidence,
      crossDeviceCandidate: false,
    }),
    false,
    "wallet-derived evidence must not validate with a false cross-device candidate flag.",
  );
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...walletEvidence,
      importRequiredForCrossDevice: false,
    }),
    false,
    "wallet-derived evidence must keep record-source import required for cross-device use.",
  );
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...walletEvidence,
      evidenceSource: "redacted-legacy-record",
    }),
    false,
    "wallet-derived evidence must not validate with a redacted legacy source.",
  );
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...walletEvidence,
      hierarchyVersion: undefined,
    }),
    false,
    "wallet-derived evidence must retain the owner key hierarchy version.",
  );
  assert.ok(
    !JSON.stringify(
      evidence.createOwnerContextRecoveryEvidence({
        existingEvidence: {
          ...walletEvidence,
          derivationContext: walletContext.derivationContext,
          recoverySecret: walletContext.recoverySecret,
        },
      }),
    ).includes(walletContext.recoverySecret),
    "normalizing existing evidence must strip tainted raw recovery secrets.",
  );
  assert.ok(
    !JSON.stringify(
      evidence.createOwnerContextRecoveryEvidence({
        existingEvidence: {
          ...walletEvidence,
          derivationContext: walletContext.derivationContext,
          recoverySecret: walletContext.recoverySecret,
        },
      }),
    ).includes(walletContext.derivationContext),
    "normalizing existing evidence must strip tainted raw derivation context.",
  );
  assert.match(
    evidence.createOwnerContextReferenceHash(
      "owner-recovery-secret",
      "sha256:not-a-real-digest",
    ),
    /^sha256:[0-9a-f]{64}$/u,
    "invalid sha256 references must be rehashed into canonical reference hashes.",
  );

  const legacyEvidence = evidence.createOwnerContextRecoveryEvidence({
    ownerContext: {
      ownerPublicKey: walletContext.ownerPublicKey,
      recoverySecret: walletContext.recoverySecret,
    },
  });
  assert.equal(legacyEvidence.recoveryClass, "legacy-random-local-only");
  assert.equal(legacyEvidence.crossDeviceCandidate, false);
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...legacyEvidence,
      evidenceSource: "owner-key-hierarchy-v0.1",
    }),
    false,
    "legacy local-only evidence must not validate with the wallet-derived source.",
  );
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...legacyEvidence,
      crossDeviceCandidate: true,
    }),
    false,
    "legacy local-only evidence must not validate as a cross-device candidate.",
  );

  const redactedEvidence = evidence.createOwnerContextRecoveryEvidence({
    redactedOwnerContext: {
      ownerPublicKey: walletContext.ownerPublicKey,
      recoverySecretReferenceHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  assert.equal(redactedEvidence.recoveryClass, "redacted-legacy-unmigratable");
  assert.equal(redactedEvidence.crossDeviceCandidate, false);
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...redactedEvidence,
      recoverySecretReferenceHash: "sha256:not-a-real-digest",
    }),
    false,
    "redacted evidence must not validate with malformed reference hashes.",
  );

  const missingEvidence = evidence.createOwnerContextRecoveryEvidence({});
  assert.equal(missingEvidence.recoveryClass, "missing-owner-context-evidence");
  assert.equal(missingEvidence.crossDeviceCandidate, false);
  assert.equal(
    evidence.isOwnerContextRecoveryEvidence({
      ...missingEvidence,
      ownerPublicKey: walletContext.ownerPublicKey,
    }),
    false,
    "missing evidence must not validate while carrying owner-specific fields.",
  );
} finally {
  cleanup();
}

console.log("Vanta owner-context recovery evidence check: PASS");
