#!/usr/bin/env node
/**
 * check-local-proving-enforced.mjs
 *
 * Twitter Pass Integration guard (T2)
 * Added 2026-06-06
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== local-proving-enforced-check (T2) ===');

try {
  const repoRoot = resolve(import.meta.dirname, '..');
  const statePath = resolve(repoRoot, 'docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml');
  const stateContent = readFileSync(statePath, 'utf8');
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  const securityLimitations = readFileSync(resolve(repoRoot, 'SECURITY_LIMITATIONS.md'), 'utf8');
  const payPublicView = readFileSync(
    resolve(repoRoot, 'src/pay/vantaPayReceiptPublicView.ts'),
    'utf8',
  );
  const payTypes = readFileSync(resolve(repoRoot, 'src/pay/vantaPayTypes.ts'), 'utf8');
  const failures = [];

  for (const marker of [
    'local_proving_enforced:',
    'default_mode: "client_side_only"',
    'fallback_allowed: false',
    'evidence_required: "private_inputs_never_leave_client"',
    'wired_into: ["truth:privacy-claim-gate", "C01_verifier", "Private_Pool_v2"]',
  ]) {
    if (!stateContent.includes(marker)) failures.push(`state.yaml missing ${marker}`);
  }
  for (const marker of [
    'local/client-side proving is the default privacy direction',
    'private inputs and witnesses must not leave the client device by default',
    'server-side proving is only an explicit fallback after consent and audit labeling',
  ]) {
    if (!securityLimitations.includes(marker)) {
      failures.push(`SECURITY_LIMITATIONS.md missing local proving marker: ${marker}`);
    }
  }
  for (const marker of [
    'localProving',
    'privateInputsLeaveClient: false',
    'verificationCommand: "npm run local-proving-enforced-check"',
  ]) {
    if (!payPublicView.includes(marker) && !payTypes.includes(marker)) {
      failures.push(`Pay receipt public view missing ${marker}`);
    }
  }
  if (
    packageJson.scripts?.['local-proving-enforced-check'] !==
    'node scripts/check-local-proving-enforced.mjs'
  ) {
    failures.push('package.json missing canonical local-proving-enforced-check script');
  }
  if (!packageJson.scripts?.['truth:privacy-claim-gate']?.includes('twitter-intelligence:check')) {
    failures.push('truth:privacy-claim-gate is not wired to twitter-intelligence:check');
  }

  if (failures.length === 0) {
    console.log('PASS: local proving is tracked in state, docs, Pay receipts, and npm gates');
    process.exit(0);
  }

  console.error('FAIL: local proving enforcement contract incomplete');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
