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
  VANTA_PRIVATE_CORE_NOTE_ENCODING_FIELD_ORDER_V0,
  VANTA_PRIVATE_CORE_NOTE_VERSION_V0,
  VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
  VantaPrivateCoreLedger,
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
  type NoteV0,
  type SerializedNoteV0,
  type VantaPrivateCoreSourceArtifactBundleV0,
} from "@/zk/vantaPrivateCore";

export const VANTA_PRIVATE_CORE_UNSHIELD_PROOF_VERSION_V0 = 0 as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_PROOF_KIND_V0 =
  "vanta-private-core-unshield-proof-boundary-v0" as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_V0 =
  "vanta_private_core_single_note_unshield" as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_BACKEND_V0 = "noir-barretenberg" as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_OWNER_AUTH_MODE_V0 =
  "x25519-secret-prechecked-off-circuit" as const;
export const VANTA_PRIVATE_CORE_NULLIFIER_KEY_MODE_V0 =
  "note-secret-as-nullifier-key-v0" as const;
export const VANTA_PRIVATE_CORE_BYTES32_ENCODING_V0 = "bytes32-2x128-be" as const;
export const VANTA_PRIVATE_CORE_AMOUNT_ENCODING_V0 = "u128-2x64-le" as const;
export const VANTA_PRIVATE_CORE_MERKLE_DIRECTION_BIT_V0 =
  "is_current_right__1_when_sibling_is_left" as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_CONSUME_CONTEXT_DOMAIN_V0 =
  "vanta.private-core.unshield-consume-context.v0" as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0 = 3 as const;
export const VANTA_PRIVATE_CORE_UNSHIELD_PROVING_HASH_LANE_V0 =
  "poseidon-bn254-proving-lane-v0" as const;

export type FieldDecimalString = string;
export type DirectionBit = "0" | "1";

export type Bytes32EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_BYTES32_ENCODING_V0;
  sourceHex: Bytes32Hex;
  hi: FieldDecimalString;
  lo: FieldDecimalString;
};

export type U128EncodingV0 = {
  encoding: typeof VANTA_PRIVATE_CORE_AMOUNT_ENCODING_V0;
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
  directionBitEncoding: typeof VANTA_PRIVATE_CORE_MERKLE_DIRECTION_BIT_V0;
  siblings: Bytes32EncodingV0[];
  directionBits: DirectionBit[];
};

export type UnshieldPublicInputsV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  stateRoot: Bytes32Hex;
  nullifier: Bytes32Hex;
  releaseDestination: Bytes32Hex;
  assetId: Bytes32Hex;
  amount: string;
  noteVersion: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  consumeContextTag?: Bytes32Hex;
};

export type UnshieldPrivateWitnessV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  note: SerializedNoteV0;
  noteType: NoteType;
  noteCommitment: Bytes32Hex;
  merkleLeaf: Bytes32Hex;
  merkleProof: MerkleProofV0;
  leafIndex: number;
  ownerSecretKey: Bytes32Hex;
  ownerDerivedPublicKey: Bytes32Hex;
  ownerAuthorizationMode: typeof VANTA_PRIVATE_CORE_UNSHIELD_OWNER_AUTH_MODE_V0;
  nullifierKeyWitness: Bytes32Hex;
  nullifierKeyMode: typeof VANTA_PRIVATE_CORE_NULLIFIER_KEY_MODE_V0;
  releaseDestination: Bytes32Hex;
  consumeContextTag?: Bytes32Hex;
  noteFieldEncoding: VantaPrivateCoreNoteFieldEncodingV0;
  merklePathEncoding: VantaPrivateCoreMerklePathEncodingV0;
};

