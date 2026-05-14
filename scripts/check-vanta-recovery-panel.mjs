import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const componentPath = resolve(repoRoot, "src/components/RecoveryPanel.tsx");
assert.ok(existsSync(componentPath), "Shared RecoveryPanel component must exist.");

const componentSource = readFileSync(componentPath, "utf8");
const controllerSource = readRepoFile("src/components/RecoveryPanelController.tsx");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const stylesSource = readRepoFile("src/styles.css");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export type RecoveryPanelStatusItem",
  "export function RecoveryPanel",
  "type RecoveryPanelProps",
  "recovery-panel",
  "recovery-panel__summary-grid",
  "recovery-panel__actions",
  "recovery-panel__field",
  "recoveryPanelStatusItems",
  "onRecordSourceImportTextChange",
  "onViewingKeyImportTextChange",
]) {
  assert.ok(componentSource.includes(marker), `RecoveryPanel component missing marker: ${marker}`);
}

for (const marker of [
  "import { RecoveryPanelController",
  "<RecoveryPanelController",
  "viewingKeyControls={viewingKey}",
]) {
  assert.ok(shieldPageSource.includes(marker), `ShieldPage missing RecoveryPanel controller marker: ${marker}`);
}

for (const marker of [
  'from "@/components/RecoveryPanel"',
  "<RecoveryPanel",
  "ownerRecoveryEvidenceLabel",
  "recordSourceImportProofLabel",
  "legacyQuarantinePolicyLabel",
  "exportRecordSourcePacket",
  "verifyRecordSourcePacket",
  "setViewingKeyBackupText(viewingKey.exportText);",
  "viewingKey.importText(viewingKeyImportText);",
  "viewingKey.reset();",
  "browser's localStorage",
  "local notes undiscoverable",
  "valid backup and record source packet",
]) {
  assert.ok(
    controllerSource.includes(marker),
    `RecoveryPanelController missing RecoveryPanel marker: ${marker}`,
  );
}

for (const legacyMarker of [
  '<details className="shield-viewing-key-panel"',
  'className="shield-viewing-key-panel__body"',
  'className="shield-viewing-key-panel__actions"',
  'className="shield-viewing-key-panel__field"',
]) {
  assert.ok(
    !shieldPageSource.includes(legacyMarker),
    `ShieldPage must not keep legacy inline recovery panel marker: ${legacyMarker}`,
  );
}

for (const marker of [
  ".recovery-panel",
  ".recovery-panel__summary-grid",
  ".recovery-panel__actions",
  ".recovery-panel__field",
  "overflow-wrap: anywhere",
  "font-variant-numeric: tabular-nums",
]) {
  assert.ok(stylesSource.includes(marker), `RecoveryPanel styles missing marker: ${marker}`);
}

assert.equal(
  packageJson.scripts["recovery:panel-check"],
  "node scripts/check-vanta-recovery-panel.mjs",
  "package.json must expose recovery:panel-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes("npm run recovery:panel-check"),
  "truth:privacy-claim-gate must include recovery:panel-check.",
);
assert.ok(
  packageJson.scripts["shield:verify"]?.includes("npm run recovery:panel-check"),
  "shield:verify must include recovery:panel-check.",
);

console.log("Vanta RecoveryPanel extraction check: PASS");
