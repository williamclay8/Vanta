import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2.js";

export const VANTA_PRIVATE_CORE_NOTE_VERSION_V0 = 0 as const;
export const VANTA_PRIVATE_CORE_NOTE_TYPE_VALUE = "value" as const;
export const VANTA_PRIVATE_CORE_NOTE_TYPE_CODES = {
  [VANTA_PRIVATE_CORE_NOTE_TYPE_VALUE]: 0,
} as const;
export const VANTA_PRIVATE_CORE_NOTE_FIELD_WIDTHS_V0 = {
  version: 1,
  noteType: 1,
  assetId: 32,
  amount: 16,
  ownerPublicKey: 32,
  noteNonce: 32,
  noteSecret: 32,
  blinding: 32,
  derivationTag: 32,
} as const;
export const VANTA_PRIVATE_CORE_NOTE_ENCODING_FIELD_ORDER_V0 = [
  "version",
  "noteType",
  "assetId",
  "amount",
  "ownerPublicKey",
  "noteNonce",
  "noteSecret",
  "blinding",
  "derivationTag",
] as const;
export const VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0 = {
  noteEncoding: "vanta.private-core.note.v0",
  noteCommitment: "vanta.private-core.note-commitment.v0",
  merkleLeaf: "vanta.private-core.merkle-leaf.v0",
  merkleNode: "vanta.private-core.merkle-node.v0",
  merkleEmptyRoot: "vanta.private-core.merkle-empty-root.v0",
  payloadPlaintext: "vanta.private-core.payload-plaintext.v0",
  payloadKeyAgreement: "vanta.private-core.payload-key-agreement.v0",
  payloadCiphertext: "vanta.private-core.payload-ciphertext.v0",
  payloadCommitment: "vanta.private-core.payload-commitment.v0",
  nullifier: "vanta.private-core.nullifier.v0",
  witnessRequest: "vanta.private-core.witness-request.v0",
  witnessResponse: "vanta.private-core.witness-response.v0",
  proofStatement: "vanta.private-core.unshield-proof-statement.v0",
} as const;
export const VANTA_PRIVATE_CORE_MERKLE_ODD_LEAF_PADDING_RULE_V0 = "duplicate-last" as const;
export const VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0 = "groth16-first" as const;

export type Bytes32Hex = `0x${string}`;
export type Bytes12Hex = `0x${string}`;
export type Bytes16Hex = `0x${string}`;
export type NoteType = keyof typeof VANTA_PRIVATE_CORE_NOTE_TYPE_CODES;

export type NoteV0 = {
  version: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  noteType: NoteType;
  assetId: Bytes32Hex;
  amount: bigint;
  ownerPublicKey: Bytes32Hex;
  noteNonce: Bytes32Hex;
  noteSecret: Bytes32Hex;
  blinding: Bytes32Hex;
  derivationTag: Bytes32Hex;
};

export type SerializedNoteV0 = {
  version: typeof VANTA_PRIVATE_CORE_NOTE_VERSION_V0;
  noteType: NoteType;
  assetId: Bytes32Hex;
  amount: string;
  ownerPublicKey: Bytes32Hex;
  noteNonce: Bytes32Hex;
  noteSecret: Bytes32Hex;
  blinding: Bytes32Hex;
  derivationTag: Bytes32Hex;
};

export type VantaPrivateCoreOwnerKeypair = {
  secretKey: Bytes32Hex;
  publicKey: Bytes32Hex;
};

export type NoteCommitmentV0 = {
  scheme: "sha256-note-commitment-v0";
  value: Bytes32Hex;
};

export type NoteNullifierV0 = {
  scheme: "sha256-nullifier-v0";
  value: Bytes32Hex;
};

export type EncryptedPayloadPlaintextV0 = {
  kind: "vanta-private-core-payload-plaintext-v0";
  note: SerializedNoteV0;
};

export type CiphertextPackageV0 = {
  kind: "vanta-private-core-ciphertext-package-v0";
  scheme: "x25519-hkdf-sha256-chacha20poly1305-v0";
  recipientPublicKey: Bytes32Hex;
  senderEphemeralPublicKey: Bytes32Hex;
  payloadNonce: Bytes12Hex;
  ciphertext: string;
  payloadCommitment: Bytes32Hex;
};

export type MerkleProofNodeV0 = {
  direction: "left" | "right";
  sibling: Bytes32Hex;
};

export type MerkleProofV0 = {
  kind: "vanta-private-core-merkle-proof-v0";
  leafIndex: number;
  leaf: Bytes32Hex;
  root: Bytes32Hex;
  path: MerkleProofNodeV0[];
  oddLeafPaddingRule: typeof VANTA_PRIVATE_CORE_MERKLE_ODD_LEAF_PADDING_RULE_V0;
};

export type WitnessRequestV0 = {
  kind: "vanta-private-core-witness-request-v0";
  commitment: Bytes32Hex;
};

export type WitnessResponseV0 = {
  kind: "vanta-private-core-witness-response-v0";
  requestCommitment: Bytes32Hex;
  commitment: Bytes32Hex;
  leafIndex: number;
  root: Bytes32Hex;
  proof: MerkleProofV0;
};