export type VantaPrivateCoreNoirUnshieldWitnessPackageV0 = {
  backend: typeof VANTA_PRIVATE_CORE_UNSHIELD_BACKEND_V0;
  circuit: typeof VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_V0;
  proofVersion: typeof VANTA_PRIVATE_CORE_UNSHIELD_PROOF_VERSION_V0;
  merkleDepth: typeof VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0;
  provingHashLane: typeof VANTA_PRIVATE_CORE_UNSHIELD_PROVING_HASH_LANE_V0;
  sourcePublicInputs: UnshieldPublicInputsV0;
  publicInputs: {
    state_root: FieldDecimalString;
    nullifier: FieldDecimalString;
    release_destination_hi: FieldDecimalString;
    release_destination_lo: FieldDecimalString;
    asset_id_hi: FieldDecimalString;
    asset_id_lo: FieldDecimalString;
    amount_lo: FieldDecimalString;
    amount_hi: FieldDecimalString;
    note_version: FieldDecimalString;
    consume_context_tag_hi?: FieldDecimalString;
    consume_context_tag_lo?: FieldDecimalString;
  };
  privateWitness: {
    note_type_code: FieldDecimalString;
    owner_public_key_hi: FieldDecimalString;
    owner_public_key_lo: FieldDecimalString;
    owner_secret_key_hi: FieldDecimalString;
    owner_secret_key_lo: FieldDecimalString;
    note_nonce_hi: FieldDecimalString;
    note_nonce_lo: FieldDecimalString;
    note_secret_hi: FieldDecimalString;
    note_secret_lo: FieldDecimalString;
    blinding_hi: FieldDecimalString;
    blinding_lo: FieldDecimalString;
    derivation_tag_hi: FieldDecimalString;
    derivation_tag_lo: FieldDecimalString;
    leaf_index: FieldDecimalString;
    membership_path_hi: FieldDecimalString[];
    membership_path_lo: FieldDecimalString[];
    membership_path_direction_bits: DirectionBit[];
  };
};

export type VantaPrivateCoreUnshieldProofBoundaryV0 = {
  kind: typeof VANTA_PRIVATE_CORE_UNSHIELD_PROOF_KIND_V0;
  version: typeof VANTA_PRIVATE_CORE_UNSHIELD_PROOF_VERSION_V0;
  circuit: typeof VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_V0;
  backend: typeof VANTA_PRIVATE_CORE_UNSHIELD_BACKEND_V0;
  readiness: "ready" | "blocked";
  blockers: string[];
  compatibilityNotes: string[];
  publicInputs: UnshieldPublicInputsV0;
  privateWitness: UnshieldPrivateWitnessV0;
  noirWitnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
};

export type VantaPrivateCoreProvingArtifactBundleV0 = {
  layer: "proving-lane-v0";
  provingHashLane: typeof VANTA_PRIVATE_CORE_UNSHIELD_PROVING_HASH_LANE_V0;
  provingNoteCommitment: FieldDecimalString;
  provingMerkleLeaf: FieldDecimalString;
  provingStateRoot: FieldDecimalString;
  provingNullifier: FieldDecimalString;
  provingConsumeContextTag: FieldDecimalString | null;
};

export type VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0 = {
  artifact: "note-commitment" | "merkle-leaf" | "state-root" | "nullifier" | "consume-context";
  sourceValue: string | null;
  provingValue: string | null;
  status: "paired-across-hash-contracts" | "missing-source" | "missing-proving";
  statusLabel: string;
};

export type VantaPrivateCoreSourceVsProvingArtifactComparisonV0 = {
  layerSplit: "source-vs-proving-v0";
  noteCommitment: VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0;
  merkleLeaf: VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0;
  stateRoot: VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0;
  nullifier: VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0;
  consumeContext: VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0;
};

export type VantaPrivateCoreProofBoundaryStatusSummaryV0 = {
  circuitReadiness: "ready" | "blocked";
  readinessLabel: string;
  blockerCount: number;
  primaryBlocker: string | null;
};

export type BuildVantaPrivateCoreUnshieldProofBoundaryArgs = {
  heldNote: HeldNoteViewV0;
  ownerSecretKey: Bytes32Hex;
  releaseDestination: Bytes32Hex;
  consumeContextTag?: Bytes32Hex;
  circuitMerkleDepth?: number;
  requireNontrivialMerklePath?: boolean;
};

