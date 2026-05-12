import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION =
  "vanta-private-pool-v2-solana-spend-transaction-0.3";
export const VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES = 1232;

export const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const SPEND_INSTRUCTION_TAG = 1;
const SPEND_INSTRUCTION_LEN = 161;
const HASH_LEN = 32;
const NULLIFIER_MARKER_SEED = Buffer.from("vanta2nul", "utf8");
const OUTPUT_RECORD_SEED = Buffer.from("vanta2out", "utf8");

const forbiddenPublicSpendTerms = [
  "amount",
  "asset",
  "destination",
  "inputCommitment",
  "inputLeafIndex",
  "merchantSettlementAddress",
  "owner",
  "payerSourceWallet",
  "rawAmount",
  "rawAsset",
  "sourceWallet",
];
const forbiddenProofSpendTerms = [
  "onChainVerifier",
  "proof",
  "proof_artifact",
  "proof_bytes",
  "proofArtifact",
  "proofBackend",
  "proofBytes",
  "proofSystem",
  "verifierProgramId",
  "verifier_program_id",
  "verifying_key_hash",
  "verifyingKey",
  "verifyingKeyHash",
];

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires ${fieldName}.`);
  }

  return value.trim();
}

function requirePublicKey(value, fieldName) {
  try {
    return new PublicKey(requireText(value, fieldName));
  } catch (error) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires valid ${fieldName}.`);
  }
}

function requireBase64Bytes(value, fieldName, { maxBytes } = {}) {
  const text = requireText(value, fieldName);
  const base64 = text.startsWith("base64:") ? text.slice("base64:".length) : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires base64 ${fieldName}.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== base64) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires base64 ${fieldName}.`);
  }
  if (maxBytes && bytes.length > maxBytes) {
    throw new Error(
      `Vanta Private Pool v2 Solana spend transaction ${fieldName} exceeds ${maxBytes} bytes.`,
    );
  }

  return bytes;
}

function requireSpendInstructionData(bytes) {
  if (bytes.length !== SPEND_INSTRUCTION_LEN || bytes[0] !== SPEND_INSTRUCTION_TAG) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires tag=1 and 161-byte spend instruction data.",
    );
  }
}

function requireSerializedTransaction(value) {
  return VersionedTransaction.deserialize(
    requireBase64Bytes(
      value,
      "serializedTransaction",
      { maxBytes: VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_MAX_SERIALIZED_TRANSACTION_BYTES },
    ),
  );
}

function requireHex32(value, fieldName) {
  const text = requireText(value, fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires 32-byte hex ${fieldName}.`);
  }
  return Buffer.from(hex, "hex");
}

function bytesToHex32(bytes) {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function spendNullifierBytes(data) {
  return data.subarray(1, 1 + HASH_LEN);
}

function spendOutput0Bytes(data) {
  return data.subarray(1 + HASH_LEN, 1 + HASH_LEN * 2);
}

function spendOutput1Bytes(data) {
  return data.subarray(1 + HASH_LEN * 2, 1 + HASH_LEN * 3);
}

function spendAcceptedRootBytes(data) {
  return data.subarray(1 + HASH_LEN * 3, 1 + HASH_LEN * 4);
}

function spendPublicInputHashBytes(data) {
  return data.subarray(1 + HASH_LEN * 4, 1 + HASH_LEN * 5);
}

function deriveNullifierMarkerPubkey({ programId, poolState, nullifier }) {
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_MARKER_SEED, poolState.toBuffer(), Buffer.from(nullifier)],
    programId,
  )[0];
}

function deriveOutputRecordPubkey({ programId, poolState, publicInputHash }) {
  return PublicKey.findProgramAddressSync(
    [OUTPUT_RECORD_SEED, poolState.toBuffer(), Buffer.from(publicInputHash)],
    programId,
  )[0];
}

export function deriveVantaPrivatePoolV2NullifierMarkerAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let nullifier;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireSpendInstructionData(data);
    nullifier = spendNullifierBytes(data);
  } else {
    nullifier = requireHex32(input.nullifierHex, "nullifierHex");
  }
  if (nullifier.length !== HASH_LEN) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires a 32-byte nullifier.");
  }
  return deriveNullifierMarkerPubkey({ programId, poolState, nullifier }).toBase58();
}

