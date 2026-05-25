import { toAddress } from "@solana/client";

const VANTA_SHIELD_MEMO_PREFIX = "vanta:shield-note:v1:";
const VANTA_SEND_MEMO_PREFIX = "vanta:send-note:v1:";
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_SOL_UNSHIELD_MEMO_PREFIX = "vanta:sol-unshield-note:v1:";
const VANTA_SPENT_MARKER_MEMO_PREFIX = "vanta:spent-marker:v1:";
const VANTA_NATIVE_SOL_ASSET_ID = "So11111111111111111111111111111111111111112";

// Phase 1 Native SOL Shield → Private Pool v2 Integration
// Authoritative source: /Users/clay/Desktop/Vanta Vault/wiki/analyses/2026-05-14-native-sol-private-pool-v2-integration.md
// We use the sentinel asset ID for all v2 Private Pool paths (unified tree).
// WSOL mint is retained ONLY for legacy parallel tracking and Jupiter/SPL interop.
export const NATIVE_SOL_ASSET_ID_SENTINEL =
  "0000000000000000000000000000000000000000000000000000000000000000";

export function isNativeSolAssetId(assetId) {
  return assetId === NATIVE_SOL_ASSET_ID_SENTINEL || assetId === VANTA_NATIVE_SOL_ASSET_ID;
}

// TAG6 Native SOL on-chain preparation (per design doc §11, VANTA_ZK_REVIEW.md U2.1, 2026-05-14-native-sol-private-pool-v2-integration.md + status note)
// VAULT_ASSET_KIND_SOL (= 2) discriminator for vault asset registry + SOL vault PDA registration.
// Used for future TAG_REGISTER_VAULT_ASSET + TAG_UNSHIELD=6 system CPI branch (program-owned SOL PDA, no operator keypair on funds).
// Sentinel asset ID + this kind together enable native SOL first-class in unified tree + on-chain release.
export const VAULT_ASSET_KIND_SOL = 2;

// Phase 1: Unified tree ID for Private Pool v2 (preferred for maximum anonymity set)
export const VANTA_PRIVATE_POOL_V2_UNIFIED_TREE_ID = "vanta-private-pool-v2-unified-tree-v1";

function getSwapAssetAmountDecimals(asset) {
  return asset === "SOL" ? 9 : 6;
}

function hashString(input) {
  let hash = 0xcbf29ce484222325n;

  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

function createDeterministicNoteId(parts) {
  const material = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `vnta_note_${hashString(material)}`;
}

function extractMemoPayload(memo, prefix) {
  if (!memo) {
    return null;
  }

  const trimmedMemo = memo.trim();
  const memoStart = trimmedMemo.indexOf(prefix);

  if (memoStart === -1) {
    return null;
  }

  return trimmedMemo.slice(memoStart + prefix.length);
}

function createShieldNoteId(payload) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    createdAt: payload.createdAt,
    depositSignature: payload.depositSignature,
    kind: "shield",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSendNoteId(payload) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    changeAmount: payload.changeAmount,
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    kind: "send",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    recipient: payload.recipient,
    vaultOwner: payload.vaultOwner,
  });
}

function createUnshieldNoteId(payload) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    destinationOwner: payload.destinationOwner,
    kind: "unshield",
    mintAddress: payload.mintAddress,
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSwapNoteId(payload) {
  return createDeterministicNoteId({
    consumedNoteId: payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
    createdAt: payload.createdAt,
    inputAmount: payload.inputAmount,
    inputAsset: payload.inputAsset,
    kind: "swap",
    mintAddress: payload.mintAddress,
    outputAmount: payload.outputAmount,
    outputAsset: payload.outputAsset,
    owner: payload.owner,
    quoteId: payload.quoteId ?? "no_quote",
    vaultOwner: payload.vaultOwner,
  });
}

function createChangeNoteId(args) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "USDC",
    createdAt: args.createdAt,
    kind: "change",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

function createRecipientSelfNoteId(args) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "USDC",
    createdAt: args.createdAt,
    kind: "recipient_self",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

function createSolUnshieldNoteId(payload) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    assetId: payload.assetId ?? VANTA_NATIVE_SOL_ASSET_ID,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    destinationOwner: payload.destinationOwner,
    kind: "sol_unshield",
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSpentMarkerId(payload) {
  return createDeterministicNoteId({
    asset: payload.asset,
    assetId: payload.assetId ?? payload.mintAddress ?? VANTA_NATIVE_SOL_ASSET_ID,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    kind: "spent_marker",
    owner: payload.owner,
    transitionKind: payload.transitionKind ?? "send",
    transitionNoteId: payload.transitionNoteId ?? payload.sendNoteId ?? "legacy",
    vaultOwner: payload.vaultOwner,
  }).replace("vnta_note_", "vnta_spent_");
}

function amountsMatch(left, right) {
  return Math.abs(left - right) <= 0.000001;
}

function parseShieldMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_SHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    if (
      parsed.kind !== "shield" ||
      parsed.asset !== "USDC" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.depositSignature !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "USDC",
      createdAt: parsed.createdAt,
      depositSignature: parsed.depositSignature,
      kind: "shield",
      mintAddress: parsed.mintAddress,
      noteId:
        typeof parsed.noteId === "string"
          ? parsed.noteId
          : createShieldNoteId(parsed),
      origin: "deposit",
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseNativeSolShieldMemo(memo, stateSignature) {
  // Support both v1 (legacy) and v2 (current) prefixes for native SOL shield memos.
  // See design doc Phase 1 + §11 for sentinel asset ID and unified tree strategy.
  let memoPayload = extractMemoPayload(memo, "vanta:native-sol-shield-note:v2:");
  let prefixUsed = "v2";

  if (!memoPayload) {
    memoPayload = extractMemoPayload(memo, "vanta:native-sol-shield-note:v1:");
    prefixUsed = "v1";
  }

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    if (
      parsed.kind !== "native_sol_shield" ||
      parsed.asset !== "SOL" ||
      typeof parsed.assetId !== "string" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.depositSignature !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null; // fail-closed on any schema mismatch
    }

    const parsedAmount = Number(parsed.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    const assetId = isNativeSolAssetId(parsed.assetId)
      ? NATIVE_SOL_ASSET_ID_SENTINEL
      : parsed.assetId;

    return {
      amount: parsedAmount,
      asset: "SOL",
      assetId,
      createdAt: parsed.createdAt,
      depositSignature: parsed.depositSignature,
      kind: "native_sol_shield",
      noteId:
        typeof parsed.noteId === "string"
          ? parsed.noteId
          : createNativeSolShieldNoteId(parsed),
      origin: "deposit",
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
      prefixUsed,
    };
  } catch {
    return null;
  }
}

function createNativeSolShieldNoteId(payload) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset ?? "SOL",
    assetId: payload.assetId ?? NATIVE_SOL_ASSET_ID_SENTINEL,
    createdAt: payload.createdAt,
    depositSignature: payload.depositSignature,
    kind: "native_sol_shield",
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

// Strict fail-closed validation for native SOL shield deposits (Phase 1)
// This is the core of making native SOL first-class in the Private Pool v2 indexer.
async function verifyNativeSolShieldOnchainTransferAmountMatch(client, depositSignature, expectedSolAmount, vaultOwner) {
  // TODO: Implement robust RPC fetch + SystemProgram.transfer lamports verification
  // Must return true only on exact match (within lamports tolerance)
  // For now this is a placeholder that will be filled with real on-chain introspection
  // (reusing patterns from nativeSolShield.ts readNativeSolShieldParsedTransactions)
  return true; // placeholder — replace with real verification in implementation
}

function verifyDepositSignatureAndReplay(depositSignature, seenSet) {
  if (!depositSignature) return false;
  if (seenSet.has(depositSignature)) return false; // replay protection
  return true;
}

function vaultOwnerMatches(parsedVaultOwner, configuredVaultOwner) {
  return parsedVaultOwner === configuredVaultOwner;
}

/**
 * Main ingestion function for native SOL shield deposits (Phase 1).
 * Returns a payload ready for indexerState.appendCommitment() or null on any failure (fail-closed).
 */
export async function ingestValidatedNativeSolShieldDeposit(args) {
  const { client, memo, stateSignature, configuredVaultOwner, seenDepositSignatures = new Set() } = args;

  const parsed = parseNativeSolShieldMemo(memo, stateSignature);
  if (!parsed) return null;

  if (!vaultOwnerMatches(parsed.vaultOwner, configuredVaultOwner)) return null;
  if (!verifyDepositSignatureAndReplay(parsed.depositSignature, seenDepositSignatures)) return null;

  const amountMatch = await verifyNativeSolShieldOnchainTransferAmountMatch(
    client,
    parsed.depositSignature,
    parsed.amount,
    configuredVaultOwner
  );
  if (!amountMatch) return null;

  // Use sentinel for all v2 Private Pool paths (unified tree)
  const assetId = NATIVE_SOL_ASSET_ID_SENTINEL;

  // The client is expected to supply the correct Poseidon commitment computed with the sentinel.
  // For Phase 1 we accept it from the caller (or compute it here if the memo carries enough data).
  const commitment = parsed.commitment ?? null; // caller should provide this

  if (!commitment) {
    return null; // fail-closed until client supplies proper commitment
  }

  return {
    assetId,
    commitment,
    treeId: "vanta-private-pool-v2-unified-tree-v1", // unified tree (max anonymity)
    noteId: parsed.noteId,
    depositSignature: parsed.depositSignature,
    validatedAt: Date.now(),
    phase1MigrationNote: "Pre-existing WSOL-mint local notes require Phase 2 migration.",
  };
}

function parseSendMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    if (
      parsed.kind !== "send" ||
      parsed.asset !== "USDC" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.recipient !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.changeAmount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);
    const parsedChangeAmount = Number(parsed.changeAmount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isFinite(parsedChangeAmount) ||
      parsedChangeAmount < 0
    ) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "USDC",
      changeAmount: parsedChangeAmount,
      changeNoteId:
        typeof parsed.changeNoteId === "string" ? parsed.changeNoteId : undefined,
      consumedNoteId:
        typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof parsed.consumedShieldStateSignature === "string"
          ? parsed.consumedShieldStateSignature
          : undefined,
      createdAt: parsed.createdAt,
      kind: "send",
      mintAddress: parsed.mintAddress,
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      recipient: parsed.recipient,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseUnshieldMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_UNSHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    if (
      parsed.kind !== "unshield" ||
      parsed.asset !== "USDC" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.destinationOwner !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "USDC",
      consumedNoteId:
        typeof parsed.consumedNoteId === "string" ? parsed.consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof parsed.consumedShieldStateSignature === "string"
          ? parsed.consumedShieldStateSignature
          : undefined,
      createdAt: parsed.createdAt,
      destinationOwner: parsed.destinationOwner,
      kind: "unshield",
      mintAddress: parsed.mintAddress,
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSpentMarkerMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_SPENT_MARKER_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    const assetId =
      typeof parsed.assetId === "string"
        ? parsed.assetId
        : typeof parsed.mintAddress === "string"
          ? parsed.mintAddress
          : parsed.asset === "SOL"
            ? VANTA_NATIVE_SOL_ASSET_ID
            : undefined;

    if (
      parsed.kind !== "spent_marker" ||
      (parsed.asset !== "USDC" && parsed.asset !== "SOL") ||
      typeof parsed.owner !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.consumedNoteId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !assetId
    ) {
      return null;
    }

    const transitionNoteId =
      typeof parsed.transitionNoteId === "string"
        ? parsed.transitionNoteId
        : typeof parsed.sendNoteId === "string"
          ? parsed.sendNoteId
          : undefined;
    const transitionKind =
      parsed.transitionKind === "send" ||
      parsed.transitionKind === "unshield" ||
      parsed.transitionKind === "swap" ||
      parsed.transitionKind === "sol_unshield"
        ? parsed.transitionKind
        : typeof parsed.sendNoteId === "string"
          ? "send"
          : undefined;

    if (!transitionNoteId || !transitionKind) {
      return null;
    }

    return {
      asset: parsed.asset,
      assetId,
      consumedNoteId: parsed.consumedNoteId,
      createdAt: parsed.createdAt,
      kind: "spent_marker",
      markerId:
        typeof parsed.markerId === "string"
          ? parsed.markerId
          : createSpentMarkerId({
              asset: "USDC",
              assetId,
              consumedNoteId: parsed.consumedNoteId,
              createdAt: parsed.createdAt,
              owner: parsed.owner,
              transitionNoteId,
              transitionKind,
              vaultOwner: parsed.vaultOwner,
            }),
      owner: parsed.owner,
      stateSignature,
      transitionKind,
      transitionNoteId,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSwapMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_SWAP_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);
    const kind = parsed.kind ?? parsed.k;
    const inputAsset = parsed.inputAsset ?? parsed.ii;
    const outputAsset = parsed.outputAsset ?? parsed.oi;
    const owner = parsed.owner ?? parsed.ow;
    const mintAddress = parsed.mintAddress ?? parsed.ma;
    const vaultOwner = parsed.vaultOwner ?? parsed.vo;
    const inputAmount = parsed.inputAmount ?? parsed.ia;
    const minOutputAmount = parsed.minOutputAmount ?? parsed.mo;
    const outputAmount = parsed.outputAmount ?? parsed.oa;
    const createdAt = parsed.createdAt ?? parsed.ca;
    const consumedNoteId = parsed.consumedNoteId ?? parsed.cn;
    const consumedShieldStateSignature =
      parsed.consumedShieldStateSignature ?? parsed.cs;
    const noteId = parsed.noteId ?? parsed.ni;
    const outputNoteId = parsed.outputNoteId ?? parsed.on;
    const quoteExpiresAt = parsed.quoteExpiresAt ?? parsed.qe;
    const quoteId = parsed.quoteId ?? parsed.qi;
    const quoteTimestamp = parsed.quoteTimestamp ?? parsed.qt;
    const slippageBps = parsed.slippageBps ?? parsed.sb;
    const venueFamily = parsed.venueFamily ?? parsed.vf;
    const venueName = parsed.venueName ?? parsed.vn;
    const venueNetwork = parsed.venueNetwork ?? parsed.vw;
    const venuePoolAddress = parsed.venuePoolAddress ?? parsed.vp;

    const supportedInputAsset =
      typeof inputAsset === "string" && (inputAsset === "SOL" || inputAsset.length > 0);
    const supportedOutputAsset =
      typeof outputAsset === "string" && (outputAsset === "SOL" || outputAsset.length > 0);

    if (
      kind !== "swap" ||
      !supportedInputAsset ||
      !supportedOutputAsset ||
      typeof owner !== "string" ||
      typeof mintAddress !== "string" ||
      typeof vaultOwner !== "string" ||
      typeof inputAmount !== "string" ||
      typeof outputAmount !== "string" ||
      typeof createdAt !== "number"
    ) {
      return null;
    }

    const parsedInputAmount = Number(inputAmount);
    const parsedMinOutputAmount =
      typeof minOutputAmount === "string" ? Number(minOutputAmount) : undefined;
    const parsedOutputAmount = Number(outputAmount);

    if (
      !Number.isFinite(parsedInputAmount) ||
      parsedInputAmount <= 0 ||
      (parsedMinOutputAmount !== undefined &&
        (!Number.isFinite(parsedMinOutputAmount) || parsedMinOutputAmount <= 0)) ||
      !Number.isFinite(parsedOutputAmount) ||
      parsedOutputAmount <= 0
    ) {
      return null;
    }

    return {
      consumedNoteId: typeof consumedNoteId === "string" ? consumedNoteId : undefined,
      consumedShieldStateSignature:
        typeof consumedShieldStateSignature === "string"
          ? consumedShieldStateSignature
          : undefined,
      createdAt,
      inputAmount: parsedInputAmount,
      inputAsset,
      kind: "swap",
      mintAddress,
      minOutputAmount: parsedMinOutputAmount,
      noteId: typeof noteId === "string" ? noteId : undefined,
      outputAmount: parsedOutputAmount,
      outputAsset,
      outputNoteId: typeof outputNoteId === "string" ? outputNoteId : undefined,
      owner,
      quoteExpiresAt:
        typeof quoteExpiresAt === "number" && Number.isFinite(quoteExpiresAt)
          ? quoteExpiresAt
          : undefined,
      quoteId: typeof quoteId === "string" ? quoteId : undefined,
      quoteTimestamp:
        typeof quoteTimestamp === "number" && Number.isFinite(quoteTimestamp)
          ? quoteTimestamp
          : undefined,
      slippageBps:
        typeof slippageBps === "number" && Number.isFinite(slippageBps)
          ? slippageBps
          : undefined,
      stateSignature,
      venueFamily:
        venueFamily === "DLMM" || venueFamily === "Aggregator" ? venueFamily : undefined,
      venueName: typeof venueName === "string" ? venueName : undefined,
      venueNetwork: venueNetwork === "Mainnet" ? "Mainnet" : undefined,
      venuePoolAddress:
        typeof venuePoolAddress === "string" ? venuePoolAddress : undefined,
      vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSolUnshieldMemo(memo, stateSignature) {
  const memoPayload = extractMemoPayload(memo, VANTA_SOL_UNSHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload);

    if (
      parsed.kind !== "sol_unshield" ||
      parsed.asset !== "SOL" ||
      typeof parsed.assetId !== "string" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.destinationOwner !== "string" ||
      typeof parsed.consumedNoteId !== "string" ||
      typeof parsed.amount !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    const parsedAmount = Number(parsed.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    return {
      amount: parsedAmount,
      asset: "SOL",
      assetId: parsed.assetId,
      consumedNoteId: parsed.consumedNoteId,
      createdAt: parsed.createdAt,
      destinationOwner: parsed.destinationOwner,
      kind: "sol_unshield",
      noteId: typeof parsed.noteId === "string" ? parsed.noteId : undefined,
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

export async function fetchConstrainedOnchainUnshieldContext(args) {
  const ownerAddress = toAddress(args.owner);
  const signatures = await args.client.runtime.rpc
    .getSignaturesForAddress(ownerAddress, {
      commitment: "confirmed",
      limit: 100,
    })
    .send({ abortSignal: AbortSignal.timeout(20_000) });

  const successfulSignatures = signatures.filter((item) => item.err === null);

  const depositShieldNotes = successfulSignatures
    .map((item) => parseShieldMemo(item.memo, item.signature.toString()))
    .filter(
      (note) =>
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner,
    )
    .sort((left, right) => left.createdAt - right.createdAt);

  const shieldNotesBySignature = new Map(
    depositShieldNotes.map((note) => [note.stateSignature, note]),
  );
  const allShieldNotesById = new Map(
    depositShieldNotes.map((note) => [note.noteId, note]),
  );

  const candidateSendNotes = successfulSignatures
    .map((item) => parseSendMemo(item.memo, item.signature.toString()))
    .filter(
      (note) =>
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner,
    )
    .map((note) => {
      const resolvedConsumedNoteId =
        note.consumedNoteId ??
        (note.consumedShieldStateSignature
          ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
          : undefined);

      if (!resolvedConsumedNoteId) {
        return null;
      }

      const roundedSentAmount = Number(note.amount.toFixed(6));
      const roundedChangeAmount = Number(note.changeAmount.toFixed(6));

      return {
        ...note,
        amount: roundedSentAmount,
        changeAmount: roundedChangeAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId:
          note.noteId ??
          createSendNoteId({
            amount: roundedSentAmount.toString(),
            asset: "USDC",
            changeAmount: roundedChangeAmount.toString(),
            consumedNoteId: resolvedConsumedNoteId,
            createdAt: note.createdAt,
            mintAddress: note.mintAddress,
            owner: note.owner,
            recipient: note.recipient,
            vaultOwner: note.vaultOwner,
          }),
      };
    })
    .filter((note) => note !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  const candidateUnshieldNotes = successfulSignatures
    .map((item) => parseUnshieldMemo(item.memo, item.signature.toString()))
    .filter(
      (note) =>
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner,
    )
    .map((note) => {
      const resolvedConsumedNoteId =
        note.consumedNoteId ??
        (note.consumedShieldStateSignature
          ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
          : undefined);

      if (!resolvedConsumedNoteId) {
        return null;
      }

      const roundedAmount = Number(note.amount.toFixed(6));

      return {
        ...note,
        amount: roundedAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId:
          note.noteId ??
          createUnshieldNoteId({
            amount: roundedAmount.toString(),
            asset: "USDC",
            consumedNoteId: resolvedConsumedNoteId,
            createdAt: note.createdAt,
            destinationOwner: note.destinationOwner,
            mintAddress: note.mintAddress,
            owner: note.owner,
            vaultOwner: note.vaultOwner,
          }),
      };
    })
    .filter((note) => note !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  const candidateSwapNotes = successfulSignatures
    .map((item) => parseSwapMemo(item.memo, item.signature.toString()))
    .filter(
      (note) =>
        note !== null &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner,
    )
    .map((note) => {
      const resolvedConsumedNoteId =
        note.consumedNoteId ??
        (note.consumedShieldStateSignature
          ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
          : undefined);

      if (!resolvedConsumedNoteId) {
        return null;
      }

      const roundedInputAmount = Number(
        note.inputAmount.toFixed(getSwapAssetAmountDecimals(note.inputAsset)),
      );
      const roundedOutputAmount = Number(
        note.outputAmount.toFixed(getSwapAssetAmountDecimals(note.outputAsset)),
      );

      return {
        ...note,
        consumedNoteId: resolvedConsumedNoteId,
        inputAmount: roundedInputAmount,
        noteId:
          note.noteId ??
          createSwapNoteId({
            consumedNoteId: resolvedConsumedNoteId,
            createdAt: note.createdAt,
            inputAmount: roundedInputAmount.toString(),
            inputAsset: note.inputAsset,
            mintAddress: args.mintAddress,
            outputAmount: roundedOutputAmount.toString(),
            outputAsset: note.outputAsset,
            owner: note.owner,
            quoteId: note.quoteId,
            vaultOwner: note.vaultOwner,
          }),
        outputAmount: roundedOutputAmount,
        outputNoteId:
          typeof note.outputNoteId === "string"
            ? note.outputNoteId
            : createDeterministicNoteId({
                asset: note.outputAsset,
                createdAt: note.createdAt,
                kind: "swap_output",
                outputAmount: roundedOutputAmount.toString(),
                owner: note.owner,
                sourceSwapNoteId:
                  note.noteId ??
                  createSwapNoteId({
                    consumedNoteId: resolvedConsumedNoteId,
                    createdAt: note.createdAt,
                    inputAmount: roundedInputAmount.toString(),
                    inputAsset: note.inputAsset,
                    mintAddress: args.mintAddress,
                    outputAmount: roundedOutputAmount.toString(),
                    outputAsset: note.outputAsset,
                    owner: note.owner,
                    quoteId: note.quoteId,
                    vaultOwner: note.vaultOwner,
                  }),
              }),
      };
    })
    .filter((note) => note !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  const candidateSolUnshieldNotes = successfulSignatures
    .map((item) => parseSolUnshieldMemo(item.memo, item.signature.toString()))
    .filter(
      (note) =>
        note !== null &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner,
    )
    .map((note) => {
      const roundedAmount = Number(note.amount.toFixed(9));

      return {
        ...note,
        amount: roundedAmount,
        assetId: note.assetId ?? VANTA_NATIVE_SOL_ASSET_ID,
        noteId:
          note.noteId ??
          createSolUnshieldNoteId({
            amount: roundedAmount.toString(),
            asset: "SOL",
            assetId: note.assetId ?? VANTA_NATIVE_SOL_ASSET_ID,
            consumedNoteId: note.consumedNoteId,
            createdAt: note.createdAt,
            destinationOwner: note.destinationOwner,
            owner: note.owner,
            vaultOwner: note.vaultOwner,
          }),
      };
    })
    .filter((note) => note !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  const explicitSpentMarkers = successfulSignatures
    .map((item) => parseSpentMarkerMemo(item.memo, item.signature.toString()))
    .filter(
      (marker) =>
        marker !== null &&
        marker.owner === args.owner &&
        marker.vaultOwner === args.vaultOwner,
    )
    .sort((left, right) => left.createdAt - right.createdAt);

  const sendNotesById = new Map(candidateSendNotes.map((note) => [note.noteId, note]));
  const unshieldNotesById = new Map(
    candidateUnshieldNotes.map((note) => [note.noteId, note]),
  );
  const swapNotesById = new Map(candidateSwapNotes.map((note) => [note.noteId, note]));
  const solUnshieldNotesById = new Map(
    candidateSolUnshieldNotes.map((note) => [note.noteId, note]),
  );
  const consumedNoteIds = new Set();
  const consumedSolNoteIds = new Set();
  const changeNotesByParentSend = new Map();
  const recipientSelfNotesByParentSend = new Map();

  const legacySpentMarkers = candidateSendNotes
    .filter(
      (sendNote) =>
        !explicitSpentMarkers.some(
          (marker) =>
            marker.transitionKind === "send" &&
            marker.transitionNoteId === sendNote.noteId,
        ),
    )
    .map((sendNote) => ({
      asset: "USDC",
      assetId: sendNote.mintAddress,
      consumedNoteId: sendNote.consumedNoteId,
      createdAt: sendNote.createdAt,
      kind: "spent_marker",
      markerId: createSpentMarkerId({
        asset: "USDC",
        assetId: sendNote.mintAddress,
        consumedNoteId: sendNote.consumedNoteId,
        createdAt: sendNote.createdAt,
        mintAddress: sendNote.mintAddress,
        owner: sendNote.owner,
        transitionKind: "send",
        transitionNoteId: sendNote.noteId,
        vaultOwner: sendNote.vaultOwner,
      }),
      owner: sendNote.owner,
      stateSignature: `${sendNote.stateSignature}:legacy-spent`,
      transitionKind: "send",
      transitionNoteId: sendNote.noteId,
      vaultOwner: sendNote.vaultOwner,
    }));

  const shieldSpentMarkers = [...explicitSpentMarkers, ...legacySpentMarkers]
    .filter((marker) => marker.asset === "USDC")
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      const transition =
        marker.transitionKind === "send"
          ? sendNotesById.get(marker.transitionNoteId)
          : marker.transitionKind === "unshield"
            ? unshieldNotesById.get(marker.transitionNoteId)
            : swapNotesById.get(marker.transitionNoteId);

      if (!transition || transition.consumedNoteId !== marker.consumedNoteId) {
        return [];
      }

      const consumedShieldNote = allShieldNotesById.get(marker.consumedNoteId);

      if (!consumedShieldNote || consumedNoteIds.has(marker.consumedNoteId)) {
        return [];
      }

      const roundedInputAmount = Number(consumedShieldNote.amount.toFixed(6));

      if (marker.transitionKind === "send") {
        const roundedSentAmount = Number(transition.amount.toFixed(6));
        const roundedChangeAmount = Number(transition.changeAmount.toFixed(6));

        if (
          roundedSentAmount > roundedInputAmount ||
          !amountsMatch(
            Number((roundedSentAmount + roundedChangeAmount).toFixed(6)),
            roundedInputAmount,
          )
        ) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);

        if (roundedChangeAmount > 0) {
          const changeNoteId =
            typeof transition.changeNoteId === "string"
              ? transition.changeNoteId
              : createChangeNoteId({
                  amount: roundedChangeAmount.toString(),
                  createdAt: transition.createdAt,
                  mintAddress: transition.mintAddress,
                  owner: transition.owner,
                  parentNoteId: marker.consumedNoteId,
                  parentSendNoteId: transition.noteId,
                  vaultOwner: transition.vaultOwner,
                });

          const changeNote = {
            amount: roundedChangeAmount,
            asset: "USDC",
            createdAt: transition.createdAt,
            depositSignature: transition.stateSignature,
            kind: "shield",
            mintAddress: transition.mintAddress,
            noteId: changeNoteId,
            origin: "change",
            owner: transition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSendNoteId: transition.noteId,
            stateSignature: `${transition.stateSignature}:change`,
            vaultOwner: transition.vaultOwner,
          };

          changeNotesByParentSend.set(transition.noteId, changeNote);
          allShieldNotesById.set(changeNote.noteId, changeNote);
        }

        if (roundedSentAmount > 0 && transition.recipient === transition.owner) {
          const recipientSelfNote = {
            amount: roundedSentAmount,
            asset: "USDC",
            createdAt: transition.createdAt,
            depositSignature: transition.stateSignature,
            kind: "shield",
            mintAddress: transition.mintAddress,
            noteId: createRecipientSelfNoteId({
              amount: roundedSentAmount.toString(),
              createdAt: transition.createdAt,
              mintAddress: transition.mintAddress,
              owner: transition.owner,
              parentNoteId: marker.consumedNoteId,
              parentSendNoteId: transition.noteId,
              vaultOwner: transition.vaultOwner,
            }),
            origin: "recipient_self",
            owner: transition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSendNoteId: transition.noteId,
            stateSignature: `${transition.stateSignature}:recipient-self`,
            vaultOwner: transition.vaultOwner,
          };

          recipientSelfNotesByParentSend.set(transition.noteId, recipientSelfNote);
          allShieldNotesById.set(recipientSelfNote.noteId, recipientSelfNote);
        }

        return [marker];
      }

      if (marker.transitionKind === "unshield") {
        if (!amountsMatch(Number(transition.amount.toFixed(6)), roundedInputAmount)) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);
        return [marker];
      }

      if (
        transition.inputAsset === "SOL" ||
        !amountsMatch(Number(transition.inputAmount.toFixed(6)), roundedInputAmount)
      ) {
        return [];
      }

      consumedNoteIds.add(marker.consumedNoteId);
      return [marker];
    });

  const validSendNotes = candidateSendNotes.filter((note) =>
    shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "send" && marker.transitionNoteId === note.noteId,
    ),
  );
  const validUnshieldNotes = candidateUnshieldNotes.filter((note) =>
    shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "unshield" &&
        marker.transitionNoteId === note.noteId,
    ),
  );
  const validShieldInputSwapNotes = candidateSwapNotes.filter((note) =>
    shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "swap" && marker.transitionNoteId === note.noteId,
    ),
  );
  const transitionByConsumedNoteId = new Map(
    [...validSendNotes, ...validUnshieldNotes, ...validShieldInputSwapNotes].map((transition) => [
      transition.consumedNoteId,
      transition,
    ]),
  );
  const pendingSwapByConsumedNoteId = new Map(
    candidateSwapNotes
      .filter((note) => {
        if (note.inputAsset === "SOL") {
          return false;
        }

        if (transitionByConsumedNoteId.has(note.consumedNoteId)) {
          return false;
        }

        const consumedShieldNote = allShieldNotesById.get(note.consumedNoteId);

        return (
          consumedShieldNote !== undefined &&
          !consumedNoteIds.has(note.consumedNoteId) &&
          amountsMatch(
            Number(note.inputAmount.toFixed(6)),
            Number(consumedShieldNote.amount.toFixed(6)),
          )
        );
      })
      .map((note) => [note.consumedNoteId, note]),
  );
  const shieldedSolNotes = validShieldInputSwapNotes
    .filter((note) => note.outputAsset === "SOL")
    .map((note) => ({
      amount: Number(note.outputAmount.toFixed(9)),
      asset: "SOL",
      createdAt: note.createdAt,
      noteId: note.outputNoteId,
      owner: note.owner,
      sourceSwapNoteId: note.noteId,
      stateSignature: `${note.stateSignature}:sol-output`,
    }))
    .sort((left, right) => left.createdAt - right.createdAt);
  const shieldedSolNotesById = new Map(
    shieldedSolNotes.map((note) => [note.noteId, note]),
  );
  const shieldTokenNotesBySolSwap = new Map();

  const solSpentMarkers = explicitSpentMarkers
    .filter((marker) => marker.asset === "SOL")
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      if (marker.transitionKind !== "sol_unshield" && marker.transitionKind !== "swap") {
        return [];
      }

      const transition =
        marker.transitionKind === "sol_unshield"
          ? solUnshieldNotesById.get(marker.transitionNoteId)
          : swapNotesById.get(marker.transitionNoteId);
      const consumedSolNote = shieldedSolNotesById.get(marker.consumedNoteId);

      if (
        !transition ||
        !consumedSolNote ||
        transition.consumedNoteId !== marker.consumedNoteId ||
        consumedSolNoteIds.has(marker.consumedNoteId)
      ) {
        return [];
      }

      if (marker.transitionKind === "swap") {
        if (
          transition.inputAsset !== "SOL" ||
          !amountsMatch(
            Number(transition.inputAmount.toFixed(9)),
            Number(consumedSolNote.amount.toFixed(9)),
          )
        ) {
          return [];
        }

        if (transition.outputAsset === "USDC") {
          const roundedOutputAmount = Number(transition.outputAmount.toFixed(6));
          const outputNote = {
            amount: roundedOutputAmount,
            asset: "USDC",
            createdAt: transition.createdAt,
            depositSignature: transition.stateSignature,
            kind: "shield",
            mintAddress: args.mintAddress,
            noteId: transition.outputNoteId,
            origin: "swap_output",
            owner: transition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSwapNoteId: transition.noteId,
            stateSignature: `${transition.stateSignature}:swap-output`,
            vaultOwner: args.vaultOwner,
          };

          shieldTokenNotesBySolSwap.set(transition.noteId, outputNote);
          allShieldNotesById.set(outputNote.noteId, outputNote);
        }

        consumedSolNoteIds.add(marker.consumedNoteId);
        return [marker];
      }

      if (!amountsMatch(Number(transition.amount.toFixed(9)), Number(consumedSolNote.amount.toFixed(9)))) {
        return [];
      }

      consumedSolNoteIds.add(marker.consumedNoteId);
      return [marker];
    });

  const changeNotes = [...changeNotesByParentSend.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const recipientSelfNotes = [...recipientSelfNotesByParentSend.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const swapOutputShieldNotes = [...shieldTokenNotesBySolSwap.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const validSolInputSwapNotes = candidateSwapNotes.filter((note) =>
    solSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "swap" && marker.transitionNoteId === note.noteId,
    ),
  );
  const validSolInputSwapByConsumedNoteId = new Map(
    validSolInputSwapNotes.map((note) => [note.consumedNoteId, note]),
  );
  const pendingSolSwapByConsumedNoteId = new Map(
    candidateSwapNotes
      .filter((note) => {
        if (note.inputAsset !== "SOL") {
          return false;
        }

        if (validSolInputSwapByConsumedNoteId.has(note.consumedNoteId)) {
          return false;
        }

        const consumedSolNote = shieldedSolNotesById.get(note.consumedNoteId);

        return (
          consumedSolNote !== undefined &&
          !consumedSolNoteIds.has(note.consumedNoteId) &&
          amountsMatch(
            Number(note.inputAmount.toFixed(9)),
            Number(consumedSolNote.amount.toFixed(9)),
          )
        );
      })
      .map((note) => [note.consumedNoteId, note]),
  );
  const shieldNotes = [...depositShieldNotes, ...changeNotes, ...recipientSelfNotes, ...swapOutputShieldNotes].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const spendableShieldNotes = shieldNotes.filter(
    (note) =>
      !consumedNoteIds.has(note.noteId) &&
      !pendingSwapByConsumedNoteId.has(note.noteId),
  );
  const validSolUnshieldNotes = candidateSolUnshieldNotes.filter((note) =>
    solSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "sol_unshield" &&
        marker.transitionNoteId === note.noteId,
    ),
  );
  const spendableShieldedSolNotes = shieldedSolNotes.filter(
    (note) =>
      !consumedSolNoteIds.has(note.noteId) &&
      !pendingSolSwapByConsumedNoteId.has(note.noteId),
  );
  const spentMarkers = [...shieldSpentMarkers, ...solSpentMarkers].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const validSwapNotes = [...validShieldInputSwapNotes, ...validSolInputSwapNotes].sort(
    (left, right) => left.createdAt - right.createdAt,
  );

  return {
    candidateSendNotes: validSendNotes,
    candidateSolUnshieldNotes,
    candidateSwapNotes: validSwapNotes,
    candidateUnshieldNotes: validUnshieldNotes,
    shieldNotes,
    shieldedSolNotes,
    solUnshieldNotes: validSolUnshieldNotes,
    spendableShieldedSolNotes,
    spendableShieldNotes,
    spentMarkers,
  };
}

export function assertEligibleDirectUnshieldRelease(args) {
  if (args.destinationOwner !== args.owner) {
    throw new Error("Operator-direct unshield can only release to the note owner.");
  }

  const consumedNote = args.context.spendableShieldNotes.find(
    (note) => note.noteId === args.noteId,
  );

  if (!consumedNote) {
    throw new Error("Referenced shield note is not currently eligible for unshield release.");
  }

  if (
    consumedNote.owner !== args.owner ||
    consumedNote.mintAddress !== args.mintAddress ||
    consumedNote.vaultOwner !== args.vaultOwner ||
    !amountsMatch(Number(consumedNote.amount.toFixed(6)), Number(args.amount))
  ) {
    throw new Error("Referenced shield note does not match the wallet-authorized direct unshield request.");
  }

  const competingTransitions = [
    ...args.context.candidateSendNotes.filter((note) => note.consumedNoteId === args.noteId),
    ...args.context.candidateSwapNotes.filter((note) => note.consumedNoteId === args.noteId),
    ...args.context.candidateUnshieldNotes.filter((note) => note.consumedNoteId === args.noteId),
  ];

  if (competingTransitions.length > 0) {
    throw new Error("Referenced note already has another constrained transition pending.");
  }

  return consumedNote;
}

export function assertEligibleSwapTransition(args) {
  const transition = args.context.candidateSwapNotes.find(
    (note) => note.noteId === args.transitionNoteId,
  );

  if (!transition) {
    throw new Error("Referenced onchain swap transition was not found.");
  }

  if (
    transition.owner !== args.owner ||
    transition.vaultOwner !== args.vaultOwner ||
    transition.consumedNoteId !== args.consumedNoteId ||
    transition.outputNoteId !== args.outputNoteId ||
    transition.quoteId !== args.quoteId ||
    transition.quoteTimestamp !== args.quoteTimestamp ||
    transition.quoteExpiresAt !== args.quoteExpiresAt ||
    transition.minOutputAmount !== Number(args.minOutputAmount) ||
    transition.slippageBps !== args.slippageBps ||
    transition.venueName !== args.venueName ||
    transition.venueFamily !== args.venueFamily ||
    transition.venueNetwork !== args.venueNetwork ||
    transition.venuePoolAddress !== args.venuePoolAddress ||
    transition.inputAsset !== "USDC" ||
    transition.outputAsset !== "SOL" ||
    !amountsMatch(Number(transition.inputAmount.toFixed(6)), Number(args.inputAmount)) ||
    !amountsMatch(Number(transition.outputAmount.toFixed(9)), Number(args.outputAmount))
  ) {
    throw new Error("Onchain swap transition does not match the authenticated request.");
  }

  const consumedNote = args.context.spendableShieldNotes.find(
    (note) => note.noteId === args.consumedNoteId,
  );

  if (!consumedNote) {
    throw new Error("Referenced USDC note is not currently eligible for swap.");
  }

  if (!amountsMatch(Number(consumedNote.amount.toFixed(6)), Number(args.inputAmount))) {
    throw new Error("Referenced USDC note amount does not match the requested swap amount.");
  }

  const competingTransitions = [
    ...args.context.candidateSendNotes.filter((note) => note.consumedNoteId === args.consumedNoteId),
    ...args.context.candidateSwapNotes.filter((note) => note.consumedNoteId === args.consumedNoteId),
    ...args.context.candidateUnshieldNotes.filter((note) => note.consumedNoteId === args.consumedNoteId),
  ];

  if (competingTransitions.some((note) => note.noteId !== args.transitionNoteId)) {
    throw new Error("Referenced note already has another constrained transition pending.");
  }

  return transition;
}

export function assertEligibleDirectSolUnshieldRelease(args) {
  if (args.destinationOwner !== args.owner) {
    throw new Error("Operator-direct SOL unshield can only release to the note owner.");
  }

  const consumedNote = args.context.spendableShieldedSolNotes.find(
    (note) => note.noteId === args.consumedNoteId,
  );

  if (!consumedNote) {
    throw new Error("Referenced shielded SOL note is not currently eligible for unshield release.");
  }

  if (
    consumedNote.owner !== args.owner ||
    consumedNote.asset !== "SOL" ||
    !amountsMatch(Number(consumedNote.amount.toFixed(9)), Number(args.amount))
  ) {
    throw new Error("Referenced shielded SOL note does not match the wallet-authorized direct release request.");
  }

  const competingTransitions = [
    ...args.context.candidateSolUnshieldNotes.filter(
      (note) => note.consumedNoteId === args.consumedNoteId,
    ),
    ...args.context.candidateSwapNotes.filter(
      (note) => note.inputAsset === "SOL" && note.consumedNoteId === args.consumedNoteId,
    ),
  ];

  if (competingTransitions.length > 0) {
    throw new Error("Referenced shielded SOL note already has another constrained transition pending.");
  }

  return consumedNote;
}
