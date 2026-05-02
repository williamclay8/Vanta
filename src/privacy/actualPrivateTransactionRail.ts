import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { poseidon2, poseidon6, poseidon11 } from "poseidon-lite";

export const VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION =
  "vanta-actual-private-transaction-rail-0.1" as const;

export const VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS = [
  "10",
  "25",
  "100",
  "500",
  "1000",
] as const;

export type VantaActualPrivateTransactionDenomination =
  (typeof VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS)[number];

export type VantaActualPrivateDepositPublicTranscript = {
  assetCohort: "stablecoin-usdc-v1" | "stablecoin-usdc-v1";
  commitment: string;
  denomination: VantaActualPrivateTransactionDenomination;
  leafIndex: number;
  poolAddress: string;
  poolEpoch: string;
  rootAfterAppend: string;
  sourceFundingAddress: string;
  transactionSignature: string;
  version: typeof VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION;
};

export type VantaActualPrivateSpendPublicTranscript = {
  acceptedRoot: string;
  assetCohort: "stablecoin-usdc-v1" | "stablecoin-usdc-v1";
  nullifier: string;
  outputCommitments: readonly [string, string];
  proofPublicInputHash: string;
  proofSystem: "noir-ultrahonk-bn254";
  receiptCommitment: string;
  relayerFeePayer: string;
  relayerId: string;
  settlementEpoch: string;
  version: typeof VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION;
};

export type VantaActualPrivateSettlementSecretPacket = {
  changeNoteSecret: string | null;
  inputCommitment: string;
  inputLeafIndex: number;
  merchantDisclosureKey: string;
  merchantSettlementAddress: string;
  noteSecret: string;
  payerSourceWallet: string;
  rawAmountBaseUnits: string;
};

export type VantaActualPrivateTransactionScenario = {
  depositPublicTranscript: VantaActualPrivateDepositPublicTranscript;
  secretPacket: VantaActualPrivateSettlementSecretPacket;
  spendPublicTranscript: VantaActualPrivateSpendPublicTranscript;
};

export type VantaActualPrivateTransactionLeakageFinding = {
  field: string;
  reason: string;
  value: string;
};

export type VantaActualPrivateTransactionAnalysis = {
  blockers: readonly string[];
  depositIsPublicByDesign: true;
  fixedDenomination: boolean;
  leakageFindings: readonly VantaActualPrivateTransactionLeakageFinding[];
  relayerSeparated: boolean;
  spendTranscriptPrivateEnoughForMvp: boolean;
  version: typeof VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION;
};

export type VantaActualPrivateTransactionAnalysisOptions = {
  arbitraryExactAmountBaseUnits?: string | null;
  attackerVisibleSpendRequest?: unknown;
  plaintextMemo?: string | null;
};

const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function hashTerm(...parts: readonly string[]) {
  return `0x${bytesToHex(sha256(new TextEncoder().encode(parts.join("\u001f"))))}`;
}

function fieldFromTerm(...parts: readonly string[]) {
  return BigInt(hashTerm(...parts)) % BN254_SCALAR_FIELD;
}

function fieldString(value: bigint) {
  return value.toString(10);
}

function directionBitsForLeafIndex(leafIndex: number): readonly [bigint, bigint, bigint] {
  return [
    BigInt(leafIndex & 1),
    BigInt((leafIndex >> 1) & 1),
    BigInt((leafIndex >> 2) & 1),
  ] as const;
}

