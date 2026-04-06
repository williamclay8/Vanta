import {
  toAddress,
  type SolanaClient,
  type TransactionInstructionInput,
} from "@solana/client";

export const VANTA_SHIELD_MEMO_PROGRAM =
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const VANTA_SHIELD_MEMO_PREFIX = "vanta:shield-note:v1:";
const VANTA_SEND_MEMO_PREFIX = "vanta:send-note:v1:";
const VANTA_UNSHIELD_MEMO_PREFIX = "vanta:unshield-note:v1:";
const VANTA_SPENT_MARKER_MEMO_PREFIX = "vanta:spent-marker:v1:";

type BaseVantaNote = {
  amount: number;
  asset: "VUSD";
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
  origin: "deposit" | "change";
  parentNoteId?: string;
  parentSendNoteId?: string;
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

export type VantaTransitionKind = VantaSendNote["kind"] | VantaUnshieldNote["kind"];

export type VantaSpentMarker = {
  asset: "VUSD";
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId: string;
  mintAddress: string;
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
  | VantaSpentMarker;

export type VantaNoteLifecycleStatus = "spendable" | "consumed";

export type VantaAppNoteState = {
  amount: number;
  consumedByTransitionId?: string;
  consumedByTransitionKind?: VantaTransitionKind;
  createdAt: number;
  lifecycleStatus: VantaNoteLifecycleStatus;
  noteId: string;
  parentNoteId?: string;
  parentSendNoteId?: string;
  sourceType: "deposit" | "change_derived";
  spentMarkerId?: string;
  stateSignature: string;
};

export type VantaNoteStatusSummary = {
  changeDerived: number;
  consumed: number;
  spendable: number;
  total: number;
};

export type VantaShieldAccountState = {
  accountId: string;
  activity: VantaShieldActivity[];
  asset: "VUSD";
  balance: number;
  changeNotes: VantaShieldNote[];
  mintAddress: string;
  noteStates: VantaAppNoteState[];
  noteStatusSummary: VantaNoteStatusSummary;
  owner: string;
  sendNotes: VantaSendNote[];
  shieldNotes: VantaShieldNote[];
  source: "vanta_onchain_notes";
  spendableShieldNotes: VantaShieldNote[];
  spentMarkers: VantaSpentMarker[];
  spentShieldNotes: VantaShieldNote[];
  status: "ready";
  unshieldNotes: VantaUnshieldNote[];
  vaultOwner: string;
};

type ShieldMemoPayload = {
  amount: string;
  asset: "VUSD";
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
  asset: "VUSD";
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

type SpentMarkerMemoPayload = {
  asset: "VUSD";
  consumedNoteId: string;
  createdAt: number;
  kind: "spent_marker";
  markerId?: string;
  mintAddress: string;
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

function createSpentMarkerId(
  payload: Omit<SpentMarkerMemoPayload, "kind" | "markerId">,
) {
  return createDeterministicNoteId({
    asset: payload.asset,
    consumedNoteId: payload.consumedNoteId,
    createdAt: payload.createdAt,
    kind: "spent_marker",
    mintAddress: payload.mintAddress,
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
      parsed.asset !== "VUSD" ||
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
            asset: "VUSD",
            createdAt: parsed.createdAt,
            depositSignature: parsed.depositSignature,
            mintAddress: parsed.mintAddress,
            owner: parsed.owner,
            vaultOwner: parsed.vaultOwner,
          });

    return {
      amount: parsedAmount,
      asset: "VUSD",
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

    if (
      parsed.kind !== "spent_marker" ||
      parsed.asset !== "VUSD" ||
      typeof parsed.owner !== "string" ||
      typeof parsed.mintAddress !== "string" ||
      typeof parsed.vaultOwner !== "string" ||
      typeof parsed.consumedNoteId !== "string" ||
      typeof parsed.createdAt !== "number"
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
      parsed.transitionKind === "send" || parsed.transitionKind === "unshield"
        ? parsed.transitionKind
        : typeof parsed.sendNoteId === "string"
          ? "send"
          : undefined;

    if (!transitionNoteId || !transitionKind) {
      return null;
    }

    return {
      asset: "VUSD",
      consumedNoteId: parsed.consumedNoteId,
      createdAt: parsed.createdAt,
      kind: "spent_marker",
      markerId:
        typeof parsed.markerId === "string"
          ? parsed.markerId
          : createSpentMarkerId({
              asset: "VUSD",
              consumedNoteId: parsed.consumedNoteId,
              createdAt: parsed.createdAt,
              mintAddress: parsed.mintAddress,
              owner: parsed.owner,
              transitionNoteId,
              transitionKind,
              vaultOwner: parsed.vaultOwner,
            }),
      mintAddress: parsed.mintAddress,
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
      parsed.asset !== "VUSD" ||
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
      asset: "VUSD",
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
        asset: "VUSD",
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

  const explicitSpentMarkers = signatures
    .filter((item: (typeof signatures)[number]) => item.err === null)
    .map((item: (typeof signatures)[number]) =>
      parseSpentMarkerMemo(item.memo, item.signature.toString()),
    )
    .filter((marker: VantaSpentMarker | null): marker is VantaSpentMarker => {
      return (
        marker !== null &&
        marker.owner === args.owner &&
        marker.mintAddress === args.mintAddress &&
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
        consumedNoteId: sendNote.consumedNoteId,
        createdAt: sendNote.createdAt,
        kind: "spent_marker" as const,
        markerId: createSpentMarkerId({
          asset: "VUSD",
          consumedNoteId: sendNote.consumedNoteId,
          createdAt: sendNote.createdAt,
          mintAddress: sendNote.mintAddress,
          owner: sendNote.owner,
          transitionKind: "send",
          transitionNoteId: sendNote.noteId,
          vaultOwner: sendNote.vaultOwner,
        }),
        mintAddress: sendNote.mintAddress,
        owner: sendNote.owner,
        stateSignature: `${sendNote.stateSignature}:legacy-spent`,
        transitionKind: "send" as const,
        transitionNoteId: sendNote.noteId,
        vaultOwner: sendNote.vaultOwner,
      } satisfies VantaSpentMarker;
    });

  const spentMarkers = [...explicitSpentMarkers, ...legacySpentMarkers]
    .sort((left, right) => left.createdAt - right.createdAt)
    .flatMap((marker) => {
      const transition =
        marker.transitionKind === "send"
          ? sendNotesById.get(marker.transitionNoteId)
          : unshieldNotesById.get(marker.transitionNoteId);

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
          asset: "VUSD" as const,
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

        return [marker];
      }

      const unshieldTransition = transition as VantaUnshieldNote;
      const roundedUnshieldAmount = Number(unshieldTransition.amount.toFixed(6));

      if (!amountsMatch(roundedUnshieldAmount, roundedInputAmount)) {
        return [];
      }

      consumedNoteIds.add(marker.consumedNoteId);

      return [marker];
    });

  const validSendNotes = candidateSendNotes.filter((note) => {
    return spentMarkers.some(
      (marker) =>
        marker.transitionKind === "send" && marker.transitionNoteId === note.noteId,
    );
  });
  const validUnshieldNotes = candidateUnshieldNotes.filter((note) => {
    return spentMarkers.some(
      (marker) =>
        marker.transitionKind === "unshield" &&
        marker.transitionNoteId === note.noteId,
    );
  });
  const spentMarkerByConsumedNoteId = new Map(
    spentMarkers.map((marker) => [marker.consumedNoteId, marker] as const),
  );
  const transitionByConsumedNoteId = new Map(
    [...validSendNotes, ...validUnshieldNotes].map((transition) => [
      transition.consumedNoteId,
      transition,
    ] as const),
  );

  const changeNotes = [...changeNotesByParentSend.values()].sort((left, right) => {
    return left.createdAt - right.createdAt;
  });
  const shieldNotes = [...depositShieldNotes, ...changeNotes].sort((left, right) => {
    return left.createdAt - right.createdAt;
  });
  const spentShieldNotes = shieldNotes.filter((note) => {
    return consumedNoteIds.has(note.noteId);
  });
  const spendableShieldNotes = shieldNotes.filter((note) => {
    return !consumedNoteIds.has(note.noteId);
  });
  const activity = [
    ...shieldNotes,
    ...validSendNotes,
    ...validUnshieldNotes,
    ...spentMarkers,
  ].sort((left, right) => left.createdAt - right.createdAt);
  const noteStates = [...shieldNotes]
    .sort((left, right) => right.createdAt - left.createdAt)
    .map((note) => {
      const spentMarker = spentMarkerByConsumedNoteId.get(note.noteId);
      const consumingTransition = transitionByConsumedNoteId.get(note.noteId);

      return {
        amount: note.amount,
        consumedByTransitionId: consumingTransition?.noteId,
        consumedByTransitionKind: consumingTransition?.kind,
        createdAt: note.createdAt,
        lifecycleStatus: spentMarker ? "consumed" : "spendable",
        noteId: note.noteId,
        parentNoteId: note.parentNoteId,
        parentSendNoteId: note.parentSendNoteId,
        sourceType: note.origin === "change" ? "change_derived" : "deposit",
        spentMarkerId: spentMarker?.markerId,
        stateSignature: note.stateSignature,
      } satisfies VantaAppNoteState;
    });
  const noteStatusSummary = {
    changeDerived: noteStates.filter((note) => note.sourceType === "change_derived").length,
    consumed: noteStates.filter((note) => note.lifecycleStatus === "consumed").length,
    spendable: noteStates.filter((note) => note.lifecycleStatus === "spendable").length,
    total: noteStates.length,
  } satisfies VantaNoteStatusSummary;
  const balance = Number(
    spendableShieldNotes.reduce((sum, note) => sum + note.amount, 0).toFixed(6),
  );

  return {
    accountId: getShieldAccountId(args.owner, args.mintAddress),
    activity,
    asset: "VUSD",
    balance,
    changeNotes,
    mintAddress: args.mintAddress,
    noteStates,
    noteStatusSummary,
    owner: args.owner,
    sendNotes: validSendNotes,
    shieldNotes,
    source: "vanta_onchain_notes",
    spendableShieldNotes,
    spentMarkers,
    spentShieldNotes,
    status: "ready",
    unshieldNotes: validUnshieldNotes,
    vaultOwner: args.vaultOwner,
  } satisfies VantaShieldAccountState;
}