export type UnshieldPublicInputsV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  commitment: Bytes32Hex;
  root: Bytes32Hex;
  nullifier: Bytes32Hex;
  assetId: Bytes32Hex;
  amount: string;
  leafIndex: number;
};

export type UnshieldPrivateInputsV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  note: SerializedNoteV0;
  witness: WitnessResponseV0;
};

export type UnshieldProofEnvelopeV0 = {
  statement: typeof VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0;
  publicInputs: UnshieldPublicInputsV0;
  privateInputs: UnshieldPrivateInputsV0;
  proof: "mvp-local-verifier";
};

export type ShieldArtifactV0 = {
  note: NoteV0;
  commitment: NoteCommitmentV0;
  encryptedPayload: CiphertextPackageV0;
  insertionIndex: number;
  root: Bytes32Hex;
};

export type HeldNoteViewV0 = {
  note: NoteV0;
  commitment: NoteCommitmentV0;
  witness: WitnessResponseV0;
};

export type UnshieldResultV0 = {
  releasedAssetId: Bytes32Hex;
  releasedAmount: bigint;
  nullifier: NoteNullifierV0;
  root: Bytes32Hex;
};

export type VantaPrivateCoreSourceArtifactBundleV0 = {
  layer: "source-layer-v0";
  noteCommitment?: Bytes32Hex;
  payloadCommitment?: Bytes32Hex;
  merkleLeaf?: Bytes32Hex;
  merkleRoot?: Bytes32Hex;
  witnessRoot?: Bytes32Hex;
  nullifier?: Bytes32Hex;
};

export type VantaPrivateCoreUnshieldProofEnvelopeSummaryV0 = {
  statement: UnshieldProofEnvelopeV0["statement"];
  proof: UnshieldProofEnvelopeV0["proof"];
  commitment: Bytes32Hex;
  root: Bytes32Hex;
  nullifier: Bytes32Hex;
  assetId: Bytes32Hex;
  amount: string;
  leafIndex: number;
};

export type VantaPrivateCoreDemoRunV0 = {
  happyPath: {
    shield: ShieldArtifactV0;
    hold: HeldNoteViewV0;
    unshield: UnshieldResultV0;
  };
  replayFailure: string;
};

type StoredCommitment = {
  commitment: NoteCommitmentV0;
};

export class VantaPrivateCoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VantaPrivateCoreError";
  }
}

export function createVantaPrivateCoreOwnerKeypair(
  secretKey?: Bytes32Hex,
): VantaPrivateCoreOwnerKeypair {
  const secret = secretKey ? normalizeHex(secretKey, 32, "secretKey") : randomHex(32);
  const publicKey = toHex32(x25519.getPublicKey(hexToBytes(secret)));
  return {
    secretKey: secret,
    publicKey,
  };
}

export function createVantaPrivateCoreNoteV0(input: {
  assetId: Bytes32Hex;
  amount: bigint | number | string;
  ownerPublicKey: Bytes32Hex;
  noteType?: NoteType;
  noteNonce?: Bytes32Hex;
  noteSecret?: Bytes32Hex;
  blinding?: Bytes32Hex;
  derivationTag?: Bytes32Hex;
}): NoteV0 {
  return {
    version: VANTA_PRIVATE_CORE_NOTE_VERSION_V0,
    noteType: normalizeNoteType(input.noteType ?? VANTA_PRIVATE_CORE_NOTE_TYPE_VALUE),
    assetId: normalizeHex(input.assetId, 32, "assetId"),
    amount: normalizeU128(input.amount, "amount"),
    ownerPublicKey: normalizeHex(input.ownerPublicKey, 32, "ownerPublicKey"),
    noteNonce: normalizeHex(input.noteNonce ?? randomHex(32), 32, "noteNonce"),
    noteSecret: normalizeHex(input.noteSecret ?? randomHex(32), 32, "noteSecret"),
    blinding: normalizeHex(input.blinding ?? randomHex(32), 32, "blinding"),
    derivationTag: normalizeHex(input.derivationTag ?? randomHex(32), 32, "derivationTag"),
  };
}

export function serializeVantaPrivateCoreNoteV0(note: NoteV0): SerializedNoteV0 {
  assertValidNoteV0(note);
  return {
    version: note.version,
    noteType: note.noteType,
    assetId: note.assetId,
    amount: note.amount.toString(10),
    ownerPublicKey: note.ownerPublicKey,
    noteNonce: note.noteNonce,
    noteSecret: note.noteSecret,
    blinding: note.blinding,
    derivationTag: note.derivationTag,
  };
}

export function parseSerializedVantaPrivateCoreNoteV0(note: SerializedNoteV0): NoteV0 {
  return createVantaPrivateCoreNoteV0(note);
}

export function encodeVantaPrivateCoreNoteV0(note: NoteV0): Uint8Array {
  assertValidNoteV0(note);

  return concatBytes(
    encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.noteEncoding),
    encodeU8(note.version),
    encodeU8(VANTA_PRIVATE_CORE_NOTE_TYPE_CODES[note.noteType]),
    hexToBytes(note.assetId),
    encodeU128(note.amount),
    hexToBytes(note.ownerPublicKey),
    hexToBytes(note.noteNonce),
    hexToBytes(note.noteSecret),
    hexToBytes(note.blinding),
    hexToBytes(note.derivationTag),
  );
}

