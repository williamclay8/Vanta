import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { poseidon1, poseidon15, poseidon2, poseidon3, poseidon6, poseidon8 } from "poseidon-lite";
import {
  VANTA_PRIVATE_CORE_NOTE_VERSION_V0,
  VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
  VantaPrivateCoreLedger,
  buildVantaPrivateCoreSwapTransition,
  createVantaPrivateCoreOwnerKeypair,
  createVantaPrivateCoreWitnessRequest,
  deriveVantaPrivateCoreMerkleLeafHash,
  deriveVantaPrivateCoreNoteCommitment,
  deriveVantaPrivateCoreNullifier,
  serializeVantaPrivateCoreNoteV0,
  verifyVantaPrivateCoreWitnessResponse,
  type Bytes32Hex,
  type HeldNoteViewV0,
  type MerkleProofV0,
  type NoteType,
  type SerializedNoteV0,
  type SwapTransitionV0,
} from "@/zk/vantaPrivateCore";

export const VANTA_PRIVATE_CORE_SWAP_PROOF_VERSION_V0 = 0 as const;
export const VANTA_PRIVATE_CORE_SWAP_PROOF_KIND_V0 =
  "vanta-private-core-swap-proof-boundary-v0" as const;
export const VANTA_PRIVATE_CORE_SWAP_CIRCUIT_V0 =
  "vanta_private_core_single_note_swap" as const;
export const VANTA_PRIVATE_CORE_SWAP_BACKEND_V0 = "noir-barretenberg" as const;
export const VANTA_PRIVATE_CORE_SWAP_OWNER_AUTH_MODE_V0 =
  "x25519-secret-prechecked-off-circuit" as const;
export const VANTA_PRIVATE_CORE_SWAP_NULLIFIER_KEY_MODE_V0 =
  "note-secret-as-nullifier-key-v0" as const;
export const VANTA_PRIVATE_CORE_SWAP_BYTES32_ENCODING_V0 = "bytes32-2x128-be" as const;
export const VANTA_PRIVATE_CORE_SWAP_AMOUNT_ENCODING_V0 = "u128-2x64-le" as const;
export const VANTA_PRIVATE_CORE_SWAP_MERKLE_DIRECTION_BIT_V0 =
  "is_current_right__1_when_sibling_is_left" as const;
export const VANTA_PRIVATE_CORE_SWAP_CONTEXT_DOMAIN_V0 =
  "vanta.private-core.swap-context.v0" as const;
export const VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0 = 3 as const;
export const VANTA_PRIVATE_CORE_SWAP_PROVING_HASH_LANE_V0 =
  "poseidon-bn254-proving-lane-v0" as const;

export type FieldDecimalString = string;
export type DirectionBit = "0" | "1";

export type Bytes32EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_SWAP_BYTES32_ENCODING_V0;
  sourceHex: Bytes32Hex;
  hi: FieldDecimalString;
  lo: FieldDecimalString;
};

export type U128EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_SWAP_AMOUNT_ENCODING_V0;
  sourceDecimal: string;
  lo: FieldDecimalString;
  hi: FieldDecimalString;
};

export type VantaPrivateCoreNoteFieldEncodingV0 = {
  noteVersion: FieldDecimalString;
  noteTypeCode: FieldDecimalString;
  assetId: Bytes32EncodingV0;
  amount: U128EncodingV0;
  ownerPublicKey: Bytes32EncodingV0;
  noteNonce: Bytes32EncodingV0;
  noteSecret: Bytes32EncodingV0;
  blinding: Bytes32EncodingV0;
  derivationTag: Bytes32EncodingV0;
};

export type VantaPrivateCoreMerklePathEncodingV0 = {
  depth: number;
  directionBitEncoding: typeof VANTA_PRIVATE_CORE_SWAP_MERKLE_DIRECTION_BIT_V0;
  siblings: Bytes32EncodingV0[];
  directionBits: DirectionBit[];
};

export type SwapPublicInputsV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  stateRoot: Bytes32Hex;
  inputNullifier: Bytes32Hex;
  outputCommitment: Bytes32Hex;
  inputAssetId: Bytes32Hex;
  outputAssetId: Bytes32Hex;
  inputAmount: string;
  outputAmount: string;
  inputNoteVersion: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  outputNoteVersion: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  swapContextTag?: Bytes32Hex;
};

export type SwapPrivateWitnessV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  inputNote: SerializedNoteV0;
  inputNoteType: NoteType;
  inputNoteCommitment: Bytes32Hex;
  inputMerkleLeaf: Bytes32Hex;
  inputMerkleProof: MerkleProofV0;
  inputLeafIndex: number;
  senderSecretKey: Bytes32Hex;
  senderDerivedPublicKey: Bytes32Hex;
  ownerAuthorizationMode: typeof VANTA_PRIVATE_CORE_SWAP_OWNER_AUTH_MODE_V0;
  nullifierKeyWitness: Bytes32Hex;
  nullifierKeyMode: typeof VANTA_PRIVATE_CORE_SWAP_NULLIFIER_KEY_MODE_V0;
  outputNote: SerializedNoteV0;
  outputCommitment: Bytes32Hex;
  swapContextTag?: Bytes32Hex;
  inputNoteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0;
  outputNoteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0;
  merklePathEncoding: VantaPrivateCoreMerklePathEncodingV0;
};

