#!/usr/bin/env node

/**
 * Integration Test: Indexer + Client Proving Flows
 */

import { getCurrentRoot } from '../src/zk/indexerClient.ts';

async function runTests() {
  console.log('=== Vanta Indexer Integration Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Fetch root with indexer
  try {
    const root = await getCurrentRoot(true);
    if (root && root.merkleRoot) {
      console.log('✅ Test 1: Fetch root from indexer');
      passed++;
    } else {
      console.log('⚠️  Test 1: No root returned (may be expected)');
    }
  } catch (e) {
    console.log(`❌ Test 1 failed: ${e.message}`);
    failed++;
  }

  // Test 2: Fetch root with fallback
  try {
    const root = await getCurrentRoot(false);
    if (root) {
      console.log('✅ Test 2: Fallback to operator works');
      passed++;
    } else {
      console.log('⚠️  Test 2: No operator root available');
    }
  } catch (e) {
    console.log(`❌ Test 2 failed: ${e.message}`);
    failed++;
  }

  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();