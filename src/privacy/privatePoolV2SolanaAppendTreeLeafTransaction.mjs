import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_TRANSACTION_VERSION =
  "vanta-private-pool-v2-solana-append-tree-leaf-transaction-0.1";
export const VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_MAX_SERIALIZED_TRANSACTION_BYTES = 1232;

const APPEND_TREE_LEAF_INSTRUCTION_TAG = 9;
const APPEND_TREE_LEAF_INSTRUCTION_LEN = 130;
const HASH_LEN = 32;
const TREE_LEAF_MARKER_SEED = Buffer.from("vanta2leaf", "utf8");
const ROOT_RECORD_SEED = Buffer.from("vanta2root", "utf8");

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires ${fieldName}.`);
  }

  return value.trim();
}

function requirePublicKey(value, fieldName) {
  try {
    return new PublicKey(requireText(value, fieldName));
  } catch {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires valid ${fieldName}.`);
  }
}

function requireHex32(value, fieldName) {
  const text = requireText(value, fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      `Vanta Private Pool v2 Solana append-tree-leaf transaction requires 32-byte hex ${fieldName}.`,
    );
  }
  return Buffer.from(hex, "hex");
}

function requireTransitionKind(value, fieldName) {
  const kind = Number(value);
  if (!Number.isInteger(kind) || kind < 1 || kind > 255) {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires ${fieldName}.`);
  }
  return kind;
}

function requireBase64Bytes(value, fieldName, { maxBytes } = {}) {
  const text = requireText(value, fieldName);
  const base64 = text.startsWith("base64:") ? text.slice("base64:".length) : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires base64 ${fieldName}.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== base64) {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires base64 ${fieldName}.`);
  }
  if (maxBytes && bytes.length > maxBytes) {
    throw new Error(
      `Vanta Private Pool v2 Solana append-tree-leaf transaction ${fieldName} exceeds ${maxBytes} bytes.`,
    );
  }
  return bytes;
}

function requireAppendTreeLeafInstructionData(bytes) {
  if (bytes.length !== APPEND_TREE_LEAF_INSTRUCTION_LEN || bytes[0] !== APPEND_TREE_LEAF_INSTRUCTION_TAG) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires tag=9 and 130-byte instruction data.",
    );
  }
}

function outputCommitmentBytes(data) {
  return data.subarray(1, 1 + HASH_LEN);
}

function expectedPreviousRootBytes(data) {
  return data.subarray(1 + HASH_LEN, 1 + HASH_LEN * 2);
}

function expectedNewRootBytes(data) {
  return data.subarray(1 + HASH_LEN * 2, 1 + HASH_LEN * 3);
}

function transitionPublicInputHashBytes(data) {
  return data.subarray(1 + HASH_LEN * 3, 1 + HASH_LEN * 4);
}

function transitionKindByte(data) {
  return data[1 + HASH_LEN * 4];
}

function deriveTreeLeafMarkerPubkey({ programId, poolState, outputCommitment }) {
  return PublicKey.findProgramAddressSync(
    [TREE_LEAF_MARKER_SEED, poolState.toBuffer(), Buffer.from(outputCommitment)],
    programId,
  )[0];
}

function deriveRootRecordPubkey({ programId, poolState, acceptedRoot }) {
  return PublicKey.findProgramAddressSync(
    [ROOT_RECORD_SEED, poolState.toBuffer(), Buffer.from(acceptedRoot)],
    programId,
  )[0];
}

export function deriveVantaPrivatePoolV2TreeLeafMarkerAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let outputCommitment;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireAppendTreeLeafInstructionData(data);
    outputCommitment = outputCommitmentBytes(data);
  } else {
    outputCommitment = requireHex32(input.outputCommitmentHex, "outputCommitmentHex");
  }
  if (outputCommitment.length !== HASH_LEN) {
    throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction requires a 32-byte output commitment.");
  }
  return deriveTreeLeafMarkerPubkey({ programId, poolState, outputCommitment }).toBase58();
}

