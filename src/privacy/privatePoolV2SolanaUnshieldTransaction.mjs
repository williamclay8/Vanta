import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_TRANSACTION_VERSION =
  "vanta-private-pool-v2-solana-unshield-transaction-0.1";
export const VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES = 1232;

export const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const UNSHIELD_INSTRUCTION_TAG = 6;
const UNSHIELD_INSTRUCTION_LEN = 569;
const HASH_LEN = 32;
const EXIT_AMOUNT_LEN = 8;
const GNARK_PROOF_LEN = 324;
const GNARK_PUBLIC_WITNESS_LEN = 44;
const UNSHIELD_ACCOUNT_COUNT = 14;

const NULLIFIER_MARKER_SEED = Buffer.from("vanta2nul", "utf8");
const ROOT_RECORD_SEED = Buffer.from("vanta2root", "utf8");
const VAULT_AUTHORITY_SEED = Buffer.from("vanta2vault", "utf8");
const VAULT_ASSET_SEED = Buffer.from("vanta2asset", "utf8");
const VERIFIER_KEY_SEED = Buffer.from("vanta2vkey", "utf8");

const forbiddenPublicUnshieldTerms = [
  "amount",
  "asset",
  "destination",
  "destinationOwner",
  "mintAddress",
  "owner",
  "rawAmount",
  "requester",
  "sourceWallet",
  "vaultOwner",
];
const forbiddenProofUnshieldTerms = [
  "gnarkProof",
  "gnarkPublicWitness",
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
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires ${fieldName}.`);
  }

  return value.trim();
}

function requirePublicKey(value, fieldName) {
  try {
    return new PublicKey(requireText(value, fieldName));
  } catch {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires valid ${fieldName}.`);
  }
}

function requireBase64Bytes(value, fieldName, { maxBytes } = {}) {
  const text = requireText(value, fieldName);
  const base64 = text.startsWith("base64:") ? text.slice("base64:".length) : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires base64 ${fieldName}.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== base64) {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires base64 ${fieldName}.`);
  }
  if (maxBytes && bytes.length > maxBytes) {
    throw new Error(
      `Vanta Private Pool v2 Solana unshield transaction ${fieldName} exceeds ${maxBytes} bytes.`,
    );
  }

  return bytes;
}

function requireLeU64Hex(value, fieldName) {
  const text = requireText(value, fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{1,16}$/.test(hex)) {
    throw new Error(
      `Vanta Private Pool v2 Solana unshield transaction requires little-endian u64 hex ${fieldName}.`,
    );
  }
  const bytes = Buffer.from(hex.padStart(16, "0"), "hex");
  if (bytes.length !== EXIT_AMOUNT_LEN) {
    throw new Error(
      `Vanta Private Pool v2 Solana unshield transaction requires little-endian u64 hex ${fieldName}.`,
    );
  }
  return bytes;
}

function requireHex32(value, fieldName) {
  const text = requireText(value, fieldName);
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires 32-byte hex ${fieldName}.`);
  }
  return Buffer.from(hex, "hex");
}

function bytesToHex32(bytes) {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function bytesToLeU64Hex(bytes) {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function gnarkPublicWitnessFor(publicInputHash) {
  const witness = Buffer.alloc(GNARK_PUBLIC_WITNESS_LEN);
  witness.subarray(0, 12).set([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]);
  publicInputHash.copy(witness, 12);
  return witness;
}

function requireUnshieldInstructionData(bytes) {
  if (bytes.length !== UNSHIELD_INSTRUCTION_LEN || bytes[0] !== UNSHIELD_INSTRUCTION_TAG) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires tag=6 and 569-byte unshield instruction data.",
    );
  }
}

function requireSerializedTransaction(value) {
  return VersionedTransaction.deserialize(
    requireBase64Bytes(value, "serializedTransaction", {
      maxBytes: VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES,
    }),
  );
}

function unshieldNullifierBytes(data) {
  return data.subarray(1, 1 + HASH_LEN);
}

