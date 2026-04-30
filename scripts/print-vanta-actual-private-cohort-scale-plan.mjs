import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Connection } from "@solana/web3.js";

import { createVantaMainnetRealFundsApprovalStatus } from "../src/readiness/mainnetRealFundsApprovalStatus.mjs";

const MINIMUM_DISTINCT_COMMITMENTS = 1024;
const OUTPUT_COMMITMENTS_PER_RECORD = 2;
const POOL_STATE_LEN = 56;
const QUEUE_HEADER_LEN = 16;
const HASH_LEN = 32;
const OUTPUT_RECORD_LEN = HASH_LEN * 3;
const INIT_INSTRUCTION_TAG = 0;
const SPEND_INSTRUCTION_TAG = 1;
const SPEND_INSTRUCTION_DATA_BYTES = 129;

const repoRoot = resolve(import.meta.dirname, "..");
const anonymityEvidencePath = resolve(repoRoot, "ops/mainnet/private-pool-v2-anonymity-set.evidence.json");
const settlementEvidencePath = resolve(repoRoot, "ops/mainnet/actual-private-mainnet-settlement.evidence.json");

const jsonMode = process.argv.includes("--json");
const now = readOptionValue("--checked-at") || new Date().toISOString();

const anonymityEvidence = readJson(anonymityEvidencePath);
const settlementEvidence = readJson(settlementEvidencePath);
const currentMeasurement = anonymityEvidence.currentMeasurement ?? {};
const currentDistinctCommitments = numberOrZero(currentMeasurement.distinctCommitmentCount);
const currentOutputRecordCount = numberOrZero(currentMeasurement.outputRecordCount);
const requiredAdditionalDistinctCommitments = Math.max(
  0,
  MINIMUM_DISTINCT_COMMITMENTS - currentDistinctCommitments,
);
const requiredAdditionalOutputRecords = Math.ceil(
  requiredAdditionalDistinctCommitments / OUTPUT_COMMITMENTS_PER_RECORD,
);
const targetOutputRecordCount = currentOutputRecordCount + requiredAdditionalOutputRecords;
const requiredMinimumOutputQueueSlots = Math.max(targetOutputRecordCount, 1);
const accountByteSizes = {
  poolState: POOL_STATE_LEN,
  nullifierSet: QUEUE_HEADER_LEN + HASH_LEN * requiredMinimumOutputQueueSlots,
  outputQueue: QUEUE_HEADER_LEN + OUTPUT_RECORD_LEN * requiredMinimumOutputQueueSlots,
};
const totalNewAccountDataBytes =
  accountByteSizes.poolState + accountByteSizes.nullifierSet + accountByteSizes.outputQueue;

const approvalStatus = createVantaMainnetRealFundsApprovalStatus();
const rentEstimates = await maybeEstimateRent(accountByteSizes);
const publicRefs = settlementEvidence.mainnetSpendProgramEvidence ?? {};

