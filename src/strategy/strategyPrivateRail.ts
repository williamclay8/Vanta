import {
  buildVantaPrivateCoreSendTransition,
  buildVantaPrivateCoreSwapTransition,
  type Bytes32Hex,
  type HeldNoteViewV0,
  type ShieldArtifactV0,
  type VantaPrivateCoreLedger,
  VantaPrivateCoreLedger as VantaPrivateCoreSimulationLedger,
} from "../zk/vantaPrivateCore.js";
import {
  buildVantaPrivateCoreSendProofBoundary,
  type VantaPrivateCoreNoirSendWitnessPackageV0,
} from "../zk/vantaPrivateCoreSendProof.js";
import {
  buildVantaPrivateCoreSwapProofBoundary,
  type VantaPrivateCoreNoirSwapWitnessPackageV0,
} from "../zk/vantaPrivateCoreSwapProof.js";
import {
  VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION,
  getStrategyPrivateRailTrustContract,
  type StrategyPrivateRailTrustContract,
} from "./strategyPrivateRailTrustContract.js";

const STRATEGY_PRIVATE_RAIL_PREVIEW_VERSION = "vanta-strategy-private-rail-preview-0.1" as const;
const STRATEGY_PRIVATE_RAIL_BOUNDARY = "local-private-core-send-swap-composition-v0" as const;

type StrategyPrivateRailChildPreview = {
  childIndex: number;
  source: {
    inputNullifier: Bytes32Hex;
    inputRoot: Bytes32Hex;
  };
  send: {
    changeCommitment: Bytes32Hex | null;
    recipientCommitment: Bytes32Hex;
    resultingRoot: Bytes32Hex;
  };
  swap: {
    outputCommitment: Bytes32Hex;
    resultingRoot: Bytes32Hex;
  };
};

export type StrategyPrivateRailOperatorPacket = {
  privateCoreBoundary: typeof STRATEGY_PRIVATE_RAIL_BOUNDARY;
  send: {
    changeCommitment: Bytes32Hex | null;
    inputCommitment: Bytes32Hex;
    inputNullifier: Bytes32Hex;
    inputRoot: Bytes32Hex;
    proofCircuit: string;
    proofKind: string;
    proofPublicInputs: VantaPrivateCoreNoirSendWitnessPackageV0["publicInputs"];
    proofReadiness: "ready" | "blocked";
    recipientCommitment: Bytes32Hex;
    resultingRoot: Bytes32Hex;
  };
  swap: {
    inputCommitment: Bytes32Hex;
    inputNullifier: Bytes32Hex;
    inputRoot: Bytes32Hex;
    outputCommitment: Bytes32Hex;
    proofCircuit: string;
    proofKind: string;
    proofPublicInputs: VantaPrivateCoreNoirSwapWitnessPackageV0["publicInputs"];
    proofReadiness: "ready" | "blocked";
    resultingRoot: Bytes32Hex;
  };
};

type StrategyPrivateRailChildOrder = {
  index: number;
  notional: number;
};

type StrategyPrivateRailPlan = {
  childOrders: StrategyPrivateRailChildOrder[];
  fundingAction: string;
  routingPolicy: {
    destination: string;
  };
  side: "Buy" | "Sell";
};

type StrategyPrivateRailPreview = {
  children: StrategyPrivateRailChildPreview[];
  liveSubmission: false;
  nextPrivateHold: HeldNoteViewV0;
  operatorPackets: StrategyPrivateRailOperatorPacket[];
  operatorPlaintextStrategyShared: false;
  privateOutputs: HeldNoteViewV0[];
  privateRailBoundary: typeof STRATEGY_PRIVATE_RAIL_BOUNDARY;
  trustContract: StrategyPrivateRailTrustContract;
  version: typeof STRATEGY_PRIVATE_RAIL_PREVIEW_VERSION;
};

export type StrategyPrivateRailOperatorHandoff = {
  liveSubmission: false;
  operatorPackets: StrategyPrivateRailOperatorPacket[];
  operatorPlaintextStrategyShared: false;
  privateRailBoundary: typeof STRATEGY_PRIVATE_RAIL_BOUNDARY;
  trustContract: StrategyPrivateRailTrustContract;
  version: "vanta-strategy-private-rail-operator-handoff-0.1";
};

export type StrategyPrivateRailQuoteOutputAmount = (args: {
  childOrder: StrategyPrivateRailChildOrder;
  childIndex: number;
  plan: StrategyPrivateRailPlan;
}) => bigint | number | string;