export function deriveVantaPrivateCoreNoteCommitment(note: NoteV0): NoteCommitmentV0 {
  return {
    scheme: "sha256-note-commitment-v0",
    value: sha256Hex(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.noteCommitment),
        encodeVantaPrivateCoreNoteV0(note),
      ),
    ),
  };
}

export function deriveVantaPrivateCoreMerkleLeafHash(commitment: Bytes32Hex): Bytes32Hex {
  return sha256Hex(
    concatBytes(encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.merkleLeaf), hexToBytes(commitment)),
  );
}

export function deriveVantaPrivateCoreMerkleNodeHash(
  left: Bytes32Hex,
  right: Bytes32Hex,
): Bytes32Hex {
  return sha256Hex(
    concatBytes(
      encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.merkleNode),
      hexToBytes(normalizeHex(left, 32, "left")),
      hexToBytes(normalizeHex(right, 32, "right")),
    ),
  );
}

export function deriveVantaPrivateCoreEmptyMerkleRoot(): Bytes32Hex {
  return sha256Hex(encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.merkleEmptyRoot));
}

export function buildVantaPrivateCorePayloadPlaintext(
  note: NoteV0,
): EncryptedPayloadPlaintextV0 {
  return {
    kind: "vanta-private-core-payload-plaintext-v0",
    note: serializeVantaPrivateCoreNoteV0(note),
  };
}

export function encodeVantaPrivateCorePayloadPlaintext(
  plaintext: EncryptedPayloadPlaintextV0,
): Uint8Array {
  if (plaintext.kind !== "vanta-private-core-payload-plaintext-v0") {
    throw new VantaPrivateCoreError(`Unsupported plaintext kind: ${String(plaintext.kind)}`);
  }

  const note = parseSerializedVantaPrivateCoreNoteV0(plaintext.note);
  return concatBytes(
    encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadPlaintext),
    encodeVantaPrivateCoreNoteV0(note),
  );
}

export function encryptVantaPrivateCorePayload(
  note: NoteV0,
  recipientPublicKey: Bytes32Hex,
  senderEphemeralSecretKey?: Bytes32Hex,
  payloadNonce?: Bytes12Hex,
): CiphertextPackageV0 {
  const plaintext = encodeVantaPrivateCorePayloadPlaintext(
    buildVantaPrivateCorePayloadPlaintext(note),
  );
  const recipientBytes = hexToBytes(normalizeHex(recipientPublicKey, 32, "recipientPublicKey"));
  const ephemeralSecret = hexToBytes(
    normalizeHex(senderEphemeralSecretKey ?? randomHex(32), 32, "senderEphemeralSecretKey"),
  );
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralSecret);
  const nonce = hexToBytes(normalizeHex(payloadNonce ?? randomHex(12), 12, "payloadNonce"));
  const sharedSecret = x25519.getSharedSecret(ephemeralSecret, recipientBytes);
  const key = hkdf(
    sha256,
    sharedSecret,
    nonce,
    concatBytes(
      encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadKeyAgreement),
      recipientBytes,
      ephemeralPublicKey,
    ),
    32,
  );
  const aad = concatBytes(
    encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadCiphertext),
    recipientBytes,
    ephemeralPublicKey,
    nonce,
  );
  const ciphertext = chacha20poly1305(key, nonce, aad).encrypt(plaintext);
  const encodedCiphertext = encodeBase64(ciphertext);
  const payload = {
    kind: "vanta-private-core-ciphertext-package-v0" as const,
    scheme: "x25519-hkdf-sha256-chacha20poly1305-v0" as const,
    recipientPublicKey: toHex32(recipientBytes),
    senderEphemeralPublicKey: toHex32(ephemeralPublicKey),
    payloadNonce: toHex12(nonce),
    ciphertext: encodedCiphertext,
    payloadCommitment: sha256Hex(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadCommitment),
        recipientBytes,
        ephemeralPublicKey,
        nonce,
        ciphertext,
      ),
    ),
  };

  return payload;
}

