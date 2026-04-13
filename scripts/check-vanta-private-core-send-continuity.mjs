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
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-send-continuity-check-"));
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
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);

const ledger = new privateCore.VantaPrivateCoreLedger();
const shield = ledger.shield({
  amount: 33_000_000n,
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
  sendAmount: 13_000_000n,
});
const sendResult = ledger.send(transition);

if (!sendResult.change) {
  throw new Error("continuity check expected a residual change note");
}

const heldChange = ledger.hold({
  encryptedPayload: sendResult.change.encryptedPayload,
  ownerSecretKey: owner.secretKey,
});

if (heldChange.note.amount !== 20_000_000n) {
  throw new Error("residual change note amount mismatch");
}
if (heldChange.witness.root !== sendResult.resultingRoot) {
  throw new Error("change witness root did not match send resulting root");
}
if (heldChange.witness.leafIndex !== sendResult.change.insertionIndex) {
  throw new Error("change witness leaf index did not match change insertion index");
}

printStatus("private-core send continuity change hold: PASS");

const unshieldResult = ledger.unshield(heldChange);

if (unshieldResult.releasedAmount !== 20_000_000n) {
  throw new Error("change-note unshield released amount mismatch");
}
if (unshieldResult.root !== sendResult.resultingRoot) {
  throw new Error("change-note unshield root did not match send resulting root");
}
if (!ledger.isNullifierConsumed(unshieldResult.nullifier.value)) {
  throw new Error("change-note nullifier was not marked consumed");
}

printStatus("private-core send continuity unshield: PASS");

try {
  ledger.unshield(heldChange);
  throw new Error("change-note replay unexpectedly succeeded");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("already been consumed")) {
    throw error;
  }
}

printStatus("private-core send continuity replay rejection: PASS");
