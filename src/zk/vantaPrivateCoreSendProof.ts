import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  poseidon1,
  poseidon15,
  poseidon2,
  poseidon3,
  poseidon6,
  poseidon8,
} from "poseidon-lite";
import {
  VANTA_PRIVATE_CORE_NOTE_VERSION_V0,
  VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
  VantaPrivateCoreLedger,
  createVantaPrivateCoreOwnerKeypair,
  createVantaPrivateCoreWitnessRequest,
  buildVantaPrivateCoreSendTransition,
  deriveVantaPrivateCoreMerkleLeafHash,
  deriveVantaPrivateCoreNoteCommitment,
  deriveVantaPrivateCoreNullifier,
  serializeVantaPrivateCoreNoteV0,
  verifyVantaPrivateCoreWitnessResponse,
  type Bytes32Hex,
  type MerkleProofV0,
  type NoteType,
  type NoteV0,
  type SendTransitionV0,
  type SerializedNoteV0,
} from "@/zk/vantaPrivateCore";

export const VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0 = 0 as const;
export const VANTA_PRIVATE_CORE_SEND_PROOF_KIND_V0 =
  "vanta-private-core-send-proof-boundary-v0" as const;
export const VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0 =
  "vanta_private_core_single_note_send" as const;
export const VANTA_PRIVATE_CORE_SEND_BACKEND_V0 = "noir-barretenberg" as const;
export const VANTA_PRIVATE_CORE_SEND_OWNER_AUTH_MODE_V0 =
  "x25519-secret-prechecked-off-circuit" as const;
export const VANTA_PRIVATE_CORE_SEND_NULLIFIER_KEY_MODE_V0 =
  "note-secret-as-nullifier-key-v0" as const;
export const VANTA_PRIVATE_CORE_SEND_BYTES32_ENCODING_V0 = "bytes32-2x128-be" as const;
export const VANTA_PRIVATE_CORE_SEND_AMOUNT_ENCODING_V0 = "u128-2x64-le" as const;
export const VANTA_PRIVATE_CORE_SEND_MERKLE_DIRECTION_BIT_V0 =
  "is_current_right__1_when_sibling_is_left" as const;
export const VANTA_PRIVATE_CORE_SEND_CONTEXT_DOMAIN_V0 =
  "vanta.private-core.send-context.v0" as const;
export const VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0 = 3 as const;
export const VANTA_PRIVATE_CORE_SEND_PROVING_HASH_LANE_V0 =
  "poseidon-bn254-proving-lane-v0" as const;

export type FieldDecimalString = string;
export type DirectionBit = "0" | "1";

export type Bytes32EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_SEND_BYTES32_ENCODING_V0;
  sourceHex: Bytes32Hex;
  hi: FieldDecimalString;
  lo: FieldDecimalString;
};

export type U128EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_SEND_AMOUNT_ENCODING_V0;
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
  directionBitEncoding: typeof VANTA_PRIVATE_CORE_SEND_MERKLE_DIRECTION_BIT_V0;
  siblings: Bytes32EncodingV0[];
  directionBits: DirectionBit[];
};

export type SendPublicInputsV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  stateRoot: Bytes32Hex;
  inputNullifier: Bytes32Hex;
  recipientCommitment: Bytes32Hex;
  changeCommitment: Bytes32Hex | null;
  assetId: Bytes32Hex;
  sendAmount: string;
  changeAmount: string;
  noteVersion: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  sendContextTag?: Bytes32Hex;
};

export type SendPrivateWitnessV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  inputNote: SerializedNoteV0;
  inputNoteType: NoteType;
  inputNoteCommitment: Bytes32Hex;
  inputMerkleLeaf: Bytes32Hex;
  inputMerkleProof: MerkleProofV0;
  inputLeafIndex: number;
  senderSecretKey: Bytes32Hex;
  senderDerivedPublicKey: Bytes32Hex;
  ownerAuthorizationMode: typeof VANTA_PRIVATE_CORE_SEND_OWNER_AUTH_MODE_V0;
  nullifierKeyWitness: Bytes32Hex;
  nullifierKeyMode: typeof VANTA_PRIVATE_CORE_SEND_NULLIFIER_KEY_MODE_V0;
  recipientNote: SerializedNoteV0;
  recipientCommitment: Bytes32Hex;
  changeNote: SerializedNoteV0 | null;
  changeCommitment: Bytes32Hex | null;
  sendContextTag?: Bytes32Hex;
  inputNoteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0;
  recipientNoteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0;
  changeNoteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0 | null;
  merklePathEncoding: VantaPrivateCoreMerklePathEncodingV0;
};

