import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const controllerPath = resolve(repoRoot, "src/components/RecoveryPanelController.tsx");
const pagePath = resolve(repoRoot, "src/pages/RecoverySettingsPage.tsx");

assert.ok(existsSync(controllerPath), "RecoveryPanelController component must exist.");
assert.ok(existsSync(pagePath), "RecoverySettingsPage route page must exist.");

const controllerSource = readFileSync(controllerPath, "utf8");
const pageSource = readFileSync(pagePath, "utf8");
const panelSource = readRepoFile("src/components/RecoveryPanel.tsx");
const shieldPageSource = readRepoFile("src/pages/ShieldPage.tsx");
const shieldWorkspaceSource = readRepoFile("src/components/ShieldWorkspaceCard.tsx");
const shieldSurfaceSource = `${shieldPageSource}\n${shieldWorkspaceSource}`;
const appSource = readRepoFile("src/App.tsx");
const appLayoutSource = readRepoFile("src/components/AppLayout.tsx");
const browserCheckSource = readRepoFile("scripts/check-vanta-product-ui-browser.mjs");
const packageJson = JSON.parse(readRepoFile("package.json"));

for (const marker of [
  "export function RecoveryPanelController",
  "useVantaShieldViewingKey",
  "useVantaShieldOwnerContext",
  "createOwnerContextRecordSourceImportPacket",
  "verifyOwnerContextRecordSourceImport",
  "formatRecordSourceImportStatusLabel",
  "RecoveryPanel",
  "defaultOpen",
  "browser's localStorage",
  "local notes undiscoverable",
]) {
  assert.ok(
    controllerSource.includes(marker),
    `RecoveryPanelController missing marker: ${marker}`,
  );
}

for (const marker of [
  "export function RecoverySettingsPage",
  "Recovery settings",
  "RecoveryPanelController",
  "data-vanta-recovery-settings-route",
  "Viewing-key backup",
  "record source",
  "recovery production privacy",
]) {
  assert.ok(pageSource.includes(marker), `RecoverySettingsPage missing marker: ${marker}`);
}

assert.ok(
  panelSource.includes("defaultOpen?: boolean") &&
    panelSource.includes("open={defaultOpen ? true : undefined}"),
  "RecoveryPanel must support defaultOpen for the dedicated settings route.",
);

assert.ok(
  shieldSurfaceSource.includes("import { RecoveryPanelController") &&
    shieldSurfaceSource.includes("<RecoveryPanelController"),
  "ShieldPage must render the shared RecoveryPanelController for first-time setup.",
);
assert.ok(
  !shieldPageSource.includes("import { RecoveryPanel }"),
  "ShieldPage must not keep direct RecoveryPanel wiring after the controller extraction.",
);

assert.ok(
  appSource.includes("RecoverySettingsPage") &&
    appSource.includes('path="settings/recovery"') &&
    appSource.includes("<RecoverySettingsPage />"),
  "App routes must expose /app/settings/recovery.",
);

for (const marker of [
  '{ to: "/app/settings/recovery", label: "Recovery", action: "Keys & records", end: false }',
  "activeMoreLink",
]) {
  assert.ok(appLayoutSource.includes(marker), `AppLayout missing recovery route marker: ${marker}`);
}

for (const marker of [
  "/app/settings/recovery",
  "[data-vanta-recovery-settings-route]",
  ".recovery-panel",
  "Recovery settings",
]) {
  assert.ok(browserCheckSource.includes(marker), `Product UI browser check missing marker: ${marker}`);
}

assert.equal(
  packageJson.scripts["recovery:settings-route-check"],
  "node scripts/check-vanta-recovery-settings-route.mjs",
  "package.json must expose recovery:settings-route-check.",
);
assert.ok(
  packageJson.scripts["truth:privacy-claim-gate"]?.includes(
    "npm run recovery:settings-route-check",
  ),
  "truth:privacy-claim-gate must include recovery:settings-route-check.",
);

console.log("Vanta recovery settings route check: PASS");
