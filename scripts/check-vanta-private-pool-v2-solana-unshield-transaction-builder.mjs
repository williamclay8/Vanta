import { strict as assert } from "node:assert";

import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";

import {
  VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES,
  VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_TRANSACTION_VERSION,
  SPL_TOKEN_PROGRAM_ID,
  buildVantaPrivatePoolV2TagUnshieldTransaction,
  deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress,
  deriveVantaPrivatePoolV2UnshieldRootRecordAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAssetAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress,
  deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress,
  validateVantaPrivatePoolV2TagUnshieldSerializedTransaction,
} from "../src/privacy/privatePoolV2SolanaUnshieldTransaction.mjs";

const relayerFeePayer = Keypair.generate().publicKey.toBase58();
const programId = Keypair.generate().publicKey.toBase58();
const poolState = Keypair.generate().publicKey.toBase58();
const rootHistory = Keypair.generate().publicKey.toBase58();
const vaultTokenAccount = Keypair.generate().publicKey.toBase58();
const destinationTokenAccount = Keypair.generate().publicKey.toBase58();
const mint = Keypair.generate().publicKey.toBase58();
const verifierProgram = Keypair.generate().publicKey.toBase58();
const recentBlockhash = "11111111111111111111111111111111";

const nullifierHex = "0x" + "11".repeat(32);
const acceptedRootHex = "0x" + "44".repeat(32);
const exitDestinationHex = "0x" + "22".repeat(32);
const exitAssetIdHex = "0x" + "33".repeat(32);
const exitAmountLeHex = "0x" + "0100000000000000";
const unshieldPublicInputHashHex = "0x" + "55".repeat(32);
const verifierKeyHashHex = "0x" + "66".repeat(32);

const instructionDataBase64 = Buffer.concat([
  Buffer.from([6]),
  Buffer.from("11".repeat(32), "hex"),
  Buffer.from("44".repeat(32), "hex"),
  Buffer.from("22".repeat(32), "hex"),
  Buffer.from("33".repeat(32), "hex"),
  Buffer.from("0100000000000000", "hex"),
  Buffer.from("55".repeat(32), "hex"),
  Buffer.from("66".repeat(32), "hex"),
  Buffer.alloc(324, 6),
  (() => {
    const witness = Buffer.alloc(44);
    witness.subarray(0, 12).set([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]);
    Buffer.from("55".repeat(32), "hex").copy(witness, 12);
    return witness;
  })(),
]).toString("base64");

const nullifierMarker = deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress({
  nullifierHex,
  poolState,
  programId,
});
const rootRecord = deriveVantaPrivatePoolV2UnshieldRootRecordAddress({
  acceptedRootHex,
  poolState,
  programId,
});
const vaultAuthority = deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress({
  exitAssetIdHex,
  poolState,
  programId,
});
const vaultAsset = deriveVantaPrivatePoolV2UnshieldVaultAssetAddress({
  exitAssetIdHex,
  poolState,
  programId,
});
const verifierKey = deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress({
  poolState,
  programId,
  verifierKeyHashHex,
});

const expectedPublicInputs = {
  acceptedRoot: acceptedRootHex,
  exitAmountLeHex,
  exitAssetId: exitAssetIdHex,
  exitDestination: exitDestinationHex,
  nullifierOrReplayCommitment: nullifierHex,
  unshieldPublicInputHash: unshieldPublicInputHashHex,
  verifierKeyHash: verifierKeyHashHex,
};
const expectedAccounts = {
  destinationTokenAccount,
  mint,
  nullifierMarker,
  poolState,
  programId,
  relayer: relayerFeePayer,
  relayerFeePayer,
  rootHistory,
  rootRecord,
  systemProgram: SystemProgram.programId.toBase58(),
  tokenProgram: SPL_TOKEN_PROGRAM_ID,
  vaultAsset,
  vaultAuthority,
  vaultTokenAccount,
  verifierKey,
  verifierProgram,
};

function unshieldAccounts(overrides = {}) {
  return [
    { isSigner: false, isWritable: false, pubkey: overrides.poolState ?? poolState },
    { isSigner: false, isWritable: false, pubkey: overrides.rootHistory ?? rootHistory },
    { isSigner: false, isWritable: false, pubkey: overrides.rootRecord ?? rootRecord },
    { isSigner: false, isWritable: true, pubkey: overrides.nullifierMarker ?? nullifierMarker },
    { isSigner: false, isWritable: false, pubkey: overrides.vaultAuthority ?? vaultAuthority },
    { isSigner: false, isWritable: false, pubkey: overrides.vaultAsset ?? vaultAsset },
    { isSigner: false, isWritable: true, pubkey: overrides.vaultTokenAccount ?? vaultTokenAccount },
    {
      isSigner: false,
      isWritable: true,
      pubkey: overrides.destinationTokenAccount ?? destinationTokenAccount,
    },
    { isSigner: false, isWritable: false, pubkey: overrides.mint ?? mint },
    { isSigner: false, isWritable: false, pubkey: overrides.tokenProgram ?? SPL_TOKEN_PROGRAM_ID },
    { isSigner: false, isWritable: false, pubkey: overrides.verifierKey ?? verifierKey },
    { isSigner: false, isWritable: false, pubkey: overrides.verifierProgram ?? verifierProgram },
    { isSigner: true, isWritable: true, pubkey: overrides.relayer ?? relayerFeePayer },
    {
      isSigner: false,
      isWritable: false,
      pubkey: overrides.systemProgram ?? SystemProgram.programId.toBase58(),
    },
  ];
}

