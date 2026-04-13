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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-chain-check-"));
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
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);
const thirdParty = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x3333333333333333333333333333333333333333333333333333333333333333",
);

const ledger = new privateCore.VantaPrivateCoreLedger();
const shield = ledger.shield({
  amount: 25_000_000n,
  assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ownerPublicKey: sender.publicKey,
});
const heldSender = ledger.hold({
  encryptedPayload: shield.encryptedPayload,
  ownerSecretKey: sender.secretKey,
});

const firstTransition = privateCore.buildVantaPrivateCoreSendTransition({
  input: heldSender,
  recipientOwnerPublicKey: recipient.publicKey,
  sendAmount: 10_000_000n,
});
const firstResult = ledger.send(firstTransition);

const heldRecipient = ledger.hold({
  encryptedPayload: firstResult.recipient.encryptedPayload,
  ownerSecretKey: recipient.secretKey,
});

if (heldRecipient.note.amount !== 10_000_000n) {
  throw new Error("first recipient-held note amount mismatch");
}
if (heldRecipient.witness.root !== firstResult.resultingRoot) {
  throw new Error("first recipient-held note witness root mismatch");
}

printStatus("private-core send chain first recipient hold: PASS");

const secondTransition = privateCore.buildVantaPrivateCoreSendTransition({
  input: heldRecipient,
  recipientOwnerPublicKey: thirdParty.publicKey,
  sendAmount: 4_000_000n,
});
const secondResult = ledger.send(secondTransition);

if (!ledger.isNullifierConsumed(firstResult.inputNullifier.value)) {
  throw new Error("first send nullifier not marked consumed");
}
if (!ledger.isNullifierConsumed(secondResult.inputNullifier.value)) {
  throw new Error("second send nullifier not marked consumed");
}

printStatus("private-core send chain successive nullifiers: PASS");

const heldThirdParty = ledger.hold({
  encryptedPayload: secondResult.recipient.encryptedPayload,
  ownerSecretKey: thirdParty.secretKey,
});
const heldRecipientChange = ledger.hold({
  encryptedPayload: secondResult.change?.encryptedPayload ?? (() => {
    throw new Error("expected recipient change note in chained send");
  })(),
  ownerSecretKey: recipient.secretKey,
});

if (
  heldThirdParty.note.amount !== 4_000_000n ||
  heldThirdParty.witness.root !== secondResult.resultingRoot
) {
  throw new Error("third-party note recovery mismatch after chained send");
}
if (
  heldRecipientChange.note.amount !== 6_000_000n ||
  heldRecipientChange.witness.root !== secondResult.resultingRoot
) {
  throw new Error("recipient change note recovery mismatch after chained send");
}

printStatus("private-core send chain output recovery: PASS");

try {
  ledger.hold({
    encryptedPayload: secondResult.recipient.encryptedPayload,
    ownerSecretKey: sender.secretKey,
  });
  throw new Error("sender unexpectedly decrypted chained recipient payload");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("Recipient secret key does not match")) {
    throw error;
  }
}

printStatus("private-core send chain privacy gate: PASS");
