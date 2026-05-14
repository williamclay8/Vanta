import { useMemo, useRef, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { LaneFlowIndicator } from "@/components/LaneFlowIndicator";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { VANTA_PAY_ASSET_SYMBOLS, type VantaPayAsset } from "@/pay/vantaPayAssets";
import { VANTA_PAY_MERCHANT_COMMAND_CENTER } from "@/pay/vantaPayMerchantCommandCenter";
import { VANTA_PAY_MERCHANT_DEMO_CONTENT } from "@/pay/vantaPayMerchantDemoContent";
import { getVantaPayReceiptPrivacyContract } from "@/pay/vantaPayReceiptPrivacyContract";
import { buildVantaPayReceiptPublicView } from "@/pay/vantaPayReceiptPublicView";
import { createVantaPayRuntime } from "@/pay/vantaPayRuntime";
import type {
  VantaPayCheckoutSession,
  VantaPayPayment,
  VantaPayRefund,
  VantaPayWithdrawal,
  VantaPayPrivateRailReceipt,
  VantaPayReceipt,
} from "@/pay/vantaPayTypes";

type CheckoutMode = "hosted" | "embedded" | "modal";
type PayLifecyclePhase = "draft" | "checkout_created" | "settlement_complete";

type PayCheckoutRecord = {
  payment?: VantaPayPayment;
  privateRailReceipt?: VantaPayPrivateRailReceipt;
  receipt?: VantaPayReceipt;
  session: VantaPayCheckoutSession;
};

function PayButton({
  children,
  disabled = false,
  onClick,
  type = "button",
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className="button button-primary"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function redactToken(value: string) {
  if (!value || value === "Not issued yet") {
    return value;
  }

  return `${value.slice(0, 6)}...redacted`;
}

function PayField({
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="pay-field">
      <span>{label}</span>
      <input
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${name}-error` : undefined}
        name={name}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <small className="pay-field__error" id={`${name}-error`}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function PaySelect({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="pay-field pay-field--select">
      <span>{label}</span>
      <select
        name={name}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function PayPage() {
  const receiptPacketRef = useRef<HTMLElement | null>(null);
  const payRuntime = useMemo(() => createVantaPayRuntime(), []);
  const merchant = useMemo(() => payRuntime.getMerchant(), [payRuntime]);
  const receiptPrivacyContract = useMemo(() => getVantaPayReceiptPrivacyContract(), []);
  const payPrivacyClaimSummary = receiptPrivacyContract.claimControls.production_privacy_claims_locked
    ? receiptPrivacyContract.claimSummary
    : "privacy claims require a fresh readiness review";
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<VantaPayAsset>("USDC");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("hosted");
  const [phase, setPhase] = useState<PayLifecyclePhase>("draft");
  const [checkoutRecord, setCheckoutRecord] = useState<PayCheckoutRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [latestRefund, setLatestRefund] = useState<VantaPayRefund | null>(null);
  const [latestWithdrawal, setLatestWithdrawal] = useState<VantaPayWithdrawal | null>(null);
  const [payActionError, setPayActionError] = useState<string | null>(null);

  function resetLifecycleForEdit() {
    if (checkoutRecord || phase !== "draft") {
      setCheckoutRecord(null);
      setPhase("draft");
      setCopied(false);
      setLatestRefund(null);
      setLatestWithdrawal(null);
      setPayActionError(null);
    }
  }

  const paymentLabel = title.trim() || "Untitled payment";
  const amountLabel = useMemo(() => {
    const trimmedAmount = amount.trim();
    return `${trimmedAmount || "0.00"} ${asset}`;
  }, [amount, asset]);
  const customerLabel = customerEmail.trim() || "No customer email";
  const parsedAmount = Number(amount);
  const titleError = !title.trim() ? "Add a short description." : "";
  const amountError =
    !amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0
      ? "Enter an amount greater than 0."
      : "";
  const emailError =
    customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
      ? "Enter a valid customer email or leave it blank."
      : "";
  const formHasErrors = Boolean(titleError || amountError || emailError);
  const visibleTitleError = hasAttemptedSubmit ? titleError : "";
  const visibleAmountError = hasAttemptedSubmit ? amountError : "";
  const checkoutUrl = title.trim()
    ? `vanta.test/pay/${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "vanta.test/pay/new-request";
  const createdRecord = checkoutRecord;
  const currentSessionId = createdRecord?.session.id ?? "Not created yet";
  const currentClientToken = createdRecord
    ? redactToken(createdRecord.session.clientToken)
    : "Not issued yet";
  const receiptPublicView = createdRecord?.receipt
    ? buildVantaPayReceiptPublicView(createdRecord.receipt)
    : null;
  const requestStatus =
    phase === "settlement_complete"
      ? "Payment record completed"
      : phase === "checkout_created"
        ? "Checkout session created"
        : "Draft";

  function createCheckoutSession() {
    setHasAttemptedSubmit(true);
    setCopied(false);

    if (formHasErrors) {
      return null;
    }

    const session = payRuntime.createCheckoutSession({
      amount: amount.trim(),
      cancelUrl: merchant.callbackUrls.cancelUrl,
      collectEmail: Boolean(customerEmail.trim()),
      currency: asset,
      customerEmail: customerEmail.trim() || undefined,
      lineItems: [{ amount: amount.trim(), name: paymentLabel, quantity: 1 }],
      merchantId: merchant.id,
      metadata: {
        request_title: paymentLabel,
      },
      mode: "payment",
      successUrl: merchant.callbackUrls.successUrl,
      uiMode: checkoutMode,
    });
    const nextRecord = { session } satisfies PayCheckoutRecord;

    setPhase("checkout_created");
    setCheckoutRecord(nextRecord);
    setLatestRefund(null);
    setLatestWithdrawal(null);
    setPayActionError(null);
    return nextRecord;
  }

  function completeTestSettlement() {
    if (!createdRecord || phase !== "checkout_created") {
      return;
    }

    const privateRailReceipt = payRuntime.createPrivateRailReceipt({
      checkoutSessionId: createdRecord.session.id,
      rail: createdRecord.session.privacyRoute.rail,
    });
    const completion = payRuntime.completeCheckoutSession(createdRecord.session.id, {
      privateRailReceiptId: privateRailReceipt.id,
    });

    setCheckoutRecord({
      ...createdRecord,
      payment: completion.payment,
      privateRailReceipt,
      receipt: completion.receipt,
    });
    setPhase("settlement_complete");
    setLatestRefund(null);
    setLatestWithdrawal(null);
    setPayActionError(null);
  }

  async function copyTestLink() {
    if (!createdRecord) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(createdRecord.session.checkoutUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function previewCheckout() {
    if (!createdRecord || typeof window === "undefined") {
      return;
    }

    window.open(createdRecord.session.checkoutUrl, "_blank", "noopener,noreferrer");
  }

  function viewReceiptPacket() {
    receiptPacketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    receiptPacketRef.current?.focus({ preventScroll: true });
  }

  function prepareRefund() {
    if (!createdRecord?.payment || phase !== "settlement_complete") {
      return;
    }

    try {
      const refund = payRuntime.createRefund({
        amount: createdRecord.payment.amount,
        idempotencyKey: `local-ui-refund:${createdRecord.payment.id}`,
        merchantId: merchant.id,
        paymentId: createdRecord.payment.id,
        reason: "local-ui-test-refund",
      });
      const updatedPayment = payRuntime.getPayment(createdRecord.payment.id) ?? createdRecord.payment;

      setCheckoutRecord({
        ...createdRecord,
        payment: updatedPayment,
      });
      setLatestRefund(refund);
      setPayActionError(null);
    } catch (error) {
      setPayActionError(error instanceof Error ? error.message : "Local refund could not be prepared.");
    }
  }

  function prepareWithdrawal() {
    if (!createdRecord?.payment || phase !== "settlement_complete") {
      return;
    }

    try {
      const exitReceipt = payRuntime.createPrivateExitReceipt({
        amount: createdRecord.payment.amount,
        asset: createdRecord.payment.currency,
        destination: merchant.payoutSettings.destination,
        rail: createdRecord.session.privacyRoute.rail,
      });
      const withdrawal = payRuntime.createWithdrawal({
        amount: createdRecord.payment.amount,
        asset: createdRecord.payment.currency,
        destination: merchant.payoutSettings.destination,
        destinationType: merchant.payoutSettings.destinationType,
        idempotencyKey: `local-ui-withdrawal:${createdRecord.payment.id}`,
        merchantId: merchant.id,
        privateExitReceiptId: exitReceipt.id,
        referenceNote: createdRecord.receipt?.id,
      });

      setLatestWithdrawal(withdrawal);
      setPayActionError(null);
    } catch (error) {
      setPayActionError(error instanceof Error ? error.message : "Local withdrawal could not be prepared.");
    }
  }

  return (
    <section className="send-page pay-page pay-page--transaction" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="module-page__hero send-page__hero pay-page__hero product-intro">
          <div>
            <span className="pay-kicker product-intro__eyebrow">Vanta Pay</span>
            <h1 id="pay-title">Pay</h1>
            <p>
              Create a buyer preview, generate a local receipt-backed settlement record, and show
              what each party can verify.
            </p>
            <div className="pay-hero-badges pay-hero-badges--compact" aria-label="Pay beta status">
              <span>
                {isBetaMode ? "Test mode" : "Test harness"} - no production funds moved - test
                receipt only
              </span>
            </div>
          </div>
          <div className="module-state module-state--pay-demo">
            <span className="pay-kicker">{VANTA_PAY_MERCHANT_DEMO_CONTENT.eyebrow}</span>
            <strong>{VANTA_PAY_MERCHANT_DEMO_CONTENT.title}</strong>
            <p>{VANTA_PAY_MERCHANT_DEMO_CONTENT.body}</p>
          </div>
        </header>

        <LaneFlowIndicator
          ariaLabel="Pay flow"
          className="pay-flow-indicator"
          steps={[
            { id: "create", label: "Create", active: phase !== "draft" },
            { id: "approve", label: "Approve" },
            { id: "settle", label: "Settle", active: phase === "settlement_complete" },
            { id: "share-receipt", label: "Share receipt", active: phase === "settlement_complete" },
          ]}
        />

        <main className="pay-minimal-stage send-layout">
          <article className="send-card send-card--workspace">
            <div className="pay-request-grid">
              <section className="pay-request-builder" aria-labelledby="pay-details-title">
                <header className="shield-card__header">
                  <div>
                    <span>Request builder</span>
                  </div>
                </header>
                <div className="pay-builder-intro">
                  <h2 id="pay-details-title">Payment details</h2>
                  <p>Create a test payment request before live approval or production settlement.</p>
                </div>

                <form
                  aria-label="Payment form"
                  className="pay-form pay-form--minimal"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createCheckoutSession();
                  }}
                >
                  <PayField
                    error={visibleTitleError}
                    label="Description"
                    name="payment-title"
                    onChange={(value) => {
                      setTitle(value);
                      resetLifecycleForEdit();
                    }}
                    placeholder="Design retainer"
                    value={title}
                  />
                  <PayField
                    error={visibleAmountError}
                    label="Amount"
                    name="payment-amount"
                    onChange={(value) => {
                      setAmount(value);
                      resetLifecycleForEdit();
                    }}
                    placeholder="0.00"
                    type="number"
                    value={amount}
                  />
                  <PaySelect
                    label="Asset"
                    name="payment-asset"
                    onChange={(value) => {
                      setAsset(value as VantaPayAsset);
                      resetLifecycleForEdit();
                    }}
                    options={VANTA_PAY_ASSET_SYMBOLS}
                    value={asset}
                  />
                  <details className="pay-advanced-settings pay-field--wide">
                    <summary>
                      <span>Advanced payment settings</span>
                      <small>Optional customer email and checkout mode.</small>
                    </summary>
                    <div className="pay-advanced-settings__grid">
                      <PayField
                        error={emailError}
                        label="Customer email"
                        name="customer-email"
                        onChange={(value) => {
                          setCustomerEmail(value);
                          resetLifecycleForEdit();
                        }}
                        placeholder="customer@example.com"
                        type="email"
                        value={customerEmail}
                      />
                      <label className="pay-field pay-field--wide">
                        <span>Checkout type</span>
                        <div className="pay-mode-control" role="group" aria-label="Checkout type">
                          {[
                            ["hosted", "Hosted checkout"],
                            ["embedded", "Embedded checkout"],
                            ["modal", "Modal checkout"],
                          ].map(([value, label]) => (
                            <button
                              aria-pressed={checkoutMode === value}
                              key={value}
                              onClick={() => {
                                setCheckoutMode(value as CheckoutMode);
                                resetLifecycleForEdit();
                              }}
                              type="button"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </label>
                    </div>
                  </details>
                  <PayButton
                    type="submit"
                  >
                    Create payment request
                  </PayButton>
                  <small className="pay-submit-note">
                    Creates a test payment request. Completion generates a local receipt packet for review.
                  </small>
                </form>
              </section>

              <aside className="pay-review-card pay-review-card--live" aria-label="Review payment">
                <span className="pay-kicker">Review payment</span>
                <strong>{paymentLabel}</strong>
                <div>
                  <span>{amountLabel}</span>
                  <span>{customerLabel}</span>
                </div>
                <dl className="pay-request-meta">
                  <div>
                    <dt>Buyer preview link</dt>
                    <dd>{createdRecord?.session.checkoutUrl ?? checkoutUrl}</dd>
                  </div>
                  <div>
                    <dt>Checkout mode</dt>
                    <dd>{checkoutMode[0].toUpperCase() + checkoutMode.slice(1)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{requestStatus}</dd>
                  </div>
                  <div>
                    <dt>Checkout session</dt>
                    <dd>{currentSessionId}</dd>
                  </div>
                  <div>
                    <dt>Client token</dt>
                    <dd>{currentClientToken}</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <TransactionStatusToast
              ariaLabel="Transaction status"
              className="pay-path-card"
              tone={phase === "settlement_complete" ? "success" : phase === "checkout_created" ? "processing" : "pending"}
              phase={
                phase === "settlement_complete"
                  ? "complete"
                  : phase === "checkout_created"
                    ? "confirmed"
                    : "pending"
              }
              title={
                phase === "settlement_complete"
                  ? "Payment record completed"
                  : "Live approval and execution are locked in beta."
              }
              message={
                phase === "settlement_complete"
                  ? "Local test settlement complete."
                  : "Local test settlement can complete after a generated receipt."
              }
              progress={phase === "checkout_created"}
            >
              <div className="pay-path-steps">
                <span data-state={phase !== "draft" ? "active" : "idle"}>Preview</span>
                <span data-state="locked">Approve</span>
                <span data-state="locked">Execute</span>
                <span data-state={phase === "settlement_complete" ? "active" : "locked"}>Settle</span>
              </div>
              <div className="pay-trust-line">
                <span>Local operator harness</span>
                <span>Payment record</span>
                <span>Transaction evidence</span>
                <span>{phase === "settlement_complete" ? "Receipt packet ready" : "Receipt packet pending"}</span>
                <span>
                  {phase === "settlement_complete"
                    ? "Local test private-rail receipt generated"
                    : "Private rail receipt pending"}
                </span>
                <span>No production funds moved.</span>
              </div>
            </TransactionStatusToast>

            <section className="pay-next-workspace" aria-label="Next actions">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Next actions</span>
                <strong>
                  {phase === "settlement_complete"
                    ? "Payment record completed"
                    : phase === "checkout_created"
                      ? "Checkout session created"
                      : "Create a payment request to unlock the buyer preview link."}
                </strong>
              </div>

              <div className="pay-primary-actions" aria-label="Primary payment actions">
                <button
                  className="pay-workflow-action"
                  disabled={!createdRecord}
                  onClick={copyTestLink}
                  type="button"
                >
                  <span>{copied ? "Copied" : "Copy test link"}</span>
                </button>
                <button
                  className="pay-workflow-action"
                  disabled={!createdRecord}
                  onClick={previewCheckout}
                  type="button"
                >
                  <span>Preview checkout</span>
                </button>
                <button
                  className="pay-workflow-action"
                  data-pay-action="complete-test-settlement"
                  disabled={phase !== "checkout_created"}
                  onClick={completeTestSettlement}
                  type="button"
                >
                  <span>Generate test receipt</span>
                </button>
                <button
                  className="pay-workflow-action"
                  data-pay-action="view-receipt"
                  disabled={phase !== "settlement_complete"}
                  onClick={viewReceiptPacket}
                  type="button"
                >
                  <span>View receipt</span>
                </button>
                <button
                  className="pay-workflow-action"
                  data-pay-action="issue-test-refund"
                  disabled={
                    phase !== "settlement_complete" ||
                    Boolean(latestRefund) ||
                    Boolean(latestWithdrawal)
                  }
                  onClick={prepareRefund}
                  type="button"
                >
                  <span>Issue test refund</span>
                </button>
                <button
                  className="pay-workflow-action"
                  data-pay-action="create-test-withdrawal"
                  disabled={
                    phase !== "settlement_complete" ||
                    Boolean(latestWithdrawal) ||
                    Boolean(latestRefund)
                  }
                  onClick={prepareWithdrawal}
                  type="button"
                >
                  <span>Create test withdrawal</span>
                </button>
              </div>

              <section className="pay-record-panel review-list" aria-live="polite">
                <div>
                  <span>Payment records</span>
                  <strong>
                    {createdRecord
                      ? createdRecord.session.lineItems[0]?.name
                      : "No test payment request created yet."}
                  </strong>
                </div>
                {createdRecord ? (
                  <dl className="pay-record-list">
                    <div>
                      <dt>Checkout session</dt>
                      <dd>{createdRecord.session.id}</dd>
                    </div>
                    <div>
                      <dt>Client token</dt>
                      <dd>{redactToken(createdRecord.session.clientToken)}</dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd>
                        {createdRecord.session.amount} {createdRecord.session.currency}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{requestStatus}</dd>
                    </div>
                    <div>
                      <dt>Customer</dt>
                      <dd>{createdRecord.session.customerEmail ?? "No customer email"}</dd>
                    </div>
                    {phase === "settlement_complete" ? (
                      <>
                        <div>
                          <dt>Payment</dt>
                          <dd>{createdRecord.payment?.id}</dd>
                        </div>
                        <div>
                          <dt>Receipt</dt>
                          <dd>{createdRecord.receipt?.id}</dd>
                        </div>
                        <div>
                          <dt>Private rail receipt</dt>
                          <dd>{createdRecord.privateRailReceipt?.id}</dd>
                        </div>
                        <div>
                          <dt>Audit disclosure</dt>
                          <dd>{createdRecord.receipt?.auditDisclosureId}</dd>
                        </div>
                        {latestRefund ? (
                          <div>
                            <dt>Refund</dt>
                            <dd>{latestRefund.id}</dd>
                          </div>
                        ) : null}
                        {latestWithdrawal ? (
                          <div>
                            <dt>Withdrawal</dt>
                            <dd>{latestWithdrawal.id}</dd>
                          </div>
                        ) : null}
                        {latestWithdrawal ? (
                          <div>
                            <dt>Private exit receipt</dt>
                            <dd>{latestWithdrawal.privateExitReceiptId}</dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div>
                      <dt>Rail</dt>
                      <dd>
                        {phase === "settlement_complete"
                          ? "Local test private-rail receipt generated by harness"
                          : "Private rail receipt pending"}
                      </dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{createdRecord.session.createdAt}</dd>
                    </div>
                  </dl>
                ) : (
                  <p>No test payment request created yet.</p>
                )}
                {phase === "settlement_complete" && createdRecord ? (
                  <p>No production funds moved. Test receipt only.</p>
                ) : null}
                {payActionError ? <p>{payActionError}</p> : null}
                {latestRefund ? (
                  <p>
                    Local test refund prepared for {latestRefund.amount} {latestRefund.asset}.
                  </p>
                ) : null}
                {latestWithdrawal ? (
                  <p>
                    Local test withdrawal prepared for {latestWithdrawal.amount}{" "}
                    {latestWithdrawal.asset} to {latestWithdrawal.destination}.
                  </p>
                ) : null}
              </section>

              {phase === "settlement_complete" && createdRecord?.receipt ? (
                <section
                  ref={receiptPacketRef}
                  className="pay-record-panel pay-record-panel--receipt-packet review-list"
                  aria-label="Receipt packet"
                  tabIndex={-1}
                >
                  <div>
                    <span>Receipt packet</span>
                    <strong>Receipt packet ready</strong>
                  </div>
                  <dl className="pay-record-list">
                    <div>
                      <dt>Visible to merchant</dt>
                      <dd>
                        Receipt {receiptPublicView?.receiptId}, payment{" "}
                        {receiptPublicView?.paymentId}, amount {receiptPublicView?.amount}{" "}
                        {receiptPublicView?.asset}, and status {receiptPublicView?.status}.
                      </dd>
                    </div>
                    <div>
                      <dt>Visible to buyer</dt>
                      <dd>
                        Receipt status and payment reference; collected customer email is marked
                        collected but redacted.
                      </dd>
                    </div>
                    <div>
                      <dt>Kept private</dt>
                      <dd>
                        Client token, customer email value, raw private economics, and operator-only
                        settlement details.
                      </dd>
                    </div>
                    <div>
                      <dt>Verified by</dt>
                      <dd>{receiptPrivacyContract.verificationSurfaces[0]}</dd>
                    </div>
                    <div>
                      <dt>Proof receipt ID</dt>
                      <dd>
                        {receiptPublicView?.privateSettlement.railReceipt.idPrefix ?? "prail"}...redacted
                      </dd>
                    </div>
                    <div>
                      <dt>Claim status</dt>
                      <dd>
                        {receiptPrivacyContract.currentTruth}; {payPrivacyClaimSummary}.
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              <div className="pay-suite-plain-rows" aria-label="More payment records">
                <p>
                  <span>Buyer preview links</span>
                  Create a payment request, then copy the buyer preview link.
                </p>
                <p>
                  <span>Settlement lifecycle</span>
                  Preview, approve, execute, and settle stay separate.
                </p>
                <p>
                  <span>Privacy readiness</span>
                  {payPrivacyClaimSummary}.
                </p>
                <p>
                  <span>Operator status</span>
                  Pay status and merchant API checks remain the source of truth.
                </p>
                <p>
                  <span>Settlement queue</span>
                  Awaiting approval packet.
                </p>
                <p>
                  <span>Refunds: merchant-visible</span>
                  Refund actions preserve idempotency and receipt-adjusted balances.
                </p>
                <p>
                  <span>Withdrawals: merchant-visible</span>
                  Withdrawals require a private-exit receipt before completed status.
                </p>
                <p>
                  <span>Reconciliation: merchant-visible</span>
                  Payments, receipts, refunds, withdrawals, and private receipts share stable IDs.
                </p>
                <p>
                  <span>Invoices</span>
                  Invoice records use the same customer, amount, asset, and receipt path.
                </p>
                <p>
                  <span>Operations</span>
                  Refunds and withdrawals can be prepared as local test records after settlement;
                  reconciliation and subscriptions remain outside this UI.
                </p>
                <p>
                  <span>Trust rail</span>
                  {VANTA_PAY_MERCHANT_COMMAND_CENTER.betaNotice} Production privacy is not enabled.
                </p>
              </div>
            </section>

            <div className="pay-success-card pay-success-card--truth">
              <strong>Vanta Pay is in test mode.</strong>
              <span>
                It is not a production payment processor, live mainnet settlement system, or final
                privacy guarantee. No production funds moved.
              </span>
            </div>
          </article>
        </main>
      </div>
    </section>
  );
}