export function decryptVantaPrivateCorePayload(
  payload: CiphertextPackageV0,
  recipientSecretKey: Bytes32Hex,
): NoteV0 {
  assertValidCiphertextPackage(payload);

  const secretKey = hexToBytes(normalizeHex(recipientSecretKey, 32, "recipientSecretKey"));
  const recipientPublicKey = x25519.getPublicKey(secretKey);
  const payloadRecipient = hexToBytes(payload.recipientPublicKey);

  if (!equalBytes(recipientPublicKey, payloadRecipient)) {
    throw new VantaPrivateCoreError("Recipient secret key does not match the payload recipient public key.");
  }

  const ephemeralPublicKey = hexToBytes(payload.senderEphemeralPublicKey);
  const nonce = hexToBytes(normalizeHex(payload.payloadNonce, 12, "payloadNonce"));
  const ciphertext = decodeBase64(payload.ciphertext, "ciphertext");
  const expectedCommitment = sha256Hex(
    concatBytes(
      encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadCommitment),
      payloadRecipient,
      ephemeralPublicKey,
      nonce,
      ciphertext,
    ),
  );

  if (expectedCommitment !== payload.payloadCommitment) {
    throw new VantaPrivateCoreError("Encrypted payload commitment mismatch.");
  }

  const sharedSecret = x25519.getSharedSecret(secretKey, ephemeralPublicKey);
  const key = hkdf(
    sha256,
    sharedSecret,
    nonce,
    concatBytes(
      encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadKeyAgreement),
      payloadRecipient,
      ephemeralPublicKey,
    ),
    32,
  );
  const aad = concatBytes(
    encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadCiphertext),
    payloadRecipient,
    ephemeralPublicKey,
    nonce,
  );

  let plaintext: Uint8Array;

  try {
    plaintext = chacha20poly1305(key, nonce, aad).decrypt(ciphertext);
  } catch (error) {
    throw new VantaPrivateCoreError(`Encrypted payload authentication failed: ${getErrorMessage(error)}`);
  }

  return decodePayloadPlaintext(plaintext);
}

export function deriveVantaPrivateCoreNullifier(
  note: NoteV0,
  witness: WitnessResponseV0,
): NoteNullifierV0 {
  const commitment = deriveVantaPrivateCoreNoteCommitment(note);

  if (commitment.value !== witness.commitment) {
    throw new VantaPrivateCoreError("Witness commitment does not match note commitment.");
  }

  return {
    scheme: "sha256-nullifier-v0",
    value: sha256Hex(
      concatBytes(
        encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.nullifier),
        hexToBytes(note.noteSecret),
        hexToBytes(note.noteNonce),
        hexToBytes(commitment.value),
        hexToBytes(witness.root),
        encodeU32(witness.leafIndex),
      ),
    ),
  };
}

export function verifyVantaPrivateCoreMerkleProof(proof: MerkleProofV0): boolean {
  assertValidMerkleProof(proof);

  let current = proof.leaf;

  for (const step of proof.path) {
    current =
      step.direction === "left"
        ? deriveVantaPrivateCoreMerkleNodeHash(step.sibling, current)
        : deriveVantaPrivateCoreMerkleNodeHash(current, step.sibling);
  }

  return current === proof.root;
}

export function createVantaPrivateCoreWitnessRequest(
  commitment: Bytes32Hex,
): WitnessRequestV0 {
  return {
    kind: "vanta-private-core-witness-request-v0",
    commitment: normalizeHex(commitment, 32, "commitment"),
  };
}

export function verifyVantaPrivateCoreWitnessResponse(
  request: WitnessRequestV0,
  response: WitnessResponseV0,
): boolean {
  return (
    request.kind === "vanta-private-core-witness-request-v0" &&
    response.kind === "vanta-private-core-witness-response-v0" &&
    request.commitment === response.requestCommitment &&
    request.commitment === response.commitment &&
    response.leafIndex === response.proof.leafIndex &&
    response.root === response.proof.root &&
    verifyVantaPrivateCoreMerkleProof(response.proof)
  );
}

export function buildVantaPrivateCoreUnshieldProofEnvelope(
  note: NoteV0,
  witness: WitnessResponseV0,
): UnshieldProofEnvelopeV0 {
  const commitment = deriveVantaPrivateCoreNoteCommitment(note);

  if (commitment.value !== witness.commitment) {
    throw new VantaPrivateCoreError("Cannot build proof envelope for a note with mismatched witness.");
  }

  const nullifier = deriveVantaPrivateCoreNullifier(note, witness);

  return {
    statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
    publicInputs: {
      statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
      commitment: commitment.value,
      root: witness.root,
      nullifier: nullifier.value,
      assetId: note.assetId,
      amount: note.amount.toString(10),
      leafIndex: witness.leafIndex,
    },
    privateInputs: {
      statement: VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0,
      note: serializeVantaPrivateCoreNoteV0(note),
      witness,
    },
    proof: "mvp-local-verifier",
  };
}

export function verifyVantaPrivateCoreUnshieldProofEnvelope(
  envelope: UnshieldProofEnvelopeV0,
): boolean {
  const note = parseSerializedVantaPrivateCoreNoteV0(envelope.privateInputs.note);
  const commitment = deriveVantaPrivateCoreNoteCommitment(note);

  if (commitment.value !== envelope.publicInputs.commitment) {
    return false;
  }

  if (
    !verifyVantaPrivateCoreWitnessResponse(
      createVantaPrivateCoreWitnessRequest(commitment.value),
      envelope.privateInputs.witness,
    )
  ) {
    return false;
  }

  const nullifier = deriveVantaPrivateCoreNullifier(note, envelope.privateInputs.witness);

  return (
    envelope.statement === VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0 &&
    envelope.publicInputs.statement === VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0 &&
    envelope.privateInputs.statement === VANTA_PRIVATE_CORE_PROOF_SYSTEM_V0 &&
    envelope.publicInputs.root === envelope.privateInputs.witness.root &&
    envelope.publicInputs.nullifier === nullifier.value &&
    envelope.publicInputs.assetId === note.assetId &&
    envelope.publicInputs.amount === note.amount.toString(10) &&
    envelope.publicInputs.leafIndex === envelope.privateInputs.witness.leafIndex
  );
}