export function computeVantaActualPrivateSpendPublicInputHash({
  acceptedRoot,
  assetCohort,
  contextHash,
  inputCommitment,
  inputLeafIndex,
  nullifier,
  outputCommitments,
  poolId,
  requestVersion = "vanta-private-pool-v2-actual-private-spend-proof-request-0.1",
}: {
  acceptedRoot: string;
  assetCohort: string;
  contextHash: string;
  inputCommitment: string;
  inputLeafIndex: number;
  nullifier: string;
  outputCommitments: readonly [string, string];
  poolId: string;
  requestVersion?: string;
}) {
  const directionBits = directionBitsForLeafIndex(inputLeafIndex);
  const outputCommitment0 = fieldFromTerm("actual-private-output-commitment-0", outputCommitments[0]);
  const outputCommitment1 = fieldFromTerm("actual-private-output-commitment-1", outputCommitments[1]);
  const outputCommitmentHash = poseidon2([outputCommitment0, outputCommitment1]);
  const membershipBinding = poseidon6([
    fieldFromTerm("actual-private-accepted-root", acceptedRoot),
    fieldFromTerm("actual-private-input-commitment", inputCommitment),
    BigInt(inputLeafIndex),
    directionBits[0],
    directionBits[1],
    directionBits[2],
  ]);

  return fieldString(
    poseidon11([
      fieldFromTerm("actual-private-request-version", requestVersion),
      fieldFromTerm("actual-private-pool-id", poolId),
      fieldFromTerm("actual-private-asset-cohort", assetCohort),
      membershipBinding,
      fieldFromTerm("actual-private-nullifier", nullifier),
      outputCommitmentHash,
      fieldFromTerm("actual-private-context-hash", contextHash),
      outputCommitment0,
      outputCommitment1,
      fieldFromTerm("actual-private-accepted-root", acceptedRoot),
      BigInt(inputLeafIndex),
    ]),
  );
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`Actual private transaction rail requires ${fieldName}.`);
  }

  return value.trim();
}

function assertSupportedDenomination(
  value: string,
): asserts value is VantaActualPrivateTransactionDenomination {
  if (!VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS.includes(
    value as VantaActualPrivateTransactionDenomination,
  )) {
    throw new Error(
      `Actual private transaction rail requires a supported fixed denomination, received ${value}.`,
    );
  }
}

function containsValue(serialized: string, value: string) {
  return value.trim().length > 0 && serialized.includes(value);
}

function stringifyAttackerVisibleSurface(value: unknown) {
  return JSON.stringify(value, (_, item) =>
    typeof item === "bigint" ? item.toString() : item,
  ) ?? "";
}

function collectLeakageFindings({
  fieldPrefix,
  serialized,
  secretValues,
}: {
  fieldPrefix: string;
  serialized: string;
  secretValues: readonly (readonly [string, string])[];
}) {
  return secretValues.flatMap(([field, value]) =>
    containsValue(serialized, value)
      ? [{
          field: `${fieldPrefix}.${field}`,
          reason: "attacker-visible private spend surface contains secret/linking value",
          value,
        }]
      : [],
  );
}

