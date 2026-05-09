import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-action-memo-encryption-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "solana/vantaShieldViewingKey.ts",
  "solana/vantaShieldState.ts",
];

const pageViewingKeyContracts = [
  {
    minViewingKeyOptions: 2,
    path: "src/pages/SendPage.tsx",
  },
  {
    minViewingKeyOptions: 4,
    path: "src/pages/SwapPage.tsx",
  },
  {
    minViewingKeyOptions: 2,
    path: "src/pages/UnshieldPage.tsx",
  },
];
const VANTA_SEND_MEMO_PREFIX_V1 = "vanta:send-note:v1:";
const VANTA_SWAP_MEMO_PREFIX_V1 = "vanta:swap-note:v1:";
const VANTA_UNSHIELD_MEMO_PREFIX_V1 = "vanta:unshield-note:v1:";
const VANTA_SOL_UNSHIELD_MEMO_PREFIX_V1 = "vanta:sol-unshield-note:v1:";
const VANTA_SPENT_MARKER_MEMO_PREFIX_V1 = "vanta:spent-marker:v1:";

const SHIELD_CONFIG_STUB = `export type LiveShieldTokenAssetKey = "USDC" | "USDT" | "BONK";
export const ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS: readonly LiveShieldTokenAssetKey[] = ["USDC", "USDT", "BONK"];
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
const SOLANA_CLIENT_STUB = `export const endpoint = "https://api.mainnet-beta.solana.com";
export const readRpcFallbackEndpoints = [endpoint];
`;
const NATIVE_SOL_SHIELD_STUB = `export function hasMatchingNativeSolShieldTransfer(_args) {
  return false;
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
    .replace(/from "@\/solana\/shieldConfig"/g, 'from "./shieldConfig"')
    .replace(/from "@\/solana\/vantaShieldViewingKey"/g, 'from "./vantaShieldViewingKey"')
    .replace(/from "@\/solana\/client"/g, 'from "./client"')
    .replace(/from "@\/solana\/nativeSolShield"/g, 'from "./nativeSolShield"');
  writeFileSync(join(tempTsDir, relativePath), source);
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

function writeStubs() {
  mkdirSync(join(tempTsDir, "solana"), { recursive: true });
  writeFileSync(join(tempTsDir, "solana/shieldConfig.ts"), SHIELD_CONFIG_STUB);
  writeFileSync(join(tempTsDir, "solana/client.ts"), SOLANA_CLIENT_STUB);
  writeFileSync(join(tempTsDir, "solana/nativeSolShield.ts"), NATIVE_SOL_SHIELD_STUB);
}

function decodeMemoText(instruction) {
  assert(
    instruction?.programAddress === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    "Expected action memo to target the SPL memo program.",
  );
  return new TextDecoder().decode(instruction.data);
}

function isBase64Url(value) {
  return /^[A-Za-z0-9_-]+$/u.test(value);
}

function assertNoLeak(memoText, leakTerms) {
  for (const term of leakTerms) {
    assert(!memoText.includes(term), `Encrypted action memo leaked raw term: ${term}`);
  }
}

function assertThrowsActionMemoWithoutViewingKey(fn, label) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = /requires a Shield viewing public key/u.test(error instanceof Error ? error.message : String(error));
  }
  assert(threw, `${label} must fail closed instead of creating fresh v1 plaintext without a viewing key.`);
}

function legacyMemo(prefix, payload) {
  return `${prefix}${JSON.stringify(payload)}`;
}

