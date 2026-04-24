import type {
  VantaPayBalances,
  VantaPayMerchant,
  VantaPayMerchantControlPlane,
  VantaPayMerchantControlPlaneInput,
  VantaPayMerchantControlPlaneState,
  VantaPayReceipt,
  VantaPayRefund,
  VantaPayWithdrawal,
} from "./vantaPayTypes";

type VantaPayMerchantControlPlaneRuntimeSource = {
  getBalances(): VantaPayBalances;
  getMerchant(): VantaPayMerchant;
  getMerchantControlPlaneState(): VantaPayMerchantControlPlaneState;
  listReceipts(): readonly VantaPayReceipt[];
  listRefunds(): readonly VantaPayRefund[];
  listWithdrawals(): readonly VantaPayWithdrawal[];
};

type VantaPayMerchantControlPlaneAdapterArgs =
  | {
      runtime: VantaPayMerchantControlPlaneRuntimeSource;
    }
  | {
      input: VantaPayMerchantControlPlaneInput;
    };

function cloneBalances(balances: VantaPayBalances): VantaPayBalances {
  return {
    available: balances.available.map((balance) => ({ ...balance })),
    pending: balances.pending.map((balance) => ({ ...balance })),
    withdrawable: balances.withdrawable.map((balance) => ({ ...balance })),
  };
}

function cloneReceipts(receipts: readonly VantaPayReceipt[]) {
  return receipts.map((receipt) => ({ ...receipt }));
}

function cloneRefunds(refunds: readonly VantaPayRefund[]) {
  return refunds.map((refund) => ({ ...refund }));
}

function cloneWithdrawals(withdrawals: readonly VantaPayWithdrawal[]) {
  return withdrawals.map((withdrawal) => ({ ...withdrawal }));
}

function buildControlPlane(input: VantaPayMerchantControlPlaneInput): VantaPayMerchantControlPlane {
  return {
    merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1",
    approvalPhase: input.approvalPhase,
    balances: cloneBalances(input.balances),
    receipts: cloneReceipts(input.receipts),
    refunds: cloneRefunds(input.refunds),
    withdrawals: cloneWithdrawals(input.withdrawals),
    payoutQueue: {
      destination: input.payoutQueue.destination,
      nextWindow: { ...input.payoutQueue.nextWindow },
      state: input.payoutQueue.state,
    },
    reconciliation: {
      exportWindow: { ...input.reconciliation.exportWindow },
      recordsLabel: input.reconciliation.recordsLabel ?? `${input.receipts.length} receipt records`,
      state: input.reconciliation.state,
    },
    sections: {
      balances: input.balances.available.length > 0 ? "visible" : "empty",
      receipts: input.receipts.length > 0 ? "visible" : "empty",
      refunds: input.refunds.length > 0 ? "visible" : "empty",
      withdrawals: input.withdrawals.length > 0 ? "visible" : "empty",
      reconciliation: "visible",
    },
  };
}

export function createVantaPayMerchantControlPlane(
  args: VantaPayMerchantControlPlaneAdapterArgs,
): VantaPayMerchantControlPlane {
  if ("runtime" in args) {
    const runtime = args.runtime;
    const merchant = runtime.getMerchant();
    const runtimeState = runtime.getMerchantControlPlaneState();

    return buildControlPlane({
      approvalPhase: runtimeState.approvalPhase,
      balances: runtime.getBalances(),
      payoutQueue: {
        destination: merchant.payoutSettings.destination,
        nextWindow: runtimeState.payoutQueue.nextWindow,
        state: "merchant-visible",
      },
      receipts: runtime.listReceipts(),
      reconciliation: {
        exportWindow: runtimeState.reconciliation.exportWindow,
        state: "merchant-visible",
      },
      refunds: runtime.listRefunds(),
      withdrawals: runtime.listWithdrawals(),
    });
  }

  return buildControlPlane(args.input);
}
