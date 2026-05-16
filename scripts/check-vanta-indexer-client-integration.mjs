#!/usr/bin/env node

/**
 * Verification script: Indexer Client Integration
 *
 * Checks that the indexer client is properly wired into the live bridges
 * and that the feature flag + fallback logic is in place.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const bridgeFiles = [
  'src/zk/liveShieldBridge.ts',
  'src/zk/liveSendBridge.ts',
  'src/zk/liveSwapBridge.ts',
  'src/zk/liveUnshieldBridge.ts'
];

const clientFile = 'src/zk/indexerClient.ts';

let passed = true;

// Check bridge files
for (const file of bridgeFiles) {
  const fullPath = join(root, file);
  try {
    const content = readFileSync(fullPath, 'utf8');

    if (!content.includes('getCurrentRoot')) {
      console.error(`❌ ${file} is missing getCurrentRoot import/usage`);
      passed = false;
    }

    if (!content.includes('VITE_USE_INDEXER')) {
      console.error(`❌ ${file} is missing VITE_USE_INDEXER feature flag`);
      passed = false;
    }

    if (!content.includes('fetchOperatorRoot')) {
      console.error(`❌ ${file} is missing fetchOperatorRoot fallback`);
      passed = false;
    }

    console.log(`✅ ${file} passes basic integration checks`);
  } catch (err) {
    console.error(`❌ Could not read ${file}: ${err.message}`);
    passed = false;
  }
}

// Check indexer client file
const clientPath = join(root, clientFile);
try {
  const content = readFileSync(clientPath, 'utf8');

  if (!content.includes('getCurrentRoot')) {
    console.error(`❌ ${clientFile} is missing getCurrentRoot export`);
    passed = false;
  }

  console.log(`✅ ${clientFile} passes basic integration checks`);
} catch (err) {
  console.error(`❌ Could not read ${clientFile}: ${err.message}`);
  passed = false;
}

if (passed) {
  console.log('\n✅ All indexer integration checks passed');
  process.exit(0);
} else {
  console.log('\n❌ Some indexer integration checks failed');
  process.exit(1);
}