export function deriveVantaPrivatePoolV2OutputRecordAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let publicInputHash;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireSpendInstructionData(data);
    publicInputHash = spendPublicInputHashBytes(data);
  } else {
    publicInputHash = requireHex32(input.publicInputHashHex, "publicInputHashHex");
  }
  if (publicInputHash.length !== HASH_LEN) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires a 32-byte public input hash.");
  }
  return deriveOutputRecordPubkey({ programId, poolState, publicInputHash }).toBase58();
}

function assertNotMemoProgram(programId) {
  if (programId.toBase58() === SOLANA_MEMO_PROGRAM_ID) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction cannot use the Memo program as spend evidence.");
  }
}

function assertNoForbiddenPublicTerms(value, path = "transaction") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPublicSpendTerms.includes(key) || forbiddenProofSpendTerms.includes(key)) {
      throw new Error(`Vanta Private Pool v2 Solana spend transaction forbids ${path}.${key}.`);
    }
    assertNoForbiddenPublicTerms(child, `${path}.${key}`);
  }
}

function normalizeAccountMeta(account, index) {
  if (!account || typeof account !== "object") {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction requires accounts[${index}].`);
  }

  return {
    isSigner: Boolean(account.isSigner),
    isWritable: Boolean(account.isWritable),
    pubkey: requirePublicKey(account.pubkey, `accounts[${index}].pubkey`),
  };
}

function assertSpendProgramAccountLayout(accounts, data, programId) {
  if (accounts.length !== 8) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires exactly 8 spend accounts: pool, nullifier set, output index, root history, nullifier marker, output record PDA, operator authority, and system program.",
    );
  }
  if (!accounts[0].isWritable || accounts[0].isSigner) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires accounts[0] to be the writable pool state.");
  }
  if (accounts[1].isSigner || accounts[1].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[1] to be the read-only nullifier set header account.",
    );
  }
  if (!accounts[2].isWritable || accounts[2].isSigner) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires accounts[2] to be the writable output index.");
  }
  if (accounts[3].isSigner || accounts[3].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[3] to be the read-only root history account.",
    );
  }
  if (!accounts[4].isWritable || accounts[4].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[4] to be the writable nullifier marker PDA.",
    );
  }
  const expectedMarker = deriveNullifierMarkerPubkey({
    nullifier: spendNullifierBytes(data),
    poolState: accounts[0].pubkey,
    programId,
  });
  if (!accounts[4].pubkey.equals(expectedMarker)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[4] to match the spend nullifier PDA marker.",
    );
  }
  if (!accounts[5].isWritable || accounts[5].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[5] to be the writable output record PDA.",
    );
  }
  const expectedOutputRecord = deriveOutputRecordPubkey({
    poolState: accounts[0].pubkey,
    programId,
    publicInputHash: spendPublicInputHashBytes(data),
  });
  if (!accounts[5].pubkey.equals(expectedOutputRecord)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[5] to match the spend output record PDA.",
    );
  }
  if (!accounts[6].isSigner || !accounts[6].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[6] to be the writable operator authority signer.",
    );
  }
  if (accounts[7].isSigner || accounts[7].isWritable || !accounts[7].pubkey.equals(SystemProgram.programId)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction requires accounts[7] to be the read-only System Program.",
    );
  }
}

function assertPublicKeyMatches(actual, expected, fieldName) {
  if (expected === undefined || expected === null || expected === "") {
    return;
  }
  const expectedPubkey = requirePublicKey(expected, fieldName);
  if (!actual.equals(expectedPubkey)) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction ${fieldName} mismatch.`);
  }
}

function assertBytesMatch(actual, expected, fieldName) {
  const expectedBytes = requireHex32(expected, fieldName);
  if (!Buffer.from(actual).equals(expectedBytes)) {
    throw new Error(`Vanta Private Pool v2 Solana spend transaction ${fieldName} mismatch.`);
  }
}

function normalizeExpectedOutputCommitments(expectedPublicInputs = {}) {
  if (Array.isArray(expectedPublicInputs.outputCommitments)) {
    return expectedPublicInputs.outputCommitments;
  }
  return [
    expectedPublicInputs.outputCommitment,
    expectedPublicInputs.changeOutputCommitment,
  ];
}