function unshieldAcceptedRootBytes(data) {
  return data.subarray(1 + HASH_LEN, 1 + HASH_LEN * 2);
}

function unshieldExitDestinationBytes(data) {
  return data.subarray(1 + HASH_LEN * 2, 1 + HASH_LEN * 3);
}

function unshieldExitAssetIdBytes(data) {
  return data.subarray(1 + HASH_LEN * 3, 1 + HASH_LEN * 4);
}

function unshieldExitAmountBytes(data) {
  return data.subarray(1 + HASH_LEN * 4, 1 + HASH_LEN * 4 + EXIT_AMOUNT_LEN);
}

function unshieldPublicInputHashBytes(data) {
  return data.subarray(1 + HASH_LEN * 4 + EXIT_AMOUNT_LEN, 1 + HASH_LEN * 5 + EXIT_AMOUNT_LEN);
}

function unshieldVerifierKeyHashBytes(data) {
  return data.subarray(
    1 + HASH_LEN * 5 + EXIT_AMOUNT_LEN,
    1 + HASH_LEN * 6 + EXIT_AMOUNT_LEN,
  );
}

function derivePda(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

export function deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let nullifier;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireUnshieldInstructionData(data);
    nullifier = unshieldNullifierBytes(data);
  } else {
    nullifier = requireHex32(input.nullifierHex, "nullifierHex");
  }
  return derivePda([NULLIFIER_MARKER_SEED, poolState.toBuffer(), nullifier], programId).toBase58();
}

export function deriveVantaPrivatePoolV2UnshieldRootRecordAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let acceptedRoot;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireUnshieldInstructionData(data);
    acceptedRoot = unshieldAcceptedRootBytes(data);
  } else {
    acceptedRoot = requireHex32(input.acceptedRootHex, "acceptedRootHex");
  }
  return derivePda([ROOT_RECORD_SEED, poolState.toBuffer(), acceptedRoot], programId).toBase58();
}

export function deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let exitAssetId;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireUnshieldInstructionData(data);
    exitAssetId = unshieldExitAssetIdBytes(data);
  } else {
    exitAssetId = requireHex32(input.exitAssetIdHex, "exitAssetIdHex");
  }
  return derivePda([VAULT_AUTHORITY_SEED, poolState.toBuffer(), exitAssetId], programId).toBase58();
}

export function deriveVantaPrivatePoolV2UnshieldVaultAssetAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let exitAssetId;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireUnshieldInstructionData(data);
    exitAssetId = unshieldExitAssetIdBytes(data);
  } else {
    exitAssetId = requireHex32(input.exitAssetIdHex, "exitAssetIdHex");
  }
  return derivePda([VAULT_ASSET_SEED, poolState.toBuffer(), exitAssetId], programId).toBase58();
}

export function deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress(input = {}) {
  const programId = requirePublicKey(input.programId, "programId");
  const poolState = requirePublicKey(input.poolState, "poolState");
  let verifierKeyHash;
  if (input.instructionDataBase64) {
    const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
    requireUnshieldInstructionData(data);
    verifierKeyHash = unshieldVerifierKeyHashBytes(data);
  } else {
    verifierKeyHash = requireHex32(input.verifierKeyHashHex, "verifierKeyHashHex");
  }
  return derivePda([VERIFIER_KEY_SEED, poolState.toBuffer(), verifierKeyHash], programId).toBase58();
}

function assertNoForbiddenPublicTerms(value, path = "transaction") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPublicUnshieldTerms.includes(key) || forbiddenProofUnshieldTerms.includes(key)) {
      throw new Error(`Vanta Private Pool v2 Solana unshield transaction forbids ${path}.${key}.`);
    }
    assertNoForbiddenPublicTerms(child, `${path}.${key}`);
  }
}

