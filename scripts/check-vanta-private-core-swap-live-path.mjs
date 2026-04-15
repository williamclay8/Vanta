import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function printStatus(message) {
  console.log(message);
}

async function loadSwapModule() {
  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-live-path-check-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(
      join(tempTsDir, "vantaPrivateCore.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCore.ts"), "utf8"),
    );
    writeFileSync(
      join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
      readFileSync(resolve(repoRoot, "src/zk/vantaPrivateCoreSwapProof.ts"), "utf8").replaceAll(
        '@/zk/vantaPrivateCore',
        "./vantaPrivateCore.js",
      ),
    );

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSwapProof.ts"),
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

    const privateCore = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCore.js")).href);
    const swapProof = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSwapProof.js")).href);
    return { privateCore, swapProof };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const { privateCore, swapProof } = await loadSwapModule();
const sender = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x3030303030303030303030303030303030303030303030303030303030303030",
);
const recipient = privateCore.createVantaPrivateCoreOwnerKeypair(
  "0x6060606060606060606060606060606060606060606060606060606060606060",
);
const ledger = new privateCore.VantaPrivateCoreLedger();
const inputAssetId =
  "0x7675736400000000000000000000000000000000000000000000000000000000";
const outputAssetId =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const senders = [
  privateCore.createVantaPrivateCoreOwnerKeypair(
    "0x1010101010101010101010101010101010101010101010101010101010101010",
  ),
  privateCore.createVantaPrivateCoreOwnerKeypair(
    "0x2020202020202020202020202020202020202020202020202020202020202020",
  ),
  sender,
  privateCore.createVantaPrivateCoreOwnerKeypair(
    "0x4040404040404040404040404040404040404040404040404040404040404040",
  ),
  privateCore.createVantaPrivateCoreOwnerKeypair(
    "0x5050505050505050505050505050505050505050505050505050505050505050",
  ),
];

const shields = senders.map((owner, index) =>
  ledger.shield({
    assetId: inputAssetId,
    amount: BigInt((index + 1) * 11_000_000),
    ownerPublicKey: owner.publicKey,
    noteNonce: `0x${String(index + 1).padStart(2, "0").repeat(32)}`,
    noteSecret: `0x${String(index + 11).padStart(2, "0").repeat(32)}`,
    blinding: `0x${String(index + 21).padStart(2, "0").repeat(32)}`,
    derivationTag: `0x${String(index + 31).padStart(2, "0").repeat(32)}`,
    senderEphemeralSecretKey: `0x${String(index + 41).padStart(2, "0").repeat(32)}`,
    payloadNonce: `0x${String(index + 51).padStart(2, "0").repeat(12)}`,
  }),
);
const heldNote = ledger.hold({
  encryptedPayload: shields[2].encryptedPayload,
  ownerSecretKey: sender.secretKey,
});

const ready = swapProof.prepareVantaPrivateCoreLiveSwapCandidate({
  heldNote,
  senderSecretKey: sender.secretKey,
  recipientOwnerPublicKey: recipient.publicKey,
  outputAssetId,
  quoteInputAmount: "33.000000",
  quoteOutputAmount: "1.250000000",
  quoteExpiresAt: Date.now() + 60_000,
});

if (ready.status !== "ready" || !ready.transition || !ready.proofBoundary) {
  throw new Error("expected live swap candidate to be ready");
}
if (ready.proofBoundary.readiness !== "ready") {
  throw new Error(`expected ready proof boundary, received ${ready.proofBoundary.readiness}`);
}
printStatus("private-core swap live path ready candidate: PASS");

const staleQuote = swapProof.prepareVantaPrivateCoreLiveSwapCandidate({
  heldNote,
  senderSecretKey: sender.secretKey,
  recipientOwnerPublicKey: recipient.publicKey,
  outputAssetId,
  quoteInputAmount: "33.000000",
  quoteOutputAmount: "1.250000000",
  quoteExpiresAt: Date.now() - 1,
});

if (staleQuote.status !== "fallback" || !staleQuote.note.includes("expired")) {
  throw new Error("expected stale quote to force fallback");
}
printStatus("private-core swap live path stale-quote fallback: PASS");

const mismatchedAmount = swapProof.prepareVantaPrivateCoreLiveSwapCandidate({
  heldNote,
  senderSecretKey: sender.secretKey,
  recipientOwnerPublicKey: recipient.publicKey,
  outputAssetId,
  quoteInputAmount: "32.000000",
  quoteOutputAmount: "1.250000000",
  quoteExpiresAt: Date.now() + 60_000,
});

if (mismatchedAmount.status !== "fallback" || !mismatchedAmount.note.includes("does not match")) {
  throw new Error("expected mismatched input amount to force fallback");
}
printStatus("private-core swap live path amount-mismatch fallback: PASS");

const wrongAsset = swapProof.prepareVantaPrivateCoreLiveSwapCandidate({
  heldNote: {
    ...heldNote,
    note: {
      ...heldNote.note,
      assetId:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  },
  senderSecretKey: sender.secretKey,
  recipientOwnerPublicKey: recipient.publicKey,
  outputAssetId,
  quoteInputAmount: "33.000000",
  quoteOutputAmount: "1.250000000",
  quoteExpiresAt: Date.now() + 60_000,
});

if (wrongAsset.status !== "fallback" || !wrongAsset.note.includes("not a VUSD")) {
  throw new Error("expected wrong input asset to force fallback");
}
printStatus("private-core swap live path asset-mismatch fallback: PASS");