export type VantaPrivateCoreNoirSendWitnessPackageV0 = {
  backend: typeof VANTA_PRIVATE_CORE_SEND_BACKEND_V0;
  circuit: typeof VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0;
  proofVersion: typeof VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0;
  merkleDepth: typeof VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0;
  provingHashLane: typeof VANTA_PRIVATE_CORE_SEND_PROVING_HASH_LANE_V0;
  sourcePublicInputs: SendPublicInputsV0;
  publicInputs: {
    state_root: FieldDecimalString;
    input_nullifier: FieldDecimalString;
    recipient_commitment: FieldDecimalString;
    change_commitment: FieldDecimalString;
    send_economic_terms_hash: FieldDecimalString;
    note_version: FieldDecimalString;
    send_context_tag_hi?: FieldDecimalString;
    send_context_tag_lo?: FieldDecimalString;
  };
  privateWitness: {
    asset_id_hi: FieldDecimalString;
    asset_id_lo: FieldDecimalString;
    send_amount_lo: FieldDecimalString;
    send_amount_hi: FieldDecimalString;
    change_amount_lo: FieldDecimalString;
    change_amount_hi: FieldDecimalString;
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
    recipient_note_type_code: FieldDecimalString;
    recipient_owner_public_key_hi: FieldDecimalString;
    recipient_owner_public_key_lo: FieldDecimalString;
    recipient_note_nonce_hi: FieldDecimalString;
    recipient_note_nonce_lo: FieldDecimalString;
    recipient_note_secret_hi: FieldDecimalString;
    recipient_note_secret_lo: FieldDecimalString;
    recipient_blinding_hi: FieldDecimalString;
    recipient_blinding_lo: FieldDecimalString;
    recipient_derivation_tag_hi: FieldDecimalString;
    recipient_derivation_tag_lo: FieldDecimalString;
    change_note_type_code: FieldDecimalString;
    change_owner_public_key_hi: FieldDecimalString;
    change_owner_public_key_lo: FieldDecimalString;
    change_note_nonce_hi: FieldDecimalString;
    change_note_nonce_lo: FieldDecimalString;
    change_note_secret_hi: FieldDecimalString;
    change_note_secret_lo: FieldDecimalString;
    change_blinding_hi: FieldDecimalString;
    change_blinding_lo: FieldDecimalString;
    change_derivation_tag_hi: FieldDecimalString;
    change_derivation_tag_lo: FieldDecimalString;
  };
};

export type VantaPrivateCoreSendProofArtifactV0 = {
  backend: "barretenberg-ultrahonk";
  circuit: typeof VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0;
  circuitPublicInputs: VantaPrivateCoreNoirSendWitnessPackageV0["publicInputs"];
  proofHex: string;
  proofVersion: typeof VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0;
  provingHashLane: typeof VANTA_PRIVATE_CORE_SEND_PROVING_HASH_LANE_V0;
  publicInputs: string[];
};

export type VantaPrivateCoreSendProofBoundaryV0 = {
  kind: typeof VANTA_PRIVATE_CORE_SEND_PROOF_KIND_V0;
  version: typeof VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0;
  circuit: typeof VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0;
  backend: typeof VANTA_PRIVATE_CORE_SEND_BACKEND_V0;
  readiness: "ready" | "blocked";
  blockers: string[];
  compatibilityNotes: string[];
  publicInputs: SendPublicInputsV0;
  privateWitness: SendPrivateWitnessV0;
  noirWitnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
  proofArtifact: VantaPrivateCoreSendProofArtifactV0 | null;
};

export type VantaPrivateCoreFixedDepthSendFixtureV0 = {
  merkleDepth: typeof VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0;
  validBoundary: VantaPrivateCoreSendProofBoundaryV0;
  validResultingRoot: Bytes32Hex;
  invalidDirectionWitnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0;
};

export type BuildVantaPrivateCoreSendProofBoundaryArgs = {
  transition: SendTransitionV0;
  senderSecretKey: Bytes32Hex;
  sendContextTag?: Bytes32Hex;
  circuitMerkleDepth?: number;
  requireNontrivialMerklePath?: boolean;
};