function normalizeAccountMeta(account, index) {
  if (!account || typeof account !== "object") {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction requires accounts[${index}].`);
  }

  return {
    isSigner: Boolean(account.isSigner),
    isWritable: Boolean(account.isWritable),
    pubkey: requirePublicKey(account.pubkey, `accounts[${index}].pubkey`),
  };
}

function assertUnshieldProgramAccountLayout(accounts, data, programId) {
  if (accounts.length !== UNSHIELD_ACCOUNT_COUNT) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires exactly 14 unshield accounts: pool state, root history, root record, nullifier marker, vault authority, vault asset, vault token account, destination token account, mint, token program, verifier key, verifier program, relayer, and system program.",
    );
  }
  if (accounts[0].isSigner || accounts[0].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[0] to be the read-only pool state.",
    );
  }
  if (accounts[1].isSigner || accounts[1].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[1] to be the read-only root history account.",
    );
  }
  if (accounts[2].isSigner || accounts[2].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[2] to be the read-only root record PDA.",
    );
  }
  const expectedRootRecord = derivePda(
    [ROOT_RECORD_SEED, accounts[0].pubkey.toBuffer(), unshieldAcceptedRootBytes(data)],
    programId,
  );
  if (!accounts[2].pubkey.equals(expectedRootRecord)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[2] to match the unshield root record PDA.",
    );
  }
  if (!accounts[3].isWritable || accounts[3].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[3] to be the writable nullifier marker PDA.",
    );
  }
  const expectedMarker = derivePda(
    [NULLIFIER_MARKER_SEED, accounts[0].pubkey.toBuffer(), unshieldNullifierBytes(data)],
    programId,
  );
  if (!accounts[3].pubkey.equals(expectedMarker)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[3] to match the unshield nullifier marker PDA.",
    );
  }
  if (accounts[4].isSigner || accounts[4].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[4] to be the read-only vault authority PDA.",
    );
  }
  const expectedVaultAuthority = derivePda(
    [VAULT_AUTHORITY_SEED, accounts[0].pubkey.toBuffer(), unshieldExitAssetIdBytes(data)],
    programId,
  );
  if (!accounts[4].pubkey.equals(expectedVaultAuthority)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[4] to match the unshield vault authority PDA.",
    );
  }
  if (accounts[5].isSigner || accounts[5].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[5] to be the read-only vault asset record PDA.",
    );
  }
  const expectedVaultAsset = derivePda(
    [VAULT_ASSET_SEED, accounts[0].pubkey.toBuffer(), unshieldExitAssetIdBytes(data)],
    programId,
  );
  if (!accounts[5].pubkey.equals(expectedVaultAsset)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[5] to match the unshield vault asset record PDA.",
    );
  }
  if (!accounts[6].isWritable || accounts[6].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[6] to be the writable vault token account.",
    );
  }
  if (!accounts[7].isWritable || accounts[7].isSigner) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[7] to be the writable destination token account.",
    );
  }
  if (accounts[8].isSigner || accounts[8].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[8] to be the read-only mint account.",
    );
  }
  if (accounts[9].isSigner || accounts[9].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[9] to be the read-only token program.",
    );
  }
  if (accounts[10].isSigner || accounts[10].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[10] to be the read-only verifier key PDA.",
    );
  }
  const expectedVerifierKey = derivePda(
    [VERIFIER_KEY_SEED, accounts[0].pubkey.toBuffer(), unshieldVerifierKeyHashBytes(data)],
    programId,
  );
  if (!accounts[10].pubkey.equals(expectedVerifierKey)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[10] to match the unshield verifier key PDA.",
    );
  }
  if (accounts[11].isSigner || accounts[11].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[11] to be the read-only verifier program.",
    );
  }
  if (!accounts[12].isSigner || !accounts[12].isWritable) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[12] to be the writable relayer signer.",
    );
  }
  if (accounts[13].isSigner || accounts[13].isWritable || !accounts[13].pubkey.equals(SystemProgram.programId)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction requires accounts[13] to be the read-only System Program.",
    );
  }
}

function assertPublicKeyMatches(actual, expected, fieldName) {
  if (expected === undefined || expected === null || expected === "") {
    return;
  }
  const expectedPubkey = requirePublicKey(expected, fieldName);
  if (!actual.equals(expectedPubkey)) {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction ${fieldName} mismatch.`);
  }
}

