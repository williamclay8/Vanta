import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-shield-memo-encryption-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
// vantaShieldState.ts imports from "@/solana/shieldConfig" but the only
// surface used by the encryption helpers is the type aliases and
// constants for token asset keys. We stub it here so the script can run
// under plain Node without needing Vite's import.meta.env.
const sourceFiles = [
  "solana/vantaShieldViewingKey.ts",
  "solana/vantaShieldState.ts",
];

const SHIELD_CONFIG_STUB = `export type LiveShieldTokenAssetKey = "USDC" | "USDC" | "JTO" | "BONK" | "JUP" | "PYUSD" | "WIF" | "KMNO";
export const ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS: readonly LiveShieldTokenAssetKey[] = ["USDC", "USDC", "JTO", "BONK", "JUP", "PYUSD", "WIF", "KMNO"];
export function getLiveShieldTokenAsset(assetKey: LiveShieldTokenAssetKey) {
  return {
    assetKey,
    decimals: 6,
    label: assetKey,
    mintAddress: "stub-mint-" + assetKey,
    name: assetKey,
  };
}
`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  const source = readFileSync(resolve(repoRoot, "src", relativePath), "utf8")
    .replace(
      /from "@\/solana\/shieldConfig"/g,
      'from "./shieldConfig"',
    )
    .replace(
      /from "@\/solana\/vantaShieldViewingKey"/g,
      'from "./vantaShieldViewingKey"',
    );
  writeFileSync(
    join(tempTsDir, relativePath),
    source,
  );
}

function writeStubShieldConfig() {
  mkdirSync(join(tempTsDir, "solana"), { recursive: true });
  writeFileSync(join(tempTsDir, "solana/shieldConfig.ts"), SHIELD_CONFIG_STUB);
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "@\/([^"]+?)(?:\.js)?"/g, (_match, target) => {
      const absoluteTarget = join(tempJsDir, `${target}.js`);
      const fromDir = join(tempJsDir, relativePath, "..");
      const relPath = relative(fromDir, absoluteTarget);
      const rel = relPath.startsWith(".") ? relPath : `./${relPath}`;
      return `from "${rel}"`;
    })
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"');
  writeFileSync(filePath, source);
}

const VANTA_SHIELD_MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const VANTA_SHIELD_MEMO_PREFIX_V2 = "vanta:shield-note:v2:";
const VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2 = "vanta:native-sol-shield-note:v2:";

function decodeMemoText(instruction) {
  assert(
    instruction && instruction.programAddress === VANTA_SHIELD_MEMO_PROGRAM,
    "Expected encrypted memo to target the SPL memo program.",
  );
  return new TextDecoder().decode(instruction.data);
}