export function buildVantaPrivateCoreSendProofBoundary(
  args: BuildVantaPrivateCoreSendProofBoundaryArgs,
): VantaPrivateCoreSendProofBoundaryV0 {
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
  const recipientCommitment = deriveVantaPrivateCoreNoteCommitment(args.transition.recipient.note);
  const changeCommitment = args.transition.change
    ? deriveVantaPrivateCoreNoteCommitment(args.transition.change.note)
    : null;
  const inputMerkleLeaf = deriveVantaPrivateCoreMerkleLeafHash(inputCommitment.value);
  const inputNoteFieldEncoding = encodeNoteFields(inputNote);
  const recipientNoteFieldEncoding = encodeNoteFields(args.transition.recipient.note);
  const changeNoteFieldEncoding = args.transition.change
    ? encodeNoteFields(args.transition.change.note)
    : null;
  const selectedCircuitDepth =
    args.circuitMerkleDepth ?? VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0;
  const merklePathEncoding = encodeMerklePath(
    args.transition.input.witness.proof,
    selectedCircuitDepth,
  );
  const sendContextTag =
    args.sendContextTag ??
    deriveVantaPrivateCoreSendContextTag({
      stateRoot: args.transition.input.witness.root,
      inputNullifier: inputNullifier.value,
      recipientCommitment: recipientCommitment.value,
      changeCommitment: changeCommitment?.value ?? null,
      assetId: inputNote.assetId,
      sendAmount: args.transition.recipient.note.amount,
      changeAmount: args.transition.change?.note.amount ?? 0n,
      noteVersion: inputNote.version,
    });

  const publicInputs: SendPublicInputsV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    stateRoot: args.transition.input.witness.root,
    inputNullifier: inputNullifier.value,
    recipientCommitment: recipientCommitment.value,
    changeCommitment: changeCommitment?.value ?? null,
    assetId: inputNote.assetId,
    sendAmount: args.transition.recipient.note.amount.toString(10),
    changeAmount: (args.transition.change?.note.amount ?? 0n).toString(10),
    noteVersion: inputNote.version,
    sendContextTag,
  };

  const privateWitness: SendPrivateWitnessV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    inputNote: serializeVantaPrivateCoreNoteV0(inputNote),
    inputNoteType: inputNote.noteType,
    inputNoteCommitment: inputCommitment.value,
    inputMerkleLeaf,
    inputMerkleProof: args.transition.input.witness.proof,
    inputLeafIndex: args.transition.input.witness.leafIndex,
    senderSecretKey: normalizeHex32(args.senderSecretKey, "senderSecretKey"),
    senderDerivedPublicKey,
    ownerAuthorizationMode: VANTA_PRIVATE_CORE_SEND_OWNER_AUTH_MODE_V0,
    nullifierKeyWitness: inputNote.noteSecret,
    nullifierKeyMode: VANTA_PRIVATE_CORE_SEND_NULLIFIER_KEY_MODE_V0,
    recipientNote: serializeVantaPrivateCoreNoteV0(args.transition.recipient.note),
    recipientCommitment: recipientCommitment.value,
    changeNote: args.transition.change
      ? serializeVantaPrivateCoreNoteV0(args.transition.change.note)
      : null,
    changeCommitment: changeCommitment?.value ?? null,
    sendContextTag,
    inputNoteFieldEncoding,
    recipientNoteFieldEncoding,
    changeNoteFieldEncoding,
    merklePathEncoding,
  };

  const noirWitnessPackage = createVantaPrivateCoreNoirSendWitnessPackage({
    publicInputs,
    privateWitness,
  });
  const blockers = collectSendProofBoundaryBlockers({
    transition: args.transition,
    inputCommitment: inputCommitment.value,
    recipientCommitment: recipientCommitment.value,
    changeCommitment: changeCommitment?.value ?? null,
    witnessOk,
    senderSecretMatches,
    circuitMerkleDepth: selectedCircuitDepth,
    requireNontrivialMerklePath: args.requireNontrivialMerklePath ?? true,
  });

  return {
    kind: VANTA_PRIVATE_CORE_SEND_PROOF_KIND_V0,
    version: VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0,
    circuit: VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0,
    backend: VANTA_PRIVATE_CORE_SEND_BACKEND_V0,
    readiness: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    compatibilityNotes: [
      "Current app-side input and output note commitments, Merkle hashing, and nullifier derivations still use SHA-256 source-layer semantics.",
      "Current sender authorization is only prechecked off-circuit by recomputing the X25519 public key from the supplied secret key.",
      "Current send proving boundary is wired to the first Noir send circuit, but remains a narrow Private Core lane rather than a production actual-private settlement circuit.",
    ],
    publicInputs,
    privateWitness,
    noirWitnessPackage,
    proofArtifact: null,
  };
}