const plan = {
  version: "vanta-actual-private-cohort-scale-plan-0.1",
  checkedAt: now,
  activePrivacyRailId: settlementEvidence.activePrivacyRailId,
  network: "mainnet-beta",
  mainnetReady: false,
  productionReady: false,
  privacyClaimAllowed: false,
  movesFunds: false,
  submitsTransaction: false,
  mutatesProduction: false,
  currentMeasurement: {
    evidenceRef: "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
    outputRecordCount: currentOutputRecordCount,
    distinctCommitmentCount: currentDistinctCommitments,
    minimumDistinctCommitments: MINIMUM_DISTINCT_COMMITMENTS,
    meetsMinimumDistinctCommitments:
      currentDistinctCommitments >= MINIMUM_DISTINCT_COMMITMENTS,
  },
  scaleRequirement: {
    outputCommitmentsPerRecord: OUTPUT_COMMITMENTS_PER_RECORD,
    requiredAdditionalDistinctCommitments,
    requiredAdditionalOutputRecords,
    targetOutputRecordCount,
    requiredMinimumOutputQueueSlots,
    accountByteSizes,
    totalNewAccountDataBytes,
    spendProgramContract: {
      programRef: "programs/vanta_private_pool_v2_spend/README.md",
      slotCount: requiredMinimumOutputQueueSlots,
      poolStateBytes: accountByteSizes.poolState,
      nullifierSetBytes: accountByteSizes.nullifierSet,
      outputQueueBytes: accountByteSizes.outputQueue,
      initInstructionTag: INIT_INSTRUCTION_TAG,
      spendInstructionTag: SPEND_INSTRUCTION_TAG,
      spendInstructionDataBytes: SPEND_INSTRUCTION_DATA_BYTES,
      additionalSpendInstructionsRequired: requiredAdditionalOutputRecords,
      unsignedPlanningOnly: true,
      signsOrSubmitsTransactions: false,
    },
  },
  practicalTransactionClassesAfterFreshApproval: [
    {
      id: "create-shared-cohort-accounts",
      description:
        "Create or fund a shared cohort pool state, nullifier set, and output queue with capacity for at least 512 output records.",
      requiresHumanWalletSignature: true,
      movesFunds: true,
      reason: "Solana account rent/funding is real mainnet value.",
    },
    {
      id: "initialize-shared-cohort",
      description:
        "Call the spend program init instruction for the reviewed shared cohort accounts.",
      requiresHumanWalletSignature: true,
      movesFunds: false,
      reason: "This mutates mainnet account state and must stay inside the approved action window.",
    },
    {
      id: "append-live-output-records",
      description:
        "Submit 511 additional spend/deposit records with distinct output commitments into the same reviewed cohort.",
      requiresHumanWalletSignature: true,
      movesFunds: true,
      reason: "Each accepted record contributes two output commitments toward the 1024-commitment threshold.",
    },
    {
      id: "review-and-record-metrics",
      description:
        "Read the live output queue, record the solana-tx refs, and require independent reviewer acceptance before any privacy claim promotion.",
      requiresHumanWalletSignature: false,
      movesFunds: false,
      reason: "This is evidence capture, not settlement.",
    },
  ],
  existingPublicMainnetRefs: {
    programId: publicRefs.programId ?? null,
    poolState: publicRefs.poolState ?? null,
    nullifierSet: publicRefs.nullifierSet ?? null,
    outputQueue: publicRefs.outputQueue ?? null,
    spendEvidenceTxRef: publicRefs.spendEvidenceTxRef ?? null,
  },
  approvalGate: {
    approvalWindowStatus: approvalStatus.approvalWindowStatus,
    liveMainnetActionsAllowedNow: approvalStatus.liveMainnetActionsAllowedNow,
    requiredNextStep: approvalStatus.liveMainnetActionsAllowedNow
      ? "Simulate the exact account-create/init/spend transaction batch, show fee payer and maximum SOL at risk, then request wallet signature confirmation."
      : "Record a new bounded approval window before any live mainnet action.",
    canonicalStatusCommand: "npm run mainnet:real-funds-approval-status-check",
  },
  rentEstimates,
  blockers: [
    "fresh-bounded-approval-required-before-live-mainnet-actions",
    "human-wallet-signature-required",
    "live-shared-cohort-accounts-or-capacity-required",
    "511-additional-live-output-records-required-from-current-evidence",
    "independent-reviewer-acceptance-required-before-privacy-claim-promotion",
  ],
  nonClaims: [
    "does not prove 1024 live commitments",
    "does not submit or sign a transaction",
    "does not authorize production privacy claims",
  ],
  safety:
    "No wallet keys, seed phrases, auth tokens, database URLs, signed transactions, raw customer private inputs, or private note material are printed.",
};

if (jsonMode) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log("Vanta actual-private shared cohort scale plan");
  console.log(`- network: ${plan.network}`);
  console.log(`- current distinct commitments: ${currentDistinctCommitments}`);
  console.log(`- minimum distinct commitments: ${MINIMUM_DISTINCT_COMMITMENTS}`);
  console.log(`- additional output records required: ${requiredAdditionalOutputRecords}`);
  console.log(`- target output record count: ${targetOutputRecordCount}`);
  console.log(`- required output queue slots: ${requiredMinimumOutputQueueSlots}`);
  console.log(`- total new account data bytes: ${totalNewAccountDataBytes}`);
  console.log(`- liveMainnetActionsAllowedNow: ${String(plan.approvalGate.liveMainnetActionsAllowedNow)}`);
  console.log(`- next: ${plan.approvalGate.requiredNextStep}`);
  console.log("- canonical verification: npm run mainnet:actual-private-cohort-scale-plan-check");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readOptionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return process.argv[index + 1]?.trim() ?? "";
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

async function maybeEstimateRent(byteSizes) {
  const rpcUrl = process.env.VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL?.trim();
  if (!rpcUrl) {
    return {
      status: "not-estimated-env-missing",
      rpcEnvRef: "VANTA_PRIVATE_POOL_V2_RELAYER_RPC_URL",
      note: "Set the RPC URL env to estimate rent read-only before signing.",
    };
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const entries = await Promise.all(
    Object.entries(byteSizes).map(async ([account, bytes]) => [
      account,
      {
        bytes,
        lamports: await connection.getMinimumBalanceForRentExemption(bytes),
      },
    ]),
  );
  const byAccount = Object.fromEntries(entries);
  const totalLamports = Object.values(byAccount).reduce((sum, entry) => sum + entry.lamports, 0);
  return {
    status: "estimated-read-only",
    byAccount,
    totalLamports,
    totalSol: totalLamports / 1_000_000_000,
  };
}