export type VantaPrivateCoreFixedDepthUnshieldFixtureV0 = {
  merkleDepth: typeof VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0;
  releaseDestination: Bytes32Hex;
  validBoundary: VantaPrivateCoreUnshieldProofBoundaryV0;
  invalidDirectionWitnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0;
};

export function buildVantaPrivateCoreUnshieldProofBoundary(
  args: BuildVantaPrivateCoreUnshieldProofBoundaryArgs,
): VantaPrivateCoreUnshieldProofBoundaryV0 {
  const note = args.heldNote.note;
  const noteCommitment = deriveVantaPrivateCoreNoteCommitment(note);
  const witnessRequest = createVantaPrivateCoreWitnessRequest(noteCommitment.value);
  const witnessOk = verifyVantaPrivateCoreWitnessResponse(witnessRequest, args.heldNote.witness);
  const ownerDerivedPublicKey = derivePublicKeyFromSecretKey(args.ownerSecretKey);
  const ownerSecretMatches = ownerDerivedPublicKey === note.ownerPublicKey;
  const releaseDestination = normalizeHex32(args.releaseDestination, "releaseDestination");
  const consumeContextTag =
    args.consumeContextTag ??
    deriveVantaPrivateCoreConsumeContextTag({
      commitment: noteCommitment.value,
      stateRoot: args.heldNote.witness.root,
      releaseDestination,
      assetId: note.assetId,
      amount: note.amount,
      noteVersion: note.version,
    });
  const nullifier = deriveVantaPrivateCoreNullifier(note, args.heldNote.witness);
  const merkleLeaf = deriveVantaPrivateCoreMerkleLeafHash(noteCommitment.value);
  const noteFieldEncoding = encodeNoteFieldsForUnshieldWitness(note);
  const selectedCircuitDepth =
    args.circuitMerkleDepth ?? VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0;
  const merklePathEncoding = encodeMerklePath(
    args.heldNote.witness.proof,
    selectedCircuitDepth,
  );
  const publicInputs: UnshieldPublicInputsV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    stateRoot: args.heldNote.witness.root,
    nullifier: nullifier.value,
    releaseDestination,
    assetId: note.assetId,
    amount: note.amount.toString(10),
    noteVersion: note.version,
    consumeContextTag,
  };
  const privateWitness: UnshieldPrivateWitnessV0 = {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    note: serializeVantaPrivateCoreNoteV0(note),
    noteType: note.noteType,
    noteCommitment: noteCommitment.value,
    merkleLeaf,
    merkleProof: args.heldNote.witness.proof,
    leafIndex: args.heldNote.witness.leafIndex,
    ownerSecretKey: normalizeHex32(args.ownerSecretKey, "ownerSecretKey"),
    ownerDerivedPublicKey,
    ownerAuthorizationMode: VANTA_PRIVATE_CORE_UNSHIELD_OWNER_AUTH_MODE_V0,
    nullifierKeyWitness: note.noteSecret,
    nullifierKeyMode: VANTA_PRIVATE_CORE_NULLIFIER_KEY_MODE_V0,
    releaseDestination,
    consumeContextTag,
    noteFieldEncoding,
    merklePathEncoding,
  };
  const noirWitnessPackage = createVantaPrivateCoreNoirUnshieldWitnessPackage({
    publicInputs,
    privateWitness,
  });
  const blockers = collectProofBoundaryBlockers({
    heldNote: args.heldNote,
    noteCommitment: noteCommitment.value,
    witnessOk,
    ownerSecretMatches,
    circuitMerkleDepth: selectedCircuitDepth,
    requireNontrivialMerklePath: args.requireNontrivialMerklePath ?? true,
  });

  return {
    kind: VANTA_PRIVATE_CORE_UNSHIELD_PROOF_KIND_V0,
    version: VANTA_PRIVATE_CORE_UNSHIELD_PROOF_VERSION_V0,
    circuit: VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_V0,
    backend: VANTA_PRIVATE_CORE_UNSHIELD_BACKEND_V0,
    readiness: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    compatibilityNotes: [
      "Current app-side note commitment, Merkle leaf, Merkle node, and nullifier derivations use SHA-256 semantics.",
      "Current owner authorization is only prechecked off-circuit by recomputing the X25519 public key from the supplied secret key.",
      "Current nullifier witness uses noteSecret directly as the v0.1 nullifier key witness.",
    ],
    publicInputs,
    privateWitness,
    noirWitnessPackage,
  };
}

