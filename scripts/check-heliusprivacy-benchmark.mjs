#!/usr/bin/env node
/**
 * check-heliusprivacy-benchmark.mjs
 *
 * Twitter Pass Integration guard (T5)
 * Added 2026-06-06
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== heliusprivacy-benchmark-check (T5) ===');

try {
  const repoRoot = resolve(import.meta.dirname, '..');
  const statePath = resolve(repoRoot, 'docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml');
  const stateContent = readFileSync(statePath, 'utf8');
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  const watchItem = readFileSync(
    resolve(repoRoot, 'docs/twitter-intelligence/heliusprivacy-watch.md'),
    'utf8',
  );
  const requirements = readFileSync(
    resolve(repoRoot, 'docs/twitter-intelligence/2026-06-06-requirements.md'),
    'utf8',
  );
  const failures = [];

  for (const marker of [
    'heliusprivacy_benchmark:',
    'cadence: "before_every_major_release"',
    'last_run: "2026-06-06"',
  ]) {
    if (!stateContent.includes(marker)) failures.push(`state.yaml missing ${marker}`);
  }
  for (const marker of [
    'HeliusPrivacy',
    'primary Solana-native privacy benchmark',
    'before every major Vanta release',
    'copy, counter, ignore, deep read',
  ]) {
    if (!watchItem.includes(marker)) failures.push(`HeliusPrivacy watch item missing ${marker}`);
  }
  if (!requirements.includes('HeliusPrivacy')) {
    failures.push('Twitter intelligence requirements doc missing HeliusPrivacy');
  }
  if (
    packageJson.scripts?.['heliusprivacy-benchmark-check'] !==
    'node scripts/check-heliusprivacy-benchmark.mjs'
  ) {
    failures.push('package.json missing canonical heliusprivacy-benchmark-check script');
  }

  if (failures.length === 0) {
    console.log('PASS: HeliusPrivacy benchmark is tracked in state, docs, and npm wiring');
    process.exit(0);
  }

  console.error('FAIL: HeliusPrivacy benchmark contract incomplete');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