export type StrategyPrivateRailPreviewInput = {
  initialHold: HeldNoteViewV0;
  maxChildren?: number;
  outputAssetId: Bytes32Hex;
  ownerPublicKey: Bytes32Hex;
  ownerSecretKey: Bytes32Hex;
  plan: StrategyPrivateRailPlan;
  quoteOutputAmount?: StrategyPrivateRailQuoteOutputAmount;
  simulationLedger: VantaPrivateCoreLedger;
};

export type StrategyPrivateRailShieldSimulationHandoffInput = Omit<
  StrategyPrivateRailPreviewInput,
  "initialHold" | "simulationLedger"
> & {
  initialShieldArtifact: ShieldArtifactV0;
  sourceShieldArtifacts: ShieldArtifactV0[];
};

function assertPrivateStrategyPlan(plan: StrategyPrivateRailPlan) {
  if (plan.fundingAction !== "use-private-balance" || plan.routingPolicy.destination !== "Vanta private balance") {
    throw new Error("Strategy private rail requires private-balance funding and private-balance destination.");
  }

  if (plan.side !== "Buy") {
    throw new Error("Strategy private rail v0.1 only supports buy-side private-core swap composition.");
  }

  if (plan.childOrders.length === 0) {
    throw new Error("Strategy private rail requires at least one child order.");
  }
}

function resolveChildCount(plan: StrategyPrivateRailPlan, maxChildren: number | undefined) {
  if (maxChildren !== 1) {
    throw new Error("Strategy private rail v0.1 requires maxChildren: 1 for single-slice proof-public handoff.");
  }

  return Math.min(maxChildren, plan.childOrders.length);
}

function defaultQuoteOutputAmount({ childOrder }: { childOrder: StrategyPrivateRailChildOrder }) {
  return BigInt(Math.max(1, Math.floor(childOrder.notional)));
}

export function createStrategyPrivateRailPreview(
  input: StrategyPrivateRailPreviewInput,
): StrategyPrivateRailPreview {
  assertPrivateStrategyPlan(input.plan);

  let currentHold = input.initialHold;
  const children: StrategyPrivateRailChildPreview[] = [];
  const operatorPackets: StrategyPrivateRailOperatorPacket[] = [];
  const privateOutputs: HeldNoteViewV0[] = [];
  const quoteOutputAmount = input.quoteOutputAmount ?? defaultQuoteOutputAmount;

  for (const childOrder of input.plan.childOrders.slice(0, resolveChildCount(input.plan, input.maxChildren))) {
    const sendTransition = buildVantaPrivateCoreSendTransition({
      changeOwnerPublicKey: input.ownerPublicKey,
      input: currentHold,
      recipientOwnerPublicKey: input.ownerPublicKey,
      sendAmount: BigInt(Math.max(1, Math.floor(childOrder.notional))),
    });
    const sendProofBoundary = buildVantaPrivateCoreSendProofBoundary({
      requireNontrivialMerklePath: false,
      senderSecretKey: input.ownerSecretKey,
      transition: sendTransition,
    });
    const sendResult = input.simulationLedger.send(sendTransition);
    const childHold = input.simulationLedger.hold({
      encryptedPayload: sendResult.recipient.encryptedPayload,
      ownerSecretKey: input.ownerSecretKey,
    });

    const swapTransition = buildVantaPrivateCoreSwapTransition({
      input: childHold,
      outputAmount: quoteOutputAmount({
        childIndex: childOrder.index,
        childOrder,
        plan: input.plan,
      }),
      outputAssetId: input.outputAssetId,
      recipientOwnerPublicKey: input.ownerPublicKey,
    });
    const swapProofBoundary = buildVantaPrivateCoreSwapProofBoundary({
      requireNontrivialMerklePath: false,
      senderSecretKey: input.ownerSecretKey,
      transition: swapTransition,
    });
    const swapResult = input.simulationLedger.swap(swapTransition);
    const outputHold = input.simulationLedger.hold({
      encryptedPayload: swapResult.output.encryptedPayload,
      ownerSecretKey: input.ownerSecretKey,
    });
    privateOutputs.push(outputHold);

    children.push({
      childIndex: childOrder.index,
      source: {
        inputNullifier: sendResult.inputNullifier.value,
        inputRoot: sendResult.inputRoot,
      },
      send: {
        changeCommitment: sendResult.change?.commitment.value ?? null,
        recipientCommitment: sendResult.recipient.commitment.value,
        resultingRoot: sendResult.resultingRoot,
      },
      swap: {
        outputCommitment: swapResult.output.commitment.value,
        resultingRoot: swapResult.resultingRoot,
      },
    });
    operatorPackets.push({
      privateCoreBoundary: STRATEGY_PRIVATE_RAIL_BOUNDARY,
      send: {
        changeCommitment: sendResult.change?.commitment.value ?? null,
        inputCommitment: currentHold.commitment.value,
        inputNullifier: sendResult.inputNullifier.value,
        inputRoot: sendResult.inputRoot,
        proofCircuit: sendProofBoundary.circuit,
        proofKind: sendProofBoundary.kind,
        proofPublicInputs: sendProofBoundary.noirWitnessPackage.publicInputs,
        proofReadiness: sendProofBoundary.readiness,
        recipientCommitment: sendResult.recipient.commitment.value,
        resultingRoot: sendResult.resultingRoot,
      },
      swap: {
        inputCommitment: childHold.commitment.value,
        inputNullifier: swapResult.inputNullifier.value,
        inputRoot: swapResult.inputRoot,
        outputCommitment: swapResult.output.commitment.value,
        proofCircuit: swapProofBoundary.circuit,
        proofKind: swapProofBoundary.kind,
        proofPublicInputs: swapProofBoundary.noirWitnessPackage.publicInputs,
        proofReadiness: swapProofBoundary.readiness,
        resultingRoot: swapResult.resultingRoot,
      },
    });

    if (!sendResult.change) {
      currentHold = outputHold;
      break;
    }

    currentHold = input.simulationLedger.hold({
      encryptedPayload: sendResult.change.encryptedPayload,
      ownerSecretKey: input.ownerSecretKey,
    });
  }

  return {
    children,
    liveSubmission: false,
    nextPrivateHold: currentHold,
    operatorPackets,
    operatorPlaintextStrategyShared: false,
    privateOutputs,
    privateRailBoundary: STRATEGY_PRIVATE_RAIL_BOUNDARY,
    trustContract: {
      ...getStrategyPrivateRailTrustContract(),
      version: VANTA_STRATEGY_PRIVATE_RAIL_TRUST_CONTRACT_VERSION,
    },
    version: STRATEGY_PRIVATE_RAIL_PREVIEW_VERSION,
  };
}