export function createVantaPrivateCoreNoirUnshieldWitnessPackage(args: {
  publicInputs: UnshieldPublicInputsV0;
  privateWitness: UnshieldPrivateWitnessV0;
}): VantaPrivateCoreNoirUnshieldWitnessPackageV0 {
  const releaseDestinationEncoding = encodeBytes32ToTwoU128Be(args.publicInputs.releaseDestination);
  const assetEncoding = encodeBytes32ToTwoU128Be(args.publicInputs.assetId);
  const commitmentField = derivePoseidonNoteCommitmentField(args.privateWitness.noteFieldEncoding);
  const merkleLeafField = derivePoseidonMerkleLeafField(commitmentField);
  const stateRootField = derivePoseidonMerkleRootField(
    merkleLeafField,
    args.privateWitness.merklePathEncoding,
  );
  const nullifierField = derivePoseidonNullifierField(
    args.privateWitness.noteFieldEncoding.noteSecret,
    args.privateWitness.noteFieldEncoding.noteNonce,
    stateRootField,
    args.privateWitness.leafIndex,
  );
  const consumeContextField = derivePoseidonConsumeContextField({
    releaseDestination: releaseDestinationEncoding,
    assetId: assetEncoding,
    amount: args.privateWitness.noteFieldEncoding.amount,
    noteVersion: args.publicInputs.noteVersion,
    nullifierField,
  });
  // The current Noir circuit binds consume_context_tag as
  // `consume_context_tag_hi + consume_context_tag_lo`.
  // Keep the public ABI stable for now, but place the full additive proving-lane
  // value in `lo` and force `hi = 0` so the circuit and witness package agree.
  const consumeContextTagEncoding = encodeFieldToPublicPair(consumeContextField);

  return {
    backend: VANTA_PRIVATE_CORE_UNSHIELD_BACKEND_V0,
    circuit: VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_V0,
    proofVersion: VANTA_PRIVATE_CORE_UNSHIELD_PROOF_VERSION_V0,
    merkleDepth: VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0,
    provingHashLane: VANTA_PRIVATE_CORE_UNSHIELD_PROVING_HASH_LANE_V0,
    sourcePublicInputs: args.publicInputs,
    publicInputs: {
      state_root: stateRootField,
      nullifier: nullifierField,
      release_destination_hi: releaseDestinationEncoding.hi,
      release_destination_lo: releaseDestinationEncoding.lo,
      asset_id_hi: assetEncoding.hi,
      asset_id_lo: assetEncoding.lo,
      amount_lo: args.privateWitness.noteFieldEncoding.amount.lo,
      amount_hi: args.privateWitness.noteFieldEncoding.amount.hi,
      note_version: String(args.publicInputs.noteVersion),
      consume_context_tag_hi: consumeContextTagEncoding?.hi,
      consume_context_tag_lo: consumeContextTagEncoding?.lo,
    },
    privateWitness: {
      note_type_code: args.privateWitness.noteFieldEncoding.noteTypeCode,
      owner_public_key_hi: args.privateWitness.noteFieldEncoding.ownerPublicKey.hi,
      owner_public_key_lo: args.privateWitness.noteFieldEncoding.ownerPublicKey.lo,
      owner_secret_key_hi: encodeBytes32ToTwoU128Be(args.privateWitness.ownerSecretKey).hi,
      owner_secret_key_lo: encodeBytes32ToTwoU128Be(args.privateWitness.ownerSecretKey).lo,
      note_nonce_hi: args.privateWitness.noteFieldEncoding.noteNonce.hi,
      note_nonce_lo: args.privateWitness.noteFieldEncoding.noteNonce.lo,
      note_secret_hi: args.privateWitness.noteFieldEncoding.noteSecret.hi,
      note_secret_lo: args.privateWitness.noteFieldEncoding.noteSecret.lo,
      blinding_hi: args.privateWitness.noteFieldEncoding.blinding.hi,
      blinding_lo: args.privateWitness.noteFieldEncoding.blinding.lo,
      derivation_tag_hi: args.privateWitness.noteFieldEncoding.derivationTag.hi,
      derivation_tag_lo: args.privateWitness.noteFieldEncoding.derivationTag.lo,
      leaf_index: String(args.privateWitness.leafIndex),
      membership_path_hi: args.privateWitness.merklePathEncoding.siblings.map((entry) => entry.hi),
      membership_path_lo: args.privateWitness.merklePathEncoding.siblings.map((entry) => entry.lo),
      membership_path_direction_bits: args.privateWitness.merklePathEncoding.directionBits,
    },
  };
}

