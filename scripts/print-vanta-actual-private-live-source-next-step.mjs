import { readFileSync } from "node:fs";

const evidencePath = new URL("../ops/mainnet/actual-private-mainnet-settlement.evidence.json", import.meta.url);
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));

const spendAccounts = evidence.mainnetSpendProgramEvidence ?? {};

const LIVE_PLAN_TERM_ENVS = [
  "VANTA_ACTUAL_PRIVATE_ACCEPTED_ROOT",
  "VANTA_ACTUAL_PRIVATE_ASSET_COHORT",
  "VANTA_ACTUAL_PRIVATE_ASSET_ID_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_ECONOMICS_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_NULLIFIER",
  "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_OWNER_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_POOL_ID",
  "VANTA_ACTUAL_PRIVATE_SPEND_CONTEXT_HASH",
  "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH",
  "VANTA_ACTUAL_PRIVATE_ROUTE_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_SETTLEMENT_COMMITMENT",
  "VANTA_ACTUAL_PRIVATE_SETTLEMENT_ID",
];

const OPTIONAL_LIVE_PLAN_TERM_ENVS = [
  "VANTA_ACTUAL_PRIVATE_CHANGE_LEAF_INDEX",
  "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_ROOT",
  "VANTA_ACTUAL_PRIVATE_OUTPUT_LEAF_INDEX",
  "VANTA_ACTUAL_PRIVATE_OUTPUT_ROOT",
];

const RELAYER_TRANSACTION_INPUT_ENVS = [
  "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
  "VANTA_PRIVATE_POOL_V2_RELAYER_FEE_WALLET",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET",
  "VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE",
  "VANTA_ACTUAL_PRIVATE_NULLIFIER_REF",
  "VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF",
  "VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF",
  "VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF",
];

const REQUIRED_FINAL_ENVS = [
  "VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF",
  "VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION",
  "VANTA_ACTUAL_PRIVATE_SETTLEMENT_PLAN_JSON",
  "VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF",
  "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
];

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function envStatus(names) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      {
        present: present(name),
        printedValue: false,
      },
    ]),
  );
}

function missing(names) {
  return names.filter((name) => !present(name));
}

const livePlanMissing = missing(LIVE_PLAN_TERM_ENVS);
const relayerInputMissing = missing(RELAYER_TRANSACTION_INPUT_ENVS);
const finalMissing = missing(REQUIRED_FINAL_ENVS);
const sourceRef =
  process.env.VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF?.trim() ||
  "operator-live-data:actual-private-shared-cohort-2026-05-02-0830-1030-central";