export function summarizeVantaPrivateCoreUnshieldProofEnvelope(
  envelope: UnshieldProofEnvelopeV0,
): VantaPrivateCoreUnshieldProofEnvelopeSummaryV0 {
  return {
    statement: envelope.statement,
    proof: envelope.proof,
    commitment: envelope.publicInputs.commitment,
    root: envelope.publicInputs.root,
    nullifier: envelope.publicInputs.nullifier,
    assetId: envelope.publicInputs.assetId,
    amount: envelope.publicInputs.amount,
    leafIndex: envelope.publicInputs.leafIndex,
  };
}

export function deriveVantaPrivateCoreSourceArtifactsFromShieldArtifact(
  shield: ShieldArtifactV0,
): VantaPrivateCoreSourceArtifactBundleV0 {
  return {
    layer: "source-layer-v0",
    noteCommitment: shield.commitment.value,
    payloadCommitment: shield.encryptedPayload.payloadCommitment,
    merkleLeaf: deriveVantaPrivateCoreMerkleLeafHash(shield.commitment.value),
    merkleRoot: shield.root,
  };
}

export function deriveVantaPrivateCoreSourceArtifactsFromHeldNote(
  heldNote: HeldNoteViewV0,
): VantaPrivateCoreSourceArtifactBundleV0 {
  return {
    layer: "source-layer-v0",
    noteCommitment: heldNote.commitment.value,
    merkleLeaf: deriveVantaPrivateCoreMerkleLeafHash(heldNote.commitment.value),
    witnessRoot: heldNote.witness.root,
  };
}

export function deriveVantaPrivateCoreSourceArtifactsFromUnshieldResult(
  result: UnshieldResultV0,
): VantaPrivateCoreSourceArtifactBundleV0 {
  return {
    layer: "source-layer-v0",
    merkleRoot: result.root,
    nullifier: result.nullifier.value,
  };
}

export class OrderedBinaryMerkleTree {
  private readonly leaves: Bytes32Hex[] = [];

  insert(commitment: Bytes32Hex): number {
    this.leaves.push(
      deriveVantaPrivateCoreMerkleLeafHash(normalizeHex(commitment, 32, "commitment")),
    );
    return this.leaves.length - 1;
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  getRoot(): Bytes32Hex {
    if (this.leaves.length === 0) {
      return deriveVantaPrivateCoreEmptyMerkleRoot();
    }

    return this.buildLevels()[this.buildLevels().length - 1][0];
  }

  prove(index: number): MerkleProofV0 {
    if (!Number.isInteger(index) || index < 0 || index >= this.leaves.length) {
      throw new VantaPrivateCoreError(`Leaf index ${String(index)} is out of bounds.`);
    }

    const levels = this.buildLevels();
    const path: MerkleProofNodeV0[] = [];
    let currentIndex = index;

    for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
      const level = levels[levelIndex];
      const pairIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const siblingIndex = pairIndex < level.length ? pairIndex : currentIndex;
      const sibling = level[siblingIndex];
      path.push({
        direction: currentIndex % 2 === 0 ? "right" : "left",
        sibling,
      });
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      kind: "vanta-private-core-merkle-proof-v0",
      leafIndex: index,
      leaf: this.leaves[index],
      root: levels[levels.length - 1][0],
      path,
      oddLeafPaddingRule: VANTA_PRIVATE_CORE_MERKLE_ODD_LEAF_PADDING_RULE_V0,
    };
  }

  private buildLevels(): Bytes32Hex[][] {
    if (this.leaves.length === 0) {
      throw new VantaPrivateCoreError("Cannot build Merkle levels for an empty tree.");
    }

    const levels: Bytes32Hex[][] = [this.leaves.slice()];

    while (levels[levels.length - 1].length > 1) {
      const current = levels[levels.length - 1];
      const next: Bytes32Hex[] = [];

      for (let index = 0; index < current.length; index += 2) {
        const left = current[index];
        const right = current[index + 1] ?? current[index];
        next.push(deriveVantaPrivateCoreMerkleNodeHash(left, right));
      }

      levels.push(next);
    }

    return levels;
  }
}

export class VantaPrivateCoreWitnessProvider {
  constructor(private readonly tree: OrderedBinaryMerkleTree, private readonly commitments: StoredCommitment[]) {}

  getWitness(request: WitnessRequestV0): WitnessResponseV0 {
    const index = this.commitments.findIndex((entry) => entry.commitment.value === request.commitment);

    if (index < 0) {
      throw new VantaPrivateCoreError("Witness request commitment is not present in the committed state.");
    }

    const proof = this.tree.prove(index);

    return {
      kind: "vanta-private-core-witness-response-v0",
      requestCommitment: request.commitment,
      commitment: request.commitment,
      leafIndex: index,
      root: this.tree.getRoot(),
      proof,
    };
  }
}