export function createVantaActualPrivateTransactionScenario({
  assetCohort = "stablecoin-usdc-v1",
  denomination = "100",
  merchantSettlementAddress = "merchant-public-settlement-address",
  payerSourceWallet = "payer-public-funding-wallet",
  poolAddress = "vanta-shared-stablecoin-pool",
  relayerFeePayer = "vanta-independent-relayer-fee-payer",
  relayerId = "vanta-relayer-1",
}: {
  assetCohort?: VantaActualPrivateDepositPublicTranscript["assetCohort"];
  denomination?: VantaActualPrivateTransactionDenomination;
  merchantSettlementAddress?: string;
  payerSourceWallet?: string;
  poolAddress?: string;
  relayerFeePayer?: string;
  relayerId?: string;
} = {}): VantaActualPrivateTransactionScenario {
  assertSupportedDenomination(denomination);

  const normalizedPayer = requireNonEmpty(payerSourceWallet, "payerSourceWallet");
  const normalizedMerchant = requireNonEmpty(merchantSettlementAddress, "merchantSettlementAddress");
  const normalizedPool = requireNonEmpty(poolAddress, "poolAddress");
  const normalizedRelayerFeePayer = requireNonEmpty(relayerFeePayer, "relayerFeePayer");
  const normalizedRelayerId = requireNonEmpty(relayerId, "relayerId");
  const poolEpoch = "epoch:deposit-batch-000001";
  const settlementEpoch = "epoch:settlement-batch-000042";
  const noteSecret = hashTerm("note-secret", normalizedPayer, denomination, poolEpoch);
  const changeNoteSecret = hashTerm("change-note-secret", normalizedPayer, denomination, settlementEpoch);
  const inputCommitment = hashTerm("note-commitment", noteSecret, assetCohort, denomination);
  const acceptedRoot = hashTerm("pool-root", assetCohort, poolEpoch, inputCommitment);
  const nullifier = hashTerm("nullifier", noteSecret, settlementEpoch);
  const merchantOutputCommitment = hashTerm(
    "merchant-output-commitment",
    normalizedMerchant,
    denomination,
    settlementEpoch,
  );
  const changeOutputCommitment = hashTerm(
    "change-output-commitment",
    changeNoteSecret,
    settlementEpoch,
  );
  const receiptCommitment = hashTerm(
    "receipt-commitment",
    merchantOutputCommitment,
    nullifier,
    settlementEpoch,
  );
  const proofPublicInputHash = computeVantaActualPrivateSpendPublicInputHash({
    acceptedRoot,
    assetCohort,
    contextHash: receiptCommitment,
    inputCommitment,
    inputLeafIndex: 18,
    nullifier,
    outputCommitments: [merchantOutputCommitment, changeOutputCommitment],
    poolId: "pool:stablecoin-usdc-v1:100",
  });

  return {
    depositPublicTranscript: {
      assetCohort,
      commitment: inputCommitment,
      denomination,
      leafIndex: 18,
      poolAddress: normalizedPool,
      poolEpoch,
      rootAfterAppend: acceptedRoot,
      sourceFundingAddress: normalizedPayer,
      transactionSignature: hashTerm("deposit-signature", normalizedPayer, inputCommitment),
      version: VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION,
    },
    secretPacket: {
      changeNoteSecret,
      inputCommitment,
      inputLeafIndex: 18,
      merchantDisclosureKey: hashTerm("merchant-disclosure-key", normalizedMerchant),
      merchantSettlementAddress: normalizedMerchant,
      noteSecret,
      payerSourceWallet: normalizedPayer,
      rawAmountBaseUnits: `${denomination}000000`,
    },
    spendPublicTranscript: {
      acceptedRoot,
      assetCohort,
      nullifier,
      outputCommitments: [merchantOutputCommitment, changeOutputCommitment],
      proofPublicInputHash,
      proofSystem: "noir-ultrahonk-bn254",
      receiptCommitment,
      relayerFeePayer: normalizedRelayerFeePayer,
      relayerId: normalizedRelayerId,
      settlementEpoch,
      version: VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION,
    },
  };
}