export function deriveVantaPrivatePoolV2RootRecordAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let acceptedRoot;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireAppendTreeLeafInstructionData(data);
    acceptedRoot = expectedNewRootBytes(data);
  } else {
    acceptedRoot = requireHex32(input.acceptedRootHex, "acceptedRootHex");
  }
  if (acceptedRoot.length !== HASH_LEN) {
    throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction requires a 32-byte accepted root.");
  }
  return deriveRootRecordPubkey({ programId, poolState, acceptedRoot }).toBase58();
}

export function buildVantaPrivatePoolV2AppendTreeLeafInstructionData(input = {}) {
  const outputCommitment = requireHex32(input.outputCommitmentHex, "outputCommitmentHex");
  const expectedPreviousRoot = requireHex32(input.expectedPreviousRootHex, "expectedPreviousRootHex");
  const expectedNewRoot = requireHex32(input.expectedNewRootHex, "expectedNewRootHex");
  const transitionPublicInputHash = requireHex32(
    input.transitionPublicInputHashHex,
    "transitionPublicInputHashHex",
  );
  const transitionKind = requireTransitionKind(input.transitionKind, "transitionKind");

  const data = Buffer.alloc(APPEND_TREE_LEAF_INSTRUCTION_LEN);
  data[0] = APPEND_TREE_LEAF_INSTRUCTION_TAG;
  outputCommitment.copy(data, 1);
  expectedPreviousRoot.copy(data, 1 + HASH_LEN);
  expectedNewRoot.copy(data, 1 + HASH_LEN * 2);
  transitionPublicInputHash.copy(data, 1 + HASH_LEN * 3);
  data[1 + HASH_LEN * 4] = transitionKind;

  return data.toString("base64");
}

function normalizeAccountMeta(account, index) {
  if (!account || typeof account !== "object") {
    throw new Error(`Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[${index}].`);
  }

  return {
    isSigner: Boolean(account.isSigner),
    isWritable: Boolean(account.isWritable),
    pubkey: requirePublicKey(account.pubkey, `accounts[${index}].pubkey`),
  };
}

function assertAppendTreeLeafProgramAccountLayout(accounts, data, programId) {
  if (accounts.length !== 7) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires exactly 7 accounts: pool, tree state, root history, root record PDA, tree leaf marker PDA, operator authority, and system program.",
    );
  }
  if (!accounts[0].isWritable || accounts[0].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[0] to be the writable pool state.",
    );
  }
  if (!accounts[1].isWritable || accounts[1].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[1] to be the writable tree state.",
    );
  }
  if (!accounts[2].isWritable || accounts[2].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[2] to be the writable root history.",
    );
  }
  if (!accounts[3].isWritable || accounts[3].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[3] to be the writable root record PDA.",
    );
  }
  const expectedRootRecord = deriveRootRecordPubkey({
    acceptedRoot: expectedNewRootBytes(data),
    poolState: accounts[0].pubkey,
    programId,
  });
  if (!accounts[3].pubkey.equals(expectedRootRecord)) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[3] to match the expected-new-root record PDA.",
    );
  }
  if (!accounts[4].isWritable || accounts[4].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[4] to be the writable tree leaf marker PDA.",
    );
  }
  const expectedLeafMarker = deriveTreeLeafMarkerPubkey({
    outputCommitment: outputCommitmentBytes(data),
    poolState: accounts[0].pubkey,
    programId,
  });
  if (!accounts[4].pubkey.equals(expectedLeafMarker)) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[4] to match the output commitment leaf marker PDA.",
    );
  }
  if (!accounts[5].isSigner || !accounts[5].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[5] to be the writable operator authority signer.",
    );
  }
  if (accounts[6].isSigner || accounts[6].isWritable || !accounts[6].pubkey.equals(SystemProgram.programId)) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction requires accounts[6] to be the read-only System Program.",
    );
  }
}