function assertBytesMatch(actual, expected, fieldName) {
  const expectedBytes =
    fieldName === "expectedPublicInputs.exitAmountLeHex"
      ? requireLeU64Hex(expected, fieldName)
      : requireHex32(expected, fieldName);
  if (!Buffer.from(actual).equals(expectedBytes)) {
    throw new Error(`Vanta Private Pool v2 Solana unshield transaction ${fieldName} mismatch.`);
  }
}

function assertExpectedPublicInputsComplete(expectedPublicInputs = {}) {
  const missing = [
    "acceptedRoot",
    "nullifierOrReplayCommitment",
    "exitDestination",
    "exitAssetId",
    "exitAmountLeHex",
    "unshieldPublicInputHash",
    "verifierKeyHash",
  ].filter((field) => !expectedPublicInputs[field]);
  if (missing.length > 0) {
    throw new Error(
      `Vanta Private Pool v2 Solana unshield transaction requires expected public inputs: ${missing.join(", ")}.`,
    );
  }
}

function assertExpectedAccountsComplete(expectedAccounts = {}) {
  const missing = [
    "programId",
    "poolState",
    "rootHistory",
    "rootRecord",
    "nullifierMarker",
    "vaultAuthority",
    "vaultAsset",
    "vaultTokenAccount",
    "destinationTokenAccount",
    "mint",
    "tokenProgram",
    "verifierKey",
    "verifierProgram",
  ].filter((field) => !expectedAccounts[field]);
  if (!expectedAccounts.relayer && !expectedAccounts.relayerFeePayer) {
    missing.push("relayer");
  }
  if (missing.length > 0) {
    throw new Error(
      `Vanta Private Pool v2 Solana unshield transaction requires expected account refs: ${missing.join(", ")}.`,
    );
  }
}

function compiledInstructionAccounts(message, instruction) {
  return instruction.accountKeyIndexes.map((index) => {
    const pubkey = message.staticAccountKeys[index];
    if (!pubkey) {
      throw new Error("Vanta Private Pool v2 Solana unshield transaction has an invalid account index.");
    }
    return {
      isSigner: message.isAccountSigner(index),
      isWritable: message.isAccountWritable(index),
      pubkey,
    };
  });
}

