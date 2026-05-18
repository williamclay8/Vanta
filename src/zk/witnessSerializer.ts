// Efficient witness serialization to reduce memory and time during proof generation

export function serializeWitness(witness: (bigint | string)[]): Uint8Array {
  const buffer = new Uint8Array(witness.length * 32);
  let offset = 0;

  for (const value of witness) {
    const hex = BigInt(value).toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      buffer[offset + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    offset += 32;
  }

  return buffer;
}

export function deserializeWitness(buffer: Uint8Array): bigint[] {
  const witness: bigint[] = [];
  for (let i = 0; i < buffer.length; i += 32) {
    let hex = '';
    for (let j = 0; j < 32; j++) {
      hex += buffer[i + j].toString(16).padStart(2, '0');
    }
    witness.push(BigInt('0x' + hex));
  }
  return witness;
}