export type VantaPrivateCoreNoirSwapWitnessPackageV0 = {
  backend: typeof VANTA_PRIVATE_CORE_SWAP_BACKEND_V0;
  circuit: typeof VANTA_PRIVATE_CORE_SWAP_CIRCUIT_V0;
  proofVersion: typeof VANTA_PRIVATE_CORE_SWAP_PROOF_VERSION_V0;
  merkleDepth: typeof VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0;
  provingHashLane: typeof VANTA_PRIVATE_CORE_SWAP_PROVING_HASH_LANE_V0;
  sourcePublicInputs: SwapPublicInputsV0;
  publicInputs: {
    state_root: FieldDecimalString;
    input_nullifier: FieldDecimalString;
    output_commitment: FieldDecimalString;
    input_asset_id_hi: FieldDecimalString;
    input_asset_id_lo: FieldDecimalString;
    output_asset_id_hi: FieldDecimalString;
    output_asset_id_lo: FieldDecimalString;
    input_amount_lo: FieldDecimalString;
    input_amount_hi: FieldDecimalString;
    output_amount_lo: FieldDecimalString;
    output_amount_hi: FieldDecimalString;
    input_note_version: FieldDecimalString;
    output_note_version: FieldDecimalString;
    swap_context_tag_hi?: FieldDecimalString;
    swap_context_tag_lo?: FieldDecimalString;
  };
  privateWitness: {
    input_note_type_code: FieldDecimalString;
    sender_public_key_hi: FieldDecimalString;
    sender_public_key_lo: FieldDecimalString;
    sender_secret_key_hi: FieldDecimalString;
    sender_secret_key_lo: FieldDecimalString;
    input_note_nonce_hi: FieldDecimalString;
    input_note_nonce_lo: FieldDecimalString;
    input_note_secret_hi: FieldDecimalString;
    input_note_secret_lo: FieldDecimalString;
    input_blinding_hi: FieldDecimalString;
    input_blinding_lo: FieldDecimalString;
    input_derivation_tag_hi: FieldDecimalString;
    input_derivation_tag_lo: FieldDecimalString;
    input_leaf_index: FieldDecimalString;
    membership_path_hi: FieldDecimalString[];
    membership_path_lo: FieldDecimalString[];
    membership_path_direction_bits: DirectionBit[];
    output_note_type_code: FieldDecimalString;
    output_owner_public_key_hi: FieldDecimalString;
    output_owner_public_key_lo: FieldDecimalString;
    output_note_nonce_hi: FieldDecimalString;
    output_note_nonce_lo: FieldDecimalString;
    output_note_secret_hi: FieldDecimalString;
    output_note_secret_lo: FieldDecimalString;
    output_blinding_hi: FieldDecimalString;
    output_blinding_lo: FieldDecimalString;
    output_derivation_tag_hi: FieldDecimalString;
    output_derivation_tag_lo: FieldDecimalString;
  };
};

export type VantaPrivateCoreSwapProofBoundaryV0 = {
  kind: typeof VANTA_PRIVATE_CORE_SWAP_PROOF_KIND_V0;
  version: typeof VANTA_PRIVATE_CORE_SWAP_PROOF_VERSION_V0;
  circuit: typeof VANTA_PRIVATE_CORE_SWAP_CIRCUIT_V0;
  backend: typeof VANTA_PRIVATE_CORE_SWAP_BACKEND_V0;
  readiness: "ready" | "blocked";
  blockers: string[];
  compatibilityNotes: string[];
  publicInputs: SwapPublicInputsV0;
  privateWitness: SwapPrivateWitnessV0;
  noirWitnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0;
};

export type VantaPrivateCoreFixedDepthSwapFixtureV0 = {
  merkleDepth: typeof VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0;
  validBoundary: VantaPrivateCoreSwapProofBoundaryV0;
  validResultingRoot: Bytes32Hex;
  invalidDirectionWitnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0;
};

export type VantaPrivateCorePreparedLiveSwapCandidateV0 =
  | {
      status: "ready";
      note: string;
      transition: SwapTransitionV0;
      proofBoundary: VantaPrivateCoreSwapProofBoundaryV0;
    }
  | {
      status: "blocked";
      note: string;
      transition: SwapTransitionV0;
      proofBoundary: VantaPrivateCoreSwapProofBoundaryV0;
    }
  | {
      status: "fallback";
      note: string;
      transition: null;
      proofBoundary: null;
    };

export type BuildVantaPrivateCoreSwapProofBoundaryArgs = {
  transition: SwapTransitionV0;
  senderSecretKey: Bytes32Hex;
  swapContextTag?: Bytes32Hex;
  circuitMerkleDepth?: number;
  requireNontrivialMerklePath?: boolean;
};

