import {
  toAddress,
  type SolanaClient,
  type TransactionInstructionInput,
} from "@solana/client";
import {
  ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS,
  getLiveShieldTokenAsset,
  type LiveShieldTokenAssetKey,
} from "@/solana/shieldConfig";

export const VANTA_SHIELD_MEMO_PROGRAM =
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const VANTA_SHIELD_MEMO_PREFIX = "vanta:shield-note:v1:";
const VANTA_SEND_MEMO_PREFIX = "vanta:send-note:v1:";
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SWAP_MEMO_PREFIX = "vanta:swap-note:v1:";
const VANTA_SOL_UNSHIELD_MEMO_PREFIX = "vanta:sol-unshield-note:v1:";
const VANTA_SPENT_MARKER_MEMO_PREFIX = "vanta:spent-marker:v1:";
export const VANTA_NATIVE_SOL_ASSET_ID =
  "So11111111111111111111111111111111111111112";

export type VantaShieldTokenAsset = LiveShieldTokenAssetKey;

type BaseVantaNote = {
  amount: number;
  asset: VantaShieldTokenAsset;
  createdAt: number;
  mintAddress: string;
  noteId: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaShieldNote = BaseVantaNote & {
  depositSignature: string;
  kind: "shield";
  origin: "deposit" | "change" | "swap_output" | "recipient_self";
  parentNoteId?: string;
  parentSendNoteId?: string;
  parentSwapNoteId?: string;
};

export type VantaSendNote = BaseVantaNote & {
  changeAmount: number;
  changeNoteId?: string;
  consumedNoteId: string;
  kind: "send";
  recipient: string;
};

export type VantaUnshieldNote = BaseVantaNote & {
  consumedNoteId: string;
  destinationOwner: string;
  kind: "unshield";
};

export type VantaSwapNote = {
  createdAt: number;
  consumedNoteId: string;
  inputAmount: number;
  inputAsset: "VUSD";
  kind: "swap";
  noteId: string;
  outputAmount: number;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputNoteId: string;
  owner: string;
  quoteExpiresAt?: number;
  quoteId?: string;
  quoteTimestamp?: number;
  stateSignature: string;
  vaultOwner: string;
  venueFamily?: "DLMM";
  venueName?: "Meteora";
  venueNetwork?: "Devnet";
  venuePoolAddress?: string;
};

export type VantaShieldedSolNote = {
  amount: number;
  asset: "SOL";
  consumedByTransitionId?: string;
  consumedByTransitionKind?: "sol_unshield";
  createdAt: number;
  lifecycleStatus: VantaNoteLifecycleStatus;
  noteId: string;
  owner: string;
  sourceSwapNoteId: string;
  spentMarkerId?: string;
  stateSignature: string;
};

export type VantaSolUnshieldNote = {
  amount: number;
  asset: "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  destinationOwner: string;
  kind: "sol_unshield";
  noteId: string;
  owner: string;
  stateSignature: string;
  vaultOwner: string;
};

export type VantaTransitionKind =
  | VantaSendNote["kind"]
  | VantaUnshieldNote["kind"]
  | VantaSwapNote["kind"]
  | VantaSolUnshieldNote["kind"];

export type VantaSpentMarker = {
  asset: VantaShieldTokenAsset | "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId: string;
  owner: string;
  stateSignature: string;
  transitionKind: VantaTransitionKind;
  transitionNoteId: string;
  vaultOwner: string;
};

export type VantaShieldActivity =
  | VantaShieldNote
  | VantaSendNote
  | VantaUnshieldNote
  | VantaSwapNote
  | VantaSolUnshieldNote
  | VantaSpentMarker;

export type VantaNoteLifecycleStatus = "spendable" | "consumed";

export type VantaAppNoteState = {
  amount: number;
  asset: VantaShieldTokenAsset;
  consumedByTransitionId?: string;
  consumedByTransitionKind?: VantaTransitionKind;
  createdAt: number;
  lifecycleStatus: VantaNoteLifecycleStatus;
  noteId: string;
  parentNoteId?: string;
  parentSendNoteId?: string;
  sourceType: "deposit" | "change_derived" | "swap_derived";
  spentMarkerId?: string;
  stateSignature: string;
};

export type VantaNoteStatusSummary = {
  changeDerived: number;
  consumed: number;
  swapDerived: number;
  spendable: number;
  total: number;
};

export type VantaLifecycleActivityType =
  | "shield"
  | "send"
  | "change_note_created"
  | "swap_output_created"
  | "unshield"
  | "swap"
  | "sol_unshield";

export type VantaLifecycleStateImpact =
  | "public_to_shielded"
  | "shielded_transfer"
  | "shielded_to_shielded"
  | "shielded_to_public"
  | "shielded_swap";

export type VantaLifecycleActivity = {
  amount: number;
  amountLabel?: string;
  createdAt: number;
  description: string;
  noteId?: string;
  sourceState: "Public Wallet" | "Shielded State";
  targetState: "Public Wallet" | "Shielded State";
  title: string;
  type: VantaLifecycleActivityType;
  impact: VantaLifecycleStateImpact;
};

export type VantaShieldAccountState = {
  accountId: string;
  activity: VantaShieldActivity[];
  asset: VantaShieldTokenAsset;
  balance: number;
  changeNotes: VantaShieldNote[];
  lifecycleActivities: VantaLifecycleActivity[];
  mintAddress: string;
  noteStates: VantaAppNoteState[];
  noteStatusSummary: VantaNoteStatusSummary;
  owner: string;
  sendNotes: VantaSendNote[];
  shieldNotes: VantaShieldNote[];
  shieldedSolBalance: number;
  consumedShieldedSolNotes: VantaShieldedSolNote[];
  shieldedSolNotes: VantaShieldedSolNote[];
  solUnshieldNotes: VantaSolUnshieldNote[];
  source: "vanta_onchain_notes";
  spendableShieldedSolNotes: VantaShieldedSolNote[];
  spendableShieldNotes: VantaShieldNote[];
  spentMarkers: VantaSpentMarker[];
  spentShieldNotes: VantaShieldNote[];
  status: "ready";
  swapNotes: VantaSwapNote[];
  unshieldNotes: VantaUnshieldNote[];
  vaultOwner: string;
};

type ShieldMemoPayload = {
  amount: string;
  asset: VantaShieldTokenAsset;
  createdAt: number;
  depositSignature: string;
  kind: "shield";
  mintAddress: string;
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SendMemoPayload = {
  amount: string;
  asset: "VUSD";
  changeAmount: string;
  changeNoteId?: string;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  kind: "send";
  mintAddress: string;
  noteId?: string;
  owner: string;
  recipient: string;
  vaultOwner: string;
};

type UnshieldMemoPayload = {
  amount: string;
  asset: VantaShieldTokenAsset;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  destinationOwner: string;
  kind: "unshield";
  mintAddress: string;
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SwapMemoPayload = {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  createdAt: number;
  inputAmount: string;
  inputAsset: "VUSD";
  kind: "swap";
  mintAddress: string;
  noteId?: string;
  outputAmount: string;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputNoteId?: string;
  owner: string;
  quoteExpiresAt?: number;
  quoteId?: string;
  quoteTimestamp?: number;
  vaultOwner: string;
  venueFamily?: "DLMM";
  venueName?: "Meteora";
  venueNetwork?: "Devnet";
  venuePoolAddress?: string;
};

type SwapMemoWirePayload = {
  ca: number;
  cn?: string;
  cs?: string;
  ia: string;
  ii: "VUSD";
  k: "swap";
  ma: string;
  ni: string;
  oa: string;
  oi: VantaShieldTokenAsset | "SOL";
  on: string;
  ow: string;
  qe?: number;
  qi?: string;
  qt?: number;
  vf?: "DLMM";
  vn?: "Meteora";
  vo: string;
  vp?: string;
  vw?: "Devnet";
};

type SolUnshieldMemoPayload = {
  amount: string;
  asset: "SOL";
  assetId: string;
  consumedNoteId: string;
  createdAt: number;
  destinationOwner: string;
  kind: "sol_unshield";
  noteId?: string;
  owner: string;
  vaultOwner: string;
};

type SpentMarkerMemoPayload = {
  asset: VantaShieldTokenAsset | "SOL";
  assetId?: string;
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId?: string;
  mintAddress?: string;
  owner: string;
  sendNoteId?: string;
  transitionKind?: VantaTransitionKind;
  transitionNoteId?: string;
  vaultOwner: string;
};

function createMemoInstruction(prefix: string, payload: object): TransactionInstructionInput {
  const memoPayload = `${prefix}${JSON.stringify(payload)}`;

  return {
    accounts: [],
    data: new TextEncoder().encode(memoPayload),
    programAddress: toAddress(VANTA_SHIELD_MEMO_PROGRAM),
  };
}

function hashString(input: string) {
  let hash = 0xcbf29ce484222325n;

  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

function isShieldTokenAsset(value: unknown): value is VantaShieldTokenAsset {
  return (
    typeof value === "string" &&
    (ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS as readonly string[]).includes(value)
  );
}

function resolveShieldTokenAssetFromMint(mintAddress: string): VantaShieldTokenAsset | null {
  for (const assetKey of ALL_LIVE_SHIELD_TOKEN_ASSET_KEYS) {
    const asset = getLiveShieldTokenAsset(assetKey);
    if (asset.mintAddress === mintAddress) {
      return asset.assetKey;
    }
  }

  return null;
}

function formatShieldTokenAmount(asset: VantaShieldTokenAsset, amount: number) {
  const decimals = Math.min(getLiveShieldTokenAsset(asset).decimals, 4);
  return `${amount.toFixed(decimals)} ${asset}`;
}

function getShieldAssetAmountDecimals(asset: VantaShieldTokenAsset | "SOL") {
  if (asset === "SOL") {
    return 9;
  }

  return getLiveShieldTokenAsset(asset).decimals;
}

function createDeterministicNoteId(parts: Record<string, string | number>) {
  const material = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `vnta_note_${hashString(material)}`;
}

function extractMemoPayload(
  memo: string | null | undefined,
  prefix: string,
) {
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

function createShieldNoteId(payload: Omit<ShieldMemoPayload, "kind" | "noteId">) {
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

function createSendNoteId(payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">) {
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

function createUnshieldNoteId(
  payload: Omit<UnshieldMemoPayload, "kind" | "noteId">,
) {
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

function createSwapNoteId(payload: Omit<SwapMemoPayload, "kind" | "noteId" | "outputNoteId">) {
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

function createSolUnshieldNoteId(
  payload: Omit<SolUnshieldMemoPayload, "kind" | "noteId">,
) {
  return createDeterministicNoteId({
    amount: payload.amount,
    asset: payload.asset,
    assetId: payload.assetId,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    destinationOwner: payload.destinationOwner,
    kind: "sol_unshield",
    owner: payload.owner,
    vaultOwner: payload.vaultOwner,
  });
}

function createSwapOutputNoteId(args: {
  createdAt: number;
  outputAsset: VantaShieldTokenAsset | "SOL";
  outputAmount: string;
  owner: string;
  sourceSwapNoteId: string;
}) {
  return createDeterministicNoteId({
    asset: args.outputAsset,
    createdAt: args.createdAt,
    kind: "swap_output",
    outputAmount: args.outputAmount,
    owner: args.owner,
    sourceSwapNoteId: args.sourceSwapNoteId,
  });
}

function createChangeNoteId(args: {
  amount: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  parentNoteId: string;
  parentSendNoteId: string;
  vaultOwner: string;
}) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "VUSD",
    createdAt: args.createdAt,
    kind: "change",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

export function createRecipientSelfNoteId(args: {
  amount: string;
  createdAt: number;
  mintAddress: string;
  owner: string;
  parentNoteId: string;
  parentSendNoteId: string;
  vaultOwner: string;
}) {
  return createDeterministicNoteId({
    amount: args.amount,
    asset: "VUSD",
    createdAt: args.createdAt,
    kind: "recipient_self",
    mintAddress: args.mintAddress,
    owner: args.owner,
    parentNoteId: args.parentNoteId,
    parentSendNoteId: args.parentSendNoteId,
    vaultOwner: args.vaultOwner,
  });
}

function createSpentMarkerId(
  payload: Omit<SpentMarkerMemoPayload, "kind" | "markerId">,
) {
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

function amountsMatch(left: number, right: number) {
  return Math.abs(left - right) <= 0.000001;
}

export function createShieldMemoInstruction(
  payload: Omit<ShieldMemoPayload, "kind" | "noteId">,
): TransactionInstructionInput {
  return createMemoInstruction(VANTA_SHIELD_MEMO_PREFIX, {
    ...payload,
    kind: "shield",
    noteId: createShieldNoteId(payload),
  } satisfies ShieldMemoPayload);
}

export function createSendMemoInstruction(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
): TransactionInstructionInput {
  return createPreparedSendMemo(payload).instruction;
}

export function createPreparedSendMemo(
  payload: Omit<SendMemoPayload, "kind" | "noteId" | "changeNoteId">,
) {
  const noteId = createSendNoteId(payload);
  const recipientNoteId =
    Number(payload.amount) > 0 && payload.recipient === payload.owner
      ? createRecipientSelfNoteId({
          amount: payload.amount,
          createdAt: payload.createdAt,
          mintAddress: payload.mintAddress,
          owner: payload.owner,
          parentNoteId:
            payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
          parentSendNoteId: noteId,
          vaultOwner: payload.vaultOwner,
        })
      : undefined;
  const changeNoteId =
    Number(payload.changeAmount) > 0
      ? createChangeNoteId({
          amount: payload.changeAmount,
          createdAt: payload.createdAt,
          mintAddress: payload.mintAddress,
          owner: payload.owner,
          parentNoteId:
            payload.consumedNoteId ?? payload.consumedShieldStateSignature ?? "legacy",
          parentSendNoteId: noteId,
          vaultOwner: payload.vaultOwner,
        })
      : undefined;

  return {
    changeNoteId,
    instruction: createMemoInstruction(VANTA_SEND_MEMO_PREFIX, {
      ...payload,
      kind: "send",
      noteId,
      changeNoteId,
    } satisfies SendMemoPayload),
    noteId,
    recipientNoteId,
  };
}

export function createPreparedUnshieldMemo(
  payload: Omit<UnshieldMemoPayload, "kind" | "noteId">,
) {
  const noteId = createUnshieldNoteId(payload);

  return {
    instruction: createMemoInstruction(VANTA_UNSHIELD_MEMO_PREFIX, {
      ...payload,
      kind: "unshield",
      noteId,
    } satisfies UnshieldMemoPayload),
    noteId,
  };
}

export function createPreparedSwapMemo(
  payload: Omit<SwapMemoPayload, "kind" | "noteId" | "outputNoteId">,
) {
  const noteId = createSwapNoteId(payload);
  const outputNoteId = createSwapOutputNoteId({
    createdAt: payload.createdAt,
    outputAsset: payload.outputAsset,
    outputAmount: payload.outputAmount,
    owner: payload.owner,
    sourceSwapNoteId: noteId,
  });

  return {
    instruction: createMemoInstruction(VANTA_SWAP_MEMO_PREFIX, {
      ca: payload.createdAt,
      cn: payload.consumedNoteId,
      cs: payload.consumedShieldStateSignature,
      ia: payload.inputAmount,
      ii: payload.inputAsset,
      k: "swap",
      ma: payload.mintAddress,
      ni: noteId,
      oa: payload.outputAmount,
      oi: payload.outputAsset,
      on: outputNoteId,
      ow: payload.owner,
      qe: payload.quoteExpiresAt,
      qi: payload.quoteId,
      qt: payload.quoteTimestamp,
      vf: payload.venueFamily,
      vn: payload.venueName,
      vo: payload.vaultOwner,
      vp: payload.venuePoolAddress,
      vw: payload.venueNetwork,
    } satisfies SwapMemoWirePayload),
    noteId,
    outputNoteId,
  };
}

export function createPreparedSolUnshieldMemo(
  payload: Omit<SolUnshieldMemoPayload, "kind" | "noteId">,
) {
  const noteId = createSolUnshieldNoteId(payload);

  return {
    instruction: createMemoInstruction(VANTA_SOL_UNSHIELD_MEMO_PREFIX, {
      ...payload,
      kind: "sol_unshield",
      noteId,
    } satisfies SolUnshieldMemoPayload),
    noteId,
  };
}

export function createSpentMarkerInstruction(
  payload: Omit<SpentMarkerMemoPayload, "kind" | "markerId">,
): TransactionInstructionInput {
  return createMemoInstruction(VANTA_SPENT_MARKER_MEMO_PREFIX, {
    ...payload,
    kind: "spent_marker",
    markerId: createSpentMarkerId(payload),
  } satisfies SpentMarkerMemoPayload);
}

export function getShieldAccountId(owner: string, mintAddress: string) {
  return `vanta-shield:${owner}:${mintAddress}`;
}

function parseShieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
): VantaShieldNote | null {
  const memoPayload = extractMemoPayload(memo, VANTA_SHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<ShieldMemoPayload>;

    if (
      parsed.kind !== "shield" ||
      !isShieldTokenAsset(parsed.asset) ||
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

    const noteId =
      typeof parsed.noteId === "string"
        ? parsed.noteId
        : createShieldNoteId({
            amount: parsed.amount,
            asset: parsed.asset,
            createdAt: parsed.createdAt,
            depositSignature: parsed.depositSignature,
            mintAddress: parsed.mintAddress,
            owner: parsed.owner,
            vaultOwner: parsed.vaultOwner,
          });

    return {
      amount: parsedAmount,
      asset: parsed.asset,
      createdAt: parsed.createdAt,
      depositSignature: parsed.depositSignature,
      kind: "shield",
      mintAddress: parsed.mintAddress,
      noteId,
      origin: "deposit",
      owner: parsed.owner,
      stateSignature,
      vaultOwner: parsed.vaultOwner,
    };
  } catch {
    return null;
  }
}

function parseSendMemo(
  memo: string | null | undefined,
  stateSignature: string,
): (Omit<VantaSendNote, "consumedNoteId" | "noteId"> & {
  changeNoteId?: string;
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
}) | null {
  const memoPayload = extractMemoPayload(memo, VANTA_SEND_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<SendMemoPayload>;

    if (
      parsed.kind !== "send" ||
      parsed.asset !== "VUSD" ||
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
      asset: "VUSD",
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

function parseSpentMarkerMemo(
  memo: string | null | undefined,
  stateSignature: string,
): VantaSpentMarker | null {
  const memoPayload = extractMemoPayload(memo, VANTA_SPENT_MARKER_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<SpentMarkerMemoPayload>;
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
      (!isShieldTokenAsset(parsed.asset) && parsed.asset !== "SOL") ||
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
              asset: parsed.asset,
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

function parseSolUnshieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
): (Omit<VantaSolUnshieldNote, "noteId"> & { noteId?: string }) | null {
  const memoPayload = extractMemoPayload(memo, VANTA_SOL_UNSHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<SolUnshieldMemoPayload>;

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

function parseUnshieldMemo(
  memo: string | null | undefined,
  stateSignature: string,
): (Omit<VantaUnshieldNote, "consumedNoteId" | "noteId"> & {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
}) | null {
  const memoPayload = extractMemoPayload(memo, VANTA_UNSHIELD_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<UnshieldMemoPayload>;

    if (
      parsed.kind !== "unshield" ||
      !isShieldTokenAsset(parsed.asset) ||
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
      asset: parsed.asset,
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

function parseSwapMemo(
  memo: string | null | undefined,
  stateSignature: string,
): (Omit<VantaSwapNote, "consumedNoteId" | "noteId" | "outputNoteId"> & {
  consumedNoteId?: string;
  consumedShieldStateSignature?: string;
  noteId?: string;
  outputNoteId?: string;
}) | null {
  const memoPayload = extractMemoPayload(memo, VANTA_SWAP_MEMO_PREFIX);

  if (!memoPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(memoPayload) as Partial<SwapMemoPayload & SwapMemoWirePayload>;
    const kind = parsed.kind ?? parsed.k;
    const inputAsset = parsed.inputAsset ?? parsed.ii;
    const outputAsset = parsed.outputAsset ?? parsed.oi;
    const owner = parsed.owner ?? parsed.ow;
    const mintAddress = parsed.mintAddress ?? parsed.ma;
    const vaultOwner = parsed.vaultOwner ?? parsed.vo;
    const inputAmount = parsed.inputAmount ?? parsed.ia;
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
    const venueFamily = parsed.venueFamily ?? parsed.vf;
    const venueName = parsed.venueName ?? parsed.vn;
    const venueNetwork = parsed.venueNetwork ?? parsed.vw;
    const venuePoolAddress = parsed.venuePoolAddress ?? parsed.vp;

    const isSupportedOutputAsset =
      outputAsset === "SOL" || isShieldTokenAsset(outputAsset);

    if (
      kind !== "swap" ||
      inputAsset !== "VUSD" ||
      !isSupportedOutputAsset ||
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
    const parsedOutputAmount = Number(outputAmount);

    if (
      !Number.isFinite(parsedInputAmount) ||
      parsedInputAmount <= 0 ||
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
      inputAsset: "VUSD",
      kind: "swap",
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
      stateSignature,
      vaultOwner,
      venueFamily: venueFamily === "DLMM" ? "DLMM" : undefined,
      venueName: venueName === "Meteora" ? "Meteora" : undefined,
      venueNetwork: venueNetwork === "Devnet" ? "Devnet" : undefined,
      venuePoolAddress:
        typeof venuePoolAddress === "string" ? venuePoolAddress : undefined,
    };
  } catch {
    return null;
  }
}

// v1 note identity stays intentionally minimal:
// explicit note ids are deterministic structured identifiers, not final commitments.
// Spent markers are the first nullifier-style layer: they separate note identity,
// spend transition metadata, and "this note is no longer spendable" semantics.
export async function fetchVantaShieldAccountState(args: {
  client: SolanaClient;
  mintAddress: string;
  owner: string;
  vaultOwner: string;
}) {
  const accountAsset = resolveShieldTokenAssetFromMint(args.mintAddress) ?? "VUSD";
  const ownerAddress = toAddress(args.owner);
  const signatures = await args.client.runtime.rpc
    .getSignaturesForAddress(ownerAddress, {
      commitment: "confirmed",
      limit: 100,
    })
    .send({ abortSignal: AbortSignal.timeout(20_000) });

  const depositShieldNotes = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseShieldMemo(item.memo, item.signature.toString()),
    )
    .filter((note: VantaShieldNote | null): note is VantaShieldNote => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const shieldNotesBySignature = new Map(
    depositShieldNotes.map((note) => [note.stateSignature, note] as const),
  );
  const allShieldNotesById = new Map(
    depositShieldNotes.map((note) => [note.noteId, note] as const),
  );
  const consumedNoteIds = new Set<string>();
  const changeNotesByParentSend = new Map<string, VantaShieldNote>();

  const parsedSendNotes = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseSendMemo(item.memo, item.signature.toString()),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedUnshieldNotes = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseUnshieldMemo(item.memo, item.signature.toString()),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.mintAddress === args.mintAddress &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedSwapNotes = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseSwapMemo(item.memo, item.signature.toString()),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return (
        note !== null &&
        note.owner === args.owner &&
        note.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const parsedSolUnshieldNotes = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseSolUnshieldMemo(item.memo, item.signature.toString()),
    )
    .filter((note): note is NonNullable<typeof note> => {
      return note !== null && note.owner === args.owner && note.vaultOwner === args.vaultOwner;
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const candidateSendNotes = parsedSendNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedSentAmount = Number(note.amount.toFixed(6));
    const roundedChangeAmount = Number(note.changeAmount.toFixed(6));
    const finalizedNoteId =
      note.noteId ??
      createSendNoteId({
        amount: roundedSentAmount.toString(),
        asset: "VUSD",
        changeAmount: roundedChangeAmount.toString(),
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        mintAddress: note.mintAddress,
        owner: note.owner,
        recipient: note.recipient,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedSentAmount,
        changeAmount: roundedChangeAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId: finalizedNoteId,
      } satisfies VantaSendNote,
    ];
  });

  const sendNotesById = new Map(
    candidateSendNotes.map((note) => [note.noteId, note] as const),
  );

  const candidateUnshieldNotes = parsedUnshieldNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedAmount = Number(note.amount.toFixed(6));
    const finalizedNoteId =
      note.noteId ??
      createUnshieldNoteId({
        amount: roundedAmount.toString(),
        asset: note.asset,
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        destinationOwner: note.destinationOwner,
        mintAddress: note.mintAddress,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedAmount,
        consumedNoteId: resolvedConsumedNoteId,
        noteId: finalizedNoteId,
      } satisfies VantaUnshieldNote,
    ];
  });

  const unshieldNotesById = new Map(
    candidateUnshieldNotes.map((note) => [note.noteId, note] as const),
  );

  const candidateSwapNotes = parsedSwapNotes.flatMap((note) => {
    const resolvedConsumedNoteId =
      note.consumedNoteId ??
      (note.consumedShieldStateSignature
        ? shieldNotesBySignature.get(note.consumedShieldStateSignature)?.noteId
        : undefined);

    if (!resolvedConsumedNoteId) {
      return [];
    }

    const roundedInputAmount = Number(note.inputAmount.toFixed(6));
    const roundedOutputAmount = Number(
      note.outputAmount.toFixed(getShieldAssetAmountDecimals(note.outputAsset)),
    );
    const finalizedNoteId =
      note.noteId ??
      createSwapNoteId({
        consumedNoteId: resolvedConsumedNoteId,
        createdAt: note.createdAt,
        inputAmount: roundedInputAmount.toString(),
        inputAsset: "VUSD",
        mintAddress: args.mintAddress,
        outputAmount: roundedOutputAmount.toString(),
        outputAsset: note.outputAsset,
        owner: note.owner,
        quoteId: note.quoteId,
        vaultOwner: note.vaultOwner,
      });
    const finalizedOutputNoteId =
      note.outputNoteId ??
      createSwapOutputNoteId({
        createdAt: note.createdAt,
        outputAsset: note.outputAsset,
        outputAmount: roundedOutputAmount.toString(),
        owner: note.owner,
        sourceSwapNoteId: finalizedNoteId,
      });

    return [
      {
        ...note,
        consumedNoteId: resolvedConsumedNoteId,
        inputAmount: roundedInputAmount,
        noteId: finalizedNoteId,
        outputAmount: roundedOutputAmount,
        outputNoteId: finalizedOutputNoteId,
      } satisfies VantaSwapNote,
    ];
  });

  const swapNotesById = new Map(
    candidateSwapNotes.map((note) => [note.noteId, note] as const),
  );
  const candidateSolUnshieldNotes = parsedSolUnshieldNotes.flatMap((note) => {
    const roundedAmount = Number(note.amount.toFixed(9));
    const finalizedNoteId =
      note.noteId ??
      createSolUnshieldNoteId({
        amount: roundedAmount.toString(),
        asset: "SOL",
        assetId: note.assetId,
        consumedNoteId: note.consumedNoteId,
        createdAt: note.createdAt,
        destinationOwner: note.destinationOwner,
        owner: note.owner,
        vaultOwner: note.vaultOwner,
      });

    return [
      {
        ...note,
        amount: roundedAmount,
        noteId: finalizedNoteId,
      } satisfies VantaSolUnshieldNote,
    ];
  });
  const solUnshieldNotesById = new Map(
    candidateSolUnshieldNotes.map((note) => [note.noteId, note] as const),
  );

  const explicitSpentMarkers = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseSpentMarkerMemo(item.memo, item.signature.toString()),
    )
    .filter((marker: VantaSpentMarker | null): marker is VantaSpentMarker => {
      return (
        marker !== null &&
        marker.owner === args.owner &&
        marker.vaultOwner === args.vaultOwner
      );
    })
    .sort((left, right) => left.createdAt - right.createdAt);

  const legacySpentMarkers = candidateSendNotes
    .filter((sendNote) => {
      return !explicitSpentMarkers.some(
        (marker) =>
          marker.transitionKind === "send" &&
          marker.transitionNoteId === sendNote.noteId,
      );
    })
    .map((sendNote) => {
      return {
        asset: "VUSD",
        assetId: sendNote.mintAddress,
        consumedNoteId: sendNote.consumedNoteId,
        createdAt: sendNote.createdAt,
        kind: "spent_marker" as const,
        markerId: createSpentMarkerId({
          asset: "VUSD",
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
        transitionKind: "send" as const,
        transitionNoteId: sendNote.noteId,
        vaultOwner: sendNote.vaultOwner,
      } satisfies VantaSpentMarker;
    });
  const shieldedSolNotesBySwap = new Map<
    string,
    Omit<VantaShieldedSolNote, "lifecycleStatus">
  >();
  const shieldTokenNotesBySwap = new Map<string, VantaShieldNote>();
  const recipientSelfNotesByParentSend = new Map<string, VantaShieldNote>();
  const consumedSolNoteIds = new Set<string>();

  const shieldSpentMarkers = [...explicitSpentMarkers, ...legacySpentMarkers]
    .filter((marker) => marker.asset !== "SOL")
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

      if (!consumedShieldNote) {
        return [];
      }

      if (consumedNoteIds.has(marker.consumedNoteId)) {
        return [];
      }

      const roundedInputAmount = Number(consumedShieldNote.amount.toFixed(6));

      if (marker.transitionKind === "send") {
        const sendTransition = transition as VantaSendNote;
        const roundedSentAmount = Number(sendTransition.amount.toFixed(6));
        const roundedChangeAmount = Number(sendTransition.changeAmount.toFixed(6));

        if (roundedSentAmount > roundedInputAmount) {
          return [];
        }

        if (
          !amountsMatch(
            Number((roundedSentAmount + roundedChangeAmount).toFixed(6)),
            roundedInputAmount,
          )
        ) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);

        if (roundedChangeAmount <= 0) {
          return [marker];
        }

        const changeNoteId =
          typeof sendTransition.changeNoteId === "string"
            ? sendTransition.changeNoteId
            : createChangeNoteId({
                amount: roundedChangeAmount.toString(),
                createdAt: sendTransition.createdAt,
                mintAddress: sendTransition.mintAddress,
                owner: sendTransition.owner,
                parentNoteId: marker.consumedNoteId,
                parentSendNoteId: sendTransition.noteId,
                vaultOwner: sendTransition.vaultOwner,
              });

        const changeNote = {
          amount: roundedChangeAmount,
          asset: accountAsset,
          createdAt: sendTransition.createdAt,
          depositSignature: sendTransition.stateSignature,
          kind: "shield" as const,
          mintAddress: sendTransition.mintAddress,
          noteId: changeNoteId,
          origin: "change" as const,
          owner: sendTransition.owner,
          parentNoteId: marker.consumedNoteId,
          parentSendNoteId: sendTransition.noteId,
          stateSignature: `${sendTransition.stateSignature}:change`,
          vaultOwner: sendTransition.vaultOwner,
        } satisfies VantaShieldNote;

        changeNotesByParentSend.set(sendTransition.noteId, changeNote);
        allShieldNotesById.set(changeNote.noteId, changeNote);

        if (
          roundedSentAmount > 0 &&
          sendTransition.recipient === sendTransition.owner
        ) {
          const recipientSelfNote = {
            amount: roundedSentAmount,
            asset: accountAsset,
            createdAt: sendTransition.createdAt,
            depositSignature: sendTransition.stateSignature,
            kind: "shield" as const,
            mintAddress: sendTransition.mintAddress,
            noteId: createRecipientSelfNoteId({
              amount: roundedSentAmount.toString(),
              createdAt: sendTransition.createdAt,
              mintAddress: sendTransition.mintAddress,
              owner: sendTransition.owner,
              parentNoteId: marker.consumedNoteId,
              parentSendNoteId: sendTransition.noteId,
              vaultOwner: sendTransition.vaultOwner,
            }),
            origin: "recipient_self" as const,
            owner: sendTransition.owner,
            parentNoteId: marker.consumedNoteId,
            parentSendNoteId: sendTransition.noteId,
            stateSignature: `${sendTransition.stateSignature}:recipient-self`,
            vaultOwner: sendTransition.vaultOwner,
          } satisfies VantaShieldNote;

          recipientSelfNotesByParentSend.set(sendTransition.noteId, recipientSelfNote);
          allShieldNotesById.set(recipientSelfNote.noteId, recipientSelfNote);
        }

        return [marker];
      }

      if (marker.transitionKind === "unshield") {
        const unshieldTransition = transition as VantaUnshieldNote;
        const roundedUnshieldAmount = Number(unshieldTransition.amount.toFixed(6));

        if (!amountsMatch(roundedUnshieldAmount, roundedInputAmount)) {
          return [];
        }

        consumedNoteIds.add(marker.consumedNoteId);

        return [marker];
      }

      const swapTransition = transition as VantaSwapNote;
      const roundedSwapInputAmount = Number(swapTransition.inputAmount.toFixed(6));

      if (!amountsMatch(roundedSwapInputAmount, roundedInputAmount)) {
        return [];
      }

      consumedNoteIds.add(marker.consumedNoteId);
      const roundedSwapOutputAmount = Number(
        swapTransition.outputAmount.toFixed(
          getShieldAssetAmountDecimals(swapTransition.outputAsset),
        ),
      );

      if (swapTransition.outputAsset === "SOL") {
        shieldedSolNotesBySwap.set(swapTransition.noteId, {
          amount: roundedSwapOutputAmount,
          asset: "SOL",
          createdAt: swapTransition.createdAt,
          noteId: swapTransition.outputNoteId,
          owner: swapTransition.owner,
          sourceSwapNoteId: swapTransition.noteId,
          stateSignature: `${swapTransition.stateSignature}:sol-output`,
        });
      } else if (swapTransition.outputAsset === accountAsset) {
        const swapOutputNote = {
          amount: roundedSwapOutputAmount,
          asset: accountAsset,
          createdAt: swapTransition.createdAt,
          depositSignature: swapTransition.stateSignature,
          kind: "shield" as const,
          mintAddress: args.mintAddress,
          noteId: swapTransition.outputNoteId,
          origin: "swap_output" as const,
          owner: swapTransition.owner,
          parentNoteId: marker.consumedNoteId,
          parentSwapNoteId: swapTransition.noteId,
          stateSignature: `${swapTransition.stateSignature}:swap-output`,
          vaultOwner: args.vaultOwner,
        } satisfies VantaShieldNote;

        shieldTokenNotesBySwap.set(swapTransition.noteId, swapOutputNote);
        allShieldNotesById.set(swapOutputNote.noteId, swapOutputNote);
      }

      return [marker];
    });

  const validSendNotes = candidateSendNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "send" && marker.transitionNoteId === note.noteId,
    );
  });
  const validUnshieldNotes = candidateUnshieldNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "unshield" &&
        marker.transitionNoteId === note.noteId,
    );
  });
  const validSwapNotes = candidateSwapNotes.filter((note) => {
    return shieldSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "swap" && marker.transitionNoteId === note.noteId,
    );
  });
  const baseShieldedSolNotes = validSwapNotes
    .map((note) => shieldedSolNotesBySwap.get(note.noteId))
    .filter((note): note is NonNullable<typeof note> => note !== undefined);
  const swapOutputNotes = validSwapNotes
    .map((note) => shieldTokenNotesBySwap.get(note.noteId))
    .filter((note): note is NonNullable<typeof note> => note !== undefined)
    .sort((left, right) => left.createdAt - right.createdAt);

  const solSpentMarkers = explicitSpentMarkers
    .filter((marker) => marker.asset === "SOL")
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      if (marker.transitionKind !== "sol_unshield") {
        return [];
      }

      const transition = solUnshieldNotesById.get(marker.transitionNoteId);
      const consumedNote = baseShieldedSolNotes.find((note) => note.noteId === marker.consumedNoteId);

      if (
        !transition ||
        !consumedNote ||
        transition.consumedNoteId !== marker.consumedNoteId ||
        consumedSolNoteIds.has(marker.consumedNoteId)
      ) {
        return [];
      }

      if (
        !amountsMatch(
          Number(transition.amount.toFixed(9)),
          Number(consumedNote.amount.toFixed(9)),
        )
      ) {
        return [];
      }

      consumedSolNoteIds.add(marker.consumedNoteId);
      return [marker];
    });
  const validSolUnshieldNotes = candidateSolUnshieldNotes.filter((note) => {
    return solSpentMarkers.some(
      (marker) =>
        marker.transitionKind === "sol_unshield" &&
        marker.transitionNoteId === note.noteId,
    );
  });
  const spentMarkers = [...shieldSpentMarkers, ...solSpentMarkers].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const spentMarkerByConsumedNoteId = new Map(
    spentMarkers.map((marker) => [marker.consumedNoteId, marker] as const),
  );
  const transitionByConsumedNoteId = new Map(
    [
      ...validSendNotes,
      ...validUnshieldNotes,
      ...validSwapNotes,
      ...validSolUnshieldNotes,
    ].map((transition) => [transition.consumedNoteId, transition] as const),
  );

  const changeNotes = [...changeNotesByParentSend.values()].sort((left, right) => {
    return left.createdAt - right.createdAt;
  });
  const recipientSelfNotes = [...recipientSelfNotesByParentSend.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const shieldNotes = [...depositShieldNotes, ...changeNotes, ...recipientSelfNotes, ...swapOutputNotes].sort(
    (left, right) => {
      return left.createdAt - right.createdAt;
    },
  );
  const spentShieldNotes = shieldNotes.filter((note) => {
    return consumedNoteIds.has(note.noteId);
  });
  const spendableShieldNotes = shieldNotes.filter((note) => {
    // Once a note already has a constrained transition recorded on-chain,
    // keep it out of the spendable set even before the spent marker lands.
    // This avoids presenting notes as reusable when swap/send/unshield has
    // already reserved them and the UI is just waiting on finalization.
    return (
      !consumedNoteIds.has(note.noteId) && !transitionByConsumedNoteId.has(note.noteId)
    );
  });
  const shieldedSolNotes = baseShieldedSolNotes
    .map((note) => {
      const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
      const consumingTransition = transitionByConsumedNoteId.get(note.noteId);

      return {
        ...note,
        consumedByTransitionId:
          consumingTransition?.kind === "sol_unshield" ? consumingTransition.noteId : undefined,
        consumedByTransitionKind:
          consumingTransition?.kind === "sol_unshield" ? "sol_unshield" : undefined,
        lifecycleStatus: spentMarker ? "consumed" : "spendable",
        spentMarkerId: spentMarker?.markerId,
      } satisfies VantaShieldedSolNote;
    })
    .sort((left, right) => right.createdAt - left.createdAt);
  const pendingSolUnshieldByConsumedNoteId = new Set(
    candidateSolUnshieldNotes.map((note) => note.consumedNoteId),
  );
  const spendableShieldedSolNotes = shieldedSolNotes.filter((note) => {
    return (
      note.lifecycleStatus === "spendable" &&
      !transitionByConsumedNoteId.has(note.noteId) &&
      !pendingSolUnshieldByConsumedNoteId.has(note.noteId)
    );
  });
  const consumedShieldedSolNotes = shieldedSolNotes.filter((note) => {
    return note.lifecycleStatus === "consumed";
  });
  const activity = [
    ...shieldNotes,
    ...validSendNotes,
    ...validSwapNotes,
    ...validUnshieldNotes,
    ...validSolUnshieldNotes,
    ...spentMarkers,
  ].sort((left, right) => left.createdAt - right.createdAt);
  const noteStates = [...shieldNotes]
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((note) => {
      const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
      const consumingTransition = transitionByConsumedNoteId.get(note.noteId);

      return {
        amount: note.amount,
        asset: note.asset,
        consumedByTransitionId: consumingTransition?.noteId,
        consumedByTransitionKind: consumingTransition?.kind,
        createdAt: note.createdAt,
        lifecycleStatus: spentMarker ? "consumed" : "spendable",
        noteId: note.noteId,
        parentNoteId: note.parentNoteId,
        parentSendNoteId: note.parentSendNoteId,
        sourceType:
          note.origin === "change"
            ? "change_derived"
            : note.origin === "swap_output"
              ? "swap_derived"
              : "deposit",
        spentMarkerId: spentMarker?.markerId,
        stateSignature: note.stateSignature,
      } satisfies VantaAppNoteState;
    });
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    swapDerived: noteStates.filter((note) => note.sourceType === "swap_derived").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    total: noteStates.length,
  } satisfies VantaNoteStatusSummary;
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );
  const shieldedSolBalance = Number(
    spendableShieldedSolNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(9),
  );
  const lifecycleActivities = deriveLifecycleActivities({
    changeNotes,
    sendNotes: validSendNotes,
    shieldNotes,
    solUnshieldNotes: validSolUnshieldNotes,
    swapOutputNotes,
    swapNotes: validSwapNotes,
    unshieldNotes: validUnshieldNotes,
  });

  return {
    accountId: getShieldAccountId(args.owner, args.mintAddress),
    activity,
    asset: accountAsset,
    balance,
    changeNotes,
    lifecycleActivities,
    mintAddress: args.mintAddress,
    noteStates,
    noteStatusSummary,
    owner: args.owner,
    sendNotes: validSendNotes,
    shieldNotes,
    consumedShieldedSolNotes,
    shieldedSolBalance,
    shieldedSolNotes,
    solUnshieldNotes: validSolUnshieldNotes,
    source: "vanta_onchain_notes",
    spendableShieldedSolNotes,
    spendableShieldNotes,
    spentMarkers,
    spentShieldNotes,
    status: "ready",
    swapNotes: validSwapNotes,
    unshieldNotes: validUnshieldNotes,
    vaultOwner: args.vaultOwner,
  } satisfies VantaShieldAccountState;
}

function deriveLifecycleActivities(args: {
  changeNotes: VantaShieldNote[];
  sendNotes: VantaSendNote[];
  shieldNotes: VantaShieldNote[];
  solUnshieldNotes: VantaSolUnshieldNote[];
  swapOutputNotes: VantaShieldNote[];
  swapNotes: VantaSwapNote[];
  unshieldNotes: VantaUnshieldNote[];
}) {
  const shieldActivities = args.shieldNotes
    .filter((note) => note.origin === "deposit")
    .map((note) => {
      return {
        amount: note.amount,
        createdAt: note.createdAt,
        description: `Moved ${formatShieldTokenAmount(note.asset, note.amount)} out of Public Wallet and into Vanta's shielded state.`,
        noteId: note.noteId,
        sourceState: "Public Wallet",
        targetState: "Shielded State",
        title: "Shield",
        type: "shield",
        impact: "public_to_shielded",
      } satisfies VantaLifecycleActivity;
    });

  const sendActivities = args.sendNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description:
        note.changeAmount > 0
          ? `Sent ${note.amount.toFixed(2)} VUSD from shielded state and preserved ${note.changeAmount.toFixed(2)} VUSD as a new change note.`
          : `Sent ${note.amount.toFixed(2)} VUSD from shielded state with no shielded value left over.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Send",
      type: "send",
      impact: "shielded_transfer",
    } satisfies VantaLifecycleActivity;
  });

  const changeActivities = args.changeNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description: `Created a new spendable change note for ${note.amount.toFixed(2)} VUSD after a partial send.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Change Note Created",
      type: "change_note_created",
      impact: "shielded_to_shielded",
    } satisfies VantaLifecycleActivity;
  });

  const swapOutputActivities = args.swapOutputNotes.map((note) => {
    return {
      amount: note.amount,
      amountLabel: formatShieldTokenAmount(note.asset, note.amount),
      createdAt: note.createdAt,
      description: `Created a new spendable ${note.asset} swap output note inside shielded state.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Swap Output Created",
      type: "swap_output_created",
      impact: "shielded_to_shielded",
    } satisfies VantaLifecycleActivity;
  });

  const swapActivities = args.swapNotes.map((note) => {
    const venueSuffix =
      note.venueName && note.venueFamily
        ? ` via ${note.venueName} ${note.venueFamily} on devnet.`
        : ".";
    const outputLabel =
      note.outputAsset === "SOL"
        ? `${note.outputAmount.toFixed(4)} SOL`
        : formatShieldTokenAmount(note.outputAsset, note.outputAmount);

    return {
      amount: note.inputAmount,
      amountLabel: `${note.inputAmount.toFixed(2)} VUSD -> ${outputLabel}`,
      createdAt: note.createdAt,
      description: `Swapped ${note.inputAmount.toFixed(2)} VUSD into ${outputLabel} inside Vanta's constrained shielded lifecycle${venueSuffix}`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Shielded State",
      title: "Swap",
      type: "swap",
      impact: "shielded_swap",
    } satisfies VantaLifecycleActivity;
  });

  const unshieldActivities = args.unshieldNotes.map((note) => {
    return {
      amount: note.amount,
      createdAt: note.createdAt,
      description: `Returned ${formatShieldTokenAmount(note.asset, note.amount)} from shielded state back into Public Wallet through the operator release path.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Public Wallet",
      title: "Unshield",
      type: "unshield",
      impact: "shielded_to_public",
    } satisfies VantaLifecycleActivity;
  });

  const solUnshieldActivities = args.solUnshieldNotes.map((note) => {
    return {
      amount: note.amount,
      amountLabel: `${note.amount.toFixed(4)} SOL`,
      createdAt: note.createdAt,
      description: `Returned ${note.amount.toFixed(4)} SOL from shielded state back into Public Wallet through the constrained operator-backed SOL exit.`,
      noteId: note.noteId,
      sourceState: "Shielded State",
      targetState: "Public Wallet",
      title: "Unshield SOL",
      type: "sol_unshield",
      impact: "shielded_to_public",
    } satisfies VantaLifecycleActivity;
  });

  return [
    ...shieldActivities,
    ...sendActivities,
    ...changeActivities,
    ...swapOutputActivities,
    ...swapActivities,
    ...unshieldActivities,
    ...solUnshieldActivities,
  ].sort((left, right) => right.createdAt - left.createdAt);
}