function assertExpectedPublicInputsComplete(expectedPublicInputs = {}) {
  const outputCommitments = normalizeExpectedOutputCommitments(expectedPublicInputs);
  const missing = [];
  if (!expectedPublicInputs.acceptedRoot) {
    missing.push("acceptedRoot");
  }
  if (!expectedPublicInputs.nullifier && !expectedPublicInputs.nullifierOrReplayCommitment) {
    missing.push("nullifierOrReplayCommitment");
  }
  if (outputCommitments.length !== 2 || outputCommitments.some((commitment) => !commitment)) {
    missing.push("outputCommitments");
  }
  if (!expectedPublicInputs.privateSpendPublicInputHash) {
    missing.push("privateSpendPublicInputHash");
  }
  if (missing.length > 0) {
    throw new Error(
      `Vanta Private Pool v2 Solana spend transaction requires expected public inputs: ${missing.join(", ")}.`,
    );
  }
}

function assertExpectedAccountsComplete(expectedAccounts = {}) {
  const missing = [
    "programId",
    "poolState",
    "nullifierSet",
    "nullifierMarker",
    "outputRecord",
    "outputQueue",
    "rootHistory",
  ].filter((field) => !expectedAccounts[field]);
  if (!expectedAccounts.operatorAuthority && !expectedAccounts.relayerFeePayer) {
    missing.push("operatorAuthority");
  }
  if (missing.length > 0) {
    throw new Error(
      `Vanta Private Pool v2 Solana spend transaction requires expected account refs: ${missing.join(", ")}.`,
    );
  }
}

function compiledInstructionAccounts(message, instruction) {
  return instruction.accountKeyIndexes.map((index) => {
    const pubkey = message.staticAccountKeys[index];
    if (!pubkey) {
      throw new Error("Vanta Private Pool v2 Solana spend transaction has an invalid account index.");
    }
    return {
      isSigner: message.isAccountSigner(index),
      isWritable: message.isAccountWritable(index),
      pubkey,
    };
  });
}

