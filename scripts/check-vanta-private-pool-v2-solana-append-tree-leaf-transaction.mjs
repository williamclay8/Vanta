import { strict as assert } from "node:assert";

import { Keypair, SystemProgram } from "@solana/web3.js";

import {
  VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_TRANSACTION_VERSION,
  buildVantaPrivatePoolV2AppendTreeLeafInstructionData,
  buildVantaPrivatePoolV2AppendTreeLeafTransaction,
  deriveVantaPrivatePoolV2RootRecordAddress,
  deriveVantaPrivatePoolV2TreeLeafMarkerAddress,
  validateVantaPrivatePoolV2AppendTreeLeafSerializedTransaction,
} from "../src/privacy/privatePoolV2SolanaAppendTreeLeafTransaction.mjs";

const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const treeState = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const operatorAuthority = Keypair.generate().publicKey.toBase58();
const recentBlockhash = "11111111111111111111111111111111";

const outputCommitmentHex = "0x" + "aa".repeat(32);
const expectedPreviousRootHex = "0x" + "bb".repeat(32);
const expectedNewRootHex = "0x" + "cc".repeat(32);
const transitionPublicInputHashHex = "0x" + "dd".repeat(32);
const transitionKind = 3;

const instructionDataBase64 = buildVantaPrivatePoolV2AppendTreeLeafInstructionData({
  outputCommitmentHex,
  expectedPreviousRootHex,
  expectedNewRootHex,
  transitionPublicInputHashHex,
  transitionKind,
});

assert.equal(instructionDataBase64.length > 0, true);
assert.equal(Buffer.from(instructionDataBase64, "base64").length, 130);
assert.equal(Buffer.from(instructionDataBase64, "base64")[0], 9);

const treeLeafMarker = deriveVantaPrivatePoolV2TreeLeafMarkerAddress({
  instructionDataBase64,
  poolState,
  programId,
});
const rootRecord = deriveVantaPrivatePoolV2RootRecordAddress({
  instructionDataBase64,
  poolState,
  programId,
});

const built = buildVantaPrivatePoolV2AppendTreeLeafTransaction({
  programId,
  poolState,
  treeState,
  rootHistory,
  operatorAuthority,
  recentBlockhash,
  instructionDataBase64,
});

assert.equal(built.treeLeafMarker, treeLeafMarker);
assert.equal(built.rootRecord, rootRecord);
assert.equal(built.version, VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_TRANSACTION_VERSION);

const validated = validateVantaPrivatePoolV2AppendTreeLeafSerializedTransaction({
  expectedAccounts: {
    poolState,
    treeState,
    rootHistory,
    operatorAuthority,
    programId,
  },
  expectedPublicInputs: {
    outputCommitmentHex,
    expectedPreviousRootHex,
    expectedNewRootHex,
    transitionPublicInputHashHex,
    transitionKind,
  },
  programId,
  serializedTransaction: built.serializedTransaction,
});

assert.equal(validated.outputCommitmentHex, outputCommitmentHex);
assert.equal(validated.expectedNewRootHex, expectedNewRootHex);
assert.equal(validated.transitionKind, transitionKind);

try {
  validateVantaPrivatePoolV2AppendTreeLeafSerializedTransaction({
    expectedPublicInputs: {
      outputCommitmentHex: "0x" + "ff".repeat(32),
    },
    programId,
    serializedTransaction: built.serializedTransaction,
  });
  assert.fail("Expected output commitment mismatch to throw.");
} catch (error) {
  assert.match(String(error), /output commitment mismatch/);
}

console.log("Vanta Private Pool v2 Solana append-tree-leaf transaction check: PASS");
