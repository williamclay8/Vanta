#!/usr/bin/env node
/**
 * check-institutional-lane.mjs
 * Twitter Pass guard (T3)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
console.log('=== institutional-lane-check (T3) ===');
const repoRoot = resolve(import.meta.dirname, '..');
const state = readFileSync(resolve(repoRoot, 'docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const docs = [
  readFileSync(resolve(repoRoot, 'docs/privacy-rail-contract.md'), 'utf8'),
  readFileSync(resolve(repoRoot, 'docs/twitter-intelligence/2026-06-06-requirements.md'), 'utf8'),
].join('\n');
const payTypes = readFileSync(resolve(repoRoot, 'src/pay/vantaPayTypes.ts'), 'utf8');
const payView = readFileSync(resolve(repoRoot, 'src/pay/vantaPayReceiptPublicView.ts'), 'utf8');
const payInstitutionalDisclosureReceipt = readFileSync(resolve(repoRoot, 'src/pay/vantaPayInstitutionalDisclosureReceipt.ts'), 'utf8');
const failures = [];

for (const marker of [
  'institutional_lane_details:',
  'band_item: "T3-Institutional-Settlement"',
  'selective_disclosure',
  'audit_trails',
  'jurisdiction_aware_unshield',
  'regulator_access_controls',
  'institutional_settlement_lane:',
  'status: "opened"',
]) {
  if (!state.includes(marker)) failures.push(`state.yaml missing ${marker}`);
}
for (const marker of [
  'counterparty-verifiable private settlement',
  'selective disclosure',
  'time and scope limited',
  'institutional velocity',
]) {
  if (!docs.includes(marker)) failures.push(`docs missing institutional marker: ${marker}`);
}
for (const marker of [
  'institutionalDisclosure',
  'receiptSchemaVersion',
  'vanta-pay-institutional-disclosure-receipt-v0.1',
  'regulatorScope',
  'verificationCommand: "npm run pay:institutional-disclosure-receipt-check"',
]) {
  if (
    !payTypes.includes(marker) &&
    !payView.includes(marker) &&
    !payInstitutionalDisclosureReceipt.includes(marker)
  ) {
    failures.push(`Pay receipt public view missing institutional marker: ${marker}`);
  }
}
if (
  packageJson.scripts?.['pay:institutional-disclosure-receipt-check'] !==
  'node scripts/check-vanta-pay-institutional-disclosure-receipt.mjs'
) {
  failures.push('package.json missing Pay institutional disclosure receipt script');
}
if (
  packageJson.scripts?.['institutional-lane-check'] !==
  'node scripts/check-institutional-lane.mjs'
) {
  failures.push('package.json missing canonical institutional-lane-check script');
}

if (failures.length === 0) {
  console.log('PASS: institutional lane is tracked in state, docs, receipts, and npm wiring');
  process.exit(0);
}

console.error('FAIL: institutional lane contract incomplete');
for (const failure of failures) console.error(`- ${failure}`);
process.exit(1);