export function prepareVantaPrivateCoreLiveSwapCandidate(args: {
  heldNote: HeldNoteViewV0 | null;
  senderSecretKey: Bytes32Hex;
  recipientOwnerPublicKey: Bytes32Hex;
  outputAssetId: Bytes32Hex;
  quoteInputAmount: string | null;
  quoteOutputAmount: string | null;
  quoteExpiresAt?: number | null;
  nowMs?: number;
  expectedInputAssetId?: Bytes32Hex;
  inputDecimals?: number;
  outputDecimals?: number;
}): VantaPrivateCorePreparedLiveSwapCandidateV0 {
  if (!args.heldNote) {
    return {
      note: "No current private-core held note is available yet.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  if (!args.quoteInputAmount || !args.quoteOutputAmount) {
    return {
      note: "No live quote is available yet for the current private-core swap path.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  if (
    typeof args.quoteExpiresAt === "number" &&
    Number.isFinite(args.quoteExpiresAt) &&
    (args.nowMs ?? Date.now()) > args.quoteExpiresAt
  ) {
    return {
      note: "The latest live quote expired, so the swap proof actions are using fixture fallback.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  const expectedInputAssetId =
    args.expectedInputAssetId ??
    ("0x7675736400000000000000000000000000000000000000000000000000000000" as Bytes32Hex);

  if (args.heldNote.note.assetId !== expectedInputAssetId) {
    return {
      note: "The current private-core held note is not a VUSD input note, so the swap proof actions are using fixture fallback.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  let expectedInputAmount: bigint;
  let outputAmount: bigint;

  try {
    expectedInputAmount = decimalAmountToBaseUnits(args.quoteInputAmount, args.inputDecimals ?? 6);
    outputAmount = decimalAmountToBaseUnits(args.quoteOutputAmount, args.outputDecimals ?? 9);
  } catch {
    return {
      note: "The live quote amount could not be converted into the private-core swap lane, so the swap proof actions are using fixture fallback.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  if (args.heldNote.note.amount !== expectedInputAmount) {
    return {
      note: "The current private-core held note amount does not match the live quote input amount, so the swap proof actions are using fixture fallback.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }

  try {
    const transition = buildVantaPrivateCoreSwapTransition({
      input: args.heldNote,
      outputAmount,
      outputAssetId: args.outputAssetId,
      recipientOwnerPublicKey: args.recipientOwnerPublicKey,
    });
    const proofBoundary = buildVantaPrivateCoreSwapProofBoundary({
      transition,
      senderSecretKey: args.senderSecretKey,
    });

    if (proofBoundary.readiness !== "ready") {
      const primaryBlocker = proofBoundary.blockers[0] ?? "The current private-core swap path is not ready.";
      return {
        note: `${primaryBlocker} The swap proof actions are using fixture fallback until the current-note path is ready.`,
        proofBoundary,
        status: "blocked",
        transition,
      };
    }

    return {
      note: "The current private-core held note and live quote align, so the swap proof actions are using the real current-note path.",
      proofBoundary,
      status: "ready",
      transition,
    };
  } catch {
    return {
      note: "The private-core swap lane could not build a coherent current-note proving boundary, so the swap proof actions are using fixture fallback.",
      proofBoundary: null,
      status: "fallback",
      transition: null,
    };
  }
}

export function buildVantaPrivateCoreSwapProofBoundary(
  args: BuildVantaPrivateCoreSwapProofBoundaryArgs,
): VantaPrivateCoreSwapProofBoundaryV0 {
  const inputNote = args.transition.input.note;
  const inputCommitment = deriveVantaPrivateCoreNoteCommitment(inputNote);
  const witnessRequest = createVantaPrivateCoreWitnessRequest(inputCommitment.value);
  const witnessOk = verifyVantaPrivateCoreWitnessResponse(
    witnessRequest,
    args.transition.input.witness,
  );
  const senderDerivedPublicKey = derivePublicKeyFromSecretKey(args.senderSecretKey);
  const senderSecretMatches = senderDerivedPublicKey === inputNote.ownerPublicKey;
  const inputNullifier = deriveVantaPrivateCoreNullifier(inputNote, args.transition.input.witness);
  const outputCommitment = deriveVantaPrivateCoreNoteCommitment(args.transition.output.note);
  const inputMerkleLeaf = deriveVantaPrivateCoreMerkleLeafHash(inputCommitment.value);
  const inputNoteFieldEncoding = encodeNoteFields(inputNote);
  const outputNoteFieldEncoding = encodeNoteFields(args.transition.output.note);
  const selectedCircuitDepth =
    args.circuitMerkleDepth ?? VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0;
  const merklePathEncoding = encodeMerklePath(
    args.transition.input.witness.proof,
    selectedCircuitDepth,
  );
  const swapContextTag =
    args.swapContextTag ??
    deriveVantaPrivateCoreSwapContextTag({
      stateRoot: args.transition.input.witness.root,
      inputNullifier: inputNullifier.value,
      outputCommitment: outputCommitment.value,
      inputAssetId: inputNote.assetId,
      outputAssetId: args.transition.output.note.assetId,
      inputAmount: inputNote.amount,
      outputAmount: args.transition.output.note.amount,
      inputNoteVersion: inputNote.version,
      outputNoteVersion: args.transition.output.note.version,
    });

  const publicInputs: SwapPublicInputsV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    stateRoot: args.transition.input.witness.root,
    inputNullifier: inputNullifier.value,
    outputCommitment: outputCommitment.value,
    inputAssetId: inputNote.assetId,
    outputAssetId: args.transition.output.note.assetId,
    inputAmount: inputNote.amount.toString(10),
    outputAmount: args.transition.output.note.amount.toString(10),
    inputNoteVersion: inputNote.version,
    outputNoteVersion: args.transition.output.note.version,
    swapContextTag,
  };

  const privateWitness: SwapPrivateWitnessV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    inputNote: serializeVantaPrivateCoreNoteV0(inputNote),
    inputNoteType: inputNote.noteType,
    inputNoteCommitment: inputCommitment.value,
    inputMerkleLeaf,
    inputMerkleProof: args.transition.input.witness.proof,
    inputLeafIndex: args.transition.input.witness.leafIndex,
    senderSecretKey: normalizeHex32(args.senderSecretKey, "senderSecretKey"),
    senderDerivedPublicKey,
    ownerAuthorizationMode: VANTA_PRIVATE_CORE_SWAP_OWNER_AUTH_MODE_V0,
    nullifierKeyWitness: inputNote.noteSecret,
    nullifierKeyMode: VANTA_PRIVATE_CORE_SWAP_NULLIFIER_KEY_MODE_V0,
    outputNote: serializeVantaPrivateCoreNoteV0(args.transition.output.note),
    outputCommitment: outputCommitment.value,
    swapContextTag,
    inputNoteFieldEncoding,
    outputNoteFieldEncoding,
    merklePathEncoding,
  };

  const noirWitnessPackage = createVantaPrivateCoreNoirSwapWitnessPackage({
    publicInputs,
    privateWitness,
  });
  const blockers = collectSwapProofBoundaryBlockers({
    transition: args.transition,
    inputCommitment: inputCommitment.value,
    outputCommitment: outputCommitment.value,
    witnessOk,
    senderSecretMatches,
    circuitMerkleDepth: selectedCircuitDepth,
    requireNontrivialMerklePath: args.requireNontrivialMerklePath ?? true,
  });

  return {
    kind: VANTA_PRIVATE_CORE_SWAP_PROOF_KIND_V0,
    version: VANTA_PRIVATE_CORE_SWAP_PROOF_VERSION_V0,
    circuit: VANTA_PRIVATE_CORE_SWAP_CIRCUIT_V0,
    backend: VANTA_PRIVATE_CORE_SWAP_BACKEND_V0,
    readiness: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    compatibilityNotes: [
      "Current app-side input note commitment, Merkle hashing, and nullifier derivation still use SHA-256 source-layer semantics.",
      "Current swap output pricing, venue execution, and quote validity remain off-circuit and operator-backed.",
      "Current sender authorization is only prechecked off-circuit by recomputing the X25519 public key from the supplied secret key.",
      "Current swap proving boundary is frozen before the first Noir swap circuit exists; witness package shape should be treated as the initial proving target, not yet a completed circuit contract.",
    ],
    publicInputs,
    privateWitness,
    noirWitnessPackage,
  };
}

export function createVantaPrivateCoreNoirSwapWitnessPackage(args: {
  publicInputs: SwapPublicInputsV0;
  privateWitness: SwapPrivateWitnessV0;
}): VantaPrivateCoreNoirSwapWitnessPackageV0 {
  const inputAssetEncoding = encodeBytes32ToTwoU128Be(args.publicInputs.inputAssetId);
  const outputAssetEncoding = encodeBytes32ToTwoU128Be(args.publicInputs.outputAssetId);
  const inputCommitmentField = derivePoseidonNoteCommitmentField(
    args.privateWitness.inputNoteFieldEncoding,
  );
  const inputMerkleLeafField = derivePoseidonMerkleLeafField(inputCommitmentField);
  const stateRootField = derivePoseidonMerkleRootField(
    inputMerkleLeafField,
    args.privateWitness.merklePathEncoding,
  );
  const inputNullifierField = derivePoseidonNullifierField(
    args.privateWitness.inputNoteFieldEncoding.noteSecret,
    args.privateWitness.inputNoteFieldEncoding.noteNonce,
    stateRootField,
    args.privateWitness.inputLeafIndex,
  );
  const outputCommitmentField = derivePoseidonNoteCommitmentField(
    args.privateWitness.outputNoteFieldEncoding,
  );
  const swapContextField = derivePoseidonSwapContextField({
    inputNullifierField,
    outputCommitmentField,
    inputAssetId: inputAssetEncoding,
    outputAssetId: outputAssetEncoding,
    inputAmount: args.privateWitness.inputNoteFieldEncoding.amount,
    outputAmount: args.privateWitness.outputNoteFieldEncoding.amount,
    inputNoteVersion: args.publicInputs.inputNoteVersion,
    outputNoteVersion: args.publicInputs.outputNoteVersion,
  });
  const swapContextTagEncoding = encodeFieldToPublicPair(swapContextField);

  return {
    backend: VANTA_PRIVATE_CORE_SWAP_BACKEND_V0,
    circuit: VANTA_PRIVATE_CORE_SWAP_CIRCUIT_V0,
    proofVersion: VANTA_PRIVATE_CORE_SWAP_PROOF_VERSION_V0,
    merkleDepth: VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0,
    provingHashLane: VANTA_PRIVATE_CORE_SWAP_PROVING_HASH_LANE_V0,
    sourcePublicInputs: args.publicInputs,
    publicInputs: {
      state_root: stateRootField,
      input_nullifier: inputNullifierField,
      output_commitment: outputCommitmentField,
      input_asset_id_hi: inputAssetEncoding.hi,
      input_asset_id_lo: inputAssetEncoding.lo,
      output_asset_id_hi: outputAssetEncoding.hi,
      output_asset_id_lo: outputAssetEncoding.lo,
      input_amount_lo: args.privateWitness.inputNoteFieldEncoding.amount.lo,
      input_amount_hi: args.privateWitness.inputNoteFieldEncoding.amount.hi,
      output_amount_lo: args.privateWitness.outputNoteFieldEncoding.amount.lo,
      output_amount_hi: args.privateWitness.outputNoteFieldEncoding.amount.hi,
      input_note_version: String(args.publicInputs.inputNoteVersion),
      output_note_version: String(args.publicInputs.outputNoteVersion),
      swap_context_tag_hi: swapContextTagEncoding.hi,
      swap_context_tag_lo: swapContextTagEncoding.lo,
    },
    privateWitness: {
      input_note_type_code: args.privateWitness.inputNoteFieldEncoding.noteTypeCode,
      sender_public_key_hi: args.privateWitness.inputNoteFieldEncoding.ownerPublicKey.hi,
      sender_public_key_lo: args.privateWitness.inputNoteFieldEncoding.ownerPublicKey.lo,
      sender_secret_key_hi: encodeBytes32ToTwoU128Be(args.privateWitness.senderSecretKey).hi,
      sender_secret_key_lo: encodeBytes32ToTwoU128Be(args.privateWitness.senderSecretKey).lo,
      input_note_nonce_hi: args.privateWitness.inputNoteFieldEncoding.noteNonce.hi,
      input_note_nonce_lo: args.privateWitness.inputNoteFieldEncoding.noteNonce.lo,
      input_note_secret_hi: args.privateWitness.inputNoteFieldEncoding.noteSecret.hi,
      input_note_secret_lo: args.privateWitness.inputNoteFieldEncoding.noteSecret.lo,
      input_blinding_hi: args.privateWitness.inputNoteFieldEncoding.blinding.hi,
      input_blinding_lo: args.privateWitness.inputNoteFieldEncoding.blinding.lo,
      input_derivation_tag_hi: args.privateWitness.inputNoteFieldEncoding.derivationTag.hi,
      input_derivation_tag_lo: args.privateWitness.inputNoteFieldEncoding.derivationTag.lo,
      input_leaf_index: String(args.privateWitness.inputLeafIndex),
      membership_path_hi: args.privateWitness.merklePathEncoding.siblings.map((entry) => entry.hi),
      membership_path_lo: args.privateWitness.merklePathEncoding.siblings.map((entry) => entry.lo),
      membership_path_direction_bits: args.privateWitness.merklePathEncoding.directionBits,
      output_note_type_code: args.privateWitness.outputNoteFieldEncoding.noteTypeCode,
      output_owner_public_key_hi: args.privateWitness.outputNoteFieldEncoding.ownerPublicKey.hi,
      output_owner_public_key_lo: args.privateWitness.outputNoteFieldEncoding.ownerPublicKey.lo,
      output_note_nonce_hi: args.privateWitness.outputNoteFieldEncoding.noteNonce.hi,
      output_note_nonce_lo: args.privateWitness.outputNoteFieldEncoding.noteNonce.lo,
      output_note_secret_hi: args.privateWitness.outputNoteFieldEncoding.noteSecret.hi,
      output_note_secret_lo: args.privateWitness.outputNoteFieldEncoding.noteSecret.lo,
      output_blinding_hi: args.privateWitness.outputNoteFieldEncoding.blinding.hi,
      output_blinding_lo: args.privateWitness.outputNoteFieldEncoding.blinding.lo,
      output_derivation_tag_hi: args.privateWitness.outputNoteFieldEncoding.derivationTag.hi,
      output_derivation_tag_lo: args.privateWitness.outputNoteFieldEncoding.derivationTag.lo,
    },
  };
}

export function deriveVantaPrivateCoreSwapContextTag(args: {
  stateRoot: Bytes32Hex;
  inputNullifier: Bytes32Hex;
  outputCommitment: Bytes32Hex;
  inputAssetId: Bytes32Hex;
  outputAssetId: Bytes32Hex;
  inputAmount: bigint;
  outputAmount: bigint;
  inputNoteVersion: number;
  outputNoteVersion: number;
}): Bytes32Hex {
  return toHex32(
    sha256(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_SWAP_CONTEXT_DOMAIN_V0),
        hexToBytes(normalizeHex32(args.stateRoot, "stateRoot")),
        hexToBytes(normalizeHex32(args.inputNullifier, "inputNullifier")),
        hexToBytes(normalizeHex32(args.outputCommitment, "outputCommitment")),
        hexToBytes(normalizeHex32(args.inputAssetId, "inputAssetId")),
        hexToBytes(normalizeHex32(args.outputAssetId, "outputAssetId")),
        encodeU128(args.inputAmount),
        encodeU128(args.outputAmount),
        Uint8Array.of(args.inputNoteVersion),
        Uint8Array.of(args.outputNoteVersion),
      ),
    ),
  );
}

export function serializeVantaPrivateCoreNoirSwapWitnessPackageToToml(
  witnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0,
): string {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `input_nullifier = "${publicInputs.input_nullifier}"`,
    `output_commitment = "${publicInputs.output_commitment}"`,
    `input_asset_id_hi = "${publicInputs.input_asset_id_hi}"`,
    `input_asset_id_lo = "${publicInputs.input_asset_id_lo}"`,
    `output_asset_id_hi = "${publicInputs.output_asset_id_hi}"`,
    `output_asset_id_lo = "${publicInputs.output_asset_id_lo}"`,
    `input_amount_lo = "${publicInputs.input_amount_lo}"`,
    `input_amount_hi = "${publicInputs.input_amount_hi}"`,
    `output_amount_lo = "${publicInputs.output_amount_lo}"`,
    `output_amount_hi = "${publicInputs.output_amount_hi}"`,
    `input_note_version = "${publicInputs.input_note_version}"`,
    `output_note_version = "${publicInputs.output_note_version}"`,
    `swap_context_tag_hi = "${publicInputs.swap_context_tag_hi ?? "0"}"`,
    `swap_context_tag_lo = "${publicInputs.swap_context_tag_lo ?? "0"}"`,
    `input_note_type_code = "${privateWitness.input_note_type_code}"`,
    `sender_public_key_hi = "${privateWitness.sender_public_key_hi}"`,
    `sender_public_key_lo = "${privateWitness.sender_public_key_lo}"`,
    `sender_secret_key_hi = "${privateWitness.sender_secret_key_hi}"`,
    `sender_secret_key_lo = "${privateWitness.sender_secret_key_lo}"`,
    `input_note_nonce_hi = "${privateWitness.input_note_nonce_hi}"`,
    `input_note_nonce_lo = "${privateWitness.input_note_nonce_lo}"`,
    `input_note_secret_hi = "${privateWitness.input_note_secret_hi}"`,
    `input_note_secret_lo = "${privateWitness.input_note_secret_lo}"`,
    `input_blinding_hi = "${privateWitness.input_blinding_hi}"`,
    `input_blinding_lo = "${privateWitness.input_blinding_lo}"`,
    `input_derivation_tag_hi = "${privateWitness.input_derivation_tag_hi}"`,
    `input_derivation_tag_lo = "${privateWitness.input_derivation_tag_lo}"`,
    `input_leaf_index = "${privateWitness.input_leaf_index}"`,
    `membership_path_hi = ${serializeTomlArray(privateWitness.membership_path_hi)}`,
    `membership_path_lo = ${serializeTomlArray(privateWitness.membership_path_lo)}`,
    `membership_path_direction_bits = ${serializeTomlArray(privateWitness.membership_path_direction_bits)}`,
    `output_note_type_code = "${privateWitness.output_note_type_code}"`,
    `output_owner_public_key_hi = "${privateWitness.output_owner_public_key_hi}"`,
    `output_owner_public_key_lo = "${privateWitness.output_owner_public_key_lo}"`,
    `output_note_nonce_hi = "${privateWitness.output_note_nonce_hi}"`,
    `output_note_nonce_lo = "${privateWitness.output_note_nonce_lo}"`,
    `output_note_secret_hi = "${privateWitness.output_note_secret_hi}"`,
    `output_note_secret_lo = "${privateWitness.output_note_secret_lo}"`,
    `output_blinding_hi = "${privateWitness.output_blinding_hi}"`,
    `output_blinding_lo = "${privateWitness.output_blinding_lo}"`,
    `output_derivation_tag_hi = "${privateWitness.output_derivation_tag_hi}"`,
    `output_derivation_tag_lo = "${privateWitness.output_derivation_tag_lo}"`,
  ].join("\n");
}

function collectSwapProofBoundaryBlockers(args: {
  transition: SwapTransitionV0;
  inputCommitment: Bytes32Hex;
  outputCommitment: Bytes32Hex;
  witnessOk: boolean;
  senderSecretMatches: boolean;
  circuitMerkleDepth: number;
  requireNontrivialMerklePath: boolean;
}): string[] {
  const blockers: string[] = [];

  if (args.inputCommitment !== args.transition.input.witness.commitment) {
    blockers.push("Input note commitment does not match the committed witness leaf.");
  }

  if (!args.witnessOk) {
    blockers.push("Input witness request/response pair does not verify under the current private-core witness rules.");
  }

  if (!args.senderSecretMatches) {
    blockers.push("Sender secret does not derive the input note owner public key under the current X25519 ownership model.");
  }

  if (args.transition.input.note.assetId === args.transition.output.note.assetId) {
    blockers.push("Swap output asset must differ from the input note asset for the current constrained swap lane.");
  }

  if (args.transition.output.note.amount <= 0n) {
    blockers.push("Swap output amount must be greater than zero.");
  }

  if (args.transition.input.witness.proof.path.length !== args.circuitMerkleDepth) {
    blockers.push(
      `Input Merkle path depth ${String(args.transition.input.witness.proof.path.length)} does not match fixed swap circuit depth ${String(args.circuitMerkleDepth)}.`,
    );
  }

  if (args.requireNontrivialMerklePath && args.transition.input.witness.proof.path.length === 0) {
    blockers.push("Current swap proving lane requires a nontrivial retained-state Merkle path.");
  }

  if (args.outputCommitment !== args.transition.output.commitment.value) {
    blockers.push("Swap output commitment does not match the canonical output note.");
  }

  return blockers;
}

function derivePublicKeyFromSecretKey(secretKey: Bytes32Hex): Bytes32Hex {
  return toHex32(x25519.getPublicKey(hexToBytes(normalizeHex32(secretKey, "secretKey"))));
}

function encodeNoteFields(note: SerializedNoteV0 | { version: number; noteType: NoteType; assetId: Bytes32Hex; amount: bigint | string; ownerPublicKey: Bytes32Hex; noteNonce: Bytes32Hex; noteSecret: Bytes32Hex; blinding: Bytes32Hex; derivationTag: Bytes32Hex; }): VantaPrivateCoreNoteFieldEncodingV0 {
  const amount = typeof note.amount === "bigint" ? note.amount : BigInt(note.amount);
  return {
    noteVersion: String(note.version),
    noteTypeCode: String(note.noteType === "value" ? 0 : 0),
    assetId: encodeBytes32ToTwoU128Be(note.assetId),
    amount: encodeU128ToTwoU64Le(amount),
    ownerPublicKey: encodeBytes32ToTwoU128Be(note.ownerPublicKey),
    noteNonce: encodeBytes32ToTwoU128Be(note.noteNonce),
    noteSecret: encodeBytes32ToTwoU128Be(note.noteSecret),
    blinding: encodeBytes32ToTwoU128Be(note.blinding),
    derivationTag: encodeBytes32ToTwoU128Be(note.derivationTag),
  };
}

function encodeMerklePath(
  proof: MerkleProofV0,
  circuitDepth: number,
): VantaPrivateCoreMerklePathEncodingV0 {
  if (proof.path.length !== circuitDepth) {
    throw new Error(
      `Cannot encode Merkle path of depth ${String(proof.path.length)} for swap circuit depth ${String(circuitDepth)}.`,
    );
  }

  return {
    depth: circuitDepth,
    directionBitEncoding: VANTA_PRIVATE_CORE_SWAP_MERKLE_DIRECTION_BIT_V0,
    siblings: proof.path.map((node) => encodeBytes32ToTwoU128Be(node.sibling)),
    directionBits: proof.path.map((node) => (node.direction === "left" ? "1" : "0")),
  };
}

function derivePoseidonSwapContextField(args: {
  inputNullifierField: FieldDecimalString;
  outputCommitmentField: FieldDecimalString;
  inputAssetId: { hi: FieldDecimalString; lo: FieldDecimalString };
  outputAssetId: { hi: FieldDecimalString; lo: FieldDecimalString };
  inputAmount: U128EncodingV0;
  outputAmount: U128EncodingV0;
  inputNoteVersion: number;
  outputNoteVersion: number;
}): FieldDecimalString {
  return poseidon8ToString([
    BigInt(args.inputNullifierField),
    BigInt(args.outputCommitmentField),
    BigInt(args.inputAssetId.hi) + BigInt(args.inputAssetId.lo),
    BigInt(args.outputAssetId.hi) + BigInt(args.outputAssetId.lo),
    BigInt(args.inputAmount.lo) + BigInt(args.inputAmount.hi),
    BigInt(args.outputAmount.lo) + BigInt(args.outputAmount.hi),
    BigInt(args.inputNoteVersion),
    BigInt(args.outputNoteVersion),
  ]);
}

function derivePoseidonNoteCommitmentField(
  encoding: VantaPrivateCoreNoteFieldEncodingV0,
): FieldDecimalString {
  return poseidon15([
    derivePoseidonNoteHeaderField(encoding),
    BigInt(encoding.assetId.hi),
    BigInt(encoding.assetId.lo),
    BigInt(encoding.amount.lo),
    BigInt(encoding.amount.hi),
    BigInt(encoding.ownerPublicKey.hi),
    BigInt(encoding.ownerPublicKey.lo),
    BigInt(encoding.noteNonce.hi),
    BigInt(encoding.noteNonce.lo),
    BigInt(encoding.noteSecret.hi),
    BigInt(encoding.noteSecret.lo),
    BigInt(encoding.blinding.hi),
    BigInt(encoding.blinding.lo),
    BigInt(encoding.derivationTag.hi),
    BigInt(encoding.derivationTag.lo),
  ]).toString(10);
}

function derivePoseidonMerkleLeafField(noteCommitmentField: FieldDecimalString): FieldDecimalString {
  return poseidon1ToString([BigInt(noteCommitmentField)]);
}

function derivePoseidonMerkleRootField(
  leafField: FieldDecimalString,
  pathEncoding: VantaPrivateCoreMerklePathEncodingV0,
): FieldDecimalString {
  let current = BigInt(leafField);

  for (let index = 0; index < pathEncoding.depth; index += 1) {
    const siblingHi = BigInt(pathEncoding.siblings[index].hi);
    const siblingLo = BigInt(pathEncoding.siblings[index].lo);
    const sibling = siblingHi + siblingLo;
    const isCurrentRight = pathEncoding.directionBits[index] === "1" ? 1n : 0n;
    current =
      isCurrentRight === 1n
        ? poseidon3ToStringAsBigInt([sibling, current, isCurrentRight])
        : poseidon3ToStringAsBigInt([current, sibling, isCurrentRight]);
  }

  return current.toString(10);
}

function derivePoseidonNoteHeaderField(encoding: VantaPrivateCoreNoteFieldEncodingV0): bigint {
  return poseidon2([BigInt(encoding.noteVersion), BigInt(encoding.noteTypeCode)]);
}

function derivePoseidonNullifierField(
  noteSecret: Bytes32EncodingV0,
  noteNonce: Bytes32EncodingV0,
  stateRootField: FieldDecimalString,
  leafIndex: number,
): FieldDecimalString {
  return poseidon6ToString([
    BigInt(noteSecret.hi),
    BigInt(noteSecret.lo),
    BigInt(noteNonce.hi),
    BigInt(noteNonce.lo),
    BigInt(stateRootField),
    BigInt(leafIndex),
  ]);
}

function encodeBytes32ToTwoU128Be(value: Bytes32Hex): Bytes32EncodingV0 {
  const normalized = normalizeHex32(value, "bytes32");
  const bytes = hexToBytes(normalized);
  const hi = bytesToBigInt(bytes.slice(0, 16));
  const lo = bytesToBigInt(bytes.slice(16, 32));

  return {
    encoding: VANTA_PRIVATE_CORE_SWAP_BYTES32_ENCODING_V0,
    sourceHex: normalized,
    hi: hi.toString(10),
    lo: lo.toString(10),
  };
}

function encodeU128ToTwoU64Le(value: bigint): U128EncodingV0 {
  const normalized = normalizeU128(value, "u128");
  const mask = (1n << 64n) - 1n;
  const lo = normalized & mask;
  const hi = normalized >> 64n;

  return {
    encoding: VANTA_PRIVATE_CORE_SWAP_AMOUNT_ENCODING_V0,
    sourceDecimal: normalized.toString(10),
    lo: lo.toString(10),
    hi: hi.toString(10),
  };
}

function encodeFieldToPublicPair(value: FieldDecimalString): { hi: FieldDecimalString; lo: FieldDecimalString } {
  return { hi: "0", lo: value };
}

function combineHiLoToField(value: { hi: FieldDecimalString; lo: FieldDecimalString }): bigint {
  return (BigInt(value.hi) << 128n) + BigInt(value.lo);
}

function combineU128LeToField(value: U128EncodingV0): bigint {
  return (BigInt(value.hi) << 64n) + BigInt(value.lo);
}

function poseidon1ToString(values: bigint[]): FieldDecimalString {
  return poseidon1(values).toString(10);
}

function poseidon6ToString(values: bigint[]): FieldDecimalString {
  return poseidon6(values).toString(10);
}

function poseidon8ToString(values: bigint[]): FieldDecimalString {
  return poseidon8(values).toString(10);
}

function poseidon3ToStringAsBigInt(values: bigint[]): bigint {
  return poseidon3(values);
}

function normalizeHex32(value: Bytes32Hex, fieldName: string): Bytes32Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be a 32-byte hex string.`);
  }

  return value.toLowerCase() as Bytes32Hex;
}

function normalizeU128(value: bigint | number | string, fieldName: string): bigint {
  const normalized =
    typeof value === "bigint"
      ? value
      : typeof value === "number"
        ? BigInt(value)
        : BigInt(value);

  if (normalized < 0n || normalized >= 1n << 128n) {
    throw new Error(`${fieldName} must fit in u128.`);
  }

  return normalized;
}

function encodeDomain(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  return concatBytes(Uint8Array.of(bytes.length), bytes);
}

function encodeU128(value: bigint): Uint8Array {
  const normalized = normalizeU128(value, "u128");
  const bytes = new Uint8Array(16);
  let remaining = normalized;

  for (let index = 15; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

function hexToBytes(value: Bytes32Hex): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  return Uint8Array.from(normalized.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function toHex32(bytes: Uint8Array): Bytes32Hex {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}` as Bytes32Hex;
}

function toRepeatedByteHex(byte: number): Bytes32Hex {
  const normalizedByte = byte & 0xff;
  const pair = normalizedByte.toString(16).padStart(2, "0");
  return `0x${pair.repeat(32)}` as Bytes32Hex;
}

function toRepeatedByteHex12(byte: number): `0x${string}` {
  const normalizedByte = byte & 0xff;
  const pair = normalizedByte.toString(16).padStart(2, "0");
  return `0x${pair.repeat(12)}`;
}

function decimalAmountToBaseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid decimal amount for private-core swap.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const scaledFraction = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);
  const combined = `${wholePart}${scaledFraction}`.replace(/^0+(?=\d)/, "");

  return BigInt(combined || "0");
}

function serializeTomlArray(values: readonly string[]): string {
  return `[${values.map((value) => `"${value}"`).join(", ")}]`;
}

export function getVantaPrivateCoreSwapProofBoundaryExample() {
  return getVantaPrivateCoreFixedDepthSwapFixtureV0().validBoundary;
}

export function getVantaPrivateCoreFixedDepthSwapFixtureV0():
  VantaPrivateCoreFixedDepthSwapFixtureV0 {
  const senders = [
    createVantaPrivateCoreOwnerKeypair(
      "0x1010101010101010101010101010101010101010101010101010101010101010",
    ),
    createVantaPrivateCoreOwnerKeypair(
      "0x2020202020202020202020202020202020202020202020202020202020202020",
    ),
    createVantaPrivateCoreOwnerKeypair(
      "0x3030303030303030303030303030303030303030303030303030303030303030",
    ),
    createVantaPrivateCoreOwnerKeypair(
      "0x4040404040404040404040404040404040404040404040404040404040404040",
    ),
    createVantaPrivateCoreOwnerKeypair(
      "0x5050505050505050505050505050505050505050505050505050505050505050",
    ),
  ];
  const recipient = createVantaPrivateCoreOwnerKeypair(
    "0x6060606060606060606060606060606060606060606060606060606060606060",
  );
  const inputAssetId =
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Bytes32Hex;
  const outputAssetId =
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Bytes32Hex;
  const ledger = new VantaPrivateCoreLedger();
  const shields = senders.map((owner, index) =>
    ledger.shield({
      assetId: inputAssetId,
      amount: BigInt((index + 1) * 11_000_000),
      ownerPublicKey: owner.publicKey,
      noteNonce: toRepeatedByteHex(index + 1),
      noteSecret: toRepeatedByteHex(index + 11),
      blinding: toRepeatedByteHex(index + 21),
      derivationTag: toRepeatedByteHex(index + 31),
      senderEphemeralSecretKey: toRepeatedByteHex(index + 41),
      payloadNonce: toRepeatedByteHex12(index + 51),
    }),
  );
  const senderIndex = 2;
  const held = ledger.hold({
    encryptedPayload: shields[senderIndex].encryptedPayload,
    ownerSecretKey: senders[senderIndex].secretKey,
  });
  const transition = buildVantaPrivateCoreSwapTransition({
    input: held,
    outputAssetId,
    outputAmount: 1_250_000_000n,
    recipientOwnerPublicKey: recipient.publicKey,
    outputNoteNonce: "0x6161616161616161616161616161616161616161616161616161616161616161",
    outputNoteSecret: "0x7171717171717171717171717171717171717171717171717171717171717171",
    outputBlinding: "0x8181818181818181818181818181818181818181818181818181818181818181",
    outputDerivationTag: "0x9191919191919191919191919191919191919191919191919191919191919191",
    outputSenderEphemeralSecretKey:
      "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
  });
  const validBoundary = buildVantaPrivateCoreSwapProofBoundary({
    transition,
    senderSecretKey: senders[senderIndex].secretKey,
    circuitMerkleDepth: VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0,
    requireNontrivialMerklePath: true,
  });
  const validResultingRoot = ledger.previewSwap(transition).resultingRoot;

  const invalidDirectionWitnessPackage: VantaPrivateCoreNoirSwapWitnessPackageV0 = {
    ...validBoundary.noirWitnessPackage,
    privateWitness: {
      ...validBoundary.noirWitnessPackage.privateWitness,
      membership_path_direction_bits:
        validBoundary.noirWitnessPackage.privateWitness.membership_path_direction_bits.map(
          (bit, index) => (index === 0 ? (bit === "1" ? "0" : "1") : bit),
        ),
    },
  };

  return {
    merkleDepth: VANTA_PRIVATE_CORE_SWAP_CIRCUIT_MERKLE_DEPTH_V0,
    validBoundary,
    validResultingRoot,
    invalidDirectionWitnessPackage,
  };
}
