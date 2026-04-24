import type {
  VantaPayBalances,
  VantaPayMerchantControlPlane,
  VantaPayReceipt,
  VantaPayRefund,
  VantaPayWithdrawal,
} from "./vantaPayTypes";

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

export function createVantaPayMerchantControlPlane(): VantaPayMerchantControlPlane {
  return createVantaPayMerchantControlPlaneFromSnapshot({
    approvalPhase: "preview",
    balances: {
      available: [{ amount: "248420.18", asset: "USDC" }],
      pending: [{ amount: "18200.00", asset: "USDC" }],
      withdrawable: [{ amount: "244420.18", asset: "USDC" }],
    },
    receipts: [
      {
        amount: "4820.00",
        asset: "USDC",
        auditDisclosureId: "aud_1842",
        checkoutSessionId: "cs_1842",
        createdAt: "2026-04-23T00:00:00.000Z",
        customerEmail: null,
        id: "rcpt_1842",
        invoiceReference: null,
        merchantId: "mrc_123",
        object: "receipt",
        orderId: null,
        paymentId: "pay_1842",
        privateRailReceiptId: "prail_1842",
        status: "paid",
      },
      {
        amount: "1250.00",
        asset: "USDC",
        auditDisclosureId: "aud_1841",
        checkoutSessionId: "cs_1841",
        createdAt: "2026-04-23T00:00:00.000Z",
        customerEmail: null,
        id: "rcpt_1841",
        invoiceReference: null,
        merchantId: "mrc_123",
        object: "receipt",
        orderId: null,
        paymentId: "pay_1841",
        privateRailReceiptId: "prail_1841",
        status: "paid",
      },
    ],
    refunds: [],
    withdrawals: [],
    payoutQueue: {
      destination: "Treasury settlement wallet",
      nextWindow: "Today · 16:00 UTC",
      state: "merchant-visible",
    },
    reconciliation: {
      exportWindow: "2026-04-23 · 00:00-12:00 UTC",
      recordsLabel: "128 matched receipts",
      state: "merchant-visible",
    },
  });
}

function createVantaPayMerchantControlPlaneFromSnapshot(
  snapshot: VantaPayMerchantControlPlaneSnapshot,
): VantaPayMerchantControlPlane {
  return buildControlPlane(snapshot);
}