export class VantaPrivateCoreLedger {
  private readonly tree = new OrderedBinaryMerkleTree();
  private readonly commitments: StoredCommitment[] = [];
  private readonly consumedNullifiers = new Set<Bytes32Hex>();

  shield(args: {
    assetId: Bytes32Hex;
    amount: bigint | number | string;
    ownerPublicKey: Bytes32Hex;
    noteType?: NoteType;
    noteNonce?: Bytes32Hex;
    noteSecret?: Bytes32Hex;
    blinding?: Bytes32Hex;
    derivationTag?: Bytes32Hex;
    senderEphemeralSecretKey?: Bytes32Hex;
    payloadNonce?: Bytes12Hex;
  }): ShieldArtifactV0 {
    const note = createVantaPrivateCoreNoteV0(args);
    const commitment = deriveVantaPrivateCoreNoteCommitment(note);
    const encryptedPayload = encryptVantaPrivateCorePayload(
      note,
      note.ownerPublicKey,
      args.senderEphemeralSecretKey,
      args.payloadNonce,
    );
    const insertionIndex = this.tree.insert(commitment.value);
    this.commitments.push({ commitment });

    return {
      note,
      commitment,
      encryptedPayload,
      insertionIndex,
      root: this.tree.getRoot(),
    };
  }

  hold(args: { encryptedPayload: CiphertextPackageV0; ownerSecretKey: Bytes32Hex }): HeldNoteViewV0 {
    const note = decryptVantaPrivateCorePayload(args.encryptedPayload, args.ownerSecretKey);
    const commitment = deriveVantaPrivateCoreNoteCommitment(note);
    const request = createVantaPrivateCoreWitnessRequest(commitment.value);
    const witness = this.getWitnessProvider().getWitness(request);

    if (!verifyVantaPrivateCoreWitnessResponse(request, witness)) {
      throw new VantaPrivateCoreError("Witness verification failed during hold flow.");
    }

    return {
      note,
      commitment,
      witness,
    };
  }

  unshield(heldNote: HeldNoteViewV0): UnshieldResultV0 {
    const envelope = buildVantaPrivateCoreUnshieldProofEnvelope(
      heldNote.note,
      heldNote.witness,
    );

    if (!verifyVantaPrivateCoreUnshieldProofEnvelope(envelope)) {
      throw new VantaPrivateCoreError("Unshield proof verification failed.");
    }

    const nullifier = deriveVantaPrivateCoreNullifier(heldNote.note, heldNote.witness);

    if (this.consumedNullifiers.has(nullifier.value)) {
      throw new VantaPrivateCoreError(`Nullifier ${nullifier.value} has already been consumed.`);
    }

    this.consumedNullifiers.add(nullifier.value);

    return {
      releasedAssetId: heldNote.note.assetId,
      releasedAmount: heldNote.note.amount,
      nullifier,
      root: heldNote.witness.root,
    };
  }

  isNullifierConsumed(nullifier: Bytes32Hex): boolean {
    return this.consumedNullifiers.has(normalizeHex(nullifier, 32, "nullifier"));
  }

  getRoot(): Bytes32Hex {
    return this.tree.getRoot();
  }

  getWitnessProvider(): VantaPrivateCoreWitnessProvider {
    return new VantaPrivateCoreWitnessProvider(this.tree, this.commitments);
  }
}

export function getVantaPrivateCoreTestVector(): {
  note: SerializedNoteV0;
  commitment: Bytes32Hex;
  nullifier: Bytes32Hex;
  merkleRoot: Bytes32Hex;
  witnessLeafIndex: number;
} {
  const owner = createVantaPrivateCoreOwnerKeypair(
    "0x1010101010101010101010101010101010101010101010101010101010101010",
  );
  const note = createVantaPrivateCoreNoteV0({
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    amount: 25_000_000n,
    ownerPublicKey: owner.publicKey,
    noteNonce: "0x1111111111111111111111111111111111111111111111111111111111111111",
    noteSecret: "0x2222222222222222222222222222222222222222222222222222222222222222",
    blinding: "0x3333333333333333333333333333333333333333333333333333333333333333",
    derivationTag: "0x4444444444444444444444444444444444444444444444444444444444444444",
  });
  const ledger = new VantaPrivateCoreLedger();
  const shield = ledger.shield({
    assetId: note.assetId,
    amount: note.amount,
    ownerPublicKey: note.ownerPublicKey,
    noteType: note.noteType,
    noteNonce: note.noteNonce,
    noteSecret: note.noteSecret,
    blinding: note.blinding,
    derivationTag: note.derivationTag,
    senderEphemeralSecretKey: "0x5555555555555555555555555555555555555555555555555555555555555555",
    payloadNonce: "0x666666666666666666666666",
  });
  const hold = ledger.hold({
    encryptedPayload: shield.encryptedPayload,
    ownerSecretKey: owner.secretKey,
  });
  const nullifier = deriveVantaPrivateCoreNullifier(note, hold.witness);

  return {
    note: serializeVantaPrivateCoreNoteV0(note),
    commitment: deriveVantaPrivateCoreNoteCommitment(note).value,
    nullifier: nullifier.value,
    merkleRoot: shield.root,
    witnessLeafIndex: hold.witness.leafIndex,
  };
}

