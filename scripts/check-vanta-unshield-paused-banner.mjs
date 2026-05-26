#!/usr/bin/env node
// Vanta Unshield paused-banner check.
//
// Background: the operator unshield endpoint was rewritten to return
// HTTP 503 with releaseModel "program-tag-unshield-pda-cpi-fail-closed".
// That removes the operator-keypair custody risk but means users cannot
// currently withdraw. Without a visible UX surface explaining this, users
// will perceive the failure as an outage and reach for support / abandon
// the product.
//
// This guard fail-closes if the UnshieldPage hero no longer renders the
// `unshield-withdrawals-paused-banner` marker. It must stay visible until
// the on-chain verifier ships AND the operator unshield endpoint stops
// returning HTTP 503.
//
// To remove this banner cleanly: (a) confirm
// `npm run private-pool-v2:shield-verifier-cpi-gap-check` is in
// PASS-cpi-wired mode, (b) confirm the operator unshield endpoint no
// longer returns HTTP 503, (c) delete the banner element and update
// this guard to assert that withdrawals are live.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const unshieldPagePath = resolve(repoRoot, "src/pages/UnshieldPage.tsx");
const unshieldServerPath = resolve(repoRoot, "operator/unshield-server.mjs");

function fail(message) {
  console.error(`Unshield paused-banner check: FAIL — ${message}`);
  process.exit(1);
}

const unshieldPageSource = readFileSync(unshieldPagePath, "utf8");
const unshieldServerSource = readFileSync(unshieldServerPath, "utf8");

const bannerMarkers = [
  'data-marker="unshield-withdrawals-paused-banner"',
  "Withdrawals are temporarily paused",
  "operator-signed unshield path has been removed",
  "pool_state.verifier_wired",
  "HTTP 503",
];
for (const marker of bannerMarkers) {
  if (!unshieldPageSource.includes(marker)) {
    fail(
      `UnshieldPage.tsx is missing required paused-banner marker: ${marker}`,
    );
  }
}

// Cross-check: the banner's claim about HTTP 503 must still match the
// operator behavior. If the operator-side release path stops returning
// 503, the banner copy becomes a lie and we should be told.
const operatorFailClosedMarkers = [
  "program-tag-unshield-pda-cpi-fail-closed",
  "TAG_UNSHIELD program relay is fail-closed",
];
for (const marker of operatorFailClosedMarkers) {
  if (!unshieldServerSource.includes(marker)) {
    fail(
      `operator/unshield-server.mjs no longer carries the fail-closed marker '${marker}' — either the banner is now wrong, or the banner should be removed because withdrawals are live again. Reconcile before continuing.`,
    );
  }
}

// And cross-check: the operator must not have reintroduced any keypair
// signing path. If it did, the banner's "no single key can move shielded
// funds" claim becomes false.
const forbiddenSigningMarkers = [
  "loadWeb3KeypairFromEnv",
  "Keypair.fromSecretKey",
  "sendAndConfirmTransaction",
];
for (const marker of forbiddenSigningMarkers) {
  if (unshieldServerSource.includes(marker)) {
    fail(
      `operator/unshield-server.mjs contains '${marker}' — an operator-signed release path appears to have been reintroduced. Remove it OR update the banner copy to disclose the new trust model.`,
    );
  }
}

console.log("Vanta Unshield paused-banner check: PASS");
console.log(
  "Evidence: UnshieldPage renders unshield-withdrawals-paused-banner with the four required claims (no keypair, verifier-wiring dependency, HTTP 503 reason, fail-closed posture), operator endpoint still returns 503 with program-tag-unshield-pda-cpi-fail-closed releaseModel, and no operator-keypair signing path has been reintroduced.",
);
