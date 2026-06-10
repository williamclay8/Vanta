#!/usr/bin/env node
/**
 * check-verifiable-compute.mjs
 * Twitter Pass Integration guard (T6 Verifiable Compute / Veria/SP1 + Nova folding)
 * Extends T4 hybrid ZK lane for Phase 2
 */
import { readFileSync } from 'fs';

console.log('=== verifiable-compute-check (T6 + Hybrid ZK extension) ===');

try {
  const statePath = '/Users/clay/Desktop/Vanta/docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml';
  const stateContent = readFileSync(statePath, 'utf8');
  const packageJson = JSON.parse(readFileSync('/Users/clay/Desktop/Vanta/package.json', 'utf8'));

  const failures = [];

  // T6 presence
  if (!stateContent.includes('id: T6')) {
    failures.push('state.yaml missing T6 (Verifiable Compute Layer)');
  }
  if (!stateContent.includes('Verifiable Compute Layer (SP1 + Nova Folding / Veria Integration)')) {
    failures.push('T6 title missing or incorrect');
  }
  if (!stateContent.includes('SP1/RISC-V zkVM + Nova recursive folding')) {
    failures.push('T6 requirement missing SP1/Nova details');
  }
  if (!stateContent.includes('verifiable-compute-check')) {
    failures.push('T6 verification missing verifiable-compute-check guard');
  }

  // Package.json wiring
  if (!packageJson.scripts?.['verifiable-compute-check']?.includes('node scripts/check-verifiable-compute.mjs')) {
    failures.push('package.json missing canonical verifiable-compute-check script');
  }
  if (!packageJson.scripts?.['verifiable-compute-check']?.includes('npm run zk:verifiable-compute-hybrid-circuit-check')) {
    failures.push('verifiable-compute-check does not run the hybrid Noir circuit check');
  }
  if (packageJson.scripts?.['zk:verifiable-compute-hybrid-circuit-check'] !== 'node scripts/check-vanta-phase2-product-noir-circuit.mjs verifiable-compute-hybrid') {
    failures.push('package.json missing canonical verifiable compute hybrid circuit script');
  }
  if (!packageJson.scripts?.['twitter-intelligence:check']?.includes('npm run verifiable-compute-check')) {
    failures.push('twitter-intelligence:check does not include verifiable-compute-check');
  }

  // Hybrid ZK extension notes (from cadence note)
  if (!stateContent.includes('T4 hybrid') && !stateContent.includes('hybrid ZK')) {
    failures.push('T4 hybrid ZK section missing extension notes for verifiable compute');
  }

  if (failures.length === 0) {
    console.log('PASS: T6 verifiable-compute declared, wired in package.json and twitter-intelligence:check, hybrid ZK extensions present');
    process.exit(0);
  }

  console.error('FAIL: verifiable compute contract incomplete');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