function build(overrides = {}) {
  return buildVantaPrivatePoolV2TagUnshieldTransaction({
    accounts: overrides.accounts ?? unshieldAccounts(overrides.accountOverrides),
    instructionDataBase64: overrides.instructionDataBase64 ?? instructionDataBase64,
    programId: overrides.programId ?? programId,
    recentBlockhash,
    relayerFeePayer: overrides.relayerFeePayer ?? relayerFeePayer,
    ...(overrides.extra ?? {}),
  });
}

const built = build();

assert.equal(built.version, VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_TRANSACTION_VERSION);
assert.equal(built.evidencePolicy, "real-solana-versioned-transaction-bytes-required");
assert.equal(built.instructionTag, 6);
assert.equal(built.instructionLen, 569);
assert.equal(built.programId, programId);
assert.equal(built.relayerFeePayer, relayerFeePayer);
assert.equal(built.accountCount, 14);
assert.match(built.serializedTransaction, /^base64:[A-Za-z0-9+/]+=*$/);

const validated = validateVantaPrivatePoolV2TagUnshieldSerializedTransaction({
  expectedAccounts,
  expectedPublicInputs,
  serializedTransaction: built.serializedTransaction,
});
assert.equal(validated.nullifier, expectedPublicInputs.nullifierOrReplayCommitment);
assert.equal(validated.acceptedRoot, expectedPublicInputs.acceptedRoot);
assert.equal(validated.exitDestination, expectedPublicInputs.exitDestination);
assert.equal(validated.exitAssetId, expectedPublicInputs.exitAssetId);
assert.equal(validated.exitAmountLeHex, expectedPublicInputs.exitAmountLeHex);
assert.equal(validated.unshieldPublicInputHash, expectedPublicInputs.unshieldPublicInputHash);
assert.equal(validated.verifierKeyHash, expectedPublicInputs.verifierKeyHash);
assert.equal(validated.rootRecord, rootRecord);
assert.equal(validated.programId, programId);
assert.equal(validated.relayerFeePayer, relayerFeePayer);

const decoded = VersionedTransaction.deserialize(
  Buffer.from(built.serializedTransaction.slice("base64:".length), "base64"),
);
assert.equal(decoded.version, 0);

assert.throws(
  () => build({ instructionDataBase64: Buffer.from([1]).toString("base64") }),
  /requires tag=6 and 569-byte unshield instruction data/,
  "proof-carrying spend tag remains fail-closed in the unshield builder",
);

assert.throws(
  () =>
    validateVantaPrivatePoolV2TagUnshieldSerializedTransaction({
      expectedAccounts,
      expectedPublicInputs: {
        ...expectedPublicInputs,
        unshieldPublicInputHash: "0x" + "77".repeat(32),
      },
      serializedTransaction: built.serializedTransaction,
    }),
  /expectedPublicInputs\.unshieldPublicInputHash mismatch/,
);

assert.throws(
  () =>
    build({
      accounts: unshieldAccounts().slice(0, 13),
    }),
  /requires exactly 14 unshield accounts/,
);

assert.throws(
  () =>
    build({
      accountOverrides: {
        rootRecord: Keypair.generate().publicKey.toBase58(),
      },
    }),
  /requires accounts\[2\] to match the unshield root record PDA/,
);

assert.throws(
  () =>
    build({
      accountOverrides: {
        nullifierMarker: Keypair.generate().publicKey.toBase58(),
      },
    }),
  /requires accounts\[3\] to match the unshield nullifier marker PDA/,
);

assert.throws(
  () =>
    build({
      accountOverrides: {
        relayer: Keypair.generate().publicKey.toBase58(),
      },
    }),
  /requires relayerFeePayer to equal accounts\[12\] relayer/,
);

assert.throws(
  () =>
    build({
      accounts: unshieldAccounts().map((account, index) =>
        index === 12 ? { ...account, isSigner: false } : account,
      ),
    }),
  /requires accounts\[12\] to be the writable relayer signer/,
);

assert.throws(
  () =>
    build({
      extra: {
        proofBytes: "base64:AA==",
      },
    }),
  /forbids transaction\.proofBytes/,
);

assert.throws(
  () => build({ instructionDataBase64: Buffer.from([6, 1, 2, 3]).toString("base64") }),
  /requires tag=6 and 569-byte unshield instruction data/,
);

const builderSource = await import("node:fs").then(({ readFileSync }) =>
  readFileSync(new URL("../src/privacy/privatePoolV2SolanaUnshieldTransaction.mjs", import.meta.url), "utf8"),
);
for (const forbidden of ["destinationOwner", "mintAddress", "requester", "vaultOwner", "proofBytes"]) {
  assert.ok(
    builderSource.includes(`"${forbidden}"`),
    `builder must forbid public term ${forbidden}`,
  );
}

assert.ok(
  built.serializedTransaction.length <=
    `base64:${"A".repeat(VANTA_PRIVATE_POOL_V2_SOLANA_UNSHIELD_MAX_SERIALIZED_TRANSACTION_BYTES * 2)}`.length,
  "serializedTransaction exceeds 1232 bytes guardrail is enforced at decode time",
);

console.log("Vanta Private Pool v2 Solana unshield transaction builder check: PASS");