export function validateVantaPrivatePoolV2TagUnshieldSerializedTransaction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const transaction = requireSerializedTransaction(input.serializedTransaction);
  if (transaction.version !== 0) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction requires a v0 transaction.");
  }
  if (transaction.message.addressTableLookups.length > 0) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction must not use address lookup tables.");
  }
  if (transaction.message.compiledInstructions.length !== 1) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction requires exactly one unshield instruction.");
  }

  const instruction = transaction.message.compiledInstructions[0];
  const programId = transaction.message.staticAccountKeys[instruction.programIdIndex];
  if (!programId) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction has an invalid program id index.");
  }
  const data = Buffer.from(instruction.data);
  requireUnshieldInstructionData(data);
  const accounts = compiledInstructionAccounts(transaction.message, instruction);
  assertUnshieldProgramAccountLayout(accounts, data, programId);

  const expectedAccounts = input.expectedAccounts ?? {};
  if (input.requireExpectedAccounts) {
    assertExpectedAccountsComplete(expectedAccounts);
  }
  assertPublicKeyMatches(programId, expectedAccounts.programId, "expectedAccounts.programId");
  assertPublicKeyMatches(accounts[0].pubkey, expectedAccounts.poolState, "expectedAccounts.poolState");
  assertPublicKeyMatches(accounts[1].pubkey, expectedAccounts.rootHistory, "expectedAccounts.rootHistory");
  assertPublicKeyMatches(accounts[2].pubkey, expectedAccounts.rootRecord, "expectedAccounts.rootRecord");
  assertPublicKeyMatches(accounts[3].pubkey, expectedAccounts.nullifierMarker, "expectedAccounts.nullifierMarker");
  assertPublicKeyMatches(accounts[4].pubkey, expectedAccounts.vaultAuthority, "expectedAccounts.vaultAuthority");
  assertPublicKeyMatches(accounts[5].pubkey, expectedAccounts.vaultAsset, "expectedAccounts.vaultAsset");
  assertPublicKeyMatches(
    accounts[6].pubkey,
    expectedAccounts.vaultTokenAccount,
    "expectedAccounts.vaultTokenAccount",
  );
  assertPublicKeyMatches(
    accounts[7].pubkey,
    expectedAccounts.destinationTokenAccount,
    "expectedAccounts.destinationTokenAccount",
  );
  assertPublicKeyMatches(accounts[8].pubkey, expectedAccounts.mint, "expectedAccounts.mint");
  assertPublicKeyMatches(accounts[9].pubkey, expectedAccounts.tokenProgram, "expectedAccounts.tokenProgram");
  assertPublicKeyMatches(accounts[10].pubkey, expectedAccounts.verifierKey, "expectedAccounts.verifierKey");
  assertPublicKeyMatches(
    accounts[11].pubkey,
    expectedAccounts.verifierProgram,
    "expectedAccounts.verifierProgram",
  );
  assertPublicKeyMatches(
    accounts[12].pubkey,
    expectedAccounts.relayer ?? expectedAccounts.relayerFeePayer,
    "expectedAccounts.relayer",
  );
  assertPublicKeyMatches(
    transaction.message.staticAccountKeys[0],
    expectedAccounts.relayerFeePayer ?? expectedAccounts.relayer,
    "expectedAccounts.relayerFeePayer",
  );
  assertPublicKeyMatches(
    accounts[13].pubkey,
    expectedAccounts.systemProgram ?? SystemProgram.programId.toBase58(),
    "expectedAccounts.systemProgram",
  );

  const expectedPublicInputs = input.expectedPublicInputs ?? {};
  if (input.requireExpectedPublicInputs) {
    assertExpectedPublicInputsComplete(expectedPublicInputs);
  }
  if (input.requireExpectedPublicInputs || Object.keys(expectedPublicInputs).length > 0) {
    assertBytesMatch(
      unshieldNullifierBytes(data),
      expectedPublicInputs.nullifier ?? expectedPublicInputs.nullifierOrReplayCommitment,
      "expectedPublicInputs.nullifier",
    );
    assertBytesMatch(
      unshieldAcceptedRootBytes(data),
      expectedPublicInputs.acceptedRoot,
      "expectedPublicInputs.acceptedRoot",
    );
    assertBytesMatch(
      unshieldExitDestinationBytes(data),
      expectedPublicInputs.exitDestination,
      "expectedPublicInputs.exitDestination",
    );
    assertBytesMatch(
      unshieldExitAssetIdBytes(data),
      expectedPublicInputs.exitAssetId,
      "expectedPublicInputs.exitAssetId",
    );
    assertBytesMatch(
      unshieldExitAmountBytes(data),
      expectedPublicInputs.exitAmountLeHex,
      "expectedPublicInputs.exitAmountLeHex",
    );
    assertBytesMatch(
      unshieldPublicInputHashBytes(data),
      expectedPublicInputs.unshieldPublicInputHash,
      "expectedPublicInputs.unshieldPublicInputHash",
    );
    assertBytesMatch(
      unshieldVerifierKeyHashBytes(data),
      expectedPublicInputs.verifierKeyHash,
      "expectedPublicInputs.verifierKeyHash",
    );
  }

  return {
    acceptedRoot: bytesToHex32(unshieldAcceptedRootBytes(data)),
    accountCount: accounts.length,
    exitAmountLeHex: bytesToLeU64Hex(unshieldExitAmountBytes(data)),
    exitAssetId: bytesToHex32(unshieldExitAssetIdBytes(data)),
    exitDestination: bytesToHex32(unshieldExitDestinationBytes(data)),
    nullifier: bytesToHex32(unshieldNullifierBytes(data)),
    programId: programId.toBase58(),
    relayerFeePayer: transaction.message.staticAccountKeys[0].toBase58(),
    rootRecord: accounts[2].pubkey.toBase58(),
    transactionVersion: "v0",
    unshieldPublicInputHash: bytesToHex32(unshieldPublicInputHashBytes(data)),
    verifierKeyHash: bytesToHex32(unshieldVerifierKeyHashBytes(data)),
    version: VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_TRANSACTION_VERSION,
  };
}