export function runVantaPrivateCoreDemo(): VantaPrivateCoreDemoRunV0 {
  const owner = createVantaPrivateCoreOwnerKeypair();
  const assetId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const ledger = new VantaPrivateCoreLedger();
  const shield = ledger.shield({
    assetId,
    amount: 42_000_000n,
    ownerPublicKey: owner.publicKey,
  });
  const hold = ledger.hold({
    encryptedPayload: shield.encryptedPayload,
    ownerSecretKey: owner.secretKey,
  });
  const unshield = ledger.unshield(hold);

  let replayFailure = "replay unexpectedly succeeded";

  try {
    ledger.unshield(hold);
  } catch (error) {
    replayFailure = getErrorMessage(error);
  }

  return {
    happyPath: {
      shield,
      hold,
      unshield,
    },
    replayFailure,
  };
}

export function assertValidNoteV0(note: unknown): asserts note is NoteV0 {
  if (!isRecord(note)) {
    throw new VantaPrivateCoreError("NoteV0 must be an object.");
  }

  if (note.version !== VANTA_PRIVATE_CORE_NOTE_VERSION_V0) {
    throw new VantaPrivateCoreError(`Unsupported note version: ${String(note.version)}.`);
  }

  normalizeNoteType(note.noteType);
  normalizeHex(note.assetId, 32, "assetId");
  normalizeU128(note.amount, "amount");
  normalizeHex(note.ownerPublicKey, 32, "ownerPublicKey");
  normalizeHex(note.noteNonce, 32, "noteNonce");
  normalizeHex(note.noteSecret, 32, "noteSecret");
  normalizeHex(note.blinding, 32, "blinding");
  normalizeHex(note.derivationTag, 32, "derivationTag");
}

export function assertValidCiphertextPackage(payload: unknown): asserts payload is CiphertextPackageV0 {
  if (!isRecord(payload)) {
    throw new VantaPrivateCoreError("Ciphertext package must be an object.");
  }

  if (payload.kind !== "vanta-private-core-ciphertext-package-v0") {
    throw new VantaPrivateCoreError(`Unsupported ciphertext package kind: ${String(payload.kind)}`);
  }

  if (payload.scheme !== "x25519-hkdf-sha256-chacha20poly1305-v0") {
    throw new VantaPrivateCoreError(`Unsupported ciphertext package scheme: ${String(payload.scheme)}`);
  }

  normalizeHex(payload.recipientPublicKey, 32, "recipientPublicKey");
  normalizeHex(payload.senderEphemeralPublicKey, 32, "senderEphemeralPublicKey");
  normalizeHex(payload.payloadNonce, 12, "payloadNonce");
  decodeBase64(String(payload.ciphertext ?? ""), "ciphertext");
  normalizeHex(payload.payloadCommitment, 32, "payloadCommitment");
}

export function assertValidMerkleProof(proof: unknown): asserts proof is MerkleProofV0 {
  if (!isRecord(proof)) {
    throw new VantaPrivateCoreError("Merkle proof must be an object.");
  }

  if (proof.kind !== "vanta-private-core-merkle-proof-v0") {
    throw new VantaPrivateCoreError(`Unsupported proof kind: ${String(proof.kind)}`);
  }

  if (!Number.isInteger(proof.leafIndex) || Number(proof.leafIndex) < 0) {
    throw new VantaPrivateCoreError("Merkle proof leaf index must be a non-negative integer.");
  }

  normalizeHex(proof.leaf, 32, "leaf");
  normalizeHex(proof.root, 32, "root");

  if (!Array.isArray(proof.path)) {
    throw new VantaPrivateCoreError("Merkle proof path must be an array.");
  }

  for (const step of proof.path) {
    if (!isRecord(step)) {
      throw new VantaPrivateCoreError("Merkle proof step must be an object.");
    }

    if (step.direction !== "left" && step.direction !== "right") {
      throw new VantaPrivateCoreError(`Invalid Merkle proof direction: ${String(step.direction)}`);
    }

    normalizeHex(step.sibling, 32, "sibling");
  }

  if (proof.oddLeafPaddingRule !== VANTA_PRIVATE_CORE_MERKLE_ODD_LEAF_PADDING_RULE_V0) {
    throw new VantaPrivateCoreError(
      `Unsupported odd-leaf padding rule: ${String(proof.oddLeafPaddingRule)}`,
    );
  }
}

function decodePayloadPlaintext(encoded: Uint8Array): NoteV0 {
  const domain = encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.payloadPlaintext);

  if (encoded.length <= domain.length || !equalBytes(encoded.slice(0, domain.length), domain)) {
    throw new VantaPrivateCoreError("Encrypted payload plaintext domain tag mismatch.");
  }

  return decodeNoteV0(encoded.slice(domain.length));
}