export function deriveVantaPrivateCoreProvingArtifactsFromBoundary(
  boundary: VantaPrivateCoreUnshieldProofBoundaryV0,
): VantaPrivateCoreProvingArtifactBundleV0 {
  const provingNoteCommitment = derivePoseidonNoteCommitmentField(
    boundary.privateWitness.noteFieldEncoding,
  );
  const provingMerkleLeaf = derivePoseidonMerkleLeafField(provingNoteCommitment);

  return {
    layer: "proving-lane-v0",
    provingHashLane: boundary.noirWitnessPackage.provingHashLane,
    provingNoteCommitment,
    provingMerkleLeaf,
    provingStateRoot: boundary.noirWitnessPackage.publicInputs.state_root,
    provingNullifier: boundary.noirWitnessPackage.publicInputs.nullifier,
    provingConsumeContextTag:
      boundary.noirWitnessPackage.publicInputs.consume_context_tag_lo ?? null,
  };
}

export function compareVantaPrivateCoreSourceAndProvingArtifacts(args: {
  sourceArtifacts: VantaPrivateCoreSourceArtifactBundleV0;
  provingArtifacts: VantaPrivateCoreProvingArtifactBundleV0;
  sourceConsumeContextTag?: string | null;
}): VantaPrivateCoreSourceVsProvingArtifactComparisonV0 {
  return {
    layerSplit: "source-vs-proving-v0",
    noteCommitment: createArtifactComparisonEntry({
      artifact: "note-commitment",
      sourceValue: args.sourceArtifacts.noteCommitment ?? null,
      provingValue: args.provingArtifacts.provingNoteCommitment,
    }),
    merkleLeaf: createArtifactComparisonEntry({
      artifact: "merkle-leaf",
      sourceValue: args.sourceArtifacts.merkleLeaf ?? null,
      provingValue: args.provingArtifacts.provingMerkleLeaf,
    }),
    stateRoot: createArtifactComparisonEntry({
      artifact: "state-root",
      sourceValue: args.sourceArtifacts.witnessRoot ?? args.sourceArtifacts.merkleRoot ?? null,
      provingValue: args.provingArtifacts.provingStateRoot,
    }),
    nullifier: createArtifactComparisonEntry({
      artifact: "nullifier",
      sourceValue: args.sourceArtifacts.nullifier ?? null,
      provingValue: args.provingArtifacts.provingNullifier,
    }),
    consumeContext: createArtifactComparisonEntry({
      artifact: "consume-context",
      sourceValue: args.sourceConsumeContextTag ?? null,
      provingValue: args.provingArtifacts.provingConsumeContextTag,
    }),
  };
}

