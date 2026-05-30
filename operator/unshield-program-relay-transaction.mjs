import {
  buildUnshieldInstructionDataBase64FromBindings,
  buildVantaPrivatePoolV2TagUnshieldTransaction,
  deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress,
  deriveVantaPrivatePoolV2UnshieldRootRecordAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAssetAddress,
  deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress,
  deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress,
} from "../src/privacy/privatePoolV2SolanaUnshieldTransaction.mjs";
import { resolveTagUnshieldRelayBindings } from "./tag-unshield-relay-bindings.mjs";

const PLACEHOLDER_HASH = "0x" + "00".repeat(32);
const PLACEHOLDER_AMOUNT = "0x0100000000000000";

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

export function buildTagUnshieldProgramRelayTransaction(input = {}) {
  const programId = input.programId ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_PROGRAM_ID");
  const poolState = input.poolState ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_POOL_STATE");
  const rootHistory = input.rootHistory ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_ROOT_HISTORY");
  const relayerFeePayer =
    input.relayerFeePayer ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_RELAYER_FEE_WALLET");
  const recentBlockhash =
    input.recentBlockhash ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_RECENT_BLOCKHASH");

  if (!programId || !poolState || !rootHistory || !relayerFeePayer || !recentBlockhash) {
    return null;
  }

  const resolvedBindings = resolveTagUnshieldRelayBindings(input);
  const allowPlaceholderHashes = input.allowPlaceholderHashes !== false;
  if (!allowPlaceholderHashes && resolvedBindings.usesPlaceholderHashes) {
    throw new Error(
      "TAG_UNSHIELD program relay requires real proof/nullifier bindings before building instruction data.",
    );
  }

  const bindings = resolvedBindings.bindings;
  const nullifierHex = bindings.nullifierHex ?? PLACEHOLDER_HASH;
  const acceptedRootHex = bindings.acceptedRootHex ?? PLACEHOLDER_HASH;
  const exitDestinationHex = bindings.exitDestinationHex ?? PLACEHOLDER_HASH;
  const exitAssetIdHex = bindings.exitAssetIdHex ?? PLACEHOLDER_HASH;
  const exitAmountLeHex = bindings.exitAmountLeHex ?? PLACEHOLDER_AMOUNT;
  const unshieldPublicInputHashHex = bindings.unshieldPublicInputHashHex ?? PLACEHOLDER_HASH;
  const verifierKeyHashHex = bindings.verifierKeyHashHex ?? PLACEHOLDER_HASH;

  const instructionDataBase64 = buildUnshieldInstructionDataBase64FromBindings({
    acceptedRootHex,
    exitAmountLeHex,
    exitAssetIdHex,
    exitDestinationHex,
    gnarkProofBase64: bindings.gnarkProofBase64 ?? input.gnarkProofBase64,
    gnarkPublicWitnessBase64: bindings.gnarkPublicWitnessBase64 ?? input.gnarkPublicWitnessBase64,
    nullifierHex,
    unshieldPublicInputHashHex,
    verifierKeyHashHex,
  });

  const nullifierMarker =
    input.nullifierMarker
    ?? deriveVantaPrivatePoolV2UnshieldNullifierMarkerAddress({
      instructionDataBase64,
      poolState,
      programId,
    });
  const rootRecord =
    input.rootRecord
    ?? deriveVantaPrivatePoolV2UnshieldRootRecordAddress({
      acceptedRootHex,
      instructionDataBase64,
      poolState,
      programId,
    });
  const vaultAuthority =
    input.vaultAuthority
    ?? deriveVantaPrivatePoolV2UnshieldVaultAuthorityAddress({
      exitAssetIdHex,
      instructionDataBase64,
      poolState,
      programId,
    });
  const vaultAsset =
    input.vaultAsset
    ?? deriveVantaPrivatePoolV2UnshieldVaultAssetAddress({
      exitAssetIdHex,
      instructionDataBase64,
      poolState,
      programId,
    });
  const verifierKey =
    input.verifierKey
    ?? deriveVantaPrivatePoolV2UnshieldVerifierKeyAddress({
      instructionDataBase64,
      poolState,
      programId,
      verifierKeyHashHex,
    });

  const vaultTokenAccount =
    input.vaultTokenAccount ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_VAULT_TOKEN_ACCOUNT");
  const destinationTokenAccount =
    input.destinationTokenAccount
    ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_DESTINATION_TOKEN_ACCOUNT");
  const mint = input.mint ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_MINT");
  const tokenProgram =
    input.tokenProgram
    ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_TOKEN_PROGRAM")
    ?? "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const verifierProgram =
    input.verifierProgram ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_VERIFIER_PROGRAM");
  const systemProgram =
    input.systemProgram
    ?? readOptionalEnv("VANTA_PRIVATE_POOL_V2_UNSHIELD_SYSTEM_PROGRAM")
    ?? "11111111111111111111111111111111";

  if (!vaultTokenAccount || !destinationTokenAccount || !mint || !verifierProgram) {
    return null;
  }

  const built = buildVantaPrivatePoolV2TagUnshieldTransaction({
    accounts: [
      { isSigner: false, isWritable: false, pubkey: poolState },
      { isSigner: false, isWritable: false, pubkey: rootHistory },
      { isSigner: false, isWritable: false, pubkey: rootRecord },
      { isSigner: false, isWritable: true, pubkey: nullifierMarker },
      { isSigner: false, isWritable: false, pubkey: vaultAuthority },
      { isSigner: false, isWritable: false, pubkey: vaultAsset },
      { isSigner: false, isWritable: true, pubkey: vaultTokenAccount },
      { isSigner: false, isWritable: true, pubkey: destinationTokenAccount },
      { isSigner: false, isWritable: false, pubkey: mint },
      { isSigner: false, isWritable: false, pubkey: tokenProgram },
      { isSigner: false, isWritable: false, pubkey: verifierKey },
      { isSigner: false, isWritable: false, pubkey: verifierProgram },
      { isSigner: true, isWritable: true, pubkey: relayerFeePayer },
      { isSigner: false, isWritable: false, pubkey: systemProgram },
    ],
    instructionDataBase64,
    programId,
    recentBlockhash,
    relayerFeePayer,
  });

  return {
    ...built,
    relayBindingSource: resolvedBindings.bindingSource,
    relayBindingsUsePlaceholderHashes: resolvedBindings.usesPlaceholderHashes,
  };
}