export function createVantaPrivateCoreNoirSendWitnessPackage(args: {
  publicInputs: SendPublicInputsV0;
  privateWitness: SendPrivateWitnessV0;
}): VantaPrivateCoreNoirSendWitnessPackageV0 {
  const assetEncoding = encodeBytes32ToTwoU128Be(args.publicInputs.assetId);
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
    inputMerkleLeafField,
  );
  const recipientCommitmentField = derivePoseidonNoteCommitmentField(
    args.privateWitness.recipientNoteFieldEncoding,
  );
  const changeCommitmentField = args.privateWitness.changeNoteFieldEncoding
    ? derivePoseidonNoteCommitmentField(args.privateWitness.changeNoteFieldEncoding)
    : "0";
  const zeroAmount = encodeU128ToTwoU64Le(0n);
  const sendEconomicTermsHashField = derivePoseidonSendEconomicTermsHashField({
    assetId: assetEncoding,
    sendAmount: args.privateWitness.recipientNoteFieldEncoding.amount,
    changeAmount: args.privateWitness.changeNoteFieldEncoding?.amount ?? zeroAmount,
    noteVersion: args.publicInputs.noteVersion,
  });
  const sendContextField = derivePoseidonSendContextField({
    inputNullifierField,
    recipientCommitmentField,
    changeCommitmentField,
    sendEconomicTermsHashField,
    noteVersion: args.publicInputs.noteVersion,
  });
  const sendContextTagEncoding = encodeFieldToPublicPair(sendContextField);

  return {
    backend: VANTA_PRIVATE_CORE_SEND_BACKEND_V0,
    circuit: VANTA_PRIVATE_CORE_SEND_CIRCUIT_V0,
    proofVersion: VANTA_PRIVATE_CORE_SEND_PROOF_VERSION_V0,
    merkleDepth: VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0,
    provingHashLane: VANTA_PRIVATE_CORE_SEND_PROVING_HASH_LANE_V0,
    sourcePublicInputs: args.publicInputs,
    publicInputs: {
      state_root: stateRootField,
      input_nullifier: inputNullifierField,
      recipient_commitment: recipientCommitmentField,
      change_commitment: changeCommitmentField,
      send_economic_terms_hash: sendEconomicTermsHashField,
      note_version: String(args.publicInputs.noteVersion),
      send_context_tag_hi: sendContextTagEncoding.hi,
      send_context_tag_lo: sendContextTagEncoding.lo,
    },
    privateWitness: {
      asset_id_hi: assetEncoding.hi,
      asset_id_lo: assetEncoding.lo,
      send_amount_lo: args.privateWitness.recipientNoteFieldEncoding.amount.lo,
      send_amount_hi: args.privateWitness.recipientNoteFieldEncoding.amount.hi,
      change_amount_lo: args.privateWitness.changeNoteFieldEncoding?.amount.lo ?? zeroAmount.lo,
      change_amount_hi: args.privateWitness.changeNoteFieldEncoding?.amount.hi ?? zeroAmount.hi,
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
      recipient_note_type_code: args.privateWitness.recipientNoteFieldEncoding.noteTypeCode,
      recipient_owner_public_key_hi: args.privateWitness.recipientNoteFieldEncoding.ownerPublicKey.hi,
      recipient_owner_public_key_lo: args.privateWitness.recipientNoteFieldEncoding.ownerPublicKey.lo,
      recipient_note_nonce_hi: args.privateWitness.recipientNoteFieldEncoding.noteNonce.hi,
      recipient_note_nonce_lo: args.privateWitness.recipientNoteFieldEncoding.noteNonce.lo,
      recipient_note_secret_hi: args.privateWitness.recipientNoteFieldEncoding.noteSecret.hi,
      recipient_note_secret_lo: args.privateWitness.recipientNoteFieldEncoding.noteSecret.lo,
      recipient_blinding_hi: args.privateWitness.recipientNoteFieldEncoding.blinding.hi,
      recipient_blinding_lo: args.privateWitness.recipientNoteFieldEncoding.blinding.lo,
      recipient_derivation_tag_hi: args.privateWitness.recipientNoteFieldEncoding.derivationTag.hi,
      recipient_derivation_tag_lo: args.privateWitness.recipientNoteFieldEncoding.derivationTag.lo,
      change_note_type_code: args.privateWitness.changeNoteFieldEncoding?.noteTypeCode ?? "0",
      change_owner_public_key_hi:
        args.privateWitness.changeNoteFieldEncoding?.ownerPublicKey.hi ?? "0",
      change_owner_public_key_lo:
        args.privateWitness.changeNoteFieldEncoding?.ownerPublicKey.lo ?? "0",
      change_note_nonce_hi: args.privateWitness.changeNoteFieldEncoding?.noteNonce.hi ?? "0",
      change_note_nonce_lo: args.privateWitness.changeNoteFieldEncoding?.noteNonce.lo ?? "0",
      change_note_secret_hi: args.privateWitness.changeNoteFieldEncoding?.noteSecret.hi ?? "0",
      change_note_secret_lo: args.privateWitness.changeNoteFieldEncoding?.noteSecret.lo ?? "0",
      change_blinding_hi: args.privateWitness.changeNoteFieldEncoding?.blinding.hi ?? "0",
      change_blinding_lo: args.privateWitness.changeNoteFieldEncoding?.blinding.lo ?? "0",
      change_derivation_tag_hi:
        args.privateWitness.changeNoteFieldEncoding?.derivationTag.hi ?? "0",
      change_derivation_tag_lo:
        args.privateWitness.changeNoteFieldEncoding?.derivationTag.lo ?? "0",
    },
  };
}