export function summarizeVantaPrivateCoreProofBoundaryStatus(
  boundary: VantaPrivateCoreUnshieldProofBoundaryV0,
): VantaPrivateCoreProofBoundaryStatusSummaryV0 {
  return {
    circuitReadiness: boundary.readiness,
    readinessLabel:
      boundary.readiness === "ready"
        ? "Ready for current unshield circuit"
        : "Blocked for current unshield circuit",
    blockerCount: boundary.blockers.length,
    primaryBlocker: boundary.blockers[0] ?? null,
  };
}

export function deriveVantaPrivateCoreConsumeContextTag(args: {
  commitment: Bytes32Hex;
  stateRoot: Bytes32Hex;
  releaseDestination: Bytes32Hex;
  assetId: Bytes32Hex;
  amount: bigint;
  noteVersion: number;
}): Bytes32Hex {
  return toHex32(
    sha256(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_UNSHIELD_CONSUME_CONTEXT_DOMAIN_V0),
        hexToBytes(normalizeHex32(args.commitment, "commitment")),
        hexToBytes(normalizeHex32(args.stateRoot, "stateRoot")),
        hexToBytes(normalizeHex32(args.releaseDestination, "releaseDestination")),
        hexToBytes(normalizeHex32(args.assetId, "assetId")),
        encodeU128(args.amount),
        Uint8Array.of(args.noteVersion),
      ),
    ),
  );
}

export function serializeVantaPrivateCoreNoirUnshieldWitnessPackageToToml(
  witnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0,
): string {
  const publicInputs = witnessPackage.publicInputs;
  const privateWitness = witnessPackage.privateWitness;

  return [
    `state_root = "${publicInputs.state_root}"`,
    `nullifier = "${publicInputs.nullifier}"`,
    `release_destination_hi = "${publicInputs.release_destination_hi}"`,
    `release_destination_lo = "${publicInputs.release_destination_lo}"`,
    `asset_id_hi = "${publicInputs.asset_id_hi}"`,
    `asset_id_lo = "${publicInputs.asset_id_lo}"`,
    `amount_lo = "${publicInputs.amount_lo}"`,
    `amount_hi = "${publicInputs.amount_hi}"`,
    `note_version = "${publicInputs.note_version}"`,
    `consume_context_tag_hi = "${publicInputs.consume_context_tag_hi ?? "0"}"`,
    `consume_context_tag_lo = "${publicInputs.consume_context_tag_lo ?? "0"}"`,
    `note_type_code = "${privateWitness.note_type_code}"`,
    `owner_public_key_hi = "${privateWitness.owner_public_key_hi}"`,
    `owner_public_key_lo = "${privateWitness.owner_public_key_lo}"`,
    `owner_secret_key_hi = "${privateWitness.owner_secret_key_hi}"`,
    `owner_secret_key_lo = "${privateWitness.owner_secret_key_lo}"`,
    `note_nonce_hi = "${privateWitness.note_nonce_hi}"`,
    `note_nonce_lo = "${privateWitness.note_nonce_lo}"`,
    `note_secret_hi = "${privateWitness.note_secret_hi}"`,
    `note_secret_lo = "${privateWitness.note_secret_lo}"`,
    `blinding_hi = "${privateWitness.blinding_hi}"`,
    `blinding_lo = "${privateWitness.blinding_lo}"`,
    `derivation_tag_hi = "${privateWitness.derivation_tag_hi}"`,
    `derivation_tag_lo = "${privateWitness.derivation_tag_lo}"`,
    `leaf_index = "${privateWitness.leaf_index}"`,
    `membership_path_hi = ${serializeTomlArray(privateWitness.membership_path_hi)}`,
    `membership_path_lo = ${serializeTomlArray(privateWitness.membership_path_lo)}`,
    `membership_path_direction_bits = ${serializeTomlArray(privateWitness.membership_path_direction_bits)}`,
  ].join("\n");
}