const packet = {
  version: "vanta-actual-private-live-source-next-step-0.1",
  checkedAt: new Date().toISOString(),
  purpose:
    "Guided, no-send handoff for producing VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF and VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION without printing secrets or serialized transaction bytes.",
  currentStatus: {
    livePlanTermsReady: livePlanMissing.length === 0,
    relayerTransactionInputsReady: relayerInputMissing.length === 0,
    finalLiveExecutorInputsReady: finalMissing.length === 0,
    liveDataSourceRefReady: present("VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF"),
    relayerSerializedTransactionReady: present("VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION"),
  },
  publicSolanaSpendAccounts: {
    programId: spendAccounts.programId,
    poolState: spendAccounts.poolState,
    nullifierSet: spendAccounts.nullifierSet,
    outputQueue: spendAccounts.outputQueue,
    source: "ops/mainnet/actual-private-mainnet-settlement.evidence.json",
  },
  envStatus: {
    livePlanTerms: envStatus(LIVE_PLAN_TERM_ENVS),
    optionalLivePlanTerms: envStatus(OPTIONAL_LIVE_PLAN_TERM_ENVS),
    relayerTransactionInputs: envStatus(RELAYER_TRANSACTION_INPUT_ENVS),
    finalLiveExecutorInputs: envStatus(REQUIRED_FINAL_ENVS),
  },
  missing: {
    livePlanTerms: livePlanMissing,
    relayerTransactionInputs: relayerInputMissing,
    finalLiveExecutorInputs: finalMissing,
  },
  sourceRefCandidate: {
    value: sourceRef,
    validOnlyAfter:
      "Use this only after actual live proof/operator plan terms and relayer serialized transaction are present. It is a provenance label, not proof by itself.",
  },
  dopplerSafeRunbook: [
    {
      step: 1,
      action: "Enter the Vanta repo and load Homebrew on Apple Silicon shells that do not already see brew/doppler.",
      commands: [
        "cd /Users/clay/Desktop/Vanta",
        "eval \"$(/opt/homebrew/bin/brew shellenv)\"",
      ],
    },
    {
      step: 2,
      action: "Confirm the Doppler-backed operator token is present without printing it.",
      command:
        "doppler run --config prd --project vanta -- node -e 'console.log(process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN ? \"operator token present\" : \"operator token missing\")'",
    },
    {
      step: 3,
      action: "Set public refs and known Solana spend-program accounts in the same terminal.",
      commands: [
        "export VANTA_ACTUAL_PRIVATE_MAINNET_WALLET_PUBLIC_KEY_REF=\"5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi\"",
        `export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_PROGRAM_ID="${spendAccounts.programId ?? ""}"`,
        `export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_POOL_STATE="${spendAccounts.poolState ?? ""}"`,
        `export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_NULLIFIER_SET="${spendAccounts.nullifierSet ?? ""}"`,
        `export VANTA_PRIVATE_POOL_V2_SOLANA_SPEND_OUTPUT_QUEUE="${spendAccounts.outputQueue ?? ""}"`,
      ],
    },
    {
      step: 4,
      action:
        "Populate live proof/operator terms from the actual-private flow. Do not use demo-derived values for production evidence.",
      requiredEnvs: LIVE_PLAN_TERM_ENVS,
      optionalEnvs: OPTIONAL_LIVE_PLAN_TERM_ENVS,
    },
    {
      step: 5,
      action:
        "The transaction builder now reads the raw live public commitment envs directly; mirror to legacy _REF envs only for older shells.",
      commands: [
        "export VANTA_ACTUAL_PRIVATE_NULLIFIER_REF=\"$VANTA_ACTUAL_PRIVATE_NULLIFIER\"",
        "export VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT_REF=\"$VANTA_ACTUAL_PRIVATE_OUTPUT_COMMITMENT\"",
        "export VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT_REF=\"$VANTA_ACTUAL_PRIVATE_CHANGE_OUTPUT_COMMITMENT\"",
        "export VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH_REF=\"$VANTA_ACTUAL_PRIVATE_SPEND_PUBLIC_INPUT_HASH\"",
      ],
    },
    {
      step: 6,
      action:
        "Build the unsigned/no-send relayer transaction and eval only in your local terminal if you are ready to keep the exported variable local.",
      command:
        "doppler run --config prd --project vanta -- npm run private-pool-v2:solana-spend-transaction",
      note:
        "This prints an export line for VANTA_ACTUAL_PRIVATE_RELAYER_SERIALIZED_TRANSACTION. It does not sign, submit, or move funds.",
    },
    {
      step: 7,
      action: "Attach the live source provenance ref after steps 4-6 are real live data.",
      command: `export VANTA_ACTUAL_PRIVATE_LIVE_DATA_SOURCE_REF="${sourceRef}"`,
    },
    {
      step: 8,
      action:
        "Build the settlement plan JSON locally and re-check readiness without printing raw plan JSON or serialized transaction bytes.",
      commands: [
        "npm run mainnet:actual-private-settlement-plan-json",
        "npm run mainnet:actual-private-settlement-live-data",
      ],
    },
  ],
  privacyBoundary: {
    sourceRefIsProof: false,
    relayerTransactionSigns: false,
    relayerTransactionSubmits: false,
    demoValuesAllowedForProductionEvidence: false,
    printsOperatorToken: false,
    printsRpcUrl: false,
    printsRawPlanJson: false,
    printsSerializedTransaction: false,
    printsPrivateKeys: false,
  },
};

console.log(JSON.stringify(packet, null, 2));
