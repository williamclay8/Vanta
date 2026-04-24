import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY } from "./vantaPayPrivateSettlementAdapter";
import type {
  VantaPayAsset,
  VantaPayBalances,
  VantaPayCheckoutSession,
  VantaPayCheckoutSessionCreateInput,
  VantaPayInvoice,
  VantaPayInvoiceCreateInput,
  VantaPayLineItem,
  VantaPayMerchant,
  VantaPayPayment,
  VantaPayPaymentLink,
  VantaPayPaymentLinkCreateInput,
  VantaPayPrivateExitReceipt,
  VantaPayPrivateRailReceipt,
  VantaPayPrivacyRail,
  VantaPayReceipt,
  VantaPayRefund,
  VantaPayRefundCreateInput,
  VantaPayRuntimeSnapshot,
  VantaPayWebhookDelivery,
  VantaPayWebhookEvent,
  VantaPayWebhookEventType,
  VantaPayWithdrawal,
  VantaPayWithdrawalCreateInput,
} from "./vantaPayTypes";

export const VANTA_PAY_CONTRACT_VERSION = "vanta-pay-merchant-api-0.1" as const;
export const VANTA_PAY_STORE_SCHEMA_VERSION = 1 as const;

export const VANTA_PAY_WEBHOOK_EVENTS = [
  "checkout.session.created",
  "checkout.session.completed",
  "checkout.session.expired",
  "payment.created",
  "payment.processing",
  "payment.completed",
  "payment.failed",
  "payment.refunded",
  "receipt.created",
  "withdrawal.created",
  "withdrawal.completed",
  "withdrawal.failed",
] as const satisfies readonly VantaPayWebhookEventType[];

const defaultNow = "2026-04-19T20:10:00.000Z";
const textEncoder = new TextEncoder();

function hashId(prefix: string, ...parts: readonly string[]) {
  return `${prefix}_${bytesToHex(sha256(textEncoder.encode(parts.join("\u001f")))).slice(0, 24)}`;
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function normalizeAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be a positive decimal string.");
  }

  return parsed.toFixed(2);
}

function addAmounts(left: string, right: string) {
  return (Number(left) + Number(right)).toFixed(2);
}

function subtractAmounts(left: string, right: string) {
  const next = Number(left) - Number(right);
  if (next < -0.000001) {
    throw new Error("Withdrawal amount exceeds withdrawable balance.");
  }

  return Math.max(0, next).toFixed(2);
}

function lineItemTotal(lineItems: readonly VantaPayLineItem[]) {
  return lineItems
    .reduce((total, item) => {
      const amount = Number(item.amount ?? item.unitAmount ?? "0");
      return total + amount * item.quantity;
    }, 0)
    .toFixed(2);
}