export function getVantaPrivateCoreFixedDepthUnshieldFixtureV0():
  VantaPrivateCoreFixedDepthUnshieldFixtureV0 {
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
  const releaseDestination =
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Bytes32Hex;
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
  const targetIndex = 2;
  const heldNote = ledger.hold({
    encryptedPayload: shields[targetIndex].encryptedPayload,
    ownerSecretKey: owners[targetIndex].secretKey,
  });
  const validBoundary = buildVantaPrivateCoreUnshieldProofBoundary({
    heldNote,
    ownerSecretKey: owners[targetIndex].secretKey,
    releaseDestination,
    circuitMerkleDepth: VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0,
    requireNontrivialMerklePath: true,
  });

  const invalidDirectionWitnessPackage: VantaPrivateCoreNoirUnshieldWitnessPackageV0 = {
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
    merkleDepth: VANTA_PRIVATE_CORE_UNSHIELD_CIRCUIT_MERKLE_DEPTH_V0,
    releaseDestination,
    validBoundary,
    invalidDirectionWitnessPackage,
  };
}

function collectProofBoundaryBlockers(args: {
  heldNote: HeldNoteViewV0;
  noteCommitment: Bytes32Hex;
  witnessOk: boolean;
  ownerSecretMatches: boolean;
  circuitMerkleDepth?: number;
  requireNontrivialMerklePath: boolean;
}): string[] {
  const blockers: string[] = [];

  if (args.noteCommitment !== args.heldNote.commitment.value) {
    blockers.push("held note commitment does not match recomputed canonical note commitment");
  }

  if (!args.witnessOk) {
    blockers.push("witness response does not self-verify against the current private core witness contract");
  }

  if (!args.ownerSecretMatches) {
    blockers.push("owner secret key does not derive the owner public key committed in NoteV0");
  }

  if (args.requireNontrivialMerklePath && args.heldNote.witness.proof.path.length === 0) {
    blockers.push("current witness has a zero-depth Merkle path; the first real circuit should use a nontrivial membership fixture");
  }

  if (
    args.circuitMerkleDepth !== undefined &&
    args.circuitMerkleDepth !== args.heldNote.witness.proof.path.length
  ) {
    blockers.push(
      `witness path depth ${args.heldNote.witness.proof.path.length} does not match declared circuit depth ${args.circuitMerkleDepth}`,
    );
  }

  return blockers;
}

function encodeNoteFieldsForUnshieldWitness(note: NoteV0): VantaPrivateCoreNoteFieldEncodingV0 {
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
    directionBitEncoding: VANTA_PRIVATE_CORE_MERKLE_DIRECTION_BIT_V0,
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
    encoding: VANTA_PRIVATE_CORE_BYTES32_ENCODING_V0,
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
    if (isCurrentRight === 1n) {
      current = poseidon3([sibling, current, isCurrentRight]);
    } else {
      current = poseidon3([current, sibling, isCurrentRight]);
    }
  }

  return current.toString(10);
}

function derivePoseidonNullifierField(
  noteSecret: Bytes32EncodingV0,
  noteNonce: Bytes32EncodingV0,
  stateRoot: FieldDecimalString,
  leafIndex: number,
): FieldDecimalString {
  return poseidon6([
    BigInt(noteSecret.hi),
    BigInt(noteSecret.lo),
    BigInt(noteNonce.hi),
    BigInt(noteNonce.lo),
    BigInt(stateRoot),
    BigInt(leafIndex),
  ]).toString(10);
}

function derivePoseidonConsumeContextField(args: {
  releaseDestination: Bytes32EncodingV0;
  assetId: Bytes32EncodingV0;
  amount: U128EncodingV0;
  noteVersion: number;
  nullifierField: FieldDecimalString;
}): FieldDecimalString {
  return poseidon8([
    BigInt(args.releaseDestination.hi),
    BigInt(args.releaseDestination.lo),
    BigInt(args.assetId.hi),
    BigInt(args.assetId.lo),
    BigInt(args.amount.lo),
    BigInt(args.amount.hi),
    BigInt(args.noteVersion),
    BigInt(args.nullifierField),
  ]).toString(10);
}