function assertPageViewingKeyContract() {
  for (const contract of pageViewingKeyContracts) {
    const source = readFileSync(resolve(repoRoot, contract.path), "utf8");
    assert(
      source.includes('useVantaShieldViewingKey'),
      `${contract.path} must load the Shield viewing key before building action memos.`,
    );
    assert(
      source.includes('const viewingKey = useVantaShieldViewingKey();'),
      `${contract.path} must keep a local viewingKey handle for action memo AEAD.`,
    );
    const viewingKeyOptions = source.match(/\{ viewingPublicKey: viewingKey\?\.publicKey \}/gu) ?? [];
    assert(
      viewingKeyOptions.length >= contract.minViewingKeyOptions,
      `${contract.path} must pass the viewing key into every Send/Swap/Unshield action memo builder.`,
    );
  }

  const sendSource = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
  assert(
    sendSource.includes("trimmedRecipient !== args.shieldAccountState.owner"),
    "Send v2 UI must fail closed for non-self recipients until recipient viewing-key exchange is wired.",
  );
  assert(
    sendSource.includes("recipient viewing-key exchange"),
    "Send v2 UI must explain the recipient viewing-key exchange blocker for non-self recipients.",
  );

  const unshieldSource = readFileSync(resolve(repoRoot, "src/pages/UnshieldPage.tsx"), "utf8");
  assert(
    unshieldSource.includes("viewingSecretKey: viewingKey?.secretKey"),
    "Unshield split follow-up recovery must pass the viewing secret key so v2 split-child memos can be recovered.",
  );
  assert(
    unshieldSource.includes("viewingKey?.secretKey"),
    "Unshield split follow-up effect must depend on the viewing secret key used for v2 split-child recovery.",
  );
}

