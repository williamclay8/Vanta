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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-apply-check-"));
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

const owner = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x1010101010101010101010101010101010101010101010101010101010101010",
);
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x2020202020202020202020202020202020202020202020202020202020202020",
);

{
  const ledger = new privateCore.VantaPrivateCoreLedger();
  const shield = ledger.shield({
    amount: 33_000_000n,
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    blinding: "0x4040404040404040404040404040404040404040404040404040404040404040",
    derivationTag: "0x5050505050505050505050505050505050505050505050505050505050505050",
    noteNonce: "0x2020202020202020202020202020202020202020202020202020202020202020",
    noteSecret: "0x3030303030303030303030303030303030303030303030303030303030303030",
    ownerPublicKey: owner.publicKey,
    payloadNonce: "0x111111111111111111111111",
    senderEphemeralSecretKey:
      "0x6060606060606060606060606060606060606060606060606060606060606060",
  });
  const held = ledger.hold({
    encryptedPayload: shield.encryptedPayload,
    ownerSecretKey: owner.secretKey,
  });
  const transition = privateCore.buildVantaPrivateCoreSendTransition({
    changeBlinding: "0x8080808080808080808080808080808080808080808080808080808080808080",
    changeDerivationTag:
      "0x9090909090909090909090909090909090909090909090909090909090909090",
    changeNoteNonce: "0x7070707070707070707070707070707070707070707070707070707070707070",
    changeNoteSecret: "0xa0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0",
    changeSenderEphemeralSecretKey:
      "0xb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0",
    input: held,
    recipientBlinding:
      "0xc0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0",
    recipientDerivationTag:
      "0xd0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0",
    recipientNoteNonce:
      "0xe0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0",
    recipientNoteSecret:
      "0xf0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0",
    recipientOwnerPublicKey: recipient.publicKey,
    recipientSenderEphemeralSecretKey:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    sendAmount: 13_000_000n,
  });
  const result = ledger.send(transition);
  const heldChange = ledger.hold({
    encryptedPayload: result.change?.encryptedPayload ?? (() => {
      throw new Error("Expected change output after partial send.");
    })(),
    ownerSecretKey: owner.secretKey,
  });

  if (result.inputNullifier.value !== transition.nullifier.value) {
    throw new Error("partial send nullifier did not match transition nullifier");
  }
  if (!ledger.isNullifierConsumed(result.inputNullifier.value)) {
    throw new Error("partial send nullifier was not marked consumed");
  }
  if (result.recipient.note.amount !== 13_000_000n) {
    throw new Error("partial send recipient amount mismatch");
  }
  if (!result.change || result.change.note.amount !== 20_000_000n) {
    throw new Error("partial send change amount mismatch");
  }
  if (heldChange.note.amount !== 20_000_000n) {
    throw new Error("partial send change note could not be recovered");
  }
  if (heldChange.witness.root !== result.resultingRoot || ledger.getRoot() !== result.resultingRoot) {
    throw new Error("partial send resulting root mismatch");
  }

  printStatus("private-core send apply partial-spend path: PASS");
}

{
  const ledger = new privateCore.VantaPrivateCoreLedger();
  const shield = ledger.shield({
    amount: 9_000_000n,
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ownerPublicKey: owner.publicKey,
  });
  const held = ledger.hold({
    encryptedPayload: shield.encryptedPayload,
    ownerSecretKey: owner.secretKey,
  });
  const transition = privateCore.buildVantaPrivateCoreSendTransition({
    input: held,
    recipientOwnerPublicKey: recipient.publicKey,
    sendAmount: 9_000_000n,
  });
  const result = ledger.send(transition);

  if (result.change !== null) {
    throw new Error("full send unexpectedly created a change output");
  }
  if (!ledger.isNullifierConsumed(result.inputNullifier.value)) {
    throw new Error("full send nullifier was not marked consumed");
  }
  if (result.recipient.note.amount !== 9_000_000n) {
    throw new Error("full send recipient amount mismatch");
  }
  if (ledger.getRoot() !== result.resultingRoot) {
    throw new Error("full send resulting root mismatch");
  }

  printStatus("private-core send apply full-spend path: PASS");
}