export function createStrategyPrivateRailOperatorHandoff(
  preview: StrategyPrivateRailPreview,
): StrategyPrivateRailOperatorHandoff {
  return {
    liveSubmission: false,
    operatorPackets: preview.operatorPackets,
    operatorPlaintextStrategyShared: false,
    privateRailBoundary: preview.privateRailBoundary,
    trustContract: preview.trustContract,
    version: "vanta-strategy-private-rail-operator-handoff-0.1",
  };
}

export function createStrategyPrivateRailOperatorHandoffFromShieldSimulation(
  input: StrategyPrivateRailShieldSimulationHandoffInput,
): StrategyPrivateRailOperatorHandoff {
  const simulationLedger = new VantaPrivateCoreSimulationLedger();
  let seededInitialArtifact: ShieldArtifactV0 | null = null;

  for (const sourceArtifact of input.sourceShieldArtifacts) {
    const seededArtifact = simulationLedger.shield({
      amount: sourceArtifact.note.amount,
      assetId: sourceArtifact.note.assetId,
      blinding: sourceArtifact.note.blinding,
      derivationTag: sourceArtifact.note.derivationTag,
      noteNonce: sourceArtifact.note.noteNonce,
      noteSecret: sourceArtifact.note.noteSecret,
      noteType: sourceArtifact.note.noteType,
      ownerPublicKey: sourceArtifact.note.ownerPublicKey,
    });

    if (sourceArtifact.commitment.value !== seededArtifact.commitment.value) {
      throw new Error("Strategy private rail simulation seed commitment mismatch.");
    }

    if (sourceArtifact.commitment.value === input.initialShieldArtifact.commitment.value) {
      seededInitialArtifact = seededArtifact;
    }
  }

  if (!seededInitialArtifact) {
    throw new Error("Strategy private rail simulation seed is missing the initial shield artifact.");
  }

  const initialHold = simulationLedger.hold({
    encryptedPayload: input.initialShieldArtifact.encryptedPayload,
    ownerSecretKey: input.ownerSecretKey,
  });
  const preview = createStrategyPrivateRailPreview({
    initialHold,
    maxChildren: input.maxChildren,
    outputAssetId: input.outputAssetId,
    ownerPublicKey: input.ownerPublicKey,
    ownerSecretKey: input.ownerSecretKey,
    plan: input.plan,
    quoteOutputAmount: input.quoteOutputAmount,
    simulationLedger,
  });

  return createStrategyPrivateRailOperatorHandoff(preview);
}