export function createVantaPrivatePoolV2TagUnshieldInstruction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const programId = requirePublicKey(input.programId, "programId");

  if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction requires non-empty accounts.");
  }

  const data = requireBase64Bytes(input.instructionDataBase64, "instructionDataBase64");
  requireUnshieldInstructionData(data);
  const accounts = input.accounts.map(normalizeAccountMeta);
  assertUnshieldProgramAccountLayout(accounts, data, programId);
  return new TransactionInstruction({
    data,
    keys: accounts,
    programId,
  });
}

export function buildVantaPrivatePoolV2TagUnshieldTransaction(input = {}) {
  assertNoForbiddenPublicTerms(input);
  const relayerFeePayer = requirePublicKey(input.relayerFeePayer, "relayerFeePayer");
  const recentBlockhash = requireText(input.recentBlockhash, "recentBlockhash");
  const instruction = createVantaPrivatePoolV2TagUnshieldInstruction(input);
  const relayer = instruction.keys[12]?.pubkey;
  if (!relayer || !relayer.equals(relayerFeePayer)) {
    throw new Error(
      "Vanta Private Pool v2 Solana unshield transaction currently requires relayerFeePayer to equal accounts[12] relayer until co-signing is implemented.",
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
    instructionTag: UNSHIELD_INSTRUCTION_TAG,
    instructionLen: UNSHIELD_INSTRUCTION_LEN,
    programId: instruction.programId.toBase58(),
    relayerFeePayer: relayerFeePayer.toBase58(),
    serializedTransaction,
    transactionVersion: "v0",
    version: VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_TRANSACTION_VERSION,
  };
}

export function buildUnshieldInstructionDataBase64FromBindings(input = {}) {
  const nullifier = requireHex32(input.nullifierHex, "nullifierHex");
  const acceptedRoot = requireHex32(input.acceptedRootHex, "acceptedRootHex");
  const exitDestination = requireHex32(input.exitDestinationHex, "exitDestinationHex");
  const exitAssetId = requireHex32(input.exitAssetIdHex, "exitAssetIdHex");
  const exitAmountLe = requireLeU64Hex(input.exitAmountLeHex, "exitAmountLeHex");
  const publicInputHash = requireHex32(input.unshieldPublicInputHashHex, "unshieldPublicInputHashHex");
  const verifierKeyHash = requireHex32(input.verifierKeyHashHex, "verifierKeyHashHex");
  const gnarkProof = input.gnarkProofBase64
    ? requireBase64Bytes(input.gnarkProofBase64, "gnarkProofBase64")
    : Buffer.alloc(GNARK_PROOF_LEN, 6);
  const gnarkPublicWitness = input.gnarkPublicWitnessBase64
    ? requireBase64Bytes(input.gnarkPublicWitnessBase64, "gnarkPublicWitnessBase64")
    : gnarkPublicWitnessFor(publicInputHash);

  if (gnarkProof.length !== GNARK_PROOF_LEN) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction gnark proof must be 324 bytes.");
  }
  if (gnarkPublicWitness.length !== GNARK_PUBLIC_WITNESS_LEN) {
    throw new Error("Vanta Private Pool v2 Solana unshield transaction gnark public witness must be 44 bytes.");
  }

  return Buffer.concat([
    Buffer.from([UNSHIELD_INSTRUCTION_TAG]),
    nullifier,
    acceptedRoot,
    exitDestination,
    exitAssetId,
    exitAmountLe,
    publicInputHash,
    verifierKeyHash,
    gnarkProof,
    gnarkPublicWitness,
  ]).toString("base64");
}