export function deriveVantaPrivateCoreSendContextTag(args: {
  stateRoot: Bytes32Hex;
  inputNullifier: Bytes32Hex;
  recipientCommitment: Bytes32Hex;
  changeCommitment: Bytes32Hex | null;
  assetId: Bytes32Hex;
  sendAmount: bigint;
  changeAmount: bigint;
  noteVersion: number;
}): Bytes32Hex {
  return toHex32(
    sha256(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_SEND_CONTEXT_DOMAIN_V0),
        hexToBytes(normalizeHex32(args.stateRoot, "stateRoot")),
        hexToBytes(normalizeHex32(args.inputNullifier, "inputNullifier")),
        hexToBytes(normalizeHex32(args.recipientCommitment, "recipientCommitment")),
        hexToBytes(args.changeCommitment ? normalizeHex32(args.changeCommitment, "changeCommitment") : zeroHex32()),
        hexToBytes(normalizeHex32(args.assetId, "assetId")),
        encodeU128(args.sendAmount),
        encodeU128(args.changeAmount),
        Uint8Array.of(args.noteVersion),
      ),
    ),
  );
}

export function serializeVantaPrivateCoreNoirSendWitnessPackageToToml(
  witnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0,
): string {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `input_nullifier = "${publicInputs.input_nullifier}"`,
    `recipient_commitment = "${publicInputs.recipient_commitment}"`,
    `change_commitment = "${publicInputs.change_commitment}"`,
    `send_economic_terms_hash = "${publicInputs.send_economic_terms_hash}"`,
    `note_version = "${publicInputs.note_version}"`,
    `send_context_tag_hi = "${publicInputs.send_context_tag_hi ?? "0"}"`,
    `send_context_tag_lo = "${publicInputs.send_context_tag_lo ?? "0"}"`,
    `asset_id_hi = "${privateWitness.asset_id_hi}"`,
    `asset_id_lo = "${privateWitness.asset_id_lo}"`,
    `send_amount_lo = "${privateWitness.send_amount_lo}"`,
    `send_amount_hi = "${privateWitness.send_amount_hi}"`,
    `change_amount_lo = "${privateWitness.change_amount_lo}"`,
    `change_amount_hi = "${privateWitness.change_amount_hi}"`,
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
    `recipient_note_type_code = "${privateWitness.recipient_note_type_code}"`,
    `recipient_owner_public_key_hi = "${privateWitness.recipient_owner_public_key_hi}"`,
    `recipient_owner_public_key_lo = "${privateWitness.recipient_owner_public_key_lo}"`,
    `recipient_note_nonce_hi = "${privateWitness.recipient_note_nonce_hi}"`,
    `recipient_note_nonce_lo = "${privateWitness.recipient_note_nonce_lo}"`,
    `recipient_note_secret_hi = "${privateWitness.recipient_note_secret_hi}"`,
    `recipient_note_secret_lo = "${privateWitness.recipient_note_secret_lo}"`,
    `recipient_blinding_hi = "${privateWitness.recipient_blinding_hi}"`,
    `recipient_blinding_lo = "${privateWitness.recipient_blinding_lo}"`,
    `recipient_derivation_tag_hi = "${privateWitness.recipient_derivation_tag_hi}"`,
    `recipient_derivation_tag_lo = "${privateWitness.recipient_derivation_tag_lo}"`,
    `change_note_type_code = "${privateWitness.change_note_type_code}"`,
    `change_owner_public_key_hi = "${privateWitness.change_owner_public_key_hi}"`,
    `change_owner_public_key_lo = "${privateWitness.change_owner_public_key_lo}"`,
    `change_note_nonce_hi = "${privateWitness.change_note_nonce_hi}"`,
    `change_note_nonce_lo = "${privateWitness.change_note_nonce_lo}"`,
    `change_note_secret_hi = "${privateWitness.change_note_secret_hi}"`,
    `change_note_secret_lo = "${privateWitness.change_note_secret_lo}"`,
    `change_blinding_hi = "${privateWitness.change_blinding_hi}"`,
    `change_blinding_lo = "${privateWitness.change_blinding_lo}"`,
    `change_derivation_tag_hi = "${privateWitness.change_derivation_tag_hi}"`,
    `change_derivation_tag_lo = "${privateWitness.change_derivation_tag_lo}"`,
  ].join("\n");
}

