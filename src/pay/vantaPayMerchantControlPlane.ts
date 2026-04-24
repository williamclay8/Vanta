// @ts-expect-error - Runtime source is imported directly by Node in the contract check.
import { createVantaPayRuntime } from "./vantaPayRuntime.ts";
import type {
  VantaPayBalances,
  VantaPayMerchant,
  VantaPayMerchantControlPlane,
  VantaPayMerchantControlPlaneRuntimeState,
  VantaPayReceipt,
  VantaPayRefund,
  VantaPayWithdrawal,
} from "./vantaPayTypes";

type VantaPayMerchantControlPlaneRuntimeSource = {
  getBalances(): VantaPayBalances;
  getMerchant(): VantaPayMerchant;
  getMerchantControlPlaneState(): VantaPayMerchantControlPlaneRuntimeState;
  listReceipts(): readonly VantaPayReceipt[];
  listRefunds(): readonly VantaPayRefund[];
  listWithdrawals(): readonly VantaPayWithdrawal[];
};

type VantaPayMerchantControlPlaneSnapshot = {
  approvalPhase: VantaPayMerchantControlPlane["approvalPhase"];
  balances: VantaPayBalances;
  receipts: readonly VantaPayReceipt[];
  refunds: readonly VantaPayRefund[];
  withdrawals: readonly VantaPayWithdrawal[];
  payoutQueue: {
    destination: string;
    nextWindow: string;
    state: "merchant-visible";
  };
  reconciliation: {
    exportWindow: string;
    recordsLabel: string;
    state: "merchant-visible";
  };
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

export function formatVantaPayMerchantControlPlaneNextWindow(
  nextWindow: VantaPayMerchantControlPlaneRuntimeState["payoutQueue"]["nextWindow"],
) {
  return `${nextWindow.label} · ${nextWindow.targetTimeUtc} UTC`;
}

export function formatVantaPayMerchantControlPlaneExportWindow(
  exportWindow: VantaPayMerchantControlPlaneRuntimeState["reconciliation"]["exportWindow"],
) {
  return `${exportWindow.date} · ${exportWindow.startUtc}-${exportWindow.endUtc} UTC`;
}

function buildControlPlane(snapshot: VantaPayMerchantControlPlaneSnapshot): VantaPayMerchantControlPlane {
  return {
    merchantControlPlaneVersion: "vanta-pay-merchant-control-plane-0.1",
    approvalPhase: snapshot.approvalPhase,
    balances: cloneBalances(snapshot.balances),
    receipts: cloneReceipts(snapshot.receipts),
    refunds: cloneRefunds(snapshot.refunds),
    withdrawals: cloneWithdrawals(snapshot.withdrawals),
    payoutQueue: {
      destination: snapshot.payoutQueue.destination,
      nextWindow: snapshot.payoutQueue.nextWindow,
      state: snapshot.payoutQueue.state,
    },
    reconciliation: {
      exportWindow: snapshot.reconciliation.exportWindow,
      recordsLabel: snapshot.reconciliation.recordsLabel,
      state: snapshot.reconciliation.state,
    },
    sections: {
      balances: snapshot.balances.available.length > 0 ? "visible" : "empty",
      receipts: snapshot.receipts.length > 0 ? "visible" : "empty",
      refunds: snapshot.refunds.length > 0 ? "visible" : "empty",
      withdrawals: snapshot.withdrawals.length > 0 ? "visible" : "empty",
      reconciliation: "visible",
    },
  };
}

export function createVantaPayMerchantControlPlaneFromRuntime(
  runtime: VantaPayMerchantControlPlaneRuntimeSource,
): VantaPayMerchantControlPlane {
  const merchant = runtime.getMerchant();
  const controlPlaneState = runtime.getMerchantControlPlaneState();
  const balances = runtime.getBalances();
  const receipts = runtime.listReceipts();
  const refunds = runtime.listRefunds();
  const withdrawals = runtime.listWithdrawals();

  return buildControlPlane({
    approvalPhase: controlPlaneState.approvalPhase,
    balances,
    receipts,
    refunds,
    withdrawals,
    payoutQueue: {
      destination: merchant.payoutSettings.destination,
      nextWindow: formatVantaPayMerchantControlPlaneNextWindow(controlPlaneState.payoutQueue.nextWindow),
      state: "merchant-visible",
    },
    reconciliation: {
      exportWindow: formatVantaPayMerchantControlPlaneExportWindow(
        controlPlaneState.reconciliation.exportWindow,
      ),
      recordsLabel: `${receipts.length} receipt records`,
      state: "merchant-visible",
    },
  });
}

export function createVantaPayMerchantControlPlane(): VantaPayMerchantControlPlane {
  return createVantaPayMerchantControlPlaneFromRuntime(createVantaPayRuntime());
}
