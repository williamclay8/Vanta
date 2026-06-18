#!/usr/bin/env node
/**
 * check-usage-velocity.mjs
 * Twitter Pass Integration guard (T1 + Institutional extension)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== usage-velocity-check (T1 + Institutional) ===');

try {
  const repoRoot = resolve(import.meta.dirname, '..');
  const statePath = resolve(repoRoot, 'docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml');
  const stateContent = readFileSync(statePath, 'utf8');
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));

  const failures = [];
  const requiredPrimitives = [
    'Shield',
    'Send',
    'Swap',
    'Unshield',
    'Pay',
    'Private_Pool_v2',
  ];
  const requiredFields = [
    '7d_volume_usd',
    '30d_volume_usd',
    'unique_users_7d',
    'tx_count_7d',
    'defi_flow_attribution',
    'trend',
    'evidence_status',
  ];
  const institutionalFields = [
    'institutional_volume_usd_7d',
    'institutional_volume_usd_30d',
    'institutional_unique_entities',
    'compliance_flow_attribution',
    'regulator_disclosure_requests',
    'jurisdiction_coverage',
  ];

  if (!stateContent.includes('usage_velocity:')) {
    failures.push('state.yaml missing usage_velocity root section');
  }
  if (!stateContent.includes('institutional_settlement_lane:')) {
    failures.push('state.yaml missing institutional_settlement_lane root section');
  }

  for (const primitive of requiredPrimitives) {
    const sectionMatch = stateContent.match(
      new RegExp(`\\n  ${primitive}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z_]+:|\\n#|\\n\\n#|\\n\\S|$)`, 'u'),
    );
    if (!sectionMatch) {
      failures.push(`usage_velocity missing primitive ${primitive}`);
      continue;
    }
    for (const field of requiredFields) {
      if (!sectionMatch[1].includes(`${field}:`)) {
        failures.push(`usage_velocity.${primitive} missing ${field}`);
      }
    }
    if (!sectionMatch[1].includes('institutional:')) {
      failures.push(`usage_velocity.${primitive} missing institutional sub-object`);
    }
  }

  for (const field of institutionalFields) {
    if (!stateContent.includes(`- ${field}`) && !stateContent.includes(`${field}:`)) {
      failures.push(`institutional velocity field not tracked: ${field}`);
    }
  }

  if (packageJson.scripts?.['usage-velocity-check'] !== 'node scripts/check-usage-velocity.mjs') {
    failures.push('package.json missing canonical usage-velocity-check script');
  }
  if (!packageJson.scripts?.['twitter-intelligence:check']?.includes('npm run usage-velocity-check')) {
    failures.push('twitter-intelligence:check does not run usage-velocity-check');
  }

  if (failures.length === 0) {
    console.log('PASS: usage_velocity covers all primitives, institutional fields, and npm wiring');
    process.exit(0);
  }

  console.error('FAIL: usage velocity contract incomplete');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