function isBase64Url(value) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function assertNoLeak(memoText, leakTerms) {
  for (const term of leakTerms) {
    assert(!memoText.includes(term), `Encrypted memo leaked raw term: ${term}`);
  }
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }
  writeStubShieldConfig();

  const allFiles = [...sourceFiles, "solana/shieldConfig.ts"];

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...allFiles.map((file) => join(tempTsDir, file)),
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

  for (const file of allFiles) {
    patchRelativeImports(file);
  }

  const shieldStateModule = await import(
    pathToFileURL(join(tempJsDir, "solana/vantaShieldState.js")).href
  );
  const viewingKeyModule = await import(
    pathToFileURL(join(tempJsDir, "solana/vantaShieldViewingKey.js")).href
  );
  const {
    createShieldMemoInstruction,
    createNativeSolShieldMemoInstruction,
    tryDecryptShieldMemo,
    tryDecryptNativeSolShieldMemo,
  } = shieldStateModule;
  const {
    createVantaShieldViewingKeypair,
    decryptVantaShieldMemoWithViewingKey,
    encryptVantaShieldMemoToViewingKey,
    exportVantaShieldViewingKeypair,
    importVantaShieldViewingKeypair,
  } = viewingKeyModule;

  // ---- SPL token shield path -------------------------------------------------
  const ownerPubkey = "OWNER_PUBLIC_KEY_PLACEHOLDER_BASE58";
  const wrongOwner = "DIFFERENT_OWNER_PUBKEY_PLACEHOLDER_BASE58";
  const shieldPayload = {
    amount: "12.50",
    asset: "USDC",
    createdAt: 1_700_000_000_000,
    depositSignature: "deposit-sig-placeholder",
    mintAddress: "MintAddressPlaceholder1111111111111111111111",
    owner: ownerPubkey,
    vaultOwner: "VaultOwnerPlaceholder111111111111111111111",
  };
  const shieldInstruction = createShieldMemoInstruction(shieldPayload);
  const shieldMemoText = decodeMemoText(shieldInstruction);

  assert(
    shieldMemoText.startsWith(VANTA_SHIELD_MEMO_PREFIX_V2),
    `Expected shield memo to use v2 prefix, got: ${shieldMemoText.slice(0, 40)}`,
  );
  const shieldBody = shieldMemoText.slice(VANTA_SHIELD_MEMO_PREFIX_V2.length);
  assert(
    isBase64Url(shieldBody),
    "Shield memo body must be base64url-encoded (no JSON, no padding chars).",
  );
  assertNoLeak(shieldMemoText, [
    shieldPayload.amount,
    shieldPayload.asset,
    shieldPayload.depositSignature,
    shieldPayload.mintAddress,
    shieldPayload.owner,
    shieldPayload.vaultOwner,
  ]);

  const decryptedShield = tryDecryptShieldMemo(shieldMemoText, ownerPubkey);
  assert(decryptedShield !== null, "Shield memo decryption with correct owner returned null.");
  assert(decryptedShield.kind === "shield", "Decrypted shield payload kind mismatch.");
  assert(decryptedShield.amount === shieldPayload.amount, "Decrypted shield amount mismatch.");
  assert(decryptedShield.asset === shieldPayload.asset, "Decrypted shield asset mismatch.");
  assert(
    decryptedShield.depositSignature === shieldPayload.depositSignature,
    "Decrypted shield depositSignature mismatch.",
  );
  assert(decryptedShield.owner === shieldPayload.owner, "Decrypted shield owner mismatch.");
  assert(
    decryptedShield.vaultOwner === shieldPayload.vaultOwner,
    "Decrypted shield vaultOwner mismatch.",
  );
  assert(typeof decryptedShield.noteId === "string" && decryptedShield.noteId.length > 0,
    "Decrypted shield payload must include a noteId string.");

  const wrongOwnerShield = tryDecryptShieldMemo(shieldMemoText, wrongOwner);
  assert(wrongOwnerShield === null, "Shield memo decryption with wrong owner must return null.");

  const noPrefixShield = tryDecryptShieldMemo("not-a-shield-memo", ownerPubkey);
  assert(noPrefixShield === null, "Shield memo decryption without v2 prefix must return null.");

  // ---- Native SOL shield path ----------------------------------------------
  const nativeSolPayload = {
    amount: "1.250000000",
    assetId: "So11111111111111111111111111111111111111112",
    createdAt: 1_700_000_500_000,
    depositSignature: "native-sol-deposit-sig-placeholder",
    owner: ownerPubkey,
    vaultOwner: "VaultOwnerPlaceholder111111111111111111111",
  };
  const nativeSolInstruction = createNativeSolShieldMemoInstruction(nativeSolPayload);
  const nativeSolMemoText = decodeMemoText(nativeSolInstruction);

  assert(
    nativeSolMemoText.startsWith(VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2),
    `Expected native SOL shield memo to use v2 prefix, got: ${nativeSolMemoText.slice(0, 40)}`,
  );
  const nativeSolBody = nativeSolMemoText.slice(VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX_V2.length);
  assert(
    isBase64Url(nativeSolBody),
    "Native SOL shield memo body must be base64url-encoded.",
  );
  assertNoLeak(nativeSolMemoText, [
    nativeSolPayload.amount,
    nativeSolPayload.assetId,
    nativeSolPayload.depositSignature,
    nativeSolPayload.owner,
    nativeSolPayload.vaultOwner,
  ]);

  const decryptedNativeSol = tryDecryptNativeSolShieldMemo(nativeSolMemoText, ownerPubkey);
  assert(decryptedNativeSol !== null, "Native SOL memo decryption with correct owner returned null.");
  assert(
    decryptedNativeSol.kind === "native_sol_shield",
    "Decrypted native SOL payload kind mismatch.",
  );
  assert(decryptedNativeSol.asset === "SOL", "Decrypted native SOL asset must be 'SOL'.");
  assert(
    decryptedNativeSol.amount === nativeSolPayload.amount,
    "Decrypted native SOL amount mismatch.",
  );
  assert(
    decryptedNativeSol.assetId === nativeSolPayload.assetId,
    "Decrypted native SOL assetId mismatch.",
  );
  assert(
    decryptedNativeSol.depositSignature === nativeSolPayload.depositSignature,
    "Decrypted native SOL depositSignature mismatch.",
  );
  assert(
    typeof decryptedNativeSol.noteId === "string" && decryptedNativeSol.noteId.length > 0,
    "Decrypted native SOL payload must include a noteId string.",
  );

  const wrongOwnerNativeSol = tryDecryptNativeSolShieldMemo(nativeSolMemoText, wrongOwner);
  assert(
    wrongOwnerNativeSol === null,
    "Native SOL memo decryption with wrong owner must return null.",
  );

  const noPrefixNativeSol = tryDecryptNativeSolShieldMemo("not-a-native-sol-memo", ownerPubkey);
  assert(
    noPrefixNativeSol === null,
    "Native SOL memo decryption without v2 prefix must return null.",
  );

  // ---- Viewing-key ECDH path ------------------------------------------------
  const viewingKeypair = createVantaShieldViewingKeypair();
  const exportedViewingKeypair = exportVantaShieldViewingKeypair(viewingKeypair);
  const importedViewingKeypair = importVantaShieldViewingKeypair(exportedViewingKeypair);
  assert(
    importedViewingKeypair.publicKey === viewingKeypair.publicKey,
    "Imported viewing key public key mismatch.",
  );
  assert(
    importedViewingKeypair.secretKey === viewingKeypair.secretKey,
    "Imported viewing key secret key mismatch.",
  );

  const ecdhMemoText = encryptVantaShieldMemoToViewingKey({
    payload: shieldPayload,
    prefix: VANTA_SHIELD_MEMO_PREFIX_V2,
    viewingPublicKey: viewingKeypair.publicKey,
  });
  assert(
    ecdhMemoText.startsWith(VANTA_SHIELD_MEMO_PREFIX_V2),
    "Viewing-key memo must use the Shield v2 prefix.",
  );
  assertNoLeak(ecdhMemoText, [
    shieldPayload.amount,
    shieldPayload.asset,
    shieldPayload.depositSignature,
    shieldPayload.mintAddress,
    shieldPayload.owner,
    shieldPayload.vaultOwner,
  ]);
  assert(
    tryDecryptShieldMemo(ecdhMemoText, ownerPubkey) === null,
    "Owner public key alone must not decrypt viewing-key Shield memos.",
  );

  const viewingDecryptedShield = decryptVantaShieldMemoWithViewingKey({
    memoText: ecdhMemoText,
    prefix: VANTA_SHIELD_MEMO_PREFIX_V2,
    viewingSecretKey: viewingKeypair.secretKey,
  });
  assert(viewingDecryptedShield !== null, "Viewing private key must decrypt Shield memo.");
  assert(
    viewingDecryptedShield.amount === shieldPayload.amount,
    "Viewing-key decrypted Shield amount mismatch.",
  );
  assert(
    decryptVantaShieldMemoWithViewingKey({
      memoText: ecdhMemoText,
      prefix: VANTA_SHIELD_MEMO_PREFIX_V2,
      viewingSecretKey: createVantaShieldViewingKeypair().secretKey,
    }) === null,
    "Wrong viewing private key must not decrypt Shield memo.",
  );

  const viewingInstruction = createShieldMemoInstruction(shieldPayload, {
    viewingPublicKey: viewingKeypair.publicKey,
  });
  const viewingInstructionMemoText = decodeMemoText(viewingInstruction);
  assertNoLeak(viewingInstructionMemoText, [
    shieldPayload.amount,
    shieldPayload.asset,
    shieldPayload.depositSignature,
    shieldPayload.mintAddress,
    shieldPayload.owner,
    shieldPayload.vaultOwner,
  ]);
  assert(
    tryDecryptShieldMemo(viewingInstructionMemoText, ownerPubkey) === null,
    "Owner public key alone must not decrypt instruction-created viewing-key Shield memos.",
  );
  const viewingInstructionPayload = tryDecryptShieldMemo(
    viewingInstructionMemoText,
    ownerPubkey,
    { viewingSecretKey: viewingKeypair.secretKey },
  );
  assert(
    viewingInstructionPayload !== null,
    "tryDecryptShieldMemo must decrypt instruction-created viewing-key memos when passed the viewing secret.",
  );
  assert(
    viewingInstructionPayload.amount === shieldPayload.amount,
    "Instruction-created viewing-key Shield amount mismatch.",
  );

  console.log("vanta shield memo encryption: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
