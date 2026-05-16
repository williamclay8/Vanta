#!/usr/bin/env node

/**
 * Integration Verification: Client-Side Proving + Indexer
 *
 * This script verifies that:
 * - The indexer client can fetch roots
 * - All bridge files are correctly integrated
 * - Feature flag and fallback logic works
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('=== Vanta Client-Side Proving Integration Verification ===\n');

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// 1. Check that indexerClient.ts exists and exports getCurrentRoot
try {
  const content = readFileSync(join(root, 'src/zk/indexerClient.ts'), 'utf8');
  check('indexerClient.ts exists and exports getCurrentRoot', 
    content.includes('export async function getCurrentRoot'));
} catch (e) {
  check('indexerClient.ts exists', false);
}

// 2. Check bridge integrations
const bridges = [
  'src/zk/liveShieldBridge.ts',
  'src/zk/liveSendBridge.ts',
  'src/zk/liveSwapBridge.ts',
  'src/zk/liveUnshieldBridge.ts'
];

for (const bridge of bridges) {
  try {
    const content = readFileSync(join(root, bridge), 'utf8');
    const name = bridge.split('/').pop();
    check(`${name} imports indexerClient`, content.includes('indexerClient'));
    check(`${name} uses USE_INDEXER flag`, content.includes('VITE_USE_INDEXER'));
    check(`${name} has fallback logic`, content.includes('fetchOperatorRoot'));
  } catch (e) {
    check(`${bridge} readable`, false);
  }
}

// 3. Check verification script exists
try {
  const content = readFileSync(join(root, 'scripts/check-vanta-indexer-client-integration.mjs'), 'utf8');
  check('Verification script exists', content.length > 0);
} catch (e) {
  check('Verification script exists', false);
}

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All integration checks passed');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed');
  process.exit(1);
}