function decodeNoteV0(encoded: Uint8Array): NoteV0 {
  const noteDomain = encodeDomain(VANTA_PRIVATE_CORE_DOMAIN_TAGS_V0.noteEncoding);

  if (encoded.length <= noteDomain.length || !equalBytes(encoded.slice(0, noteDomain.length), noteDomain)) {
    throw new VantaPrivateCoreError("Note encoding domain tag mismatch.");
  }

  const reader = new ByteReader(encoded.slice(noteDomain.length));
  const version = reader.readU8("version");
  const noteTypeCode = reader.readU8("noteType");
  const noteType = Object.entries(VANTA_PRIVATE_CORE_NOTE_TYPE_CODES).find((entry) => entry[1] === noteTypeCode)?.[0];

  if (!noteType) {
    throw new VantaPrivateCoreError(`Unsupported note type code: ${String(noteTypeCode)}`);
  }

  const note: NoteV0 = {
    version:
      version === VANTA_PRIVATE_CORE_NOTE_VERSION_V0
        ? VANTA_PRIVATE_CORE_NOTE_VERSION_V0
        : (() => {
            throw new VantaPrivateCoreError(`Unsupported note version: ${String(version)}.`);
          })(),
    noteType: normalizeNoteType(noteType),
    assetId: toHex32(reader.readFixedBytes(32, "assetId")),
    amount: reader.readU128("amount"),
    ownerPublicKey: toHex32(reader.readFixedBytes(32, "ownerPublicKey")),
    noteNonce: toHex32(reader.readFixedBytes(32, "noteNonce")),
    noteSecret: toHex32(reader.readFixedBytes(32, "noteSecret")),
    blinding: toHex32(reader.readFixedBytes(32, "blinding")),
    derivationTag: toHex32(reader.readFixedBytes(32, "derivationTag")),
  };

  reader.assertFullyConsumed("note");
  assertValidNoteV0(note);
  return note;
}

function normalizeNoteType(value: unknown): NoteType {
  if (value !== VANTA_PRIVATE_CORE_NOTE_TYPE_VALUE) {
    throw new VantaPrivateCoreError(`Unsupported note type: ${String(value)}`);
  }

  return value;
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
    throw new VantaPrivateCoreError(`${fieldName} must be an unsigned integer.`);
  }

  if (normalized < 0n || normalized > ((1n << 128n) - 1n)) {
    throw new VantaPrivateCoreError(`${fieldName} must fit in u128.`);
  }

  return normalized;
}

function normalizeHex(value: unknown, bytes: number, fieldName: string): `0x${string}` {
  if (typeof value !== "string" || !new RegExp(`^(0x)?[0-9a-fA-F]{${bytes * 2}}$`).test(value)) {
    throw new VantaPrivateCoreError(`${fieldName} must be exactly ${bytes} bytes of hex.`);
  }

  return (`0x${value.replace(/^0x/, "").toLowerCase()}`) as `0x${string}`;
}

function encodeDomain(domain: string): Uint8Array {
  return concatBytes(encodeU32(domain.length), new TextEncoder().encode(domain));
}

function encodeU8(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new VantaPrivateCoreError(`Value ${String(value)} cannot be encoded as u8.`);
  }

  return Uint8Array.of(value);
}

function encodeU32(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new VantaPrivateCoreError(`Value ${String(value)} cannot be encoded as u32.`);
  }

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

function sha256Hex(bytes: Uint8Array): Bytes32Hex {
  return toHex32(sha256(bytes));
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

function hexToBytes(value: `0x${string}`): Uint8Array {
  const normalized = value.replace(/^0x/, "");
  const bytes = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function toHex32(value: Uint8Array): Bytes32Hex {
  if (value.length !== 32) {
    throw new VantaPrivateCoreError(`Expected 32 bytes, received ${value.length}.`);
  }

  return (`0x${encodeHex(value)}`) as Bytes32Hex;
}

function toHex12(value: Uint8Array): Bytes12Hex {
  if (value.length !== 12) {
    throw new VantaPrivateCoreError(`Expected 12 bytes, received ${value.length}.`);
  }

  return (`0x${encodeHex(value)}`) as Bytes12Hex;
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): `0x${string}` {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return `0x${encodeHex(buffer)}`;
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decodeBase64(value: string, fieldName: string): Uint8Array {
  try {
    const decoded = atob(value);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch (error) {
    throw new VantaPrivateCoreError(`${fieldName} is not valid base64: ${getErrorMessage(error)}`);
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readU8(fieldName: string): number {
    const value = this.bytes[this.offset];

    if (value === undefined) {
      throw new VantaPrivateCoreError(`Missing byte for ${fieldName}.`);
    }

    this.offset += 1;
    return value;
  }

  readU128(fieldName: string): bigint {
    const bytes = this.readFixedBytes(16, fieldName);
    let value = 0n;

    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }

    return value;
  }

  readFixedBytes(length: number, fieldName: string): Uint8Array {
    const end = this.offset + length;

    if (end > this.bytes.length) {
      throw new VantaPrivateCoreError(`Insufficient bytes to read ${fieldName}.`);
    }

    const value = this.bytes.slice(this.offset, end);
    this.offset = end;
    return value;
  }

  assertFullyConsumed(fieldName: string) {
    if (this.offset !== this.bytes.length) {
      throw new VantaPrivateCoreError(
        `${fieldName} left ${this.bytes.length - this.offset} unread trailing bytes.`,
      );
    }
  }
}