function createArtifactComparisonEntry(args: {
  artifact: "note-commitment" | "merkle-leaf" | "state-root" | "nullifier" | "consume-context";
  sourceValue: string | null;
  provingValue: string | null;
}): VantaPrivateCoreSourceVsProvingArtifactComparisonEntryV0 {
  if (!args.sourceValue) {
    return {
      artifact: args.artifact,
      sourceValue: null,
      provingValue: args.provingValue,
      status: "missing-source",
      statusLabel: "Missing source artifact",
    };
  }

  if (!args.provingValue) {
    return {
      artifact: args.artifact,
      sourceValue: args.sourceValue,
      provingValue: null,
      status: "missing-proving",
      statusLabel: "Missing proving artifact",
    };
  }

  return {
    artifact: args.artifact,
    sourceValue: args.sourceValue,
    provingValue: args.provingValue,
    status: "paired-across-hash-contracts",
    statusLabel: "Paired across source and proving hash contracts",
  };
}

function encodeU128ToTwoU64Le(value: bigint): U128EncodingV0 {
  const normalized = normalizeU128(value, "amount");
  const lo = normalized & ((1n << 64n) - 1n);
  const hi = normalized >> 64n;

  return {
    encoding: VANTA_PRIVATE_CORE_AMOUNT_ENCODING_V0,
    sourceDecimal: normalized.toString(10),
    lo: lo.toString(10),
    hi: hi.toString(10),
  };
}

function normalizeHex32(value: unknown, fieldName: string): Bytes32Hex {
  if (typeof value !== "string" || !/^(0x)?[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${fieldName} must be a 32-byte hex string.`);
  }

  return `0x${value.replace(/^0x/, "").toLowerCase()}` as Bytes32Hex;
}

function normalizeU128(value: unknown, fieldName: string): bigint {
  let normalized: bigint;

  if (typeof value === "bigint") {
    normalized = value;
  } else if (typeof value === "number" && Number.isInteger(value)) {
    normalized = BigInt(value);
  } else if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    normalized = BigInt(value);
  } else {
    throw new Error(`${fieldName} must be an unsigned integer.`);
  }

  if (normalized < 0n || normalized > ((1n << 128n) - 1n)) {
    throw new Error(`${fieldName} must fit in u128.`);
  }

  return normalized;
}

function encodeDomain(domain: string): Uint8Array {
  return concatBytes(encodeU32(domain.length), new TextEncoder().encode(domain));
}

function encodeU32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function encodeU128(value: bigint): Uint8Array {
  const normalized = normalizeU128(value, "value");
  const bytes = new Uint8Array(16);

  for (let index = 15; index >= 0; index -= 1) {
    bytes[index] = Number((normalized >> BigInt((15 - index) * 8)) & 0xffn);
  }

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

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function toHex32(value: Uint8Array): Bytes32Hex {
  return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}` as Bytes32Hex;
}

function encodeFieldToPublicPair(value: FieldDecimalString): Bytes32EncodingV0 {
  const normalized = BigInt(value);
  const hi = 0n;
  const lo = normalized;
  return {
    encoding: VANTA_PRIVATE_CORE_BYTES32_ENCODING_V0,
    sourceHex: `0x${hi.toString(16).padStart(32, "0")}${lo.toString(16).padStart(32, "0")}` as Bytes32Hex,
    hi: hi.toString(10),
    lo: lo.toString(10),
  };
}

function toRepeatedByteHex(byte: number): Bytes32Hex {
  const value = byte.toString(16).padStart(2, "0");
  return `0x${value.repeat(32)}` as Bytes32Hex;
}

function toRepeatedByteHex12(byte: number): `0x${string}` {
  const value = byte.toString(16).padStart(2, "0");
  return `0x${value.repeat(12)}`;
}

function serializeTomlArray(values: readonly string[]): string {
  return `[${values.map((value) => `"${value}"`).join(", ")}]`;
}
