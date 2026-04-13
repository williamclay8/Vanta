import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

async function loadPrivateCoreModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-recipient-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(
      join(tempTsDir, "vantaPrivateCore.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
    );

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--lib",
        "ES2022,DOM",
        "--skipLibCheck",
        "--outDir",
        tempJsDir,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    return await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const privateCore = await loadPrivateCoreModule();

const sender = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x3333333333333333333333333333333333333333333333333333333333333333",
);
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x4444444444444444444444444444444444444444444444444444444444444444",
);

const ledger = new privateCore.VantaPrivateCoreLedger();
const shield = ledger.shield({
  amount: 25_000_000n,
  assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ownerPublicKey: sender.publicKey,
});
const heldInput = ledger.hold({
  encryptedPayload: shield.encryptedPayload,
  ownerSecretKey: sender.secretKey,
});
const transition = privateCore.buildVantaPrivateCoreSendTransition({
  input: heldInput,
  recipientOwnerPublicKey: recipient.publicKey,
  sendAmount: 7_000_000n,
});
const sendResult = ledger.send(transition);

const heldRecipient = ledger.hold({
  encryptedPayload: sendResult.recipient.encryptedPayload,
  ownerSecretKey: recipient.secretKey,
});

if (heldRecipient.note.amount !== 7_000_000n) {
  throw new Error("recipient-held note amount mismatch");
}
if (heldRecipient.note.ownerPublicKey !== recipient.publicKey) {
  throw new Error("recipient-held note owner mismatch");
}
if (heldRecipient.witness.root !== sendResult.resultingRoot) {
  throw new Error("recipient-held note witness root mismatch");
}
if (heldRecipient.witness.leafIndex !== sendResult.recipient.insertionIndex) {
  throw new Error("recipient-held note witness leaf index mismatch");
}

printStatus("private-core send recipient hold: PASS");

const recipientUnshield = ledger.unshield(heldRecipient);

if (recipientUnshield.releasedAmount !== 7_000_000n) {
  throw new Error("recipient unshield released amount mismatch");
}
if (recipientUnshield.root !== sendResult.resultingRoot) {
  throw new Error("recipient unshield root mismatch");
}
if (!ledger.isNullifierConsumed(recipientUnshield.nullifier.value)) {
  throw new Error("recipient nullifier was not marked consumed");
}

printStatus("private-core send recipient unshield: PASS");

try {
  ledger.hold({
    encryptedPayload: sendResult.recipient.encryptedPayload,
    ownerSecretKey: sender.secretKey,
  });
  throw new Error("sender unexpectedly decrypted recipient payload");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("Recipient secret key does not match")) {
    throw error;
  }
}

printStatus("private-core send recipient privacy gate: PASS");
