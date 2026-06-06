#!/usr/bin/env node
/**
 * check-hybrid-zk-design.mjs
 * Twitter Pass guard (T4)
 */
import { readFileSync } from 'fs';
console.log('=== hybrid-zk-design-check (T4) ===');
const state = readFileSync('/Users/clay/Desktop/Vanta/docs/goals/2026-05-14-claude-privacy-audit-tracker/state.yaml', 'utf8');
const packageJson = JSON.parse(readFileSync('/Users/clay/Desktop/Vanta/package.json', 'utf8'));
const threatModel = readFileSync('/Users/clay/Desktop/Vanta/docs/threat-model.md', 'utf8');
const limitations = readFileSync('/Users/clay/Desktop/Vanta/SECURITY_LIMITATIONS.md', 'utf8');
const failures = [];

for (const marker of [
  'hybrid_zk_design_details:',
  'required_non_zk_mechanisms',
  'blinded_tokens',
  'revocation_layers',
  'pure_zk_limitation_to_solve: "identity verification and selective audit without full de-anonymization"',
  'threat_model_section: "Hybrid ZK + selective disclosure boundary"',
]) {
  if (!state.includes(marker)) failures.push(`state.yaml missing ${marker}`);
}
for (const marker of [
  'Hybrid ZK + selective disclosure boundary',
  'ZK proves validity, not every product policy boundary',
  'non-ZK mechanisms such as scoped viewing keys, revocation lists, blinded-token relayer access, policy allowlists, and operator runbooks',
]) {
  if (!threatModel.includes(marker)) failures.push(`docs/threat-model.md missing ${marker}`);
}
for (const marker of [
  'Hybrid ZK design limitation',
  'ZK proofs do not by themselves provide selective regulator access, revocation, relayer network privacy, identity policy, or usage attribution',
]) {
  if (!limitations.includes(marker)) failures.push(`SECURITY_LIMITATIONS.md missing ${marker}`);
}
if (
  packageJson.scripts?.['hybrid-zk-design-check'] !== 'node scripts/check-hybrid-zk-design.mjs'
) {
  failures.push('package.json missing canonical hybrid-zk-design-check script');
}

if (failures.length === 0) {
  console.log('PASS: hybrid ZK design is tracked in state, threat model, limitations, and npm wiring');
  process.exit(0);
}

console.error('FAIL: hybrid ZK design contract incomplete');
for (const failure of failures) console.error(`- ${failure}`);
process.exit(1);