export function getVantaPrivateCoreFixedDepthSendFixtureV0():
  VantaPrivateCoreFixedDepthSendFixtureV0 {
  const entries = [
    {
      secretKey: "0x1010101010101010101010101010101010101010101010101010101010101010",
      amount: 11_000_000n,
    },
    {
      secretKey: "0x2020202020202020202020202020202020202020202020202020202020202020",
      amount: 22_000_000n,
    },
    {
      secretKey: "0x3030303030303030303030303030303030303030303030303030303030303030",
      amount: 33_000_000n,
    },
    {
      secretKey: "0x4040404040404040404040404040404040404040404040404040404040404040",
      amount: 44_000_000n,
    },
    {
      secretKey: "0x5050505050505050505050505050505050505050505050505050505050505050",
      amount: 55_000_000n,
    },
  ] as const;
  const assetId =
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Bytes32Hex;
  const ledger = new VantaPrivateCoreLedger();
  const owners = entries.map((entry) =>
    createVantaPrivateCoreOwnerKeypair(entry.secretKey as Bytes32Hex),
  );
  const shields = entries.map((entry, index) =>
    ledger.shield({
      assetId,
      amount: entry.amount,
      ownerPublicKey: owners[index].publicKey,
      noteNonce: toRepeatedByteHex(index + 1),
      noteSecret: toRepeatedByteHex(index + 11),
      blinding: toRepeatedByteHex(index + 21),
      derivationTag: toRepeatedByteHex(index + 31),
      senderEphemeralSecretKey: toRepeatedByteHex(index + 41),
      payloadNonce: toRepeatedByteHex12(index + 51),
    }),
  );
  const senderIndex = 2;
  const recipientIndex = 4;
  const heldNote = ledger.hold({
    encryptedPayload: shields[senderIndex].encryptedPayload,
    ownerSecretKey: owners[senderIndex].secretKey,
  });
  const transition = buildVantaPrivateCoreSendTransition({
    input: heldNote,
    sendAmount: 13_000_000n,
    recipientOwnerPublicKey: owners[recipientIndex].publicKey,
    recipientNoteNonce: "0x6161616161616161616161616161616161616161616161616161616161616161",
    recipientNoteSecret: "0x7171717171717171717171717171717171717171717171717171717171717171",
    recipientBlinding: "0x8181818181818181818181818181818181818181818181818181818181818181",
    recipientDerivationTag: "0x9191919191919191919191919191919191919191919191919191919191919191",
    recipientSenderEphemeralSecretKey:
      "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
    changeNoteNonce: "0xb1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1",
    changeNoteSecret: "0xc1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1",
    changeBlinding: "0xd1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1",
    changeDerivationTag: "0xe1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1",
    changeSenderEphemeralSecretKey:
      "0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1",
  });
  const validBoundary = buildVantaPrivateCoreSendProofBoundary({
    transition,
    senderSecretKey: owners[senderIndex].secretKey,
    circuitMerkleDepth: VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0,
    requireNontrivialMerklePath: true,
  });
  const validResultingRoot = ledger.previewSend(transition).resultingRoot;

  const invalidDirectionWitnessPackage: VantaPrivateCoreNoirSendWitnessPackageV0 = {
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
    merkleDepth: VANTA_PRIVATE_CORE_SEND_CIRCUIT_MERKLE_DEPTH_V0,
    validBoundary,
    validResultingRoot,
    invalidDirectionWitnessPackage,
  };
}