function stableLineItemFingerprint(lineItems: readonly VantaPayLineItem[]) {
  return stableJson(
    lineItems.map((item) => ({
      amount: item.amount ?? null,
      name: item.name,
      quantity: item.quantity,
      unitAmount: item.unitAmount ?? null,
    })),
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function signPayload(payload: string, secret: string, timestamp: number) {
  const signedPayload = `${timestamp}.${payload}`;
  return bytesToHex(hmac(sha256, textEncoder.encode(secret), textEncoder.encode(signedPayload)));
}

export function verifyVantaPayWebhookSignature({
  currentTimestamp,
  payload,
  secret,
  signatureHeader,
  toleranceSeconds,
}: {
  currentTimestamp?: number;
  payload: string;
  secret: string;
  signatureHeader: string;
  toleranceSeconds?: number;
}) {
  const timestamp = signatureHeader.match(/(?:^|,)t=([^,]+)/)?.[1];
  const signature = signatureHeader.match(/(?:^|,)v1=([^,]+)/)?.[1];

  if (!timestamp || !signature) {
    return false;
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  if (typeof toleranceSeconds === "number") {
    const now = currentTimestamp ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - parsedTimestamp) > toleranceSeconds) {
      return false;
    }
  }

  return signPayload(payload, secret, parsedTimestamp) === signature;
}

export type VantaPayRuntimeArgs = {
  checkoutBaseUrl?: string;
  now?: string;
  snapshot?: VantaPayRuntimeSnapshot;
};

export function createVantaPayRuntime({
  checkoutBaseUrl = "https://checkout.vantapay.com",
  now = defaultNow,
  snapshot,
}: VantaPayRuntimeArgs = {}) {
  const merchant = {
    acceptedAssets: ["USDC", "SOL", "USDT"],
    branding: {
      logoUrl: "https://merchant.com/logo.png",
      name: "Vanta Studio",
    },
    callbackUrls: {
      cancelUrl: "https://merchant.com/cancel",
      successUrl: "https://merchant.com/success",
      webhookUrl: "https://merchant.com/webhooks/vanta",
    },
    environmentMode: "test",
    id: "mrc_123",
    object: "merchant",
    payoutSettings: {
      defaultAsset: "USDC",
      destination: "Treasury",
      destinationType: "treasury_address",
    },
  } satisfies VantaPayMerchant;

  const sessions = new Map<string, VantaPayCheckoutSession>();
  const payments = new Map<string, VantaPayPayment>();
  const receipts = new Map<string, VantaPayReceipt>();
  const refunds = new Map<string, VantaPayRefund>();
  const privateRailReceipts = new Map<string, VantaPayPrivateRailReceipt>();
  const privateExitReceipts = new Map<string, VantaPayPrivateExitReceipt>();
  const withdrawals = new Map<string, VantaPayWithdrawal>();
  const paymentLinks = new Map<string, VantaPayPaymentLink>();
  const invoices = new Map<string, VantaPayInvoice>();
  const events: VantaPayWebhookEvent[] = [];
  const webhookDeliveries = new Map<string, VantaPayWebhookDelivery>();

  for (const session of snapshot?.sessions ?? []) {
    sessions.set(session.id, session);
  }
  for (const payment of snapshot?.payments ?? []) {
    const restoredPayment = payment as VantaPayPayment & { refundedAmount?: string };
    payments.set(payment.id, {
      ...restoredPayment,
      refundedAmount: restoredPayment.refundedAmount ?? "0.00",
    });
  }
  for (const receipt of snapshot?.receipts ?? []) {
    receipts.set(receipt.id, receipt);
  }
  for (const refund of snapshot?.refunds ?? []) {
    const restoredRefund = refund as VantaPayRefund & { idempotencyKey?: string };
    refunds.set(refund.id, {
      ...restoredRefund,
      idempotencyKey: restoredRefund.idempotencyKey ?? null,
    });
  }
  for (const receipt of snapshot?.privateRailReceipts ?? []) {
    privateRailReceipts.set(receipt.id, receipt);
  }
  for (const receipt of snapshot?.privateExitReceipts ?? []) {
    privateExitReceipts.set(receipt.id, receipt);
  }
  for (const withdrawal of snapshot?.withdrawals ?? []) {
    const restoredWithdrawal = withdrawal as VantaPayWithdrawal & { idempotencyKey?: string };
    withdrawals.set(withdrawal.id, {
      ...restoredWithdrawal,
      idempotencyKey: restoredWithdrawal.idempotencyKey ?? null,
    });
  }
  for (const paymentLink of snapshot?.paymentLinks ?? []) {
    paymentLinks.set(paymentLink.id, paymentLink);
  }
  for (const invoice of snapshot?.invoices ?? []) {
    invoices.set(invoice.id, invoice);
  }
  events.push(...(snapshot?.events ?? []));
  for (const delivery of snapshot?.webhookDeliveries ?? []) {
    webhookDeliveries.set(delivery.id, delivery);
  }

  function recordEvent(
    type: VantaPayWebhookEventType,
    object: VantaPayWebhookEvent["data"]["object"],
  ) {
    const event = {
      created: now,
      data: { object },
      id: hashId("evt", type, object.id, now, String(events.length)),
      object: "event",
      type,
    } satisfies VantaPayWebhookEvent;

    events.push(event);
    return event;
  }

  function createCheckoutSession(input: VantaPayCheckoutSessionCreateInput) {
    const amount = normalizeAmount(input.amount);
    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey) {
      const existingSession = [...sessions.values()].find(
        (session) =>
          session.merchantId === input.merchantId && session.idempotencyKey === idempotencyKey,
      );

      if (existingSession) {
        if (
          existingSession.amount !== amount ||
          existingSession.currency !== input.currency ||
          existingSession.orderId !== (input.orderId ?? null) ||
          stableLineItemFingerprint(existingSession.lineItems) !==
            stableLineItemFingerprint(input.lineItems)
        ) {
          throw new Error("Checkout session idempotency key conflicts with existing session inputs.");
        }

        return existingSession;
      }
    }

    const id = hashId(
      "vcs",
      input.merchantId,
      input.orderId ?? "",
      idempotencyKey ?? "",
      amount,
      String(sessions.size),
    );
    const privacyRoute = {
      auditMode: "merchant_and_buyer_receipt",
      rail: "umbra",
      routeId: hashId("route", "umbra", id, input.currency),
      settlementAsset: input.currency,
    } as const;
    const session = {
      amount,
      cancelUrl: input.cancelUrl,
      checkoutUrl: `${checkoutBaseUrl}/cs/${id}`,
      clientToken: hashId("vtok", id, input.merchantId),
      collectEmail: input.collectEmail ?? false,
      collectName: input.collectName ?? false,
      createdAt: now,
      currency: input.currency,
      customerEmail: input.customerEmail ?? null,
      expiresAt: addHours(now, 24),
      id,
      idempotencyKey,
      lineItems: input.lineItems,
      merchantId: input.merchantId,
      metadata: input.metadata ?? {},
      mode: "payment",
      object: "checkout_session",
      orderId: input.orderId ?? null,
      privacyRoute,
      status: "open",
      successUrl: input.successUrl,
      uiMode: input.uiMode,
    } satisfies VantaPayCheckoutSession;

    sessions.set(session.id, session);
    recordEvent("checkout.session.created", session);
    return session;
  }

  function createPrivateRailReceipt({
    checkoutSessionId,
    rail,
  }: {
    checkoutSessionId: string;
    rail: VantaPayPrivacyRail;
  }) {
    const session = sessions.get(checkoutSessionId);
    if (!session) {
      throw new Error(`Unknown checkout session ${checkoutSessionId}.`);
    }

    const receipt = {
      amount: session.amount,
      asset: session.currency,
      auditDisclosureId: hashId("aud", checkoutSessionId, rail, session.amount),
      checkoutSessionId,
      createdAt: now,
      id: hashId("prail", checkoutSessionId, rail, session.amount),
      object: "private_rail_receipt",
      proofReceiptId: hashId("proof", checkoutSessionId, rail, session.privacyRoute.routeId),
      rail,
      status: "confirmed",
    } satisfies VantaPayPrivateRailReceipt;

    privateRailReceipts.set(receipt.id, receipt);
    return receipt;
  }

  function registerPrivateRailReceipt(receipt: VantaPayPrivateRailReceipt) {
    const session = sessions.get(receipt.checkoutSessionId);
    if (!session) {
      throw new Error(`Unknown checkout session ${receipt.checkoutSessionId}.`);
    }

    if (receipt.rail !== session.privacyRoute.rail) {
      throw new Error("Private rail receipt does not match checkout session route.");
    }

    if (receipt.amount !== session.amount || receipt.asset !== session.currency) {
      throw new Error("Private rail receipt does not match checkout session amount.");
    }

    if (receipt.status !== "confirmed") {
      throw new Error("Private rail receipt must be confirmed before registration.");
    }

    privateRailReceipts.set(receipt.id, receipt);
    return receipt;
  }

  function completeCheckoutSession(
    id: string,
    options: { privateRailReceiptId?: string } = {},
  ) {
    const current = sessions.get(id);
    if (!current) {
      throw new Error(`Unknown checkout session ${id}.`);
    }

    if (current.status === "completed") {
      const existingPayment = [...payments.values()].find(
        (payment) => payment.checkoutSessionId === id,
      );
      const existingReceipt = existingPayment?.receiptId
        ? receipts.get(existingPayment.receiptId)
        : null;

      if (existingPayment && existingReceipt) {
        return {
          events: [],
          payment: existingPayment,
          receipt: existingReceipt,
          session: current,
        };
      }
    }

    if (current.status !== "open") {
      throw new Error(`Checkout session ${id} is not open.`);
    }

    if (!options.privateRailReceiptId) {
      throw new Error("Private rail receipt required before payment completion.");
    }

    const privateRailReceipt = privateRailReceipts.get(options.privateRailReceiptId);
    if (!privateRailReceipt || privateRailReceipt.checkoutSessionId !== id) {
      throw new Error(`Unknown private rail receipt ${options.privateRailReceiptId}.`);
    }

    if (privateRailReceipt.rail !== current.privacyRoute.rail) {
      throw new Error("Private rail receipt does not match checkout session route.");
    }

    const completedSession = {
      ...current,
      status: "completed",
    } satisfies VantaPayCheckoutSession;
    sessions.set(id, completedSession);

    const payment = {
      amount: completedSession.amount,
      checkoutSessionId: completedSession.id,
      createdAt: now,
      currency: completedSession.currency,
      id: hashId("pay", completedSession.id, completedSession.amount),
      merchantId: completedSession.merchantId,
      object: "payment",
      orderId: completedSession.orderId,
      privacyRail: completedSession.privacyRoute.rail,
      privateRailReceiptId: privateRailReceipt.id,
      railStatus: "settled",
      receiptId: null,
      refundedAmount: "0.00",
      settlementAvailability: "available",
      status: "completed",
    } satisfies VantaPayPayment;

    const receipt = {
      amount: payment.amount,
      asset: payment.currency,
      checkoutSessionId: completedSession.id,
      createdAt: now,
      customerEmail: completedSession.customerEmail,
      id: hashId("rcpt", payment.id, completedSession.orderId ?? ""),
      invoiceReference: completedSession.metadata.invoice_number ?? null,
      merchantId: completedSession.merchantId,
      object: "receipt",
      orderId: completedSession.orderId,
      paymentId: payment.id,
      auditDisclosureId: privateRailReceipt.auditDisclosureId,
      privateRailReceiptId: privateRailReceipt.id,
      status: "paid",
    } satisfies VantaPayReceipt;

    const paymentWithReceipt = {
      ...payment,
      receiptId: receipt.id,
    } satisfies VantaPayPayment;

    payments.set(payment.id, paymentWithReceipt);
    receipts.set(receipt.id, receipt);

    const createdEvents = [
      recordEvent("checkout.session.completed", completedSession),
      recordEvent("payment.created", paymentWithReceipt),
      recordEvent("payment.completed", paymentWithReceipt),
      recordEvent("receipt.created", receipt),
    ];

    return {
      events: createdEvents,
      payment: paymentWithReceipt,
      receipt,
      session: completedSession,
    };
  }

  function createPaymentLink(input: VantaPayPaymentLinkCreateInput) {
    const id = hashId("plink", input.merchantId, input.linkName, String(paymentLinks.size));
    const link = {
      allowVariableAmount: input.allowVariableAmount ?? false,
      amount: normalizeAmount(input.amount),
      asset: input.asset,
      collectEmail: input.collectEmail ?? false,
      collectName: input.collectName ?? false,
      createdAt: now,
      description: input.description,
      id,
      linkName: input.linkName,
      merchantId: input.merchantId,
      object: "payment_link",
      redirectUrl: input.redirectUrl ?? null,
      status: "live",
      url: `${checkoutBaseUrl}/links/${id}`,
    } satisfies VantaPayPaymentLink;

    paymentLinks.set(link.id, link);
    return link;
  }

  function createInvoice(input: VantaPayInvoiceCreateInput) {
    const invoice = {
      asset: input.asset,
      customerContact: input.customerContact,
      customerName: input.customerName,
      dueDate: input.dueDate,
      id: hashId("inv", input.merchantId, input.invoiceNumber),
      invoiceNumber: input.invoiceNumber,
      lineItems: input.lineItems,
      merchantId: input.merchantId,
      notes: input.notes ?? null,
      object: "invoice",
      status: "sent",
      total: lineItemTotal(input.lineItems),
    } satisfies VantaPayInvoice;

    invoices.set(invoice.id, invoice);
    return invoice;
  }

  function getBalances(): VantaPayBalances {
    const totals = new Map<VantaPayAsset, string>();

    for (const payment of payments.values()) {
      if (
        payment.status !== "completed" ||
        payment.railStatus !== "settled" ||
        !payment.privateRailReceiptId
      ) {
        continue;
      }

      totals.set(payment.currency, addAmounts(totals.get(payment.currency) ?? "0.00", payment.amount));
    }

    for (const withdrawal of withdrawals.values()) {
      if (withdrawal.status !== "completed") {
        continue;
      }

      totals.set(withdrawal.asset, subtractAmounts(totals.get(withdrawal.asset) ?? "0.00", withdrawal.amount));
    }

    for (const refund of refunds.values()) {
      if (refund.status !== "refunded") {
        continue;
      }

      totals.set(refund.asset, subtractAmounts(totals.get(refund.asset) ?? "0.00", refund.amount));
    }

    const available = [...totals.entries()]
      .filter(([, amount]) => Number(amount) > 0)
      .map(([asset, amount]) => ({ amount, asset }));

    return {
      available,
      pending: [],
      withdrawable: available,
    };
  }

  function createRefund(input: VantaPayRefundCreateInput) {
    const payment = payments.get(input.paymentId);
    if (!payment || payment.merchantId !== input.merchantId) {
      throw new Error(`Unknown payment ${input.paymentId}.`);
    }

    if (payment.status !== "completed" && payment.status !== "refunded") {
      throw new Error("Only completed payments can be refunded.");
    }

    const amount = normalizeAmount(input.amount);
    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey) {
      const existingRefund = [...refunds.values()].find(
        (refund) =>
          refund.merchantId === input.merchantId && refund.idempotencyKey === idempotencyKey,
      );

      if (existingRefund) {
        if (
          existingRefund.amount !== amount ||
          existingRefund.paymentId !== input.paymentId ||
          existingRefund.reason !== (input.reason ?? null)
        ) {
          throw new Error("Refund idempotency key conflicts with existing refund inputs.");
        }

        return existingRefund;
      }
    }

    const existingRefundedAmount = [...refunds.values()]
      .filter((refund) => refund.paymentId === input.paymentId && refund.status === "refunded")
      .reduce((total, refund) => addAmounts(total, refund.amount), "0.00");
    const remainingAmount = subtractAmounts(payment.amount, existingRefundedAmount);
    if (Number(amount) > Number(remainingAmount)) {
      throw new Error("Refund amount exceeds refundable payment balance.");
    }

    const refund = {
      amount,
      asset: payment.currency,
      createdAt: now,
      id: hashId("rfnd", input.paymentId, idempotencyKey ?? "", amount, String(refunds.size)),
      idempotencyKey,
      merchantId: input.merchantId,
      object: "refund",
      paymentId: input.paymentId,
      reason: input.reason ?? null,
      status: "refunded",
    } satisfies VantaPayRefund;

    refunds.set(refund.id, refund);
    const refundedAmount = addAmounts(existingRefundedAmount, amount);
    payments.set(payment.id, {
      ...payment,
      refundedAmount,
      status:
        Number(refundedAmount) >= Number(payment.amount) ? "refunded" : payment.status,
    });
    recordEvent("payment.refunded", refund);
    return refund;
  }

  function createWithdrawal(input: VantaPayWithdrawalCreateInput) {
    const amount = normalizeAmount(input.amount);
    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey) {
      const existingWithdrawal = [...withdrawals.values()].find(
        (withdrawal) =>
          withdrawal.merchantId === input.merchantId &&
          withdrawal.idempotencyKey === idempotencyKey,
      );

      if (existingWithdrawal) {
        if (
          existingWithdrawal.amount !== amount ||
          existingWithdrawal.asset !== input.asset ||
          existingWithdrawal.destination !== input.destination ||
          existingWithdrawal.destinationType !== input.destinationType ||
          existingWithdrawal.referenceNote !== (input.referenceNote ?? null)
        ) {
          throw new Error("Withdrawal idempotency key conflicts with existing withdrawal inputs.");
        }

        return existingWithdrawal;
      }
    }

    if (!input.privateExitReceiptId) {
      throw new Error("Private exit receipt required before withdrawal completion.");
    }

    const privateExitReceipt = privateExitReceipts.get(input.privateExitReceiptId);
    if (!privateExitReceipt) {
      throw new Error(`Unknown private exit receipt ${input.privateExitReceiptId}.`);
    }

    if (
      privateExitReceipt.amount !== amount ||
      privateExitReceipt.asset !== input.asset ||
      privateExitReceipt.destination !== input.destination
    ) {
      throw new Error("Private exit receipt does not match withdrawal request.");
    }

    const balances = getBalances();
    const balance = balances.withdrawable.find((candidate) => candidate.asset === input.asset);
    if (!balance || Number(balance.amount) < Number(input.amount)) {
      throw new Error("Withdrawal amount exceeds withdrawable balance.");
    }

    const withdrawal = {
      amount,
      asset: input.asset,
      createdAt: now,
      destination: input.destination,
      destinationType: input.destinationType,
      id: hashId("wdr", input.merchantId, input.asset, idempotencyKey ?? "", amount, String(withdrawals.size)),
      idempotencyKey,
      merchantId: input.merchantId,
      object: "withdrawal",
      privateExitReceiptId: privateExitReceipt.id,
      referenceNote: input.referenceNote ?? null,
      status: "completed",
    } satisfies VantaPayWithdrawal;

    withdrawals.set(withdrawal.id, withdrawal);
    recordEvent("withdrawal.created", withdrawal);
    recordEvent("withdrawal.completed", withdrawal);
    return withdrawal;
  }

  function createPrivateExitReceipt({
    amount,
    asset,
    destination,
    rail,
  }: {
    amount: string;
    asset: VantaPayPrivateExitReceipt["asset"];
    destination: string;
    rail: VantaPayPrivacyRail;
  }) {
    const receipt = {
      amount: normalizeAmount(amount),
      asset,
      createdAt: now,
      destination,
      id: hashId("pexit", rail, asset, amount, destination, String(privateExitReceipts.size)),
      object: "private_exit_receipt",
      rail,
      status: "confirmed",
    } satisfies VantaPayPrivateExitReceipt;

    privateExitReceipts.set(receipt.id, receipt);
    return receipt;
  }

  function registerPrivateExitReceipt(receipt: VantaPayPrivateExitReceipt) {
    if (receipt.status !== "confirmed") {
      throw new Error("Private exit receipt must be confirmed before registration.");
    }

    privateExitReceipts.set(receipt.id, receipt);
    return receipt;
  }

  function signWebhookEvent(event: VantaPayWebhookEvent, secret: string) {
    const payload = stableJson(event);
    const timestamp = Math.floor(new Date(event.created).getTime() / 1000);
    const signature = signPayload(payload, secret, timestamp);

    return {
      payload,
      signatureHeader: `t=${timestamp},v1=${signature}`,
    };
  }

  async function deliverWebhookEvents({
    endpoint,
    maxAttempts = 3,
    secret,
    send,
  }: {
    endpoint: string;
    maxAttempts?: number;
    secret: string;
    send: (args: {
      attempt: number;
      event: VantaPayWebhookEvent;
      payload: string;
      signatureHeader: string;
    }) => Promise<{ ok: boolean; status: number }>;
  }) {
    const delivered: VantaPayWebhookDelivery[] = [];

    for (const event of events) {
      const deliveryId = hashId("whdel", endpoint, event.id);
      const existing = webhookDeliveries.get(deliveryId);
      if (existing?.status === "delivered") {
        delivered.push(existing);
        continue;
      }

      let attempts = 0;
      let lastStatusCode: number | null = null;

      while (attempts < maxAttempts) {
        attempts += 1;
        const signed = signWebhookEvent(event, secret);
        const response = await send({
          attempt: attempts,
          event,
          payload: signed.payload,
          signatureHeader: signed.signatureHeader,
        });
        lastStatusCode = response.status;

        if (response.ok) {
          break;
        }
      }

      const delivery = {
        attempts,
        deliveredAt: lastStatusCode !== null && lastStatusCode >= 200 && lastStatusCode < 300 ? now : null,
        endpoint,
        eventId: event.id,
        id: deliveryId,
        lastStatusCode,
        object: "webhook_delivery",
        status:
          lastStatusCode !== null && lastStatusCode >= 200 && lastStatusCode < 300
            ? "delivered"
            : "failed",
      } satisfies VantaPayWebhookDelivery;

      webhookDeliveries.set(delivery.id, delivery);
      delivered.push(delivery);
    }

    return delivered;
  }

  return {
    completeCheckoutSession,
    createCheckoutSession,
    createInvoice,
    createPaymentLink,
    createPrivateExitReceipt,
    createPrivateRailReceipt,
    createWithdrawal,
    getBalances,
    getCheckoutSession(id: string) {
      return sessions.get(id) ?? null;
    },
    getMerchant() {
      return merchant;
    },
    getMerchantApiStatus() {
      return {
        contractVersion: VANTA_PAY_CONTRACT_VERSION,
        merchant,
        privateSettlement: VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY,
      };
    },
    getPayment(id: string) {
      return payments.get(id) ?? null;
    },
    privateSettlement: VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY,
    getReceipt(id: string) {
      return receipts.get(id) ?? null;
    },
    createRefund,
    listInvoices() {
      return [...invoices.values()];
    },
    listPaymentLinks() {
      return [...paymentLinks.values()];
    },
    listPayments() {
      return [...payments.values()];
    },
    listReceipts() {
      return [...receipts.values()];
    },
    listRefunds() {
      return [...refunds.values()];
    },
    listWebhookEvents() {
      return [...events];
    },
    listWebhookDeliveries() {
      return [...webhookDeliveries.values()];
    },
    listWithdrawals() {
      return [...withdrawals.values()];
    },
    registerPrivateExitReceipt,
    registerPrivateRailReceipt,
    signWebhookEvent,
    deliverWebhookEvents,
    snapshot() {
      return {
        events: [...events],
        invoices: [...invoices.values()],
        paymentLinks: [...paymentLinks.values()],
        payments: [...payments.values()],
        privateExitReceipts: [...privateExitReceipts.values()],
        privateRailReceipts: [...privateRailReceipts.values()],
        receipts: [...receipts.values()],
        refunds: [...refunds.values()],
        sessions: [...sessions.values()],
        stateVersion: VANTA_PAY_STORE_SCHEMA_VERSION,
        webhookDeliveries: [...webhookDeliveries.values()],
        withdrawals: [...withdrawals.values()],
      } satisfies VantaPayRuntimeSnapshot;
    },
  };
}
