import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const sourcePath = resolve(repoRoot, "src/zk/crypto/ownerRecoveryPayloadCrypto.ts");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertRejects(promise, expectedMessage) {
  return promise.then(
    () => {
      throw new Error(`Expected rejection: ${expectedMessage}`);
    },
    (error) => {
      const message = error instanceof Error ? error.message : String(error);
      assert(
        message.includes(expectedMessage),
        `Expected rejection containing "${expectedMessage}", got "${message}"`,
      );
    },
  );
}

async function loadOwnerRecoveryCryptoModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/owner-recovery-payload-crypto-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(join(tempTsDir, "src/zk/crypto"), { recursive: true });
    mkdirSync(join(tempTsDir, "src/zk"), { recursive: true });
    writeFileSync(
      join(tempTsDir, "src/zk/crypto/ownerRecoveryPayloadCrypto.ts"),
      readFileSync(sourcePath, "utf8"),
    );
    writeFileSync(
      join(tempTsDir, "src/zk/canonicalNote.ts"),
      [
        "export type CanonicalBytes32 = string;",
        "export type CanonicalNoteOwnerContext = {",
        "  ownerPublicKey: string;",
        "  recoverySecret: string;",
        "  derivationContext?: string;",
        "};",
        "export type CanonicalEncryptedPayload = {",
        "  scheme: string;",
        "  encoding: string;",
        "  payloadVersion: number;",
        "  recipientPublicKey: string;",
        "  payloadNonce: CanonicalBytes32;",
        "  ciphertext: string;",
        "  authTag: string;",
        "};",
      ].join("\n"),
    );

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "src/zk/crypto/ownerRecoveryPayloadCrypto.ts"),
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--lib",
        "ES2022,DOM",
        "--skipLibCheck",
        "--rootDir",
        tempTsDir,
        "--outDir",
        tempJsDir,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return await import(
      pathToFileURL(join(tempJsDir, "src/zk/crypto/ownerRecoveryPayloadCrypto.js")).href
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const source = readFileSync(sourcePath, "utf8");
assert(!source.includes("xorWithDerivedKeystream"), "owner recovery payload crypto must not use XOR keystream encryption");
assert(!source.includes("owner-recovery-xor-stream-sha256-v1"), "owner recovery payload scheme must not advertise the removed XOR/SHA-256 construction");
assert(!source.includes('crypto.subtle.digest("SHA-256"'), "owner recovery payload crypto must not hand-roll SHA-256 stream/auth crypto");
assert(source.includes("xchacha20poly1305"), "owner recovery payload crypto must use XChaCha20-Poly1305 AEAD");
assert(source.includes("x25519"), "owner recovery payload crypto must use X25519 key agreement");
assert(source.includes("hkdf"), "owner recovery payload crypto must use HKDF-SHA256 key derivation");
assert(source.includes("crypto.getRandomValues"), "owner recovery payload crypto must generate nonces internally");

const { phase1OwnerRecoveryPayloadCryptoAdapter } = await loadOwnerRecoveryCryptoModule();

const ownerContext = {
  ownerPublicKey: "owner-recovery-key-example",
  recoverySecret: "0x1111111111111111111111111111111111111111111111111111111111111111",
  derivationContext: "owner-recovery-check",
};
const plaintext = new TextEncoder().encode("canonical note payload fixture");
const callerNonce = "0x5555555555555555555555555555555555555555555555555555555555555555";

const first = await phase1OwnerRecoveryPayloadCryptoAdapter.encrypt({
  ownerContext,
  recipientPublicKey: ownerContext.ownerPublicKey,
  payloadNonce: callerNonce,
  plaintext,
});
const second = await phase1OwnerRecoveryPayloadCryptoAdapter.encrypt({
  ownerContext,
  recipientPublicKey: ownerContext.ownerPublicKey,
  payloadNonce: callerNonce,
  plaintext,
});

assert(first.payloadNonce !== callerNonce, "encryption must replace caller nonce with a generated AEAD nonce");
assert(second.payloadNonce !== callerNonce, "encryption must not reuse caller nonce");
assert(first.payloadNonce !== second.payloadNonce, "encrypting twice must generate different nonces");
assert(first.ciphertext !== second.ciphertext, "encrypting twice must generate different ciphertexts");
assert(first.authTag !== second.authTag, "encrypting twice must generate different ephemeral public keys");
assert(/^0x[0-9a-f]{64}$/.test(first.authTag), "ephemeral public key must be encoded in the authTag envelope slot");
assert(/^0x[0-9a-f]{48}0{16}$/.test(first.payloadNonce), "payloadNonce must carry a generated 24-byte XChaCha nonce with reserved zero padding");

const recovered = await phase1OwnerRecoveryPayloadCryptoAdapter.decrypt({
  ownerContext,
  payload: first,
});
assert(
  new TextDecoder().decode(recovered) === new TextDecoder().decode(plaintext),
  "owner recovery payload roundtrip failed",
);

await assertRejects(
  phase1OwnerRecoveryPayloadCryptoAdapter.decrypt({
    ownerContext: { ...ownerContext, recoverySecret: "0x2222222222222222222222222222222222222222222222222222222222222222" },
    payload: first,
  }),
  "authentication",
);

const ciphertextBytes = Uint8Array.from(atob(first.ciphertext), (char) => char.charCodeAt(0));
ciphertextBytes[0] ^= 1;
const tamperedCiphertext = btoa(String.fromCharCode(...ciphertextBytes));

await assertRejects(
  phase1OwnerRecoveryPayloadCryptoAdapter.decrypt({
    ownerContext,
    payload: { ...first, ciphertext: tamperedCiphertext },
  }),
  "authentication",
);

console.log("owner recovery payload crypto: PASS");
