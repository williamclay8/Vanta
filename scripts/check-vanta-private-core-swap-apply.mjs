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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-apply-check-"));
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

{
  const ledger = new privateCore.VantaPrivateCoreLedger();
  const shield = ledger.shield({
    amount: 33_000_000n,
    assetId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    blinding: "0x4040404040404040404040404040404040404040404040404040404040404040",
    derivationTag: "0x5050505050505050505050505050505050505050505050505050505050505050",
    noteNonce: "0x2020202020202020202020202020202020202020202020202020202020202020",
    noteSecret: "0x3030303030303030303030303030303030303030303030303030303030303030",
    ownerPublicKey: sender.publicKey,
    payloadNonce: "0x111111111111111111111111",
    senderEphemeralSecretKey:
      "0x6060606060606060606060606060606060606060606060606060606060606060",
  });
  const held = ledger.hold({
    encryptedPayload: shield.encryptedPayload,
    ownerSecretKey: sender.secretKey,
  });
  const transition = privateCore.buildVantaPrivateCoreSwapTransition({
    input: held,
    outputAmount: 1_650_000n,
    outputAssetId: "0x7573646300000000000000000000000000000000000000000000000000000000",
    outputBlinding: "0x7070707070707070707070707070707070707070707070707070707070707070",
    outputDerivationTag:
      "0x8080808080808080808080808080808080808080808080808080808080808080",
    outputNoteNonce: "0x9090909090909090909090909090909090909090909090909090909090909090",
    outputNoteSecret: "0xa0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0",
    outputSenderEphemeralSecretKey:
      "0xb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0",
    recipientOwnerPublicKey: recipient.publicKey,
  });
  const result = ledger.swap(transition);
  const recoveredOutput = ledger.hold({
    encryptedPayload: result.output.encryptedPayload,
    ownerSecretKey: recipient.secretKey,
  });

  if (result.inputNullifier.value !== transition.nullifier.value) {
    throw new Error("swap nullifier did not match transition nullifier");
  }
  if (!ledger.isNullifierConsumed(result.inputNullifier.value)) {
    throw new Error("swap nullifier was not marked consumed");
  }
  if (result.output.note.assetId !== transition.output.note.assetId) {
    throw new Error("swap output asset id mismatch");
  }
  if (result.output.note.amount !== 1_650_000n) {
    throw new Error("swap output amount mismatch");
  }
  if (recoveredOutput.note.assetId !== transition.output.note.assetId) {
    throw new Error("swap output note could not be recovered by recipient");
  }
  if (recoveredOutput.note.amount !== 1_650_000n) {
    throw new Error("swap recovered output amount mismatch");
  }
  if (recoveredOutput.witness.root !== result.resultingRoot || ledger.getRoot() !== result.resultingRoot) {
    throw new Error("swap resulting root mismatch");
  }

  let senderPrivacyGateHeld = false;
  try {
    ledger.hold({
      encryptedPayload: result.output.encryptedPayload,
      ownerSecretKey: sender.secretKey,
    });
  } catch {
    senderPrivacyGateHeld = true;
  }

  if (!senderPrivacyGateHeld) {
    throw new Error("swap sender unexpectedly recovered recipient output payload");
  }

  printStatus("private-core swap apply recipient-output path: PASS");
}