function collectSendProofBoundaryBlockers(args: {
  transition: SendTransitionV0;
  inputCommitment: Bytes32Hex;
  recipientCommitment: Bytes32Hex;
  changeCommitment: Bytes32Hex | null;
  witnessOk: boolean;
  senderSecretMatches: boolean;
  circuitMerkleDepth?: number;
  requireNontrivialMerklePath: boolean;
}): string[] {
  const blockers: string[] = [];

  if (args.inputCommitment !== args.transition.input.commitment.value) {
    blockers.push("input note commitment does not match recomputed canonical note commitment");
  }

  if (args.recipientCommitment !== args.transition.recipient.commitment.value) {
    blockers.push("recipient note commitment does not match recomputed canonical note commitment");
  }

  if ((args.changeCommitment ?? null) !== (args.transition.change?.commitment.value ?? null)) {
    blockers.push("change note commitment does not match recomputed canonical note commitment");
  }

  if (!args.witnessOk) {
    blockers.push("input witness response does not self-verify against the current private core witness contract");
  }

  if (!args.senderSecretMatches) {
    blockers.push("sender secret key does not derive the owner public key committed in the input NoteV0");
  }

  if (args.requireNontrivialMerklePath && args.transition.input.witness.proof.path.length === 0) {
    blockers.push("current input witness has a zero-depth Merkle path; the first real send circuit should use a nontrivial membership fixture");
  }

  if (
    args.circuitMerkleDepth !== undefined &&
    args.circuitMerkleDepth !== args.transition.input.witness.proof.path.length
  ) {
    blockers.push(
      `input witness path depth ${args.transition.input.witness.proof.path.length} does not match declared circuit depth ${args.circuitMerkleDepth}`,
    );
  }

  if (args.transition.recipient.note.assetId !== args.transition.input.note.assetId) {
    blockers.push("recipient note asset does not match the input note asset");
  }

  if (
    args.transition.change &&
    args.transition.change.note.assetId !== args.transition.input.note.assetId
  ) {
    blockers.push("change note asset does not match the input note asset");
  }

  if (
    args.transition.recipient.note.amount +
      (args.transition.change?.note.amount ?? 0n) !==
    args.transition.input.note.amount
  ) {
    blockers.push("send transition does not conserve value across input, recipient output, and optional change");
  }

  return blockers;
}

function encodeNoteFields(note: NoteV0): VantaPrivateCoreNoteFieldEncodingV0 {
  return {
    noteVersion: String(note.version),
    noteTypeCode: String(note.noteType === "value" ? 0 : -1),
    assetId: encodeBytes32ToTwoU128Be(note.assetId),
    amount: encodeU128ToTwoU64Le(note.amount),
    ownerPublicKey: encodeBytes32ToTwoU128Be(note.ownerPublicKey),
    noteNonce: encodeBytes32ToTwoU128Be(note.noteNonce),
    noteSecret: encodeBytes32ToTwoU128Be(note.noteSecret),
    blinding: encodeBytes32ToTwoU128Be(note.blinding),
    derivationTag: encodeBytes32ToTwoU128Be(note.derivationTag),
  };
}

function encodeMerklePath(
  proof: MerkleProofV0,
  expectedDepth: number,
): VantaPrivateCoreMerklePathEncodingV0 {
  if (proof.path.length !== expectedDepth) {
    throw new Error(
      `Merkle proof depth ${proof.path.length} does not match fixed circuit depth ${expectedDepth}.`,
    );
  }

  return {
    depth: expectedDepth,
    directionBitEncoding: VANTA_PRIVATE_CORE_SEND_MERKLE_DIRECTION_BIT_V0,
    siblings: proof.path.map((entry) => encodeBytes32ToTwoU128Be(entry.sibling)),
    directionBits: proof.path.map((entry) => (entry.direction === "left" ? "1" : "0")),
  };
}

function derivePublicKeyFromSecretKey(secretKey: Bytes32Hex): Bytes32Hex {
  return toHex32(x25519.getPublicKey(hexToBytes(normalizeHex32(secretKey, "secretKey"))));
}

function encodeBytes32ToTwoU128Be(value: Bytes32Hex): Bytes32EncodingV0 {
  const normalized = normalizeHex32(value, "value").slice(2);
  const hiHex = normalized.slice(0, 32);
  const loHex = normalized.slice(32, 64);

  return {
    encoding: VANTA_PRIVATE_CORE_SEND_BYTES32_ENCODING_V0,
    sourceHex: normalizeHex32(value, "value"),
    hi: BigInt(`0x${hiHex}`).toString(10),
    lo: BigInt(`0x${loHex}`).toString(10),
  };
}