try {
  assertPageViewingKeyContract();

  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }
  writeStubs();

  const allFiles = [
    ...sourceFiles,
    "solana/shieldConfig.ts",
    "solana/client.ts",
    "solana/nativeSolShield.ts",
  ];

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
    VANTA_SEND_MEMO_PREFIX_V2,
    VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2,
    VANTA_SPENT_MARKER_MEMO_PREFIX_V2,
    VANTA_SWAP_MEMO_PREFIX_V2,
    VANTA_UNSHIELD_MEMO_PREFIX_V2,
    createPreparedSendMemo,
    createPreparedSolUnshieldMemo,
    createPreparedSwapMemo,
    createPreparedUnshieldMemo,
    createSpentMarkerInstruction,
    parseSendMemo,
    parseSolUnshieldMemo,
    parseSpentMarkerMemo,
    parseSwapMemo,
    parseUnshieldMemo,
  } = shieldStateModule;
  const { createVantaShieldViewingKeypair } = viewingKeyModule;

  const owner = "OwnerWallet111111111111111111111111111111";
  const recipient = "RecipientWallet11111111111111111111111111";
  const vaultOwner = "VaultOwner111111111111111111111111111111";
  const mintAddress = "Mint111111111111111111111111111111111111";
  const senderViewingKey = createVantaShieldViewingKeypair();
  const recipientViewingKey = createVantaShieldViewingKeypair();
  const wrongViewingKey = createVantaShieldViewingKeypair();

  const sendPayload = {
    amount: "12.5",
    asset: "USDC",
    changeAmount: "1.25",
    consumedNoteId: "note-consumed-send",
    createdAt: 1_700_000_000_000,
    mintAddress,
    owner,
    recipient,
    vaultOwner,
  };
  const encryptedSend = createPreparedSendMemo(sendPayload, {
    viewingPublicKey: recipientViewingKey.publicKey,
  });
  const sendMemoText = decodeMemoText(encryptedSend.instruction);
  assert(sendMemoText.startsWith(VANTA_SEND_MEMO_PREFIX_V2), "Send memo must use v2 AEAD prefix.");
  assert(isBase64Url(sendMemoText.slice(VANTA_SEND_MEMO_PREFIX_V2.length)), "Send memo body must be base64url.");
  assertNoLeak(sendMemoText, [
    sendPayload.amount,
    sendPayload.changeAmount,
    sendPayload.consumedNoteId,
    sendPayload.owner,
    sendPayload.recipient,
    sendPayload.vaultOwner,
  ]);
  assert(parseSendMemo(sendMemoText, "send-v2", {
    viewingSecretKey: recipientViewingKey.secretKey,
  })?.recipient === recipient, "Send v2 memo must decrypt with the recipient viewing key.");
  assert(
    parseSendMemo(sendMemoText, "send-v2", {
      viewingSecretKey: wrongViewingKey.secretKey,
    }) === null,
    "Send v2 memo must not decrypt with the wrong viewing key.",
  );
  assertThrowsActionMemoWithoutViewingKey(() => createPreparedSendMemo(sendPayload), "Send memo");
  const legacySendMemoText = `${VANTA_SEND_MEMO_PREFIX_V1}${JSON.stringify({
    ...sendPayload,
    changeNoteId: encryptedSend.changeNoteId,
    kind: "send",
    noteId: encryptedSend.noteId,
  })}`;
  assert(
    parseSendMemo(legacySendMemoText, "send-v1")?.recipient === recipient,
    "Send v1 plaintext memo parsing must remain backward compatible without live helpers emitting v1.",
  );

  const swapPayload = {
    consumedNoteId: "note-consumed-swap",
    createdAt: 1_700_000_100_000,
    inputAmount: "12.5",
    inputAsset: "USDC",
    mintAddress,
    outputAmount: "0.125",
    outputAsset: "SOL",
    owner,
    quoteExpiresAt: 1_700_000_130_000,
    quoteId: "quote-secret-id",
    quoteTimestamp: 1_700_000_100_000,
    venueFamily: "DLMM",
    venueName: "Meteora",
    venueNetwork: "Mainnet",
    venuePoolAddress: "PoolAddress111111111111111111111111111",
    vaultOwner,
  };
  const encryptedSwap = createPreparedSwapMemo(swapPayload, {
    viewingPublicKey: senderViewingKey.publicKey,
  });
  const swapMemoText = decodeMemoText(encryptedSwap.instruction);
  assert(swapMemoText.startsWith(VANTA_SWAP_MEMO_PREFIX_V2), "Swap memo must use v2 AEAD prefix.");
  assertNoLeak(swapMemoText, [
    swapPayload.consumedNoteId,
    swapPayload.inputAmount,
    swapPayload.outputAmount,
    swapPayload.quoteId,
    swapPayload.venuePoolAddress,
    swapPayload.owner,
  ]);
  assert(parseSwapMemo(swapMemoText, "swap-v2", {
    viewingSecretKey: senderViewingKey.secretKey,
  })?.outputAsset === "SOL", "Swap v2 memo must decrypt with the owner viewing key.");
  assertThrowsActionMemoWithoutViewingKey(() => createPreparedSwapMemo(swapPayload), "Swap memo");
  const legacySwapMemoText = `${VANTA_SWAP_MEMO_PREFIX_V1}${JSON.stringify({
    ...swapPayload,
    kind: "swap",
    noteId: encryptedSwap.noteId,
    outputNoteId: encryptedSwap.outputNoteId,
  })}`;
  assert(
    parseSwapMemo(legacySwapMemoText, "swap-v1")?.quoteId === swapPayload.quoteId,
    "Swap v1 plaintext memo parsing must remain backward compatible without live helpers emitting v1.",
  );

  const unshieldPayload = {
    amount: "5.000001",
    asset: "USDC",
    consumedNoteId: "note-consumed-unshield",
    createdAt: 1_700_000_200_000,
    destinationOwner: owner,
    mintAddress,
    owner,
    vaultOwner,
  };
  const encryptedUnshield = createPreparedUnshieldMemo(unshieldPayload, {
    viewingPublicKey: senderViewingKey.publicKey,
  });
  const unshieldMemoText = decodeMemoText(encryptedUnshield.instruction);
  assert(unshieldMemoText.startsWith(VANTA_UNSHIELD_MEMO_PREFIX_V2), "Unshield memo must use v2 AEAD prefix.");
  assertNoLeak(unshieldMemoText, [
    unshieldPayload.amount,
    unshieldPayload.consumedNoteId,
    unshieldPayload.destinationOwner,
    unshieldPayload.owner,
  ]);
  assert(parseUnshieldMemo(unshieldMemoText, "unshield-v2", {
    viewingSecretKey: senderViewingKey.secretKey,
  })?.destinationOwner === owner, "Unshield v2 memo must decrypt with the owner viewing key.");
  assertThrowsActionMemoWithoutViewingKey(
    () => createPreparedUnshieldMemo(unshieldPayload),
    "Unshield memo",
  );
  const legacyUnshieldMemoText = legacyMemo(VANTA_UNSHIELD_MEMO_PREFIX_V1, {
    ...unshieldPayload,
    kind: "unshield",
    noteId: encryptedUnshield.noteId,
  });
  assert(
    parseUnshieldMemo(legacyUnshieldMemoText, "unshield-v1")?.destinationOwner === owner,
    "Unshield v1 plaintext memo parsing must remain backward compatible without live helpers emitting v1.",
  );

  const solUnshieldPayload = {
    amount: "1.25",
    asset: "SOL",
    assetId: "So11111111111111111111111111111111111111112",
    consumedNoteId: "note-consumed-sol-unshield",
    createdAt: 1_700_000_300_000,
    destinationOwner: owner,
    owner,
    vaultOwner,
  };
  const encryptedSolUnshield = createPreparedSolUnshieldMemo(solUnshieldPayload, {
    viewingPublicKey: senderViewingKey.publicKey,
  });
  const solUnshieldMemoText = decodeMemoText(encryptedSolUnshield.instruction);
  assert(solUnshieldMemoText.startsWith(VANTA_SOL_UNSHIELD_MEMO_PREFIX_V2), "SOL Unshield memo must use v2 AEAD prefix.");
  assertNoLeak(solUnshieldMemoText, [
    solUnshieldPayload.amount,
    solUnshieldPayload.consumedNoteId,
    solUnshieldPayload.destinationOwner,
    solUnshieldPayload.owner,
  ]);
  assert(parseSolUnshieldMemo(solUnshieldMemoText, "sol-unshield-v2", {
    viewingSecretKey: senderViewingKey.secretKey,
  })?.asset === "SOL", "SOL Unshield v2 memo must decrypt with the owner viewing key.");
  assertThrowsActionMemoWithoutViewingKey(
    () => createPreparedSolUnshieldMemo(solUnshieldPayload),
    "SOL Unshield memo",
  );
  const legacySolUnshieldMemoText = legacyMemo(VANTA_SOL_UNSHIELD_MEMO_PREFIX_V1, {
    ...solUnshieldPayload,
    kind: "sol_unshield",
    noteId: encryptedSolUnshield.noteId,
  });
  assert(
    parseSolUnshieldMemo(legacySolUnshieldMemoText, "sol-unshield-v1")?.asset === "SOL",
    "SOL Unshield v1 plaintext memo parsing must remain backward compatible without live helpers emitting v1.",
  );

  const spentMarkerPayload = {
    asset: "USDC",
    assetId: mintAddress,
    consumedNoteId: "note-consumed-marker",
    createdAt: 1_700_000_400_000,
    mintAddress,
    owner,
    transitionKind: "send",
    transitionNoteId: "transition-note-secret",
    vaultOwner,
  };
  const encryptedSpentMarker = createSpentMarkerInstruction(spentMarkerPayload, {
    viewingPublicKey: senderViewingKey.publicKey,
  });
  const spentMarkerMemoText = decodeMemoText(encryptedSpentMarker);
  assert(spentMarkerMemoText.startsWith(VANTA_SPENT_MARKER_MEMO_PREFIX_V2), "Spent marker memo must use v2 AEAD prefix.");
  assertNoLeak(spentMarkerMemoText, [
    spentMarkerPayload.consumedNoteId,
    spentMarkerPayload.transitionNoteId,
    spentMarkerPayload.owner,
    spentMarkerPayload.vaultOwner,
  ]);
  assert(parseSpentMarkerMemo(spentMarkerMemoText, "spent-marker-v2", {
    viewingSecretKey: senderViewingKey.secretKey,
  })?.transitionNoteId === spentMarkerPayload.transitionNoteId, "Spent marker v2 memo must decrypt with the owner viewing key.");
  assertThrowsActionMemoWithoutViewingKey(
    () => createSpentMarkerInstruction(spentMarkerPayload),
    "Spent marker memo",
  );
  const legacySpentMarkerMemoText = legacyMemo(VANTA_SPENT_MARKER_MEMO_PREFIX_V1, {
    ...spentMarkerPayload,
    kind: "spent_marker",
    markerId: "legacy-spent-marker-id",
  });
  assert(
    parseSpentMarkerMemo(legacySpentMarkerMemoText, "spent-marker-v1")?.transitionNoteId ===
      spentMarkerPayload.transitionNoteId,
    "Spent marker v1 plaintext memo parsing must remain backward compatible without live helpers emitting v1.",
  );

  console.log("vanta action memo encryption: PASS");
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