export function validateVantaPrivatePoolV2AppendTreeLeafSerializedTransaction(input = {}) {
  const serializedTransaction = requireText(input.serializedTransaction, "serializedTransaction");
  const bytes = requireBase64Bytes(
    serializedTransaction,
    "serializedTransaction",
    { maxBytes: VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_MAX_SERIALIZED_TRANSACTION_BYTES },
  );
  const transaction = VersionedTransaction.deserialize(bytes);
  const message = transaction.message;
  const programId = requirePublicKey(input.programId ?? input.expectedAccounts?.programId, "programId");

  if (message.compiledInstructions.length !== 1) {
    throw new Error(
      "Vanta Private Pool v2 Solana append-tree-leaf transaction must contain exactly one program instruction.",
    );
  }

  const compiled = message.compiledInstructions[0];
  const instructionProgramId = message.staticAccountKeys[compiled.programIdIndex];
  if (!instructionProgramId.equals(programId)) {
    throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction program id mismatch.");
  }

  const data = Buffer.from(compiled.data);
  requireAppendTreeLeafInstructionData(data);

  const accounts = compiled.accountKeyIndexes.map((index, accountIndex) =>
    normalizeAccountMeta(
      {
        pubkey: message.staticAccountKeys[index].toBase58(),
        isSigner: message.isAccountSigner(index),
        isWritable: message.isAccountWritable(index),
      },
      accountIndex,
    ),
  );

  assertAppendTreeLeafProgramAccountLayout(accounts, data, programId);

  const expectedAccounts = input.expectedAccounts ?? {};
  const expectedPublicInputs = input.expectedPublicInputs ?? {};

  if (expectedAccounts.poolState) {
    if (!accounts[0].pubkey.equals(requirePublicKey(expectedAccounts.poolState, "expectedAccounts.poolState"))) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction pool state mismatch.");
    }
  }
  if (expectedAccounts.treeState) {
    if (!accounts[1].pubkey.equals(requirePublicKey(expectedAccounts.treeState, "expectedAccounts.treeState"))) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction tree state mismatch.");
    }
  }
  if (expectedAccounts.rootHistory) {
    if (!accounts[2].pubkey.equals(requirePublicKey(expectedAccounts.rootHistory, "expectedAccounts.rootHistory"))) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction root history mismatch.");
    }
  }
  if (expectedAccounts.operatorAuthority) {
    if (!accounts[5].pubkey.equals(requirePublicKey(expectedAccounts.operatorAuthority, "expectedAccounts.operatorAuthority"))) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction operator authority mismatch.");
    }
  }
  if (expectedPublicInputs.outputCommitmentHex) {
    const expected = requireHex32(expectedPublicInputs.outputCommitmentHex, "expectedPublicInputs.outputCommitmentHex");
    if (!Buffer.from(outputCommitmentBytes(data)).equals(expected)) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction output commitment mismatch.");
    }
  }
  if (expectedPublicInputs.expectedPreviousRootHex) {
    const expected = requireHex32(
      expectedPublicInputs.expectedPreviousRootHex,
      "expectedPublicInputs.expectedPreviousRootHex",
    );
    if (!Buffer.from(expectedPreviousRootBytes(data)).equals(expected)) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction expected previous root mismatch.");
    }
  }
  if (expectedPublicInputs.expectedNewRootHex) {
    const expected = requireHex32(expectedPublicInputs.expectedNewRootHex, "expectedPublicInputs.expectedNewRootHex");
    if (!Buffer.from(expectedNewRootBytes(data)).equals(expected)) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction expected new root mismatch.");
    }
  }
  if (expectedPublicInputs.transitionPublicInputHashHex) {
    const expected = requireHex32(
      expectedPublicInputs.transitionPublicInputHashHex,
      "expectedPublicInputs.transitionPublicInputHashHex",
    );
    if (!Buffer.from(transitionPublicInputHashBytes(data)).equals(expected)) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction transition public input hash mismatch.");
    }
  }
  if (expectedPublicInputs.transitionKind !== undefined) {
    const expected = requireTransitionKind(expectedPublicInputs.transitionKind, "expectedPublicInputs.transitionKind");
    if (transitionKindByte(data) !== expected) {
      throw new Error("Vanta Private Pool v2 Solana append-tree-leaf transaction transition kind mismatch.");
    }
  }

  return {
    instructionDataBase64: data.toString("base64"),
    outputCommitmentHex: `0x${outputCommitmentBytes(data).toString("hex")}`,
    expectedPreviousRootHex: `0x${expectedPreviousRootBytes(data).toString("hex")}`,
    expectedNewRootHex: `0x${expectedNewRootBytes(data).toString("hex")}`,
    transitionPublicInputHashHex: `0x${transitionPublicInputHashBytes(data).toString("hex")}`,
    transitionKind: transitionKindByte(data),
    version: VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_TRANSACTION_VERSION,
  };
}