function derivePoseidonNoteHeaderField(encoding: VantaPrivateCoreNoteFieldEncodingV0): bigint {
  return poseidon2([BigInt(encoding.noteVersion), BigInt(encoding.noteTypeCode)]);
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

function derivePoseidonMerkleLeafField(commitment: FieldDecimalString): FieldDecimalString {
  return poseidon1([BigInt(commitment)]).toString(10);
}

function derivePoseidonMerkleRootField(
  leaf: FieldDecimalString,
  path: VantaPrivateCoreMerklePathEncodingV0,
): FieldDecimalString {
  let current = BigInt(leaf);

  for (let index = 0; index < path.depth; index += 1) {
    const siblingHi = BigInt(path.siblings[index].hi);
    const siblingLo = BigInt(path.siblings[index].lo);
    const isCurrentRight = path.directionBits[index] === "1" ? 1n : 0n;
    const sibling = siblingHi + siblingLo;
    current =
      isCurrentRight === 1n
        ? poseidon3([sibling, current, isCurrentRight])
        : poseidon3([current, sibling, isCurrentRight]);
  }

  return current.toString(10);
}

function derivePoseidonNullifierField(
  noteSecret: Bytes32EncodingV0,
  noteNonce: Bytes32EncodingV0,
  stateRoot: FieldDecimalString,
  merkleLeafField: FieldDecimalString,
): FieldDecimalString {
  return poseidon6([
    BigInt(noteSecret.hi),
    BigInt(noteSecret.lo),
    BigInt(noteNonce.hi),
    BigInt(noteNonce.lo),
    BigInt(stateRoot),
    BigInt(merkleLeafField),
  ]).toString(10);
}

function derivePoseidonSendContextField(args: {
  inputNullifierField: FieldDecimalString;
  recipientCommitmentField: FieldDecimalString;
  changeCommitmentField: FieldDecimalString;
  sendEconomicTermsHashField: FieldDecimalString;
  noteVersion: number;
}): FieldDecimalString {
  return poseidon6([
    BigInt(args.inputNullifierField),
    BigInt(args.recipientCommitmentField),
    BigInt(args.changeCommitmentField),
    BigInt(args.sendEconomicTermsHashField),
    BigInt(args.noteVersion),
    0n,
  ]).toString(10);
}

function derivePoseidonSendEconomicTermsHashField(args: {
  assetId: Bytes32EncodingV0;
  sendAmount: U128EncodingV0;
  changeAmount: U128EncodingV0;
  noteVersion: number;
}): FieldDecimalString {
  return poseidon8([
    BigInt(args.assetId.hi),
    BigInt(args.assetId.lo),
    BigInt(args.sendAmount.lo),
    BigInt(args.sendAmount.hi),
    BigInt(args.changeAmount.lo),
    BigInt(args.changeAmount.hi),
    BigInt(args.noteVersion),
    0n,
  ]).toString(10);
}

function encodeFieldToPublicPair(value: FieldDecimalString): { hi: FieldDecimalString; lo: FieldDecimalString } {
  return {
    hi: "0",
    lo: value,
  };
}

function serializeTomlArray(values: readonly string[]): string {
  return `[${values.map((value) => `"${value}"`).join(", ")}]`;
}

function encodeU128ToTwoU64Le(value: bigint): U128EncodingV0 {
  if (value < 0n || value > (1n << 128n) - 1n) {
    throw new Error(`Value ${String(value)} cannot be encoded as u128.`);
  }

  const loMask = (1n << 64n) - 1n;
  const lo = value & loMask;
  const hi = value >> 64n;

  return {
    encoding: VANTA_PRIVATE_CORE_SEND_AMOUNT_ENCODING_V0,
    sourceDecimal: value.toString(10),
    lo: lo.toString(10),
    hi: hi.toString(10),
  };
}

function encodeU128(value: bigint): Uint8Array {
  if (value < 0n || value > (1n << 128n) - 1n) {
    throw new Error(`Value ${String(value)} cannot be encoded as u128.`);
  }

  const bytes = new Uint8Array(16);
  let remainder = value;
  for (let index = 15; index >= 0; index -= 1) {
    bytes[index] = Number(remainder & 0xffn);
    remainder >>= 8n;
  }
  return bytes;
}

function encodeDomain(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeU32(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`Value ${String(value)} cannot be encoded as u32.`);
  }

  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, false);
  return bytes;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function hexToBytes(value: Bytes32Hex): Uint8Array {
  const normalized = value.slice(2);
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function normalizeHex32(value: Bytes32Hex, fieldName: string): Bytes32Hex {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be a 32-byte hex value.`);
  }

  return value.toLowerCase() as Bytes32Hex;
}

function toHex32(bytes: Uint8Array): Bytes32Hex {
  if (bytes.length !== 32) {
    throw new Error(`Expected 32 bytes, received ${bytes.length}.`);
  }

  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function zeroHex32(): Bytes32Hex {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
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