export function analyzeVantaActualPrivateTransactionScenario(
  scenario: VantaActualPrivateTransactionScenario,
  options: VantaActualPrivateTransactionAnalysisOptions = {},
): VantaActualPrivateTransactionAnalysis {
  const spendSerialized = stringifyAttackerVisibleSurface(scenario.spendPublicTranscript);
  const requestSerialized = stringifyAttackerVisibleSurface(options.attackerVisibleSpendRequest ?? {});
  const memoSerialized = options.plaintextMemo ?? "";
  const arbitraryExactAmountBaseUnits = options.arbitraryExactAmountBaseUnits ?? "";
  const secretValues = [
    ["payerSourceWallet", scenario.secretPacket.payerSourceWallet],
    ["merchantSettlementAddress", scenario.secretPacket.merchantSettlementAddress],
    ["rawAmountBaseUnits", scenario.secretPacket.rawAmountBaseUnits],
    ["noteSecret", scenario.secretPacket.noteSecret],
    ["changeNoteSecret", scenario.secretPacket.changeNoteSecret ?? ""],
    ["inputCommitment", scenario.secretPacket.inputCommitment],
    ["depositSignature", scenario.depositPublicTranscript.transactionSignature],
    ["arbitraryExactAmountBaseUnits", arbitraryExactAmountBaseUnits],
  ] as const;
  const leakageFindings: VantaActualPrivateTransactionLeakageFinding[] = [
    ...collectLeakageFindings({
      fieldPrefix: "spendPublicTranscript",
      secretValues,
      serialized: spendSerialized,
    }),
    ...collectLeakageFindings({
      fieldPrefix: "attackerVisibleSpendRequest",
      secretValues,
      serialized: requestSerialized,
    }),
    ...collectLeakageFindings({
      fieldPrefix: "plaintextMemo",
      secretValues,
      serialized: memoSerialized,
    }),
  ];
  const forbiddenRequestLabels = [
    "source-wallet:",
    "sourceWallet",
    "merchant-address:",
    "merchantAddress",
    "destination:",
    "destinationAddress",
    "amount:",
    "rawAmount",
    "noteSecret",
    "input-commitment:",
    "inputCommitment",
    "leaf-index:",
    "inputLeafIndex",
    "depositSignature",
    "memo:",
  ] as const;
  leakageFindings.push(
    ...forbiddenRequestLabels.flatMap((label) =>
      requestSerialized.includes(label)
        ? [{
            field: `attackerVisibleSpendRequest.${label}`,
            reason: "attacker-visible private spend request contains a linkable field label",
            value: label,
          }]
        : [],
    ),
  );
  if (memoSerialized.trim()) {
    leakageFindings.push({
      field: "plaintextMemo",
      reason: "attacker-visible private spend surface contains a plaintext memo",
      value: memoSerialized,
    });
  }
  if (Object.prototype.hasOwnProperty.call(scenario.spendPublicTranscript, "inputLeafIndex")) {
    leakageFindings.push({
      field: "inputLeafIndex",
      reason: "private spend public transcript contains input leaf index field",
      value: String(scenario.secretPacket.inputLeafIndex),
    });
  }
  if (Object.prototype.hasOwnProperty.call(scenario.spendPublicTranscript, "inputCommitment")) {
    leakageFindings.push({
      field: "inputCommitment",
      reason: "private spend public transcript contains input commitment field",
      value: scenario.secretPacket.inputCommitment,
    });
  }
  const relayerSeparated =
    scenario.spendPublicTranscript.relayerFeePayer !== scenario.secretPacket.payerSourceWallet;
  const fixedDenomination = VANTA_ACTUAL_PRIVATE_TRANSACTION_DENOMINATIONS.includes(
    scenario.depositPublicTranscript.denomination,
  );
  const blockers = [
    ...(!relayerSeparated ? ["relayer-fee-payer-matches-source-wallet"] : []),
    ...(!fixedDenomination ? ["unsupported-or-exact-custom-amount"] : []),
    ...(leakageFindings.length > 0 ? ["spend-transcript-leaks-private-linkage"] : []),
  ];

  return {
    blockers,
    depositIsPublicByDesign: true,
    fixedDenomination,
    leakageFindings,
    relayerSeparated,
    spendTranscriptPrivateEnoughForMvp: blockers.length === 0,
    version: VANTA_ACTUAL_PRIVATE_TRANSACTION_RAIL_VERSION,
  };
}

export class VantaActualPrivateNullifierSet {
  #seen = new Set<string>();

  accept(nullifier: string) {
    const normalized = requireNonEmpty(nullifier, "nullifier");
    if (this.#seen.has(normalized)) {
      throw new Error(`Actual private transaction nullifier replay rejected: ${normalized}.`);
    }
    this.#seen.add(normalized);
    return { accepted: true as const, nullifier: normalized };
  }

  has(nullifier: string) {
    return this.#seen.has(nullifier);
  }
}