export function buildVantaPrivatePoolV2AppendTreeLeafTransaction(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  const treeState = requirePublicKey(input.treeState, "treeState");
  const rootHistory = requirePublicKey(input.rootHistory, "rootHistory");
  const operatorAuthority = requirePublicKey(input.operatorAuthority, "operatorAuthority");
  const recentBlockhash = requireText(input.recentBlockhash, "recentBlockhash");
  const instructionDataBase64 =
    input.instructionDataBase64 ??
    buildVantaPrivatePoolV2AppendTreeLeafInstructionData({
      outputCommitmentHex: input.outputCommitmentHex,
      expectedPreviousRootHex: input.expectedPreviousRootHex,
      expectedNewRootHex: input.expectedNewRootHex,
      transitionPublicInputHashHex: input.transitionPublicInputHashHex,
      transitionKind: input.transitionKind,
    });

  const instructionData = requireBase64Bytes(instructionDataBase64, "instructionDataBase64");
  requireAppendTreeLeafInstructionData(instructionData);

  const rootRecord = deriveRootRecordPubkey({
    acceptedRoot: expectedNewRootBytes(instructionData),
    poolState,
    programId,
  });
  const treeLeafMarker = deriveTreeLeafMarkerPubkey({
    outputCommitment: outputCommitmentBytes(instructionData),
    poolState,
    programId,
  });

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: poolState, isSigner: false, isWritable: true },
      { pubkey: treeState, isSigner: false, isWritable: true },
      { pubkey: rootHistory, isSigner: false, isWritable: true },
      { pubkey: rootRecord, isSigner: false, isWritable: true },
      { pubkey: treeLeafMarker, isSigner: false, isWritable: true },
      { pubkey: operatorAuthority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });

  const message = new TransactionMessage({
    payerKey: operatorAuthority,
    recentBlockhash,
    instructions: [instruction],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  const serializedTransaction = Buffer.from(transaction.serialize()).toString("base64");

  validateVantaPrivatePoolV2AppendTreeLeafSerializedTransaction({
    expectedAccounts: {
      poolState: poolState.toBase58(),
      treeState: treeState.toBase58(),
      rootHistory: rootHistory.toBase58(),
      operatorAuthority: operatorAuthority.toBase58(),
      programId: programId.toBase58(),
    },
    expectedPublicInputs: {
      outputCommitmentHex: `0x${outputCommitmentBytes(instructionData).toString("hex")}`,
      expectedPreviousRootHex: `0x${expectedPreviousRootBytes(instructionData).toString("hex")}`,
      expectedNewRootHex: `0x${expectedNewRootBytes(instructionData).toString("hex")}`,
      transitionPublicInputHashHex: `0x${transitionPublicInputHashBytes(instructionData).toString("hex")}`,
      transitionKind: transitionKindByte(instructionData),
    },
    programId: programId.toBase58(),
    serializedTransaction,
  });

  return {
    instructionDataBase64,
    rootRecord: rootRecord.toBase58(),
    serializedTransaction,
    treeLeafMarker: treeLeafMarker.toBase58(),
    version: VANTA_PRIVATE_POOL_V2_SOLANA_APPEND_TREE_LEAF_TRANSACTION_VERSION,
  };
}