export function validateVantaPrivatePoolV2ActualPrivateSpendSerializedTransaction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const transaction = requireSerializedTransaction(input.serializedTransaction);
  if (transaction.version !== 0) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires a v0 transaction.");
  }
  if (transaction.message.addressTableLookups.length > 0) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction must not use address lookup tables.");
  }
  if (transaction.message.compiledInstructions.length !== 1) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires exactly one spend instruction.");
  }

  const instruction = transaction.message.compiledInstructions[0];
  const programId = transaction.message.staticAccountKeys[instruction.programIdIndex];
  if (!programId) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction has an invalid program id index.");
  }
  assertNotMemoProgram(programId);
  const data = Buffer.from(instruction.data);
  requireSpendInstructionData(data);
  const accounts = compiledInstructionAccounts(transaction.message, instruction);
  assertSpendProgramAccountLayout(accounts, data, programId);

  const expectedAccounts = input.expectedAccounts ?? {};
  if (input.requireExpectedAccounts) {
    assertExpectedAccountsComplete(expectedAccounts);
  }
  assertPublicKeyMatches(programId, expectedAccounts.programId, "expectedAccounts.programId");
  assertPublicKeyMatches(accounts[0].pubkey, expectedAccounts.poolState, "expectedAccounts.poolState");
  assertPublicKeyMatches(accounts[1].pubkey, expectedAccounts.nullifierSet, "expectedAccounts.nullifierSet");
  assertPublicKeyMatches(accounts[2].pubkey, expectedAccounts.outputQueue, "expectedAccounts.outputQueue");
  assertPublicKeyMatches(accounts[3].pubkey, expectedAccounts.rootHistory, "expectedAccounts.rootHistory");
  assertPublicKeyMatches(
    accounts[4].pubkey,
    expectedAccounts.nullifierMarker,
    "expectedAccounts.nullifierMarker",
  );
  assertPublicKeyMatches(
    accounts[5].pubkey,
    expectedAccounts.outputRecord,
    "expectedAccounts.outputRecord",
  );
  assertPublicKeyMatches(
    accounts[6].pubkey,
    expectedAccounts.operatorAuthority ?? expectedAccounts.relayerFeePayer,
    "expectedAccounts.operatorAuthority",
  );
  assertPublicKeyMatches(
    transaction.message.staticAccountKeys[0],
    expectedAccounts.relayerFeePayer ?? expectedAccounts.operatorAuthority,
    "expectedAccounts.relayerFeePayer",
  );
  assertPublicKeyMatches(
    accounts[7].pubkey,
    expectedAccounts.systemProgram ?? SystemProgram.programId.toBase58(),
    "expectedAccounts.systemProgram",
  );

  const expectedPublicInputs = input.expectedPublicInputs ?? {};
  if (input.requireExpectedPublicInputs) {
    assertExpectedPublicInputsComplete(expectedPublicInputs);
  }
  if (input.requireExpectedPublicInputs || Object.keys(expectedPublicInputs).length > 0) {
    const outputCommitments = normalizeExpectedOutputCommitments(expectedPublicInputs);
    if (outputCommitments.length !== 2 || outputCommitments.some((commitment) => !commitment)) {
      throw new Error(
        "Vanta Private Pool v2 Solana spend transaction requires two expected output commitments.",
      );
    }
    assertBytesMatch(
      spendNullifierBytes(data),
      expectedPublicInputs.nullifier ?? expectedPublicInputs.nullifierOrReplayCommitment,
      "expectedPublicInputs.nullifier",
    );
    assertBytesMatch(
      spendOutput0Bytes(data),
      outputCommitments[0],
      "expectedPublicInputs.outputCommitments[0]",
    );
    assertBytesMatch(
      spendOutput1Bytes(data),
      outputCommitments[1],
      "expectedPublicInputs.outputCommitments[1]",
    );
    assertBytesMatch(
      spendAcceptedRootBytes(data),
      expectedPublicInputs.acceptedRoot,
      "expectedPublicInputs.acceptedRoot",
    );
    assertBytesMatch(
      spendPublicInputHashBytes(data),
      expectedPublicInputs.privateSpendPublicInputHash,
      "expectedPublicInputs.privateSpendPublicInputHash",
    );
  }

  return {
    acceptedRoot: bytesToHex32(spendAcceptedRootBytes(data)),
    accountCount: accounts.length,
    nullifier: bytesToHex32(spendNullifierBytes(data)),
    outputCommitments: [
      bytesToHex32(spendOutput0Bytes(data)),
      bytesToHex32(spendOutput1Bytes(data)),
    ],
    outputRecord: accounts[5].pubkey.toBase58(),
    privateSpendPublicInputHash: bytesToHex32(spendPublicInputHashBytes(data)),
    programId: programId.toBase58(),
    relayerFeePayer: transaction.message.staticAccountKeys[0].toBase58(),
    transactionVersion: "v0",
    version: VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  };
}

export function createVantaPrivatePoolV2ActualPrivateSpendInstruction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const programId = requirePublicKey(input.programId, "programId");
  assertNotMemoProgram(programId);

  if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
    throw new Error("Vanta Private Pool v2 Solana spend transaction requires non-empty accounts.");
  }

  const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
  requireSpendInstructionData(data);
  const accounts = input.accounts.map(normalizeAccountMeta);
  assertSpendProgramAccountLayout(accounts, data, programId);
  return new TransactionInstruction({
    data,
    keys: accounts,
    programId,
  });
}

export function buildVantaPrivatePoolV2ActualPrivateSpendTransaction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const relayerFeePayer = requirePublicKey(input.relayerFeePayer, "relayerFeePayer");
  const recentBlockhash = requireText(input.recentBlockhash, "recentBlockhash");
  const instruction = createVantaPrivatePoolV2ActualPrivateSpendInstruction(input);
  const operatorAuthority = instruction.keys[6]?.pubkey;
  if (!operatorAuthority || !operatorAuthority.equals(relayerFeePayer)) {
    throw new Error(
      "Vanta Private Pool v2 Solana spend transaction currently requires relayerFeePayer to equal operatorAuthority until operator co-signing is implemented.",
    );
  }
  const message = new TransactionMessage({
    instructions: [instruction],
    payerKey: relayerFeePayer,
    recentBlockhash,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  const serializedTransaction = `base64:${Buffer.from(transaction.serialize()).toString("base64")}`;

  return {
    accountCount: instruction.keys.length,
    evidencePolicy: "real-solana-versioned-transaction-bytes-required",
    programId: instruction.programId.toBase58(),
    relayerFeePayer: relayerFeePayer.toBase58(),
    serializedTransaction,
    transactionVersion: "v0",
    version: VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_TRANSACTION_VERSION,
  };
}
